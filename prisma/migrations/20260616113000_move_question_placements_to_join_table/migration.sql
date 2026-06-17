CREATE TABLE IF NOT EXISTS "week_lesson_questions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "week_lesson_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "question_order" integer NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "week_lesson_questions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "week_lesson_questions" (
  "id",
  "week_lesson_id",
  "question_id",
  "question_order",
  "created_at"
)
SELECT
  gen_random_uuid(),
  "week_lesson_id",
  "id",
  "question_order",
  "created_at"
FROM "questions"
WHERE "week_lesson_id" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_week_lesson_id_question_order_key";
DROP INDEX IF EXISTS "questions_week_lesson_id_question_order_key";
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_week_lesson_id_fkey";
ALTER TABLE "questions" DROP COLUMN IF EXISTS "week_lesson_id";

CREATE UNIQUE INDEX IF NOT EXISTS "week_lesson_questions_week_lesson_id_question_id_key"
ON "week_lesson_questions" ("week_lesson_id", "question_id");

CREATE UNIQUE INDEX IF NOT EXISTS "week_lesson_questions_week_lesson_id_question_order_key"
ON "week_lesson_questions" ("week_lesson_id", "question_order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'week_lesson_questions_week_lesson_id_fkey'
  ) THEN
    ALTER TABLE "week_lesson_questions"
    ADD CONSTRAINT "week_lesson_questions_week_lesson_id_fkey"
    FOREIGN KEY ("week_lesson_id") REFERENCES "week_lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'week_lesson_questions_question_id_fkey'
  ) THEN
    ALTER TABLE "week_lesson_questions"
    ADD CONSTRAINT "week_lesson_questions_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
