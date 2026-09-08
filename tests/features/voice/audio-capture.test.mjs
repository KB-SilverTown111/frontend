import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createResampler,
  startAudioCapture,
} from '../../../src/features/voice/services/audioCapture.js'

function replaceGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { configurable: true, value })
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous)
    else delete globalThis[name]
  }
}

test('resampler keeps the fractional position that overshoots a short input block', () => {
  const resample = createResampler(48_000, 16_000)

  assert.deepEqual([...resample(Float32Array.from([0, 1, 2, 3, 4]))], [0, 3])
  assert.deepEqual([...resample(Float32Array.from([5, 6, 7, 8]))], [6])
})

test('audio capture releases the stream when AudioContext construction fails', async () => {
  let stopped = 0
  const restoreWindow = replaceGlobal('window', {
    AudioContext: class AudioContext {
      constructor() {
        throw new Error('AudioContext unavailable')
      }
    },
  })
  const restoreNavigator = replaceGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async () => ({
        getTracks: () => [{ stop: () => (stopped += 1) }],
      }),
    },
  })

  try {
    await assert.rejects(
      startAudioCapture({ onFrame: () => {} }),
      (error) => error?.code === 'AUDIO_CAPTURE_FAILED',
    )
    assert.equal(stopped, 1)
  } finally {
    restoreNavigator()
    restoreWindow()
  }
})
