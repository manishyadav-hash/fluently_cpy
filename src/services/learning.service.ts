import type { LessonStatus, LessonType, SubscriptionStatus } from "@prisma/client";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";
import {
  LearningRepository,
  type LearningAudioSubmissionRecord,
  type LearningModuleRecord,
  type LearningProgressRecord,
  type LearningUserProfileRecord,
  type LearningUserStatsRecord,
} from "../repositories/learning.repository";
import { getDefaultCurriculum } from "./learning-content";
import {
  PlaceholderLessonFeedbackService,
  type LessonFeedbackServiceContract,
} from "./lesson-feedback.service";

type ModuleStatus = "locked" | "available" | "in_progress" | "completed";

interface LearningLessonResponse {
  durationLabel: string;
  id: string;
  moduleId: string;
  order: number;
  status: LessonStatus;
  title: string;
  type: LessonType;
}

interface LearningModuleResponse {
  id: string;
  lessons: LearningLessonResponse[];
  lessonsCompleted: number;
  lessonsTotal: number;
  status: ModuleStatus;
  title: string;
  weekNumber: number;
}

interface LearningDashboardResponse {
  fluencyJourneyLabel: string;
  greeting: string;
  isPremium: boolean;
  progress: {
    currentWeek: number;
    totalWeeks: number;
    weeklyProgress: Array<{
      lessonsCompleted: number;
      lessonsTotal: number;
      status: ModuleStatus;
      week: number;
    }>;
    weeksCompleted: number;
  };
  stats: {
    currentStreakDays: number;
    language: string;
    lessonsCompleted: number;
    rating: number;
    totalPracticeMinutes: number;
    xp: number;
  };
  userName: string;
}

interface LearningLessonDetailResponse extends LearningLessonResponse {
  content: {
    backgroundImageUrl: string | null;
    instructions: string | null;
    promptText: string | null;
  };
}

interface LearningAudioSubmissionResponse {
  durationSeconds: number;
  feedback: {
    fluencyScore: number;
    grammarScore: number;
    overallScore: number;
    pronunciationScore: number;
    suggestions: string[];
  };
  lessonId: string;
  submissionId: string;
  xpEarned: number;
}

interface LearningCompletionResponse {
  lessonId: string;
  moduleProgress: {
    lessonsCompleted: number;
    lessonsTotal: number;
  };
  nextLesson: {
    id: string;
    status: LessonStatus;
    title: string;
  } | null;
  status: LessonStatus;
  xpEarned: number;
}

export interface LearningUserStatsResponse {
  currentStreakDays: number;
  language: string;
  lessonsCompleted: number;
  rating: number;
  totalPracticeMinutes: number;
  xp: number;
}

interface LearningRepositoryPort {
  createAudioSubmission(input: {
    durationSeconds: number;
    fluencyScore: number | null;
    grammarScore: number | null;
    overallScore: number | null;
    pronunciationScore: number | null;
    suggestions: string[];
    userLessonProgressId: string;
    xpEarned: number;
  }): Promise<LearningAudioSubmissionRecord>;
  ensureDefaultCurriculum(modules: ReturnType<typeof getDefaultCurriculum>): Promise<void>;
  findLatestAudioSubmission(userLessonProgressId: string): Promise<LearningAudioSubmissionRecord | null>;
  findUserLearningProfile(userId: string): Promise<LearningUserProfileRecord | null>;
  getOrCreateUserStats(userId: string): Promise<LearningUserStatsRecord>;
  listModulesWithLessons(): Promise<LearningModuleRecord[]>;
  listUserProgress(userId: string): Promise<LearningProgressRecord[]>;
  updateLessonProgress(input: {
    audioSubmitted?: boolean;
    completedAt?: Date | null;
    lessonId: string;
    status?: LessonStatus;
    userId: string;
  }): Promise<LearningProgressRecord>;
  updateUserStats(input: LearningUserStatsRecord & { userId: string }): Promise<LearningUserStatsRecord>;
}

interface LearningServiceDependencies {
  createLearningRepository?: (db?: DatabaseClient) => LearningRepositoryPort;
  feedbackService?: LessonFeedbackServiceContract;
  now?: () => Date;
  runInTransaction?: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;
}

export interface LearningServiceContract {
  completeLesson(userId: string, lessonId: string): Promise<LearningCompletionResponse>;
  getDashboard(userId: string): Promise<LearningDashboardResponse>;
  getLessonDetails(userId: string, lessonId: string): Promise<LearningLessonDetailResponse>;
  getUserStats(userId: string): Promise<LearningUserStatsResponse>;
  listModules(userId: string, includeLessons: boolean): Promise<LearningModuleResponse[]>;
  submitLessonAudio(
    userId: string,
    lessonId: string,
    file: Express.Multer.File,
    durationSeconds: number,
  ): Promise<LearningAudioSubmissionResponse>;
}

interface EffectiveLesson {
  backgroundImageUrl: string | null;
  durationLabel: string;
  id: string;
  instructions: string | null;
  moduleId: string;
  order: number;
  promptText: string | null;
  status: LessonStatus;
  title: string;
  type: LessonType;
}

interface EffectiveModule {
  id: string;
  lessons: EffectiveLesson[];
  lessonsCompleted: number;
  lessonsTotal: number;
  status: ModuleStatus;
  title: string;
  weekNumber: number;
}

interface LearningState {
  lessons: EffectiveLesson[];
  lessonsById: Map<string, EffectiveLesson>;
  moduleByLessonId: Map<string, EffectiveModule>;
  modules: EffectiveModule[];
  progressByLessonId: Map<string, LearningProgressRecord>;
}

export class LearningService implements LearningServiceContract {
  private readonly createLearningRepository: (db?: DatabaseClient) => LearningRepositoryPort;
  private readonly feedbackService: LessonFeedbackServiceContract;
  private readonly now: () => Date;
  private readonly runInTransaction: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;

  constructor(dependencies: LearningServiceDependencies = {}) {
    this.createLearningRepository = dependencies.createLearningRepository ?? (db => new LearningRepository(db));
    this.feedbackService = dependencies.feedbackService ?? new PlaceholderLessonFeedbackService();
    this.now = dependencies.now ?? (() => new Date());
    this.runInTransaction = dependencies.runInTransaction ?? (callback => prisma.$transaction(tx => callback(tx)));
  }

  async getDashboard(userId: string): Promise<LearningDashboardResponse> {
    const repository = this.createLearningRepository();
    const profile = await this.requireUser(userId, repository);
    const state = await this.getLearningState(userId, repository);
    const stats = await this.getResolvedStats(userId, repository, profile);
    const currentModule = state.modules.find(module => module.status === "in_progress" || module.status === "available")
      ?? state.modules[state.modules.length - 1];

    return {
      fluencyJourneyLabel: currentModule
        ? `You're on Week ${currentModule.weekNumber} - Keep going!`
        : "Start your fluency journey today.",
      greeting: this.getGreeting(this.now()),
      isPremium: this.hasPremiumAccess(profile.subscriptionStatus),
      progress: {
        currentWeek: currentModule?.weekNumber ?? 0,
        totalWeeks: state.modules.length,
        weeklyProgress: state.modules.map(module => ({
          lessonsCompleted: module.lessonsCompleted,
          lessonsTotal: module.lessonsTotal,
          status: module.status,
          week: module.weekNumber,
        })),
        weeksCompleted: state.modules.filter(module => module.status === "completed").length,
      },
      stats,
      userName: this.getDisplayName(profile.name),
    };
  }

  async listModules(userId: string, includeLessons: boolean) {
    const repository = this.createLearningRepository();
    await this.requireUser(userId, repository);
    const state = await this.getLearningState(userId, repository);

    return state.modules.map(module => ({
      id: module.id,
      lessons: includeLessons
        ? module.lessons.map(lesson => this.toLessonResponse(lesson))
        : [],
      lessonsCompleted: module.lessonsCompleted,
      lessonsTotal: module.lessonsTotal,
      status: module.status,
      title: module.title,
      weekNumber: module.weekNumber,
    }));
  }

  async getLessonDetails(userId: string, lessonId: string): Promise<LearningLessonDetailResponse> {
    const repository = this.createLearningRepository();
    await this.requireUser(userId, repository);
    const state = await this.getLearningState(userId, repository);
    const lesson = state.lessonsById.get(lessonId);

    if (!lesson) {
      throw new AppError("Lesson does not exist.", 404, ErrorCodes.LESSON_NOT_FOUND);
    }

    if (lesson.status === "locked") {
      throw new AppError("Lesson is locked. Complete prerequisites first.", 403, ErrorCodes.LESSON_LOCKED);
    }

    return {
      ...this.toLessonResponse(lesson),
      content: {
        backgroundImageUrl: lesson.backgroundImageUrl,
        instructions: lesson.instructions,
        promptText: lesson.promptText,
      },
    };
  }

  async submitLessonAudio(
    userId: string,
    lessonId: string,
    file: Express.Multer.File,
    durationSeconds: number,
  ): Promise<LearningAudioSubmissionResponse> {
    return this.runInTransaction(async db => {
      const repository = this.createLearningRepository(db);
      await this.requireUser(userId, repository);
      const state = await this.getLearningState(userId, repository);
      const lesson = state.lessonsById.get(lessonId);

      if (!lesson) {
        throw new AppError("Lesson does not exist.", 404, ErrorCodes.LESSON_NOT_FOUND);
      }

      if (lesson.status === "locked") {
        throw new AppError("Lesson is locked. Complete prerequisites first.", 403, ErrorCodes.LESSON_LOCKED);
      }

      if (lesson.status === "completed") {
        throw new AppError("Lesson was already completed.", 409, ErrorCodes.ALREADY_COMPLETED);
      }

      const progress = await repository.updateLessonProgress({
        userId,
        lessonId,
        audioSubmitted: true,
        status: "in_progress",
      });

      const result = await this.feedbackService.scoreLessonAudio({
        durationSeconds,
        file,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
        },
      });

      const submission = await repository.createAudioSubmission({
        userLessonProgressId: progress.id,
        durationSeconds,
        pronunciationScore: result.feedback.pronunciationScore,
        fluencyScore: result.feedback.fluencyScore,
        grammarScore: result.feedback.grammarScore,
        overallScore: result.feedback.overallScore,
        suggestions: result.feedback.suggestions,
        xpEarned: result.xpEarned,
      });

      return {
        durationSeconds: submission.durationSeconds,
        feedback: {
          fluencyScore: submission.fluencyScore ?? 0,
          grammarScore: submission.grammarScore ?? 0,
          overallScore: submission.overallScore ?? 0,
          pronunciationScore: submission.pronunciationScore ?? 0,
          suggestions: submission.suggestions,
        },
        lessonId,
        submissionId: submission.id,
        xpEarned: submission.xpEarned,
      };
    });
  }

  async completeLesson(userId: string, lessonId: string): Promise<LearningCompletionResponse> {
    return this.runInTransaction(async db => {
      const repository = this.createLearningRepository(db);
      await this.requireUser(userId, repository);
      const state = await this.getLearningState(userId, repository);
      const lesson = state.lessonsById.get(lessonId);

      if (!lesson) {
        throw new AppError("Lesson does not exist.", 404, ErrorCodes.LESSON_NOT_FOUND);
      }

      const currentProgress = state.progressByLessonId.get(lessonId);
      if (lesson.status === "completed" || currentProgress?.completedAt) {
        throw new AppError("Lesson was already completed.", 409, ErrorCodes.ALREADY_COMPLETED);
      }

      if (!currentProgress?.audioSubmitted) {
        throw new AppError("Must submit audio before completing the lesson.", 400, ErrorCodes.AUDIO_NOT_SUBMITTED);
      }

      const latestSubmission = await repository.findLatestAudioSubmission(currentProgress.id);
      if (!latestSubmission) {
        throw new AppError("Must submit audio before completing the lesson.", 400, ErrorCodes.AUDIO_NOT_SUBMITTED);
      }

      const now = this.now();
      await repository.updateLessonProgress({
        userId,
        lessonId,
        audioSubmitted: true,
        completedAt: now,
        status: "completed",
      });

      currentProgress.audioSubmitted = true;
      currentProgress.completedAt = now;
      currentProgress.status = "completed";

      const nextLesson = this.getNextLesson(state.lessons, lessonId);
      if (nextLesson && state.lessonsById.get(nextLesson.id)?.status === "locked") {
        const unlockedProgress = await repository.updateLessonProgress({
          userId,
          lessonId: nextLesson.id,
          status: "available",
        });
        state.progressByLessonId.set(nextLesson.id, unlockedProgress);
      }

      const currentStats = await repository.getOrCreateUserStats(userId);
      await repository.updateUserStats({
        userId,
        currentStreakDays: this.getUpdatedStreak(currentStats.lastActivityDate, now, currentStats.currentStreakDays),
        lastActivityDate: now,
        lessonsCompleted: currentStats.lessonsCompleted + 1,
        rating: currentStats.rating,
        totalPracticeMinutes: currentStats.totalPracticeMinutes + this.toPracticeMinutes(latestSubmission.durationSeconds),
        xp: currentStats.xp + latestSubmission.xpEarned,
      });

      const updatedState = this.buildLearningState(state.modules.map(module => ({
        id: module.id,
        title: module.title,
        weekNumber: module.weekNumber,
        lessons: module.lessons.map(existingLesson => ({
          backgroundImageUrl: existingLesson.backgroundImageUrl,
          durationLabel: existingLesson.durationLabel,
          id: existingLesson.id,
          instructions: existingLesson.instructions,
          moduleId: existingLesson.moduleId,
          order: existingLesson.order,
          promptText: existingLesson.promptText,
          title: existingLesson.title,
          type: existingLesson.type,
        })),
      })), Array.from(state.progressByLessonId.values()));
      const updatedModule = updatedState.moduleByLessonId.get(lessonId);
      const unlockedNextLesson = nextLesson ? updatedState.lessonsById.get(nextLesson.id) ?? null : null;

      return {
        lessonId,
        moduleProgress: {
          lessonsCompleted: updatedModule?.lessonsCompleted ?? 0,
          lessonsTotal: updatedModule?.lessonsTotal ?? 0,
        },
        nextLesson: unlockedNextLesson ? {
          id: unlockedNextLesson.id,
          status: unlockedNextLesson.status,
          title: unlockedNextLesson.title,
        } : null,
        status: "completed",
        xpEarned: latestSubmission.xpEarned,
      };
    });
  }

  async getUserStats(userId: string): Promise<LearningUserStatsResponse> {
    const repository = this.createLearningRepository();
    const profile = await this.requireUser(userId, repository);
    return this.getResolvedStats(userId, repository, profile);
  }

  private async requireUser(userId: string, repository: LearningRepositoryPort) {
    const profile = await repository.findUserLearningProfile(userId);
    if (!profile) {
      throw new AppError("Invalid or expired token", 401, ErrorCodes.UNAUTHORIZED);
    }

    return profile;
  }

  private async getLearningState(userId: string, repository: LearningRepositoryPort): Promise<LearningState> {
    let modules = await repository.listModulesWithLessons();
    if (modules.length === 0) {
      await repository.ensureDefaultCurriculum(getDefaultCurriculum());
      modules = await repository.listModulesWithLessons();
    }

    const progressRecords = await repository.listUserProgress(userId);
    return this.buildLearningState(modules, progressRecords);
  }

  private buildLearningState(modules: LearningModuleRecord[], progressRecords: LearningProgressRecord[]): LearningState {
    const progressByLessonId = new Map(progressRecords.map(progress => [progress.lessonId, progress]));
    const lessonsById = new Map<string, EffectiveLesson>();
    const moduleByLessonId = new Map<string, EffectiveModule>();
    const effectiveModules: EffectiveModule[] = [];
    const lessons: EffectiveLesson[] = [];
    let previousModuleCompleted = true;

    for (const module of modules.sort((left, right) => left.weekNumber - right.weekNumber)) {
      const effectiveLessons: EffectiveLesson[] = [];

      for (const lesson of [...module.lessons].sort((left, right) => left.order - right.order)) {
        const progress = progressByLessonId.get(lesson.id);
        const previousLesson = effectiveLessons[effectiveLessons.length - 1];
        const status = this.getEffectiveLessonStatus(progress, previousModuleCompleted, previousLesson);
        const effectiveLesson: EffectiveLesson = {
          backgroundImageUrl: lesson.backgroundImageUrl,
          durationLabel: lesson.durationLabel,
          id: lesson.id,
          instructions: lesson.instructions,
          moduleId: lesson.moduleId,
          order: lesson.order,
          promptText: lesson.promptText,
          status,
          title: lesson.title,
          type: lesson.type,
        };
        effectiveLessons.push(effectiveLesson);
        lessons.push(effectiveLesson);
        lessonsById.set(lesson.id, effectiveLesson);
      }

      const lessonsCompleted = effectiveLessons.filter(lesson => lesson.status === "completed").length;
      const lessonsTotal = effectiveLessons.length;
      const moduleStatus = this.getModuleStatus(effectiveLessons, lessonsCompleted, lessonsTotal);
      const effectiveModule: EffectiveModule = {
        id: module.id,
        lessons: effectiveLessons,
        lessonsCompleted,
        lessonsTotal,
        status: moduleStatus,
        title: module.title,
        weekNumber: module.weekNumber,
      };

      for (const lesson of effectiveLessons) {
        moduleByLessonId.set(lesson.id, effectiveModule);
      }

      effectiveModules.push(effectiveModule);
      previousModuleCompleted = moduleStatus === "completed";
    }

    return {
      lessons,
      lessonsById,
      moduleByLessonId,
      modules: effectiveModules,
      progressByLessonId,
    };
  }

  private getEffectiveLessonStatus(
    progress: LearningProgressRecord | undefined,
    previousModuleCompleted: boolean,
    previousLesson: EffectiveLesson | undefined,
  ): LessonStatus {
    if (progress?.completedAt || progress?.status === "completed") {
      return "completed";
    }

    if (progress?.status === "in_progress") {
      return "in_progress";
    }

    if (progress?.status === "available") {
      return "available";
    }

    const isFirstLesson = previousLesson === undefined;
    if (isFirstLesson) {
      return previousModuleCompleted ? "available" : "locked";
    }

    return previousLesson.status === "completed" ? "available" : "locked";
  }

  private getModuleStatus(
    lessons: EffectiveLesson[],
    lessonsCompleted: number,
    lessonsTotal: number,
  ): ModuleStatus {
    if (lessonsTotal > 0 && lessonsCompleted === lessonsTotal) {
      return "completed";
    }

    if (lessons.some(lesson => lesson.status === "in_progress")) {
      return "in_progress";
    }

    if (lessons.some(lesson => lesson.status === "available")) {
      return lessonsCompleted > 0 ? "in_progress" : "available";
    }

    return "locked";
  }

  private toLessonResponse(lesson: EffectiveLesson): LearningLessonResponse {
    return {
      durationLabel: lesson.durationLabel,
      id: lesson.id,
      moduleId: lesson.moduleId,
      order: lesson.order,
      status: lesson.status,
      title: lesson.title,
      type: lesson.type,
    };
  }

  private async getResolvedStats(
    userId: string,
    repository: LearningRepositoryPort,
    profile: LearningUserProfileRecord,
  ): Promise<LearningUserStatsResponse> {
    const stats = profile.stats ?? await repository.getOrCreateUserStats(userId);

    return {
      currentStreakDays: stats.currentStreakDays,
      language: this.mapLanguage(profile.settingsLanguage),
      lessonsCompleted: stats.lessonsCompleted,
      rating: stats.rating,
      totalPracticeMinutes: stats.totalPracticeMinutes,
      xp: stats.xp,
    };
  }

  private getDisplayName(name: string | null) {
    const trimmed = name?.trim();
    if (!trimmed) {
      return "Learner";
    }

    return trimmed.split(/\s+/)[0] ?? "Learner";
  }

  private mapLanguage(language: string | null) {
    if (!language) {
      return "ENG";
    }

    const normalized = language.toLowerCase();
    if (normalized === "en") {
      return "ENG";
    }

    if (normalized === "hi") {
      return "HIN";
    }

    return normalized.toUpperCase();
  }

  private hasPremiumAccess(status: SubscriptionStatus) {
    return status === "trial" || status === "active";
  }

  private getGreeting(now: Date) {
    const hour = now.getUTCHours();
    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 15) {
      return "Good afternoon";
    }

    return "Good evening";
  }

  private getNextLesson(lessons: EffectiveLesson[], lessonId: string) {
    const index = lessons.findIndex(lesson => lesson.id === lessonId);
    return index >= 0 ? lessons[index + 1] ?? null : null;
  }

  private toPracticeMinutes(durationSeconds: number) {
    return Math.max(1, Math.round(durationSeconds / 60));
  }

  private getUpdatedStreak(lastActivityDate: Date | null, now: Date, currentStreakDays: number) {
    if (!lastActivityDate) {
      return 1;
    }

    const lastDay = Date.UTC(
      lastActivityDate.getUTCFullYear(),
      lastActivityDate.getUTCMonth(),
      lastActivityDate.getUTCDate(),
    );
    const currentDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const diffDays = Math.round((currentDay - lastDay) / (24 * 60 * 60 * 1000));

    if (diffDays <= 0) {
      return currentStreakDays || 1;
    }

    if (diffDays === 1) {
      return currentStreakDays + 1;
    }

    return 1;
  }
}
