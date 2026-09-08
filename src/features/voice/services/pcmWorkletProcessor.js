/* global AudioWorkletProcessor, registerProcessor */

/**
 * 마이크 입력을 메인 스레드로 넘기는 AudioWorklet 프로세서.
 * 오디오 스레드에서 독립 실행되므로 앱 모듈을 import하지 않는다.
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0]
    // 입력 버퍼는 렌더 단위마다 재사용되므로 복사해서 넘긴다.
    if (channel && channel.length) this.port.postMessage(channel.slice(0))
    return true
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor)
