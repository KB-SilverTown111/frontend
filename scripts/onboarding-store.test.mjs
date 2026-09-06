import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'

import { clearAuthSession } from '../src/api/authStorage.js'
import { useOnboardingStore } from '../src/stores/onboarding.js'

test('store submits the signup request and saves voice settings with the development adapter', async () => {
  setActivePinia(createPinia())
  const store = useOnboardingStore()

  store.$patch({
    draft: {
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
        relationship: '딸',
        phone: '01098765432',
      },
      consents: {
        TERMS_OF_SERVICE: true,
        PRIVACY_COLLECTION: true,
        MYDATA_FINANCIAL: true,
        AI_VOICE_DATA: true,
        AI_FINANCIAL_DATA_OPTIONAL: false,
      },
      voiceSettings: {
        ttsVoice: 'ko-KR-JiMinNeural',
        speechRateMultiplier: 1.05,
        volumeMultiplier: 1,
      },
    },
  })

  const result = await store.submit()

  assert.equal(result.ok, true)
  assert.equal(store.status, 'success')
  assert.equal(store.authResult.userId, 'mock-user-001')
  assert.equal(store.voiceResult.pitchMultiplier, 0.97)
  assert.equal(store.submitError, null)
})

test('store exposes step errors and clears them after valid input', () => {
  setActivePinia(createPinia())
  const store = useOnboardingStore()

  assert.equal(store.validate('account'), false)
  assert.equal(store.fieldErrors.loginId.length > 0, true)

  store.draft.loginId = 'silveruser'
  store.draft.password = 'safe-pass-123'

  assert.equal(store.validate('account'), true)
  assert.deepEqual(store.fieldErrors, {})
})

test('store logs in with the ID and password fields', async () => {
  setActivePinia(createPinia())
  const store = useOnboardingStore()
  store.draft.loginId = 'silveruser'
  store.draft.password = 'safe-pass-123'

  const result = await store.login()

  assert.equal(result.ok, true)
  assert.equal(store.authResult.userId, 'mock-user-001')
  assert.equal(store.status, 'success')
})

test('store restores and clears the authenticated session across app instances', async () => {
  await clearAuthSession()

  setActivePinia(createPinia())
  const signedInStore = useOnboardingStore()
  signedInStore.draft.loginId = 'silveruser'
  signedInStore.draft.password = 'safe-pass-123'
  await signedInStore.login()

  setActivePinia(createPinia())
  const restoredStore = useOnboardingStore()
  await restoredStore.restoreAuthSession()
  assert.equal(restoredStore.authResult.accessToken, 'mock-access-token')

  await restoredStore.reset()
  setActivePinia(createPinia())
  const clearedStore = useOnboardingStore()
  await clearedStore.restoreAuthSession()
  assert.equal(clearedStore.authResult, null)
})

test('UI-only completion clears transient personal and financial data', () => {
  setActivePinia(createPinia())
  const store = useOnboardingStore()
  store.draft.residentNumberBack = '2345678'
  store.draft.accountNumber = '1234567890'
  store.draft.phone = '01012345678'

  store.finishUiFlow()

  assert.equal(store.status, 'ready')
  assert.equal(store.draft.residentNumberBack, '')
  assert.equal(store.draft.accountNumber, '')
  assert.equal(store.draft.phone, '')
})
