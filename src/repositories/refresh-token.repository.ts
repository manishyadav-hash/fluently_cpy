import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";

interface CreateRefreshSessionInput {
  expiresAt: Date;
  id: string;
  token: string;
  userId: string;
}

export class RefreshTokenRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async createSession(data: CreateRefreshSessionInput) {
    return this.db.refreshToken.create({
      data,
      include: {
        user: true,
      },
    });
  }

  async findActiveSessionById(id: string) {
    return this.db.refreshToken.findFirst({
      where: {
        id,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  async revokeSession(id: string, revokedAt: Date): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { id },
      data: { revokedAt },
    });
  }
}
