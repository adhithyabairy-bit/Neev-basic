import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import {
  createSession,
  getCurrentUser,
  getHealth,
} from '../controllers/authController.js';

const router = Router();

// Public health check route
router.get('/health', getHealth);

// POST /api/auth/session - Verify Firebase ID token and establish authenticated session
router.post('/session', verifyFirebaseToken, createSession);

// GET /api/auth/me - Retrieve current verified teacher identity
router.get('/me', verifyFirebaseToken, getCurrentUser);

export default router;
