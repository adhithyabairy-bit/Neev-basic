import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
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
} from '../controllers/syllabusController.js';

const router = express.Router();

// Enforce authentication on all syllabus endpoints
router.use(authenticate);

// Phase 6 Direct-to-Cloud Upload & Job Queue Endpoints
router.post('/upload-session', createUploadSession);
router.post('/upload-complete', completeUploadSession);
router.get('/documents/:id/status', getIngestionJobStatus);
router.post('/documents/:id/retry', retryIngestionJob);

// Document Management & Legacy Sync Ingest Endpoints
router.post('/ingest', uploadSyllabusMiddleware, ingestSyllabus);
router.get('/documents', getSyllabusDocuments);
router.get('/documents/:id/download-url', getSyllabusDownloadUrl);
router.get('/storage-status', getStorageStatus);
router.delete('/documents/:id', deleteSyllabus);

export default router;
