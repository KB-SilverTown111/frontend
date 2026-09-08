import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routePageSource = readFileSync(
  new URL('../../../src/features/service-screen/pages/ServiceScreenPage.vue', import.meta.url),
  'utf8',
)
const routeComposableSource = readFileSync(
  new URL('../../../src/features/service-screen/composables/useServiceScreen.js', import.meta.url),
  'utf8',
)
const routeSource = `${routeComposableSource}\n${routePageSource}`
const homeSource = readFileSync(
  new URL('../../../src/app/pages/ServiceHomePage.vue', import.meta.url),
  'utf8',
)
const billScreenSource = readFileSync(
  new URL('../../../src/features/bills/screens/reference.js', import.meta.url),
  'utf8',
)
const successScreenSource = billScreenSource.slice(
  billScreenSource.indexOf("key: 'bill-complete'"),
  billScreenSource.indexOf("key: 'bill-recognition-failed'"),
)
const primaryHandlerSource = routeSource.slice(
  routeSource.indexOf('async function handlePrimary'),
  routeSource.indexOf('async function handleSecondary'),
)
const billExecutionSource = routeSource.slice(
  routeSource.indexOf('/** bill-paying에 들어오면'),
  routeSource.indexOf('/** bill-read-aloud에 들어오면'),
)

test('bill confirmation sends all required confirmation values from the 3-05 flow', () => {
  assert.match(
    routeSource,
    /async function confirmBill[\s\S]*confirmedPayee: billStore\.bill\?\.payee/,
  )
  assert.match(
    routeSource,
    /async function confirmBill[\s\S]*confirmedAmount: billStore\.bill\?\.amount/,
  )
  assert.match(
    routeSource,
    /async function confirmBill[\s\S]*confirmedDueDate: billStore\.bill\?\.dueDate/,
  )
  assert.match(
    primaryHandlerSource,
    /\['bill-review', 'bill-low-confidence'\]\.includes\(screenKey\.value\)[\s\S]*confirmBill\(\)/,
  )
})

test('bill confirmation keeps a mismatch on the reconfirmation screen', () => {
  assert.match(routeSource, /status === ['"]RECONFIRM['"]/)
  assert.match(routeSource, /status !== ['"]CONFIRMED['"]/)
  assert.match(routeSource, /executable !== true/)
  assert.match(routeSource, /screenKey: ['"]bill-low-confidence['"]|bill-low-confidence/)
})

test('bill execution routes by the actual SUCCESS response', () => {
  assert.match(routeSource, /status === ['"]SUCCESS['"]|isBillPaymentSuccessful/)
  assert.match(routeSource, /screenKey: ['"]bill-complete['"]|bill-complete/)
  assert.match(routeSource, /screenKey: ['"]bill-payment-failed['"]|bill-payment-failed/)
})

test('bill execution validates confirmation state after loading context', () => {
  const loadContextIndex = billExecutionSource.indexOf('await loadContext(')
  const executeIndex = billExecutionSource.indexOf('await billStore.execute()')
  assert.ok(loadContextIndex >= 0)
  assert.ok(executeIndex > loadContextIndex)

  const validationSource = billExecutionSource.slice(loadContextIndex, executeIndex)
  assert.match(validationSource, /billStore\.bill\?\.status !== ['"]CONFIRMED['"]/)
  assert.match(validationSource, /billStore\.bill\?\.executable !== true/)
  assert.match(validationSource, /billStore\.confirmationToken/)
  assert.match(validationSource, /screenKey: ['"]bill-low-confidence['"]|bill-low-confidence/)
})
test('bill success screen renders actual payment result fields', () => {
  assert.match(routeSource, /billStore\.result\?\.paymentId/)
  assert.match(routeSource, /billStore\.result\?\.amount/)
  assert.match(routeSource, /billStore\.result\?\.paidAt/)
  assert.doesNotMatch(successScreenSource, /PAY-260902-41/)
  assert.doesNotMatch(successScreenSource, /오후 3:12/)
})

test('bill home does not contain hardcoded bill entries', () => {
  assert.doesNotMatch(homeSource, /전기요금 · 48,200원/)
  assert.doesNotMatch(homeSource, /통신요금 · 납부 완료/)
  assert.match(homeSource, /serviceData\.loading\.bills|loading\.bills/)
  assert.match(homeSource, /등록된 고지서가 없어요|고지서가 없어요|!serviceData\.bills\.length/)
})
