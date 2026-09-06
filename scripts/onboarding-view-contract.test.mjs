import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('permissions step submits signup before completing the UI flow', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const permissionsBranch = source.match(
    /if\s*\(id\s*===\s*'permissions'\)\s*\{([\s\S]*?)\n\s*\}\n\s*if\s*\(id\s*===\s*'complete'\)/,
  )?.[1]

  assert.ok(permissionsBranch)
  assert.match(permissionsBranch, /const result = await store\.submit\(\)/)
  assert.match(permissionsBranch, /if \(!result\.ok\)/)
  assert.ok(
    permissionsBranch.indexOf('store.submit()') < permissionsBranch.indexOf('store.finishUiFlow()'),
  )
})

test('required consent detail screens do not render guidance cards', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /optionalConsentGuide/)
  assert.doesNotMatch(source, /class="guide-card/)
})

test('onboarding shell does not render question-mark help controls', async () => {
  const shell = await readFile(
    new URL('../src/components/onboarding/OnboardingShell.vue', import.meta.url),
    'utf8',
  )
  const view = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(shell, /aria-label="도움말"/)
  assert.doesNotMatch(shell, /<span>\?<\/span>도움/)
  assert.doesNotMatch(view, /:show-help=/)
})

test('login is an entry screen without a back button', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')

  assert.match(source, /:hide-back="screenId === 'login'"/)
})

test('login exposes a persistent two-level font size picker', async () => {
  const view = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/fontScale.js', import.meta.url), 'utf8')

  assert.match(view, /font-size-picker/)
  assert.match(view, /기본 크기/)
  assert.match(view, /큰 글씨/)
  assert.match(view, /setFontScale/)
  assert.match(service, /gwipyeonhan-font-scale/)
  assert.match(service, /localStorage/)
})

test('start screen shows back navigation to login', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const start = source.indexOf('function goBack()')
  const end = source.indexOf('\n}\n\nasync function handlePrimary', start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.match(source.slice(start, end), /screenId\.value === 'start'\) return go\('login'\)/)
})

test('onboarding shell receives a readable progress indicator', async () => {
  const view = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const shell = await readFile(
    new URL('../src/components/onboarding/OnboardingShell.vue', import.meta.url),
    'utf8',
  )
  const styleSource = await readFile(
    new URL('../src/styles/onboarding.css', import.meta.url),
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
    new URL('../src/styles/onboarding.css', import.meta.url),
    'utf8',
  )
  const segmentGrid = styleSource.match(/\.segment-grid\s*\{([\s\S]*?)\}/)?.[1]

  assert.ok(segmentGrid, 'onboarding choice groups should have a dedicated layout rule')
  assert.match(segmentGrid, /grid-template-columns:\s*minmax\(0,\s*1fr\);/)
})

test('onboarding cards use a thicker visible border', async () => {
  const styleSource = await readFile(
    new URL('../src/styles/onboarding.css', import.meta.url),
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
  const view = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const help = await readFile(
    new URL('../src/views/OnboardingHelpView.vue', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(view, /class="guide-card/)
  assert.doesNotMatch(help, /class="guide-card/)
})

test('going back clears a stale submit error before changing onboarding steps', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const start = source.indexOf('function goBack()')
  const end = source.indexOf('\n}\n\nasync function handlePrimary', start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.match(source.slice(start, end), /store\.submitError = null/)
})

test('account number input is visible while retaining a numeric keyboard hint', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const start = source.indexOf('aria-label="계좌번호"')
  const end = source.indexOf('</label>', start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const accountInput = source.slice(start, end)
  assert.match(accountInput, /inputmode="numeric"/)
  assert.match(accountInput, /type="text"/)
  assert.doesNotMatch(accountInput, /type="password"/)
})

test('onboarding action buttons use the senior-readable type scale', async () => {
  const styleSource = await readFile(
    new URL('../src/styles/onboarding.css', import.meta.url),
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
    new URL('../src/styles/onboarding.css', import.meta.url),
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
  assert.match(styleSource, /\.app-bottom-nav button\s*\{[\s\S]*?font-size:\s*14px;/)
})
