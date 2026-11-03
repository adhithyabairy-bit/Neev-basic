import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Polyfill localStorage / sessionStorage for Node.js test environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  const memoryStore = new Map();
  globalThis.localStorage = {
    getItem: (key) => memoryStore.get(key) || null,
    setItem: (key, val) => memoryStore.set(key, String(val)),
    removeItem: (key) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  const memoryStore = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => memoryStore.get(key) || null,
    setItem: (key, val) => memoryStore.set(key, String(val)),
    removeItem: (key) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  };
}

import { getAuthorizationHeaders } from '../src/services/apiClient.js';
import {
  getCurrentTeacherSession,
  logout,
} from '../src/services/authService.js';

describe('Phase 1 & 9: Frontend Auth and API Client Security Tests', () => {
  beforeEach(() => {
    logout();
  });

  it('builds standard authorization headers with Bearer token when teacher is logged in', () => {
    localStorage.setItem(
      'neev_authenticated_teacher',
      JSON.stringify({
        uid: 'teacher-123',
        email: 'teacher@school.edu',
        idToken: 'mock-firebase-jwt-token-xyz',
      })
    );

    const headers = getAuthorizationHeaders();
    assert.strictEqual(headers.Authorization, 'Bearer mock-firebase-jwt-token-xyz');
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  it('omits Authorization header when teacher is logged out', () => {
    logout();
    const headers = getAuthorizationHeaders();
    assert.strictEqual(headers.Authorization, undefined);
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  it('removes Content-Type header when transmitting multipart FormData for boundary generation', () => {
    localStorage.setItem(
      'neev_authenticated_teacher',
      JSON.stringify({
        uid: 'teacher-456',
        idToken: 'jwt-token-for-upload',
      })
    );

    const headers = getAuthorizationHeaders({}, true /* isFormData */);
    assert.strictEqual(headers.Authorization, 'Bearer jwt-token-for-upload');
    assert.strictEqual(headers['Content-Type'], undefined);
    assert.strictEqual(headers['content-type'], undefined);
  });

  it('persists and clears teacher session reliably via logout()', () => {
    assert.strictEqual(getCurrentTeacherSession(), null);

    localStorage.setItem(
      'neev_authenticated_teacher',
      JSON.stringify({
        uid: 'teacher-test',
        email: 'test@school.edu',
        displayName: 'Ms. Sharma',
      })
    );

    const session = getCurrentTeacherSession();
    assert.ok(session);
    assert.strictEqual(session.email, 'test@school.edu');
    assert.strictEqual(session.displayName, 'Ms. Sharma');

    logout();
    assert.strictEqual(getCurrentTeacherSession(), null);
  });
});
