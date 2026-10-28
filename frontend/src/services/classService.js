/**
 * Neev Platform — Class Management API Service
 * Interacts with backend /api/classes endpoints for teacher-owned classes.
 */
import apiClient from './apiClient';

/**
 * Fetch list of classes owned by the authenticated teacher.
 */
export async function fetchClasses(page = 1, limit = 50) {
  const response = await apiClient.get(`/api/classes?page=${page}&limit=${limit}`);
  return response.data || [];
}

/**
 * Create a new class for the authenticated teacher.
 * Required: { name, grade, subject }, Optional: { board }
 */
export async function createClass(classData) {
  const response = await apiClient.post('/api/classes', classData);
  return response.data;
}

/**
 * Retrieve a specific class owned by the authenticated teacher.
 */
export async function getClassById(id) {
  const response = await apiClient.get(`/api/classes/${id}`);
  return response.data;
}

/**
 * Update a class owned by the authenticated teacher.
 */
export async function updateClass(id, classData) {
  const response = await apiClient.put(`/api/classes/${id}`, classData);
  return response.data;
}

/**
 * Delete a class owned by the authenticated teacher.
 * Returns 409 if dependent assessments exist.
 */
export async function deleteClass(id) {
  const response = await apiClient.delete(`/api/classes/${id}`);
  return response.data;
}
