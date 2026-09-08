import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { routes } from '../../../src/app/router/routes.js'

const viewPath = new URL(
  '../../../src/features/transfer/pages/TransferHomePage.vue',
  import.meta.url,
)
const viewSource = existsSync(viewPath) ? readFileSync(viewPath, 'utf8') : ''
const serviceHomePath = new URL('../../../src/app/pages/ServiceHomePage.vue', import.meta.url)
const serviceHomeSource = existsSync(serviceHomePath) ? readFileSync(serviceHomePath, 'utf8') : ''
const styleSource = readFileSync(
  new URL('../../../src/features/transfer/styles/transfer.css', import.meta.url),
  'utf8',
)
const onboardingPageSource = readFileSync(
  new URL('../../../src/features/onboarding/pages/OnboardingPage.vue', import.meta.url),
  'utf8',
)
const onboardingFlowSource = readFileSync(
  new URL('../../../src/features/onboarding/composables/useOnboardingFlow.js', import.meta.url),
  'utf8',
)
const onboardingSource = `${onboardingFlowSource}\n${onboardingPageSource}`

test('authenticated users have a production transfer home route', () => {
  const transferHome = routes.find(({ name }) => name === 'transfer-home')

  assert.equal(transferHome?.path, '/transfer')
  assert.equal(typeof transferHome?.component, 'function')
})

test('login success navigates to the transfer home screen', () => {
  assert.match(onboardingSource, /return requestAppIntent\('home'\)/)
})

test('transfer home keeps the first reference screen content', () => {
  for (const copy of [
    '사용 가능 금액',
    '1,240,000원',
    '송금하기',
    '고지서 확인',
    '음성으로 송금',
  ]) {
    assert.match(viewSource, new RegExp(copy))
  }
})

test('transfer home uses a light surface without onboarding-only controls', () => {
  assert.match(viewSource, /class="app-header-spacer"/)
  assert.doesNotMatch(viewSource, /로그인 화면으로 돌아가기/)
  assert.doesNotMatch(viewSource, /최근 수취인 바로가기는 제외했습니다\./)
  assert.doesNotMatch(viewSource, /transfer-action-notice/)
  assert.match(styleSource, /\.transfer-device \.app-header[\s\S]*background: var\(--card\)/)
})

test('transfer home includes the four service navigation labels', () => {
  for (const label of ['홈', '고지서', '생활금융', '마이페이지']) {
    assert.match(viewSource, new RegExp(label))
  }

  assert.match(viewSource, /class="app-bottom-nav four-items transfer-bottom-nav"/)
  assert.match(viewSource, /aria-current="page"/)
})

test('transfer home cards use a thicker visible border', () => {
  assert.match(
    styleSource,
    /\.transfer-balance-card\s*\{[\s\S]*?border:\s*2px solid var\(--border\);/,
  )
  assert.match(styleSource, /\.transfer-choice\s*\{[\s\S]*?border:\s*2px solid var\(--border\);/)
})

test('service route back control has the same bordered treatment as onboarding', () => {
  assert.match(styleSource, /\.service-route-back\s*\{[\s\S]*?border:\s*1px solid var\(--border\);/)
})

test('service navigation routes use production service screens', () => {
  const billsHome = routes.find(({ name }) => name === 'bills-home')
  const livingHome = routes.find(({ name }) => name === 'living-home')

  assert.equal(billsHome?.path, '/bills')
  assert.equal(typeof billsHome?.component, 'function')
  assert.equal(billsHome?.redirect, undefined)
  assert.equal(livingHome?.path, '/living')
  assert.equal(typeof livingHome?.component, 'function')
  assert.equal(livingHome?.redirect, undefined)
})

test('production service homes are based on reference copy without using prototype views', () => {
  for (const copy of ['고지서 목록', '내 정보', '등록된 고지서가 없어요', '내 계좌']) {
    assert.match(serviceHomeSource, new RegExp(copy))
  }
  assert.doesNotMatch(serviceHomeSource, /전기요금 · 48,200원|통신요금 · 납부 완료/)
  assert.doesNotMatch(serviceHomeSource, /prototype-stage|PrototypeScreenView/)
})
