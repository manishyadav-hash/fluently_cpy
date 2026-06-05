/*
  Warnings:

  - You are about to drop the `lesson_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "lesson_progress" DROP CONSTRAINT "lesson_progress_lesson_id_fkey";

-- DropTable
DROP TABLE "lesson_progress";
