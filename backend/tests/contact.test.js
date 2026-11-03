import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import ContactInquiry from '../src/models/ContactInquiry.js';
import { connectDB } from '../src/config/db.js';
import app from '../src/app.js';

describe('Public Contact API & Inquiry Persistence Tests', () => {
  before(async () => {
    if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
      await connectDB().catch(() => {});
    }
    if (mongoose.connection.readyState === 1) {
      await ContactInquiry.deleteMany({ email: /test-inquiry.*@example\.com/i });
    }
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await ContactInquiry.deleteMany({ email: /test-inquiry.*@example\.com/i });
      await mongoose.disconnect();
    }
  });

  it('rejects contact submission with missing name with HTTP 400', async () => {
    const res = await postJson(app, '/api/contact', {
      email: 'teacher@school.edu.in',
      message: 'Hello, I would like to trial Neev.',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'INVALID_NAME');
  });

  it('rejects contact submission with invalid email format with HTTP 400', async () => {
    const res = await postJson(app, '/api/contact', {
      name: 'Aditi Rao',
      email: 'invalid-email-address',
      message: 'Hello, I would like to trial Neev.',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'INVALID_EMAIL');
  });

  it('rejects contact submission with too short message (< 5 chars) with HTTP 400', async () => {
    const res = await postJson(app, '/api/contact', {
      name: 'Aditi Rao',
      email: 'aditi@school.edu.in',
      message: 'Hi',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'INVALID_MESSAGE');
  });

  it('drops honeypot spam bot submissions with HTTP 200 without saving to MongoDB', async () => {
    const honeypotEmail = 'bot-test-inquiry@example.com';
    const res = await postJson(app, '/api/contact', {
      name: 'Spam Bot',
      email: honeypotEmail,
      message: 'Buy cheap watches and pharmaceuticals online now!',
      hp_field: 'http://spam-site.xyz',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const doc = await ContactInquiry.findOne({ email: honeypotEmail });
    assert.equal(doc, null, 'Honeypot submission must not be saved to MongoDB');
  });

  it('successfully persists valid ContactInquiry to MongoDB and handles email notification', async () => {
    const uniqueEmail = `test-inquiry-${Date.now()}@example.com`;
    const res = await postJson(app, '/api/contact', {
      name: 'Priya Sharma',
      email: uniqueEmail,
      school: 'Delhi Public School, R.K. Puram',
      message: 'We are interested in adopting Neev for our Grade 8 and 9 mathematics teachers.',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.inquiryId, 'Response must include inquiryId');

    // Verify record in MongoDB
    const inquiry = await ContactInquiry.findById(res.body.inquiryId);
    assert.ok(inquiry, 'Inquiry must be persisted in database');
    assert.equal(inquiry.name, 'Priya Sharma');
    assert.equal(inquiry.email, uniqueEmail);
    assert.equal(inquiry.school, 'Delhi Public School, R.K. Puram');
    assert.ok(
      ['pending', 'sent', 'skipped', 'failed'].includes(inquiry.emailNotificationStatus),
      'Inquiry notification status must be recorded'
    );
  });
});

async function postJson(expressApp, url, body) {
  return new Promise((resolve) => {
    const server = expressApp.listen(0, '127.0.0.1', async () => {
      const { port } = server.address();
      try {
        const fullUrl = `http://127.0.0.1:${port}${url}`;
        const res = await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        server.close(() => resolve({ status: res.status, body: json }));
      } catch (e) {
        server.close(() => resolve({ status: 500, body: { error: e.message } }));
      }
    });
  });
}
