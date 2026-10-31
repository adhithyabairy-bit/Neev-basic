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
    subject: 'Mathematics',
    triggers: ['linear equation', '5x', 'transpos', 'variable', 'algebraic balance', 'equation', 'substitute', 'inverse operation'],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Simple Expressions and Equations',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      fileName: 'Class 7 Maths Chapter 2.pdf',
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
      fileName: 'Class 6 Maths Chapter 3.pdf',
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
      fileName: 'Class 8 Maths Chapter 2.pdf',
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
      fileName: 'Class 7 Maths Chapter 2.pdf',
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
    triggers: ['mensuration', 'rectangle', 'diagonal', 'pythagor', 'area', 'perimeter', '25', '24', 'hypotenuse', 'width', 'geometry'],
    prerequisiteLesson: {
      grade: 'Class 6',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Lines, Angles and Plane Shapes',
      pdfFileName: 'Class 6 Maths Chapter 2.pdf',
      fileName: 'Class 6 Maths Chapter 2.pdf',
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
    triggers: ['compound interest', 'simple interest', '8000', 'interest rate', 'compounding', 'commercial', 'principal', 'annual interest', 'percentage'],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Large Numbers & Comparing Quantities',
      pdfFileName: 'Class 7 Maths Chapter 1.pdf',
      fileName: 'Class 7 Maths Chapter 1.pdf',
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
  // SCIENCE CURRICULUM KNOWLEDGE BASE (NCERT Class 6 - Class 10 Alignment)
  // =========================================================================
  {
    category: 'osmosis_and_diffusion',
    subject: 'Science',
    triggers: [
      'osmosis',
      'potato',
      'semi-permeable',
      'concentration',
      'diffusion',
      'membrane',
      'hypertonic',
      'hypotonic',
      'exosmosis',
      'endosmosis',
      'solute',
      'water potential',
      'potato piece',
      'salt solution',
    ],
    prerequisiteLesson: {
      grade: 'Class 7',
      chapterNumber: 2,
      chapterName: 'Chapter 2: Exploring Living Processes & Cellular Transport',
      pdfFileName: 'Class 7 Science Chapter 2.pdf',
      fileName: 'Class 7 Science Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 7 Science Chapter 2.pdf',
      concept:
        'Osmosis as the selective net movement of solvent (water) molecules through a semi-permeable membrane from higher to lower water potential; endosmosis (cell swelling in plain water) versus exosmosis (cell shrinkage/flaccidity in concentrated salt solution).',
      studyTip:
        'Review the potato osmometer experiment in Section 2.4 and distinguish between solute movement (diffusion) and solvent movement across selectively permeable cell membranes.',
      targetLessonName: 'Osmosis & Cellular Transport',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 5,
        lessonName: 'Chapter 5: The Fundamental Unit of Life — Plasma Membrane Dynamics',
        risk: 'Failure to analyze tonicity, hypotonic/hypertonic media, and plasmolysis in plant cell walls.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 6,
        lessonName: 'Chapter 6: Life Processes — Transportation and Excretion',
        risk: 'Inability to explain xylem sap ascent by root osmotic pressure and selective reabsorption across tubular nephron membranes.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Define osmosis and state the direction of water movement across a semi-permeable membrane.',
        targetConcept: 'Osmosis & Semipermeable Membranes (Class 7 Prerequisite)',
        expectedAnswer:
          'Osmosis is the net movement of water molecules from a region of higher water concentration to lower water concentration through a semi-permeable membrane.',
      },
      {
        prompt:
          'Why did the potato piece shrink when placed in concentrated salt solution? Name the biological phenomenon.',
        targetConcept: 'Exosmosis & Cellular Shrinkage (Class 7 Prerequisite)',
        expectedAnswer:
          'Water moved out of the potato cells into the concentrated salt solution by exosmosis, causing cell flaccidity and shrinkage.',
      },
      {
        prompt:
          'Distinguish between endosmosis and exosmosis with one everyday laboratory observation.',
        targetConcept: 'Endosmosis vs Exosmosis (Class 7 Prerequisite)',
        expectedAnswer:
          'Endosmosis is inward water entry causing swelling (potato in plain water); exosmosis is outward water exit causing shrinkage (potato in salt solution).',
      },
    ],
  },
  {
    category: 'prokaryotes_vs_eukaryotes',
    subject: 'Science',
    triggers: [
      'prokaryot',
      'eukaryot',
      'bacteria',
      'nucleoid',
      'backera',
      'animale',
      'membrane-bound organelle',
    ],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 2,
      chapterName: 'Chapter 2: The Invisible Living World: Beyond Our Naked Eye',
      pdfFileName: 'Class 8 Science Chapter 2.pdf',
      fileName: 'Class 8 Science Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 8 Science Chapter 2.pdf',
      concept:
        'Structural hierarchy of life: Prokaryotic cells (e.g. bacteria) lack a nuclear membrane (possess an undefined nucleoid) and lack membrane-bound organelles; Eukaryotic cells possess a true membrane-bound nucleus and organized organelles.',
      studyTip:
        'Create a two-column contrast table comparing bacterial prokaryotic cells with plant/animal eukaryotic cells on nucleus presence and organelle compartmentalization.',
      targetLessonName: 'Prokaryotic vs Eukaryotic Cell Organization',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 5,
        lessonName: 'Chapter 5: The Fundamental Unit of Life — Cellular Organization',
        risk: 'Confusion between simple bacterial prokaryotes and compartmentalized multicellular eukaryotes.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 8,
        lessonName: 'Chapter 8: How do Organisms Reproduce — Modes of Cell Division',
        risk: 'Inability to contrast binary fission in prokaryotes with complex mitotic and meiotic chromosomal division in eukaryotes.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Name two fundamental structural differences between prokaryotic and eukaryotic cells.',
        targetConcept: 'Prokaryote vs Eukaryote Distinction (Class 8 Prerequisite)',
        expectedAnswer:
          '1. Prokaryotes lack a nuclear membrane (have a nucleoid); eukaryotes have a membrane-bound nucleus. 2. Prokaryotes lack membrane-bound organelles; eukaryotes contain them.',
      },
      {
        prompt:
          'Classify bacteria and plant cells into prokaryotes or eukaryotes, giving one justifying cellular feature for each.',
        targetConcept: 'Cellular Classification (Class 8 Prerequisite)',
        expectedAnswer:
          'Bacteria are prokaryotes (lack defined nucleus/organelles); Plant cells are eukaryotes (possess membrane-bound nucleus and chloroplasts/mitochondria).',
      },
    ],
  },
  {
    category: 'cell_organelles_and_functions',
    subject: 'Science',
    triggers: [
      'organelle',
      'nucleus',
      'mitochondria',
      'golgi',
      'cell organelle',
      'cytoplasm',
      'atp',
      'powerhouse',
      'energy production',
      'respiration',
      'food synthesis',
      'packaging',
      'enemy to the cell',
    ],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 2,
      chapterName: 'Chapter 2: The Invisible Living World: Beyond Our Naked Eye',
      pdfFileName: 'Class 8 Science Chapter 2.pdf',
      fileName: 'Class 8 Science Chapter 2.pdf',
      pdfUrl: '/curriculum/Class 8 Science Chapter 2.pdf',
      concept:
        'Division of labor in cellular organelles: Nucleus controls hereditary genetic transmission and metabolic regulation; Mitochondria perform aerobic respiration to synthesize cellular energy (ATP); Golgi apparatus processes, packages, and secretes cellular biomolecules.',
      studyTip:
        'Map each organelle to its verified metabolic function using a comparative cell diagram, emphasizing that mitochondria produce ATP while chloroplasts (not Golgi) perform food synthesis.',
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
        lessonName: 'Chapter 6: Life Processes — Cellular Respiration and Metabolic Energetics',
        risk: 'Breakdown in understanding cellular respiration pathways, glycolytic products, and mitochondrial oxidative phosphorylation.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'State the primary function of: (a) Mitochondria, and (b) Golgi apparatus.',
        targetConcept: 'Cell Organelle Functions (Class 8 Prerequisite)',
        expectedAnswer:
          '(a) Mitochondria: Generate cellular energy currency (ATP) via respiration. (b) Golgi apparatus: Modification, packaging, and sorting of proteins and lipids.',
      },
      {
        prompt: 'Why is the nucleus often described as the master controller of a eukaryotic cell?',
        targetConcept: 'Nuclear Control & Genetic Material (Class 8 Prerequisite)',
        expectedAnswer:
          'The nucleus contains genetic material (DNA/chromosomes) that coordinates gene expression and directs all cellular metabolic activities.',
      },
      {
        prompt:
          'Explain why a cell devoid of functional mitochondria cannot sustain active cellular processes.',
        targetConcept: 'Cellular Respiration & ATP (Class 8 Prerequisite)',
        expectedAnswer:
          'It cannot generate ATP required for energy-consuming cellular activities and maintenance.',
      },
    ],
  },
  {
    category: 'scientific_models_and_inquiry',
    subject: 'Science',
    triggers: [
      'scientific model',
      'prediction',
      'guess',
      'hypothesis',
      'complex system',
      'experimental setup',
      'mismatch',
      'observations',
      'solar system model',
      '3d cell model',
    ],
    prerequisiteLesson: {
      grade: 'Class 8',
      chapterNumber: 1,
      chapterName: 'Chapter 1: Exploring the Investigative World of Science',
      pdfFileName: 'Class 8 Science Chapter 1.pdf',
      fileName: 'Class 8 Science Chapter 1.pdf',
      pdfUrl: '/curriculum/Class 8 Science Chapter 1.pdf',
      concept:
        'Scientific models serve as simplified, testable representations of complex phenomena; scientific predictions are evidence-grounded forecasts, distinct from random guesses, and must trigger iterative hypothesis revision upon observational mismatch.',
      studyTip:
        'Review Section 1.2 on scientific inquiry and practice identifying controlled variables, testable predictions, and iterative model adjustments.',
      targetLessonName: 'Scientific Models & Systems',
    },
    futureLessonsAffected: [
      {
        grade: 'Class 9',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Matter in Our Surroundings — Kinetic Particle Models',
        risk: 'Struggling to visualize and manipulate sub-microscopic molecular representations and phase-change simulations.',
      },
      {
        grade: 'Class 10',
        chapterNumber: 1,
        lessonName: 'Chapter 1: Chemical Reactions & Equations — Empirical Scientific Evidence',
        risk: 'Inability to translate empirical experimental observations into balanced scientific models and conservation laws.',
      },
    ],
    questions2Marks: [
      {
        prompt: 'Why are scientific predictions fundamentally different from random guesses?',
        targetConcept: 'Scientific Predictions vs Guesses (Class 8 Prerequisite)',
        expectedAnswer:
          'Scientific predictions are grounded in prior empirical evidence, logical principles, and testable hypotheses, whereas guesses lack evidential basis.',
      },
      {
        prompt:
          'What essential step must scientists take when observed experimental outcomes contradict their initial prediction?',
        targetConcept: 'Hypothesis Revision & Scientific Method (Class 8 Prerequisite)',
        expectedAnswer:
          'Scientists re-examine their experimental procedure and modify or reject the existing hypothesis to formulate new testable models.',
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

  // 1. Detect if this item or context belongs to Science curriculum
  const isScienceDetected =
    subject.toLowerCase().includes('scien') ||
    subject.toLowerCase().includes('bio') ||
    subject.toLowerCase().includes('phys') ||
    subject.toLowerCase().includes('chem') ||
    /osmosis|cell|organelle|nucleus|mitochondria|golgi|prokaryot|eukaryot|plant|potato|membrane|diffusion|respiration|photosynthesis|scientific model|prediction|hypothesis/i.test(
      combined
    );

  const effectiveSubject = isScienceDetected ? 'Science' : 'Mathematics';
  const candidateCategories = CURRICULUM_KNOWLEDGE_BASE.filter((k) =>
    effectiveSubject === 'Science' ? k.subject === 'Science' : k.subject !== 'Science'
  );

  let baseKnowledge = null;

  // 2. Check if database retrieval evidence provided a specific textbook chapter file
  if (Array.isArray(syllabusEvidence) && syllabusEvidence.length > 0) {
    for (const chunk of syllabusEvidence) {
      const src = (chunk.sourceFileName || '').toLowerCase();
      // Science textbook evidence
      if (src.includes('class 7 science chapter 2') || (src.includes('science') && src.includes('chapter 2') && src.includes('7'))) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'osmosis_and_diffusion');
        if (baseKnowledge) break;
      }
      if (src.includes('class 8 science chapter 2') || (src.includes('science') && src.includes('chapter 2') && src.includes('8'))) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'cell_organelles_and_functions');
        if (baseKnowledge) break;
      }
      if (src.includes('class 8 science chapter 1') || (src.includes('science') && src.includes('chapter 1') && src.includes('8'))) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'scientific_models_and_inquiry');
        if (baseKnowledge) break;
      }
      // Maths textbook evidence
      if (src.includes('class 7 maths chapter 2')) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'linear_equations');
        if (baseKnowledge) break;
      }
      if (src.includes('class 6 maths chapter 3')) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'arithmetic_order_of_operations');
        if (baseKnowledge) break;
      }
      if (src.includes('class 8 maths chapter 2')) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'exponents_powers');
        if (baseKnowledge) break;
      }
      if (src.includes('class 7 maths chapter 1')) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'commercial_math_interest');
        if (baseKnowledge) break;
      }
      if (src.includes('class 6 maths chapter 2')) {
        baseKnowledge = candidateCategories.find((k) => k.category === 'geometry_mensuration');
        if (baseKnowledge) break;
      }
    }
  }

  // 3. Keyword trigger match within subject candidate categories
  if (!baseKnowledge) {
    for (const entry of candidateCategories) {
      for (const trigger of entry.triggers) {
        if (combined.includes(trigger.toLowerCase())) {
          baseKnowledge = entry;
          break;
        }
      }
      if (baseKnowledge) break;
    }
  }

  // 4. Fallback defaults strictly by subject
  if (!baseKnowledge) {
    if (effectiveSubject === 'Science') {
      baseKnowledge =
        candidateCategories.find((k) => k.category === 'cell_organelles_and_functions') ||
        candidateCategories[0] || {
          category: 'general_science_foundations',
          subject: 'Science',
          prerequisiteLesson: {
            grade: 'Class 7',
            chapterNumber: 2,
            chapterName: 'Chapter 2: Exploring Living Processes & Cellular Transport',
            pdfFileName: 'Class 7 Science Chapter 2.pdf',
            fileName: 'Class 7 Science Chapter 2.pdf',
            pdfUrl: '/curriculum/Class 7 Science Chapter 2.pdf',
            concept: 'Core conceptual definitions and foundational analytical skills in Science.',
            studyTip: 'Review foundational concepts and complete guided review exercises before advancing.',
            targetLessonName: 'Foundational Science Principles',
          },
          futureLessonsAffected: [
            {
              grade: 'Class 9',
              chapterNumber: 5,
              lessonName: 'Chapter 5: The Fundamental Unit of Life',
              risk: 'Gaps in core prerequisite principles will lead to compounding comprehension difficulties.',
            },
            {
              grade: 'Class 10',
              chapterNumber: 6,
              lessonName: 'Chapter 6: Life Processes',
              risk: 'Loss of examination performance in multi-concept synthetic problems.',
            },
          ],
          questions2Marks: [
            {
              prompt: 'Review and define the primary foundational principle of Science covered in previous grades.',
              targetConcept: 'Foundational Science Principles',
              expectedAnswer: 'Clear conceptual definition with one verified application example.',
            },
          ],
        };
    } else {
      baseKnowledge =
        candidateCategories.find((k) => k.category === 'linear_equations') ||
        candidateCategories[0] ||
        CURRICULUM_KNOWLEDGE_BASE[0];
    }
  }

  // Ensure fileName is always present and mirrors pdfFileName
  if (baseKnowledge?.prerequisiteLesson) {
    baseKnowledge = {
      ...baseKnowledge,
      prerequisiteLesson: {
        ...baseKnowledge.prerequisiteLesson,
        fileName: baseKnowledge.prerequisiteLesson.fileName || baseKnowledge.prerequisiteLesson.pdfFileName,
      },
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

  // Determine true curriculum subject from evaluation content and syllabus
  const allText = (evaluations || [])
    .map(
      (e) =>
        `${e.prompt || ''} ${e.studentAnswer || ''} ${e.observedErrors || ''} ${e.misconceptionHypothesis || ''} ${e.affectedLessonName || ''}`
    )
    .join(' ')
    .toLowerCase();

  const isExamScience =
    /osmosis|cell|organelle|nucleus|mitochondria|golgi|prokaryot|eukaryot|plant|potato|membrane|diffusion|respiration|photosynthesis|scientific model|prediction|hypothesis/i.test(
      allText
    ) ||
    String(syllabusData.selectedSubject || '').toLowerCase().includes('scien');

  const subject = isExamScience ? 'Science' : (syllabusData.selectedSubject || 'Mathematics');
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

    // Determine clean, conceptual topic name
    let topicName = item.affectedLessonName;
    if (
      !topicName ||
      topicName === 'Mathematics' ||
      topicName === 'Science / Physics' ||
      topicName.startsWith('Foundational')
    ) {
      const qText = `${prompt} ${observed} ${hypothesis}`.toLowerCase();
      if (/osmosis|potato|semi-permeable|diffusion|water movement|concentration/i.test(qText)) {
        topicName = 'Osmosis & Cellular Transport';
      } else if (/prokaryot|eukaryot|bacteria|nucleoid/i.test(qText)) {
        topicName = 'Prokaryotic vs Eukaryotic Cell Organization';
      } else if (/organelle|nucleus|mitochondria|golgi|atp|energy currency/i.test(qText)) {
        topicName = 'Cell Structure & Organelle Functions';
      } else if (/scientific model|prediction|hypothesis|guess/i.test(qText)) {
        topicName = 'Scientific Models & Experimental Inquiry';
      } else if (/linear equation|equation|solve for/i.test(qText)) {
        topicName = 'Linear Equations in One Variable';
      } else if (/exponent|power/i.test(qText)) {
        topicName = 'Exponents & Powers';
      } else if (/factoris|polynomial/i.test(qText)) {
        topicName = 'Factorisation & Polynomials';
      } else {
        topicName = prompt.includes('—')
          ? prompt.split('—')[0].trim()
          : prompt.slice(0, 50).trim() || `${subject} Foundational Concept`;
      }
    }
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
    const lessonName = topicName;

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
    const defaultPrereq = isExamScience
      ? {
          grade: targetGrade,
          chapterNumber: 1,
          chapterName: 'Class 8 Science Advanced Inquiry',
          pdfFileName: 'Class 8 Science Chapter 1.pdf',
          fileName: 'Class 8 Science Chapter 1.pdf',
          pdfUrl: '/curriculum/Class 8 Science Chapter 1.pdf',
          concept: 'Advanced scientific investigation and experimental design.',
          studyTip: 'Engage with inquiry extension projects.',
        }
      : {
          grade: targetGrade,
          chapterNumber: 1,
          chapterName: `${targetGrade} Advanced Extension Topics`,
          pdfFileName: 'Class 8 Maths Chapter 1.pdf',
          fileName: 'Class 8 Maths Chapter 1.pdf',
          pdfUrl: '/curriculum/Class 8 Maths Chapter 1.pdf',
          concept: 'Synthesis of multiple mathematical domains, proof formulation, and Olympiad problem-solving.',
          studyTip: 'Engage with non-routine enrichment challenges.',
        };

    gaps.push({
      id: 'gap-mastery',
      topicName: 'Curriculum Mastery Confirmed',
      grade: targetGrade,
      lessonName: subject,
      lessonId: 'les-mastery',
      evidence:
        'Student demonstrated working steps consistent with rubric across all assessed questions without foundational errors.',
      likelihood: 'Low',
      status: 'Mastery Validated',
      dependentTopics: ['Advanced Problem Solving', 'Enrichment Units'],
      misconception: 'No critical foundational gaps detected.',
      prerequisiteLesson: defaultPrereq,
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
      prerequisiteLesson: defaultPrereq,
      futureLessonsAffected: [],
    });
  }

  // =========================================================================
  // Assemble 2-Mark Diagnostic Test Questions (strictly between 5 and 10 questions)
  // Constraint: "do not exceed 10 and degrade 5"
  // Strictly filtered by subject: Science questions for Science, Math for Math!
  // =========================================================================
  const questionPool = [];

  const subjectKnowledgeBase = CURRICULUM_KNOWLEDGE_BASE.filter((k) =>
    isExamScience ? k.subject === 'Science' : k.subject !== 'Science'
  );

  const activeCategories = diagnosedCategories.filter((k) =>
    isExamScience ? k.subject === 'Science' : k.subject !== 'Science'
  );

  const baseCategoriesToUse = activeCategories.length > 0 ? activeCategories : subjectKnowledgeBase;

  // 1. Gather 2-mark questions from diagnosed categories
  baseCategoriesToUse.forEach((cat) => {
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
        pdfFileName: cat.prerequisiteLesson.pdfFileName || cat.prerequisiteLesson.fileName,
      });
    });
  });

  // 2. If questionPool has less than 5 questions, supplement from remaining curriculum categories of the SAME subject
  for (const cat of subjectKnowledgeBase) {
    if (questionPool.length >= 7) break; // Healthy target of 6-7 questions
    if (!baseCategoriesToUse.some((c) => c.category === cat.category)) {
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
            pdfFileName: cat.prerequisiteLesson.pdfFileName || cat.prerequisiteLesson.fileName,
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
