ALTER TABLE "week_lessons"
ADD COLUMN "content_blocks" JSONB;

UPDATE "week_lessons" AS wl
SET "content_blocks" = l."content_blocks"
FROM "lessons" AS l
WHERE wl."lesson_id" = l."id"
  AND wl."content_blocks" IS NULL;
