DROP INDEX IF EXISTS "week_lessons_lesson_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "week_lessons_week_id_lesson_id_key"
ON "week_lessons" ("week_id", "lesson_id");
