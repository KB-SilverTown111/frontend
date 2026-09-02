# AGENTS.md

## 1. Project Context

You are working on **귀 편한 금융**, a senior-friendly AI voice banking
service for the **2026 KB IT's Your Life Hackathon**.

Frontend goals:

- Provide voice-driven account inquiry and money-transfer flows.
- Deliver a simple, senior-friendly conversational experience.
- Support recipient discovery using contacts and transaction history.
- Present transfer details clearly and require confirmation before execution.
- Explain suspicious-transfer warnings and additional confirmation steps.
- Show utility-bill and financial-schedule reminders.
- Provide mobile-branch and visiting-branch information.
- Integrate safely with the existing backend API.

Prioritize a small, complete, demonstrable MVP over speculative abstractions or
architectural perfection.

## 2. Frontend Stack

Use the existing frontend stack and project configuration:

- Vue 3
- Vite
- JavaScript unless the repository is intentionally migrated to TypeScript
- Vue Router
- Pinia for shared application state
- Axios for HTTP communication
- Capacitor for native mobile capabilities
- ESLint and Prettier

Axios and Capacitor are approved project choices even if their dependencies have
not yet been installed. Add only the packages required by the task and keep them
compatible with the existing Vue and Vite versions.

## 3. Source of Truth

Before implementing a feature, inspect the repository and follow this priority:

1. User instructions for the current task
2. Existing working frontend code and project structure
3. The active API specification
4. Existing backend request and response contracts
5. This `AGENTS.md`

Do not guess route names, endpoint paths, request fields, response fields, or
native capabilities when they can be verified. If documentation conflicts with
working code, report the conflict before making a breaking change.

## 4. Vue Structure and State

- Follow the existing Vue composition and file organization.
- Keep page-level orchestration in views and reusable UI in components when the
  project structure supports that distinction.
- Keep component-only state local.
- Use Pinia for state shared across routes or unrelated components, such as the
  authenticated user, transfer flow, conversation state, and reusable account
  data.
- Keep stores focused on state and state transitions. Put HTTP details in the
  project's API/service layer when one exists.
- Avoid duplicating server data across multiple stores without a concrete need.
- Do not introduce a new architectural layer unless it solves an existing need.

## 5. API Integration

- Use Axios for backend HTTP requests.
- Prefer a shared Axios instance for the base URL, timeouts, common headers, and
  authentication handling.
- Keep endpoint-specific calls out of presentational components.
- Preserve existing endpoint paths, HTTP methods, and request/response shapes.
- Reuse an existing endpoint when it already represents the required behavior.
- Handle loading, empty, success, and error states explicitly in the UI.
- Convert transport or provider errors into concise user-facing messages.
- Do not expose raw provider payloads unless the active API contract requires it.
- Do not add automatic retries to financial execution requests unless the API
  guarantees idempotency.

When an API contract must change, coordinate the frontend and backend impact and
update the active API documentation when available.

## 6. Capacitor and Native Capabilities

- Use Capacitor only for capabilities that require native device access.
- The mobile client owns native permission requests and device-level access.
- Request permissions at the moment they are needed and explain their purpose.
- Handle denied, unavailable, and revoked permissions gracefully.
- Keep browser-compatible behavior or a clear fallback where practical.
- Use Capacitor-provided contacts only for recipient discovery and transmit only
  the minimum contact information required for matching.
- Do not assume access to SMS contents, call contents, or unrelated device data.
- Keep device-level audio interaction in the frontend unless existing code or the
  active API contract explicitly assigns it elsewhere.

## 7. Senior-Friendly UX and Accessibility

- Use large, readable text and touch targets.
- Maintain strong contrast and clear visual hierarchy.
- Prefer plain Korean labels and short instructions.
- Keep important actions visible and minimize the number of choices per step.
- Do not rely on color alone to communicate status or risk.
- Provide clear listening, processing, speaking, success, and failure states for
  voice interactions.
- Make essential flows usable without voice when practical.
- Preserve keyboard focus, semantic controls, and accessible labels.
- Avoid unexpected navigation, destructive gestures, and time-limited decisions.

## 8. Voice Transfer Safety

- Treat recipient, account, bank, amount, risk result, and final approval as
  safety-sensitive information when available.
- Never execute a transfer directly from raw STT output.
- Collect missing information one item at a time.
- Preserve confirmed values across dialogue steps.
- Require explicit reconfirmation when speech recognition or an amount is
  ambiguous.
- Present a final read-back in large text and support TTS before execution.
- Do not infer final approval from an earlier or unrelated dialogue step.
- When multiple recipients match, show enough information for the user to choose
  instead of selecting one silently.
- Show risk factors and the required next action without claiming that a high
  score definitively proves fraud.

## 9. Validation, Security, and Privacy

- Validate required fields, positive transfer amounts, identifiers, and allowed
  status values at the UI boundary.
- Treat frontend validation as usability support, not as the only protection for
  financial operations.
- Never hardcode credentials, tokens, API secrets, or environment-specific URLs.
- Never log authentication tokens, passwords, full account numbers, full contact
  lists, or sensitive voice transcripts.
- Mask sensitive financial values when they must be displayed or logged.
- Keep authentication handling consistent with the existing application flow.
- Clear sensitive transient state when a transfer flow is cancelled or completed.

## 10. Change Strategy

- Inspect related files before editing.
- Reuse existing patterns and components.
- Modify the minimum number of files necessary.
- Keep changes scoped to the requested feature.
- Preserve frontend-backend compatibility.
- Avoid broad refactors, speculative abstractions, and unnecessary dependencies.
- Do not rewrite unrelated files or rename components only for style.
- Include screenshots in a Pull Request when visible UI changes are involved.

## 11. Formatting and Verification

Use the existing npm scripts and configuration. For implementation work, run the
strongest relevant checks available:

```text
npm run lint
npm run format:check
npm run build
```

Do not claim a check passed unless it was actually run successfully. Do not add a
new formatter, linter, test framework, or Git hook solely to satisfy a task.

## 12. Completion Checklist

Before considering a frontend feature complete, verify as applicable:

- The UI follows the active API contract.
- Loading, empty, success, and error states are handled.
- Shared state is placed appropriately in Pinia.
- Axios calls use the project's shared API conventions.
- Capacitor permissions and unavailable-device states are handled.
- Voice and financial actions require explicit confirmation.
- Senior-friendly readability and accessibility are preserved.
- Sensitive values are not exposed or logged.
- Modified files are formatted.
- Relevant lint and build checks were run.

## 13. Response Style for Coding Tasks

Respond concisely with:

1. What changed
2. Important implementation decisions
3. Files changed
4. Dependency or configuration changes, when applicable
5. Verification performed
6. Remaining blockers or API decisions, when applicable
