import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LearningGoal, QuestionnaireAnswers, SpeakingChallenge, ThirtyDayGoal, User } from "@prisma/client";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { QuestionnaireService } from "./questionnaire.service";

function createAnswers(): QuestionnaireAnswers {
  return {
    createdAt: new Date("2026-02-28T10:00:00.000Z"),
    dailyPracticeMinutes: 20,
    id: "qa_123",
    learningGoal: "office_communication" as LearningGoal,
    speakingChallenge: "words_dont_come" as SpeakingChallenge,
    thirtyDayGoal: "clear_interviews" as ThirtyDayGoal,
    userId: "usr_abc123",
  };
}

describe("QuestionnaireService", () => {
  it("submits questionnaire answers and marks the user onboarded transactionally", async () => {
    let markedOnboardedUserId = "";
    const service = new QuestionnaireService({
      createQuestionnaireRepository: () => ({
        async create() {
          return createAnswers();
        },
        async findByUserId() {
          return null;
        },
      }),
      createUserRepository: () => ({
        async create() {
          throw new Error("unused");
        },
        async findById() {
          return null;
        },
        async findByPhone() {
          return null;
        },
        async markOnboarded(userId) {
          markedOnboardedUserId = userId;
        },
        async softDelete() {
          return;
        },
        async update() {
          throw new Error("unused");
        },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.submitQuestionnaire("usr_abc123", {
      learning_goal: "office_communication",
      speaking_challenge: "words_dont_come",
      thirty_day_goal: "clear_interviews",
      daily_practice_minutes: 20,
    });

    assert.equal(result.questionnaire_completed, true);
    assert.equal(markedOnboardedUserId, "usr_abc123");
    assert.equal(result.personalized_plan.goal_label, "Office communication");
  });

  it("returns ALREADY_COMPLETED when answers already exist", async () => {
    const service = new QuestionnaireService({
      createQuestionnaireRepository: () => ({
        async create() {
          throw new Error("unused");
        },
        async findByUserId() {
          return createAnswers();
        },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return null; },
        async findByPhone() { return null; },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.submitQuestionnaire("usr_abc123", {
        learning_goal: "office_communication",
        speaking_challenge: "words_dont_come",
        thirty_day_goal: "clear_interviews",
        daily_practice_minutes: 20,
      }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.ALREADY_COMPLETED);
        return true;
      },
    );
  });

  it("returns PLAN_NOT_FOUND when no personalized plan exists", async () => {
    const service = new QuestionnaireService({
      createQuestionnaireRepository: () => ({
        async create() {
          throw new Error("unused");
        },
        async findByUserId() {
          return null;
        },
      }),
      createUserRepository: () => ({
        async create() { throw new Error("unused"); },
        async findById() { return null; },
        async findByPhone() { return null; },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.getPersonalizedPlan("usr_abc123"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.PLAN_NOT_FOUND);
        return true;
      },
    );
  });
});
