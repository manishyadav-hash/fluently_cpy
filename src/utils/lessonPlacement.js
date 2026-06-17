const weekLessonQuestionInclude = {
  questionLinks: {
    orderBy: {
      questionOrder: 'asc'
    },
    include: {
      question: {
        include: {
          options: {
            orderBy: {
              optionText: 'asc'
            }
          }
        }
      }
    }
  }
};

const lessonTypeLabels = {
  speaking: 'Speaking',
  audio: 'Audio',
  quiz: 'Quiz',
  match: 'Match',
  reading: 'Reading',
  writing: 'Writing',
  mixed: 'Mixed'
};

function toLessonTypeLabel(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (lessonTypeLabels[normalized]) {
    return lessonTypeLabels[normalized];
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shapeQuestionFromPlacementLink(link) {
  if (!link?.question) {
    return null;
  }

  return {
    ...link.question,
    questionOrder: link.questionOrder,
    weekLessonQuestionId: link.id,
    weekLessonId: link.weekLessonId
  };
}

function shapeLessonFromPlacement(lesson, placement = null) {
  if (!lesson) {
    return null;
  }

  const resolvedPlacement = placement || lesson.weekLessons?.[0] || null;
  const resolvedWeek = resolvedPlacement?.week || null;
  const placementQuestions = (resolvedPlacement?.questionLinks || [])
    .map(shapeQuestionFromPlacementLink)
    .filter(Boolean);

  return {
    ...lesson,
    contentBlocks: resolvedPlacement?.contentBlocks ?? lesson.contentBlocks ?? [],
    questions: placementQuestions,
    lessonOrder: resolvedPlacement?.lessonOrder ?? null,
    weekId: resolvedWeek?.id || resolvedPlacement?.weekId || null,
    week: resolvedWeek ? { ...resolvedWeek } : null,
    weekLessonId: resolvedPlacement?.id || null
  };
}

function shapeWeekWithLessons(week) {
  if (!week) {
    return null;
  }

  const weekLessons = week.weekLessons || [];

  return {
    ...week,
    lessons: weekLessons
      .map((weekLesson) => shapeLessonFromPlacement(weekLesson.lesson, weekLesson))
      .filter(Boolean)
  };
}

function shapeCourseWithLessons(course) {
  if (!course) {
    return null;
  }

  return {
    ...course,
    weeks: (course.weeks || []).map(shapeWeekWithLessons)
  };
}

function shapeLessonForApp(lesson, placement = null, options = {}) {
  const shapedLesson = shapeLessonFromPlacement(lesson, placement);

  if (!shapedLesson) {
    return null;
  }

  const isLocked = Boolean(options.isLocked);
  const isPlayable = Boolean(options.isPlayable);

  return {
    id: shapedLesson.id,
    title: shapedLesson.title,
    duration: shapedLesson.duration || null,
    type: toLessonTypeLabel(shapedLesson.lessonType),
    thumbnailUrl: shapedLesson.thumbnail || null,
    status: isLocked ? 'locked' : isPlayable ? 'playable' : 'available',
    isLocked,
    lessonOrder: shapedLesson.lessonOrder,
    weekId: shapedLesson.weekId,
    weekLessonId: shapedLesson.weekLessonId
  };
}

function shapeWeekForApp(week, options = {}) {
  if (!week) {
    return null;
  }

  const lessons = week.weekLessons || [];
  const isLocked = options.isLocked ?? week.weekNo > 1;
  const totalLessons = lessons.length;
  const completedLessons = options.completedLessons ?? 0;
  const percent =
    totalLessons > 0 ? Math.max(0, Math.min(100, Math.round((completedLessons / totalLessons) * 100))) : 0;
  const unlockMessage = options.unlockMessage ?? (isLocked && week.weekNo > 1 ? `Complete Week ${week.weekNo - 1} to unlock` : null);
  const firstPlayableLessonId = options.firstPlayableLessonId ?? (!isLocked && lessons[0]?.lesson?.id ? lessons[0].lesson.id : null);

  return {
    id: week.id,
    weekNo: week.weekNo,
    title: week.title || `Week ${week.weekNo}`,
    thumbnailUrl: week.thumbnailUrl || null,
    isLocked,
    unlockMessage,
    progress: {
      completedLessons,
      totalLessons,
      percent
    },
    lessons: lessons.map((weekLesson) =>
      shapeLessonForApp(weekLesson.lesson, weekLesson, {
        isLocked,
        isPlayable: firstPlayableLessonId ? weekLesson.lesson?.id === firstPlayableLessonId : !isLocked
      })
    ).filter(Boolean)
  };
}

function shapeCourseForApp(course, options = {}) {
  if (!course) {
    return null;
  }

  const weeks = course.weeks || [];

  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description || null,
      thumbnailUrl: course.thumbnailUrl || null,
      level: course.level,
      audience: course.audience,
      durationWeeks: course.durationWeeks,
      status: course.status,
      createdAt: course.createdAt
    },
    weeks: weeks.map((week) =>
      shapeWeekForApp(week, {
        isLocked: options.isLockedByWeekNo ? options.isLockedByWeekNo(week) : week.weekNo > 1,
        completedLessons: options.completedLessonsByWeekNo?.[week.weekNo] ?? 0,
        unlockMessage: options.unlockMessageByWeekNo?.[week.weekNo],
        firstPlayableLessonId: options.firstPlayableLessonIdsByWeekNo?.[week.weekNo] ?? null
      })
    )
  };
}

function shapeQuestionForApp(question) {
  if (!question) {
    return null;
  }

  return {
    id: question.id,
    weekLessonQuestionId: question.weekLessonQuestionId || null,
    questionOrder: question.questionOrder ?? null,
    type: question.questionType || null,
    prompt: question.question || null,
    audioUrl: question.audioUrl || null,
    imageUrl: question.imageUrl || null,
    correctAnswer: question.correctAnswer || null,
    options: (question.options || []).map((option) => ({
      id: option.id,
      text: option.optionText,
      isCorrect: Boolean(option.isCorrect)
    }))
  };
}

function shapeLessonDetailForApp(lesson, placement = null) {
  const shapedLesson = shapeLessonFromPlacement(lesson, placement);

  if (!shapedLesson) {
    return null;
  }

  const questions = (shapedLesson.questions || [])
    .sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0))
    .map(shapeQuestionForApp)
    .filter(Boolean);

  return {
    id: shapedLesson.id,
    weekLessonId: shapedLesson.weekLessonId,
    weekId: shapedLesson.weekId,
    lessonOrder: shapedLesson.lessonOrder,
    title: shapedLesson.title,
    subtitle: shapedLesson.week?.title || null,
    description: shapedLesson.description || null,
    duration: shapedLesson.duration || null,
    type: toLessonTypeLabel(shapedLesson.lessonType),
    level: shapedLesson.lessonLevel || null,
    thumbnailUrl: shapedLesson.thumbnail || null,
    contentBlocks: shapedLesson.contentBlocks || [],
    progress: {
      totalQuestions: questions.length,
      totalSteps: Math.max(1, questions.length + ((shapedLesson.contentBlocks || []).length ? 1 : 0))
    },
    questions
  };
}

function getLessonPlacement(lesson) {
  return lesson?.weekLessons?.[0] || null;
}

module.exports = {
  weekLessonQuestionInclude,
  shapeQuestionFromPlacementLink,
  shapeLessonFromPlacement,
  shapeWeekWithLessons,
  shapeCourseWithLessons,
  shapeLessonForApp,
  shapeWeekForApp,
  shapeCourseForApp,
  shapeQuestionForApp,
  shapeLessonDetailForApp,
  toLessonTypeLabel,
  getLessonPlacement
};
