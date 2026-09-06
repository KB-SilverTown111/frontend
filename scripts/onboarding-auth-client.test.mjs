import assert from 'node:assert/strict'
import test from 'node:test'

import { clearAuthSession, saveAuthSession } from '../src/api/authStorage.js'
import { apiClient } from '../src/api/client.js'

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
