import { z } from "zod";
import { ErrorCodes } from "../errors/error-codes";
import type { ValidationConfig } from "../middleware/validate";

const INVALID_LANGUAGE_MESSAGE = "Language code is not supported";
const INVALID_TIME_FORMAT_MESSAGE = "Time must be in HH:MM 24-hour format";

export const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
] as const;

const supportedLanguageCodes = AVAILABLE_LANGUAGES.map(language => language.code) as [string, ...string[]];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateSettingsSchema = z.object({
  language: z.enum(supportedLanguageCodes, {
    message: INVALID_LANGUAGE_MESSAGE,
  }).optional(),
  notifications_enabled: z.boolean().optional(),
  daily_reminder_time: z.string().regex(timePattern, INVALID_TIME_FORMAT_MESSAGE).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const updateSettingsValidation = {
  fields: {
    language: {
      code: ErrorCodes.INVALID_LANGUAGE,
      message: INVALID_LANGUAGE_MESSAGE,
    },
    daily_reminder_time: {
      code: ErrorCodes.INVALID_TIME_FORMAT,
      message: INVALID_TIME_FORMAT_MESSAGE,
    },
  },
} satisfies ValidationConfig;
