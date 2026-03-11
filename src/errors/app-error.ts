import type { ErrorCode } from "./error-codes";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: ErrorCode | string,
    public details?: unknown,
    public headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
