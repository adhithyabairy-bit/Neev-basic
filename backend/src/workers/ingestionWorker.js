import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import IngestionJob from '../models/IngestionJob.js';
import SyllabusDocument from '../models/SyllabusDocument.js';
import SyllabusChunk from '../models/SyllabusChunk.js';
import storageService from '../services/storage/storageService.js';
import { extractPdfText } from '../services/extraction/extractionService.js';
import { chunkDocumentPages } from '../services/rag/chunkingService.js';
import embeddingService from '../services/rag/embeddingService.js';

const WORKER_ID = `worker_${process.pid}_${crypto.randomUUID().slice(0, 6)}`;
const STALE_JOB_TIMEOUT_MS = parseInt(process.env.WORKER_STALE_TIMEOUT_MS, 10) || 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS, 10) || 3000;
const BATCH_SIZE = 16;

let isRunning = false;
let loopTimeout = null;

/**
 * Recovers jobs that were claimed by a crashed worker and never completed.
 */
export async function recoverStaleJobs(staleTimeoutMs = STALE_JOB_TIMEOUT_MS) {
  const cutoffTime = new Date(Date.now() - staleTimeoutMs);

  const staleJobs = await IngestionJob.find({
    status: { $in: ['claimed', 'processing'] },
    claimedAt: { $lt: cutoffTime },
  });

  let recoveredCount = 0;
  for (const job of staleJobs) {
    if (job.attempts < job.maxAttempts) {
      job.status = 'queued';
      job.claimedBy = null;
      job.claimedAt = null;
      job.errorDetails = `Recovered from stale lock. Previous worker did not heartbeat within ${staleTimeoutMs / 1000}s.`;
      await job.save();
      recoveredCount++;
    } else {
      job.status = 'failed';
      job.errorDetails = `Job exceeded max attempts (${job.maxAttempts}) and timed out.`;
      await job.save();

      await SyllabusDocument.updateOne(
        { _id: job.documentId },
        { status: 'failed', errorDetails: job.errorDetails }
      );
    }
  }

  if (recoveredCount > 0) {
    console.log(`[Worker ${WORKER_ID}] Recovered ${recoveredCount} stale ingestion jobs.`);
  }
  return recoveredCount;
}

/**
 * Atomically claims the next pending queued job.
 */
export async function claimNextJob(workerId = WORKER_ID) {
  const job = await IngestionJob.findOneAndUpdate(
    {
      status: 'queued',
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    },
    {
      $set: {
        status: 'claimed',
        claimedBy: workerId,
        claimedAt: new Date(),
        startedAt: new Date(),
      },
      $inc: { attempts: 1 },
    },
    {
      sort: { createdAt: 1 },
      returnDocument: 'after',
    }
  );

  return job;
}

/**
 * Downloads a file stream from cloud storage to a temporary file on disk,
 * calculating the SHA-256 hash incrementally.
 */
async function downloadToTempFile(storageKey) {
  const tempFileName = `neev-ingest-${Date.now()}-${crypto.randomUUID()}.pdf`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  const readStream = await storageService.getFileStream(storageKey);
  const writeStream = fs.createWriteStream(tempFilePath);
  const hash = crypto.createHash('sha256');

  return new Promise((resolve, reject) => {
    readStream.on('data', (chunk) => {
      hash.update(chunk);
    });

    readStream.on('error', (err) => {
      writeStream.destroy();
      reject(new Error(`Storage stream download error: ${err.message}`));
    });

    writeStream.on('error', (err) => {
      reject(new Error(`Temp file write error: ${err.message}`));
    });

    writeStream.on('finish', () => {
      const fileHash = hash.digest('hex');
      resolve({ tempFilePath, fileHash });
    });

    readStream.pipe(writeStream);
  });
}

/**
 * Safely removes a temporary file from disk.
 */
async function cleanupTempFile(tempFilePath) {
  if (tempFilePath && fs.existsSync(tempFilePath)) {
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (err) {
      console.warn(`[Worker ${WORKER_ID}] Warning: Failed to cleanup temp file at ${tempFilePath}:`, err.message);
    }
  }
}

/**
 * Updates job and document progress in MongoDB.
 */
async function updateJobProgress(job, document, step, percentage, extra = {}) {
  job.status = 'processing';
  job.progress = {
    ...job.progress,
    step,
    percentage: Math.min(100, Math.max(0, percentage)),
    ...extra,
  };
  await job.save();

  if (document) {
    document.status = 'processing';
    await document.save();
  }
}

/**
 * Processes a single claimed ingestion job end-to-end.
 */
export async function processJob(job, workerId = WORKER_ID) {
  let tempFilePath = null;
  const document = await SyllabusDocument.findById(job.documentId);

  if (!document) {
    job.status = 'failed';
    job.errorDetails = `Document ${job.documentId} no longer exists in database.`;
    await job.save();
    return { success: false, reason: 'DOCUMENT_NOT_FOUND' };
  }

  try {
    console.log(`[Worker ${workerId}] Processing Job ${job.jobId} for document '${document.fileName}' (${document._id})...`);

    // 1. Download file stream to temp disk storage
    await updateJobProgress(job, document, 'downloading', 10);
    const downloadResult = await downloadToTempFile(job.storageKey);
    tempFilePath = downloadResult.tempFilePath;
    const fileHash = downloadResult.fileHash;

    // Persist fileHash on document
    document.fileHash = fileHash;
    await document.save();

    // 2. Check for existing identical document for this teacher (deduplication)
    const existingDoc = await SyllabusDocument.findOne({
      _id: { $ne: document._id },
      teacherId: document.teacherId,
      fileHash: fileHash,
      status: 'completed',
    });

    if (existingDoc && existingDoc.chunkCount > 0) {
      console.log(`[Worker ${workerId}] Found existing indexed document (${existingDoc._id}) with identical hash. Reusing vector index.`);

      // Copy existing chunks for this new document record to maintain document integrity
      const existingChunks = await SyllabusChunk.find({ documentId: existingDoc._id }).lean();
      if (existingChunks.length > 0) {
        const clonedChunks = existingChunks.map((c) => {
          const { _id, ...rest } = c;
          return {
            ...rest,
            chunkId: `${document._id}_chunk_${c.chunkIndex}`,
            documentId: document._id,
            sourceFileName: document.fileName,
          };
        });
        await SyllabusChunk.insertMany(clonedChunks);
      }

      document.chunkCount = existingChunks.length;
      document.pageCount = existingDoc.pageCount || 1;
      document.status = 'completed';
      document.errorDetails = null;
      await document.save();

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = {
        step: 'completed',
        percentage: 100,
        chunksTotal: existingChunks.length,
        chunksCreated: existingChunks.length,
        pagesTotal: document.pageCount,
        pagesProcessed: document.pageCount,
      };
      await job.save();

      return { success: true, chunkCount: existingChunks.length, reused: true };
    }

    // 3. Extract text from PDF file buffer read from temp file
    await updateJobProgress(job, document, 'extracting', 30);
    const fileBuffer = await fs.promises.readFile(tempFilePath);

    let pages = [];
    if (document.mimeType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
      const pdfData = await extractPdfText(fileBuffer);
      pages = pdfData.pages || [{ pageNumber: 1, text: pdfData.text }];
      document.pageCount = pdfData.pageCount || pages.length;

      // Scanned PDF detection
      const totalTextLen = (pdfData.text || '').trim().length;
      if (totalTextLen < 40) {
        document.status = 'ocr_required';
        document.errorDetails = 'Document contains no digital text layer (scanned PDF). OCR extraction is required.';
        await document.save();

        job.status = 'failed';
        job.errorDetails = 'SCANNED_PDF_DETECTED: Document has no readable text layer. OCR processing is required.';
        await job.save();

        return { success: false, reason: 'OCR_REQUIRED' };
      }
    } else {
      // Plain text document
      const textContent = fileBuffer.toString('utf-8');
      pages = [{ pageNumber: 1, text: textContent }];
      document.pageCount = 1;
    }

    await updateJobProgress(job, document, 'chunking', 50, {
      pagesTotal: document.pageCount,
      pagesProcessed: document.pageCount,
    });

    // 4. Split extracted text into bounded overlapping chunks
    const rawChunks = chunkDocumentPages(pages);
    if (rawChunks.length === 0) {
      throw new Error('Syllabus document contains no extractable text content.');
    }

    // Delete any old chunks for this document before inserting (prevents duplicate vectors on retry)
    await SyllabusChunk.deleteMany({ documentId: document._id });

    // 5. Generate embeddings in bounded batches
    const currentModel = embeddingService.getModelName();
    const currentDimension = embeddingService.getDimension();
    const chunkDocsToInsert = [];

    for (let i = 0; i < rawChunks.length; i += BATCH_SIZE) {
      const batch = rawChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.chunkText);

      const batchPercentage = 50 + Math.round(((i + batch.length) / rawChunks.length) * 40);
      await updateJobProgress(job, document, 'embedding', batchPercentage, {
        chunksTotal: rawChunks.length,
        chunksCreated: chunkDocsToInsert.length,
      });

      const embeddings = await embeddingService.generateBatchEmbeddings(texts);

      batch.forEach((c, idx) => {
        const chunkHash = crypto.createHash('sha256').update(c.chunkText).digest('hex');
        const chunkId = `${document._id}_chunk_${c.chunkIndex}`;

        chunkDocsToInsert.push({
          chunkId,
          documentId: document._id,
          teacherId: document.teacherId,
          classId: document.classId,
          grade: document.grade || '',
          subject: document.subject || '',
          lessonName: document.lessonName || '',
          sourceFileName: document.fileName,
          pageNumber: c.pageNumber,
          pageRange: c.pageRange || String(c.pageNumber),
          chunkIndex: c.chunkIndex,
          chunkText: c.chunkText,
          contentHash: chunkHash,
          embedding: embeddings[idx] || [],
          embeddingModel: currentModel,
          embeddingVersion: 'v1',
          embeddingDimensions: currentDimension,
          status: 'indexed',
        });
      });
    }

    // 6. Bulk insert chunks into MongoDB
    await updateJobProgress(job, document, 'indexing', 95, {
      chunksTotal: rawChunks.length,
      chunksCreated: chunkDocsToInsert.length,
    });

    await SyllabusChunk.insertMany(chunkDocsToInsert);

    // 7. Update document status to completed
    document.chunkCount = chunkDocsToInsert.length;
    document.embeddingModel = currentModel;
    document.embeddingDimensions = currentDimension;
    document.status = 'completed';
    document.errorDetails = null;
    await document.save();

    // 8. Update job to completed
    job.status = 'completed';
    job.completedAt = new Date();
    job.progress = {
      step: 'completed',
      percentage: 100,
      pagesTotal: document.pageCount,
      pagesProcessed: document.pageCount,
      chunksTotal: chunkDocsToInsert.length,
      chunksCreated: chunkDocsToInsert.length,
    };
    await job.save();

    console.log(`[Worker ${workerId}] Successfully completed Job ${job.jobId}: ${chunkDocsToInsert.length} chunks indexed (${currentDimension}d).`);
    return { success: true, chunkCount: chunkDocsToInsert.length, reused: false };
  } catch (err) {
    console.error(`[Worker ${workerId}] Ingestion failed for Job ${job.jobId}:`, err.message);

    const isPermanent = job.attempts >= job.maxAttempts;

    job.errorDetails = `Ingestion error: ${err.message}`;
    job.status = isPermanent ? 'failed' : 'queued';
    job.progress.step = isPermanent ? 'failed' : 'queued';
    await job.save();

    document.status = isPermanent ? 'failed' : 'queued';
    document.errorDetails = `Ingestion failed: ${err.message}`;
    await document.save();

    // Clean up partial chunks on failure
    await SyllabusChunk.deleteMany({ documentId: document._id });

    return { success: false, error: err.message, permanent: isPermanent };
  } finally {
    // Guaranteed disk cleanup
    await cleanupTempFile(tempFilePath);
  }
}

/**
 * Claims and processes the next available job in the queue.
 */
export async function processNextJob(workerId = WORKER_ID) {
  // First recover any stale jobs from crashed instances
  await recoverStaleJobs();

  const job = await claimNextJob(workerId);
  if (!job) {
    return null;
  }

  const result = await processJob(job, workerId);
  return { jobId: job.jobId, ...result };
}

/**
 * Starts continuous polling loop for background ingestion.
 */
export async function startWorker(options = {}) {
  const pollInterval = options.pollIntervalMs || POLL_INTERVAL_MS;
  const workerId = options.workerId || WORKER_ID;

  isRunning = true;
  console.log(`[Worker ${workerId}] Started background ingestion worker. Polling interval: ${pollInterval}ms.`);

  const loop = async () => {
    if (!isRunning) return;

    // Check database connection before querying Mongoose models to prevent buffering timeouts
    if (mongoose.connection.readyState !== 1) {
      console.warn(`[Worker ${workerId}] Database disconnected (state=${mongoose.connection.readyState}). Reconnecting...`);
      try {
        await connectDB();
      } catch (err) {
        console.warn(`[Worker ${workerId}] Reconnect attempt failed: ${err.message}`);
      }
      loopTimeout = setTimeout(loop, 5000);
      return;
    }

    try {
      const processed = await processNextJob(workerId);
      if (processed) {
        // If we processed a job, check immediately for next one without waiting
        loopTimeout = setTimeout(loop, 100);
        return;
      }
    } catch (err) {
      console.error(`[Worker ${workerId}] Polling loop error:`, err.message);
    }

    loopTimeout = setTimeout(loop, pollInterval);
  };

  loop();
}

/**
 * Stops the continuous polling loop cleanly.
 */
export function stopWorker() {
  isRunning = false;
  if (loopTimeout) {
    clearTimeout(loopTimeout);
    loopTimeout = null;
  }
  console.log(`[Worker] Stopped background ingestion worker.`);
}

// Standalone CLI execution: node src/workers/ingestionWorker.js [--once]
if (process.argv[1] && process.argv[1].endsWith('ingestionWorker.js')) {
  const conn = await connectDB();
  if (!conn || mongoose.connection.readyState !== 1) {
    console.warn('[Worker CLI] Notice: Database connection is not ready. Worker will auto-retry connecting during poll loop.');
  }
  const runOnce = process.argv.includes('--once');

  if (runOnce) {
    console.log(`[Worker CLI] Running single pass (--once)...`);
    const res = await processNextJob();
    console.log('[Worker CLI] Pass result:', res || 'No pending jobs in queue.');
    process.exit(0);
  } else {
    startWorker();
  }
}

export default {
  startWorker,
  stopWorker,
  processNextJob,
  processJob,
  claimNextJob,
  recoverStaleJobs,
};

