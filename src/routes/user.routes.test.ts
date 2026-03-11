import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "../middleware/error-handler";
import type { QuestionnaireServiceContract } from "../services/questionnaire.service";
import type { UserServiceContract } from "../services/user.service";
import { buildMultipartFormData } from "../test/support/multipart";
import { createTestClient } from "../test/support/test-client";
import { createUserRouter } from "./user.routes";

function createUser(phone = "+919483898443"): User {
  const now = new Date("2026-02-28T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: "sachin@example.com",
    id: "usr_abc123",
    isOnboarded: true,
    name: "Sachin Kumar",
    phone,
    subscriptionStatus: "trial",
    trialUsedAt: null,
    updatedAt: now,
  };
}

function createAuthMiddleware(): RequestHandler {
  return (req, _res, next) => {
    if (req.headers.authorization !== "Bearer phase-2") {
      next(new AppError("Missing or invalid authorization header", 401, ErrorCodes.UNAUTHORIZED));
      return;
    }

    req.auth = {
      sessionId: "session_phase2",
      userId: "usr_abc123",
    };
    req.user = createUser();
    next();
  };
}

function createApp(userService: UserServiceContract, questionnaireService: QuestionnaireServiceContract) {
  const app = express();
  app.use(express.json());
  app.use("/v1/users", createUserRouter({
    authenticateMiddleware: createAuthMiddleware(),
    questionnaireService,
    userService,
  }));
  app.use("/api/users", createUserRouter({
    authenticateMiddleware: createAuthMiddleware(),
    questionnaireService,
    userService,
  }));
  app.use(errorHandler);
  return app;
}

describe("user routes", () => {
  const questionnaireService: QuestionnaireServiceContract = {
    async getPersonalizedPlan() {
      return {
        goal_label: "Office communication",
        challenge_label: "Words don't come quickly",
        daily_practice_minutes: 20,
        milestones: [
          { week: 1, label: "Stop translating in mind" },
        ],
        plan_features: ["Daily speaking practice (20 mins)"],
        social_proof: "92% learners improved confidence in 21 days",
      };
    },
    async submitQuestionnaire() {
      throw new Error("not implemented");
    },
  };

  it("returns the authenticated user for GET /v1/users/me", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/users/me",
      headers: { authorization: "Bearer phase-2" },
    });
    const body = response.json<{
      data: {
        avatar_url: string | null;
        created_at: string;
        email: string | null;
        id: string;
        is_onboarded: boolean;
        name: string | null;
        phone: string;
        subscription_status: string;
        updated_at: string;
      };
      meta: { timestamp: string };
      success: true;
    }>();

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.id, "usr_abc123");
    assert.equal(body.data.subscription_status, "trial");
  });

  it("rejects unauthorized GET /v1/users/me", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/users/me",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "UNAUTHORIZED");
  });

  it("updates the user for PATCH /v1/users/me", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile(userId, data) {
        assert.equal(userId, "usr_abc123");
        assert.deepEqual(data, { name: "Updated User" });
        return createUser("+919483898443");
      },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "PATCH",
      path: "/v1/users/me",
      headers: { authorization: "Bearer phase-2" },
      json: { name: "Updated User" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { id: string } }>().data.id, "usr_abc123");
  });

  it("validates PATCH /v1/users/me input", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "PATCH",
      path: "/v1/users/me",
      headers: { authorization: "Bearer phase-2" },
      json: { email: "bad-email" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "INVALID_EMAIL");
  });

  it("returns EMAIL_CONFLICT for duplicate emails on PATCH /v1/users/me", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() {
        throw new AppError("Email already in use", 409, ErrorCodes.EMAIL_CONFLICT);
      },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "PATCH",
      path: "/v1/users/me",
      headers: { authorization: "Bearer phase-2" },
      json: { email: "used@example.com" },
    });
    const body = response.json<{
      error: {
        code: string;
        message: string;
      };
      meta: { timestamp: string };
      success: false;
    }>();

    assert.equal(response.statusCode, 409);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: ErrorCodes.EMAIL_CONFLICT,
        message: "Email already in use",
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("keeps /api/users/me as a compatibility alias", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/api/users/me",
      headers: { authorization: "Bearer phase-2" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { id: string } }>().data.id, "usr_abc123");
  });

  it("uploads an avatar for POST /v1/users/me/avatar", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar(userId, file) {
        assert.equal(userId, "usr_abc123");
        assert.equal(file.mimetype, "image/jpeg");
        return "https://cdn.fluently.app/avatars/usr_abc123.jpg?v=1709118300";
      },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      fieldName: "file",
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      content: Buffer.from("jpeg-binary"),
    });

    const response = await client.request({
      method: "POST",
      path: "/v1/users/me/avatar",
      headers: {
        authorization: "Bearer phase-2",
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.json<{ data: { avatar_url: string } }>().data.avatar_url,
      "https://cdn.fluently.app/avatars/usr_abc123.jpg?v=1709118300",
    );
  });

  it("rejects unsupported avatar file types", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      fieldName: "file",
      filename: "avatar.gif",
      contentType: "image/gif",
      content: Buffer.from("gif-binary"),
    });

    const response = await client.request({
      method: "POST",
      path: "/v1/users/me/avatar",
      headers: {
        authorization: "Bearer phase-2",
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "INVALID_FILE_TYPE");
  });

  it("rejects oversized avatar uploads", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      fieldName: "file",
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      content: Buffer.alloc(5 * 1024 * 1024 + 1, 1),
    });

    const response = await client.request({
      method: "POST",
      path: "/v1/users/me/avatar",
      headers: {
        authorization: "Bearer phase-2",
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 413);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "FILE_TOO_LARGE");
  });

  it("deletes the avatar for DELETE /v1/users/me/avatar", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar(userId) {
        assert.equal(userId, "usr_abc123");
      },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "DELETE",
      path: "/v1/users/me/avatar",
      headers: { authorization: "Bearer phase-2" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { avatar_url: null } }>().data.avatar_url, null);
  });

  it("soft deletes the account for DELETE /v1/users/me", async () => {
    const userService: UserServiceContract = {
      async deleteAccount(userId) {
        assert.equal(userId, "usr_abc123");
      },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "DELETE",
      path: "/v1/users/me",
      headers: { authorization: "Bearer phase-2" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.json<{ data: { message: string } }>().data.message,
      "Account deleted successfully",
    );
  });

  it("returns the personalized plan for GET /v1/users/me/personalized-plan", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const app = createApp(userService, questionnaireService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/users/me/personalized-plan",
      headers: { authorization: "Bearer phase-2" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.json<{ data: { goal_label: string } }>().data.goal_label,
      "Office communication",
    );
  });

  it("returns PLAN_NOT_FOUND for missing personalized plans", async () => {
    const userService: UserServiceContract = {
      async deleteAccount() { return; },
      async deleteAvatar() { return; },
      async updateProfile() { throw new Error("not implemented"); },
      async uploadAvatar() { throw new Error("not implemented"); },
    };
    const missingPlanService: QuestionnaireServiceContract = {
      async getPersonalizedPlan() {
        throw new AppError("Questionnaire not yet completed", 404, ErrorCodes.PLAN_NOT_FOUND);
      },
      async submitQuestionnaire() {
        throw new Error("not implemented");
      },
    };
    const app = createApp(userService, missingPlanService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/users/me/personalized-plan",
      headers: { authorization: "Bearer phase-2" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "PLAN_NOT_FOUND");
  });
});
