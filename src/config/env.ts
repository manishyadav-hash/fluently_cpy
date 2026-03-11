import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  ACCESS_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().default(3600),
  CHAT_RATE_LIMIT_MAX_MESSAGES: z.coerce.number().default(10),
  CHAT_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(30),
  CDN_BASE_URL: z.string().default("https://cdn.fluently.app"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_SEND_ATTEMPTS_PER_WINDOW: z.coerce.number().default(5),
  OTP_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(300),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(30),
  OTP_VERIFY_MAX_ATTEMPTS: z.coerce.number().default(5),
  PAYMENTS_BASE_URL: z.string().default("https://pay.fluently.app/checkout"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().default(60 * 60 * 24 * 30),
  TRIAL_DURATION_DAYS: z.coerce.number().default(7),
});

export const env = envSchema.parse(process.env);
