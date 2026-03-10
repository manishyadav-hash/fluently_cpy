import { prisma } from "../prisma/client";

export class OtpRepository {
  async create(identifier: string, code: string, expiresAt: Date): Promise<void> {
    await prisma.otp.create({ data: { identifier, code, expiresAt } });
  }

  async findLatest(identifier: string): Promise<{ code: string; expiresAt: Date; usedAt: Date | null } | null> {
    return prisma.otp.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
      select: { code: true, expiresAt: true, usedAt: true },
    });
  }

  async markUsed(identifier: string): Promise<void> {
    await prisma.otp.updateMany({
      where: { identifier, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
