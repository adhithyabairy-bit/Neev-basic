import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
  getAnswerSheetById,
  processAnswerSheet,
  updateAnswerCorrection,
  verifyAnswerSheet,
  getAnswerSheetFile,
  deleteAnswerSheet,
  deleteAnswerItem,
  addAnswerItem,
} from '../controllers/answerSheetController.js';

const router = express.Router();

// Enforce authentication on all answer sheet routes
router.use(authenticate);

router.route('/:id')
  .get(getAnswerSheetById)
  .delete(deleteAnswerSheet);

router.post('/:id/process', processAnswerSheet);

router.route('/:id/answers')
  .post(addAnswerItem);

router.route('/:id/answers/:answerId')
  .patch(updateAnswerCorrection)
  .delete(deleteAnswerItem);

router.patch('/:id/verify', verifyAnswerSheet);

router.get('/:id/file', getAnswerSheetFile);

export default router;

