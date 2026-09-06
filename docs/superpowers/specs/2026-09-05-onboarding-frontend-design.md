# Onboarding Frontend Design

## Goal

Turn the existing onboarding prototype into a usable Vue flow while keeping the backend contract isolated and easy to update.

## Scope

- Frontend only. The backend is owned by another team member.
- Keep existing prototype and design-system routes available.
- Add a real onboarding flow with route-per-step navigation, validation, privacy-safe inputs, and a development mock response.
- Match `POST /api/auth/signup` with the documented `SignUpRequest` and `AuthResponse` shapes.
- Do not invent an address-search endpoint. Allow manual address entry until the API contract adds one.
- Do not perform Git operations.

## Flow

1. Start
2. Required and optional consents
3. Login credentials
4. Basic identity and resident registration number
5. Address and phone
6. Bank account and emergency contact
7. Voice preference and local preview
8. Permission education (no OS permission prompt during signup)
9. Review and submit
10. Complete

## Architecture

- `features/onboarding/contract.js` owns the request/response vocabulary, defaults, validation, and request mapping.
- `api/client.js` owns Axios configuration; `api/auth.js` owns the live signup call; `api/mockAuth.js` returns the same response shape for development.
- `stores/onboarding.js` owns cross-route draft state and submit status. It never logs sensitive values.
- `features/onboarding/steps.js` is the single source of truth for step order and route navigation.
- `views/OnboardingView.vue` provides the shared mobile shell and renders small step components.

## Contract Decisions

- `residentRegistrationNumber` is assembled only when creating the request from separately entered front and back digits.
- `emergencyContact` is `{ name, relationship, phone }`.
- `consents` is an array of `{ type, agreed, documentVersion }`.
- Required consents block progression; optional consent refusal does not.
- The response is accepted only when it contains `accessToken`, `refreshToken`, `expiresAt`, and `userId`.
- Development uses a mock adapter unless `VITE_USE_REAL_API=true`. Production builds use the live API.

## Security and Accessibility

- Password, resident-number rear digits, and account number use concealed inputs.
- No sensitive form values or tokens are logged or persisted to browser storage.
- Labels, error descriptions, touch targets, and keyboard focus remain explicit.
- Permissions are explained during onboarding but requested only when the related feature is first used.
