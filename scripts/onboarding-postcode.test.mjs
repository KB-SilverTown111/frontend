import assert from 'node:assert/strict'
import test from 'node:test'

import * as onboardingContract from '../src/features/onboarding/contract.js'

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
