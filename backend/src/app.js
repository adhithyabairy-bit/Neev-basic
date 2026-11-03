import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Routes
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/class.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import answerSheetRoutes from './routes/answerSheet.routes.js';
import syllabusRoutes from './routes/syllabus.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';
import contactRoutes from './routes/contact.routes.js';

// Middlewares
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Secure HTTP response headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Disabled for API backend to prevent conflicting with frontend headers
  })
);

// Request logging for cloud observability
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Configure CORS strictly for verified production and local development origins
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => {
    const trimmed = url.trim();
    if (trimmed) allowedOrigins.add(trimmed);
  });
}

// Strictly whitelist official Neev Vercel deployments, preventing arbitrary third-party .vercel.app origins
const VERCEL_NEEV_REGEX = /^https:\/\/(neev|neev-[a-z0-9-]+)\.vercel\.app$/i;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check allowed origins against whitelist and official pattern
      const isAllowed = allowedOrigins.has(origin) || VERCEL_NEEV_REGEX.test(origin);

      if (isAllowed) {
        return callback(null, true);
      }

      const corsError = new Error(`Origin '${origin}' not permitted by CORS policy.`);
      corsError.status = 403;
      corsError.code = 'CORS_ORIGIN_DENIED';
      return callback(corsError, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Express Rate Limiting to prevent brute force and resource exhaustion
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.npm_lifecycle_event === 'test';

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 10000 : 300, // 300 requests per 15 minutes in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

app.use('/api', generalApiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// System Health Diagnostics
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);

// Auth session verification
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// Teacher Resource Routes (Protected)
app.use('/api/classes', classRoutes);
app.use('/classes', classRoutes);

app.use('/api/assessments', assessmentRoutes);
app.use('/assessments', assessmentRoutes);

app.use('/api/answer-sheets', answerSheetRoutes);
app.use('/answer-sheets', answerSheetRoutes);

app.use('/api/syllabus', syllabusRoutes);
app.use('/syllabus', syllabusRoutes);

// Public Contact Form
app.use('/api/contact', contactRoutes);
app.use('/contact', contactRoutes);

app.use('/api', evaluationRoutes);
app.use('/', evaluationRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
