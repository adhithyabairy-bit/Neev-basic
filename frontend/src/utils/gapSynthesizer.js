/**
 * Gap & Remediation Synthesizer for Neev Platform
 * Derives foundational prerequisite gaps, ordered learning roadmaps,
 * and diagnostic re-test items from evaluated answer sheet results.
 *
 * Grounded in curriculum knowledge base with textbook chapter retrieval
 * and future grade impact mapping.
 */

/**
 * Robust filter to detect non-error text, mastery statements,
 * or neutral affirmations from AI evaluation output.
 */
export function isNonErrorText(text) {
  if (!text) return true;
  const clean = String(text).toLowerCase().trim();
  if (
    clean === '' ||
    clean === 'none' ||
    clean === 'none.' ||
    clean === 'none observed' ||
    clean === 'none observed.' ||
    clean === 'none identified' ||
    clean === 'none identified.' ||
    clean === 'n/a' ||
    clean === 'na' ||
    clean === 'nil' ||
    clean === 'null' ||
    clean === 'no error' ||
    clean === 'no errors' ||
    clean === 'no error observed' ||
    clean === 'no errors observed' ||
    clean === 'no misconception' ||
    clean === 'no misconceptions' ||
    clean === 'correct' ||
    clean === 'all correct' ||
    clean === 'work is correct' ||
    clean === 'correct work'
  ) {
    return true;
  }

  if (
    clean.startsWith('none observed') ||
    clean.startsWith('none identified') ||
    clean.startsWith('no evident misconception') ||
    clean.startsWith('no apparent misconception') ||
    clean.startsWith('no conceptual misconception') ||
    clean.startsWith('no misconception') ||
    clean.startsWith('no error') ||
    clean.startsWith('no critical foundational') ||
    clean.includes('demonstrates correct understanding') ||
    clean.includes('work demonstrates correct understanding') ||
    clean.includes('demonstrates accurate understanding') ||
    clean.includes('demonstrates working knowledge') ||
    clean.includes('consistent with rubric') ||
    clean.includes('consistent with criteria') ||
    clean.includes('mastery confirmed') ||
    clean.includes('mastery validated') ||
    clean.includes('perfect solution')
  ) {
    return true;
  }

  return false;
}

/**
 * Knowledge Base linking exam concepts and misconceptions to:
 * 1. Prerequisite Foundational Lesson & Chapter Name in Previous Class (with downloadable/viewable PDF)
 * 2. Downstream Future Lessons Affected if not mastered now (with Grade and Lesson Name)
 */
const CURRICULUM_KNOWLEDGE_BASE = [
  {
    category: 'linear_equations',
    triggers: ['linear equation', '5x', 'transpos', 'variable', 'algebraic balance', 'equation', 'substitute', 'inverse operation'],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Simple Expressions and Equations',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 7 Maths Chapter 2.pdf',
      concept: 'Formulating arithmetic expressions, balancing equations across equals sign (=), and transposition of variables/constants.',
      studyTip: 'Review Section 2.1 (Simple Expressions) and practice the balance-scale method of moving terms across the equals sign with sign reversal.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        lessonName: 'Chapter 2: Introduction to Linear Polynomials & Linear Equations',
        risk: 'Student will struggle to formulate algebraic equations in two variables or perform algebraic substitutions.',
      },
      {
        grade: 'Class 10',
        lessonName: 'Chapter 3: Pair of Linear Equations in Two Variables',
        risk: 'Breakdown in solving simultaneous equations using substitution, elimination, or cross-multiplication methods.',
      },
    ],
    diagnosticQuestion: {
      prompt: 'Solve the linear equation for x and verify your answer with complete step-by-step substitution:\n4x − 5 = 2x + 9',
      type: 'Problem Solving',
      marks: 3,
      targetConcept: 'Transposition of Variables & Substitution Verification (Class 7 Prerequisite)',
      expectedAnswer: 'Step 1 (Solving): 4x - 2x = 9 + 5 => 2x = 14 => x = 7. Step 2 (Verification): LHS = 4(7) - 5 = 28 - 5 = 23; RHS = 2(7) + 9 = 14 + 9 = 23. Since LHS = RHS = 23, verified.',
    },
  },
  {
    category: 'arithmetic_order_of_operations',
    triggers: ['arithmetic', 'addition', 'order of operation', 'calculation error', 'rhs arithmetic', 'multiplication', '15+7', '3(5)+7', '23 instead of 22', 'computation', 'slip in addition'],
    prerequisiteLesson: {
      grade: 'Class 6',
      chapterNumber: 3,
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      pdfUrl: '/curriculum/Class 6 Maths Chapter 3.pdf',
      concept: 'Basic operations, operational precedence (BODMAS/PEMDAS), place value carrying, and number line addition models.',
      studyTip: 'Reinforce mental addition facts (e.g. 15 + 7 = 22) and always write an intermediate check step before concluding a verification.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        lessonName: 'Chapter 3: The World of Numbers & Real Number Systems',
        risk: 'Cascading computational slips in evaluating radical surds, irrational expansions, and polynomial values.',
      },
      {
        grade: 'Class 10',
        lessonName: 'Chapter 1: Real Numbers & Fundamental Theorem of Arithmetic',
        risk: 'Loss of examination marks in prime factorisation algorithms and decimal expansion proofs.',
      },
    ],
    diagnosticQuestion: {
      prompt: 'Evaluate the arithmetic expression with complete intermediate steps:\n18 + 7 − 4 × (6 − 3)',
      type: 'Short Answer',
      marks: 2,
      targetConcept: 'BODMAS Precedence & Addition with Regrouping (Class 6 Prerequisite)',
      expectedAnswer: 'Step 1: Parentheses: 6 - 3 = 3. Step 2: Multiplication: 4 * 3 = 12. Step 3: Addition & Subtraction: 18 + 7 - 12 = 25 - 12 = 13.',
    },
  },
  {
    category: 'exponents_powers',
    triggers: ['exponent', 'power', 'base', 'indices', '3^-7', '5^m', 'equating exponents', 'radical', 'index law'],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Power Play (Exponents & Powers)',
      pdfFileName: 'Class 8 Maths Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 8 Maths Chapter 2.pdf',
      concept: 'Laws of integral exponents: a^m × a^n = a^(m+n), a^m ÷ a^n = a^(m-n), a^(-n) = 1/a^n, and equating exponents for common bases.',
      studyTip: 'Focus on the distinction between negative exponents and negative numbers; practice converting a^(-n) to unit fractions.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        lessonName: 'Chapter 3: Laws of Exponents for Real Numbers & Radical Notation',
        risk: 'Inability to simplify expressions with rational fractional exponents or rationalise monomial denominators.',
      },
      {
        grade: 'Class 11',
        lessonName: 'Exponential & Logarithmic Functions',
        risk: 'Severe block in solving exponential equations, logarithmic identities, and base change calculations.',
      },
    ],
    diagnosticQuestion: {
      prompt: 'Solve the exponential problems using standard index laws:\n(a) Find the value of m if: 5ᵐ ÷ 5⁻³ = 5⁵.\n(b) Simplify and express with positive exponents: (3⁻⁷ ÷ 3⁻¹⁰) × 3⁻⁵.',
      type: 'Problem Solving',
      marks: 4,
      targetConcept: 'Laws of Integral Exponents & Equating Indices (Class 8 Core)',
      expectedAnswer: '(a) Using aᵐ ÷ aⁿ = aᵐ⁻ⁿ: 5^(m - (-3)) = 5^(m + 3) = 5^5. Equating exponents: m + 3 = 5 => m = 2.\n(b) 3^(-7 - (-10)) * 3^(-5) = 3^3 * 3^(-5) = 3^(3 - 5) = 3^(-2) = 1/3² = 1/9.',
    },
  },
  {
    category: 'commercial_math_interest',
    triggers: ['compound interest', 'simple interest', '8000', 'rate', 'compounding', 'commercial', 'principal', 'annual interest', 'percentage'],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Large Numbers & Comparing Quantities (Simple Interest & Percentages)',
      pdfFileName: 'Class 7 Maths Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 7 Maths Chapter 1.pdf',
      concept: 'Simple interest formula I = (P×R×T)/100, year-on-year interest accumulation, and compounding multiplier A = P(1 + R/100)^n.',
      studyTip: 'Calculate year-1 and year-2 interest sequentially to build intuition before relying entirely on the exponential compounding formula.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        lessonName: 'Commercial Mathematics & Progressive Depreciation',
        risk: 'Inability to calculate half-yearly compounding schedules, population growth models, or asset depreciation.',
      },
      {
        grade: 'Class 10',
        lessonName: 'Banking (Recurring Deposit Accounts) & Financial Mathematics',
        risk: 'Failure to compute monthly installment interest yields and maturity payments.',
      },
    ],
    diagnosticQuestion: {
      prompt: 'A sum of ₹ 8,000 is borrowed at an interest rate of 5% per annum for 2 years. Calculate the compound interest compounded annually.',
      type: 'Multi-Step Problem',
      marks: 4,
      targetConcept: 'Compound Interest Formula & Annual Compounding Multipliers (Class 7 Prerequisite)',
      expectedAnswer: 'Amount A = P(1 + R/100)ⁿ = 8000(1 + 5/100)² = 8000(21/20)² = 8000 * 441 / 400 = ₹ 8,820. Compound Interest CI = A - P = 8820 - 8000 = ₹ 820.',
    },
  },
  {
    category: 'geometry_mensuration',
    triggers: ['mensuration', 'rectangle', 'diagonal', 'pythagor', 'area', 'perimeter', '25', '24', 'hypotenuse', 'width', 'geometry'],
    prerequisiteLesson: {
      grade: 'Class 6',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Lines, Angles and Plane Shapes',
      pdfFileName: 'Class 6 Maths Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 6 Maths Chapter 2.pdf',
      concept: 'Properties of rectangles, perpendicular sides, right-angled triangles, and Pythagoras theorem (diagonal² = length² + width²).',
      studyTip: 'Always sketch the geometric shape, label known diagonals/sides, and verify that the hypotenuse is the longest side.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        lessonName: 'Chapter 1: Orienting Yourself & Coordinate Geometry',
        risk: 'Inability to apply the coordinate distance formula derived directly from the Pythagoras theorem.',
      },
      {
        grade: 'Class 10',
        lessonName: 'Chapter 2: Coordinate Geometry & Surface Areas / Volumes',
        risk: 'Breakdown in calculating slant heights of cones, diagonals of cuboids, and composite 3D solid mensuration.',
      },
    ],
    diagnosticQuestion: {
      prompt: 'A rectangular field has length 24 m and diagonal 25 m.\n(a) Using the Pythagoras theorem, calculate the width of the field.\n(b) Find the perimeter and area of the field.',
      type: 'Problem Solving',
      marks: 4,
      targetConcept: 'Pythagoras Theorem in Rectangles & Perimeter/Area (Class 6 Prerequisite)',
      expectedAnswer: '(a) In right triangle: width² + length² = diagonal² => width² = 25² - 24² = 625 - 576 = 49 => width = 7 m.\n(b) Perimeter = 2(24 + 7) = 62 m; Area = 24 * 7 = 168 sq m.',
    },
  },
  {
    category: 'factorisation_polynomials',
    triggers: ['factoris', '16b', 'identity', 'polynomial', 'terms', 'algebraic expression', 'difference of squares'],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Simple Expressions & Algebraic Identities',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 7 Maths Chapter 2.pdf',
      concept: 'Factoring out common monomial terms and applying standard algebraic identities: a² - b² = (a - b)(a + b) and (a + b)²',
      studyTip: 'Practice recognising perfect squares (e.g. 16b² = (4b)²) and grouping terms with common binomial factors.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        lessonName: 'Chapter 2: Introduction to Linear Polynomials & Factor Theorem',
        risk: 'Failure to split the middle term in quadratic polynomials or apply the Factor Theorem.',
      },
      {
        grade: 'Class 10',
        lessonName: 'Chapter 2: Polynomials & Quadratic Equations',
        risk: 'Inability to compute polynomial zeros, roots of quadratic equations, or verify sum/product of roots.',
      },
    ],
    diagnosticQuestion: {
      prompt: 'Factorise the following algebraic expressions completely:\n(a) 16b² − 49c²\n(b) 2x² + 7x + 3 (by splitting the middle term)',
      type: 'Problem Solving',
      marks: 4,
      targetConcept: 'Difference of Squares (a² - b²) and Quadratic Factorisation (Class 7 Prerequisite)',
      expectedAnswer: '(a) Using a² - b² = (a - b)(a + b): (4b - 7c)(4b + 7c).\n(b) 2x² + 6x + x + 3 = 2x(x + 3) + 1(x + 3) = (2x + 1)(x + 3).',
    },
  },
];

/**
 * Resolves curriculum knowledge mapping for an evaluation item.
 */
function resolveCurriculumKnowledge({ prompt = '', observed = '', hypothesis = '', topicName = '', subject = 'Mathematics', syllabusEvidence = [] }) {
  const combined = `${prompt} ${observed} ${hypothesis} ${topicName}`.toLowerCase();

  // 1. Check if database retrieval evidence provided a specific textbook chapter file
  if (Array.isArray(syllabusEvidence) && syllabusEvidence.length > 0) {
    for (const chunk of syllabusEvidence) {
      const src = (chunk.sourceFileName || '').toLowerCase();
      if (src.includes('class 7 maths chapter 2')) {
        return CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'linear_equations');
      }
      if (src.includes('class 6 maths chapter 3')) {
        return CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'arithmetic_order_of_operations');
      }
      if (src.includes('class 8 maths chapter 2')) {
        return CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'exponents_powers');
      }
      if (src.includes('class 7 maths chapter 1')) {
        return CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'commercial_math_interest');
      }
      if (src.includes('class 6 maths chapter 2')) {
        return CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'geometry_mensuration');
      }
    }
  }

  // 2. Keyword trigger match
  for (const entry of CURRICULUM_KNOWLEDGE_BASE) {
    for (const trigger of entry.triggers) {
      if (combined.includes(trigger.toLowerCase())) {
        return entry;
      }
    }
  }

  // 3. Fallback default for Mathematics
  if (subject.toLowerCase().includes('math')) {
    return CURRICULUM_KNOWLEDGE_BASE[0]; // Simple Expressions & Equations
  }

  // Fallback default for generic subjects
  return {
    category: 'general_foundations',
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 1,
      chapterName: `Chapter 1: Foundational ${subject} Principles`,
      pdfFileName: `Class 7 ${subject} Chapter 1.pdf`,
      pdfUrl: `/curriculum/Class 7 Maths Chapter 1.pdf`,
      concept: `Core conceptual definitions and foundational analytical skills in ${subject}.`,
      studyTip: `Review foundational concepts and complete guided review exercises before advancing.`,
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        lessonName: `Advanced Application Units in ${subject}`,
        risk: `Gaps in core prerequisite principles will lead to compounding comprehension difficulties.`,
      },
      {
        grade: 'Class 10',
        lessonName: `Board Examination Preparatory Topics in ${subject}`,
        risk: `Loss of examination performance in multi-concept synthetic problems.`,
      },
    ],
  };
}

/**
 * Derives foundational prerequisite gaps, ordered learning roadmaps,
 * and diagnostic re-test items from evaluated answer sheet results.
 *
 * Strictly filters out questions with no errors or where full marks were awarded,
 * completely excluding statements like "None observed" or "No evident misconception".
 */
export function deriveGapsAndRemediation(evaluations = [], syllabusData = {}) {
  const gaps = [];
  const roadmap = [];
  const testQuestions = [];

  const subject = syllabusData.selectedSubject || 'Mathematics';
  const targetGrade = syllabusData.selectedClass || 'Class 8';

  evaluations.forEach((item, index) => {
    const qNum = item.questionNumber || `Q${index + 1}`;
    const prompt = item.prompt || `Question ${qNum}`;

    const observed = String(item.observedErrors || '').trim();
    const hypothesis = String(item.misconceptionHypothesis || '').trim();

    // Check if the student lost marks
    const max = Number(item.maxMarks ?? item.maximumMarks ?? 5);
    const awarded = Number(
      item.approvedMarks !== null && item.approvedMarks !== undefined
        ? item.approvedMarks
        : (item.suggestedMarks ?? item.awardedMarks ?? item.detectedMarks ?? max)
    );
    const hasScoreLoss = awarded < max;

    // Check if observed error or hypothesis describes a real mistake
    const hasObservedError = !isNonErrorText(observed);
    const hasMisconception = !isNonErrorText(hypothesis);

    // CRITICAL REQUIREMENT: A question is ONLY a learning gap if:
    // 1. An actual error was observed in student working steps, OR
    // 2. Marks were lost AND a genuine misconception hypothesis was diagnosed.
    // If no error was observed and full marks were awarded, or the text says
    // "None observed" / "No evident misconception", EXCLUDE IT!
    if (!hasObservedError && !hasScoreLoss) {
      return; // Skip: Student answered correctly with full marks
    }

    if (!hasObservedError && !hasMisconception) {
      return; // Skip: No actual error or misconception diagnosed
    }

    // Determine clean topic name
    let topicName =
      item.affectedLessonName ||
      (prompt.includes('—') ? prompt.split('—')[0].trim() : prompt.slice(0, 50).trim()) ||
      `Foundational ${subject} Concept`;

    topicName = topicName.replace(/\s*\[\d+\s*Marks?\]/i, '').replace(/Solution/i, '').trim();

    // Construct clear, human-readable gap title from misconception or observed error
    let gapTopic = '';
    if (hasMisconception) {
      gapTopic = hypothesis.split('.')[0].replace(/^Possible\s+/i, '').replace(/^Likely\s+/i, '').trim();
    }
    if (!gapTopic || isNonErrorText(gapTopic)) {
      if (hasObservedError) {
        gapTopic = observed.split('.')[0].replace(/^In\s+Q\d+,\s*/i, '').trim();
      }
    }
    if (!gapTopic || isNonErrorText(gapTopic)) {
      gapTopic = `Foundational Gap in ${topicName}`;
    }

    const gapId = `gap-${qNum.toLowerCase().replace(/[^a-z0-9]/g, '') || index + 1}`;
    const lessonName = item.affectedLessonName || topicName;

    // Retrieve previous class foundational lesson and future affected lessons
    const knowledge = resolveCurriculumKnowledge({
      prompt,
      observed,
      hypothesis,
      topicName,
      subject,
      syllabusEvidence: item.syllabusEvidence,
    });

    gaps.push({
      id: gapId,
      questionNumber: qNum,
      topicName: gapTopic,
      grade: `${knowledge.prerequisiteLesson.grade} Prerequisite`,
      lessonName,
      lessonId: item.affectedLessonId || `les-${index + 1}`,
      evidence: `In ${qNum}, ${observed || hypothesis || 'discrepancy identified in working steps.'}`,
      likelihood: awarded <= max / 2 ? 'Likely' : 'Possible',
      status: 'Verified from Answer Evidence',
      dependentTopics: [topicName, `${subject} Core Curriculum`],
      misconception: hypothesis || observed || 'Conceptual reinforcement required.',
      prerequisiteLesson: knowledge.prerequisiteLesson,
      futureLessonsAffected: knowledge.futureLessonsAffected,
      scoreInfo: {
        awarded,
        max,
        lost: max - awarded,
      },
    });

    roadmap.push({
      id: `rm-${qNum.toLowerCase().replace(/[^a-z0-9]/g, '') || index + 1}`,
      rank: roadmap.length + 1,
      topic: gapTopic,
      grade: `${knowledge.prerequisiteLesson.grade} Remediation`,
      lessonId: item.affectedLessonId || `les-${index + 1}`,
      prereqChain: roadmap.length === 0 ? 'None (Root Foundation)' : `Step ${roadmap.length}: Prior Concept`,
      recommendedActivity: `Targeted practice on ${topicName.toLowerCase()}: ${knowledge.prerequisiteLesson.studyTip}`,
      workedExamples: `2 worked examples from ${knowledge.prerequisiteLesson.chapterName} breaking down step-by-step resolution.`,
      practiceQuestions: 4,
      estimatedMinutes: 25,
      status: 'Not Started',
      prerequisiteLesson: knowledge.prerequisiteLesson,
      futureLessonsAffected: knowledge.futureLessonsAffected,
    });

    // Formulate a proper, authentic diagnostic test question for this identified gap
    let questionPrompt = '';
    let questionType = 'Problem Solving';
    let questionMarks = 3;
    let conceptLabel = gapTopic;
    let expectedSolution = item.expectedAnswer;

    if (knowledge && knowledge.diagnosticQuestion) {
      questionPrompt = knowledge.diagnosticQuestion.prompt;
      questionType = knowledge.diagnosticQuestion.type || 'Problem Solving';
      questionMarks = knowledge.diagnosticQuestion.marks || (max > 0 ? max : 3);
      conceptLabel = knowledge.diagnosticQuestion.targetConcept || gapTopic;
      expectedSolution = knowledge.diagnosticQuestion.expectedAnswer || item.expectedAnswer;
    } else {
      // Clean fallback if original prompt is available
      const cleanPrompt = prompt
        .replace(/^Diagnostic check for.*?:/i, '')
        .replace(/\s*\[Subtotal.*?\]/i, '')
        .trim();
      questionPrompt = `Solve the following problem and show complete step-by-step working:\n${cleanPrompt}`;
      conceptLabel = gapTopic.length > 60 ? `${gapTopic.slice(0, 57)}...` : gapTopic;
    }

    testQuestions.push({
      id: `test-${qNum.toLowerCase().replace(/[^a-z0-9]/g, '') || index + 1}`,
      number: `${testQuestions.length + 1}`,
      prompt: questionPrompt,
      type: questionType,
      marks: questionMarks,
      targetConcept: conceptLabel,
      syllabusTopic: lessonName,
      expectedAnswer: expectedSolution || 'Clear logical steps with correct final verification.',
      prerequisiteChapter: knowledge.prerequisiteLesson?.chapterName,
      pdfFileName: knowledge.prerequisiteLesson?.pdfFileName,
    });
  });

  // If student answered all questions without errors, celebrate mastery
  if (gaps.length === 0 && evaluations.length > 0) {
    gaps.push({
      id: 'gap-mastery',
      topicName: 'Curriculum Mastery Confirmed',
      grade: targetGrade,
      lessonName: subject,
      lessonId: 'les-mastery',
      evidence: 'Student demonstrated working steps consistent with rubric across all assessed questions without foundational errors.',
      likelihood: 'Low',
      status: 'Mastery Validated',
      dependentTopics: ['Advanced Problem Solving', 'Enrichment Units'],
      misconception: 'No critical foundational gaps detected.',
      prerequisiteLesson: {
        grade: targetGrade,
        chapterNumber: 1,
        chapterName: `${targetGrade} Advanced Extension Topics`,
        pdfFileName: 'Class 8 Maths Chapter 1.pdf',
        pdfUrl: '/curriculum/Class 8 Maths Chapter 1.pdf',
        concept: 'Synthesis of multiple mathematical domains, proof formulation, and Olympiad problem-solving.',
        studyTip: 'Engage with non-routine enrichment challenges.',
      },
      futureLessonsAffected: [
        {
          grade: 'Next Grade Level',
          lessonName: 'Accelerated Curriculum Pathway',
          risk: 'No negative impact detected. Student is prepared for advanced honors topics.',
        },
      ],
    });

    roadmap.push({
      id: 'rm-enrichment',
      rank: 1,
      topic: 'Advanced Problem Solving & Extension Tasks',
      grade: targetGrade,
      lessonId: 'les-enrichment',
      prereqChain: 'Core Syllabus Competencies',
      recommendedActivity: 'Challenging multi-step applications and cross-concept Olympiad problems.',
      workedExamples: 'Extension problems with alternative solution pathways.',
      practiceQuestions: 5,
      estimatedMinutes: 30,
      status: 'Not Started',
      prerequisiteLesson: {
        grade: targetGrade,
        chapterNumber: 1,
        chapterName: `${targetGrade} Mathematics Enrichment`,
        pdfFileName: 'Class 8 Maths Chapter 1.pdf',
        pdfUrl: '/curriculum/Class 8 Maths Chapter 1.pdf',
        concept: 'Synthesis and mathematical modeling.',
        studyTip: 'Explore alternative geometric and algebraic representations.',
      },
      futureLessonsAffected: [],
    });

    testQuestions.push({
      id: 'test-enrichment',
      number: '1',
      prompt: 'Enrichment: Formulate and solve an algebraic application model based on syllabus concepts.',
      type: 'Problem Solving',
      marks: 5,
      targetConcept: 'Advanced Conceptual Application',
      syllabusTopic: subject,
      expectedAnswer: 'Complete mathematical model with justification.',
    });
  }

  return { gaps, roadmap, testQuestions };
}

export default deriveGapsAndRemediation;
