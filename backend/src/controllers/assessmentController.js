import mongoose from 'mongoose';
import Assessment from '../models/Assessment.js';
import Class from '../models/Class.js';

/**
 * GET /api/assessments
 * Lists assessments owned by the authenticated teacher with pagination.
 * Optional query parameter: classId (filters by class).
 */
export async function getAssessments(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const { classId } = req.query;

    const query = { teacherId };

    if (classId) {
      if (!mongoose.isValidObjectId(classId)) {
        return res.status(400).json({
          success: false,
          error: `Invalid classId query format: '${classId}'`,
          code: 'INVALID_ID_FORMAT',
        });
      }
      query.classId = classId;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [assessments, total] = await Promise.all([
      Assessment.find(query)
        .populate('classId', 'name grade subject board')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Assessment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: assessments,
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
 * POST /api/assessments
 * Creates an assessment linked to one of the teacher's classes.
 */
export async function createAssessment(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const { classId, title, subject, maximumMarks, examDate, status, lessons, rubric } = req.body;

    // Validate classId format and ownership
    if (!classId || !mongoose.isValidObjectId(classId)) {
      return res.status(400).json({
        success: false,
        error: 'A valid classId is required.',
        code: 'INVALID_CLASS_ID',
      });
    }

    // Verify class exists AND belongs to the authenticated teacher
    const owningClass = await Class.findOne({ _id: classId, teacherId });
    if (!owningClass) {
      return res.status(404).json({
        success: false,
        error: 'Referenced class was not found or is not owned by your account.',
        code: 'CLASS_NOT_FOUND',
      });
    }

    // Validate title
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Assessment title is required and must be a non-empty string.',
        code: 'INVALID_TITLE',
      });
    }

    // Validate subject (fall back to class subject if omitted)
    const finalSubject = subject && typeof subject === 'string' && subject.trim()
      ? subject.trim()
      : owningClass.subject;

    // Validate maximumMarks > 0
    const parsedMarks = Number(maximumMarks);
    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Maximum marks must be a finite number strictly greater than 0.',
        code: 'INVALID_MAXIMUM_MARKS',
      });
    }

    // Validate optional status
    const allowedStatuses = ['draft', 'processing', 'completed', 'failed'];
    const finalStatus = status && allowedStatuses.includes(status) ? status : 'draft';

    // Validate examDate
    let parsedDate = null;
    if (examDate) {
      parsedDate = new Date(examDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'examDate must be a valid ISO date string.',
          code: 'INVALID_DATE',
        });
      }
    }

    // Validate optional rubric if provided
    let finalRubric = [];
    if (rubric !== undefined) {
      if (!Array.isArray(rubric)) {
        return res.status(400).json({
          success: false,
          error: 'Rubric must be an array of question marking specifications.',
          code: 'INVALID_RUBRIC',
        });
      }
      let rubricSum = 0;
      for (const item of rubric) {
        if (!item.questionNumber || !item.questionNumber.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Each rubric item must have a valid questionNumber (e.g. Q1).',
            code: 'INVALID_RUBRIC_ITEM',
          });
        }
        const qMarks = Number(item.maximumMarks);
        if (isNaN(qMarks) || qMarks <= 0) {
          return res.status(400).json({
            success: false,
            error: `Question ${item.questionNumber} maximum marks must be a finite number greater than 0.`,
            code: 'INVALID_QUESTION_MARKS',
          });
        }
        rubricSum += qMarks;
      }
      if (rubricSum > parsedMarks) {
        return res.status(400).json({
          success: false,
          error: `Total rubric marks (${rubricSum}) cannot exceed assessment maximumMarks (${parsedMarks}).`,
          code: 'RUBRIC_EXCEEDS_TOTAL_MARKS',
        });
      }
      finalRubric = rubric;
    }

    // Validate optional lessons if provided
    let finalLessons = [];
    if (lessons !== undefined) {
      if (!Array.isArray(lessons)) {
        return res.status(400).json({
          success: false,
          error: 'Lessons must be an array of syllabus topics.',
          code: 'INVALID_LESSONS',
        });
      }
      finalLessons = lessons;
    }

    const newAssessment = await Assessment.create({
      teacherId, // Derived strictly from verified identity
      classId: owningClass._id,
      title: title.trim(),
      subject: finalSubject,
      maximumMarks: parsedMarks,
      examDate: parsedDate,
      status: finalStatus,
      lessons: finalLessons,
      rubric: finalRubric,
    });

    return res.status(201).json({
      success: true,
      message: 'Assessment created successfully.',
      data: newAssessment,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/assessments/:id
 * Retrieves a single owned assessment by ID.
 */
export async function getAssessmentById(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid assessment ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const foundAssessment = await Assessment.findOne({ _id: id, teacherId })
      .populate('classId', 'name grade subject board')
      .lean();

    if (!foundAssessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or you do not have permission to access it.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: foundAssessment,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/assessments/:id
 * Updates an owned assessment.
 */
export async function updateAssessment(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid assessment ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const existingAssessment = await Assessment.findOne({ _id: id, teacherId });

    if (!existingAssessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or you do not have permission to modify it.',
        code: 'NOT_FOUND',
      });
    }

    const { classId, title, subject, maximumMarks, examDate, status, lessons, rubric } = req.body;

    // If updating classId, verify new class belongs to this teacher
    if (classId !== undefined) {
      if (!mongoose.isValidObjectId(classId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid classId format.',
          code: 'INVALID_CLASS_ID',
        });
      }

      const owningClass = await Class.findOne({ _id: classId, teacherId });
      if (!owningClass) {
        return res.status(404).json({
          success: false,
          error: 'New referenced class was not found or is not owned by your account.',
          code: 'CLASS_NOT_FOUND',
        });
      }
      existingAssessment.classId = owningClass._id;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Assessment title must be a non-empty string.',
          code: 'INVALID_TITLE',
        });
      }
      existingAssessment.title = title.trim();
    }

    if (subject !== undefined) {
      if (typeof subject !== 'string' || !subject.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Subject must be a non-empty string.',
          code: 'INVALID_SUBJECT',
        });
      }
      existingAssessment.subject = subject.trim();
    }

    if (maximumMarks !== undefined) {
      const parsedMarks = Number(maximumMarks);
      if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Maximum marks must be a finite number strictly greater than 0.',
          code: 'INVALID_MAXIMUM_MARKS',
        });
      }
      existingAssessment.maximumMarks = parsedMarks;
    }

    if (status !== undefined) {
      const allowedStatuses = ['draft', 'processing', 'completed', 'failed'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Status must be one of: ${allowedStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
        });
      }
      existingAssessment.status = status;
    }

    if (examDate !== undefined) {
      if (examDate === null || examDate === '') {
        existingAssessment.examDate = null;
      } else {
        const parsedDate = new Date(examDate);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'examDate must be a valid ISO date string.',
            code: 'INVALID_DATE',
          });
        }
        existingAssessment.examDate = parsedDate;
      }
    }

    if (lessons !== undefined) {
      if (!Array.isArray(lessons)) {
        return res.status(400).json({
          success: false,
          error: 'Lessons must be an array of syllabus topics.',
          code: 'INVALID_LESSONS',
        });
      }
      existingAssessment.lessons = lessons;
    }

    if (rubric !== undefined) {
      if (!Array.isArray(rubric)) {
        return res.status(400).json({
          success: false,
          error: 'Rubric must be an array of question marking specifications.',
          code: 'INVALID_RUBRIC',
        });
      }
      let rubricSum = 0;
      for (const item of rubric) {
        if (!item.questionNumber || !item.questionNumber.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Each rubric item must have a valid questionNumber (e.g. Q1).',
            code: 'INVALID_RUBRIC_ITEM',
          });
        }
        const qMarks = Number(item.maximumMarks);
        if (isNaN(qMarks) || qMarks <= 0) {
          return res.status(400).json({
            success: false,
            error: `Question ${item.questionNumber} maximum marks must be greater than 0.`,
            code: 'INVALID_QUESTION_MARKS',
          });
        }
        rubricSum += qMarks;
      }
      if (rubricSum > existingAssessment.maximumMarks) {
        return res.status(400).json({
          success: false,
          error: `Total rubric marks (${rubricSum}) cannot exceed assessment maximumMarks (${existingAssessment.maximumMarks}).`,
          code: 'RUBRIC_EXCEEDS_TOTAL_MARKS',
        });
      }
      existingAssessment.rubric = rubric;
    }

    await existingAssessment.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment updated successfully.',
      data: existingAssessment,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/assessments/:id
 * Deletes an owned assessment by ID.
 */
export async function deleteAssessment(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid assessment ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const assessment = await Assessment.findOneAndDelete({ _id: id, teacherId });
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or you do not have permission to delete it.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Assessment deleted successfully.',
      data: {
        deletedAssessmentId: id,
        deletedAssessmentTitle: assessment.title,
      },
    });
  } catch (err) {
    return next(err);
  }
}
