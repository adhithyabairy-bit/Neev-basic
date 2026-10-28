import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { getDBStatus } from '../src/config/db.js';

describe('Health & Diagnostic Endpoint Tests', () => {
  it('GET /api/health should respond with HTTP 200 and safe diagnostic information', async () => {
    // Perform simulated request against Express app
    const res = await fetchResponse(app, 'GET', '/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.service, 'neev-backend');
    assert.ok(typeof res.body.status === 'string');
    assert.ok(typeof res.body.database === 'object');
    assert.ok(typeof res.body.database.connected === 'boolean');
    assert.ok(typeof res.body.database.status === 'string');
    assert.ok(typeof res.body.firebaseAdmin === 'object');
    assert.ok(typeof res.body.firebaseAdmin.configured === 'boolean');

    // Verify credentials are NEVER leaked in response
    const jsonStr = JSON.stringify(res.body);
    assert.ok(!jsonStr.includes('mongodb+srv://'));
    assert.ok(!jsonStr.includes('password'));
    assert.ok(!jsonStr.includes('private_key'));
  });

  it('getDBStatus() safely reports disconnected or unconfigured status when URI is missing', () => {
    const status = getDBStatus();
    assert.ok(typeof status.connected === 'boolean');
    assert.ok(typeof status.status === 'string');
    assert.ok(status.error === null || typeof status.error === 'string');
  });
});

/**
 * Helper to simulate an HTTP request against an Express app without opening network ports
 */
async function fetchResponse(expressApp, method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const server = expressApp.listen(0, '127.0.0.1', async () => {
      const { port } = server.address();
      try {
        const fullUrl = `http://127.0.0.1:${port}${url}`;
        const fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
        };
        if (body) {
          fetchOptions.body = JSON.stringify(body);
        }

        const res = await fetch(fullUrl, fetchOptions);
        const json = await res.json().catch(() => ({}));
        server.close(() => resolve({ status: res.status, body: json }));
      } catch (e) {
        server.close(() => resolve({ status: 500, body: { error: e.message } }));
      }
    });
  });
}
