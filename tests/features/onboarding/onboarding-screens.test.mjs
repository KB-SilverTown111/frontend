import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import {
  ONBOARDING_SCREEN_IDS,
  setConsentDecision,
} from '../../../src/features/onboarding/model/screens.js'
import * as onboardingScreens from '../../../src/features/onboarding/model/screens.js'
import { BANKS } from '../../../src/features/onboarding/model/banks.js'

test('supported onboarding frames are represented as route-safe screens', () => {
  assert.deepEqual(ONBOARDING_SCREEN_IDS, [
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
})

test('consent detail screens update the API draft for both choices', () => {
  const draft = { consents: { MYDATA_FINANCIAL: false, AI_VOICE_DATA: false } }

  assert.equal(setConsentDecision(draft, 'mydata-consent', true), true)
  assert.equal(draft.consents.MYDATA_FINANCIAL, true)
  assert.equal(setConsentDecision(draft, 'mydata-consent', false), true)
  assert.equal(draft.consents.MYDATA_FINANCIAL, false)
  assert.equal(setConsentDecision(draft, 'unknown', true), false)
})

test('starting onboarding clears required consent values left in the current tab', () => {
  const draft = {
    consents: {
      TERMS_OF_SERVICE: true,
      PRIVACY_COLLECTION: true,
      MYDATA_FINANCIAL: true,
      AI_VOICE_DATA: true,
      AI_FINANCIAL_DATA_OPTIONAL: true,
    },
  }

  onboardingScreens.resetRequiredConsents(draft)

  assert.equal(draft.consents.TERMS_OF_SERVICE, false)
  assert.equal(draft.consents.PRIVACY_COLLECTION, false)
  assert.equal(draft.consents.MYDATA_FINANCIAL, false)
  assert.equal(draft.consents.AI_VOICE_DATA, false)
  assert.equal(draft.consents.AI_FINANCIAL_DATA_OPTIONAL, true)
})

test('required consent selection toggles every backend-required consent value', () => {
  const draft = {
    consents: {
      TERMS_OF_SERVICE: false,
      PRIVACY_COLLECTION: false,
      MYDATA_FINANCIAL: false,
      AI_VOICE_DATA: false,
    },
  }

  onboardingScreens.toggleRequiredConsents(draft)
  assert.equal(draft.consents.TERMS_OF_SERVICE, true)
  assert.equal(draft.consents.PRIVACY_COLLECTION, true)
  assert.equal(draft.consents.MYDATA_FINANCIAL, true)
  assert.equal(draft.consents.AI_VOICE_DATA, true)

  onboardingScreens.toggleRequiredConsents(draft)
  assert.equal(draft.consents.TERMS_OF_SERVICE, false)
  assert.equal(draft.consents.PRIVACY_COLLECTION, false)
  assert.equal(draft.consents.MYDATA_FINANCIAL, false)
  assert.equal(draft.consents.AI_VOICE_DATA, false)
})

test('every supplied bank has default and selected icon assets', () => {
  assert.equal(BANKS.length, 18)

  for (const bank of BANKS) {
    assert.equal(existsSync(new URL(`../../../public${bank.defaultIcon}`, import.meta.url)), true)
    assert.equal(existsSync(new URL(`../../../public${bank.selectedIcon}`, import.meta.url)), true)
  }
})
