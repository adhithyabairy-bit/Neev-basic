import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { admin } from '../src/config/firebaseAdmin.js';
import { verifyFirebaseToken } from '../src/middleware/verifyFirebaseToken.js';

function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.data = body;
      return this;
    },
  };
  return res;
}

describe('Phase 3: Firebase Token Verification & Revocation Gating', () => {
  it('rejects missing Authorization header with 401', async () => {
    const req = { headers: {} };
    const res = createMockResponse();
    let nextCalled = false;

    await verifyFirebaseToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
    assert.equal(nextCalled, false);
  });

  it('rejects malformed Authorization header with 401', async () => {
    const req = { headers: { authorization: 'Basic abc123xyz' } };
    const res = createMockResponse();
    let nextCalled = false;

    await verifyFirebaseToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
    assert.equal(nextCalled, false);
  });

  it('rejects empty Bearer token with 401', async () => {
    const req = { headers: { authorization: 'Bearer   ' } };
    const res = createMockResponse();
    let nextCalled = false;

    await verifyFirebaseToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
    assert.equal(nextCalled, false);
  });

  it('handles expired token (auth/id-token-expired) with 401 and TOKEN_EXPIRED code', async () => {
    const authInstance = admin.auth();
    const origVerify = authInstance.verifyIdToken;
    authInstance.verifyIdToken = async (token, checkRevoked) => {
      assert.equal(checkRevoked, true, 'verifyIdToken must be called with checkRevoked: true');
      const err = new Error('Token expired');
      err.code = 'auth/id-token-expired';
      throw err;
    };

    try {
      const req = { headers: { authorization: 'Bearer expired-token-123' } };
      const res = createMockResponse();
      let nextCalled = false;

      await verifyFirebaseToken(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'TOKEN_EXPIRED');
      assert.equal(nextCalled, false);
    } finally {
      authInstance.verifyIdToken = origVerify;
    }
  });

  it('handles revoked token (auth/id-token-revoked) with 401 and TOKEN_REVOKED code', async () => {
    const authInstance = admin.auth();
    const origVerify = authInstance.verifyIdToken;
    authInstance.verifyIdToken = async (token, checkRevoked) => {
      assert.equal(checkRevoked, true, 'verifyIdToken must be called with checkRevoked: true');
      const err = new Error('Token has been revoked');
      err.code = 'auth/id-token-revoked';
      throw err;
    };

    try {
      const req = { headers: { authorization: 'Bearer revoked-token-123' } };
      const res = createMockResponse();
      let nextCalled = false;

      await verifyFirebaseToken(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'TOKEN_REVOKED');
      assert.equal(nextCalled, false);
    } finally {
      authInstance.verifyIdToken = origVerify;
    }
  });

  it('handles disabled user (auth/user-disabled) with 401 and USER_DISABLED code', async () => {
    const authInstance = admin.auth();
    const origVerify = authInstance.verifyIdToken;
    authInstance.verifyIdToken = async (token, checkRevoked) => {
      const err = new Error('User disabled');
      err.code = 'auth/user-disabled';
      throw err;
    };

    try {
      const req = { headers: { authorization: 'Bearer disabled-user-token' } };
      const res = createMockResponse();
      let nextCalled = false;

      await verifyFirebaseToken(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'USER_DISABLED');
      assert.equal(nextCalled, false);
    } finally {
      authInstance.verifyIdToken = origVerify;
    }
  });

  it('handles invalid token (auth/invalid-id-token) with 401 and INVALID_TOKEN code', async () => {
    const authInstance = admin.auth();
    const origVerify = authInstance.verifyIdToken;
    authInstance.verifyIdToken = async (token, checkRevoked) => {
      const err = new Error('Invalid token');
      err.code = 'auth/invalid-id-token';
      throw err;
    };

    try {
      const req = { headers: { authorization: 'Bearer invalid-token-str' } };
      const res = createMockResponse();
      let nextCalled = false;

      await verifyFirebaseToken(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'INVALID_TOKEN');
      assert.equal(nextCalled, false);
    } finally {
      authInstance.verifyIdToken = origVerify;
    }
  });

  it('fails safely with 503 and REVOCATION_CHECK_UNAVAILABLE when Firebase infrastructure errors occur', async () => {
    const authInstance = admin.auth();
    const origVerify = authInstance.verifyIdToken;
    let callCount = 0;
    authInstance.verifyIdToken = async (token, checkRevoked) => {
      callCount++;
      const err = new Error('Firebase network connection timeout');
      err.code = 'auth/network-request-failed';
      throw err;
    };

    try {
      const req = { headers: { authorization: 'Bearer valid-looking-token' } };
      const res = createMockResponse();
      let nextCalled = false;

      await verifyFirebaseToken(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 503);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'REVOCATION_CHECK_UNAVAILABLE');
      assert.equal(nextCalled, false);
      // Strictly verify that verifyIdToken was NOT called a second time with checkRevoked: false!
      assert.equal(callCount, 1, 'Must NOT bypass revocation by calling verifyIdToken(token, false)');
    } finally {
      authInstance.verifyIdToken = origVerify;
    }
  });

  it('successfully attaches req.user and calls next() when token is valid and unrevoked', async () => {
    const authInstance = admin.auth();
    const origVerify = authInstance.verifyIdToken;
    authInstance.verifyIdToken = async (token, checkRevoked) => {
      assert.equal(checkRevoked, true);
      return {
        uid: 'uid-teacher-verified-999',
        email: 'teacher999@neev.edu',
        email_verified: true,
        name: 'Professor Sharma',
        auth_time: 1700000000,
      };
    };

    try {
      const req = { headers: { authorization: 'Bearer valid-unrevoked-token' } };
      const res = createMockResponse();
      let nextCalled = false;

      await verifyFirebaseToken(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.uid, 'uid-teacher-verified-999');
      assert.equal(req.user.email, 'teacher999@neev.edu');
      assert.equal(req.user.displayName, 'Professor Sharma');
    } finally {
      authInstance.verifyIdToken = origVerify;
    }
  });
});
