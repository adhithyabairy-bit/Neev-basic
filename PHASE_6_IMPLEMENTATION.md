# Neev — Phase 6: Direct Cloud PDF Upload & Asynchronous Ingestion Implementation Guide

## 1. Architecture & End-to-End Data Flow

Phase 6 implements a secure, scalable, and memory-safe architecture enabling teachers to upload syllabus textbooks up to **200 MB per file** without routing large binaries through the frontend hosting server (Vercel) or Express API.

```
+--------------------------------------------------------------------------------------------------+
|                                  PHASE 6 DIRECT-TO-CLOUD PIPELINE                                 |
+--------------------------------------------------------------------------------------------------+

 [Teacher Browser (React)]
       │
       │ 1. POST /api/syllabus/upload-session (metadata: name, size, type)
       ▼
 [Express API] ─────────────────► [Storage Provider: Filebase S3 / Firebase]
       │                          │
       │                          │ 2. Generate short-lived presigned PUT URL (15 min)
       │ ◄────────────────────────┘
       │
       │ 3. Return { uploadUrl, storageKey, uploadSessionId, maxBytes }
       ▼
 [Teacher Browser (React)]
       │
       │ 4. HTTP PUT uploadUrl (Direct binary stream with onprogress: 0% -> 100%)
       ▼
 [Cloud Object Storage (Bucket)]
       │
       │ 5. 200 OK (Upload confirmed in bucket)
       ▼
 [Teacher Browser (React)]
       │
       │ 6. POST /api/syllabus/upload-complete (storageKey, metadata)
       ▼
 [Express API]
       │
       │ 7. HeadObject verification: validates file exists, size <= 200MB, MIME in cloud
       │ 8. Creates SyllabusDocument & IngestionJob (status: 'queued')
       │ 9. Returns { success: true, documentId, jobId, status: 'queued' }
       ▼
 [MongoDB Atlas Queue]
       │
       │ 10. Atomic Claim: findOneAndUpdate({ status: 'queued' } -> 'claimed')
       ▼
 [Ingestion Worker Process (Node.js)]
       │
       ├──► 11. Stream download to temp file on disk (os.tmpdir()) & calculate SHA-256 hash
       ├──► 12. Check deduplication: if identical fileHash exists, reuse vector index
       ├──► 13. Extract digital text via pdf-parse; detect scanned PDFs (ocr_required)
       ├──► 14. Split into bounded chunks (750 chars / 120 overlap)
       ├──► 15. Generate batch embeddings (Gemini text-embedding-004 768d)
       ├──► 16. Bulk insert SyllabusChunks into MongoDB Atlas
       ├──► 17. Update SyllabusDocument -> 'completed' & IngestionJob -> 'completed'
       └──► 18. Guaranteed cleanup of temp disk files in finally block
```

---

## 2. Files Added or Modified

| Component / Path | Action | Description |
| :--- | :--- | :--- |
| `backend/src/services/storage/s3StorageProvider.js` | **Modified** | Implemented `getPresignedUploadUrl` (`PutObjectCommand`), `verifyUploadedObject` (`HeadObjectCommand`). |
| `backend/src/services/storage/firebaseStorageProvider.js` | **Modified** | Implemented `getPresignedUploadUrl` (`file.getSignedUrl({ action: 'write' })`) and `verifyUploadedObject`. |
| `backend/src/services/storage/r2StorageProvider.js` | **Modified** | Implemented `getPresignedUploadUrl` and `verifyUploadedObject` matching universal S3 signature. |
| `backend/src/services/storage/storageService.js` | **Modified** | Exposes `generateKey`, `getPresignedUploadUrl`, and `verifyUploadedObject`. |
| `backend/src/models/IngestionJob.js` | **Added** | MongoDB model for asynchronous queueing with atomic claiming, attempts counter, and progress tracking. |
| `backend/src/models/SyllabusDocument.js` | **Modified** | Added statuses (`queued`, `uploaded`), `activeJobId`, `pageCount`, and sparse hash index. |
| `backend/src/controllers/syllabusController.js` | **Modified** | Added `createUploadSession`, `completeUploadSession`, `getIngestionJobStatus`, `retryIngestionJob`. |
| `backend/src/routes/syllabus.routes.js` | **Modified** | Registered upload session, complete, status, and retry endpoints. |
| `backend/src/workers/ingestionWorker.js` | **Added** | Standalone worker process claiming queued jobs, streaming files, generating chunks/embeddings, and updating progress. |
| `backend/src/services/rag/ingestionService.js` | **Modified** | Added cascade deletion of `IngestionJob`s when deleting a syllabus document. |
| `frontend/src/services/syllabusService.js` | **Modified** | Added `uploadSyllabusDirectToCloud`, XHR streaming upload with progress, upload completion, and status polling. |
| `frontend/src/sections/ClassSyllabus.jsx` | **Modified** | Added 200 MB validation, real-time upload progress bar (0–100%), background status polling, and retry button. |
| `backend/tests/phase6DirectUploadAndWorker.test.js` | **Added** | 17 automated tests covering all Phase 6 functional and security requirements. |
| `backend/.env.example` | **Modified** | Updated `FILEBASE_ENDPOINT=https://s3.filebase.io`, added worker and file size settings. |
| `backend/package.json` | **Modified** | Added npm scripts `"test:storage"` and `"worker:ingest"`. |
| `PHASE_6_AUDIT.md` | **Added** | Initial Phase 6 architecture audit report. |

---

## 3. Storage Provider Behavior & Limitations

### 3.1 Filebase S3 (Configured & Live Verified)
- **Status**: 100% verified operational on bucket `neev-project-123456789`.
- **Endpoint**: `https://s3.filebase.io` (requires `forcePathStyle: true` with AWS SDK v3).
- **Direct Upload**: Generates AWS S3 presigned PUT URLs with 15-minute expiration.
- **Verification**: `HeadObjectCommand` confirms existence, content length, and MIME type without downloading the file.
- **Free Tier Allowance**: 5 GB storage with free egress and no egress bandwidth cap.

### 3.2 Firebase Storage (Google Cloud Storage)
- **Status**: Supported via Firebase Admin SDK.
- **Direct Upload**: Generates v4 signed write URLs via Google Cloud Storage.
- **Requirement**: The service account or ADC must have `roles/iam.serviceAccountTokenCreator` to sign URLs.

### 3.3 Cloudflare R2
- **Status**: S3-compatible, zero-egress fee architecture.
- **Direct Upload**: Uses S3 presigned PUT URLs via `https://<accountId>.r2.cloudflarestorage.com`.

---

## 4. Environment Setup & Configuration

Add these variables to `backend/.env`:

```ini
# Maximum permitted syllabus file size (supports up to 200 MB)
SYLLABUS_MAX_FILE_SIZE_MB=200

# Cloud Object Storage (Filebase 5 GB Free Tier)
STORAGE_PROVIDER=filebase
FILEBASE_ENDPOINT=https://s3.filebase.io
FILEBASE_ACCESS_KEY_ID=BDE06A27598A0CF8AFD2
FILEBASE_SECRET_ACCESS_KEY=GTOkTT3zTZG2H8HjQ524XOVM6TJhuMVMghcyizpy
FILEBASE_BUCKET_NAME=neev-project-123456789

# Ingestion Worker Settings
WORKER_POLL_INTERVAL_MS=3000
WORKER_STALE_TIMEOUT_MS=600000

# Embedding Provider (Google Gemini 768d)
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=768
```

---

## 5. How to Run & Operate the Platform

### 5.1 Verify Cloud Storage Connectivity
Test live bucket authorization and presigned URL generation:
```bash
npm --prefix backend run test:storage
```

### 5.2 Start the Express API Server
```bash
npm --prefix backend run dev
```

### 5.3 Start the Background Ingestion Worker
Run the worker in a separate terminal process:
```bash
npm --prefix backend run worker:ingest
```
To run a single pass over pending jobs and exit:
```bash
node backend/src/workers/ingestionWorker.js --once
```

### 5.4 Start the Frontend Application
```bash
npm --prefix frontend run dev
```

---

## 6. Testing Guide

### 6.1 Run Automated Phase 6 Tests
Execute the 17 Phase 6 test specifications:
```bash
node --test backend/tests/phase6DirectUploadAndWorker.test.js
```

### 6.2 Run the Complete Platform Test Suite
All 102 backend tests across 33 test suites:
```bash
npm --prefix backend test
```

### 6.3 Small PDF Verification Test (< 5 MB)
1. Navigate to **Class Syllabus & Rubric** in the teacher dashboard.
2. Under **Curriculum Textbooks & RAG Knowledge Store**, click **Upload Syllabus PDF (Direct Cloud)**.
3. Select a small PDF chapter (e.g. 2–5 MB).
4. Observe the upload progress bar quickly fill to 100%.
5. The document appears immediately with badge `Queued for Ingestion`.
6. Within seconds, the background worker processes the PDF and updates the badge to `Vector Indexed (N Chunks)`.

### 6.4 Large PDF Verification Test (~200 MB)
1. Select a full textbook PDF (e.g. 100–190 MB).
2. The browser validates that file size <= 200 MB.
3. The file streams directly from the browser to Filebase S3 without hitting Express/Vercel memory.
4. The upload progress bar tracks bytes transferred (`X / Y MB`).
5. After upload completes, the worker streams the file to temporary disk storage, extracts text, chunks, embeds, and updates status.
6. The temporary file in `os.tmpdir()` is cleanly removed after indexing completes.

---

## 7. Separate Deployment of the Worker (Beyond Vercel)

Vercel functions are stateless serverless HTTP handlers with a maximum execution timeout (10s on hobby plan, 60s on pro plan). Because large 200 MB PDF ingestion can take 1–3 minutes, **the worker must run in a persistent runtime**:

### Option 1: Railway / Render (Zero-Budget Free Tier)
Deploy the worker as a background worker service:
- **Build Command**: `npm --prefix backend install`
- **Start Command**: `node backend/src/workers/ingestionWorker.js`
- **Environment Variables**: Add `MONGODB_URI`, `STORAGE_PROVIDER`, `FILEBASE_*`, `GEMINI_API_KEY`.

### Option 2: Docker Container
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev
COPY backend/ ./backend/
CMD ["node", "backend/src/workers/ingestionWorker.js"]
```

---

## 8. Known Limitations & Remaining Manual Setup

1. **Bucket CORS Configuration**:
   When using direct-to-cloud uploads from the browser, the Filebase bucket must allow HTTP `PUT` requests from the frontend origin (`http://localhost:5173` or your production domain).
   Filebase dashboard: **Buckets** > **neev-project-123456789** > **CORS Rules**:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
2. **MongoDB Atlas Vector Search Index**:
   Ensure `syllabus_vector_index` is configured in MongoDB Atlas Search with `dimensions: 768` and `similarity: cosine`.

