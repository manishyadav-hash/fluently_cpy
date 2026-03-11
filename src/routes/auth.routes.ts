import { Router, type RequestHandler } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import type { AuthServiceContract } from "../services/auth.service";
import {
  refreshTokenSchema,
  refreshTokenValidation,
  sendOtpSchema,
  sendOtpValidation,
  verifyOtpSchema,
  verifyOtpValidation,
} from "../validations/auth.validation";

interface AuthRouterOptions {
  authenticateMiddleware?: RequestHandler;
  service?: AuthServiceContract;
}

export function createAuthRouter(options: AuthRouterOptions = {}) {
  const authRouter = Router();
  const authController = new AuthController(options.service);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;

  authRouter.post("/otp/send", validate(sendOtpSchema, sendOtpValidation), authController.sendOtp);
  authRouter.post("/otp/verify", validate(verifyOtpSchema, verifyOtpValidation), authController.verifyOtp);
  authRouter.post("/otp/resend", validate(sendOtpSchema, sendOtpValidation), authController.resendOtp);
  authRouter.post("/token/refresh", validate(refreshTokenSchema, refreshTokenValidation), authController.refreshToken);
  authRouter.post("/logout", authenticateMiddleware, authController.logout);

  return authRouter;
}

export const authRouter = createAuthRouter();
