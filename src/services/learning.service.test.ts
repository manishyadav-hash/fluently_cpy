import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LessonStatus, LessonType, SubscriptionStatus } from "@prisma/client";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { LearningService } from "./learning.service";

type ModuleRecord = {
  id: string;
  lessons: Array<{
    backgroundImageUrl: string | null;
    durationLabel: string;
    id: string;
    instructions: string | null;
    moduleId: string;
    order: number;
    promptText: string | null;
    title: string;
    type: LessonType;
  }>;
  title: string;
  weekNumber: number;
};

type ProgressRecord = {
  audioSubmitted: boolean;
  completedAt: Date | null;
  id: string;
  lessonId: string;
  status: LessonStatus;
  updatedAt: Date;
};

function createModuleRecords(): ModuleRecord[] {
  return [
    {
      id: "mod_w1",
      lessons: [
        {
          backgroundImageUrl: "https://cdn.fluently.app/lessons/les_001_bg.jpg",
          durationLabel: "5 min",
          id: "les_001",
          instructions: "Record yourself speaking for 60 seconds about your day.",
          moduleId: "mod_w1",
          order: 1,
          promptText: "Talk about what you did yesterday.",
          title: "Yesterday's activities",
          type: "speaking_drill",
        },
        {
          backgroundImageUrl: null,
          durationLabel: "3 min",
          id: "les_002",
          instructions: "Share a short story about your weekend.",
          moduleId: "mod_w1",
          order: 2,
          promptText: "Describe your weekend story.",
          title: "Your weekend story",
          type: "audio_response",
        },
      ],
      title: "Week 1 - Basics of Speaking",
      weekNumber: 1,
    },
    {
      id: "mod_w2",
      lessons: [
        {
          backgroundImageUrl: null,
          durationLabel: "4 min",
          id: "les_003",
          instructions: "Describe a conversation from work.",
          moduleId: "mod_w2",
          order: 1,
          promptText: "Talk about an office conversation.",
          title: "Office conversation",
          type: "conversation",
        },
      ],
      title: "Week 2 - Office Conversations",
      weekNumber: 2,
    },
  ];
}

describe("LearningService", () => {
  it("builds dashboard progress and premium access from the user's learning state", async () => {
    const service = new LearningService({
      createLearningRepository: () => ({
        async createAudioSubmission() {
          throw new Error("unused");
        },
        async ensureDefaultCurriculum() {
          return;
        },
        async findLatestAudioSubmission() {
          return null;
        },
        async findUserLearningProfile() {
          return {
            id: "usr_learning",
            name: "Sachin Kumar",
            settingsLanguage: "en",
            stats: {
              currentStreakDays: 3,
              lastActivityDate: new Date("2026-03-10T06:00:00.000Z"),
              lessonsCompleted: 1,
              rating: 4.9,
              totalPracticeMinutes: 45,
              xp: 12,
            },
            subscriptionStatus: "trial" as SubscriptionStatus,
          };
        },
        async getOrCreateUserStats() {
          throw new Error("unused");
        },
        async listModulesWithLessons() {
          return createModuleRecords();
        },
        async listUserProgress() {
          return [
            {
              audioSubmitted: true,
              completedAt: new Date("2026-03-10T06:00:00.000Z"),
              id: "progress_1",
              lessonId: "les_001",
              status: "completed" as LessonStatus,
              updatedAt: new Date("2026-03-10T06:00:00.000Z"),
            },
          ];
        },
        async updateLessonProgress() {
          throw new Error("unused");
        },
        async updateUserStats() {
          throw new Error("unused");
        },
      }),
      now: () => new Date("2026-03-11T15:30:00.000Z"),
      runInTransaction: async callback => callback({} as never),
    });

    const dashboard = await service.getDashboard("usr_learning");

    assert.equal(dashboard.greeting, "Good evening");
    assert.equal(dashboard.userName, "Sachin");
    assert.equal(dashboard.isPremium, true);
    assert.equal(dashboard.progress.currentWeek, 1);
    assert.equal(dashboard.progress.totalWeeks, 2);
    assert.equal(dashboard.progress.weeklyProgress[0]?.status, "in_progress");
    assert.equal(dashboard.progress.weeklyProgress[1]?.status, "locked");
    assert.equal(dashboard.stats.language, "ENG");
  });

  it("seeds default curriculum when learning content is empty", async () => {
    let seedCalled = false;
    let listCalls = 0;
    const service = new LearningService({
      createLearningRepository: () => ({
        async createAudioSubmission() {
          throw new Error("unused");
        },
        async ensureDefaultCurriculum(modules) {
          seedCalled = modules.length > 0;
        },
        async findLatestAudioSubmission() {
          return null;
        },
        async findUserLearningProfile() {
          return {
            id: "usr_learning",
            name: "Sachin Kumar",
            settingsLanguage: "en",
            stats: null,
            subscriptionStatus: "none" as SubscriptionStatus,
          };
        },
        async getOrCreateUserStats() {
          return {
            currentStreakDays: 0,
            lastActivityDate: null,
            lessonsCompleted: 0,
            rating: 0,
            totalPracticeMinutes: 0,
            xp: 0,
          };
        },
        async listModulesWithLessons() {
          listCalls += 1;
          return listCalls === 1 ? [] : createModuleRecords();
        },
        async listUserProgress() {
          return [];
        },
        async updateLessonProgress() {
          throw new Error("unused");
        },
        async updateUserStats() {
          throw new Error("unused");
        },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const modules = await service.listModules("usr_learning", true);

    assert.equal(seedCalled, true);
    assert.equal(modules.length, 2);
  });

  it("returns LESSON_LOCKED when a lesson is still locked", async () => {
    const service = new LearningService({
      createLearningRepository: () => ({
        async createAudioSubmission() {
          throw new Error("unused");
        },
        async ensureDefaultCurriculum() {
          return;
        },
        async findLatestAudioSubmission() {
          return null;
        },
        async findUserLearningProfile() {
          return {
            id: "usr_learning",
            name: "Sachin Kumar",
            settingsLanguage: "en",
            stats: null,
            subscriptionStatus: "none" as SubscriptionStatus,
          };
        },
        async getOrCreateUserStats() {
          return {
            currentStreakDays: 0,
            lastActivityDate: null,
            lessonsCompleted: 0,
            rating: 0,
            totalPracticeMinutes: 0,
            xp: 0,
          };
        },
        async listModulesWithLessons() {
          return createModuleRecords();
        },
        async listUserProgress() {
          return [];
        },
        async updateLessonProgress() {
          throw new Error("unused");
        },
        async updateUserStats() {
          throw new Error("unused");
        },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.getLessonDetails("usr_learning", "les_003"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.LESSON_LOCKED);
        return true;
      },
    );
  });

  it("submits lesson audio, stores feedback, and marks the lesson in progress", async () => {
    let updatedProgressStatus: LessonStatus | null = null;
    const service = new LearningService({
      createLearningRepository: () => ({
        async createAudioSubmission(input) {
          assert.equal(input.durationSeconds, 62);
          assert.equal(input.userLessonProgressId, "progress_1");
          return {
            durationSeconds: input.durationSeconds,
            fluencyScore: input.fluencyScore,
            grammarScore: input.grammarScore,
            id: "sub_audio_xyz",
            overallScore: input.overallScore,
            pronunciationScore: input.pronunciationScore,
            suggestions: input.suggestions,
            xpEarned: input.xpEarned,
          };
        },
        async ensureDefaultCurriculum() {
          return;
        },
        async findLatestAudioSubmission() {
          return null;
        },
        async findUserLearningProfile() {
          return {
            id: "usr_learning",
            name: "Sachin Kumar",
            settingsLanguage: "en",
            stats: null,
            subscriptionStatus: "none" as SubscriptionStatus,
          };
        },
        async getOrCreateUserStats() {
          return {
            currentStreakDays: 0,
            lastActivityDate: null,
            lessonsCompleted: 0,
            rating: 0,
            totalPracticeMinutes: 0,
            xp: 0,
          };
        },
        async listModulesWithLessons() {
          return createModuleRecords();
        },
        async listUserProgress() {
          return [];
        },
        async updateLessonProgress(input) {
          updatedProgressStatus = input.status ?? null;
          return {
            audioSubmitted: input.audioSubmitted ?? false,
            completedAt: input.completedAt ?? null,
            id: "progress_1",
            lessonId: input.lessonId,
            status: input.status ?? "available",
            updatedAt: new Date("2026-03-11T15:30:00.000Z"),
          };
        },
        async updateUserStats() {
          throw new Error("unused");
        },
      }),
      feedbackService: {
        async scoreLessonAudio() {
          return {
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
            xpEarned: 5,
          };
        },
      },
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.submitLessonAudio(
      "usr_learning",
      "les_001",
      { buffer: Buffer.from("mp3-binary"), mimetype: "audio/mpeg" } as Express.Multer.File,
      62,
    );

    assert.equal(updatedProgressStatus, "in_progress");
    assert.equal(result.submissionId, "sub_audio_xyz");
    assert.equal(result.feedback.overallScore, 7.4);
    assert.equal(result.xpEarned, 5);
  });

  it("requires an audio submission before completing a lesson", async () => {
    const service = new LearningService({
      createLearningRepository: () => ({
        async createAudioSubmission() {
          throw new Error("unused");
        },
        async ensureDefaultCurriculum() {
          return;
        },
        async findLatestAudioSubmission() {
          return null;
        },
        async findUserLearningProfile() {
          return {
            id: "usr_learning",
            name: "Sachin Kumar",
            settingsLanguage: "en",
            stats: null,
            subscriptionStatus: "none" as SubscriptionStatus,
          };
        },
        async getOrCreateUserStats() {
          return {
            currentStreakDays: 0,
            lastActivityDate: null,
            lessonsCompleted: 0,
            rating: 0,
            totalPracticeMinutes: 0,
            xp: 0,
          };
        },
        async listModulesWithLessons() {
          return createModuleRecords();
        },
        async listUserProgress() {
          return [];
        },
        async updateLessonProgress() {
          throw new Error("unused");
        },
        async updateUserStats() {
          throw new Error("unused");
        },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.completeLesson("usr_learning", "les_001"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.AUDIO_NOT_SUBMITTED);
        return true;
      },
    );
  });

  it("completes a lesson, unlocks the next one, and updates stats", async () => {
    const progressRecords: ProgressRecord[] = [
      {
        audioSubmitted: true,
        completedAt: null,
        id: "progress_1",
        lessonId: "les_001",
        status: "in_progress",
        updatedAt: new Date("2026-03-11T15:00:00.000Z"),
      },
    ];
    let statsUpdated = false;
    const service = new LearningService({
      createLearningRepository: () => ({
        async createAudioSubmission() {
          throw new Error("unused");
        },
        async ensureDefaultCurriculum() {
          return;
        },
        async findLatestAudioSubmission() {
          return {
            durationSeconds: 62,
            fluencyScore: 6.8,
            grammarScore: 8.1,
            id: "sub_audio_xyz",
            overallScore: 7.4,
            pronunciationScore: 7.2,
            suggestions: [
              "Try to slow down when pronouncing longer words.",
              "Good use of past tense verbs!",
            ],
            xpEarned: 5,
          };
        },
        async findUserLearningProfile() {
          return {
            id: "usr_learning",
            name: "Sachin Kumar",
            settingsLanguage: "en",
            stats: {
              currentStreakDays: 2,
              lastActivityDate: new Date("2026-03-10T15:00:00.000Z"),
              lessonsCompleted: 1,
              rating: 4.9,
              totalPracticeMinutes: 45,
              xp: 12,
            },
            subscriptionStatus: "active" as SubscriptionStatus,
          };
        },
        async getOrCreateUserStats() {
          return {
            currentStreakDays: 2,
            lastActivityDate: new Date("2026-03-10T15:00:00.000Z"),
            lessonsCompleted: 1,
            rating: 4.9,
            totalPracticeMinutes: 45,
            xp: 12,
          };
        },
        async listModulesWithLessons() {
          return createModuleRecords();
        },
        async listUserProgress() {
          return progressRecords;
        },
        async updateLessonProgress(input) {
          const existing = progressRecords.find(progress => progress.lessonId === input.lessonId);
          if (existing) {
            existing.audioSubmitted = input.audioSubmitted ?? existing.audioSubmitted;
            existing.completedAt = input.completedAt ?? existing.completedAt;
            existing.status = input.status ?? existing.status;
            existing.updatedAt = new Date("2026-03-11T15:30:00.000Z");
            return existing;
          }

          const created: ProgressRecord = {
            audioSubmitted: input.audioSubmitted ?? false,
            completedAt: input.completedAt ?? null,
            id: "progress_2",
            lessonId: input.lessonId,
            status: input.status ?? "available",
            updatedAt: new Date("2026-03-11T15:30:00.000Z"),
          };
          progressRecords.push(created);
          return created;
        },
        async updateUserStats(input) {
          statsUpdated = true;
          assert.equal(input.currentStreakDays, 3);
          assert.equal(input.lessonsCompleted, 2);
          assert.equal(input.totalPracticeMinutes, 46);
          assert.equal(input.xp, 17);
          return {
            currentStreakDays: input.currentStreakDays,
            lastActivityDate: input.lastActivityDate,
            lessonsCompleted: input.lessonsCompleted,
            rating: input.rating,
            totalPracticeMinutes: input.totalPracticeMinutes,
            xp: input.xp,
          };
        },
      }),
      now: () => new Date("2026-03-11T15:30:00.000Z"),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.completeLesson("usr_learning", "les_001");

    assert.equal(statsUpdated, true);
    assert.equal(result.status, "completed");
    assert.equal(result.nextLesson?.id, "les_002");
    assert.equal(result.nextLesson?.status, "available");
    assert.equal(result.moduleProgress.lessonsCompleted, 1);
    assert.equal(progressRecords[0]?.status, "completed");
    assert.equal(progressRecords[1]?.status, "available");
  });
});
