import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

import { parseAuthResponse } from '../api/auth-contract.js'

export const AUTH_SESSION_KEY = 'gwipyeonhan.auth-session.v1'

let memorySession = null

function isNativePlatform() {
  return Capacitor.isNativePlatform()
}

/**
 * 웹은 탭을 닫으면 지워지는 sessionStorage만 쓴다. localStorage보다 노출이 짧다.
 * 브라우저가 저장소를 막으면(사생활 보호 모드 등) 지금처럼 메모리에만 둔다.
 */
function webStorage() {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

function parseStoredSession(value) {
  try {
    return parseAuthResponse(typeof value === 'string' ? JSON.parse(value) : value)
  } catch {
    return null
  }
}

/** 만료된 토큰으로 복원하면 로그인처럼 보이지만 모든 요청이 401이 된다. */
function isExpiredSession(session) {
  const expiresAt = Date.parse(session?.expiresAt ?? '')
  return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

async function readNativeSession() {
  const stored = await SecureStorage.get(AUTH_SESSION_KEY, false)
  if (stored === null) return null

  const session = parseStoredSession(stored)
  if (!session) {
    await SecureStorage.remove(AUTH_SESSION_KEY).catch(() => {})
    return null
  }

  return session
}

function readStoredItem(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function readWebSession() {
  const storage = webStorage()
  if (!storage) return null

  const stored = readStoredItem(storage, AUTH_SESSION_KEY)
  if (stored === null) return null

  const session = parseStoredSession(stored)
  if (!session) {
    try {
      storage.removeItem(AUTH_SESSION_KEY)
    } catch {
      // 저장소를 비우지 못해도 세션을 복원하지 않으므로 로그아웃 상태로 남는다.
    }
    return null
  }

  return session
}

export async function loadAuthSession({ allowExpired = false } = {}) {
  if (!memorySession) {
    memorySession = isNativePlatform() ? await readNativeSession() : readWebSession()
  }
  if (!memorySession) return null

  if (!allowExpired && isExpiredSession(memorySession)) {
    await clearAuthSession().catch(() => {})
    return null
  }

  return memorySession
}

export async function saveAuthSession(value) {
  const session = parseAuthResponse(value)
  memorySession = session

  if (isNativePlatform()) {
    await SecureStorage.set(AUTH_SESSION_KEY, session, false)
    return session
  }

  const storage = webStorage()
  if (storage) storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))

  return session
}

export async function clearAuthSession() {
  memorySession = null

  if (isNativePlatform()) {
    await SecureStorage.remove(AUTH_SESSION_KEY)
    return
  }

  const storage = webStorage()
  if (storage) storage.removeItem(AUTH_SESSION_KEY)
}
