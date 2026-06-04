const prisma = require('../db/prisma');

const createQuestionOption = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { option_text, is_correct } = req.body;

    if (!questionId || !option_text || typeof is_correct !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Question id, option text and is_correct are required'
      });
    }

    /*
    Old SQL version:

    const existingQuestion = await pool.query(
      `
      SELECT id FROM question_options
      WHERE question_id = $1 AND option_text = $2
      `,
      [questionId, option_text]
    );

    if (existingQuestion.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'The option already exists for this question'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO question_options (question_id, option_text, is_correct)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [questionId, option_text, is_correct]
    );
    */

    const createdOption = await prisma.questionOption.create({
      data: {
        questionId,
        optionText: option_text,
        isCorrect: is_correct
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Question option created successfully',
      data: createdOption
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'The option already exists for this question'
      });
    }

    if (error.code === 'P2003') {
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

const updateQuestionOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    const { option_text, is_correct } = req.body;

    if (!optionId) {
      return res.status(400).json({
        success: false,
        message: 'Option id is required'
      });
    }

    const updatedOption = await prisma.questionOption.update({
      where: {
        id: optionId
      },
      data: {
        ...(option_text !== undefined ? { optionText: option_text } : {}),
        ...(typeof is_correct === 'boolean' ? { isCorrect: is_correct } : {})
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Question option updated successfully',
      data: updatedOption
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'The option already exists for this question'
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Question option not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteQuestionOption = async (req, res) => {
  try {
    const { optionId } = req.params;

    if (!optionId) {
      return res.status(400).json({
        success: false,
        message: 'Option id is required'
      });
    }

    await prisma.questionOption.delete({
      where: {
        id: optionId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Question option deleted successfully'
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Question option not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createQuestionOption,
  updateQuestionOption,
  deleteQuestionOption
};
