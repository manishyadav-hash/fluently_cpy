CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "week_lessons" ("id", "week_id", "lesson_id", "lesson_order", "created_at")
SELECT gen_random_uuid(), "week_id", "id", "lesson_order", CURRENT_TIMESTAMP
FROM "lessons" l
WHERE NOT EXISTS (
  SELECT 1
  FROM "week_lessons" wl
  WHERE wl."lesson_id" = l."id"
);

ALTER TABLE "lessons" DROP CONSTRAINT IF EXISTS "lessons_week_id_lesson_order_key";
ALTER TABLE "lessons" DROP CONSTRAINT IF EXISTS "lessons_week_id_fkey";
ALTER TABLE "lessons" DROP COLUMN IF EXISTS "week_id";
ALTER TABLE "lessons" DROP COLUMN IF EXISTS "lesson_order";

CREATE UNIQUE INDEX IF NOT EXISTS "week_lessons_lesson_id_key"
ON "week_lessons" ("lesson_id");

CREATE UNIQUE INDEX IF NOT EXISTS "week_lessons_week_id_lesson_order_key"
ON "week_lessons" ("week_id", "lesson_order");
