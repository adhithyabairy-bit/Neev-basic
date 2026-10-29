import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
  evaluateAnswerSheet,
  getEvaluationsByAnswerSheet,
  getEvaluationsByAssessment,
  approveEvaluation,
  getAssessmentGapOverview,
} from '../controllers/evaluationController.js';

const router = express.Router();

// Assessment-scoped evaluation routes (authenticated)
router.post(
  '/assessments/:id/answer-sheets/:sheetId/evaluate',
  authenticate,
  evaluateAnswerSheet
);
router.get(
  '/assessments/:id/evaluations',
  authenticate,
  getEvaluationsByAssessment
);
router.get(
  '/assessments/:id/gap-overview',
  authenticate,
  getAssessmentGapOverview
);

// Answer-sheet scoped evaluation routes (authenticated)
router.get(
  '/answer-sheets/:id/evaluations',
  authenticate,
  getEvaluationsByAnswerSheet
);

// Individual evaluation actions (authenticated)
router.patch('/evaluations/:id/approve', authenticate, approveEvaluation);

export default router;
