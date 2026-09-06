import assert from 'node:assert/strict'
import test from 'node:test'

import * as secureKeypad from '../src/features/onboarding/screens.js'

test('secure keypad contains every digit exactly once', () => {
  const order = secureKeypad.createRandomDigitOrder(() => 0)

  assert.deepEqual([...order].sort(), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
})

test('decoy highlights never repeat the digit that was actually entered', () => {
  const decoys = secureKeypad.pickDecoyDigits(
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    '5',
    2,
    () => 0,
  )

  assert.deepEqual(decoys, ['0', '1'])
  assert.equal(decoys.includes('5'), false)
})
