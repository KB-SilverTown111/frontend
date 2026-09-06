import { parseAuthResponse, parseVoiceSettingsResponse } from '../features/onboarding/contract.js'

import { apiClient } from './client.js'

export const authApi = {
  async signup(request) {
    const { data } = await apiClient.post('/auth/signup', request)
    return parseAuthResponse(data)
  },

  async login(request) {
    const { data } = await apiClient.post('/auth/login', request)
    return parseAuthResponse(data)
  },

  async refresh(request) {
    const { data } = await apiClient.post('/auth/refresh', request)
    return parseAuthResponse(data)
  },

  async logout(request) {
    await apiClient.post('/auth/logout', request)
  },

  async saveVoiceSettings(request, accessToken) {
    const { data } = await apiClient.put('/users/me/voice-settings', request, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return parseVoiceSettingsResponse(data)
  },
}
