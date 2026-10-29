# Neev — AI-Powered Learning Gap Analysis Platform

[![Node.js CI](https://img.shields.io/badge/Node.js-v20%2B-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20Vector-green)](https://www.mongodb.com/atlas)
[![Filebase S3](https://img.shields.io/badge/Storage-Filebase%20S3-orange)](https://filebase.com/)
[![Tests](https://img.shields.io/badge/Tests-105%20Passing-success)](backend/tests/)

Neev (*Foundation*) is a teacher-first diagnostic learning platform that analyzes student answer sheets, detects conceptual learning gaps, traces prerequisite knowledge across grade levels, and generates personalized remediation roadmaps and targeted diagnostic retests.

---

## 🌟 Key Capabilities

1. **Direct-to-Cloud Uploads (Up to 200 MB)**:
   - High-throughput syllabus and curriculum textbook uploads directly to private cloud storage (Filebase S3 / Cloudflare R2 / Firebase Storage).
   - Zero memory consumption on serverless and API layers via browser-generated presigned PUT URLs with real-time transfer progress.

2. **Asynchronous RAG Ingestion Pipeline**:
   - Background worker processes queued documents asynchronously.
   - Intelligent text extraction (`pdf-parse`) with scanned image OCR detection (`ocr_required`).
   - Bounded semantic chunking (750 chars / 120 char overlap).
   - Gemini `text-embedding-004` (768d) vectors indexed into MongoDB Atlas Vector Search.
   - SHA-256 content deduplication prevents re-embedding identical files.

3. **Multi-Student Answer Sheet OCR & Segmentation**:
   - Multipart file upload validation (signatures, magic bytes, MIME types).
   - Automatic question-and-answer extraction with smart regex pattern recognition (`Q1`, `1.`, `Ans 1`, `(1)`, `A.`, etc.).
   - Full teacher editability with raw OCR text preservation and audit history.

4. **Syllabus-Grounded Pedagogical AI Evaluation**:
   - Multi-stage evaluation powered by xAI Grok (with deterministic mock fallback in offline tests).
   - Retrieval-Augmented Generation (RAG) grounds feedback strictly in verified curriculum chunks.
   - Rigorous rubric compliance with score bounds validation ($0 \le \text{suggestedMarks} \le \text{maxMarks}$).

5. **Diagnostic Analytics & Learning Roadmaps**:
   - Aggregated Class Gap Overview with per-topic mastery metrics and student performance categorization.
   - Prerequisite knowledge graphs linking detected gaps to foundational concepts.
   - Dynamic remediation roadmaps and instant diagnostic retest generation with print/PDF export.

---

## 🏗️ Repository Architecture

```text
Neev/
├── api/
│   └── index.js                         # Vercel serverless entry point routing /api/* to Express
│
├── frontend/                            # React 19 + Vite client application
│   ├── src/
│   │   ├── components/                  # Navigation, header, modals, form controls, icons
│   │   ├── pages/                       # Login, Register, ForgotPassword, TeacherDashboard
│   │   ├── sections/                    # 9-Step Teacher Assessment Workflow
│   │   │   ├── ClassSyllabus.jsx        # Step 1: Class details & direct cloud textbook upload
│   │   │   ├── UploadAnswerSheets.jsx   # Step 2: Answer sheets upload
│   │   │   ├── ExtractPreview.jsx       # Step 3: OCR text extraction & segmentation
│   │   │   ├── TeacherCorrection.jsx    # Step 4: Teacher verification & correction
│   │   │   ├── AIAnswerAnalysis.jsx     # Step 5: Syllabus-grounded AI grading & rubrics
│   │   │   ├── ClassGapOverview.jsx     # Step 6: Class-wide mastery & topic gap analytics
│   │   │   ├── PrerequisiteGaps.jsx     # Step 7: Cross-grade conceptual dependency graph
│   │   │   ├── LearningRoadmap.jsx      # Step 8: Adaptive remediation milestones
│   │   │   └── GapBasedTest.jsx         # Step 9: Diagnostic retest & printable PDF export
│   │   ├── services/                    # apiClient, authService, syllabusService, etc.
│   │   ├── data/                        # initialData.js, dashboardDemoData.js (Demo Mode)
│   │   └── utils/                       # filename sanitization, PDF generation
│   ├── package.json
│   └── vite.config.js
│
├── backend/                             # Express.js REST API & Ingestion Worker
│   ├── src/
│   │   ├── controllers/                 # syllabus, answerSheet, assessment, class, auth
│   │   ├── models/                      # SyllabusDocument, SyllabusChunk, IngestionJob, Teacher, etc.
│   │   ├── routes/                      # Protected REST API routes
│   │   ├── services/
│   │   │   ├── storage/                 # s3StorageProvider, firebaseStorageProvider, storageService
│   │   │   ├── rag/                     # ingestionService, chunkingService, embeddingService, retrievalService
│   │   │   ├── ai/                      # grokService (AI grading & feedback)
│   │   │   └── extraction/              # extractionService (OCR & segmentation)
│   │   ├── workers/
│   │   │   └── ingestionWorker.js       # Background queue worker for chunking & embedding
│   │   ├── scripts/                     # ZIP ingestion, CORS config, storage test, status check
│   │   ├── middleware/                  # verifyFirebaseToken, authenticate, errorHandler
│   │   ├── app.js                       # Express configuration & CORS validation
│   │   └── server.js                    # Server bootstrap & graceful shutdown
│   ├── tests/                           # 105 automated unit and integration tests
│   └── package.json
│
├── vercel.json                          # Monorepo deployment routing configuration
├── DEPLOYMENT_AND_SETUP.md              # Authoritative deployment & configuration guide
└── REPOSITORY_CLEANUP_REPORT.md         # Repository audit, security review & cleanup report
```

---

## ⚡ Quick Start

### 1. Installation
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` templates and insert your credentials:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
*(See [DEPLOYMENT_AND_SETUP.md](DEPLOYMENT_AND_SETUP.md) for full configuration details and placeholders).*

### 3. Run Automated Tests
```bash
# Backend unit & integration test suite (105 tests across 33 suites)
npm --prefix backend test

# Frontend production bundle build
npm --prefix frontend run build

# Frontend linting
npm --prefix frontend run lint
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend API (http://localhost:5000)
npm --prefix backend run dev

# Terminal 2: Frontend Client (http://localhost:5173)
npm --prefix frontend run dev

# Terminal 3: Background Ingestion Worker (optional, for processing uploaded PDFs)
npm --prefix backend run worker:ingest
```

---

## 🔒 Security Best Practices Implemented

- **CORS Whitelist Protection**: `backend/src/app.js` enforces strict origin matching; unauthorized origins are rejected with HTTP 403 (`CORS_ORIGIN_DENIED`).
- **Fail-Closed Storage Architecture**: In production mode (`NODE_ENV=production`), `storageService` strictly refuses to run if cloud storage is unconfigured or set to local disk (`PRODUCTION_STORAGE_UNCONFIGURED`).
- **Isolated Tenant Storage**: All cloud storage keys are prefixed by `syllabus/${teacherId}/` and verified server-side via `HeadObjectCommand` before creating database records.
- **Server-Side Secret Isolation**: All cloud credentials (`FILEBASE_SECRET_ACCESS_KEY`, `MONGODB_URI`, `GEMINI_API_KEY`, `GROK_API_KEY`) remain exclusively on the server or worker environment.
- **Credential Rotation Notice**: Any real credentials previously checked into historical Git commits must be rotated in their respective cloud consoles.

---

## 📖 Documentation Index

- [Complete Deployment & Setup Guide](DEPLOYMENT_AND_SETUP.md): Authoritative instructions for MongoDB Atlas, Filebase S3, Firebase Auth, Gemini embeddings, and Vercel.
- [Repository Cleanup Report](REPOSITORY_CLEANUP_REPORT.md): Audit findings, file classification, security remediations, and cleanup documentation.

---

## 📄 License
ISC License — Neev Platform.
