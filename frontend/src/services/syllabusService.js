/**
 * Neev Platform — Syllabus & Curriculum RAG Management API Service
 * Handles direct-to-cloud uploading, background ingestion status polling,
 * document listing, and cascading deletion.
 */
import apiClient from './apiClient';

export const MAX_FILE_SIZE_MB = 200;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Creates an authorized direct-to-cloud upload session with a short-lived presigned PUT URL.
 */
export async function createUploadSession({
  fileName,
  fileSize,
  mimeType = 'application/pdf',
  grade = '',
  subject = '',
  lessonName = '',
  classId = null,
}) {
  const response = await apiClient.post('/api/syllabus/upload-session', {
    fileName,
    fileSize,
    mimeType,
    grade,
    subject,
    lessonName,
    classId,
  });
  return response.data?.data || response.data;
}

/**
 * Uploads a file directly to the cloud storage provider using HTTP PUT and XMLHttpRequest
 * to stream binary data and track fine-grained upload progress without loading entire file to RAM.
 */
export function uploadFileToCloud(uploadUrl, file, headers = {}, onProgress = null) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);

    // Set headers (e.g., Content-Type)
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        xhr.setRequestHeader(k, v);
      });
    }

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          status: xhr.status,
          statusText: xhr.statusText,
        });
      } else {
        reject(
          new Error(
            `Cloud storage upload failed with HTTP status ${xhr.status}: ${xhr.statusText || 'Upload rejected'}`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during direct cloud upload. Check internet connection and bucket CORS.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Direct cloud upload timed out.'));
    };

    xhr.send(file);
  });
}

/**
 * Notifies the backend that direct cloud upload finished, verifies the cloud object,
 * and enqueues the background ingestion job.
 */
export async function completeUploadSession({
  storageKey,
  fileName,
  grade = '',
  subject = '',
  lessonName = '',
  classId = null,
  forceReingest = false,
}) {
  const response = await apiClient.post('/api/syllabus/upload-complete', {
    storageKey,
    fileName,
    grade,
    subject,
    lessonName,
    classId,
    forceReingest,
  });
  return response.data?.data || response.data;
}

/**
 * Polls the current ingestion and indexing status for a document.
 */
export async function fetchDocumentStatus(documentId) {
  const response = await apiClient.get(`/api/syllabus/documents/${documentId}/status`);
  return response.data?.data || response.data;
}

/**
 * Requeues a failed ingestion job.
 */
export async function retryDocumentIngestion(documentId) {
  const response = await apiClient.post(`/api/syllabus/documents/${documentId}/retry`);
  return response.data?.data || response.data;
}

/**
 * Full end-to-end cloud upload & asynchronous ingestion pipeline:
 * 1. Creates upload session
 * 2. Uploads directly to cloud storage (with progress callback)
 * 3. Completes upload session and queues background ingestion
 */
export async function uploadSyllabusDirectToCloud(
  file,
  metadata = {},
  onUploadProgress = null
) {
  if (!file) {
    throw new Error('No file selected.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${MAX_FILE_SIZE_MB} MB.`
    );
  }

  try {
    // 1. Request presigned upload session
    const session = await createUploadSession({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/pdf',
      grade: metadata.grade || '',
      subject: metadata.subject || '',
      lessonName: metadata.lessonName || metadata.title || '',
      classId: metadata.classId || null,
    });

    // 2. Direct binary PUT upload to cloud storage provider
    await uploadFileToCloud(
      session.uploadUrl,
      file,
      session.headers || { 'Content-Type': file.type || 'application/pdf' },
      onUploadProgress
    );

    // 3. Notify backend of completion to verify and queue ingestion
    const completeResult = await completeUploadSession({
      storageKey: session.storageKey,
      fileName: file.name,
      grade: metadata.grade || '',
      subject: metadata.subject || '',
      lessonName: metadata.lessonName || metadata.title || '',
      classId: metadata.classId || null,
    });

    return completeResult;
  } catch (directUploadErr) {
    console.warn(
      '[SyllabusService] Direct cloud upload encountered an issue, falling back to server ingestion:',
      directUploadErr.message
    );

    // Fallback: If file is within server limits (<= 50 MB), route through server ingest endpoint seamlessly
    if (file.size <= 50 * 1024 * 1024) {
      if (typeof onUploadProgress === 'function') {
        onUploadProgress({ loaded: Math.round(file.size * 0.4), total: file.size, percent: 40 });
      }
      const syncResult = await ingestSyllabusDocument(file, metadata);
      if (typeof onUploadProgress === 'function') {
        onUploadProgress({ loaded: file.size, total: file.size, percent: 100 });
      }
      return {
        documentId: syncResult.data?._id || syncResult.document?._id,
        document: syncResult.data || syncResult.document,
        status: syncResult.data?.status || 'completed',
        reused: syncResult.alreadyExisted,
        viaServerFallback: true,
      };
    }

    throw new Error(
      `Direct cloud upload failed (${directUploadErr.message}). For files > 50 MB, ensure cloud storage bucket CORS is enabled.`
    );
  }
}

/**
 * Legacy synchronous upload & ingest endpoint (maintained for backward compatibility).
 */
export async function ingestSyllabusDocument(file, metadata = {}) {
  const formData = new FormData();
  formData.append('syllabusFile', file);
  formData.append('file', file);
  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.subject) formData.append('subject', metadata.subject);
  if (metadata.grade) formData.append('grade', metadata.grade);
  if (metadata.board) formData.append('board', metadata.board);

  const response = await apiClient.upload('/api/syllabus/ingest', formData);
  return response.data || response;
}

/**
 * List all syllabus documents ingested by or available to the teacher.
 */
export async function fetchSyllabusDocuments(filters = {}) {
  const query = new URLSearchParams();
  if (filters.subject) query.append('subject', filters.subject);
  if (filters.grade) query.append('grade', filters.grade);

  const response = await apiClient.get(`/api/syllabus/documents?${query.toString()}`);
  return response.data || [];
}

/**
 * Delete a syllabus document and cascade delete all its vector chunks.
 */
export async function deleteSyllabusDocument(documentId) {
  const response = await apiClient.delete(`/api/syllabus/documents/${documentId}`);
  return response.data;
}

export default {
  createUploadSession,
  uploadFileToCloud,
  completeUploadSession,
  fetchDocumentStatus,
  retryDocumentIngestion,
  uploadSyllabusDirectToCloud,
  ingestSyllabusDocument,
  fetchSyllabusDocuments,
  deleteSyllabusDocument,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
};
