# Fluently API Implementation History

## Overview

This document records the end-to-end implementation work completed in this chat for the Fluently API contract. It is an engineer-facing handoff record, not a replacement for `api-contract.md`.

The implementation followed these operating constraints:

- Contract-first against `api-contract.md`.
- Phase-by-phase delivery.
- TDD for each endpoint and major behavior.
- Thin controllers, business logic in services, DB access in repositories, explicit serializer control over public DTOs.
- External API shape in `snake_case`, internal code in `camelCase`.
- Standardized success and error envelopes.

This record is based on two sources:

- The phase-by-phase implementation notes captured during the chat.
- The final repo state, route definitions, migrations, tests, and release notes currently present in the codebase.

## Baseline Before Implementation

Before the phased work started, the repo had only partial coverage of auth, users, and onboarding, while the Prisma schema already contained most of the domain models needed for auth, onboarding, lessons, subscriptions, chat, and settings.

The initial repo realities that shaped the work were:

- The app mounted routes under `/api`, while the contract required `/v1`.
- The implementation did not yet standardize response envelopes to include `meta.timestamp`.
- Auth was incomplete and based on a legacy phone-signed JWT flow.
- The test harness was unstable in the sandbox because `supertest` tried to bind a port.
- Serializer and error-code discipline was incomplete.

The initial gap analysis grouped work into:

- Phase 0 foundation hardening
- Phase 1 authentication
- Phase 2 user profile and onboarding
- Phase 3 subscriptions
- Phase 4 learning
- Phase 5 chat
- Phase 6 settings and static content
- Phase 7 hardening and final audit
- Post-contract cleanup

## Final Public API Surface

The final implemented API surface is mounted under `/v1`, with `/api` retained as a rollout compatibility alias.

### Auth

- `POST /v1/auth/otp/send`
- `POST /v1/auth/otp/verify`
- `POST /v1/auth/otp/resend`
- `POST /v1/auth/token/refresh`
- `POST /v1/auth/logout`

### User and onboarding

- `GET /v1/users/me`
- `PATCH /v1/users/me`
- `POST /v1/users/me/avatar`
- `DELETE /v1/users/me/avatar`
- `DELETE /v1/users/me`
- `GET /v1/users/me/personalized-plan`
- `POST /v1/onboarding/questionnaire`

### Subscriptions

- `GET /v1/subscriptions/plans`
- `POST /v1/subscriptions/trial`
- `POST /v1/subscriptions`
- `GET /v1/subscriptions/me`
- `POST /v1/subscriptions/me/cancel`
- `GET /v1/subscriptions/me/invoice`

### Learning

- `GET /v1/users/me/dashboard`
- `GET /v1/modules`
- `GET /v1/lessons/:lesson_id`
- `POST /v1/lessons/:lesson_id/audio`
- `POST /v1/lessons/:lesson_id/complete`
- `GET /v1/users/me/stats`

### Chat

- `GET /v1/chat/suggestions`
- `POST /v1/chat/conversations`
- `GET /v1/chat/conversations/:conversation_id/messages`
- `POST /v1/chat/conversations/:conversation_id/messages`
- `POST /v1/chat/conversations/:conversation_id/stream`

### Settings and content

- `GET /v1/settings`
- `PATCH /v1/settings`
- `GET /v1/content/privacy-policy`
- `GET /v1/content/terms-and-conditions`
- `GET /v1/content/refund-policy`
- `GET /v1/content/help-support`

### Operational endpoint

- `GET /v1/health`

## Cross-Cutting Architecture Added During the Work

The implementation introduced a consistent backend shape across the API:

- Canonical route mounting under `/v1` with `/api` retained as a compatibility alias.
- Standard response helpers for success, error, and paginated responses, all including `meta.timestamp`.
- Centralized UPPER_SNAKE_CASE error codes in `src/errors/error-codes.ts`.
- Explicit serializers for public DTOs so raw Prisma models are not leaked directly.
- Session-backed access and refresh token support, while preserving temporary legacy-token compatibility in auth middleware.
- A reusable in-process test client based on `light-my-request`, replacing socket-binding test flows.
- Shared validation helpers for request bodies, uploads, and pagination.
- Placeholder integration interfaces for OTP delivery, billing, chat tutor replies, lesson feedback, and avatar storage.

## Phase Record

## Phase 0: Foundation Hardening

### Goal

Stabilize the testing baseline, fix route versioning, standardize envelopes and errors, introduce serializers, and lay token/session groundwork for contract-compliant auth.

### Findings

- `supertest` was failing in the sandbox because it attempted to bind a port.
- The test script was not reliably covering all test files.
- The app only mounted `/api`.
- Success and error responses were missing contract `meta.timestamp`.
- Existing auth middleware only understood the legacy phone-signed JWT shape.

### Tests added first

- `src/test/support/test-client.test.ts`
- `src/app.test.ts`
- `src/utils/response.test.ts`
- `src/services/token.service.test.ts`
- Reworked `src/middleware/validate.test.ts` to use the in-process test harness

### Implementation changes

- Added an in-process request test client using `light-my-request`.
- Fixed the `npm test` script to discover all test files.
- Standardized success/error envelopes and added paginated response helpers.
- Introduced centralized error code definitions and richer `AppError` support.
- Added serializer-based response shaping.
- Mounted the application router under `/v1` and kept `/api` as a compatibility alias.
- Switched `/health` to the shared success envelope.
- Added session-backed token utilities and auth-middleware support for both new session tokens and legacy tokens.

### Commands run

- `npm test`
- `npm install --save-dev light-my-request`
- `npm test`
- `npm run build`

### Results

- `npm test`: 11 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- `/v1` became canonical and `/api` remained temporarily supported.
- Session-backed token utilities were added, but full contract auth behavior was deferred to Phase 1.

## Phase 1: Authentication

### Goal

Implement the full contract auth surface: OTP send, verify, resend, refresh, and logout.

### Findings

- Existing auth only covered `send` and `verify`.
- Verify used `code` instead of contract `otp`.
- The flow returned a single legacy JWT rather than access/refresh tokens.
- Resend, refresh, logout, and revocation were missing.
- Attempt tracking required persisted state.

### Tests added first

- `src/routes/auth.routes.test.ts`
- `src/services/auth.service.test.ts`
- Updated validation coverage for `otp` in `src/middleware/validate.test.ts`

### Implementation changes

- Added a full `AuthService` for OTP send, resend, verify, refresh rotation, and logout revocation.
- Reworked auth controllers and routes to match the contract.
- Added explicit auth serializers for token and user responses.
- Expanded repositories for OTP, user lookup/creation, and refresh-token sessions.
- Added contract-aligned auth validation for E.164 phone input and `otp`.
- Added `ConsoleOtpDeliveryService` as the SMS delivery seam.
- Added `Otp.attemptCount` through a schema migration.

### Commands run

- `npm test`
- `npm run db:generate`
- `npm run build`
- `npm test`

### Results

- `npm test`: 23 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- OTP thresholds were implemented as safe defaults because the contract described behaviors more clearly than exact numeric ceilings:
  - send window: 5 requests / 300 seconds
  - resend cooldown: 30 seconds
  - verify max attempts: 5
- Missing or malformed `refresh_token` validates as `400 INVALID_REFRESH_TOKEN`; invalid or revoked stored tokens return `401 INVALID_REFRESH_TOKEN`.
- SMS delivery remained placeholder-backed.
- Legacy bearer tokens remained temporarily accepted.

## Phase 2: User Profile and Onboarding

### Goal

Complete the user profile, avatar, account deletion, onboarding questionnaire, and personalized plan APIs.

### Findings

- The endpoints already existed in rough form, but route/controller wiring was singleton-bound.
- Questionnaire submission was not transactional.
- Avatar storage was hardwired to the local filesystem.

### Tests added first

- `src/routes/user.routes.test.ts`
- `src/routes/questionnaire.routes.test.ts`
- `src/services/user.service.test.ts`
- `src/services/questionnaire.service.test.ts`
- `src/test/support/multipart.ts`

### Implementation changes

- Refactored user and questionnaire routes/controllers into injectable factories for testability.
- Added an avatar storage abstraction and moved avatar handling behind a service contract.
- Updated questionnaire submission to run inside a transaction and mark the user as onboarded atomically.
- Expanded repository seams to support transactional onboarding and profile flows.
- Preserved contract upload validation using multipart middleware and explicit tests.

### Commands run

- `npm test`
- `npm run build`
- `npm test`
- `npm run build`

### Results

- `npm test`: 44 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- Default avatar storage remained local through `LocalAvatarStorageService`.
- Duplicate email conflicts on `PATCH /users/me` still surfaced as `EMAIL_CONFLICT`, which was identified as a contract gap to resolve later.
- No schema change was required in this phase.

## Phase 3: Subscriptions

### Goal

Implement plans, trial start, paid subscription creation, current subscription lookup, cancellation, and invoice retrieval.

### Findings

- Prisma schema support existed for subscriptions and plans, but no route/controller/service layer existed yet.
- Trial reuse needed durable history even if subscription state changed later.

### Tests added first

- `src/routes/subscription.routes.test.ts`
- `src/services/subscription.service.test.ts`

### Implementation changes

- Added subscription routes, controller, service, repository, serializer, and validation layers.
- Added a placeholder billing provider for payment and invoice URLs.
- Added reference-data behavior for plans and the fixed trial offer.
- Extended user persistence with `trialUsedAt`.
- Added the `trialUsedAt` schema migration and env/config defaults for billing URLs.

### Commands run

- `npm test`
- `npm run db:generate`
- `npm run build`
- `npm test`
- `npm run build`

### Results

- `npm test`: 63 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- Plans are seeded from server-side defaults if the DB has none.
- Invoice retrieval is placeholder-backed and derived for active paid subscriptions.
- Existing `trial`, `active`, and `pending` subscriptions are treated as checkout blockers for safety.

## Phase 4: Learning

### Goal

Implement dashboard, module listing, lesson detail, lesson audio upload, lesson completion, and user stats.

### Findings

- The learning domain already had schema support for modules, lessons, progress, audio submissions, and stats, but no contract-complete API surface.
- Lesson audio upload required multipart validation and a placeholder feedback path.
- Dashboard, module listing, lesson detail, and completion all needed shared progress and lock-state behavior.

### Tests added first

- `src/routes/learning.routes.test.ts`
- `src/services/learning.service.test.ts`

### Implementation changes

- Added the learning route/controller/service/repository stack.
- Implemented:
  - `GET /users/me/dashboard`
  - `GET /modules`
  - `GET /lessons/:lesson_id`
  - `POST /lessons/:lesson_id/audio`
  - `POST /lessons/:lesson_id/complete`
  - `GET /users/me/stats`
- Added seeded/default curriculum support for empty learning content.
- Added multipart audio upload handling, lesson feedback placeholder integration, and transactional progress/stat updates.

### Commands run

- This phase was reported in the chat as completed, but its per-phase command list and exact test totals were not captured in a formal phase report.
- Later full-suite runs in Phases 5, 6, 7, and the cleanup pass verified the learning routes and service tests as passing.

### Results

- Phase 4 endpoints were implemented and later remained green under the full test suite.

### Contract deviations or assumptions

- Lesson scoring remained placeholder-backed via `PlaceholderLessonFeedbackService`.
- Curriculum seeding/default content is server-side reference data.

## Phase 5: Chat

### Goal

Implement chat suggestions, get-or-create conversations, paginated messages, message creation, and streaming tutor responses.

### Findings

- Prisma supported conversations and messages, but the API surface, pagination helper, rate limiting, and SSE behavior were missing.
- The schema had no explicit active/archive conversation marker, so “active conversation” needed a practical heuristic.
- Streaming needed a provider seam rather than a real model integration.

### Tests added first

- `src/routes/chat.routes.test.ts`
- `src/services/chat.service.test.ts`

### Implementation changes

- Added chat routes, controller, service, repository, serializers, and validation.
- Added cursor pagination utilities and paginated response support.
- Added deterministic placeholder tutor behavior for both non-streaming and streaming chat.
- Added chat rate limiting and ownership checks.

### Commands run

- `npm test`
- `npm test`
- `npm run build`

### Results

- `npm test`: 107 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- The active conversation is modeled as the user’s latest conversation because the schema has no explicit active flag.
- Chat throttle defaults are `10` messages per `30` seconds.
- Tutor responses and stream chunks are placeholder-backed.

## Phase 6: Settings and Static Content

### Goal

Implement user settings and the legal/static content endpoints.

### Findings

- `UserSettings` existed in schema, but there was no API layer.
- Static content did not need DB backing; server-side reference content was the safest contract match.

### Tests added first

- `src/routes/settings.routes.test.ts`
- `src/services/settings.service.test.ts`
- `src/services/content.service.test.ts`

### Implementation changes

- Added settings routes, controller, service, repository, serializer, and validation.
- Added static content routes, controller, and service.
- Added default settings behavior for users without a stored row.

### Commands run

- `npm test`
- `npm test`
- `npm run build`

### Results

- `npm test`: 119 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- Supported languages were implemented as `en` and `hi`.
- Static content remained server-side reference data.
- `GET /v1/settings` returns defaults when no row exists; persistence occurs on update.
- Empty `PATCH /v1/settings` requests fail validation with `VALIDATION_ERROR`.

## Phase 7: Hardening and Final Audit

### Goal

Close cross-cutting hardening gaps around pagination validation, upload validation, rate-limit metadata, and final contract audit coverage.

### Findings

- Invalid chat cursors were only being rejected inside the chat service rather than at the route/controller boundary.
- Explicit hardening coverage was still needed for stream rate limits, upload size validation, and paginated success envelopes.

### Tests added first

- Expanded `src/routes/chat.routes.test.ts`
- Expanded `src/routes/learning.routes.test.ts`
- Expanded `src/utils/response.test.ts`

### Implementation changes

- Moved chat cursor validation to the route/controller boundary so malformed cursors fail as `400 VALIDATION_ERROR`.
- No additional schema change was required.

### Commands run

- `npm test`
- `npm test`
- `npm run build`

### Results

- `npm test`: 124 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- `/api` remained as a compatibility alias.
- Placeholder integrations remained in place.
- The duplicate-email contract gap remained open at this point.
- Active conversation continued to mean latest conversation.

## Post-Contract Cleanup

### Goal

Close the known duplicate-email contract gap, test representative `/api` alias behavior beyond `/health`, and add a release-readiness note for rollout.

### Findings

- `EMAIL_CONFLICT` existed as a hard-coded string in the user service rather than a centralized error code.
- `/api` alias coverage only proved `/health`, not representative auth, user, and content endpoints.
- Operational rollout assumptions around placeholders and migrations were not yet documented in-repo.

### Tests added first

- Added duplicate-email route coverage in `src/routes/user.routes.test.ts`
- Added `/api` alias coverage in:
  - `src/routes/auth.routes.test.ts`
  - `src/routes/user.routes.test.ts`
  - `src/routes/settings.routes.test.ts`
- Added duplicate-email service mapping coverage in `src/services/user.service.test.ts`

### Implementation changes

- Centralized `EMAIL_CONFLICT` in `src/errors/error-codes.ts`.
- Updated `UserService.updateProfile` to map Prisma duplicate-email failures to `ErrorCodes.EMAIL_CONFLICT`.
- Added an explicit comment in `src/app.ts` documenting `/v1` as canonical and `/api` as compatibility-only.
- Added `docs/release-readiness.md`.

### Commands run

- `npm test -- src/routes/user.routes.test.ts src/routes/auth.routes.test.ts src/routes/settings.routes.test.ts src/services/user.service.test.ts`
- `npm run build`
- `npm test`
- `npm run build`

### Results

- `npm test`: 129 passed, 0 failed
- `npm run build`: passed

### Contract deviations or assumptions

- `PATCH /v1/users/me` may now explicitly return `409 EMAIL_CONFLICT` as an approved contract extension until `api-contract.md` is updated.
- `/api` remains available during rollout, but `/v1` is the canonical path.

## Migrations Added During This Work

The work introduced two new Prisma migrations:

- `20260311143000_add_otp_attempt_count`
  - Added `Otp.attemptCount`
  - Supports `TOO_MANY_ATTEMPTS` for OTP verification
- `20260311183000_add_user_trial_used_at`
  - Added `User.trialUsedAt`
  - Supports durable `TRIAL_ALREADY_USED` behavior

The pre-existing `20260309120000_add_all_models` migration also became an important dependency because it already contained most of the domain schema required for the later phases.

## Test Coverage Added Over the Course of the Work

The final test inventory includes:

- App/router coverage
- Validation middleware coverage
- Route contract coverage for auth, users, onboarding, subscriptions, learning, chat, settings, and content
- Service-layer coverage for auth, users, onboarding, subscriptions, learning, chat, settings, content, and tokens
- Response helper coverage
- In-process test-harness coverage

The current test files are:

- `src/app.test.ts`
- `src/middleware/validate.test.ts`
- `src/routes/auth.routes.test.ts`
- `src/routes/chat.routes.test.ts`
- `src/routes/learning.routes.test.ts`
- `src/routes/questionnaire.routes.test.ts`
- `src/routes/settings.routes.test.ts`
- `src/routes/subscription.routes.test.ts`
- `src/routes/user.routes.test.ts`
- `src/services/auth.service.test.ts`
- `src/services/chat.service.test.ts`
- `src/services/content.service.test.ts`
- `src/services/learning.service.test.ts`
- `src/services/questionnaire.service.test.ts`
- `src/services/settings.service.test.ts`
- `src/services/subscription.service.test.ts`
- `src/services/token.service.test.ts`
- `src/services/user.service.test.ts`
- `src/test/support/test-client.test.ts`
- `src/utils/response.test.ts`

## Final State of Important Shared Behavior

### Routing and versioning

- Application router is mounted under `/v1`.
- `/api` remains mounted as a rollout alias.
- Route modules are organized by domain in `src/routes`.

### Envelopes and errors

- All standard responses use shared helpers from `src/utils/response.ts`.
- Success responses include `success`, `data`, and `meta.timestamp`.
- Paginated responses include `pagination` plus `meta.timestamp`.
- Error responses include `success: false`, `error`, and `meta.timestamp`.

### Authentication and sessions

- Access and refresh tokens are issued through `TokenService`.
- Refresh token rows back session revocation and rotation.
- Auth middleware validates session-backed access tokens.
- Legacy tokens are still temporarily accepted for compatibility.

### Upload handling

- Avatar upload validation supports JPEG and PNG with a 5 MB limit.
- Lesson audio upload validation supports contract-specific audio flows and size limits.

### Placeholder provider seams

The following production integrations are still placeholder-backed:

- `ConsoleOtpDeliveryService`
- `PlaceholderSubscriptionBillingService`
- `PlaceholderChatTutorService`
- `PlaceholderLessonFeedbackService`
- `LocalAvatarStorageService`

These are intentional seams rather than hidden TODOs; the replacement points are documented in `docs/release-readiness.md`.

## Approved Deviations and Assumptions

The work preserved contract behavior wherever possible and documented the remaining assumptions explicitly:

- `/v1` is canonical; `/api` remains temporarily supported for rollout.
- `PATCH /v1/users/me` may return `409 EMAIL_CONFLICT` as an approved contract extension.
- OTP thresholds use configured defaults because the contract behavior was more explicit than exact numeric limits.
- Chat rate limiting uses configured defaults.
- Active conversation is interpreted as the latest user conversation because the schema lacks an explicit active/archive state.
- Static content, suggestions, plans, and seeded/default learning content rely on server-side reference data where full external integrations do not yet exist.

## Remaining Production Work

The implementation is contract-complete for the current scope, but several production integrations remain to be swapped in later:

- Real SMS/OTP delivery provider
- Real billing and invoice provider
- Real tutor/LLM provider for chat
- Real lesson scoring provider
- Production-grade avatar storage/CDN

Operationally, deployment still requires:

- Applying the Prisma migrations
- Regenerating the Prisma client when needed
- Supplying the required env vars in production

## Verification Snapshot

The latest full verification captured during this chat was:

- `npm test`: 129 passed, 0 failed
- `npm run build`: passed

This verification included the post-contract cleanup changes and therefore reflects the final state documented here.
