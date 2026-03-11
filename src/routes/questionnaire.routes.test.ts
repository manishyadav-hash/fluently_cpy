import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "../middleware/error-handler";
import type { QuestionnaireServiceContract } from "../services/questionnaire.service";
import { createTestClient } from "../test/support/test-client";
import { createQuestionnaireRouter } from "./questionnaire.routes";

function createUser(): User {
  const now = new Date("2026-02-28T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: null,
    id: "usr_abc123",
    isOnboarded: false,
    name: null,
    phone: "+919483898443",
    subscriptionStatus: "none",
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

function createApp(service: QuestionnaireServiceContract) {
  const app = express();
  app.use(express.json());
  app.use("/v1/onboarding", createQuestionnaireRouter({
    authenticateMiddleware: createAuthMiddleware(),
    questionnaireService: service,
  }));
  app.use(errorHandler);
  return app;
}

describe("questionnaire routes", () => {
  it("submits the questionnaire for POST /v1/onboarding/questionnaire", async () => {
    const service: QuestionnaireServiceContract = {
      async getPersonalizedPlan() {
        throw new Error("not implemented");
      },
      async submitQuestionnaire(userId, payload) {
        assert.equal(userId, "usr_abc123");
        assert.equal(payload.learning_goal, "office_communication");
        return {
          questionnaire_completed: true,
          personalized_plan: {
            goal_label: "Office communication",
            challenge_label: "Words don't come quickly",
            daily_practice_minutes: 20,
            milestones: [{ week: 1, label: "Stop translating in mind" }],
            plan_features: ["Daily speaking practice (20 mins)"],
            social_proof: "92% learners improved confidence in 21 days",
          },
        };
      },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/onboarding/questionnaire",
      headers: { authorization: "Bearer phase-2" },
      json: {
        learning_goal: "office_communication",
        speaking_challenge: "words_dont_come",
        thirty_day_goal: "clear_interviews",
        daily_practice_minutes: 20,
      },
    });

    assert.equal(response.statusCode, 201);
    assert.equal(
      response.json<{ data: { questionnaire_completed: boolean } }>().data.questionnaire_completed,
      true,
    );
  });

  it("validates questionnaire input", async () => {
    const service: QuestionnaireServiceContract = {
      async getPersonalizedPlan() {
        throw new Error("not implemented");
      },
      async submitQuestionnaire() {
        throw new Error("not implemented");
      },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/onboarding/questionnaire",
      headers: { authorization: "Bearer phase-2" },
      json: {
        learning_goal: "invalid",
        speaking_challenge: "words_dont_come",
        thirty_day_goal: "clear_interviews",
        daily_practice_minutes: 20,
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "INVALID_ANSWER");
  });

  it("rejects unauthorized questionnaire submissions", async () => {
    const service: QuestionnaireServiceContract = {
      async getPersonalizedPlan() {
        throw new Error("not implemented");
      },
      async submitQuestionnaire() {
        throw new Error("not implemented");
      },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/onboarding/questionnaire",
      json: {
        learning_goal: "office_communication",
        speaking_challenge: "words_dont_come",
        thirty_day_goal: "clear_interviews",
        daily_practice_minutes: 20,
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "UNAUTHORIZED");
  });

  it("returns ALREADY_COMPLETED conflicts", async () => {
    const service: QuestionnaireServiceContract = {
      async getPersonalizedPlan() {
        throw new Error("not implemented");
      },
      async submitQuestionnaire() {
        throw new AppError("Questionnaire was already submitted", 409, ErrorCodes.ALREADY_COMPLETED);
      },
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/onboarding/questionnaire",
      headers: { authorization: "Bearer phase-2" },
      json: {
        learning_goal: "office_communication",
        speaking_challenge: "words_dont_come",
        thirty_day_goal: "clear_interviews",
        daily_practice_minutes: 20,
      },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json<{ error: { code: string } }>().error.code, "ALREADY_COMPLETED");
  });
});
