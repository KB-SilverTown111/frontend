import assert from 'node:assert/strict'
import test from 'node:test'

import { Capacitor } from '@capacitor/core'

import { abortSpeechCapture, captureSpeech } from '../../../src/features/voice/services/voiceStt.js'

function replaceGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { configurable: true, value })
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous)
    else delete globalThis[name]
  }
}

test('web speech abort waits for recognition end before resolving', async () => {
  const originalNativeCheck = Capacitor.isNativePlatform
  let recognition
  class FakeRecognition {
    constructor() {
      recognition = this
    }

    start() {}

    abort() {}
  }

  Capacitor.isNativePlatform = () => false
  const restoreWindow = replaceGlobal('window', { SpeechRecognition: FakeRecognition })

  try {
    const capture = captureSpeech()
    const abort = abortSpeechCapture()
    let settled = false
    abort.then(() => {
      settled = true
    })

    await Promise.resolve()
    assert.equal(settled, false)

    recognition.onend()
    await abort
    await assert.rejects(capture, /말씀을 듣지 못했어요/)
  } finally {
    Capacitor.isNativePlatform = originalNativeCheck
    restoreWindow()
  }
})
