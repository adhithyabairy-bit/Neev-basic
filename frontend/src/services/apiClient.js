/**
 * Neev Platform — Centralized Authenticated API Client
 *
 * Sends HTTP requests to Express backend with verified Firebase ID token in Authorization header.
 * Automatically handles JSON responses, errors, and authentication state without bypassing security.
 */
import { getCurrentTeacherSession, refreshIdToken, API_BASE_URL } from './authService';

/**
 * Builds standard request headers with current Firebase ID token.
 */
export function getAuthorizationHeaders(extraHeaders = {}, isFormData = false) {
  const session = getCurrentTeacherSession();
  const token = session?.idToken || session?.token || '';

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };

  // Only set application/json if not transmitting multipart FormData.
  // When transmitting FormData, delete Content-Type so the browser automatically
  // generates multipart/form-data with the correct boundary parameter.
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

/**
 * Centralized fetch wrapper handling token injection, response parsing, and error formatting.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = getAuthorizationHeaders(options.headers, isFormData);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // If token expired, attempt silent token refresh once and retry
      if (
        response.status === 401 &&
        (data.code === 'TOKEN_EXPIRED' || (data.error && data.error.includes('expired'))) &&
        !options._retry
      ) {
        const refreshedToken = await refreshIdToken();
        if (refreshedToken) {
          return apiRequest(endpoint, { ...options, _retry: true });
        }
      }

      const error = new Error(data.error || `HTTP ${response.status} error`);
      error.status = response.status;
      error.code = data.code || 'API_ERROR';
      error.details = data.details;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    const networkError = new Error(
      `Cannot connect to Neev backend at ${API_BASE_URL}. Ensure the backend server is running (npm run dev:backend).`
    );
    networkError.status = 503;
    networkError.code = 'BACKEND_OFFLINE';
    throw networkError;
  }
}

export const apiClient = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: typeof FormData !== 'undefined' && body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
  upload: (endpoint, formData, options) =>
    apiRequest(endpoint, { ...options, method: 'POST', body: formData }),
};

export default apiClient;
