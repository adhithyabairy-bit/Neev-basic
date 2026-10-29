import express from 'express';
import cors from 'cors';

// Routes
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/class.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import answerSheetRoutes from './routes/answerSheet.routes.js';
import syllabusRoutes from './routes/syllabus.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';

// Middlewares
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Configure CORS for local development and Vercel cloud deployments
const configuredFrontend = process.env.FRONTEND_URL;
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check allowed origins
      const isAllowed =
        origin === configuredFrontend ||
        origin === 'http://localhost:5173' ||
        origin === 'http://127.0.0.1:5173' ||
        (origin.endsWith('.vercel.app') && !origin.includes('@'));

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

// Body parsing
app.use(express.json());

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
