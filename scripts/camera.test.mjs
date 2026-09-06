import assert from 'node:assert/strict'
import test from 'node:test'

import { takeBillPhoto } from '../src/services/nativeCapabilities.js'

test('native bill capture requests camera permission and opens the native camera', async () => {
  const calls = []
  const camera = {
    checkPermissions: async () => ({ camera: 'prompt', photos: 'prompt' }),
    requestPermissions: async (request) => {
      calls.push(['requestPermissions', request])
      return { camera: 'granted', photos: 'prompt' }
    },
    takePhoto: async (options) => {
      calls.push(['takePhoto', options])
      return { webPath: 'http://localhost/captured.jpg' }
    },
    getPhoto: async () => {
      throw new Error('legacy getPhoto should not be used for native capture')
    },
  }

  const result = await takeBillPhoto('camera', {
    camera,
    capacitor: { isNativePlatform: () => true },
  })

  assert.equal(result.webPath, 'http://localhost/captured.jpg')
  assert.deepEqual(calls, [
    ['requestPermissions', { permissions: ['camera'] }],
    ['takePhoto', { quality: 90 }],
  ])
})

test('browser bill capture falls back to the Camera input flow', async () => {
  const result = await takeBillPhoto('gallery', {
    camera: {
      getPhoto: async (options) => ({ options, webPath: 'blob:bill-image' }),
    },
    capacitor: { isNativePlatform: () => false },
  })

  assert.equal(result.webPath, 'blob:bill-image')
  assert.equal(result.options.webUseInput, true)
})
