import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription, SubscriptionInterval, SubscriptionPlan, SubscriptionStatus, SubscriptionSubStatus, User } from "@prisma/client";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { SubscriptionService } from "./subscription.service";

function createUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-02-28T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: "user@example.com",
    id: "usr_abc123",
    isOnboarded: true,
    name: "Sachin",
    phone: "+919483898443",
    subscriptionStatus: "none" as SubscriptionStatus,
    trialUsedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

function createPlan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    badge: null,
    createdAt: new Date("2026-02-28T10:00:00.000Z"),
    description: null,
    id: "plan_yearly",
    interval: "year" as SubscriptionInterval,
    isActive: true,
    monthlyEquivalent: 67,
    name: "Yearly Plan",
    priceAmount: 799,
    priceCurrency: "INR",
    ...overrides,
  };
}

function createSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-02-28T10:00:00.000Z"),
    currentPeriodEnd: null,
    currentPeriodStart: null,
    id: "sub_abc123",
    paymentUrl: "https://pay.fluently.app/checkout/sub_abc123",
    planId: "plan_yearly",
    status: "pending" as SubscriptionSubStatus,
    trialEndDate: null,
    updatedAt: new Date("2026-02-28T10:00:00.000Z"),
    userId: "usr_abc123",
    ...overrides,
  };
}

describe("SubscriptionService", () => {
  it("returns seeded plans and a trial offer", async () => {
    const service = new SubscriptionService({
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() { return null; },
        async listActivePlans() {
          return [];
        },
        async seedPlans() {
          return;
        },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { return createUser({ trialUsedAt: new Date("2026-02-28T10:00:00.000Z") }); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.getAvailablePlans();

    assert.equal(result.trialOffer.priceAmount, 9);
    assert.equal(result.plans.length, 2);
    assert.equal(result.plans[0].id, "plan_yearly");
  });

  it("starts a trial and records trial usage", async () => {
    let updatedStatus: SubscriptionStatus | undefined;
    let usedTrialAt: Date | null | undefined;
    const service = new SubscriptionService({
      billingService: {
        async getInvoiceUrl() { return "https://cdn.fluently.app/invoices/inv_abc123.pdf"; },
        async getPaymentUrl(subscriptionId) { return `https://pay.fluently.app/checkout/${subscriptionId}`; },
      },
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription(data) {
          return createSubscription({
            cancelAtPeriodEnd: data.cancelAtPeriodEnd,
            currentPeriodEnd: data.currentPeriodEnd,
            currentPeriodStart: data.currentPeriodStart,
            id: data.id,
            paymentUrl: data.paymentUrl,
            planId: data.planId,
            status: data.status,
            trialEndDate: data.trialEndDate,
          });
        },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() { return null; },
        async listActivePlans() { return [createPlan(), createPlan({ description: "Matches your 20-min daily plan", id: "plan_monthly", interval: "month", monthlyEquivalent: 199, name: "Monthly Plan", priceAmount: 199 })]; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage(userId, subscriptionStatus, trialUsedAt) {
          assert.equal(userId, "usr_abc123");
          updatedStatus = subscriptionStatus;
          usedTrialAt = trialUsedAt;
          return createUser({ subscriptionStatus, trialUsedAt });
        },
      }),
      now: () => new Date("2026-02-28T10:00:00.000Z"),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.startTrial("usr_abc123");

    assert.equal(result.status, "trial");
    assert.equal(result.planId, null);
    assert.equal(result.paymentUrl, `https://pay.fluently.app/checkout/${result.id}`);
    assert.equal(updatedStatus, "trial");
    assert.ok(usedTrialAt instanceof Date);
  });

  it("rejects trial reuse", async () => {
    const service = new SubscriptionService({
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() { return null; },
        async listActivePlans() { return [createPlan()]; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser({ trialUsedAt: new Date("2026-02-20T10:00:00.000Z") }); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.startTrial("usr_abc123"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.TRIAL_ALREADY_USED);
        return true;
      },
    );
  });

  it("creates a pending paid subscription for valid plans", async () => {
    let updatedStatus: SubscriptionStatus | undefined;
    const service = new SubscriptionService({
      billingService: {
        async getInvoiceUrl() { return "https://cdn.fluently.app/invoices/inv_abc123.pdf"; },
        async getPaymentUrl(subscriptionId) { return `https://pay.fluently.app/checkout/${subscriptionId}`; },
      },
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription(data) {
          return createSubscription({
            cancelAtPeriodEnd: data.cancelAtPeriodEnd,
            paymentUrl: data.paymentUrl,
            planId: data.planId,
            status: data.status,
          });
        },
        async findPlanById(planId) {
          return planId === "plan_yearly" ? createPlan() : null;
        },
        async findSubscriptionByUserId() { return null; },
        async listActivePlans() { return [createPlan()]; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage(userId, subscriptionStatus) {
          updatedStatus = subscriptionStatus;
          return createUser({ subscriptionStatus });
        },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.createSubscription("usr_abc123", "plan_yearly");

    assert.equal(result.status, "pending");
    assert.equal(result.planId, "plan_yearly");
    assert.equal(updatedStatus, "none");
  });

  it("rejects invalid plans", async () => {
    const service = new SubscriptionService({
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() { return null; },
        async listActivePlans() { return []; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.createSubscription("usr_abc123", "bad_plan"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.INVALID_PLAN);
        return true;
      },
    );
  });

  it("returns null for missing current subscriptions", async () => {
    const service = new SubscriptionService({
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() { return null; },
        async listActivePlans() { return []; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.getCurrentSubscription("usr_abc123");
    assert.equal(result, null);
  });

  it("cancels active subscriptions", async () => {
    let updatedCancelAtPeriodEnd = false;
    const service = new SubscriptionService({
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() {
          return createSubscription({
            cancelAtPeriodEnd: false,
            currentPeriodEnd: new Date("2027-02-28T10:00:00.000Z"),
            status: "active",
          });
        },
        async listActivePlans() { return []; },
        async seedPlans() { return; },
        async updateCancellation(userId, cancelAtPeriodEnd) {
          assert.equal(userId, "usr_abc123");
          updatedCancelAtPeriodEnd = cancelAtPeriodEnd;
          return createSubscription({
            cancelAtPeriodEnd,
            currentPeriodEnd: new Date("2027-02-28T10:00:00.000Z"),
            status: "active",
          });
        },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.cancelCurrentSubscription("usr_abc123");

    assert.equal(result.cancelAtPeriodEnd, true);
    assert.equal(updatedCancelAtPeriodEnd, true);
  });

  it("rejects cancellation for trial subscriptions", async () => {
    const service = new SubscriptionService({
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() {
          return createSubscription({
            cancelAtPeriodEnd: false,
            status: "trial",
            trialEndDate: new Date("2026-03-07T10:00:00.000Z"),
          });
        },
        async listActivePlans() { return []; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.cancelCurrentSubscription("usr_abc123"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.NO_ACTIVE_SUBSCRIPTION);
        return true;
      },
    );
  });

  it("rejects cancellation for already-cancelled subscriptions", async () => {
    const service = new SubscriptionService({
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return null; },
        async findSubscriptionByUserId() {
          return createSubscription({
            cancelAtPeriodEnd: true,
            currentPeriodEnd: new Date("2027-02-28T10:00:00.000Z"),
            status: "active",
          });
        },
        async listActivePlans() { return []; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.cancelCurrentSubscription("usr_abc123"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.ALREADY_CANCELLED);
        return true;
      },
    );
  });

  it("returns derived invoice details for active paid subscriptions", async () => {
    const service = new SubscriptionService({
      billingService: {
        async getInvoiceUrl(subscriptionId) {
          return `https://cdn.fluently.app/invoices/${subscriptionId}.pdf`;
        },
        async getPaymentUrl() {
          return "https://pay.fluently.app/checkout/sub_abc123";
        },
      },
      createSubscriptionRepository: () => ({
        async createOrUpdateSubscription() { throw new Error("unused"); },
        async findPlanById() { return createPlan(); },
        async findSubscriptionByUserId() {
          return createSubscription({
            currentPeriodStart: new Date("2026-02-28T10:00:00.000Z"),
            planId: "plan_yearly",
            status: "active",
          });
        },
        async listActivePlans() { return [createPlan()]; },
        async seedPlans() { return; },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return createUser(); },
        async findByPhone() { return createUser(); },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
        async updateTrialUsage() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.getLatestInvoice("usr_abc123");

    assert.equal(result.invoiceUrl, "https://cdn.fluently.app/invoices/sub_abc123.pdf");
    assert.equal(result.amount, 799);
    assert.equal(result.status, "paid");
  });
});
