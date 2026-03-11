import { Request, Response, NextFunction } from "express";
import {
  serializeCancelledSubscription,
  serializeCheckoutSubscription,
  serializeCurrentSubscription,
  serializeInvoice,
  serializeSubscriptionPlan,
  serializeTrialOffer,
} from "../serializers/subscription.serializer";
import { SubscriptionService, type SubscriptionServiceContract } from "../services/subscription.service";
import { sendSuccess } from "../utils/response";

export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionServiceContract = new SubscriptionService()) {}

  getAvailablePlans = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.subscriptionService.getAvailablePlans();
      sendSuccess(res, {
        trial_offer: serializeTrialOffer(result.trialOffer),
        plans: result.plans.map(serializeSubscriptionPlan),
      });
    } catch (error) {
      next(error);
    }
  };

  startTrial = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.subscriptionService.startTrial(req.user!.id);
      sendSuccess(res, serializeCheckoutSubscription(result), 201);
    } catch (error) {
      next(error);
    }
  };

  createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.subscriptionService.createSubscription(req.user!.id, req.body.plan_id);
      sendSuccess(res, serializeCheckoutSubscription(result), 201);
    } catch (error) {
      next(error);
    }
  };

  getCurrentSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.subscriptionService.getCurrentSubscription(req.user!.id);
      sendSuccess(res, serializeCurrentSubscription(result));
    } catch (error) {
      next(error);
    }
  };

  cancelCurrentSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.subscriptionService.cancelCurrentSubscription(req.user!.id);
      sendSuccess(res, serializeCancelledSubscription(result));
    } catch (error) {
      next(error);
    }
  };

  getLatestInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.subscriptionService.getLatestInvoice(req.user!.id);
      sendSuccess(res, serializeInvoice(result));
    } catch (error) {
      next(error);
    }
  };
}
