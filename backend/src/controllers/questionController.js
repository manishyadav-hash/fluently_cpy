const prisma = require('../db/prisma');
const { validateQuestionByType } = require('../utils/questionValidation');

const createQuestion = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const {
      question_type,
      question,
      audio_url,
      image_url,
      correct_answer,
      question_order
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

    /*
    Old SQL version:

    const existingQuestion = await pool.query(
      `
      SELECT id FROM questions
      WHERE lesson_id = $1 AND question_order = $2
      `,
      [lessonId, question_order]
    );

    if (existingQuestion.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Question order already exists for this lesson'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO questions
      (lesson_id, question_type, question, audio_url, image_url, correct_answer, question_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [lessonId, question_type, question, audio_url, image_url, correct_answer, question_order]
    );
    */

    const createdQuestion = await prisma.question.create({
      data: {
        lessonId,
        questionType: question_type,
        question,
        audioUrl: audio_url,
        imageUrl: image_url,
        correctAnswer: correct_answer,
        questionOrder: question_order
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: createdQuestion
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Question order already exists for this lesson'
      });
    }

    if (error.code === 'P2003') {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
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

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    /*
    Old SQL version:

    const result = await pool.query(
      `
      SELECT * FROM questions
      WHERE lesson_id = $1
      ORDER BY question_order ASC
      `,
      [lessonId]
    );
    */

    const questions = await prisma.question.findMany({
      where: {
        lessonId
      },
      orderBy: {
        questionOrder: 'asc'
      },
      include: {
        options: {
          orderBy: {
            optionText: 'asc'
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Questions retrieved successfully',
      data: questions
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
      question_order
    } = req.body;

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: 'Question id is required'
      });
    }

    const updatedQuestion = await prisma.question.update({
      where: {
        id: questionId
      },
      data: {
        ...(question_type !== undefined ? { questionType: question_type } : {}),
        ...(question !== undefined ? { question } : {}),
        ...(audio_url !== undefined ? { audioUrl: audio_url } : {}),
        ...(image_url !== undefined ? { imageUrl: image_url } : {}),
        ...(correct_answer !== undefined ? { correctAnswer: correct_answer } : {}),
        ...(question_order !== undefined ? { questionOrder: question_order } : {})
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Question order already exists for this lesson'
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

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: 'Question id is required'
      });
    }

    await prisma.question.delete({
      where: {
        id: questionId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
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

module.exports = {
  createQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion
};
