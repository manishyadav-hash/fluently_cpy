const express = require('express');
const {
  createCourse,
  getCourses,
  getCourseDetails,
  updateCourse,
  deleteCourse,
  addLessonToWeek,
  removeLessonFromWeek,
  reorderWeekLessons,
  createWeek,
  deleteWeek,
  updateWeek
} = require('../controllers/courseController');

const router = express.Router();

router.post('/', createCourse);
router.get('/', getCourses);
router.put('/:courseId', updateCourse);
router.delete('/:courseId', deleteCourse);
router.post('/weeks/:weekId/lessons', addLessonToWeek);
router.put('/weeks/:weekId/lessons/reorder', reorderWeekLessons);
router.delete('/week-lessons/:weekLessonId', removeLessonFromWeek);
router.post('/:courseId/weeks', createWeek);
router.put('/weeks/:weekId', updateWeek);
router.delete('/weeks/:weekId', deleteWeek);
router.get('/:courseId', getCourseDetails);

module.exports = router;
