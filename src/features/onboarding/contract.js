export const CONSENT_DOCUMENT_VERSION = '2026-09-05'

export const CONSENT_DEFINITIONS = Object.freeze([
  {
    type: 'TERMS_OF_SERVICE',
    title: '서비스 이용약관',
    description: '귀편한 금융 서비스 제공을 위해 필요합니다.',
    retention: '회원 탈퇴 시까지',
    required: true,
  },
  {
    type: 'PRIVACY_COLLECTION',
    title: '개인정보 수집·이용',
    description: '본인 확인과 금융 서비스 제공에 사용합니다.',
    retention: '회원 탈퇴 시까지',
    required: true,
  },
  {
    type: 'MYDATA_FINANCIAL',
    title: '마이데이터 수집·이용',
    description: '계좌와 거래 정보를 한곳에서 보여드릴 때 사용합니다.',
    retention: '동의 철회 시까지',
    required: true,
  },
  {
    type: 'AI_VOICE_DATA',
    title: 'AI 음성정보 이용',
    description: '음성 명령과 개인별 말하기 설정에 사용합니다.',
    retention: '음성 처리 후 즉시 삭제',
    required: true,
  },
  {
    type: 'AI_FINANCIAL_DATA_OPTIONAL',
    title: 'AI 금융정보 활용',
    description: '개인화된 금융 안내를 제공할 때 사용합니다.',
    retention: '동의 철회 시까지',
    required: false,
  },
])

export const VOICE_OPTIONS = Object.freeze([
  { value: 'ko-KR-JiMinNeural', label: '지민', description: '차분하고 편안한 목소리' },
  { value: 'ko-KR-GookMinNeural', label: '국민', description: '또렷하고 안정적인 목소리' },
])

export function createOnboardingDraft() {
  return {
    loginId: '',
    password: '',
    name: '',
    gender: '',
    residentNumberFront: '',
    residentNumberBack: '',
    postalCode: '',
    address: '',
    detailAddress: '',
    bankCode: '',
    accountNumber: '',
    phone: '',
    emergencyContact: { name: '', relationship: '', phone: '' },
    consents: Object.fromEntries(CONSENT_DEFINITIONS.map(({ type }) => [type, false])),
    voiceSettings: {
      ttsVoice: 'ko-KR-JiMinNeural',
      speechRateMultiplier: 1.05,
      volumeMultiplier: 1,
    },
  }
}

function digits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function isAllowedResidentNumberFirstDigit(value) {
  return /^[1-8]$/.test(String(value ?? ''))
}

export function formatPhoneNumber(value) {
  const normalized = digits(value).slice(0, 11)
  if (normalized.length <= 3) return normalized
  if (normalized.length <= 7) return `${normalized.slice(0, 3)}-${normalized.slice(3)}`
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`
}

function isBetween(value, minimum, maximum) {
  return Number.isFinite(Number(value)) && Number(value) >= minimum && Number(value) <= maximum
}

export function resolvePostcodeSelection(data) {
  return {
    postalCode: String(data.zonecode ?? ''),
    address: String(data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress),
  }
}

export function validateStep(stepId, draft) {
  const errors = {}

  if (['consents', 'consent-overview'].includes(stepId)) {
    const missingRequired = CONSENT_DEFINITIONS.some(
      ({ type, required }) => required && !draft.consents[type],
    )
    if (missingRequired) errors.consents = '필수 동의 항목을 확인해 주세요.'
  }

  if (['account', 'basic-info', 'login'].includes(stepId)) {
    if (!/^[a-zA-Z0-9]{4,}$/.test(String(draft.loginId ?? ''))) {
      errors.loginId = '아이디는 영문과 숫자를 사용해 4자 이상 입력해 주세요.'
    }
    if (String(draft.password ?? '').length < 8) {
      errors.password = '비밀번호는 8자 이상 입력해 주세요.'
    }
  }

  if (['identity', 'basic-info'].includes(stepId)) {
    if (!String(draft.name ?? '').trim()) errors.name = '이름을 입력해 주세요.'
    if (!['FEMALE', 'MALE'].includes(draft.gender)) errors.gender = '성별을 선택해 주세요.'
  }

  if (['identity', 'resident-number'].includes(stepId)) {
    const residentNumberBack = digits(draft.residentNumberBack)

    if (!/^\d{6}$/.test(digits(draft.residentNumberFront))) {
      errors.residentNumberFront = '주민등록번호 앞자리 6자리를 입력해 주세요.'
    }
    if (!/^\d{7}$/.test(residentNumberBack)) {
      errors.residentNumberBack = '주민등록번호 뒷자리 7자리를 입력해 주세요.'
    } else if (!isAllowedResidentNumberFirstDigit(residentNumberBack[0])) {
      errors.residentNumberBack = '주민등록번호 뒷자리 형식이 올바르지 않습니다.'
    }
  }

  if (['contact', 'address'].includes(stepId)) {
    if (!String(draft.postalCode ?? '').trim()) errors.postalCode = '우편번호를 입력해 주세요.'
    if (!String(draft.address ?? '').trim()) errors.address = '기본 주소를 입력해 주세요.'
  }

  if (['contact', 'phone'].includes(stepId)) {
    if (!/^\d{10,11}$/.test(digits(draft.phone))) {
      errors.phone = '휴대전화 번호를 확인해 주세요.'
    }
  }

  if (['finance', 'bank-account'].includes(stepId)) {
    if (!String(draft.bankCode ?? '').trim()) errors.bankCode = '은행을 선택해 주세요.'
    if (!digits(draft.accountNumber)) errors.accountNumber = '계좌번호를 입력해 주세요.'
  }

  if (['finance', 'emergency-contact'].includes(stepId)) {
    if (!String(draft.emergencyContact.name ?? '').trim()) {
      errors.emergencyContactName = '비상 연락처 이름을 입력해 주세요.'
    }
    if (!String(draft.emergencyContact.relationship ?? '').trim()) {
      errors.emergencyContactRelationship = '관계를 선택해 주세요.'
    }
    if (!/^\d{10,11}$/.test(digits(draft.emergencyContact.phone))) {
      errors.emergencyContactPhone = '비상 연락처 번호를 확인해 주세요.'
    }
  }

  if (stepId === 'voice') {
    if (!VOICE_OPTIONS.some(({ value }) => value === draft.voiceSettings.ttsVoice)) {
      errors.ttsVoice = '지원하는 음성을 선택해 주세요.'
    }
    if (!isBetween(draft.voiceSettings.speechRateMultiplier, 0.9, 1.2)) {
      errors.speechRateMultiplier = '말하기 속도는 0.90에서 1.20 사이여야 합니다.'
    }
    if (!isBetween(draft.voiceSettings.volumeMultiplier, 1, 1.2)) {
      errors.volumeMultiplier = '음량은 1.00에서 1.20 사이여야 합니다.'
    }
  }

  return errors
}

/** @returns {{ loginId: string, password: string, name: string, residentRegistrationNumber: string, gender: string, postalCode: string, address: string, detailAddress: string, bankCode: string, accountNumber: string, phone: string, emergencyContact: { name: string, relationship: string, phone: string }, consents: Array<{ type: string, agreed: boolean, documentVersion: string }> }} */
export function buildSignUpRequest(draft) {
  return {
    loginId: String(draft.loginId).trim(),
    password: String(draft.password),
    name: String(draft.name).trim(),
    residentRegistrationNumber: `${digits(draft.residentNumberFront)}${digits(draft.residentNumberBack)}`,
    gender: draft.gender,
    postalCode: String(draft.postalCode).trim(),
    address: String(draft.address).trim(),
    detailAddress: String(draft.detailAddress).trim(),
    bankCode: draft.bankCode,
    accountNumber: digits(draft.accountNumber),
    phone: digits(draft.phone),
    emergencyContact: {
      name: String(draft.emergencyContact.name).trim(),
      relationship: draft.emergencyContact.relationship,
      phone: digits(draft.emergencyContact.phone),
    },
    consents: CONSENT_DEFINITIONS.map(({ type }) => ({
      type,
      agreed: Boolean(draft.consents[type]),
      documentVersion: CONSENT_DOCUMENT_VERSION,
    })),
  }
}

/** @returns {{ loginId: string, password: string }} */
export function buildLoginRequest(draft) {
  return {
    loginId: String(draft.loginId).trim(),
    password: String(draft.password),
  }
}

/** @returns {{ ttsVoice: string, speechRateMultiplier: number, volumeMultiplier: number }} */
export function buildVoiceSettingsRequest(draft) {
  return {
    ttsVoice: draft.voiceSettings.ttsVoice,
    speechRateMultiplier: Number(draft.voiceSettings.speechRateMultiplier),
    volumeMultiplier: Number(draft.voiceSettings.volumeMultiplier),
  }
}

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
