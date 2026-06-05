import { z } from "zod";
import { ErrorCodes } from "../errors/error-codes";
import type { ValidationConfig } from "../middleware/validate";

const INVALID_PLAN_MESSAGE = "Plan ID does not exist.";

export const createSubscriptionSchema = z.object({
  plan_id: z.string({
    required_error: INVALID_PLAN_MESSAGE,
    invalid_type_error: INVALID_PLAN_MESSAGE,
  }).min(1, INVALID_PLAN_MESSAGE),
});

export const createSubscriptionValidation = {
  fields: {
    plan_id: {
      code: ErrorCodes.INVALID_PLAN,
      message: INVALID_PLAN_MESSAGE,
    },
  },
} satisfies ValidationConfig;
