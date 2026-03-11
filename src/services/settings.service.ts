import { SettingsRepository } from "../repositories/settings.repository";
import { AVAILABLE_LANGUAGES } from "../validations/settings.validation";

interface SettingsRepositoryPort {
  findByUserId(userId: string): Promise<{
    dailyReminderTime: string;
    language: string;
    notificationsEnabled: boolean;
  } | null>;
  upsert(
    userId: string,
    data: {
      dailyReminderTime?: string;
      language?: string;
      notificationsEnabled?: boolean;
    },
  ): Promise<{
    dailyReminderTime: string;
    language: string;
    notificationsEnabled: boolean;
  }>;
}

interface SettingsServiceDependencies {
  createSettingsRepository?: () => SettingsRepositoryPort;
}

export interface SettingsServiceContract {
  getSettings(userId: string): Promise<{
    availableLanguages: Array<{ code: string; name: string }>;
    dailyReminderTime: string;
    language: string;
    notificationsEnabled: boolean;
  }>;
  updateSettings(
    userId: string,
    patch: {
      dailyReminderTime?: string;
      language?: string;
      notificationsEnabled?: boolean;
    },
  ): Promise<{
    availableLanguages: Array<{ code: string; name: string }>;
    dailyReminderTime: string;
    language: string;
    notificationsEnabled: boolean;
  }>;
}

const DEFAULT_SETTINGS = {
  language: "en",
  notificationsEnabled: true,
  dailyReminderTime: "09:00",
};

export class SettingsService implements SettingsServiceContract {
  private readonly createSettingsRepository: () => SettingsRepositoryPort;

  constructor(dependencies: SettingsServiceDependencies = {}) {
    this.createSettingsRepository = dependencies.createSettingsRepository ?? (() => new SettingsRepository());
  }

  async getSettings(userId: string) {
    const repository = this.createSettingsRepository();
    const existingSettings = await repository.findByUserId(userId);

    return {
      availableLanguages: [...AVAILABLE_LANGUAGES],
      dailyReminderTime: existingSettings?.dailyReminderTime ?? DEFAULT_SETTINGS.dailyReminderTime,
      language: existingSettings?.language ?? DEFAULT_SETTINGS.language,
      notificationsEnabled: existingSettings?.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
    };
  }

  async updateSettings(
    userId: string,
    patch: {
      dailyReminderTime?: string;
      language?: string;
      notificationsEnabled?: boolean;
    },
  ) {
    const repository = this.createSettingsRepository();
    const settings = await repository.upsert(userId, patch);

    return {
      availableLanguages: [...AVAILABLE_LANGUAGES],
      dailyReminderTime: settings.dailyReminderTime,
      language: settings.language,
      notificationsEnabled: settings.notificationsEnabled,
    };
  }
}
