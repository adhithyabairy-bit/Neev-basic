# Neev — Phase 5: Architecture Audit & Production Readiness Plan

## Executive Summary
This document provides a thorough audit of the Neev platform following the completion of Phase 4, identifying production bottlenecks, architectural gaps, and the specific technical roadmap required for **Phase 5: Production-Ready RAG, Cloud Storage, and Deployment Readiness**.

Neev evaluates student answer sheets against curriculum standards using syllabus-grounded Retrieval-Augmented Generation (RAG) and Grok AI. Phase 5 elevates the existing implementation from a prototype with local storage and test fallbacks to a resilient, zero-budget-first, cloud-native architecture ready for Vercel deployment and Cloudflare R2 cloud object storage.

---

## 1. Audit of Existing Phase 4 Components

### 1.1 Embedding Service (`backend/src/services/rag/embeddingService.js`)
- **Current State**:
  - Implements an OpenAI-compatible HTTP fetch client and an offline deterministic hash vector generator (`generateDeterministicVector`).
  - Default vector dimension: 1536d.
- **Defects & Gaps**:
  1. *Silent Fallback in Catch Block*: Lines 149–153 catch external API errors and silently return deterministic hash embeddings. In production, an invalid API key, network failure, or rate limit causes the system to generate hash vectors without raising an error. This pollutes the database with non-semantic vectors.
  2. *Implicit Mock Execution*: If `apiKey` is not configured, it silently uses mock embeddings without checking environment modes (`NODE_ENV === 'test'`).
  3. *Cloud Provider Flexibility*: Lacks native integration with Google Gemini embedding API (`text-embedding-004`, 768d), which offers a generous zero-cost free tier suitable for education platforms.
  4. *Dimension & Model Metadata*: Does not validate vector dimensions against the Atlas Vector index before writing or querying.

### 1.2 Grok AI Evaluation Service (`backend/src/services/ai/grokService.js`)
- **Current State**:
  - Prompts Grok API (`https://api.x.ai/v1/chat/completions`) with strict system constraints, JSON schema enforcement, and distinction between observed errors and conceptual hypotheses.
- **Defects & Gaps**:
  1. *Silent Heuristic Fallback*: Lines 161–168 silently execute `evaluateWithLocalHeuristic()` if `this.apiKey` is undefined. In production, an unconfigured Grok key would fabricate marks and feedback without informing the teacher.
  2. *Status Tracking*: Does not mark evaluations as `failed` or `pending_configuration` when the external AI service is unreachable.

### 1.3 Syllabus Storage & Chunk Models (`SyllabusDocument.js`, `SyllabusChunk.js`)
- **Current State**:
  - `SyllabusDocument` tracks `fileHash` (SHA-256), `fileName`, `fileSize`, `chunkCount`, and `status`.
  - `SyllabusChunk` stores `documentId`, `teacherId`, `chunkText`, `embedding`, `pageNumber`, and filter indexes.
- **Defects & Gaps**:
  1. *Missing Cloud Storage Attributes*: `SyllabusDocument` does not track `storageProvider` (`'r2' | 's3' | 'local'`), cloud bucket, or presigned access metadata.
  2. *Missing Chunk Audit Metadata*: `SyllabusChunk` lacks `classId`, chunk-level `contentHash`, `pageRange`, `embeddingModel`, `embeddingVersion`, `embeddingDimensions`, and chunk `status`.
  3. *Storage Efficiency*: Embeddings stored as raw `[Number]` arrays require ~6–12 KB per chunk in BSON. For a full 200MB corpus (~60,000 chunks), vector storage can reach 400MB–700MB, risking MongoDB Atlas M0 free tier exhaustion (512 MB limit) unless filtered by target grades or smaller dimensions (768d).

### 1.4 Vector Retrieval & Local Fallback (`retrievalService.js`)
- **Current State**:
  - Executes MongoDB Atlas `$vectorSearch` with teacher ownership filter. Falls back to in-memory cosine similarity and MongoDB `$text` search.
- **Defects & Gaps**:
  1. *Ambiguous Retrieval Reporting*: Catches `$vectorSearch` errors and transparently falls back without alerting the system that retrieval operated in degraded mode (`isDegraded: true`).
  2. *Dimension Verification*: Does not verify that query embedding dimensions match chunk vector dimensions prior to query execution.

### 1.5 Object Storage Infrastructure (`storageService.js`, `localStorageProvider.js`)
- **Current State**:
  - Implements local disk storage (`localStorageProvider.js`) saving files into `uploads/answer-sheets`.
- **Defects & Gaps**:
  1. *Cloud Incompatibility*: Ephemeral file systems on serverless platforms (e.g. Vercel) lose files on container teardown.
  2. *Missing Cloudflare R2 Provider*: Lacks an S3-compatible adapter for Cloudflare R2 (the zero-egress, 10 GB free-tier provider).
  3. *Secure Pre-signed URL Support*: Lacks short-lived presigned upload and download URL generation for private cloud storage.

### 1.6 Directory Ingestion CLI (`ingestSyllabusDirectory.js`)
- **Current State**:
  - Reads a local directory, checks SHA-256 hashes, and batch-embeds chunks.
- **Defects & Gaps**:
  1. *Silent Metadata Defaults*: Lines 48–60 silently assign the first teacher in the database (`Teacher.findOne()`) if `--teacherEmail` is omitted. Defaults `subject` to 'Mathematics' and `grade` to 'Grade 8'.
  2. *No Dry-Run or Sampling*: Lacks `--dry-run` to preview chunk counts and storage costs, and `--sample=<n>` to test a small subset.
  3. *Scanned PDF Blind Spot*: Does not detect scanned PDFs that yield zero text, which silently fails or produces empty chunks.
  4. *Cloud Source Support*: Cannot ingest directly from Cloudflare R2 object keys.

### 1.7 Deployment & Architecture Readiness
- **Current State**:
  - React 19 + Vite frontend in `frontend/`, Express backend in `backend/`.
- **Defects & Gaps**:
  1. *No Vercel Configuration*: Lacks `vercel.json` and a serverless entry point routing `/api/*` to the Express application while serving the Vite static build.
  2. *Database Connection Leaks*: `backend/src/config/db.js` does not cache Mongoose connection promises across warm serverless function invocations.
  3. *CORS Configuration*: Hardcoded to `http://localhost:5173`; needs dynamic support for Vercel production deployment URLs.

---

## 2. Zero-Budget Storage & Resource Feasibility Analysis

### 2.1 200 MB Syllabus Corpus Mathematics
- **Raw PDFs**: ~200 MB.
- **Extracted Text**: A typical 200 MB collection of scanned/digital textbooks yields ~30 MB to 50 MB of raw plain text.
- **Chunk Count**: At 800 characters per chunk with 100-character overlap:
  $$\text{Chunks} \approx \frac{40,000,000 \text{ characters}}{700 \text{ step}} \approx 57,000 \text{ chunks}$$
- **Vector Storage in MongoDB Atlas**:
  - **1536-dimensional (OpenAI `text-embedding-3-small`)**: $1536 \times 8\text{ bytes} \approx 12.2\text{ KB/chunk}$.
    $$57,000 \times 12.2\text{ KB} \approx 695\text{ MB} \quad (\text{Exceeds Atlas M0 512 MB})$$
  - **768-dimensional (Google Gemini `text-embedding-004`)**: $768 \times 8\text{ bytes} \approx 6.1\text{ KB/chunk}$.
    $$57,000 \times 6.1\text{ KB} \approx 348\text{ MB} \quad (\text{Fits within Atlas M0 512 MB with text})$$
- **Strategy for Zero-Budget Reliability**:
  1. Store all original PDFs in **Cloudflare R2** (10 GB free storage, zero egress fees).
  2. Ingest selectively by target grade/term (e.g. Grade 8 Term 1 Math: ~5,000 chunks $\approx 30\text{ MB}$), keeping the active MongoDB footprint well under 100 MB.
  3. Support Google Gemini 768d embeddings as the primary free-tier provider, with OpenAI 1536d as configurable alternative.

---

## 3. Required Environment Variables

```ini
# Server & Environment
PORT=5000
NODE_ENV=development # 'development' | 'production' | 'test'
FRONTEND_URL=http://localhost:5173
ALLOW_MOCK_EMBEDDINGS=false # Strictly false in production
ALLOW_MOCK_AI=false         # Strictly false in production

# Database
MONGODB_URI=mongodb+srv://<user>:<pwd>@cluster0.mongodb.net/neev?retryWrites=true&w=majority

# Cloud Storage (Cloudflare R2 / S3-compatible)
STORAGE_PROVIDER=r2 # 'r2' | 's3' | 'local'
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=neev-syllabus-prod
R2_PUBLIC_URL= # Optional: custom domain if public, empty for private presigned URLs

# AI Evaluation (xAI Grok)
GROK_API_KEY=
GROK_MODEL=grok-2-latest
GROK_TIMEOUT_MS=30000

# Embedding Provider
EMBEDDING_PROVIDER=gemini # 'gemini' | 'openai' | 'mock'
GEMINI_API_KEY=
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=768 # 768 for Gemini, 1536 for OpenAI

# Atlas Vector Search
ATLAS_VECTOR_INDEX_NAME=syllabus_vector_index
```

---

## 4. Phase 5 Implementation Plan

| Milestone | Key Action Items | Target Files |
| :--- | :--- | :--- |
| **M1: Cloud Embedding & Explicit AI** | Support Gemini 768d & OpenAI 1536d. Enforce strict failure (no silent mock in production). Explicitly label mock test mode. | `embeddingService.js`, `grokService.js`, `evaluationController.js` |
| **M2: Persistent & Audited RAG** | Expand `SyllabusChunk` schema (hash, dimensions, model, status, classId). Add degradation tracking to `retrievalService.js`. | `SyllabusChunk.js`, `SyllabusDocument.js`, `retrievalService.js` |
| **M3: Cloudflare R2 Storage Adapter** | Build S3-compatible R2 adapter with presigned upload/download URLs. Update `storageService.js` factory. | `r2StorageProvider.js`, `storageService.js`, `syllabusController.js` |
| **M4: Safe, Resumable 200MB Ingestion CLI** | Add metadata validation (no silent defaults), `--dry-run`, `--sample`, scanned PDF detection, and rate limiting. | `ingestSyllabusDirectory.js`, `ingestionService.js` |
| **M5: Vercel Deployment Architecture** | Create `api/index.js` serverless wrapper, Mongoose connection caching, `vercel.json` rewrites, and CORS updates. | `api/index.js`, `vercel.json`, `db.js`, `app.js` |
| **M6: Verification & Test Suite** | Add unit and integration tests for R2 adapter, explicit embedding failure, dimension mismatch, and CLI dry-run. | `tests/phase5Production.test.js`, test suites |
| **M7: Final Documentation** | Create `PHASE_5_SETUP.md`, `PHASE_5_INGESTION_GUIDE.md`, and `PHASE_5_TEST_REPORT.md`. | Root documentation |

