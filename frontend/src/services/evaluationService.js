/**
 * Neev Platform — AI Answer Evaluation & RAG Service
 * Handles triggering evaluations, fetching persisted pedagogical analysis,
 * teacher score approvals, and class-level learning gap summaries.
 */
import apiClient from './apiClient';

/**
 * Trigger syllabus-grounded Grok AI evaluation for a verified answer sheet.
 * @param {string} assessmentId - Assessment MongoDB ID
 * @param {string} sheetId - Verified AnswerSheet MongoDB ID
 * @returns {Promise<Array>} List of generated evaluation records
 */
export async function evaluateAnswerSheet(assessmentId, sheetId) {
  if (!assessmentId || !sheetId) {
    throw new Error('Assessment ID and Answer Sheet ID are required for AI evaluation.');
  }
  const response = await apiClient.post(
    `/api/assessments/${assessmentId}/answer-sheets/${sheetId}/evaluate`,
    {}
  );
  return response.data || [];
}

/**
 * Fetch all evaluations for a specific student answer sheet.
 * @param {string} sheetId - AnswerSheet MongoDB ID
 * @returns {Promise<Array>} List of evaluation records
 */
export async function fetchEvaluationsBySheet(sheetId) {
  if (!sheetId) return [];
  const response = await apiClient.get(`/api/answer-sheets/${sheetId}/evaluations`);
  return response.data || [];
}

/**
 * Fetch all evaluations across all students for an assessment.
 * @param {string} assessmentId - Assessment MongoDB ID
 * @returns {Promise<Array>}
 */
export async function fetchEvaluationsByAssessment(assessmentId) {
  if (!assessmentId) return [];
  const response = await apiClient.get(`/api/assessments/${assessmentId}/evaluations`);
  return response.data || [];
}

/**
 * Teacher explicitly approves or adjusts AI-suggested marks for an evaluation item.
 * @param {string} evaluationId - Evaluation MongoDB ID
 * @param {number|null} approvedMarks - Approved marks (optional)
 * @returns {Promise<Object>} Updated evaluation record
 */
export async function approveEvaluation(evaluationId, approvedMarks = null) {
  if (!evaluationId) {
    throw new Error('Evaluation ID is required.');
  }
  const payload = approvedMarks !== null ? { approvedMarks: Number(approvedMarks) } : {};
  const response = await apiClient.patch(`/api/evaluations/${evaluationId}/approve`, payload);
  return response.data;
}

/**
 * Fetch real aggregated class learning gap overview for an assessment.
 * @param {string} assessmentId - Assessment MongoDB ID
 * @returns {Promise<Object>}
 */
export async function fetchAssessmentGapOverview(assessmentId) {
  if (!assessmentId) return null;
  const response = await apiClient.get(`/api/assessments/${assessmentId}/gap-overview`);
  return response.data;
}

export default {
  evaluateAnswerSheet,
  fetchEvaluationsBySheet,
  fetchEvaluationsByAssessment,
  approveEvaluation,
  fetchAssessmentGapOverview,
};

