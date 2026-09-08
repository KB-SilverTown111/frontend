import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const viewSource = readFileSync(
  new URL('../../src/app/pages/DesignSystemPage.vue', import.meta.url),
  'utf8',
)
const appSource = readFileSync(new URL('../../src/app/App.vue', import.meta.url), 'utf8')
const actionViewSources = [
  'src/features/onboarding/components/OnboardingShell.vue',
  'src/features/onboarding/pages/OnboardingHelpPage.vue',
  'src/features/transfer/pages/TransferHomePage.vue',
  'src/app/pages/ServiceHomePage.vue',
  'src/features/service-screen/pages/ServiceScreenPage.vue',
].map((path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'))
const globalStyleSource = readFileSync(
  new URL('../../src/shared/styles/globals.css', import.meta.url),
  'utf8',
)
const appLayoutStyleSource = readFileSync(
  new URL('../../src/features/onboarding/styles/onboarding.css', import.meta.url),
  'utf8',
)
const cardSource = readFileSync(
  new URL('../../src/shared/components/ui/card/Card.vue', import.meta.url),
  'utf8',
)
const buttonSource = readFileSync(
  new URL('../../src/shared/components/ui/button/Button.vue', import.meta.url),
  'utf8',
)
const inputSource = readFileSync(
  new URL('../../src/shared/components/ui/input/Input.vue', import.meta.url),
  'utf8',
)
const alertTitleSource = readFileSync(
  new URL('../../src/shared/components/ui/alert/AlertTitle.vue', import.meta.url),
  'utf8',
)

test('design system page documents the current senior-friendly foundation', () => {
  assert.match(viewSource, /DESIGN SYSTEM · SENIOR UI/)
  assert.match(viewSource, /Typography/)
  assert.match(viewSource, /Interaction/)
  assert.match(viewSource, /가입 진행 단계/)
})

test('shared design tokens expose the senior readability scale', () => {
  assert.match(globalStyleSource, /--card-border-width:\s*2px;/)
  assert.match(globalStyleSource, /--font-size-title:\s*30px;/)
  assert.match(globalStyleSource, /--font-size-body:\s*19px;/)
  assert.match(globalStyleSource, /--font-size-action:\s*24px;/)
  assert.match(globalStyleSource, /--font-size-display:\s*36px;/)
  assert.match(globalStyleSource, /--touch-target-min:\s*64px;/)
})

test('shadcn primitives use the updated card and touch-target defaults', () => {
  assert.match(cardSource, /border-2/)
  assert.match(buttonSource, /min-h-16/)
  assert.match(buttonSource, /text-\[length:var\(--font-size-action\)\]/)
  assert.match(inputSource, /min-h-16/)
  assert.match(inputSource, /border-2/)
  assert.match(alertTitleSource, /text-\[length:var\(--font-size-action\)\]/)
})

test('shared inputs use the brand focus treatment', () => {
  assert.match(inputSource, /focus-visible:border-primary/)
  assert.match(inputSource, /focus-visible:bg-muted/)
  assert.match(inputSource, /focus-visible:shadow-\[inset_0_0_0_1px_var\(--primary\)\]/)
  assert.match(inputSource, /focus-visible:outline-none/)
})

test('focused inputs override the global focus outline with the brand border', () => {
  assert.match(
    globalStyleSource,
    /input:focus-visible\s*\{[\s\S]*?outline:\s*none;[\s\S]*?border-color:\s*var\(--primary\);/,
  )
})

test('mobile app shell keeps its bottom chrome at the stable app viewport', () => {
  assert.match(appLayoutStyleSource, /min-height:\s*100svh;/)
  assert.match(
    appLayoutStyleSource,
    /\.mobile-app-shell\s*\{[\s\S]*?height:\s*min\(881px, calc\(var\(--app-stable-height, 100svh\) - 48px\)\);[\s\S]*?min-height:\s*min\(640px, var\(--app-stable-height, 100svh\)\);/,
  )
  assert.match(appLayoutStyleSource, /var\(--app-stable-height, 100svh\)/)
  assert.doesNotMatch(appLayoutStyleSource, /100dvh/)
  assert.match(appLayoutStyleSource, /\.app-bottom-nav\s*\{[\s\S]*?flex:\s*0 0 auto;/)
})

test('app root holds the initial shell height while the keyboard resizes the webview', () => {
  assert.match(appSource, /onMounted/)
  assert.match(appSource, /window\.innerHeight/)
  assert.match(appSource, /--app-stable-height/)
  assert.match(appSource, /visualViewport\?\.addEventListener\('resize'/)
  assert.match(appSource, /textFieldFocused\s*&&\s*currentHeight\s*<=\s*stableHeight\s*\* 0\.8/)
  assert.match(appSource, /onBeforeUnmount/)
  assert.match(
    appLayoutStyleSource,
    /height:\s*min\(881px, calc\(var\(--app-stable-height, 100svh\) - 48px\)\);/,
  )
  assert.match(appLayoutStyleSource, /height:\s*var\(--app-stable-height, 100svh\);/)
})

test('primary action buttons scroll with the screen body instead of floating over content', () => {
  for (const source of actionViewSources) {
    assert.match(source, /<main[\s\S]*<footer[\s\S]*<\/main>/)
    assert.doesNotMatch(source, /<\/main>[\s\S]*<footer/)
  }
  assert.match(
    appLayoutStyleSource,
    /\.app-actions\s*\{[\s\S]*?margin-top:\s*8px;[\s\S]*?padding:\s*0 0 calc\(22px \+ var\(--app-safe-area-bottom\)\);/,
  )
})

test('app screens reserve scroll space and use one focus treatment for native fields', () => {
  assert.match(
    appLayoutStyleSource,
    /\.app-main\s*\{[\s\S]*?padding:\s*26px 24px 32px;[\s\S]*?overscroll-behavior-y:\s*contain;[\s\S]*?scroll-padding-block:\s*24px 32px;/,
  )
  assert.match(
    appLayoutStyleSource,
    /\.app-main :where\(input, select, textarea\)\s*\{[\s\S]*?scroll-margin-block:\s*24px 32px;/,
  )
  assert.match(
    appLayoutStyleSource,
    /\.app-main :where\(input, select, textarea\):focus-visible\s*\{[\s\S]*?background:\s*var\(--muted\);[\s\S]*?box-shadow:\s*inset 0 0 0 1px var\(--primary\);/,
  )
})

test('typography samples follow the active font-size token', () => {
  assert.match(viewSource, /fontSize: `var\(\$\{scale\.token\}\)`/)
})
