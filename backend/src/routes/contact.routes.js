import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactInquiry } from '../controllers/contactController.js';

const router = Router();

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.npm_lifecycle_event === 'test';

const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTestEnv ? 1000 : 5, // 5 requests per hour in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'You have submitted too many contact requests. Please wait an hour before submitting again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

// POST /api/contact - Public contact submission endpoint
router.post('/', contactRateLimiter, submitContactInquiry);

export default router;
