# Neev — Phase 5 Production Setup & Cloud Deployment Guide

This guide details the complete configuration required to run **Neev Phase 5** in a production-ready, cloud-native architecture using **Cloudflare R2** object storage, **Google Gemini** embeddings, **xAI Grok** evaluation, **MongoDB Atlas Vector Search**, and **Vercel** serverless deployment.

---

## 1. Production Environment Variables Reference

Configure these environment variables in your server environment (or Vercel Project Settings > Environment Variables). Copy from `backend/.env.example`:

```ini
# Application Mode & Host
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-neev-app.vercel.app

# Production Security Safeguards (Strict)
ALLOW_MOCK_EMBEDDINGS=false
ALLOW_MOCK_AI=false

# Firebase Admin Configuration (Authentication)
FIREBASE_PROJECT_ID=neev-f681e
# For serverless, paste the JSON key as an escaped string or use Application Default Credentials
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json

# MongoDB Atlas Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/neev?retryWrites=true&w=majority

# ------------------------------------------------------------------------------
# Cloud Object Storage (Firebase Storage 5 GB Free / Filebase 5 GB Free)
# ------------------------------------------------------------------------------
# Option A (Recommended): Firebase Cloud Storage (5 GB Free Tier on existing project)
STORAGE_PROVIDER=firebase
FIREBASE_PROJECT_ID=neev-f681e
FIREBASE_STORAGE_BUCKET=neev-f681e.firebasestorage.app

# Option B: Filebase (5 GB Free Tier, Free Egress S3-Compatible - https://filebase.com)
# STORAGE_PROVIDER=filebase
# FILEBASE_ENDPOINT=https://s3.filebase.com
# FILEBASE_ACCESS_KEY_ID=your-filebase-key
# FILEBASE_SECRET_ACCESS_KEY=your-filebase-secret
# FILEBASE_BUCKET_NAME=your-bucket-name

# Option C: Cloudflare R2 (10 GB Free Tier, Free Egress)
# STORAGE_PROVIDER=r2
# R2_ACCOUNT_ID=your-cloudflare-account-id
# R2_ACCESS_KEY_ID=your-r2-access-key-id
# R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
# R2_BUCKET_NAME=neev-syllabus-prod

# ------------------------------------------------------------------------------
# Cloud Embedding Provider (Google Gemini text-embedding-004)
# ------------------------------------------------------------------------------
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=768
EMBEDDING_TIMEOUT_MS=20000

# ------------------------------------------------------------------------------
# AI Pedagogical Evaluation (xAI Grok API)
# ------------------------------------------------------------------------------
GROK_API_KEY=xai-your-grok-api-key-here
GROK_MODEL=grok-2-latest
GROK_TIMEOUT_MS=30000

# ------------------------------------------------------------------------------
# Atlas Vector Search Configuration
# ------------------------------------------------------------------------------
ATLAS_VECTOR_INDEX_NAME=syllabus_vector_index
```

---

## 2. Cloud Object Storage Setup (Firebase 5 GB Free / Filebase 5 GB Free)

### Option A (Recommended): Firebase Cloud Storage (5 GB Free Tier)
Neev already utilizes Firebase Authentication (`neev-f681e`). Firebase Storage provides **5 GB of storage on Google Cloud Storage for free** under the Spark plan.

#### Step 1: Enable Storage in Firebase Console
1. Go to the [Firebase Console](https://console.firebase.google.com/) and open project `neev-f681e`.
2. In the Build menu, select **Storage** > click **Get started**.
3. Choose **Start in production mode** (all files private by default).
4. Select your Cloud Storage location (e.g. `asia-south1` or `us-central1`).
5. Your bucket name will be `neev-f681e.firebasestorage.app` (or `neev-f681e.appspot.com`).

#### Step 2: Configure Environment
In `backend/.env`:
```ini
STORAGE_PROVIDER=firebase
FIREBASE_PROJECT_ID=neev-f681e
FIREBASE_STORAGE_BUCKET=neev-f681e.firebasestorage.app
```
Firebase Admin SDK authenticates via your existing service account or Google Application Default Credentials.

---

### Option B: Filebase (5 GB Free Tier S3-Compatible, Free Egress)
[Filebase](https://filebase.com/) provides **5 GB of free S3-compatible object storage with free egress**:
- Free Tier: 5 GB storage, 5 GB bandwidth, 1 Bucket, 1 Access Key Pair, All S3 endpoints.

#### Configuration for Filebase:
1. Create a free account at [Filebase](https://filebase.com/).
2. Create 1 bucket (e.g. `neev-syllabus`).
3. Under **Access Keys**, generate your Key and Secret.
4. Set in `backend/.env`:
```ini
STORAGE_PROVIDER=filebase
FILEBASE_ENDPOINT=https://s3.filebase.com
FILEBASE_ACCESS_KEY_ID=your-filebase-access-key
FILEBASE_SECRET_ACCESS_KEY=your-filebase-secret-key
FILEBASE_BUCKET_NAME=neev-syllabus
```

---

### Option C: Cloudflare R2 (10 GB Free Tier, Free Egress)
If you prefer Cloudflare R2:
```ini
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=neev-syllabus-prod
```

---

## 3. MongoDB Atlas Vector Search Index Setup

Atlas Vector Search indexes the 768-dimensional embeddings generated by Google Gemini `text-embedding-004` (or 1536d if using OpenAI).

### Index Definition (Google Gemini 768d):
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to your cluster > **Atlas Search** tab.
3. Click **Create Search Index** > **Atlas Vector Search (JSON Editor)**.
4. Database: `neev`, Collection: `syllabuschunks`.
5. Index Name: `syllabus_vector_index`.
6. Paste the following definition:

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

> [!NOTE]
> If using OpenAI `text-embedding-3-small`, change `numDimensions` to `1536`.

---

## 4. Vercel Serverless Deployment

Neev is structured for zero-configuration fullstack deployment on Vercel:

### Directory Architecture on Vercel:
```
Neev/
├── api/
│   └── index.js          <-- Serverless entry point running Express API
├── frontend/
│   └── dist/             <-- Static client bundle compiled via Vite
├── vercel.json           <-- Routing & rewrite configuration
└── backend/              <-- Core services, models, and controllers
```

### Deployment Steps:
1. Push your code to your GitHub repository:
   ```bash
   git push origin main
   ```
2. In the [Vercel Dashboard](https://vercel.com/), click **Add New Project** and import `Neev-basic`.
3. Configure Build & Output Settings:
   - Framework Preset: **Other** (or Vite)
   - Build Command: `npm --prefix frontend run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install`
4. Add Environment Variables (from Section 1 above):
   - `MONGODB_URI`
   - `FIREBASE_PROJECT_ID`
   - `STORAGE_PROVIDER` (`r2`)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - `EMBEDDING_PROVIDER` (`gemini`)
   - `GEMINI_API_KEY`
   - `GROK_API_KEY`
   - `ALLOW_MOCK_EMBEDDINGS` (`false`)
   - `ALLOW_MOCK_AI` (`false`)
5. Click **Deploy**.

---

## 5. Free-Tier Allowances & Budget Limitations

| Resource | Free Tier Allowance | Neev Usage Profile | Status |
| :--- | :--- | :--- | :--- |
| **Cloudflare R2** | 10 GB storage, 10M reads, 1M writes/month | ~200 MB syllabus corpus + student scans | **Well within free limits** ($0/mo) |
| **MongoDB Atlas (M0)** | 512 MB shared RAM/storage | ~350 MB for 57,000 chunks (768d Gemini) | **Fits when scoped to target grades** |
| **Google Gemini API** | 1500 Requests/Day (free tier) | Chunks processed in 16-item batches | **Free during development/testing** |
| **xAI Grok API** | Standard token pricing ($5 free credit) | Evaluation prompts strictly bounded | **Controlled via max token limits** |
| **Vercel Hobby** | 100 GB bandwidth, Serverless functions | Frontend static + Express API | **Free within personal use terms** |

