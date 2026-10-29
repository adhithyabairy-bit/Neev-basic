# Neev — Complete Deployment & Setup Guide

This document is the unified, authoritative setup and deployment guide for the **Neev** learning gap analysis platform. It covers local development, cloud services configuration (Firebase Auth, Filebase S3, MongoDB Atlas Vector Search, Google Gemini embeddings, xAI Grok), running the background ingestion worker, and deploying to Vercel.

---

> [!WARNING]
> ### ⚠️ Security & Credential Rotation Notice
> If actual cloud credentials (such as Filebase access keys or database connection strings) were previously committed to Git history in earlier phases, **they must be revoked and rotated immediately in the respective cloud dashboards**.
>
> Simply editing or deleting a file in a new commit does **NOT** purge credentials from prior Git commits or cloned copies. In this repository, all real credentials in documentation and source code have been replaced with placeholders (`YOUR_FILEBASE_ACCESS_KEY`, etc.). Ensure you rotate any keys exposed previously.

---

## 1. System Architecture Overview

```
                                      +---------------------------------------------+
                                      |                Vercel Cloud                 |
                                      |                                             |
   [Teacher Browser]                  |  [React 19 + Vite]      [Express API]       |
          │                           |  (Static /dist)        (api/index.js)       |
          │                           +─────────┬─────────────────────┬─────────────+
          │                                     │                     │
          │ Direct Presigned Upload (<= 200MB)  │                     │
          ├─────────────────────────────────────┼─────────┐           │
          │                                     │         │           │
          ▼                                     ▼         ▼           ▼
+────────────────----+                      +──────────────────────────────────────+
| Cloud Object Store |                      |              Cloud Services          |
| (Filebase S3 / R2) |                      |                                      |
| Bucket: Private    |                      | • Firebase: Authentication (JWT)     |
+─────────┬──────────+                      | • MongoDB Atlas: App DB & Vector RAG |
          │                                 | • Google Gemini: 768d Embeddings     |
          │                                 | • xAI Grok: Pedagogical Evaluation   |
          │                                 +──────────────────▲───────────────────+
          ▼                                                    │
+──────────────────────────────────────────────────────────────┴───────────────────+
|               Separate Background Cloud Worker (Railway / Render / Docker)        |
|  Claims jobs -> Streams PDFs -> Extracts text -> Embeds -> Indexes Chunks in Atlas |
+──────────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Prerequisites & Environment Setup

- **Node.js**: `v20.x` or `v22.x` (LTS)
- **npm**: `v10.x` or newer
- **Cloud Accounts (Zero-Budget / Free Tier)**:
  1. **Firebase Project**: For teacher authentication (Firebase Auth with Email/Password & Google Sign-In).
  2. **MongoDB Atlas**: M0 Free cluster with Vector Search capability.
  3. **Filebase S3** (or Cloudflare R2 / Firebase Storage): 5 GB free storage with zero egress fees.
  4. **Google AI Studio**: API key for Gemini `text-embedding-004` (768 dimensions, free tier).
  5. **xAI Console** (or mock): API key for Grok-2 pedagogical evaluation.

---

## 3. Environment Variables Specification

### 3.1 Backend (`backend/.env`)

```ini
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Security Safeguards (Set to false in production)
ALLOW_MOCK_EMBEDDINGS=false
ALLOW_MOCK_AI=false

# Firebase Authentication (Admin SDK)
FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/neev?retryWrites=true&w=majority

# Cloud Object Storage (Filebase 5 GB Free Tier - S3 Compatible)
STORAGE_PROVIDER=filebase
FILEBASE_ENDPOINT=https://s3.filebase.io
FILEBASE_ACCESS_KEY_ID=YOUR_FILEBASE_ACCESS_KEY
FILEBASE_SECRET_ACCESS_KEY=YOUR_FILEBASE_SECRET_KEY
FILEBASE_BUCKET_NAME=YOUR_FILEBASE_BUCKET_NAME
SYLLABUS_MAX_FILE_SIZE_MB=200

# Cloud Embeddings (Google Gemini 768d)
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=768
ATLAS_VECTOR_INDEX_NAME=syllabus_vector_index

# Pedagogical Evaluation (xAI Grok)
GROK_API_KEY=YOUR_GROK_API_KEY
GROK_MODEL=grok-2-latest
GROK_TIMEOUT_MS=30000

# Background Ingestion Worker
WORKER_POLL_INTERVAL_MS=3000
WORKER_STALE_TIMEOUT_MS=600000
```

### 3.2 Frontend (`frontend/.env`)

```ini
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=1:your-app-id:web:your-web-id

# Local dev: http://localhost:5000 | Vercel production: leave empty for same-domain proxy
VITE_API_BASE_URL=http://localhost:5000
```

---

## 4. Cloud Services Configuration

### 4.1 Filebase S3 Bucket & CORS
To allow teachers to upload large PDFs (up to 200 MB) directly from their web browser to Filebase:
1. Log in to [Filebase Console](https://console.filebase.com).
2. Create a bucket (e.g., `neev-syllabus-prod`).
3. Set the CORS policy on the bucket. In Filebase Console under **Buckets > [your-bucket-name] > CORS Rules**, or run the automated script:
   ```bash
   npm --prefix backend run configure:cors
   ```
   **CORS JSON Rule:**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag", "x-amz-request-id"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### 4.2 MongoDB Atlas Vector Search Index
1. In MongoDB Atlas, select your Cluster and click **Atlas Search / Vector Search**.
2. Click **Create Search Index** > **JSON Editor**.
3. Target Database: `neev` (or your configured database name), Collection: `syllabuschunks`.
4. Index Name: `syllabus_vector_index`.
5. Configuration:
   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 768,
         "similarity": "cosine"
       },
       {
         "type": "filter",
         "path": "teacherId"
       },
       {
         "type": "filter",
         "path": "subject"
       },
       {
         "type": "filter",
         "path": "grade"
       }
     ]
   }
   ```

---

## 5. Local Development Quickstart

### 5.1 Installation
```bash
# Install root dependencies
npm install

# Install backend & frontend packages
npm run install:all
```

### 5.2 Test Cloud Storage Connection
```bash
npm --prefix backend run test:storage
```

### 5.3 Run Test Suites
```bash
# Run all 105 backend tests (mock mode, zero network dependency)
npm --prefix backend test

# Run frontend production build
npm --prefix frontend run build

# Run frontend linting
npm --prefix frontend run lint
```

### 5.4 Start Local Servers
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
npm --prefix backend run dev
```

**Terminal 2 (Frontend Client):**
```bash
npm --prefix frontend run dev
```

**Terminal 3 (Background Ingestion Worker - Optional for syllabus uploads):**
```bash
npm --prefix backend run worker:ingest
```

---

## 6. Batch Curriculum Ingestion

To ingest multi-grade curriculum documents from a zip archive or directory:
```bash
# Preview files in zip
npm --prefix backend run upload:zip -- --preview

# Upload and ingest curriculum zip
npm --prefix backend run upload:zip

# Ingest single syllabus PDF
npm --prefix backend run upload:syllabus -- --file="path/to/math-class-8.pdf" --subject="Mathematics" --grade="Grade 8" --ingest-now
```

---

## 7. Production Deployment to Vercel

The repository is configured as a zero-configuration monorepo for Vercel.

### 7.1 Architecture on Vercel
- **Frontend**: Built via `vite build` into `frontend/dist/`.
- **API**: Serverless entry point at `api/index.js` routing `/api/*` to the Express backend.
- **Routing**: `vercel.json` routes all `/api/*` requests to the serverless function and static assets to Vite.

### 7.2 Deploy Steps
1. Push your repository to GitHub.
2. In Vercel, click **Add New Project** and select your GitHub repository.
3. Configure the Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (Root)
   - **Build Command**: `npm run build` (runs `npm --prefix frontend run build`)
   - **Output Directory**: `frontend/dist`
4. In **Settings > Environment Variables**, add:
   - `NODE_ENV=production`
   - `MONGODB_URI=mongodb+srv://...`
   - `STORAGE_PROVIDER=filebase`
   - `FILEBASE_ACCESS_KEY_ID=YOUR_FILEBASE_ACCESS_KEY`
   - `FILEBASE_SECRET_ACCESS_KEY=YOUR_FILEBASE_SECRET_KEY`
   - `FILEBASE_BUCKET_NAME=YOUR_FILEBASE_BUCKET_NAME`
   - `FILEBASE_ENDPOINT=https://s3.filebase.io`
   - `EMBEDDING_PROVIDER=gemini`
   - `GEMINI_API_KEY=YOUR_GEMINI_API_KEY`
   - `GROK_API_KEY=YOUR_GROK_API_KEY`
   - `FIREBASE_PROJECT_ID=your-project-id`
   - `VITE_FIREBASE_API_KEY=...`
   - `VITE_FIREBASE_AUTH_DOMAIN=...`
   - `VITE_FIREBASE_PROJECT_ID=...`
   - `VITE_FIREBASE_STORAGE_BUCKET=...`
   - `VITE_FIREBASE_APP_ID=...`

---

## 8. Separate Ingestion Worker Deployment (Railway / Render / Docker)

Because Vercel serverless functions have execution limits (10s on Hobby, 60s on Pro) and 200 MB PDF chunking/embedding can take 1–3 minutes, **the ingestion worker must be deployed separately** on a persistent runtime:

### Option A: Railway (Free / Hobby)
1. In Railway, click **New Project** > **Deploy from GitHub repo**.
2. Set Root Directory to `/`.
3. Set Start Command:
   ```bash
   node backend/src/workers/ingestionWorker.js
   ```
4. Add environment variables: `MONGODB_URI`, `STORAGE_PROVIDER`, `FILEBASE_*`, `GEMINI_API_KEY`.

### Option B: Docker Container
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev
COPY backend/ ./backend/
CMD ["node", "backend/src/workers/ingestionWorker.js"]
```

---

## 9. Troubleshooting & FAQ

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **CORS 403 Forbidden** | Request origin not in whitelist | Ensure `FRONTEND_URL` is set or request originates from `localhost:5173` or `*.vercel.app`. |
| **CORS on Direct S3 Upload** | Missing CORS on Filebase bucket | Run `npm --prefix backend run configure:cors` or add CORS rule in Filebase Console. |
| **`PRODUCTION_STORAGE_UNCONFIGURED`** | Production started with local storage | Set `STORAGE_PROVIDER=filebase` (or `firebase`/`r2`) and provide cloud credentials. |
| **Gemini 429 Rate Limit** | Free tier exceeded (1,000 req/day) | The worker automatically handles 429 retry backoff. Consider upgrading to pay-as-you-go or spacing uploads. |
| **Vector Search Returns 0 Chunks** | Atlas search index missing | Ensure `syllabus_vector_index` is created on collection `syllabuschunks` with `numDimensions: 768`. |

