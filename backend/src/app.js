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

// Configure CORS for the frontend origin
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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

// Teacher Resource Routes (Protected)
app.use('/api/classes', classRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/answer-sheets', answerSheetRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api', evaluationRoutes);

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
