# Neev — Phase 4 Architecture Audit & Implementation Plan

## Executive Summary
This document provides a comprehensive audit of the existing Neev platform architecture across Phase 1 (Core & Auth), Phase 2 (Classroom & Assessment Management), and Phase 3 (Answer-Sheet Upload, OCR Extraction & Teacher Verification), establishing the foundation for **Phase 4: Syllabus-Based AI Answer Evaluation and RAG**.

---

## 1. Existing System Architecture & Reusable Components

### 1.1 Backend (`backend/`)
- **Runtime & Framework**: Node.js v24 (ESM: `"type": "module"`), Express 4.21.2.
- **Database & ODM**: MongoDB Atlas with Mongoose 8.9.5.
- **Authentication**: Firebase Admin SDK (`backend/src/config/firebaseAdmin.js`, `backend/src/middleware/authenticate.js`).
  - Tokens verified via `admin.auth().verifyIdToken()`.
  - Identity bound strictly to `Teacher` records (`req.teacher._id`).
  - Strict ownership checks on every resource (`teacherId`).
- **Models**:
  - `Teacher.js`: `firebaseUid`, `email`, `name`.
  - `Class.js`: `teacherId`, `name`, `grade`, `subject`, `board`.
  - `Assessment.js`: `teacherId`, `classId`, `title`, `subject`, `maximumMarks`, `examDate`, `status`.
  - `AnswerSheet.js`: `teacherId`, `assessmentId`, `classId`, `studentName`, `originalFileName`, `storageKey`, `mimeType`, `fileSize`, `status` (`uploaded`, `processing`, `review_required`, `verified`, `processing_failed`), `verificationStatus` (`isVerified`, `verifiedAt`, `verifiedBy`), `answers` (subdocuments containing `questionNumber`, `rawExtractedText`, `correctedText`, `confidence`, `maxMarks`, `awardedMarks`, `status`).
- **Services & Utilities**:
  - `fileValidation.js`: File signature / magic byte detection (`%PDF-`, `0xFFD8FF`, `0x89504E47`), MIME validation, 15MB limit, path sanitization.
  - `localStorageProvider.js` & `storageService.js`: Provider abstraction for private file storage, streaming, and deletion.
  - `extractionService.js`: Modular text extraction using `pdf-parse` (v2) for digital PDFs and `tesseract.js` for images (JPG, PNG).
- **Test Suite**:
  - Node test runner (`node:test`, `node:assert/strict`).
  - 53 passing automated tests covering isolation, validation, ownership, magic bytes, storage, and status lifecycle.

### 1.2 Frontend (`frontend/`)
- **Stack**: React 19 + Vite 8.
- **API Client**: `apiClient.js` with centralized Firebase token injection, auto-token refresh, multipart `FormData` support, and standardized error handling.
- **Sections**:
  - `ClassSyllabus.jsx`: Step 1 — Exam details, class selection, and topic/lesson management.
  - `UploadAnswerSheets.jsx`: Step 2 — Real file upload with server storage, student profile linking, and persistence.
  - `ExtractPreview.jsx`: Step 3 — Inspection of extracted text, OCR confidence, uncertain parts, and re-process actions.
  - `TeacherCorrection.jsx`: Step 4 — Correction of student answers, awarded marks, raw OCR reference display, and explicit ground-truth verification.
  - `AIAnswerAnalysis.jsx`: Step 5 — Display of observed errors, AI conceptual hypotheses, and rubric evidence.
  - `ClassGapOverview.jsx`: Step 10 — Class-level diagnostic view, teaching priorities, and topic remediation sequence.

---

## 2. Phase 3 Audit Findings & Fixes Required

1. **Extraction Default Marks vs Rubric Allocation**:
   - In `extractionService.js`, extracted question items defaulted to `maxMarks: 5`.
   - *Fix*: In Phase 4, question entries must derive `maxMarks` from the teacher's rubric when defined, and prevent arbitrary 5-mark defaults from being treated as real rubric marks.
2. **Explicit Verification Gate**:
   - Evaluation must strictly require explicit teacher verification (`answerSheet.status === 'verified'` or `answerSheet.verificationStatus.isVerified === true`).
   - If a teacher modifies an answer after verification, the verification is automatically invalidated (reverting to `review_required`), and evaluation must be blocked until re-verified.
3. **Scanned PDF Handling**:
   - Scanned PDFs without embedded text currently produce `method: 'pdf-scan-review'`. Images (JPG, PNG) use real Tesseract OCR.
   - For scanned PDFs, we will support single-page image conversion where possible or provide clear manual transcription/image upload recommendations without adding unstable native C++ binary dependencies.
4. **Correction Persistence**:
   - Verified that `PATCH /api/answer-sheets/:id/answers/:answerId` and `PATCH /api/answer-sheets/:id/verify` reliably persist to MongoDB and handle errors gracefully.

---

## 3. Phase 4 Architecture & Design

### 3.1 Extended Assessment Model (Syllabus & Rubric)
`Assessment.js` will be augmented with:
- `lessons`: Array of syllabus topics (`{ id, name, grade, description, isFoundational, prerequisites }`).
- `rubric`: Array of question-wise marking schemes (`{ questionNumber, prompt, maximumMarks, referenceAnswer, keyPoints, lessonId }`).
- Validation: Sum of rubric `maximumMarks` must not exceed `maximumMarks` of the assessment.

### 3.2 Persistent Syllabus Document Ingestion & Chunking
To support the user's ~200MB syllabus collection without reloading or re-embedding on every assessment:
- **`SyllabusDocument` Model**: Stores file metadata, content hash (SHA-256), grade, subject, teacher ownership, chunk count, and ingestion status.
- **`SyllabusChunk` Model**: Stores chunk text, source page, document reference, teacher ownership, and vector embedding (`[Number]`).
- **Batching & Stream Processing**: Reads files in bounded chunks (500–1000 characters with 100-character overlap) to prevent RAM exhaustion.
- **Content Hash Deduplication**: Avoids re-processing identical documents.

### 3.3 Pluggable Embedding Provider
- `embeddingService.js` interface supporting:
  - Configurable providers via `EMBEDDING_PROVIDER`: `'openai'`, `'gemini'`, `'voyage'`, `'local'`, `'mock'`.
  - Configurable model via `EMBEDDING_MODEL` (e.g., `text-embedding-3-small`, 1536 dimensions).
  - Deterministic offline mock provider for automated unit testing (0 cost, 0 network dependency).

### 3.4 Vector Search with Resilient Hybrid Fallback
- `retrievalService.js`:
  - Primary: MongoDB Atlas Vector Search aggregate pipeline (`$vectorSearch` with teacherId and subject filters).
  - Secondary / Local Fallback: In-memory cosine similarity or MongoDB text search over filtered metadata chunks, ensuring complete local functionality when an Atlas Vector index is not yet built.

### 3.5 Grok API Integration
- `grokService.js`:
  - Calls Grok endpoint (`https://api.x.ai/v1/chat/completions`) using `GROK_API_KEY` and `GROK_MODEL`.
  - Strict JSON schema validation for returned evaluation payload:
    - `suggestedMarks`, `explanation`, `evidenceQuotes`, `observedErrors`, `misconceptionHypothesis`, `isEvidenceSufficient`.
  - Safe error handling, rate limiting protection, and offline mock support for unit tests.

### 3.6 Evaluation Data Model
- `Evaluation.js`:
  - Tracks individual evaluated answers with teacher ID, assessment ID, answerSheet ID, suggested marks, teacher approved marks, status (`pending`, `processing`, `review_required`, `approved`, `stale`), observed errors, and misconception hypotheses.

---

## 4. Implementation Steps & Milestones

1. **Step 1**: Write Audit Report (`PHASE_4_AUDIT.md`) and verify existing tests.
2. **Step 2**: Extend `Assessment` schema with `lessons` and `rubric` validation.
3. **Step 3**: Implement `SyllabusDocument` and `SyllabusChunk` schemas, chunking utility, and `embeddingService.js`.
4. **Step 4**: Implement `retrievalService.js` with Atlas Vector Search and fallback.
5. **Step 5**: Implement `grokService.js` with structured JSON evaluation.
6. **Step 6**: Implement `Evaluation` Mongoose model and lifecycle management.
7. **Step 7**: Build backend API routes and controllers for syllabus ingestion and answer evaluation.
8. **Step 8**: Connect frontend `ClassSyllabus.jsx`, `AIAnswerAnalysis.jsx`, and `ClassGapOverview.jsx`.
9. **Step 9**: Add comprehensive automated test suite in `backend/tests/evaluationAndRag.test.js`.
10. **Step 10**: Document setup and implementation in `PHASE_4_IMPLEMENTATION.md`, `PHASE_4_SETUP.md`, and `PHASE_4_TEST_REPORT.md`.

