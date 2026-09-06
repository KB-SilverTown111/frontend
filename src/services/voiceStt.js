import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { Capacitor } from '@capacitor/core'

import { isAudioCaptureSupported, startAudioCapture } from './audioCapture.js'

/**
 * STT 입력 경로. 서버가 세션 생성 시 확정하며 세션 중에는 바뀌지 않는다.
 * 일반 금융·고지서는 CLIENT, 송금은 BACKEND_STREAM이다.
 */
export const STT_MODE = {
  CLIENT: 'CLIENT',
  BACKEND_STREAM: 'BACKEND_STREAM',
}

/**
 * 기기가 신뢰도를 주지 않을 때 사용할 값.
 * 서버는 0.90 이상이면 금액 재확인을 건너뛰고 0.70 미만이면 다시 묻는다.
 * 실제 신뢰도를 모르는 채로 재확인을 건너뛰지 않도록 그 사이 값을 보낸다.
 */
export const UNKNOWN_STT_CONFIDENCE = 0.75

/** 텍스트 입력은 인식 불확실성이 없다. */
export const TEXT_INPUT_CONFIDENCE = 1

export function createSttError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function isNative() {
  return Capacitor.isNativePlatform()
}

function webRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function isClientSttAvailable() {
  return isNative() || Boolean(webRecognition())
}

function captureOnWeb() {
  const Recognition = webRecognition()
  if (!Recognition) {
    return Promise.reject(
      createSttError('STT_UNAVAILABLE', '이 기기에서는 음성 인식을 사용할 수 없어요.'),
    )
  }

  return new Promise((resolve, reject) => {
    const recognition = new Recognition()
    recognition.lang = 'ko-KR'
    recognition.maxAlternatives = 1
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const alternative = event.results?.[0]?.[0]
      const confidence = Number(alternative?.confidence)
      resolve({
        transcript: String(alternative?.transcript ?? '').trim(),
        confidence:
          Number.isFinite(confidence) && confidence > 0 ? confidence : UNKNOWN_STT_CONFIDENCE,
      })
    }

    recognition.onerror = (event) => {
      const reason = event?.error
      if (reason === 'not-allowed' || reason === 'service-not-allowed') {
        reject(createSttError('STT_PERMISSION_DENIED', '마이크 권한이 필요해요.'))
        return
      }
      if (reason === 'no-speech') {
        reject(createSttError('STT_NO_SPEECH', '말씀을 듣지 못했어요. 다시 말씀해 주세요.'))
        return
      }
      reject(createSttError('STT_FAILED', '음성 인식을 시작하지 못했어요.'))
    }

    recognition.start()
  })
}

async function captureOnDevice() {
  const permissions = await SpeechRecognition.checkPermissions()
  if (permissions.speechRecognition !== 'granted') {
    const requested = await SpeechRecognition.requestPermissions()
    if (requested.speechRecognition !== 'granted') {
      throw createSttError('STT_PERMISSION_DENIED', '마이크 권한이 필요해요.')
    }
  }

  const availability = await SpeechRecognition.available()
  if (!availability.available) {
    throw createSttError('STT_UNAVAILABLE', '이 기기에서는 음성 인식을 사용할 수 없어요.')
  }

  const response = await SpeechRecognition.start({
    language: 'ko-KR',
    maxResults: 1,
    partialResults: false,
    popup: false,
  })

  return {
    transcript: String(response?.matches?.[0] ?? '').trim(),
    confidence: UNKNOWN_STT_CONFIDENCE,
  }
}

/**
 * 한 번의 발화를 받아 전사와 신뢰도를 돌려준다.
 *
 * @param {'CLIENT'|'BACKEND_STREAM'} sttMode 세션이 확정한 입력 경로
 * @returns {Promise<{ transcript: string, confidence: number }>}
 */
export async function captureSpeech(sttMode = STT_MODE.CLIENT) {
  if (sttMode === STT_MODE.BACKEND_STREAM) {
    throw createSttError(
      'STT_MODE_UNSUPPORTED',
      '송금 음성 인식은 아직 준비 중이에요. 화면 단추로 진행해 주세요.',
    )
  }

  const result = isNative() ? await captureOnDevice() : await captureOnWeb()
  if (!result.transcript) {
    throw createSttError('STT_NO_SPEECH', '말씀을 듣지 못했어요. 다시 말씀해 주세요.')
  }
  return result
}

/**
 * 송금(BACKEND_STREAM) 오디오 캡처를 시작한다.
 *
 * 서버가 받는 형식([4바이트 시퀀스][PCM 16 kHz/16-bit/모노])으로 프레임을 만들어
 * onFrame으로 넘긴다. 프레임을 서버로 실제 전송하는 WebSocket 계층은
 * 핸드셰이크 인증 방식이 확정된 뒤에 붙인다.
 *
 * @param {{ onFrame: (frame: ArrayBuffer) => void }} options
 * @returns {Promise<{ stop: () => Promise<void>, sampleRate: number }>}
 */
export async function startTransferAudioCapture({ onFrame }) {
  if (!isAudioCaptureSupported()) {
    throw createSttError('AUDIO_CAPTURE_UNSUPPORTED', '이 기기에서는 마이크를 사용할 수 없어요.')
  }
  return startAudioCapture({ onFrame })
}

export async function abortSpeechCapture() {
  if (!isNative()) return
  await SpeechRecognition.stop().catch(() => {})
}
