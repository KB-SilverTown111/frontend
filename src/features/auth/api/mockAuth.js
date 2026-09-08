import { parseAuthResponse, parseVoiceSettingsResponse } from '../../../shared/api/auth-contract.js'

export const mockAuthApi = {
  async signup() {
    return parseAuthResponse({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: '2099-12-31T23:59:59Z',
      userId: 'mock-user-001',
    })
  },

  async login() {
    return parseAuthResponse({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: '2099-12-31T23:59:59Z',
      userId: 'mock-user-001',
    })
  },

  async refresh() {
    return parseAuthResponse({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: '2099-12-31T23:59:59Z',
      userId: 'mock-user-001',
    })
  },

  async logout() {},

  async saveVoiceSettings(request) {
    return parseVoiceSettingsResponse({
      ...request,
      pitchMultiplier: 0.97,
      updatedAt: new Date().toISOString(),
    })
  },
}
