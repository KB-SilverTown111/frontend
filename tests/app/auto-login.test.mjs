import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const initialRouteUrl = new URL('../../src/app/router/initialRoute.js', import.meta.url)
const initialRoutePath = fileURLToPath(initialRouteUrl)
const mainSource = readFileSync(new URL('../../src/app/main.js', import.meta.url), 'utf8')

async function loadRestoredSessionRoute() {
  assert.equal(existsSync(initialRoutePath), true, 'initial route policy should exist')
  const { getRestoredSessionRoute } = await import(initialRouteUrl.href)
  return getRestoredSessionRoute
}

const restoredSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
}

test('restored auth session enters the service home from onboarding', async () => {
  const getRestoredSessionRoute = await loadRestoredSessionRoute()

  assert.deepEqual(getRestoredSessionRoute(restoredSession, { name: 'onboarding' }), {
    name: 'transfer-home',
  })
})

test('missing auth session stays on onboarding', async () => {
  const getRestoredSessionRoute = await loadRestoredSessionRoute()

  assert.equal(getRestoredSessionRoute(null, { name: 'onboarding' }), null)
})

test('restored auth session preserves an already selected app route', async () => {
  const getRestoredSessionRoute = await loadRestoredSessionRoute()

  assert.equal(getRestoredSessionRoute(restoredSession, { name: 'transfer-home' }), null)
})

test('bootstrap resolves the restored route before mounting the app', () => {
  assert.match(mainSource, /restoreAuthSession/)
  assert.match(mainSource, /router\.isReady\(\)/)
  assert.match(mainSource, /router\.replace/)
  assert.ok(mainSource.indexOf('restoreAuthSession') < mainSource.indexOf('router.isReady'))
  assert.ok(mainSource.indexOf('router.isReady') < mainSource.indexOf('app.mount'))
})
