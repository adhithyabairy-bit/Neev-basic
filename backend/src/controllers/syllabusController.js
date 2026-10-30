import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import multer from 'multer';
import SyllabusDocument from '../models/SyllabusDocument.js';
import IngestionJob from '../models/IngestionJob.js';
import { ingestSyllabusFile, deleteSyllabusDocument } from '../services/rag/ingestionService.js';
import storageService from '../services/storage/storageService.js';
import embeddingService from '../services/rag/embeddingService.js';
import { sanitizeFileName } from '../utils/fileValidation.js';

const MAX_SYLLABUS_FILE_SIZE_MB = parseInt(process.env.SYLLABUS_MAX_FILE_SIZE_MB, 10) || 200;
const MAX_SYLLABUS_FILE_SIZE_BYTES = MAX_SYLLABUS_FILE_SIZE_MB * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.SYLLABUS_MAX_FILE_SIZE_MB, 10) || 50) * 1024 * 1024,
  },
});

export const uploadSyllabusMiddleware = upload.fields([
  { name: 'syllabusFile', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

/**
 * POST /api/syllabus/ingest
 * Ingests a syllabus file into persistent MongoDB chunks with embeddings.
 */
export async function ingestSyllabus(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const file = req.file || req.files?.syllabusFile?.[0] || req.files?.file?.[0];
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
    if (subject && subject.trim() && subject.trim().toLowerCase() !== 'all') {
      query.subject = { $regex: new RegExp(`^${subject.trim()}$`, 'i') };
    }
    if (grade && grade.trim() && grade.trim().toLowerCase() !== 'all') {
      query.grade = { $regex: new RegExp(`^${grade.trim()}$`, 'i') };
    }

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
 * GET /api/syllabus/documents/:id/download-url
 * Generates an authenticated short-lived presigned download URL for a syllabus document.
 */
export async function getSyllabusDownloadUrl(req, res, next) {
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

    const document = await SyllabusDocument.findOne({ _id: id, teacherId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Syllabus document not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    const downloadUrl = await storageService.getPresignedDownloadUrl(document.storageKey, 900);

    return res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        fileName: document.fileName,
        downloadUrl,
        expiresInSeconds: 900,
        storageProvider: document.storageProvider || storageService.getProviderName(),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/syllabus/storage-status
 * Diagnostic endpoint reporting cloud object storage and embedding configuration.
 */
export async function getStorageStatus(req, res, next) {
  try {
    const storageVerification = await storageService.verifyConnection();

    return res.status(200).json({
      success: true,
      storage: {
        provider: storageService.getProviderName(),
        isConfigured: storageService.isConfigured(),
        verification: storageVerification,
      },
      embedding: {
        provider: embeddingService.getProvider(),
        model: embeddingService.getModelName(),
        dimensions: embeddingService.getDimension(),
        isMock: embeddingService.isMockProvider(),
      },
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

/**
 * POST /api/syllabus/upload-session
 * Authorizes a direct client-to-cloud PDF upload session with a short-lived presigned PUT URL.
 * File binaries bypass the Express server completely (supports files up to 200 MB).
 */
export async function createUploadSession(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const { fileName, fileSize, mimeType, grade, subject, lessonName, classId } = req.body;

    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'fileName is required and must be a valid string.',
        code: 'FILENAME_REQUIRED',
      });
    }

    const sanitizedName = sanitizeFileName(fileName.trim());
    const lowerName = sanitizedName.toLowerCase();
    const declaredMime = (mimeType || '').toLowerCase().trim();

    // Validate permitted file types (PDF or TXT)
    const isPdf = lowerName.endsWith('.pdf') || declaredMime === 'application/pdf';
    const isTxt = lowerName.endsWith('.txt') || declaredMime.startsWith('text/');
    if (!isPdf && !isTxt) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file format. Only PDF and plain text documents are supported for syllabus ingestion.',
        code: 'UNSUPPORTED_FILE_TYPE',
      });
    }

    const numericSize = Number(fileSize);
    if (!numericSize || isNaN(numericSize) || numericSize <= 0) {
      return res.status(400).json({
        success: false,
        error: 'fileSize is required and must be a positive number of bytes.',
        code: 'INVALID_FILE_SIZE',
      });
    }

    if (numericSize > MAX_SYLLABUS_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `File size (${(numericSize / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum permitted limit of ${MAX_SYLLABUS_FILE_SIZE_MB} MB per file.`,
        code: 'FILE_TOO_LARGE',
        maxAllowedBytes: MAX_SYLLABUS_FILE_SIZE_BYTES,
      });
    }

    // Tenant isolation: Prefix storage key with syllabus/${teacherId}
    const prefix = `syllabus/${teacherId}`;
    const storageKey = storageService.generateKey(sanitizedName, prefix);
    const resolvedMime = isPdf ? 'application/pdf' : 'text/plain';

    // Generate presigned upload URL (15 minutes expiration)
    const uploadSession = await storageService.getPresignedUploadUrl({
      storageKey,
      mimeType: resolvedMime,
      expiresIn: 900,
    });

    const uploadSessionId = `sess_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    return res.status(200).json({
      success: true,
      data: {
        uploadSessionId,
        uploadUrl: uploadSession.uploadUrl,
        storageKey: uploadSession.storageKey,
        storageProvider: uploadSession.storageProvider || storageService.getProviderName(),
        method: uploadSession.method || 'PUT',
        headers: uploadSession.headers || { 'Content-Type': resolvedMime },
        maxFileSizeBytes: MAX_SYLLABUS_FILE_SIZE_BYTES,
        expiresInSeconds: 900,
        metadata: {
          fileName: sanitizedName,
          grade: grade || '',
          subject: subject || '',
          lessonName: lessonName || '',
          classId: classId || null,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/syllabus/upload-complete
 * Verifies that the client finished uploading the PDF directly to cloud storage,
 * validates file metadata in cloud storage, creates document record, and queues background ingestion.
 */
export async function completeUploadSession(req, res, next) {
  try {
    const teacherId = req.teacher._id;
    const { storageKey, fileName, grade, subject, lessonName, classId, forceReingest } = req.body;

    if (!storageKey || typeof storageKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'storageKey is required to complete an upload.',
        code: 'STORAGE_KEY_REQUIRED',
      });
    }

    // Strict tenant isolation: verify that storageKey starts with syllabus/${teacherId}/
    const expectedPrefix = `syllabus/${teacherId}/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Storage key does not belong to authorized teacher.',
        code: 'STORAGE_KEY_UNAUTHORIZED',
      });
    }

    // Server-side verification of uploaded cloud object
    let verified;
    try {
      verified = await storageService.verifyUploadedObject(storageKey);
    } catch (verifyErr) {
      return res.status(400).json({
        success: false,
        error: `Cloud object verification failed: ${verifyErr.message}`,
        code: 'VERIFICATION_FAILED',
      });
    }

    if (!verified || !verified.exists) {
      return res.status(400).json({
        success: false,
        error: 'Uploaded object was not found in cloud storage. Please ensure direct upload completed before notifying backend.',
        code: 'OBJECT_NOT_FOUND',
      });
    }

    if (verified.size > MAX_SYLLABUS_FILE_SIZE_BYTES) {
      await storageService.deleteFile(storageKey);
      return res.status(400).json({
        success: false,
        error: `Uploaded file size (${(verified.size / (1024 * 1024)).toFixed(1)} MB) exceeds limit of ${MAX_SYLLABUS_FILE_SIZE_MB} MB.`,
        code: 'FILE_TOO_LARGE',
      });
    }

    const cleanFileName = sanitizeFileName(fileName || storageKey.split('-').slice(2).join('-') || 'document.pdf');

    // 1. Check if document already exists for this storageKey (duplicate completion prevention)
    let document = await SyllabusDocument.findOne({ teacherId, storageKey });

    if (!document) {
      document = await SyllabusDocument.create({
        teacherId,
        classId: classId || null,
        fileName: cleanFileName,
        fileSize: verified.size,
        mimeType: verified.contentType || 'application/pdf',
        storageProvider: verified.storageProvider || storageService.getProviderName(),
        storageKey,
        storageBucket: verified.bucket || '',
        grade: grade ? String(grade).trim() : '',
        subject: subject ? String(subject).trim() : '',
        lessonName: lessonName ? String(lessonName).trim() : '',
        status: 'queued',
      });
    } else {
      document.fileSize = verified.size;
      document.grade = grade ? String(grade).trim() : document.grade;
      document.subject = subject ? String(subject).trim() : document.subject;
      document.lessonName = lessonName ? String(lessonName).trim() : document.lessonName;
      if (document.status === 'failed' || forceReingest) {
        document.status = 'queued';
        document.errorDetails = null;
      }
    }

    // 2. Check for active IngestionJob to prevent duplicates
    let activeJob = await IngestionJob.findOne({
      documentId: document._id,
      status: { $in: ['queued', 'claimed', 'processing'] },
    });

    if (!activeJob) {
      const jobId = `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      activeJob = await IngestionJob.create({
        jobId,
        documentId: document._id,
        teacherId,
        storageKey,
        storageProvider: document.storageProvider,
        status: 'queued',
        progress: {
          step: 'queued',
          percentage: 0,
        },
      });
      document.activeJobId = activeJob._id;
      document.status = 'queued';
      await document.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Upload verified successfully. Ingestion job queued.',
      data: {
        documentId: document._id,
        jobId: activeJob.jobId,
        status: activeJob.status,
        fileName: document.fileName,
        fileSize: document.fileSize,
        storageProvider: document.storageProvider,
        storageKey: document.storageKey,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/syllabus/documents/:id/status
 * Retrieves current ingestion job status, progress percentage, and chunk metrics.
 */
export async function getIngestionJobStatus(req, res, next) {
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

    const document = await SyllabusDocument.findOne({ _id: id, teacherId }).lean();
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Syllabus document not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    const latestJob = await IngestionJob.findOne({ documentId: id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        chunkCount: document.chunkCount || 0,
        pageCount: document.pageCount || 0,
        errorDetails: document.errorDetails,
        job: latestJob
          ? {
              jobId: latestJob.jobId,
              status: latestJob.status,
              progress: latestJob.progress,
              attempts: latestJob.attempts,
              maxAttempts: latestJob.maxAttempts,
              claimedAt: latestJob.claimedAt,
              completedAt: latestJob.completedAt,
              errorDetails: latestJob.errorDetails,
            }
          : null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/syllabus/documents/:id/retry
 * Requeues a failed ingestion job for retry.
 */
export async function retryIngestionJob(req, res, next) {
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

    const document = await SyllabusDocument.findOne({ _id: id, teacherId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Syllabus document not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    if (document.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Document is already fully ingested and indexed.',
        code: 'ALREADY_COMPLETED',
      });
    }

    // Verify object still exists in cloud storage
    const verified = await storageService.verifyUploadedObject(document.storageKey);
    if (!verified || !verified.exists) {
      return res.status(400).json({
        success: false,
        error: 'Original document file is no longer present in cloud storage. Please re-upload.',
        code: 'FILE_MISSING_IN_STORAGE',
      });
    }

    // Reset document
    document.status = 'queued';
    document.errorDetails = null;

    // Reset or create IngestionJob
    const jobId = `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const job = await IngestionJob.create({
      jobId,
      documentId: document._id,
      teacherId,
      storageKey: document.storageKey,
      storageProvider: document.storageProvider,
      status: 'queued',
      attempts: 0,
      progress: {
        step: 'queued',
        percentage: 0,
      },
    });

    document.activeJobId = job._id;
    await document.save();

    return res.status(200).json({
      success: true,
      message: 'Ingestion job successfully requeued.',
      data: {
        documentId: document._id,
        jobId: job.jobId,
        status: 'queued',
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function streamCurriculumPdf(req, res, next) {
  try {
    const { fileName } = req.params;
    const safeName = path.basename(fileName || '');
    if (!safeName) {
      return res.status(400).json({ success: false, error: 'File name is required.' });
    }

    const possibleDirs = [
      path.resolve(process.cwd(), '../frontend/public/curriculum'),
      path.resolve(process.cwd(), 'frontend/public/curriculum'),
      path.resolve(process.cwd(), 'public/curriculum'),
      path.resolve(process.cwd(), '../data/syllabus_extracted/Study Materials'),
      path.resolve(process.cwd(), 'data/syllabus_extracted/Study Materials'),
    ];

    let foundPath = null;
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        const direct = path.join(dir, safeName);
        if (fs.existsSync(direct)) {
          foundPath = direct;
          break;
        }
        // Check subdirectories
        const subdirs = ['Class 6/Mathematics', 'Class 7/Maths', 'Class 8/Mathematics', 'Class 9/Mathematics', 'Class 10/Mathematics'];
        for (const sub of subdirs) {
          const subP = path.join(dir, sub, safeName);
          if (fs.existsSync(subP)) {
            foundPath = subP;
            break;
          }
        }
        if (foundPath) break;
      }
    }

    if (!foundPath) {
      return res.status(404).json({ success: false, error: `Curriculum PDF '${safeName}' not found.` });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    fs.createReadStream(foundPath).pipe(res);
  } catch (err) {
    return next(err);
  }
}

export default {
  ingestSyllabus,
  getSyllabusDocuments,
  getSyllabusDownloadUrl,
  getStorageStatus,
  deleteSyllabus,
  createUploadSession,
  completeUploadSession,
  getIngestionJobStatus,
  retryIngestionJob,
  uploadSyllabusMiddleware,
  streamCurriculumPdf,
};
