const express = require('express');
const {
  createCourse,
  getCourses,
  getCourseDetails,
  getCourseAppDetails,
  getCourseWeeksApp,
  updateCourse,
  deleteCourse,
  createWeek,
  deleteWeek,
  updateWeek
} = require('../controllers/courseController');

const router = express.Router();

router.post('/', createCourse);
router.get('/', getCourses);
router.get('/:courseId/app', getCourseAppDetails);
router.get('/:courseId/weeks/app', getCourseWeeksApp);
router.post('/:courseId/weeks', createWeek);
router.put('/:courseId', updateCourse);
router.delete('/:courseId', deleteCourse);
router.put('/weeks/:weekId', updateWeek);
router.delete('/weeks/:weekId', deleteWeek);
router.get('/:courseId', getCourseDetails);

module.exports = router;
