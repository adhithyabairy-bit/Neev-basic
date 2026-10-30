/**
 * Neev Platform — Answer Sheet API Service
 * Handles uploading, OCR processing, teacher corrections, and explicit verification for student answer sheets.
 */
import apiClient from './apiClient';
import { API_BASE_URL } from './authService';

/**
 * Fetch all answer sheets linked to an assessment.
 * @param {string} assessmentId - MongoDB ID of the assessment
 * @returns {Promise<Array>} List of answer sheet records
 */
export async function fetchAnswerSheets(assessmentId) {
  if (!assessmentId) return [];
  const response = await apiClient.get(`/api/assessments/${assessmentId}/answer-sheets`);
  return response.data || [];
}

/**
 * Upload real answer sheet files with student information.
 * @param {string} assessmentId - MongoDB ID of the assessment
 * @param {FormData} formData - Multipart form containing files, studentName, rollNumber
 * @returns {Promise<Array>} List of created and processed answer sheet records
 */
export async function uploadAnswerSheets(assessmentId, formData) {
  if (!assessmentId) {
    throw new Error('Assessment ID is required to upload answer sheets.');
  }
  const response = await apiClient.upload(
    `/api/assessments/${assessmentId}/answer-sheets`,
    formData
  );
  return response.data || [];
}

/**
 * Retrieve a specific answer sheet and its extracted answers.
 * @param {string} id - AnswerSheet MongoDB ID
 * @returns {Promise<Object>}
 */
export async function getAnswerSheetById(id) {
  const response = await apiClient.get(`/api/answer-sheets/${id}`);
  return response.data;
}

/**
 * Trigger text extraction / OCR or retry failed processing.
 * @param {string} id - AnswerSheet MongoDB ID
 * @returns {Promise<Object>} Updated answer sheet with extraction data
 */
export async function processAnswerSheet(id) {
  const response = await apiClient.post(`/api/answer-sheets/${id}/process`, {});
  return response.data;
}

/**
 * Save teacher corrections for an individual answer item.
 * Preserves raw extracted OCR text while saving correctedText, awardedMarks, and status.
 * @param {string} id - AnswerSheet MongoDB ID
 * @param {string} answerId - Subdocument _id of the answer item
 * @param {Object} updates - { correctedText, awardedMarks, status }
 * @returns {Promise<Object>} Updated answer sheet
 */
export async function updateAnswerCorrection(id, answerId, updates) {
  const response = await apiClient.patch(
    `/api/answer-sheets/${id}/answers/${answerId}`,
    updates
  );
  return response.data;
}

/**
 * Delete a single question/answer entry from an answer sheet.
 * @param {string} id - AnswerSheet MongoDB ID
 * @param {string} answerId - Subdocument _id of the answer item
 * @returns {Promise<Object>} Updated answer sheet
 */
export async function deleteAnswerItem(id, answerId) {
  const response = await apiClient.delete(`/api/answer-sheets/${id}/answers/${answerId}`);
  return response.data;
}

/**
 * Add a new question/answer entry to an answer sheet.
 * @param {string} id - AnswerSheet MongoDB ID
 * @param {Object} item - { questionNumber, prompt, correctedText, maxMarks, pageNumber }
 * @returns {Promise<Object>} Updated answer sheet
 */
export async function addAnswerItem(id, item) {
  const response = await apiClient.post(`/api/answer-sheets/${id}/answers`, item);
  return response.data;
}

/**
 * Explicitly verify the reviewed answer sheet as ground truth.
 * @param {string} id - AnswerSheet MongoDB ID
 * @returns {Promise<Object>} Updated answer sheet with verificationStatus.isVerified = true
 */
export async function verifyAnswerSheet(id) {
  const response = await apiClient.patch(`/api/answer-sheets/${id}/verify`, {});
  return response.data;
}

/**
 * Delete an answer sheet and clean up its stored file.
 * @param {string} id - AnswerSheet MongoDB ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteAnswerSheet(id) {
  const response = await apiClient.delete(`/api/answer-sheets/${id}`);
  return response.data;
}

/**
 * Builds the URL to stream the original private scan file.
 * @param {string} id - AnswerSheet MongoDB ID
 * @returns {string} URL endpoint for authenticated file stream
 */
export function getAnswerSheetFileUrl(id) {
  return `${API_BASE_URL}/api/answer-sheets/${id}/file`;
}

export default {
  fetchAnswerSheets,
  uploadAnswerSheets,
  getAnswerSheetById,
  processAnswerSheet,
  updateAnswerCorrection,
  verifyAnswerSheet,
  deleteAnswerSheet,
  getAnswerSheetFileUrl,
};

