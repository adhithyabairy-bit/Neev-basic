# Neev — Phase 4: Syllabus-Based AI Answer Evaluation and RAG Implementation

## Overview
Phase 4 delivers an end-to-end, production-ready AI answer evaluation and syllabus-grounded Retrieval-Augmented Generation (RAG) pipeline for the Neev Teacher Platform.

The system evaluates teacher-verified student answers against a syllabus knowledge base and a teacher-defined marking rubric, using Grok API as the reasoning LLM and MongoDB Atlas Vector Search for curriculum grounding.

---

## 1. System Architecture & Component Interactions

```
+-----------------------------------------------------------------------------------+
|                                  Frontend (React 19 + Vite)                       |
|  - ClassSyllabus (Rubric & Syllabus Docs)                                         |
|  - TeacherCorrection (Ground-Truth Verification)                                  |
|  - AIAnswerAnalysis (Suggested Marks, Syllabus Evidence, Teacher Approval)       |
|  - ClassGapOverview (Aggregated Topic Mastery & Teaching Priorities)              |
+-----------------------------------------------------------------------------------+
                                        | (HTTPS + Firebase Bearer Token)
                                        v
+-----------------------------------------------------------------------------------+
|                               Backend (Node.js ESM + Express)                     |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Security & Gating Middleware: authenticate.js                               |  |
|  | - Rejects unverified answer sheets (HTTP 400 SHEET_NOT_VERIFIED)            |  |
|  | - Enforces strict teacher tenant isolation on all queries and mutations    |  |
|  +-----------------------------------------------------------------------------+  |
|                                        |                                          |
|        +-------------------------------+-------------------------------+          |
|        |                                                               |          |
|        v                                                               v          |
|  +-------------------------------------+             +-------------------------+  |
|  | Persistent Syllabus RAG Pipeline    |             | Grok Evaluation Engine  |  |
|  | - chunkingService.js                |             | - grokService.js        |  |
|  | - embeddingService.js (1536d)       |             | - Strict JSON format    |  |
|  | - retrievalService.js               |             | - Heuristic fallback    |  |
|  |   ($vectorSearch / Cosine fallback) |             |                         |  |
|  +-------------------------------------+             +-------------------------+  |
|                    \                                              /               |
|                     +----------------------+---------------------+                |
|                                            v                                      |
|                             +------------------------------+                      |
|                             | Evaluation Controller        |                      |
|                             | - Upserts Evaluation records |                      |
|                             | - Tracks teacher approval    |                      |
|                             | - Stale invalidation on edit |                      |
|                             +------------------------------+                      |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                             MongoDB Atlas Collections                             |
|  - assessments (with lessons & rubric)                                            |
|  - answersheets (verificationStatus, answers)                                     |
|  - syllabusdocuments (SHA-256 hash, metadata)                                     |
|  - syllabuschunks (chunkText, 1536d vector embedding)                             |
|  - evaluations (suggestedMarks, approvedMarks, syllabusEvidence, reviewStatus)    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Models and Database Schema

### 2.1 Extended `Assessment` Model (`backend/src/models/Assessment.js`)
Stores syllabus lessons and question-wise rubric criteria directly on the assessment:
- `lessons`: Array of topics:
  - `id`: Unique identifier (e.g. `'les-1'`).
  - `name`: Concept title.
  - `grade`: Level (e.g. `'Grade 7'`, `'Grade 8'`).
  - `isFoundational`: Boolean flag indicating prerequisite status.
  - `prerequisites`: Array of prerequisite lesson IDs.
- `rubric`: Array of question-wise marking schemes:
  - `questionNumber`: Question tag (e.g. `'Q1'`, `'Q2'`).
  - `topic`: Concept standard.
  - `maximumMarks`: Question marks.
  - `expectedAnswer`: Exemplar solution steps.
  - `scoringCriteria`: Array of step-wise scoring rules.
  - `keyFormulas`: Relevant equations or principles.
- **Integrity Validation**: Schema validator strictly verifies that the sum of `maximumMarks` across all rubric entries cannot exceed the assessment's total `maximumMarks`.

### 2.2 `SyllabusDocument` Model (`backend/src/models/SyllabusDocument.js`)
Tracks indexed curriculum textbooks and reference guides:
- `teacherId`: Owning educator ObjectId.
- `title`, `fileName`, `fileSize`, `mimeType`.
- `subject`, `grade`, `board`.
- `fileHash`: SHA-256 digest of file content for idempotent deduplication.
- `chunkCount`: Total number of segmented text chunks.
- `status`: `'pending'`, `'processing'`, `'indexed'`, `'failed'`.
- **Compound Index**: `{ teacherId: 1, fileHash: 1 }` (unique) prevents duplicate document ingestion.

### 2.3 `SyllabusChunk` Model (`backend/src/models/SyllabusChunk.js`)
Stores discrete semantic text blocks and vector embeddings:
- `documentId`: Reference to parent `SyllabusDocument`.
- `teacherId`: Tenant isolation key.
- `chunkText`: Cleaned text segment (500–1000 characters).
- `chunkIndex`: Ordering within document.
- `pageNumber`: Source textbook page number for citation.
- `embedding`: 1536-dimensional normalized floating-point vector (`[Number]`).
- `metadata`: `{ subject, grade, chapter, topic }`.
- **Indexes**:
  - Compound filter index: `{ teacherId: 1, 'metadata.subject': 1, 'metadata.grade': 1 }`.
  - Text index: `{ chunkText: 'text' }` for keyword retrieval fallback.

### 2.4 `Evaluation` Model (`backend/src/models/Evaluation.js`)
Tracks question-level AI evaluations and explicit teacher review states:
- `assessmentId`, `answerSheetId`, `teacherId`.
- `answerItemId`: Subdocument ID from `answerSheet.answers`.
- `questionNumber`, `topic`.
- `suggestedMarks`: Grok AI suggested score.
- `approvedMarks`: Score explicitly approved or adjusted by teacher.
- `maximumMarks`: Maximum attainable score.
- `isTeacherApproved`: Boolean flag (default `false`).
- `reviewStatus`: Enum `['pending', 'review_required', 'approved', 'stale']`.
- `explanation`: AI reasoning and step-by-step scoring justification.
- `observedErrors`: Array of concrete errors in student steps.
- `misconceptionHypothesis`: Root conceptual root-cause hypothesis.
- `syllabusEvidence`: Array of cited RAG chunks (`documentTitle`, `pageNumber`, `excerpt`, `relevanceScore`).
- `isEvidenceSufficient`: Boolean flag indicating whether direct syllabus evidence was found.
- `confidence`: Confidence score (0.0 to 1.0).
- **Compound Index**: `{ answerSheetId: 1, answerItemId: 1 }` (unique) ensures idempotent evaluation.

---

## 3. Persistent Syllabus Ingestion & RAG Pipeline

### 3.1 Bounded Chunking Strategy (`chunkingService.js`)
- Pages are extracted and cleaned with source page retention.
- Chunks are sized between 500 and 1,000 characters with an intentional 100-character overlap across sentence boundaries.
- Citations retain source page numbers, enabling teachers to verify syllabus claims directly against textbook pages.

### 3.2 Pluggable Embedding Architecture (`embeddingService.js`)
- **Default / Production**: Integrates with modern 1536-dimensional vector embedding models (OpenAI `text-embedding-3-small`, Gemini embedding, or Grok).
- **Offline Deterministic Mock**: Provides a high-performance offline provider producing normalized 1536-dimensional vectors for zero-cost, zero-latency unit tests.
- **Batching**: Vectors are embedded in bounded batches (32 chunks per call) to avoid rate limits and memory spikes.

### 3.3 Large Collection Scalability (~200MB Corpus)
- Designed to ingest a collection of ~200MB textbook PDFs without holding the entire corpus in memory:
  - Files are processed sequentially using bounded streams and temporary disk buffering.
  - Content hashing (SHA-256) skips files that are already ingested, making batch processing completely idempotent and resumable.
  - CLI script `npm run ingest:syllabus` allows background batch ingestion from any directory.

### 3.4 Hybrid Retrieval with Local Fallback (`retrievalService.js`)
1. **Primary Vector Retrieval**:
   Uses MongoDB Atlas Vector Search `$vectorSearch` pipeline stage:
   ```javascript
   {
     $vectorSearch: {
       index: 'vector_index',
       path: 'embedding',
       queryVector: queryEmbedding,
       numCandidates: 40,
       limit: 4,
       filter: { teacherId: { $eq: teacherId } }
     }
   }
   ```
2. **Resilient Local Fallback**:
   If the Atlas Vector Search index is not yet built or the application runs offline, `retrievalService.js` automatically falls back to in-memory cosine similarity and MongoDB `$text` search over the filtered chunk collection, ensuring 100% operational continuity.

---

## 4. Grok API Answer Evaluation Pipeline (`grokService.js`)

### 4.1 Strict Prompt Engineering
The system prompt strictly instructs Grok to behave as an expert pedagogical assessor:
- Distinguish strictly between **Observed Errors** (concrete factual discrepancies in the student's mathematical steps) and **Conceptual Hypotheses** (inferred underlying misconceptions).
- Ground scores strictly in the provided syllabus evidence and question rubric.
- Never award marks above the stated `maximumMarks`.
- Explicitly output structured JSON matching the defined schema.

### 4.2 Error Handling & Fallback
- Configurable timeout (default 30 seconds) and exponential backoff retry for transient network issues.
- Fallback heuristic evaluator runs if the remote API is unreachable, ensuring evaluations never crash the teacher's workflow.

---

## 5. Security and Workflow Lifecycle Enforcement

### 5.1 Verification Gate
AI evaluation is strictly blocked unless the answer sheet has been verified by the teacher:
- The controller checks `answerSheet.status === 'verified'` or `answerSheet.verificationStatus?.isVerified === true`.
- If unverified, the request returns HTTP 400 with error code `SHEET_NOT_VERIFIED`.

### 5.2 Edit Invalidation & Stale Lifecycle
When a teacher modifies an answer in Step 4 (`PATCH /api/answer-sheets/:id/answers/:answerId`):
1. The answer sheet's `status` reverts to `'review_required'`.
2. Existing evaluations for that answer sheet are flagged with `reviewStatus: 'stale'`.
3. The frontend displays a warning banner prompting the teacher to re-verify and re-evaluate.

### 5.3 Teacher Score Approval Protocol
AI suggested marks are strictly preliminary. They require explicit teacher approval to become final:
- Teacher reviews suggested marks, observed errors, and syllabus evidence in Step 5 (`AIAnswerAnalysis.jsx`).
- Teacher can click "Approve Score" or input a custom score (`PATCH /api/evaluations/:id/approve`).
- The evaluation transitions to `reviewStatus: 'approved'`, setting `isTeacherApproved: true`.

---

## 6. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/syllabus/ingest` | Upload & ingest syllabus document (`multipart/form-data`) |
| `GET` | `/api/syllabus/documents` | List ingested syllabus documents |
| `DELETE` | `/api/syllabus/documents/:id` | Delete syllabus document and cascade delete its chunks |
| `POST` | `/api/assessments/:assessmentId/answer-sheets/:sheetId/evaluate` | Run AI evaluation on verified answer sheet |
| `GET` | `/api/answer-sheets/:sheetId/evaluations` | Get all evaluations for an answer sheet |
| `GET` | `/api/assessments/:assessmentId/evaluations` | Get all evaluations across an assessment |
| `PATCH` | `/api/evaluations/:id/approve` | Teacher approves or adjusts score for an evaluation |
| `GET` | `/api/assessments/:assessmentId/gap-overview` | Get aggregated class-wide learning gap metrics |

---

## 7. Frontend Integration

1. **`AIAnswerAnalysis.jsx`**:
   - Gated by teacher verification check.
   - Triggers syllabus-grounded Grok AI evaluation.
   - Renders suggested score, approved score, observed errors, conceptual hypotheses, and cited syllabus excerpts.
   - Provides inline teacher approval controls.
   - Supports interactive demo mode for testing without backend connection.
2. **`ClassSyllabus.jsx`**:
   - Examination details and class linkage.
   - Question Rubric builder with max marks validation.
   - Curriculum Textbooks & RAG Knowledge Store manager with file upload and chunk count visibility.
3. **`ClassGapOverview.jsx`**:
   - Fetches real class gap overview when evaluations exist.
   - Renders mastery percentages, common errors, and recommended teaching priority order.
   - Gracefully displays informative guidance when student data is not yet evaluated.
4. **`evaluationService.js` & `syllabusService.js`**:
   - Centralized client services handling authentication, error handling, and API integration.

