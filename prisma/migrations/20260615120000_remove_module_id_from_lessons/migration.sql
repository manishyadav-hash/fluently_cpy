-- Drop the legacy module-based lesson relation so lessons are owned by weeks only.
ALTER TABLE "lessons" DROP CONSTRAINT IF EXISTS "lessons_module_id_fkey";

DROP INDEX IF EXISTS "lessons_module_id_lesson_order_key";

ALTER TABLE "lessons" DROP COLUMN IF EXISTS "module_id";
