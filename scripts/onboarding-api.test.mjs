import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeApiError } from '../src/api/errors.js'
import { mockAuthApi } from '../src/api/mockAuth.js'

test('API errors preserve the shared error contract without exposing raw transport data', () => {
  const normalized = normalizeApiError({
    response: {
      status: 400,
      data: {
        code: 'INVALID_REQUEST',
        message: '입력값을 확인해 주세요.',
        requestId: 'request-17',
        fieldErrors: [{ field: 'loginId', reason: '이미 사용 중입니다.' }],
        debugPayload: 'must-not-leak',
      },
    },
  })

  assert.deepEqual(normalized, {
    status: 400,
    code: 'INVALID_REQUEST',
    message: '입력값을 확인해 주세요.',
    requestId: 'request-17',
    fieldErrors: [{ field: 'loginId', reason: '이미 사용 중입니다.' }],
  })
})

test('unknown transport failures become a concise user-facing error', () => {
  assert.deepEqual(normalizeApiError(new Error('socket details')), {
    status: null,
    code: 'NETWORK_ERROR',
    message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    requestId: null,
    fieldErrors: [],
  })
})

test('mock signup and voice settings use the documented response shapes', async () => {
  const auth = await mockAuthApi.signup({ loginId: 'silveruser' })
  const voice = await mockAuthApi.saveVoiceSettings(
    {
      ttsVoice: 'ko-KR-JiMinNeural',
      speechRateMultiplier: 1.05,
      volumeMultiplier: 1,
    },
    auth.accessToken,
  )

  assert.deepEqual(Object.keys(auth), ['accessToken', 'refreshToken', 'expiresAt', 'userId'])
  assert.equal(voice.pitchMultiplier, 0.97)
  assert.equal(voice.ttsVoice, 'ko-KR-JiMinNeural')
})

test('mock login uses the documented credential request and auth response shape', async () => {
  const auth = await mockAuthApi.login({ loginId: 'silveruser', password: 'safe-pass-123' })

  assert.deepEqual(Object.keys(auth), ['accessToken', 'refreshToken', 'expiresAt', 'userId'])
})
