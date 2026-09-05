import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSignUpRequest,
  buildVoiceSettingsRequest,
  createOnboardingDraft,
  parseAuthResponse,
  parseVoiceSettingsResponse,
  validateStep,
} from '../src/features/onboarding/contract.js'

function completeDraft() {
  return {
    loginId: 'silveruser',
    password: 'safe-pass-123',
    name: '김은희',
    gender: 'FEMALE',
    residentNumberFront: '650101',
    residentNumberBack: '2345678',
    postalCode: '06236',
    address: '서울특별시 강남구 테헤란로 123',
    detailAddress: '101동 202호',
    bankCode: '004',
    accountNumber: '12345678901234',
    phone: '01012345678',
    emergencyContact: {
      name: '김보호',
      relationship: 'DAUGHTER',
      phone: '01098765432',
    },
    consents: {
      TERMS_OF_SERVICE: true,
      PRIVACY: true,
      MYDATA: false,
      AI_VOICE: true,
      OVERSEAS_TRANSFER: false,
      AI_FINANCIAL_INFO: false,
    },
    voiceSettings: {
      ttsVoice: 'ko-KR-JiMinNeural',
      speechRateMultiplier: 1.05,
      volumeMultiplier: 1,
    },
  }
}

test('required consent refusal blocks the consent step while optional refusal does not', () => {
  const draft = completeDraft()

  assert.deepEqual(validateStep('consents', draft), {})

  draft.consents.PRIVACY = false
  assert.deepEqual(validateStep('consents', draft), {
    consents: '필수 동의 항목을 확인해 주세요.',
  })
})

test('identity validation rejects malformed resident registration number parts', () => {
  const draft = completeDraft()
  draft.residentNumberBack = '23'

  assert.deepEqual(validateStep('identity', draft), {
    residentNumberBack: '주민등록번호 뒷자리 7자리를 입력해 주세요.',
  })
})

test('each data-entry step reports only its own invalid fields', () => {
  const accountDraft = completeDraft()
  accountDraft.loginId = 'ab'
  accountDraft.password = 'short'
  assert.deepEqual(validateStep('account', accountDraft), {
    loginId: '아이디는 영문과 숫자를 사용해 4자 이상 입력해 주세요.',
    password: '비밀번호는 8자 이상 입력해 주세요.',
  })

  const contactDraft = completeDraft()
  contactDraft.address = ''
  contactDraft.phone = '01012'
  assert.deepEqual(validateStep('contact', contactDraft), {
    address: '기본 주소를 입력해 주세요.',
    phone: '휴대전화 번호를 확인해 주세요.',
  })

  const financeDraft = completeDraft()
  financeDraft.accountNumber = ''
  financeDraft.emergencyContact.phone = 'not-a-number'
  assert.deepEqual(validateStep('finance', financeDraft), {
    accountNumber: '계좌번호를 입력해 주세요.',
    emergencyContactPhone: '비상 연락처 번호를 확인해 주세요.',
  })
})

test('voice step enforces the documented voice and multiplier ranges', () => {
  const draft = completeDraft()
  draft.voiceSettings.ttsVoice = 'unsupported'
  draft.voiceSettings.speechRateMultiplier = 1.3
  draft.voiceSettings.volumeMultiplier = 0.9

  assert.deepEqual(validateStep('voice', draft), {
    ttsVoice: '지원하는 음성을 선택해 주세요.',
    speechRateMultiplier: '말하기 속도는 0.90에서 1.20 사이여야 합니다.',
    volumeMultiplier: '음량은 1.00에서 1.20 사이여야 합니다.',
  })
})

test('signup request matches the documented API shape without UI-only fields', () => {
  const request = buildSignUpRequest(completeDraft())

  assert.deepEqual(request, {
    loginId: 'silveruser',
    password: 'safe-pass-123',
    name: '김은희',
    residentRegistrationNumber: '6501012345678',
    gender: 'FEMALE',
    postalCode: '06236',
    address: '서울특별시 강남구 테헤란로 123',
    detailAddress: '101동 202호',
    bankCode: '004',
    accountNumber: '12345678901234',
    phone: '01012345678',
    emergencyContact: {
      name: '김보호',
      relationship: 'DAUGHTER',
      phone: '01098765432',
    },
    consents: [
      { type: 'TERMS_OF_SERVICE', agreed: true, documentVersion: '2026-09-05' },
      { type: 'PRIVACY', agreed: true, documentVersion: '2026-09-05' },
      { type: 'MYDATA', agreed: false, documentVersion: '2026-09-05' },
      { type: 'AI_VOICE', agreed: true, documentVersion: '2026-09-05' },
      { type: 'OVERSEAS_TRANSFER', agreed: false, documentVersion: '2026-09-05' },
      { type: 'AI_FINANCIAL_INFO', agreed: false, documentVersion: '2026-09-05' },
    ],
  })
})

test('voice settings request preserves only the documented fields', () => {
  assert.deepEqual(buildVoiceSettingsRequest(completeDraft()), {
    ttsVoice: 'ko-KR-JiMinNeural',
    speechRateMultiplier: 1.05,
    volumeMultiplier: 1,
  })
})

test('auth response parser rejects incomplete token responses', () => {
  assert.throws(
    () => parseAuthResponse({ accessToken: 'access-only' }),
    /인증 응답 형식이 올바르지 않습니다/,
  )

  assert.deepEqual(
    parseAuthResponse({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2026-09-05T12:00:00Z',
      userId: 17,
    }),
    {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2026-09-05T12:00:00Z',
      userId: 17,
    },
  )
})

test('voice response parser keeps server pitch and rejects out-of-contract data', () => {
  const response = {
    ttsVoice: 'ko-KR-JiMinNeural',
    speechRateMultiplier: 1.05,
    pitchMultiplier: 0.97,
    volumeMultiplier: 1,
    updatedAt: '2026-09-05T12:00:00Z',
  }

  assert.deepEqual(parseVoiceSettingsResponse(response), response)
  assert.throws(
    () => parseVoiceSettingsResponse({ ...response, pitchMultiplier: undefined }),
    /음성 설정 응답 형식이 올바르지 않습니다/,
  )
})

test('new drafts do not share nested consent or emergency contact state', () => {
  const first = createOnboardingDraft()
  const second = createOnboardingDraft()

  first.consents.PRIVACY = true
  first.emergencyContact.name = '변경됨'

  assert.equal(second.consents.PRIVACY, false)
  assert.equal(second.emergencyContact.name, '')
})
