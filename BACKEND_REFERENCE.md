# Fluently API — Backend Reference Guide

> **Audience**: Backend engineers joining the Fluently project.
> **Purpose**: Single-source onboarding and architecture reference — understand the codebase, follow conventions, and ship safely.
>
> **How to use this document**
> - Read sections 1–5 on your first day to understand what the backend does and how it works.
> - Use sections 6–15 as a reference when working in a specific area.
> - Follow section 16 step-by-step the first time you add a feature.
> - Skim section 18 (Known Gaps) before touching any integration point.
>
> **Related documents**
> - `CLAUDE.md` — terse command reference and conventions for AI-assisted coding.
> - `api-contract.md` — full API specification for frontend consumers (1,900 lines).

---

## Table of Contents

1. [Purpose of the Backend](#1-purpose-of-the-backend)
2. [Tech Stack](#2-tech-stack)
3. [Quick Start](#3-quick-start)
4. [Repository Structure](#4-repository-structure)
5. [Request Lifecycle](#5-request-lifecycle)
6. [Routing](#6-routing)
7. [Validation](#7-validation)
8. [Authentication and Authorization](#8-authentication-and-authorization)
9. [Response Format](#9-response-format)
10. [Error Handling](#10-error-handling)
11. [Database Layer](#11-database-layer)
12. [Domain Models](#12-domain-models)
13. [Serialization](#13-serialization)
14. [Testing](#14-testing)
15. [Environment and Configuration](#15-environment-and-configuration)
16. [How to Add a New Feature](#16-how-to-add-a-new-feature)
17. [Conventions and Code Style](#17-conventions-and-code-style)
18. [Known Gaps and Placeholders](#18-known-gaps-and-placeholders)
19. [Quick Reference Card](#19-quick-reference-card)
20. [Useful File Index](#20-useful-file-index)

---

## 1. Purpose of the Backend

Fluently is a **language learning app** focused on English speaking proficiency, primarily targeting the Indian market. This backend powers the mobile app by providing:

- **Phone-based authentication** via OTP with JWT session management
- **AI tutor chat** with real-time SSE streaming
- **Structured learning curriculum** — modules, lessons, audio submissions, and progress tracking
- **Subscription and trial management** with payment gateway integration
- **User profile, settings, and onboarding questionnaire**
- **Gamification** — XP, streaks, ratings, and completion stats

The API is consumed by the Fluently mobile client. The canonical API path is `/v1`; a legacy `/api` mount exists during client rollout (both serve the same router).

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | — |
| Language | TypeScript | 5.8 |
| Framework | Express | 4.21 |
| ORM | Prisma | 6.5 |
| Database | PostgreSQL | (DigitalOcean hosted) |
| Validation | Zod | 3.24 |
| Auth | jsonwebtoken | 9.0 |
| File uploads | Multer | 2.1 (memory storage) |
| Security headers | Helmet | 8.0 |
| CORS | cors | 2.8 |
| Testing | Node.js native test runner + light-my-request | 6.6 |
| Dev runner | tsx (watch mode) | 4.19 |

**TypeScript config** (`tsconfig.json`): target ES2022, CommonJS modules, strict mode, path alias `@/*` → `./src/*`, output to `dist/`.

---

## 3. Quick Start

### Prerequisites

- Node.js (LTS recommended)
- PostgreSQL instance (local or remote)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET at minimum

# 3. Generate Prisma client
npm run db:generate

# 4. Run migrations
npm run db:migrate

# 5. Start dev server (hot reload)
npm run dev

# 6. Verify — health check
curl http://localhost:3000/v1/health
# → { "success": true, "data": { "status": "ok" }, "meta": { "timestamp": "..." } }

# 7. Run all tests
npm run test

# Run a single test file
node --import tsx --test src/path/to/file.test.ts
```

### All Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | TypeScript compilation to `dist/` |
| `npm start` | Run production build (`node dist/server.js`) |
| `npm run test` | Run all tests (Node.js native test runner) |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Run Prisma migrations (`prisma migrate dev`) |
| `npm run db:push` | Push schema to DB without migration files |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## 4. Repository Structure

```
fluently-api/
├── prisma/
│   ├── schema.prisma              # Database schema (14 models, 9 enums)
│   └── migrations/                # SQL migration files
├── public/                        # Static assets
├── src/
│   ├── app.ts                     # Express app setup (middleware stack)
│   ├── server.ts                  # Server bootstrap (listen)
│   ├── config/
│   │   └── env.ts                 # Zod-validated environment config
│   ├── controllers/               # Thin request→service→response layer
│   │   ├── auth.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── content.controller.ts
│   │   ├── learning.controller.ts
│   │   ├── questionnaire.controller.ts
│   │   ├── settings.controller.ts
│   │   ├── subscription.controller.ts
│   │   └── user.controller.ts
│   ├── errors/
│   │   ├── app-error.ts           # AppError class
│   │   └── error-codes.ts         # 35 error code constants
│   ├── middleware/
│   │   ├── auth.ts                # JWT + session verification
│   │   ├── error-handler.ts       # Global error handler (last middleware)
│   │   ├── upload.ts              # Multer file upload handlers
│   │   └── validate.ts            # Zod request body validation
│   ├── prisma/
│   │   └── client.ts              # PrismaClient singleton + DatabaseClient type
│   ├── repositories/              # Database queries via Prisma
│   │   ├── chat.repository.ts
│   │   ├── learning.repository.ts
│   │   ├── otp.repository.ts
│   │   ├── questionnaire.repository.ts
│   │   ├── refresh-token.repository.ts
│   │   ├── settings.repository.ts
│   │   ├── subscription.repository.ts
│   │   └── user.repository.ts
│   ├── routes/                    # Route definitions + middleware chains
│   │   ├── index.ts               # Main router composition
│   │   ├── auth.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── content.routes.ts
│   │   ├── learning.routes.ts
│   │   ├── questionnaire.routes.ts
│   │   ├── settings.routes.ts
│   │   ├── subscription.routes.ts
│   │   └── user.routes.ts
│   ├── serializers/               # camelCase → snake_case transformers
│   │   ├── auth.serializer.ts
│   │   ├── chat.serializer.ts
│   │   ├── learning.serializer.ts
│   │   ├── settings.serializer.ts
│   │   ├── subscription.serializer.ts
│   │   └── user.serializer.ts
│   ├── services/                  # Business logic (DI via port interfaces)
│   │   ├── auth.service.ts
│   │   ├── avatar-storage.service.ts
│   │   ├── chat.service.ts
│   │   ├── chat-tutor.service.ts
│   │   ├── learning.service.ts
│   │   ├── learning-content.ts
│   │   ├── lesson-feedback.service.ts
│   │   ├── otp.service.ts
│   │   ├── otp-delivery.service.ts
│   │   ├── questionnaire.service.ts
│   │   ├── settings.service.ts
│   │   ├── subscription.service.ts
│   │   ├── subscription-billing.service.ts
│   │   └── token.service.ts
│   ├── test/
│   │   └── support/
│   │       ├── test-client.ts     # HTTP test helper (light-my-request)
│   │       └── multipart.ts       # Multipart form-data test builder
│   ├── types/
│   │   ├── express.d.ts           # Express Request augmentation (auth, user)
│   │   └── index.ts
│   ├── utils/
│   │   ├── cursor-pagination.ts   # Cursor encode/decode
│   │   ├── index.ts
│   │   └── response.ts            # Response envelope helpers
│   └── validations/               # Zod schemas + ValidationConfig
│       ├── auth.validation.ts
│       ├── chat.validation.ts
│       ├── learning.validation.ts
│       ├── questionnaire.validation.ts
│       ├── settings.validation.ts
│       ├── subscription.validation.ts
│       └── user.validation.ts
├── CLAUDE.md                      # AI assistant guidance
├── api-contract.md                # Full API specification
├── package.json
├── tsconfig.json
└── .env.example                   # Environment variable template
```

**Test files** are co-located with source: `auth.service.test.ts` lives next to `auth.service.ts`. This applies to routes, services, middleware, serializers, and utils.

---

## 5. Request Lifecycle

### Overview

```
HTTP Request
  │
  ▼
app.ts middleware stack (helmet → cors → json parser)
  │
  ▼
Router (/v1 or /api)
  │
  ▼
Route handler (middleware chain)
  │
  ├─ validate(schema, config)    ← Zod body validation
  ├─ authenticate                ← JWT + session check (if protected)
  ├─ upload middleware           ← Multer (if file upload)
  │
  ▼
Controller
  │  extracts req.body, req.auth, req.params, req.query
  │  calls service method
  │  serializes result (camelCase → snake_case)
  │  calls sendSuccess(res, data) or sendPaginatedSuccess(...)
  │
  ▼
Service
  │  business logic, rate limiting, state transitions
  │  calls repository methods (possibly inside a transaction)
  │
  ▼
Repository
  │  Prisma queries with explicit field selection
  │  returns typed records
  │
  ▼
HTTP Response (envelope: { success, data, meta })
```

### Worked Example: `POST /v1/auth/otp/send`

1. **`src/app.ts`** — request enters Express, passes through helmet, CORS, and JSON parser middleware.

2. **`src/routes/index.ts`** — the main router delegates to `authRouter` at `/auth`.

3. **`src/routes/auth.routes.ts`** — the route matches `POST /otp/send` and applies:
   - `validate(sendOtpSchema, sendOtpValidation)` — validates `{ phone }` against E.164 regex
   - `authController.sendOtp` — the controller handler

4. **`src/controllers/auth.controller.ts`** — extracts `req.body.phone`, calls `authService.sendOtp(phone)`.

5. **`src/services/auth.service.ts`** — the `issueOtp()` method runs business logic:
   - Checks resend cooldown against latest OTP record
   - Counts send attempts within the rate limit window
   - Creates a new OTP record in the database
   - Delivers OTP via the delivery service
   - Returns `{ otpSent, phoneMasked, expiresInSeconds, resendCooldownSeconds }`

6. **Controller** serializes the result via `serializeSendOtpResponse()` (camelCase → snake_case), then calls `sendSuccess(res, data)`.

7. **`src/utils/response.ts`** — wraps the data in the standard envelope:
   ```json
   {
     "success": true,
     "data": {
       "otp_sent": true,
       "phone_masked": "+91XXXXXXX443",
       "expires_in_seconds": 300,
       "resend_cooldown_seconds": 30
     },
     "meta": { "timestamp": "2026-03-13T10:00:00.000Z" }
   }
   ```

8. **If an error occurs** — the service throws an `AppError`, the controller's `catch` calls `next(error)`, and the global `errorHandler` middleware formats the error response.

---

## 6. Routing

### Router Composition

All domain routers are composed in `src/routes/index.ts`:

```typescript
router.use("/auth", authRouter);
router.use("/chat", chatRouter);
router.use("/content", contentRouter);
router.use(learningRouter);           // mounted at root (multiple prefixes)
router.use("/settings", settingsRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/users", userRouter);
router.use("/onboarding", questionnaireRouter);

router.get("/health", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});
```

The main router is mounted twice in `src/app.ts`:
```typescript
app.use("/v1", router);   // canonical
app.use("/api", router);  // legacy — will be removed after client rollout
```

### Route Factory Pattern

Every domain uses a factory function that accepts optional dependencies for testing:

```typescript
// src/routes/auth.routes.ts
interface AuthRouterOptions {
  authenticateMiddleware?: RequestHandler;
  service?: AuthServiceContract;
}

export function createAuthRouter(options: AuthRouterOptions = {}) {
  const authRouter = Router();
  const authController = new AuthController(options.service);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;

  authRouter.post("/otp/send", validate(sendOtpSchema, sendOtpValidation), authController.sendOtp);
  authRouter.post("/logout", authenticateMiddleware, authController.logout);
  // ...
  return authRouter;
}

export const authRouter = createAuthRouter();
```

### Middleware Chain Order

Each route applies middleware in this order:
1. **`validate(schema, config)`** — request body validation (always first if present)
2. **`authenticate`** — JWT + session check (for protected endpoints)
3. **`uploadAvatar` / `uploadLessonAudio`** — Multer file handling (if file upload)
4. **Controller handler** — the actual endpoint logic

### All Route Groups

| Prefix | Router | Auth required? | Description |
|--------|--------|---------------|-------------|
| `/auth` | `authRouter` | Partial (logout only) | OTP send/verify/resend, token refresh, logout |
| `/chat` | `chatRouter` | Yes | Conversations, messages, SSE streaming, suggestions |
| `/content` | `contentRouter` | No | Static pages (privacy, terms, refund, help) |
| *(root)* | `learningRouter` | Yes | Dashboard, modules, lessons, audio, stats |
| `/settings` | `settingsRouter` | Yes | User preferences (language, reminders) |
| `/subscriptions` | `subscriptionRouter` | Yes | Plans, trial, subscription lifecycle, invoices |
| `/users` | `userRouter` | Yes | Profile CRUD, avatar upload/delete |
| `/onboarding` | `questionnaireRouter` | Yes | Onboarding questionnaire |

---

## 7. Validation

### How It Works

Each validated endpoint pairs a **Zod schema** with a **ValidationConfig**. Both are defined in `src/validations/<domain>.validation.ts`.

```typescript
// src/validations/auth.validation.ts
export const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Phone number format is invalid"),
});

export const sendOtpValidation = {
  fields: {
    phone: {
      code: ErrorCodes.INVALID_PHONE,
      message: "Phone number format is invalid",
    },
  },
} satisfies ValidationConfig;
```

The `validate()` middleware (`src/middleware/validate.ts`) runs `schema.safeParse(req.body)`. On failure:
1. Flattens the Zod error into `field_errors` and `form_errors`
2. Selects a primary error code by matching the first failing field against `config.fields`
3. Falls back to `config.form` for form-level errors, or `VALIDATION_ERROR` as default
4. Returns a 400 response

On success, `req.body` is replaced with the parsed (and potentially transformed) data.

### Validation Error Response Shape

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PHONE",
    "message": "Phone number format is invalid",
    "details": {
      "field_errors": { "phone": ["Phone number format is invalid"] },
      "form_errors": []
    }
  },
  "meta": { "timestamp": "..." }
}
```

### Adding a New Validation

1. Create the Zod schema in `src/validations/<domain>.validation.ts`
2. Create a matching `ValidationConfig` with field-to-error-code mappings
3. Apply to the route: `router.post("/path", validate(schema, config), controller.method)`

---

## 8. Authentication and Authorization

### OTP Flow

```
Client                          Server
  │                               │
  ├── POST /auth/otp/send ───────►│  Creates OTP, delivers via OTP delivery service
  │◄── { otp_sent, expires_in } ──┤
  │                               │
  ├── POST /auth/otp/verify ─────►│  Validates OTP, creates/finds user, issues tokens
  │◄── { access_token,           │
  │     refresh_token, user } ────┤
  │                               │
  ├── (authenticated requests) ──►│  Bearer token in Authorization header
  │                               │
  ├── POST /auth/token/refresh ──►│  Rotates session: revokes old, creates new
  │◄── { access_token,           │
  │     refresh_token } ──────────┤
  │                               │
  ├── POST /auth/logout ─────────►│  Revokes session
  │◄── { logged_out: true } ──────┤
```

### JWT Token Structure

Tokens are issued by `TokenService` in `src/services/token.service.ts`:

- **Access token**: `{ sub: userId, sid: sessionId, typ: "access" }` — short-lived (default 1 hour)
- **Refresh token**: `{ sub: userId, sid: sessionId, typ: "refresh" }` — long-lived (default 30 days)

### Session Management

Each login creates a `RefreshToken` record in the database. The auth middleware validates both the JWT signature **and** that an active (non-revoked, non-expired) session exists.

Token refresh performs **rotation**: the old session is revoked and a new one is created. This means a stolen refresh token can only be used once.

### Auth Middleware

The middleware at `src/middleware/auth.ts` follows a factory pattern (`createAuthenticate`) and:

1. Extracts the Bearer token from the `Authorization` header
2. Verifies the JWT signature
3. Looks up the session in the `RefreshToken` table
4. Checks that the user hasn't been soft-deleted (`user.deletedAt`)
5. Sets `req.auth` (`{ sessionId, userId }`) and `req.user` on the request

**Legacy token fallback**: Tokens without a `typ` claim (issued before the session system) fall through to a phone-based user lookup. New-format tokens that fail session lookup are rejected — they do not fall through.

### Express Request Augmentation

```typescript
// src/types/express.d.ts
declare global {
  namespace Express {
    interface RequestAuth {
      sessionId: string;
      userId: string;
    }
    interface Request {
      auth?: RequestAuth;
      user?: User;
    }
  }
}
```

### Rate Limiting on OTP

OTP rate limiting is enforced in the service layer (not via Express middleware):
- **Resend cooldown**: Cannot resend within `OTP_RESEND_COOLDOWN_SECONDS` (default 30s) of the last OTP
- **Window limit**: Max `OTP_MAX_SEND_ATTEMPTS_PER_WINDOW` (default 5) sends per `OTP_RATE_LIMIT_WINDOW_SECONDS` (default 300s)
- **Verify attempts**: Max `OTP_VERIFY_MAX_ATTEMPTS` (default 5) incorrect guesses per OTP

### Authorization

There is no role or permission system. All authenticated users have the same access level. Authorization is implicitly scoped by user ID — services only operate on the authenticated user's data.

---

## 9. Response Format

### Standard Envelope

All API responses follow the same envelope, enforced by helpers in `src/utils/response.ts`.

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-13T10:00:00.000Z"
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "OTP code is incorrect",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-03-13T10:00:00.000Z"
  }
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6I..."
  },
  "meta": {
    "timestamp": "2026-03-13T10:00:00.000Z"
  }
}
```

### Response Helpers

```typescript
sendSuccess(res, data, statusCode?)           // default 200
sendPaginatedSuccess(res, data, pagination)   // adds pagination object
sendError(res, statusCode, { code, message, details? }, headers?)
sendInternalError(res)                         // 500 with INTERNAL_ERROR
```

Always use these helpers — never call `res.json()` directly.

### Cursor Pagination

Paginated endpoints use cursor-based pagination via `src/utils/cursor-pagination.ts`. The cursor is a base64-encoded JSON payload containing `{ id, created_at }`. Clients treat it as opaque and pass it back as a query parameter.

---

## 10. Error Handling

### AppError Class

```typescript
// src/errors/app-error.ts
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: ErrorCode | string,
    public details?: unknown,
    public headers?: Record<string, string>,
  )
}
```

### Throwing Errors

Always throw `AppError` with a code from `ErrorCodes`:

```typescript
throw new AppError("OTP code is incorrect", 400, ErrorCodes.INVALID_OTP);

// With details and custom headers (e.g., rate limiting)
throw new AppError(
  "Too many OTP requests. Please try again in 30 seconds.",
  429,
  ErrorCodes.OTP_RATE_LIMITED,
  { retry_after: 30 },
  { "Retry-After": "30" },
);
```

### Error Propagation

1. **Services** throw `AppError`
2. **Controllers** catch errors and call `next(error)` to pass them to Express
3. **`errorHandler` middleware** (`src/middleware/error-handler.ts`) catches errors and formats the response:
   - `AppError` → uses its status code, error code, message, details, and custom headers
   - Multer `LIMIT_FILE_SIZE` → 413 with `FILE_TOO_LARGE`
   - Any other error → logged to console, returns 500 `INTERNAL_ERROR`

### Error Codes (35 total)

| Category | Codes |
|----------|-------|
| **Auth** | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_OTP`, `OTP_EXPIRED`, `OTP_RATE_LIMITED`, `RESEND_COOLDOWN`, `TOO_MANY_ATTEMPTS`, `INVALID_REFRESH_TOKEN` |
| **Validation** | `VALIDATION_ERROR`, `INVALID_PHONE`, `INVALID_EMAIL`, `INVALID_LANGUAGE`, `INVALID_TIME_FORMAT`, `INVALID_PLAN`, `INVALID_ANSWER`, `NAME_TOO_LONG`, `EMAIL_CONFLICT` |
| **Chat** | `CHAT_RATE_LIMITED`, `CONVERSATION_NOT_FOUND`, `EMPTY_MESSAGE`, `MESSAGE_TOO_LONG` |
| **Learning** | `LESSON_NOT_FOUND`, `LESSON_LOCKED`, `ALREADY_COMPLETED`, `AUDIO_NOT_SUBMITTED` |
| **Subscriptions** | `ACTIVE_SUBSCRIPTION`, `ALREADY_CANCELLED`, `NO_ACTIVE_SUBSCRIPTION`, `PLAN_NOT_FOUND`, `TRIAL_ALREADY_USED`, `NO_INVOICE` |
| **Files** | `FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, `INVALID_AUDIO_FORMAT` |
| **System** | `INTERNAL_ERROR` |

---

## 11. Database Layer

### Prisma Setup

- **Schema**: `prisma/schema.prisma`
- **Client singleton**: `src/prisma/client.ts` exports `prisma` (the PrismaClient instance) and `DatabaseClient` (union of `PrismaClient | Prisma.TransactionClient`)
- **Provider**: PostgreSQL

### Repository Pattern

Repositories are thin Prisma wrappers. Each:
- Accepts `DatabaseClient` in its constructor (defaults to the singleton `prisma`)
- Uses **explicit field selection** in queries (no `select *`)
- Returns typed record interfaces (not raw Prisma models)

```typescript
// src/repositories/otp.repository.ts
export class OtpRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async findLatest(identifier: string): Promise<OtpRecord | null> {
    return this.db.otp.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, identifier: true, code: true,
        expiresAt: true, usedAt: true, createdAt: true, attemptCount: true,
      },
    });
  }
}
```

### Transactions

Services that need atomic operations use `prisma.$transaction()`:

```typescript
this.runInTransaction = dependencies.runInTransaction
  ?? (callback => prisma.$transaction(tx => callback(tx)));

// Usage in service method:
return this.runInTransaction(async db => {
  const repo = this.createRepository(db);  // pass transaction client
  // ... multiple repo calls within the same transaction
});
```

The transaction client is passed to repository constructors so all queries within a transaction share the same connection.

### Migration Workflow

| Command | When to use |
|---------|------------|
| `npm run db:migrate` | Dev: creates a named migration file and applies it |
| `npm run db:push` | Quick prototyping: pushes schema without creating migration files |
| `npm run db:generate` | After any schema change: regenerates the Prisma client |
| `npm run db:studio` | Visual DB browser for inspecting data |

---

## 12. Domain Models

### Models (14)

| Model | Domain | Description |
|-------|--------|-------------|
| **User** | Auth | Central user entity. Phone (unique), name, email, avatar, subscription status, soft-delete via `deletedAt` |
| **Otp** | Auth | OTP records with identifier, code, attempt count, expiry, and usage tracking |
| **RefreshToken** | Auth | JWT refresh token sessions. Tracks `revokedAt` for session revocation |
| **QuestionnaireAnswers** | Onboarding | User's onboarding answers: learning goal, speaking challenge, 30-day goal, daily practice minutes |
| **Module** | Learning | Learning modules organized by `weekNumber` |
| **Lesson** | Learning | Individual lessons within a module. Type (speaking_drill, audio_response, etc.), ordered within module |
| **UserLessonProgress** | Learning | Per-user lesson status (locked/available/in_progress/completed), audio submission tracking |
| **LessonAudioSubmission** | Learning | Audio submission feedback: pronunciation/fluency/grammar/overall scores, suggestions, XP earned |
| **UserStats** | Gamification | XP, streaks, lessons completed, total practice minutes, rating |
| **SubscriptionPlan** | Billing | Available plans (monthly/yearly), pricing in INR, badges, descriptions |
| **Subscription** | Billing | User's active subscription: plan, status, trial dates, period dates, payment URL |
| **Conversation** | Chat | AI tutor conversation container. Tracks message count and last message time |
| **ChatMessage** | Chat | Individual messages within a conversation. Role: `user` or `tutor` |
| **UserSettings** | Settings | Language preference, notification toggle, daily reminder time |

### Enums (9)

| Enum | Values |
|------|--------|
| `SubscriptionStatus` | none, trial, active, expired, cancelled |
| `SubscriptionInterval` | month, year |
| `SubscriptionSubStatus` | trial, active, expired, cancelled, pending |
| `LessonType` | speaking_drill, audio_response, fluency_drill, conversation |
| `LessonStatus` | locked, available, in_progress, completed |
| `LearningGoal` | crack_interviews, speak_confidently, office_communication, daily_conversations |
| `SpeakingChallenge` | freeze_while_speaking, translate_in_mind, words_dont_come, fear_mistakes |
| `ThirtyDayGoal` | clear_interviews, speak_without_hesitation, sound_confident, daily_conversations |
| `MessageRole` | user, tutor |

### Key Relationships

- **User** is the central model — has relations to OTP, RefreshToken, QuestionnaireAnswers, UserStats, UserSettings, Subscription, Conversations, and LessonProgress
- **Module** → has many **Lessons** (cascade delete)
- **Lesson** → has many **UserLessonProgress** records (one per user, unique constraint on `[userId, lessonId]`)
- **UserLessonProgress** → has many **LessonAudioSubmissions**
- **Conversation** → has many **ChatMessages** (cascade delete)
- **SubscriptionPlan** → has many **Subscriptions** (one active per user, unique constraint on `userId`)

---

## 13. Serialization

### Convention

- **Internal code** (Prisma, services, controllers): camelCase (`avatarUrl`, `isOnboarded`)
- **External API** (JSON responses): snake_case (`avatar_url`, `is_onboarded`)

### Serializer Pattern

Each domain has a serializer file at `src/serializers/<domain>.serializer.ts`. Serializers are pure functions that take a typed result and return a plain object with snake_case keys:

```typescript
// src/serializers/user.serializer.ts
export function serializeUser(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar_url: user.avatarUrl,
    is_onboarded: user.isOnboarded,
    subscription_status: user.subscriptionStatus,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}
```

### Rules

- Dates are converted via `.toISOString()` — always ISO 8601 strings in responses
- Null values pass through as `null`
- The `serializeUser()` function is shared across auth and user serializers
- Serialization always happens in the controller, after the service returns and before `sendSuccess()` is called

---

## 14. Testing

### Test Runner

Tests use the **Node.js native test runner** (`node:test` module) with `node:assert/strict`. Not Jest, not Mocha.

```bash
# Run all tests
npm run test

# Run a single test file
node --import tsx --test src/services/auth.service.test.ts
```

### Two Test Levels

**1. Service tests (unit)** — test business logic with in-memory mock dependencies.

Services accept all dependencies via constructor. Tests create "fixture" factories that build mock repositories as Maps and Arrays:

```typescript
// src/services/auth.service.test.ts (simplified)
function createServiceFixture() {
  const otpRecords: OtpRecord[] = [];

  const service = new AuthService({
    createOtpRepository: () => ({
      async countCreatedSince(identifier, since) {
        return otpRecords.filter(r => r.identifier === identifier && r.createdAt >= since).length;
      },
      async create(data) { /* push to array */ },
      async findLatest(identifier) { /* find in array */ },
      // ...
    }),
    generateOtpCode: () => "123456",
    now: () => new Date("2026-02-28T10:00:00.000Z"),
    runInTransaction: async callback => callback({} as never),
  });

  return { otpRecords, service };
}
```

**2. Route tests (HTTP integration)** — test the full middleware chain using `light-my-request`.

Route factories accept an injected mock service, so tests don't need a database:

```typescript
// src/routes/auth.routes.test.ts (simplified)
function createApp(service: AuthServiceContract) {
  const app = express();
  app.use(express.json());
  app.use("/v1/auth", createAuthRouter({ service }));
  app.use(errorHandler);
  return app;
}

it("returns contract response for POST /v1/auth/otp/send", async () => {
  const app = createApp({
    sendOtp: async () => ({
      otpSent: true,
      phoneMasked: "+91XXXXXXX443",
      expiresInSeconds: 300,
      resendCooldownSeconds: 30,
    }),
    // ... other methods throw
  });

  const client = createTestClient(app);
  const response = await client.request({
    method: "POST",
    path: "/v1/auth/otp/send",
    json: { phone: "+919483898443" },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json<{ data: { otp_sent: boolean } }>();
  assert.equal(body.data.otp_sent, true);
});
```

### Test Client

`src/test/support/test-client.ts` wraps `light-my-request` to provide a clean API:

```typescript
const client = createTestClient(app);
const response = await client.request({
  method: "POST",
  path: "/v1/auth/otp/send",
  headers: { Authorization: "Bearer token" },
  json: { phone: "+919483898443" },
});

response.statusCode;   // number
response.json<T>();    // parsed response body
response.headers;      // response headers
```

No actual HTTP connection is made — `light-my-request` injects requests directly into Express.

### Multipart Test Support

`src/test/support/multipart.ts` provides `buildMultipartFormData()` for testing file upload endpoints.

### Key Testing Principles

- **No database in tests** — all tests use in-memory mocks via dependency injection
- **Frozen time** — services accept a `now` function for deterministic time-based logic
- **Co-located files** — test files live next to their source files
- **One assertion style** — `node:assert/strict` (not chai, not expect)

---

## 15. Environment and Configuration

### All Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | string | *(required)* | PostgreSQL connection string |
| `JWT_SECRET` | string | *(required)* | JWT signing secret (min 32 chars in production) |
| `NODE_ENV` | enum | `development` | `development`, `production`, or `test` |
| `PORT` | number | `3000` | Server listen port |
| `CORS_ALLOWED_ORIGINS` | string | `*` | Comma-separated origins (must be explicit in production) |
| `CDN_BASE_URL` | string | `https://cdn.fluently.app` | CDN base URL for assets |
| `PAYMENTS_BASE_URL` | string | `https://pay.fluently.app/checkout` | Payment gateway base URL |
| `ACCESS_TOKEN_EXPIRES_IN_SECONDS` | number | `3600` | Access token lifetime (1 hour) |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | number | `2592000` | Refresh token lifetime (30 days) |
| `OTP_EXPIRY_SECONDS` | number | `300` | OTP validity window (5 minutes) |
| `OTP_RESEND_COOLDOWN_SECONDS` | number | `30` | Min wait between OTP resends |
| `OTP_MAX_SEND_ATTEMPTS_PER_WINDOW` | number | `5` | Max OTP sends per window |
| `OTP_RATE_LIMIT_WINDOW_SECONDS` | number | `300` | OTP rate limit window (5 minutes) |
| `OTP_VERIFY_MAX_ATTEMPTS` | number | `5` | Max incorrect OTP guesses per code |
| `CHAT_RATE_LIMIT_MAX_MESSAGES` | number | `10` | Max chat messages per window |
| `CHAT_RATE_LIMIT_WINDOW_SECONDS` | number | `30` | Chat rate limit window |
| `TRIAL_DURATION_DAYS` | number | `7` | Free trial length in days |

### Production Guards

`src/config/env.ts` enforces two production-only rules:
- `JWT_SECRET` must be at least 32 characters
- `CORS_ALLOWED_ORIGINS` must not be `*` (must list explicit origins)

Both will crash the server at startup if violated in production.

### CORS Behavior

`CORS_ALLOWED_ORIGINS` is either the string `"*"` (development) or a comma-separated list that gets split into an array (production). Example: `CORS_ALLOWED_ORIGINS=https://app.fluently.app,https://admin.fluently.app`.

---

## 16. How to Add a New Feature

Step-by-step guide for adding a new endpoint. Uses a hypothetical "bookmark lessons" feature as an example.

### Step 1: Database Schema

Add a model to `prisma/schema.prisma`:

```prisma
model LessonBookmark {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId  String
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, lessonId])
  @@index([userId])
}
```

Run: `npm run db:migrate` (creates migration) then `npm run db:generate` (regenerates client).

### Step 2: Error Codes

Add any new error codes to `src/errors/error-codes.ts`:

```typescript
BOOKMARK_NOT_FOUND: "BOOKMARK_NOT_FOUND",
```

### Step 3: Repository

Create `src/repositories/bookmark.repository.ts`:

```typescript
export class BookmarkRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async create(data: { userId: string; lessonId: string }) {
    return this.db.lessonBookmark.create({
      data,
      select: { id: true, userId: true, lessonId: true, createdAt: true },
    });
  }
  // ... other methods
}
```

### Step 4: Service

Create `src/services/bookmark.service.ts` with port-style interface and constructor DI:

```typescript
interface BookmarkRepositoryPort {
  create(data: { userId: string; lessonId: string }): Promise<BookmarkRecord>;
  // ...
}

export interface BookmarkServiceContract {
  createBookmark(userId: string, lessonId: string): Promise<BookmarkRecord>;
}

export class BookmarkService implements BookmarkServiceContract {
  private readonly createBookmarkRepository: (db?: DatabaseClient) => BookmarkRepositoryPort;

  constructor(dependencies: { createBookmarkRepository?: (db?: DatabaseClient) => BookmarkRepositoryPort } = {}) {
    this.createBookmarkRepository = dependencies.createBookmarkRepository ?? (db => new BookmarkRepository(db));
  }

  async createBookmark(userId: string, lessonId: string) {
    const repo = this.createBookmarkRepository();
    return repo.create({ userId, lessonId });
  }
}
```

### Step 5: Serializer

Create `src/serializers/bookmark.serializer.ts`:

```typescript
export function serializeBookmark(bookmark: BookmarkRecord) {
  return {
    id: bookmark.id,
    lesson_id: bookmark.lessonId,
    created_at: bookmark.createdAt.toISOString(),
  };
}
```

### Step 6: Validation

Create `src/validations/bookmark.validation.ts`:

```typescript
export const createBookmarkSchema = z.object({
  lesson_id: z.string().min(1, "Lesson ID is required"),
});

export const createBookmarkValidation = {
  fields: {
    lesson_id: { code: ErrorCodes.LESSON_NOT_FOUND, message: "Lesson ID is required" },
  },
} satisfies ValidationConfig;
```

### Step 7: Controller

Create `src/controllers/bookmark.controller.ts`:

```typescript
export class BookmarkController {
  constructor(private readonly service: BookmarkServiceContract = new BookmarkService()) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.createBookmark(req.auth!.userId, req.body.lesson_id);
      sendSuccess(res, serializeBookmark(result), 201);
    } catch (error) {
      next(error);
    }
  };
}
```

### Step 8: Route

Create `src/routes/bookmark.routes.ts`:

```typescript
export function createBookmarkRouter(options: { service?: BookmarkServiceContract; authenticateMiddleware?: RequestHandler } = {}) {
  const router = Router();
  const controller = new BookmarkController(options.service);
  const auth = options.authenticateMiddleware ?? authenticate;

  router.post("/", auth, validate(createBookmarkSchema, createBookmarkValidation), controller.create);

  return router;
}

export const bookmarkRouter = createBookmarkRouter();
```

### Step 9: Register the Route

Add to `src/routes/index.ts`:

```typescript
router.use("/bookmarks", bookmarkRouter);
```

### Step 10: Write Tests

Create `src/services/bookmark.service.test.ts` (unit) and `src/routes/bookmark.routes.test.ts` (integration) following the patterns in section 14.

---

## 17. Conventions and Code Style

### Architecture Rules

| Rule | Details |
|------|---------|
| **Thin controllers** | Controllers extract request data, call one service method, serialize, respond. No business logic. |
| **Business logic in services** | All domain rules, state transitions, and validations live in services. |
| **DB access in repositories** | Controllers and services never call Prisma directly. |
| **Serializer boundary** | Serialization (camelCase → snake_case) happens in the controller, not the service or repository. |
| **Error convention** | Always throw `AppError` with a code from `ErrorCodes`. Never return error objects. |
| **Response convention** | Always use `sendSuccess()` / `sendError()` helpers. Never call `res.json()` directly. |

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case with domain prefix | `auth.service.ts`, `error-handler.ts` |
| Classes | PascalCase | `AuthService`, `OtpRepository` |
| Interfaces | PascalCase, descriptive suffix | `AuthServiceContract`, `OtpRepositoryPort` |
| Functions | camelCase | `sendOtp`, `serializeUser` |
| Constants | UPPER_SNAKE_CASE | `ErrorCodes.INVALID_OTP` |
| DB fields (Prisma) | camelCase | `avatarUrl`, `isOnboarded` |
| API fields (JSON) | snake_case | `avatar_url`, `is_onboarded` |

### Code Patterns

- **Controller methods** are arrow function instance properties (not prototype methods) to preserve `this` binding:
  ```typescript
  sendOtp = async (req: Request, res: Response, next: NextFunction) => { ... };
  ```
- **Exports** are named (not default) — exception: `src/app.ts` uses `export default app`.
- **Service contracts** define what the service can do; port interfaces define what the service needs.
- **Dependency defaults** use `??` (nullish coalescing):
  ```typescript
  this.repo = dependencies.repo ?? new DefaultRepo();
  ```
- **Alphabetical ordering** is used for imports, object properties, interface fields, and error codes.

---

## 18. Known Gaps and Placeholders

These are observations about areas that are incomplete or transitional. They are not criticisms — they represent the current state of the codebase and are documented here to prevent confusion.

### Placeholder Services

| Service | Current behavior | Needs |
|---------|-----------------|-------|
| `ConsoleOtpDeliveryService` | Logs OTP to console | Real SMS provider integration |
| `PlaceholderChatTutorService` | Returns hardcoded responses | Real AI/LLM integration |
| `PlaceholderLessonFeedbackService` | Returns fixed scores | Speech analysis service |
| `PlaceholderSubscriptionBillingService` | Returns CDN URLs as payment links | Payment gateway integration |
| `LocalAvatarStorageService` | Writes to local filesystem | Cloud storage (S3, GCS, etc.) |

### Other Observations

- **`express-rate-limit`** is installed in `package.json` but not applied as middleware anywhere. Rate limiting is purely service-layer (database-backed) for OTP and chat. There is no global request rate limiting.
- **`otp.service.ts`** appears to be a legacy file — OTP logic is now fully handled within `auth.service.ts`.
- **`supertest`** and `@types/supertest` are in devDependencies but unused — replaced by `light-my-request`.
- **No logging framework** — the codebase uses only `console.log` and `console.error`.
- **No CI/CD configuration** — no GitHub Actions, Dockerfile, or deployment configuration files are present in the repository.
- **`docs/` folder is gitignored** — documentation files in `docs/` are not version-controlled. Only root-level markdown files (`CLAUDE.md`, `api-contract.md`, this file) are committed.
- **`claude.md` (lowercase) is gitignored** separately from `CLAUDE.md` — likely a stale `.gitignore` entry.

---

## 19. Quick Reference Card

### Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | TypeScript → `dist/` |
| `npm start` | Production server |
| `npm run test` | Run all tests |
| `node --import tsx --test src/path/to/file.test.ts` | Single test file |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create + apply migration |
| `npm run db:push` | Push schema without migration file |
| `npm run db:studio` | Visual DB browser |

### API Route Groups

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/otp/send` | Send OTP |
| POST | `/v1/auth/otp/verify` | Verify OTP, get tokens |
| POST | `/v1/auth/otp/resend` | Resend OTP |
| POST | `/v1/auth/token/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Revoke session |
| GET | `/v1/users/me` | Get profile |
| PATCH | `/v1/users/me` | Update profile |
| DELETE | `/v1/users/me` | Delete account |
| POST | `/v1/users/me/avatar` | Upload avatar |
| DELETE | `/v1/users/me/avatar` | Delete avatar |
| GET | `/v1/users/me/personalized-plan` | Get onboarding plan |
| GET | `/v1/chat/suggestions` | Chat suggestions |
| POST | `/v1/chat/conversations` | Get/create conversation |
| GET | `/v1/chat/conversations/:id/messages` | List messages |
| POST | `/v1/chat/conversations/:id/messages` | Send message |
| POST | `/v1/chat/conversations/:id/stream` | Stream message (SSE) |
| GET | `/v1/users/me/dashboard` | Learning dashboard |
| GET | `/v1/modules` | List modules |
| GET | `/v1/lessons/:id` | Lesson details |
| POST | `/v1/lessons/:id/audio` | Submit audio |
| POST | `/v1/lessons/:id/complete` | Complete lesson |
| GET | `/v1/users/me/stats` | User stats |
| GET | `/v1/subscriptions/plans` | List plans |
| POST | `/v1/subscriptions/trial` | Start trial |
| POST | `/v1/subscriptions` | Create subscription |
| GET | `/v1/subscriptions/me` | Current subscription |
| POST | `/v1/subscriptions/me/cancel` | Cancel subscription |
| GET | `/v1/subscriptions/me/invoice` | Latest invoice |
| GET | `/v1/settings` | Get settings |
| PATCH | `/v1/settings` | Update settings |
| POST | `/v1/onboarding/questionnaire` | Submit questionnaire |
| GET | `/v1/content/privacy-policy` | Privacy policy |
| GET | `/v1/content/terms-and-conditions` | Terms of service |
| GET | `/v1/content/refund-policy` | Refund policy |
| GET | `/v1/content/help-support` | Help and support |
| GET | `/v1/health` | Health check |

### Error Codes by HTTP Status

| Status | Codes |
|--------|-------|
| **400** | `INVALID_OTP`, `INVALID_PHONE`, `INVALID_EMAIL`, `INVALID_PLAN`, `INVALID_ANSWER`, `INVALID_LANGUAGE`, `INVALID_TIME_FORMAT`, `VALIDATION_ERROR`, `NAME_TOO_LONG`, `EMPTY_MESSAGE`, `MESSAGE_TOO_LONG`, `AUDIO_NOT_SUBMITTED`, `ALREADY_COMPLETED`, `LESSON_LOCKED`, `ACTIVE_SUBSCRIPTION`, `ALREADY_CANCELLED` |
| **401** | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_REFRESH_TOKEN` |
| **404** | `LESSON_NOT_FOUND`, `CONVERSATION_NOT_FOUND`, `PLAN_NOT_FOUND`, `NO_ACTIVE_SUBSCRIPTION`, `NO_INVOICE` |
| **409** | `EMAIL_CONFLICT`, `TRIAL_ALREADY_USED` |
| **410** | `OTP_EXPIRED` |
| **413** | `FILE_TOO_LARGE` |
| **415** | `INVALID_FILE_TYPE`, `INVALID_AUDIO_FORMAT` |
| **429** | `OTP_RATE_LIMITED`, `RESEND_COOLDOWN`, `TOO_MANY_ATTEMPTS`, `CHAT_RATE_LIMITED` |
| **500** | `INTERNAL_ERROR` |

---

## 20. Useful File Index

Files a new engineer should open first, in suggested order:

| File | What you'll learn |
|------|------------------|
| `src/app.ts` | Middleware stack and route mounting — the entry point |
| `src/routes/index.ts` | How all domain routers are composed |
| `src/routes/auth.routes.ts` | The route factory pattern (simplest example) |
| `src/controllers/auth.controller.ts` | The controller pattern — thin request→service→response |
| `src/services/auth.service.ts` | The service pattern — DI, port interfaces, business logic, transactions |
| `src/repositories/otp.repository.ts` | The repository pattern — Prisma queries with typed records |
| `src/serializers/auth.serializer.ts` | The serializer pattern — camelCase to snake_case |
| `src/validations/auth.validation.ts` | The validation pattern — Zod schema + ValidationConfig |
| `src/middleware/auth.ts` | JWT authentication and session verification |
| `src/middleware/validate.ts` | How request validation works |
| `src/middleware/error-handler.ts` | How errors become HTTP responses |
| `src/errors/app-error.ts` | The AppError class |
| `src/errors/error-codes.ts` | All error codes |
| `src/utils/response.ts` | Response envelope helpers |
| `src/config/env.ts` | Environment validation and defaults |
| `prisma/schema.prisma` | The complete database schema |
| `src/prisma/client.ts` | PrismaClient singleton and DatabaseClient type |
| `src/test/support/test-client.ts` | HTTP test helper |
| `src/types/express.d.ts` | Express Request augmentation (req.auth, req.user) |
| `.env.example` | All environment variables with example values |
