const prisma = require('../db/prisma');
const { validateQuestionByType } = require('../utils/questionValidation');
const { shapeLessonFromPlacement } = require('../utils/lessonPlacement');

const optionInclude = {
  orderBy: {
    optionText: 'asc'
  }
};

const weekLessonInclude = {
  include: {
    lesson: true,
    week: {
      select: {
        id: true,
        weekNo: true,
        title: true,
        course: {
          select: {
            id: true,
            title: true,
            level: true
          }
        }
      }
    }
  }
};

const questionBankInclude = {
  options: optionInclude,
  placements: {
    orderBy: {
      createdAt: 'asc'
    },
    include: {
      weekLesson: weekLessonInclude
    }
  }
};

const questionPlacementInclude = {
  weekLesson: weekLessonInclude,
  question: {
    include: {
      options: optionInclude,
      placements: {
        orderBy: {
          createdAt: 'asc'
        },
        include: {
          weekLesson: weekLessonInclude
        }
      }
    }
  }
};

const shapeQuestion = (question, placement = null) => {
  const resolvedPlacement = placement || question.placements?.[0] || null;
  const lesson = resolvedPlacement?.weekLesson?.lesson
    ? shapeLessonFromPlacement(resolvedPlacement.weekLesson.lesson, resolvedPlacement.weekLesson)
    : null;

  return {
    ...question,
    questionOrder: resolvedPlacement?.questionOrder ?? question.questionOrder,
    weekLessonQuestionId: resolvedPlacement?.id || null,
    weekLessonId: resolvedPlacement?.weekLessonId || null,
    lessonId: lesson?.id || null,
    lesson
  };
};

const shapeQuestionPlacement = (placement) => shapeQuestion(placement.question, placement);

const findWeekLessonPlacement = async ({ lessonId, weekId, weekLessonId }) => {
  if (weekLessonId) {
    return prisma.weekLesson.findUnique({
      where: { id: weekLessonId }
    });
  }

  if (!lessonId) {
    return null;
  }

  if (weekId) {
    return prisma.weekLesson.findUnique({
      where: {
        weekId_lessonId: {
          weekId,
          lessonId
        }
      }
    });
  }

  return prisma.weekLesson.findFirst({
    where: { lessonId },
    orderBy: { createdAt: 'asc' }
  });
};

const getNextQuestionOrder = async (weekLessonId, tx = prisma) => {
  const lastPlacement = await tx.weekLessonQuestion.findFirst({
    where: { weekLessonId },
    orderBy: {
      questionOrder: 'desc'
    }
  });

  return (lastPlacement?.questionOrder || 0) + 1;
};

const createQuestion = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const {
      question_type,
      question,
      audio_url,
      image_url,
      correct_answer,
      question_order,
      week_id,
      weekId,
      week_lesson_id,
      weekLessonId
    } = req.body;

    if (!lessonId || !question_type || !question || !question_order) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id, question type, question and order are required'
      });
    }

    const validationError = validateQuestionByType({
      question_type,
      question,
      correct_answer,
      audio_url
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const placement = await findWeekLessonPlacement({
      lessonId,
      weekId: week_id ?? weekId,
      weekLessonId: week_lesson_id ?? weekLessonId
    });

    if (!placement) {
      return res.status(404).json({
        success: false,
        message: 'Lesson placement not found'
      });
    }

    const createdPlacement = await prisma.$transaction(async (tx) => {
      const createdQuestion = await tx.question.create({
        data: {
          questionType: question_type,
          question,
          audioUrl: audio_url,
          imageUrl: image_url,
          correctAnswer: correct_answer,
          questionOrder: question_order
        }
      });

      const questionPlacement = await tx.weekLessonQuestion.create({
        data: {
          weekLessonId: placement.id,
          questionId: createdQuestion.id,
          questionOrder: question_order
        }
      });

      return tx.weekLessonQuestion.findUnique({
        where: { id: questionPlacement.id },
        include: questionPlacementInclude
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Question created and attached to lesson successfully',
      data: shapeQuestionPlacement(createdPlacement)
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Question order already exists for this lesson placement'
      });
    }

    if (error.code === 'P2003') {
      return res.status(404).json({
        success: false,
        message: 'Lesson placement not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getQuestion = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { week_id, weekId, week_lesson_id, weekLessonId } = req.query;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    const placement = await findWeekLessonPlacement({
      lessonId,
      weekId: week_id ?? weekId,
      weekLessonId: week_lesson_id ?? weekLessonId
    });

    if (!placement) {
      return res.status(200).json({
        success: true,
        message: 'Questions retrieved successfully',
        data: []
      });
    }

    const questionPlacements = await prisma.weekLessonQuestion.findMany({
      where: {
        weekLessonId: placement.id
      },
      orderBy: {
        questionOrder: 'asc'
      },
      include: questionPlacementInclude
    });

    return res.status(200).json({
      success: true,
      message: 'Questions retrieved successfully',
      data: questionPlacements.map(shapeQuestionPlacement)
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      question_type,
      question,
      audio_url,
      image_url,
      correct_answer,
      question_order,
      lesson_id,
      lessonId,
      week_id,
      weekId,
      week_lesson_id,
      weekLessonId
    } = req.body;

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: 'Question id is required'
      });
    }

    const targetLessonId = lesson_id ?? lessonId;
    const targetWeekId = week_id ?? weekId;
    const targetWeekLessonId = week_lesson_id ?? weekLessonId;
    const shouldAttachToPlacement = targetLessonId || targetWeekId || targetWeekLessonId;
    const placement = shouldAttachToPlacement
      ? await findWeekLessonPlacement({
          lessonId: targetLessonId,
          weekId: targetWeekId,
          weekLessonId: targetWeekLessonId
        })
      : null;

    if (shouldAttachToPlacement && !placement) {
      return res.status(404).json({
        success: false,
        message: 'Lesson placement not found'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: {
          id: questionId
        },
        data: {
          ...(question_type !== undefined ? { questionType: question_type } : {}),
          ...(question !== undefined ? { question } : {}),
          ...(audio_url !== undefined ? { audioUrl: audio_url } : {}),
          ...(image_url !== undefined ? { imageUrl: image_url } : {}),
          ...(correct_answer !== undefined ? { correctAnswer: correct_answer } : {}),
          ...(!placement && question_order !== undefined ? { questionOrder: question_order } : {})
        }
      });

      if (placement) {
        const existingPlacement = await tx.weekLessonQuestion.findUnique({
          where: {
            weekLessonId_questionId: {
              weekLessonId: placement.id,
              questionId
            }
          }
        });

        if (existingPlacement) {
          await tx.weekLessonQuestion.update({
            where: {
              id: existingPlacement.id
            },
            data: {
              ...(question_order !== undefined ? { questionOrder: question_order } : {})
            }
          });
        } else {
          await tx.weekLessonQuestion.create({
            data: {
              weekLessonId: placement.id,
              questionId,
              questionOrder: question_order ?? await getNextQuestionOrder(placement.id, tx)
            }
          });
        }

        return tx.weekLessonQuestion.findUnique({
          where: {
            weekLessonId_questionId: {
              weekLessonId: placement.id,
              questionId
            }
          },
          include: questionPlacementInclude
        });
      }

      return tx.question.findUnique({
        where: {
          id: questionId
        },
        include: questionBankInclude
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: placement ? shapeQuestionPlacement(result) : shapeQuestion(result)
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Question order already exists for this lesson placement'
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      week_lesson_id,
      weekLessonId
    } = {
      ...req.query,
      ...(req.body || {})
    };

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: 'Question id is required'
      });
    }

    const targetWeekLessonId = week_lesson_id ?? weekLessonId;

    if (targetWeekLessonId) {
      await prisma.weekLessonQuestion.delete({
        where: {
          weekLessonId_questionId: {
            weekLessonId: targetWeekLessonId,
            questionId
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Question removed from lesson successfully'
      });
    }

    await prisma.question.delete({
      where: {
        id: questionId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Question deleted from bank successfully'
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const { type, search } = req.query;

    const where = {};

    if (type) {
      where.questionType = type;
    }

    if (search && search.trim()) {
      where.OR = [
        {
          question: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        },
        {
          correctAnswer: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        }
      ];
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: questionBankInclude
    });

    return res.status(200).json({
      success: true,
      message: 'Questions retrieved successfully',
      data: questions.map((question) => shapeQuestion(question))
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  getAllQuestions
};
