import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeForPdf,
  wrapText,
  generateGapReportPdfBlob,
  generateRoadmapPdfBlob,
  generateSyllabusContinuityPdfBlob,
  generateQuestionsPdfBlob,
  generateAnswerKeyPdfBlob,
} from '../src/utils/pdfGenerator.js';

describe('Phase 6 & 9: Frontend PDF Generation Tests', () => {
  it('sanitizes mathematical symbols and Unicode operators without crashing', () => {
    const raw = 'Let x != 0, sqrt(16) <= 5, and area = pi * r^2. Total: Rs. 500';
    const sanitized = sanitizeForPdf(raw);
    assert.ok(sanitized.includes('!='));
    assert.ok(sanitized.includes('sqrt'));
    assert.ok(sanitized.includes('<='));
    assert.ok(sanitized.includes('pi'));
    assert.ok(sanitized.includes('Rs.'));
  });

  it('transliterates Telugu and Devanagari script phonetically for Standard 14 fonts', () => {
    // Telugu
    const teluguText = 'గణితం మరియు సైన్స్';
    const sanitizedTelugu = sanitizeForPdf(teluguText);
    assert.ok(sanitizedTelugu.length > 0);
    // Should not contain untransliterated Telugu unicode blocks
    assert.strictEqual(/[\u0C00-\u0C7F]/.test(sanitizedTelugu), false);

    // Hindi / Devanagari
    const hindiText = 'गणित और विज्ञान';
    const sanitizedHindi = sanitizeForPdf(hindiText);
    assert.ok(sanitizedHindi.length > 0);
    assert.strictEqual(/[\u0900-\u097F]/.test(sanitizedHindi), false);
  });

  it('wraps long lines cleanly without clipping words', () => {
    const longText = 'This is an exceptionally long pedagogical observation describing how the student struggled with linear transposition across multiple steps of the algebraic solution.';
    const lines = wrapText(longText, 40);
    assert.ok(lines.length >= 3);
    lines.forEach((l) => {
      assert.ok(l.length <= 45); // bounded within margin
    });
  });

  it('generates genuine PDF 1.4 blob for Student Gap Report (Report 1)', async () => {
    const blob = generateGapReportPdfBlob({
      studentName: 'Aarav Sharma',
      examName: 'Mid-Term Mathematics',
      className: 'Class 8',
      subject: 'Mathematics',
      gapsData: [
        {
          questionNumber: 'Q1',
          topicName: 'Linear Equations Transposition',
          severity: 'High',
          evidence: 'Student wrote 2x = 10 + 5 instead of 10 - 5',
          prerequisiteLesson: {
            grade: 'Class 7',
            chapterNumber: 2,
            chapterName: 'Simple Equations',
            studyTip: 'Review inverse operations on both sides.',
          },
          futureLessonsAffected: [
            { grade: 'Class 9', chapterName: 'Linear Equations in Two Variables' },
          ],
        },
      ],
    });

    assert.ok(blob);
    assert.strictEqual(blob.type, 'application/pdf');
    const text = await blob.text();
    assert.ok(text.startsWith('%PDF-1.4'));
    assert.ok(text.includes('%%EOF'));
    assert.ok(text.includes('Aarav Sharma'));
    assert.ok(text.includes('Page 1 of'));
  });

  it('generates genuine PDF 1.4 blob for Learning Roadmap (Report 2)', async () => {
    const blob = generateRoadmapPdfBlob({
      studentName: 'Priya Patel',
      examName: 'Science Assessment',
      className: 'Class 8',
      subject: 'Science',
      roadmapData: [
        {
          rank: 1,
          topic: 'Cell Membrane and Osmosis',
          grade: 'Class 7 Prerequisite',
          severity: 'High',
          estimatedMinutes: 30,
          practiceQuestions: 5,
          recommendedActivity: 'Perform potato osmometer demonstration',
          workedExamples: '2 worked examples from Class 7 Chapter 1',
        },
      ],
    });

    assert.ok(blob);
    assert.strictEqual(blob.type, 'application/pdf');
    const text = await blob.text();
    assert.ok(text.startsWith('%PDF-1.4'));
    assert.ok(text.includes('%%EOF'));
    assert.ok(text.includes('Priya Patel'));
  });

  it('generates genuine PDF 1.4 blob for Syllabus Continuity Report (Report 3)', async () => {
    const blob = generateSyllabusContinuityPdfBlob({
      studentName: 'Rohan Kumar',
      className: 'Class 8',
      subject: 'Mathematics',
      examName: 'Term 1 Exam',
      gapsData: [
        {
          questionNumber: 'Q2',
          topicName: 'Rational Numbers Arithmetic',
          severity: 'Medium',
          prerequisiteLesson: {
            grade: 'Class 7',
            chapterName: 'Rational Numbers',
            chapterNumber: 4,
          },
          futureLessonsAffected: [
            { grade: 'Class 9', chapterName: 'Number Systems' },
            { grade: 'Class 10', chapterName: 'Real Numbers' },
          ],
        },
      ],
    });

    assert.ok(blob);
    assert.strictEqual(blob.type, 'application/pdf');
    const text = await blob.text();
    assert.ok(text.startsWith('%PDF-1.4'));
    assert.ok(text.includes('%%EOF'));
  });

  it('generates genuine PDF 1.4 blob for Student Practice Paper (Report 4) with zero solutions leaked', async () => {
    const blob = generateQuestionsPdfBlob({
      studentName: 'Ananya Rao',
      examName: 'Diagnostic Retest',
      className: 'Class 8',
      subject: 'Mathematics',
      testQuestions: [
        {
          prompt: 'Solve for x: 3x - 7 = 14',
          marks: 2,
          targetConcept: 'Linear Transposition',
          expectedAnswer: 'SECRET SOLUTION: x = 7',
        },
      ],
    });

    assert.ok(blob);
    assert.strictEqual(blob.type, 'application/pdf');
    const text = await blob.text();
    assert.ok(text.startsWith('%PDF-1.4'));
    assert.ok(text.includes('%%EOF'));
    assert.ok(text.includes('Solve for x: 3x - 7 = 14'));
    // STRICT SECURITY TEST: Practice paper MUST NOT leak model answer to student
    assert.strictEqual(text.includes('SECRET SOLUTION'), false);
  });

  it('generates genuine PDF 1.4 blob for Teacher Answer Key (Report 5) containing model solutions', async () => {
    const blob = generateAnswerKeyPdfBlob({
      studentName: 'Teacher Copy',
      examName: 'Diagnostic Retest',
      className: 'Class 8',
      subject: 'Mathematics',
      testQuestions: [
        {
          prompt: 'Solve for x: 3x - 7 = 14',
          marks: 2,
          targetConcept: 'Linear Transposition',
          expectedAnswer: 'Step 1: 3x = 21 (1 Mark). Step 2: x = 7 (1 Mark).',
        },
      ],
    });

    assert.ok(blob);
    assert.strictEqual(blob.type, 'application/pdf');
    const text = await blob.text();
    assert.ok(text.startsWith('%PDF-1.4'));
    assert.ok(text.includes('%%EOF'));
    assert.ok(text.includes('TEACHER MARKING KEY'));
    // Teacher copy MUST include the model solution
    assert.ok(text.includes('Step 1: 3x = 21'));
  });
});

