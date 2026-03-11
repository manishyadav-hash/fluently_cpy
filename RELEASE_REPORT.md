# Fluently API — QA Audit Release Report

**Date:** 2026-03-11
**Auditor:** Claude Opus 4.6 (automated QA)
**Baseline:** 129 tests, 0 failures, clean build
**Final:** 166 tests, 0 failures, clean build

---

## Release Verdict: READY WITH CONDITIONS

The Fluently API is architecturally sound, well-tested, and ready for staging deployment. Production deployment requires replacing placeholder services (see Conditions below).

---

## Executive Summary

### What Was Audited
- 33 API endpoints across 8 domains (auth, user, onboarding, subscriptions, learning, chat, settings, content)
- Authentication and session management (JWT + legacy fallback)
- Validation layer (Zod schemas + custom validators)
- Serialization layer (camelCase → snake_case)
- Data integrity and transaction correctness
- Security configuration (CORS, body limits, secret management)
- Error handling and response envelope consistency

### Key Metrics

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Tests | 129 | 166 | +37 |
| Test suites | 20 | 27 | +7 |
| Findings | 0 | 18 | — |
| Fixed | — | 11 | — |
| Accepted (by design) | — | 7 | — |
| Build status | Clean | Clean | — |

### Biggest Fixes
1. **QA-006 (High):** Legacy auth fallback allowed new-format tokens to bypass session revocation. Fixed by checking `typ` claim — tokens with `typ` are rejected on the legacy path.
2. **QA-014 (High):** CORS was open to all origins. Fixed with env-configurable `CORS_ALLOWED_ORIGINS` and production-mode enforcement.
3. **QA-010 (Medium):** Chat stream `complete()`/`fail()` had no error handling, risking silent data loss. Fixed with try/catch + logging.
4. **QA-015/016 (Medium):** No JSON body size limit and no JWT secret strength validation. Both hardened.

### Biggest Remaining Risks
1. **R1:** Placeholder OTP delivery logs codes to console — must be replaced before production.
2. **R2:** Placeholder billing returns static URLs — no real payment flow.
3. **R6:** In-memory chat rate limiting — not multi-instance safe.
4. **R12:** Multer stores 25MB audio files in RAM — memory pressure risk.

---

## Conditions for Production

### Must-Fix Before Production
1. Replace `PlaceholderOTPDeliveryService` with real SMS provider (R1)
2. Replace `PlaceholderSubscriptionBillingService` with real payment processor (R2)
3. Set `CORS_ALLOWED_ORIGINS` to explicit domain list (enforced by startup check)
4. Set `JWT_SECRET` to ≥32 character cryptographic secret (enforced by startup check)
5. Set `DATABASE_URL` to production PostgreSQL instance

### Should-Fix Before Scale
1. Replace in-memory chat rate limiting with Redis (R6)
2. Replace local avatar storage with cloud storage (R5)
3. Add structured request logging (R7)
4. Configure Prisma connection pooling (R8)
5. Switch Multer to disk/streaming storage (R12)
6. Wire up or remove `express-rate-limit` global middleware (R11)

---

## Phase Summary

### Phase 0 — Baseline & Audit Map
Established baseline: 129 tests, clean build. Created QA_AUDIT.md, DEFECT_LEDGER.md, RISK_REGISTER.md.

### Phase 1 — Contract + Validation Integrity
- Verified all 33 endpoints match API contract (methods, paths, auth guards, response shapes)
- Added 24 serializer unit tests (QA-001) — zero existed previously
- Added /api alias tests for 4 domains (QA-002)
- Documented 3 design decisions as accepted (QA-003, QA-004, QA-005)

### Phase 2 — Auth, Session & Authorization
- **Critical fix:** Legacy auth fallback bypass (QA-006) — new-format tokens could fall through to phone-based legacy auth, bypassing session revocation. Fixed with `typ` claim check.
- Fixed hardcoded JWT secret in legacy path (QA-007) — made injectable for testability
- Added 9 auth middleware unit tests (QA-008) — covered valid sessions, revoked sessions, expired tokens, deleted users, malformed tokens, legacy tokens, and bypass prevention

### Phase 3-4 — Data Integrity + Domain Paths
- Removed redundant user fetch in subscription creation (QA-009)
- Added error handling to chat stream callbacks (QA-010) — `complete()` re-throws, `fail()` swallows
- Documented trial cancellation as by-design (QA-011)
- Confirmed learning mutation is safe (QA-012 — local to transaction)
- Added test for subscription already-cancelled path (QA-013)

### Phase 5 — Security Hardening
- CORS restricted to env-configurable origins with production enforcement (QA-014)
- JSON body size limit set to 100kb (QA-015)
- JWT_SECRET minimum length enforced in production (QA-016)
- Documented unused `express-rate-limit` and disabled CSP (QA-017, QA-018)

### Phase 6 — Final Report
This document. Full test suite re-verified: 166 pass, 0 fail, clean build.

---

## Coverage Gap Report

### Not Testable via Current Infrastructure
- JSON body size limit (light-my-request bypasses content-length enforcement)
- SSE streaming end-to-end (requires real HTTP connection)
- Multer file upload rejection at 25MB boundary
- Production env startup checks (JWT_SECRET length, CORS wildcard)

### Not Tested (Out of Scope)
- Real OTP delivery (placeholder)
- Real billing/payment flow (placeholder)
- Real LLM chat responses (placeholder)
- Real speech analysis scoring (placeholder)
- Database integration tests (all tests use mock repositories)
- Load/performance testing
- Multi-instance deployment scenarios

---

## Test Suite Breakdown

| Suite | Tests | Notes |
|-------|-------|-------|
| Serializers | 24 | All 6 serializer files covered |
| Auth middleware | 9 | Session, legacy, edge cases |
| Auth routes | 7 | Send/verify/resend OTP, refresh, logout |
| Auth service | 10 | OTP flow, rate limits, session management |
| Chat routes | 7 | Suggestions, conversations, messages, streaming, alias |
| Chat service | 9 | CRUD, rate limiting, streaming, error handling |
| Learning routes | 8 | Modules, lessons, progress, dashboard, alias |
| Learning service | 12 | Streaks, completion, unlock, stats |
| Subscription routes | 7 | Plans, trial, checkout, current, cancel, invoice, alias |
| Subscription service | 9 | Trial, plans, cancel, already-cancelled, invoice |
| Settings routes | 6 | Get/update settings, content, help, alias |
| Settings service | 4 | Defaults, partial update, time format |
| Content service | 2 | Category listing |
| Questionnaire routes | 5 | Submit, validate, auth, conflict, alias |
| Questionnaire service | 1 | Submission |
| User routes | 6 | Profile, update, avatar, delete |
| User service | 4 | Avatar upload/delete, soft delete, email conflict |
| Token service | 1 | Issue and verify |
| Validation middleware | 8 | Success, errors, configs |
| Response helpers | 3 | Success, error, pagination envelopes |
| Cursor pagination | 3 | Encode, decode, invalid input |
| App routing | 2 | /v1 and /api mounts |
| Test client | 1 | In-process HTTP |
| **Total** | **166** | |
