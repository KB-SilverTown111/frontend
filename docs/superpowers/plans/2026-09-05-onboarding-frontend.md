# Onboarding Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, testable frontend onboarding flow that preserves the documented signup request and response contract.

**Architecture:** Route-per-step Vue UI stores the draft in Pinia. Pure contract helpers validate and map the draft, while live and development API adapters share one response contract.

**Tech Stack:** Vue 3, Vue Router, Pinia, Axios, native Web Speech API, Node test runner

**Spec:** `docs/superpowers/specs/2026-09-05-onboarding-frontend-design.md`

## Global Constraints

- Frontend only; do not change the backend.
- Keep the existing prototype and design-system screens.
- Do not invent an address-search endpoint.
- Do not store or log passwords, tokens, full resident numbers, or full account numbers.
- Do not perform Git operations.

---

### Task 1: Onboarding contract and validation

**Files:**

- Create: `scripts/onboarding-contract.test.mjs`
- Create: `src/features/onboarding/contract.js`

**Interfaces:**

- Produces: `createOnboardingDraft()`, `validateStep(stepId, draft)`, `buildSignUpRequest(draft)`, `parseAuthResponse(value)`

- [ ] Write tests for required-consent behavior, optional-consent behavior, step validation, exact signup payload mapping, and malformed auth responses.
- [ ] Run `node --test scripts/onboarding-contract.test.mjs` and confirm it fails because the contract module does not exist.
- [ ] Implement the smallest pure helpers that satisfy the tests.
- [ ] Run the contract tests and confirm they pass.

### Task 2: Step navigation and API adapters

**Files:**

- Create: `scripts/onboarding-navigation.test.mjs`
- Create: `src/features/onboarding/steps.js`
- Create: `src/api/client.js`
- Create: `src/api/auth.js`
- Create: `src/api/mockAuth.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces: `ONBOARDING_STEPS`, `getAdjacentStep(stepId, direction)`, `authApi.signup(request)`, `mockAuthApi.signup(request)`

- [ ] Write navigation tests for first, middle, final, and invalid steps.
- [ ] Run the navigation test and confirm it fails because the step module does not exist.
- [ ] Implement the step list and adjacency helper.
- [ ] Add Axios and create the live and mock adapters with the same return shape.
- [ ] Run both onboarding test files.

### Task 3: Shared onboarding state

**Files:**

- Create: `src/stores/onboarding.js`

**Interfaces:**

- Consumes: contract helpers and API adapters.
- Produces: `useOnboardingStore()` with draft updates, step errors, submit state, auth result, and reset.

- [ ] Add a store behavior test covering request mapping and successful mock submission.
- [ ] Run it and confirm the store behavior is missing.
- [ ] Implement only the state and actions needed by the flow.
- [ ] Run all onboarding tests.

### Task 4: Onboarding screens and router

**Files:**

- Create: `src/components/onboarding/OnboardingShell.vue`
- Create: `src/components/onboarding/StartStep.vue`
- Create: `src/components/onboarding/ConsentStep.vue`
- Create: `src/components/onboarding/AccountStep.vue`
- Create: `src/components/onboarding/IdentityStep.vue`
- Create: `src/components/onboarding/ContactStep.vue`
- Create: `src/components/onboarding/FinanceStep.vue`
- Create: `src/components/onboarding/VoiceStep.vue`
- Create: `src/components/onboarding/PermissionStep.vue`
- Create: `src/components/onboarding/ReviewStep.vue`
- Create: `src/components/onboarding/CompleteStep.vue`
- Create: `src/views/OnboardingView.vue`
- Create: `src/styles/onboarding.css`
- Modify: `src/styles/globals.css`
- Modify: `src/router/index.js`

**Interfaces:**

- Consumes: the onboarding store and step registry.
- Produces: `/onboarding/:stepId` routes and a complete interactive flow.

- [ ] Add route-manifest tests for the onboarding entry and valid step paths.
- [ ] Run the test and confirm the new route contract is absent.
- [ ] Build the shared shell and focused step components using existing shadcn-style primitives and design tokens.
- [ ] Connect back/next/submit behavior through `OnboardingView.vue`.
- [ ] Redirect `/` to onboarding while preserving prototype routes.
- [ ] Run onboarding and existing prototype tests.

### Task 5: Verification

**Files:**

- Modify only files needed to correct verified failures.

- [ ] Run `npm run format`.
- [ ] Run `npm run test:prototype` and the onboarding tests.
- [ ] Run `npm run lint`.
- [ ] Run `npm run format:check`.
- [ ] Run `npm run build`.
- [ ] Start the development server and check start, validation, optional-consent skip, back navigation, mock submit, and completion in Chrome.
