import crypto from 'crypto';
import SyllabusDocument from '../../models/SyllabusDocument.js';
import SyllabusChunk from '../../models/SyllabusChunk.js';
import { extractPdfText } from '../extraction/extractionService.js';
import { chunkDocumentPages } from './chunkingService.js';
import embeddingService from './embeddingService.js';
import storageService from '../storage/storageService.js';

/**
 * Calculates SHA-256 hash of a file buffer.
 */
export function computeBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Ingests a syllabus file into the persistent knowledge base and cloud object storage.
 *
 * @param {Object} params
 * @param {ObjectId} params.teacherId - Authenticated teacher ID (mandatory)
 * @param {Buffer} params.buffer - File buffer
 * @param {string} params.originalName - File name
 * @param {string} params.mimeType - MIME type
 * @param {string} params.grade - Grade level
 * @param {string} params.subject - Subject
 * @param {string} params.lessonName - Optional topic/lesson name
 * @param {ObjectId|null} params.classId - Optional class ObjectId
 * @param {boolean} params.forceReingest - Whether to re-ingest if already exists
 * @returns {Promise<Object>} Ingested SyllabusDocument
 */
export async function ingestSyllabusFile({
  teacherId,
  buffer,
  originalName,
  mimeType,
  grade = '',
  subject = '',
  lessonName = '',
  classId = null,
  forceReingest = false,
}) {
  if (!teacherId) {
    throw new Error('SECURITY_VIOLATION: Teacher ID is mandatory for syllabus ingestion.');
  }

  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A valid non-empty file buffer is required for syllabus ingestion.');
  }

  const fileHash = computeBufferHash(buffer);
  const fileSize = buffer.length;

  // 1. Check for existing document with identical content hash for this teacher
  let document = await SyllabusDocument.findOne({ teacherId, fileHash });

  if (document && document.status === 'completed' && !forceReingest) {
    return {
      document,
      alreadyExisted: true,
      message: `Document '${originalName}' was already ingested and indexed (${document.chunkCount} chunks). Reusing persistent embeddings.`,
    };
  }

  // 2. Save original PDF/document to storage provider (Cloudflare R2 or local)
  let storageResult;
  try {
    storageResult = await storageService.saveFile({
      buffer,
      originalName,
      mimeType,
      prefix: `syllabus/${teacherId}`,
    });
  } catch (err) {
    throw new Error(`Cloud storage upload failed: ${err.message}`);
  }

  if (!document) {
    document = await SyllabusDocument.create({
      teacherId,
      classId,
      fileName: originalName,
      fileSize,
      fileHash,
      mimeType,
      storageProvider: storageResult.storageProvider || storageService.getProviderName(),
      storageKey: storageResult.storageKey,
      storageBucket: storageResult.bucket || '',
      grade,
      subject,
      lessonName,
      embeddingModel: embeddingService.getModelName(),
      embeddingDimensions: embeddingService.getDimension(),
      status: 'processing',
    });
  } else {
    // If re-ingesting, delete any existing chunks first to prevent duplicates
    await SyllabusChunk.deleteMany({ documentId: document._id });
    document.status = 'processing';
    document.errorDetails = null;
    document.classId = classId || document.classId;
    document.storageProvider = storageResult.storageProvider || document.storageProvider;
    document.storageKey = storageResult.storageKey;
    document.storageBucket = storageResult.bucket || document.storageBucket;
    document.grade = grade || document.grade;
    document.subject = subject || document.subject;
    document.lessonName = lessonName || document.lessonName;
    document.embeddingModel = embeddingService.getModelName();
    document.embeddingDimensions = embeddingService.getDimension();
    await document.save();
  }

  // 3. Extract text from document
  let pages = [];
  try {
    if (mimeType === 'application/pdf') {
      const pdfData = await extractPdfText(buffer);
      pages = pdfData.pages || [{ pageNumber: 1, text: pdfData.text }];

      // Scanned PDF detection: if total extracted text is empty or trivially small
      const totalTextLen = (pdfData.text || '').trim().length;
      if (totalTextLen < 40) {
        document.status = 'ocr_required';
        document.errorDetails =
          'Document contains no readable text layer (scanned PDF). OCR extraction is required before vector indexing.';
        await document.save();
        throw new Error(
          `SCANNED_PDF_DETECTED: '${originalName}' has no readable digital text layer. OCR processing is required.`
        );
      }
    } else if (mimeType.startsWith('text/') || originalName.endsWith('.txt')) {
      const textContent = buffer.toString('utf-8');
      pages = [{ pageNumber: 1, text: textContent }];
    } else {
      throw new Error(`Unsupported syllabus format: ${mimeType}. Please provide PDF or plain text.`);
    }
  } catch (extractErr) {
    if (document.status !== 'ocr_required') {
      document.status = 'failed';
      document.errorDetails = `Extraction failed: ${extractErr.message}`;
      await document.save();
    }
    throw extractErr;
  }

  // 4. Chunk extracted text into bounded overlapping blocks
  const rawChunks = chunkDocumentPages(pages);

  if (rawChunks.length === 0) {
    document.status = 'failed';
    document.errorDetails = 'No extractable text found in syllabus document.';
    await document.save();
    throw new Error('Syllabus document contains no extractable text content.');
  }

  // 5. Generate embeddings in bounded batches
  const BATCH_SIZE = 16;
  const chunkDocsToInsert = [];
  const currentModel = embeddingService.getModelName();
  const currentDimension = embeddingService.getDimension();

  try {
    for (let i = 0; i < rawChunks.length; i += BATCH_SIZE) {
      const batch = rawChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.chunkText);
      const embeddings = await embeddingService.generateBatchEmbeddings(texts);

      batch.forEach((c, idx) => {
        const chunkHash = crypto.createHash('sha256').update(c.chunkText).digest('hex');
        const chunkId = `${document._id}_chunk_${c.chunkIndex}`;

        chunkDocsToInsert.push({
          chunkId,
          documentId: document._id,
          teacherId,
          classId: document.classId,
          grade: document.grade || grade,
          subject: document.subject || subject,
          lessonName: document.lessonName || lessonName,
          sourceFileName: originalName,
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
    await SyllabusChunk.insertMany(chunkDocsToInsert);

    // 7. Update document status to completed
    document.chunkCount = chunkDocsToInsert.length;
    document.status = 'completed';
    document.errorDetails = null;
    await document.save();

    return {
      document,
      alreadyExisted: false,
      chunkCount: chunkDocsToInsert.length,
      message: `Successfully ingested and indexed '${originalName}' into ${chunkDocsToInsert.length} persistent vector chunks (${currentDimension}d).`,
    };
  } catch (err) {
    document.status = 'failed';
    document.errorDetails = `Embedding/Indexing failed: ${err.message}`;
    await document.save();
    // Clean up partial chunks on failure to prevent duplicate/corrupted vectors
    await SyllabusChunk.deleteMany({ documentId: document._id });
    throw err;
  }
}

/**
 * Deletes a syllabus document, its stored cloud object, and all associated indexed chunks.
 */
export async function deleteSyllabusDocument(documentId, teacherId) {
  const document = await SyllabusDocument.findOne({ _id: documentId, teacherId });
  if (!document) {
    return false;
  }

  // Delete stored file from R2/local storage
  if (document.storageKey) {
    await storageService.deleteFile(document.storageKey);
  }

  // Cascade delete chunks
  await SyllabusChunk.deleteMany({ documentId: document._id });

  // Delete document record
  await SyllabusDocument.deleteOne({ _id: document._id });

  return true;
}

export default {
  ingestSyllabusFile,
  deleteSyllabusDocument,
  computeBufferHash,
};
