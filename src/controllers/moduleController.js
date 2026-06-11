const prisma = require('../db/prisma');

const createModule = async (req, res) => {
  try {
    const { title, description, week_no, course_id } = req.body;
    const requestedWeekNo = Number(week_no);

    if (!title || !week_no || !course_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, week number and course are required'
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: course_id
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    let finalWeekNo = Number.isFinite(requestedWeekNo) && requestedWeekNo > 0 ? requestedWeekNo : 1;

    while (true) {
      const existingModule = await prisma.module.findFirst({
        where: {
          courseId: course_id,
          weekNo: finalWeekNo
        }
      });

      if (!existingModule) {
        break;
      }

      finalWeekNo += 1;
    }

    const createdModule = await prisma.module.create({
      data: {
        title,
        description,
        weekNo: finalWeekNo,
        courseId: course_id
      },
      include: {
        course: true,
        lessons: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: createdModule,
      adjustedWeekNo: finalWeekNo !== requestedWeekNo ? finalWeekNo : undefined
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Module week number already exists'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getModules = async (req, res) => {
  try {
    const { course_id } = req.query;

    const modules = await prisma.module.findMany({
      where: {
        ...(course_id ? { courseId: course_id } : {})
      },
      include: {
        course: true,
        lessons: {
          orderBy: {
            lessonOrder: 'asc'
          },
          include: {
            questions: {
              orderBy: {
                questionOrder: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        weekNo: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Modules retrieved successfully',
      data: modules
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getModuleById = async (req, res) => {
  try {
    const { moduleId } = req.params;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: 'Module id is required'
      });
    }

    const module = await prisma.module.findUnique({
      where: {
        id: moduleId
      },
      include: {
        course: true,
        lessons: {
          orderBy: {
            lessonOrder: 'asc'
          },
          include: {
            questions: {
              orderBy: {
                questionOrder: 'asc'
              }
            }
          }
        }
      }
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Module retrieved successfully',
      data: module
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, description, week_no, course_id } = req.body;
    const requestedWeekNo = week_no !== undefined ? Number(week_no) : undefined;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: 'Module id is required'
      });
    }

    if (course_id !== undefined) {
      const course = await prisma.course.findUnique({
        where: {
          id: course_id
        }
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    let finalWeekNo = requestedWeekNo;
    if (requestedWeekNo !== undefined && course_id !== undefined) {
      if (Number.isFinite(requestedWeekNo) && requestedWeekNo > 0) {
        while (true) {
          const existingModule = await prisma.module.findFirst({
            where: {
              courseId: course_id,
              weekNo: finalWeekNo,
              NOT: {
                id: moduleId
              }
            }
          });

          if (!existingModule) {
            break;
          }

          finalWeekNo += 1;
        }
      }
    }

    const updatedModule = await prisma.module.update({
      where: {
        id: moduleId
      },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(week_no !== undefined ? { weekNo: finalWeekNo } : {}),
        ...(course_id !== undefined ? { courseId: course_id } : {})
      },
      include: {
        course: true,
        lessons: true
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: updatedModule,
      adjustedWeekNo: finalWeekNo !== requestedWeekNo ? finalWeekNo : undefined
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Module week number already exists'
      });
    }

    if (error.code === 'P2025') {
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

const deleteModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: 'Module id is required'
      });
    }
    
    await prisma.module.delete({
      where: {
        id: moduleId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'P2025') {
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

module.exports = {
  createModule,
  getModules,
  getModuleById,
  updateModule,
  deleteModule
};
