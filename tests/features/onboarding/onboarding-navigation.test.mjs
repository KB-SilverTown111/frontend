import assert from 'node:assert/strict'
import test from 'node:test'

import {
  areConsentDetailsAgreed,
  CONSENT_DETAIL_SEQUENCE,
  CONSENT_FLOW_RETURN_SCREEN,
  getNextConsentScreen,
} from '../../../src/features/onboarding/model/screens.js'
import {
  getAdjacentStep,
  getOnboardingDisplayProgress,
  getOnboardingStep,
  ONBOARDING_STEPS,
} from '../../../src/features/onboarding/model/steps.js'

test('onboarding starts at the welcome screen and ends at completion', () => {
  assert.equal(ONBOARDING_STEPS[0].id, 'start')
  assert.equal(ONBOARDING_STEPS.at(-1).id, 'complete')
  assert.deepEqual(
    ONBOARDING_STEPS.map(({ id }) => id),
    [
      'start',
      'consent-overview',
      'basic-info',
      'resident-number',
      'address',
      'bank-account',
      'phone',
      'emergency-contact',
      'permissions',
      'complete',
    ],
  )
})

test('adjacent navigation returns previous and next route-safe step ids', () => {
  assert.equal(getAdjacentStep('basic-info', -1), 'consent-overview')
  assert.equal(getAdjacentStep('bank-account', 1), 'phone')
  assert.equal(getAdjacentStep('bank-account', -1), 'address')
  assert.equal(getAdjacentStep('start', -1), null)
  assert.equal(getAdjacentStep('complete', 1), null)
})

test('consent detail screens advance in the required order', () => {
  assert.deepEqual(CONSENT_DETAIL_SEQUENCE, ['mydata-consent', 'ai-voice-consent'])
  assert.equal(CONSENT_FLOW_RETURN_SCREEN, 'consent-overview')
  assert.equal(getNextConsentScreen('mydata-consent'), 'ai-voice-consent')
  assert.equal(getNextConsentScreen('ai-voice-consent'), null)
  assert.equal(getNextConsentScreen('missing'), null)
  assert.equal(
    areConsentDetailsAgreed({
      consents: { MYDATA_FINANCIAL: true, AI_VOICE_DATA: false },
    }),
    false,
  )
  assert.equal(
    areConsentDetailsAgreed({
      consents: { MYDATA_FINANCIAL: true, AI_VOICE_DATA: true },
    }),
    true,
  )
})

test('invalid step ids are rejected instead of silently selecting a step', () => {
  assert.equal(getOnboardingStep('missing'), null)
  assert.equal(getAdjacentStep('missing', 1), null)
})

test('only data-entry steps participate in progress calculation', () => {
  assert.equal(getOnboardingStep('start').progress, 0)
  assert.equal(getOnboardingStep('basic-info').progress, 3)
  assert.equal(getOnboardingStep('permissions').progress, 10)
  assert.equal(getOnboardingStep('complete').progress, 10)
})

test('display progress follows the seven primary onboarding stages', () => {
  assert.deepEqual(getOnboardingDisplayProgress('consent-overview'), { current: 1, total: 7 })
  assert.deepEqual(getOnboardingDisplayProgress('basic-info'), { current: 2, total: 7 })
  assert.deepEqual(getOnboardingDisplayProgress('bank-select'), { current: 5, total: 7 })
  assert.deepEqual(getOnboardingDisplayProgress('permissions'), { current: 7, total: 7 })
  assert.equal(getOnboardingDisplayProgress('start'), null)
  assert.equal(getOnboardingDisplayProgress('login'), null)
})
