import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";

interface CreateOtpInput {
  code: string;
  expiresAt: Date;
  identifier: string;
}

export interface OtpRecord {
  attemptCount: number;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identifier: string;
  usedAt: Date | null;
}

export class OtpRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async countCreatedSince(identifier: string, since: Date): Promise<number> {
    return this.db.otp.count({
      where: {
        identifier,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  async create(data: CreateOtpInput): Promise<OtpRecord> {
    return this.db.otp.create({
      data,
      select: {
        id: true,
        identifier: true,
        code: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        attemptCount: true,
      },
    });
  }

  async findLatest(identifier: string): Promise<OtpRecord | null> {
    return this.db.otp.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        identifier: true,
        code: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        attemptCount: true,
      },
    });
  }

  async incrementAttemptCount(id: string): Promise<number> {
    const record = await this.db.otp.update({
      where: { id },
      data: {
        attemptCount: {
          increment: 1,
        },
      },
      select: {
        attemptCount: true,
      },
    });

    return record.attemptCount;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await this.db.otp.update({
      where: { id },
      data: { usedAt },
    });
  }
}
