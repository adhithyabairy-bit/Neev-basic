# Neev — Phase 4 Setup & Configuration Guide

This guide provides step-by-step instructions for configuring and running the **Phase 4: Syllabus-Based AI Answer Evaluation and RAG Pipeline**.

---

## 1. Environment Configuration

Copy or update `backend/.env` with the following environment variables:

```ini
# Server Port
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/neev?retryWrites=true&w=majority

# Firebase Admin Configuration (Authentication)
FIREBASE_PROJECT_ID=neev-f681e
# Optional: Path to service account JSON (falls back to project ID or demo emulator if omitted)
# FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebaseServiceAccount.json

# Storage Configuration
LOCAL_STORAGE_PATH=./uploads

# Grok AI Configuration (xAI API)
GROK_API_KEY=xai-your-real-grok-api-key-here
GROK_API_BASE_URL=https://api.x.ai/v1
GROK_MODEL=grok-2-latest
GROK_TIMEOUT_MS=30000

# Embedding & Vector RAG Configuration
# Providers: 'openai', 'gemini', 'mock'
EMBEDDING_PROVIDER=mock
EMBEDDING_API_KEY=your-embedding-api-key-here
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# MongoDB Atlas Vector Search Index Name
ATLAS_VECTOR_INDEX_NAME=vector_index
```

> [!NOTE]
> For offline development and testing, `EMBEDDING_PROVIDER=mock` generates deterministic 1536-dimensional normalized vectors at zero latency and zero cost. For production, set `EMBEDDING_PROVIDER=openai` (or `gemini`) with your API key.

---

## 2. MongoDB Atlas Vector Search Index Definition

To enable sub-second vector similarity retrieval using `$vectorSearch` in MongoDB Atlas:

1. Log in to the [MongoDB Atlas Console](https://cloud.mongodb.com).
2. Navigate to your cluster and click the **Atlas Search** tab.
3. Click **Create Search Index** and select **Atlas Vector Search** (JSON Editor).
4. Select the Database (e.g. `neev`) and Collection: `syllabuschunks`.
5. Name the index `vector_index` (matching `ATLAS_VECTOR_INDEX_NAME` in `.env`).
6. Paste the following JSON definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "teacherId"
    },
    {
      "type": "filter",
      "path": "metadata.subject"
    },
    {
      "type": "filter",
      "path": "metadata.grade"
    }
  ]
}
```

7. Click **Create Vector Search Index**. The index will transition from `Building` to `Active` in 1–2 minutes.

> [!TIP]
> If you are running locally without an active Atlas Vector index, Neev automatically falls back to in-memory cosine similarity and MongoDB `$text` search, ensuring that evaluations continue to work seamlessly during development.

---

## 3. Batch Ingesting the ~200MB Syllabus Collection

To index an entire directory of textbook chapters, curriculum guidelines, and syllabus PDFs:

### Step 1: Place Files in a Directory
Organize your syllabus PDFs or text files into a folder (e.g. `C:\SyllabusData` or `backend/data/syllabus`):
```
C:\SyllabusData\
  ├── NCERT-Class-8-Mathematics.pdf
  ├── NCERT-Class-7-Mathematics-Foundations.pdf
  ├── CBSE-Curriculum-Learning-Outcomes.pdf
  └── ...
```

### Step 2: Run the Ingestion Script
Run the batch CLI command:

```powershell
# From the backend directory
npm run ingest:syllabus -- --dir="C:\SyllabusData" --teacherId="<TEACHER_OBJECT_ID>" --subject="Mathematics" --grade="Grade 8"
```

### Script Options:
| Flag | Description | Default |
| :--- | :--- | :--- |
| `--dir` | Path to directory containing syllabus PDFs/TXTs | `./data/syllabus` |
| `--teacherId` | Target Teacher MongoDB ObjectId | First teacher found in DB |
| `--subject` | Subject tag for filtered RAG retrieval | `'Mathematics'` |
| `--grade` | Target grade / curriculum level | `'Grade 8'` |
| `--board` | Educational board tag | `'CBSE'` |

### Resilience Features:
- **Streaming & Bounded Chunks**: Files are processed one-by-one so RAM usage remains strictly bounded, even for 200MB+ collections.
- **SHA-256 Deduplication**: Files that have already been indexed are automatically detected and skipped. You can safely interrupt and resume the script at any time.

---

## 4. Running the Application

### Start Express Backend:
```powershell
cd c:\Neev\backend
npm run dev
# Server starts on http://localhost:5000
```

### Start Vite React Frontend:
```powershell
cd c:\Neev\frontend
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 5. Verification Checklist

1. [x] **Class & Syllabus (Step 1)**:
   - Configure exam details and click **Save Assessment** (persists in MongoDB Atlas).
   - Ingest syllabus documents or view existing indexed chunks in the RAG store card.
   - Define or edit question rubric with maximum marks validation.
2. [x] **Upload & Extraction (Steps 2 & 3)**:
   - Upload student answer sheet (PDF, JPG, PNG).
   - Inspect raw OCR text and confidence scores.
3. [x] **Teacher Correction & Verification (Step 4)**:
   - Edit student answers if needed.
   - Click **Verify Ground Truth** (sets `status: 'verified'`).
4. [x] **AI Answer Analysis (Step 5)**:
   - Click **Evaluate Student Answers with AI**.
   - Review question-by-question suggested marks, syllabus evidence citations, and observed errors.
   - Click **Approve Score** or adjust marks to approve teacher score.
5. [x] **Class Priorities (Step 10)**:
   - Open Class Gap Overview to inspect aggregated topic mastery and prerequisite-first teaching sequence.

