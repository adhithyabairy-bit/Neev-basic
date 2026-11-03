import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  deriveGapsAndRemediation,
  isNonErrorText,
  normalizeConceptKey,
  detectSubject,
} from '../src/utils/gapSynthesizer.js';

describe('Phase 4 & 9: Frontend Gap Synthesizer Tests', () => {
  it('identifies non-error statements accurately without generating false positive gaps', () => {
    assert.strictEqual(isNonErrorText('None'), true);
    assert.strictEqual(isNonErrorText('None observed.'), true);
    assert.strictEqual(isNonErrorText('Correct answer provided'), true);
    assert.strictEqual(isNonErrorText('All steps are mathematically correct'), true);
    assert.strictEqual(isNonErrorText('Sign error when transposing negative 5'), false);
  });

  it('normalizes concept triggers and groups related terms to root misconceptions', () => {
    const key1 = normalizeConceptKey('Linear Equations', 'Transposed variable without sign change', 'Equation balancing error', 'linear_equations');
    const key2 = normalizeConceptKey('Algebra', 'Error in isolating variable across equals sign', 'Equation balancing error', 'linear_equations');
    assert.strictEqual(key1, 'linear_equations');
    assert.strictEqual(key2, 'linear_equations');

    const scienceKey = normalizeConceptKey('Cell Biology', 'Water moved into potato cell', 'Confusion about osmosis and cell membrane', '');
    assert.strictEqual(scienceKey, 'osmosis_and_diffusion');
  });

  it('groups multiple questions with identical root misconceptions into a single deduplicated gap', () => {
    const evaluations = [
      {
        questionNumber: 'Q1',
        prompt: 'Solve 2x + 5 = 15',
        affectedLessonName: 'Linear Equations in One Variable',
        suggestedMarks: 1,
        maxMarks: 5,
        observedErrors: 'Transposed 5 without changing sign',
        misconceptionHypothesis: 'Transposition and equation balancing misconception',
      },
      {
        questionNumber: 'Q3',
        prompt: 'Solve 3x - 4 = 11',
        affectedLessonName: 'Linear Equations in One Variable',
        suggestedMarks: 2,
        maxMarks: 5,
        observedErrors: 'Failed in equation balancing when isolating x',
        misconceptionHypothesis: 'Transposition error across equals sign',
      },
    ];

    const syllabus = { selectedSubject: 'Mathematics', selectedClass: 'Class 8' };
    const { gaps, roadmap, testQuestions } = deriveGapsAndRemediation(evaluations, syllabus);

    // Should deduplicate into 1 root gap with combined evidence
    assert.strictEqual(gaps.length, 1);
    const gap = gaps[0];
    assert.strictEqual(gap.conceptKey, 'linear_equations');
    assert.strictEqual(gap.isRecurring, true);
    assert.strictEqual(gap.questionNumbers.length, 2);
    assert.ok(gap.evidence.includes('In Q1,'));
    assert.ok(gap.evidence.includes('In Q3,'));

    // Severity should be escalated to High due to recurrence
    assert.strictEqual(gap.severity, 'High');

    // Roadmap items should also be deduplicated
    assert.strictEqual(roadmap.length, 1);
    assert.ok(roadmap[0].practiceQuestions >= 6); // Scaled for recurring gap

    // Test questions should exist and carry 2 marks
    assert.ok(testQuestions.length >= 5);
    assert.strictEqual(testQuestions[0].marks, 2);
  });

  it('maps prerequisite root chapters and future grade impact up to Class 10', () => {
    const evaluations = [
      {
        questionNumber: 'Q2',
        prompt: 'Solve the algebraic equation',
        affectedLessonName: 'Linear Equations',
        suggestedMarks: 1,
        maxMarks: 5,
        observedErrors: 'Could not transpose term across equals sign',
        misconceptionHypothesis: 'Lacks one-step equation transposition basics',
      },
    ];

    const syllabus = { selectedSubject: 'Mathematics', selectedClass: 'Class 8' };
    const { gaps } = deriveGapsAndRemediation(evaluations, syllabus);

    assert.strictEqual(gaps.length, 1);
    const gap = gaps[0];
    assert.ok(gap.prerequisiteLesson);
    assert.ok(gap.prerequisiteLesson.grade.includes('7') || gap.prerequisiteLesson.grade.includes('6'));
    assert.ok(gap.futureLessonsAffected);
    assert.ok(gap.futureLessonsAffected.length > 0);
  });

  it('returns clean empty arrays when no evaluations are provided (honest empty state)', () => {
    const { gaps, roadmap, testQuestions } = deriveGapsAndRemediation([], { selectedSubject: 'Mathematics' });
    assert.strictEqual(gaps.length, 0);
    assert.strictEqual(roadmap.length, 0);
    assert.strictEqual(testQuestions.length, 0);
  });

  it('validates mastery when all evaluated questions are answered correctly', () => {
    const evaluations = [
      {
        questionNumber: 'Q1',
        prompt: 'Multiply fractions',
        suggestedMarks: 5,
        maxMarks: 5,
        observedErrors: 'None',
        misconceptionHypothesis: 'No misconception identified',
      },
      {
        questionNumber: 'Q2',
        prompt: 'Add decimals',
        suggestedMarks: 5,
        maxMarks: 5,
        observedErrors: 'None observed',
        misconceptionHypothesis: 'Demonstrates correct understanding',
      },
    ];

    const syllabus = { selectedSubject: 'Mathematics', selectedClass: 'Class 8' };
    const { gaps, roadmap } = deriveGapsAndRemediation(evaluations, syllabus);

    assert.strictEqual(gaps.length, 1);
    assert.strictEqual(gaps[0].id, 'gap-mastery');
    assert.strictEqual(gaps[0].status, 'Mastery Validated');
    assert.strictEqual(roadmap.length, 1);
    assert.strictEqual(roadmap[0].status, 'Not Started');
  });

  it('detects Science subject context and grounds biology chapters accurately', () => {
    const subject = detectSubject('osmosis in potato cylinders with semi-permeable cell membrane');
    assert.ok(subject.includes('Science'));

    const evaluations = [
      {
        questionNumber: 'Q4',
        prompt: 'Explain what happens to the potato strip placed in concentrated salt solution',
        affectedLessonName: 'Cell Structure and Functions',
        suggestedMarks: 1,
        maxMarks: 5,
        observedErrors: 'Stated water entered the cell instead of exosmosis',
        misconceptionHypothesis: 'Confusion regarding osmosis and direction of water movement across semi-permeable membrane',
      },
    ];

    const syllabus = { selectedSubject: 'Science', selectedClass: 'Class 8' };
    const { gaps, roadmap } = deriveGapsAndRemediation(evaluations, syllabus);

    assert.strictEqual(gaps.length, 1);
    assert.strictEqual(gaps[0].conceptKey, 'osmosis_and_diffusion');
    assert.ok(roadmap.length >= 1);
  });
});
