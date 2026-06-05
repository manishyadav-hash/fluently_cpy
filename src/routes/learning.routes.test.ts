import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "../middleware/error-handler";
import type { LearningServiceContract } from "../services/learning.service";
import { buildMultipartFormData } from "../test/support/multipart";
import { createTestClient } from "../test/support/test-client";
import { createLearningRouter } from "./learning.routes";

function createUser(): User {
  const now = new Date("2026-03-01T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: "learner@example.com",
    id: "usr_learning",
    isOnboarded: true,
    name: "Sachin Kumar",
    phone: "+919483898443",
    subscriptionStatus: "trial",
    trialUsedAt: null,
    updatedAt: now,
  };
}

function createAuthMiddleware(): RequestHandler {
  return (req, _res, next) => {
    if (req.headers.authorization !== "Bearer phase-4") {
      next(new AppError("Missing or invalid authorization header", 401, ErrorCodes.UNAUTHORIZED));
      return;
    }

    req.auth = {
      sessionId: "session_phase4",
      userId: "usr_learning",
    };
    req.user = createUser();
    next();
  };
}

function createLearningService(): LearningServiceContract {
  return {
    async completeLesson() {
      throw new Error("unused");
    },
    async getDashboard() {
      throw new Error("unused");
    },
    async getLessonDetails() {
      throw new Error("unused");
    },
    async getUserStats() {
      throw new Error("unused");
    },
    async listModules() {
      throw new Error("unused");
    },
    async submitLessonAudio() {
      throw new Error("unused");
    },
  };
}

function createApp(service: LearningServiceContract) {
  const routerOptions = {
    authenticateMiddleware: createAuthMiddleware(),
    learningService: service,
  };
  const app = express();
  app.use(express.json());
  app.use("/v1", createLearningRouter(routerOptions));
  app.use("/api", createLearningRouter(routerOptions));
  app.use(errorHandler);
  return app;
}

describe("learning routes", () => {
  it("returns dashboard data for GET /v1/users/me/dashboard", async () => {
    const service = createLearningService();
    service.getDashboard = async userId => {
      assert.equal(userId, "usr_learning");
      return {
        fluencyJourneyLabel: "You're on Week 1 - Keep going!",
        greeting: "Good evening",
        isPremium: true,
        progress: {
          currentWeek: 1,
          totalWeeks: 4,
          weeklyProgress: [
            { lessonsCompleted: 2, lessonsTotal: 5, status: "in_progress", week: 1 },
            { lessonsCompleted: 0, lessonsTotal: 5, status: "locked", week: 2 },
          ],
          weeksCompleted: 0,
        },
        stats: {
          currentStreakDays: 3,
          language: "ENG",
          lessonsCompleted: 7,
          rating: 4.9,
          totalPracticeMinutes: 45,
          xp: 12,
        },
        userName: "Sachin",
      };
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "GET",
      path: "/v1/users/me/dashboard",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      data: {
        fluency_journey_label: string;
        greeting: string;
        is_premium: boolean;
        progress: { current_week: number; weekly_progress: Array<{ status: string }> };
        stats: { language: string; xp: number };
        user_name: string;
      };
    }>();
    assert.equal(body.data.user_name, "Sachin");
    assert.equal(body.data.stats.language, "ENG");
    assert.equal(body.data.progress.current_week, 1);
    assert.equal(body.data.progress.weekly_progress[0]?.status, "in_progress");
    assert.equal(body.data.fluency_journey_label, "You're on Week 1 - Keep going!");
  });

  it("requires auth for GET /v1/users/me/dashboard", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/users/me/dashboard",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("returns modules for GET /v1/modules and includes lessons by default", async () => {
    const service = createLearningService();
    service.listModules = async (userId, includeLessons) => {
      assert.equal(userId, "usr_learning");
      assert.equal(includeLessons, true);
      return [
        {
          id: "mod_w1",
          lessons: [
            {
              durationLabel: "5 min",
              id: "les_001",
              moduleId: "mod_w1",
              order: 1,
              status: "completed",
              title: "Yesterday's activities",
              type: "speaking_drill",
            },
          ],
          lessonsCompleted: 1,
          lessonsTotal: 5,
          status: "in_progress",
          title: "Week 1 - Basics of Speaking",
          weekNumber: 1,
        },
      ];
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "GET",
      path: "/v1/modules",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: Array<{ lessons: Array<{ module_id: string }>; week_number: number }> }>();
    assert.equal(body.data[0]?.week_number, 1);
    assert.equal(body.data[0]?.lessons[0]?.module_id, "mod_w1");
  });

  it("supports include_lessons=false for GET /v1/modules", async () => {
    const service = createLearningService();
    service.listModules = async (_userId, includeLessons) => {
      assert.equal(includeLessons, false);
      return [
        {
          id: "mod_w1",
          lessons: [],
          lessonsCompleted: 1,
          lessonsTotal: 5,
          status: "in_progress",
          title: "Week 1 - Basics of Speaking",
          weekNumber: 1,
        },
      ];
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "GET",
      path: "/v1/modules?include_lessons=false",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<{ data: Array<{ lessons: unknown[] }> }>().data[0]?.lessons, []);
  });

  it("requires auth for GET /v1/modules", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/modules",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("returns lesson details for GET /v1/lessons/:lesson_id", async () => {
    const service = createLearningService();
    service.getLessonDetails = async (userId, lessonId) => {
      assert.equal(userId, "usr_learning");
      assert.equal(lessonId, "les_001");
      return {
        content: {
          backgroundImageUrl: "https://cdn.fluently.app/lessons/les_001_bg.jpg",
          instructions: "Record yourself speaking for 60 seconds about your day.",
          promptText: "Let's start by recording a quick introduction.",
        },
        durationLabel: "5 min",
        id: "les_001",
        moduleId: "mod_w1",
        order: 1,
        status: "in_progress",
        title: "Yesterday's activities",
        type: "speaking_drill",
      };
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "GET",
      path: "/v1/lessons/les_001",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { content: { background_image_url: string | null }; module_id: string } }>();
    assert.equal(body.data.module_id, "mod_w1");
    assert.equal(body.data.content.background_image_url, "https://cdn.fluently.app/lessons/les_001_bg.jpg");
  });

  it("returns LESSON_LOCKED when the lesson is not yet available", async () => {
    const service = createLearningService();
    service.getLessonDetails = async () => {
      throw new AppError("Lesson is locked", 403, ErrorCodes.LESSON_LOCKED);
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "GET",
      path: "/v1/lessons/les_002",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.LESSON_LOCKED);
  });

  it("requires auth for GET /v1/lessons/:lesson_id", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/lessons/les_001",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("uploads lesson audio for POST /v1/lessons/:lesson_id/audio", async () => {
    const service = createLearningService();
    service.submitLessonAudio = async (userId, lessonId, file, durationSeconds) => {
      assert.equal(userId, "usr_learning");
      assert.equal(lessonId, "les_001");
      assert.equal(file.mimetype, "audio/mpeg");
      assert.equal(durationSeconds, 62);
      return {
        durationSeconds,
        feedback: {
          fluencyScore: 6.8,
          grammarScore: 8.1,
          overallScore: 7.4,
          pronunciationScore: 7.2,
          suggestions: [
            "Try to slow down when pronouncing longer words.",
            "Good use of past tense verbs!",
          ],
        },
        lessonId,
        submissionId: "sub_audio_xyz",
        xpEarned: 5,
      };
    };
    const app = createApp(service);
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      content: Buffer.from("mp3-binary"),
      contentType: "audio/mpeg",
      fieldName: "file",
      filename: "lesson.mp3",
    }, { duration_seconds: 62 });

    const response = await client.request({
      headers: {
        authorization: "Bearer phase-4",
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      method: "POST",
      path: "/v1/lessons/les_001/audio",
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      data: {
        duration_seconds: number;
        feedback: { overall_score: number; suggestions: string[] };
        lesson_id: string;
        submission_id: string;
        xp_earned: number;
      };
    }>();
    assert.equal(body.data.submission_id, "sub_audio_xyz");
    assert.equal(body.data.duration_seconds, 62);
    assert.equal(body.data.feedback.overall_score, 7.4);
    assert.equal(body.data.feedback.suggestions.length, 2);
  });

  it("rejects unsupported lesson audio formats", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      content: Buffer.from("ogg-binary"),
      contentType: "audio/ogg",
      fieldName: "file",
      filename: "lesson.ogg",
    }, { duration_seconds: 62 });

    const response = await client.request({
      headers: {
        authorization: "Bearer phase-4",
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      method: "POST",
      path: "/v1/lessons/les_001/audio",
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.INVALID_AUDIO_FORMAT);
  });

  it("rejects oversized lesson audio uploads", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      content: Buffer.alloc(25 * 1024 * 1024 + 1, 1),
      contentType: "audio/mpeg",
      fieldName: "file",
      filename: "lesson.mp3",
    }, { duration_seconds: 62 });

    const response = await client.request({
      headers: {
        authorization: "Bearer phase-4",
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      method: "POST",
      path: "/v1/lessons/les_001/audio",
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 413);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.FILE_TOO_LARGE);
  });

  it("validates duration_seconds for POST /v1/lessons/:lesson_id/audio", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      content: Buffer.from("mp3-binary"),
      contentType: "audio/mpeg",
      fieldName: "file",
      filename: "lesson.mp3",
    });

    const response = await client.request({
      headers: {
        authorization: "Bearer phase-4",
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      method: "POST",
      path: "/v1/lessons/les_001/audio",
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.VALIDATION_ERROR);
  });

  it("requires auth for POST /v1/lessons/:lesson_id/audio", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);
    const multipart = buildMultipartFormData({
      content: Buffer.from("mp3-binary"),
      contentType: "audio/mpeg",
      fieldName: "file",
      filename: "lesson.mp3",
    }, { duration_seconds: 62 });

    const response = await client.request({
      headers: {
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      method: "POST",
      path: "/v1/lessons/les_001/audio",
      payload: multipart.payload,
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("completes a lesson for POST /v1/lessons/:lesson_id/complete", async () => {
    const service = createLearningService();
    service.completeLesson = async (userId, lessonId) => {
      assert.equal(userId, "usr_learning");
      assert.equal(lessonId, "les_001");
      return {
        lessonId,
        moduleProgress: {
          lessonsCompleted: 3,
          lessonsTotal: 5,
        },
        nextLesson: {
          id: "les_002",
          status: "available",
          title: "Your weekend story",
        },
        status: "completed",
        xpEarned: 5,
      };
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "POST",
      path: "/v1/lessons/les_001/complete",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      data: {
        lesson_id: string;
        module_progress: { lessons_completed: number };
        next_lesson: { status: string };
        xp_earned: number;
      };
    }>();
    assert.equal(body.data.lesson_id, "les_001");
    assert.equal(body.data.next_lesson.status, "available");
    assert.equal(body.data.module_progress.lessons_completed, 3);
  });

  it("returns AUDIO_NOT_SUBMITTED for POST /v1/lessons/:lesson_id/complete when needed", async () => {
    const service = createLearningService();
    service.completeLesson = async () => {
      throw new AppError("Audio must be submitted before completing the lesson.", 400, ErrorCodes.AUDIO_NOT_SUBMITTED);
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "POST",
      path: "/v1/lessons/les_001/complete",
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.AUDIO_NOT_SUBMITTED);
  });

  it("requires auth for POST /v1/lessons/:lesson_id/complete", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/lessons/les_001/complete",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("returns user stats for GET /v1/users/me/stats", async () => {
    const service = createLearningService();
    service.getUserStats = async userId => {
      assert.equal(userId, "usr_learning");
      return {
        currentStreakDays: 3,
        language: "ENG",
        lessonsCompleted: 7,
        rating: 4.9,
        totalPracticeMinutes: 45,
        xp: 12,
      };
    };
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      headers: { authorization: "Bearer phase-4" },
      method: "GET",
      path: "/v1/users/me/stats",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { current_streak_days: number; language: string; xp: number } }>();
    assert.equal(body.data.language, "ENG");
    assert.equal(body.data.current_streak_days, 3);
    assert.equal(body.data.xp, 12);
  });

  it("requires auth for GET /v1/users/me/stats", async () => {
    const app = createApp(createLearningService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/users/me/stats",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("keeps /api/modules as a compatibility alias", async () => {
    const service = createLearningService();
    service.listModules = async () => [
      { id: "mod_1", lessonsTotal: 5, lessonsCompleted: 0, title: "Week 1", weekNumber: 1, status: "in_progress", lessons: [] },
    ];
    const app = createApp(service);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/api/modules",
      headers: { authorization: "Bearer phase-4" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: Array<{ id: string }> }>().data[0]?.id, "mod_1");
  });
});
