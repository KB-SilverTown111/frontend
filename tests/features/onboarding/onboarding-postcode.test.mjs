import assert from 'node:assert/strict'
import test from 'node:test'

import * as onboardingContract from '../../../src/features/onboarding/model/contract.js'
import { loadPostcodeApi } from '../../../src/features/onboarding/services/postcode.js'

test('Kakao postcode selection keeps the postal code and the address type the user chose', () => {
  const resolve = onboardingContract.resolvePostcodeSelection

  assert.deepEqual(
    resolve({
      zonecode: '13494',
      userSelectedType: 'R',
      roadAddress: '경기 성남시 분당구 판교역로 166',
      jibunAddress: '경기 성남시 분당구 백현동 532',
    }),
    {
      postalCode: '13494',
      address: '경기 성남시 분당구 판교역로 166',
    },
  )

  assert.deepEqual(
    resolve({
      zonecode: '13494',
      userSelectedType: 'J',
      roadAddress: '경기 성남시 분당구 판교역로 166',
      jibunAddress: '경기 성남시 분당구 백현동 532',
    }),
    {
      postalCode: '13494',
      address: '경기 성남시 분당구 백현동 532',
    },
  )
})

test('postcode loader removes an unavailable script so the next attempt can retry', async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const scripts = []

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {},
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => {
        const script = {
          remove() {
            this.removed = true
          },
        }
        scripts.push(script)
        return script
      },
      head: {
        append(script) {
          scripts.push(script)
        },
      },
    },
  })

  try {
    const firstAttempt = loadPostcodeApi()
    const firstScript = scripts.at(-1)
    firstScript.onload()
    await assert.rejects(firstAttempt, /unavailable/)
    assert.equal(firstScript.removed, true)

    const secondAttempt = loadPostcodeApi()
    assert.notEqual(scripts.at(-1), firstScript)
    globalThis.window.kakao = { Postcode: class Postcode {} }
    scripts.at(-1).onload()
    assert.equal(await secondAttempt, globalThis.window.kakao.Postcode)
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else delete globalThis.window
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})
