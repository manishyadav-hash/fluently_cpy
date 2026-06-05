import { Router, type RequestHandler } from "express";
import { SubscriptionController } from "../controllers/subscription.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import type { SubscriptionServiceContract } from "../services/subscription.service";
import { createSubscriptionSchema, createSubscriptionValidation } from "../validations/subscription.validation";

interface SubscriptionRouterOptions {
  authenticateMiddleware?: RequestHandler;
  subscriptionService?: SubscriptionServiceContract;
}

export function createSubscriptionRouter(options: SubscriptionRouterOptions = {}) {
  const router = Router();
  const controller = new SubscriptionController(options.subscriptionService);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;

  router.use(authenticateMiddleware);
  router.get("/plans", controller.getAvailablePlans);
  router.post("/trial", controller.startTrial);
  router.post("/", validate(createSubscriptionSchema, createSubscriptionValidation), controller.createSubscription);
  router.get("/me", controller.getCurrentSubscription);
  router.post("/me/cancel", controller.cancelCurrentSubscription);
  router.get("/me/invoice", controller.getLatestInvoice);

  return router;
}

export const subscriptionRouter = createSubscriptionRouter();
