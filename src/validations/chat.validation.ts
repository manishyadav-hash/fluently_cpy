import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ErrorCodes } from "../errors/error-codes";
import { sendError } from "../utils/response";

const EMPTY_MESSAGE_TEXT = "Message content is required";
const MESSAGE_TOO_LONG_TEXT = "Message exceeds 2000 characters";

const chatContentSchema = z.object({
  content: z.string({
    invalid_type_error: EMPTY_MESSAGE_TEXT,
    required_error: EMPTY_MESSAGE_TEXT,
  }).trim().min(1, EMPTY_MESSAGE_TEXT).max(2000, MESSAGE_TOO_LONG_TEXT),
});

export function validateChatMessageContent(req: Request, res: Response, next: NextFunction) {
  const result = chatContentSchema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const code = issue?.code === "too_big" ? ErrorCodes.MESSAGE_TOO_LONG : ErrorCodes.EMPTY_MESSAGE;
    const message = code === ErrorCodes.MESSAGE_TOO_LONG ? MESSAGE_TOO_LONG_TEXT : EMPTY_MESSAGE_TEXT;

    return sendError(res, 400, {
      code,
      message,
      details: {
        field_errors: {
          content: [message],
        },
        form_errors: [],
      },
    });
  }

  req.body = result.data;
  next();
}
