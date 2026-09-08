export const ONBOARDING_STEPS = Object.freeze([
  { id: 'start', title: '시작하기', progress: 0 },
  { id: 'consent-overview', title: '약관 한눈에 보기', progress: 1 },
  { id: 'basic-info', title: '기본 정보', progress: 3 },
  { id: 'resident-number', title: '주민등록번호', progress: 4 },
  { id: 'address', title: '주소 입력', progress: 5 },
  { id: 'bank-account', title: '은행 계좌', progress: 6 },
  { id: 'phone', title: '휴대전화', progress: 7 },
  { id: 'emergency-contact', title: '비상 연락처', progress: 8 },
  { id: 'permissions', title: '권한 이용 안내', progress: 10 },
  { id: 'complete', title: '가입 완료', progress: 10 },
])

export const ONBOARDING_PROGRESS_TOTAL = 10

const ONBOARDING_DISPLAY_PROGRESS = Object.freeze({
  'consent-overview': 1,
  'consent-optional': 1,
  'mydata-consent': 1,
  'ai-voice-consent': 1,
  'basic-info': 2,
  'missing-fields': 2,
  'resident-number': 3,
  address: 4,
  'address-not-found': 4,
  'bank-account': 5,
  'bank-select': 5,
  'account-error': 5,
  phone: 6,
  'emergency-contact': 7,
  permissions: 7,
  'microphone-denied': 7,
  'notification-denied': 7,
})

export const ONBOARDING_DISPLAY_PROGRESS_TOTAL = 7

export function getOnboardingDisplayProgress(stepId) {
  const current = ONBOARDING_DISPLAY_PROGRESS[stepId]
  if (!current) return null

  return { current, total: ONBOARDING_DISPLAY_PROGRESS_TOTAL }
}

export function getOnboardingStep(stepId) {
  return ONBOARDING_STEPS.find(({ id }) => id === stepId) ?? null
}

export function getAdjacentStep(stepId, direction) {
  const currentIndex = ONBOARDING_STEPS.findIndex(({ id }) => id === stepId)
  if (currentIndex < 0) return null

  return ONBOARDING_STEPS[currentIndex + direction]?.id ?? null
}
