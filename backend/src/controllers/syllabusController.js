import mongoose from 'mongoose';
import multer from 'multer';
import SyllabusDocument from '../models/SyllabusDocument.js';
import { ingestSyllabusFile, deleteSyllabusDocument } from '../services/rag/ingestionService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.SYLLABUS_MAX_FILE_SIZE_MB, 10) || 50) * 1024 * 1024,
  },
});

export const uploadSyllabusMiddleware = upload.single('file');

/**
 * POST /api/syllabus/ingest
 * Ingests a syllabus file into persistent MongoDB chunks with embeddings.
 */
export async function ingestSyllabus(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const file = req.file;
    const { grade, subject, lessonName, forceReingest } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Please attach a PDF or TXT syllabus document.',
        code: 'FILE_MISSING',
      });
    }

    const result = await ingestSyllabusFile({
      teacherId,
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      grade: grade ? String(grade).trim() : '',
      subject: subject ? String(subject).trim() : '',
      lessonName: lessonName ? String(lessonName).trim() : '',
      forceReingest: forceReingest === 'true' || forceReingest === true,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.document,
      alreadyExisted: result.alreadyExisted,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/syllabus/documents
 * Lists all indexed syllabus documents owned by the teacher.
 */
export async function getSyllabusDocuments(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const { subject, grade } = req.query;

    const query = { teacherId };
    if (subject) query.subject = subject;
    if (grade) query.grade = grade;

    const documents = await SyllabusDocument.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/syllabus/documents/:id
 * Deletes a syllabus document and all its indexed chunks.
 */
export async function deleteSyllabus(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid document ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const success = await deleteSyllabusDocument(id, teacherId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Syllabus document not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Syllabus document and indexed chunks deleted successfully.',
      data: { deletedId: id },
    });
  } catch (err) {
    return next(err);
  }
}

export default {
  ingestSyllabus,
  getSyllabusDocuments,
  deleteSyllabus,
  uploadSyllabusMiddleware,
};

