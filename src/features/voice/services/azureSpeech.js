/**
 * Azure Speech SDK 재생 경로.
 *
 * 서버가 내려주는 SSML에 목소리·속도·피치·음량이 모두 들어 있으므로 여기서는
 * 받은 SSML을 그대로 합성한다. 설정을 다시 적용하면 두 번 먹는다.
 *
 * SDK 번들이 커서 첫 발화 때 동적으로 불러온다.
 */

/** 재생 중인 합성. barge-in으로 끊을 수 있도록 모듈 범위에 둔다. */
let activePlayback = null
let sdkPromise = null
let speechGeneration = 0

function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = import('microsoft-cognitiveservices-speech-sdk').catch((cause) => {
      // 다음 발화에서 다시 시도할 수 있게 실패한 약속을 남기지 않는다.
      sdkPromise = null
      throw cause
    })
  }
  return sdkPromise
}

export function hasSpeechCredential(credential) {
  return Boolean(credential?.token && credential?.region)
}

export function isAzureSpeaking() {
  return Boolean(activePlayback)
}

function closePlayback({ player, synthesizer }) {
  try {
    player.pause()
    player.close()
  } catch {
    // 이미 닫힌 재생기다.
  }
  try {
    synthesizer.close()
  } catch {
    // 이미 닫힌 합성기다.
  }
}

/** 재생 중인 안내를 즉시 끊는다. 마이크 입력 직전과 화면 이탈 시 호출한다. */
export function stopAzureSpeech() {
  speechGeneration += 1
  const playback = activePlayback
  if (!playback) return

  activePlayback = null
  playback.settle({ spoken: false, reason: 'STOPPED' })
  closePlayback(playback)
}

export async function speakSsmlWithAzure(ssml, credential) {
  const generation = ++speechGeneration
  const speechSdk = await loadSdk()
  if (generation !== speechGeneration) return { spoken: false, reason: 'STOPPED' }
  stopAzureSpeech()

  const config = speechSdk.SpeechConfig.fromAuthorizationToken(credential.token, credential.region)
  // MSE 재생 호환이 가장 넓은 형식이다.
  config.speechSynthesisOutputFormat =
    speechSdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3

  const player = new speechSdk.SpeakerAudioDestination()
  const synthesizer = new speechSdk.SpeechSynthesizer(
    config,
    speechSdk.AudioConfig.fromSpeakerOutput(player),
  )

  return new Promise((resolve, reject) => {
    let settled = false

    const playback = {
      player,
      synthesizer,
      settle: (result) => {
        if (settled) return
        settled = true
        resolve(result)
      },
      fail: (cause) => {
        if (settled) return
        settled = true
        reject(cause)
      },
    }
    activePlayback = playback

    const release = () => {
      if (activePlayback === playback) activePlayback = null
      closePlayback(playback)
    }

    // 합성 완료가 아니라 재생 완료를 기다려야 barge-in 시점이 맞는다.
    player.onAudioEnd = () => {
      release()
      playback.settle({ spoken: true, reason: null })
    }

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        if (result?.reason === speechSdk.ResultReason.SynthesizingAudioCompleted) return
        release()
        playback.fail(new Error(result?.errorDetails || '음성을 합성하지 못했어요.'))
      },
      (cause) => {
        release()
        playback.fail(new Error(String(cause)))
      },
    )
  })
}
