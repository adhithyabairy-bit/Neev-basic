import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getSectionDisplay,
  getTeachingPrioritiesForClass,
} from '../src/utils/teachingPriorities.js';

describe('Phase 2 & 9: Frontend Teaching Priorities Tests', () => {
  it('extracts normalized section display labels reliably', () => {
    assert.strictEqual(getSectionDisplay({ section: 'B' }), 'Section B');
    assert.strictEqual(getSectionDisplay({ section: 'Section C' }), 'Section C');
    assert.strictEqual(getSectionDisplay({ name: 'Grade 8 - Section D' }), 'Section D');
    assert.strictEqual(getSectionDisplay({ name: 'Class 8-A Mathematics' }), 'Section A');
    assert.strictEqual(getSectionDisplay(null), 'Section A');
  });

  it('returns an honest empty array when class has no assessments or unassessed data', () => {
    const cls = { _id: 'class-1', grade: 'Class 8', subject: 'Mathematics' };
    const allAssessments = [];
    const gapOverviewByAssessment = {};

    const priorities = getTeachingPrioritiesForClass(cls, allAssessments, gapOverviewByAssessment);
    assert.deepStrictEqual(priorities, []);
  });

  it('calculates topic mastery from genuine gap overview and ranks lowest mastery first', () => {
    const cls = { _id: 'class-1', grade: 'Class 8', subject: 'Mathematics' };
    const allAssessments = [
      { _id: 'asm-1', classId: 'class-1', title: 'Term 1 Mid-Term' },
    ];

    const gapOverviewByAssessment = {
      'asm-1': {
        hasEvaluatedData: true,
        topicSummaries: [
          {
            topic: 'Algebraic Identities',
            masteryPercentage: 80,
            commonErrors: ['Expansion of square terms'],
            totalEvaluations: 10,
          },
          {
            topic: 'Linear Equations Transposition',
            masteryPercentage: 35,
            commonErrors: ['Sign confusion across equals sign'],
            totalEvaluations: 10,
          },
          {
            topic: 'Rational Number Arithmetic',
            masteryPercentage: 60,
            commonErrors: ['LCM denominator confusion'],
            totalEvaluations: 10,
          },
        ],
      },
    };

    const priorities = getTeachingPrioritiesForClass(cls, allAssessments, gapOverviewByAssessment);

    assert.strictEqual(priorities.length, 3);
    // Highest priority should be the topic with lowest mastery (35%)
    assert.strictEqual(priorities[0].topicName, 'Linear Equations Transposition');
    assert.strictEqual(priorities[0].averageMastery, 35);
    assert.strictEqual(priorities[0].rank, 1);

    // Second should be 60%
    assert.strictEqual(priorities[1].topicName, 'Rational Number Arithmetic');
    assert.strictEqual(priorities[1].averageMastery, 60);
    assert.strictEqual(priorities[1].rank, 2);

    // Third should be 80%
    assert.strictEqual(priorities[2].topicName, 'Algebraic Identities');
    assert.strictEqual(priorities[2].averageMastery, 80);
    assert.strictEqual(priorities[2].rank, 3);
  });

  it('aggregates class-level weaknesses and prerequisites correctly', () => {
    const cls = { _id: 'class-science', grade: 'Class 8', subject: 'Science' };
    const allAssessments = [
      { _id: 'asm-science', classId: 'class-science', title: 'Cell Biology Unit Test' },
    ];

    const gapOverviewByAssessment = {
      'asm-science': {
        hasEvaluatedData: true,
        recommendedTeachingOrder: [
          {
            topicName: 'Cell Membrane and Osmosis',
            averageMastery: 40,
            commonErrors: ['Direction of water movement in hypotonic solutions'],
            hypotheses: ['Confusion between osmosis and diffusion'],
            totalQuestions: 2,
          },
        ],
      },
    };

    const priorities = getTeachingPrioritiesForClass(cls, allAssessments, gapOverviewByAssessment);
    assert.strictEqual(priorities.length, 1);
    assert.strictEqual(priorities[0].topicName, 'Cell Membrane and Osmosis');
    assert.strictEqual(priorities[0].averageMastery, 40);
    assert.ok(priorities[0].reason.includes('osmosis'));
    assert.ok(priorities[0].chapterName);
  });

  it('strictly prioritizes Group 1 (Previous-Class) before Group 2 (Current-Class) on frontend', () => {
    const cls = { _id: 'class-9a', grade: 'Class 9', subject: 'Science / Physics' };
    const allAssessments = [{ _id: 'asm-9a', classId: 'class-9a', title: 'Mid-Term Physics' }];

    const gapOverviewByAssessment = {
      'asm-9a': {
        hasEvaluatedData: true,
        allPriorities: [
          {
            conceptKey: 'linear_equations_transposition',
            topicName: 'Linear Equations in Physics Numericals',
            missingConcept: 'Equation Balancing & Variable Transposition',
            category: 'PREVIOUS_CLASS_GAP',
            categoryGroup: 1,
            grade: 'Class 7 Prerequisite',
            affectedPercentage: 20,
            affectedStudentsCount: 2,
            averageMastery: 40,
          },
          {
            conceptKey: 'newtons_laws_current',
            topicName: 'Force and Motion',
            missingConcept: "Newton's Laws of Motion & Inertia",
            category: 'CURRENT_CLASS_GAP',
            categoryGroup: 2,
            grade: 'Class 9 Core',
            affectedPercentage: 90,
            affectedStudentsCount: 9,
            averageMastery: 20,
          },
        ],
      },
    };

    const priorities = getTeachingPrioritiesForClass(cls, allAssessments, gapOverviewByAssessment);

    assert.strictEqual(priorities.length, 2);
    // Group 1 (Previous-Class) MUST be Rank 1 even though only 20% affected
    assert.strictEqual(priorities[0].category, 'PREVIOUS_CLASS_GAP');
    assert.strictEqual(priorities[0].rank, 1);
    assert.strictEqual(priorities[0].affectedPercentage, 20);

    // Group 2 (Current-Class) MUST be Rank 2 even though 90% affected
    assert.strictEqual(priorities[1].category, 'CURRENT_CLASS_GAP');
    assert.strictEqual(priorities[1].rank, 2);
    assert.strictEqual(priorities[1].affectedPercentage, 90);

    // Check attached group properties
    assert.strictEqual(priorities.previousClassGaps.length, 1);
    assert.strictEqual(priorities.currentClassGaps.length, 1);
  });

  it('supports selecting a specific historical assessment vs class-wide overview', () => {
    const cls = { _id: 'class-math', grade: 'Class 8', subject: 'Mathematics' };
    const allAssessments = [
      { _id: 'asm-test1', classId: 'class-math', title: 'Test 1 - Exponents', createdAt: '2026-09-01T00:00:00.000Z' },
      { _id: 'asm-test2', classId: 'class-math', title: 'Test 2 - Fractions', createdAt: '2026-10-01T00:00:00.000Z' },
    ];

    const gapOverviewByAssessment = {
      'asm-test1': {
        hasEvaluatedData: true,
        allPriorities: [
          {
            conceptKey: 'exponents_powers',
            topicName: 'Exponents and Powers',
            category: 'CURRENT_CLASS_GAP',
            grade: 'Class 8 Core',
            averageMastery: 30,
          },
        ],
      },
      'asm-test2': {
        hasEvaluatedData: true,
        allPriorities: [
          {
            conceptKey: 'fractions_and_ratios',
            topicName: 'Fractions and Rational Numbers',
            category: 'PREVIOUS_CLASS_GAP',
            grade: 'Class 7 Prerequisite',
            averageMastery: 50,
          },
        ],
      },
    };

    // 1. Select specific historical assessment asm-test1
    const p1 = getTeachingPrioritiesForClass(cls, allAssessments, gapOverviewByAssessment, 'asm-test1');
    assert.strictEqual(p1.length, 1);
    assert.strictEqual(p1[0].topicName, 'Exponents and Powers');

    // 2. Select specific assessment asm-test2
    const p2 = getTeachingPrioritiesForClass(cls, allAssessments, gapOverviewByAssessment, 'asm-test2');
    assert.strictEqual(p2.length, 1);
    assert.strictEqual(p2[0].topicName, 'Fractions and Rational Numbers');

    // 3. Class-wide overview (all)
    const pAll = getTeachingPrioritiesForClass(cls, allAssessments, gapOverviewByAssessment, 'all');
    assert.strictEqual(pAll.length, 2);
    // Group 1 (Fractions from Class 7) ranks before Group 2 (Exponents)
    assert.strictEqual(pAll[0].category, 'PREVIOUS_CLASS_GAP');
    assert.strictEqual(pAll[1].category, 'CURRENT_CLASS_GAP');
  });
});
