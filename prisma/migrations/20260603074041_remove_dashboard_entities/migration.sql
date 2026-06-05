/*
  Warnings:

  - You are about to drop the column `learner_id` on the `lesson_progress` table. All the data in the column will be lost.
  - You are about to drop the column `learner_id` on the `question_attempts` table. All the data in the column will be lost.
  - You are about to drop the `learners` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_subscriptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "lesson_progress" DROP CONSTRAINT "lesson_progress_learner_id_fkey";

-- DropForeignKey
ALTER TABLE "question_attempts" DROP CONSTRAINT "question_attempts_learner_id_fkey";

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_learner_id_fkey";

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_plan_id_fkey";

-- DropIndex
DROP INDEX "lesson_progress_learner_id_lesson_id_key";

-- AlterTable
ALTER TABLE "lesson_progress" DROP COLUMN "learner_id";

-- AlterTable
ALTER TABLE "question_attempts" DROP COLUMN "learner_id";

-- DropTable
DROP TABLE "learners";

-- DropTable
DROP TABLE "subscription_plans";

-- DropTable
DROP TABLE "user_subscriptions";

-- DropEnum
DROP TYPE "LearnerStatus";

-- DropEnum
DROP TYPE "SubscriptionStatus";
