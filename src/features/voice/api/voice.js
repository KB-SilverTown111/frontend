import { apiClient } from '../../../shared/api/client.js'

export const voiceApi = {
  async createSession(request) {
    const { data } = await apiClient.post('/voice/sessions', request)
    return data
  },

  async getSession(sessionId) {
    const { data } = await apiClient.get(`/voice/sessions/${sessionId}`)
    return data
  },

  async sendTurn(sessionId, request) {
    const { data } = await apiClient.post(`/voice/sessions/${sessionId}/turns`, request)
    return data
  },

  async uiAction(sessionId, request) {
    const { data } = await apiClient.post(`/voice/sessions/${sessionId}/ui-actions`, request)
    return data
  },

  async event(sessionId, request) {
    const { data } = await apiClient.post(`/voice/sessions/${sessionId}/events`, request)
    return data
  },

  async closeSession(sessionId) {
    const { data } = await apiClient.post(`/voice/sessions/${sessionId}/close`)
    return data
  },

  async issueSpeechToken() {
    const { data } = await apiClient.post('/voice/speech-token')
    return data
  },

  async getSettings() {
    const { data } = await apiClient.get('/users/me/voice-settings')
    return data
  },

  async updateSettings(request) {
    const { data } = await apiClient.put('/users/me/voice-settings', request)
    return data
  },
}
