import type { LessonStatus, LessonType, SubscriptionStatus } from "@prisma/client";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";
import type { DefaultModuleSeed } from "../services/learning-content";

export interface LearningModuleRecord {
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
}

export interface LearningProgressRecord {
  audioSubmitted: boolean;
  completedAt: Date | null;
  id: string;
  lessonId: string;
  status: LessonStatus;
  updatedAt: Date;
}

export interface LearningAudioSubmissionRecord {
  durationSeconds: number;
  fluencyScore: number | null;
  grammarScore: number | null;
  id: string;
  overallScore: number | null;
  pronunciationScore: number | null;
  suggestions: string[];
  xpEarned: number;
}

export interface LearningUserStatsRecord {
  currentStreakDays: number;
  lastActivityDate: Date | null;
  lessonsCompleted: number;
  rating: number;
  totalPracticeMinutes: number;
  xp: number;
}

export interface LearningUserProfileRecord {
  id: string;
  name: string | null;
  settingsLanguage: string | null;
  stats: LearningUserStatsRecord | null;
  subscriptionStatus: SubscriptionStatus;
}

interface UpdateLessonProgressInput {
  audioSubmitted?: boolean;
  completedAt?: Date | null;
  lessonId: string;
  status?: LessonStatus;
  userId: string;
}

interface CreateAudioSubmissionInput {
  durationSeconds: number;
  fluencyScore: number | null;
  grammarScore: number | null;
  overallScore: number | null;
  pronunciationScore: number | null;
  suggestions: string[];
  userLessonProgressId: string;
  xpEarned: number;
}

interface UpdateUserStatsInput extends LearningUserStatsRecord {
  userId: string;
}

export class LearningRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async ensureDefaultCurriculum(modules: DefaultModuleSeed[]): Promise<void> {
    for (const module of modules) {
      await this.db.module.upsert({
        where: { id: module.id },
        create: {
          id: module.id,
          title: module.title,
          weekNumber: module.weekNumber,
        },
        update: {
          title: module.title,
          weekNumber: module.weekNumber,
        },
      });

      for (const lesson of module.lessons) {
        await this.db.lesson.upsert({
          where: { id: lesson.id },
          create: {
            id: lesson.id,
            moduleId: module.id,
            title: lesson.title,
            type: lesson.type,
            durationLabel: lesson.durationLabel,
            order: lesson.order,
            promptText: lesson.promptText,
            instructions: lesson.instructions,
            backgroundImageUrl: lesson.backgroundImageUrl,
          },
          update: {
            moduleId: module.id,
            title: lesson.title,
            type: lesson.type,
            durationLabel: lesson.durationLabel,
            order: lesson.order,
            promptText: lesson.promptText,
            instructions: lesson.instructions,
            backgroundImageUrl: lesson.backgroundImageUrl,
          },
        });
      }
    }
  }

  async findUserLearningProfile(userId: string): Promise<LearningUserProfileRecord | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        settings: {
          select: {
            language: true,
          },
        },
        stats: {
          select: {
            currentStreakDays: true,
            lastActivityDate: true,
            lessonsCompleted: true,
            rating: true,
            totalPracticeMinutes: true,
            xp: true,
          },
        },
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      settingsLanguage: user.settings?.language ?? null,
      stats: user.stats ? {
        currentStreakDays: user.stats.currentStreakDays,
        lastActivityDate: user.stats.lastActivityDate,
        lessonsCompleted: user.stats.lessonsCompleted,
        rating: user.stats.rating,
        totalPracticeMinutes: user.stats.totalPracticeMinutes,
        xp: user.stats.xp,
      } : null,
      subscriptionStatus: user.subscriptionStatus,
    };
  }

  async getOrCreateUserStats(userId: string): Promise<LearningUserStatsRecord> {
    const stats = await this.db.userStats.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return {
      currentStreakDays: stats.currentStreakDays,
      lastActivityDate: stats.lastActivityDate,
      lessonsCompleted: stats.lessonsCompleted,
      rating: stats.rating,
      totalPracticeMinutes: stats.totalPracticeMinutes,
      xp: stats.xp,
    };
  }

  async listModulesWithLessons(): Promise<LearningModuleRecord[]> {
    const modules = await this.db.module.findMany({
      orderBy: { weekNumber: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
      },
    });

    return modules.map(module => ({
      id: module.id,
      title: module.title,
      weekNumber: module.weekNumber,
      lessons: module.lessons.map(lesson => ({
        backgroundImageUrl: lesson.backgroundImageUrl,
        durationLabel: lesson.durationLabel,
        id: lesson.id,
        instructions: lesson.instructions,
        moduleId: lesson.moduleId,
        order: lesson.order,
        promptText: lesson.promptText,
        title: lesson.title,
        type: lesson.type,
      })),
    }));
  }

  async listUserProgress(userId: string): Promise<LearningProgressRecord[]> {
    const progressRecords = await this.db.userLessonProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: "asc" },
    });

    return progressRecords.map(progress => ({
      audioSubmitted: progress.audioSubmitted,
      completedAt: progress.completedAt,
      id: progress.id,
      lessonId: progress.lessonId,
      status: progress.status,
      updatedAt: progress.updatedAt,
    }));
  }

  async updateLessonProgress(input: UpdateLessonProgressInput): Promise<LearningProgressRecord> {
    const createStatus = input.status ?? (input.audioSubmitted ? "in_progress" : "available");
    const progress = await this.db.userLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: input.userId,
          lessonId: input.lessonId,
        },
      },
      create: {
        userId: input.userId,
        lessonId: input.lessonId,
        status: createStatus,
        audioSubmitted: input.audioSubmitted ?? false,
        completedAt: input.completedAt ?? null,
      },
      update: {
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.audioSubmitted === undefined ? {} : { audioSubmitted: input.audioSubmitted }),
        ...(input.completedAt === undefined ? {} : { completedAt: input.completedAt }),
      },
    });

    return {
      audioSubmitted: progress.audioSubmitted,
      completedAt: progress.completedAt,
      id: progress.id,
      lessonId: progress.lessonId,
      status: progress.status,
      updatedAt: progress.updatedAt,
    };
  }

  async createAudioSubmission(input: CreateAudioSubmissionInput): Promise<LearningAudioSubmissionRecord> {
    const submission = await this.db.lessonAudioSubmission.create({
      data: {
        userLessonProgressId: input.userLessonProgressId,
        durationSeconds: input.durationSeconds,
        pronunciationScore: input.pronunciationScore,
        fluencyScore: input.fluencyScore,
        grammarScore: input.grammarScore,
        overallScore: input.overallScore,
        suggestions: input.suggestions,
        xpEarned: input.xpEarned,
      },
    });

    return {
      durationSeconds: submission.durationSeconds,
      fluencyScore: submission.fluencyScore,
      grammarScore: submission.grammarScore,
      id: submission.id,
      overallScore: submission.overallScore,
      pronunciationScore: submission.pronunciationScore,
      suggestions: submission.suggestions,
      xpEarned: submission.xpEarned,
    };
  }

  async findLatestAudioSubmission(userLessonProgressId: string): Promise<LearningAudioSubmissionRecord | null> {
    const submission = await this.db.lessonAudioSubmission.findFirst({
      where: { userLessonProgressId },
      orderBy: { createdAt: "desc" },
    });

    if (!submission) {
      return null;
    }

    return {
      durationSeconds: submission.durationSeconds,
      fluencyScore: submission.fluencyScore,
      grammarScore: submission.grammarScore,
      id: submission.id,
      overallScore: submission.overallScore,
      pronunciationScore: submission.pronunciationScore,
      suggestions: submission.suggestions,
      xpEarned: submission.xpEarned,
    };
  }

  async updateUserStats(input: UpdateUserStatsInput): Promise<LearningUserStatsRecord> {
    const stats = await this.db.userStats.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        currentStreakDays: input.currentStreakDays,
        lastActivityDate: input.lastActivityDate,
        lessonsCompleted: input.lessonsCompleted,
        rating: input.rating,
        totalPracticeMinutes: input.totalPracticeMinutes,
        xp: input.xp,
      },
      update: {
        currentStreakDays: input.currentStreakDays,
        lastActivityDate: input.lastActivityDate,
        lessonsCompleted: input.lessonsCompleted,
        rating: input.rating,
        totalPracticeMinutes: input.totalPracticeMinutes,
        xp: input.xp,
      },
    });

    return {
      currentStreakDays: stats.currentStreakDays,
      lastActivityDate: stats.lastActivityDate,
      lessonsCompleted: stats.lessonsCompleted,
      rating: stats.rating,
      totalPracticeMinutes: stats.totalPracticeMinutes,
      xp: stats.xp,
    };
  }
}
