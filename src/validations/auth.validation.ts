import { z } from "zod";
import type { ValidationConfig } from "../middleware/validate";

const INVALID_PHONE_MESSAGE = "Phone number format is invalid";
const INVALID_OTP_MESSAGE = "OTP code is incorrect";

const phoneSchema = z.string({
  required_error: INVALID_PHONE_MESSAGE,
  invalid_type_error: INVALID_PHONE_MESSAGE,
}).min(10, INVALID_PHONE_MESSAGE);

const otpCodeSchema = z.string({
  required_error: INVALID_OTP_MESSAGE,
  invalid_type_error: INVALID_OTP_MESSAGE,
}).length(6, INVALID_OTP_MESSAGE);

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

export const sendOtpValidation = {
  fields: {
    phone: {
      code: "INVALID_PHONE",
      message: INVALID_PHONE_MESSAGE,
    },
  },
} satisfies ValidationConfig;

export const verifyOtpValidation = {
  fields: {
    phone: {
      code: "INVALID_PHONE",
      message: INVALID_PHONE_MESSAGE,
    },
    code: {
      code: "INVALID_OTP",
      message: INVALID_OTP_MESSAGE,
    },
  },
} satisfies ValidationConfig;
