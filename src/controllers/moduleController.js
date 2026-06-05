const prisma = require('../db/prisma');

const createModule = async (req, res) => {
  try {
    const { title, description, week_no } = req.body;

    if (!title || !week_no) {
      return res.status(400).json({
        success: false,
        message: 'Title and week number are required'
      });
    }

    const createdModule = await prisma.module.create({
      data: {
        title,
        description,
        weekNo: week_no
      },
      include: {
        lessons: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: createdModule
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
    const modules = await prisma.module.findMany({
      include: {
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

const updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, description, week_no } = req.body;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: 'Module id is required'
      });
    }

    const updatedModule = await prisma.module.update({
      where: {
        id: moduleId
      },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(week_no !== undefined ? { weekNo: week_no } : {})
      },
      include: {
        lessons: true
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: updatedModule
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
  updateModule,
  deleteModule
};
