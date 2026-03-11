# Fluently API — Defect Ledger

| ID | Severity | Phase | Description | Root Cause | Fix | Tests | Status |
|----|----------|-------|-------------|------------|-----|-------|--------|
| QA-001 | Low | P1 | Zero serializer tests — no validation that camelCase→snake_case conversion works | Test gap | Added 24 serializer unit tests in serializers.test.ts | 24 added | Fixed |
| QA-002 | Low | P1 | /api alias untested for chat, learning, subscriptions, onboarding | Test gap | Added /api alias tests to 4 route test files | 4 added | Fixed |
| QA-003 | Info | P1 | Chat custom validateChatMessageContent uses manual error construction instead of standard validate() | Design choice, not a bug — produces same envelope structure | Documented | N/A | Accepted |
| QA-004 | Info | P1 | Zod schemas don't use .strict() — unknown fields silently stripped | By design — Zod's default safeParse strips unknown fields which is safe | Documented | N/A | Accepted |
| QA-005 | Info | P1 | learning.validation.ts uses z.coerce.number() | Necessary for multipart form data where fields arrive as strings | Documented | N/A | Accepted |
| QA-006 | High | P2 | Legacy auth fallback allows new-format tokens to bypass session revocation | resolveAuthentication catch block fell through to legacy phone-based auth for any non-AppError | Added typ claim check — tokens with typ are rejected in legacy path | 2 added | Fixed |
| QA-007 | Medium | P2 | Legacy auth fallback used hardcoded env.JWT_SECRET instead of injected secret | Inconsistency between session path (uses tokenService with injected secret) and legacy path | Made jwtSecret injectable via AuthenticateDependencies | 1 added (legacy token test) | Fixed |
| QA-008 | Low | P2 | Zero auth middleware unit tests — only tested indirectly via route tests | Test gap | Added 9 auth middleware tests covering valid sessions, revoked sessions, expired tokens, deleted users, malformed tokens, legacy tokens, and session revocation bypass prevention | 9 added | Fixed |
| QA-009 | Low | P3 | Redundant user fetch in subscription createSubscription | `requireUser` fetches user at line 230, then `findById` re-fetches at line 252 to get `trialUsedAt` | Capture user from `requireUser` and use `user.trialUsedAt` directly | 0 (existing tests cover path) | Fixed |
| QA-010 | Medium | P3 | Chat stream complete/fail callbacks have no error handling | `complete()` and `fail()` operate outside transaction; DB failures are silent and leave empty tutor messages | Added try/catch with `console.error` logging; `complete()` re-throws, `fail()` swallows | 2 added | Fixed |
| QA-011 | Info | P3 | Subscription cancel rejects trial subscriptions | `cancelCurrentSubscription` only allows status==="active" | By design per API contract: "No active subscription to cancel" (404) | 1 added (behavior test) | Accepted |
| QA-012 | Info | P3 | Learning completeLesson mutates currentProgress in-place | Lines 380-382 mutate local object after DB write to build response | Safe — object is local to transaction callback, not shared state | 0 | Accepted |
| QA-013 | Low | P3 | Subscription cancel already-cancelled path untested | No test verifying ALREADY_CANCELLED 409 for subscriptions with cancelAtPeriodEnd=true | Added test | 1 added | Fixed |
| QA-014 | High | P5 | CORS allows all origins (`cors()` with no restriction) | No origin configuration | Added `CORS_ALLOWED_ORIGINS` env var with configurable origin list; production requires explicit origins | 0 (config change) | Fixed |
| QA-015 | Medium | P5 | No JSON body size limit on `express.json()` | Missing `limit` option | Added `express.json({ limit: "100kb" })` | 0 (not testable via light-my-request) | Fixed |
| QA-016 | Medium | P5 | JWT_SECRET has no minimum length validation for production | Weak secrets could be used in production | Added runtime check: JWT_SECRET must be ≥32 chars in production | 0 (env startup check) | Fixed |
| QA-017 | Info | P5 | `express-rate-limit` in package.json but never wired up | Dependency installed but unused at middleware level | Documented in risk register — available for future global rate limiting | N/A | Accepted |
| QA-018 | Info | P5 | CSP disabled via `helmet({ contentSecurityPolicy: false })` | API serves static files from public/ | Acceptable for API — CSP is browser-facing; static file serving should be behind CDN in production | N/A | Accepted |
