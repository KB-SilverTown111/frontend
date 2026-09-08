/** @returns {{ accessToken: string, refreshToken: string, expiresAt: string, userId: string | number }} */
export function parseAuthResponse(value) {
  if (
    !value ||
    typeof value.accessToken !== 'string' ||
    typeof value.refreshToken !== 'string' ||
    typeof value.expiresAt !== 'string' ||
    !['string', 'number'].includes(typeof value.userId)
  ) {
    throw new Error('인증 응답 형식이 올바르지 않습니다.')
  }

  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    expiresAt: value.expiresAt,
    userId: value.userId,
  }
}

/** @returns {{ ttsVoice: string, speechRateMultiplier: number, pitchMultiplier: number, volumeMultiplier: number, updatedAt: string }} */
export function parseVoiceSettingsResponse(value) {
  if (
    !value ||
    typeof value.ttsVoice !== 'string' ||
    typeof value.speechRateMultiplier !== 'number' ||
    typeof value.pitchMultiplier !== 'number' ||
    typeof value.volumeMultiplier !== 'number' ||
    typeof value.updatedAt !== 'string'
  ) {
    throw new Error('음성 설정 응답 형식이 올바르지 않습니다.')
  }

  return {
    ttsVoice: value.ttsVoice,
    speechRateMultiplier: value.speechRateMultiplier,
    pitchMultiplier: value.pitchMultiplier,
    volumeMultiplier: value.volumeMultiplier,
    updatedAt: value.updatedAt,
  }
}
