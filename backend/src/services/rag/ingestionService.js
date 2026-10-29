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
 * Ingests a syllabus file into the persistent knowledge base.
 *
 * @param {Object} params
 * @param {ObjectId} params.teacherId - Authenticated teacher ID
 * @param {Buffer} params.buffer - File buffer
 * @param {string} params.originalName - File name
 * @param {string} params.mimeType - MIME type
 * @param {string} params.grade - Grade level
 * @param {string} params.subject - Subject
 * @param {string} params.lessonName - Optional topic/lesson name
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
  forceReingest = false,
}) {
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

  // Save file to storage provider if not already stored
  let storageResult;
  try {
    storageResult = await storageService.saveFile({
      buffer,
      originalName,
      mimeType,
      prefix: `syllabus-${teacherId}`,
    });
  } catch (err) {
    throw new Error(`Failed to store syllabus document: ${err.message}`);
  }

  if (!document) {
    document = await SyllabusDocument.create({
      teacherId,
      fileName: originalName,
      fileSize,
      fileHash,
      mimeType,
      storageKey: storageResult.storageKey,
      grade,
      subject,
      lessonName,
      status: 'processing',
    });
  } else {
    // If re-ingesting, delete any existing chunks first
    await SyllabusChunk.deleteMany({ documentId: document._id });
    document.status = 'processing';
    document.errorDetails = null;
    document.storageKey = storageResult.storageKey;
    document.grade = grade || document.grade;
    document.subject = subject || document.subject;
    document.lessonName = lessonName || document.lessonName;
    await document.save();
  }

  // 2. Extract text from document
  let pages = [];
  try {
    if (mimeType === 'application/pdf') {
      const pdfData = await extractPdfText(buffer);
      pages = pdfData.pages || [{ pageNumber: 1, text: pdfData.text }];
    } else if (mimeType.startsWith('text/') || originalName.endsWith('.txt')) {
      const textContent = buffer.toString('utf-8');
      pages = [{ pageNumber: 1, text: textContent }];
    } else {
      throw new Error(`Unsupported syllabus format: ${mimeType}. Please provide PDF or plain text.`);
    }
  } catch (extractErr) {
    document.status = 'failed';
    document.errorDetails = `Extraction failed: ${extractErr.message}`;
    await document.save();
    throw extractErr;
  }

  // 3. Chunk extracted text into bounded overlapping blocks
  const rawChunks = chunkDocumentPages(pages);

  if (rawChunks.length === 0) {
    document.status = 'failed';
    document.errorDetails = 'No extractable text found in syllabus document.';
    await document.save();
    throw new Error('Syllabus document contains no extractable text content.');
  }

  // 4. Generate embeddings in bounded batches to avoid exceeding memory/rate limits
  const BATCH_SIZE = 15;
  const chunkDocsToInsert = [];

  try {
    for (let i = 0; i < rawChunks.length; i += BATCH_SIZE) {
      const batch = rawChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.chunkText);
      const embeddings = await embeddingService.generateBatchEmbeddings(texts);

      batch.forEach((c, idx) => {
        chunkDocsToInsert.push({
          documentId: document._id,
          teacherId,
          grade: document.grade || grade,
          subject: document.subject || subject,
          lessonName: document.lessonName || lessonName,
          sourceFileName: originalName,
          pageNumber: c.pageNumber,
          chunkIndex: c.chunkIndex,
          chunkText: c.chunkText,
          embedding: embeddings[idx] || [],
        });
      });
    }

    // 5. Bulk insert chunks into MongoDB
    await SyllabusChunk.insertMany(chunkDocsToInsert);

    // 6. Update document status
    document.chunkCount = chunkDocsToInsert.length;
    document.status = 'completed';
    document.errorDetails = null;
    await document.save();

    return {
      document,
      alreadyExisted: false,
      message: `Successfully ingested and indexed '${originalName}' into ${chunkDocsToInsert.length} persistent chunks.`,
    };
  } catch (err) {
    document.status = 'failed';
    document.errorDetails = `Embedding/Indexing failed: ${err.message}`;
    await document.save();
    // Clean up partial chunks
    await SyllabusChunk.deleteMany({ documentId: document._id });
    throw err;
  }
}

/**
 * Deletes a syllabus document, its stored file, and all associated indexed chunks.
 */
export async function deleteSyllabusDocument(documentId, teacherId) {
  const document = await SyllabusDocument.findOne({ _id: documentId, teacherId });
  if (!document) {
    return false;
  }

  // Delete stored file
  if (document.storageKey) {
    await storageService.deleteFile(document.storageKey);
  }

  // Delete chunks
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

