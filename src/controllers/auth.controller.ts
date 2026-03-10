import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { OtpService } from "../services/otp.service";
import { prisma } from "../prisma/client";
import { env } from "../config/env";
import { formatUserResponse, sendSuccess } from "../utils/response";

const otpService = new OtpService();

export class AuthController {
  sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await otpService.send(req.body.phone);
      sendSuccess(res, { otp_sent: true });
    } catch (error) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await otpService.verify(req.body.phone, req.body.code);

      const user = await prisma.user.upsert({
        where: { phone: req.body.phone },
        update: {},
        create: { phone: req.body.phone },
      });

      const isNewUser = user.createdAt.getTime() === user.updatedAt.getTime();
      const token = jwt.sign({ phone: req.body.phone }, env.JWT_SECRET, { expiresIn: "7d" });

      sendSuccess(res, {
        access_token: token,
        token_type: "Bearer",
        expires_in: 604800,
        user: formatUserResponse(user),
        is_new_user: isNewUser,
      });
    } catch (error) {
      next(error);
    }
  };
}
