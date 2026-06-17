CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "week_lesson_id" uuid;

WITH ranked_placements AS (
  SELECT
    id,
    lesson_id,
    row_number() OVER (PARTITION BY lesson_id ORDER BY created_at ASC, id ASC) AS placement_rank
  FROM "week_lessons"
)
UPDATE "questions" q
SET "week_lesson_id" = rp.id
FROM ranked_placements rp
WHERE q."lesson_id" = rp."lesson_id"
  AND rp.placement_rank = 1
  AND q."week_lesson_id" IS NULL;

CREATE TEMP TABLE "_question_clone_map" ON COMMIT DROP AS
WITH first_placements AS (
  SELECT DISTINCT ON (lesson_id) id, lesson_id
  FROM "week_lessons"
  ORDER BY lesson_id, created_at ASC, id ASC
),
extra_placements AS (
  SELECT wl.id, wl.lesson_id
  FROM "week_lessons" wl
  JOIN first_placements fp ON fp.lesson_id = wl.lesson_id
  WHERE wl.id <> fp.id
)
SELECT
  q.id AS old_question_id,
  gen_random_uuid() AS new_question_id,
  ep.id AS week_lesson_id
FROM "questions" q
JOIN first_placements fp ON fp.id = q."week_lesson_id"
JOIN extra_placements ep ON ep.lesson_id = fp.lesson_id;

INSERT INTO "questions" (
  "id",
  "week_lesson_id",
  "question_type",
  "question",
  "audio_url",
  "image_url",
  "correct_answer",
  "question_order",
  "created_at"
)
SELECT
  qcm.new_question_id,
  qcm.week_lesson_id,
  q."question_type",
  q."question",
  q."audio_url",
  q."image_url",
  q."correct_answer",
  q."question_order",
  CURRENT_TIMESTAMP
FROM "_question_clone_map" qcm
JOIN "questions" q ON q.id = qcm.old_question_id;

INSERT INTO "question_options" (
  "id",
  "question_id",
  "option_text",
  "is_correct"
)
SELECT
  gen_random_uuid(),
  qcm.new_question_id,
  qo."option_text",
  qo."is_correct"
FROM "_question_clone_map" qcm
JOIN "question_options" qo ON qo."question_id" = qcm.old_question_id;

ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_lesson_id_question_order_key";
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_lesson_id_fkey";
ALTER TABLE "questions" DROP COLUMN IF EXISTS "lesson_id";

ALTER TABLE "questions" ALTER COLUMN "week_lesson_id" SET NOT NULL;

ALTER TABLE "questions"
ADD CONSTRAINT "questions_week_lesson_id_fkey"
FOREIGN KEY ("week_lesson_id") REFERENCES "week_lessons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "questions_week_lesson_id_question_order_key"
ON "questions" ("week_lesson_id", "question_order");
