import mongoose from 'mongoose';
import Class from '../models/Class.js';
import Assessment from '../models/Assessment.js';

/**
 * GET /api/classes
 * Lists classes owned by the authenticated teacher with pagination.
 */
export async function getClasses(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      Class.find({ teacherId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Class.countDocuments({ teacherId }),
    ]);

    return res.status(200).json({
      success: true,
      data: classes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/classes
 * Creates a new class for the authenticated teacher.
 */
export async function createClass(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const { name, grade, subject, board } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Class name is required and must be a non-empty string.',
        code: 'INVALID_NAME',
      });
    }

    if (!grade || typeof grade !== 'string' || !grade.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Grade is required and must be a non-empty string.',
        code: 'INVALID_GRADE',
      });
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Subject is required and must be a non-empty string.',
        code: 'INVALID_SUBJECT',
      });
    }

    const newClass = await Class.create({
      teacherId, // Derived strictly from verified identity
      name: name.trim(),
      grade: grade.trim(),
      subject: subject.trim(),
      board: board && typeof board === 'string' ? board.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Class created successfully.',
      data: newClass,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/classes/:id
 * Retrieves a single owned class by ID.
 */
export async function getClassById(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid class ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const foundClass = await Class.findOne({ _id: id, teacherId }).lean();

    if (!foundClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or you do not have permission to access it.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: foundClass,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/classes/:id
 * Updates an existing owned class.
 */
export async function updateClass(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid class ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const existingClass = await Class.findOne({ _id: id, teacherId });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or you do not have permission to modify it.',
        code: 'NOT_FOUND',
      });
    }

    const { name, grade, subject, board } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Class name must be a non-empty string.',
          code: 'INVALID_NAME',
        });
      }
      existingClass.name = name.trim();
    }

    if (grade !== undefined) {
      if (typeof grade !== 'string' || !grade.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Grade must be a non-empty string.',
          code: 'INVALID_GRADE',
        });
      }
      existingClass.grade = grade.trim();
    }

    if (subject !== undefined) {
      if (typeof subject !== 'string' || !subject.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Subject must be a non-empty string.',
          code: 'INVALID_SUBJECT',
        });
      }
      existingClass.subject = subject.trim();
    }

    if (board !== undefined) {
      existingClass.board = typeof board === 'string' ? board.trim() : '';
    }

    await existingClass.save();

    return res.status(200).json({
      success: true,
      message: 'Class updated successfully.',
      data: existingClass,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/classes/:id
 * Deletes an owned class and cleans up related assessments safely.
 */
export async function deleteClass(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid class ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const existingClass = await Class.findOne({ _id: id, teacherId });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or you do not have permission to delete it.',
        code: 'NOT_FOUND',
      });
    }

    // Prevent deletion if dependent assessments exist
    const dependentCount = await Assessment.countDocuments({ classId: id, teacherId });
    if (dependentCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete class '${existingClass.name}'. It contains ${dependentCount} active assessment(s). Please remove or reassign its assessments before deleting this class.`,
        code: 'CLASS_HAS_DEPENDENT_ASSESSMENTS',
        details: {
          dependentAssessmentsCount: dependentCount,
        },
      });
    }

    await existingClass.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Class deleted successfully.',
      data: {
        deletedClassId: id,
        deletedClassName: existingClass.name,
      },
    });
  } catch (err) {
    return next(err);
  }
}
