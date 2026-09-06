import axios from 'axios'

import { loadAuthSession } from './authStorage.js'

const runtimeEnvironment = import.meta.env || {}
const PUBLIC_AUTH_PATHS = ['/auth/signup', '/auth/login', '/auth/refresh', '/auth/logout']

export const apiClient = axios.create({
  baseURL: runtimeEnvironment.VITE_API_BASE_URL || '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(async (config) => {
  const requestPath = String(config.url ?? '').split('?')[0]
  const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some(
    (path) => requestPath === path || requestPath.endsWith(path),
  )

  if (isPublicAuthRequest) return config

  const authSession = await loadAuthSession().catch(() => null)
  if (authSession?.accessToken && !config.headers?.Authorization) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${authSession.accessToken}`
  }

  return config
})
