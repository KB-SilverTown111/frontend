import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import { normalizeApiError } from '../api/errors.js'
import { voiceApi } from '../api/voice.js'
import { isSpeechSupported, speak, stop as cancelSpeech } from '../services/speech.js'
import {
  STT_MODE,
  TEXT_INPUT_CONFIDENCE,
  abortSpeechCapture,
  captureSpeech,
} from '../services/voiceStt.js'

const DEFAULT_VOICE_SETTINGS = {
  ttsVoice: 'ko-KR-JiMinNeural',
  speechRateMultiplier: 1.05,
  volumeMultiplier: 1,
}

export const useVoiceStore = defineStore('voice', () => {
  const sessionId = ref('')
  const session = ref(null)
  const lastTurn = ref(null)
  const lastEvent = ref(null)
  const speechToken = ref(null)
  const listening = ref(false)
  const speaking = ref(false)
  const transcript = ref('')
  const settings = reactive({ ...DEFAULT_VOICE_SETTINGS })
  const error = ref(null)
  const busy = ref(false)

  const sttMode = computed(() => session.value?.sttMode ?? STT_MODE.CLIENT)
  const usesBackendStream = computed(() => sttMode.value === STT_MODE.BACKEND_STREAM)
  const currentStep = computed(() => lastTurn.value?.state || session.value?.currentStep || '')
  const ttsText = computed(() => lastTurn.value?.ttsText || session.value?.firstPrompt || '')
  const displayCard = computed(() => lastTurn.value?.displayCard ?? null)
  const requiredSlot = computed(() => lastTurn.value?.requiredSlot ?? null)
  const draftSummary = computed(() => lastTurn.value?.draftSummary ?? null)
  const nextAction = computed(() => lastTurn.value?.nextAction || '')
  const slots = computed(() => lastTurn.value?.slots ?? {})
  const sessionClosed = computed(() => ['CLOSED', 'EXPIRED'].includes(session.value?.status ?? ''))

  function toUserError(cause) {
    // axios 오류도 응답 없이 code와 message를 가진다. createSttError가 표식을 남긴
    // 로컬 오류만 그대로 쓰고, 나머지는 normalizeApiError가 사용자 문구로 바꾼다.
    if (cause?.isLocalError && cause?.code && cause?.message) {
      return {
        status: null,
        code: cause.code,
        message: cause.message,
        requestId: null,
        fieldErrors: [],
      }
    }
    return normalizeApiError(cause)
  }

  async function run(request) {
    busy.value = true
    error.value = null
    try {
      return await request()
    } catch (cause) {
      error.value = toUserError(cause)
      throw error.value
    } finally {
      busy.value = false
    }
  }

  function createTurnId() {
    const randomUUID = globalThis.crypto?.randomUUID
    if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = (Math.random() * 16) | 0
      const value = character === 'x' ? random : (random & 0x3) | 0x8
      return value.toString(16)
    })
  }
  /** 발화 세대. 취소된 이전 발화가 최신 발화의 상태를 덮어쓰지 않게 한다. */
  let speakGeneration = 0

  function silence() {
    cancelSpeech()
    speakGeneration += 1
    speaking.value = false
  }

  async function speakText(text) {
    const content = String(text ?? '').trim()
    if (!content) return { spoken: false, reason: 'EMPTY_TEXT' }
    if (!isSpeechSupported()) return { spoken: false, reason: 'UNSUPPORTED' }

    speakGeneration += 1
    const generation = speakGeneration
    speaking.value = true
    try {
      return await speak(content, settings)
    } finally {
      // 더 최신 발화가 시작됐다면 상태는 그쪽이 관리한다.
      if (generation === speakGeneration) speaking.value = false
    }
  }

  function speakLatest() {
    return speakText(ttsText.value)
  }

  function applyTurn(turn) {
    lastTurn.value = turn
    speakLatest().catch(() => {})
    return turn
  }

  async function startSession(entryPoint = 'GENERAL_FINANCE') {
    const response = await run(() => voiceApi.createSession({ entryPoint }))
    session.value = response
    sessionId.value = response?.sessionId ?? ''
    lastTurn.value = null
    transcript.value = ''
    if (response?.firstPrompt) speakText(response.firstPrompt).catch(() => {})
    return response
  }

  async function loadSession(id = sessionId.value) {
    const response = await run(() => voiceApi.getSession(id))
    session.value = response
    sessionId.value = response?.sessionId ?? id
    return response
  }

  async function sendTurn(request) {
    const response = await run(() => voiceApi.sendTurn(sessionId.value, request))
    return applyTurn(response)
  }

  /** 한 번 듣고 그 발화를 서버에 보낸다. 듣기 직전 재생 중인 안내를 끊는다. */
  async function listenAndSendTurn() {
    silence()
    busy.value = true
    listening.value = true
    error.value = null

    try {
      const captured = await captureSpeech(sttMode.value)
      transcript.value = captured.transcript

      const turn = await voiceApi.sendTurn(sessionId.value, {
        turnId: createTurnId(),
        transcript: captured.transcript,
        sttConfidence: captured.confidence,
        inputType: 'VOICE',
      })
      return applyTurn(turn)
    } catch (cause) {
      error.value = toUserError(cause)
      throw error.value
    } finally {
      listening.value = false
      busy.value = false
    }
  }

  /** 음성이 어려울 때 쓰는 키보드 경로. */
  async function sendTextTurn(text) {
    const content = String(text ?? '').trim()
    if (!content) {
      error.value = toUserError({
        isLocalError: true,
        code: 'TEXT_INPUT_EMPTY',
        message: '내용을 입력해 주세요.',
      })
      throw error.value
    }

    silence()
    transcript.value = content
    return sendTurn({
      turnId: createTurnId(),
      transcript: content,
      sttConfidence: TEXT_INPUT_CONFIDENCE,
      inputType: 'TEXT',
    })
  }

  async function sendEvent(request) {
    const response = await run(() => voiceApi.event(sessionId.value, request))
    lastEvent.value = response
    return response
  }

  /**
   * 다시 듣기. CLIENT 세션은 서버 REPLAY 이벤트로 원문을 다시 받고,
   * BACKEND_STREAM 세션은 REPLAY가 허용되지 않아 마지막 안내를 그대로 다시 읽는다.
   */
  async function replay() {
    silence()

    if (!usesBackendStream.value && sessionId.value && lastTurn.value?.turnId) {
      const response = await sendEvent({
        eventType: 'REPLAY',
        turnId: lastTurn.value.turnId,
      }).catch(() => null)

      const payload = response?.replayPayload
      if (payload?.ttsText) return speakText(payload.ttsText)
    }

    return speakLatest()
  }

  async function closeSession() {
    silence()
    await abortSpeechCapture()
    const response = await run(() => voiceApi.closeSession(sessionId.value))
    session.value = response
    return response
  }

  async function issueSpeechToken() {
    const response = await run(() => voiceApi.issueSpeechToken())
    speechToken.value = response
    return response
  }

  async function loadSettings() {
    const response = await run(() => voiceApi.getSettings())
    Object.assign(settings, {
      ttsVoice: response?.ttsVoice ?? settings.ttsVoice,
      speechRateMultiplier: response?.speechRateMultiplier ?? settings.speechRateMultiplier,
      volumeMultiplier: response?.volumeMultiplier ?? settings.volumeMultiplier,
    })
    return response
  }

  async function saveSettings(request) {
    const payload = {
      ttsVoice: request?.ttsVoice ?? settings.ttsVoice,
      speechRateMultiplier: request?.speechRateMultiplier ?? settings.speechRateMultiplier,
      volumeMultiplier: request?.volumeMultiplier ?? settings.volumeMultiplier,
    }
    const response = await run(() => voiceApi.updateSettings(payload))
    Object.assign(settings, {
      ttsVoice: response?.ttsVoice ?? payload.ttsVoice,
      speechRateMultiplier: response?.speechRateMultiplier ?? payload.speechRateMultiplier,
      volumeMultiplier: response?.volumeMultiplier ?? payload.volumeMultiplier,
    })
    return response
  }

  function reset() {
    silence()
    sessionId.value = ''
    session.value = null
    lastTurn.value = null
    lastEvent.value = null
    speechToken.value = null
    listening.value = false
    transcript.value = ''
    Object.assign(settings, DEFAULT_VOICE_SETTINGS)
    error.value = null
    busy.value = false
  }

  return {
    sessionId,
    session,
    lastTurn,
    lastEvent,
    speechToken,
    listening,
    speaking,
    transcript,
    settings,
    error,
    busy,
    sttMode,
    usesBackendStream,
    currentStep,
    ttsText,
    displayCard,
    requiredSlot,
    draftSummary,
    nextAction,
    slots,
    sessionClosed,
    startSession,
    loadSession,
    sendTurn,
    listenAndSendTurn,
    sendTextTurn,
    sendEvent,
    replay,
    speakLatest,
    speakText,
    silence,
    closeSession,
    issueSpeechToken,
    loadSettings,
    saveSettings,
    reset,
  }
})
