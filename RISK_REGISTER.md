# Fluently API — Risk Register

## Known Risks (Not Fixable in This Audit)

| ID | Risk | Severity | Mitigation | Notes |
|----|------|----------|------------|-------|
| R1 | Placeholder OTP delivery logs codes to console | High | Replace with real SMS provider before production | Security risk if console logs are accessible |
| R2 | Placeholder billing returns static URLs | Medium | Replace with real payment processor | No real payment flow |
| R3 | Placeholder chat tutor returns static responses | Low | Replace with real LLM integration | Functional but not useful |
| R4 | Placeholder lesson feedback returns static scores | Low | Replace with real speech analysis | Functional but not useful |
| R5 | Local avatar storage writes to filesystem | Medium | Replace with cloud storage (S3/GCS) | Not suitable for multi-instance deployment |
| R6 | In-memory rate limiting (chat) | Medium | Replace with Redis-backed rate limiting | Not suitable for multi-instance deployment |
| R7 | No request logging/tracing | Medium | Add structured logging (pino/winston) | Essential for production debugging |
| R8 | No database connection pooling configuration | Low | Configure Prisma connection pool for production | Default pool may be insufficient under load |
| R9 | Trial subscriptions cannot be cancelled via API | Low | Design decision per API contract — users on trial must wait for expiry | Consider adding trial cancellation if users request it |
| R10 | Chat stream tutor message may persist as empty string on complete() failure | Medium | Error handling added (QA-010) — failures now logged and re-thrown to caller | SSE controller should relay error to client |
| R11 | `express-rate-limit` dependency installed but not wired as middleware | Low | Wire up as global rate limiter before production, or remove from package.json | Available but unused |
| R12 | Multer stores 25MB audio files in RAM (memory storage) | Medium | Switch to disk or streaming storage for production | Memory pressure under concurrent uploads |
| R13 | Body size limit (100kb) not testable via light-my-request | Low | Verify manually or with integration tests using real HTTP | In-process test client bypasses content-length enforcement |
