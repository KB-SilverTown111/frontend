import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import { ONBOARDING_SCREEN_IDS, setConsentDecision } from '../src/features/onboarding/screens.js'
import * as onboardingScreens from '../src/features/onboarding/screens.js'
import { BANKS } from '../src/features/onboarding/banks.js'

test('all 22 Figma onboarding frames are represented as route-safe screens', () => {
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
    'overseas-consent',
    'address-not-found',
    'account-error',
    'missing-fields',
    'microphone-denied',
    'notification-denied',
  ])
})

test('optional consent screens update the API draft for both choices', () => {
  const draft = { consents: { MYDATA: false, AI_VOICE: false, OVERSEAS_TRANSFER: false } }

  assert.equal(setConsentDecision(draft, 'mydata-consent', true), true)
  assert.equal(draft.consents.MYDATA, true)
  assert.equal(setConsentDecision(draft, 'mydata-consent', false), true)
  assert.equal(draft.consents.MYDATA, false)
  assert.equal(setConsentDecision(draft, 'unknown', true), false)
})

test('starting onboarding clears required consent values left in the current tab', () => {
  const draft = { consents: { TERMS_OF_SERVICE: true, PRIVACY: true, MYDATA: true } }

  onboardingScreens.resetRequiredConsents(draft)

  assert.equal(draft.consents.TERMS_OF_SERVICE, false)
  assert.equal(draft.consents.PRIVACY, false)
  assert.equal(draft.consents.MYDATA, true)
})

test('required consent selection toggles both required API consent values', () => {
  const draft = { consents: { TERMS_OF_SERVICE: false, PRIVACY: false } }

  onboardingScreens.toggleRequiredConsents(draft)
  assert.equal(draft.consents.TERMS_OF_SERVICE, true)
  assert.equal(draft.consents.PRIVACY, true)

  onboardingScreens.toggleRequiredConsents(draft)
  assert.equal(draft.consents.TERMS_OF_SERVICE, false)
  assert.equal(draft.consents.PRIVACY, false)
})

test('every supplied bank has default and selected icon assets', () => {
  assert.equal(BANKS.length, 18)

  for (const bank of BANKS) {
    assert.equal(existsSync(new URL(`../public${bank.defaultIcon}`, import.meta.url)), true)
    assert.equal(existsSync(new URL(`../public${bank.selectedIcon}`, import.meta.url)), true)
  }
})
