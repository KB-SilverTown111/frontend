# Prototype Screens and Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the 109 supplied prototype screens plus the question-mark help screen inside the Vue application and connect them through Vue Router.

**Architecture:** A single route-level renderer loads one of five flow data modules on demand. Shared Vue shell and content components reuse the existing shadcn-vue primitives and global design tokens, while trusted static content extracted from the supplied HTML remains data rather than 110 duplicated Vue files.

**Tech Stack:** Vue 3, Vue Router, Vite, Tailwind CSS 4, existing shadcn-vue components, Node.js built-in test runner

**Spec:** `docs/superpowers/specs/2026-09-05-prototype-routes-design.md`

## Global Constraints

- Implement 109 flow screens plus one `물음표 버튼 화면6` help screen.
- Reuse `/public/fonts/PretendardVariable.woff2` and existing design tokens.
- Do not add packages.
- Do not connect APIs, backend operations, Pinia business state, Capacitor permissions, STT, or TTS.
- Keep primary touch targets at least 56px and icon targets at least 48px.
- Load only the selected flow data on a screen route.

---

### Task 1: Prototype Data and Resolver

**Files:**

- Create: `src/prototype/prototypeFlows.js`
- Create: `src/prototype/resolvePrototypeScreen.js`
- Create: `src/prototype/data/onboarding.js`
- Create: `src/prototype/data/transfer.js`
- Create: `src/prototype/data/bills.js`
- Create: `src/prototype/data/living.js`
- Create: `src/prototype/data/voice.js`
- Create: `src/prototype/data/help.js`
- Create: `scripts/prototype-manifest.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces: `prototypeFlows: Array<{ key, label, count, firstScreenId, load }>`
- Produces: `loadFlow(flowKey): Promise<Array<PrototypeScreen>>`
- Produces: `resolvePrototypeScreen(flowKey, screenId): Promise<{ screen, screens, index } | null>`
- `PrototypeScreen` fields: `id`, `number`, `title`, `description`, `contentHtml`, `primaryLabel`, `secondaryLabel`, `variant`, `showHelp`, `showTabs`

- [ ] **Step 1: Write the failing manifest test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadFlow, prototypeFlows } from '../src/prototype/prototypeFlows.js'
import helpScreen from '../src/prototype/data/help.js'

test('prototype manifest contains 109 flow screens plus help', async () => {
  const groups = await Promise.all(prototypeFlows.map(({ key }) => loadFlow(key)))
  assert.equal(groups.flat().length, 109)
  assert.equal(helpScreen.id, 'help')
})

test('prototype route keys and ids are unique', async () => {
  const groups = await Promise.all(prototypeFlows.map(({ key }) => loadFlow(key)))
  const keys = groups.flatMap((screens, index) =>
    screens.map((screen) => `${prototypeFlows[index].key}/${screen.id}`),
  )
  assert.equal(new Set(keys).size, 109)
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test scripts/prototype-manifest.test.mjs`

Expected: FAIL because `src/prototype/prototypeFlows.js` does not exist.

- [ ] **Step 3: Generate the five flow modules from the supplied ZIP**

Read every `section*-screen*.html` file, extract `data-num`, `<h1>`, `.sub`, `.content`, and `.actions button` values, and emit trusted static objects with this exact shape:

```js
export default [
  {
    id: '1-01',
    number: '1-01',
    title: '시작하기',
    description: '큰 글씨와 음성 안내로 가입을 시작합니다.',
    contentHtml:
      '<section class="hero"><div class="hero-icon">✓</div><div><strong>처음이어도 괜찮아요</strong><p>천천히 한 단계씩 안내해 드립니다.</p></div></section>',
    primaryLabel: '가입 시작하기',
    secondaryLabel: '',
    variant: 'default',
    showHelp: false,
    showTabs: true,
  },
]
```

Generate counts of 21 onboarding, 31 transfer, 23 bills, 26 living, and 8 voice screens. Extract `section1-screen01-help.html` separately into `help.js`.

- [ ] **Step 4: Implement the lazy flow registry and resolver**

```js
export const prototypeFlows = [
  {
    key: 'onboarding',
    label: '온보딩',
    count: 21,
    firstScreenId: '1-01',
    load: () => import('./data/onboarding.js'),
  },
  {
    key: 'transfer',
    label: '송금',
    count: 31,
    firstScreenId: '2-01',
    load: () => import('./data/transfer.js'),
  },
  {
    key: 'bills',
    label: '고지서',
    count: 23,
    firstScreenId: '3-01',
    load: () => import('./data/bills.js'),
  },
  {
    key: 'living',
    label: '생활금융',
    count: 26,
    firstScreenId: '4-01',
    load: () => import('./data/living.js'),
  },
  {
    key: 'voice',
    label: '공통 음성',
    count: 8,
    firstScreenId: '5-01',
    load: () => import('./data/voice.js'),
  },
]
```

`loadFlow()` returns `module.default` for a known key and `null` for an unknown key. `resolvePrototypeScreen()` returns the selected screen, its sibling array, and numeric index, or `null`.

- [ ] **Step 5: Add and run the prototype test script**

Add `"test:prototype": "node --test scripts/prototype-manifest.test.mjs"` to `package.json`.

Run: `npm run test:prototype`

Expected: two passing tests and zero failures.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/prototype-manifest.test.mjs src/prototype
git commit -m ":sparkles: Feat: 프로토타입 화면 데이터 추가"
```

### Task 2: Shared Mobile Screen Renderer

**Files:**

- Create: `src/components/prototype/MobileScreenShell.vue`
- Create: `src/components/prototype/ScreenContent.vue`
- Create: `src/views/PrototypeScreenView.vue`
- Create: `src/styles/prototype.css`
- Modify: `src/styles/globals.css`

**Interfaces:**

- Consumes: `resolvePrototypeScreen(flowKey, screenId)`
- Produces: route view accepting `route.params.flow` and `route.params.screenId`
- Produces: shell events `back`, `help`, `primary`, `secondary`, and tab navigation

- [ ] **Step 1: Extend the manifest test with resolver behavior**

```js
import { resolvePrototypeScreen } from '../src/prototype/resolvePrototypeScreen.js'

test('resolver returns screen position and rejects unknown routes', async () => {
  const result = await resolvePrototypeScreen('onboarding', '1-01')
  assert.equal(result.screen.title, '시작하기')
  assert.equal(result.index, 0)
  assert.equal(await resolvePrototypeScreen('missing', '1-01'), null)
})
```

- [ ] **Step 2: Run the resolver test and verify it fails**

Run: `npm run test:prototype`

Expected: FAIL until resolver behavior is implemented.

- [ ] **Step 3: Implement `MobileScreenShell.vue`**

Use a centered 390px frame on wide screens and full width on mobile. Render semantic buttons for back and help, a centered brand, a main slot, optional action footer, and three router links for 홈, 고지서, 생활금융. Use existing `Button` for primary and secondary actions.

- [ ] **Step 4: Implement `ScreenContent.vue`**

Render `screen.title`, `screen.description`, and the trusted static `screen.contentHtml`. The HTML is build-time content from the supplied ZIP and must never accept runtime user input. Add accessible status text based on `screen.variant`.

- [ ] **Step 5: Implement `PrototypeScreenView.vue`**

Watch `[route.params.flow, route.params.screenId]`, call `resolvePrototypeScreen()`, and expose loading, loaded, not-found, and load-error states. Primary moves to the next sibling or `/prototype`; secondary moves to the previous sibling. Help routes to `/prototype/help`.

- [ ] **Step 6: Add shared prototype CSS**

Move the repeated `.hero`, `.field`, `.choices`, `.choice`, `.meta`, `.amount`, `.steps`, `.note`, `.viewfinder`, `.stt`, `.voice`, and waveform styles into `prototype.css`. Map all colors to the existing CSS variables and retain the 56px action height and 48px icon targets.

- [ ] **Step 7: Run tests and commit**

Run: `npm run test:prototype`

Expected: all prototype tests pass.

```bash
git add src/components/prototype src/views/PrototypeScreenView.vue src/styles
git commit -m ":sparkles: Feat: 공통 프로토타입 화면 렌더러 추가"
```

### Task 3: Index, Design-System Preservation, and Router

**Files:**

- Create: `src/views/PrototypeIndexView.vue`
- Create: `src/views/PrototypeHelpView.vue`
- Create: `src/views/DesignSystemView.vue`
- Modify: `src/App.vue`
- Modify: `src/router/index.js`

**Interfaces:**

- Consumes: `prototypeFlows`
- Produces routes: `prototype-index`, `prototype-help`, `prototype-screen`, `design-system`

- [ ] **Step 1: Preserve the current design-system screen**

Move the existing `App.vue` script and template unchanged into `DesignSystemView.vue`. Replace `App.vue` with:

```vue
<template>
  <RouterView />
</template>
```

- [ ] **Step 2: Implement the prototype index**

Show five flow cards with labels, counts, and links to each first screen. Provide a separate help card. Load detailed screen lists only when the user expands a flow so the catalog does not eagerly load all five data chunks.

- [ ] **Step 3: Implement the help route**

Render `help.js` through the same `MobileScreenShell` and `ScreenContent`; back returns to browser history or `/prototype`.

- [ ] **Step 4: Add lazy routes**

```js
const routes = [
  { path: '/', redirect: '/prototype' },
  {
    path: '/prototype',
    name: 'prototype-index',
    component: () => import('@/views/PrototypeIndexView.vue'),
  },
  {
    path: '/prototype/help',
    name: 'prototype-help',
    component: () => import('@/views/PrototypeHelpView.vue'),
  },
  {
    path: '/prototype/:flow/:screenId',
    name: 'prototype-screen',
    component: () => import('@/views/PrototypeScreenView.vue'),
  },
  {
    path: '/design-system',
    name: 'design-system',
    component: () => import('@/views/DesignSystemView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/prototype' },
]
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:prototype`

Expected: all prototype tests pass.

```bash
git add src/App.vue src/router/index.js src/views
git commit -m ":sparkles: Feat: 프로토타입 라우터 연결"
```

### Task 4: Full Verification

**Files:**

- Modify only files required by verification findings.

**Interfaces:**

- Consumes all prior tasks.
- Produces a buildable, navigable prototype.

- [ ] **Step 1: Run formatting**

Run: `npm run format`

Expected: formatter completes without errors.

- [ ] **Step 2: Run full automated checks**

Run: `npm run test:prototype`

Expected: all tests pass.

Run: `npm run lint`

Expected: zero lint errors.

Run: `npm run format:check`

Expected: all files use Prettier formatting.

Run: `npm run build`

Expected: Vite exits with code 0 and emits lazy chunks for the five flow modules.

- [ ] **Step 3: Verify in browser**

Open the local Vite app and verify `/prototype`, each flow's first screen, `/prototype/help`, `/design-system`, and an invalid screen path. Confirm visible routing, local Pretendard rendering, primary/secondary navigation, help navigation, bottom tabs, and 390px responsive layout.

- [ ] **Step 4: Commit verification fixes**

```bash
git add src package.json scripts
git commit -m ":white_check_mark: Test: 프로토타입 화면 라우팅 검증"
```
