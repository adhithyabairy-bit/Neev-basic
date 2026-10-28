import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Teacher from '../src/models/Teacher.js';
import Class from '../src/models/Class.js';
import Assessment from '../src/models/Assessment.js';
import app from '../src/app.js';

describe('Validation, Schema Constraints & Security Tests', () => {
  describe('Teacher Model Validation', () => {
    it('fails validation when firebaseUid is missing', () => {
      const teacher = new Teacher({});
      const err = teacher.validateSync();
      assert.ok(err, 'Expected validation error for missing firebaseUid');
      assert.ok(err.errors.firebaseUid);
    });

    it('passes validation with a valid firebaseUid', () => {
      const teacher = new Teacher({ firebaseUid: 'firebase-uid-test-123', email: 'teacher@test.edu' });
      const err = teacher.validateSync();
      assert.equal(err, undefined);
    });
  });

  describe('Class Model Validation', () => {
    it('fails validation when required fields (name, grade, subject, teacherId) are missing', () => {
      const newClass = new Class({});
      const err = newClass.validateSync();
      assert.ok(err, 'Expected validation error for missing required fields');
      assert.ok(err.errors.name);
      assert.ok(err.errors.grade);
      assert.ok(err.errors.subject);
      assert.ok(err.errors.teacherId);
    });

    it('passes validation with all required class fields', () => {
      const newClass = new Class({
        teacherId: new mongoose.Types.ObjectId(),
        name: 'Class 8-A',
        grade: 'Grade 8',
        subject: 'Mathematics',
        board: 'CBSE',
      });
      const err = newClass.validateSync();
      assert.equal(err, undefined);
    });
  });

  describe('Assessment Model Validation & Maximum Marks Rule', () => {
    it('fails validation when required assessment fields are missing', () => {
      const assessment = new Assessment({});
      const err = assessment.validateSync();
      assert.ok(err, 'Expected validation error');
      assert.ok(err.errors.teacherId);
      assert.ok(err.errors.classId);
      assert.ok(err.errors.title);
      assert.ok(err.errors.subject);
      assert.ok(err.errors.maximumMarks);
    });

    it('strictly rejects maximumMarks <= 0 or zero marks', () => {
      const assessmentZero = new Assessment({
        teacherId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        title: 'Midterm Exam',
        subject: 'Mathematics',
        maximumMarks: 0,
      });
      const errZero = assessmentZero.validateSync();
      assert.ok(errZero, 'Expected validation error for zero maximumMarks');
      assert.ok(errZero.errors.maximumMarks);

      const assessmentNeg = new Assessment({
        teacherId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        title: 'Midterm Exam',
        subject: 'Mathematics',
        maximumMarks: -25,
      });
      const errNeg = assessmentNeg.validateSync();
      assert.ok(errNeg, 'Expected validation error for negative maximumMarks');
      assert.ok(errNeg.errors.maximumMarks);
    });

    it('strictly validates status enum values', () => {
      const assessment = new Assessment({
        teacherId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        title: 'Midterm Exam',
        subject: 'Mathematics',
        maximumMarks: 50,
        status: 'invalid_status_value',
      });
      const err = assessment.validateSync();
      assert.ok(err, 'Expected validation error for invalid status');
      assert.ok(err.errors.status);
    });

    it('accepts valid assessment data with positive maximumMarks', () => {
      const assessment = new Assessment({
        teacherId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        title: 'Linear Equations Assessment',
        subject: 'Mathematics',
        maximumMarks: 50,
        status: 'draft',
      });
      const err = assessment.validateSync();
      assert.equal(err, undefined);
    });
  });

  describe('Unauthorized Endpoint Access & Security Barriers', () => {
    it('rejects GET /api/classes without Authorization header with HTTP 401', async () => {
      const res = await fetchResponse(app, 'GET', '/api/classes');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'AUTH_HEADER_MISSING');
    });

    it('rejects POST /api/classes without Authorization header with HTTP 401', async () => {
      const res = await fetchResponse(app, 'POST', '/api/classes', {}, { name: 'Class 8-A' });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('rejects GET /api/assessments without Authorization header with HTTP 401', async () => {
      const res = await fetchResponse(app, 'GET', '/api/assessments');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('rejects POST /api/assessments without Authorization header with HTTP 401', async () => {
      const res = await fetchResponse(app, 'POST', '/api/assessments', {}, { title: 'Test' });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('returns structured 404 for unknown endpoints', async () => {
      const res = await fetchResponse(app, 'GET', '/api/non-existent-endpoint');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'ROUTE_NOT_FOUND');
    });
  });
});

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
