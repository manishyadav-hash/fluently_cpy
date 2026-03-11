import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "../middleware/error-handler";
import type { SubscriptionServiceContract } from "../services/subscription.service";
import { createTestClient } from "../test/support/test-client";
import { createSubscriptionRouter } from "./subscription.routes";

function createUser(): User {
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
    subscriptionStatus: "none",
    trialUsedAt: null,
    updatedAt: now,
  };
}

function createAuthMiddleware(): RequestHandler {
  return (req, _res, next) => {
    if (req.headers.authorization !== "Bearer phase-3") {
      next(new AppError("Missing or invalid authorization header", 401, ErrorCodes.UNAUTHORIZED));
      return;
    }

    req.auth = {
      sessionId: "session_phase3",
      userId: "usr_abc123",
    };
    req.user = createUser();
    next();
  };
}

function createApp(service: SubscriptionServiceContract) {
  const routerOptions = {
    authenticateMiddleware: createAuthMiddleware(),
    subscriptionService: service,
  };
  const app = express();
  app.use(express.json());
  app.use("/v1/subscriptions", createSubscriptionRouter(routerOptions));
  app.use("/api/subscriptions", createSubscriptionRouter(routerOptions));
  app.use(errorHandler);
  return app;
}

describe("subscription routes", () => {
  it("returns plans and the trial offer for GET /v1/subscriptions/plans", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() {
        return {
          trialOffer: {
            autoRenew: false,
            benefits: ["Speak with Confidence", "Crack Interviews", "Ace Exams"],
            durationDays: 7,
            priceAmount: 9,
            priceCurrency: "INR",
            warningText: "Missing this offer could slow your progress",
          },
          plans: [
            {
              badge: "BEST FOR YOUR GOAL",
              description: null,
              id: "plan_yearly",
              interval: "year",
              monthlyEquivalent: 67,
              name: "Yearly Plan",
              priceAmount: 799,
              priceCurrency: "INR",
            },
          ],
        };
      },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/subscriptions/plans",
      headers: { authorization: "Bearer phase-3" },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { plans: Array<{ id: string }>; trial_offer: { price_amount: number } } }>();
    assert.equal(body.data.plans[0].id, "plan_yearly");
    assert.equal(body.data.trial_offer.price_amount, 9);
  });

  it("requires auth for GET /v1/subscriptions/plans", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/subscriptions/plans",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "UNAUTHORIZED");
  });

  it("starts a trial for POST /v1/subscriptions/trial", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial(userId) {
        assert.equal(userId, "usr_abc123");
        return {
          cancelAtPeriodEnd: true,
          createdAt: new Date("2026-02-28T10:00:00.000Z"),
          currentPeriodEnd: new Date("2026-03-07T10:00:00.000Z"),
          currentPeriodStart: new Date("2026-02-28T10:00:00.000Z"),
          id: "sub_trial_abc",
          paymentUrl: "https://pay.fluently.app/checkout/sub_trial_abc",
          planId: null,
          status: "trial",
          trialEndDate: new Date("2026-03-07T10:00:00.000Z"),
        };
      },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/subscriptions/trial",
      headers: { authorization: "Bearer phase-3" },
      json: {},
    });

    assert.equal(response.statusCode, 201);
    const body = response.json<{ data: { status: string; payment_url: string; plan_id: null } }>();
    assert.equal(body.data.status, "trial");
    assert.equal(body.data.plan_id, null);
    assert.equal(body.data.payment_url, "https://pay.fluently.app/checkout/sub_trial_abc");
  });

  it("returns TRIAL_ALREADY_USED for duplicate trial requests", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() {
        throw new AppError("User has already used their trial.", 409, ErrorCodes.TRIAL_ALREADY_USED);
      },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/subscriptions/trial",
      headers: { authorization: "Bearer phase-3" },
      json: {},
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "TRIAL_ALREADY_USED");
  });

  it("creates a paid subscription for POST /v1/subscriptions", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription(userId, planId) {
        assert.equal(userId, "usr_abc123");
        assert.equal(planId, "plan_yearly");
        return {
          cancelAtPeriodEnd: false,
          createdAt: new Date("2026-02-28T10:00:00.000Z"),
          currentPeriodEnd: null,
          currentPeriodStart: null,
          id: "sub_abc123",
          paymentUrl: "https://pay.fluently.app/checkout/sub_abc123",
          planId: "plan_yearly",
          status: "pending",
          trialEndDate: null,
        };
      },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/subscriptions",
      headers: { authorization: "Bearer phase-3" },
      json: { plan_id: "plan_yearly" },
    });

    assert.equal(response.statusCode, 201);
    const body = response.json<{ data: { status: string; plan_id: string; payment_url: string } }>();
    assert.equal(body.data.status, "pending");
    assert.equal(body.data.plan_id, "plan_yearly");
  });

  it("validates plan ids for POST /v1/subscriptions", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/subscriptions",
      headers: { authorization: "Bearer phase-3" },
      json: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "INVALID_PLAN");
  });

  it("returns the current subscription or null for GET /v1/subscriptions/me", async () => {
    const firstService: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() {
        return null;
      },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const secondService: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() {
        return {
          cancelAtPeriodEnd: false,
          createdAt: new Date("2026-02-28T10:00:00.000Z"),
          currentPeriodEnd: new Date("2027-02-28T10:00:00.000Z"),
          currentPeriodStart: new Date("2026-02-28T10:00:00.000Z"),
          id: "sub_abc123",
          paymentUrl: "https://pay.fluently.app/checkout/sub_abc123",
          planId: "plan_yearly",
          status: "active",
          trialEndDate: null,
        };
      },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };

    const clientNoSubscription = createTestClient(createApp(firstService));
    const noSubscription = await clientNoSubscription.request({
      method: "GET",
      path: "/v1/subscriptions/me",
      headers: { authorization: "Bearer phase-3" },
    });
    assert.equal(noSubscription.statusCode, 200);
    assert.equal(noSubscription.json<{ data: null }>().data, null);

    const clientWithSubscription = createTestClient(createApp(secondService));
    const withSubscription = await clientWithSubscription.request({
      method: "GET",
      path: "/v1/subscriptions/me",
      headers: { authorization: "Bearer phase-3" },
    });
    assert.equal(withSubscription.statusCode, 200);
    assert.equal(withSubscription.json<{ data: { status: string } }>().data.status, "active");
  });

  it("cancels a subscription for POST /v1/subscriptions/me/cancel", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription(userId) {
        assert.equal(userId, "usr_abc123");
        return {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date("2027-02-28T10:00:00.000Z"),
          id: "sub_abc123",
          status: "active",
        };
      },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/subscriptions/me/cancel",
      headers: { authorization: "Bearer phase-3" },
      json: {},
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { cancel_at_period_end: boolean; status: string } }>();
    assert.equal(body.data.cancel_at_period_end, true);
    assert.equal(body.data.status, "active");
  });

  it("returns NO_ACTIVE_SUBSCRIPTION for missing subscriptions to cancel", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() {
        throw new AppError("No active subscription to cancel.", 404, ErrorCodes.NO_ACTIVE_SUBSCRIPTION);
      },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/subscriptions/me/cancel",
      headers: { authorization: "Bearer phase-3" },
      json: {},
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "NO_ACTIVE_SUBSCRIPTION");
  });

  it("returns an invoice for GET /v1/subscriptions/me/invoice", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice(userId) {
        assert.equal(userId, "usr_abc123");
        return {
          amount: 799,
          currency: "INR",
          invoiceDate: "2026-02-28",
          invoiceUrl: "https://cdn.fluently.app/invoices/inv_abc123.pdf",
          planName: "Yearly Plan",
          status: "paid",
        };
      },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/subscriptions/me/invoice",
      headers: { authorization: "Bearer phase-3" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.json<{ data: { invoice_url: string } }>().data.invoice_url,
      "https://cdn.fluently.app/invoices/inv_abc123.pdf",
    );
  });

  it("returns NO_INVOICE when no invoice exists", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() { throw new Error("unused"); },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() {
        throw new AppError("No invoices available.", 404, ErrorCodes.NO_INVOICE);
      },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/subscriptions/me/invoice",
      headers: { authorization: "Bearer phase-3" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "NO_INVOICE");
  });

  it("keeps /api/subscriptions/plans as a compatibility alias", async () => {
    const service: SubscriptionServiceContract = {
      async cancelCurrentSubscription() { throw new Error("unused"); },
      async createSubscription() { throw new Error("unused"); },
      async getAvailablePlans() {
        return {
          trialOffer: { autoRenew: false, benefits: ["Speak with Confidence", "Crack Interviews", "Ace Exams"], durationDays: 7, priceAmount: 9, priceCurrency: "INR", warningText: "Missing this offer could slow your progress" },
          plans: [
            { badge: "BEST FOR YOUR GOAL", description: null, id: "plan_yearly", interval: "year" as const, monthlyEquivalent: 67, name: "Yearly Plan", priceAmount: 799, priceCurrency: "INR" },
            { badge: null, description: "Matches your 20-min daily plan", id: "plan_monthly", interval: "month" as const, monthlyEquivalent: 199, name: "Monthly Plan", priceAmount: 199, priceCurrency: "INR" },
          ],
        };
      },
      async getCurrentSubscription() { throw new Error("unused"); },
      async getLatestInvoice() { throw new Error("unused"); },
      async startTrial() { throw new Error("unused"); },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/api/subscriptions/plans",
      headers: { authorization: "Bearer phase-3" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { plans: Array<{ id: string }> } }>().data.plans[0]?.id, "plan_yearly");
  });
});
