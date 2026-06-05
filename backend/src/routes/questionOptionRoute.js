const express = require('express');
const { createQuestionOption, updateQuestionOption, deleteQuestionOption } = require('../controllers/questionOptionController');
const router = express.Router();
router.post('/questions/:questionId/options', createQuestionOption);
router.put('/question-options/:optionId', updateQuestionOption);
router.delete('/question-options/:optionId', deleteQuestionOption);
module.exports = router;