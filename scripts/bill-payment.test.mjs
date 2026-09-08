import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routeSource = readFileSync(
  new URL('../src/views/ServiceRouteView.vue', import.meta.url),
  'utf8',
)
const homeSource = readFileSync(
  new URL('../src/views/ServiceHomeView.vue', import.meta.url),
  'utf8',
)
const billScreenSource = readFileSync(
  new URL('../src/services/screenData/bills.js', import.meta.url),
  'utf8',
)
const successScreenSource = billScreenSource.slice(
  billScreenSource.indexOf("id: '3-07'"),
  billScreenSource.indexOf("id: '3-08'"),
)
const primaryHandlerSource = routeSource.slice(
  routeSource.indexOf('async function handlePrimary'),
  routeSource.indexOf('async function handleSecondary'),
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
    /\['3-04', '3-05'\]\.includes\(screenId\.value\)[\s\S]*confirmBill\(\)/,
  )
})

test('bill confirmation keeps a mismatch on the reconfirmation screen', () => {
  assert.match(routeSource, /status === ['"]RECONFIRM['"]/)
  assert.match(routeSource, /status !== ['"]CONFIRMED['"]/)
  assert.match(routeSource, /executable !== true/)
  assert.match(routeSource, /screenId: ['"]3-05['"]|3-05/)
})

test('bill execution routes by the actual SUCCESS response', () => {
  assert.match(routeSource, /status === ['"]SUCCESS['"]|isBillPaymentSuccessful/)
  assert.match(routeSource, /screenId: ['"]3-07['"]|3-07/)
  assert.match(routeSource, /screenId: ['"]3-22['"]|3-22/)
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
