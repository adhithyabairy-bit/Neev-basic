# Neev — AI-Powered Learning Gap Analysis Platform

[![Production Deployment](https://img.shields.io/badge/Deployment-Live%20on%20Vercel-success)](https://neev-basic-seven.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF)](https://vitejs.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20Vector%20Search-green)](https://www.mongodb.com/atlas)
[![Cloud Storage](https://img.shields.io/badge/Storage-Filebase%20S3%20%7C%20Firebase-orange)](https://filebase.com/)
[![AI Engine](https://img.shields.io/badge/AI-Groq%20%7C%20Grok%20%7C%20Gemini-purple)](https://groq.com/)

**Neev** (*Foundation*) is an enterprise-grade, teacher-first diagnostic learning platform that bridges physical student assessments with official NCERT curricula (Grades 6–10 across **Mathematics**, **Science**, **Social Studies**, and **English Language**).

Neev ingests handwritten or digital student answer sheets, question papers, and marking schemes; automatically segments questions and extracts responses; provides interactive dual-pane correction; runs curriculum-grounded AI evaluation with misconception diagnosis; traces prerequisite foundational gaps back to previous classes; organizes class teaching priorities into a strict 3-tier sequence; isolates classrooms by section; maps forward impacts on Class 9 and Class 10 Board exam topics; generates personalized remediation study roadmaps; creates gap-targeted 2-mark diagnostic retests; and exports 5 margin-wrapped, genuine PDF 1.4 documents.

---

## 🌐 Live Application

- **Production URL**: [https://neev-basic-seven.vercel.app](https://neev-basic-seven.vercel.app)
- **Teacher Workspace**: Secure authentication gateway supporting email/password login and persistent teacher sessions (`/app`).
- **Public Portal**: Responsive marketing and curriculum exploration portal with smooth anchor scrolling and mobile drawer navigation.
- **Academic Support**: Direct contact via [adhithyabairy@gmail.com](mailto:adhithyabairy@gmail.com).

---

## 🌟 Core Capabilities & Features

### 1. 9-Step End-to-End Teacher Workflow
Neev guides teachers through an intuitive, streamlined 9-step assessment pipeline:

```text
[1. Class & Syllabus] ──► [2. Upload Papers] ──► [3. Extract & Preview]
                                                          │
[6. Prerequisite Gaps] ◄── [5. AI Evaluation] ◄── [4. Teacher Correction]
         │
         ▼
[7. Learning Roadmap] ──► [8. Gap-Based Retest] ──► [9. Export Reports]
```

1. **Class & Syllabus Configuration (`ClassSyllabus.jsx`)**:
   - Select Class (Class 6 through Class 10), Section (Section A, B, C, D), and Subject (Mathematics, Science / Physics, Social Studies, English Language).
   - Ingest official NCERT textbook chapters or upload custom syllabus documents.
   - Maps targeted syllabus chapters, core concepts, and exam metadata.
   - Dynamically resolves or auto-creates matching classroom sections in the teacher's account.

2. **Upload Answer Sheets & Reference Material (`UploadAnswerSheets.jsx`)**:
   - Multi-document upload: **Question Paper**, **Student Answer Sheet**, and **Marking Scheme / Teacher Rubric**.
   - Supports multi-page PDFs, JPEGs, and PNGs with real-time file validation, magic-byte checks, and interactive thumbnail previews.
   - Preserves section synchronization between setup and upload steps.

3. **Automated Scanner & Segmentation (`ExtractPreview.jsx`)**:
   - Automated text extraction using high-speed Groq AI vision and OCR segmentation.
   - Dual-pane interface: inspect original scanned pages side-by-side with segmented question cards.
   - Confidence scoring per question, page-by-page navigation, inline editing, and mandatory "Mark as Verified" teacher gating.

4. **Teacher Correction & Verification (`TeacherCorrection.jsx`)**:
   - Dual-view interface comparing original student handwriting against extracted text.
   - Adjust marks, edit student answers, add feedback comments, and verify scores with raw OCR audit preservation.

5. **Curriculum-Grounded AI Answer Analysis (`AIAnswerAnalysis.jsx`)**:
   - Evaluates student responses against official marking scheme rubrics and NCERT textbook knowledge chunks.
   - Diagnoses exact conceptual misconceptions and extracts verbatim student work evidence.
   - Bounds scores strictly to rubric constraints ($0 \le \text{suggestedMarks} \le \text{maxMarks}$).

6. **Cross-Grade Prerequisite Gap Tracer (`PrerequisiteGaps.jsx`)**:
   - Traces diagnosed misconceptions back to their foundational roots in earlier grades (Class 6, 7, and 8 NCERT curricula).
   - Identifies downstream curriculum risks for future grades (Class 9 and Class 10 CBSE Board Exam topics).
   - Provides direct one-click links to NCERT textbook lesson PDFs for targeted review.

7. **Personalized Remediation Learning Roadmap (`LearningRoadmap.jsx`)**:
   - Sequenced remediation milestones ordered **prerequisite-first**.
   - Computes study time estimates, recommended pedagogical activities, guided worked examples, and interactive milestone progress tracking checkboxes.

8. **Diagnostic Gap-Based Retest Generator (`GapBasedTest.jsx`)**:
   - Generates custom 2-mark diagnostic questions targeting each diagnosed prerequisite gap.
   - Includes full teacher scoring criteria, anticipated misconception warnings, and NCERT curriculum anchors.

9. **Multi-Document Export Center (`ExportFollowUp.jsx`)**:
   - Generates and downloads 5 distinct, professionally styled PDF documents formatted strictly for standard A4 printing.

---

### 2. Classroom Section Isolation & Management

Neev ensures strict cohort isolation across classrooms and grade sections:

- **Independent Class Cards**: Different sections of the same grade (e.g. *Class 9 Section A* vs *Class 9 Section D*) are treated as completely distinct entities on the Teacher Dashboard with individual assessment metrics and retest trackers.
- **Strict Tuple Resolution**: Class auto-creation and assessment linking bind strictly to `(grade, section, subject)`. Section D assessments are never conflated or lumped with Section A.
- **Section-Filtered Dashboard Views**: Teachers can filter classes by Grade, Section, or Subject with one-click cohort switching.

---

### 3. Prerequisite-First Teaching Priorities Engine

Neev features a dedicated diagnostic prioritization engine (`backend/src/services/curriculum/prerequisiteEngine.js` and `frontend/src/utils/teachingPriorities.js`) that automatically groups classroom learning gaps into an actionable pedagogical order:

1. **Priority Group 1 — Previous-Class Foundational Gaps (Address First)**:
   - Concepts from earlier grades (e.g., Class 7 Algebra, Class 8 Cell Division) that students failed to master.
   - Must be addressed prior to current-grade instruction to prevent compounding misconceptions.
2. **Priority Group 2 — Current-Class Core Concept Gaps (Address Next)**:
   - Evaluated concepts from the current grade syllabus where students demonstrated gaps.
3. **Priority Group 3 — Undetermined Learning Gaps (Further Diagnosis Required)**:
   - Mistakes requiring further targeted diagnostic probing before assigning a root cause.

#### Key Priorities Features:
- **Accurate Global Student Cohort Sizing**: Intelligently identifies genuine student answer sheets and filters out question papers, teacher rubrics, and marking schemes. Multiple uploaded files for the same student are deduplicated to their true student identity.
- **Real Student Count Metric**: Displays strictly as **`X out of Y Students Affected`** (e.g. *1 out of 1 Student Affected* for single assessments, or *10 out of 28 Students Affected* for class-wide cohorts) with a unified high-contrast progress bar.
- **Multi-Subject Diagnostic Coverage**: Provides full diagnostic prioritization and NCERT chapter anchoring across **Mathematics**, **Science**, **Social Studies**, and **English Language**.
- **Sub-200ms Parallel Loading**: Classroom gap overviews load concurrently without UI blocking or spinner delays.

---

### 4. Public Marketing Portal & Responsive Mobile Navigation

- **Single-Page Smooth Navigation**: Fast in-page smooth-scroll anchoring across all core public sections: *Home*, *Features*, *How It Works*, *Curriculum*, *FAQ*, *About Us*, and *Contact*.
- **Balanced 4-Subject Curriculum Grid**: Features clean subject overview cards for Mathematics, Science, Social Studies, and English Language.
- **Mobile Hamburger Drawer**: Responsive 3-line navigation drawer for mobile screens with backdrop touch-dismiss.
- **Enforced Authentication Gating**: Unauthenticated attempts to access `/app` strictly redirect to `/login`.
- **Static Public Header**: Clean, non-distracting header with persistent *Login* and *Create Account* actions.

---

### 5. Multi-Subject Curriculum Coverage (Class 6 – 10)

Neev includes pre-ingested NCERT knowledge bases, semantic vector chunks, and diagnostic problem banks across core academic disciplines:

| Subject | Core Curricular Concepts | Foundational Prerequisite Lessons | Downstream Impacted Chapters |
| :--- | :--- | :--- | :--- |
| **Mathematics** | Linear Equations, Polynomials, Factoring, Exponents & Powers, Coordinate Geometry | Class 7 Ch 2: Simple Expressions & Equations; Class 7 Ch 1: Integers & Number Line | Class 9 Ch 2: Polynomials; Class 10 Ch 3: Pair of Linear Equations in Two Variables |
| **Science** | Cell Biology, Organelles, Osmosis & Diffusion, Prokaryotes vs Eukaryotes, Scientific Inquiry | Class 8 Ch 1: Crop Production & Microorganisms; Class 8 Ch 8: Cell Structure & Function | Class 9 Ch 5: Fundamental Unit of Life; Class 10 Ch 6: Life Processes |
| **Social Studies** | The Indian Constitution, Preamble, Secularism, Revolt of 1857, Resources & Development | Class 8 Civics Ch 1: Indian Constitution; Class 8 History Ch 5: When People Rebel | Class 9 Civics Ch 2: Constitutional Design; Class 10 Civics Ch 1: Power Sharing |
| **English Language** | Verb Tenses, Active & Passive Voice, Subject-Verb Concord, Conditional Clauses, Reading Comprehension | Class 7 Grammar: Finite & Non-Finite Verbs; Class 8 Grammar: Tense Agreement | Class 9 Writing & Grammar: Error Correction; Class 10 Board English Language & Literature |

---

### 6. Client-Side Genuine PDF 1.4 Binary Generator

Unlike libraries that bundle heavy headless browsers or produce garbled text, Neev incorporates a custom, zero-dependency client-side PDF 1.4 binary engine (`frontend/src/utils/pdfGenerator.js`):

- **5 Distinct PDF Deliverables**:
  1. `[student]_gap.pdf`: Student Learning Gap Analysis Report with diagnostic evidence, misconceptions, and teacher sign-offs.
  2. `[student]_roadmap.pdf`: Personalized Remediation Learning Roadmap with sequenced milestones and study plans.
  3. `[student]_syllabus_continuity.pdf`: Syllabus Continuity & Delayed Chapters Report mapping past and future grade dependencies.
  4. `[student]_questions.pdf`: Diagnostic Practice Questions Paper (Student Version) with clear workspace lines and no solutions.
  5. `teacher_marking_key.pdf`: Teacher Answer Key & Marking Guide (Confidential) with step-by-step solutions, mark breakdowns, and misconception alerts.
- **Strict ASCII Sanitization**: Converts Unicode mathematical symbols, minus signs, arrows, superscripts ($x^2$, $5^m$), and currency into standard Type 1 Helvetica characters, preventing mojibake and font spacing issues.
- **Defensive Line Wrapping & Border Bounds**: Enforces safe character limits (&le; 64 characters per line) and computes printable bounds dynamically ($x \le 540\text{ pt}$ on A4), eliminating horizontal right-edge text clipping and box border overflow.

---

### 7. Resilient Single-Page Application (SPA) Routing & Vercel Deployment

- **Universal Pre-Rendered Fallbacks (`generate-spa-fallbacks.js`)**: Generates compiled production entry points (`dist/app/index.html`, `dist/login/index.html`, `dist/register/index.html`, `dist/200.html`, `dist/404.html`) matching hashed production script tags at build time.
- **Zero White Screens on Refresh**: Full client-side route persistence ensuring reloads on `/app`, `/login`, or `/curriculum-coverage` return HTTP 200 and boot instantly.
- **Multi-Service Architecture**: Configured via `vercel.json` to seamlessly route `/api/*` to the Express backend and all other traffic to the Vite client.

---

## 🏗️ Repository Architecture

```text
Neev/
├── api/
│   └── index.js                         # Vercel serverless entry point routing /api/* to Express
│
├── frontend/                            # React 19 + Vite client application
│   ├── public/
│   │   └── curriculum/                  # NCERT syllabus reference PDFs (Math, Science, Social, English)
│   ├── scripts/
│   │   └── generate-spa-fallbacks.js    # Pre-renders entry points for all SPA routes at build time
│   ├── src/
│   │   ├── components/                  # Navigation, header, modals, form controls, icons
│   │   ├── pages/                       # Login, Register, ForgotPassword, TeacherDashboard
│   │   ├── public-pages/                # Public single-page marketing portal
│   │   │   ├── PublicHomePage.jsx       # Consolidated landing page with smooth scroll
│   │   │   ├── PublicHeader.jsx         # Static header with hamburger drawer
│   │   │   ├── PublicFooter.jsx         # Footer with quick links
│   │   │   └── ContactSection.jsx       # Contact form and support information
│   │   ├── sections/                    # 9-Step Teacher Assessment Workflow
│   │   │   ├── ClassSyllabus.jsx        # Step 1: Class details, section selection & syllabus mapping
│   │   │   ├── UploadAnswerSheets.jsx   # Step 2: Answer sheets & reference papers upload
│   │   │   ├── ExtractPreview.jsx       # Step 3: OCR text extraction & segmentation
│   │   │   ├── TeacherCorrection.jsx    # Step 4: Teacher verification & correction
│   │   │   ├── AIAnswerAnalysis.jsx     # Step 5: Syllabus-grounded AI grading & rubrics
│   │   │   ├── ClassGapOverview.jsx     # Step 6: Class-wide mastery & topic gap analytics
│   │   │   ├── PrerequisiteGaps.jsx     # Step 7: Cross-grade conceptual dependency graph
│   │   │   ├── LearningRoadmap.jsx      # Step 8: Adaptive remediation milestones
│   │   │   ├── GapBasedTest.jsx         # Step 9: Diagnostic retest generation
│   │   │   └── ExportFollowUp.jsx       # Export: Multi-PDF document download center
│   │   ├── services/                    # apiClient, authService, syllabusService, assessmentService, classService
│   │   ├── data/                        # initialData.js, dashboardDemoData.js
│   │   └── utils/                       # pdfGenerator.js, teachingPriorities.js, gapSynthesizer.js
│   ├── tests/                           # Frontend unit and integration tests (30 tests)
│   ├── package.json
│   └── vite.config.js
│
├── backend/                             # Express.js REST API & Ingestion Worker
│   ├── src/
│   │   ├── controllers/                 # evaluation, syllabus, answerSheet, assessment, class, auth
│   │   ├── models/                      # Evaluation, Assessment, AnswerSheet, Class, Teacher
│   │   ├── routes/                      # Protected REST API routes (/api/evaluations, /api/classes, etc.)
│   │   ├── services/
│   │   │   ├── curriculum/              # prerequisiteEngine.js (multi-tier gap prioritization)
│   │   │   ├── storage/                 # s3StorageProvider, firebaseStorageProvider, storageService
│   │   │   ├── rag/                     # ingestionService, chunkingService, embeddingService, retrievalService
│   │   │   ├── ai/                      # grokService (AI evaluation & feedback)
│   │   │   └── extraction/              # groqExtractionService, extractionService (OCR & segmentation)
│   │   ├── middleware/                  # verifyFirebaseToken, authenticate, errorHandler
│   │   ├── app.js                       # Express configuration & CORS validation
│   │   └── server.js                    # Server bootstrap & graceful shutdown
│   ├── tests/                           # Unit, integration, and security tests
│   └── package.json
│
├── vercel.json                          # Multi-service monorepo routing configuration
└── package.json                         # Monorepo workspace configuration
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **MongoDB**: MongoDB Atlas connection URI
- **Firebase Project**: Firebase Auth credentials
- **Cloud Storage**: Filebase S3, Cloudflare R2, or Firebase Storage

### 2. Installation
Install all root, backend, and frontend dependencies in a single step:
```bash
npm run install:all
```

### 3. Environment Configuration
Create environment files from the provided templates:

**Backend (`backend/.env`)**:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/neev?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173

# Cloud Storage (Filebase S3 / Cloudflare R2)
FILEBASE_KEY=your_filebase_access_key
FILEBASE_SECRET=your_filebase_secret_key
FILEBASE_BUCKET=neev-curriculum
FILEBASE_ENDPOINT=https://s3.filebase.com
FILEBASE_REGION=us-east-1

# AI & LLM Inference Keys
GROQ_API_KEY=your_groq_api_key
GROK_API_KEY=xai-your_xai_grok_api_key
GEMINI_API_KEY=your_gemini_api_key

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Frontend (`frontend/.env`)**:
```ini
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Running the Development Environment
Run backend and frontend concurrently:
```bash
# Terminal 1: Backend API (http://localhost:5000)
npm --prefix backend run dev

# Terminal 2: Frontend Client (http://localhost:5173)
npm --prefix frontend run dev
```

### 5. Production Build & Automated Verification
```bash
# Verify frontend production bundle and SPA fallback generator
npm run build

# Run frontend test suite (Auth, Gap Synthesizer, PDF Generator, Teaching Priorities)
npm run test:frontend

# Run prerequisite prioritization unit tests
node --test backend/tests/prerequisitePrioritization.test.js
```

---

## 🔒 Security & Data Integrity

- **Strict Tenant Data Isolation**: Assessments, student sheets, classroom sections, and curriculum chunks are partitioned by `teacherId`. Cross-teacher data access is rejected with HTTP 404 / 403.
- **Fail-Closed Storage**: In production (`NODE_ENV=production`), the backend strictly disallows local filesystem storage fallback and requires verified S3/Firebase credentials.
- **Origin & CORS Whitelisting**: `backend/src/app.js` enforces strict origin matching; unauthorized origins are rejected with `CORS_ORIGIN_DENIED`.
- **Zero Secrets in Client**: All LLM and Cloud Storage API keys remain strictly in backend serverless functions and worker environments.
- **Safe ASCII PDF Sanitization**: Eliminates code injection or binary stream corruption during PDF generation.

---

## 📄 License & Contact

- **License**: ISC License — Neev Platform.
- **Maintainer**: Adhithya Bairy ([adhithyabairy@gmail.com](mailto:adhithyabairy@gmail.com)).
