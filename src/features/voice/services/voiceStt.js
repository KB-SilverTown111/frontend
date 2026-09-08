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
  // axios 오류도 code와 message를 가진다. 스토어가 둘을 구분하도록 표식을 남긴다.
  error.isLocalError = true
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

/** 진행 중인 웹 인식. abortSpeechCapture가 중단할 수 있도록 모듈 범위에 둔다. */
let activeWebRecognition = null

function captureOnWeb() {
  const Recognition = webRecognition()
  if (!Recognition) {
    return Promise.reject(
      createSttError('STT_UNAVAILABLE', '이 기기에서는 음성 인식을 사용할 수 없어요.'),
    )
  }

  return new Promise((resolve, reject) => {
    const recognition = new Recognition()
    let settled = false

    const finish = (settle, value) => {
      if (settled) return
      settled = true
      activeWebRecognition = null
      settle(value)
    }

    recognition.lang = 'ko-KR'
    recognition.maxAlternatives = 1
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const alternative = event.results?.[0]?.[0]
      const confidence = Number(alternative?.confidence)
      finish(resolve, {
        transcript: String(alternative?.transcript ?? '').trim(),
        confidence:
          Number.isFinite(confidence) && confidence > 0 ? confidence : UNKNOWN_STT_CONFIDENCE,
      })
    }

    recognition.onerror = (event) => {
      const reason = event?.error
      if (reason === 'not-allowed' || reason === 'service-not-allowed') {
        finish(reject, createSttError('STT_PERMISSION_DENIED', '마이크 권한이 필요해요.'))
        return
      }
      if (reason === 'no-speech') {
        finish(reject, createSttError('STT_NO_SPEECH', '말씀을 듣지 못했어요. 다시 말씀해 주세요.'))
        return
      }
      finish(reject, createSttError('STT_FAILED', '음성 인식을 시작하지 못했어요.'))
    }

    // result도 error도 없이 end만 오는 경우가 있다. 이때 정착시키지 않으면
    // listenAndSendTurn의 finally가 실행되지 않아 듣는 중 상태로 굳는다.
    recognition.onend = () => {
      finish(reject, createSttError('STT_NO_SPEECH', '말씀을 듣지 못했어요. 다시 말씀해 주세요.'))
    }

    activeWebRecognition = recognition
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
  if (isNative()) {
    await SpeechRecognition.stop().catch(() => {})
    return
  }
  // abort()가 onend를 발생시켜 대기 중인 Promise를 정착시킨다.
  activeWebRecognition?.abort()
}
