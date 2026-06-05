# Fluently API Release Readiness

## Canonical base path

- `/v1` is the canonical API prefix.
- `/api` remains mounted as a temporary compatibility alias during client rollout.
- New clients and all contract verification should target `/v1`.

## Approved contract extension

- `PATCH /v1/users/me` may return `409 EMAIL_CONFLICT` when the requested email already belongs to another account.
- This is an explicit, approved extension until `api-contract.md` is updated to list the error code.
- The response shape still uses the standard contract error envelope:
  - `success: false`
  - `error.code: EMAIL_CONFLICT`
  - `error.message: Email already in use`
  - `meta.timestamp`

## Placeholder integrations still in use

- OTP delivery: `ConsoleOtpDeliveryService`
  - Current behavior: logs/generated placeholder delivery flow only.
  - Production replacement point: `OtpDeliveryServiceContract`.
- Billing and invoices: `PlaceholderSubscriptionBillingService`
  - Current behavior: deterministic checkout and invoice URLs.
  - Production replacement point: `SubscriptionBillingServiceContract`.
- Chat tutor replies: `PlaceholderChatTutorService`
  - Current behavior: deterministic chat replies and stream chunks.
  - Production replacement point: `ChatTutorServiceContract`.
- Lesson feedback: `PlaceholderLessonFeedbackService`
  - Current behavior: deterministic lesson feedback payloads.
  - Production replacement point: `LessonFeedbackServiceContract`.
- Avatar storage: `LocalAvatarStorageService`
  - Current behavior: app/local-path backed avatar storage.
  - Production replacement point: `AvatarStorageContract`.

## Environment baseline

- Required env vars are documented in `.env.example`.
- Current release-critical values:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `ACCESS_TOKEN_EXPIRES_IN_SECONDS`
  - `REFRESH_TOKEN_EXPIRES_IN_SECONDS`
  - `OTP_EXPIRY_SECONDS`
  - `OTP_RESEND_COOLDOWN_SECONDS`
  - `OTP_MAX_SEND_ATTEMPTS_PER_WINDOW`
  - `OTP_RATE_LIMIT_WINDOW_SECONDS`
  - `OTP_VERIFY_MAX_ATTEMPTS`
  - `CHAT_RATE_LIMIT_MAX_MESSAGES`
  - `CHAT_RATE_LIMIT_WINDOW_SECONDS`
  - `PAYMENTS_BASE_URL`
  - `CDN_BASE_URL`
  - `TRIAL_DURATION_DAYS`

## Database rollout

- Apply the existing Prisma migrations before starting the updated API:
  - `20260311143000_add_otp_attempt_count`
  - `20260311183000_add_user_trial_used_at`
- Regenerate Prisma client after dependency or schema changes:
  - `npm run db:generate`

## Verification commands

- `npm test`
- `npm run build`
