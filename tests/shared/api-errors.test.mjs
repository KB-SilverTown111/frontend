import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeApiError } from '../../src/shared/api/errors.js'

test('HTTP responses without a JSON body remain request failures', () => {
  for (const data of [null, undefined, '', 'server unavailable']) {
    assert.equal(normalizeApiError({ response: { status: 500, data } }).code, 'REQUEST_FAILED')
  }
})

test('errors without an HTTP response remain network failures', () => {
  assert.equal(normalizeApiError(new Error('offline')).code, 'NETWORK_ERROR')
})
