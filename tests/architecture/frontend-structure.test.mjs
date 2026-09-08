import assert from 'node:assert/strict'
import test from 'node:test'

import {
  routeForScreen as routeForBillScreen,
  screenByKey as billScreenByKey,
  screenDefinitions as billScreens,
} from '../../src/features/bills/screens/registry.js'
import {
  routeForScreen as routeForTransferScreen,
  screenByKey as transferScreenByKey,
  screenDefinitions as transferScreens,
} from '../../src/features/transfer/screens/registry.js'

test('기능별 화면 registry는 의미 있는 키와 디자인 메타데이터를 노출한다', () => {
  assert.equal(billScreens.sourceSelect.key, 'bill-source-select')
  assert.equal(billScreens.sourceSelect.path, 'scan')
  assert.equal(billScreens.sourceSelect.designId, '3-02')
  assert.equal(transferScreens.confirm.key, 'transfer-confirm')
  assert.equal(transferScreens.confirm.path, 'confirm')
  assert.equal(transferScreens.confirm.designId, '2-08')
})

test('화면 registry는 의미 키로 조회하고 라우트를 생성한다', () => {
  assert.equal(billScreenByKey.get('bill-review'), billScreens.review)
  assert.equal(transferScreenByKey.get('transfer-confirm'), transferScreens.confirm)
  assert.deepEqual(routeForBillScreen('bill-review'), {
    name: 'bills-screen',
    params: { screenKey: 'bill-review' },
  })
  assert.deepEqual(routeForTransferScreen('transfer-confirm'), {
    name: 'transfer-screen',
    params: { screenKey: 'transfer-confirm' },
  })
})
