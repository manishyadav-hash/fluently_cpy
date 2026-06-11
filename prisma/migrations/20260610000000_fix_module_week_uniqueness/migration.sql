-- Drop the old global unique constraint on module week_no
DROP INDEX IF EXISTS "modules_week_no_key";

-- Add per-course uniqueness for module week numbers
CREATE UNIQUE INDEX "modules_course_id_week_no_key" ON "modules"("course_id", "week_no");
