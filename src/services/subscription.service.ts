import type { SubscriptionPlan, SubscriptionStatus, SubscriptionSubStatus, User } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  PlaceholderSubscriptionBillingService,
  type SubscriptionBillingServiceContract,
} from "./subscription-billing.service";

const DEFAULT_TRIAL_OFFER = {
  autoRenew: false,
  benefits: [
    "Speak with Confidence",
    "Crack Interviews",
    "Ace Exams",
  ],
  durationDays: 7,
  priceAmount: 9,
  priceCurrency: "INR",
  warningText: "Missing this offer could slow your progress",
};

const DEFAULT_PLANS = [
  {
    badge: "BEST FOR YOUR GOAL",
    description: null,
    id: "plan_yearly",
    interval: "year" as const,
    monthlyEquivalent: 67,
    name: "Yearly Plan",
    priceAmount: 799,
    priceCurrency: "INR",
  },
  {
    badge: null,
    description: "Matches your 20-min daily plan",
    id: "plan_monthly",
    interval: "month" as const,
    monthlyEquivalent: 199,
    name: "Monthly Plan",
    priceAmount: 199,
    priceCurrency: "INR",
  },
];

type SubscriptionRecord = {
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  id: string;
  paymentUrl: string | null;
  plan?: SubscriptionPlan | null;
  planId: string | null;
  status: SubscriptionSubStatus;
  trialEndDate: Date | null;
  userId: string;
};

interface SubscriptionRepositoryPort {
  createOrUpdateSubscription(data: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    id: string;
    paymentUrl: string;
    planId: string | null;
    status: SubscriptionSubStatus;
    trialEndDate: Date | null;
    userId: string;
  }): Promise<SubscriptionRecord>;
  findPlanById(planId: string): Promise<SubscriptionPlan | null>;
  findSubscriptionByUserId(userId: string): Promise<SubscriptionRecord | null>;
  listActivePlans(): Promise<SubscriptionPlan[]>;
  seedPlans(plans: typeof DEFAULT_PLANS): Promise<void>;
  updateCancellation?(userId: string, cancelAtPeriodEnd: boolean): Promise<SubscriptionRecord>;
}

interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  updateTrialUsage(userId: string, subscriptionStatus: SubscriptionStatus, trialUsedAt: Date | null): Promise<User>;
}

interface SubscriptionServiceDependencies {
  billingService?: SubscriptionBillingServiceContract;
  createSubscriptionRepository?: (db?: DatabaseClient) => SubscriptionRepositoryPort;
  createUserRepository?: (db?: DatabaseClient) => UserRepositoryPort;
  now?: () => Date;
  runInTransaction?: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;
}

export interface SubscriptionServiceContract {
  cancelCurrentSubscription(userId: string): Promise<{
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    id: string;
    status: "trial" | "active" | "expired" | "cancelled" | "pending";
  }>;
  createSubscription(userId: string, planId: string): Promise<{
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    id: string;
    paymentUrl: string;
    planId: string | null;
    status: "trial" | "active" | "expired" | "cancelled" | "pending";
    trialEndDate: Date | null;
  }>;
  getAvailablePlans(): Promise<{
    plans: typeof DEFAULT_PLANS;
    trialOffer: typeof DEFAULT_TRIAL_OFFER;
  }>;
  getCurrentSubscription(userId: string): Promise<{
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    id: string;
    paymentUrl: string;
    planId: string | null;
    status: "trial" | "active" | "expired" | "cancelled" | "pending";
    trialEndDate: Date | null;
  } | null>;
  getLatestInvoice(userId: string): Promise<{
    amount: number;
    currency: string;
    invoiceDate: string;
    invoiceUrl: string;
    planName: string;
    status: string;
  }>;
  startTrial(userId: string): Promise<{
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    id: string;
    paymentUrl: string;
    planId: string | null;
    status: "trial" | "active" | "expired" | "cancelled" | "pending";
    trialEndDate: Date | null;
  }>;
}

export class SubscriptionService implements SubscriptionServiceContract {
  private readonly billingService: SubscriptionBillingServiceContract;
  private readonly createSubscriptionRepository: (db?: DatabaseClient) => SubscriptionRepositoryPort;
  private readonly createUserRepository: (db?: DatabaseClient) => UserRepositoryPort;
  private readonly now: () => Date;
  private readonly runInTransaction: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;

  constructor(dependencies: SubscriptionServiceDependencies = {}) {
    this.billingService = dependencies.billingService ?? new PlaceholderSubscriptionBillingService();
    this.createSubscriptionRepository = dependencies.createSubscriptionRepository ?? (db => new SubscriptionRepository(db));
    this.createUserRepository = dependencies.createUserRepository ?? (db => new UserRepository(db));
    this.now = dependencies.now ?? (() => new Date());
    this.runInTransaction = dependencies.runInTransaction ?? (callback => prisma.$transaction(tx => callback(tx)));
  }

  async getAvailablePlans() {
    const repository = this.createSubscriptionRepository();
    let plans = await repository.listActivePlans();
    if (plans.length === 0) {
      await repository.seedPlans(DEFAULT_PLANS);
      plans = await repository.listActivePlans();
    }

    return {
      trialOffer: DEFAULT_TRIAL_OFFER,
      plans: (plans.length > 0 ? plans : DEFAULT_PLANS).map(plan => ({
        badge: plan.badge,
        description: plan.description,
        id: plan.id,
        interval: plan.interval,
        monthlyEquivalent: plan.monthlyEquivalent,
        name: plan.name,
        priceAmount: plan.priceAmount,
        priceCurrency: plan.priceCurrency,
      })) as typeof DEFAULT_PLANS,
    };
  }

  async startTrial(userId: string) {
    return this.runInTransaction(async db => {
      const subscriptionRepository = this.createSubscriptionRepository(db);
      const userRepository = this.createUserRepository(db);
      const now = this.now();
      const user = await this.requireUser(userId, userRepository);
      const existingSubscription = await subscriptionRepository.findSubscriptionByUserId(userId);

      if (this.hasBlockingSubscription(existingSubscription?.status ?? null)) {
        throw new AppError("User already has an active subscription.", 409, ErrorCodes.ACTIVE_SUBSCRIPTION);
      }

      if (user.trialUsedAt) {
        throw new AppError("User has already used their trial.", 409, ErrorCodes.TRIAL_ALREADY_USED);
      }

      const subscriptionId = existingSubscription?.id ?? `sub_trial_${userId}`;
      const paymentUrl = await this.billingService.getPaymentUrl(subscriptionId);
      const trialEndDate = new Date(now.getTime() + env.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

      const subscription = await subscriptionRepository.createOrUpdateSubscription({
        id: subscriptionId,
        userId,
        planId: null,
        status: "trial",
        trialEndDate,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndDate,
        cancelAtPeriodEnd: true,
        paymentUrl,
      });

      await userRepository.updateTrialUsage(userId, "trial", now);

      return normalizeSubscription(subscription);
    });
  }

  async createSubscription(userId: string, planId: string) {
    return this.runInTransaction(async db => {
      const subscriptionRepository = this.createSubscriptionRepository(db);
      const userRepository = this.createUserRepository(db);
      await this.requireUser(userId, userRepository);
      const existingSubscription = await subscriptionRepository.findSubscriptionByUserId(userId);
      if (this.hasBlockingSubscription(existingSubscription?.status ?? null)) {
        throw new AppError("User already has an active subscription.", 409, ErrorCodes.ACTIVE_SUBSCRIPTION);
      }

      const plan = await this.findPlanOrThrow(planId, subscriptionRepository);
      const subscriptionId = existingSubscription?.id ?? `sub_${userId}`;
      const paymentUrl = await this.billingService.getPaymentUrl(subscriptionId);

      const subscription = await subscriptionRepository.createOrUpdateSubscription({
        id: subscriptionId,
        userId,
        planId: plan.id,
        status: "pending",
        trialEndDate: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        paymentUrl,
      });

      await userRepository.updateTrialUsage(userId, this.mapUserSubscriptionStatus("pending"), existingSubscription?.status === "trial" ? this.now() : (await userRepository.findById(userId))?.trialUsedAt ?? null);

      return normalizeSubscription(subscription);
    });
  }

  async getCurrentSubscription(userId: string) {
    const subscription = await this.createSubscriptionRepository().findSubscriptionByUserId(userId);
    return subscription ? normalizeSubscription(subscription) : null;
  }

  async cancelCurrentSubscription(userId: string) {
    const repository = this.createSubscriptionRepository();
    const subscription = await repository.findSubscriptionByUserId(userId);
    if (!subscription || subscription.status !== "active") {
      throw new AppError("No active subscription to cancel.", 404, ErrorCodes.NO_ACTIVE_SUBSCRIPTION);
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new AppError("Subscription is already set to cancel.", 409, ErrorCodes.ALREADY_CANCELLED);
    }

    const cancelled = repository.updateCancellation
      ? await repository.updateCancellation(userId, true)
      : await repository.createOrUpdateSubscription({
        id: subscription.id,
        userId,
        planId: subscription.planId,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: true,
        paymentUrl: subscription.paymentUrl ?? "",
      });

    const normalized = normalizeSubscription(cancelled);
    return {
      id: normalized.id,
      status: normalized.status,
      cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      currentPeriodEnd: normalized.currentPeriodEnd,
    };
  }

  async getLatestInvoice(userId: string) {
    const repository = this.createSubscriptionRepository();
    const subscription = await repository.findSubscriptionByUserId(userId);
    const plan = subscription?.plan ?? (subscription?.planId ? await repository.findPlanById(subscription.planId) : null);
    if (!subscription || !plan || subscription.status !== "active") {
      throw new AppError("No invoices available.", 404, ErrorCodes.NO_INVOICE);
    }

    const invoiceUrl = await this.billingService.getInvoiceUrl(subscription.id);
    return {
      invoiceUrl,
      invoiceDate: (subscription.currentPeriodStart ?? subscription.createdAt).toISOString().slice(0, 10),
      amount: plan.priceAmount,
      currency: plan.priceCurrency,
      planName: plan.name,
      status: "paid",
    };
  }

  private async requireUser(userId: string, repository: UserRepositoryPort) {
    const user = await repository.findById(userId);
    if (!user || user.deletedAt) {
      throw new AppError("User not found.", 404, ErrorCodes.UNAUTHORIZED);
    }
    return user;
  }

  private async findPlanOrThrow(planId: string, repository: SubscriptionRepositoryPort) {
    const plan = await repository.findPlanById(planId);
    if (plan) {
      return plan;
    }

    const defaultPlan = DEFAULT_PLANS.find(entry => entry.id === planId);
    if (!defaultPlan) {
      throw new AppError("Plan ID does not exist.", 400, ErrorCodes.INVALID_PLAN);
    }

    return {
      ...defaultPlan,
      createdAt: this.now(),
      isActive: true,
    } as SubscriptionPlan;
  }

  private hasBlockingSubscription(status: SubscriptionSubStatus | null) {
    return status === "trial" || status === "active" || status === "pending";
  }

  private mapUserSubscriptionStatus(status: SubscriptionSubStatus): SubscriptionStatus {
    if (status === "trial" || status === "active" || status === "expired" || status === "cancelled") {
      return status;
    }

    return "none";
  }
}

function normalizeSubscription(subscription: SubscriptionRecord) {
  return {
    id: subscription.id,
    planId: subscription.planId,
    status: subscription.status,
    trialEndDate: subscription.trialEndDate,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt,
    paymentUrl: subscription.paymentUrl ?? "",
  } as const;
}
