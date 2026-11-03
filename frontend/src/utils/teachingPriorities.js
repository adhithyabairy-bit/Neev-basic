/**
 * Teaching Priorities Engine for Neev Platform
 *
 * Replaces static/hard-coded priority profiles with genuine assessment data
 * aggregated from backend /api/assessments/:id/gap-overview.
 *
 * Requirements:
 * - Displays actual student performance from verified evaluations.
 * - Calculates topic mastery from approved teacher marks.
 * - Identifies real class-level weaknesses (common errors & hypotheses).
 * - Prioritizes concepts requiring foundational intervention (lowest mastery first).
 * - Provides an honest empty state when no assessment evaluations exist.
 * - NEVER displays fabricated student statistics.
 */

import { apiRequest } from '../services/apiClient.js';

/**
 * Extracts normalized section string (e.g. 'Section A', 'Section B') from class object or name.
 */
export function getSectionDisplay(cls) {
  if (!cls) return 'Section A';
  if (cls.section && String(cls.section).trim()) {
    const s = String(cls.section).trim();
    return s.startsWith('Section') ? s : `Section ${s}`;
  }
  const match =
    (cls.name || '').match(/[-_\s]([A-D])\b/i) ||
    (cls.name || '').match(/section\s*([A-D])/i) ||
    (cls.name || '').match(/\b([A-D])\b/i);
  if (match) {
    return `Section ${match[1].toUpperCase()}`;
  }
  return 'Section A';
}

/**
 * Fetches real gap overview data for an assessment from the backend.
 * @param {string} assessmentId
 * @returns {Promise<{ hasEvaluatedData: boolean, totalEvaluations: number, topicSummaries: Array, recommendedTeachingOrder: Array }|null>}
 */
export async function fetchAssessmentGapOverview(assessmentId) {
  if (!assessmentId) return null;
  try {
    const res = await apiRequest(`/assessments/${assessmentId}/gap-overview`);
    if (res && res.success && res.data) {
      return res.data;
    }
    return null;
  } catch (err) {
    console.warn(`[TeachingPriorities] Failed to fetch gap overview for assessment ${assessmentId}:`, err.message);
    return null;
  }
}

/**
 * Maps a topic name and subject to its foundational prerequisite curriculum chapter.
 */
function resolvePrerequisiteMetadata(topicName = '', subject = 'Mathematics', grade = 'Grade 8') {
  const cleanTopic = String(topicName).toLowerCase();
  const cleanSubject = String(subject).toLowerCase();

  if (cleanSubject.includes('science') || cleanTopic.includes('cell') || cleanTopic.includes('osmosis') || cleanTopic.includes('motion')) {
    return {
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 2: Nutrition in Animals & Cell Foundations',
      pdfFileName: 'Class 7 Science Chapter 2.pdf',
      suggestedActivity: '15-minute hands-on diagrammatic comparison and structured cell component matching.',
      estimatedMinutes: 35,
    };
  }

  if (cleanSubject.includes('english') || cleanTopic.includes('grammar') || cleanTopic.includes('tense') || cleanTopic.includes('voice')) {
    return {
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 3: Verb Forms, Concord & Active/Passive Voice',
      pdfFileName: 'Class 7 English Chapter 3.pdf',
      suggestedActivity: '20-minute guided sentence transformation drills with teacher feedback.',
      estimatedMinutes: 30,
    };
  }

  if (cleanSubject.includes('social') || cleanTopic.includes('constitution') || cleanTopic.includes('revolt') || cleanTopic.includes('resource')) {
    return {
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 1: Our Environment & Medieval Foundations',
      pdfFileName: 'Class 7 Social Studies Chapter 1.pdf',
      suggestedActivity: 'Timeline graphic organizer mapping cause-and-effect relationships.',
      estimatedMinutes: 40,
    };
  }

  // Mathematics defaults
  if (cleanTopic.includes('fraction') || cleanTopic.includes('rational')) {
    return {
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 2: Fractions and Rational Numbers',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      suggestedActivity: 'Fraction bar manipulatives and clearing denominators drills before transposing.',
      estimatedMinutes: 40,
    };
  }

  if (cleanTopic.includes('sign') || cleanTopic.includes('negative') || cleanTopic.includes('integer')) {
    return {
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 1: Integers & Signed Operations',
      pdfFileName: 'Class 7 Maths Chapter 1.pdf',
      suggestedActivity: 'Number line directional walking simulation paired with opposite-sign chip exercises.',
      estimatedMinutes: 35,
    };
  }

  return {
    grade: 'Class 7 Prerequisite',
    chapterName: 'Chapter 2: Simple Expressions and Equations',
    pdfFileName: 'Class 7 Maths Chapter 2.pdf',
    suggestedActivity: '15-minute balance scale demonstration maintaining identical algebraic operations on both sides.',
    estimatedMinutes: 40,
  };
}

/**
 * Computes teaching priorities for a given classroom strictly from genuine assessment data.
 *
 * @param {Object} cls - Class record object
 * @param {Array<Object>} allAssessments - All teacher assessment records
 * @param {Object} [gapOverviewByAssessment] - Map of assessmentId -> gapOverview response
 * @returns {Array<Object>} Prioritized list of actual learning gap priorities, or empty array if none assessed.
 */
export function getTeachingPrioritiesForClass(cls, allAssessments = [], gapOverviewByAssessment = {}) {
  if (!cls) return [];

  const classId = String(cls._id || cls.id || '');
  if (!classId) return [];

  // Filter assessments that belong strictly to this class
  const classAssessments = (allAssessments || []).filter((a) => {
    const aClassId = String(a.classId || a.class?._id || a.class || '');
    return aClassId === classId;
  });

  if (classAssessments.length === 0) {
    return [];
  }

  // Aggregate topics across all assessments for this class
  const topicMap = new Map();

  classAssessments.forEach((assessment) => {
    const aId = String(assessment._id || assessment.id || '');
    const overview = gapOverviewByAssessment[aId] || assessment.gapOverview || null;

    const items = Array.isArray(overview?.recommendedTeachingOrder) && overview.recommendedTeachingOrder.length > 0
      ? overview.recommendedTeachingOrder
      : Array.isArray(overview?.topicSummaries)
      ? overview.topicSummaries
      : [];

    if (overview && overview.hasEvaluatedData && items.length > 0) {
      items.forEach((item) => {
        const key = (item.topicName || item.topic || item.lessonName || 'General Curriculum').trim();
        const itemMastery = item.averageMastery !== undefined ? item.averageMastery : (item.masteryPercentage !== undefined ? item.masteryPercentage : 0);
        if (!topicMap.has(key)) {
          topicMap.set(key, {
            topicName: key,
            lessonId: item.lessonId || '',
            totalQuestions: 0,
            averageMastery: itemMastery,
            masteryCount: 0,
            commonErrors: new Set(item.commonErrors || []),
            hypotheses: new Set(item.hypotheses || []),
            assessmentCount: 0,
          });
        }

        const entry = topicMap.get(key);
        entry.totalQuestions += item.totalQuestions || 1;
        entry.averageMastery = Math.round((entry.averageMastery * entry.masteryCount + itemMastery) / (entry.masteryCount + 1));
        entry.masteryCount += 1;
        entry.assessmentCount += 1;
        (item.commonErrors || []).forEach((e) => entry.commonErrors.add(e));
        (item.hypotheses || []).forEach((h) => entry.hypotheses.add(h));
      });
    }
  });

  if (topicMap.size === 0) {
    return [];
  }

  // Convert aggregated topics to ranked teaching priorities
  const priorities = Array.from(topicMap.values())
    .map((t) => {
      const meta = resolvePrerequisiteMetadata(t.topicName, cls.subject || 'Mathematics', cls.grade || 'Grade 8');
      const errList = Array.from(t.commonErrors);
      const hypList = Array.from(t.hypotheses);

      const reason = hypList.length > 0
        ? `Diagnosed Misconception: ${hypList.join('; ')}`
        : errList.length > 0
        ? `Observed Error: ${errList.join('; ')}`
        : `Class mastery is ${t.averageMastery}%, indicating foundational review is recommended.`;

      return {
        id: `priority-${classId}-${t.topicName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        topicName: t.topicName,
        averageMastery: t.averageMastery,
        grade: meta.grade,
        chapterName: meta.chapterName,
        pdfFileName: meta.pdfFileName,
        reason,
        suggestedActivity: meta.suggestedActivity,
        estimatedMinutes: meta.estimatedMinutes,
        commonErrors: errList.slice(0, 3),
        hypotheses: hypList.slice(0, 3),
      };
    })
    // Sort strictly by lowest mastery first (highest priority)
    .sort((a, b) => a.averageMastery - b.averageMastery)
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

  return priorities;
}

export default {
  getSectionDisplay,
  fetchAssessmentGapOverview,
  getTeachingPrioritiesForClass,
};
