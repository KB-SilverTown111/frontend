import { CONSENT_DEFINITIONS } from './contract.js'

export const ONBOARDING_SCREEN_IDS = Object.freeze([
  'start',
  'consent-overview',
  'consent-optional',
  'basic-info',
  'resident-number',
  'address',
  'bank-account',
  'bank-select',
  'phone',
  'emergency-contact',
  'permissions',
  'complete',
  'login',
  'relogin',
  'mydata-consent',
  'ai-voice-consent',
  'address-not-found',
  'account-error',
  'missing-fields',
  'microphone-denied',
  'notification-denied',
])

export const SCREEN_COPY = Object.freeze({
  start: ['시작하기', '큰 글씨와 음성 안내로 가입을 시작합니다.'],
  'consent-overview': ['약관 한눈에 보기', '필수와 선택 동의를 분리해 보여줍니다.'],
  'consent-optional': ['선택 동의 상세', '수집 범주·목적·보유기간을 중립적으로 표시합니다.'],
  'basic-info': ['기본 정보', '이름과 성별 정보를 입력합니다.'],
  'resident-number': ['주민등록번호', '보안 키패드로 민감 정보를 입력합니다.'],
  address: ['주소 입력', '검색과 직접 입력 경로를 함께 제공합니다.'],
  'bank-account': ['은행 계좌', '은행과 본인 계좌를 연결합니다.'],
  phone: ['휴대전화', '연락 가능한 번호만 입력합니다.'],
  'emergency-contact': ['비상 연락처', '보호자 또는 가족 연락처를 등록합니다.'],
  permissions: ['권한 이용 안내', '이해했어요를 누르면 필요한 권한을 한 번에 요청합니다.'],
  complete: ['가입 완료', '필수 정보 입력이 끝났습니다.'],
  login: ['로그인', '아이디와 비밀번호로 본인을 확인합니다.'],
  relogin: ['다시 로그인', '다른 기기에서 접속해 확인이 필요합니다.'],
  'mydata-consent': ['마이데이터 동의', '어떤 정보를 언제까지 쓰는지 알려드립니다.'],
  'ai-voice-consent': ['AI 음성정보 동의', '목소리 정보를 어떻게 쓰는지 알려드립니다.'],
  'address-not-found': ['주소를 못 찾았어요', '검색 결과가 없을 때 직접 입력합니다.'],
  'account-error': ['계좌 확인 실패', '계좌 정보를 확인하지 못했습니다.'],
  'missing-fields': ['빠진 곳이 있어요', '꼭 필요한 항목을 알려드립니다.'],
  'microphone-denied': ['마이크를 못 써요', '음성 기능에 마이크 권한이 필요합니다.'],
  'notification-denied': ['알림을 못 보내요', '알림 권한이 꺼져 있습니다.'],
})

export function isOnboardingScreen(screenId) {
  return ONBOARDING_SCREEN_IDS.includes(screenId)
}

export const CONSENT_TYPE_BY_SCREEN = Object.freeze({
  'mydata-consent': 'MYDATA_FINANCIAL',
  'ai-voice-consent': 'AI_VOICE_DATA',
})

export const CONSENT_DETAIL_SEQUENCE = Object.freeze(['mydata-consent', 'ai-voice-consent'])

export const CONSENT_FLOW_RETURN_SCREEN = 'consent-overview'

export function getNextConsentScreen(screenId) {
  const currentIndex = CONSENT_DETAIL_SEQUENCE.indexOf(screenId)
  if (currentIndex < 0) return null
  return CONSENT_DETAIL_SEQUENCE[currentIndex + 1] ?? null
}

export function areConsentDetailsAgreed(draft) {
  return CONSENT_DETAIL_SEQUENCE.every(
    (screenId) => draft?.consents?.[CONSENT_TYPE_BY_SCREEN[screenId]] === true,
  )
}

export function setConsentDecision(draft, screenId, agreed) {
  const consentType = CONSENT_TYPE_BY_SCREEN[screenId]
  if (!consentType) return false
  draft.consents[consentType] = Boolean(agreed)
  return true
}

export function resetRequiredConsents(draft) {
  for (const { type, required } of CONSENT_DEFINITIONS) {
    if (required) draft.consents[type] = false
  }
}

export function toggleRequiredConsents(draft) {
  const requiredTypes = CONSENT_DEFINITIONS.filter(({ required }) => required).map(
    ({ type }) => type,
  )
  const agreed = requiredTypes.every((type) => draft.consents[type])
  for (const type of requiredTypes) draft.consents[type] = !agreed
}

function secureRandomIndex(maxExclusive) {
  const range = 2 ** 32
  const limit = range - (range % maxExclusive)
  const value = new Uint32Array(1)

  do crypto.getRandomValues(value)
  while (value[0] >= limit)

  return value[0] % maxExclusive
}

export function createRandomDigitOrder(randomIndex = secureRandomIndex) {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

  for (let index = digits.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    ;[digits[index], digits[swapIndex]] = [digits[swapIndex], digits[index]]
  }

  return digits
}

export function pickDecoyDigits(order, actualDigit, count = 2, randomIndex = secureRandomIndex) {
  const candidates = order.filter((digit) => digit !== actualDigit)
  const decoys = []

  while (decoys.length < count && candidates.length) {
    decoys.push(candidates.splice(randomIndex(candidates.length), 1)[0])
  }

  return decoys
}
