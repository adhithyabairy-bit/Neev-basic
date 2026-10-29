/**
 * Neev Platform — Assessment Management API Service
 * Interacts with backend /api/assessments endpoints for teacher-owned assessments.
 */
import apiClient from './apiClient';

/**
 * Fetch list of assessments owned by the authenticated teacher.
 * Optional filter by classId.
 */
export async function fetchAssessments(page = 1, limit = 50, classId = null) {
  const query = new URLSearchParams({ page, limit });
  if (classId) query.append('classId', classId);

  const response = await apiClient.get(`/api/assessments?${query.toString()}`);
  return response.data || [];
}

/**
 * Create a new assessment linked to a teacher-owned class.
 * Required: { classId, title, subject, maximumMarks }, Optional: { examDate, status }
 */
export async function createAssessment(assessmentData) {
  const response = await apiClient.post('/api/assessments', assessmentData);
  return response.data;
}

/**
 * Retrieve a specific assessment owned by the authenticated teacher.
 */
export async function getAssessmentById(id) {
  const response = await apiClient.get(`/api/assessments/${id}`);
  return response.data;
}

/**
 * Update an existing assessment owned by the authenticated teacher.
 */
export async function updateAssessment(id, assessmentData) {
  const response = await apiClient.put(`/api/assessments/${id}`, assessmentData);
  return response.data;
}

/**
 * Delete an owned assessment by ID.
 */
export async function deleteAssessment(id) {
  const response = await apiClient.delete(`/api/assessments/${id}`);
  return response.data;
}
