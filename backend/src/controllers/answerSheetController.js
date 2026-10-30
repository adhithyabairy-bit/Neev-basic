import mongoose from 'mongoose';
import multer from 'multer';
import Assessment from '../models/Assessment.js';
import AnswerSheet from '../models/AnswerSheet.js';
import Evaluation from '../models/Evaluation.js';
import storageService from '../services/storage/storageService.js';
import { validateUploadedFile } from '../utils/fileValidation.js';
import { processDocumentExtraction } from '../services/extraction/extractionService.js';

// Configure Multer with memory storage for rigorous server-side validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.STORAGE_MAX_FILE_SIZE_MB, 10) || 15) * 1024 * 1024,
    files: 10, // Max 10 files per request
  },
});

export const uploadAnswerSheetsMiddleware = upload.array('files', 10);

/**
 * POST /api/assessments/:id/answer-sheets
 * Uploads one or more answer sheets for an assessment owned by the teacher.
 */
export async function uploadAnswerSheets(req, res, next) {
  try {
    const { id: assessmentId } = req.params;
    const teacherId = req.teacher._id;
    const { studentName, rollNumber } = req.body;

    // 1. Validate assessment ID format
    if (!mongoose.isValidObjectId(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid assessment ID format: '${assessmentId}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    // 2. Verify assessment exists and belongs to the authenticated teacher
    const assessment = await Assessment.findOne({ _id: assessmentId, teacherId });
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or you do not have permission to upload files to it.',
        code: 'ASSESSMENT_NOT_FOUND',
      });
    }

    // 3. Validate student info
    const finalStudentName = (studentName || '').trim();
    if (!finalStudentName) {
      return res.status(400).json({
        success: false,
        error: "Student's full name is required for answer sheet upload.",
        code: 'STUDENT_NAME_REQUIRED',
      });
    }

    // 4. Verify files were provided
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded. Please attach at least one PDF, JPG, or PNG file.',
        code: 'NO_FILES_UPLOADED',
      });
    }

    const createdRecords = [];
    const validationErrors = [];

    for (const file of files) {
      // Validate file extension, MIME type, size, and magic bytes
      const validation = validateUploadedFile(file);
      if (!validation.valid) {
        validationErrors.push({
          fileName: file.originalname,
          error: validation.error,
          code: validation.code,
        });
        continue;
      }

      // Save file to storage provider
      let storageResult;
      try {
        storageResult = await storageService.saveFile({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          prefix: `asm-${assessment._id}`,
        });
      } catch (storageErr) {
        console.error('[AnswerSheet Upload] Storage failed:', storageErr);
        validationErrors.push({
          fileName: file.originalname,
          error: `Storage error: ${storageErr.message}`,
          code: 'STORAGE_FAILURE',
        });
        continue;
      }

      // Create Mongoose document
      const answerSheet = await AnswerSheet.create({
        teacherId,
        assessmentId: assessment._id,
        classId: assessment.classId,
        studentName: finalStudentName,
        rollNumber: (rollNumber || '').trim(),
        originalFileName: file.originalname,
        storageKey: storageResult.storageKey,
        storageProvider: storageResult.storageProvider,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: 'uploaded',
      });

      // Run initial OCR / text extraction
      try {
        const extraction = await processDocumentExtraction(file.buffer, file.mimetype);
        answerSheet.rawOcrText = extraction.rawOcrText;
        answerSheet.answers = extraction.answers;
        answerSheet.pageCount = extraction.pageCount;
        answerSheet.ocrStatus = extraction.ocrStatus;
        answerSheet.status = 'review_required';
        await answerSheet.save();
      } catch (ocrErr) {
        console.warn('[AnswerSheet Upload] Initial OCR extraction failed:', ocrErr);
        answerSheet.status = 'processing_failed';
        answerSheet.ocrStatus = {
          method: 'failed',
          processedAt: new Date(),
          errorDetails: ocrErr.message,
        };
        await answerSheet.save();
      }

      createdRecords.push(answerSheet);
    }

    if (createdRecords.length === 0 && validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: validationErrors[0].error,
        code: validationErrors[0].code,
        details: validationErrors,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded and processed ${createdRecords.length} answer sheet(s).`,
      data: createdRecords,
      warnings: validationErrors.length > 0 ? validationErrors : undefined,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/assessments/:id/answer-sheets
 * Lists all answer sheets for an assessment owned by the teacher.
 */
export async function getAnswerSheetsByAssessment(req, res, next) {
  try {
    const { id: assessmentId } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid assessment ID format: '${assessmentId}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    // Verify assessment ownership
    const assessment = await Assessment.findOne({ _id: assessmentId, teacherId });
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or access denied.',
        code: 'ASSESSMENT_NOT_FOUND',
      });
    }

    const answerSheets = await AnswerSheet.find({
      assessmentId,
      teacherId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: answerSheets,
      count: answerSheets.length,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/answer-sheets/:id
 * Retrieves an authorized answer sheet record with full answer items.
 */
export async function getAnswerSheetById(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid answer sheet ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId })
      .populate('assessmentId', 'title subject maximumMarks')
      .populate('classId', 'name grade subject board')
      .lean();

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: answerSheet,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/answer-sheets/:id/process
 * Triggers extraction or retries failed processing.
 * Idempotent: Can be run multiple times safely.
 */
export async function processAnswerSheet(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid answer sheet ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    // Set processing state
    answerSheet.status = 'processing';
    await answerSheet.save();

    // Read stored buffer
    let buffer;
    try {
      buffer = await storageService.getFileBuffer(answerSheet.storageKey);
    } catch (readErr) {
      answerSheet.status = 'processing_failed';
      answerSheet.ocrStatus = {
        method: 'failed',
        processedAt: new Date(),
        errorDetails: `Could not read stored document: ${readErr.message}`,
      };
      await answerSheet.save();

      return res.status(500).json({
        success: false,
        error: `Failed to load document from storage: ${readErr.message}`,
        code: 'STORAGE_READ_ERROR',
      });
    }

    // Execute extraction
    try {
      const extraction = await processDocumentExtraction(buffer, answerSheet.mimeType);
      answerSheet.rawOcrText = extraction.rawOcrText;
      answerSheet.answers = extraction.answers;
      answerSheet.pageCount = extraction.pageCount;
      answerSheet.ocrStatus = extraction.ocrStatus;
      answerSheet.status = 'review_required';

      // Reset verification if re-processed
      answerSheet.verificationStatus = {
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
      };

      await answerSheet.save();

      return res.status(200).json({
        success: true,
        message: 'Answer sheet processed successfully.',
        data: answerSheet,
      });
    } catch (extractErr) {
      answerSheet.status = 'processing_failed';
      answerSheet.ocrStatus = {
        method: 'failed',
        processedAt: new Date(),
        errorDetails: extractErr.message,
      };
      await answerSheet.save();

      return res.status(500).json({
        success: false,
        error: `Document processing failed: ${extractErr.message}`,
        code: 'EXTRACTION_FAILED',
        data: answerSheet,
      });
    }
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/answer-sheets/:id/answers/:answerId
 * Saves teacher corrections for a specific question/answer entry.
 * Note: Never overwrites rawExtractedText.
 * Invalidation rule: If previously verified, invalidates verification.
 */
export async function updateAnswerCorrection(req, res, next) {
  try {
    const { id, answerId } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(answerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid answer sheet ID or answer item ID format.',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    // Find the subdocument
    const answerItem = answerSheet.answers.id(answerId);
    if (!answerItem) {
      return res.status(404).json({
        success: false,
        error: `Answer entry '${answerId}' not found on this answer sheet.`,
        code: 'ANSWER_ITEM_NOT_FOUND',
      });
    }

    const { correctedText, awardedMarks, status, prompt, questionNumber, maxMarks } = req.body;

    // Update prompt or questionNumber if provided
    if (prompt !== undefined) {
      answerItem.prompt = String(prompt).trim();
    }
    if (questionNumber !== undefined) {
      answerItem.questionNumber = String(questionNumber).trim();
    }
    if (maxMarks !== undefined) {
      const parsedMax = Number(maxMarks);
      if (!isNaN(parsedMax) && parsedMax > 0) {
        answerItem.maxMarks = parsedMax;
      }
    }

    // Update correctedText if provided (never touch rawExtractedText!)
    if (correctedText !== undefined) {
      answerItem.correctedText = String(correctedText);
    }

    // Update awardedMarks if provided
    if (awardedMarks !== undefined) {
      const marksNum = Number(awardedMarks);
      if (isNaN(marksNum) || marksNum < 0) {
        return res.status(400).json({
          success: false,
          error: 'Awarded marks must be a valid non-negative number.',
          code: 'INVALID_MARKS',
        });
      }
      if (marksNum > answerItem.maxMarks) {
        return res.status(400).json({
          success: false,
          error: `Awarded marks cannot exceed maximum marks (${answerItem.maxMarks}).`,
          code: 'MARKS_EXCEED_MAXIMUM',
        });
      }
      answerItem.awardedMarks = marksNum;
    }

    // Update status if provided
    if (status !== undefined) {
      const allowed = ['Needs Review', 'Verified'];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Answer status must be one of: ${allowed.join(', ')}`,
          code: 'INVALID_STATUS',
        });
      }
      answerItem.status = status;
    }

    // Invalidation Rule: If answer sheet was verified, any subsequent edit invalidates verification!
    if (answerSheet.verificationStatus?.isVerified || answerSheet.status === 'verified') {
      answerSheet.status = 'review_required';
      answerSheet.verificationStatus = {
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
      };
    }

    // Invalidate any existing AI evaluation as stale since the answer/marks changed
    if (mongoose.connection.readyState === 1) {
      try {
        await Evaluation.updateMany(
          { answerSheetId: answerSheet._id, answerItemId: answerId },
          { status: 'stale' }
        );
      } catch {
        // Evaluation might not exist yet
      }
    }

    await answerSheet.save();

    return res.status(200).json({
      success: true,
      message: 'Correction saved successfully.',
      data: answerSheet,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/answer-sheets/:id/verify
 * Explicitly verifies the reviewed answer sheet.
 * Requires status to be 'review_required' (cannot verify before processing).
 */
export async function verifyAnswerSheet(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid answer sheet ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    // Cannot verify an unprocessed or failed document
    if (answerSheet.status !== 'review_required' && answerSheet.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: `Cannot verify answer sheet with status '${answerSheet.status}'. The document must be processed and in 'review_required' state first.`,
        code: 'INVALID_STATE_FOR_VERIFICATION',
      });
    }

    // Validate that all questions have valid awarded marks
    for (const item of answerSheet.answers) {
      const marks = Number(item.awardedMarks);
      if (isNaN(marks) || marks < 0 || marks > item.maxMarks) {
        return res.status(400).json({
          success: false,
          error: `Question ${item.questionNumber} has invalid awarded marks (${item.awardedMarks}). Must be between 0 and ${item.maxMarks}.`,
          code: 'UNRESOLVED_MARKS_VALIDATION',
        });
      }
      item.status = 'Verified';
    }

    // Mark as verified
    answerSheet.status = 'verified';
    answerSheet.verificationStatus = {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: teacherId,
    };

    await answerSheet.save();

    return res.status(200).json({
      success: true,
      message: 'Answer sheet has been verified and confirmed as ground truth.',
      data: answerSheet,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/answer-sheets/:id/file
 * Authenticated stream of the private original file.
 */
export async function getAnswerSheetFile(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid answer sheet ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    res.setHeader('Content-Type', answerSheet.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(answerSheet.originalFileName)}"`
    );

    const stream = storageService.getFileStream(answerSheet.storageKey);
    stream.on('error', (err) => {
      console.error('[AnswerSheet File Stream] Error:', err);
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          error: 'Stored file could not be read from storage.',
          code: 'FILE_STREAM_ERROR',
        });
      }
    });

    return stream.pipe(res);
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/answer-sheets/:id
 * Safely removes the database record and deletes the stored file.
 */
export async function deleteAnswerSheet(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid answer sheet ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    // Delete stored file
    await storageService.deleteFile(answerSheet.storageKey);

    // Delete associated evaluations
    if (mongoose.connection.readyState === 1) {
      await Evaluation.deleteMany({ answerSheetId: id });
    }

    // Delete MongoDB record
    await AnswerSheet.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Answer sheet and stored file deleted successfully.',
      data: {
        deletedId: id,
        fileName: answerSheet.originalFileName,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/answer-sheets/:id/answers/:answerId
 * Removes an erroneous or unwanted question/answer item from an answer sheet.
 */
export async function deleteAnswerItem(req, res, next) {
  try {
    const { id, answerId } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(answerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid answer sheet ID or answer item ID format.',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    answerSheet.answers.pull({ _id: answerId });
    await answerSheet.save();

    return res.status(200).json({
      success: true,
      message: 'Answer item deleted successfully.',
      data: answerSheet,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/answer-sheets/:id/answers
 * Manually adds a question/answer item to an answer sheet.
 */
export async function addAnswerItem(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid answer sheet ID format.',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const answerSheet = await AnswerSheet.findOne({ _id: id, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    const {
      questionNumber = `Q${answerSheet.answers.length + 1}`,
      prompt = `Question ${answerSheet.answers.length + 1}`,
      rawExtractedText = '',
      correctedText = '',
      maxMarks = 5,
      pageNumber = 1,
    } = req.body;

    answerSheet.answers.push({
      questionNumber: String(questionNumber).trim(),
      prompt: String(prompt).trim(),
      rawExtractedText: String(rawExtractedText || correctedText),
      correctedText: String(correctedText),
      pageNumber: Number(pageNumber) || 1,
      maxMarks: Number(maxMarks) || 5,
      status: 'Needs Review',
    });

    await answerSheet.save();

    return res.status(201).json({
      success: true,
      message: 'Question added successfully.',
      data: answerSheet,
    });
  } catch (err) {
    return next(err);
  }
}


