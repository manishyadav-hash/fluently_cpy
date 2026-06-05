import { Request, Response, NextFunction } from "express";
import { ZodIssue, ZodSchema } from "zod";
import { ErrorCodes } from "../errors/error-codes";
import { sendError } from "../utils/response";

interface ValidationErrorMetadata {
  code: string;
  message: string;
}

export interface ValidationConfig {
  fields?: Record<string, ValidationErrorMetadata>;
  form?: ValidationErrorMetadata;
}

function selectValidationError(issues: ZodIssue[], config?: ValidationConfig): ValidationErrorMetadata {
  for (const issue of issues) {
    if (issue.path.length === 0) {
      continue;
    }

    const field = String(issue.path[0]);
    const mappedFieldError = config?.fields?.[field];
    if (mappedFieldError) {
      return mappedFieldError;
    }
  }

  const hasFormIssue = issues.some(issue => issue.path.length === 0);
  if (hasFormIssue && config?.form) {
    return config.form;
  }

  return {
    code: ErrorCodes.VALIDATION_ERROR,
    message: issues[0]?.message || "Validation failed",
  };
}

export function validate(schema: ZodSchema, config?: ValidationConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const flattened = result.error.flatten();
      const primaryError = selectValidationError(result.error.issues, config);

      return sendError(res, 400, {
        code: primaryError.code,
        message: primaryError.message,
        details: {
          field_errors: flattened.fieldErrors,
          form_errors: flattened.formErrors,
        },
      });
    }

    req.body = result.data;
    next();
  };
}
