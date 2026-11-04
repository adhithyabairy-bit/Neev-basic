/**
 * Prerequisite & Root-Cause Classification Engine for Neev Platform
 *
 * Implements Prerequisite-First Dynamic Teaching Prioritization:
 * - CATEGORY A (Group 1): PREVIOUS-CLASS PREREQUISITE GAP (prerequisite grade < current grade)
 * - CATEGORY B (Group 2): CURRENT-CLASS LEARNING GAP (prerequisite grade === current grade)
 * - CATEGORY C (Group 3): UNDETERMINED ROOT CAUSE (insufficient or ambiguous evidence)
 *
 * Educational Rule:
 * Group 1 ALWAYS appears before Group 2, regardless of relative student counts or percentages.
 * Unique student counting per root-cause concept prevents duplicate error inflation.
 */

/**
 * Normalizes grade strings ('Class 9', 'Grade 9', '9', 'Class 8 - Section A') into an integer.
 * Defaults to 9 if unparseable.
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
 * Verified NCERT Prerequisite & Curriculum Knowledge Base
 */
export const PREREQUISITE_KNOWLEDGE_BASE = [
  // =========================================================================
  // MATHEMATICS PREREQUISITES
  // =========================================================================
  {
    conceptKey: 'linear_equations_transposition',
    subject: 'Mathematics',
    conceptName: 'Equation Balancing & Variable Transposition',
    triggers: ['linear equation', 'transpos', 'algebraic balance', 'equation balance', '5x', 'solve for', 'inverse operation'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite',
    chapterName: 'Chapter 2: Simple Expressions and Equations',
    pdfFileName: 'Class 7 Maths Chapter 2.pdf',
    recommendedActivity: '15-minute balance scale demonstration maintaining identical algebraic operations on both sides.',
    estimatedMinutes: 40,
    severity: 'High',
    description: 'Equation balancing across equals sign (=), inverse operations, and transposition of variables/constants.',
  },
  {
    conceptKey: 'fractions_and_ratios',
    subject: 'Mathematics',
    conceptName: 'Fractions, Decimals & Proportional Ratios',
    triggers: ['fraction', 'ratio', 'proportion', 'denominator', 'numerator', 'rational number', 'unit fraction', 'cross multiplication'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite',
    chapterName: 'Chapter 2: Fractions and Rational Numbers',
    pdfFileName: 'Class 7 Maths Chapter 2.pdf',
    recommendedActivity: 'Fraction bar manipulatives and clearing denominators drills before transposing.',
    estimatedMinutes: 40,
    severity: 'High',
    description: 'Fraction operations, common denominators, and ratio proportions essential for algebraic and physics formulas.',
  },
  {
    conceptKey: 'arithmetic_signed_integers',
    subject: 'Mathematics',
    conceptName: 'Signed Integer Operations & Operational Precedence',
    triggers: ['arithmetic', 'signed', 'integer', 'bodmas', 'order of operation', 'negative sign', 'addition error', 'calculation error'],
    prerequisiteGrade: 6,
    prerequisiteGradeDisplay: 'Class 6 Prerequisite',
    chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
    pdfFileName: 'Class 6 Maths Chapter 3.pdf',
    recommendedActivity: 'Number line directional walking simulation paired with opposite-sign chip exercises.',
    estimatedMinutes: 35,
    severity: 'Medium',
    description: 'BODMAS precedence, positive/negative sign handling, and mental addition with regrouping.',
  },
  {
    conceptKey: 'exponents_powers',
    subject: 'Mathematics',
    conceptName: 'Laws of Exponents & Integral Powers',
    triggers: ['exponent', 'power', 'base', 'indices', 'index law', 'radical', 'scientific notation'],
    prerequisiteGrade: 8,
    prerequisiteGradeDisplay: 'Class 8 Prerequisite',
    chapterName: 'Chapter 2: Power Play (Exponents & Powers)',
    pdfFileName: 'Class 8 Maths Chapter 2.pdf',
    recommendedActivity: 'Index law transformation drills converting negative exponents into positive unit fractions.',
    estimatedMinutes: 35,
    severity: 'High',
    description: 'Laws of integral exponents, multiplying/dividing powers with same base, and equating exponents.',
  },
  {
    conceptKey: 'geometry_angles_and_properties',
    subject: 'Mathematics',
    conceptName: 'Basic Geometric Properties & Angle Relationships',
    triggers: ['angle', 'triangle', 'transversal', 'parallel lines', 'interior angles', 'geometry', 'congruence', 'supplementary', 'complementary'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite',
    chapterName: 'Chapter 4: Angles and Triangles',
    pdfFileName: 'Class 7 Maths Chapter 4.pdf',
    recommendedActivity: 'Hands-on protractor measurement and dynamic angle pair discovery using intersecting lines.',
    estimatedMinutes: 35,
    severity: 'High',
    description: 'Angle properties, triangle angle sum theorem, and parallel line transversal angle pairs.',
  },

  // =========================================================================
  // SCIENCE / PHYSICS PREREQUISITES & CURRENT CONCEPTS
  // =========================================================================
  {
    conceptKey: 'physics_numericals_fractions',
    subject: 'Science',
    conceptName: 'Fraction & Ratio Manipulation in Physics Formulas',
    triggers: ['numerical', 'physics numerical', 'fraction in formula', 'ratio calculation', 'substitution in formula', 'division error in physics'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite (Mathematics)',
    chapterName: 'Class 7 Maths Chapter 2: Fractions & Ratios',
    pdfFileName: 'Class 7 Maths Chapter 2.pdf',
    recommendedActivity: 'Step-by-step unit fraction clearing before numerical substitution in physics formulas.',
    estimatedMinutes: 35,
    severity: 'High',
    description: 'Missing foundational fractional and ratio manipulation from earlier mathematics causing errors in physics formulas.',
  },
  {
    conceptKey: 'motion_measurement_basics',
    subject: 'Science',
    conceptName: 'Measurement of Distance, Time & Speed Basics',
    triggers: ['motion basics', 'distance time', 'speed formula', 'measuring time', 'speed = distance/time', 'units of speed', 'speed conversion'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite',
    chapterName: 'Chapter 13: Motion and Time',
    pdfFileName: 'Class 7 Science Chapter 13.pdf',
    recommendedActivity: 'Stopwatch distance-time experiment graphing constant vs non-constant speed.',
    estimatedMinutes: 30,
    severity: 'Medium',
    description: 'Foundational concepts of uniform motion, distance, time, and basic speed calculation from Class 7.',
  },
  {
    conceptKey: 'speed_vs_velocity_current',
    subject: 'Science',
    conceptName: 'Distinction between Speed (Scalar) and Velocity (Vector)',
    triggers: ['speed and velocity', 'speed vs velocity', 'scalar', 'vector', 'velocity direction', 'magnitude with direction', 'displacement vs distance'],
    prerequisiteGrade: 9,
    prerequisiteGradeDisplay: 'Class 9 Core',
    chapterName: 'Chapter 8: Motion (Kinematics)',
    pdfFileName: 'Class 9 Science Chapter 8.pdf',
    recommendedActivity: 'Vector displacement mapping on a 2D grid distinguishing total distance from net displacement.',
    estimatedMinutes: 40,
    severity: 'High',
    description: 'Current Grade 9 concept: understanding velocity as rate of displacement having direction vs scalar speed.',
  },
  {
    conceptKey: 'newtons_laws_current',
    subject: 'Science',
    conceptName: "Newton's Laws of Motion & Inertia",
    triggers: ["newton's law", 'newton', 'inertia', 'force and motion', 'first law', 'second law', 'third law', 'momentum', 'f=ma', 'action and reaction'],
    prerequisiteGrade: 9,
    prerequisiteGradeDisplay: 'Class 9 Core',
    chapterName: 'Chapter 9: Force and Laws of Motion',
    pdfFileName: 'Class 9 Science Chapter 9.pdf',
    recommendedActivity: 'Inertia trolley demonstration and dynamic spring balance action-reaction verification.',
    estimatedMinutes: 45,
    severity: 'High',
    description: "Current Grade 9 concept: applying Newton's three laws to analyze force, inertia, and momentum conservation.",
  },
  {
    conceptKey: 'cell_cellular_transport',
    subject: 'Science',
    conceptName: 'Cell Membranes & Osmotic Transport',
    triggers: ['osmosis', 'diffusion', 'semi-permeable', 'hypertonic', 'hypotonic', 'potato', 'water potential', 'membrane'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite',
    chapterName: 'Chapter 2: Exploring Living Processes & Cellular Transport',
    pdfFileName: 'Class 7 Science Chapter 2.pdf',
    recommendedActivity: '15-minute hands-on diagrammatic comparison and structured cell component matching.',
    estimatedMinutes: 35,
    severity: 'High',
    description: 'Net movement of water across semi-permeable membranes and solute gradient balance.',
  },
  {
    conceptKey: 'cell_organelles_division_of_labor',
    subject: 'Science',
    conceptName: 'Cell Organelle Specialization & Division of Labor',
    triggers: ['organelle', 'nucleus', 'mitochondria', 'golgi', 'atp', 'cell structure', 'cytoplasm', 'powerhouse'],
    prerequisiteGrade: 8,
    prerequisiteGradeDisplay: 'Class 8 Prerequisite',
    chapterName: 'Chapter 2: The Invisible Living World: Beyond Our Naked Eye',
    pdfFileName: 'Class 8 Science Chapter 2.pdf',
    recommendedActivity: 'Organelle flashcard metabolic function mapping and comparative cell diagramming.',
    estimatedMinutes: 35,
    severity: 'Medium',
    description: 'Functional compartmentalization of eukaryotic cells: nucleus regulation, mitochondrial ATP, Golgi sorting.',
  },

  // =========================================================================
  // ENGLISH LANGUAGE PREREQUISITES
  // =========================================================================
  {
    conceptKey: 'english_verb_tenses_concord',
    subject: 'English Language',
    conceptName: 'Verb Forms, Tense Continuity & Subject-Verb Concord',
    triggers: ['tense', 'verb', 'concord', 'subject-verb', 'past participle', 'auxiliary verb', 'grammar'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite',
    chapterName: 'Chapter 3: Verb Forms, Concord & Active/Passive Voice',
    pdfFileName: 'Class 7 English Chapter 3.pdf',
    recommendedActivity: '20-minute guided sentence transformation drills with immediate teacher feedback.',
    estimatedMinutes: 30,
    severity: 'Medium',
    description: 'Agreement of subject number with verb forms, auxiliary selection, and tense timeline accuracy.',
  },

  // =========================================================================
  // SOCIAL STUDIES PREREQUISITES
  // =========================================================================
  {
    conceptKey: 'social_constitution_governance',
    subject: 'Social Studies',
    conceptName: 'Constitutional Values, Democracy & Institutional Framework',
    triggers: ['constitution', 'preamble', 'democracy', 'fundamental rights', 'secularism', 'parliament', 'judiciary'],
    prerequisiteGrade: 7,
    prerequisiteGradeDisplay: 'Class 7 Prerequisite',
    chapterName: 'Chapter 1: Our Environment & Medieval Foundations',
    pdfFileName: 'Class 7 Social Studies Chapter 1.pdf',
    recommendedActivity: 'Timeline graphic organizer mapping cause-and-effect relationships and institutional roles.',
    estimatedMinutes: 40,
    severity: 'Medium',
    description: 'Foundations of democratic governance, constitutional guarantees, and rule of law.',
  },
];

/**
 * Classifies an individual learning gap / mistake from student evaluation data.
 */
export function classifyEvaluationMistake(evaluation, currentGrade = 9, subject = 'Mathematics') {
  const currentGradeNum = parseGradeNumber(currentGrade);

  const errorText = String(evaluation.observedErrors || '').toLowerCase();
  const hypText = String(evaluation.misconceptionHypothesis || '').toLowerCase();
  const promptText = String(evaluation.prompt || '').toLowerCase();
  const lessonText = String(evaluation.affectedLessonName || '').toLowerCase();
  const answerText = String(evaluation.studentAnswer || '').toLowerCase();
  const combinedContext = `${errorText} ${hypText} ${promptText} ${lessonText} ${answerText}`.trim();

  // Score loss check
  const maxMarks = Number(evaluation.maxMarks) || 5;
  const score = evaluation.approvedMarks !== null && evaluation.approvedMarks !== undefined
    ? Number(evaluation.approvedMarks)
    : Number(evaluation.suggestedMarks) || 0;
  const marksLost = Math.max(0, maxMarks - score);

  // Subject normalization to strictly isolate knowledge base rules and prevent cross-subject leakage
  const normSubject = String(subject || '').toLowerCase();
  const isScience = normSubject.includes('science') || normSubject.includes('physic') || normSubject.includes('chem') || normSubject.includes('bio');
  const isMath = normSubject.includes('math') || normSubject.includes('arithmetic') || normSubject.includes('algebra') || normSubject.includes('geometry');
  const isSocial = normSubject.includes('social') || normSubject.includes('history') || normSubject.includes('civic') || normSubject.includes('geography');
  const isEnglish = normSubject.includes('english') || normSubject.includes('lang');

  // Attempt matching against verified curriculum knowledge base
  let matchedRule = null;
  let highestScore = 0;

  for (const rule of PREREQUISITE_KNOWLEDGE_BASE) {
    const ruleSub = String(rule.subject || '').toLowerCase();
    // Strictly isolate rules by subject.
    // If subject is Science, allow Math rules ONLY if there is a strong algebraic/arithmetic trigger match (threshold >= 8)
    if (isScience && ruleSub.includes('social')) continue;
    if (isScience && ruleSub.includes('english')) continue;
    if (isMath && !ruleSub.includes('math')) continue;
    if (isSocial && !ruleSub.includes('social')) continue;
    if (isEnglish && !ruleSub.includes('english')) continue;

    let scoreMatch = 0;
    for (const trigger of rule.triggers) {
      if (combinedContext.includes(trigger.toLowerCase())) {
        scoreMatch += trigger.length;
      }
    }

    const threshold = (isScience && ruleSub.includes('math')) ? 8 : 3;
    if (scoreMatch > highestScore && scoreMatch >= threshold) {
      highestScore = scoreMatch;
      matchedRule = rule;
    }
  }

  // If score is 100% and no error reported, it is not a gap, but associate with the concept
  const isClean = (
    marksLost === 0 &&
    (errorText === '' || errorText === 'none' || errorText.includes('no error') || errorText.includes('none observed')) &&
    (hypText === '' || hypText === 'none' || hypText.includes('none identified'))
  );

  if (isClean) {
    return {
      isGap: false,
      conceptKey: matchedRule ? matchedRule.conceptKey : (evaluation.affectedLessonId || 'general'),
      conceptName: matchedRule ? matchedRule.conceptName : (evaluation.affectedLessonName || 'General Curriculum'),
      topicName: evaluation.affectedLessonName || (matchedRule ? matchedRule.conceptName : 'General Curriculum'),
      prerequisiteGrade: matchedRule ? matchedRule.prerequisiteGrade : null,
      marksLost: 0,
      maxMarks,
      awardedMarks: score,
    };
  }

  // CATEGORY C: UNDETERMINED ROOT CAUSE
  // If no verified prerequisite rule matches or evidence is ambiguous/insufficient
  if (!matchedRule) {
    return {
      isGap: true,
      category: 'UNDETERMINED',
      categoryGroup: 3,
      conceptKey: `undetermined_${evaluation.affectedLessonId || 'general'}_${evaluation.questionNumber || 'q'}`,
      conceptName: evaluation.affectedLessonName || 'Unclassified Diagnostic Gap',
      topicName: evaluation.affectedLessonName || 'Unclassified Topic',
      missingConcept: 'Root Cause Undetermined',
      prerequisiteGrade: null,
      prerequisiteGradeDisplay: 'Unverified Grade',
      currentGrade: currentGradeNum,
      chapterName: null,
      pdfFileName: null,
      recommendedActivity: 'Conduct targeted diagnostic questioning to determine whether gap stems from earlier grades or current instruction.',
      estimatedMinutes: 20,
      severity: 'Low',
      marksLost,
      maxMarks,
      awardedMarks: score,
      observedError: evaluation.observedErrors || 'Needs further diagnostic observation.',
      misconception: evaluation.misconceptionHypothesis || 'Undetermined root cause.',
      evidence: evaluation.prompt ? `Question prompt: "${evaluation.prompt.slice(0, 80)}"` : 'Evaluation evidence pending deeper diagnosis.',
    };
  }

  // Determine Category A vs Category B based on grade relationship
  const prereqGradeNum = matchedRule.prerequisiteGrade;
  const isPreviousClass = prereqGradeNum < currentGradeNum;

  const category = isPreviousClass ? 'PREVIOUS_CLASS_GAP' : 'CURRENT_CLASS_GAP';
  const categoryGroup = isPreviousClass ? 1 : 2;

  return {
    isGap: true,
    category,
    categoryGroup,
    conceptKey: matchedRule.conceptKey,
    conceptName: matchedRule.conceptName,
    topicName: evaluation.affectedLessonName || matchedRule.conceptName,
    missingConcept: matchedRule.conceptName,
    prerequisiteGrade: prereqGradeNum,
    prerequisiteGradeDisplay: matchedRule.prerequisiteGradeDisplay,
    currentGrade: currentGradeNum,
    chapterName: matchedRule.chapterName,
    pdfFileName: matchedRule.pdfFileName,
    recommendedActivity: matchedRule.recommendedActivity,
    estimatedMinutes: matchedRule.estimatedMinutes,
    severity: matchedRule.severity,
    marksLost,
    maxMarks,
    awardedMarks: score,
    observedError: evaluation.observedErrors && evaluation.observedErrors !== 'None'
      ? evaluation.observedErrors
      : matchedRule.description,
    misconception: evaluation.misconceptionHypothesis && evaluation.misconceptionHypothesis !== 'None identified.'
      ? evaluation.misconceptionHypothesis
      : matchedRule.description,
    evidence: evaluation.studentAnswer
      ? `Student response: "${evaluation.studentAnswer.slice(0, 100)}"`
      : evaluation.prompt
      ? `Question: "${evaluation.prompt.slice(0, 80)}"`
      : matchedRule.description,
  };
}

/**
 * Aggregates evaluations across a class/assessment into strictly prioritized teaching groups.
 */
export function aggregateClassTeachingPriorities(evaluations = [], answerSheets = [], currentGrade = 9, subject = 'Mathematics') {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return {
      hasEvaluatedData: false,
      totalEvaluations: 0,
      totalStudentsEvaluated: 0,
      previousClassGaps: [],
      currentClassGaps: [],
      undeterminedGaps: [],
      allPriorities: [],
      topicSummaries: [],
      recommendedTeachingOrder: [],
    };
  }

  // 1. Build sheet -> student lookup map
  const sheetStudentMap = new Map();
  (answerSheets || []).forEach((sheet) => {
    const sId = String(sheet._id || sheet.id);
    const studentIdentifier = sheet.studentName || sheet.rollNumber || sId;
    sheetStudentMap.set(sId, studentIdentifier);
  });

  // 2. Count total unique students evaluated across this assessment / class
  const allEvaluatedStudents = new Set();
  evaluations.forEach((ev) => {
    const studentId = (ev.answerSheetId && sheetStudentMap.get(String(ev.answerSheetId))) ||
      (ev.studentName ? String(ev.studentName) : null) ||
      (ev.answerSheetId ? String(ev.answerSheetId) : null) ||
      (ev.assessmentId ? String(ev.assessmentId) : null) ||
      String(ev._id || 'unknown_student');
    allEvaluatedStudents.add(studentId);
  });
  const totalEvaluatedStudentsCount = allEvaluatedStudents.size || 1;

  // 3. Backward-compatible topic aggregation (keyed strictly by affectedLessonName / topicKey)
  const legacyTopicMap = new Map();

  evaluations.forEach((ev) => {
    const topicKey = ev.affectedLessonName || ev.affectedLessonId || 'General Curriculum';
    if (!legacyTopicMap.has(topicKey)) {
      legacyTopicMap.set(topicKey, {
        topicName: topicKey,
        lessonId: ev.affectedLessonId || '',
        totalQuestions: 0,
        totalEarnedMarks: 0,
        totalMaxMarks: 0,
        observedErrors: new Set(),
        hypotheses: new Set(),
      });
    }

    const tEntry = legacyTopicMap.get(topicKey);
    tEntry.totalQuestions += 1;
    const score = ev.approvedMarks !== null && ev.approvedMarks !== undefined
      ? Number(ev.approvedMarks)
      : Number(ev.suggestedMarks) || 0;
    tEntry.totalEarnedMarks += score;
    tEntry.totalMaxMarks += Number(ev.maxMarks) || 5;

    if (ev.observedErrors && ev.observedErrors !== 'None') {
      tEntry.observedErrors.add(ev.observedErrors);
    }
    if (ev.misconceptionHypothesis && ev.misconceptionHypothesis !== 'None identified.') {
      tEntry.hypotheses.add(ev.misconceptionHypothesis);
    }
  });

  const topicSummaries = Array.from(legacyTopicMap.values()).map((t) => {
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

  // 4. Prerequisite & Root-Cause Aggregation (keyed by conceptKey)
  const conceptMap = new Map();

  evaluations.forEach((ev) => {
    const studentId = (ev.answerSheetId && sheetStudentMap.get(String(ev.answerSheetId))) ||
      (ev.studentName ? String(ev.studentName) : null) ||
      (ev.answerSheetId ? String(ev.answerSheetId) : null) ||
      (ev.assessmentId ? String(ev.assessmentId) : null) ||
      String(ev._id || 'unknown_student');
    const classification = classifyEvaluationMistake(ev, currentGrade, subject);

    const cKey = classification.conceptKey || (ev.affectedLessonName || 'general');
    if (!conceptMap.has(cKey)) {
      conceptMap.set(cKey, {
        conceptKey: cKey,
        conceptName: classification.conceptName || ev.affectedLessonName || 'General Curriculum',
        topicName: ev.affectedLessonName || classification.conceptName || 'General Curriculum',
        missingConcept: classification.missingConcept || classification.conceptName,
        category: classification.category || 'UNDETERMINED',
        categoryGroup: classification.categoryGroup || 3,
        prerequisiteGrade: classification.prerequisiteGrade,
        prerequisiteGradeDisplay: classification.prerequisiteGradeDisplay || 'Unverified',
        currentGrade: parseGradeNumber(currentGrade),
        chapterName: classification.chapterName,
        pdfFileName: classification.pdfFileName,
        recommendedActivity: classification.recommendedActivity,
        estimatedMinutes: classification.estimatedMinutes || 30,
        severity: classification.severity || 'Medium',
        studentsEvaluated: new Set(),
        studentsAffected: new Set(),
        totalMarksEarned: 0,
        totalMaxMarks: 0,
        observedErrors: new Set(),
        misconceptions: new Set(),
        evidenceSamples: new Set(),
      });
    }

    const entry = conceptMap.get(cKey);
    entry.studentsEvaluated.add(studentId);

    const maxM = Number(ev.maxMarks) || 5;
    const score = ev.approvedMarks !== null && ev.approvedMarks !== undefined
      ? Number(ev.approvedMarks)
      : Number(ev.suggestedMarks) || 0;

    entry.totalMarksEarned += score;
    entry.totalMaxMarks += maxM;

    if (classification.isGap) {
      entry.studentsAffected.add(studentId);
      if (classification.observedError && classification.observedError !== 'None') {
        entry.observedErrors.add(classification.observedError);
      }
      if (classification.misconception && classification.misconception !== 'None identified.') {
        entry.misconceptions.add(classification.misconception);
      }
      if (classification.evidence) {
        entry.evidenceSamples.add(classification.evidence);
      }
    }
  });

  const severityRank = { High: 3, Medium: 2, Low: 1 };

  // Convert concept map to processed priority candidates
  const processedItems = Array.from(conceptMap.values()).map((entry) => {
    const totalStudentsInConcept = entry.studentsEvaluated.size || totalEvaluatedStudentsCount;
    const affectedCount = entry.studentsAffected.size;
    const affectedPercentage = totalStudentsInConcept > 0
      ? Math.round((affectedCount / totalStudentsInConcept) * 100)
      : 0;

    const averageMastery = entry.totalMaxMarks > 0
      ? Math.round((entry.totalMarksEarned / entry.totalMaxMarks) * 100)
      : 100;

    const errorArr = Array.from(entry.observedErrors);
    const misArr = Array.from(entry.misconceptions);
    const evArr = Array.from(entry.evidenceSamples);

    const commonMistakeSummary = errorArr.length > 0
      ? errorArr.slice(0, 2).join('; ')
      : misArr.length > 0
      ? misArr.slice(0, 2).join('; ')
      : 'Review recommended based on assessment marks.';

    const evidenceQuote = evArr.length > 0 ? evArr[0] : commonMistakeSummary;

    return {
      conceptKey: entry.conceptKey,
      topicName: entry.topicName,
      missingConcept: entry.missingConcept,
      category: entry.category,
      categoryGroup: entry.categoryGroup,
      prerequisiteGrade: entry.prerequisiteGrade,
      grade: entry.prerequisiteGradeDisplay,
      currentGrade: entry.currentGrade,
      chapterName: entry.chapterName,
      pdfFileName: entry.pdfFileName,
      affectedStudentsCount: affectedCount,
      totalEvaluatedCount: totalStudentsInConcept,
      affectedPercentage,
      averageMastery,
      severity: entry.severity,
      commonMistakes: commonMistakeSummary,
      evidenceQuote,
      recommendedActivity: entry.recommendedActivity,
      estimatedMinutes: entry.estimatedMinutes,
      isResolved: affectedPercentage === 0 && averageMastery >= 75,
    };
  });

  // Filter active gaps (students affected > 0 or mastery < 80)
  const activeGaps = processedItems.filter((i) => i.affectedStudentsCount > 0 || i.averageMastery < 80);

  // Sorting function within a priority group
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
  const previousClassGaps = activeGaps
    .filter((i) => i.category === 'PREVIOUS_CLASS_GAP')
    .sort(sortWithinGroup);

  // Group 2: Current-Class Learning Gaps
  const currentClassGaps = activeGaps
    .filter((i) => i.category === 'CURRENT_CLASS_GAP')
    .sort(sortWithinGroup);

  // Group 3: Undetermined Learning Gaps
  const undeterminedGaps = activeGaps
    .filter((i) => i.category === 'UNDETERMINED')
    .sort(sortWithinGroup);

  // Strict 3-Tier Combination: Group 1 -> Group 2 -> Group 3
  const allPriorities = [
    ...previousClassGaps,
    ...currentClassGaps,
    ...undeterminedGaps,
  ].map((item, idx) => ({
    ...item,
    id: `priority-${item.conceptKey}`,
    rank: idx + 1,
    priority: item.affectedPercentage >= 50 || item.averageMastery < 60 ? 'High' : item.averageMastery < 80 ? 'Medium' : 'Low',
  }));

  // Assign group ranks
  previousClassGaps.forEach((item, idx) => { item.groupRank = idx + 1; });
  currentClassGaps.forEach((item, idx) => { item.groupRank = idx + 1; });
  undeterminedGaps.forEach((item, idx) => { item.groupRank = idx + 1; });

  // Recommended teaching order matches strict prerequisite priorities
  // (or legacy lowest-mastery if no active gaps were diagnosed)
  let recommendedTeachingOrder = allPriorities;
  if (recommendedTeachingOrder.length === 0) {
    recommendedTeachingOrder = [...topicSummaries]
      .sort((a, b) => a.averageMastery - b.averageMastery)
      .map((t, idx) => ({
        ...t,
        rank: idx + 1,
        priority: t.averageMastery < 60 ? 'High' : t.averageMastery < 80 ? 'Medium' : 'Low',
        covered: false,
      }));
  }

  return {
    hasEvaluatedData: evaluations.length > 0,
    totalEvaluations: evaluations.length,
    totalStudentsEvaluated: totalEvaluatedStudentsCount,
    previousClassGaps,
    currentClassGaps,
    undeterminedGaps,
    allPriorities,
    topicSummaries,
    recommendedTeachingOrder,
  };
}

export default {
  parseGradeNumber,
  PREREQUISITE_KNOWLEDGE_BASE,
  classifyEvaluationMistake,
  aggregateClassTeachingPriorities,
};
