import mongoose from 'mongoose';
import Assessment from '../models/Assessment.js';
import AnswerSheet from '../models/AnswerSheet.js';
import Evaluation from '../models/Evaluation.js';
import storageService from '../services/storage/storageService.js';
import { processDocumentExtraction } from '../services/extraction/extractionService.js';
import { retrieveRelevantSyllabusChunks, formatChunksAsEvidence } from '../services/rag/retrievalService.js';
import grokService from '../services/ai/grokService.js';

/**
 * POST /api/assessments/:id/answer-sheets/:sheetId/evaluate
 * Evaluates a teacher-verified answer sheet against syllabus and rubric.
 * Strictly gated: Rejects if answer sheet is not verified by teacher.
 */
export async function evaluateAnswerSheet(req, res, next) {
  try {
    const { id: assessmentId, sheetId } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(assessmentId) || !mongoose.isValidObjectId(sheetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID or answer sheet ID format.',
        code: 'INVALID_ID_FORMAT',
      });
    }

    // 1. Verify assessment exists and belongs to this teacher
    const assessment = await Assessment.findOne({ _id: assessmentId, teacherId });
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or access denied.',
        code: 'ASSESSMENT_NOT_FOUND',
      });
    }

    // 2. Verify answer sheet exists and belongs to this teacher
    const answerSheet = await AnswerSheet.findOne({ _id: sheetId, assessmentId, teacherId });
    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found or does not belong to this assessment.',
        code: 'ANSWER_SHEET_NOT_FOUND',
      });
    }

    // 3. Strict Verification Gate: Cannot evaluate unverified student work!
    const isVerified =
      answerSheet.status === 'verified' ||
      Boolean(answerSheet.verificationStatus?.isVerified);

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        error:
          'Answer sheet must be explicitly verified and confirmed by the teacher before AI evaluation can proceed.',
        code: 'SHEET_NOT_VERIFIED',
      });
    }

    if (!answerSheet.answers || answerSheet.answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Answer sheet has no questions or extracted answers to evaluate.',
        code: 'NO_ANSWERS_TO_EVALUATE',
      });
    }

    // Build map of rubric questions for quick lookup
    const rubricMap = new Map();
    if (Array.isArray(assessment.rubric)) {
      assessment.rubric.forEach((r) => {
        const key = (r.questionNumber || '').trim().toUpperCase();
        if (key) rubricMap.set(key, r);
      });
    }

    // Check if an official Marking Scheme document was uploaded for this assessment
    const markingSchemeDoc = await AnswerSheet.findOne({
      assessmentId,
      teacherId,
      $or: [
        { category: 'marking-scheme' },
        { originalFileName: { $regex: /marking|rubric|scheme/i } },
      ],
    });

    if (markingSchemeDoc) {
      if (!markingSchemeDoc.answers || markingSchemeDoc.answers.length === 0) {
        try {
          const msBuf = await storageService.getFileBuffer(markingSchemeDoc.storageKey);
          const msExt = await processDocumentExtraction(msBuf, markingSchemeDoc.mimeType, {
            category: 'marking-scheme',
            subject: assessment.subject,
          });
          markingSchemeDoc.rawOcrText = msExt.rawOcrText;
          markingSchemeDoc.answers = msExt.answers;
          markingSchemeDoc.status = 'review_required';
          await markingSchemeDoc.save();
        } catch (msErr) {
          console.warn('[EvaluateAnswerSheet] Auto-extract marking scheme notice:', msErr.message);
        }
      }

      if (Array.isArray(markingSchemeDoc.answers)) {
        markingSchemeDoc.answers.forEach((ans) => {
          const key = (ans.questionNumber || '').trim().toUpperCase();
          if (key && !rubricMap.has(key)) {
            rubricMap.set(key, {
              questionNumber: ans.questionNumber,
              prompt: ans.prompt,
              maximumMarks: ans.maxMarks || 5,
              referenceAnswer: ans.correctedText || ans.rawExtractedText || ans.prompt,
              keyPoints: [ans.prompt || 'Expected answer from official marking scheme'],
            });
          }
        });
      }
    }

    // Auto-detect actual curriculum subject if assessment was left as default Mathematics
    const allAnswersText = (answerSheet.answers || [])
      .map((a) => `${a.prompt || ''} ${a.correctedText || a.rawExtractedText || ''}`)
      .join(' ')
      .toLowerCase();

    const isScienceDetected =
      /osmosis|cell|organelle|nucleus|mitochondria|golgi|prokaryot|eukaryot|plant|potato|membrane|diffusion|respiration|photosynthesis|scientific model|prediction|hypothesis/i.test(
        allAnswersText
      ) ||
      /science|bio|chem|phys/i.test(answerSheet.originalFileName || '');

    let effectiveSubject = assessment.subject || 'Mathematics';
    if (isScienceDetected && (!effectiveSubject || effectiveSubject.toLowerCase().includes('math'))) {
      effectiveSubject = 'Science / Physics';
      try {
        await Assessment.findByIdAndUpdate(assessment._id, { subject: 'Science / Physics' });
      } catch (subErr) {
        console.warn('[EvaluationController] Auto-update assessment subject notice:', subErr.message);
      }
    }

    // 4. Evaluate each question concurrently using Promise.all for high speed and responsiveness
    const evalPromises = answerSheet.answers.map(async (item) => {
      const qNumKey = (item.questionNumber || '').trim().toUpperCase();
      const rubricItem = rubricMap.get(qNumKey);

      // Determine rubric values: prioritize explicit rubric if configured
      const prompt = rubricItem?.prompt || item.prompt || `Question ${item.questionNumber}`;
      const maxMarks = rubricItem?.maximumMarks || item.maxMarks || 5;
      const referenceAnswer = rubricItem?.referenceAnswer || '';
      const keyPoints = rubricItem?.keyPoints || [];
      const lessonId = rubricItem?.lessonId || '';

      // Text to evaluate: student's teacher-corrected answer (falls back to raw OCR text)
      const studentAnswer = (item.correctedText || item.rawExtractedText || '').trim();

      // Determine clean, conceptual lesson name
      let lessonName = rubricItem?.lessonName;
      if (!lessonName || lessonName === 'Mathematics' || lessonName === 'Science / Physics' || lessonName.startsWith('Foundational')) {
        const qText = `${prompt} ${referenceAnswer} ${studentAnswer}`.toLowerCase();
        if (/osmosis|potato|semi-permeable|diffusion|water movement|concentration/i.test(qText)) {
          lessonName = 'Osmosis & Cellular Transport';
        } else if (/organelle|nucleus|mitochondria|golgi|atp|energy currency/i.test(qText)) {
          lessonName = 'Cell Structure & Organelle Functions';
        } else if (/prokaryot|eukaryot|bacteria|nucleoid/i.test(qText)) {
          lessonName = 'Prokaryotic vs Eukaryotic Cell Organization';
        } else if (/scientific model|prediction|hypothesis|guess/i.test(qText)) {
          lessonName = 'Scientific Models & Experimental Inquiry';
        } else if (/linear equation|equation|solve for/i.test(qText)) {
          lessonName = 'Linear Equations in One Variable';
        } else if (/exponent|power/i.test(qText)) {
          lessonName = 'Exponents & Powers';
        } else if (/factoris|polynomial/i.test(qText)) {
          lessonName = 'Factorisation & Polynomials';
        } else {
          lessonName = prompt.length > 5 && !prompt.startsWith('Question') ? prompt.slice(0, 50).trim() : effectiveSubject;
        }
      }

      // Retrieve evidence from persistent pre-indexed syllabus knowledge base (fast lookup, zero re-embedding)
      const retrievalQuery = `${prompt} ${referenceAnswer} ${studentAnswer}`.trim();
      const { chunks } = await retrieveRelevantSyllabusChunks({
        teacherId,
        queryText: retrievalQuery,
        subject: effectiveSubject,
        grade: assessment.classId?.grade || '',
        lessonName,
        topK: 4,
      });

      const evidenceText = formatChunksAsEvidence(chunks);

      // Call AI evaluation pipeline (concurrent Groq Cloud LPU call)
      const aiResult = await grokService.evaluateAnswer({
        questionNumber: item.questionNumber,
        prompt,
        studentAnswer,
        maxMarks,
        referenceAnswer,
        keyPoints,
        evidenceText,
        lessonName,
      });

      // Prepare syllabus evidence metadata for storage
      const syllabusEvidence = (chunks || []).map((c) => ({
        documentId: c.documentId,
        sourceFileName: c.sourceFileName || '',
        pageNumber: c.pageNumber || 1,
        excerpt: (c.chunkText || '').slice(0, 300),
        score: c.score || 0,
      }));

      // Upsert evaluation record (idempotent; update version if already existed)
      const existingEval = await Evaluation.findOne({
        answerSheetId: answerSheet._id,
        answerItemId: item._id,
      });

      const nextVersion = existingEval ? (existingEval.evaluationVersion || 1) + 1 : 1;

      const evalData = {
        teacherId,
        assessmentId: assessment._id,
        answerSheetId: answerSheet._id,
        answerItemId: item._id,
        questionNumber: item.questionNumber,
        prompt,
        studentAnswer,
        expectedAnswer: referenceAnswer || aiResult.expectedSolution || '',
        maxMarks,
        suggestedMarks: aiResult.suggestedMarks,
        approvedMarks: null, // AI suggested marks remain unapproved until teacher approves
        isTeacherApproved: false,
        status: 'review_required',
        explanation: aiResult.explanation,
        observedErrors: Array.isArray(aiResult.observedErrors)
          ? aiResult.observedErrors.join('; ')
          : String(aiResult.observedErrors || 'None'),
        misconceptionHypothesis: aiResult.misconceptionHypothesis,
        affectedLessonId: lessonId,
        affectedLessonName: lessonName,
        confidence: aiResult.confidence,
        isEvidenceSufficient: aiResult.isEvidenceSufficient,
        syllabusEvidence,
        modelUsed: aiResult.modelUsed || grokService.getModelName(),
        isMock: Boolean(aiResult.isMock),
        evaluatorProvider: aiResult.evaluatorProvider || 'groq_ai',
        evaluationVersion: nextVersion,
      };

      const savedEval = await Evaluation.findOneAndUpdate(
        { answerSheetId: answerSheet._id, answerItemId: item._id },
        evalData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return savedEval;
    });

    const evaluations = await Promise.all(evalPromises);

    return res.status(200).json({
      success: true,
      message: `Successfully evaluated ${evaluations.length} answer(s) with syllabus grounding.`,
      data: evaluations,
      modelUsed: grokService.getModelName(),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/answer-sheets/:id/evaluations
 * Retrieves all evaluations for an answer sheet.
 */
export async function getEvaluationsByAnswerSheet(req, res, next) {
  try {
    const { id: sheetId } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(sheetId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid answer sheet ID format: '${sheetId}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const evaluations = await Evaluation.find({
      answerSheetId: sheetId,
      teacherId,
    })
      .sort({ questionNumber: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: evaluations,
      count: evaluations.length,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/assessments/:id/evaluations
 * Retrieves all evaluations for an assessment.
 */
export async function getEvaluationsByAssessment(req, res, next) {
  try {
    const { id: assessmentId } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid assessment ID format: '${assessmentId}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const evaluations = await Evaluation.find({
      assessmentId,
      teacherId,
    })
      .populate('answerSheetId', 'studentName rollNumber')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: evaluations,
      count: evaluations.length,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/evaluations/:id/approve
 * Teacher explicitly approves or adjusts suggested marks.
 */
export async function approveEvaluation(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.teacher._id;
    const { approvedMarks } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid evaluation ID format: '${id}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const evaluation = await Evaluation.findOne({ _id: id, teacherId });
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation record not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    // Determine approved marks: use provided or fallback to suggestedMarks
    let finalMarks = evaluation.suggestedMarks;
    if (approvedMarks !== undefined && approvedMarks !== null) {
      const marksNum = Number(approvedMarks);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > evaluation.maxMarks) {
        return res.status(400).json({
          success: false,
          error: `Approved marks must be a valid number between 0 and ${evaluation.maxMarks}.`,
          code: 'INVALID_APPROVED_MARKS',
        });
      }
      finalMarks = marksNum;
    }

    evaluation.approvedMarks = finalMarks;
    evaluation.isTeacherApproved = true;
    evaluation.status = 'approved';
    await evaluation.save();

    return res.status(200).json({
      success: true,
      message: 'Evaluation approved by teacher.',
      data: evaluation,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/assessments/:id/gap-overview
 * Aggregates learning gaps across evaluated student answer sheets for an assessment.
 * Filters out unverified or unevaluated records.
 */
export async function getAssessmentGapOverview(req, res, next) {
  try {
    const { id: assessmentId } = req.params;
    const teacherId = req.teacher._id;

    if (!mongoose.isValidObjectId(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid assessment ID format: '${assessmentId}'`,
        code: 'INVALID_ID_FORMAT',
      });
    }

    // Verify assessment ownership
    const assessment = await Assessment.findOne({ _id: assessmentId, teacherId });
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or access denied.',
        code: 'NOT_FOUND',
      });
    }

    // Retrieve all active evaluations for this assessment
    const evaluations = await Evaluation.find({
      assessmentId,
      teacherId,
      status: { $in: ['review_required', 'approved'] },
    }).lean();

    if (evaluations.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          hasEvaluatedData: false,
          totalEvaluations: 0,
          topicSummaries: [],
          recommendedTeachingOrder: [],
          message: 'No evaluated student answer sheets available yet for this assessment.',
        },
      });
    }

    // Aggregate by topic/lesson
    const topicMap = new Map();

    evaluations.forEach((ev) => {
      const topicKey = ev.affectedLessonName || ev.affectedLessonId || 'General Curriculum';
      if (!topicMap.has(topicKey)) {
        topicMap.set(topicKey, {
          topicName: topicKey,
          lessonId: ev.affectedLessonId || '',
          totalQuestions: 0,
          totalEarnedMarks: 0,
          totalMaxMarks: 0,
          observedErrors: new Set(),
          hypotheses: new Set(),
        });
      }

      const entry = topicMap.get(topicKey);
      entry.totalQuestions += 1;
      const score = ev.approvedMarks !== null && ev.approvedMarks !== undefined
        ? ev.approvedMarks
        : ev.suggestedMarks;
      entry.totalEarnedMarks += score;
      entry.totalMaxMarks += ev.maxMarks;

      if (ev.observedErrors && ev.observedErrors !== 'None') {
        entry.observedErrors.add(ev.observedErrors);
      }
      if (ev.misconceptionHypothesis && ev.misconceptionHypothesis !== 'None identified.') {
        entry.hypotheses.add(ev.misconceptionHypothesis);
      }
    });

    // Format topic summaries
    const topicSummaries = Array.from(topicMap.values()).map((t) => {
      const mastery = t.totalMaxMarks > 0
        ? Math.round((t.totalEarnedMarks / t.totalMaxMarks) * 100)
        : 100;
      return {
        topicName: t.topicName,
        lessonId: t.lessonId,
        totalQuestions: t.totalQuestions,
        averageMastery: mastery,
        commonErrors: Array.from(t.observedErrors).slice(0, 3),
        hypotheses: Array.from(t.hypotheses).slice(0, 3),
      };
    });

    // Sort by lowest mastery first (highest teaching priority)
    const recommendedTeachingOrder = [...topicSummaries]
      .sort((a, b) => a.averageMastery - b.averageMastery)
      .map((t, idx) => ({
        ...t,
        rank: idx + 1,
        priority: t.averageMastery < 60 ? 'High' : t.averageMastery < 80 ? 'Medium' : 'Low',
        covered: false,
      }));

    return res.status(200).json({
      success: true,
      data: {
        hasEvaluatedData: true,
        totalEvaluations: evaluations.length,
        topicSummaries,
        recommendedTeachingOrder,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export default {
  evaluateAnswerSheet,
  getEvaluationsByAnswerSheet,
  getEvaluationsByAssessment,
  approveEvaluation,
  getAssessmentGapOverview,
};

