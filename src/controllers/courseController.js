const prisma = require('../db/prisma');
const {
  weekLessonQuestionInclude,
  shapeCourseWithLessons,
  shapeWeekWithLessons,
  shapeCourseForApp,
  shapeWeekForApp
} = require('../utils/lessonPlacement');

const courseInclude = {
  weeks: {
    orderBy: { weekNo: 'asc' },
    include: {
      weekLessons: {
        orderBy: { lessonOrder: 'asc' },
        include: {
          ...weekLessonQuestionInclude,
          lesson: true
        }
      }
    }
  }
};

const summaryCourseInclude = {
  weeks: {
    orderBy: { weekNo: 'asc' },
    include: {
      weekLessons: {
        select: {
          id: true
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

const getCourseContentSummary = (course) => {
  const weeks = course.weeks || [];

  return {
    weeksCount: weeks.length,
    lessonsCount: weeks.reduce((count, week) => count + (week.weekLessons?.length || 0), 0)
  };
};

const getWeekLessonWhere = (weekId, item) => {
  if (item.weekLessonId) {
    return { id: item.weekLessonId };
  }

  if (item.placementId) {
    return { id: item.placementId };
  }

  return {
    weekId_lessonId: {
      weekId,
      lessonId: item.lessonId || item.id
    }
  };
};

const allowedCourseStatuses = new Set(['draft', 'in_review', 'published', 'archived']);

const normalizeCourseStatusInput = (status) => {
  if (status === undefined || status === null) {
    return undefined;
  }

  const normalized = String(status).trim().toLowerCase().replace(/\s+/g, '_');
  return normalized === 'inreview' ? 'in_review' : normalized;
};

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

    const normalizedStatus = normalizeCourseStatusInput(status);
    if (normalizedStatus !== undefined && !allowedCourseStatuses.has(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course status'
      });
    }

    const createdCourse = await prisma.course.create({
      data: {
        title,
        description,
        thumbnailUrl: thumbnail_url || null,
        level: level || 'beginner',
        audience: audience || 'general_learner',
        durationWeeks,
        status: normalizedStatus || 'draft',
        weeks: {
          create: Array.from({ length: durationWeeks }, (_, index) => ({
            weekNo: index + 1,
            title: `Week ${index + 1}`
          }))
        }
      },
      include: courseInclude
    });

    return res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: shapeCourseWithLessons(normalizeCourse(createdCourse))
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCourses = async (_req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: courseInclude,
      orderBy: { createdAt: 'desc' }
    });

    const data = courses.map((course) => ({
      ...shapeCourseWithLessons(normalizeCourse(course)),
      ...getCourseContentSummary(course)
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

    return res.status(200).json({
      success: true,
      message: 'Course retrieved successfully',
      data: shapeCourseWithLessons(normalizeCourse(course))
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCourseAppDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: courseInclude
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Course feed retrieved successfully',
      data: shapeCourseForApp(normalizeCourse(course))
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCourseWeeksApp = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: courseInclude
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Weeks retrieved successfully',
      data: {
        weeks: (course.weeks || []).map((week) => shapeWeekForApp(week))
      }
    });
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

    const normalizedStatus = normalizeCourseStatusInput(status);
    if (normalizedStatus !== undefined && !allowedCourseStatuses.has(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course status'
      });
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
          ...(normalizedStatus !== undefined ? { status: normalizedStatus } : {}),
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
          const usedWeekNos = new Set(currentWeeks.map((week) => week.weekNo));
          const weeksToCreate = [];
          let candidateWeekNo = 1;

          while (weeksToCreate.length < nextDurationWeeks - currentWeeks.length) {
            while (usedWeekNos.has(candidateWeekNo)) {
              candidateWeekNo += 1;
            }

            weeksToCreate.push({
              courseId,
              weekNo: candidateWeekNo,
              title: `Week ${candidateWeekNo}`
            });
            usedWeekNos.add(candidateWeekNo);
            candidateWeekNo += 1;
          }

          await tx.week.createMany({ data: weeksToCreate });
        } else if (nextDurationWeeks < currentWeeks.length) {
          const weeksToDelete = currentWeeks.slice(nextDurationWeeks).map((week) => week.id);
          if (weeksToDelete.length > 0) {
            await tx.weekLesson.deleteMany({
              where: { weekId: { in: weeksToDelete } }
            });
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
      data: shapeCourseWithLessons(normalizeCourse(updatedCourse))
    });
  } catch (error) {
    console.error('Course update failed:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });

    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A week number already exists for this course' });
    }

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

const deleteWeek = async (req, res) => {
  try {
    const { weekId } = req.params;

    if (!weekId) {
      return res.status(400).json({ success: false, message: 'Week id is required' });
    }

    await prisma.week.delete({
      where: { id: weekId }
    });

    return res.status(200).json({ success: true, message: 'Week deleted successfully' });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Week not found' });
    }

    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateWeek = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { week_no, title, thumbnail_url, course_id } = req.body;

    if (!weekId) {
      return res.status(400).json({ success: false, message: 'Week id is required' });
    }

    const existingWeek = await prisma.week.findUnique({
      where: { id: weekId }
    });

    if (!existingWeek) {
      return res.status(404).json({ success: false, message: 'Week not found' });
    }

    const nextWeekNo =
      week_no !== undefined && week_no !== null && week_no !== ""
        ? Number(week_no)
        : existingWeek.weekNo;

    if (!Number.isInteger(nextWeekNo) || nextWeekNo < 1) {
      return res.status(400).json({ success: false, message: 'Week number must be a positive integer' });
    }

    const updatedWeek = await prisma.week.update({
      where: { id: weekId },
      data: {
        ...(course_id ? { courseId: course_id } : {}),
        weekNo: nextWeekNo,
        ...(title !== undefined ? { title } : {}),
        ...(thumbnail_url !== undefined ? { thumbnailUrl: thumbnail_url || null } : {})
      },
      include: {
        weekLessons: {
          orderBy: { lessonOrder: 'asc' },
          include: {
            ...weekLessonQuestionInclude,
            lesson: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Week updated successfully',
      data: shapeWeekWithLessons(updatedWeek)
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const createWeek = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { week_no, title, thumbnail_url } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course id is required' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const requestedWeekNo = Number(week_no);
    let finalWeekNo = Number.isFinite(requestedWeekNo) && requestedWeekNo > 0 ? requestedWeekNo : 1;

    while (true) {
      const existingWeek = await prisma.week.findFirst({
        where: {
          courseId,
          weekNo: finalWeekNo
        }
      });

      if (!existingWeek) break;
      finalWeekNo += 1;
    }

    const createdWeek = await prisma.week.create({
      data: {
        courseId,
        weekNo: finalWeekNo,
        title: title || `Week ${finalWeekNo}`,
        thumbnailUrl: thumbnail_url || null
      },
      include: {
        weekLessons: {
          orderBy: { lessonOrder: 'asc' },
          include: {
            ...weekLessonQuestionInclude,
            lesson: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Week created successfully',
      data: shapeWeekWithLessons(createdWeek)
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Week number already exists'
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
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
          where: getWeekLessonWhere(weekId, item),
          data: { lessonOrder: -(index + 1) }
        })
      ),
      ...lessons.map((item) =>
        prisma.weekLesson.update({
          where: getWeekLessonWhere(weekId, item),
          data: { lessonOrder: item.lessonOrder }
        })
      )
    ]);

    const updatedWeek = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        weekLessons: {
          orderBy: { lessonOrder: 'asc' },
          include: {
            ...weekLessonQuestionInclude,
            lesson: true
          }
        }
      }
    });
    return res.status(200).json({
      success: true,
      message: 'Week lessons reordered successfully',
      data: shapeWeekWithLessons(updatedWeek)
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseDetails,
  getCourseAppDetails,
  getCourseWeeksApp,
  updateCourse,
  deleteCourse,
  reorderWeekLessons,
  createWeek,
  deleteWeek,
  updateWeek
};
