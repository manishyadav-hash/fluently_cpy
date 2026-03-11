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
