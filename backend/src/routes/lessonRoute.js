const express = require('express');
const { createLesson, getLessons, getAllLessons, getLessonById, updateLesson, deleteLesson, uploadLessonThumbnail } = require('../controllers/lessonController');

const router = express.Router();

router.post('/modules/:moduleId/lessons', createLesson);
router.get('/modules/:moduleId/lessons' , getLessons);
router.get('/lessons', getAllLessons);
router.get('/lessons/:lessonId', getLessonById);
router.post('/lessons/upload-thumbnail', uploadLessonThumbnail);
router.put('/lessons/:lessonId', updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);

module.exports = router;
