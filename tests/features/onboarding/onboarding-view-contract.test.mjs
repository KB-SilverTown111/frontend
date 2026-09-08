import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readOnboardingView() {
  const page = await readFile(
    new URL('../../../src/features/onboarding/pages/OnboardingPage.vue', import.meta.url),
    'utf8',
  )
  const flow = await readFile(
    new URL('../../../src/features/onboarding/composables/useOnboardingFlow.js', import.meta.url),
    'utf8',
  )
  return `${flow}\n${page}`.replace(/\r\n/g, '\n')
}

test('permissions step submits signup before completing the UI flow', async () => {
  const source = await readOnboardingView()
  const submitFunction = source.match(
    /async function submitOnboarding\(\)\s*\{([\s\S]*?)\n\s*\}\n\s*function closePostcode/,
  )?.[1]

  assert.ok(submitFunction)
  assert.match(submitFunction, /const result = await store\.submit\(\)/)
  assert.match(submitFunction, /if \(!result\.ok\)/)
  assert.ok(
    submitFunction.indexOf('store.submit()') < submitFunction.indexOf('store.finishUiFlow()'),
  )
  assert.match(source, /if \(id === 'permissions'\) return submitOnboarding\(\)/)
})

test('successful signup goes directly to the transfer home screen', async () => {
  const source = await readOnboardingView()
  const submitFunction = source.match(
    /async function submitOnboarding\(\)\s*\{([\s\S]*?)\n\s*\}\n\s*function closePostcode/,
  )?.[1]

  assert.ok(submitFunction)
  assert.doesNotMatch(submitFunction, /go\('complete'\)/)
  assert.match(submitFunction, /store\.finishUiFlow\(\)/)
  assert.match(submitFunction, /requestAppIntent\('home'\)/)
  assert.match(submitFunction, /return requestAppIntent\('home'\)/)
  assert.ok(
    submitFunction.indexOf('store.finishUiFlow()') <
      submitFunction.indexOf("requestAppIntent('home')"),
  )
})

test('already granted native permissions skip the permissions screen', async () => {
  const source = await readOnboardingView()

  assert.match(source, /async function areDevicePermissionsGranted\(\)/)
  assert.match(source, /if \(await areDevicePermissionsGranted\(\)\) return submitOnboarding\(\)/)
  assert.match(source, /if \(id === 'permissions'\) return submitOnboarding\(\)/)
})

test('required consent detail screens do not render guidance cards', async () => {
  const source = await readOnboardingView()

  assert.doesNotMatch(source, /optionalConsentGuide/)
  assert.doesNotMatch(source, /class="guide-card/)
})

test('onboarding shell does not render question-mark help controls', async () => {
  const shell = await readFile(
    new URL('../../../src/features/onboarding/components/OnboardingShell.vue', import.meta.url),
    'utf8',
  )
  const view = await readOnboardingView()

  assert.doesNotMatch(shell, /aria-label="도움말"/)
  assert.doesNotMatch(shell, /<span>\?<\/span>도움/)
  assert.doesNotMatch(view, /:show-help=/)
})

test('login is an entry screen without a back button', async () => {
  const source = await readOnboardingView()

  assert.match(source, /:hide-back="screenId === 'login'"/)
})

test('login opens a separate font size setting screen from a summary card', async () => {
  const view = await readOnboardingView()
  const service = await readFile(
    new URL('../../../src/shared/services/fontScale.js', import.meta.url),
    'utf8',
  )

  assert.match(view, /class="my-page-card login-font-size-card"/)
  assert.match(view, /:to="\{ name: 'font-size' \}"/)
  assert.match(view, /fontScale === FONT_SCALE\.large \? '큰 글씨' : '기본 크기'/)
  assert.doesNotMatch(view, /font-size-picker/)
  assert.doesNotMatch(view, /function setFontScale\(/)
  assert.match(service, /gwipyeonhan-font-scale/)
  assert.match(service, /localStorage/)
})

test('start screen shows back navigation to login', async () => {
  const source = await readOnboardingView()
  const start = source.indexOf('function goBack()')
  const end = source.indexOf('\n  }\n\n  async function handlePrimary', start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.match(
    source.slice(start, end),
    /screenId\.value === 'start'[\s\S]*goBackOrReplace\(router,[\s\S]*stepId: 'login'/,
  )
})

test('onboarding shell receives a readable progress indicator', async () => {
  const view = await readOnboardingView()
  const shell = await readFile(
    new URL('../../../src/features/onboarding/components/OnboardingShell.vue', import.meta.url),
    'utf8',
  )
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )

  assert.match(view, /getOnboardingDisplayProgress\(screenId\.value\)/)
  assert.match(view, /:progress="progress"/)
  assert.match(shell, /progress: \{ type: Object, default: null \}/)
  assert.match(shell, /class="onboarding-progress"/)
  assert.match(styleSource, /\.onboarding-progress-track\s*\{[\s\S]*?height:\s*8px;/)
})

test('onboarding choice cards stack one item per row', async () => {
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )
  const segmentGrid = styleSource.match(/\.segment-grid\s*\{([\s\S]*?)\}/)?.[1]

  assert.ok(segmentGrid, 'onboarding choice groups should have a dedicated layout rule')
  assert.match(segmentGrid, /grid-template-columns:\s*minmax\(0,\s*1fr\);/)
})

test('onboarding cards use a thicker visible border', async () => {
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )

  assert.match(styleSource, /\.status-card\s*\{[\s\S]*?border:\s*2px solid var\(--border\);/)
  assert.match(
    styleSource,
    /\.segment-option,\s*\.detail-row,\s*\.native-select\s*\{[\s\S]*?border:\s*2px solid var\(--border\);/,
  )
  assert.match(
    styleSource,
    /\.segment-option,\s*\.detail-row,\s*\.native-select\s*\{[\s\S]*?min-height:\s*72px;/,
  )
})

test('onboarding surfaces do not render guidance cards', async () => {
  const view = await readOnboardingView()
  const help = await readFile(
    new URL('../../../src/features/onboarding/pages/OnboardingHelpPage.vue', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(view, /class="guide-card/)
  assert.doesNotMatch(help, /class="guide-card/)
})

test('going back clears a stale submit error before changing onboarding steps', async () => {
  const source = await readOnboardingView()
  const start = source.indexOf('function goBack()')
  const end = source.indexOf('\n  }\n\n  async function handlePrimary', start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.match(source.slice(start, end), /store\.submitError = null/)
})

test('onboarding exposes the go navigation helper to its template', async () => {
  const source = await readOnboardingView()
  const flowReturn = source.slice(source.lastIndexOf('return {'))

  assert.match(flowReturn, /\n {4}go,\n/)
  assert.match(source, /go,\s*goBack,\s*handleEmergencyPhoneInput/s)
})

test('account number input is visible while retaining a numeric keyboard hint', async () => {
  const source = await readOnboardingView()
  const start = source.indexOf('aria-label="계좌번호"')
  const end = source.indexOf('</label>', start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const accountInput = source.slice(start, end)
  assert.match(accountInput, /inputmode="numeric"/)
  assert.match(accountInput, /type="text"/)
  assert.doesNotMatch(accountInput, /type="password"/)
})

test('account input uses its card as the focus indicator without native decoration', async () => {
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )
  const inputBlock = styleSource.match(/\.input-segment input\s*\{([\s\S]*?)\}/)?.[1]
  const focusBlock = styleSource.match(/\.input-segment:focus-within\s*\{([\s\S]*?)\}/)?.[1]

  assert.ok(inputBlock, 'account input should have a dedicated native input rule')
  assert.ok(focusBlock, 'account card should expose focus-within styling')
  assert.match(inputBlock, /-webkit-appearance:\s*none;/)
  assert.match(inputBlock, /appearance:\s*none;/)
  assert.match(inputBlock, /background:\s*transparent;/)
  assert.match(inputBlock, /box-shadow:\s*none;/)
  assert.match(focusBlock, /border-color:\s*var\(--primary\);/)
  assert.match(focusBlock, /background:\s*var\(--muted\);/)
  assert.match(focusBlock, /box-shadow:\s*inset 0 0 0 1px var\(--primary\);/)
})

test('onboarding action buttons use the senior-readable type scale', async () => {
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )
  const actionButtonBlock = styleSource.match(
    /\.onboarding-device \.app-actions button\s*\{([\s\S]*?)\}/,
  )?.[1]

  assert.ok(actionButtonBlock, 'onboarding action buttons should have a dedicated readability rule')
  assert.match(actionButtonBlock, /font-size:\s*var\(--font-size-action\);/)
  assert.match(actionButtonBlock, /font-weight:\s*800;/)
})

test('onboarding supporting text keeps a readable scale below the action buttons', async () => {
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )

  assert.match(
    styleSource,
    /\.screen-heading h1\s*\{[\s\S]*?font-size:\s*var\(--font-size-title\);/,
  )
  assert.match(
    styleSource,
    /\.screen-heading > p\s*\{[\s\S]*?font-size:\s*var\(--font-size-body\);/,
  )
  assert.match(
    styleSource,
    /\.segment-option,[\s\S]*?\.detail-row,[\s\S]*?\.native-select\s*\{[\s\S]*?font-size:\s*var\(--font-size-body\);/,
  )
  assert.match(
    styleSource,
    /\.app-bottom-nav button\s*\{[\s\S]*?font-size:\s*var\(--font-size-nav\);/,
  )
})

test('mobile app chrome reserves space around system bars', async () => {
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )
  const transferStyleSource = await readFile(
    new URL('../../../src/features/transfer/styles/transfer.css', import.meta.url),
    'utf8',
  )
  const mobileStyles = styleSource.slice(styleSource.indexOf('@media (max-width: 430px)'))

  assert.match(
    styleSource,
    /\.mobile-app-shell\s*\{[\s\S]*?--app-safe-area-top:\s*0px;[\s\S]*?--app-safe-area-bottom:\s*0px;/,
  )
  assert.match(
    styleSource,
    /\.app-header\s*\{[\s\S]*?height:\s*calc\(76px \+ var\(--app-safe-area-top\)\);[\s\S]*?flex:\s*0 0 calc\(76px \+ var\(--app-safe-area-top\)\);/,
  )
  assert.match(
    styleSource,
    /\.app-actions\s*\{[\s\S]*?margin-top:\s*8px;[\s\S]*?padding: 0 0 calc\(22px \+ var\(--app-safe-area-bottom\)\);/,
  )
  assert.match(
    styleSource,
    /\.app-bottom-nav\s*\{[\s\S]*?min-height:\s*calc\(58px \+ var\(--app-safe-area-bottom\)\);[\s\S]*?padding-bottom:\s*var\(--app-safe-area-bottom\);/,
  )
  assert.match(
    transferStyleSource,
    /\.transfer-bottom-nav,[\s\S]*?\.my-page-bottom-nav\s*\{[\s\S]*?min-height:\s*calc\(64px \+ var\(--app-safe-area-bottom\)\);/,
  )
  assert.match(
    mobileStyles,
    /\.mobile-app-shell\s*\{[\s\S]*?--app-safe-area-top:\s*max\(16px, env\(safe-area-inset-top\)\);[\s\S]*?--app-safe-area-bottom:\s*max\(12px, env\(safe-area-inset-bottom\)\);/,
  )
})

test('postcode overlay is contained by the scrollable app content', async () => {
  const styleSource = await readFile(
    new URL('../../../src/features/onboarding/styles/onboarding.css', import.meta.url),
    'utf8',
  )
  const appMain = styleSource.match(/\.app-main\s*\{([\s\S]*?)\}/)?.[1]
  const postcodeOverlay = styleSource.match(/\.postcode-overlay\s*\{([\s\S]*?)\}/)?.[1]

  assert.ok(appMain, 'app main should have a dedicated layout rule')
  assert.ok(postcodeOverlay, 'postcode overlay should have a dedicated layout rule')
  assert.match(appMain, /position:\s*relative;/)
  assert.match(postcodeOverlay, /position:\s*absolute;/)
  assert.match(postcodeOverlay, /inset:\s*0 0 var\(--app-safe-area-bottom\);/)
})
