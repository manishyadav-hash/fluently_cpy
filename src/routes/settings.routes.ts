import { Router, type RequestHandler } from "express";
import { SettingsController } from "../controllers/settings.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import type { SettingsServiceContract } from "../services/settings.service";
import { updateSettingsSchema, updateSettingsValidation } from "../validations/settings.validation";

interface SettingsRouterOptions {
  authenticateMiddleware?: RequestHandler;
  settingsService?: SettingsServiceContract;
}

export function createSettingsRouter(options: SettingsRouterOptions = {}) {
  const router = Router();
  const controller = new SettingsController(options.settingsService);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;

  router.use(authenticateMiddleware);
  router.get("/", controller.getSettings);
  router.patch("/", validate(updateSettingsSchema, updateSettingsValidation), controller.updateSettings);

  return router;
}

export const settingsRouter = createSettingsRouter();
