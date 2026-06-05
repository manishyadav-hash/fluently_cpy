const express = require('express');
const { createQuestion, getQuestion, updateQuestion, deleteQuestion } = require('../controllers/questionController');

const router = express.Router();

router.post('/lessons/:lessonId/questions', createQuestion);
router.get('/lessons/:lessonId/questions', getQuestion);
router.put('/questions/:questionId', updateQuestion);
router.delete('/questions/:questionId', deleteQuestion);
module.exports = router;
