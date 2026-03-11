import { Response } from "express";
import { ErrorCodes } from "../errors/error-codes";

interface ErrorEnvelopeInput {
  code: string;
  details?: unknown;
  message: string;
}

function buildMeta() {
  return {
    timestamp: new Date().toISOString(),
  };
}

export function sendError(
  res: Response,
  statusCode: number,
  error: ErrorEnvelopeInput,
  headers?: Record<string, string>,
) {
  for (const [key, value] of Object.entries(headers ?? {})) {
    res.setHeader(key, value);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
    meta: buildMeta(),
  });
}

export function sendSuccess(res: Response, data: unknown, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: buildMeta(),
  });
}

export function sendPaginatedSuccess(
  res: Response,
  data: unknown,
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
  },
  statusCode: number = 200,
) {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination,
    meta: buildMeta(),
  });
}

export function sendInternalError(res: Response) {
  return sendError(res, 500, {
    code: ErrorCodes.INTERNAL_ERROR,
    message: "Internal server error",
  });
}
