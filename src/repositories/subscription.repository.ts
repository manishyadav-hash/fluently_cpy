import type { Subscription, SubscriptionPlan, SubscriptionStatus, SubscriptionSubStatus } from "@prisma/client";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";

interface UpsertSubscriptionInput {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  id: string;
  paymentUrl: string;
  planId: string | null;
  status: SubscriptionSubStatus;
  trialEndDate: Date | null;
  userId: string;
}

export class SubscriptionRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async seedPlans(plans: Array<{
    badge: string | null;
    description: string | null;
    id: string;
    interval: "month" | "year";
    monthlyEquivalent: number | null;
    name: string;
    priceAmount: number;
    priceCurrency: string;
  }>): Promise<void> {
    for (const plan of plans) {
      await this.db.subscriptionPlan.upsert({
        where: { id: plan.id },
        create: {
          id: plan.id,
          name: plan.name,
          interval: plan.interval,
          priceAmount: plan.priceAmount,
          priceCurrency: plan.priceCurrency,
          monthlyEquivalent: plan.monthlyEquivalent,
          badge: plan.badge,
          description: plan.description,
          isActive: true,
        },
        update: {
          name: plan.name,
          interval: plan.interval,
          priceAmount: plan.priceAmount,
          priceCurrency: plan.priceCurrency,
          monthlyEquivalent: plan.monthlyEquivalent,
          badge: plan.badge,
          description: plan.description,
          isActive: true,
        },
      });
    }
  }

  async listActivePlans(): Promise<SubscriptionPlan[]> {
    return this.db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [
        { priceAmount: "desc" },
        { createdAt: "asc" },
      ],
    });
  }

  async findPlanById(planId: string): Promise<SubscriptionPlan | null> {
    return this.db.subscriptionPlan.findFirst({
      where: {
        id: planId,
        isActive: true,
      },
    });
  }

  async findSubscriptionByUserId(userId: string): Promise<(Subscription & { plan: SubscriptionPlan | null }) | null> {
    return this.db.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  async createOrUpdateSubscription(data: UpsertSubscriptionInput): Promise<Subscription> {
    return this.db.subscription.upsert({
      where: { userId: data.userId },
      create: data,
      update: {
        planId: data.planId,
        status: data.status,
        trialEndDate: data.trialEndDate,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        paymentUrl: data.paymentUrl,
      },
    });
  }

  async updateCancellation(userId: string, cancelAtPeriodEnd: boolean): Promise<Subscription> {
    return this.db.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd },
    });
  }
}
