import assert from 'node:assert/strict'
import test from 'node:test'

import { captureVideoFrame, takeBillPhoto } from '../../src/shared/native/nativeCapabilities.js'

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

test('video frame capture returns a jpeg blob at the camera resolution', async () => {
  const drawCalls = []
  const canvas = {
    getContext: () => ({
      drawImage: (...args) => drawCalls.push(args),
    }),
    toBlob: (resolve, type, quality) => {
      assert.equal(type, 'image/jpeg')
      assert.equal(quality, 0.9)
      resolve(new Blob(['captured-frame'], { type }))
    },
  }
  const video = { videoWidth: 640, videoHeight: 480 }

  const result = await captureVideoFrame(video, canvas)

  assert.equal(canvas.width, 640)
  assert.equal(canvas.height, 480)
  assert.deepEqual(drawCalls, [[video, 0, 0, 640, 480]])
  assert.equal(result.type, 'image/jpeg')
})

test('video frame capture returns no image until the camera has dimensions', async () => {
  const canvas = {
    getContext: () => ({ drawImage: () => {} }),
    toBlob: () => {
      throw new Error('canvas should not be used before video playback is ready')
    },
  }

  assert.equal(await captureVideoFrame({ videoWidth: 0, videoHeight: 480 }, canvas), null)
})
