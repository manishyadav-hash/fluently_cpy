import { z } from "zod";
import { ErrorCodes } from "../errors/error-codes";
import type { ValidationConfig } from "../middleware/validate";

const INVALID_PHONE_MESSAGE = "Phone number format is invalid";
const INVALID_OTP_MESSAGE = "OTP code is incorrect";
const INVALID_REFRESH_TOKEN_MESSAGE = "Refresh token is invalid or revoked.";

const phoneSchema = z.string({
  required_error: INVALID_PHONE_MESSAGE,
  invalid_type_error: INVALID_PHONE_MESSAGE,
}).regex(/^\+[1-9]\d{7,14}$/, INVALID_PHONE_MESSAGE);

const otpCodeSchema = z.string({
  required_error: INVALID_OTP_MESSAGE,
  invalid_type_error: INVALID_OTP_MESSAGE,
}).regex(/^\d{6}$/, INVALID_OTP_MESSAGE);

const refreshTokenBodySchema = z.string({
  required_error: INVALID_REFRESH_TOKEN_MESSAGE,
  invalid_type_error: INVALID_REFRESH_TOKEN_MESSAGE,
}).min(1, INVALID_REFRESH_TOKEN_MESSAGE);

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpCodeSchema,
});

export const refreshTokenSchema = z.object({
  refresh_token: refreshTokenBodySchema,
});

export const sendOtpValidation = {
  fields: {
    phone: {
      code: ErrorCodes.INVALID_PHONE,
      message: INVALID_PHONE_MESSAGE,
    },
  },
} satisfies ValidationConfig;

export const verifyOtpValidation = {
  fields: {
    phone: {
      code: ErrorCodes.INVALID_PHONE,
      message: INVALID_PHONE_MESSAGE,
    },
    otp: {
      code: ErrorCodes.INVALID_OTP,
      message: INVALID_OTP_MESSAGE,
    },
  },
} satisfies ValidationConfig;

export const refreshTokenValidation = {
  fields: {
    refresh_token: {
      code: ErrorCodes.INVALID_REFRESH_TOKEN,
      message: INVALID_REFRESH_TOKEN_MESSAGE,
    },
  },
} satisfies ValidationConfig;
