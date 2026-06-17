-- AlterEnum
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'in_review' AFTER 'draft';
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'archived' AFTER 'published';
