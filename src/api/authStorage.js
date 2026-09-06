import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

import { parseAuthResponse } from '../features/onboarding/contract.js'

export const AUTH_SESSION_KEY = 'gwipyeonhan.auth-session.v1'

let memorySession = null

function isNativePlatform() {
  return Capacitor.isNativePlatform()
}

function parseStoredSession(value) {
  try {
    return parseAuthResponse(typeof value === 'string' ? JSON.parse(value) : value)
  } catch {
    return null
  }
}

export async function loadAuthSession() {
  if (memorySession) return memorySession
  if (!isNativePlatform()) return null

  const stored = await SecureStorage.get(AUTH_SESSION_KEY, false)
  if (stored === null) return null

  const session = parseStoredSession(stored)
  if (!session) {
    await SecureStorage.remove(AUTH_SESSION_KEY).catch(() => {})
    return null
  }

  memorySession = session
  return session
}

export async function saveAuthSession(value) {
  const session = parseAuthResponse(value)
  memorySession = session

  if (isNativePlatform()) {
    await SecureStorage.set(AUTH_SESSION_KEY, session, false)
  }

  return session
}

export async function clearAuthSession() {
  memorySession = null

  if (isNativePlatform()) {
    await SecureStorage.remove(AUTH_SESSION_KEY)
  }
}
