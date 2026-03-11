import { z } from "zod";

const DURATION_MESSAGE = "duration_seconds must be a positive number";

export const submitLessonAudioSchema = z.object({
  duration_seconds: z.coerce.number({
    invalid_type_error: DURATION_MESSAGE,
    required_error: DURATION_MESSAGE,
  }).positive(DURATION_MESSAGE),
});
