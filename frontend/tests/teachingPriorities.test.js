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
});
