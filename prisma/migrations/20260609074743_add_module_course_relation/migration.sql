/*
  Warnings:

  - Added the required column `course_id` to the `modules` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "CourseAudience" AS ENUM ('student', 'college_student', 'job_seeker', 'working_professional', 'business_professional', 'general_learner');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "LessonLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "lesson_level" "LessonLevel" NOT NULL DEFAULT 'beginner';

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "course_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "level" "CourseLevel" NOT NULL DEFAULT 'beginner',
    "audience" "CourseAudience" NOT NULL DEFAULT 'general_learner',
    "duration_weeks" INTEGER NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weeks" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "week_no" INTEGER NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "week_lessons" (
    "id" UUID NOT NULL,
    "week_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "lesson_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "week_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weeks_course_id_week_no_key" ON "weeks"("course_id", "week_no");

-- CreateIndex
CREATE UNIQUE INDEX "week_lessons_week_id_lesson_id_key" ON "week_lessons"("week_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "week_lessons_week_id_lesson_order_key" ON "week_lessons"("week_id", "lesson_order");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_lessons" ADD CONSTRAINT "week_lessons_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_lessons" ADD CONSTRAINT "week_lessons_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
