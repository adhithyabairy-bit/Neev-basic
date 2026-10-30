/**
 * Gap & Remediation Synthesizer for Neev Platform
 * Derives foundational prerequisite gaps, ordered learning roadmaps,
 * and diagnostic re-test items from evaluated answer sheet results.
 *
 * Grounded in curriculum knowledge base with textbook chapter retrieval
 * and future grade impact mapping up to Class 10 (with dedicated Class 10 rules).
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

  // Detect phrases like "In Q2, None", "In Q3, None observed", "In Q1, No error"
  if (/^in\s+q\d+[\s,:]*(none|nil|n\/a|no error|no misconception)/i.test(clean)) {
    return true;
  }

  if (
    clean.includes('none observed') ||
    clean.includes('none identified') ||
    clean.includes('no evident misconception') ||
    clean.includes('no apparent misconception') ||
    clean.includes('no conceptual misconception') ||
    clean.includes('no misconception') ||
    clean.includes('no error observed') ||
    clean.includes('no errors observed') ||
    clean.includes('no evident error') ||
    clean.includes('no critical foundational') ||
    clean.includes('demonstrates correct understanding') ||
    clean.includes('work demonstrates correct understanding') ||
    clean.includes('demonstrates accurate understanding') ||
    clean.includes('demonstrates working knowledge') ||
    clean.includes('correct understanding') ||
    clean.includes('accurate understanding') ||
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
 * 2. Downstream Future Lessons Affected up to Class 10
 * 3. 2-Mark Diagnostic Test Questions pool formatted strictly in clean ASCII
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
      concept: 'Equation balancing across equals sign (=), inverse operations, and transposition of variables/constants.',
      studyTip: 'Review Section 2.1 (Simple Expressions) and practice the balance-scale method of moving terms across the equals sign with sign reversal.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Introduction to Linear Polynomials & Linear Equations',
        risk: 'Student will struggle to formulate algebraic equations in two variables or perform algebraic substitutions.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 3,
        lessonName: 'Chapter 3: Pair of Linear Equations in Two Variables',
        risk: 'Breakdown in solving simultaneous equations using substitution, elimination, or cross-multiplication methods.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Solve the linear equation for x: 4x - 7 = 2x + 9',
        targetConcept: 'Transposition of Variables & Linear Equations (Class 7 Prerequisite)',
        expectedAnswer: '4x - 2x = 9 + 7 => 2x = 16 => x = 8',
      },
      {
        prompt: 'Verify if x = 5 satisfies the equation 5x - 3 = 3x + 7 by calculating both LHS and RHS.',
        targetConcept: 'Substitution & Equation Verification (Class 7 Prerequisite)',
        expectedAnswer: 'LHS = 5(5) - 3 = 22. RHS = 3(5) + 7 = 22. Since LHS = RHS = 22, x = 5 is verified.',
      },
      {
        prompt: 'Solve for y: 3(y - 2) = 15',
        targetConcept: 'Distributive Property & Linear Equations (Class 7 Prerequisite)',
        expectedAnswer: '3y - 6 = 15 => 3y = 21 => y = 7',
      },
    ],
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
      concept: 'Basic operations, operational precedence (BODMAS), place value carrying, and mental addition with regrouping.',
      studyTip: 'Reinforce mental addition facts (e.g. 15 + 7 = 22) and always write an intermediate check step before concluding a verification.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 3,
        lessonName: 'Chapter 3: The World of Numbers & Real Number Systems',
        risk: 'Cascading computational slips in evaluating radical surds, irrational expansions, and polynomial values.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Real Numbers & Fundamental Theorem of Arithmetic',
        risk: 'Loss of examination marks in prime factorisation algorithms and decimal expansion proofs.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Evaluate showing intermediate steps: 18 + 7 - 4 * (6 - 3)',
        targetConcept: 'BODMAS Precedence & Parentheses (Class 6 Prerequisite)',
        expectedAnswer: '18 + 7 - 4(3) = 18 + 7 - 12 = 25 - 12 = 13',
      },
      {
        prompt: 'Simplify the signed integer expression: (-15) + (-7) - (-12)',
        targetConcept: 'Operations with Signed Integers (Class 6 Prerequisite)',
        expectedAnswer: '-15 - 7 + 12 = -22 + 12 = -10',
      },
      {
        prompt: 'Calculate 3(5) + 7 and check whether the result equals 22.',
        targetConcept: 'Arithmetic Verification in Substituted Expressions (Class 6 Prerequisite)',
        expectedAnswer: '3 * 5 = 15. 15 + 7 = 22. Result verified as 22.',
      },
    ],
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
      concept: 'Laws of integral exponents: a^m * a^n = a^(m+n), a^m / a^n = a^(m-n), a^(-n) = 1/a^n, and equating exponents for common bases.',
      studyTip: 'Focus on the distinction between negative exponents and negative numbers; practice converting a^(-n) to unit fractions.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 3,
        lessonName: 'Chapter 3: Laws of Exponents for Real Numbers & Radical Notation',
        risk: 'Inability to simplify expressions with rational fractional exponents or rationalise monomial denominators.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Real Numbers & Exponential Prime Factorisation',
        risk: 'Breakdown in proving fundamental arithmetic theorem properties and index laws.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Using exponent laws, find the value of m: 5^m / 5^(-3) = 5^5',
        targetConcept: 'Laws of Exponents & Equating Indices (Class 8 Core)',
        expectedAnswer: '5^(m - (-3)) = 5^5 => m + 3 = 5 => m = 2',
      },
      {
        prompt: 'Simplify and express with a positive exponent: (3^(-7) / 3^(-10)) * 3^(-5)',
        targetConcept: 'Multiplication & Division of Powers (Class 8 Core)',
        expectedAnswer: '3^(-7 - (-10)) * 3^(-5) = 3^3 * 3^(-5) = 3^(-2) = 1/(3^2) = 1/9',
      },
      {
        prompt: 'Evaluate: (2^(-1) * 4^(-1)) / 2^(-3)',
        targetConcept: 'Negative Exponents and Unit Fractions (Class 8 Core)',
        expectedAnswer: '(1/2 * 1/4) / (1/8) = (1/8) / (1/8) = 1',
      },
    ],
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
      concept: 'Factoring out common monomial terms and applying standard algebraic identities: a^2 - b^2 = (a - b)(a + b).',
      studyTip: 'Practice recognising perfect squares (e.g. 16b^2 = (4b)^2) and grouping terms with common binomial factors.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Introduction to Linear Polynomials & Factor Theorem',
        risk: 'Failure to split the middle term in quadratic polynomials or apply the Factor Theorem.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Polynomials & Quadratic Equations',
        risk: 'Inability to compute polynomial zeros, roots of quadratic equations, or verify sum/product of roots.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Factorise completely using algebraic identity (a^2 - b^2): 16b^2 - 49',
        targetConcept: 'Difference of Squares Identity (Class 7 Prerequisite)',
        expectedAnswer: '(4b)^2 - 7^2 = (4b - 7)(4b + 7)',
      },
      {
        prompt: 'Factorise by grouping common terms: 6xy - 4y + 6 - 9x',
        targetConcept: 'Factoring by Grouping Terms (Class 7 Prerequisite)',
        expectedAnswer: '2y(3x - 2) - 3(3x - 2) = (3x - 2)(2y - 3)',
      },
      {
        prompt: 'Take out the common monomial factor: 12a^2b + 15ab^2',
        targetConcept: 'Common Monomial Factoring (Class 7 Prerequisite)',
        expectedAnswer: '3ab(4a + 5b)',
      },
    ],
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
      concept: 'Properties of rectangles, perpendicular sides, right-angled triangles, and Pythagoras theorem (diagonal^2 = length^2 + width^2).',
      studyTip: 'Always sketch the geometric shape, label known diagonals/sides, and verify that the hypotenuse is the longest side.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Orienting Yourself & Coordinate Geometry',
        risk: 'Inability to apply the coordinate distance formula derived directly from the Pythagoras theorem.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Coordinate Geometry & Surface Areas / Volumes',
        risk: 'Breakdown in calculating slant heights of cones, diagonals of cuboids, and composite 3D solid mensuration.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'In a rectangle of length 24 m and diagonal 25 m, find its width using Pythagoras theorem.',
        targetConcept: 'Pythagoras Theorem in Rectangles (Class 6 Prerequisite)',
        expectedAnswer: 'width^2 = 25^2 - 24^2 = 625 - 576 = 49 => width = 7 m',
      },
      {
        prompt: 'Find the perimeter of a rectangular garden with length 15 m and width 8 m.',
        targetConcept: 'Perimeter of Rectangular Figures (Class 6 Prerequisite)',
        expectedAnswer: 'Perimeter = 2 * (15 + 8) = 2 * 23 = 46 m',
      },
      {
        prompt: 'Find the area of a right-angled triangle with base 12 cm and hypotenuse 13 cm.',
        targetConcept: 'Right Triangle Area & Heights (Class 6 Prerequisite)',
        expectedAnswer: 'height^2 = 13^2 - 12^2 = 169 - 144 = 25 => height = 5 cm. Area = 1/2 * 12 * 5 = 30 sq cm',
      },
    ],
  },
  {
    category: 'commercial_math_interest',
    triggers: ['compound interest', 'simple interest', '8000', 'rate', 'compounding', 'commercial', 'principal', 'annual interest', 'percentage'],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Large Numbers & Comparing Quantities',
      pdfFileName: 'Class 7 Maths Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 7 Maths Chapter 1.pdf',
      concept: 'Simple interest formula I = (P*R*T)/100, year-on-year interest accumulation, and percentage conversion.',
      studyTip: 'Calculate year-1 and year-2 interest sequentially to build intuition before relying entirely on the exponential compounding formula.',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 4,
        lessonName: 'Commercial Mathematics & Compound Multipliers',
        risk: 'Inability to calculate compounding schedules, population growth models, or asset depreciation.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 5,
        lessonName: 'Banking & Financial Mathematics',
        risk: 'Failure to compute recurring deposits, interest yields, and maturity payments.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Find the simple interest on Rs. 8,000 for 2 years at 5% per annum.',
        targetConcept: 'Simple Interest Formula (Class 7 Prerequisite)',
        expectedAnswer: 'SI = (8000 * 5 * 2) / 100 = Rs. 800',
      },
      {
        prompt: 'Convert the fraction 7/25 into a percentage.',
        targetConcept: 'Percentage Conversions (Class 7 Prerequisite)',
        expectedAnswer: '(7/25) * 100 = 28%',
      },
      {
        prompt: 'A radio priced at Rs. 1,200 is sold with a 10% discount. Find the discount amount.',
        targetConcept: 'Percentages & Commercial Discounts (Class 7 Prerequisite)',
        expectedAnswer: 'Discount = 10% of 1200 = (10/100) * 1200 = Rs. 120',
      },
    ],
  },
];

/**
 * Resolves curriculum knowledge mapping for an evaluation item.
 * Strictly respects Class 10 rules:
 * - If student is enrolled in Class 10: warns about Class 10 Board exam + Class 11/12 impact,
 *   and explicitly omits future senior secondary syllabus chapters.
 * - If enrolled in Class 6-9: provides future affected chapters strictly up to Class 10.
 */
function resolveCurriculumKnowledge({
  prompt = '',
  observed = '',
  hypothesis = '',
  topicName = '',
  subject = 'Mathematics',
  targetGrade = 'Class 8',
  syllabusEvidence = [],
}) {
  const combined = `${prompt} ${observed} ${hypothesis} ${topicName}`.toLowerCase();
  let baseKnowledge = null;

  // 1. Check if database retrieval evidence provided a specific textbook chapter file
  if (Array.isArray(syllabusEvidence) && syllabusEvidence.length > 0) {
    for (const chunk of syllabusEvidence) {
      const src = (chunk.sourceFileName || '').toLowerCase();
      if (src.includes('class 7 maths chapter 2')) {
        baseKnowledge = CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'linear_equations');
        break;
      }
      if (src.includes('class 6 maths chapter 3')) {
        baseKnowledge = CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'arithmetic_order_of_operations');
        break;
      }
      if (src.includes('class 8 maths chapter 2')) {
        baseKnowledge = CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'exponents_powers');
        break;
      }
      if (src.includes('class 7 maths chapter 1')) {
        baseKnowledge = CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'commercial_math_interest');
        break;
      }
      if (src.includes('class 6 maths chapter 2')) {
        baseKnowledge = CURRICULUM_KNOWLEDGE_BASE.find((k) => k.category === 'geometry_mensuration');
        break;
      }
    }
  }

  // 2. Keyword trigger match
  if (!baseKnowledge) {
    for (const entry of CURRICULUM_KNOWLEDGE_BASE) {
      for (const trigger of entry.triggers) {
        if (combined.includes(trigger.toLowerCase())) {
          baseKnowledge = entry;
          break;
        }
      }
      if (baseKnowledge) break;
    }
  }

  // 3. Fallback default for Mathematics
  if (!baseKnowledge) {
    baseKnowledge = subject.toLowerCase().includes('math')
      ? CURRICULUM_KNOWLEDGE_BASE[0]
      : {
          category: 'general_foundations',
          prerequisiteLesson: {
            grade: 'Class 7',
            chapterNumber: 1,
            chapterName: `Chapter 1: Foundational ${subject} Principles`,
            pdfFileName: `Class 7 ${subject} Chapter 1.pdf`,
            pdfUrl: `/curriculum/Class 7 Maths Chapter 1.pdf`,
            concept: `Core conceptual definitions and foundational analytical skills in ${subject}.`,
            studyTip: 'Review foundational concepts and complete guided review exercises before advancing.',
          },
          futureLessonsAffected: [
            {
              grade: 'Class 9',
              chapterNumber: 1,
              lessonName: `Advanced Application Units in ${subject}`,
              risk: 'Gaps in core prerequisite principles will lead to compounding comprehension difficulties.',
            },
            {
              grade: 'Class 10',
              chapterNumber: 1,
              lessonName: `Board Examination Preparatory Topics in ${subject}`,
              risk: 'Loss of examination performance in multi-concept synthetic problems.',
            },
          ],
          questions2Marks: [
            {
              prompt: `Review and define the primary foundational principle of ${subject} covered in previous grades.`,
              targetConcept: `Foundational ${subject} Principles`,
              expectedAnswer: 'Clear conceptual definition with one verified application example.',
            },
          ],
        };
  }

  // Check if enrolled grade is Class 10
  const isClass10 =
    String(targetGrade).includes('10') ||
    String(targetGrade).toLowerCase().includes('class 10') ||
    String(targetGrade).toLowerCase().includes('grade 10');

  if (isClass10) {
    return {
      ...baseKnowledge,
      futureLessonsAffected: [
        {
          grade: 'Class 10',
          chapterNumber: 'Board Exam',
          lessonName: 'Class 10 Board Examination Assessment Units',
          risk: 'Direct mark deduction in Board Examination question papers and internal cumulative assessments.',
        },
        {
          grade: 'Class 11 & Class 12',
          chapterNumber: 'Foundations',
          lessonName: 'Higher Secondary Coursework (Class 11 and Class 12)',
          risk: 'Underlying conceptual weakness in senior secondary core subjects. (Detailed 11/12 chapter syllabus not mapped).',
        },
      ],
    };
  }

  // Below Class 10: strictly filter future lessons to Class 10 or below
  const filteredFuture = (baseKnowledge.futureLessonsAffected || []).filter((f) => {
    const g = String(f.grade || '').toLowerCase();
    return !g.includes('11') && !g.includes('12');
  });

  return {
    ...baseKnowledge,
    futureLessonsAffected: filteredFuture,
  };
}

/**
 * Derives foundational prerequisite gaps, ordered learning roadmaps,
 * and diagnostic re-test items from evaluated answer sheet results.
 *
 * Enforces:
 * 1. Filtering out questions where no error occurred or full marks were awarded.
 * 2. Generating 2-mark diagnostic questions with a count strictly between 5 and 10 questions.
 * 3. Exact Class & Chapter numbers for previous class delayed topics.
 * 4. Future affected chapters strictly up to Class 10 (with Class 10 Board exam & Class 11/12 rule).
 */
export function deriveGapsAndRemediation(evaluations = [], syllabusData = {}) {
  const gaps = [];
  const roadmap = [];

  const subject = syllabusData.selectedSubject || 'Mathematics';
  const targetGrade = syllabusData.selectedClass || 'Class 8';

  const diagnosedCategories = [];

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
      targetGrade,
      syllabusEvidence: item.syllabusEvidence,
    });

    if (!diagnosedCategories.some((c) => c.category === knowledge.category)) {
      diagnosedCategories.push(knowledge);
    }

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
          chapterNumber: 'Advanced',
          lessonName: 'Accelerated Curriculum Pathway',
          risk: 'No negative impact detected. Student is prepared for advanced honors topics.',
        },
      ],
      scoreInfo: { awarded: 25, max: 25, lost: 0 },
    });

    roadmap.push({
      id: 'rm-mastery',
      rank: 1,
      topic: 'Syllabus Enrichment & Advanced Problem Formulation',
      grade: `${targetGrade} Core`,
      lessonId: 'les-enrichment',
      prereqChain: 'None (Prerequisites Mastered)',
      recommendedActivity: 'Solve advanced non-routine multi-step modeling problems.',
      workedExamples: 'Olympiad and competitive assessment review problems.',
      practiceQuestions: 5,
      estimatedMinutes: 30,
      status: 'Not Started',
      prerequisiteLesson: {
        grade: targetGrade,
        chapterNumber: 1,
        chapterName: `${targetGrade} Advanced Extension Topics`,
        pdfFileName: 'Class 8 Maths Chapter 1.pdf',
        pdfUrl: '/curriculum/Class 8 Maths Chapter 1.pdf',
        concept: 'Synthesis of multiple mathematical domains and non-routine problem formulation.',
        studyTip: 'Explore alternative geometric and algebraic representations.',
      },
      futureLessonsAffected: [],
    });
  }

  // =========================================================================
  // Assemble 2-Mark Diagnostic Test Questions (strictly between 5 and 10 questions)
  // Constraint: "do not exceed 10 and degrade 5"
  // =========================================================================
  const questionPool = [];

  // If no diagnosed category (e.g. initial load or perfect score), use primary subject categories
  const activeCategories = diagnosedCategories.length > 0 ? diagnosedCategories : CURRICULUM_KNOWLEDGE_BASE;

  // 1. Gather 2-mark questions from diagnosed categories
  activeCategories.forEach((cat) => {
    const list = cat.questions2Marks || [];
    list.forEach((q) => {
      questionPool.push({
        prompt: q.prompt,
        type: 'Short Answer',
        marks: 2,
        targetConcept: q.targetConcept,
        syllabusTopic: cat.prerequisiteLesson.chapterName || subject,
        expectedAnswer: q.expectedAnswer,
        prerequisiteChapter: cat.prerequisiteLesson.chapterName,
        pdfFileName: cat.prerequisiteLesson.pdfFileName,
      });
    });
  });

  // 2. If questionPool has less than 5 questions, supplement from remaining curriculum categories
  for (const cat of CURRICULUM_KNOWLEDGE_BASE) {
    if (questionPool.length >= 7) break; // Healthy target of 6-7 questions
    if (!activeCategories.some((c) => c.category === cat.category)) {
      const list = cat.questions2Marks || [];
      for (const q of list) {
        if (questionPool.length < 10) {
          questionPool.push({
            prompt: q.prompt,
            type: 'Short Answer',
            marks: 2,
            targetConcept: q.targetConcept,
            syllabusTopic: cat.prerequisiteLesson.chapterName || subject,
            expectedAnswer: q.expectedAnswer,
            prerequisiteChapter: cat.prerequisiteLesson.chapterName,
            pdfFileName: cat.prerequisiteLesson.pdfFileName,
          });
        }
      }
    }
  }

  // 3. Bound question count strictly: minimum 5, maximum 10
  const targetCount = Math.min(10, Math.max(5, questionPool.length));
  const boundedQuestions = questionPool.slice(0, targetCount);

  // 4. Renumber sequentially and enforce 2 marks
  const testQuestions = boundedQuestions.map((q, idx) => ({
    ...q,
    id: `test-q-${idx + 1}`,
    number: `${idx + 1}`,
    marks: 2, // Every question carries strictly 2 marks
  }));

  return { gaps, roadmap, testQuestions };
}

export default deriveGapsAndRemediation;
