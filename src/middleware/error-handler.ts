import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { sendError, sendInternalError } from "../utils/response";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(
      res,
      err.statusCode,
      {
        code: err.code || ErrorCodes.INTERNAL_ERROR,
        message: err.message,
        details: err.details,
      },
      err.headers,
    );
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 413, {
        code: ErrorCodes.FILE_TOO_LARGE,
        message: "File exceeds 5 MB limit",
      });
    }
  }

  console.error(err);
  return sendInternalError(res);
}
