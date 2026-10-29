/**
 * Neev Platform — Syllabus & Curriculum RAG Management API Service
 * Handles uploading/ingesting syllabus documents, listing ingested documents,
 * and deleting documents from the persistent vector store.
 */
import apiClient from './apiClient';

/**
 * Upload and ingest a syllabus textbook/document PDF or text file into the RAG vector store.
 * @param {File} file
 * @param {Object} metadata - { title, subject, grade, board }
 * @returns {Promise<Object>}
 */
export async function ingestSyllabusDocument(file, metadata = {}) {
  const formData = new FormData();
  formData.append('syllabusFile', file);
  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.subject) formData.append('subject', metadata.subject);
  if (metadata.grade) formData.append('grade', metadata.grade);
  if (metadata.board) formData.append('board', metadata.board);

  const response = await apiClient.post('/api/syllabus/ingest', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * List all syllabus documents ingested by or available to the teacher.
 * @param {Object} filters - { subject, grade }
 * @returns {Promise<Array>}
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
 * @param {string} documentId
 * @returns {Promise<Object>}
 */
export async function deleteSyllabusDocument(documentId) {
  const response = await apiClient.delete(`/api/syllabus/documents/${documentId}`);
  return response.data;
}

export default {
  ingestSyllabusDocument,
  fetchSyllabusDocuments,
  deleteSyllabusDocument,
};

