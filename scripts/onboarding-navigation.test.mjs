import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAdjacentStep,
  getOnboardingStep,
  ONBOARDING_STEPS,
} from '../src/features/onboarding/steps.js'

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
