import assert from 'node:assert/strict'
import test from 'node:test'

import { routes } from '../../../src/app/router/routes.js'
import { createSourceReader } from '../../helpers/source.js'

const readSource = createSourceReader(import.meta.url)

const myPageSource = readSource('../../../src/features/my-page/pages/MyPagePage.vue')
const fontSizeSource = readSource('../../../src/features/my-page/pages/FontSizePage.vue')
const transferHomeSource = readSource('../../../src/features/transfer/pages/TransferHomePage.vue')
const serviceHomeSource = readSource('../../../src/app/pages/ServiceHomePage.vue')
const routeViewPageSource = readSource(
  '../../../src/features/service-screen/pages/ServiceScreenPage.vue',
)
const routeViewComposableSource = readSource(
  '../../../src/features/service-screen/composables/useServiceScreen.js',
)
const routeViewSource = `${routeViewComposableSource}\n${routeViewPageSource}`
const shellSource = readSource('../../../src/features/onboarding/components/OnboardingShell.vue')
const onboardingPageSource = readSource('../../../src/features/onboarding/pages/OnboardingPage.vue')
const onboardingFlowSource = readSource(
  '../../../src/features/onboarding/composables/useOnboardingFlow.js',
)
const onboardingSource = `${onboardingFlowSource}\n${onboardingPageSource}`
const styleSource = readSource('../../../src/features/onboarding/styles/onboarding.css')
const globalStyleSource = readSource('../../../src/shared/styles/globals.css')
const transferStyleSource = readSource('../../../src/features/transfer/styles/transfer.css')

test('my page has a production route and view', () => {
  const myPageRoute = routes.find(({ name }) => name === 'my-page')
  const fontSizeRoute = routes.find(({ name }) => name === 'my-page-font-size')
  const voiceSettingsRoute = routes.find(({ name }) => name === 'my-page-voice')

  assert.equal(myPageRoute?.path, '/mypage')
  assert.equal(typeof myPageRoute?.component, 'function')
  assert.equal(fontSizeRoute?.path, '/mypage/font-size')
  assert.equal(typeof fontSizeRoute?.component, 'function')
  assert.equal(voiceSettingsRoute?.path, '/mypage/voice/:screenKey')
  assert.equal(voiceSettingsRoute?.meta?.myPageVoice, true)
  assert.equal(typeof voiceSettingsRoute?.beforeEnter, 'function')
  assert.match(myPageSource, /마이페이지/)
})

test('my page exposes cards and moves font size controls to a detail screen', () => {
  assert.match(myPageSource, /가입 정보/)
  assert.match(myPageSource, /screenKey: 'living-profile-edit'/)
  assert.match(myPageSource, /my-page-font-size/)
  assert.match(myPageSource, /글씨 크기/)

  assert.match(fontSizeSource, /readFontScale/)
  assert.match(fontSizeSource, /saveFontScale/)
  assert.match(fontSizeSource, /applyFontScale/)
  assert.match(fontSizeSource, /기본 크기/)
  assert.match(fontSizeSource, /큰 글씨/)
  assert.match(fontSizeSource, /my-page/)
})

test('large font option previews the large body text size', () => {
  assert.match(fontSizeSource, /class="font-size-option font-size-option-large"/)
  assert.match(
    styleSource,
    /\.font-size-option-large\s*\{[\s\S]*?font-size:\s*max\(var\(--font-size-body\),\s*21px\);/,
  )
})

test('my page exposes the voice change card as the only settings entry point', () => {
  assert.match(myPageSource, /목소리 변경/)
  assert.match(myPageSource, /name: 'my-page-voice'/)
  assert.match(myPageSource, /screenKey: 'voice-voice-select'/)
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
  assert.match(myPageSource, /screenKey: 'living-profile-edit'/)
})

test('membership detail back control returns to my page', () => {
  assert.match(routeViewSource, /const backRoute = computed\(/)
  assert.match(
    routeViewSource,
    /\['living-profile-edit', 'living-emergency-contact-edit', 'living-consents'\]/,
  )
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
