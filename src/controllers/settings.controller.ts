import { Request, Response, NextFunction } from "express";
import { serializeSettings } from "../serializers/settings.serializer";
import { SettingsService, type SettingsServiceContract } from "../services/settings.service";
import { sendSuccess } from "../utils/response";

export class SettingsController {
  constructor(private readonly settingsService: SettingsServiceContract = new SettingsService()) {}

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.settingsService.getSettings(req.user!.id);
      sendSuccess(res, serializeSettings(settings));
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.settingsService.updateSettings(req.user!.id, {
        language: req.body.language,
        notificationsEnabled: req.body.notifications_enabled,
        dailyReminderTime: req.body.daily_reminder_time,
      });
      sendSuccess(res, serializeSettings(settings));
    } catch (error) {
      next(error);
    }
  };
}
