import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { routes } from '../src/router/routes.js'
import {
  getProductionActionRoutes,
  loadProductionScreen,
  productionServiceScreens,
  resolveProductionScreen,
} from '../src/services/productionServiceScreens.js'

const serviceHomeSource = readFileSync(
  new URL('../src/views/ServiceHomeView.vue', import.meta.url),
  'utf8',
)
const transferHomeSource = readFileSync(
  new URL('../src/views/TransferHomeView.vue', import.meta.url),
  'utf8',
)
const routeViewSource = readFileSync(
  new URL('../src/views/ServiceRouteView.vue', import.meta.url),
  'utf8',
)

const expectedScreenCounts = {
  transfer: 30,
  bills: 22,
  living: 25,
  voice: 8,
}

test('production routes cover every non-home service screen', () => {
  for (const [service, expectedCount] of Object.entries(expectedScreenCounts)) {
    assert.equal(productionServiceScreens[service].length, expectedCount)

    const route = routes.find(({ name }) => name === `${service}-screen`)
    assert.equal(route?.path, `/${service}/:screenId`)
    assert.equal(typeof route?.component, 'function')
    assert.equal(typeof route?.beforeEnter, 'function')
  }
})

test('production screen resolver accepts known IDs and rejects unknown IDs', () => {
  assert.equal(resolveProductionScreen('transfer', '2-05')?.screenId, '2-05')
  assert.equal(resolveProductionScreen('bills', '3-02A')?.screenId, '3-02A')
  assert.equal(resolveProductionScreen('living', '4-10')?.screenId, '4-10')
  assert.equal(resolveProductionScreen('voice', '5-08')?.screenId, '5-08')
  assert.equal(resolveProductionScreen('transfer', 'missing'), null)
})

test('production screen data includes the reference UI content', async () => {
  const billsScreen = await loadProductionScreen('bills', '3-02A')
  const voiceScreen = await loadProductionScreen('voice', '5-02')

  assert.equal(billsScreen?.title, '고지서를 비춰 주세요')
  assert.match(billsScreen?.contentHtml ?? '', /viewfinder/)
  assert.equal(voiceScreen?.title, '미리 듣기')
  assert.match(voiceScreen?.contentHtml ?? '', /class="voice"/)
})

test('production action routes follow the service flow instead of raw screen order', () => {
  assert.deepEqual(getProductionActionRoutes('transfer', '2-05').primary, {
    name: 'transfer-screen',
    params: { screenId: '2-07' },
  })
  assert.deepEqual(getProductionActionRoutes('transfer', '2-18').secondary, {
    name: 'transfer-screen',
    params: { screenId: '2-05' },
  })
  assert.deepEqual(getProductionActionRoutes('bills', '3-02A').primary, {
    name: 'bills-screen',
    params: { screenId: '3-03' },
  })
  assert.deepEqual(getProductionActionRoutes('living', '4-05').primary, {
    name: 'onboarding',
    params: { stepId: 'login' },
  })
  assert.deepEqual(getProductionActionRoutes('living', '4-13').primary, {
    name: 'voice-screen',
    params: { screenId: '5-02' },
  })
  assert.deepEqual(getProductionActionRoutes('voice', '5-08').primary, {
    name: 'transfer-screen',
    params: { screenId: '2-02' },
  })
})

test('home actions point to production detail routes', () => {
  assert.match(transferHomeSource, /transfer-screen/)
  assert.match(transferHomeSource, /screenId: '2-02'/)
  assert.match(transferHomeSource, /router\.push\(\{ name: 'transfer-screen'/)
  assert.match(transferHomeSource, /bills-home/)
  assert.match(serviceHomeSource, /bills-screen/)
  assert.match(serviceHomeSource, /living-screen/)
  assert.match(serviceHomeSource, /voice-screen/)
})

test('production route screen is not implemented with prototype views', () => {
  assert.doesNotMatch(routeViewSource, /PrototypeScreenView|prototype-stage|ScreenContent/)
  assert.match(routeViewSource, /v-html="screen\.contentHtml"/)
  assert.match(routeViewSource, /service-route-screen-content/)
  assert.match(routeViewSource, /getProductionActionRoutes/)
})
