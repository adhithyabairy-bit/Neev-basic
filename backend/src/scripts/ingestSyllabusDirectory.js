/**
 * Production-Ready Resumable Syllabus Collection Ingestion CLI
 *
 * Designed to safely ingest collections of textbook PDFs (up to ~200MB) without memory exhaustion:
 * - Processes files one-by-one in bounded memory buffers.
 * - Enforces explicit teacher, subject, and grade metadata (no silent defaults).
 * - Implements SHA-256 hash deduplication to skip already-indexed documents.
 * - Supports --dry-run mode to preview chunks, token counts, and storage usage without modifying DB.
 * - Supports --sample=<n> mode for test runs before full ingestion.
 * - Detects scanned PDFs and flags them as ocr_required instead of reporting false successes.
 * - Enforces explicit confirmation (--confirm-full) for large batch runs (>10 files).
 *
 * Usage:
 *   # Dry-run check:
 *   node src/scripts/ingestSyllabusDirectory.js --dir=./data/syllabus --teacherEmail="teacher@example.com" --subject="Mathematics" --grade="Grade 8" --dry-run
 *
 *   # Small sample ingestion (2 files):
 *   node src/scripts/ingestSyllabusDirectory.js --dir=./data/syllabus --teacherEmail="teacher@example.com" --subject="Mathematics" --grade="Grade 8" --sample=2
 *
 *   # Full ingestion with confirmation:
 *   node src/scripts/ingestSyllabusDirectory.js --dir=./data/syllabus --teacherEmail="teacher@example.com" --subject="Mathematics" --grade="Grade 8" --confirm-full
 */

import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import connectDB, { disconnectDB } from '../config/db.js';
import Teacher from '../models/Teacher.js';
import SyllabusDocument from '../models/SyllabusDocument.js';
import { ingestSyllabusFile, computeBufferHash } from '../services/rag/ingestionService.js';
import { extractPdfText } from '../services/extraction/extractionService.js';
import { chunkDocumentPages } from '../services/rag/chunkingService.js';
import embeddingService from '../services/rag/embeddingService.js';

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const parts = arg.slice(2).split('=');
      const key = parts[0];
      const val = parts.length > 1 ? parts.slice(1).join('=') : true;
      args[key] = val;
    }
  });
  return args;
}

async function run() {
  const args = parseArgs();
  const dirPath = args.dir || process.env.SYLLABUS_COLLECTION_DIR || './data/syllabus';
  const isDryRun = Boolean(args['dry-run'] || args.dryRun);
  const sampleLimit = args.sample ? parseInt(args.sample, 10) : null;
  const isConfirmed = Boolean(args['confirm-full'] || args.confirmFull);
  const forceReingest = Boolean(args.force || args.forceReingest);

  console.log('='.repeat(78));
  console.log('Neev — Resumable Production Syllabus Ingestion Pipeline');
  console.log('='.repeat(78));

  // 1. Mandatory Metadata Validation (Strict: Never silently default teacher, subject, or grade)
  const teacherEmail = args.teacherEmail || process.env.INGESTION_TEACHER_EMAIL;
  const teacherId = args.teacherId || process.env.INGESTION_TEACHER_ID;
  const subject = args.subject;
  const grade = args.grade;
  const lessonName = args.lessonName || '';

  if (!teacherEmail && !teacherId) {
    console.error('\n[VALIDATION ERROR] Teacher identifier is required.');
    console.error('Please specify --teacherEmail="educator@school.org" or --teacherId="<ObjectId>".');
    console.error('Neev never assigns syllabus documents to arbitrary default teachers.');
    process.exit(1);
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    console.error('\n[VALIDATION ERROR] Subject parameter is mandatory.');
    console.error('Please specify --subject="Mathematics" (or appropriate curriculum subject).');
    process.exit(1);
  }

  if (!grade || typeof grade !== 'string' || !grade.trim()) {
    console.error('\n[VALIDATION ERROR] Grade level parameter is mandatory.');
    console.error('Please specify --grade="Grade 8" (or appropriate curriculum level).');
    process.exit(1);
  }

  // 2. Connect Database
  await connectDB();

  // Validate teacher in DB
  let teacher = null;
  if (teacherId) {
    teacher = await Teacher.findById(teacherId);
  } else if (teacherEmail) {
    teacher = await Teacher.findOne({ email: teacherEmail.trim().toLowerCase() });
  }

  if (!teacher) {
    console.error(`\n[AUTH ERROR] Teacher account '${teacherEmail || teacherId}' not found in MongoDB.`);
    console.error('Please register the teacher profile before ingesting curriculum documents.');
    await disconnectDB();
    process.exit(1);
  }

  console.log(`[Config] Authenticated Teacher : ${teacher.name || teacher.email} (${teacher._id})`);
  console.log(`[Config] Target Subject       : ${subject}`);
  console.log(`[Config] Grade Level          : ${grade}`);
  console.log(`[Config] Directory Path       : ${path.resolve(dirPath)}`);
  console.log(`[Config] Mode                 : ${isDryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION WRITE'}`);
  console.log(`[Config] Embedding Provider   : ${embeddingService.getProvider()} (${embeddingService.getModelName()}, ${embeddingService.getDimension()}d)`);
  if (sampleLimit) {
    console.log(`[Config] Sample Limit         : ${sampleLimit} file(s) max`);
  }
  console.log('-'.repeat(78));

  // Check directory existence
  if (!fs.existsSync(dirPath)) {
    console.log(`Notice: Directory '${dirPath}' does not exist.`);
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory at '${path.resolve(dirPath)}'. Place PDF/TXT files there and re-run.`);
    await disconnectDB();
    return;
  }

  // Scan files
  let fileList = fs
    .readdirSync(dirPath)
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.pdf' || ext === '.txt';
    })
    .sort();

  if (fileList.length === 0) {
    console.log(`No supported PDF or TXT files found in '${path.resolve(dirPath)}'.`);
    await disconnectDB();
    return;
  }

  // Large batch confirmation check
  if (fileList.length > 10 && !sampleLimit && !isDryRun && !isConfirmed) {
    console.warn(`\n[OPERATOR CONFIRMATION REQUIRED]`);
    console.warn(`Discovered ${fileList.length} documents in collection directory.`);
    console.warn(`To prevent unexpected API usage or resource spikes, bulk ingestion of >10 files`);
    console.warn(`requires the --confirm-full flag, or test a sample with --sample=2 first.`);
    console.warn(`Example: node src/scripts/ingestSyllabusDirectory.js --confirm-full ...\n`);
    await disconnectDB();
    process.exit(1);
  }

  if (sampleLimit && sampleLimit > 0) {
    fileList = fileList.slice(0, sampleLimit);
  }

  console.log(`Processing ${fileList.length} document(s)...\n`);

  // Progress metrics
  let processedCount = 0;
  let skippedCount = 0;
  let ocrRequiredCount = 0;
  let failedCount = 0;
  let totalChunksCreated = 0;
  let totalBytesProcessed = 0;
  const failureDetails = [];

  for (let i = 0; i < fileList.length; i++) {
    const fileName = fileList[i];
    const fullPath = path.join(dirPath, fileName);
    const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain';

    process.stdout.write(`[${i + 1}/${fileList.length}] Processing '${fileName}'... `);

    try {
      const stats = fs.statSync(fullPath);
      totalBytesProcessed += stats.size;

      // Stream/buffer single file into memory
      const fileBuffer = fs.readFileSync(fullPath);
      const fileHash = computeBufferHash(fileBuffer);

      // Check if already indexed
      const existingDoc = await SyllabusDocument.findOne({ teacherId: teacher._id, fileHash });
      if (existingDoc && existingDoc.status === 'completed' && !forceReingest) {
        console.log(`SKIPPED (Already indexed by SHA-256: ${existingDoc.chunkCount} chunks)`);
        skippedCount++;
        continue;
      }

      if (isDryRun) {
        // DRY-RUN MODE: Parse and segment without DB write or embedding API call
        if (mimeType === 'application/pdf') {
          const pdfData = await extractPdfText(fileBuffer);
          const textLen = (pdfData.text || '').trim().length;

          if (textLen < 40) {
            console.log(`OCR REQUIRED (Scanned PDF detected, 0 digital text)`);
            ocrRequiredCount++;
            continue;
          }

          const pages = pdfData.pages || [{ pageNumber: 1, text: pdfData.text }];
          const simulatedChunks = chunkDocumentPages(pages);
          console.log(`DRY-RUN OK (~${simulatedChunks.length} chunks, ${(stats.size / 1024).toFixed(1)} KB)`);
          totalChunksCreated += simulatedChunks.length;
          processedCount++;
        } else {
          const text = fileBuffer.toString('utf-8');
          const simulatedChunks = chunkDocumentPages([{ pageNumber: 1, text }]);
          console.log(`DRY-RUN OK (~${simulatedChunks.length} chunks)`);
          totalChunksCreated += simulatedChunks.length;
          processedCount++;
        }
        continue;
      }

      // PRODUCTION WRITE MODE: Execute real ingestion pipeline
      const result = await ingestSyllabusFile({
        teacherId: teacher._id,
        buffer: fileBuffer,
        originalName: fileName,
        mimeType,
        grade,
        subject,
        lessonName,
        forceReingest,
      });

      if (result.alreadyExisted) {
        console.log(`SKIPPED (Reused ${result.document.chunkCount} chunks)`);
        skippedCount++;
      } else {
        console.log(`SUCCESS (${result.chunkCount} chunks indexed)`);
        totalChunksCreated += result.chunkCount;
        processedCount++;
      }
    } catch (err) {
      if (err.message && err.message.includes('SCANNED_PDF_DETECTED')) {
        console.log(`OCR REQUIRED (No text layer found)`);
        ocrRequiredCount++;
      } else {
        console.log(`FAILED (${err.message})`);
        failedCount++;
        failureDetails.push({ file: fileName, error: err.message });
      }
    }
  }

  // 3. Final Summary Report
  const dimension = embeddingService.getDimension();
  const vectorBytesPerChunk = dimension * 8; // Float64 BSON array
  const textBytesPerChunk = 700; // Average chunk text bytes
  const estimatedMongoStorageBytes = totalChunksCreated * (vectorBytesPerChunk + textBytesPerChunk + 200);

  console.log('\n' + '='.repeat(78));
  console.log('INGESTION SUMMARY REPORT');
  console.log('='.repeat(78));
  console.log(`Total Documents Scanned : ${fileList.length}`);
  console.log(`Successfully Indexed    : ${processedCount}`);
  console.log(`Skipped (Deduplicated)  : ${skippedCount}`);
  console.log(`OCR Required (Scanned)  : ${ocrRequiredCount}`);
  console.log(`Failed Processing       : ${failedCount}`);
  console.log(`Total Chunks Created    : ${totalChunksCreated}`);
  console.log(`Embedding Dimensions    : ${dimension}d (${embeddingService.getModelName()})`);
  console.log(`Corpus Bytes Read       : ${(totalBytesProcessed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Est. Vector Mongo Store : ${(estimatedMongoStorageBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Est. Cloud R2 Storage   : ${(totalBytesProcessed / (1024 * 1024)).toFixed(2)} MB`);
  console.log('='.repeat(78));

  if (failureDetails.length > 0) {
    console.log('\nFailure Details:');
    failureDetails.forEach((f) => console.log(` - ${f.file}: ${f.error}`));
  }

  await disconnectDB();
}

run().catch(async (err) => {
  console.error('\n[FATAL INGESTION ERROR]:', err);
  try {
    await disconnectDB();
  } catch (_) {}
  process.exit(1);
});
