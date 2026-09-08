import { VOICE_OPTIONS } from '../../onboarding/model/contract.js'

import {
  hasSpeechCredential,
  isAzureSpeaking,
  speakSsmlWithAzure,
  stopAzureSpeech,
} from './azureSpeech.js'

/**
 * 브라우저 speechSynthesis 기반 TTS 재생 레이어.
 *
 * 서버는 ttsText와 ttsSsml을 함께 내려주지만 Web Speech는 SSML을 해석하지 않으므로
 * ttsText만 사용한다. 추후 Azure Speech SDK로 교체할 때 이 모듈만 바꾼다.
 *
 * 서버 계약(VoiceSettingsRequest):
 * - ttsVoice: ko-KR-JiMinNeural | ko-KR-GookMinNeural
 * - speechRateMultiplier: 0.90 ~ 1.20
 * - volumeMultiplier: 1.00 ~ 1.20 (Web Speech volume 상한이 1.0이라 재생 시 클램프)
 * - 피치는 서버 공통값 0.97 고정이며 사용자 입력을 받지 않는다.
 */

const FIXED_PITCH = 0.97
const RATE_MIN = 0.9
const RATE_MAX = 1.2
const VOLUME_MIN = 1
const VOLUME_MAX = 1.2
const VOICES_READY_TIMEOUT_MS = 1500
const KEEP_ALIVE_INTERVAL_MS = 10_000

const VOICE_NAME_HINTS = {
  'ko-KR-JiMinNeural': ['jimin', 'yuna', 'sunhi', 'heami', 'female', '여성'],
  'ko-KR-GookMinNeural': ['gookmin', 'injoon', 'minsik', 'male', '남성'],
}

export const SPEECH_FALLBACK_MESSAGE = '소리로 읽어드릴 수 없어 화면으로 안내해 드릴게요.'

let keepAliveTimer = null
/** 발화 세대. 취소된 이전 발화가 최신 발화의 타이머를 끄지 않게 한다. */
let activeUtteranceId = 0

function synthesis() {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis ?? null
}

export function isSpeechSupported() {
  return Boolean(synthesis() && typeof window.SpeechSynthesisUtterance === 'function')
}

export function isSpeaking() {
  if (isAzureSpeaking()) return true

  const engine = synthesis()
  return Boolean(engine?.speaking || engine?.pending)
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(number, min), max)
}

function koreanVoices(voices) {
  return voices.filter((voice) => /^ko/i.test(voice.lang ?? ''))
}

/**
 * 기기의 한국어 음성 목록을 돌려준다.
 * getVoices()는 최초 호출 시 비어 있을 수 있어 voiceschanged를 기다린다.
 */
export function listVoices() {
  const engine = synthesis()
  if (!engine) return Promise.resolve([])

  const loaded = koreanVoices(engine.getVoices())
  if (loaded.length) return Promise.resolve(loaded)

  return new Promise((resolve) => {
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      engine.removeEventListener?.('voiceschanged', finish)
      resolve(koreanVoices(engine.getVoices()))
    }

    const timer = setTimeout(finish, VOICES_READY_TIMEOUT_MS)
    engine.addEventListener?.('voiceschanged', finish)
  })
}

/** 서버 음성 식별자를 기기가 가진 음성 하나로 매핑한다. */
export function resolveVoice(ttsVoice, voices) {
  if (!voices.length) return null

  const hints = VOICE_NAME_HINTS[ttsVoice] ?? []
  const matched = voices.find((voice) => {
    const haystack = `${voice.name ?? ''} ${voice.voiceURI ?? ''}`.toLowerCase()
    return hints.some((hint) => haystack.includes(hint))
  })

  return matched ?? voices[0]
}

function stopKeepAlive(utteranceId) {
  // 이미 지난 발화의 콜백이면 최신 발화의 타이머를 건드리지 않는다.
  if (utteranceId !== undefined && utteranceId !== activeUtteranceId) return
  if (keepAliveTimer === null) return
  clearInterval(keepAliveTimer)
  keepAliveTimer = null
}

/** 크롬은 긴 발화를 중간에 멈춘다. 재생 중에만 pause/resume으로 되살린다. */
function startKeepAlive(utteranceId) {
  if (utteranceId !== activeUtteranceId) return

  stopKeepAlive()
  keepAliveTimer = setInterval(() => {
    const engine = synthesis()
    if (!engine?.speaking || utteranceId !== activeUtteranceId) {
      stopKeepAlive(utteranceId)
      return
    }
    engine.pause()
    engine.resume()
  }, KEEP_ALIVE_INTERVAL_MS)
}

/**
 * 서버가 SSML을 함께 내려주면 그대로 쓴다. 목소리·속도·피치·음량이 이미 들어 있다.
 * 세션 첫 안내처럼 SSML이 없을 때만 같은 형식으로 만들어 붙인다.
 * 만들지 않으면 첫 안내만 사용자가 정한 속도를 무시하고 나간다.
 */
function ssmlFor(content, settings) {
  const provided = String(settings.ttsSsml ?? '').trim()
  if (provided) return provided

  const voice = VOICE_OPTIONS.some(({ value }) => value === settings.ttsVoice)
    ? settings.ttsVoice
    : VOICE_OPTIONS[0].value
  const rate = clamp(settings.speechRateMultiplier, RATE_MIN, RATE_MAX, 1).toFixed(2)
  const volume = clamp(settings.volumeMultiplier, VOLUME_MIN, VOLUME_MAX, 1)
  const volumeAttribute = volume === 1 ? '100' : `+${Math.round((volume - 1) * 100)}%`
  const pitchAttribute = `${Math.round((FIXED_PITCH - 1) * 100)}%`

  return (
    '<speak version="1.0" xml:lang="ko-KR" xmlns="http://www.w3.org/2001/10/synthesis">' +
    `<voice name="${voice}">` +
    `<prosody rate="${rate}" pitch="${pitchAttribute}" volume="${volumeAttribute}">` +
    escapeXml(content) +
    '</prosody></voice></speak>'
  )
}

/** 재생 중인 안내를 즉시 멈춘다. 마이크 입력 직전과 화면 이탈 시 호출한다. */
export function stop() {
  stopAzureSpeech()

  const engine = synthesis()
  activeUtteranceId += 1
  stopKeepAlive()
  if (engine?.speaking || engine?.pending) engine.cancel()
}

/**
 * 안내 문구를 읽어준다. 앞선 재생은 취소한다.
 *
 * 인증 토큰이 있으면 Azure Speech로 읽고, 실패하면 브라우저 음성으로 되돌린다.
 *
 * @param {string} text 서버가 내려준 ttsText
 * @param {{ ttsVoice?: string, speechRateMultiplier?: number, volumeMultiplier?: number,
 *   ttsSsml?: string, speechCredential?: { token: string, region: string } }} settings
 * @returns {Promise<{ spoken: boolean, reason: string|null }>}
 */
export async function speak(text, settings = {}) {
  const content = String(text ?? '').trim()
  if (!content) return { spoken: false, reason: 'EMPTY_TEXT' }

  if (hasSpeechCredential(settings.speechCredential)) {
    try {
      return await speakSsmlWithAzure(ssmlFor(content, settings), settings.speechCredential)
    } catch {
      // 토큰 만료·네트워크 실패로 Azure가 안 되면 브라우저 음성으로 읽어준다.
    }
  }

  if (!isSpeechSupported()) return { spoken: false, reason: 'UNSUPPORTED' }

  stop()

  const utteranceId = (activeUtteranceId += 1)
  const voices = await listVoices()
  const utterance = new window.SpeechSynthesisUtterance(content)
  utterance.lang = 'ko-KR'
  utterance.pitch = FIXED_PITCH
  utterance.rate = clamp(settings.speechRateMultiplier, RATE_MIN, RATE_MAX, 1)
  utterance.volume = Math.min(clamp(settings.volumeMultiplier, VOLUME_MIN, VOLUME_MAX, 1), 1)

  const voice = resolveVoice(settings.ttsVoice ?? VOICE_OPTIONS[0].value, voices)
  if (voice) utterance.voice = voice

  return new Promise((resolve) => {
    let settled = false

    const finish = (result) => {
      if (settled) return
      settled = true
      stopKeepAlive(utteranceId)
      resolve(result)
    }

    utterance.onend = () => finish({ spoken: true, reason: null })
    utterance.onerror = (event) => {
      const stopped = event?.error === 'interrupted' || event?.error === 'canceled'
      finish({ spoken: false, reason: stopped ? 'STOPPED' : 'PLAYBACK_FAILED' })
    }

    synthesis().speak(utterance)
    startKeepAlive(utteranceId)
  })
}
