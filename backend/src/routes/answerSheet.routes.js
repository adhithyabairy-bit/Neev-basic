import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
  getAnswerSheetById,
  processAnswerSheet,
  updateAnswerCorrection,
  verifyAnswerSheet,
  getAnswerSheetFile,
  deleteAnswerSheet,
} from '../controllers/answerSheetController.js';

const router = express.Router();

// Enforce authentication on all answer sheet routes
router.use(authenticate);

router.route('/:id')
  .get(getAnswerSheetById)
  .delete(deleteAnswerSheet);

router.post('/:id/process', processAnswerSheet);

router.patch('/:id/answers/:answerId', updateAnswerCorrection);

router.patch('/:id/verify', verifyAnswerSheet);

router.get('/:id/file', getAnswerSheetFile);

export default router;

