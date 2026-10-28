/**
 * Neev Platform — Authenticated API Service
 * Encapsulates backend HTTP requests with automatic Firebase ID token attachment.
 * Targets the Express backend at VITE_API_BASE_URL (defaults to http://localhost:5000).
 */
import { getCurrentTeacherSession, API_BASE_URL } from './authService';

/**
 * Returns the current teacher's authentication headers including Bearer token.
 */
function getAuthHeaders() {
  const session = getCurrentTeacherSession();
  const token = session?.idToken || session?.token || '';

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generic authenticated fetch wrapper with JSON parsing and standardized errors.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data.code;
      error.details = data.details;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    const networkErr = new Error(`Cannot connect to Neev backend at ${API_BASE_URL}. Ensure 'npm run dev:backend' is running.`);
    networkErr.status = 503;
    networkErr.code = 'BACKEND_OFFLINE';
    throw networkErr;
  }
}

// ============================================================================
// Health & Diagnostics
// ============================================================================
export async function getBackendHealth() {
  return request('/api/health', { method: 'GET' });
}

// ============================================================================
// Classes API
// ============================================================================
export async function getClasses(page = 1, limit = 10) {
  return request(`/api/classes?page=${page}&limit=${limit}`, { method: 'GET' });
}

export async function createClass(classData) {
  return request('/api/classes', {
    method: 'POST',
    body: JSON.stringify(classData),
  });
}

export async function getClassById(id) {
  return request(`/api/classes/${id}`, { method: 'GET' });
}

export async function updateClass(id, classData) {
  return request(`/api/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(classData),
  });
}

export async function deleteClass(id) {
  return request(`/api/classes/${id}`, { method: 'DELETE' });
}

// ============================================================================
// Assessments API
// ============================================================================
export async function getAssessments(page = 1, limit = 10, classId = null) {
  const query = new URLSearchParams({ page, limit });
  if (classId) query.append('classId', classId);
  return request(`/api/assessments?${query.toString()}`, { method: 'GET' });
}

export async function createAssessment(assessmentData) {
  return request('/api/assessments', {
    method: 'POST',
    body: JSON.stringify(assessmentData),
  });
}

export async function getAssessmentById(id) {
  return request(`/api/assessments/${id}`, { method: 'GET' });
}

export async function updateAssessment(id, assessmentData) {
  return request(`/api/assessments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assessmentData),
  });
}
