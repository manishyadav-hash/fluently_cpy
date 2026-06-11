const prisma = require('../db/prisma');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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

const createLesson = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, lesson_order, thumbnail, duration, lesson_type, lesson_level } = req.body;

    if (!moduleId || !title || !lesson_order) {
      return res.status(400).json({
        success: false,
        message: 'Module id, title and lesson order are required'
      });
    }

    /*
    Old SQL version:

    const existingLesson = await pool.query(
      `
      SELECT id FROM lessons
      WHERE module_id = $1 AND lesson_order = $2
      `,
      [moduleId, lesson_order]
    );

    if (existingLesson.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Lesson order already exists for this module'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO lessons (module_id, title, lesson_order)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [moduleId, title, lesson_order]
    );
    */

    const createdLesson = await prisma.lesson.create({
      data: {
        moduleId,
        title,
        ...(lesson_level !== undefined ? { lessonLevel: lesson_level } : {}),
        ...(lesson_type !== undefined ? { lessonType: lesson_type } : {}),
        lessonOrder: lesson_order,
        ...(thumbnail !== undefined ? { thumbnail } : {}),
        ...(duration !== undefined ? { duration } : {})
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: createdLesson
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Lesson order already exists for this module'
      });
    }

    if (error.code === 'P2003') {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
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
    const { moduleId } = req.params;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: 'Module id is required'
      });
    }

    /*
    Old SQL version:

    const result = await pool.query(
      `
      SELECT * FROM lessons
      WHERE module_id = $1
      ORDER BY lesson_order ASC
      `,
      [moduleId]
    );
    */

    const lessons = await prisma.lesson.findMany({
      where: {
        moduleId
      },
      orderBy: {
        lessonOrder: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessons
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
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessons
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

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId
      },
      include: {
        module: true,
        questions: {
          orderBy: {
            questionOrder: 'asc'
          },
          include: {
            options: {
              orderBy: {
                optionText: 'asc'
              }
            }
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

    return res.status(200).json({
      success: true,
      message: 'Lesson retrieved successfully',
      data: lesson
    });
  } catch (error) {
    console.log(error);

    console.log('getLessonById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, lesson_order, thumbnail, duration, lesson_type, lesson_level } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson id is required'
      });
    }

    const updatedLesson = await prisma.lesson.update({
      where: {
        id: lessonId
      },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(lesson_level !== undefined ? { lessonLevel: lesson_level } : {}),
        ...(lesson_type !== undefined ? { lessonType: lesson_type } : {}),
        ...(lesson_order !== undefined ? { lessonOrder: lesson_order } : {}),
        ...(thumbnail !== undefined ? { thumbnail } : {}),
        ...(duration !== undefined ? { duration } : {})
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: updatedLesson
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Lesson order already exists for this module'
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

module.exports = {
  createLesson,
  getLessons,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  uploadLessonThumbnail
};
