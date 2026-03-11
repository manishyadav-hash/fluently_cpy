import { OtpRepository } from "../repositories/otp.repository";
import { AppError } from "../errors/app-error";
import { env } from "../config/env";
import { ErrorCodes } from "../errors/error-codes";

const HARDCODED_OTP = "123456";

export class OtpService {
  private repo = new OtpRepository();

  async send(identifier: string): Promise<void> {
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);
    await this.repo.create({ identifier, code: HARDCODED_OTP, expiresAt });
    // TODO: replace with real SMS/email dispatch
    console.log(`[OTP] ${identifier} → ${HARDCODED_OTP}`);
  }

  async verify(identifier: string, code: string): Promise<boolean> {
    const otp = await this.repo.findLatest(identifier);

    if (!otp) throw new AppError("OTP not found", 400, ErrorCodes.INVALID_OTP);
    if (otp.usedAt) throw new AppError("OTP already used", 400, ErrorCodes.INVALID_OTP);
    if (otp.expiresAt < new Date()) throw new AppError("OTP expired", 410, ErrorCodes.OTP_EXPIRED);
    if (otp.code !== code) throw new AppError("Invalid OTP", 400, ErrorCodes.INVALID_OTP);

    await this.repo.markUsed(otp.id, new Date());
    return true;
  }
}
