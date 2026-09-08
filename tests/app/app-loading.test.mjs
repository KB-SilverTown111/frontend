import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const loadingModuleUrl = new URL('../../src/shared/services/appLoading.js', import.meta.url)
const loadingModulePath = fileURLToPath(loadingModuleUrl)
const overlayPath = fileURLToPath(
  new URL('../../src/shared/components/feedback/AppLoadingOverlay.vue', import.meta.url),
)
const appSource = readFileSync(new URL('../../src/app/App.vue', import.meta.url), 'utf8')
const routerSource = readFileSync(new URL('../../src/app/router/index.js', import.meta.url), 'utf8')
const routeViewPageSource = readFileSync(
  new URL('../../src/features/service-screen/pages/ServiceScreenPage.vue', import.meta.url),
  'utf8',
)
const routeViewComposableSource = readFileSync(
  new URL('../../src/features/service-screen/composables/useServiceScreen.js', import.meta.url),
  'utf8',
)
const routeViewSource = `${routeViewComposableSource}\n${routeViewPageSource}`
const serviceHomeSource = readFileSync(
  new URL('../../src/app/pages/ServiceHomePage.vue', import.meta.url),
  'utf8',
)
const transferHomeSource = readFileSync(
  new URL('../../src/features/transfer/pages/TransferHomePage.vue', import.meta.url),
  'utf8',
)

test('global loading stays visible until overlapping async work finishes', async () => {
  assert.equal(existsSync(loadingModulePath), true, 'global loading module should exist')

  const { isAppLoading, withAppLoading } = await import(loadingModuleUrl.href)
  let resolveRequest
  const request = new Promise((resolve) => {
    resolveRequest = resolve
  })

  const firstWork = withAppLoading(() => request)
  const secondWork = withAppLoading(async () => 'ready')

  assert.equal(isAppLoading.value, true)
  assert.equal(await secondWork, 'ready')
  assert.equal(isAppLoading.value, true)

  resolveRequest('done')
  assert.equal(await firstWork, 'done')
  assert.equal(isAppLoading.value, false)
})

test('global loading ends when tracked work fails', async () => {
  assert.equal(existsSync(loadingModulePath), true, 'global loading module should exist')

  const { isAppLoading, withAppLoading } = await import(loadingModuleUrl.href)

  await assert.rejects(
    () => withAppLoading(async () => Promise.reject(new Error('request failed'))),
    /request failed/,
  )
  assert.equal(isAppLoading.value, false)
})

test('app renders an accessible loading overlay for route and data transitions', () => {
  assert.equal(existsSync(overlayPath), true, 'loading overlay component should exist')

  const overlaySource = readFileSync(overlayPath, 'utf8')
  assert.match(appSource, /AppLoadingOverlay/)
  assert.match(appSource, /<AppLoadingOverlay\s*\/>/)
  assert.match(overlaySource, /v-if="isAppLoading"/)
  assert.match(overlaySource, /role="status"/)
  assert.match(overlaySource, /화면을 불러오는 중이에요\./)
  assert.match(overlaySource, /aria-busy="true"/)
})

test('route and initial service data loads are tracked by the global loader', () => {
  assert.match(routerSource, /beginAppLoading/)
  assert.match(routerSource, /router\.beforeEach\(/)
  assert.match(routerSource, /endAppLoading/)
  assert.match(routerSource, /router\.afterEach\(/)
  assert.match(routeViewSource, /withAppLoading\(/)
  assert.match(serviceHomeSource, /withAppLoading\(/)
  assert.match(transferHomeSource, /withAppLoading\(/)
})
