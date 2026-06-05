-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('speaking', 'audio', 'quiz', 'match', 'reading', 'writing', 'mixed');

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "lesson_type" "LessonType" NOT NULL DEFAULT 'mixed';
