const prisma = require('../db/prisma');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  weekLessonQuestionInclude,
  shapeLessonFromPlacement,
  shapeWeekWithLessons,
  shapeLessonDetailForApp
} = require('../utils/lessonPlacement');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${safeBase}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  }
});

const mediaUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/') && !file.mimetype.startsWith('audio/')) {
      cb(new Error('Only video or audio files are allowed'));
      return;
    }
    cb(null, true);
  }
});

const lessonInclude = {
  weekLessons: {
    orderBy: {
      lessonOrder: 'asc'
    },
    include: {
      ...weekLessonQuestionInclude,
      week: {
        include: {
          course: true
        }
      }
    }
  }
};

const weekLessonInclude = {
  ...weekLessonQuestionInclude,
  lesson: true
};

const getWeekWithLessons = async (weekId) => prisma.week.findUnique({
  where: { id: weekId },
  include: {
    weekLessons: {
      orderBy: {
        lessonOrder: 'asc'
      },
      include: weekLessonInclude
    }
  }
});

const cloneJsonValue = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return JSON.parse(JSON.stringify(value));
};

const createLesson = async (req, res) => {
  try {
    const { weekId } = req.params;
    const {
      title,
      lesson_order,
      lessonOrder,
      thumbnail,
      duration,
      lesson_type,
      lessonType,
      lesson_level,
      lessonLevel,
      contentBlocks
    } = req.body;

    if (!weekId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Week id and title are required'
      });
    }

    const week = await prisma.week.findUnique({
      where: { id: weekId }
    });

    if (!week) {
      return res.status(404).json({
        success: false,
        message: 'Week not found'
      });
    }

    const resolvedOrderInput = lesson_order ?? lessonOrder;
    let resolvedLessonOrder = Number(resolvedOrderInput);

    if (!Number.isInteger(resolvedLessonOrder) || resolvedLessonOrder < 1) {
      const maxOrder = await prisma.weekLesson.aggregate({
        where: { weekId },
        _max: { lessonOrder: true }
      });
      resolvedLessonOrder = (maxOrder._max.lessonOrder || 0) + 1;
    }

    const createdLesson = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          title,
          ...(lesson_level !== undefined || lessonLevel !== undefined ? { lessonLevel: lesson_level ?? lessonLevel } : {}),
          ...(lesson_type !== undefined || lessonType !== undefined ? { lessonType: lesson_type ?? lessonType } : {}),
          ...(thumbnail !== undefined ? { thumbnail } : {}),
          ...(duration !== undefined ? { duration } : {}),
          ...(contentBlocks !== undefined ? { contentBlocks } : {})
        }
      });

      await tx.weekLesson.create({
        data: {
          weekId,
          lessonId: lesson.id,
          lessonOrder: resolvedLessonOrder,
          ...(contentBlocks !== undefined ? { contentBlocks: cloneJsonValue(contentBlocks) } : {})
        }
      });

      return tx.lesson.findUnique({
        where: { id: lesson.id },
        include: lessonInclude
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: shapeLessonFromPlacement(createdLesson)
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Lesson order already exists for this week'
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Week not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getLessons = async (req, res) => {
  try {
    const { weekId } = req.params;

    if (!weekId) {
      return res.status(400).json({
        success: false,
        message: 'Week id is required'
      });
    }

    const weekLessons = await prisma.weekLesson.findMany({
      where: {
        weekId
      },
      orderBy: {
        lessonOrder: 'asc'
      },
      include: weekLessonInclude
    });

    return res.status(200).json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: weekLessons.map((weekLesson) =>
        shapeLessonFromPlacement(weekLesson.lesson, weekLesson)
      )
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getAllLessons = async (_req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: lessonInclude
    });

    return res.status(200).json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessons.map((lesson) => shapeLessonFromPlacement(lesson))
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { week_id, weekId, week_lesson_id, weekLessonId } = req.query;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: {
        id: lessonId
      },
      include: lessonInclude
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const targetWeekId = week_id ?? weekId;
    const targetWeekLessonId = week_lesson_id ?? weekLessonId;
    const placement =
      lesson.weekLessons?.find((weekLesson) => weekLesson.id === targetWeekLessonId) ||
      lesson.weekLessons?.find((weekLesson) => weekLesson.weekId === targetWeekId) ||
      null;

    return res.status(200).json({
      success: true,
      message: 'Lesson retrieved successfully',
      data: shapeLessonFromPlacement(lesson, placement)
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getLessonAppById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { week_id, weekId, week_lesson_id, weekLessonId } = req.query;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: {
        id: lessonId
      },
      include: lessonInclude
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const targetWeekId = week_id ?? weekId;
    const targetWeekLessonId = week_lesson_id ?? weekLessonId;
    const placement =
      lesson.weekLessons?.find((weekLesson) => weekLesson.id === targetWeekLessonId) ||
      lesson.weekLessons?.find((weekLesson) => weekLesson.weekId === targetWeekId) ||
      lesson.weekLessons?.[0] ||
      null;

    return res.status(200).json({
      success: true,
      message: 'Lesson app detail retrieved successfully',
      data: shapeLessonDetailForApp(lesson, placement)
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const {
      title,
      lesson_order,
      lessonOrder,
      thumbnail,
      duration,
      lesson_type,
      lessonType,
      lesson_level,
      lessonLevel,
      week_id,
      weekId,
      week_lesson_id,
      weekLessonId,
      contentBlocks
    } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    const updatedLesson = await prisma.$transaction(async (tx) => {
      await tx.lesson.update({
        where: {
          id: lessonId
        },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(lesson_level !== undefined || lessonLevel !== undefined ? { lessonLevel: lesson_level ?? lessonLevel } : {}),
          ...(lesson_type !== undefined || lessonType !== undefined ? { lessonType: lesson_type ?? lessonType } : {}),
          ...(thumbnail !== undefined ? { thumbnail } : {}),
          ...(duration !== undefined ? { duration } : {})
        }
      });

      if (contentBlocks !== undefined) {
        const targetWeekId = week_id ?? weekId;
        const targetWeekLessonId = week_lesson_id ?? weekLessonId;
        const placement = await tx.weekLesson.findFirst({
          where: {
            lessonId,
            ...(targetWeekLessonId ? { id: targetWeekLessonId } : {}),
            ...(targetWeekId ? { weekId: targetWeekId } : {})
          },
          orderBy: { createdAt: 'asc' }
        });

        if (placement) {
          await tx.weekLesson.update({
            where: { id: placement.id },
            data: { contentBlocks: cloneJsonValue(contentBlocks) }
          });
        } else {
          await tx.lesson.update({
            where: { id: lessonId },
            data: { contentBlocks: cloneJsonValue(contentBlocks) }
          });
        }
      }

      const nextOrder = lesson_order ?? lessonOrder;
      if (nextOrder !== undefined && nextOrder !== null && nextOrder !== "") {
        const targetWeekId = week_id ?? weekId;
        const placement = await tx.weekLesson.findFirst({
          where: {
            lessonId,
            ...(targetWeekId ? { weekId: targetWeekId } : {})
          },
          orderBy: { createdAt: 'asc' }
        });

        if (placement) {
          await tx.weekLesson.update({
            where: { id: placement.id },
            data: { lessonOrder: Number(nextOrder) }
          });
        }
      }

      return tx.lesson.findUnique({
        where: { id: lessonId },
        include: lessonInclude
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: shapeLessonFromPlacement(updatedLesson)
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Lesson order already exists for this week'
      });
    }

    if (error.code === 'P2025') {
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

const resequenceWeekLessons = async (tx, weekId) => {
  const placements = await tx.weekLesson.findMany({
    where: { weekId },
    orderBy: { lessonOrder: 'asc' }
  });

  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index];
    await tx.weekLesson.update({
      where: { id: placement.id },
      data: { lessonOrder: index + 1 }
    });
  }
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

const attachLessonToWeek = async (req, res) => {
  try {
    const { weekId, lessonId } = req.params;
    const { lesson_order, lessonOrder } = req.body;

    if (!weekId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Week id and lesson id are required'
      });
    }

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      select: {
        id: true,
        courseId: true,
        title: true
      }
    });
    if (!week) {
      return res.status(404).json({
        success: false,
        message: 'Week not found'
      });
    }

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          weekLessons: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true
            }
          }
        }
      });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const resolvedOrderInput = lesson_order ?? lessonOrder;
    const requestedOrder = Number(resolvedOrderInput);

    await prisma.$transaction(async (tx) => {
      const existingCoursePlacement = await tx.weekLesson.findFirst({
        where: {
          lessonId,
          week: {
            courseId: week.courseId
          }
        },
        include: {
          week: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (existingCoursePlacement) {
        const message =
          existingCoursePlacement.weekId === weekId
            ? 'This lesson is already inside this week'
            : `This lesson is already attached to ${existingCoursePlacement.week.title || 'another week'} in this course`;

        const error = new Error(message);
        error.statusCode = 409;
        throw error;
      }

      const existingPlacement = await tx.weekLesson.findFirst({
        where: { weekId, lessonId }
      });

      const maxOrder = await tx.weekLesson.aggregate({
        where: { weekId },
        _max: { lessonOrder: true }
      });
      const nextOrder = (maxOrder._max.lessonOrder || 0) + 1;
      const finalOrder = Number.isInteger(requestedOrder) && requestedOrder > 0 ? requestedOrder : nextOrder;

      if (existingPlacement) {
        await tx.weekLesson.update({
          where: { id: existingPlacement.id },
          data: {
            lessonOrder: finalOrder
          }
        });
        } else {
          await tx.weekLesson.create({
            data: {
              weekId,
              lessonId,
              lessonOrder: finalOrder,
              // Reused lessons should get an independent placement workspace.
              // We intentionally start new placements empty so content added in
              // one course/week never appears in another by default.
              contentBlocks: []
            }
          });
        }
    });

    const updatedWeek = await getWeekWithLessons(weekId);

    return res.status(200).json({
      success: true,
      message: 'Lesson added to week successfully',
      data: shapeWeekWithLessons(updatedWeek)
    });
    } catch (error) {
      console.log(error);

      if (error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
  
      if (error.code === 'P2002') {
        return res.status(409).json({
        success: false,
        message: 'Lesson order already exists for this week'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const detachLessonFromWeek = async (req, res) => {
  try {
    const { weekId, lessonId } = req.params;

    if (!weekId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Week id and lesson id are required'
      });
    }

    const placement = await prisma.weekLesson.findFirst({
      where: { weekId, lessonId }
    });

    if (!placement) {
      return res.status(404).json({
        success: false,
        message: 'Lesson is not attached to this week'
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.weekLesson.delete({
        where: { id: placement.id }
      });

      await resequenceWeekLessons(tx, weekId);
    });

    return res.status(200).json({
      success: true,
      message: 'Lesson removed from week successfully'
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const reorderWeekLessons = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { lessons } = req.body;

    if (!weekId) {
      return res.status(400).json({
        success: false,
        message: 'Week id is required'
      });
    }

    if (!Array.isArray(lessons)) {
      return res.status(400).json({
        success: false,
        message: 'Lessons array is required'
      });
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

    const updatedWeek = await getWeekWithLessons(weekId);

    return res.status(200).json({
      success: true,
      message: 'Week lessons reordered successfully',
      data: shapeWeekWithLessons(updatedWeek)
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    await prisma.lesson.delete({
      where: {
        id: lessonId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2025') {
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

const uploadLessonThumbnail = async (req, res) => {
  upload.single('thumbnail')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Thumbnail upload failed'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail file is required'
      });
    }

    const thumbnailUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        thumbnail: thumbnailUrl,
        filename: req.file.filename
      }
    });
  });
};

const uploadLessonMedia = async (req, res) => {
  mediaUpload.single('media')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Media upload failed'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media file is required'
      });
    }

    const mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        mediaUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype
      }
    });
  });
};

module.exports = {
  createLesson,
  attachLessonToWeek,
  detachLessonFromWeek,
  getLessons,
  getAllLessons,
  getLessonById,
  getLessonAppById,
  updateLesson,
  reorderWeekLessons,
  deleteLesson,
  uploadLessonThumbnail,
  uploadLessonMedia
};
