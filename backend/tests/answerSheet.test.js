import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Models
import AnswerSheet from '../src/models/AnswerSheet.js';
import Assessment from '../src/models/Assessment.js';

// Utilities & Services
import {
  detectFileSignature,
  validateUploadedFile,
  sanitizeFileName,
} from '../src/utils/fileValidation.js';
import {
  organizeExtractedText,
  extractPdfText,
} from '../src/services/extraction/extractionService.js';
import LocalStorageProvider from '../src/services/storage/localStorageProvider.js';
import storageService from '../src/services/storage/storageService.js';

// Controllers
import {
  uploadAnswerSheets,
  getAnswerSheetsByAssessment,
  getAnswerSheetById,
  processAnswerSheet,
  updateAnswerCorrection,
  verifyAnswerSheet,
  deleteAnswerSheet,
} from '../src/controllers/answerSheetController.js';

describe('Phase 3: Real Answer-Sheet Upload, OCR & Teacher Verification Tests', () => {
  const teacherA_Id = new mongoose.Types.ObjectId();
  const teacherB_Id = new mongoose.Types.ObjectId();
  const classA_Id = new mongoose.Types.ObjectId();
  const assessmentA_Id = new mongoose.Types.ObjectId();
  const assessmentB_Id = new mongoose.Types.ObjectId();

  // Test fixtures for valid magic bytes
  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 55>>stream\nBT /F1 12 Tf 72 712 Td (Q1. Solve 3x=9) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n323\n%%EOF'
  );
  // JPEG magic bytes: FF D8 FF E0 ...
  const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A ...
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

  describe('1. File Signature, MIME & Magic Bytes Validation', () => {
    it('detects PDF magic bytes accurately', () => {
      assert.equal(detectFileSignature(validPdfBuffer), 'pdf');
    });

    it('detects JPEG magic bytes accurately', () => {
      assert.equal(detectFileSignature(validJpgBuffer), 'jpeg');
    });

    it('detects PNG magic bytes accurately', () => {
      assert.equal(detectFileSignature(validPngBuffer), 'png');
    });

    it('returns null for unrecognised binary signatures', () => {
      const randomBytes = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
      assert.equal(detectFileSignature(randomBytes), null);
    });

    it('validates a legitimate PDF file successfully', () => {
      const file = {
        originalname: 'student_answer_sheet.pdf',
        mimetype: 'application/pdf',
        size: validPdfBuffer.length,
        buffer: validPdfBuffer,
      };
      const result = validateUploadedFile(file);
      assert.equal(result.valid, true);
      assert.equal(result.detectedType, 'pdf');
    });

    it('validates a legitimate JPG image successfully', () => {
      const file = {
        originalname: 'scan_page1.jpg',
        mimetype: 'image/jpeg',
        size: validJpgBuffer.length,
        buffer: validJpgBuffer,
      };
      const result = validateUploadedFile(file);
      assert.equal(result.valid, true);
      assert.equal(result.detectedType, 'jpeg');
    });

    it('rejects an empty file (0 bytes) with HTTP error code FILE_EMPTY', () => {
      const file = {
        originalname: 'empty.pdf',
        mimetype: 'application/pdf',
        size: 0,
        buffer: Buffer.alloc(0),
      };
      const result = validateUploadedFile(file);
      assert.equal(result.valid, false);
      assert.equal(result.code, 'FILE_EMPTY');
    });

    it('rejects unsupported extensions (e.g. .docx or .exe)', () => {
      const file = {
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 100,
        buffer: Buffer.alloc(100),
      };
      const result = validateUploadedFile(file);
      assert.equal(result.valid, false);
      assert.equal(result.code, 'UNSUPPORTED_EXTENSION');
    });

    it('rejects oversized files exceeding 15MB limit', () => {
      const file = {
        originalname: 'huge_scan.pdf',
        mimetype: 'application/pdf',
        size: 16 * 1024 * 1024, // 16MB
        buffer: validPdfBuffer,
      };
      const result = validateUploadedFile(file, 15 * 1024 * 1024);
      assert.equal(result.valid, false);
      assert.equal(result.code, 'FILE_TOO_LARGE');
    });

    it('rejects fake extension spoofing (e.g. text file renamed to .pdf)', () => {
      const fakePdfBuffer = Buffer.from('This is a plain text file pretending to be PDF');
      const file = {
        originalname: 'fake.pdf',
        mimetype: 'application/pdf',
        size: fakePdfBuffer.length,
        buffer: fakePdfBuffer,
      };
      const result = validateUploadedFile(file);
      assert.equal(result.valid, false);
      assert.equal(result.code, 'INVALID_FILE_SIGNATURE');
    });

    it('sanitizes filenames safely to prevent path traversal', () => {
      const malicious = '../../../../etc/passwd/student.pdf';
      const safe = sanitizeFileName(malicious);
      assert.ok(!safe.includes('/'));
      assert.ok(!safe.includes('\\'));
      assert.ok(safe.endsWith('.pdf'));
    });
  });

  describe('2. Storage Provider & Secure File Handling', () => {
    const testDir = path.join(process.cwd(), 'temp-test-storage');
    const localProvider = new LocalStorageProvider({ baseDir: testDir });

    after(async () => {
      try {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      } catch {
        // Safe cleanup
      }
    });

    it('saves a file and returns safe internal key without user path contamination', async () => {
      const saved = await localProvider.saveFile({
        buffer: validPdfBuffer,
        originalName: 'Aarav-Maths-AnswerSheet.pdf',
        mimeType: 'application/pdf',
        prefix: 'test-assessment',
      });

      assert.ok(saved.storageKey.startsWith('test-assessment/'));
      assert.equal(saved.storageProvider, 'local');
      assert.equal(saved.fileSize, validPdfBuffer.length);

      // Verify file is readable back
      const readBack = await localProvider.getFileBuffer(saved.storageKey);
      assert.equal(readBack.length, validPdfBuffer.length);

      // Verify stream retrieval
      const stream = localProvider.getFileStream(saved.storageKey);
      assert.ok(stream);
      await new Promise((resolve, reject) => {
        stream.on('data', () => {});
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      // Clean up file
      const deleted = await localProvider.deleteFile(saved.storageKey);
      assert.equal(deleted, true);
    });
  });

  describe('3. AnswerSheet Model Schema & Constraints', () => {
    it('fails validation when required fields are missing', () => {
      const doc = new AnswerSheet({});
      const err = doc.validateSync();
      assert.ok(err, 'Expected validation error');
      assert.ok(err.errors.teacherId);
      assert.ok(err.errors.assessmentId);
      assert.ok(err.errors.classId);
      assert.ok(err.errors.studentName);
      assert.ok(err.errors.originalFileName);
      assert.ok(err.errors.storageKey);
      assert.ok(err.errors.mimeType);
      assert.ok(err.errors.fileSize);
    });

    it('strictly enforces lifecycle status enum values', () => {
      const doc = new AnswerSheet({
        teacherId: teacherA_Id,
        assessmentId: assessmentA_Id,
        classId: classA_Id,
        studentName: 'Aarav Sharma',
        originalFileName: 'sheet.pdf',
        storageKey: 'key-123',
        mimeType: 'application/pdf',
        fileSize: 1024,
        status: 'invalid_status_foo',
      });
      const err = doc.validateSync();
      assert.ok(err);
      assert.ok(err.errors.status);
    });

    it('accepts valid status enum values: uploaded, processing, review_required, verified, processing_failed', () => {
      ['uploaded', 'processing', 'review_required', 'verified', 'processing_failed'].forEach((status) => {
        const doc = new AnswerSheet({
          teacherId: teacherA_Id,
          assessmentId: assessmentA_Id,
          classId: classA_Id,
          studentName: 'Aarav Sharma',
          originalFileName: 'sheet.pdf',
          storageKey: 'key-123',
          mimeType: 'application/pdf',
          fileSize: 1024,
          status,
        });
        const err = doc.validateSync();
        assert.equal(err, undefined);
      });
    });
  });

  describe('4. Modular Extraction & Question Segmentation Logic', () => {
    it('organizes extracted text with question markers into distinct items', () => {
      const pages = [
        {
          pageNumber: 1,
          text: 'Q1. Solve for x: 3x - 7 = 14\n3x = 21\nx = 7\n\nQ2. Simplify: -5 - (-12)\n= -5 + 12 = 7',
        },
      ];

      const organized = organizeExtractedText(pages, 92);
      assert.equal(organized.length, 2);
      assert.equal(organized[0].questionNumber, 'Q1');
      assert.ok(organized[0].rawExtractedText.includes('3x = 21'));
      assert.equal(organized[0].correctedText, organized[0].rawExtractedText);
      assert.equal(organized[0].confidence, 92);
      assert.equal(organized[0].status, 'Needs Review');
      assert.equal(organized[1].questionNumber, 'Q2');
    });

    it('preserves text by page without fabricating questions when no markers are detected', () => {
      const pages = [
        {
          pageNumber: 1,
          text: 'The student wrote their working steps across the page without explicit numbering.',
        },
      ];

      const organized = organizeExtractedText(pages, null);
      assert.equal(organized.length, 1);
      assert.equal(organized[0].questionNumber, 'Page 1');
      assert.equal(organized[0].rawExtractedText, pages[0].text);
      assert.equal(organized[0].status, 'Needs Review');
    });

    it('handles blank documents cleanly with review state and guidance note', () => {
      const pages = [{ pageNumber: 1, text: '' }];
      const organized = organizeExtractedText(pages, 0);
      assert.equal(organized.length, 1);
      assert.equal(organized[0].status, 'Needs Review');
      assert.ok(organized[0].uncertainParts[0].includes('No extractable text'));
    });
  });

  describe('5. Teacher Ownership Isolation & Access Control', () => {
    it('rejects upload to an assessment owned by another teacher with HTTP 404', async () => {
      const req = {
        params: { id: assessmentA_Id.toString() },
        teacher: { _id: teacherB_Id }, // Teacher B attempting access
        body: { studentName: 'Unauthorized Student' },
        files: [{ originalname: 'sheet.pdf', buffer: validPdfBuffer, size: validPdfBuffer.length, mimetype: 'application/pdf' }],
      };
      const res = createMockResponse();

      const originalFindOne = Assessment.findOne;
      Assessment.findOne = (query) => {
        // Enforce teacherId filter
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null); // Assessment not owned by Teacher B
      };

      try {
        await uploadAnswerSheets(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'ASSESSMENT_NOT_FOUND');
      } finally {
        Assessment.findOne = originalFindOne;
      }
    });

    it('prevents Teacher B from retrieving Teacher A answer sheet with HTTP 404', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: answerSheetId.toString() },
        teacher: { _id: teacherB_Id },
      };
      const res = createMockResponse();

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = (query) => {
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return {
          populate: () => ({
            populate: () => ({
              lean: () => Promise.resolve(null),
            }),
          }),
        };
      };

      try {
        await getAnswerSheetById(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'NOT_FOUND');
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });

    it('prevents Teacher B from updating corrections on Teacher A answer sheet', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const answerItemId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: answerSheetId.toString(), answerId: answerItemId.toString() },
        teacher: { _id: teacherB_Id },
        body: { correctedText: 'Malicious edit' },
      };
      const res = createMockResponse();

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = (query) => {
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await updateAnswerCorrection(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'NOT_FOUND');
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });

    it('prevents Teacher B from verifying Teacher A answer sheet', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: answerSheetId.toString() },
        teacher: { _id: teacherB_Id },
      };
      const res = createMockResponse();

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = (query) => {
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await verifyAnswerSheet(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'NOT_FOUND');
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });

    it('prevents Teacher B from deleting Teacher A answer sheet', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: answerSheetId.toString() },
        teacher: { _id: teacherB_Id },
      };
      const res = createMockResponse();

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = (query) => {
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await deleteAnswerSheet(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'NOT_FOUND');
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });
  });

  describe('6. Correction Persistence & Verification Invalidation Lifecycle', () => {
    it('editing an answer preserves original raw OCR text and updates corrected text', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const answerItemId = new mongoose.Types.ObjectId();

      const mockAnswerItem = {
        _id: answerItemId,
        questionNumber: 'Q1',
        rawExtractedText: '3x = 14 - 7 (Original OCR)',
        correctedText: '3x = 14 - 7',
        maxMarks: 5,
        awardedMarks: 1,
        status: 'Needs Review',
      };

      const mockDoc = {
        _id: answerSheetId,
        teacherId: teacherA_Id,
        status: 'review_required',
        verificationStatus: { isVerified: false },
        answers: {
          id: (id) => (id.toString() === answerItemId.toString() ? mockAnswerItem : null),
        },
        save: () => Promise.resolve(),
      };

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = () => Promise.resolve(mockDoc);

      const req = {
        params: { id: answerSheetId.toString(), answerId: answerItemId.toString() },
        teacher: { _id: teacherA_Id },
        body: {
          correctedText: '3x = 14 + 7 = 21, x = 7',
          awardedMarks: 4,
          status: 'Needs Review',
        },
      };
      const res = createMockResponse();

      try {
        await updateAnswerCorrection(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 200);
        // Verify original OCR text was strictly preserved!
        assert.equal(mockAnswerItem.rawExtractedText, '3x = 14 - 7 (Original OCR)');
        // Verify corrected text was updated
        assert.equal(mockAnswerItem.correctedText, '3x = 14 + 7 = 21, x = 7');
        assert.equal(mockAnswerItem.awardedMarks, 4);
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });

    it('rejects verification if the document is not in review_required state (e.g. still uploaded)', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: answerSheetId,
        teacherId: teacherA_Id,
        status: 'uploaded', // Not yet processed
        answers: [],
      };

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = () => Promise.resolve(mockDoc);

      const req = {
        params: { id: answerSheetId.toString() },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      try {
        await verifyAnswerSheet(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 400);
        assert.equal(res.data.code, 'INVALID_STATE_FOR_VERIFICATION');
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });

    it('successfully verifies a processed document in review_required state', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: answerSheetId,
        teacherId: teacherA_Id,
        status: 'review_required',
        verificationStatus: { isVerified: false },
        answers: [
          {
            questionNumber: 'Q1',
            rawExtractedText: 'x = 3',
            correctedText: 'x = 3',
            maxMarks: 5,
            awardedMarks: 5,
            status: 'Needs Review',
          },
        ],
        save: () => Promise.resolve(),
      };

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = () => Promise.resolve(mockDoc);

      const req = {
        params: { id: answerSheetId.toString() },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      try {
        await verifyAnswerSheet(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 200);
        assert.equal(mockDoc.status, 'verified');
        assert.equal(mockDoc.verificationStatus.isVerified, true);
        assert.equal(mockDoc.answers[0].status, 'Verified');
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });

    it('invalidates verification when an answer is edited after verification', async () => {
      const answerSheetId = new mongoose.Types.ObjectId();
      const answerItemId = new mongoose.Types.ObjectId();

      const mockAnswerItem = {
        _id: answerItemId,
        questionNumber: 'Q1',
        rawExtractedText: 'x = 3',
        correctedText: 'x = 3',
        maxMarks: 5,
        awardedMarks: 5,
        status: 'Verified',
      };

      const mockDoc = {
        _id: answerSheetId,
        teacherId: teacherA_Id,
        status: 'verified', // Document was verified
        verificationStatus: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: teacherA_Id,
        },
        answers: {
          id: (id) => (id.toString() === answerItemId.toString() ? mockAnswerItem : null),
        },
        save: () => Promise.resolve(),
      };

      const originalFindOne = AnswerSheet.findOne;
      AnswerSheet.findOne = () => Promise.resolve(mockDoc);

      const req = {
        params: { id: answerSheetId.toString(), answerId: answerItemId.toString() },
        teacher: { _id: teacherA_Id },
        body: { correctedText: 'x = 4 (Subsequent edit)' },
      };
      const res = createMockResponse();

      try {
        await updateAnswerCorrection(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 200);
        // Verification must be invalidated!
        assert.equal(mockDoc.status, 'review_required');
        assert.equal(mockDoc.verificationStatus.isVerified, false);
        assert.equal(mockDoc.verificationStatus.verifiedAt, null);
      } finally {
        AnswerSheet.findOne = originalFindOne;
      }
    });
  });
});

function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.data = payload;
      return res;
    },
  };
  return res;
}
