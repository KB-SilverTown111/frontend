import { createSttError } from './voiceStt.js'

/**
 * 마이크 입력을 서버가 받는 형식으로 변환해 조각 단위로 넘긴다.
 *
 * 서버 계약(VoiceStreamWebSocketHandler):
 * - PCM 16 kHz / 16-bit / 모노, 리틀 엔디안
 * - 각 프레임은 [4바이트 big-endian 시퀀스][PCM] 구조
 * - 시퀀스는 0부터 1씩 증가하며 어긋나면 서버가 거부한다
 * - PCM 페이로드는 64 KiB 이하
 */

const TARGET_SAMPLE_RATE = 16_000
const SEQUENCE_HEADER_BYTES = 4
const MAX_PAYLOAD_BYTES = 64 * 1024
/** 16 kHz에서 약 100 ms 분량. 프레임당 3,200바이트로 상한에 한참 못 미친다. */
const CHUNK_SAMPLES = 1_600

export function isAudioCaptureSupported() {
  if (typeof window === 'undefined') return false
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  return Boolean(navigator?.mediaDevices?.getUserMedia && AudioContextClass)
}

/** Float32(-1..1)를 리틀 엔디안 Int16 PCM으로 바꾼다. */
function toInt16Pcm(samples) {
  const buffer = new ArrayBuffer(samples.length * 2)
  const view = new DataView(buffer)

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  }

  return buffer
}

/** [4바이트 big-endian 시퀀스][PCM] 프레임을 만든다. */
function buildFrame(sequence, pcm) {
  const frame = new ArrayBuffer(SEQUENCE_HEADER_BYTES + pcm.byteLength)
  new DataView(frame).setUint32(0, sequence, false)
  new Uint8Array(frame, SEQUENCE_HEADER_BYTES).set(new Uint8Array(pcm))
  return frame
}

/**
 * 선형 보간 리샘플러. 브라우저가 AudioContext의 sampleRate 요청을 무시할 때만 쓰인다.
 * 버퍼 경계를 넘어가는 소수 위치와 남은 샘플을 유지한다.
 */
function createResampler(inputRate, outputRate) {
  if (inputRate === outputRate) return (samples) => samples

  const ratio = inputRate / outputRate
  let position = 0
  let tail = new Float32Array(0)

  return (samples) => {
    const input = new Float32Array(tail.length + samples.length)
    input.set(tail)
    input.set(samples, tail.length)

    const output = []
    while (position + 1 < input.length) {
      const index = Math.floor(position)
      const fraction = position - index
      output.push(input[index] * (1 - fraction) + input[index + 1] * fraction)
      position += ratio
    }

    const consumed = Math.floor(position)
    tail = input.slice(consumed)
    position -= consumed

    return Float32Array.from(output)
  }
}

/** CHUNK_SAMPLES 단위로 잘라 프레임을 만들어 넘긴다. */
function createChunker(emitFrame) {
  let pending = new Float32Array(0)
  let sequence = 0

  return (samples) => {
    if (!samples.length) return

    const merged = new Float32Array(pending.length + samples.length)
    merged.set(pending)
    merged.set(samples, pending.length)
    pending = merged

    let offset = 0
    while (pending.length - offset >= CHUNK_SAMPLES) {
      const pcm = toInt16Pcm(pending.subarray(offset, offset + CHUNK_SAMPLES))
      if (pcm.byteLength <= MAX_PAYLOAD_BYTES) {
        emitFrame(buildFrame(sequence, pcm))
        sequence += 1
      }
      offset += CHUNK_SAMPLES
    }

    pending = pending.slice(offset)
  }
}

/**
 * 마이크를 열고 프레임을 흘려보낸다.
 *
 * @param {{ onFrame: (frame: ArrayBuffer) => void }} options
 * @returns {Promise<{ stop: () => Promise<void>, sampleRate: number }>}
 */
export async function startAudioCapture({ onFrame }) {
  if (typeof onFrame !== 'function') {
    throw createSttError('AUDIO_CAPTURE_FAILED', '오디오를 보낼 곳이 지정되지 않았어요.')
  }
  if (!isAudioCaptureSupported()) {
    throw createSttError('AUDIO_CAPTURE_UNSUPPORTED', '이 기기에서는 마이크를 사용할 수 없어요.')
  }

  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
  } catch (cause) {
    if (cause?.name === 'NotAllowedError' || cause?.name === 'SecurityError') {
      throw createSttError('MIC_PERMISSION_DENIED', '마이크 권한이 필요해요.')
    }
    throw createSttError('AUDIO_CAPTURE_FAILED', '마이크를 열지 못했어요.')
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  // 브라우저가 이 요청을 받아주면 리샘플링이 필요 없다. 무시하면 아래에서 직접 처리한다.
  const audioContext = new AudioContextClass({ sampleRate: TARGET_SAMPLE_RATE })

  const release = async () => {
    stream.getTracks().forEach((track) => track.stop())
    await audioContext.close().catch(() => {})
  }

  try {
    // Vite와 Node 양쪽에서 동작하는 표준 형태. Vite는 이걸 자산으로 인식해 배출한다.
    const processorUrl = new URL('./pcmWorkletProcessor.js', import.meta.url).href
    await audioContext.audioWorklet.addModule(processorUrl)

    const source = audioContext.createMediaStreamSource(stream)
    const worklet = new AudioWorkletNode(audioContext, 'pcm-capture-processor')
    const resample = createResampler(audioContext.sampleRate, TARGET_SAMPLE_RATE)
    const push = createChunker(onFrame)

    worklet.port.onmessage = (event) => push(resample(event.data))
    source.connect(worklet)
    // 스피커로 다시 내보내지 않는다. 연결만 유지하기 위한 목적지다.
    worklet.connect(audioContext.destination)

    if (audioContext.state === 'suspended') await audioContext.resume()

    return {
      sampleRate: audioContext.sampleRate,
      async stop() {
        worklet.port.onmessage = null
        source.disconnect()
        worklet.disconnect()
        await release()
      },
    }
  } catch (cause) {
    await release()
    if (cause?.code) throw cause
    throw createSttError('AUDIO_CAPTURE_FAILED', '마이크 입력을 준비하지 못했어요.')
  }
}
