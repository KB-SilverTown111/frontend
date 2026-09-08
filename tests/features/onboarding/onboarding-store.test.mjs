import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'

import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from '../../../src/shared/services/authStorage.js'
import { onboardingApi } from '../../../src/features/onboarding/api/onboarding.js'
import { useBillStore } from '../../../src/features/bills/stores/bill.js'
import { useOnboardingStore } from '../../../src/features/onboarding/stores/onboarding.js'
import { useServiceDataStore } from '../../../src/features/living/stores/serviceData.js'
import { TRANSFER_PLAN_KEY } from '../../../src/features/transfer/services/transferPlanStorage.js'
import { useTransferPlanStore } from '../../../src/features/transfer/stores/transferPlan.js'
import { useTransferStore } from '../../../src/features/transfer/stores/transfer.js'
import { useVoiceStore } from '../../../src/features/voice/stores/voice.js'

test('store persists the signup auth session without a follow-up voice settings request', async () => {
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
  assert.equal(store.voiceResult, null)
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

test('logging in as another user clears the previous user transfer plans', async () => {
  const values = new Map()
  const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  })

  try {
    await clearAuthSession()
    setActivePinia(createPinia())
    const store = useOnboardingStore()
    const transferPlans = useTransferPlanStore()
    values.set(
      TRANSFER_PLAN_KEY,
      JSON.stringify([{ label: '이전 계정 약속', amount: 1000, dayOfMonth: 1 }]),
    )
    transferPlans.load()
    store.authResult = {
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresAt: '2099-12-31T23:59:59Z',
      userId: 'old-user',
    }
    store.draft.loginId = 'silveruser'
    store.draft.password = 'safe-pass-123'

    const result = await store.login()

    assert.equal(result.ok, true)
    assert.equal(values.has(TRANSFER_PLAN_KEY), false)
    assert.deepEqual(transferPlans.plans, [])
  } finally {
    await clearAuthSession()
    if (previousLocalStorage)
      Object.defineProperty(globalThis, 'localStorage', previousLocalStorage)
    else delete globalThis.localStorage
  }
})

test('store logs out by clearing the authenticated session and transient state', async () => {
  await clearAuthSession()

  setActivePinia(createPinia())
  const store = useOnboardingStore()
  store.draft.loginId = 'silveruser'
  store.draft.password = 'safe-pass-123'
  await store.login()

  const logout = store.logout
  assert.equal(typeof logout, 'function')

  const originalLogout = onboardingApi.logout
  let logoutRequest
  onboardingApi.logout = async (request) => {
    logoutRequest = request
  }

  let result
  try {
    result = await logout()
  } finally {
    onboardingApi.logout = originalLogout
  }

  assert.equal(result.ok, true)
  assert.deepEqual(logoutRequest, { refreshToken: 'mock-refresh-token' })
  assert.equal(await loadAuthSession(), null)
  assert.equal(store.authResult, null)
  assert.equal(store.status, 'idle')
  assert.equal(store.draft.loginId, '')
  assert.equal(store.draft.password, '')
})

test('store completes local logout when remote session revocation fails', async () => {
  await clearAuthSession()

  setActivePinia(createPinia())
  const store = useOnboardingStore()
  store.draft.loginId = 'silveruser'
  store.draft.password = 'safe-pass-123'
  await store.login()

  const logout = store.logout
  assert.equal(typeof logout, 'function')

  const originalLogout = onboardingApi.logout
  onboardingApi.logout = async () => {
    throw new Error('network failure')
  }

  try {
    const result = await logout()
    assert.equal(result.ok, true)
  } finally {
    onboardingApi.logout = originalLogout
  }

  assert.equal(await loadAuthSession(), null)
  assert.equal(store.authResult, null)
})

test('store resets every user-scoped store during logout', async () => {
  await clearAuthSession()

  setActivePinia(createPinia())
  const store = useOnboardingStore()
  const serviceData = useServiceDataStore()
  const transfer = useTransferStore()
  const bill = useBillStore()
  const voice = useVoiceStore()

  store.authResult = { refreshToken: 'refresh-token' }
  serviceData.accounts = [{ accountId: 'account-1', balance: 100000 }]
  serviceData.bills = [{ billId: 'bill-1', amount: 48200 }]
  serviceData.monthlySummary = { totalAmount: 48200 }
  serviceData.reminders = [{ reminderId: 'reminder-1' }]
  serviceData.loading.accounts = true
  serviceData.errors.accounts = { message: 'old error' }
  transfer.sessionId = 'session-1'
  transfer.selectedRecipient = { recipientId: 'recipient-1' }
  transfer.fromAccount = { accountId: 'account-1' }
  transfer.draftAmount = 50000
  transfer.result = { transactionId: 'transaction-1' }
  bill.billId = 'bill-1'
  bill.bill = { payee: '한국전력' }
  bill.confirmationToken = 'confirmation-token'
  voice.sessionId = 'voice-session-1'
  voice.session = { status: 'OPEN' }
  voice.transcript = '송금해 주세요'
  voice.settings.ttsVoice = 'en-US-Test'

  await store.logout()

  assert.deepEqual(serviceData.accounts, [])
  assert.deepEqual(serviceData.bills, [])
  assert.equal(serviceData.monthlySummary, null)
  assert.deepEqual(serviceData.reminders, [])
  assert.equal(serviceData.loading.accounts, false)
  assert.equal(serviceData.errors.accounts, null)
  assert.equal(transfer.sessionId, '')
  assert.equal(transfer.selectedRecipient, null)
  assert.equal(transfer.fromAccount, null)
  assert.equal(transfer.draftAmount, null)
  assert.equal(transfer.result, null)
  assert.equal(bill.billId, '')
  assert.equal(bill.bill, null)
  assert.equal(bill.confirmationToken, '')
  assert.equal(voice.sessionId, '')
  assert.equal(voice.session, null)
  assert.equal(voice.transcript, '')
  assert.equal(voice.settings.ttsVoice, 'ko-KR-JiMinNeural')
})

test('store reports when native auth storage cannot be cleared', async () => {
  await clearAuthSession()

  setActivePinia(createPinia())
  const store = useOnboardingStore()
  store.authResult = { refreshToken: 'refresh-token' }

  const originalIsNativePlatform = Capacitor.isNativePlatform
  const originalRemove = SecureStorage.remove
  Capacitor.isNativePlatform = () => true
  SecureStorage.remove = async () => {
    throw new Error('secure storage unavailable')
  }

  try {
    const result = await store.logout()

    assert.equal(result.ok, false)
    assert.equal(result.authStorageCleared, false)
    assert.equal(store.authResult, null)
    assert.match(store.authStorageWarning, /삭제하지 못했어요/)
  } finally {
    Capacitor.isNativePlatform = originalIsNativePlatform
    SecureStorage.remove = originalRemove
    await clearAuthSession()
  }
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

test('store refreshes an expired access token before restoring the session', async () => {
  await clearAuthSession()
  await saveAuthSession({
    accessToken: 'expired-access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2000-01-01T00:00:00Z',
    userId: 'user-001',
  })

  setActivePinia(createPinia())
  const store = useOnboardingStore()
  try {
    const restoredSession = await store.restoreAuthSession()

    assert.equal(restoredSession.accessToken, 'mock-access-token')
    assert.equal(restoredSession.refreshToken, 'mock-refresh-token')
    assert.deepEqual(await loadAuthSession(), restoredSession)
  } finally {
    await clearAuthSession()
  }
})

test('store keeps an expired session after a transient refresh failure', async () => {
  await clearAuthSession()
  const session = {
    accessToken: 'expired-access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2000-01-01T00:00:00Z',
    userId: 'user-001',
  }
  await saveAuthSession(session)

  const originalRefresh = onboardingApi.refresh
  onboardingApi.refresh = async () => {
    const error = new Error('temporary outage')
    error.response = { status: 503 }
    throw error
  }

  setActivePinia(createPinia())
  const store = useOnboardingStore()
  try {
    assert.equal(await store.restoreAuthSession(), null)
    assert.deepEqual(await loadAuthSession({ allowExpired: true }), session)
  } finally {
    onboardingApi.refresh = originalRefresh
    await clearAuthSession()
  }
})

test('store clears an expired session after an unauthorized refresh failure', async () => {
  await clearAuthSession()
  await saveAuthSession({
    accessToken: 'expired-access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2000-01-01T00:00:00Z',
    userId: 'user-001',
  })

  const originalRefresh = onboardingApi.refresh
  onboardingApi.refresh = async () => {
    const error = new Error('refresh token rejected')
    error.response = { status: 401 }
    throw error
  }

  setActivePinia(createPinia())
  const store = useOnboardingStore()
  try {
    assert.equal(await store.restoreAuthSession(), null)
    assert.equal(await loadAuthSession(), null)
  } finally {
    onboardingApi.refresh = originalRefresh
    await clearAuthSession()
  }
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
