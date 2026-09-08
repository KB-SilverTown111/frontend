import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from '../../../src/shared/services/authStorage.js'

const authStorageUrl = new URL('../../../src/shared/services/authStorage.js', import.meta.url)

const session = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: '2099-12-31T23:59:59Z',
  userId: 'user-001',
}

/** 새로고침처럼 모듈 상태가 비어 있는 인스턴스를 만든다. */
function reloadAuthStorage(label) {
  return import(`${authStorageUrl.href}?reload=${label}`)
}

function useFakeSessionStorage() {
  const values = new Map()

  globalThis.sessionStorage = {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }

  return () => delete globalThis.sessionStorage
}

test('auth session storage keeps tokens available and clears them on the web fallback', async () => {
  await clearAuthSession()

  assert.equal(await loadAuthSession(), null)
  await saveAuthSession(session)
  assert.deepEqual(await loadAuthSession(), session)

  await clearAuthSession()
  assert.equal(await loadAuthSession(), null)
})

test('web session survives a page reload through sessionStorage', async () => {
  const restore = useFakeSessionStorage()

  try {
    const beforeReload = await reloadAuthStorage('save')
    await beforeReload.saveAuthSession(session)

    const afterReload = await reloadAuthStorage('load')
    assert.deepEqual(await afterReload.loadAuthSession(), session)

    await afterReload.clearAuthSession()

    const afterLogout = await reloadAuthStorage('logout')
    assert.equal(await afterLogout.loadAuthSession(), null)
  } finally {
    restore()
  }
})

test('expired session is discarded instead of restored', async () => {
  const restore = useFakeSessionStorage()

  try {
    const beforeReload = await reloadAuthStorage('expired-save')
    await beforeReload.saveAuthSession({ ...session, expiresAt: '2020-01-01T00:00:00Z' })

    const afterReload = await reloadAuthStorage('expired-load')
    assert.equal(await afterReload.loadAuthSession(), null)
    assert.equal(globalThis.sessionStorage.getItem('gwipyeonhan.auth-session.v1'), null)
  } finally {
    restore()
  }
})

test('broken stored value is removed instead of breaking the app', async () => {
  const restore = useFakeSessionStorage()

  try {
    globalThis.sessionStorage.setItem('gwipyeonhan.auth-session.v1', '{"accessToken":')

    const reloaded = await reloadAuthStorage('broken')
    assert.equal(await reloaded.loadAuthSession(), null)
    assert.equal(globalThis.sessionStorage.getItem('gwipyeonhan.auth-session.v1'), null)
  } finally {
    restore()
  }
})
