interface LearningStatsResponse {
  currentStreakDays: number;
  language: string;
  lessonsCompleted: number;
  rating: number;
  totalPracticeMinutes: number;
  xp: number;
}

interface LearningModuleLessonResponse {
  durationLabel: string;
  id: string;
  moduleId: string;
  order: number;
  status: "locked" | "available" | "in_progress" | "completed";
  title: string;
  type: "speaking_drill" | "audio_response" | "fluency_drill" | "conversation";
}

interface LearningModuleResponse {
  id: string;
  lessons: LearningModuleLessonResponse[];
  lessonsCompleted: number;
  lessonsTotal: number;
  status: "locked" | "available" | "in_progress" | "completed";
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
      status: "locked" | "available" | "in_progress" | "completed";
      week: number;
    }>;
    weeksCompleted: number;
  };
  stats: LearningStatsResponse;
  userName: string;
}

interface LearningLessonDetailResponse extends LearningModuleLessonResponse {
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
    status: "locked" | "available" | "in_progress" | "completed";
    title: string;
  } | null;
  status: "locked" | "available" | "in_progress" | "completed";
  xpEarned: number;
}

export function serializeLearningStats(stats: LearningStatsResponse) {
  return {
    xp: stats.xp,
    rating: stats.rating,
    language: stats.language,
    current_streak_days: stats.currentStreakDays,
    lessons_completed: stats.lessonsCompleted,
    total_practice_minutes: stats.totalPracticeMinutes,
  };
}

export function serializeDashboard(dashboard: LearningDashboardResponse) {
  return {
    greeting: dashboard.greeting,
    user_name: dashboard.userName,
    is_premium: dashboard.isPremium,
    stats: serializeLearningStats(dashboard.stats),
    progress: {
      current_week: dashboard.progress.currentWeek,
      weeks_completed: dashboard.progress.weeksCompleted,
      total_weeks: dashboard.progress.totalWeeks,
      weekly_progress: dashboard.progress.weeklyProgress.map(progress => ({
        week: progress.week,
        status: progress.status,
        lessons_completed: progress.lessonsCompleted,
        lessons_total: progress.lessonsTotal,
      })),
    },
    fluency_journey_label: dashboard.fluencyJourneyLabel,
  };
}

export function serializeModuleLesson(lesson: LearningModuleLessonResponse) {
  return {
    id: lesson.id,
    module_id: lesson.moduleId,
    title: lesson.title,
    type: lesson.type,
    duration_label: lesson.durationLabel,
    status: lesson.status,
    order: lesson.order,
  };
}

export function serializeModule(module: LearningModuleResponse) {
  return {
    id: module.id,
    title: module.title,
    week_number: module.weekNumber,
    status: module.status,
    lessons_completed: module.lessonsCompleted,
    lessons_total: module.lessonsTotal,
    lessons: module.lessons.map(serializeModuleLesson),
  };
}

export function serializeLessonDetail(lesson: LearningLessonDetailResponse) {
  return {
    ...serializeModuleLesson(lesson),
    content: {
      prompt_text: lesson.content.promptText,
      instructions: lesson.content.instructions,
      background_image_url: lesson.content.backgroundImageUrl,
    },
  };
}

export function serializeLessonAudioSubmission(submission: LearningAudioSubmissionResponse) {
  return {
    submission_id: submission.submissionId,
    lesson_id: submission.lessonId,
    duration_seconds: submission.durationSeconds,
    feedback: {
      pronunciation_score: submission.feedback.pronunciationScore,
      fluency_score: submission.feedback.fluencyScore,
      grammar_score: submission.feedback.grammarScore,
      overall_score: submission.feedback.overallScore,
      suggestions: submission.feedback.suggestions,
    },
    xp_earned: submission.xpEarned,
  };
}

export function serializeLessonCompletion(result: LearningCompletionResponse) {
  return {
    lesson_id: result.lessonId,
    status: result.status,
    xp_earned: result.xpEarned,
    next_lesson: result.nextLesson ? {
      id: result.nextLesson.id,
      title: result.nextLesson.title,
      status: result.nextLesson.status,
    } : null,
    module_progress: {
      lessons_completed: result.moduleProgress.lessonsCompleted,
      lessons_total: result.moduleProgress.lessonsTotal,
    },
  };
}
