const express = require('express');
const { createLesson, attachLessonToWeek, detachLessonFromWeek, getLessons, getAllLessons, getLessonById, getLessonAppById, updateLesson, deleteLesson, reorderWeekLessons, uploadLessonThumbnail, uploadLessonMedia } = require('../controllers/lessonController');

const router = express.Router();

router.post('/weeks/:weekId/lessons', createLesson);
router.post('/weeks/:weekId/lessons/:lessonId', attachLessonToWeek);
router.delete('/weeks/:weekId/lessons/:lessonId', detachLessonFromWeek);
router.get('/weeks/:weekId/lessons', getLessons);
router.put('/weeks/:weekId/lessons/reorder', reorderWeekLessons);
router.get('/lessons', getAllLessons);
router.get('/lessons/:lessonId/app', getLessonAppById);
router.get('/lessons/:lessonId', getLessonById);
router.post('/lessons/upload-thumbnail', uploadLessonThumbnail);
router.post('/lessons/upload-media', uploadLessonMedia);
router.put('/lessons/:lessonId', updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);

module.exports = router;
