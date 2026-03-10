import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { sendOtpSchema, sendOtpValidation, verifyOtpSchema, verifyOtpValidation } from "../validations/auth.validation";

export const authRouter = Router();

const authController = new AuthController();

// POST /api/auth/otp/send    - Send OTP to phone/email
authRouter.post("/otp/send", validate(sendOtpSchema, sendOtpValidation), authController.sendOtp);

// POST /api/auth/otp/verify  - Verify OTP and authenticate
authRouter.post("/otp/verify", validate(verifyOtpSchema, verifyOtpValidation), authController.verifyOtp);
