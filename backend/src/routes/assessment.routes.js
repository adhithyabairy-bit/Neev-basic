import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
  getAssessments,
  createAssessment,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
} from '../controllers/assessmentController.js';

const router = express.Router();

// Enforce authentication on all assessment routes
router.use(authenticate);

router.route('/')
  .get(getAssessments)
  .post(createAssessment);

router.route('/:id')
  .get(getAssessmentById)
  .put(updateAssessment)
  .delete(deleteAssessment);

export default router;
