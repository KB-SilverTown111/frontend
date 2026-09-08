import assert from 'node:assert/strict'
import test from 'node:test'

import { goBackOrReplace } from '../../src/shared/lib/navigation.js'
import { createSourceReader } from '../helpers/source.js'

const readSource = createSourceReader(import.meta.url)
const onboardingPageSource = readSource('../../src/features/onboarding/pages/OnboardingPage.vue')
const onboardingFlowSource = readSource(
  '../../src/features/onboarding/composables/useOnboardingFlow.js',
)
const onboardingSource = `${onboardingFlowSource}\n${onboardingPageSource}`
const helpSource = readSource('../../src/features/onboarding/pages/OnboardingHelpPage.vue')
const fontSizeSource = readSource('../../src/features/my-page/pages/FontSizePage.vue')
const serviceRoutePageSource = readSource(
  '../../src/features/service-screen/pages/ServiceScreenPage.vue',
)
const serviceRouteComposableSource = readSource(
  '../../src/features/service-screen/composables/useServiceScreen.js',
)
const serviceRouteSource = `${serviceRouteComposableSource}\n${serviceRoutePageSource}`
const transferHomeSource = readSource('../../src/features/transfer/pages/TransferHomePage.vue')
const serviceHomeSource = readSource('../../src/app/pages/ServiceHomePage.vue')
const myPageSource = readSource('../../src/features/my-page/pages/MyPagePage.vue')

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

test('service back control describes history-first navigation', () => {
  assert.match(serviceRouteSource, /aria-label="이전 화면"/)
})

test('top-level tabs replace history entries in every authenticated shell', () => {
  const sources = [
    transferHomeSource,
    serviceHomeSource,
    serviceRouteSource,
    myPageSource,
    fontSizeSource,
  ]
  const targets = ['transfer-home', 'bills-home', 'living-home', 'my-page']

  for (const source of sources) {
    for (const target of targets) {
      assert.match(source, new RegExp(`<RouterLink\\s+replace[\\s\\S]*name: '${target}'`))
    }
  }
})

test('onboarding service menu routes to the selected screen', () => {
  assert.match(onboardingSource, /home:\s*\{ name: 'transfer-home' \}/)
  assert.match(onboardingSource, /bills:\s*\{ name: 'bills-home' \}/)
  assert.match(onboardingSource, /living:\s*\{ name: 'living-home' \}/)
  assert.match(onboardingSource, /return target \? router\.replace\(target\)/)
})
