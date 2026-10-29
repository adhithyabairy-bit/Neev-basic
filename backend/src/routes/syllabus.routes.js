import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
  ingestSyllabus,
  getSyllabusDocuments,
  getSyllabusDownloadUrl,
  getStorageStatus,
  deleteSyllabus,
  uploadSyllabusMiddleware,
} from '../controllers/syllabusController.js';

const router = express.Router();

// Enforce authentication on all syllabus endpoints
router.use(authenticate);

router.post('/ingest', uploadSyllabusMiddleware, ingestSyllabus);
router.get('/documents', getSyllabusDocuments);
router.get('/documents/:id/download-url', getSyllabusDownloadUrl);
router.get('/storage-status', getStorageStatus);
router.delete('/documents/:id', deleteSyllabus);

export default router;
