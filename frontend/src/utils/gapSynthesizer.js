/**
 * Gap & Remediation Synthesizer for Neev Platform
 * Multi-Subject Support: Mathematics, Science, English Language, Social Studies,
 * with Universal Dynamic Subject Fallback for any curriculum subject.
 *
 * Derives foundational prerequisite gaps, ordered learning roadmaps,
 * and diagnostic re-test items from evaluated answer sheet results.
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
    clean.includes('correct answer') ||
    clean.includes('mathematically correct') ||
    clean.includes('correct solution') ||
    clean.includes('perfect solution')
  ) {
    return true;
  }

  return false;
}

/**
 * Intelligently detects the genuine academic subject from contextual text
 * and defaults to user selection or Mathematics if ambiguous.
 */
export function detectSubject(contextText = '', defaultSubject = 'Mathematics') {
  const clean = String(contextText).toLowerCase();
  const def = String(defaultSubject).toLowerCase();

  // Science keyword triggers
  const scienceMatches = (clean.match(/osmosis|diffusion|potato|semi-permeable|cell|organelle|nucleus|mitochondria|golgi|atp|prokaryot|eukaryot|bacteria|respiration|photosynthesis|scientific model|prediction|hypothesis|plant cell|animal cell|matter in our surroundings/g) || []).length;

  // Social Studies keyword triggers
  const socialMatches = (clean.match(/constitution|preamble|democracy|republic|sovereign|fundamental rights|secularism|parliament|judiciary|legislature|executive|doctrine of lapse|revolt of 1857|mughal|sultanate|mansabdar|zamindar|colonial|british|historical source|\b(bce|ce)\b|natural resource|renewable|soil conservation|terrace farming|primary sector|secondary sector|tertiary sector|monsoon|kharif|rabi|latitude|longitude|map scale/g) || []).length;

  // English Language keyword triggers
  const englishMatches = (clean.match(/grammar|tense|passive voice|active voice|reported speech|direct speech|indirect speech|subject-verb|concord|subordinate clause|reading comprehension|passage|inference|author|poet|poem|metaphor|simile|personification|vocabulary|synonym|antonym|letter writing|narrative/g) || []).length;

  // Mathematics keyword triggers
  const mathMatches = (clean.match(/linear equation|algebra|transposition|solve for|exponent|base|index law|factoris|polynomial|mensuration|pythagor|rectangle|diagonal|perimeter|area|simple interest|compound interest|bodmas|arithmetic|integers/g) || []).length;

  const candidateScores = [
    { subject: 'Science / Physics', score: scienceMatches },
    { subject: 'Social Studies', score: socialMatches },
    { subject: 'English Language', score: englishMatches },
    { subject: 'Mathematics', score: mathMatches },
  ];

  candidateScores.sort((a, b) => b.score - a.score);

  if (candidateScores[0].score > 0) {
    return candidateScores[0].subject;
  }

  // Fallback to explicitly configured subject from Step 1
  if (def.includes('computer') || def.includes('informatics') || def.includes('programming')) {
    return 'Computer Science';
  }
  if (def.includes('social') || def.includes('history') || def.includes('civics') || def.includes('geography') || def.includes('sst')) {
    return 'Social Studies';
  }
  if (def.includes('english') || def.includes('literature') || def.includes('grammar')) {
    return 'English Language';
  }
  if (
    (def.includes('science') || def.includes('physics') || def.includes('bio') || def.includes('chem')) &&
    !def.includes('social') &&
    !def.includes('computer')
  ) {
    return 'Science / Physics';
  }
  if (def.includes('math')) {
    return 'Mathematics';
  }

  return defaultSubject || 'Mathematics';
}

/**
 * Knowledge Base linking exam concepts and misconceptions to:
 * 1. Prerequisite Foundational Lesson & Chapter Name in Previous Class (with viewable PDF)
 * 2. Downstream Future Lessons Affected up to Class 10
 * 3. 2-Mark Diagnostic Test Questions pool formatted strictly in clean ASCII
 */
export const CURRICULUM_KNOWLEDGE_BASE = [
  // =========================================================================
  // MATHEMATICS CURRICULUM KNOWLEDGE BASE
  // =========================================================================
  {
    category: 'linear_equations',
    subject: 'Mathematics',
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
    subject: 'Mathematics',
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
    subject: 'Mathematics',
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
    subject: 'Mathematics',
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
    subject: 'Mathematics',
    triggers: ['mensuration', 'rectangle', 'diagonal', 'pythagor', 'area', 'perimeter', 'hypotenuse', 'width', 'geometry'],
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
    subject: 'Mathematics',
    triggers: ['compound interest', 'simple interest', 'rate', 'compounding', 'commercial', 'principal', 'annual interest', 'percentage'],
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

  // =========================================================================
  // SCIENCE CURRICULUM KNOWLEDGE BASE (NCERT Class 6 - Class 10)
  // =========================================================================
  {
    category: 'osmosis_and_diffusion',
    subject: 'Science',
    triggers: ['osmosis', 'potato', 'semi-permeable', 'concentration', 'diffusion', 'membrane', 'hypertonic', 'hypotonic', 'exosmosis', 'endosmosis', 'solute', 'water potential', 'potato piece', 'salt solution'],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Exploring Living Processes & Cellular Transport',
      pdfFileName: 'Class 7 Science Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 7 Science Chapter 2.pdf',
      concept: 'Osmosis as the selective net movement of solvent (water) molecules through a semi-permeable membrane from higher to lower water potential; endosmosis (cell swelling in plain water) versus exosmosis (cell shrinkage/flaccidity in concentrated salt solution).',
      studyTip: 'Review the potato osmometer experiment in Section 2.4 and distinguish between solute movement (diffusion) and solvent movement across selectively permeable cell membranes.',
      targetLessonName: 'Osmosis & Cellular Transport',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 5,
        lessonName: 'Chapter 5: The Fundamental Unit of Life - Plasma Membrane Dynamics',
        risk: 'Failure to analyze tonicity, hypotonic/hypertonic media, and plasmolysis in plant cell walls.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 6,
        lessonName: 'Chapter 6: Life Processes - Transportation and Excretion',
        risk: 'Inability to explain xylem sap ascent by root osmotic pressure and selective reabsorption across tubular nephron membranes.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Define osmosis and state the direction of water movement across a semi-permeable membrane.',
        targetConcept: 'Osmosis & Semipermeable Membranes (Class 7 Prerequisite)',
        expectedAnswer: 'Osmosis is the net movement of water molecules from a region of higher water concentration to lower water concentration through a semi-permeable membrane.',
      },
      {
        prompt: 'Why did the potato piece shrink when placed in concentrated salt solution? Name the biological phenomenon.',
        targetConcept: 'Exosmosis & Cellular Shrinkage (Class 7 Prerequisite)',
        expectedAnswer: 'Water moved out of the potato cells into the concentrated salt solution by exosmosis, causing cell flaccidity and shrinkage.',
      },
      {
        prompt: 'Distinguish between endosmosis and exosmosis with one everyday laboratory observation.',
        targetConcept: 'Endosmosis vs Exosmosis (Class 7 Prerequisite)',
        expectedAnswer: 'Endosmosis is inward water entry causing swelling (potato in plain water); exosmosis is outward water exit causing shrinkage (potato in salt solution).',
      },
    ],
  },
  {
    category: 'cell_organelles_and_functions',
    subject: 'Science',
    triggers: ['organelle', 'nucleus', 'mitochondria', 'golgi', 'cell', 'cytoplasm', 'atp', 'powerhouse', 'energy production', 'respiration', 'food synthesis', 'packaging'],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 2,
      chapterName: 'Chapter 2: The Invisible Living World: Beyond Our Naked Eye',
      pdfFileName: 'Class 8 Science Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 8 Science Chapter 2.pdf',
      concept: 'Division of labor in cellular organelles: Nucleus controls hereditary genetic transmission and metabolic regulation; Mitochondria perform aerobic respiration to synthesize cellular energy (ATP); Golgi apparatus processes, packages, and secretes cellular biomolecules.',
      studyTip: 'Map each organelle to its verified metabolic function using a comparative cell diagram, emphasizing that mitochondria produce ATP while chloroplasts perform food synthesis.',
      targetLessonName: 'Cell Structure & Organelle Functions',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 5,
        lessonName: 'Chapter 5: Cell Organelles and the Endomembrane System',
        risk: 'Inability to correlate mitochondrial cristae surface area with ATP generation or Golgi cisternae with protein sorting.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 6,
        lessonName: 'Chapter 6: Life Processes - Cellular Respiration and Metabolic Energetics',
        risk: 'Breakdown in understanding cellular respiration pathways, glycolytic products, and mitochondrial oxidative phosphorylation.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'State the primary function of: (a) Mitochondria, and (b) Golgi apparatus.',
        targetConcept: 'Cell Organelle Functions (Class 8 Prerequisite)',
        expectedAnswer: '(a) Mitochondria: Generate cellular energy currency (ATP) via respiration. (b) Golgi apparatus: Modification, packaging, and sorting of proteins and lipids.',
      },
      {
        prompt: 'Why is the nucleus often described as the master controller of a eukaryotic cell?',
        targetConcept: 'Nuclear Control & Genetic Material (Class 8 Prerequisite)',
        expectedAnswer: 'The nucleus contains genetic material (DNA/chromosomes) that coordinates gene expression and directs all cellular metabolic activities.',
      },
      {
        prompt: 'Explain why a cell devoid of functional mitochondria cannot sustain active cellular processes.',
        targetConcept: 'Cellular Respiration & ATP (Class 8 Prerequisite)',
        expectedAnswer: 'It cannot generate ATP required for energy-consuming cellular activities and maintenance.',
      },
    ],
  },
  {
    category: 'prokaryotes_vs_eukaryotes',
    subject: 'Science',
    triggers: ['prokaryot', 'eukaryot', 'bacteria', 'nucleoid', 'membrane bound', 'organelles', 'plant cell', 'animal cell'],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 2,
      chapterName: 'Chapter 2: The Invisible Living World: Beyond Our Naked Eye',
      pdfFileName: 'Class 8 Science Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 8 Science Chapter 2.pdf',
      concept: 'Structural hierarchy of life: Prokaryotic cells (e.g. bacteria) lack a nuclear membrane (possess an undefined nucleoid) and lack membrane-bound organelles; Eukaryotic cells possess a true membrane-bound nucleus and organized organelles.',
      studyTip: 'Create a two-column contrast table comparing bacterial prokaryotic cells with plant/animal eukaryotic cells on nucleus presence and organelle compartmentalization.',
      targetLessonName: 'Prokaryotic vs Eukaryotic Cell Organization',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 5,
        lessonName: 'Chapter 5: The Fundamental Unit of Life - Cellular Organization',
        risk: 'Confusion between simple bacterial prokaryotes and compartmentalized multicellular eukaryotes.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 8,
        lessonName: 'Chapter 8: How do Organisms Reproduce - Modes of Cell Division',
        risk: 'Inability to contrast binary fission in prokaryotes with complex mitotic and meiotic chromosomal division in eukaryotes.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Name two fundamental structural differences between prokaryotic and eukaryotic cells.',
        targetConcept: 'Prokaryote vs Eukaryote Distinction (Class 8 Prerequisite)',
        expectedAnswer: '1. Prokaryotes lack a nuclear membrane (have a nucleoid); eukaryotes have a membrane-bound nucleus. 2. Prokaryotes lack membrane-bound organelles; eukaryotes contain them.',
      },
      {
        prompt: 'Classify bacteria and plant cells into prokaryotes or eukaryotes, giving one justifying cellular feature for each.',
        targetConcept: 'Cellular Classification (Class 8 Prerequisite)',
        expectedAnswer: 'Bacteria are prokaryotes (lack defined nucleus/organelles); Plant cells are eukaryotes (possess membrane-bound nucleus and chloroplasts/mitochondria).',
      },
    ],
  },
  {
    category: 'scientific_models_and_inquiry',
    subject: 'Science',
    triggers: ['scientific model', 'prediction', 'guess', 'hypothesis', 'complex system', 'experimental setup', 'mismatch', 'observations', 'solar system model', '3d cell model'],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Exploring the Investigative World of Science',
      pdfFileName: 'Class 8 Science Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 8 Science Chapter 1.pdf',
      concept: 'Scientific models serve as simplified, testable representations of complex phenomena; scientific predictions are evidence-grounded forecasts, distinct from random guesses, and must trigger iterative hypothesis revision upon observational mismatch.',
      studyTip: 'Review Section 1.2 on scientific inquiry and practice identifying controlled variables, testable predictions, and iterative model adjustments.',
      targetLessonName: 'Scientific Models & Systems',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Matter in Our Surroundings - Kinetic Particle Models',
        risk: 'Struggling to visualize and manipulate sub-microscopic molecular representations and phase-change simulations.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Chemical Reactions & Equations - Empirical Scientific Evidence',
        risk: 'Inability to translate empirical experimental observations into balanced scientific models and conservation laws.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Why are scientific predictions fundamentally different from random guesses?',
        targetConcept: 'Scientific Predictions vs Guesses (Class 8 Prerequisite)',
        expectedAnswer: 'Scientific predictions are grounded in prior empirical evidence, logical principles, and testable hypotheses, whereas guesses lack evidential basis.',
      },
      {
        prompt: 'What essential step must scientists take when observed experimental outcomes contradict their initial prediction?',
        targetConcept: 'Hypothesis Revision & Scientific Method (Class 8 Prerequisite)',
        expectedAnswer: 'Scientists re-examine their experimental procedure and modify or reject the existing hypothesis to formulate new testable models.',
      },
    ],
  },

  // =========================================================================
  // SOCIAL STUDIES CURRICULUM KNOWLEDGE BASE (NCERT Class 6 - Class 10)
  // =========================================================================
  {
    category: 'social_constitution_and_governance',
    subject: 'Social Studies',
    triggers: [
      'constitution',
      'preamble',
      'democracy',
      'fundamental rights',
      'secularism',
      'parliament',
      'judiciary',
      'legislature',
      'executive',
      'equality',
      'article 15',
      'separation of powers',
      'universal adult suffrage',
      'civics',
      'sovereign',
    ],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 1,
      chapterName: 'Chapter 1: The Indian Constitution & Democratic Institutions',
      pdfFileName: 'Class 7 Social Studies Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 7 Social Studies Chapter 1.pdf',
      concept: 'Constitutional values: Sovereign, Socialist, Secular, Democratic Republic; institutional separation of powers (Legislature, Executive, Judiciary); fundamental rights and universal equality under Article 15.',
      studyTip: 'Review the three separate organs of government and understand how checks and balances prevent misuse of state power.',
      targetLessonName: 'The Indian Constitution & Democratic Institutions',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Democratic Politics - Constitutional Design & Electoral Competition',
        risk: 'Inability to comprehend the rationale of institutional checks, constituent assemblies, or electoral procedures.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Power Sharing & Federalism in Indian Democracy',
        risk: 'Failure to analyze vertical and horizontal power sharing or judicial arbitration in state-center disputes.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Define Universal Adult Suffrage and state its minimum age requirement in democratic India.',
        targetConcept: 'Democratic Franchise & Universal Adult Suffrage (Class 7 Prerequisite)',
        expectedAnswer: 'Universal Adult Suffrage guarantees that all adult citizens aged 18 and above have an equal right to vote, irrespective of gender, caste, religion, or wealth.',
      },
      {
        prompt: 'Why is separation of powers among Legislature, Executive, and Judiciary vital in a constitutional democracy?',
        targetConcept: 'Institutional Separation of Powers (Class 7 Prerequisite)',
        expectedAnswer: 'It ensures that no single branch exercises absolute authority, with each branch exercising checks and balances over the others.',
      },
      {
        prompt: 'State any two fundamental rights guaranteed to Indian citizens under the Constitution.',
        targetConcept: 'Fundamental Rights & Equality (Class 7 Prerequisite)',
        expectedAnswer: '1. Right to Equality (Article 14-18). 2. Right to Freedom of Speech and Expression (Article 19).',
      },
    ],
  },
  {
    category: 'social_resources_and_environment',
    subject: 'Social Studies',
    triggers: [
      'resource',
      'natural resource',
      'renewable',
      'non-renewable',
      'soil erosion',
      'terrace farming',
      'rainwater harvesting',
      'water scarcity',
      'ecosystem',
      'environment',
      'deforestation',
      'lithosphere',
      'hydrosphere',
      'geography',
      'sustainable development',
    ],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Natural Resources: Land, Water, Air and Conservation',
      pdfFileName: 'Class 7 Social Studies Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 7 Social Studies Chapter 2.pdf',
      concept: 'Resource classification into renewable and non-renewable; ecological spheres; land and soil degradation factors; conservation measures including terrace farming, contour plowing, and rainwater harvesting.',
      studyTip: 'Analyze how human interventions disrupt natural cycles and focus on practical sustainable conservation techniques.',
      targetLessonName: 'Natural Resources & Environmental Conservation',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Contemporary India - Physical Features of India & Natural Drainage',
        risk: 'Failure to understand watershed management, river system degradation, and topographical soil patterns.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Resources, Sustainable Development & Agricultural Land Use',
        risk: 'Breakdown in evaluating resource planning stages, Agenda 21 guidelines, and cropping moisture patterns.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Differentiate between renewable and non-renewable natural resources with one example each.',
        targetConcept: 'Resource Classification (Class 7 Prerequisite)',
        expectedAnswer: 'Renewable resources replenish naturally in short cycles (e.g. solar energy, water); non-renewable resources have finite reserves taking millions of years to form (e.g. coal, petroleum).',
      },
      {
        prompt: 'Explain how terrace farming prevents soil erosion on mountainous slopes.',
        targetConcept: 'Soil Conservation & Topography (Class 7 Prerequisite)',
        expectedAnswer: 'Broad flat steps cut into steep slopes reduce the velocity of surface water runoff, preventing fertile topsoil from being washed away.',
      },
      {
        prompt: 'Why is rainwater harvesting considered an essential method for combating groundwater depletion?',
        targetConcept: 'Hydrological Conservation (Class 7 Prerequisite)',
        expectedAnswer: 'It collects surface runoff during monsoons and channels it into aquifers, directly recharging underground water tables.',
      },
    ],
  },
  {
    category: 'social_historical_inquiry_and_movements',
    subject: 'Social Studies',
    triggers: [
      'history',
      'revolt of 1857',
      'colonial',
      'british east india company',
      'doctrine of lapse',
      'viceroy',
      'sepoy',
      '1858',
      'mughal',
      'mansabdar',
      'zat',
      'sawar',
      'common era',
      'chronology',
      'archaeological source',
      'dalhousie',
    ],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Colonial Rule & The Indian Freedom Movement (Revolt of 1857)',
      pdfFileName: 'Class 8 Social Studies Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 8 Social Studies Chapter 1.pdf',
      concept: 'Periodization and chronology in Indian history; economic disaffection under colonial commercial monopolies; political annexations via Doctrine of Lapse; causes and outcomes of the Revolt of 1857 terminating Company rule.',
      studyTip: 'Distinguish immediate triggers (greased cartridges) from underlying long-term causes (peasant land taxation, state annexations under Doctrine of Lapse).',
      targetLessonName: 'Colonial Rule & The 1857 Uprising',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Socialism in Europe & Modern Nationalist Struggles',
        risk: 'Difficulty contrasting anti-colonial mass mobilization with European revolutionary movements.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Nationalism in India & The Freedom Struggle (Board Exam Units)',
        risk: 'Inability to trace the evolution from 1857 regional rebellions to Gandhi nationwide Non-Cooperation and Civil Disobedience.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'State two major administrative changes introduced by the British Government after the 1857 revolt under the Act of 1858.',
        targetConcept: 'Outcomes of the 1857 Revolt (Class 8 Prerequisite)',
        expectedAnswer: '1. Rule of the British East India Company ended and direct sovereignty was assumed by the British Crown. 2. The Governor-General was designated Viceroy of India.',
      },
      {
        prompt: 'What was Lord Dalhousie Doctrine of Lapse, and which Indian state was annexed under it?',
        targetConcept: 'Colonial Annexation Policies (Class 8 Prerequisite)',
        expectedAnswer: 'It decreed that any princely state whose ruler died without a natural male heir would be annexed by the British; Jhansi (or Satara) was annexed under this doctrine.',
      },
      {
        prompt: 'Why are primary historical sources such as official records and archaeological artifacts critical for validating historical facts?',
        targetConcept: 'Historical Inquiry & Sources (Class 8 Prerequisite)',
        expectedAnswer: 'Primary sources provide direct, firsthand contemporary evidence from the period under study, minimizing subjective retrospective bias.',
      },
    ],
  },
  {
    category: 'social_economic_development_and_sectors',
    subject: 'Social Studies',
    triggers: [
      'economic',
      'primary sector',
      'secondary sector',
      'tertiary sector',
      'agriculture',
      'manufacturing',
      'services',
      'employment',
      'gdp',
      'per capita income',
      'poverty',
      'development',
      'human capital',
    ],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Economic Activities, Sectors & Resource Management',
      pdfFileName: 'Class 8 Social Studies Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 8 Social Studies Chapter 2.pdf',
      concept: 'Classification of economic activities into primary (natural resource extraction), secondary (manufacturing/processing), and tertiary (services and commerce) sectors and their interdependence.',
      studyTip: 'Trace the lifecycle of a commodity across all three sectors: e.g. sugarcane farming (primary) -> sugar refining (secondary) -> transport and retail sale (tertiary).',
      targetLessonName: 'Economic Activities & Sectors of the Economy',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 2,
        lessonName: 'Chapter 2: People as Resource & Poverty Metrics',
        risk: 'Confusion between productive labor force participation, disguised unemployment, and human capital investments.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Understanding Economic Development & Sectors of the Indian Economy',
        risk: 'Breakdown in calculating GDP sector contributions, formal/informal employment, and national development indicators.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Distinguish between primary and secondary economic sectors with one example each.',
        targetConcept: 'Economic Sectors Classification (Class 8 Prerequisite)',
        expectedAnswer: 'Primary sector directly extracts natural resources (e.g. dairy farming or mining); secondary sector processes raw materials into manufactured finished goods (e.g. textile weaving).',
      },
      {
        prompt: 'Why is human capital formation (investing in education and healthcare) essential for national economic development?',
        targetConcept: 'Human Capital & Development (Class 8 Prerequisite)',
        expectedAnswer: 'A healthier, well-educated population possesses higher productivity, innovation, and skills, generating higher national income and standard of living.',
      },
      {
        prompt: 'Classify these two activities into their respective economic sectors: (a) Extracting crude petroleum, (b) Transporting petroleum by pipeline.',
        targetConcept: 'Sectoral Interdependence (Class 8 Prerequisite)',
        expectedAnswer: '(a) Extracting crude petroleum is in the Primary sector. (b) Transporting petroleum by pipeline is in the Tertiary (service) sector.',
      },
    ],
  },

  // =========================================================================
  // ENGLISH LANGUAGE CURRICULUM KNOWLEDGE BASE (NCERT Class 6 - Class 10)
  // =========================================================================
  {
    category: 'reading_comprehension_and_inference',
    subject: 'English Language',
    triggers: [
      'reading comprehension',
      'passage',
      'inference',
      'theme',
      'author',
      'central idea',
      'contextual meaning',
      'textual evidence',
      'three questions',
      'paraphrase',
      'moral',
    ],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Reading Comprehension & Textual Inferences',
      pdfFileName: 'Class 7 English Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 7 English Chapter 1.pdf',
      concept: 'Locating direct textual evidence, inferring underlying character motivations, discerning authorial tone, and synthesizing thematic takeaways in analytical prose.',
      studyTip: 'Read the comprehension passage actively, underline key topic sentences in each paragraph, and verify that answers cite explicit textual facts.',
      targetLessonName: 'Reading Comprehension & Textual Inference',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 1,
        lessonName: 'Chapter 1: The Fun They Had - Analytical Text Comprehension',
        risk: 'Difficulty synthesizing implicit character perspectives and thematic subtext in complex narratives.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: A Letter to God - Critical Prose Inference & Theme Analysis',
        risk: 'Loss of examination marks on Board analytical extract-based questions requiring critical thematic deduction.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'How does a reader distinguish between the literal meaning of a passage and an inferred theme? Give one example.',
        targetConcept: 'Literal vs Inferred Meaning (Class 7 Prerequisite)',
        expectedAnswer: 'Literal meaning is explicitly stated in the words of the text; inferred meaning is deduced by combining textual clues with logical reasoning (e.g. inferring grief from tears).',
      },
      {
        prompt: 'In reading comprehension, explain why answering strictly from textual evidence is preferred over external personal assumptions.',
        targetConcept: 'Textual Evidence Verification (Class 7 Prerequisite)',
        expectedAnswer: 'Textual evidence ensures objective fidelity to the author argument and prevents subjective distortion of the passage.',
      },
      {
        prompt: 'State the primary purpose of identifying the author tone in an analytical reading passage.',
        targetConcept: 'Authorial Tone & Perspective (Class 7 Prerequisite)',
        expectedAnswer: 'Identifying tone (e.g. humorous, critical, cautionary) reveals the author attitude and emotional stance toward the central subject.',
      },
    ],
  },
  {
    category: 'english_grammar_tenses_voice',
    subject: 'English Language',
    triggers: [
      'active voice',
      'passive voice',
      'tense',
      'past perfect',
      'present continuous',
      'auxiliary verb',
      'participle',
      'verb form',
      'grammatical error',
      'voice change',
    ],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Tenses & Active-Passive Voice Transformations',
      pdfFileName: 'Class 7 English Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 7 English Chapter 2.pdf',
      concept: 'Systematic tense conjugation; active-to-passive voice transformations maintaining tense consistency (auxiliary be-verb + past participle); agent omission when doer is unknown.',
      studyTip: 'Identify the grammatical object in the active sentence, promote it to the subject position, and match the be-verb auxiliary strictly to the original tense.',
      targetLessonName: 'English Grammar: Tenses & Voice Transformations',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Reported Speech & Complex Verb Concord',
        risk: 'Breakdown in back-shifting tenses and converting modal auxiliaries in direct-to-indirect transformations.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Board Examination Grammar Editing & Error Correction',
        risk: 'High penalty in Board proofreading passages requiring tense and voice alignment.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Convert the active sentence into passive voice: "The students completed the science project on time."',
        targetConcept: 'Active to Passive Voice Transformation (Class 7 Prerequisite)',
        expectedAnswer: '"The science project was completed by the students on time."',
      },
      {
        prompt: 'Identify and rectify the tense error in this sentence: "She has went to the library yesterday afternoon."',
        targetConcept: 'Past Tense vs Present Perfect (Class 7 Prerequisite)',
        expectedAnswer: 'Error is "has went". Rectified: "She went to the library yesterday afternoon" (simple past required with past time marker "yesterday").',
      },
      {
        prompt: 'Explain when passive voice is preferred over active voice in scientific or objective writing.',
        targetConcept: 'Stylistic Function of Passive Voice (Class 7 Prerequisite)',
        expectedAnswer: 'When the action or its result is more important than the doer, or when the agent is unknown, irrelevant, or obvious.',
      },
    ],
  },
  {
    category: 'subject_verb_concord_and_clauses',
    subject: 'English Language',
    triggers: [
      'subject verb agreement',
      'concord',
      'clause',
      'subordinate clause',
      'relative clause',
      'either or',
      'neither nor',
      'singular verb',
      'plural verb',
      'conjunction',
    ],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 3,
      chapterName: 'Chapter 3: Subject-Verb Agreement & Sentence Synthesis',
      pdfFileName: 'Class 7 English Chapter 3.pdf',
      pdfUrl: '/curriculum/Class 7 English Chapter 3.pdf',
      concept: 'Rules of subject-verb concord: singular subjects take singular verbs; compound subjects joined by and take plural verbs; phrases intervening between subject and verb do not alter agreement; neither/nor matches the closer subject.',
      studyTip: 'Bracket off intervening prepositional phrases (e.g. "The quality [of these apples] IS excellent") to clearly locate the true head noun.',
      targetLessonName: 'Subject-Verb Concord & Sentence Clauses',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 3,
        lessonName: 'Chapter 3: Complex Sentence Synthesis & Subordinate Clauses',
        risk: 'Failure to join dependent adverbial and relative clauses without creating run-on sentences or fragments.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Analytical Paragraph Writing & Formal Cohesion',
        risk: 'Frequent syntax and concord deductions in Board analytical composition rubrics.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Choose the correct verb form: "Neither the teacher nor the students (was / were) aware of the schedule change." Explain your choice.',
        targetConcept: 'Proximity Rule in Subject-Verb Concord (Class 7 Prerequisite)',
        expectedAnswer: '"were" is correct because with "neither... nor", the verb agrees with the closer subject ("students", which is plural).',
      },
      {
        prompt: 'Combine the two simple sentences using a relative clause: "This is the student. She scored top marks in the national Olympiad."',
        targetConcept: 'Relative Clause Synthesis (Class 7 Prerequisite)',
        expectedAnswer: '"This is the student who scored top marks in the national Olympiad."',
      },
      {
        prompt: 'Identify the error and rewrite correctly: "A bouquet of yellow roses were placed on the teacher desk."',
        targetConcept: 'Intervening Phrase Concord (Class 7 Prerequisite)',
        expectedAnswer: 'Error is "were". Correct: "A bouquet of yellow roses was placed on the teacher desk" (head noun "bouquet" is singular).',
      },
    ],
  },
  {
    category: 'vocabulary_and_literary_devices',
    subject: 'English Language',
    triggers: [
      'literary device',
      'metaphor',
      'simile',
      'personification',
      'vocabulary',
      'synonym',
      'antonym',
      'poetic device',
      'alliteration',
      'hyperbole',
    ],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Vocabulary in Context & Figurative Language',
      pdfFileName: 'Class 8 English Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 8 English Chapter 1.pdf',
      concept: 'Recognizing figurative literary devices: similes (explicit comparison using like/as), metaphors (implicit equivalence), personification (giving human traits to non-human entities); inferring nuanced word meanings from context.',
      studyTip: 'Look for comparative syntax markers to distinguish similes from metaphors, and analyze how figurative imagery enhances emotive depth in prose and poetry.',
      targetLessonName: 'Vocabulary & Figurative Literary Devices',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Poetry Analysis & Poetic Devices',
        risk: 'Inability to interpret stanza symbolism, rhyme schemes, or extended metaphors in poetry questions.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 2,
        lessonName: 'Chapter 2: Board Examination Literary Prose & Poetic Interpretations',
        risk: 'Loss of marks in 3-mark Board literary evaluation questions requiring figure-of-speech analysis.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Identify the literary device used in the sentence: "The autumn leaves danced gracefully across the lawn," and justify your answer.',
        targetConcept: 'Personification Identification (Class 8 Prerequisite)',
        expectedAnswer: 'Personification; human actions ("danced gracefully") are attributed to non-human objects (autumn leaves).',
      },
      {
        prompt: 'Distinguish between a simile and a metaphor with one original illustrative sentence for each.',
        targetConcept: 'Simile vs Metaphor (Class 8 Prerequisite)',
        expectedAnswer: 'A simile compares using "like" or "as" (e.g. "He was as brave as a lion"); a metaphor states direct equivalence without comparison words (e.g. "He was a lion in the battlefield").',
      },
      {
        prompt: 'Explain the contextual meaning of the idiomatic phrase "a blessing in disguise" with a brief example sentence.',
        targetConcept: 'Idioms & Contextual Vocabulary (Class 8 Prerequisite)',
        expectedAnswer: 'An apparent misfortune that eventually results in an unexpected good outcome. Example: "Missing that delayed train turned out to be a blessing in disguise."',
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
  const activeSubject = detectSubject(combined, subject);

  let baseKnowledge = null;

  // 1. Check if database retrieval evidence provided a specific textbook chapter file
  // CRITICAL FIX: Only accept chunks from syllabusEvidence IF they belong to the SAME active subject!
  if (Array.isArray(syllabusEvidence) && syllabusEvidence.length > 0) {
    for (const chunk of syllabusEvidence) {
      const src = (chunk.sourceFileName || '').toLowerCase();
      const chunkSubject = (chunk.subject || '').toLowerCase();

      // Skip mismatched chunks to prevent math chunks overriding science or social studies
      if (activeSubject.includes('Science') && (chunkSubject.includes('math') || src.includes('math'))) continue;
      if (activeSubject.includes('Social') && (chunkSubject.includes('math') || src.includes('math') || chunkSubject.includes('science') || src.includes('science'))) continue;
      if (activeSubject.includes('English') && (chunkSubject.includes('math') || src.includes('math') || chunkSubject.includes('science') || src.includes('science'))) continue;
      if (activeSubject.includes('Math') && (chunkSubject.includes('science') || src.includes('science') || chunkSubject.includes('english') || src.includes('english'))) continue;

      const match = CURRICULUM_KNOWLEDGE_BASE.find(
        (k) => k.prerequisiteLesson.pdfFileName && src.includes(k.prerequisiteLesson.pdfFileName.toLowerCase())
      );
      if (match) {
        baseKnowledge = match;
        break;
      }
    }
  }

  // 2. Keyword trigger match within the SAME subject first
  if (!baseKnowledge) {
    const subjectCategories = CURRICULUM_KNOWLEDGE_BASE.filter((k) => {
      const catSub = (k.subject || 'Mathematics').toLowerCase();
      if (activeSubject.includes('Science')) return catSub.includes('science');
      if (activeSubject.includes('Social')) return catSub.includes('social');
      if (activeSubject.includes('English')) return catSub.includes('english');
      return catSub.includes('math');
    });

    let bestScore = 0;
    for (const entry of subjectCategories) {
      let score = 0;
      for (const trigger of entry.triggers) {
        if (combined.includes(trigger.toLowerCase())) {
          score += trigger.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        baseKnowledge = entry;
      }
    }
  }

  // 3. Fallback check across all entries if no subject-specific match
  if (!baseKnowledge) {
    let bestScore = 0;
    for (const entry of CURRICULUM_KNOWLEDGE_BASE) {
      let score = 0;
      for (const trigger of entry.triggers) {
        if (combined.includes(trigger.toLowerCase())) {
          score += trigger.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        baseKnowledge = entry;
      }
    }
  }

  // 4. Universal Dynamic Subject Fallback (NEVER default to Math if subject is Science, Social, English, etc.)
  if (!baseKnowledge) {
    const isScience = activeSubject.includes('Science');
    const isSocial = activeSubject.includes('Social');
    const isEnglish = activeSubject.includes('English');

    const prevGrade = targetGrade === 'Class 6' ? 'Class 5' : 'Class 7';
    let chapterName = `Chapter 1: Foundational ${activeSubject} Principles`;
    let pdfFileName = `Class 7 ${activeSubject.split(/[\/\s]/)[0]} Chapter 1.pdf`;
    let pdfUrl = `/curriculum/${pdfFileName}`;
    let concept = `Core foundational definitions, principles, and analytical problem-solving in ${activeSubject}.`;

    if (isSocial) {
      chapterName = 'Chapter 1: The Indian Constitution & Democratic Institutions';
      pdfFileName = 'Class 7 Social Studies Chapter 1.pdf';
      pdfUrl = '/curriculum/Class 7 Social Studies Chapter 1.pdf';
      concept = 'Foundational constitutional principles, democratic institutions, and separation of powers.';
    } else if (isEnglish) {
      chapterName = 'Chapter 1: Reading Comprehension & Textual Inferences';
      pdfFileName = 'Class 7 English Chapter 1.pdf';
      pdfUrl = '/curriculum/Class 7 English Chapter 1.pdf';
      concept = 'Comprehension analysis, identifying author intent, and textual evidence synthesis.';
    } else if (isScience) {
      chapterName = 'Chapter 1: Exploring Investigative Science & Physical Systems';
      pdfFileName = 'Class 7 Science Chapter 1.pdf';
      pdfUrl = '/curriculum/Class 7 Science Chapter 1.pdf';
      concept = 'Scientific inquiry, empirical observation, and controlled experimentation.';
    }

    baseKnowledge = {
      category: `${activeSubject.toLowerCase().replace(/[^a-z0-9]/g, '_')}_foundations`,
      subject: activeSubject,
      prerequisiteLesson: {
        grade: prevGrade,
        chapterNumber: 1,
        chapterName,
        pdfFileName,
        pdfUrl,
        concept,
        studyTip: `Review Section 1.1 in ${chapterName} and practice guided exercises before advancing.`,
      },
      futureLessonsAffected: [
        {
          grade: 'Class 9',
          chapterNumber: 1,
          lessonName: `Advanced Application Units in ${activeSubject}`,
          risk: `Gaps in core prerequisite principles will lead to compounding difficulty in ${activeSubject}.`,
        },
        {
          grade: 'Class 10',
          chapterNumber: 1,
          lessonName: `Board Examination Preparatory Units in ${activeSubject}`,
          risk: `Loss of examination performance in multi-concept synthetic problems.`,
        },
      ],
      questions2Marks: [
        {
          prompt: `Define the primary concept of ${topicName || activeSubject} and provide one illustrative example.`,
          targetConcept: `Foundational ${activeSubject} Concepts`,
          expectedAnswer: `Accurate conceptual definition with one verified example relevant to ${activeSubject}.`,
        },
        {
          prompt: `Explain why understanding ${topicName || activeSubject} is essential for solving advanced problems in higher classes.`,
          targetConcept: `Prerequisite Conceptual Understanding in ${activeSubject}`,
          expectedAnswer: `Explains how this foundational concept directly links to future coursework in ${activeSubject}.`,
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
          lessonName: `${activeSubject} Board Examination Assessment Units`,
          risk: 'Direct mark deduction in Board Examination question papers and internal cumulative assessments.',
        },
        {
          grade: 'Class 11 & Class 12',
          chapterNumber: 'Foundations',
          lessonName: `Higher Secondary Coursework in ${activeSubject} (Class 11 and Class 12)`,
          risk: `Underlying conceptual weakness in senior secondary ${activeSubject}. (Detailed 11/12 chapter syllabus not mapped).`,
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
 * Normalizes conceptual error phrasing into canonical misconception keys.
 * Uses the resolved curriculum knowledge category as the authoritative taxonomy.
 */
export function normalizeConceptKey(topicName = '', observed = '', hypothesis = '', category = '') {
  if (category && category !== 'general' && !category.endsWith('_foundations')) {
    return category;
  }

  const combined = `${category} ${topicName} ${observed} ${hypothesis}`.toLowerCase();

  if (/transpos|equation\s*balanc|isolate\s*variable|equals\s*sign|sign\s*change|inverse\s*operation|moving\s*terms|lhs.*rhs|rhs.*lhs/i.test(combined)) {
    return 'linear_equations';
  }
  if (/fraction|denominator|lcm|cross\s*multipl/i.test(combined)) {
    return 'linear_equations';
  }
  if (/precedence|bodmas|order\s*of\s*operations/i.test(combined)) {
    return 'arithmetic_order_of_operations';
  }
  if (/exponent|power|base|index\s*law|division\s*of\s*powers|multiplication\s*of\s*powers|negative\s*exponent|zero\s*power/i.test(combined)) {
    return 'exponents_and_powers';
  }
  if (/mensuration|pythagor|diagonal|rectangle|perimeter|surface\s*area|volume|area\s*formula/i.test(combined)) {
    return 'mensuration_and_geometry';
  }
  if (/factoris|identity|a\^2\s*-\s*b\^2|difference\s*of\s*squares|split.*middle\s*term|quadratic/i.test(combined)) {
    return 'algebraic_identities_and_factorisation';
  }
  if (/compound\s*interest|simple\s*interest|annual\s*rate|principal|amount\s*accumulated/i.test(combined)) {
    return 'commercial_mathematics_and_interest';
  }
  if (/osmosis|exosmosis|potato|hypertonic|hypotonic|diffusion|semi-permeable|plasmolysis|water\s*movement/i.test(combined)) {
    return 'osmosis_and_diffusion';
  }
  if (/prokaryot|eukaryot|nucleoid|organelle|membrane-bound|mitochondria|chloroplast/i.test(combined)) {
    return 'prokaryotes_vs_eukaryotes';
  }
  if (/scientific\s*model|simulation|inquiry|prediction|hypothesis/i.test(combined)) {
    return 'scientific_models_and_inquiry';
  }
  if (/constitution|preamble|secular|sovereign|fundamental\s*rights|directive\s*principles|separation\s*of\s*powers/i.test(combined)) {
    return 'social_constitution_and_governance';
  }
  if (/voice|active|passive|tense|past\s*perfect|auxiliary\s*verb|participle/i.test(combined)) {
    return 'english_grammar_tenses_voice';
  }
  if (/concord|subject-verb|relative\s*clause|subordinate\s*clause/i.test(combined)) {
    return 'subject_verb_concord_and_clauses';
  }

  return category || topicName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Derives foundational prerequisite gaps, ordered learning roadmaps,
 * and diagnostic re-test items from evaluated answer sheet results.
 *
 * Engine Architecture:
 * Explainable Diagnostic Rule-Based Synthesis Engine grounded in NCERT/SCERT
 * curriculum dependency trees and teacher-verified rubric observations.
 * Objective, deterministic evaluation without speculative ungrounded claims.
 *
 * Enforces:
 * 1. Filtering out questions where no error occurred or full marks were awarded.
 * 2. Grouping related questions into canonical root misconceptions (duplicate prevention).
 * 3. Paraphrase matching across student working error descriptions.
 * 4. Multi-question evidence aggregation and severity prioritization.
 * 5. Generating 2-mark diagnostic questions with a count strictly between 5 and 10 questions.
 * 6. Exact Class & Chapter numbers for previous class delayed topics.
 * 7. Future affected chapters strictly up to Class 10 (with Class 10 Board exam & Class 11/12 rule).
 */
export function deriveGapsAndRemediation(evaluations = [], syllabusData = {}) {
  // Honest Empty State: If no student evaluations are provided, return clean empty diagnostic artifacts
  if (!evaluations || evaluations.length === 0) {
    return { gaps: [], roadmap: [], testQuestions: [] };
  }

  const gaps = [];
  const roadmap = [];

  // Consolidate full assessment text to auto-detect the genuine subject
  const fullText = evaluations
    .map(
      (e) =>
        `${e.prompt || ''} ${e.studentAnswer || ''} ${e.expectedAnswer || ''} ${e.affectedLessonName || ''} ${
          e.misconceptionHypothesis || ''
        } ${e.observedErrors || ''}`
    )
    .join(' ');

  const activeSubject = detectSubject(fullText, syllabusData.selectedSubject || 'Mathematics');
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
        : item.suggestedMarks ?? item.awardedMarks ?? item.detectedMarks ?? max
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
      `Foundational ${activeSubject} Concept`;

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

    const lessonName = item.affectedLessonName || topicName;

    // Retrieve previous class foundational lesson and future affected lessons
    const knowledge = resolveCurriculumKnowledge({
      prompt,
      observed,
      hypothesis,
      topicName,
      subject: activeSubject,
      targetGrade,
      syllabusEvidence: item.syllabusEvidence,
    });

    if (!diagnosedCategories.some((c) => c.category === knowledge.category)) {
      diagnosedCategories.push(knowledge);
    }

    // Paraphrase matching and canonical concept key for root misconception grouping
    const conceptKey = normalizeConceptKey(topicName, observed, hypothesis, knowledge.category);

    const existingGap = gaps.find((g) => g.conceptKey === conceptKey);

    if (existingGap) {
      // Group under the same root misconception (duplicate prevention & evidence aggregation)
      if (!existingGap.questionNumbers.includes(qNum)) {
        existingGap.questionNumbers.push(qNum);
        existingGap.questionNumber = existingGap.questionNumbers.join(', ');
      }
      existingGap.evidence += ` | In ${qNum}, ${observed || hypothesis || 'discrepancy identified in working steps.'}`;
      if (hypothesis && !existingGap.misconceptions.includes(hypothesis)) {
        existingGap.misconceptions.push(hypothesis);
      }
      existingGap.scoreInfo.awarded += awarded;
      existingGap.scoreInfo.max += max;
      existingGap.scoreInfo.lost += max - awarded;

      const lossRatio = existingGap.scoreInfo.max > 0 ? existingGap.scoreInfo.lost / existingGap.scoreInfo.max : 0;
      existingGap.severity = lossRatio >= 0.5 || existingGap.questionNumbers.length > 1 ? 'High' : lossRatio >= 0.25 ? 'Medium' : 'Low';
      existingGap.likelihood = lossRatio >= 0.5 ? 'Definite' : 'Likely';
      existingGap.isRecurring = existingGap.questionNumbers.length > 1;

      // Update practice intensity in corresponding roadmap item
      const existingRm = roadmap.find((r) => r.conceptKey === conceptKey);
      if (existingRm) {
        existingRm.practiceQuestions = Math.min(8, existingRm.practiceQuestions + 2);
        existingRm.estimatedMinutes = Math.min(60, existingRm.estimatedMinutes + 15);
        existingRm.severity = existingGap.severity;
      }
      return;
    }

    const gapId = `gap-${qNum.toLowerCase().replace(/[^a-z0-9]/g, '') || index + 1}`;
    const lossRatio = max > 0 ? (max - awarded) / max : 0;
    const severity = lossRatio >= 0.5 ? 'High' : lossRatio >= 0.25 ? 'Medium' : 'Low';

    gaps.push({
      id: gapId,
      conceptKey,
      questionNumber: qNum,
      questionNumbers: [qNum],
      topicName: gapTopic,
      grade: `${knowledge.prerequisiteLesson.grade} Prerequisite`,
      lessonName,
      lessonId: item.affectedLessonId || `les-${index + 1}`,
      evidence: `In ${qNum}, ${observed || hypothesis || 'discrepancy identified in working steps.'}`,
      likelihood: awarded <= max / 2 ? 'Likely' : 'Possible',
      status: 'Verified from Answer Evidence',
      severity,
      isRecurring: false,
      dependentTopics: [topicName, `${activeSubject} Core Curriculum`],
      misconception: hypothesis || observed || 'Conceptual reinforcement required.',
      misconceptions: [hypothesis || observed].filter(Boolean),
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
      conceptKey,
      rank: roadmap.length + 1,
      topic: gapTopic,
      grade: `${knowledge.prerequisiteLesson.grade} Remediation`,
      lessonId: item.affectedLessonId || `les-${index + 1}`,
      severity,
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
      lessonName: activeSubject,
      lessonId: 'les-mastery',
      evidence: 'Student demonstrated working steps consistent with rubric across all assessed questions without foundational errors.',
      likelihood: 'Low',
      status: 'Mastery Validated',
      dependentTopics: ['Advanced Problem Solving', 'Enrichment Units'],
      misconception: 'No critical foundational gaps detected.',
      prerequisiteLesson: {
        grade: targetGrade,
        chapterNumber: 1,
        chapterName: `${targetGrade} Advanced Extension Topics in ${activeSubject}`,
        pdfFileName: `Class 8 ${activeSubject.split(/[\/\s]/)[0]} Chapter 1.pdf`,
        pdfUrl: `/curriculum/Class 8 ${activeSubject.split(/[\/\s]/)[0]} Chapter 1.pdf`,
        concept: `Synthesis of multiple domains and olympiad problem solving in ${activeSubject}.`,
        studyTip: 'Engage with non-routine enrichment challenges.',
      },
      futureLessonsAffected: [
        {
          grade: 'Next Grade Level',
          chapterNumber: 'Advanced',
          lessonName: `Accelerated Curriculum Pathway in ${activeSubject}`,
          risk: 'No negative impact detected. Student is prepared for advanced honors topics.',
        },
      ],
      scoreInfo: { awarded: 25, max: 25, lost: 0 },
    });

    roadmap.push({
      id: 'rm-mastery',
      rank: 1,
      topic: `Syllabus Enrichment & Advanced Problem Formulation in ${activeSubject}`,
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
        chapterName: `${targetGrade} Advanced Extension Topics in ${activeSubject}`,
        pdfFileName: `Class 8 ${activeSubject.split(/[\/\s]/)[0]} Chapter 1.pdf`,
        pdfUrl: `/curriculum/Class 8 ${activeSubject.split(/[\/\s]/)[0]} Chapter 1.pdf`,
        concept: `Synthesis of multiple domains in ${activeSubject}.`,
        studyTip: 'Explore alternative representations and comparative analytical formulations.',
      },
      futureLessonsAffected: [],
    });
  }

  // =========================================================================
  // Assemble 2-Mark Diagnostic Test Questions (strictly between 5 and 10 questions)
  // Constraint: "do not exceed 10 and degrade 5"
  // =========================================================================
  const questionPool = [];

  // Filter curriculum categories to the active subject
  const sameSubjectCategories = CURRICULUM_KNOWLEDGE_BASE.filter((k) => {
    const catSub = (k.subject || 'Mathematics').toLowerCase();
    if (activeSubject.includes('Science')) return catSub.includes('science');
    if (activeSubject.includes('Social')) return catSub.includes('social');
    if (activeSubject.includes('English')) return catSub.includes('english');
    return catSub.includes('math');
  });

  const activeCategories = diagnosedCategories.length > 0 ? diagnosedCategories : sameSubjectCategories;

  // 1. Gather 2-mark questions from diagnosed categories
  activeCategories.forEach((cat) => {
    const list = cat.questions2Marks || [];
    list.forEach((q) => {
      questionPool.push({
        prompt: q.prompt,
        type: 'Short Answer',
        marks: 2,
        targetConcept: q.targetConcept,
        syllabusTopic: cat.prerequisiteLesson?.chapterName || activeSubject,
        expectedAnswer: q.expectedAnswer,
        prerequisiteChapter: cat.prerequisiteLesson?.chapterName,
        pdfFileName: cat.prerequisiteLesson?.pdfFileName,
      });
    });
  });

  // 2. If questionPool has less than 5 questions, supplement ONLY from the SAME SUBJECT categories!
  for (const cat of sameSubjectCategories) {
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
            syllabusTopic: cat.prerequisiteLesson?.chapterName || activeSubject,
            expectedAnswer: q.expectedAnswer,
            prerequisiteChapter: cat.prerequisiteLesson?.chapterName,
            pdfFileName: cat.prerequisiteLesson?.pdfFileName,
          });
        }
      }
    }
  }

  // 3. If STILL less than 5 questions, synthesize questions based on the student's evaluated prompts in the same subject:
  if (questionPool.length < 5 && evaluations.length > 0) {
    evaluations.forEach((item, idx) => {
      if (questionPool.length >= 7) return;
      const p = item.prompt || `Question ${idx + 1}`;
      questionPool.push({
        prompt: `Review and explain the key foundational principle involved in: ${p.slice(0, 90)}...`,
        type: 'Short Answer',
        marks: 2,
        targetConcept: `${activeSubject} Diagnostic Application`,
        syllabusTopic: item.affectedLessonName || activeSubject,
        expectedAnswer: item.expectedAnswer || 'Clear step-by-step conceptual answer.',
        prerequisiteChapter: `Class 7 ${activeSubject} Foundational Units`,
        pdfFileName: `Class 7 ${activeSubject.split(/[\/\s]/)[0]} Chapter 1.pdf`,
      });
    });
  }

  // 4. Bound question count strictly: minimum 5, maximum 10
  const targetCount = Math.min(10, Math.max(5, questionPool.length));
  const boundedQuestions = questionPool.slice(0, targetCount);

  // 5. Renumber sequentially and enforce 2 marks
  const testQuestions = boundedQuestions.map((q, idx) => ({
    ...q,
    id: `test-q-${idx + 1}`,
    number: `${idx + 1}`,
    marks: 2, // Every question carries strictly 2 marks
  }));

  // Prioritize gaps: High severity first, then Medium, then Low;
  // recurring gaps before single-occurrence; higher marks lost before lower marks lost.
  const severityWeight = { High: 3, Medium: 2, Low: 1 };

  gaps.sort((a, b) => {
    const sDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
    if (sDiff !== 0) return sDiff;
    const rDiff = (b.isRecurring ? 1 : 0) - (a.isRecurring ? 1 : 0);
    if (rDiff !== 0) return rDiff;
    return (b.scoreInfo?.lost || 0) - (a.scoreInfo?.lost || 0);
  });

  // Align roadmap order with gap prioritization and re-rank sequentially
  const gapOrderMap = new Map();
  gaps.forEach((g, idx) => {
    gapOrderMap.set(g.conceptKey, idx);
  });

  roadmap.sort((a, b) => {
    const orderA = gapOrderMap.has(a.conceptKey) ? gapOrderMap.get(a.conceptKey) : 999;
    const orderB = gapOrderMap.has(b.conceptKey) ? gapOrderMap.get(b.conceptKey) : 999;
    return orderA - orderB;
  });

  roadmap.forEach((item, idx) => {
    item.rank = idx + 1;
    item.prereqChain = idx === 0 ? 'None (Root Priority Foundation)' : `Step ${idx}: Prior Remediated Concept`;
  });

  return { gaps, roadmap, testQuestions };
}

export default deriveGapsAndRemediation;
