import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";

interface CursorPayload {
  created_at: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as Partial<CursorPayload>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.created_at !== "string" ||
      Number.isNaN(Date.parse(parsed.created_at))
    ) {
      throw new Error("invalid cursor");
    }

    return {
      created_at: parsed.created_at,
      id: parsed.id,
    };
  } catch {
    throw new AppError("Cursor is invalid.", 400, ErrorCodes.VALIDATION_ERROR, {
      field_errors: {
        cursor: ["Cursor is invalid."],
      },
      form_errors: [],
    });
  }
}
