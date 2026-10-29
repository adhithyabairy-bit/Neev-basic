import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Models
import Assessment from '../src/models/Assessment.js';
import AnswerSheet from '../src/models/AnswerSheet.js';
import Evaluation from '../src/models/Evaluation.js';
import SyllabusDocument from '../src/models/SyllabusDocument.js';
import SyllabusChunk from '../src/models/SyllabusChunk.js';

// Services
import { chunkDocumentPages } from '../src/services/rag/chunkingService.js';
import embeddingService, { cosineSimilarity } from '../src/services/rag/embeddingService.js';
import { computeBufferHash } from '../src/services/rag/ingestionService.js';
import { formatChunksAsEvidence } from '../src/services/rag/retrievalService.js';
import grokService from '../src/services/ai/grokService.js';

// Controllers
import {
  evaluateAnswerSheet,
  getEvaluationsByAnswerSheet,
  approveEvaluation,
  getAssessmentGapOverview,
} from '../src/controllers/evaluationController.js';

describe('Phase 4: Syllabus-Based AI Evaluation & RAG Pipeline Tests', () => {
  const teacherA_Id = new mongoose.Types.ObjectId();
  const teacherB_Id = new mongoose.Types.ObjectId();
  const classA_Id = new mongoose.Types.ObjectId();
  const assessmentA_Id = new mongoose.Types.ObjectId();
  const answerSheetA_Id = new mongoose.Types.ObjectId();
  const answerItemA_Id = new mongoose.Types.ObjectId();

  describe('1. Document Chunking & Deduplication Hash', () => {
    it('computes consistent SHA-256 hash for identical file buffers', () => {
      const buf1 = Buffer.from('Syllabus Content for Grade 8 Mathematics');
      const buf2 = Buffer.from('Syllabus Content for Grade 8 Mathematics');
      const buf3 = Buffer.from('Different Content');

      const hash1 = computeBufferHash(buf1);
      const hash2 = computeBufferHash(buf2);
      const hash3 = computeBufferHash(buf3);

      assert.equal(hash1, hash2);
      assert.notEqual(hash1, hash3);
      assert.equal(typeof hash1, 'string');
      assert.equal(hash1.length, 64);
    });

    it('chunks multi-page text into bounded segments preserving page numbers', () => {
      const pages = [
        {
          pageNumber: 1,
          text: 'Linear Equations in One Variable. A linear equation in one variable has the general form ax + b = 0 where a and b are constants and a != 0. To solve, transpose terms containing the variable to one side and constants to the other side.',
        },
        {
          pageNumber: 2,
          text: 'Applications of Linear Equations. Word problems on numbers, ages, and perimeters can be modeled as linear equations. Always verify the solution by substituting back into the original problem statement.',
        },
      ];

      const chunks = chunkDocumentPages(pages, { chunkSize: 200, chunkOverlap: 40 });
      assert.ok(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);
      assert.equal(chunks[0].pageNumber, 1);
      assert.equal(chunks[chunks.length - 1].pageNumber, 2);
      assert.ok(chunks[0].chunkText.length > 0);
    });
  });

  describe('2. Deterministic Embedding Service & Similarity Math', () => {
    it('generates 1536-dimensional normalized vectors', async () => {
      const text = 'Linear equations in one variable and transposition rules';
      const vector = await embeddingService.generateEmbedding(text);

      assert.equal(vector.length, 1536);
      // Verify normalization: L2 norm should be approximately 1.0
      let norm = 0;
      for (const val of vector) norm += val * val;
      assert.ok(Math.abs(Math.sqrt(norm) - 1.0) < 0.01, 'Vector must be normalized');
    });

    it('calculates higher cosine similarity for semantically related texts', async () => {
      const textA = 'Solving linear equations with variables on both sides';
      const textRelated = 'Linear equation solutions and variable transposition';
      const textUnrelated = 'Photosynthesis process in plant chloroplasts and sunlight';

      const vecA = await embeddingService.generateEmbedding(textA);
      const vecRelated = await embeddingService.generateEmbedding(textRelated);
      const vecUnrelated = await embeddingService.generateEmbedding(textUnrelated);

      const simRelated = cosineSimilarity(vecA, vecRelated);
      const simUnrelated = cosineSimilarity(vecA, vecUnrelated);

      assert.ok(
        simRelated > simUnrelated,
        `Expected related similarity (${simRelated}) > unrelated (${simUnrelated})`
      );
    });

    it('formats retrieved chunks cleanly into evidence context string', () => {
      const sampleChunks = [
        {
          sourceFileName: 'NCERT_Math_Class8.pdf',
          pageNumber: 14,
          lessonName: 'Linear Equations',
          chunkText: 'Transposing a term means moving it from one side of the equation to the other while changing its sign.',
        },
      ];

      const formatted = formatChunksAsEvidence(sampleChunks);
      assert.ok(formatted.includes('NCERT_Math_Class8.pdf'));
      assert.ok(formatted.includes('Page 14'));
      assert.ok(formatted.includes('changing its sign'));
    });
  });

  describe('3. Assessment Rubric & Syllabus Schema Constraints', () => {
    it('accepts valid assessment with lessons and rubric', () => {
      const assessment = new Assessment({
        teacherId: teacherA_Id,
        classId: classA_Id,
        title: 'Midterm Examination',
        subject: 'Mathematics',
        maximumMarks: 20,
        lessons: [
          {
            id: 'les-1',
            name: 'Linear Equations in One Variable',
            grade: 'Grade 8',
          },
        ],
        rubric: [
          {
            questionNumber: 'Q1',
            prompt: 'Solve: 3x - 7 = 14',
            maximumMarks: 5,
            referenceAnswer: 'x = 7',
          },
          {
            questionNumber: 'Q2',
            prompt: 'Simplify: -5 - (-12)',
            maximumMarks: 5,
            referenceAnswer: '7',
          },
        ],
      });

      const err = assessment.validateSync();
      assert.equal(err, undefined);
    });

    it('rejects rubric whose question marks exceed assessment maximumMarks', () => {
      const assessment = new Assessment({
        teacherId: teacherA_Id,
        classId: classA_Id,
        title: 'Quiz',
        subject: 'Mathematics',
        maximumMarks: 10,
        rubric: [
          {
            questionNumber: 'Q1',
            maximumMarks: 8,
          },
          {
            questionNumber: 'Q2',
            maximumMarks: 8, // Total: 16 > 10
          },
        ],
      });

      const err = assessment.validateSync();
      assert.ok(err, 'Expected validation error when rubric sum exceeds total marks');
    });
  });

  describe('4. Evaluation Model Schema & Integrity', () => {
    it('strictly enforces suggestedMarks <= maxMarks constraint', () => {
      const evaluation = new Evaluation({
        teacherId: teacherA_Id,
        assessmentId: assessmentA_Id,
        answerSheetId: answerSheetA_Id,
        answerItemId: answerItemA_Id,
        questionNumber: 'Q1',
        maxMarks: 5,
        suggestedMarks: 7, // Invalid: exceeds maxMarks
      });

      const err = evaluation.validateSync();
      assert.ok(err, 'Expected validation error when suggestedMarks exceeds maxMarks');
    });

    it('passes validation with valid score and teacher feedback structure', () => {
      const evaluation = new Evaluation({
        teacherId: teacherA_Id,
        assessmentId: assessmentA_Id,
        answerSheetId: answerSheetA_Id,
        answerItemId: answerItemA_Id,
        questionNumber: 'Q1',
        prompt: 'Solve 3x - 7 = 14',
        studentAnswer: '3x = 14 - 7 => x = 7/3',
        maxMarks: 5,
        suggestedMarks: 2,
        explanation: 'Transposition sign error in first step; subsequent steps calculated accurately.',
        observedErrors: 'Transposed "-7" as "-7" instead of "+7".',
        misconceptionHypothesis: 'Inverse operations during algebraic equation balance.',
        status: 'review_required',
      });

      const err = evaluation.validateSync();
      assert.equal(err, undefined);
    });
  });

  describe('5. Evaluation Controller Security & Workflow Gating', () => {
    it('strictly rejects AI evaluation if answer sheet is not verified by teacher (HTTP 400 SHEET_NOT_VERIFIED)', async () => {
      const unverifiedSheet = {
        _id: answerSheetA_Id,
        assessmentId: assessmentA_Id,
        teacherId: teacherA_Id,
        status: 'review_required', // Not yet verified!
        verificationStatus: { isVerified: false },
        answers: [{ _id: answerItemA_Id, questionNumber: 'Q1', rawExtractedText: 'x=2' }],
      };

      const originalFindOneAssessment = Assessment.findOne;
      const originalFindOneSheet = AnswerSheet.findOne;

      Assessment.findOne = () => Promise.resolve({ _id: assessmentA_Id, teacherId: teacherA_Id });
      AnswerSheet.findOne = () => Promise.resolve(unverifiedSheet);

      const req = {
        params: { id: assessmentA_Id.toString(), sheetId: answerSheetA_Id.toString() },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      try {
        await evaluateAnswerSheet(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 400);
        assert.equal(res.data.code, 'SHEET_NOT_VERIFIED');
      } finally {
        Assessment.findOne = originalFindOneAssessment;
        AnswerSheet.findOne = originalFindOneSheet;
      }
    });

    it('prevents Teacher B from evaluating Teacher A assessment (HTTP 404)', async () => {
      const req = {
        params: { id: assessmentA_Id.toString(), sheetId: answerSheetA_Id.toString() },
        teacher: { _id: teacherB_Id }, // Teacher B unauthorized
      };
      const res = createMockResponse();

      const originalFindOne = Assessment.findOne;
      Assessment.findOne = (query) => {
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await evaluateAnswerSheet(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'ASSESSMENT_NOT_FOUND');
      } finally {
        Assessment.findOne = originalFindOne;
      }
    });

    it('successfully evaluates verified answer sheet using rubric and syllabus grounding', async () => {
      const verifiedSheet = {
        _id: answerSheetA_Id,
        assessmentId: assessmentA_Id,
        teacherId: teacherA_Id,
        status: 'verified',
        verificationStatus: { isVerified: true },
        answers: [
          {
            _id: answerItemA_Id,
            questionNumber: 'Q1',
            prompt: 'Solve: 3x - 7 = 14',
            correctedText: '3x = 14 - 7 => x = 7/3',
            rawExtractedText: '3x = 14 - 7',
            maxMarks: 5,
            awardedMarks: 1,
          },
        ],
      };

      const mockAssessment = {
        _id: assessmentA_Id,
        teacherId: teacherA_Id,
        title: 'Linear Equations Test',
        subject: 'Mathematics',
        rubric: [
          {
            questionNumber: 'Q1',
            prompt: 'Solve: 3x - 7 = 14',
            maximumMarks: 5,
            referenceAnswer: '3x = 21, x = 7',
            lessonName: 'Linear Equations',
          },
        ],
      };

      const originalFindOneAssessment = Assessment.findOne;
      const originalFindOneSheet = AnswerSheet.findOne;
      const originalFindOneEval = Evaluation.findOne;
      const originalFindOneAndUpdate = Evaluation.findOneAndUpdate;

      Assessment.findOne = () => Promise.resolve(mockAssessment);
      AnswerSheet.findOne = () => Promise.resolve(verifiedSheet);
      Evaluation.findOne = () => Promise.resolve(null);
      Evaluation.findOneAndUpdate = (query, doc) => Promise.resolve(doc);

      const req = {
        params: { id: assessmentA_Id.toString(), sheetId: answerSheetA_Id.toString() },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      try {
        await evaluateAnswerSheet(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 200);
        assert.equal(res.data.success, true);
        assert.equal(res.data.data.length, 1);
        assert.equal(res.data.data[0].questionNumber, 'Q1');
        assert.ok(res.data.data[0].suggestedMarks <= 5);
        assert.ok(res.data.data[0].suggestedMarks >= 0);
        assert.equal(res.data.data[0].isTeacherApproved, false);
      } finally {
        Assessment.findOne = originalFindOneAssessment;
        AnswerSheet.findOne = originalFindOneSheet;
        Evaluation.findOne = originalFindOneEval;
        Evaluation.findOneAndUpdate = originalFindOneAndUpdate;
      }
    });

    it('teacher can explicitly approve or adjust suggested marks (HTTP 200)', async () => {
      const evaluationId = new mongoose.Types.ObjectId();
      const mockEval = {
        _id: evaluationId,
        teacherId: teacherA_Id,
        maxMarks: 5,
        suggestedMarks: 3,
        approvedMarks: null,
        isTeacherApproved: false,
        status: 'review_required',
        save: () => Promise.resolve(),
      };

      const originalFindOne = Evaluation.findOne;
      Evaluation.findOne = () => Promise.resolve(mockEval);

      const req = {
        params: { id: evaluationId.toString() },
        teacher: { _id: teacherA_Id },
        body: { approvedMarks: 4 }, // Teacher adjusts mark from 3 to 4
      };
      const res = createMockResponse();

      try {
        await approveEvaluation(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 200);
        assert.equal(mockEval.approvedMarks, 4);
        assert.equal(mockEval.isTeacherApproved, true);
        assert.equal(mockEval.status, 'approved');
      } finally {
        Evaluation.findOne = originalFindOne;
      }
    });

    it('aggregates real class gap overview by topic with actual mastery percentages', async () => {
      const mockEvaluations = [
        {
          affectedLessonName: 'Linear Equations',
          affectedLessonId: 'les-3',
          maxMarks: 5,
          suggestedMarks: 2,
          approvedMarks: 2,
          observedErrors: 'Transposition sign error',
          misconceptionHypothesis: 'Inverse operations balance',
        },
        {
          affectedLessonName: 'Linear Equations',
          affectedLessonId: 'les-3',
          maxMarks: 5,
          suggestedMarks: 4,
          approvedMarks: 4,
          observedErrors: 'Arithmetic calculation typo',
          misconceptionHypothesis: 'None identified.',
        },
        {
          affectedLessonName: 'Signed Arithmetic',
          affectedLessonId: 'les-1',
          maxMarks: 4,
          suggestedMarks: 4,
          approvedMarks: 4,
          observedErrors: 'None',
          misconceptionHypothesis: 'None identified.',
        },
      ];

      const originalFindAssessment = Assessment.findOne;
      const originalFindEval = Evaluation.find;

      Assessment.findOne = () => Promise.resolve({ _id: assessmentA_Id, teacherId: teacherA_Id });
      Evaluation.find = () => ({
        lean: () => Promise.resolve(mockEvaluations),
      });

      const req = {
        params: { id: assessmentA_Id.toString() },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      try {
        await getAssessmentGapOverview(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 200);
        assert.equal(res.data.data.hasEvaluatedData, true);
        assert.equal(res.data.data.totalEvaluations, 3);

        const summaries = res.data.data.topicSummaries;
        assert.equal(summaries.length, 2);

        // Linear Equations: 6 earned / 10 max = 60% mastery
        const linearSummary = summaries.find((s) => s.topicName === 'Linear Equations');
        assert.equal(linearSummary.averageMastery, 60);

        // Signed Arithmetic: 4 earned / 4 max = 100% mastery
        const signedSummary = summaries.find((s) => s.topicName === 'Signed Arithmetic');
        assert.equal(signedSummary.averageMastery, 100);

        // Priority order: Linear Equations has lower mastery, so it is Rank 1
        assert.equal(res.data.data.recommendedTeachingOrder[0].topicName, 'Linear Equations');
        assert.equal(res.data.data.recommendedTeachingOrder[0].rank, 1);
      } finally {
        Assessment.findOne = originalFindAssessment;
        Evaluation.find = originalFindEval;
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

