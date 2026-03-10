# Fluently API Contract

> **Version**: 1.0.0
> **Last Updated**: 2026-02-28
> **Base URL**: `https://api.fluently.app/v1`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Models](#2-data-models)
3. [Authentication](#3-authentication)
4. [User Profile](#4-user-profile)
5. [Onboarding & Questionnaire](#5-onboarding--questionnaire)
6. [Subscriptions & Payments](#6-subscriptions--payments)
7. [Learning Modules & Lessons](#7-learning-modules--lessons)
8. [AI Tutor Chat](#8-ai-tutor-chat)
9. [Settings](#9-settings)
10. [Static Content](#10-static-content)
11. [Error Handling](#11-error-handling)

---

## 1. Overview

### Base URL

All API requests are made to:

```
https://api.fluently.app/v1
```

### Authentication Scheme

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via the OTP authentication flow (see [Section 3](#3-authentication)).

### Common Request Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Yes (except auth endpoints) | `Bearer <access_token>` |
| `Content-Type` | Yes (for request bodies) | `application/json` unless file upload (`multipart/form-data`) |
| `Accept` | No | `application/json` (default) |
| `Accept-Language` | No | Preferred language code (e.g., `en`, `hi`). Defaults to `en`. |
| `X-App-Version` | No | Client app version string (e.g., `1.2.0`) |
| `X-Platform` | No | Client platform (`ios`, `android`) |

### Common Response Envelope

All responses follow this envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-28T10:00:00Z"
  }
}
```

Error responses follow the format described in [Section 11](#11-error-handling).

### Pagination

List endpoints use cursor-based pagination:

| Query Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 20 | Max items per page (1–100) |
| `cursor` | string | — | Opaque cursor from previous response |

Paginated responses include:

```json
{
  "data": [ ... ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "has_more": true
  }
}
```

---

## 2. Data Models

### User

```jsonc
{
  "id": "usr_abc123",
  "name": "Sachin Kumar",                    // nullable, set during onboarding
  "phone": "+919483898443",
  "email": "sachin@example.com",             // nullable
  "avatar_url": "https://cdn.fluently.app/avatars/usr_abc123.jpg",  // nullable
  "is_onboarded": true,
  "subscription_status": "trial",            // "none" | "trial" | "active" | "expired" | "cancelled"
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T10:00:00Z"
}
```

### QuestionnaireAnswers

```jsonc
{
  "learning_goal": "office_communication",       // "crack_interviews" | "speak_confidently" | "office_communication" | "daily_conversations"
  "speaking_challenge": "words_dont_come",        // "freeze_while_speaking" | "translate_in_mind" | "words_dont_come" | "fear_mistakes"
  "thirty_day_goal": "clear_interviews",          // "clear_interviews" | "speak_without_hesitation" | "sound_confident" | "daily_conversations"
  "daily_practice_minutes": 20                    // 10 | 15 | 20 | 30
}
```

### PersonalizedPlan

```jsonc
{
  "goal_label": "Office communication",
  "challenge_label": "Words don't come quickly",
  "daily_practice_minutes": 20,
  "milestones": [
    { "week": 1, "label": "Stop translating in mind" },
    { "week": 2, "label": "Speak without hesitation" },
    { "week": 4, "label": "Sound confident & natural" }
  ],
  "plan_features": [
    "Daily speaking practice (20 mins)",
    "Real-life office conversation practice",
    "Interview confidence training",
    "AI speaking partner",
    "Weekly progress tracking"
  ],
  "social_proof": "92% learners improved confidence in 21 days"
}
```

### Module

```jsonc
{
  "id": "mod_w1",
  "title": "Week 1 — Basics of Speaking",
  "week_number": 1,
  "status": "in_progress",                   // "locked" | "in_progress" | "completed"
  "lessons_completed": 2,
  "lessons_total": 5,
  "lessons": [
    { /* Lesson object */ }
  ]
}
```

### Lesson

```jsonc
{
  "id": "les_001",
  "module_id": "mod_w1",
  "title": "Yesterday's activities",
  "type": "speaking_drill",                  // "speaking_drill" | "audio_response" | "fluency_drill" | "conversation"
  "duration_label": "5 min",
  "status": "completed",                     // "locked" | "available" | "in_progress" | "completed"
  "order": 1,
  "content": {
    "prompt_text": "Hi! I'm your AI English tutor. Let's start by recording a quick introduction.",
    "instructions": "Record yourself speaking for 60 seconds about your day.",
    "background_image_url": "https://cdn.fluently.app/lessons/les_001_bg.jpg"  // nullable
  }
}
```

### UserStats

```jsonc
{
  "xp": 12,
  "rating": 4.9,
  "language": "ENG",
  "current_streak_days": 3,
  "lessons_completed": 7,
  "total_practice_minutes": 45
}
```

### ChatMessage

```jsonc
{
  "id": "msg_abc123",
  "conversation_id": "conv_xyz",
  "role": "user",                            // "user" | "tutor"
  "content": "Can we practice some common phrases for traveling?",
  "created_at": "2026-02-28T10:03:00Z"
}
```

### Conversation

```jsonc
{
  "id": "conv_xyz",
  "user_id": "usr_abc123",
  "created_at": "2026-02-28T10:00:00Z",
  "last_message_at": "2026-02-28T10:05:00Z",
  "message_count": 4
}
```

### SubscriptionPlan

```jsonc
{
  "id": "plan_yearly",
  "name": "Yearly Plan",
  "interval": "year",                        // "month" | "year"
  "price_amount": 799,
  "price_currency": "INR",
  "monthly_equivalent": 67,                  // computed display value
  "badge": "BEST FOR YOUR GOAL",             // nullable, promotional badge
  "description": "Matches your 20-min daily plan"  // nullable
}
```

### TrialOffer

```jsonc
{
  "price_amount": 9,
  "price_currency": "INR",
  "duration_days": 7,
  "auto_renew": false,
  "benefits": [
    "Speak with Confidence",
    "Crack Interviews",
    "Ace Exams"
  ],
  "warning_text": "Missing this offer could slow your progress"
}
```

### Subscription

```jsonc
{
  "id": "sub_abc123",
  "plan_id": "plan_yearly",                  // nullable (null during trial)
  "status": "active",                        // "trial" | "active" | "expired" | "cancelled" | "pending"
  "trial_end_date": "2026-03-07T10:00:00Z",  // nullable
  "current_period_start": "2026-02-28T10:00:00Z",  // nullable
  "current_period_end": "2027-02-28T10:00:00Z",    // nullable
  "cancel_at_period_end": false,
  "created_at": "2026-02-28T10:00:00Z"
}
```

### UserProgress

```jsonc
{
  "current_week": 1,
  "weeks_completed": 0,
  "total_weeks": 4,
  "weekly_progress": [
    { "week": 1, "status": "in_progress", "lessons_completed": 2, "lessons_total": 5 },
    { "week": 2, "status": "locked", "lessons_completed": 0, "lessons_total": 5 },
    { "week": 3, "status": "locked", "lessons_completed": 0, "lessons_total": 5 },
    { "week": 4, "status": "locked", "lessons_completed": 0, "lessons_total": 5 }
  ]
}
```

---

## 3. Authentication

Authentication uses a phone-based OTP flow. No password is required.

**Flow**: Phone Entry → Send OTP → Verify OTP → Receive JWT tokens

---

### 3.1 Send OTP

Sends a one-time password to the provided phone number.

**Screen**: Login (Phone Entry)

```
POST /v1/auth/otp/send
```

**Auth Required**: No

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | string | Yes | Phone number with country code (e.g., `"+919483898443"`) |

```json
{
  "phone": "+919483898443"
}
```

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "otp_sent": true,
    "phone_masked": "+91XXXXXXX443",
    "expires_in_seconds": 300,
    "resend_cooldown_seconds": 30
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_PHONE` | Phone number format is invalid |
| 429 | `OTP_RATE_LIMITED` | Too many OTP requests. Retry after cooldown. |

---

### 3.2 Verify OTP

Verifies the OTP and returns authentication tokens. Creates a new user account if this is the first login.

**Screen**: Login (OTP Verification)

```
POST /v1/auth/otp/verify
```

**Auth Required**: No

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | string | Yes | Phone number with country code |
| `otp` | string | Yes | 6-digit OTP code |

```json
{
  "phone": "+919483898443",
  "otp": "253882"
}
```

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "usr_abc123",
      "name": null,
      "phone": "+919483898443",
      "email": null,
      "avatar_url": null,
      "is_onboarded": false,
      "subscription_status": "none",
      "created_at": "2026-02-28T10:00:00Z",
      "updated_at": "2026-02-28T10:00:00Z"
    },
    "is_new_user": true
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_OTP` | OTP code is incorrect |
| 410 | `OTP_EXPIRED` | OTP has expired. Request a new one. |
| 429 | `TOO_MANY_ATTEMPTS` | Too many failed verification attempts |

---

### 3.3 Resend OTP

Resends the OTP to the same phone number. Subject to cooldown.

**Screen**: Login (OTP Verification) — "Resend OTP" link

```
POST /v1/auth/otp/resend
```

**Auth Required**: No

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | string | Yes | Phone number with country code |

```json
{
  "phone": "+919483898443"
}
```

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "otp_sent": true,
    "resend_cooldown_seconds": 30
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 429 | `RESEND_COOLDOWN` | Must wait before resending. `retry_after` field included. |

---

### 3.4 Refresh Token

Exchanges a refresh token for a new access token.

```
POST /v1/auth/token/refresh
```

**Auth Required**: No

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `refresh_token` | string | Yes | The refresh token from login |

```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "bmV3IHJlZnJlc2ggdG9r...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token is invalid or revoked |

---

### 3.5 Logout

Revokes the current session's tokens.

**Screen**: Profile — "Logout" menu item

```
POST /v1/auth/logout
```

**Auth Required**: Yes

**Request Body**: None

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "logged_out": true
  }
}
```

---

## 4. User Profile

### 4.1 Get Current User

Returns the authenticated user's profile.

**Screens**: Profile, Profile Edit (pre-population), Home (greeting name)

```
GET /v1/users/me
```

**Auth Required**: Yes

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "name": "Sachin Kumar",
    "phone": "+919483898443",
    "email": "sachin@example.com",
    "avatar_url": "https://cdn.fluently.app/avatars/usr_abc123.jpg",
    "is_onboarded": true,
    "subscription_status": "trial",
    "created_at": "2026-02-28T10:00:00Z",
    "updated_at": "2026-02-28T10:00:00Z"
  }
}
```

---

### 4.2 Update Current User

Updates the authenticated user's profile fields. Supports partial updates.

**Screens**: Enter Name (sets `name`), Profile Edit (updates `name`, `email`)

```
PATCH /v1/users/me
```

**Auth Required**: Yes

**Request Body** (all fields optional):

| Field | Type | Description |
|---|---|---|
| `name` | string | User's display name (max 100 chars) |
| `email` | string | Email address |

```json
{
  "name": "Sachin Kumar",
  "email": "sachin@example.com"
}
```

**Response** `200 OK`: Returns the updated [User](#user) object.

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_EMAIL` | Email format is invalid |
| 400 | `NAME_TOO_LONG` | Name exceeds 100 characters |

---

### 4.3 Upload Avatar

Uploads or replaces the user's profile photo.

**Screen**: Upload Photo modal — "Choose from gallery" / "Take a photo"

```
POST /v1/users/me/avatar
```

**Auth Required**: Yes

**Content-Type**: `multipart/form-data`

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | Image file (JPEG, PNG). Max 5 MB. |

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "avatar_url": "https://cdn.fluently.app/avatars/usr_abc123.jpg?v=1709118300"
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_FILE_TYPE` | Only JPEG and PNG are accepted |
| 413 | `FILE_TOO_LARGE` | File exceeds 5 MB limit |

---

### 4.4 Delete Avatar

Removes the user's profile photo, reverting to the default placeholder.

```
DELETE /v1/users/me/avatar
```

**Auth Required**: Yes

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "avatar_url": null
  }
}
```

---

## 5. Onboarding & Questionnaire

### 5.1 Submit Questionnaire

Submits all 4 questionnaire answers in a single request after the user completes the full flow. This triggers generation of the personalized learning plan.

**Screens**: Questionnaire Steps 1–4 (submitted on completion of step 4)

```
POST /v1/onboarding/questionnaire
```

**Auth Required**: Yes

**Request Body**:

| Field | Type | Required | Allowed Values |
|---|---|---|---|
| `learning_goal` | string | Yes | `"crack_interviews"`, `"speak_confidently"`, `"office_communication"`, `"daily_conversations"` |
| `speaking_challenge` | string | Yes | `"freeze_while_speaking"`, `"translate_in_mind"`, `"words_dont_come"`, `"fear_mistakes"` |
| `thirty_day_goal` | string | Yes | `"clear_interviews"`, `"speak_without_hesitation"`, `"sound_confident"`, `"daily_conversations"` |
| `daily_practice_minutes` | integer | Yes | `10`, `15`, `20`, `30` |

```json
{
  "learning_goal": "office_communication",
  "speaking_challenge": "words_dont_come",
  "thirty_day_goal": "clear_interviews",
  "daily_practice_minutes": 20
}
```

**Response** `201 Created`:

```json
{
  "success": true,
  "data": {
    "questionnaire_completed": true,
    "personalized_plan": {
      "goal_label": "Office communication",
      "challenge_label": "Words don't come quickly",
      "daily_practice_minutes": 20,
      "milestones": [
        { "week": 1, "label": "Stop translating in mind" },
        { "week": 2, "label": "Speak without hesitation" },
        { "week": 4, "label": "Sound confident & natural" }
      ],
      "plan_features": [
        "Daily speaking practice (20 mins)",
        "Real-life office conversation practice",
        "Interview confidence training",
        "AI speaking partner",
        "Weekly progress tracking"
      ],
      "social_proof": "92% learners improved confidence in 21 days"
    }
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_ANSWER` | One or more answers have invalid values |
| 409 | `ALREADY_COMPLETED` | Questionnaire was already submitted |

---

### 5.2 Get Personalized Plan

Retrieves the user's personalized plan generated from their questionnaire answers.

**Screen**: Paywall (displays goal, challenge, practice time, milestones, features)

```
GET /v1/users/me/personalized-plan
```

**Auth Required**: Yes

**Response** `200 OK`: Returns the [PersonalizedPlan](#personalizedplan) object.

**Errors**:

| Status | Code | Description |
|---|---|---|
| 404 | `PLAN_NOT_FOUND` | Questionnaire not yet completed |

---

## 6. Subscriptions & Payments

### 6.1 Get Available Plans

Returns subscription plans and the trial offer.

**Screens**: Trial Screen, Paywall

```
GET /v1/subscriptions/plans
```

**Auth Required**: Yes

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "trial_offer": {
      "price_amount": 9,
      "price_currency": "INR",
      "duration_days": 7,
      "auto_renew": false,
      "benefits": [
        "Speak with Confidence",
        "Crack Interviews",
        "Ace Exams"
      ],
      "warning_text": "Missing this offer could slow your progress"
    },
    "plans": [
      {
        "id": "plan_yearly",
        "name": "Yearly Plan",
        "interval": "year",
        "price_amount": 799,
        "price_currency": "INR",
        "monthly_equivalent": 67,
        "badge": "BEST FOR YOUR GOAL",
        "description": null
      },
      {
        "id": "plan_monthly",
        "name": "Monthly Plan",
        "interval": "month",
        "price_amount": 199,
        "price_currency": "INR",
        "monthly_equivalent": 199,
        "badge": null,
        "description": "Matches your 20-min daily plan"
      }
    ]
  }
}
```

---

### 6.2 Start Trial

Initiates the 7-day premium trial for ₹9.

**Screen**: Trial Screen — "Start Trial for ₹9" button, Paywall — "Start My Personalized Plan for ₹9" button

```
POST /v1/subscriptions/trial
```

**Auth Required**: Yes

**Request Body**: None (trial terms are fixed server-side)

**Response** `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "sub_trial_abc",
    "plan_id": null,
    "status": "trial",
    "trial_end_date": "2026-03-07T10:00:00Z",
    "current_period_start": "2026-02-28T10:00:00Z",
    "current_period_end": "2026-03-07T10:00:00Z",
    "cancel_at_period_end": true,
    "created_at": "2026-02-28T10:00:00Z",
    "payment_url": "https://pay.fluently.app/checkout/sub_trial_abc"
  }
}
```

> **Note**: The `payment_url` should be opened in an in-app browser/webview for the user to complete payment. The client should poll the subscription status or listen for a webhook callback to confirm activation.

**Errors**:

| Status | Code | Description |
|---|---|---|
| 409 | `TRIAL_ALREADY_USED` | User has already used their trial |
| 409 | `ACTIVE_SUBSCRIPTION` | User already has an active subscription |

---

### 6.3 Create Subscription

Creates a paid subscription (monthly or yearly).

**Screen**: Paywall — plan selection + CTA button

```
POST /v1/subscriptions
```

**Auth Required**: Yes

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `plan_id` | string | Yes | ID of the selected plan (`"plan_yearly"` or `"plan_monthly"`) |

```json
{
  "plan_id": "plan_yearly"
}
```

**Response** `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "sub_abc123",
    "plan_id": "plan_yearly",
    "status": "pending",
    "trial_end_date": null,
    "current_period_start": null,
    "current_period_end": null,
    "cancel_at_period_end": false,
    "created_at": "2026-02-28T10:00:00Z",
    "payment_url": "https://pay.fluently.app/checkout/sub_abc123"
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_PLAN` | Plan ID does not exist |
| 409 | `ACTIVE_SUBSCRIPTION` | User already has an active subscription |

---

### 6.4 Get Current Subscription

Returns the user's active subscription details.

```
GET /v1/subscriptions/me
```

**Auth Required**: Yes

**Response** `200 OK`: Returns the [Subscription](#subscription) object.

**Response** `200 OK` (no subscription):

```json
{
  "success": true,
  "data": null
}
```

---

### 6.5 Cancel Subscription

Cancels the subscription at the end of the current billing period.

```
POST /v1/subscriptions/me/cancel
```

**Auth Required**: Yes

**Request Body**: None

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "id": "sub_abc123",
    "status": "active",
    "cancel_at_period_end": true,
    "current_period_end": "2027-02-28T10:00:00Z"
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 404 | `NO_ACTIVE_SUBSCRIPTION` | No active subscription to cancel |
| 409 | `ALREADY_CANCELLED` | Subscription is already set to cancel |

---

### 6.6 Get Invoice

Downloads or retrieves the user's invoice.

**Screen**: Profile — "Get Your Invoice" menu item

```
GET /v1/subscriptions/me/invoice
```

**Auth Required**: Yes

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "invoice_url": "https://cdn.fluently.app/invoices/inv_abc123.pdf",
    "invoice_date": "2026-02-28",
    "amount": 799,
    "currency": "INR",
    "plan_name": "Yearly Plan",
    "status": "paid"
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 404 | `NO_INVOICE` | No invoices available |

---

## 7. Learning Modules & Lessons

### 7.1 Get Dashboard

Returns the home screen data including greeting context, current module, and streak info.

**Screen**: Home

```
GET /v1/users/me/dashboard
```

**Auth Required**: Yes

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "greeting": "Good evening",
    "user_name": "Sachin",
    "is_premium": false,
    "stats": {
      "xp": 12,
      "rating": 4.9,
      "language": "ENG",
      "current_streak_days": 3,
      "lessons_completed": 7,
      "total_practice_minutes": 45
    },
    "progress": {
      "current_week": 1,
      "weeks_completed": 0,
      "total_weeks": 4,
      "weekly_progress": [
        { "week": 1, "status": "in_progress", "lessons_completed": 2, "lessons_total": 5 },
        { "week": 2, "status": "locked", "lessons_completed": 0, "lessons_total": 5 },
        { "week": 3, "status": "locked", "lessons_completed": 0, "lessons_total": 5 },
        { "week": 4, "status": "locked", "lessons_completed": 0, "lessons_total": 5 }
      ]
    },
    "fluency_journey_label": "You're on Week 1 — Keep going!"
  }
}
```

---

### 7.2 List Modules

Returns all weekly modules with their lessons and completion status.

**Screen**: Home — "Weekly Modules" section

```
GET /v1/modules
```

**Auth Required**: Yes

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `include_lessons` | boolean | `true` | Whether to embed lessons in each module |

**Response** `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "id": "mod_w1",
      "title": "Week 1 — Basics of Speaking",
      "week_number": 1,
      "status": "in_progress",
      "lessons_completed": 2,
      "lessons_total": 5,
      "lessons": [
        {
          "id": "les_001",
          "module_id": "mod_w1",
          "title": "Yesterday's activities",
          "type": "speaking_drill",
          "duration_label": "5 min",
          "status": "completed",
          "order": 1
        },
        {
          "id": "les_002",
          "module_id": "mod_w1",
          "title": "Your weekend story",
          "type": "audio_response",
          "duration_label": "3 min",
          "status": "completed",
          "order": 2
        },
        {
          "id": "les_003",
          "module_id": "mod_w1",
          "title": "Plans for tomorrow",
          "type": "speaking_drill",
          "duration_label": "5 min",
          "status": "available",
          "order": 3
        },
        {
          "id": "les_004",
          "module_id": "mod_w1",
          "title": "90-sec fluency drill",
          "type": "fluency_drill",
          "duration_label": "2 min",
          "status": "locked",
          "order": 4
        },
        {
          "id": "les_005",
          "module_id": "mod_w1",
          "title": "Week 1 conversation",
          "type": "conversation",
          "duration_label": "5 min",
          "status": "locked",
          "order": 5
        }
      ]
    },
    {
      "id": "mod_w2",
      "title": "Week 2 — Talk About Yesterday",
      "week_number": 2,
      "status": "locked",
      "lessons_completed": 0,
      "lessons_total": 5,
      "lessons": []
    },
    {
      "id": "mod_w3",
      "title": "Week 3 — Office Conversations",
      "week_number": 3,
      "status": "locked",
      "lessons_completed": 0,
      "lessons_total": 5,
      "lessons": []
    }
  ]
}
```

---

### 7.3 Get Lesson Details

Returns full lesson content for the lesson player screen.

**Screen**: Playing/Lesson

```
GET /v1/lessons/{lesson_id}
```

**Auth Required**: Yes

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `lesson_id` | string | Lesson ID (e.g., `"les_001"`) |

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "id": "les_001",
    "module_id": "mod_w1",
    "title": "Yesterday's activities",
    "type": "speaking_drill",
    "duration_label": "5 min",
    "status": "in_progress",
    "order": 1,
    "content": {
      "prompt_text": "Hi! I'm your AI English tutor. Let's start by recording a quick introduction.",
      "instructions": "Record yourself speaking for 60 seconds about your day.",
      "background_image_url": "https://cdn.fluently.app/lessons/les_001_bg.jpg"
    }
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 403 | `LESSON_LOCKED` | Lesson is locked. Complete prerequisites first. |
| 404 | `LESSON_NOT_FOUND` | Lesson does not exist |

---

### 7.4 Submit Lesson Audio

Uploads the user's audio recording for a lesson.

**Screen**: Playing/Lesson — recording controls

```
POST /v1/lessons/{lesson_id}/audio
```

**Auth Required**: Yes

**Content-Type**: `multipart/form-data`

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `lesson_id` | string | Lesson ID |

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | Audio file (WAV, M4A, MP3). Max 25 MB. |
| `duration_seconds` | number | Yes | Recording duration in seconds |

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_audio_xyz",
    "lesson_id": "les_001",
    "duration_seconds": 62,
    "feedback": {
      "pronunciation_score": 7.2,
      "fluency_score": 6.8,
      "grammar_score": 8.1,
      "overall_score": 7.4,
      "suggestions": [
        "Try to slow down when pronouncing longer words.",
        "Good use of past tense verbs!"
      ]
    },
    "xp_earned": 5
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_AUDIO_FORMAT` | Only WAV, M4A, and MP3 are accepted |
| 403 | `LESSON_LOCKED` | Lesson is locked |
| 413 | `FILE_TOO_LARGE` | Audio file exceeds 25 MB limit |

---

### 7.5 Complete Lesson

Marks a lesson as completed and unlocks the next lesson if applicable.

**Screen**: Playing/Lesson — "Next" button after recording submission

```
POST /v1/lessons/{lesson_id}/complete
```

**Auth Required**: Yes

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `lesson_id` | string | Lesson ID |

**Request Body**: None

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "lesson_id": "les_001",
    "status": "completed",
    "xp_earned": 5,
    "next_lesson": {
      "id": "les_002",
      "title": "Your weekend story",
      "status": "available"
    },
    "module_progress": {
      "lessons_completed": 3,
      "lessons_total": 5
    }
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `AUDIO_NOT_SUBMITTED` | Must submit audio before completing the lesson |
| 409 | `ALREADY_COMPLETED` | Lesson was already completed |

---

### 7.6 Get User Stats

Returns the user's learning statistics.

**Screen**: Playing/Lesson (XP, rating, language badges)

```
GET /v1/users/me/stats
```

**Auth Required**: Yes

**Response** `200 OK`: Returns the [UserStats](#userstats) object.

---

## 8. AI Tutor Chat

### 8.1 Get Chat Suggestions

Returns quick-help topic chips displayed at the top of the chat screen.

**Screen**: Ask to Tutor — "Grammar Help", "Speaking Practice", "Vocabulary" chips

```
GET /v1/chat/suggestions
```

**Auth Required**: Yes

**Response** `200 OK`:

```json
{
  "success": true,
  "data": [
    { "id": "sug_grammar", "label": "Grammar Help", "prompt": "Help me with English grammar" },
    { "id": "sug_speaking", "label": "Speaking Practice", "prompt": "Let's practice speaking English" },
    { "id": "sug_vocabulary", "label": "Vocabulary", "prompt": "Help me expand my English vocabulary" }
  ]
}
```

---

### 8.2 Get or Create Conversation

Returns the user's active conversation, or creates one if none exists.

```
POST /v1/chat/conversations
```

**Auth Required**: Yes

**Request Body**: None

**Response** `200 OK` (existing) or `201 Created` (new):

```json
{
  "success": true,
  "data": {
    "id": "conv_xyz",
    "user_id": "usr_abc123",
    "created_at": "2026-02-28T10:00:00Z",
    "last_message_at": "2026-02-28T10:05:00Z",
    "message_count": 4
  }
}
```

---

### 8.3 Get Conversation Messages

Returns paginated message history for a conversation.

**Screen**: Ask to Tutor — chat message list

```
GET /v1/chat/conversations/{conversation_id}/messages
```

**Auth Required**: Yes

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `conversation_id` | string | Conversation ID |

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 20 | Messages per page (1–100) |
| `cursor` | string | — | Pagination cursor (returns older messages) |

**Response** `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "id": "msg_001",
      "conversation_id": "conv_xyz",
      "role": "tutor",
      "content": "Hello! I'm your English tutor. How can I help you practice today? We could discuss travel, work, or hobbies!",
      "created_at": "2026-02-28T10:02:00Z"
    },
    {
      "id": "msg_002",
      "conversation_id": "conv_xyz",
      "role": "user",
      "content": "Can we practice some common phrases for traveling? I'm going to London next week!",
      "created_at": "2026-02-28T10:03:00Z"
    },
    {
      "id": "msg_003",
      "conversation_id": "conv_xyz",
      "role": "tutor",
      "content": "That's exciting! London is beautiful. Let's start with navigating public transport. Try saying: 'Where is the nearest Underground station?'",
      "created_at": "2026-02-28T10:03:05Z"
    }
  ],
  "pagination": {
    "next_cursor": null,
    "has_more": false
  }
}
```

---

### 8.4 Send Message

Sends a user message and receives the AI tutor's response.

**Screen**: Ask to Tutor — message input + send button

```
POST /v1/chat/conversations/{conversation_id}/messages
```

**Auth Required**: Yes

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `conversation_id` | string | Conversation ID |

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | User's message text (max 2000 chars) |

```json
{
  "content": "Can we practice some common phrases for traveling? I'm going to London next week!"
}
```

**Response** `201 Created`:

```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "msg_002",
      "conversation_id": "conv_xyz",
      "role": "user",
      "content": "Can we practice some common phrases for traveling? I'm going to London next week!",
      "created_at": "2026-02-28T10:03:00Z"
    },
    "tutor_message": {
      "id": "msg_003",
      "conversation_id": "conv_xyz",
      "role": "tutor",
      "content": "That's exciting! London is beautiful. Let's start with navigating public transport. Try saying: 'Where is the nearest Underground station?'",
      "created_at": "2026-02-28T10:03:05Z"
    }
  }
}
```

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `EMPTY_MESSAGE` | Message content is empty |
| 400 | `MESSAGE_TOO_LONG` | Message exceeds 2000 characters |
| 404 | `CONVERSATION_NOT_FOUND` | Conversation does not exist |
| 429 | `CHAT_RATE_LIMITED` | Too many messages. Wait before sending again. |

---

### 8.5 Stream Tutor Response (SSE)

Streams the AI tutor's response in real-time using Server-Sent Events. Use this instead of 8.4 when you want to display the response incrementally as it is generated.

**Screen**: Ask to Tutor — real-time typing indicator

```
POST /v1/chat/conversations/{conversation_id}/stream
```

**Auth Required**: Yes (Bearer token in header)

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | User's message text |

**Response**: `200 OK` with `Content-Type: text/event-stream`

```
event: message_start
data: {"user_message_id": "msg_002", "tutor_message_id": "msg_003"}

event: delta
data: {"text": "That's exciting! "}

event: delta
data: {"text": "London is beautiful. "}

event: delta
data: {"text": "Let's start with navigating public transport. "}

event: delta
data: {"text": "Try saying: 'Where is the nearest Underground station?'"}

event: message_end
data: {"tutor_message_id": "msg_003", "finish_reason": "complete"}
```

**Event Types**:

| Event | Description |
|---|---|
| `message_start` | Stream begins. Contains message IDs. |
| `delta` | Incremental text chunk. |
| `message_end` | Stream complete. Contains final message ID and finish reason. |
| `error` | An error occurred during generation. |

---

## 9. Settings

### 9.1 Get Settings

Returns the user's app settings.

**Screen**: Settings

```
GET /v1/settings
```

**Auth Required**: Yes

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "language": "en",
    "available_languages": [
      { "code": "en", "name": "English" },
      { "code": "hi", "name": "Hindi" }
    ],
    "notifications_enabled": true,
    "daily_reminder_time": "09:00"
  }
}
```

---

### 9.2 Update Settings

Updates one or more settings. Supports partial updates.

**Screen**: Settings — Language selector

```
PATCH /v1/settings
```

**Auth Required**: Yes

**Request Body** (all fields optional):

| Field | Type | Description |
|---|---|---|
| `language` | string | Language code (e.g., `"en"`, `"hi"`) |
| `notifications_enabled` | boolean | Enable/disable push notifications |
| `daily_reminder_time` | string | Time in HH:MM format (24h) |

```json
{
  "language": "hi"
}
```

**Response** `200 OK`: Returns the full settings object (same as 9.1).

**Errors**:

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_LANGUAGE` | Language code is not supported |
| 400 | `INVALID_TIME_FORMAT` | Time must be in HH:MM 24-hour format |

---

## 10. Static Content

These endpoints return legal and support content displayed in the Profile menu.

### 10.1 Get Privacy Policy

**Screen**: Profile — "Privacy Policy" menu item

```
GET /v1/content/privacy-policy
```

**Auth Required**: No

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "title": "Privacy Policy",
    "content_html": "<h1>Privacy Policy</h1><p>...</p>",
    "last_updated": "2026-01-15"
  }
}
```

---

### 10.2 Get Terms & Conditions

**Screen**: Profile — "Term & Conditions" menu item, Login — terms link

```
GET /v1/content/terms-and-conditions
```

**Auth Required**: No

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "title": "Terms & Conditions",
    "content_html": "<h1>Terms & Conditions</h1><p>...</p>",
    "last_updated": "2026-01-15"
  }
}
```

---

### 10.3 Get Refund Policy

**Screen**: Profile — "Prizing Refund Policy" menu item

```
GET /v1/content/refund-policy
```

**Auth Required**: No

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "title": "Pricing & Refund Policy",
    "content_html": "<h1>Pricing & Refund Policy</h1><p>...</p>",
    "last_updated": "2026-01-15"
  }
}
```

---

### 10.4 Get Help & Support

**Screen**: Profile — "Help & Support" menu item

```
GET /v1/content/help-support
```

**Auth Required**: No

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "title": "Help & Support",
    "content_html": "<h1>Help & Support</h1><p>...</p>",
    "support_email": "support@fluently.app",
    "last_updated": "2026-01-15"
  }
}
```

---

## 11. Error Handling

### Error Response Format

All errors return a consistent JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "The OTP you entered is incorrect. Please try again.",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-02-28T10:00:00Z"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `error.code` | string | Machine-readable error code (UPPER_SNAKE_CASE) |
| `error.message` | string | Human-readable error description |
| `error.details` | object | Additional context (optional, varies by error) |

### Common HTTP Status Codes

| Status | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful read/update |
| 201 | Created | Successful resource creation |
| 400 | Bad Request | Validation errors, malformed input |
| 401 | Unauthorized | Missing or invalid access token |
| 403 | Forbidden | Valid token but insufficient permissions (e.g., locked lesson, premium-only feature) |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate action (e.g., trial already used, already subscribed) |
| 410 | Gone | Resource expired (e.g., OTP expired) |
| 413 | Payload Too Large | File upload exceeds size limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Common Error Codes Reference

| Code | Status | Description |
|---|---|---|
| `INVALID_PHONE` | 400 | Phone number format is invalid |
| `INVALID_OTP` | 400 | OTP code is incorrect |
| `OTP_EXPIRED` | 410 | OTP has expired |
| `OTP_RATE_LIMITED` | 429 | Too many OTP requests |
| `RESEND_COOLDOWN` | 429 | Must wait before resending OTP |
| `TOO_MANY_ATTEMPTS` | 429 | Too many failed verification attempts |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token is invalid or revoked |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `UNAUTHORIZED` | 401 | Missing or invalid authorization header |
| `INVALID_EMAIL` | 400 | Email format is invalid |
| `NAME_TOO_LONG` | 400 | Name exceeds 100 characters |
| `INVALID_FILE_TYPE` | 400 | Unsupported file format |
| `FILE_TOO_LARGE` | 413 | File exceeds size limit |
| `INVALID_ANSWER` | 400 | Questionnaire answer value is invalid |
| `ALREADY_COMPLETED` | 409 | Questionnaire already submitted |
| `PLAN_NOT_FOUND` | 404 | No personalized plan exists |
| `INVALID_PLAN` | 400 | Subscription plan ID is invalid |
| `TRIAL_ALREADY_USED` | 409 | Trial has already been activated |
| `ACTIVE_SUBSCRIPTION` | 409 | User already has an active subscription |
| `NO_ACTIVE_SUBSCRIPTION` | 404 | No active subscription found |
| `ALREADY_CANCELLED` | 409 | Subscription is already cancelled |
| `NO_INVOICE` | 404 | No invoices available |
| `LESSON_LOCKED` | 403 | Lesson is locked; complete prerequisites |
| `LESSON_NOT_FOUND` | 404 | Lesson does not exist |
| `INVALID_AUDIO_FORMAT` | 400 | Unsupported audio format |
| `AUDIO_NOT_SUBMITTED` | 400 | Audio not yet submitted for this lesson |
| `EMPTY_MESSAGE` | 400 | Chat message content is empty |
| `MESSAGE_TOO_LONG` | 400 | Chat message exceeds 2000 characters |
| `CONVERSATION_NOT_FOUND` | 404 | Chat conversation does not exist |
| `CHAT_RATE_LIMITED` | 429 | Too many chat messages sent |
| `INVALID_LANGUAGE` | 400 | Unsupported language code |
| `INVALID_TIME_FORMAT` | 400 | Time format is not HH:MM |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Rate Limiting

Rate-limited responses include a `Retry-After` header:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "OTP_RATE_LIMITED",
    "message": "Too many OTP requests. Please try again in 30 seconds.",
    "details": {
      "retry_after": 30
    }
  }
}
```

---

## Appendix: Screen-to-Endpoint Quick Reference

| # | Screen | Method | Endpoint |
|---|---|---|---|
| 1 | Splash | — | No API call |
| 2 | Onboarding 1–3 | — | No API call |
| 3 | Login (Phone) | POST | `/v1/auth/otp/send` |
| 4 | Login (OTP Verify) | POST | `/v1/auth/otp/verify` |
| 4 | Login (OTP Verify) | POST | `/v1/auth/otp/resend` |
| 5 | Questionnaire Intro | — | No API call |
| 6 | Questionnaire 1–4 | POST | `/v1/onboarding/questionnaire` |
| 7 | Enter Name | PATCH | `/v1/users/me` |
| 8 | Trial | GET | `/v1/subscriptions/plans` |
| 8 | Trial | POST | `/v1/subscriptions/trial` |
| 9 | Paywall | GET | `/v1/users/me/personalized-plan` |
| 9 | Paywall | GET | `/v1/subscriptions/plans` |
| 9 | Paywall | POST | `/v1/subscriptions` |
| 10 | Home | GET | `/v1/users/me/dashboard` |
| 10 | Home | GET | `/v1/modules` |
| 11 | Ask to Tutor | POST | `/v1/chat/conversations` |
| 11 | Ask to Tutor | GET | `/v1/chat/conversations/{id}/messages` |
| 11 | Ask to Tutor | POST | `/v1/chat/conversations/{id}/messages` |
| 11 | Ask to Tutor | POST | `/v1/chat/conversations/{id}/stream` |
| 11 | Ask to Tutor | GET | `/v1/chat/suggestions` |
| 12 | Lesson Player | GET | `/v1/lessons/{id}` |
| 12 | Lesson Player | POST | `/v1/lessons/{id}/audio` |
| 12 | Lesson Player | POST | `/v1/lessons/{id}/complete` |
| 12 | Lesson Player | GET | `/v1/users/me/stats` |
| 13 | Profile | GET | `/v1/users/me` |
| 14 | Profile Edit | PATCH | `/v1/users/me` |
| 15 | Upload Photo | POST | `/v1/users/me/avatar` |
| 16 | Settings | GET | `/v1/settings` |
| 16 | Settings | PATCH | `/v1/settings` |
| 17 | Profile (links) | GET | `/v1/content/privacy-policy` |
| 17 | Profile (links) | GET | `/v1/content/terms-and-conditions` |
| 17 | Profile (links) | GET | `/v1/content/refund-policy` |
| 17 | Profile (links) | GET | `/v1/content/help-support` |
