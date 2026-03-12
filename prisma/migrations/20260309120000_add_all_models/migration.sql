-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('none', 'trial', 'active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('month', 'year');

-- CreateEnum
CREATE TYPE "SubscriptionSubStatus" AS ENUM ('trial', 'active', 'expired', 'cancelled', 'pending');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('speaking_drill', 'audio_response', 'fluency_drill', 'conversation');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('locked', 'available', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('crack_interviews', 'speak_confidently', 'office_communication', 'daily_conversations');

-- CreateEnum
CREATE TYPE "SpeakingChallenge" AS ENUM ('freeze_while_speaking', 'translate_in_mind', 'words_dont_come', 'fear_mistakes');

-- CreateEnum
CREATE TYPE "ThirtyDayGoal" AS ENUM ('clear_interviews', 'speak_without_hesitation', 'sound_confident', 'daily_conversations');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'tutor');

-- AlterTable: extend User with new fields
ALTER TABLE "User"
    ADD COLUMN "name"               TEXT,
    ADD COLUMN "email"              TEXT,
    ADD COLUMN "avatarUrl"          TEXT,
    ADD COLUMN "isOnboarded"        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'none',
    ADD COLUMN "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateUniqueIndex on User.email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable: add optional userId FK to Otp
ALTER TABLE "Otp"
    ADD COLUMN "userId" TEXT;

-- AddForeignKey Otp -> User
ALTER TABLE "Otp"
    ADD CONSTRAINT "Otp_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: RefreshToken
CREATE TABLE "RefreshToken" (
    "id"        TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: QuestionnaireAnswers
CREATE TABLE "QuestionnaireAnswers" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "learningGoal"         "LearningGoal" NOT NULL,
    "speakingChallenge"    "SpeakingChallenge" NOT NULL,
    "thirtyDayGoal"        "ThirtyDayGoal" NOT NULL,
    "dailyPracticeMinutes" INTEGER NOT NULL,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireAnswers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionnaireAnswers_userId_key" ON "QuestionnaireAnswers"("userId");

ALTER TABLE "QuestionnaireAnswers"
    ADD CONSTRAINT "QuestionnaireAnswers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Module
CREATE TABLE "Module" (
    "id"         TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Module_weekNumber_key" ON "Module"("weekNumber");

-- CreateTable: Lesson
CREATE TABLE "Lesson" (
    "id"                 TEXT NOT NULL,
    "moduleId"           TEXT NOT NULL,
    "title"              TEXT NOT NULL,
    "type"               "LessonType" NOT NULL,
    "durationLabel"      TEXT NOT NULL,
    "order"              INTEGER NOT NULL,
    "promptText"         TEXT,
    "instructions"       TEXT,
    "backgroundImageUrl" TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lesson_moduleId_order_key" ON "Lesson"("moduleId", "order");
CREATE INDEX "Lesson_moduleId_idx" ON "Lesson"("moduleId");

ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "Module"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UserLessonProgress
CREATE TABLE "UserLessonProgress" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "lessonId"       TEXT NOT NULL,
    "status"         "LessonStatus" NOT NULL DEFAULT 'locked',
    "audioSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLessonProgress_userId_lessonId_key" ON "UserLessonProgress"("userId", "lessonId");
CREATE INDEX "UserLessonProgress_userId_idx" ON "UserLessonProgress"("userId");

ALTER TABLE "UserLessonProgress"
    ADD CONSTRAINT "UserLessonProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLessonProgress"
    ADD CONSTRAINT "UserLessonProgress_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: LessonAudioSubmission
CREATE TABLE "LessonAudioSubmission" (
    "id"                   TEXT NOT NULL,
    "userLessonProgressId" TEXT NOT NULL,
    "durationSeconds"      DOUBLE PRECISION NOT NULL,
    "pronunciationScore"   DOUBLE PRECISION,
    "fluencyScore"         DOUBLE PRECISION,
    "grammarScore"         DOUBLE PRECISION,
    "overallScore"         DOUBLE PRECISION,
    "suggestions"          TEXT[],
    "xpEarned"             INTEGER NOT NULL DEFAULT 0,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonAudioSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LessonAudioSubmission_userLessonProgressId_idx" ON "LessonAudioSubmission"("userLessonProgressId");

ALTER TABLE "LessonAudioSubmission"
    ADD CONSTRAINT "LessonAudioSubmission_userLessonProgressId_fkey"
    FOREIGN KEY ("userLessonProgressId") REFERENCES "UserLessonProgress"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UserStats
CREATE TABLE "UserStats" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "xp"                   INTEGER NOT NULL DEFAULT 0,
    "rating"               DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStreakDays"    INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate"     TIMESTAMP(3),
    "lessonsCompleted"     INTEGER NOT NULL DEFAULT 0,
    "totalPracticeMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

ALTER TABLE "UserStats"
    ADD CONSTRAINT "UserStats_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SubscriptionPlan
CREATE TABLE "SubscriptionPlan" (
    "id"                TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "interval"          "SubscriptionInterval" NOT NULL,
    "priceAmount"       INTEGER NOT NULL,
    "priceCurrency"     TEXT NOT NULL DEFAULT 'INR',
    "monthlyEquivalent" INTEGER,
    "badge"             TEXT DEFAULT '',
    "description"       TEXT,
    "isActive"          BOOLEAN NOT NULL DEFAULT true,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Subscription
CREATE TABLE "Subscription" (
    "id"                 TEXT NOT NULL,
    "userId"             TEXT NOT NULL,
    "planId"             TEXT,
    "status"             "SubscriptionSubStatus" NOT NULL,
    "trialEndDate"       TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd"   TIMESTAMP(3),
    "cancelAtPeriodEnd"  BOOLEAN NOT NULL DEFAULT false,
    "paymentUrl"         TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: Conversation
CREATE TABLE "Conversation" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "messageCount"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ChatMessage
CREATE TABLE "ChatMessage" (
    "id"             TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role"           "MessageRole" NOT NULL,
    "content"        TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UserSettings
CREATE TABLE "UserSettings" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "language"             TEXT NOT NULL DEFAULT 'en',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyReminderTime"    TEXT NOT NULL DEFAULT '09:00',
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

ALTER TABLE "UserSettings"
    ADD CONSTRAINT "UserSettings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: SubscriptionPlan static data
INSERT INTO "SubscriptionPlan" ("id", "name", "interval", "priceAmount", "priceCurrency", "monthlyEquivalent", "badge", "description", "isActive")
VALUES
    ('plan_yearly',  'Yearly Plan',  'year',  799, 'INR', 67,  'BEST FOR YOUR GOAL',       NULL,                              true),
    ('plan_monthly', 'Monthly Plan', 'month', 199, 'INR', 199, NULL,                        'Matches your 20-min daily plan', true);
