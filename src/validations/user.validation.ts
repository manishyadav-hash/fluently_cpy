import { z } from "zod";
import type { ValidationConfig } from "../middleware/validate";

const NAME_TOO_LONG_MESSAGE = "Name exceeds 100 characters";
const INVALID_EMAIL_MESSAGE = "Email format is invalid";
const EMPTY_PROFILE_UPDATE_MESSAGE = "At least one field must be provided";

export const updateProfileSchema = z.object({
  name: z.string({
    invalid_type_error: NAME_TOO_LONG_MESSAGE,
  }).max(100, NAME_TOO_LONG_MESSAGE).optional(),
  email: z.string({
    invalid_type_error: INVALID_EMAIL_MESSAGE,
  }).email(INVALID_EMAIL_MESSAGE).optional(),
}).refine(data => data.name !== undefined || data.email !== undefined, {
  message: EMPTY_PROFILE_UPDATE_MESSAGE,
});

export const updateProfileValidation = {
  fields: {
    name: {
      code: "NAME_TOO_LONG",
      message: NAME_TOO_LONG_MESSAGE,
    },
    email: {
      code: "INVALID_EMAIL",
      message: INVALID_EMAIL_MESSAGE,
    },
  },
  form: {
    code: "VALIDATION_ERROR",
    message: EMPTY_PROFILE_UPDATE_MESSAGE,
  },
} satisfies ValidationConfig;
