import { Router } from "express";
import { ContentController } from "../controllers/content.controller";
import type { ContentServiceContract } from "../services/content.service";

interface ContentRouterOptions {
  contentService?: ContentServiceContract;
}

export function createContentRouter(options: ContentRouterOptions = {}) {
  const router = Router();
  const controller = new ContentController(options.contentService);

  router.get("/privacy-policy", controller.getPrivacyPolicy);
  router.get("/terms-and-conditions", controller.getTermsAndConditions);
  router.get("/refund-policy", controller.getRefundPolicy);
  router.get("/help-support", controller.getHelpSupport);

  return router;
}

export const contentRouter = createContentRouter();
