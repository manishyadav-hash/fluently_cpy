import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";

export interface SettingsRecord {
  dailyReminderTime: string;
  language: string;
  notificationsEnabled: boolean;
}

export class SettingsRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async findByUserId(userId: string): Promise<SettingsRecord | null> {
    const settings = await this.db.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return null;
    }

    return {
      dailyReminderTime: settings.dailyReminderTime,
      language: settings.language,
      notificationsEnabled: settings.notificationsEnabled,
    };
  }

  async upsert(
    userId: string,
    data: {
      dailyReminderTime?: string;
      language?: string;
      notificationsEnabled?: boolean;
    },
  ): Promise<SettingsRecord> {
    const settings = await this.db.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...(data.language === undefined ? {} : { language: data.language }),
        ...(data.notificationsEnabled === undefined ? {} : { notificationsEnabled: data.notificationsEnabled }),
        ...(data.dailyReminderTime === undefined ? {} : { dailyReminderTime: data.dailyReminderTime }),
      },
      update: {
        ...(data.language === undefined ? {} : { language: data.language }),
        ...(data.notificationsEnabled === undefined ? {} : { notificationsEnabled: data.notificationsEnabled }),
        ...(data.dailyReminderTime === undefined ? {} : { dailyReminderTime: data.dailyReminderTime }),
      },
    });

    return {
      dailyReminderTime: settings.dailyReminderTime,
      language: settings.language,
      notificationsEnabled: settings.notificationsEnabled,
    };
  }
}
