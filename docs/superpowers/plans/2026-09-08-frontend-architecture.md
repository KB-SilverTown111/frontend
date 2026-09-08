# Vue 프론트엔드 기능별 구조 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대형 Vue 화면과 전역 기능 파일을 업무 기능별 모듈로 재배치하고 의미 있는 화면 키와 라우트를 도입한다.

**Architecture:** `app / shared / features` 3단 구조를 도입한다. 각 feature는 `pages`, `components`, `screens`, `stores`, `api`, `model`, `services`를 소유하며, 라우터 진입점은 해당 feature page로 연결한다. 기존 API 계약과 사용자 동작은 유지하고 디자인 번호는 registry의 `designId`로만 격리한다.

**Tech Stack:** Vue 3 Composition API, Vue Router 5, Pinia 4, Axios, Capacitor, Vite, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-08-frontend-architecture-design.md`

## Global Constraints

- 백엔드 endpoint, HTTP method, request/response shape를 변경하지 않는다.
- 금융 실행은 기존 명시적 확인, 인증, idempotency 동작을 유지한다.
- `shared`는 feature를 import하지 않는다.
- 숫자 화면 ID는 feature registry의 `designId` 외 코드에 노출하지 않는다.
- 기존 테스트가 보장하는 접근성, 오류 상태, 브라우저 fallback을 유지한다.
- 기존 미커밋 파일인 `.codex_doc_edit/`, `docs/backend-request-items.md`, `docs/frontend-implementation-instructions.md`는 수정하거나 stage하지 않는다.

---

### Task 1: 구조 계약과 semantic screen registry 추가

**Files:**

- Create: `src/features/transfer/screens/registry.js`
- Create: `src/features/bills/screens/registry.js`
- Create: `src/features/living/screens/registry.js`
- Create: `src/features/voice/screens/registry.js`
- Create: `scripts/frontend-architecture.test.mjs`
- Modify: `scripts/run-tests.mjs` only if the new test needs a named command
- Test: `scripts/frontend-architecture.test.mjs`

**Interfaces:**

- Each registry exports `screenDefinitions`, `screenByKey`, and `routeForScreen`.
- A screen definition has `{ key, path, designId, title }`; `designId` is optional metadata and never drives UI conditions.
- `routeForScreen('bill-review')` returns `{ name: 'bills-review' }`.

- [ ] **Step 1: Write the failing architecture tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { screenDefinitions as billScreens } from '../src/features/bills/screens/registry.js'
import { screenDefinitions as transferScreens } from '../src/features/transfer/screens/registry.js'

test('feature screen registries expose semantic keys and isolate design ids', () => {
  assert.equal(billScreens.sourceSelect.key, 'bill-source-select')
  assert.equal(billScreens.sourceSelect.path, 'scan')
  assert.equal(billScreens.sourceSelect.designId, '3-02')
  assert.equal(transferScreens.confirm.key, 'transfer-confirm')
  assert.equal(transferScreens.confirm.path, 'confirm')
})

test('screen registry keys do not require numeric route conditions', () => {
  const source = JSON.stringify({ billScreens, transferScreens })
  assert.match(source, /bill-source-select/)
  assert.match(source, /transfer-confirm/)
})
```

- [ ] **Step 2: Run the new test and verify the expected missing-module failure**

Run: `node --test scripts/frontend-architecture.test.mjs`

Expected: FAIL because the feature registry modules do not exist yet.

- [ ] **Step 3: Implement the minimum registry modules**

Create semantic definitions with the existing design IDs as metadata. Do not put component imports, API calls, or route guards in the registry.

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test scripts/frontend-architecture.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the structure contract**

```text
git add src/features scripts/frontend-architecture.test.mjs
git commit -m "test: 기능별 화면 registry 계약 추가"
```

### Task 2: app/shared 기반과 feature API 경계 정리

**Files:**

- Create: `src/app/App.vue`, `src/app/main.js`, `src/app/router/index.js`, `src/app/router/routes.js`, `src/app/router/navigation.js`
- Create: `src/shared/api/client.js`, `src/shared/api/errors.js`, `src/shared/api/request.js`
- Create: `src/shared/components/ui/`, `src/shared/native/`, `src/shared/lib/`
- Create: `src/features/auth/api/auth.api.js`, `src/features/onboarding/api/onboarding.api.js`, `src/features/transfer/api/transfer.api.js`, `src/features/bills/api/bills.api.js`, `src/features/voice/api/voice.api.js`
- Modify: imports in `src/app/main.js`, router files, feature files, and tests
- Remove: old root-level API and router files after consumers are migrated

**Interfaces:**

- `shared/api/client.js` remains the only Axios instance.
- Feature API modules expose the same method names and request shapes as the current API modules.
- `app/main.js` keeps the existing bootstrap order: font scale, Pinia, router, session restore, router readiness, restored route, mount.

- [ ] **Step 1: Add import-path contract assertions to `scripts/frontend-architecture.test.mjs`**

Assert that the new feature API files exist and the app entry imports from `@/app/` and `@/shared/`.

- [ ] **Step 2: Run the contract test and verify it fails before the files move**

Run: `node --test scripts/frontend-architecture.test.mjs`

Expected: FAIL for missing app/shared/feature API paths.

- [ ] **Step 3: Move files without changing behavior**

Use `git mv` for files whose contents remain equivalent, update relative imports, and keep the current Axios and auth-storage behavior intact.

- [ ] **Step 4: Run API, auth, and bootstrap tests**

Run: `node --test scripts/onboarding-api.test.mjs scripts/onboarding-auth-client.test.mjs scripts/onboarding-auth-storage.test.mjs scripts/app-loading.test.mjs`

Expected: all pre-existing assertions pass; the two known refresh failures remain separately identified if they reproduce.

- [ ] **Step 5: Commit the app/shared boundary**

```text
git add src/app src/shared src/features scripts
git commit -m "refactor: 앱과 공통 인프라를 기능별 경계로 분리"
```

### Task 3: auth와 onboarding 기능 분리

**Files:**

- Create: `src/features/onboarding/pages/OnboardingPage.vue`
- Create: `src/features/onboarding/components/steps/StartStep.vue`, `ConsentStep.vue`, `BasicInfoStep.vue`, `ResidentNumberStep.vue`, `AddressStep.vue`, `BankAccountStep.vue`, `BankSelectStep.vue`, `PhoneStep.vue`, `EmergencyContactStep.vue`, `PermissionStep.vue`, `CompleteStep.vue`, `LoginStep.vue`, `ReloginStep.vue`, `ConsentInfoStep.vue`, `ErrorStep.vue`
- Create: `src/features/onboarding/composables/useOnboardingFlow.js`
- Move: `src/features/onboarding/stores/onboarding.store.js`, `model/steps.js`, `model/banks.js`, `model/contract.js`, `services/permissions.js`, `services/postcode.js`
- Modify: `src/app/router/routes.js`, onboarding tests, styles
- Remove: `src/views/OnboardingView.vue` after route and tests migrate

**Interfaces:**

- `OnboardingPage.vue` reads route step, obtains `useOnboardingFlow()`, and renders one step component.
- Step components receive only the state and callbacks needed by that step; they do not call Axios directly.
- `useOnboardingFlow()` exposes `screenId`, `screenCopy`, `progress`, `primaryLabel`, `secondaryLabel`, `handlePrimary`, `handleSecondary`, and navigation helpers.

- [ ] **Step 1: Add a failing page contract test**

Assert that the onboarding route imports `OnboardingPage.vue`, the page imports `useOnboardingFlow`, and every supported step has a component mapping.

- [ ] **Step 2: Run the focused onboarding contract test and verify the expected failure**

Run: `npm run test:onboarding`

Expected: the new path assertions fail before the split.

- [ ] **Step 3: Extract step templates into focused components**

Move one `screenId` section at a time. Keep labels, `aria-*` attributes, validation messages, and events unchanged.

- [ ] **Step 4: Extract navigation, permission, postcode, and submit logic into the composable**

Keep the existing store actions and API request shapes. The composable coordinates them but does not render markup.

- [ ] **Step 5: Run all onboarding tests and verify no behavior regression**

Run: `npm run test:onboarding`

Expected: all onboarding tests pass except only the two already-known session-refresh failures if included by the runner.

- [ ] **Step 6: Commit onboarding decomposition**

```text
git add src/features/onboarding src/app/router scripts
git commit -m "refactor: 온보딩 화면을 단계별 컴포넌트로 분리"
```

### Task 4: transfer 기능을 독립 모듈로 분리

**Files:**

- Create: `src/features/transfer/pages/TransferHomePage.vue`, `TransferScreenPage.vue`, `TransferPinPage.vue`
- Create: `src/features/transfer/components/RecipientPicker.vue`, `AccountPicker.vue`, `AmountInput.vue`, `TransferConfirmCard.vue`, `TransferResultCard.vue`, `TransferPlanList.vue`, `TransferPlanForm.vue`
- Create: `src/features/transfer/composables/useTransferFlow.js`
- Create: `src/features/transfer/model/validation.js`, `mappers.js`
- Move: transfer store, transfer-plan store, draft/plan storage, transfer screen copy, transfer API
- Modify: transfer routes, transfer styles, transfer tests

**Interfaces:**

- `TransferScreenPage.vue` receives a semantic `screenKey`, not a numeric ID.
- `useTransferFlow()` owns recipient selection, account loading, amount validation, risk checks, PIN/guardian authentication, confirmation, execution, and failure state.
- Transfer screen registry maps legacy design IDs to semantic keys only at the boundary.

- [ ] **Step 1: Add failing semantic transfer route tests**

Cover recipient, confirmation, result, and scheduled-transfer routes using semantic names.

- [ ] **Step 2: Run the focused transfer tests and verify the new route assertions fail**

Run: `npm run test:transfer && npm run test:service-routes && npm run test:service-stores`

- [ ] **Step 3: Move transfer API/store/service files and update imports**

Preserve the current store action names during the first move so behavior changes are not mixed with the structural change.

- [ ] **Step 4: Extract the transfer flow panel and screen-specific markup**

Keep confirmation and authentication in separate components. No component executes a transfer from raw speech or without explicit store confirmation.

- [ ] **Step 5: Replace transfer numeric route conditions with semantic keys**

Keep `designId` only in the registry and adapt route parsing in one place.

- [ ] **Step 6: Run transfer and API/store tests**

Run: `npm run test:transfer; npm run test:service-api; npm run test:service-stores; npm run test:service-routes`

Expected: all existing transfer assertions pass.

- [ ] **Step 7: Commit transfer decomposition**

```text
git add src/features/transfer src/app/router scripts
git commit -m "refactor: 송금 화면과 흐름을 기능 모듈로 분리"
```

### Task 5: bills, living, and voice 기능 분리

**Files:**

- Create: `src/features/bills/pages/BillsHomePage.vue`, `BillScreenPage.vue`, `components/BillCamera.vue`, `BillOcrResult.vue`, `BillPaymentCard.vue`, `BillResult.vue`
- Create: `src/features/living/pages/LivingHomePage.vue`, `src/features/living/reminders/`, `src/features/living/mobile-branch/`
- Create: `src/features/voice/composables/useVoiceSession.js`, `src/features/voice/components/VoiceConversationPanel.vue`, `VoiceAssistPanel.vue`, `src/features/voice/services/`, `src/features/voice/api/voice.api.js`, `src/features/voice/stores/voice.store.js`
- Move: bill, reminder, mobile-branch, voice API/store/service/screen-data files
- Modify: route registry, styles, service API/store/route tests
- Remove: `src/views/ServiceRouteView.vue` after all service routes migrate

**Interfaces:**

- Bill page owns only OCR/camera/payment states.
- Living feature owns reminders and mobile branch state separately; neither is stored in one `serviceData` aggregate store.
- Voice exposes a small public module API for transfer and bills without exposing its storage or native implementation details.

- [ ] **Step 1: Add failing feature import and semantic route tests**

Assert that bill, reminder, mobile-branch, and voice entry points exist and no service route imports the old mega view.

- [ ] **Step 2: Run service tests and verify the new assertions fail**

Run: `npm run test:service-api; npm run test:service-stores; npm run test:service-routes`

- [ ] **Step 3: Extract bill camera/OCR/payment components and composables**

Preserve camera permission handling, browser input fallback, confirmation fields, execution idempotency, and result rendering.

- [ ] **Step 4: Split the living aggregate store**

Move reminder operations to `reminders.store.js` and nearby branch loading/presentation to `mobile-branch.store.js` and `model/presentation.js`.

- [ ] **Step 5: Move voice capture and speech services behind `useVoiceSession()`**

Keep STT/TTS behavior and speech permission handling unchanged.

- [ ] **Step 6: Replace service routes and remove the mega view**

Route each domain to its own page. Shared shell and bottom navigation remain in `shared/components/layout/`.

- [ ] **Step 7: Run service tests and build**

Run: `npm run test:service-api; npm run test:service-stores; npm run test:service-routes; npm run build`

Expected: all service tests pass and no `ServiceRouteView.vue` remains.

- [ ] **Step 8: Commit service decomposition**

```text
git add src/features src/app/router scripts
git commit -m "refactor: 서비스 화면을 도메인별 페이지로 분리"
```

### Task 6: 테스트를 기능별 디렉터리로 정리

**Files:**

- Create: `tests/architecture/frontend-structure.test.mjs`, `tests/helpers/source.js`
- Create: `tests/app/`, `tests/shared/`, `tests/features/auth/`, `tests/features/onboarding/`, `tests/features/transfer/`, `tests/features/bills/`, `tests/features/living/`, `tests/features/voice/`, `tests/features/my-page/`
- Move: behavior tests from `scripts/*.test.mjs` into the matching `tests/` feature directory
- Modify: `scripts/run-tests.mjs`, `package.json`, moved test import paths
- Preserve: `scripts/commit.cjs` and the existing test command names

**Interfaces:**

- `scripts/run-tests.mjs` recursively discovers `tests/**/*.test.mjs` and keeps the existing prefix-based command behavior.
- Test files are grouped by user-facing feature or shared concern, not by the production file they happened to inspect.
- `tests/helpers/source.js` owns repeated source-reading and path-resolution helpers; feature tests keep assertions about their own contracts.
- `tests/architecture/frontend-structure.test.mjs` verifies semantic screen keys, allowed import direction, and absence of stale mega-view paths.

- [ ] **Step 1: Add the failing recursive-runner and architecture contract tests**

Create the architecture test under `tests/architecture/` first. Add a runner test or a directly observable runner contract that requires recursive discovery and the new test roots.

- [ ] **Step 2: Run the new tests and verify the expected failures**

Run: `node --test tests/architecture/frontend-structure.test.mjs`

Expected: FAIL because the new source boundaries and recursive test discovery do not exist yet.

- [ ] **Step 3: Move tests by behavior, splitting mixed service tests where needed**

Use this initial mapping:

| Current test                              | New location                                                  |
| ----------------------------------------- | ------------------------------------------------------------- |
| `app-loading`, `auto-login`, `navigation` | `tests/app/`                                                  |
| `onboarding-*`                            | `tests/features/onboarding/`                                  |
| `transfer-home`, `transfer-plan`          | `tests/features/transfer/`                                    |
| `bill-payment`                            | `tests/features/bills/`                                       |
| service API/store/route assertions        | matching `tests/features/{bills,living,transfer,voice}/` file |
| `screen-data`                             | split by feature under `tests/features/`                      |
| `camera`, `font-scale`, `design-system`   | `tests/shared/`                                               |
| `my-page`                                 | `tests/features/my-page/`                                     |

Keep test behavior and assertions unchanged while correcting only import paths and test grouping.

- [ ] **Step 4: Update the runner and package scripts**

Make the runner discover nested test files, retain prefix aliases used by `npm run test:*`, and remove direct test files from `scripts/` after all imports resolve.

- [ ] **Step 5: Run the reorganized tests and verify the baseline**

Run: `node scripts/run-tests.mjs`

Expected: the same passing tests remain passing, and the two pre-existing onboarding session-refresh failures are reported separately if they reproduce.

- [ ] **Step 6: Commit the test reorganization**

```text
git add tests scripts/run-tests.mjs package.json
git commit -m "refactor: 테스트를 기능별 디렉터리로 정리"
```

### Task 7: 공통 스타일·문서 정리

**Files:**

- Create: `src/shared/styles/tokens.css`, `base.css`, `accessibility.css`
- Move: feature-specific rules from `src/styles/transfer.css`, `screen-content.css`, `onboarding.css`
- Modify: `src/features/*/components/**/*.vue`, `src/app/App.vue`, `docs/frontend-architecture.md`
- Create: `docs/frontend-architecture.md`
- Preserve: `docs/backend-request-items.md`, `docs/frontend-implementation-instructions.md`

- [ ] **Step 1: Extend the architecture test for stale paths and numeric route conditions**

Scan only source files under `src` and assert that old root imports and direct `screenId === 'N-NN'` conditions are absent.

- [ ] **Step 2: Run the architecture test and verify the expected failures**

Run: `node --test scripts/frontend-architecture.test.mjs`

- [ ] **Step 3: Move style rules beside their feature components**

Keep global tokens and accessibility defaults in `shared/styles`; keep transfer, onboarding, bill, and living layout rules local to their feature.

- [ ] **Step 4: Update architecture documentation**

Group test helpers by feature, document semantic screen keys and the allowed import direction, and link the Mermaid diagram from the architecture document.

- [ ] **Step 5: Run the complete verification set**

Run: `npm run lint; npm run build; node scripts/run-tests.mjs`

Expected: lint and build pass; all pre-existing passing tests remain passing; the two baseline refresh failures are either fixed with a separate regression test or reported unchanged.

- [ ] **Step 6: Commit the final cleanup**

```text
git add src scripts docs/superpowers/specs/2026-09-08-frontend-architecture-design.md docs/superpowers/plans/2026-09-08-frontend-architecture.md docs/frontend-architecture.md
git commit -m "docs: 프론트엔드 기능별 구조와 의존 규칙 문서화"
```
