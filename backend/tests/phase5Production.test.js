import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EmbeddingService, cosineSimilarity } from '../src/services/rag/embeddingService.js';
import { GrokService } from '../src/services/ai/grokService.js';
import FirebaseStorageProvider from '../src/services/storage/firebaseStorageProvider.js';
import S3StorageProvider from '../src/services/storage/s3StorageProvider.js';
import storageService from '../src/services/storage/storageService.js';
import SyllabusChunk from '../src/models/SyllabusChunk.js';
import SyllabusDocument from '../src/models/SyllabusDocument.js';
import { computeBufferHash } from '../src/services/rag/ingestionService.js';
import { retrieveRelevantSyllabusChunks } from '../src/services/rag/retrievalService.js';

describe('Phase 5: Production-Ready RAG, Cloud Storage & Deployment Tests', () => {
  describe('1. Explicit Mock vs Cloud Embedding Configuration', () => {
    it('rejects mock embeddings in production environment', async () => {
      const prodService = new EmbeddingService({
        provider: 'mock',
      });
      // Simulate production
      const origEnv = process.env.NODE_ENV;
      const origAllow = process.env.ALLOW_MOCK_EMBEDDINGS;
      try {
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_MOCK_EMBEDDINGS = 'false';
        prodService.allowMock = false;

        await assert.rejects(
          async () => {
            await prodService.generateEmbedding('Sample question');
          },
          {
            message: /CRITICAL: Mock embedding provider cannot be used in production/,
          }
        );
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.ALLOW_MOCK_EMBEDDINGS = origAllow;
      }
    });

    it('throws explicit error when cloud provider API key is missing in production mode', async () => {
      const realGeminiService = new EmbeddingService({
        provider: 'gemini',
        apiKey: null,
      });
      realGeminiService.allowMock = false;

      await assert.rejects(
        async () => {
          await realGeminiService.generateEmbedding('Sample query text');
        },
        {
          message: /Missing API key for cloud provider 'gemini'/,
        }
      );
    });

    it('supports 768-dimensional Gemini embedding configuration', () => {
      const geminiService = new EmbeddingService({
        provider: 'gemini',
        dimension: 768,
      });
      assert.equal(geminiService.getDimension(), 768);
      assert.equal(geminiService.getModelName(), 'text-embedding-004');
    });

    it('generates normalized vectors with explicit mock provider in test mode', async () => {
      const testService = new EmbeddingService({
        provider: 'mock',
        dimension: 768,
      });
      const vector = await testService.generateEmbedding('Linear equations in one variable');
      assert.equal(Array.isArray(vector), true);
      assert.equal(vector.length, 768);

      // Verify L2 normalization: sum of squares ≈ 1.0
      const normSq = vector.reduce((sum, v) => sum + v * v, 0);
      assert.ok(Math.abs(normSq - 1.0) < 0.05, `Vector norm square should be ~1.0, got ${normSq}`);
    });
  });

  describe('2. Grok AI Evaluation: Rejection of Fabricated Production Marks', () => {
    it('throws explicit GROK_UNCONFIGURED error when key is missing and mock is not permitted', async () => {
      const unconfiguredGrok = new GrokService({
        apiKey: null,
      });
      unconfiguredGrok.allowMock = false;

      await assert.rejects(
        async () => {
          await unconfiguredGrok.evaluateAnswer({
            questionNumber: 'Q1',
            studentAnswer: '3x = 21 => x = 7',
            maxMarks: 5,
          });
        },
        {
          message: /GROK_UNCONFIGURED/,
        }
      );
    });

    it('labels mock evaluations explicitly in test mode (never claims real Grok AI succeeded)', async () => {
      const mockGrok = new GrokService({
        apiKey: null,
      });
      mockGrok.allowMock = true;

      const result = await mockGrok.evaluateAnswer({
        questionNumber: 'Q1',
        prompt: 'Solve: 3x - 7 = 14',
        studentAnswer: '3x = 14 + 7 => 3x = 21 => x = 7',
        referenceAnswer: '3x = 21 => x = 7',
        maxMarks: 5,
      });

      assert.equal(result.isMock, true);
      assert.equal(result.evaluatorProvider, 'heuristic_mock');
      assert.ok(result.suggestedMarks <= 5);
      assert.ok(result.suggestedMarks >= 0);
    });

    it('strictly clamps suggested marks within [0, maxMarks]', async () => {
      const mockGrok = new GrokService({
        apiKey: null,
      });
      mockGrok.allowMock = true;

      const result = await mockGrok.evaluateAnswer({
        questionNumber: 'Q1',
        prompt: 'Solve: 3x - 7 = 14',
        studentAnswer: '3x = 21 => x = 7',
        maxMarks: 3,
      });

      assert.ok(result.suggestedMarks <= 3, 'Suggested marks cannot exceed question maxMarks');
      assert.ok(result.suggestedMarks >= 0, 'Suggested marks cannot be negative');
    });
  });

  describe('3. Cloud Object Storage Adapters (Firebase & S3/Filebase 5GB Free Tier)', () => {
    it('Firebase: generates collision-free safe storage keys preserving file extensions', () => {
      const fb = new FirebaseStorageProvider({ bucketName: 'neev-test.appspot.com' });
      const key1 = fb.generateKey('Maths Chapter 1.pdf', 'syllabus/teacher-123');
      const key2 = fb.generateKey('Maths Chapter 1.pdf', 'syllabus/teacher-123');

      assert.notEqual(key1, key2, 'Keys must be collision-free and unique');
      assert.ok(key1.startsWith('syllabus/teacher-123/'));
      assert.ok(key1.endsWith('Maths_Chapter_1.pdf') || key1.endsWith('.pdf'));
    });

    it('Firebase: throws explicit error when trying to upload without configured bucket', async () => {
      const fb = new FirebaseStorageProvider({ bucketName: null });

      await assert.rejects(
        async () => {
          await fb.saveFile({
            buffer: Buffer.from('PDF content'),
            originalName: 'Chapter1.pdf',
          });
        },
        {
          message: /FIREBASE_STORAGE_NOT_CONFIGURED/,
        }
      );
    });

    it('Filebase/S3: supports Filebase S3-compatible configuration (5GB free tier)', () => {
      const fbS3 = new S3StorageProvider({
        providerType: 'filebase',
        endpoint: 'https://s3.filebase.io',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucketName: 'neev-filebase-bucket',
      });

      assert.equal(fbS3.name, 'filebase');
      assert.equal(fbS3.endpoint, 'https://s3.filebase.io');
      assert.equal(fbS3.isConfigured(), true);
    });

    it('Filebase/S3: reports not configured when credentials are missing', () => {
      const s3 = new S3StorageProvider({
        providerType: 'filebase',
        accessKeyId: null,
        secretAccessKey: null,
      });
      assert.equal(s3.isConfigured(), false);
    });

    it('Filebase/S3: throws explicit error when trying to upload without credentials', async () => {
      const s3 = new S3StorageProvider({
        providerType: 'filebase',
        accessKeyId: null,
        secretAccessKey: null,
      });

      await assert.rejects(
        async () => {
          await s3.saveFile({
            buffer: Buffer.from('PDF content'),
            originalName: 'Chapter1.pdf',
          });
        },
        {
          message: /S3_STORAGE_NOT_CONFIGURED/,
        }
      );
    });

    it('Filebase/S3: safely verifies connection reporting unconfigured state gracefully', async () => {
      const s3 = new S3StorageProvider({
        providerType: 'filebase',
        accessKeyId: null,
      });
      const check = await s3.verifyConnection();
      assert.equal(check.connected, false);
      assert.ok(check.reason.includes('not configured'));
    });
  });

  describe('4. Persistent Chunk & Document Schema Constraints', () => {
    it('validates SyllabusChunk schema with audited metadata (hash, model, dimensions)', () => {
      const chunk = new SyllabusChunk({
        chunkId: 'doc123_chunk_0',
        documentId: '507f1f77bcf86cd799439011',
        teacherId: '507f1f77bcf86cd799439012',
        sourceFileName: 'Algebra.pdf',
        chunkIndex: 0,
        chunkText: 'When transposing terms across an equals sign, invert operations.',
        contentHash: 'a'.repeat(64),
        embeddingModel: 'text-embedding-004',
        embeddingDimensions: 768,
        status: 'indexed',
        pageNumber: 5,
        pageRange: '5-6',
      });

      const err = chunk.validateSync();
      assert.equal(err, undefined, 'SyllabusChunk should be valid with all audit fields');
      assert.equal(chunk.chunkId, 'doc123_chunk_0');
      assert.equal(chunk.embeddingDimensions, 768);
      assert.equal(chunk.status, 'indexed');
    });

    it('accepts ocr_required status in SyllabusDocument for scanned PDFs', () => {
      const doc = new SyllabusDocument({
        teacherId: '507f1f77bcf86cd799439012',
        fileName: 'ScannedMaths.pdf',
        fileSize: 1048576,
        fileHash: 'b'.repeat(64),
        mimeType: 'application/pdf',
        storageProvider: 'r2',
        storageKey: 'syllabus/test/scanned.pdf',
        status: 'ocr_required',
        embeddingDimensions: 768,
      });

      const err = doc.validateSync();
      assert.equal(err, undefined, 'SyllabusDocument should accept ocr_required status');
      assert.equal(doc.status, 'ocr_required');
      assert.equal(doc.storageProvider, 'r2');
    });
  });

  describe('5. RAG Retrieval Transparency & Tenant Isolation', () => {
    it('rejects retrieval queries lacking teacherId (security gate)', async () => {
      await assert.rejects(
        async () => {
          await retrieveRelevantSyllabusChunks({
            teacherId: null,
            queryText: 'Transposition of negative terms',
          });
        },
        {
          message: /SECURITY_VIOLATION: Teacher ID is mandatory/,
        }
      );
    });

    it('reports accurate degraded status when Atlas Vector index is not present', async () => {
      const result = await retrieveRelevantSyllabusChunks({
        teacherId: '507f1f77bcf86cd799439012',
        queryText: 'Solve for x: 3x - 7 = 14',
      });

      // When DB is offline or Atlas Vector Search is bypassed, isDegraded must be true
      assert.equal(result.isDegraded, true);
      assert.notEqual(result.retrievalMethod, 'atlas_vector_search');
      assert.equal(result.vectorSearchAvailable, false);
    });

    it('computes consistent SHA-256 hash for identical file buffers', () => {
      const buf1 = Buffer.from('Syllabus textbook chapter 1 content');
      const buf2 = Buffer.from('Syllabus textbook chapter 1 content');
      const buf3 = Buffer.from('Different chapter content');

      assert.equal(computeBufferHash(buf1), computeBufferHash(buf2));
      assert.notEqual(computeBufferHash(buf1), computeBufferHash(buf3));
    });
  });
});

