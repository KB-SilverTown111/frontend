import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { goBackOrReplace } from '../src/router/navigation.js'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const onboardingSource = readSource('../src/views/OnboardingView.vue')
const helpSource = readSource('../src/views/OnboardingHelpView.vue')
const fontSizeSource = readSource('../src/views/MyPageFontSizeView.vue')
const serviceRouteSource = readSource('../src/views/ServiceRouteView.vue')
const transferHomeSource = readSource('../src/views/TransferHomeView.vue')
const serviceHomeSource = readSource('../src/views/ServiceHomeView.vue')
const myPageSource = readSource('../src/views/MyPageView.vue')

function createRouterMock(state) {
  const calls = []
  return {
    calls,
    options: { history: { state } },
    back() {
      calls.push('back')
    },
    replace(target) {
      calls.push(['replace', target])
    },
  }
}

test('back navigation uses the existing app history entry', () => {
  const router = createRouterMock({ back: '/transfer' })

  goBackOrReplace(router, { name: 'transfer-home' })

  assert.deepEqual(router.calls, ['back'])
})

test('back navigation replaces the current entry when the screen was opened directly', () => {
  const router = createRouterMock({ back: null })
  const fallback = { name: 'onboarding', params: { stepId: 'login' } }

  goBackOrReplace(router, fallback)

  assert.deepEqual(router.calls, [['replace', fallback]])
})

test('onboarding back, help, font-size, and service back controls share history-first navigation', () => {
  assert.match(onboardingSource, /goBackOrReplace\(/)
  assert.match(helpSource, /goBackOrReplace\(/)
  assert.match(fontSizeSource, /goBackOrReplace\(/)
  assert.match(serviceRouteSource, /goBackOrReplace\(/)
})

test('top-level tabs replace history entries in every authenticated shell', () => {
  for (const source of [transferHomeSource, serviceHomeSource, serviceRouteSource, myPageSource]) {
    assert.match(source, /<RouterLink\s+replace[\s\S]*name: 'transfer-home'/)
  }
})

test('onboarding service menu routes to the selected screen', () => {
  assert.match(onboardingSource, /home:\s*\{ name: 'transfer-home' \}/)
  assert.match(onboardingSource, /bills:\s*\{ name: 'bills-home' \}/)
  assert.match(onboardingSource, /living:\s*\{ name: 'living-home' \}/)
  assert.match(onboardingSource, /return target \? router\.replace\(target\)/)
})
