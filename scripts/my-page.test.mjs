import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { routes } from '../src/router/routes.js'

const readSource = (path) => {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const myPageSource = readSource('../src/views/MyPageView.vue')
const fontSizeSource = readSource('../src/views/MyPageFontSizeView.vue')
const transferHomeSource = readSource('../src/views/TransferHomeView.vue')
const serviceHomeSource = readSource('../src/views/ServiceHomeView.vue')
const routeViewSource = readSource('../src/views/ServiceRouteView.vue')
const shellSource = readSource('../src/components/onboarding/OnboardingShell.vue')
const onboardingSource = readSource('../src/views/OnboardingView.vue')
const styleSource = readSource('../src/styles/onboarding.css')
const globalStyleSource = readSource('../src/styles/globals.css')
const transferStyleSource = readSource('../src/styles/transfer.css')

test('my page has a production route and view', () => {
  const myPageRoute = routes.find(({ name }) => name === 'my-page')
  const fontSizeRoute = routes.find(({ name }) => name === 'my-page-font-size')

  assert.equal(myPageRoute?.path, '/mypage')
  assert.equal(typeof myPageRoute?.component, 'function')
  assert.equal(fontSizeRoute?.path, '/mypage/font-size')
  assert.equal(typeof fontSizeRoute?.component, 'function')
  assert.match(myPageSource, /마이페이지/)
})

test('my page exposes cards and moves font size controls to a detail screen', () => {
  assert.match(myPageSource, /가입 정보/)
  assert.match(myPageSource, /screenId: '4-14'/)
  assert.match(myPageSource, /my-page-font-size/)
  assert.match(myPageSource, /글씨 크기/)

  assert.match(fontSizeSource, /readFontScale/)
  assert.match(fontSizeSource, /saveFontScale/)
  assert.match(fontSizeSource, /applyFontScale/)
  assert.match(fontSizeSource, /기본 크기/)
  assert.match(fontSizeSource, /큰 글씨/)
  assert.match(fontSizeSource, /my-page/)
})

test('font size detail screen returns to the correct entry flow', () => {
  assert.match(fontSizeSource, /useRoute/)
  assert.match(fontSizeSource, /route\.name === 'font-size'/)
  assert.match(fontSizeSource, /로그인으로 돌아가기/)
  assert.match(fontSizeSource, /마이페이지로 돌아가기/)
  assert.match(fontSizeSource, /v-if="!isLoginFontSize"/)
  assert.match(fontSizeSource, /stepId: 'login'/)
})

test('production choices do not show onboarding selection indicators', () => {
  assert.doesNotMatch(transferHomeSource, /class="transfer-choice selected"/)
  assert.doesNotMatch(transferHomeSource, /<b>✓<\/b>/)
  assert.doesNotMatch(serviceHomeSource, /selected/)
  assert.doesNotMatch(serviceHomeSource, /<b v-if="choice\.selected">✓<\/b>/)
  assert.match(routeViewSource, /stripProductionSelectionIndicators/)
})

test('living home moves the membership card to my page', () => {
  assert.doesNotMatch(serviceHomeSource, /label: '가입 정보'/)
  assert.match(myPageSource, /screenId: '4-14'/)
})

test('membership detail back control returns to my page', () => {
  assert.match(routeViewSource, /const backRoute = computed\(/)
  assert.match(routeViewSource, /\['4-14', '4-15', '4-16'\]/)
  assert.match(routeViewSource, /:to="backRoute"/)
})

test('font size setting remains backed by the shared service', () => {
  assert.match(myPageSource, /readFontScale/)
})

test('my page exposes a logout action', () => {
  assert.match(myPageSource, /<button[\s\S]*my-page-logout/)
  assert.match(myPageSource, /@click="handleLogout"/)
  assert.match(myPageSource, /로그아웃/)
  assert.match(myPageSource, /:aria-label="isLoggingOut \? '로그아웃 중' : '로그아웃'"/)
  assert.match(myPageSource, /:aria-busy="isLoggingOut"/)
  assert.match(
    myPageSource,
    /await onboardingStore\.logout\(\)[\s\S]*await router\.replace\([\s\S]*finally\s*\{\s*isLoggingOut\.value = false/s,
  )
})

test('production navigation exposes my page as the rightmost fourth item', () => {
  for (const source of [transferHomeSource, serviceHomeSource, routeViewSource]) {
    assert.match(source, /class="app-bottom-nav four-items/)
    assert.match(source, /name: 'my-page'/)
    assert.match(source, /마이페이지/)
  }

  assert.match(shellSource, /'four-items': bottomNav === 'service'/)
  assert.match(shellSource, /\$emit\('mypage'\)/)
  assert.match(onboardingSource, /function openMyPage\(\)/)
  assert.match(onboardingSource, /@mypage="openMyPage"/)
})

test('four-item bottom navigation keeps equal columns', () => {
  assert.match(
    styleSource,
    /\.app-bottom-nav\.four-items\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*1fr\);/,
  )
})

test('every bottom navigation uses the selected font scale', () => {
  assert.match(globalStyleSource, /--font-size-nav:\s*16px;/)
  assert.match(
    globalStyleSource,
    /:root\[data-font-scale='large'\]\s*\{[\s\S]*?--font-size-nav:\s*18px;/,
  )
  assert.match(
    styleSource,
    /\.app-bottom-nav button\s*\{[\s\S]*?font-size:\s*var\(--font-size-nav\);/,
  )
  assert.match(
    transferStyleSource,
    /\.transfer-bottom-nav a,[\s\S]*?\.my-page-bottom-nav a\s*\{[\s\S]*?font-size:\s*var\(--font-size-nav\);/,
  )
  assert.match(transferStyleSource, /\.my-page-bottom-nav a\s*\{[\s\S]*?font-family:\s*inherit;/)
})
