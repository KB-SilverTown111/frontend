import axios, { AxiosHeaders } from 'axios'

import { loadAuthSession } from '../services/authStorage.js'

const runtimeEnvironment = import.meta.env || {}
const PUBLIC_AUTH_PATHS = ['/auth/signup', '/auth/login', '/auth/refresh', '/auth/logout']

export function resolveApiBaseUrl(value) {
  const baseUrl = String(value ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (!baseUrl) return '/api'
  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(runtimeEnvironment.VITE_API_BASE_URL),
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
  if (authSession?.accessToken) {
    const headers = AxiosHeaders.from(config.headers)
    if (!headers.hasAuthorization()) {
      headers.setAuthorization(`Bearer ${authSession.accessToken}`)
    }
    config.headers = headers
  }

  return config
})
