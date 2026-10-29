# Neev — Phase 5: Resumable Syllabus Ingestion Guide (~200MB Corpus)

This guide documents the procedures for indexing a large collection of syllabus curriculum PDFs (approx. 200 MB) into Cloudflare R2 and MongoDB Atlas without memory exhaustion, quota overages, or unexpected API charges.

---

## 1. Zero-Budget Storage & Memory Strategy

### Why we do NOT ingest the entire 200 MB collection automatically:
1. **Memory Safety**: 200 MB of PDFs contains thousands of pages. Processing the entire collection in one process memory heap can cause `JavaScript heap out of memory` on development laptops or CI/CD pipelines.
2. **MongoDB Atlas M0 Free Tier (512 MB Limit)**:
   - 200 MB of raw PDFs contains ~40–50 MB of plain text $\approx 55,000$ to $65,000$ chunks.
   - 768-dimensional float embeddings (Google Gemini `text-embedding-004`) require ~6.1 KB per chunk in BSON.
   - Total vector storage for 55,000 chunks $\approx 340\text{ MB}$.
   - Text + index metadata $\approx 100\text{ MB}$.
   - **Total**: ~440 MB. This fits in the 512 MB Atlas free tier, but leaves little margin if multiple duplicate copies or unneeded grades are indexed simultaneously.
3. **API Rate Limits**: Cloud embedding APIs impose requests-per-minute (RPM) limits on free-tier keys. Bounded batching and rate-limit backoff are required.

---

## 2. Pre-Ingestion Checklist

Before running the ingestion pipeline:

1. [x] **Teacher Account Created**: Ensure a teacher record exists in MongoDB (or register via `/register`). Note down the teacher's email address.
2. [x] **Files Placed in Directory**: Place your PDF or TXT syllabus files into a designated folder (e.g. `./data/syllabus` or `C:\SyllabusData`).
3. [x] **Mandatory Metadata Identified**:
   - `--teacherEmail`: e.g. `teacher@school.org` (Mandatory: Neev never assigns documents to arbitrary teachers).
   - `--subject`: e.g. `Mathematics` (Mandatory).
   - `--grade`: e.g. `Grade 8` (Mandatory).

---

## 3. Step-by-Step Execution Workflow

### Step 1: Pre-Flight Dry Run (`--dry-run`)
Simulates the entire pipeline: scans all documents, extracts and chunks text, computes SHA-256 hashes, and calculates storage estimates **without writing to MongoDB or invoking external embedding APIs**.

```powershell
# From the backend directory
npm run ingest:syllabus -- --dir="./data/syllabus" --teacherEmail="teacher@school.org" --subject="Mathematics" --grade="Grade 8" --dry-run
```

**Expected Dry-Run Output**:
```
==============================================================================
Neev — Resumable Production Syllabus Ingestion Pipeline
==============================================================================
[Config] Authenticated Teacher : Teacher Name (6721...)
[Config] Target Subject       : Mathematics
[Config] Grade Level          : Grade 8
[Config] Mode                 : DRY-RUN (Simulated)
------------------------------------------------------------------------------
[1/5] Processing 'NCERT-Class8-Maths-Ch1.pdf'... DRY-RUN OK (~38 chunks, 245.2 KB)
[2/5] Processing 'NCERT-Class8-Maths-Ch2.pdf'... DRY-RUN OK (~42 chunks, 310.8 KB)
...
==============================================================================
INGESTION SUMMARY REPORT
==============================================================================
Total Documents Scanned : 5
Successfully Indexed    : 5 (Simulated)
Total Chunks Created    : 194
Embedding Dimensions    : 768d (text-embedding-004)
Est. Vector Mongo Store : 1.34 MB
Est. Cloud R2 Storage   : 2.15 MB
==============================================================================
```

---

### Step 2: Small Sample Verification (`--sample=2`)
Runs real ingestion and embeddings for only the first 2 files to verify cloud storage connectivity and vector search before committing the entire collection:

```powershell
npm run ingest:syllabus -- --dir="./data/syllabus" --teacherEmail="teacher@school.org" --subject="Mathematics" --grade="Grade 8" --sample=2
```

**Verification Checklist after Sample**:
1. Check Cloudflare R2 bucket: `syllabus/<teacherId>/...` files appear.
2. Check MongoDB `syllabusdocuments`: 2 documents created with `status: 'completed'`.
3. Check MongoDB `syllabuschunks`: Chunks indexed with `embedding` array of length 768.

---

### Step 3: Full Batch Ingestion (`--confirm-full`)
When ingesting more than 10 documents, Neev requires explicit confirmation (`--confirm-full`) to prevent accidental resource overages:

```powershell
npm run ingest:syllabus -- --dir="./data/syllabus" --teacherEmail="teacher@school.org" --subject="Mathematics" --grade="Grade 8" --confirm-full
```

---

## 4. Resilience & Safe Resume Features

### SHA-256 Content Hash Deduplication
Each file is hashed using SHA-256 before processing. If a file with the same content hash already exists for this teacher with `status: 'completed'`, the script prints:
```
[3/50] Checking 'NCERT-Ch3.pdf'... SKIPPED (Already indexed by SHA-256: 38 chunks)
```
- **Zero Duplicate Vectors**: Chunks are never inserted twice.
- **Safe Interruption**: You can press `Ctrl + C` at any time. When you re-run the command, it immediately skips all previously completed files and resumes with the next unprocessed document.

### Scanned PDF Handling
If a PDF contains no digital text layer (e.g. image-only scan with <40 characters of text):
- The document is flagged with status `ocr_required`.
- The CLI reports `OCR REQUIRED (Scanned PDF detected, 0 digital text)`.
- It does NOT produce empty vector chunks or fabricate false successes.

---

## 5. Storage Estimation Formula

For each chunk indexed into MongoDB Atlas:
$$\text{Storage per Chunk} = (\text{Dimension} \times 8\text{ bytes}) + \text{Chunk Text} + \text{Metadata Overhead}$$

- For **Gemini (768d)**: $6,144\text{ bytes} + 750\text{ bytes} + 200\text{ bytes} \approx 7.1\text{ KB/chunk}$.
- For **OpenAI (1536d)**: $12,288\text{ bytes} + 750\text{ bytes} + 200\text{ bytes} \approx 13.2\text{ KB/chunk}$.

To keep the 200 MB corpus within the Atlas M0 512 MB free tier, **Google Gemini 768d (`text-embedding-004`)** is the recommended provider.

