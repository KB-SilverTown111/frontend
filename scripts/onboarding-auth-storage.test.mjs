import assert from 'node:assert/strict'
import test from 'node:test'

import { clearAuthSession, loadAuthSession, saveAuthSession } from '../src/api/authStorage.js'

test('auth session storage keeps tokens available and clears them on the web fallback', async () => {
  await clearAuthSession()

  const session = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2099-12-31T23:59:59Z',
    userId: 'user-001',
  }

  assert.equal(await loadAuthSession(), null)
  await saveAuthSession(session)
  assert.deepEqual(await loadAuthSession(), session)

  await clearAuthSession()
  assert.equal(await loadAuthSession(), null)
})
