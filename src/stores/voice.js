import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { Capacitor } from '@capacitor/core'

import { normalizeApiError } from '../api/errors.js'
import { voiceApi } from '../api/voice.js'

export const useVoiceStore = defineStore('voice', () => {
  const sessionId = ref('')
  const session = ref(null)
  const lastTurn = ref(null)
  const lastEvent = ref(null)
  const speechToken = ref(null)
  const listening = ref(false)
  const transcript = ref('')
  const settings = reactive({
    ttsVoice: 'ko-KR-JiMinNeural',
    speechRateMultiplier: 1.05,
    volumeMultiplier: 1,
  })
  const error = ref(null)
  const busy = ref(false)

  async function run(request) {
    busy.value = true
    error.value = null
    try {
      return await request()
    } catch (requestError) {
      error.value = normalizeApiError(requestError)
      throw error.value
    } finally {
      busy.value = false
    }
  }

  async function startSession(entryPoint = 'GENERAL_FINANCE') {
    const response = await run(() => voiceApi.createSession({ entryPoint }))
    session.value = response
    sessionId.value = response?.sessionId ?? ''
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
    lastTurn.value = response
    return response
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

  function listenOnWeb() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) throw new Error('이 브라우저에서는 음성 인식을 사용할 수 없어요.')

    return new Promise((resolve, reject) => {
      const recognition = new Recognition()
      recognition.lang = 'ko-KR'
      recognition.maxAlternatives = 1
      recognition.interimResults = false
      recognition.onresult = (event) => {
        resolve({ matches: [event.results?.[0]?.[0]?.transcript || ''] })
      }
      recognition.onerror = (event) =>
        reject(new Error(event.error || '음성 인식을 시작하지 못했어요.'))
      recognition.start()
    })
  }

  async function listenAndSendTurn({ sttConfidence = 0.9 } = {}) {
    busy.value = true
    listening.value = true
    error.value = null
    try {
      let response
      if (Capacitor.isNativePlatform()) {
        const permissions = await SpeechRecognition.checkPermissions()
        if (permissions.speechRecognition !== 'granted') {
          const requested = await SpeechRecognition.requestPermissions()
          if (requested.speechRecognition !== 'granted') {
            throw new Error('마이크 권한이 필요해요.')
          }
        }

        const availability = await SpeechRecognition.available()
        if (!availability.available) throw new Error('이 기기에서는 음성 인식을 사용할 수 없어요.')
        response = await SpeechRecognition.start({
          language: 'ko-KR',
          maxResults: 1,
          partialResults: false,
          popup: false,
        })
      } else {
        response = await listenOnWeb()
      }
      transcript.value = response.matches?.[0]?.trim() || ''
      if (!transcript.value) throw new Error('말씀을 듣지 못했어요. 다시 말씀해 주세요.')

      const turn = await voiceApi.sendTurn(sessionId.value, {
        turnId: createTurnId(),
        transcript: transcript.value,
        sttConfidence: Number(sttConfidence),
        inputType: 'VOICE',
      })
      lastTurn.value = turn
      return turn
    } catch (requestError) {
      error.value = normalizeApiError(requestError)
      if (!requestError?.response && requestError?.message) {
        error.value.message = requestError.message
      }
      throw error.value
    } finally {
      listening.value = false
      busy.value = false
    }
  }

  async function sendEvent(request) {
    const response = await run(() => voiceApi.event(sessionId.value, request))
    lastEvent.value = response
    return response
  }

  async function closeSession() {
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
    Object.assign(settings, response)
    return response
  }

  async function saveSettings(request) {
    const payload = {
      ttsVoice: request?.ttsVoice ?? settings.ttsVoice,
      speechRateMultiplier: request?.speechRateMultiplier ?? settings.speechRateMultiplier,
      volumeMultiplier: request?.volumeMultiplier ?? settings.volumeMultiplier,
    }
    const response = await run(() => voiceApi.updateSettings(payload))
    Object.assign(settings, response)
    return response
  }

  return {
    sessionId,
    session,
    lastTurn,
    lastEvent,
    speechToken,
    listening,
    transcript,
    settings,
    error,
    busy,
    startSession,
    loadSession,
    sendTurn,
    listenAndSendTurn,
    sendEvent,
    closeSession,
    issueSpeechToken,
    loadSettings,
    saveSettings,
  }
})
