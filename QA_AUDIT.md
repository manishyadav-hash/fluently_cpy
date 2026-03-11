# Fluently API — QA Audit Map

## Baseline

- **Date:** 2026-03-11
- **Tests:** 129 passing, 0 failing (20 suites)
- **Build:** Clean (tsc)
- **Branch base:** `staging` @ 7de4e27

---

## Endpoint Inventory (33 routes)

### Auth (`/auth`) — no auth required on send/verify/resend/refresh

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| POST | /otp/send | no | yes | no | yes | yes |
| POST | /otp/verify | no | yes | no | yes | no |
| POST | /otp/resend | no | yes | no | yes | no |
| POST | /token/refresh | no | yes | no | yes | no |
| POST | /logout | yes | no | no | yes | no |

### Chat (`/chat`)

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| GET | /suggestions | yes | no | no | yes | no |
| POST | /conversations | yes | no | no | yes | no |
| GET | /conversations/:id/messages | yes | yes | no | yes | no |
| POST | /conversations/:id/messages | yes | yes | no | yes | no |
| POST | /conversations/:id/stream | yes | yes | no | yes | no |

### Learning (no mount prefix — routes at root)

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| GET | /users/me/dashboard | yes | no | no | yes | no |
| GET | /modules | yes | yes | no | yes | no |
| GET | /lessons/:id | yes | no | no | yes | no |
| POST | /lessons/:id/audio | yes | yes | yes | yes | no |
| POST | /lessons/:id/complete | yes | no | no | yes | no |
| GET | /users/me/stats | yes | no | no | yes | no |

### Subscriptions (`/subscriptions`)

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| GET | /plans | yes | no | no | yes | no |
| POST | /trial | yes | no | no | yes | no |
| POST | / | yes | yes | no | yes | no |
| GET | /me | yes | no | no | yes | no |
| POST | /me/cancel | yes | no | no | yes | no |
| GET | /me/invoice | yes | no | no | yes | no |

### Users (`/users`)

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| GET | /me | yes | no | no | yes | yes |
| PATCH | /me | yes | yes | no | yes | no |
| DELETE | /me | yes | no | no | yes | no |
| POST | /me/avatar | yes | no | yes | yes | no |
| DELETE | /me/avatar | yes | no | no | yes | no |
| GET | /me/personalized-plan | yes | no | no | yes | no |

### Onboarding (`/onboarding`)

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| POST | /questionnaire | yes | yes | no | yes | no |

### Settings (`/settings`)

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| GET | / | yes | no | no | yes | yes |
| PATCH | / | yes | yes | no | yes | no |

### Content (`/content`) — no auth required

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| GET | /privacy-policy | no | no | no | yes | yes |
| GET | /terms-and-conditions | no | no | no | yes | no |
| GET | /refund-policy | no | no | no | yes | no |
| GET | /help-support | no | no | no | yes | no |

### Health

| Method | Path | Auth | Validate | Upload | Test | /api alias test |
|--------|------|------|----------|--------|------|-----------------|
| GET | /health | no | no | no | no | no |

---

## Critical Code Paths

### Auth-protected write paths (highest risk)
- POST /auth/otp/send — creates OTP records
- POST /auth/otp/verify — creates/finds user + creates session
- POST /auth/token/refresh — rotates refresh token
- POST /auth/logout — revokes session
- PATCH /users/me — updates profile
- POST /users/me/avatar — uploads file
- DELETE /users/me — soft deletes account
- POST /onboarding/questionnaire — creates answers + marks onboarded
- POST /subscriptions/trial — creates trial subscription
- POST /subscriptions — creates paid subscription
- POST /subscriptions/me/cancel — cancels subscription
- POST /lessons/:id/audio — uploads audio + creates submission
- POST /lessons/:id/complete — completes lesson + unlocks next
- POST /chat/conversations — creates conversation
- POST /chat/conversations/:id/messages — creates user + tutor messages
- POST /chat/conversations/:id/stream — creates messages + streams

### Transaction-sensitive paths
- `AuthService.verifyOtp` — user creation + session creation
- `AuthService.refreshToken` — old session revocation + new session creation
- `SubscriptionService.startTrial` — subscription creation + user trial update
- `SubscriptionService.createSubscription` — subscription creation + user status update
- `LearningService.completeLesson` — progress update + unlock + stats update
- `ChatService.sendMessage` — user message + tutor message + conversation update
- `ChatService.startMessageStream` — message creation in tx, completion outside tx

### Placeholder-backed flows (production risk seams)
- OTP delivery → `PlaceholderOtpDeliveryService` (logs code to console)
- Billing → `PlaceholderSubscriptionBillingService` (returns static URLs)
- Chat tutor → `PlaceholderChatTutorService` (returns static responses)
- Lesson feedback → `PlaceholderLessonFeedbackService` (returns static scores)
- Avatar storage → `LocalAvatarStorageService` (writes to local filesystem)

### Upload paths
- POST /users/me/avatar — JPEG/PNG/WebP, 5MB, memory storage
- POST /lessons/:id/audio — WAV/M4A/MP3, 25MB, memory storage

---

## Test Coverage Summary

| Domain | Route Tests | Service Tests | Serializer Tests | /api Alias Tests |
|--------|-------------|---------------|------------------|------------------|
| Auth | 7 | 6 | 0 | 1 |
| Chat | 14 | 8 | 0 | 0 |
| Learning | 15 | 6 | 0 | 0 |
| Subscriptions | 11 | 8 | 0 | 0 |
| Users | 13 | 4 | 0 | 1 |
| Onboarding | 4 | 3 | 0 | 0 |
| Settings | 5 | 2 | 0 | 1 |
| Content | 5 | 1 | 0 | 1 |
| Infrastructure | 5 (app, validate, response) | 1 (test-client) | - | 1 |
| **Total** | **79** | **39** | **0** | **5** |

### Notable Test Gaps
- Zero serializer tests across all domains
- Health endpoint untested
- /api alias coverage only for 4 domains (auth, user, settings, content)
- No repository/integration tests (all mocked)
- No concurrent request tests
- No adversarial/boundary tests for most validators
