import { OtpRepository } from "../repositories/otp.repository";
import { AppError } from "../errors/app-error";
import { env } from "../config/env";

const HARDCODED_OTP = "123456";

export class OtpService {
  private repo = new OtpRepository();

  async send(identifier: string): Promise<void> {
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.repo.create(identifier, HARDCODED_OTP, expiresAt);
    // TODO: replace with real SMS/email dispatch
    console.log(`[OTP] ${identifier} → ${HARDCODED_OTP}`);
  }

  async verify(identifier: string, code: string): Promise<boolean> {
    const otp = await this.repo.findLatest(identifier);

    if (!otp) throw new AppError("OTP not found", 400);
    if (otp.usedAt) throw new AppError("OTP already used", 400);
    if (otp.expiresAt < new Date()) throw new AppError("OTP expired", 400);
    if (otp.code !== code) throw new AppError("Invalid OTP", 400);

    await this.repo.markUsed(identifier);
    return true;
  }
}
