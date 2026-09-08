import assert from 'node:assert/strict'
import test from 'node:test'

import { getContactCandidates } from '../../src/shared/native/nativeCapabilities.js'

test('contact discovery accepts limited permission from the current check', async () => {
  const contacts = {
    checkPermissions: async () => ({ contacts: 'limited' }),
    requestPermissions: async () => {
      throw new Error('requestPermissions should not be called')
    },
    getContacts: async () => ({
      contacts: [{ name: { display: '김은희' }, phones: [{ number: '010-1234-5678' }] }],
    }),
  }

  assert.deepEqual(await getContactCandidates({ contacts }), [
    { displayName: '김은희', phoneNumber: '010-1234-5678' },
  ])
})

test('contact discovery accepts limited permission returned by the request', async () => {
  const contacts = {
    checkPermissions: async () => ({ contacts: 'prompt' }),
    requestPermissions: async () => ({ contacts: 'limited' }),
    getContacts: async () => ({ contacts: [] }),
  }

  assert.deepEqual(await getContactCandidates({ contacts }), [])
})
