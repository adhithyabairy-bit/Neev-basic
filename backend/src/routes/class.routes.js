import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
  getClasses,
  createClass,
  getClassById,
  updateClass,
  deleteClass,
} from '../controllers/classController.js';

const router = express.Router();

// Enforce authentication on all class routes
router.use(authenticate);

router.route('/')
  .get(getClasses)
  .post(createClass);

router.route('/:id')
  .get(getClassById)
  .put(updateClass)
  .delete(deleteClass);

export default router;
