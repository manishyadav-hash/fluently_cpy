import { User } from "@prisma/client";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";
import type { SubscriptionStatus } from "@prisma/client";

export class UserRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async create(data: { phone: string }): Promise<User> {
    return this.db.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { phone } });
  }

  async markOnboarded(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { isOnboarded: true },
    });
  }

  async updateTrialUsage(id: string, subscriptionStatus: SubscriptionStatus, trialUsedAt: Date | null): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: {
        subscriptionStatus,
        trialUsedAt,
      },
    });
  }

  async update(id: string, data: { name?: string; email?: string; avatarUrl?: string | null }): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
