import { z } from "zod";
import type { ValidationConfig } from "../middleware/validate";

const INVALID_ANSWER_MESSAGE = "One or more answers have invalid values";

export const submitQuestionnaireSchema = z.object({
  learning_goal: z.enum(
    ["crack_interviews", "speak_confidently", "office_communication", "daily_conversations"],
    { message: INVALID_ANSWER_MESSAGE },
  ),
  speaking_challenge: z.enum(
    ["freeze_while_speaking", "translate_in_mind", "words_dont_come", "fear_mistakes"],
    { message: INVALID_ANSWER_MESSAGE },
  ),
  thirty_day_goal: z.enum(
    ["clear_interviews", "speak_without_hesitation", "sound_confident", "daily_conversations"],
    { message: INVALID_ANSWER_MESSAGE },
  ),
  daily_practice_minutes: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)], {
    message: INVALID_ANSWER_MESSAGE,
  }),
});

export const submitQuestionnaireValidation = {
  fields: {
    learning_goal: {
      code: "INVALID_ANSWER",
      message: INVALID_ANSWER_MESSAGE,
    },
    speaking_challenge: {
      code: "INVALID_ANSWER",
      message: INVALID_ANSWER_MESSAGE,
    },
    thirty_day_goal: {
      code: "INVALID_ANSWER",
      message: INVALID_ANSWER_MESSAGE,
    },
    daily_practice_minutes: {
      code: "INVALID_ANSWER",
      message: INVALID_ANSWER_MESSAGE,
    },
  },
  form: {
    code: "INVALID_ANSWER",
    message: INVALID_ANSWER_MESSAGE,
  },
} satisfies ValidationConfig;
