const prisma = require('../db/prisma');

const courseInclude = {
  weeks: {
    orderBy: { weekNo: 'asc' },
    include: {
      weekLessons: {
        orderBy: { lessonOrder: 'asc' },
        include: {
          lesson: {
            include: {
              questions: {
                orderBy: { questionOrder: 'asc' }
              }
            }
          }
        }
      }
    }
  }
};

const normalizeCourse = (course) => ({
  ...course,
  durationWeeks: course.durationWeeks,
  thumbnail_url: course.thumbnailUrl,
  created_at: course.createdAt
});
//method to create a course with weeks and lessons, get all courses with weeks and lessons count, get course details with weeks and lessons, update course details and weeks, delete course, add lesson to week, remove lesson from week and reorder lessons in a week
const createCourse = async (req, res) => {
  try {
    const { title, description, thumbnail_url, level, audience, duration_weeks, status } = req.body;

    if (!title || !duration_weeks) {
      return res.status(400).json({ success: false, message: 'Title and duration weeks are required' });
    }

    const durationWeeks = Number(duration_weeks);
    if (!Number.isInteger(durationWeeks) || durationWeeks < 1) {
      return res.status(400).json({ success: false, message: 'Duration weeks must be a positive integer' });
    }

    const createdCourse = await prisma.course.create({
      data: {
        title,
        description,
        thumbnailUrl: thumbnail_url || null,
        level: level || 'beginner',
        audience: audience || 'general_learner',
        durationWeeks,
        status: status || 'draft',
        weeks: {
          create: Array.from({ length: durationWeeks }, (_, index) => ({
            weekNo: index + 1,
            title: `Week ${index + 1}`
          }))
        }
      },
      include: courseInclude
    });

    return res.status(201).json({ success: true, message: 'Course created successfully', data: normalizeCourse(createdCourse) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCourses = async (_req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        weeks: {
          include: {
            weekLessons: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = courses.map((course) => ({
      ...normalizeCourse(course),
      weeksCount: course.weeks.length,
      lessonsCount: course.weeks.reduce((count, week) => count + week.weekLessons.length, 0)
    }));

    return res.status(200).json({ success: true, message: 'Courses retrieved successfully', data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: courseInclude
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.status(200).json({ success: true, message: 'Course retrieved successfully', data: normalizeCourse(course) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, thumbnail_url, level, audience, duration_weeks, status } = req.body;

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const nextDurationWeeks =
      duration_weeks !== undefined ? Number(duration_weeks) : course.durationWeeks;

    if (!Number.isInteger(nextDurationWeeks) || nextDurationWeeks < 1) {
      return res.status(400).json({ success: false, message: 'Duration weeks must be a positive integer' });
    }

    const updatedCourse = await prisma.$transaction(async (tx) => {
      const result = await tx.course.update({
        where: { id: courseId },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(thumbnail_url !== undefined ? { thumbnailUrl: thumbnail_url || null } : {}),
          ...(level !== undefined ? { level } : {}),
          ...(audience !== undefined ? { audience } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(duration_weeks !== undefined ? { durationWeeks: nextDurationWeeks } : {})
        },
        include: courseInclude
      });

      if (duration_weeks !== undefined) {
        const currentWeeks = await tx.week.findMany({
          where: { courseId },
          orderBy: { weekNo: 'asc' }
        });

        if (nextDurationWeeks > currentWeeks.length) {
          await tx.week.createMany({
            data: Array.from({ length: nextDurationWeeks - currentWeeks.length }, (_, index) => ({
              courseId,
              weekNo: currentWeeks.length + index + 1,
              title: `Week ${currentWeeks.length + index + 1}`
            }))
          });
        } else if (nextDurationWeeks < currentWeeks.length) {
          const weeksToDelete = currentWeeks.slice(nextDurationWeeks).map((week) => week.id);
          if (weeksToDelete.length > 0) {
            await tx.week.deleteMany({
              where: { id: { in: weeksToDelete } }
            });
          }
        }
      }

      return tx.course.findUnique({
        where: { id: courseId },
        include: courseInclude
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: normalizeCourse(updatedCourse)
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    await prisma.course.delete({
      where: { id: courseId }
    });

    return res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addLessonToWeek = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { lesson_id, lesson_order } = req.body;

    if (!weekId || !lesson_id || !lesson_order) {
      return res.status(400).json({ success: false, message: 'Week id, lesson id and lesson order are required' });
    }

    const lessonOrder = Number(lesson_order);
    const created = await prisma.weekLesson.create({
      data: {
        weekId,
        lessonId: lesson_id,
        lessonOrder
      }
    });

    return res.status(201).json({ success: true, message: 'Lesson added to week successfully', data: created });
  } catch (error) {
    console.log(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Lesson already exists in this week or order already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeLessonFromWeek = async (req, res) => {
  try {
    const { weekLessonId } = req.params;
    await prisma.weekLesson.delete({ where: { id: weekLessonId } });
    return res.status(200).json({ success: true, message: 'Lesson removed from week successfully' });
  } catch (error) {
    console.log(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Week lesson not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const reorderWeekLessons = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { lessons } = req.body;
    if (!Array.isArray(lessons)) {
      return res.status(400).json({ success: false, message: 'Lessons array is required' });
    }

    await prisma.$transaction([
      ...lessons.map((item, index) =>
        prisma.weekLesson.update({
          where: { id: item.id },
          data: { lessonOrder: -(index + 1) }
        })
      ),
      ...lessons.map((item) =>
        prisma.weekLesson.update({
          where: { id: item.id },
          data: { lessonOrder: item.lessonOrder }
        })
      )
    ]);

    const updatedWeek = await prisma.week.findUnique({
      where: { id: weekId },
      include: { weekLessons: { orderBy: { lessonOrder: 'asc' }, include: { lesson: true } } }
    });
    return res.status(200).json({ success: true, message: 'Week lessons reordered successfully', data: updatedWeek });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseDetails,
  updateCourse,
  deleteCourse,
  addLessonToWeek,
  removeLessonFromWeek,
  reorderWeekLessons
};
