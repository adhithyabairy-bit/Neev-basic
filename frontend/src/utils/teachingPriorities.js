/**
 * Teaching Priorities Engine for Neev Platform
 *
 * Implements Prerequisite-First Dynamic Teaching Prioritization:
 * - Priority Group 1: Previous-Class Foundational Gaps (always ranks first)
 * - Priority Group 2: Current-Class Learning Gaps (always ranks second)
 * - Priority Group 3: Undetermined Learning Gaps (always ranks third)
 *
 * Tracks:
 * - Unique students affected and evaluated per concept (no duplicate count inflation)
 * - Retest improvements and resolved gaps across historical assessments
 * - Dynamic recalculation per assessment and class-wide latest overview
 * - Honest empty state when no verified evaluation data exists
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
 * Normalizes grade string into an integer.
 */
export function parseGradeNumber(gradeStr) {
  if (typeof gradeStr === 'number' && !isNaN(gradeStr)) return gradeStr;
  if (!gradeStr) return 9;
  const match = String(gradeStr).match(/(?:class|grade)?\s*(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 12) return num;
  }
  return 9;
}

/**
 * Fetches real gap overview data for an assessment from the backend.
 * @param {string} assessmentId
 * @returns {Promise<Object|null>}
 */
export async function fetchAssessmentGapOverview(assessmentId) {
  if (!assessmentId) return null;
  try {
    const res = await apiRequest(`/api/assessments/${assessmentId}/gap-overview`);
    if (res && res.success && res.data) {
      return res.data;
    }
    if (res && (res.hasEvaluatedData !== undefined || res.allPriorities || res.topicSummaries)) {
      return res;
    }
    return null;
  } catch (err) {
    console.warn(`[TeachingPriorities] Failed to fetch gap overview for assessment ${assessmentId}:`, err.message);
    return null;
  }
}

/**
 * Verified NCERT prerequisite metadata lookup fallback for frontend
 */
export function resolvePrerequisiteMetadata(topicName = '', subject = 'Mathematics', grade = 'Grade 8') {
  const cleanTopic = String(topicName).toLowerCase();
  const cleanSubject = String(subject).toLowerCase();
  const currentGradeNum = parseGradeNumber(grade);

  // 1. Science - Osmosis / Cell Biology
  if (cleanTopic.includes('cell') || cleanTopic.includes('osmosis') || cleanTopic.includes('diffusion')) {
    return {
      category: currentGradeNum > 7 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
      categoryGroup: currentGradeNum > 7 ? 1 : 2,
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 2: Exploring Living Processes & Cellular Transport',
      pdfFileName: 'Class 7 Science Chapter 2.pdf',
      missingConcept: 'Cell Membrane & Osmotic Transport',
      suggestedActivity: '15-minute hands-on diagrammatic comparison and structured cell component matching.',
      estimatedMinutes: 35,
      severity: 'High',
    };
  }

  // 2. Science - Kinematics (Speed vs Velocity)
  if (cleanTopic.includes('speed') && (cleanTopic.includes('velocity') || cleanTopic.includes('direction'))) {
    return {
      category: 'CURRENT_CLASS_GAP',
      categoryGroup: 2,
      grade: 'Class 9 Core',
      chapterName: 'Chapter 8: Motion (Kinematics)',
      pdfFileName: 'Class 9 Science Chapter 8.pdf',
      missingConcept: 'Distinction between Speed (Scalar) and Velocity (Vector)',
      suggestedActivity: 'Vector displacement mapping on a 2D grid distinguishing total distance from net displacement.',
      estimatedMinutes: 40,
      severity: 'High',
    };
  }

  // 3. Science - Newton's Laws
  if (cleanTopic.includes('newton') || cleanTopic.includes('inertia') || cleanTopic.includes('law of motion')) {
    return {
      category: 'CURRENT_CLASS_GAP',
      categoryGroup: 2,
      grade: 'Class 9 Core',
      chapterName: 'Chapter 9: Force and Laws of Motion',
      pdfFileName: 'Class 9 Science Chapter 9.pdf',
      missingConcept: "Newton's Laws of Motion & Inertia",
      suggestedActivity: 'Inertia trolley demonstration and dynamic spring balance action-reaction verification.',
      estimatedMinutes: 45,
      severity: 'High',
    };
  }

  // 4. Science - Physics Numericals / Fractions
  if (cleanTopic.includes('numerical') || cleanTopic.includes('physics formula')) {
    return {
      category: currentGradeNum > 7 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
      categoryGroup: currentGradeNum > 7 ? 1 : 2,
      grade: 'Class 7 Prerequisite (Mathematics)',
      chapterName: 'Class 7 Maths Chapter 2: Fractions & Ratios',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      missingConcept: 'Fraction & Ratio Manipulation in Physics Formulas',
      suggestedActivity: 'Step-by-step unit fraction clearing before numerical substitution in physics formulas.',
      estimatedMinutes: 35,
      severity: 'High',
    };
  }

  // 5. English - Grammar, Tenses & Concord
  if (cleanSubject.includes('english') || cleanTopic.includes('tense') || cleanTopic.includes('verb') || cleanTopic.includes('concord')) {
    return {
      category: currentGradeNum > 7 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
      categoryGroup: currentGradeNum > 7 ? 1 : 2,
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 3: Verb Forms, Concord & Active/Passive Voice',
      pdfFileName: 'Class 7 English Chapter 3.pdf',
      missingConcept: 'Verb Forms, Tense Continuity & Subject-Verb Concord',
      suggestedActivity: '20-minute guided sentence transformation drills with teacher feedback.',
      estimatedMinutes: 30,
      severity: 'Medium',
    };
  }

  // 6. Social Studies - Constitution & Governance
  if (cleanSubject.includes('social') || cleanTopic.includes('constitution') || cleanTopic.includes('governance')) {
    return {
      category: currentGradeNum > 7 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
      categoryGroup: currentGradeNum > 7 ? 1 : 2,
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 1: Our Environment & Medieval Foundations',
      pdfFileName: 'Class 7 Social Studies Chapter 1.pdf',
      missingConcept: 'Constitutional Values, Democracy & Institutional Framework',
      suggestedActivity: 'Timeline graphic organizer mapping cause-and-effect relationships.',
      estimatedMinutes: 40,
      severity: 'Medium',
    };
  }

  // 7. Mathematics - Signed Integers / BODMAS
  if (cleanTopic.includes('sign') || cleanTopic.includes('integer') || cleanTopic.includes('bodmas')) {
    return {
      category: currentGradeNum > 6 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
      categoryGroup: currentGradeNum > 6 ? 1 : 2,
      grade: 'Class 6 Prerequisite',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      missingConcept: 'Signed Integer Operations & Operational Precedence',
      suggestedActivity: 'Number line directional walking simulation paired with opposite-sign chip exercises.',
      estimatedMinutes: 35,
      severity: 'Medium',
    };
  }

  // 8. Mathematics - Fractions & Rational Numbers
  if (cleanTopic.includes('fraction') || cleanTopic.includes('rational')) {
    return {
      category: currentGradeNum > 7 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
      categoryGroup: currentGradeNum > 7 ? 1 : 2,
      grade: 'Class 7 Prerequisite',
      chapterName: 'Chapter 2: Fractions and Rational Numbers',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      missingConcept: 'Fractions, Decimals & Proportional Ratios',
      suggestedActivity: 'Fraction bar manipulatives and clearing denominators drills before transposing.',
      estimatedMinutes: 40,
      severity: 'High',
    };
  }

  // 9. Mathematics - Exponents & Powers
  if (cleanTopic.includes('exponent') || cleanTopic.includes('power') || cleanTopic.includes('index')) {
    return {
      category: currentGradeNum > 8 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
      categoryGroup: currentGradeNum > 8 ? 1 : 2,
      grade: 'Class 8 Prerequisite',
      chapterName: 'Chapter 2: Power Play (Exponents & Powers)',
      pdfFileName: 'Class 8 Maths Chapter 2.pdf',
      missingConcept: 'Laws of Exponents & Integral Powers',
      suggestedActivity: 'Index law transformation drills converting negative exponents into positive unit fractions.',
      estimatedMinutes: 35,
      severity: 'High',
    };
  }

  // 10. Default: Linear Equations & Transposition
  return {
    category: currentGradeNum > 7 ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP',
    categoryGroup: currentGradeNum > 7 ? 1 : 2,
    grade: 'Class 7 Prerequisite',
    chapterName: 'Chapter 2: Simple Expressions and Equations',
    pdfFileName: 'Class 7 Maths Chapter 2.pdf',
    missingConcept: 'Equation Balancing & Variable Transposition',
    suggestedActivity: '15-minute balance scale demonstration maintaining identical algebraic operations on both sides.',
    estimatedMinutes: 40,
    severity: 'High',
  };
}

/**
 * Computes teaching priorities for a classroom strictly from genuine assessment data.
 *
 * Supports:
 * - selectedAssessmentId: when specific assessment is chosen, shows that assessment's priorities.
 * - 'all' or null: aggregates latest completed evidence across the class.
 * - Strict 3-Tier Priority Ordering:
 *   Priority Group 1: Previous-Class Foundational Gaps (always before Group 2)
 *   Priority Group 2: Current-Class Learning Gaps (always before Group 3)
 *   Priority Group 3: Undetermined Gaps
 * - Tracking resolved vs unresolved gaps across retests.
 *
 * Returns an Array compatible with existing callers, enhanced with group properties.
 *
 * @param {Object} cls - Class record object
 * @param {Array<Object>} allAssessments - All teacher assessment records
 * @param {Object} [gapOverviewByAssessment] - Map of assessmentId -> gapOverview response
 * @param {string} [selectedAssessmentId] - Optional specific assessment ID to view
 * @returns {Array<Object>} Enhanced array with properties previousClassGaps, currentClassGaps, undeterminedGaps, resolvedGaps
 */
export function getTeachingPrioritiesForClass(
  cls,
  allAssessments = [],
  gapOverviewByAssessment = {},
  selectedAssessmentId = null
) {
  if (!cls) return [];

  const classId = String(cls._id || cls.id || '');
  if (!classId) return [];

  // Filter assessments that belong strictly to this class
  const classAssessments = (allAssessments || [])
    .filter((a) => {
      const aClassId = String(a.classId?._id || a.classId?.id || a.classId || a.class?._id || a.class || '');
      return aClassId === classId;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (classAssessments.length === 0) {
    return [];
  }

  // Determine which assessments to inspect:
  // If a specific assessment is selected, focus on it; otherwise, inspect all class assessments (most recent first)
  const targetAssessments = selectedAssessmentId && selectedAssessmentId !== 'all'
    ? classAssessments.filter((a) => String(a._id || a.id) === String(selectedAssessmentId))
    : classAssessments;

  if (targetAssessments.length === 0) {
    return [];
  }

  // Check if we have rich backend prerequisite groups already available
  // E.g., if a single assessment is targeted and backend returned previousClassGaps / currentClassGaps
  const primaryOverview = gapOverviewByAssessment[String(targetAssessments[0]._id || targetAssessments[0].id)] ||
    targetAssessments[0].gapOverview || null;

  // Track historical concept masteries for retest resolution detection (Phase 7)
  const conceptHistoryMap = new Map();
  classAssessments.forEach((asm, index) => {
    const aId = String(asm._id || asm.id);
    const ov = gapOverviewByAssessment[aId] || asm.gapOverview;
    if (ov && ov.hasEvaluatedData) {
      const items = Array.isArray(ov.allPriorities) && ov.allPriorities.length > 0
        ? ov.allPriorities
        : Array.isArray(ov.recommendedTeachingOrder) && ov.recommendedTeachingOrder.length > 0
        ? ov.recommendedTeachingOrder
        : Array.isArray(ov.topicSummaries)
        ? ov.topicSummaries
        : [];

      items.forEach((item) => {
        const key = item.conceptKey || (item.topicName || item.topic || '').trim();
        if (!key) return;
        if (!conceptHistoryMap.has(key)) {
          conceptHistoryMap.set(key, []);
        }
        conceptHistoryMap.get(key).push({
          assessmentIndex: index, // 0 = latest
          assessmentId: aId,
          averageMastery: item.averageMastery !== undefined ? item.averageMastery : (item.masteryPercentage || 0),
          affectedCount: item.affectedStudentsCount || 0,
        });
      });
    }
  });

  // Aggregator for active gaps
  const aggregatedMap = new Map();

  targetAssessments.forEach((asm) => {
    const aId = String(asm._id || asm.id);
    const overview = gapOverviewByAssessment[aId] || asm.gapOverview;

    if (!overview || !overview.hasEvaluatedData) return;

    // Use rich allPriorities or recommendedTeachingOrder or topicSummaries
    const rawItems = Array.isArray(overview.allPriorities) && overview.allPriorities.length > 0
      ? overview.allPriorities
      : Array.isArray(overview.recommendedTeachingOrder) && overview.recommendedTeachingOrder.length > 0
      ? overview.recommendedTeachingOrder
      : Array.isArray(overview.topicSummaries)
      ? overview.topicSummaries
      : [];

    rawItems.forEach((raw) => {
      const topicName = (raw.topicName || raw.topic || raw.lessonName || 'General Curriculum').trim();
      const meta = resolvePrerequisiteMetadata(topicName, cls.subject || 'Mathematics', cls.grade || 'Grade 8');

      const conceptKey = raw.conceptKey || topicName;
      const category = raw.category || meta.category || 'PREVIOUS_CLASS_GAP';
      const categoryGroup = raw.categoryGroup || meta.categoryGroup || (category === 'PREVIOUS_CLASS_GAP' ? 1 : category === 'CURRENT_CLASS_GAP' ? 2 : 3);

      const itemMastery = raw.averageMastery !== undefined
        ? raw.averageMastery
        : (raw.masteryPercentage !== undefined ? raw.masteryPercentage : 0);

      const affectedCount = raw.affectedStudentsCount !== undefined
        ? raw.affectedStudentsCount
        : ((raw.commonErrors && raw.commonErrors.length > 0) || itemMastery < 100 ? 1 : 0);
      const totalEvaluated = raw.totalEvaluatedCount || raw.totalEvaluations || 1;

      if (!aggregatedMap.has(conceptKey)) {
        aggregatedMap.set(conceptKey, {
          id: `priority-${classId}-${conceptKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          conceptKey,
          topicName,
          missingConcept: raw.missingConcept || meta.missingConcept || topicName,
          category,
          categoryGroup,
          grade: raw.grade || meta.grade,
          chapterName: raw.chapterName || meta.chapterName,
          pdfFileName: raw.pdfFileName || meta.pdfFileName,
          suggestedActivity: raw.recommendedActivity || raw.suggestedActivity || meta.suggestedActivity,
          estimatedMinutes: raw.estimatedMinutes || meta.estimatedMinutes || 35,
          severity: raw.severity || meta.severity || 'Medium',
          averageMastery: itemMastery,
          masteryCount: 1,
          affectedStudentsCount: affectedCount,
          totalEvaluatedCount: totalEvaluated,
          rawAffectedPercentage: raw.affectedPercentage !== undefined ? raw.affectedPercentage : null,
          commonErrors: new Set(raw.commonErrors || []),
          hypotheses: new Set(raw.hypotheses || []),
          evidenceQuote: raw.evidenceQuote || '',
          assessmentCount: 1,
        });
      } else {
        const entry = aggregatedMap.get(conceptKey);
        entry.averageMastery = Math.round((entry.averageMastery * entry.masteryCount + itemMastery) / (entry.masteryCount + 1));
        entry.masteryCount += 1;
        entry.affectedStudentsCount = Math.max(entry.affectedStudentsCount, affectedCount);
        entry.totalEvaluatedCount = Math.max(entry.totalEvaluatedCount, totalEvaluated);
        entry.assessmentCount += 1;
        (raw.commonErrors || []).forEach((e) => entry.commonErrors.add(e));
        (raw.hypotheses || []).forEach((h) => entry.hypotheses.add(h));
      }
    });
  });

  if (aggregatedMap.size === 0) {
    return [];
  }

  const severityRank = { High: 3, Medium: 2, Low: 1 };

  // Convert to array and calculate percentage & reason
  const allProcessed = Array.from(aggregatedMap.values()).map((t) => {
    const errList = Array.from(t.commonErrors);
    const hypList = Array.from(t.hypotheses);

    const affectedPercentage = t.rawAffectedPercentage !== null && t.rawAffectedPercentage !== undefined
      ? t.rawAffectedPercentage
      : t.totalEvaluatedCount > 0
      ? Math.round((t.affectedStudentsCount / t.totalEvaluatedCount) * 100)
      : (t.averageMastery < 80 ? 100 - t.averageMastery : 0);

    const reason = hypList.length > 0
      ? `Diagnosed Misconception: ${hypList.join('; ')}`
      : errList.length > 0
      ? `Observed Error: ${errList.join('; ')}`
      : t.evidenceQuote
      ? `Evidence: ${t.evidenceQuote}`
      : `Class mastery is ${t.averageMastery}%, indicating foundational review is recommended.`;

    const commonMistakes = errList.length > 0
      ? errList.slice(0, 2).join('; ')
      : hypList.length > 0
      ? hypList.slice(0, 2).join('; ')
      : reason;

    // Check retest resolution (Phase 7):
    // If student mastery improved to >= 75% in latest assessment vs an earlier one
    const history = conceptHistoryMap.get(t.conceptKey) || [];
    const isResolved = history.length > 1 && history[0].averageMastery >= 75 && history[history.length - 1].averageMastery < 65;

    return {
      id: t.id,
      conceptKey: t.conceptKey,
      topicName: t.topicName,
      missingConcept: t.missingConcept,
      category: t.category,
      categoryGroup: t.categoryGroup,
      grade: t.grade,
      chapterName: t.chapterName,
      pdfFileName: t.pdfFileName,
      reason,
      commonMistakes,
      evidenceQuote: t.evidenceQuote || reason,
      suggestedActivity: t.suggestedActivity,
      estimatedMinutes: t.estimatedMinutes,
      averageMastery: t.averageMastery,
      affectedStudentsCount: t.affectedStudentsCount,
      totalEvaluatedCount: t.totalEvaluatedCount,
      affectedPercentage,
      severity: t.severity,
      commonErrors: errList.slice(0, 3),
      hypotheses: hypList.slice(0, 3),
      isResolved,
    };
  });

  // Sorting function within a group
  const sortWithinGroup = (a, b) => {
    // 1. Percentage of students affected (descending)
    if (b.affectedPercentage !== a.affectedPercentage) {
      return b.affectedPercentage - a.affectedPercentage;
    }
    // 2. Number of students affected (descending)
    if (b.affectedStudentsCount !== a.affectedStudentsCount) {
      return b.affectedStudentsCount - a.affectedStudentsCount;
    }
    // 3. Severity of misconception (High > Medium > Low)
    const sDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (sDiff !== 0) return sDiff;
    // 4. Lowest mastery first (ascending)
    return a.averageMastery - b.averageMastery;
  };

  // Group 1: Previous-Class Foundational Gaps
  const previousClassGaps = allProcessed
    .filter((i) => i.category === 'PREVIOUS_CLASS_GAP' && !i.isResolved)
    .sort(sortWithinGroup);

  // Group 2: Current-Class Learning Gaps
  const currentClassGaps = allProcessed
    .filter((i) => i.category === 'CURRENT_CLASS_GAP' && !i.isResolved)
    .sort(sortWithinGroup);

  // Group 3: Undetermined Learning Gaps
  const undeterminedGaps = allProcessed
    .filter((i) => i.category === 'UNDETERMINED' && !i.isResolved)
    .sort(sortWithinGroup);

  // Resolved Gaps (Phase 7)
  const resolvedGaps = allProcessed
    .filter((i) => i.isResolved)
    .sort((a, b) => b.averageMastery - a.averageMastery);

  // Combine into single strict priority list: Group 1 -> Group 2 -> Group 3
  const combinedPriorities = [
    ...previousClassGaps,
    ...currentClassGaps,
    ...undeterminedGaps,
  ].map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  // Assign group ranks
  previousClassGaps.forEach((item, idx) => { item.groupRank = idx + 1; });
  currentClassGaps.forEach((item, idx) => { item.groupRank = idx + 1; });
  undeterminedGaps.forEach((item, idx) => { item.groupRank = idx + 1; });

  // If no gaps needed intervention, fallback to all processed sorted by lowest mastery
  const finalPriorities = combinedPriorities.length > 0
    ? combinedPriorities
    : allProcessed
        .sort((a, b) => a.averageMastery - b.averageMastery)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Attach group properties onto the returned array for rich component rendering
  const result = [...finalPriorities];
  result.previousClassGaps = previousClassGaps;
  result.currentClassGaps = currentClassGaps;
  result.undeterminedGaps = undeterminedGaps;
  result.resolvedGaps = resolvedGaps;
  result.allPriorities = finalPriorities;
  result.hasEvaluatedData = true;

  return result;
}

export default {
  getSectionDisplay,
  parseGradeNumber,
  fetchAssessmentGapOverview,
  resolvePrerequisiteMetadata,
  getTeachingPrioritiesForClass,
};
