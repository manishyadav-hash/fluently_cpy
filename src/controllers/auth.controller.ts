import { Request, Response, NextFunction } from "express";
import {
  serializeLogoutResponse,
  serializeRefreshTokenResponse,
  serializeSendOtpResponse,
  serializeVerifyOtpResponse,
} from "../serializers/auth.serializer";
import { AuthService, type AuthServiceContract } from "../services/auth.service";
import { sendSuccess } from "../utils/response";

export class AuthController {
  constructor(private readonly authService: AuthServiceContract = new AuthService()) {}

  sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.sendOtp(req.body.phone);
      sendSuccess(res, serializeSendOtpResponse(result));
    } catch (error) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.verifyOtp(req.body.phone, req.body.otp);
      sendSuccess(res, serializeVerifyOtpResponse(result));
    } catch (error) {
      next(error);
    }
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.resendOtp(req.body.phone);
      sendSuccess(res, serializeSendOtpResponse(result));
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.refreshToken(req.body.refresh_token);
      sendSuccess(res, serializeRefreshTokenResponse(result));
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.logout(req.auth!.sessionId);
      sendSuccess(res, serializeLogoutResponse(result));
    } catch (error) {
      next(error);
    }
  };
}
