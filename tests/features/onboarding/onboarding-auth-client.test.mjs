import assert from 'node:assert/strict'
import test from 'node:test'

import { clearAuthSession, saveAuthSession } from '../../../src/shared/services/authStorage.js'
import { apiClient, resolveApiBaseUrl } from '../../../src/shared/api/client.js'

test('API base URL includes the backend API prefix exactly once', () => {
  assert.equal(
    resolveApiBaseUrl('https://backend-api-production-a983.up.railway.app'),
    'https://backend-api-production-a983.up.railway.app/api',
  )
  assert.equal(
    resolveApiBaseUrl('https://backend-api-production-a983.up.railway.app/api/'),
    'https://backend-api-production-a983.up.railway.app/api',
  )
  assert.equal(resolveApiBaseUrl(''), '/api')
})

test('API client sends the stored access token only to protected requests', async () => {
  await clearAuthSession()
  await saveAuthSession({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2099-12-31T23:59:59Z',
    userId: 'user-001',
  })

  const originalAdapter = apiClient.defaults.adapter
  apiClient.defaults.adapter = async (config) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  try {
    const protectedResponse = await apiClient.get('/users/me')
    assert.equal(protectedResponse.config.headers.Authorization, 'Bearer access-token')

    const publicResponse = await apiClient.post('/auth/login', {})
    assert.equal(publicResponse.config.headers.Authorization, undefined)
  } finally {
    apiClient.defaults.adapter = originalAdapter
    await clearAuthSession()
  }
})

test('API client preserves an existing lowercase authorization header', async () => {
  await clearAuthSession()
  await saveAuthSession({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2099-12-31T23:59:59Z',
    userId: 'user-001',
  })

  const originalAdapter = apiClient.defaults.adapter
  apiClient.defaults.adapter = async (config) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  try {
    const response = await apiClient.get('/users/me', {
      headers: { authorization: 'existing-token' },
    })

    assert.equal(response.config.headers.getAuthorization(), 'existing-token')
  } finally {
    apiClient.defaults.adapter = originalAdapter
    await clearAuthSession()
  }
})
