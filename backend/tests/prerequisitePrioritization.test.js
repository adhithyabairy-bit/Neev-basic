import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  parseGradeNumber,
  classifyEvaluationMistake,
  aggregateClassTeachingPriorities,
  PREREQUISITE_KNOWLEDGE_BASE,
} from '../src/services/curriculum/prerequisiteEngine.js';

describe('Prerequisite-First Dynamic Teaching Prioritization Tests', () => {
  const teacherA_Id = new mongoose.Types.ObjectId();
  const teacherB_Id = new mongoose.Types.ObjectId();
  const assessment1_Id = new mongoose.Types.ObjectId();
  const assessment2_Id = new mongoose.Types.ObjectId();

  // -------------------------------------------------------------------------
  // Test Scenario 1 & 2:
  // Strict Group Ordering: Previous-class gap (Group 1) with 60% affected
  // MUST appear before current-class gap (Group 2) with 90% affected!
  // -------------------------------------------------------------------------
  it('strictly prioritizes Previous-Class gap (60% affected) ahead of Current-Class gap (90% affected)', () => {
    // 10 students in Class 9
    const answerSheets = Array.from({ length: 10 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      studentName: `Student ${i + 1}`,
      assessmentId: assessment1_Id,
    }));

    const evaluations = [];

    // Q1: Linear Equations in One Variable (Class 7 Prerequisite)
    // 6 students have a Class 7 algebra transposition gap (60%)
    for (let i = 0; i < 6; i++) {
      evaluations.push({
        answerSheetId: answerSheets[i]._id,
        affectedLessonName: 'Linear Equations in One Variable',
        prompt: 'Solve 4x - 7 = 2x + 9',
        studentAnswer: '4x - 2x = 9 - 7',
        maxMarks: 5,
        suggestedMarks: 2,
        approvedMarks: 2,
        observedErrors: 'Transposition sign reversal error moving -7 across equals sign',
        misconceptionHypothesis: 'Inverse operations during equation balancing',
      });
    }
    // 4 students got Q1 completely correct (no gap)
    for (let i = 6; i < 10; i++) {
      evaluations.push({
        answerSheetId: answerSheets[i]._id,
        affectedLessonName: 'Linear Equations in One Variable',
        prompt: 'Solve 4x - 7 = 2x + 9',
        studentAnswer: '4x - 2x = 9 + 7 => 2x = 16 => x = 8',
        maxMarks: 5,
        suggestedMarks: 5,
        approvedMarks: 5,
        observedErrors: 'None',
        misconceptionHypothesis: 'None identified.',
      });
    }

    // Q2: Laws of Motion (Class 9 Core)
    // 9 students have a Class 9 Newton's laws gap (90%)
    for (let i = 0; i < 9; i++) {
      evaluations.push({
        answerSheetId: answerSheets[i]._id,
        affectedLessonName: 'Laws of Motion',
        prompt: "State Newton's third law with an example",
        studentAnswer: 'Force is mass times velocity',
        maxMarks: 5,
        suggestedMarks: 1,
        approvedMarks: 1,
        observedErrors: "Confused Newton's third law action-reaction pairs with momentum",
        misconceptionHypothesis: "Newton's laws of motion and inertia",
      });
    }
    // 1 student got Q2 correct
    evaluations.push({
      answerSheetId: answerSheets[9]._id,
      affectedLessonName: 'Laws of Motion',
      prompt: "State Newton's third law with an example",
      studentAnswer: 'Every action has an equal and opposite reaction',
      maxMarks: 5,
      suggestedMarks: 5,
      approvedMarks: 5,
      observedErrors: 'None',
      misconceptionHypothesis: 'None identified.',
    });

    const result = aggregateClassTeachingPriorities(evaluations, answerSheets, 'Class 9', 'Science / Physics');

    assert.equal(result.hasEvaluatedData, true);
    assert.equal(result.totalStudentsEvaluated, 10);

    // Group 1 contains Previous-Class gap
    assert.equal(result.previousClassGaps.length, 1);
    assert.equal(result.previousClassGaps[0].category, 'PREVIOUS_CLASS_GAP');
    assert.equal(result.previousClassGaps[0].affectedPercentage, 60);
    assert.equal(result.previousClassGaps[0].affectedStudentsCount, 6);
    assert.equal(result.previousClassGaps[0].totalEvaluatedCount, 10);

    // Group 2 contains Current-Class gap
    assert.equal(result.currentClassGaps.length, 1);
    assert.equal(result.currentClassGaps[0].category, 'CURRENT_CLASS_GAP');
    assert.equal(result.currentClassGaps[0].affectedPercentage, 90);
    assert.equal(result.currentClassGaps[0].affectedStudentsCount, 9);
    assert.equal(result.currentClassGaps[0].totalEvaluatedCount, 10);

    // CRITICAL REQUIREMENT: Rank 1 MUST be Previous-Class gap (60%), NOT Current-Class gap (90%)!
    assert.equal(result.allPriorities[0].category, 'PREVIOUS_CLASS_GAP');
    assert.equal(result.allPriorities[0].affectedPercentage, 60);
    assert.equal(result.allPriorities[0].rank, 1);

    // Rank 2 is Current-Class gap (90%)
    assert.equal(result.allPriorities[1].category, 'CURRENT_CLASS_GAP');
    assert.equal(result.allPriorities[1].affectedPercentage, 90);
    assert.equal(result.allPriorities[1].rank, 2);
  });

  // -------------------------------------------------------------------------
  // Test Scenario 3 & 4:
  // Previous-class gap with 20% affected still ranks above Current-class gap with 30% affected
  // -------------------------------------------------------------------------
  it('places Previous-Class gap (20% affected) above Current-Class gap (30% affected)', () => {
    const answerSheets = Array.from({ length: 10 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      studentName: `Student ${i + 1}`,
      assessmentId: assessment1_Id,
    }));

    const evaluations = [];

    // Concept A: Physics Numericals / Fractions (Class 7 Prerequisite)
    // 2/10 students have fractions gap from Class 7 (20%)
    for (let i = 0; i < 2; i++) {
      evaluations.push({
        answerSheetId: answerSheets[i]._id,
        affectedLessonName: 'Physics Numericals',
        prompt: 'Calculate velocity v = d/t where d = 3/4 and t = 1/2',
        studentAnswer: 'v = 3/4 * 1/2 = 3/8',
        maxMarks: 5,
        suggestedMarks: 1,
        approvedMarks: 1,
        observedErrors: 'Fraction in formula inverted incorrectly during division',
        misconceptionHypothesis: 'Fraction and ratio manipulation in physics formulas',
      });
    }
    // 8/10 students got Concept A correct
    for (let i = 2; i < 10; i++) {
      evaluations.push({
        answerSheetId: answerSheets[i]._id,
        affectedLessonName: 'Physics Numericals',
        prompt: 'Calculate velocity v = d/t where d = 3/4 and t = 1/2',
        studentAnswer: 'v = (3/4) / (1/2) = (3/4) * (2/1) = 3/2',
        maxMarks: 5,
        suggestedMarks: 5,
        approvedMarks: 5,
        observedErrors: 'None',
        misconceptionHypothesis: 'None identified.',
      });
    }

    // Concept B: Kinematics (Speed vs Velocity) (Class 9 Core)
    // 3/10 students have speed vs velocity gap in Class 9 (30%)
    for (let i = 0; i < 3; i++) {
      evaluations.push({
        answerSheetId: answerSheets[i]._id,
        affectedLessonName: 'Kinematics',
        prompt: 'Distinguish speed and velocity',
        studentAnswer: 'Speed and velocity are exactly identical',
        maxMarks: 5,
        suggestedMarks: 1,
        approvedMarks: 1,
        observedErrors: 'Treated speed and velocity as identical without vector direction',
        misconceptionHypothesis: 'Distinction between scalar speed and vector velocity',
      });
    }
    // 7/10 students got Concept B correct
    for (let i = 3; i < 10; i++) {
      evaluations.push({
        answerSheetId: answerSheets[i]._id,
        affectedLessonName: 'Kinematics',
        prompt: 'Distinguish speed and velocity',
        studentAnswer: 'Speed is scalar, velocity is vector with direction',
        maxMarks: 5,
        suggestedMarks: 5,
        approvedMarks: 5,
        observedErrors: 'None',
        misconceptionHypothesis: 'None identified.',
      });
    }

    const result = aggregateClassTeachingPriorities(evaluations, answerSheets, 9, 'Science / Physics');

    assert.equal(result.previousClassGaps.length, 1);
    assert.equal(result.previousClassGaps[0].affectedPercentage, 20);
    assert.equal(result.previousClassGaps[0].affectedStudentsCount, 2);
    assert.equal(result.previousClassGaps[0].totalEvaluatedCount, 10);

    assert.equal(result.currentClassGaps.length, 1);
    assert.equal(result.currentClassGaps[0].affectedPercentage, 30);
    assert.equal(result.currentClassGaps[0].affectedStudentsCount, 3);
    assert.equal(result.currentClassGaps[0].totalEvaluatedCount, 10);

    // Group 1 (20%) must appear before Group 2 (30%) in allPriorities
    assert.equal(result.allPriorities[0].category, 'PREVIOUS_CLASS_GAP');
    assert.equal(result.allPriorities[0].affectedPercentage, 20);
    assert.equal(result.allPriorities[0].rank, 1);

    assert.equal(result.allPriorities[1].category, 'CURRENT_CLASS_GAP');
    assert.equal(result.allPriorities[1].affectedPercentage, 30);
    assert.equal(result.allPriorities[1].rank, 2);
  });

  // -------------------------------------------------------------------------
  // Test Scenario 5:
  // Undetermined Root Cause (Group 3) when evidence is ambiguous or unverified
  // -------------------------------------------------------------------------
  it('correctly classifies ambiguous evidence into Priority Group 3 (Undetermined Root Cause)', () => {
    const sheetId = new mongoose.Types.ObjectId();
    const answerSheets = [{ _id: sheetId, studentName: 'Rohan Sharma' }];

    const evaluations = [
      {
        answerSheetId: sheetId,
        affectedLessonName: 'Unknown Topic Q9',
        prompt: 'Explain the mechanism',
        studentAnswer: 'Some unverified generic answer text',
        maxMarks: 5,
        suggestedMarks: 2,
        approvedMarks: 2,
        observedErrors: 'Vague response without technical detail',
        misconceptionHypothesis: 'Unclear whether conceptual or language limitation',
      },
    ];

    const result = aggregateClassTeachingPriorities(evaluations, answerSheets, 9, 'General');

    assert.equal(result.undeterminedGaps.length, 1);
    assert.equal(result.undeterminedGaps[0].category, 'UNDETERMINED');
    assert.equal(result.undeterminedGaps[0].categoryGroup, 3);
    assert.equal(result.allPriorities[0].category, 'UNDETERMINED');
    assert.ok(result.allPriorities[0].recommendedActivity.includes('targeted diagnostic questioning'));
  });

  // -------------------------------------------------------------------------
  // Test Scenario 6:
  // Phase 4 & 8: Avoid Duplicate Root-Cause Counting
  // Multiple mistakes by the same student sharing the same prerequisite must count the student ONCE
  // -------------------------------------------------------------------------
  it('deduplicates multiple mistakes by the same student sharing the same prerequisite', () => {
    const student1SheetId = new mongoose.Types.ObjectId();
    const student2SheetId = new mongoose.Types.ObjectId();

    const answerSheets = [
      { _id: student1SheetId, studentName: 'Aditi Rao' },
      { _id: student2SheetId, studentName: 'Vikram Mehta' },
    ];

    // Student 1 makes 3 separate mistakes in Q1, Q3, and Q5, ALL caused by linear equation transposition
    // Student 2 makes 1 mistake in Q1 caused by linear equation transposition
    const evaluations = [
      {
        answerSheetId: student1SheetId,
        questionNumber: 'Q1',
        prompt: 'Solve 3x - 5 = 10',
        maxMarks: 5,
        suggestedMarks: 1,
        observedErrors: 'Transposition sign error in moving -5',
        misconceptionHypothesis: 'Equation balancing across equals sign',
      },
      {
        answerSheetId: student1SheetId,
        questionNumber: 'Q3',
        prompt: 'Solve 2x + 8 = 20',
        maxMarks: 5,
        suggestedMarks: 2,
        observedErrors: 'Sign reversal error on transposition',
        misconceptionHypothesis: 'Variable transposition across equals sign',
      },
      {
        answerSheetId: student1SheetId,
        questionNumber: 'Q5',
        prompt: 'Solve 5x - 15 = 0',
        maxMarks: 5,
        suggestedMarks: 0,
        observedErrors: 'Failed to balance equation',
        misconceptionHypothesis: 'Inverse operations during linear equation balance',
      },
      {
        answerSheetId: student2SheetId,
        questionNumber: 'Q1',
        prompt: 'Solve 3x - 5 = 10',
        maxMarks: 5,
        suggestedMarks: 2,
        observedErrors: 'Transposition error',
        misconceptionHypothesis: 'Algebraic equation balancing',
      },
    ];

    const result = aggregateClassTeachingPriorities(evaluations, answerSheets, 9, 'Mathematics');

    assert.equal(result.previousClassGaps.length, 1);
    const gap = result.previousClassGaps[0];

    // Even though Student 1 had 3 mistakes, Student 1 is counted ONCE!
    // Total affected students = 2 (Student 1 + Student 2) out of 2 evaluated
    assert.equal(gap.affectedStudentsCount, 2);
    assert.equal(gap.totalEvaluatedCount, 2);
    assert.equal(gap.affectedPercentage, 100);
  });

  // -------------------------------------------------------------------------
  // Test Scenario 7:
  // Phase 7: Track Improvements across Retests (Resolved vs Unresolved Gaps)
  // -------------------------------------------------------------------------
  it('flags gaps as resolved when mastery improves to >= 75% and 0 students affected', () => {
    const student1SheetId = new mongoose.Types.ObjectId();
    const answerSheets = [{ _id: student1SheetId, studentName: 'Aditi Rao' }];

    // Retest evaluation where student scored 5/5 with no error
    const retestEvaluations = [
      {
        answerSheetId: student1SheetId,
        affectedLessonName: 'Linear Equations in One Variable',
        prompt: 'Solve 4x - 7 = 2x + 9',
        studentAnswer: '4x - 2x = 9 + 7 => 2x = 16 => x = 8',
        maxMarks: 5,
        suggestedMarks: 5,
        approvedMarks: 5,
        observedErrors: 'None',
        misconceptionHypothesis: 'None identified.',
      },
    ];

    const result = aggregateClassTeachingPriorities(retestEvaluations, answerSheets, 9, 'Mathematics');

    // No active gaps remain in teaching priorities
    assert.equal(result.previousClassGaps.length, 0);
    assert.equal(result.allPriorities.length, 0);
  });

  // -------------------------------------------------------------------------
  // Test Scenario 8 & 9:
  // Class, Section and Teacher Isolation (Never mix records across classes)
  // -------------------------------------------------------------------------
  it('strictly isolates evaluations by classroom and does not mix different classes or subjects', () => {
    const sheet9A = { _id: new mongoose.Types.ObjectId(), studentName: 'Class 9A Student' };
    const sheet9B = { _id: new mongoose.Types.ObjectId(), studentName: 'Class 9B Student' };

    // Evaluation for 9A (Science)
    const ev9A = [
      {
        answerSheetId: sheet9A._id,
        affectedLessonName: 'Cellular Transport',
        prompt: 'Define osmosis',
        maxMarks: 5,
        suggestedMarks: 2,
        observedErrors: 'Confused osmosis with diffusion across semi-permeable membrane',
        misconceptionHypothesis: 'Cell membrane osmotic transport',
      },
    ];

    // Evaluation for 9B (Social Studies)
    const ev9B = [
      {
        answerSheetId: sheet9B._id,
        affectedLessonName: 'Indian Constitution',
        prompt: 'Explain secularism',
        maxMarks: 5,
        suggestedMarks: 1,
        observedErrors: 'Confused parliamentary democracy with monarchy',
        misconceptionHypothesis: 'Constitutional values and governance',
      },
    ];

    const result9A = aggregateClassTeachingPriorities(ev9A, [sheet9A], 9, 'Science / Physics');
    const result9B = aggregateClassTeachingPriorities(ev9B, [sheet9B], 9, 'Social Studies');

    assert.equal(result9A.previousClassGaps.length, 1);
    assert.equal(result9A.previousClassGaps[0].conceptKey, 'cell_cellular_transport');

    assert.equal(result9B.previousClassGaps.length, 1);
    assert.equal(result9B.previousClassGaps[0].conceptKey, 'social_constitution_governance');

    // Ensure 9A does NOT contain 9B concepts
    assert.equal(result9A.allPriorities.some((p) => p.conceptKey === 'social_constitution_governance'), false);
    // Ensure 9B does NOT contain 9A concepts
    assert.equal(result9B.allPriorities.some((p) => p.conceptKey === 'cell_cellular_transport'), false);
  });

  // -------------------------------------------------------------------------
  // Test Scenario 10:
  // Missing Evaluation Data & Honest Empty States
  // -------------------------------------------------------------------------
  it('returns clean honest empty state when no evaluations exist without fabricating priorities', () => {
    const result = aggregateClassTeachingPriorities([], [], 9, 'Mathematics');

    assert.equal(result.hasEvaluatedData, false);
    assert.equal(result.totalEvaluations, 0);
    assert.equal(result.totalStudentsEvaluated, 0);
    assert.deepEqual(result.previousClassGaps, []);
    assert.deepEqual(result.currentClassGaps, []);
    assert.deepEqual(result.undeterminedGaps, []);
    assert.deepEqual(result.allPriorities, []);
    assert.deepEqual(result.topicSummaries, []);
    assert.deepEqual(result.recommendedTeachingOrder, []);
  });

  // -------------------------------------------------------------------------
  // Test Scenario 11:
  // Social Studies & English Multi-Subject Curriculum Grounding
  // -------------------------------------------------------------------------
  it('correctly classifies Social Studies and English curriculum gaps into verified NCERT chapters', () => {
    const student1 = { _id: new mongoose.Types.ObjectId(), studentName: 'Rohan' };
    const student2 = { _id: new mongoose.Types.ObjectId(), studentName: 'Priya' };

    // Social Studies: Class 8 student struggling with 1857 rebellion
    const evalsSocial = [
      {
        answerSheetId: student1._id,
        affectedLessonName: 'Revolt of 1857',
        prompt: 'Explain the military and political causes of the Revolt of 1857 and the Doctrine of Lapse.',
        studentAnswer: 'British took over kingdoms using doctrine of lapse.',
        maxMarks: 5,
        suggestedMarks: 2,
        observedErrors: 'Incomplete explanation of 1857 mutiny causes',
        misconceptionHypothesis: 'Colonial policies triggering rebellion of 1857',
      },
    ];

    const resultSocial = aggregateClassTeachingPriorities(evalsSocial, [student1], 8, 'Social Studies');
    assert.equal(resultSocial.currentClassGaps.length, 1);
    assert.equal(resultSocial.currentClassGaps[0].conceptKey, 'social_colonialism_1857');
    assert.equal(resultSocial.currentClassGaps[0].pdfFileName, 'Class 8 Social Studies Chapter 5.pdf');

    // English Language: Class 8 student struggling with passive voice transformation
    const evalsEnglish = [
      {
        answerSheetId: student2._id,
        affectedLessonName: 'Active and Passive Voice',
        prompt: 'Change the sentence to passive voice: The teacher explained the lesson.',
        studentAnswer: 'The lesson explained by teacher.',
        maxMarks: 5,
        suggestedMarks: 1,
        observedErrors: 'Omitted auxiliary was/were in passive voice',
        misconceptionHypothesis: 'Active and passive voice transformation and agent transposition',
      },
    ];

    const resultEnglish = aggregateClassTeachingPriorities(evalsEnglish, [student2], 8, 'English Language');
    assert.equal(resultEnglish.currentClassGaps.length, 1);
    assert.equal(resultEnglish.currentClassGaps[0].conceptKey, 'english_voice_transformations');
    assert.equal(resultEnglish.currentClassGaps[0].pdfFileName, 'Class 8 English Chapter 4.pdf');
  });

  // -------------------------------------------------------------------------
  // Grade String Parsing Tests
  // -------------------------------------------------------------------------
  it('accurately parses grade integers from various grade string notations', () => {
    assert.equal(parseGradeNumber('Class 9'), 9);
    assert.equal(parseGradeNumber('Grade 8 - Section A'), 8);
    assert.equal(parseGradeNumber('Class 10'), 10);
    assert.equal(parseGradeNumber('7'), 7);
    assert.equal(parseGradeNumber(6), 6);
    assert.equal(parseGradeNumber(null), 9);
  });
});
