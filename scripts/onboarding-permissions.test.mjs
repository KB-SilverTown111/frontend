import assert from 'node:assert/strict'
import test from 'node:test'

import {
  NATIVE_PERMISSION_ORDER,
  requestPermissionsInOrder,
} from '../src/features/onboarding/permissions.js'

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
