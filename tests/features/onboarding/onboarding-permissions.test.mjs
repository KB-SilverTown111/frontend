import assert from 'node:assert/strict'
import test from 'node:test'

import {
  arePermissionsGranted,
  NATIVE_PERMISSION_ORDER,
  requestPermissionsInOrder,
} from '../../../src/features/onboarding/services/permissions.js'

test('granted and limited native permissions are treated as already available', () => {
  assert.equal(
    arePermissionsGranted({
      contacts: 'granted',
      camera: 'limited',
      location: 'granted',
      microphone: 'granted',
    }),
    true,
  )
})

test('any non-granted native permission keeps the permissions step', () => {
  assert.equal(
    arePermissionsGranted({
      contacts: 'granted',
      camera: 'prompt',
      location: 'granted',
      microphone: 'granted',
    }),
    false,
  )
})

test('native permissions are requested in the UI order and one failure does not stop the flow', async () => {
  const calls = []

  const failures = await requestPermissionsInOrder({
    contacts: async () => calls.push('contacts'),
    camera: async () => {
      calls.push('camera')
      throw new Error('camera denied')
    },
    location: async () => calls.push('location'),
    microphone: async () => calls.push('microphone'),
  })

  assert.deepEqual(calls, NATIVE_PERMISSION_ORDER)
  assert.deepEqual(
    failures.map(({ permission }) => permission),
    ['camera'],
  )
})
