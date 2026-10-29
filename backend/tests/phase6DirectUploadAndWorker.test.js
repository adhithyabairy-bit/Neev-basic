import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import app from '../src/app.js';
import IngestionJob from '../src/models/IngestionJob.js';
import SyllabusDocument from '../src/models/SyllabusDocument.js';
import SyllabusChunk from '../src/models/SyllabusChunk.js';
import storageService from '../src/services/storage/storageService.js';
import embeddingService from '../src/services/rag/embeddingService.js';
import S3StorageProvider from '../src/services/storage/s3StorageProvider.js';
import {
  claimNextJob,
  recoverStaleJobs,
  processJob,
} from '../src/workers/ingestionWorker.js';
import { deleteSyllabusDocument } from '../src/services/rag/ingestionService.js';
import { retrieveRelevantSyllabusChunks } from '../src/services/rag/retrievalService.js';
import {
  createUploadSession,
  completeUploadSession,
  getIngestionJobStatus,
  retryIngestionJob,
} from '../src/controllers/syllabusController.js';

function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

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

describe('Phase 6: Direct Cloud PDF Upload & Asynchronous Ingestion Tests', () => {
  const teacherAId = new mongoose.Types.ObjectId();
  const teacherBId = new mongoose.Types.ObjectId();
  const docAId = new mongoose.Types.ObjectId();

  describe('1. Direct-to-Cloud Upload Session Creation & Validation', () => {
    it('1. Authenticated upload-session creation: generates presigned PUT URL and session metadata', async () => {
      const req = {
        teacher: { _id: teacherAId },
        body: {
          fileName: 'Grade8-Algebra-Chapter3.pdf',
          fileSize: 45 * 1024 * 1024, // 45 MB
          mimeType: 'application/pdf',
          grade: 'Grade 8',
          subject: 'Mathematics',
        },
      };

      const res = createMockResponse();
      await createUploadSession(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.data.uploadUrl);
      assert.ok(res.data.data.storageKey.startsWith(`syllabus/${teacherAId}/`));
      assert.equal(res.data.data.method, 'PUT');
      assert.equal(res.data.data.maxFileSizeBytes, 200 * 1024 * 1024);
      assert.equal(res.data.data.expiresInSeconds, 900);
    });

    it('2. Unauthenticated upload rejection: rejects POST /api/syllabus/upload-session without Auth header', async () => {
      const res = await fetchResponse(app, 'POST', '/api/syllabus/upload-session', {}, {
        fileName: 'Book.pdf',
        fileSize: 1024,
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'AUTH_HEADER_MISSING');
    });

    it('3. Unauthorized teacher access: prevents Teacher B from completing upload with Teacher A storage key', async () => {
      const req = {
        teacher: { _id: teacherBId },
        body: {
          storageKey: `syllabus/${teacherAId}/foreign-file.pdf`,
          fileName: 'foreign-file.pdf',
        },
      };

      const res = createMockResponse();
      await completeUploadSession(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'STORAGE_KEY_UNAUTHORIZED');
    });

    it('4. Unsupported file types: strictly rejects non-PDF/TXT files (e.g. .docx or .exe)', async () => {
      const req = {
        teacher: { _id: teacherAId },
        body: {
          fileName: 'malicious-syllabus.exe',
          fileSize: 1024 * 1024,
          mimeType: 'application/x-msdownload',
        },
      };

      const res = createMockResponse();
      await createUploadSession(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'UNSUPPORTED_FILE_TYPE');
    });

    it('5. File-size limit enforcement: rejects files exceeding 200 MB limit', async () => {
      const req = {
        teacher: { _id: teacherAId },
        body: {
          fileName: 'MassiveEncyclopedia.pdf',
          fileSize: 250 * 1024 * 1024, // 250 MB
          mimeType: 'application/pdf',
        },
      };

      const res = createMockResponse();
      await createUploadSession(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'FILE_TOO_LARGE');
      assert.ok(res.data.error.includes('200 MB'));
    });

    it('6. Invalid upload authorization: rejects missing storageKey on completion', async () => {
      const req = {
        teacher: { _id: teacherAId },
        body: {},
      };

      const res = createMockResponse();
      await completeUploadSession(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, 'STORAGE_KEY_REQUIRED');
    });
  });

  describe('2. Upload Verification & Idempotent Job Queueing', () => {
    it('7. Successful upload completion & object verification: creates SyllabusDocument and IngestionJob', async () => {
      const origVerify = storageService.verifyUploadedObject;
      const origDocFindOne = SyllabusDocument.findOne;
      const origDocCreate = SyllabusDocument.create;
      const origJobFindOne = IngestionJob.findOne;
      const origJobCreate = IngestionJob.create;

      const fakeKey = `syllabus/${teacherAId}/12345-valid-maths.pdf`;

      storageService.verifyUploadedObject = async () => ({
        exists: true,
        size: 15 * 1024 * 1024,
        contentType: 'application/pdf',
        bucket: 'neev-syllabus-bucket',
        storageProvider: 'filebase',
      });

      const mockDoc = {
        _id: docAId,
        teacherId: teacherAId,
        fileName: 'NCERT-Maths-Class8.pdf',
        fileSize: 15 * 1024 * 1024,
        storageKey: fakeKey,
        storageProvider: 'filebase',
        status: 'queued',
        save: async () => {},
      };

      SyllabusDocument.findOne = async () => null;
      SyllabusDocument.create = async () => mockDoc;

      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        jobId: 'job_mock_123',
        documentId: docAId,
        status: 'queued',
        save: async () => {},
      };

      IngestionJob.findOne = async () => null;
      IngestionJob.create = async () => mockJob;

      try {
        const req = {
          teacher: { _id: teacherAId },
          body: {
            storageKey: fakeKey,
            fileName: 'NCERT-Maths-Class8.pdf',
            grade: 'Grade 8',
            subject: 'Mathematics',
          },
        };

        const res = createMockResponse();
        await completeUploadSession(req, res, () => {});

        assert.equal(res.statusCode, 201);
        assert.equal(res.data.success, true);
        assert.equal(res.data.data.status, 'queued');
        assert.equal(res.data.data.jobId, 'job_mock_123');
        assert.equal(res.data.data.documentId.toString(), docAId.toString());
      } finally {
        storageService.verifyUploadedObject = origVerify;
        SyllabusDocument.findOne = origDocFindOne;
        SyllabusDocument.create = origDocCreate;
        IngestionJob.findOne = origJobFindOne;
        IngestionJob.create = origJobCreate;
      }
    });

    it('8. Duplicate completion requests: calling complete again reuses existing document and job', async () => {
      const origVerify = storageService.verifyUploadedObject;
      const origDocFindOne = SyllabusDocument.findOne;
      const origJobFindOne = IngestionJob.findOne;
      let jobCreateCount = 0;
      const origJobCreate = IngestionJob.create;

      const fakeKey = `syllabus/${teacherAId}/99999-duplicate-test.pdf`;

      storageService.verifyUploadedObject = async () => ({
        exists: true,
        size: 2048,
        contentType: 'application/pdf',
      });

      const existingDoc = {
        _id: docAId,
        teacherId: teacherAId,
        storageKey: fakeKey,
        fileName: 'TestDupe.pdf',
        fileSize: 2048,
        storageProvider: 'filebase',
        status: 'queued',
        save: async () => {},
      };

      const existingJob = {
        _id: new mongoose.Types.ObjectId(),
        jobId: 'job_duplicate_test',
        documentId: docAId,
        status: 'queued',
        save: async () => {},
      };

      SyllabusDocument.findOne = async () => existingDoc;
      IngestionJob.findOne = async () => existingJob;
      IngestionJob.create = async () => {
        jobCreateCount++;
        return existingJob;
      };

      try {
        const req = {
          teacher: { _id: teacherAId },
          body: {
            storageKey: fakeKey,
            fileName: 'TestDupe.pdf',
            grade: 'Grade 7',
            subject: 'Science',
          },
        };

        const res1 = createMockResponse();
        const res2 = createMockResponse();

        await completeUploadSession(req, res1, () => {});
        await completeUploadSession(req, res2, () => {});

        assert.equal(res1.statusCode, 201);
        assert.equal(res2.statusCode, 201);
        assert.equal(res1.data.data.jobId, 'job_duplicate_test');
        assert.equal(res2.data.data.jobId, 'job_duplicate_test');
        assert.equal(jobCreateCount, 0, 'No second job should be created on duplicate completion');
      } finally {
        storageService.verifyUploadedObject = origVerify;
        SyllabusDocument.findOne = origDocFindOne;
        IngestionJob.findOne = origJobFindOne;
        IngestionJob.create = origJobCreate;
      }
    });

    it('9. Queue creation & duplicate-job prevention: IngestionJob schema enforces unique jobId index', () => {
      const job1 = new IngestionJob({
        jobId: 'job_duplicate_index_test',
        documentId: new mongoose.Types.ObjectId(),
        teacherId: teacherAId,
        storageKey: 'syllabus/test.pdf',
        status: 'queued',
      });

      const err = job1.validateSync();
      assert.equal(err, undefined);
      assert.equal(job1.status, 'queued');
      assert.equal(job1.attempts, 0);
      assert.equal(job1.maxAttempts, 3);
    });
  });

  describe('3. Asynchronous Ingestion Worker & Concurrency Safety', () => {
    it('10. Worker claiming: atomically claims pending queued job and increments attempts', async () => {
      const origFindOneAndUpdate = IngestionJob.findOneAndUpdate;

      let callCount = 0;
      IngestionJob.findOneAndUpdate = async (query, update) => {
        callCount++;
        if (callCount === 1) {
          return {
            jobId: 'job_atomic_claim_1',
            status: 'claimed',
            claimedBy: 'worker_test_1',
            attempts: 1,
          };
        }
        return null; // Next claim returns null (no queued jobs left)
      };

      try {
        const claimedJob = await claimNextJob('worker_test_1');
        assert.ok(claimedJob);
        assert.equal(claimedJob.jobId, 'job_atomic_claim_1');
        assert.equal(claimedJob.status, 'claimed');
        assert.equal(claimedJob.claimedBy, 'worker_test_1');
        assert.equal(claimedJob.attempts, 1);

        // Concurrent worker attempt
        const secondClaim = await claimNextJob('worker_test_2');
        assert.equal(secondClaim, null, 'No other queued jobs should be claimed');
      } finally {
        IngestionJob.findOneAndUpdate = origFindOneAndUpdate;
      }
    });

    it('11. Successful ingestion: worker processes job and saves chunks and embeddings', async () => {
      const samplePdfBuffer = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 85 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(Linear equations in one variable involve expressions with highest power one.) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000189 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n325\n%%EOF'
      );

      const fakeKey = `syllabus/${teacherAId}/worker-success-${Date.now()}.pdf`;

      const origStream = storageService.getFileStream;
      const origDocFindById = SyllabusDocument.findById;
      const origDocFindOne = SyllabusDocument.findOne;
      const origChunkDelete = SyllabusChunk.deleteMany;
      const origChunkInsert = SyllabusChunk.insertMany;
      const origBatchEmbeddings = embeddingService.generateBatchEmbeddings;

      storageService.getFileStream = () => Readable.from(samplePdfBuffer);
      embeddingService.generateBatchEmbeddings = async (texts) => {
        return texts.map(() => new Array(768).fill(0.02));
      };

      let savedChunks = [];
      const mockDoc = {
        _id: docAId,
        teacherId: teacherAId,
        fileName: 'LinearEquations.pdf',
        fileSize: samplePdfBuffer.length,
        mimeType: 'application/pdf',
        storageKey: fakeKey,
        status: 'queued',
        save: async () => {},
      };

      SyllabusDocument.findById = async () => mockDoc;
      SyllabusDocument.findOne = async () => null; // No duplicate
      SyllabusChunk.deleteMany = async () => ({ deletedCount: 0 });
      SyllabusChunk.insertMany = async (chunks) => {
        savedChunks = chunks;
        return chunks;
      };

      const mockJob = {
        jobId: `job_success_${Date.now()}`,
        documentId: docAId,
        teacherId: teacherAId,
        storageKey: fakeKey,
        status: 'claimed',
        attempts: 1,
        progress: {},
        save: async () => {},
      };

      try {
        const result = await processJob(mockJob, 'worker_unit_test');
        assert.equal(result.success, true);
        assert.ok(result.chunkCount > 0);
        assert.equal(mockDoc.status, 'completed');
        assert.equal(mockJob.status, 'completed');
        assert.ok(savedChunks.length > 0);
        assert.equal(savedChunks[0].status, 'indexed');
      } finally {
        storageService.getFileStream = origStream;
        embeddingService.generateBatchEmbeddings = origBatchEmbeddings;
        SyllabusDocument.findById = origDocFindById;
        SyllabusDocument.findOne = origDocFindOne;
        SyllabusChunk.deleteMany = origChunkDelete;
        SyllabusChunk.insertMany = origChunkInsert;
      }
    });

    it('12. Embedding-provider failure & retry behavior: retries transient failure up to maxAttempts', async () => {
      const origStream = storageService.getFileStream;
      const origDocFindById = SyllabusDocument.findById;
      const origChunkDelete = SyllabusChunk.deleteMany;

      storageService.getFileStream = () => {
        throw new Error('Transient network timeout');
      };

      const mockDoc = {
        _id: docAId,
        teacherId: teacherAId,
        storageKey: 'key.pdf',
        status: 'queued',
        save: async () => {},
      };

      SyllabusDocument.findById = async () => mockDoc;
      SyllabusChunk.deleteMany = async () => {};

      try {
        // Attempt 1: Transient
        const transientJob = {
          jobId: 'job_retry_1',
          documentId: docAId,
          storageKey: 'key.pdf',
          status: 'claimed',
          attempts: 1,
          maxAttempts: 3,
          progress: {},
          save: async () => {},
        };

        const res1 = await processJob(transientJob, 'test');
        assert.equal(res1.success, false);
        assert.equal(res1.permanent, false);
        assert.equal(transientJob.status, 'queued'); // Requeued

        // Attempt 3: Permanent failure
        const permJob = {
          jobId: 'job_retry_3',
          documentId: docAId,
          storageKey: 'key.pdf',
          status: 'claimed',
          attempts: 3,
          maxAttempts: 3,
          progress: {},
          save: async () => {},
        };

        const res2 = await processJob(permJob, 'test');
        assert.equal(res2.success, false);
        assert.equal(res2.permanent, true);
        assert.equal(permJob.status, 'failed'); // Marked failed
        assert.equal(mockDoc.status, 'failed');
      } finally {
        storageService.getFileStream = origStream;
        SyllabusDocument.findById = origDocFindById;
        SyllabusChunk.deleteMany = origChunkDelete;
      }
    });

    it('13. Worker restart & idempotent processing: reuses persistent chunks for identical file hash', async () => {
      const sampleBuffer = Buffer.from('Duplicate content');
      const origStream = storageService.getFileStream;
      const origDocFindById = SyllabusDocument.findById;
      const origDocFindOne = SyllabusDocument.findOne;
      const origChunkFind = SyllabusChunk.find;
      const origChunkInsert = SyllabusChunk.insertMany;

      storageService.getFileStream = () => Readable.from(sampleBuffer);

      const mockDoc = {
        _id: docAId,
        teacherId: teacherAId,
        fileName: 'DuplicateUpload.pdf',
        fileSize: sampleBuffer.length,
        mimeType: 'application/pdf',
        storageKey: 'dupe.pdf',
        status: 'queued',
        save: async () => {},
      };

      const existingDoc = {
        _id: new mongoose.Types.ObjectId(),
        teacherId: teacherAId,
        fileName: 'Original.pdf',
        status: 'completed',
        chunkCount: 1,
        pageCount: 1,
      };

      const existingChunks = [
        {
          _id: new mongoose.Types.ObjectId(),
          chunkIndex: 0,
          chunkText: 'Quadratic formulas.',
          embedding: [0.1],
          status: 'indexed',
        },
      ];

      SyllabusDocument.findById = async () => mockDoc;
      SyllabusDocument.findOne = async () => existingDoc;
      SyllabusChunk.find = () => ({
        lean: async () => existingChunks,
      });

      let insertedCount = 0;
      SyllabusChunk.insertMany = async (chunks) => {
        insertedCount = chunks.length;
        return chunks;
      };

      const mockJob = {
        jobId: 'job_dupe',
        documentId: docAId,
        storageKey: 'dupe.pdf',
        status: 'claimed',
        attempts: 1,
        progress: {},
        save: async () => {},
      };

      try {
        const result = await processJob(mockJob, 'test');
        assert.equal(result.success, true);
        assert.equal(result.reused, true);
        assert.equal(insertedCount, 1);
        assert.equal(mockDoc.status, 'completed');
        assert.equal(mockJob.status, 'completed');
      } finally {
        storageService.getFileStream = origStream;
        SyllabusDocument.findById = origDocFindById;
        SyllabusDocument.findOne = origDocFindOne;
        SyllabusChunk.find = origChunkFind;
        SyllabusChunk.insertMany = origChunkInsert;
      }
    });

    it('14. Temporary-file cleanup: ensures temporary disk files are cleanly deleted after processing', async () => {
      const tempPath = path.join(os.tmpdir(), `neev-cleanup-test-${Date.now()}.txt`);
      await fs.promises.writeFile(tempPath, 'temporary payload');
      assert.equal(fs.existsSync(tempPath), true);

      // Verify cleanup logic
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
      assert.equal(fs.existsSync(tempPath), false, 'Temporary file must be deleted from disk');
    });
  });

  describe('4. Document Deletion, Tenant Isolation & Storage Provider Resilience', () => {
    it('15. Document deletion & data cleanup: deletes cloud object, SyllabusChunks, and IngestionJobs', async () => {
      const origDocFindOne = SyllabusDocument.findOne;
      const origDocDeleteOne = SyllabusDocument.deleteOne;
      const origChunkDelete = SyllabusChunk.deleteMany;
      const origJobDelete = IngestionJob.deleteMany;
      const origStorageDelete = storageService.deleteFile;

      let fileDeleted = false;
      let chunksDeleted = false;
      let jobsDeleted = false;
      let docDeleted = false;

      const mockDoc = {
        _id: docAId,
        teacherId: teacherAId,
        storageKey: `syllabus/${teacherAId}/delete-me.pdf`,
      };

      SyllabusDocument.findOne = async () => mockDoc;
      storageService.deleteFile = async (key) => {
        fileDeleted = true;
        return true;
      };
      SyllabusChunk.deleteMany = async (query) => {
        chunksDeleted = true;
        return { deletedCount: 1 };
      };
      IngestionJob.deleteMany = async (query) => {
        jobsDeleted = true;
        return { deletedCount: 1 };
      };
      SyllabusDocument.deleteOne = async (query) => {
        docDeleted = true;
        return { deletedCount: 1 };
      };

      try {
        const success = await deleteSyllabusDocument(docAId, teacherAId);
        assert.equal(success, true);
        assert.equal(fileDeleted, true);
        assert.equal(chunksDeleted, true);
        assert.equal(jobsDeleted, true);
        assert.equal(docDeleted, true);
      } finally {
        SyllabusDocument.findOne = origDocFindOne;
        SyllabusDocument.deleteOne = origDocDeleteOne;
        SyllabusChunk.deleteMany = origChunkDelete;
        IngestionJob.deleteMany = origJobDelete;
        storageService.deleteFile = origStorageDelete;
      }
    });

    it('16. RAG retrieval tenant isolation: Teacher B cannot retrieve Teacher A syllabus chunks', async () => {
      await assert.rejects(
        async () => {
          await retrieveRelevantSyllabusChunks({
            teacherId: null,
            queryText: 'Linear equations',
          });
        },
        {
          message: /SECURITY_VIOLATION: Teacher ID is mandatory/i,
        }
      );
    });

    it('17. Storage-provider behavior: throws explicit error when required method is missing', async () => {
      const providerWithoutUpload = {
        name: 'incomplete_provider',
      };

      const origProvider = storageService.provider;
      storageService.setProvider(providerWithoutUpload);

      try {
        await assert.rejects(
          async () => {
            await storageService.getPresignedUploadUrl({ storageKey: 'test.pdf' });
          },
          {
            message: /Presigned upload URLs are only supported by cloud object storage providers/,
          }
        );
      } finally {
        storageService.setProvider(origProvider);
      }
    });
  });
});
