import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeApiError } from '../../../src/shared/api/errors.js'
import { authApi } from '../../../src/features/auth/api/auth.js'
import { mockAuthApi } from '../../../src/features/auth/api/mockAuth.js'
import { selectOnboardingApi } from '../../../src/features/onboarding/api/onboarding.js'

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

test('onboarding selects the real auth API whenever a base URL is configured unless mock mode is explicit', () => {
  assert.equal(selectOnboardingApi({ VITE_API_BASE_URL: 'https://api.example.test' }), authApi)
  assert.equal(
    selectOnboardingApi({
      VITE_API_BASE_URL: 'https://api.example.test',
      VITE_USE_MOCK_API: 'true',
    }),
    mockAuthApi,
  )
})

test('mock signup uses the documented auth response shape', async () => {
  const auth = await mockAuthApi.signup({ loginId: 'silveruser' })

  assert.deepEqual(Object.keys(auth), ['accessToken', 'refreshToken', 'expiresAt', 'userId'])
})

test('mock login uses the documented credential request and auth response shape', async () => {
  const auth = await mockAuthApi.login({ loginId: 'silveruser', password: 'safe-pass-123' })

  assert.deepEqual(Object.keys(auth), ['accessToken', 'refreshToken', 'expiresAt', 'userId'])
})

test('mock refresh uses the documented auth response shape', async () => {
  const auth = await mockAuthApi.refresh({ refreshToken: 'refresh-token' })

  assert.deepEqual(Object.keys(auth), ['accessToken', 'refreshToken', 'expiresAt', 'userId'])
})
