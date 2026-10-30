/**
 * Teaching Priorities Engine for Neev Platform
 *
 * Maps active classes and sections to prioritized foundational learning gaps,
 * previous grade curriculum lessons, and suggested pedagogical interventions.
 */

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
 * Teaching priority profiles mapped by Grade, Section, and Subject.
 */
const GRADE_SECTION_PRIORITIES = {
  // Class 8
  '8-A': [
    {
      id: '8a-1',
      rank: 1,
      topicName: 'Transposition & Equation Balancing: 5x − 3 = 3x + 7',
      grade: 'Class 7 Prerequisite • Chapter 2 Simple Expressions',
      chapterName: 'Chapter 2: Simple Expressions and Equations',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      reason: 'Root Conceptual Gap: Treating equals sign (=) as an operation divider rather than a balance scale; omitting sign changes across boundary.',
      suggestedActivity: '15-minute physical or interactive balance scale demonstration maintaining identical algebraic operations on both sides.',
      estimatedMinutes: 45,
    },
    {
      id: '8a-2',
      rank: 2,
      topicName: 'Arithmetic Precedence & Addition Verification: 15 + 7 = 22',
      grade: 'Class 6 Prerequisite • Chapter 3 Number Play',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Verification Calculation Slip: Arithmetic error during verification check step ($3(5)+7$ computed as 23 instead of 22).',
      suggestedActivity: 'Mental addition drills with tens regrouping; implement mandatory double-check step before concluding verification.',
      estimatedMinutes: 30,
    },
    {
      id: '8a-3',
      rank: 3,
      topicName: 'Subtractions of Negative Integers: −(−a) = +a',
      grade: 'Class 7 Prerequisite • Chapter 1 Integers',
      chapterName: 'Chapter 1: Integers & Signed Numbers',
      pdfFileName: 'Class 7 Maths Chapter 1.pdf',
      reason: 'Signed Numbers: Dropping double negative brackets without converting to positive, cascading across multi-step algebra.',
      suggestedActivity: 'Number line walking simulation with directional reversals paired with opposite-sign chip exercises.',
      estimatedMinutes: 40,
    },
  ],
  '8-B': [
    {
      id: '8b-1',
      rank: 1,
      topicName: 'Fraction Addition & Common Denominators in Equations',
      grade: 'Class 7 Prerequisite • Chapter 2 Fractions',
      chapterName: 'Chapter 2: Fractions and Rational Numbers',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      reason: 'Rational Coefficients: Cross-multiplication errors and failure to multiply all terms by common denominators (LCM).',
      suggestedActivity: 'Fraction bar manipulatives and clearing fractions step-by-step drills before transposing.',
      estimatedMinutes: 40,
    },
    {
      id: '8b-2',
      rank: 2,
      topicName: 'Variables on Both Sides: ax + b = cx + d',
      grade: 'Class 8 Core • Chapter 1 Linear Equations',
      chapterName: 'Chapter 1: Linear Equations in One Variable',
      pdfFileName: 'Class 8 Maths Chapter 1.pdf',
      reason: 'Variable Grouping: Combining unlike variable and constant terms into single expressions.',
      suggestedActivity: 'Color-coded variable and constant sorting cards and balance scales.',
      estimatedMinutes: 45,
    },
    {
      id: '8b-3',
      rank: 3,
      topicName: 'Algebraic Word Problems on Perimeter and Ages',
      grade: 'Class 7 Prerequisite • Chapter 2 Simple Expressions',
      chapterName: 'Chapter 2: Simple Expressions and Equations',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      reason: 'Mathematical Modeling: Misinterpreting verbal constraint phrases into balanced algebraic equations.',
      suggestedActivity: 'Sentence-to-equation graphic organizer with guided keywords ("more than", "times as old").',
      estimatedMinutes: 50,
    },
  ],
  '8-C': [
    {
      id: '8c-1',
      rank: 1,
      topicName: 'Laws of Exponents & Negative Powers: a^(−n) = 1/a^n',
      grade: 'Class 8 Core • Chapter 2 Power Play',
      chapterName: 'Chapter 2: Power Play (Exponents & Powers)',
      pdfFileName: 'Class 8 Maths Chapter 2.pdf',
      reason: 'Indices Foundation: Confusing negative exponent powers with negative value quantities.',
      suggestedActivity: 'Pattern expansion table tracing powers from 2³ down to 2^(−3) using paper folding.',
      estimatedMinutes: 35,
    },
    {
      id: '8c-2',
      rank: 2,
      topicName: 'Distributive Property across Parentheses: a(b − c)',
      grade: 'Class 7 Prerequisite • Chapter 2 Simple Expressions',
      chapterName: 'Chapter 2: Simple Expressions and Equations',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      reason: 'Parentheses Expansion: Omitted distribution across second term in binomial expressions.',
      suggestedActivity: 'Area model rectangular grid diagrams with colored variable tiles.',
      estimatedMinutes: 40,
    },
    {
      id: '8c-3',
      rank: 3,
      topicName: 'Pythagoras Theorem & Rectangular Dimension Calculations',
      grade: 'Class 6 Prerequisite • Chapter 2 Lines, Angles & Shapes',
      chapterName: 'Chapter 2: Lines and Angles',
      pdfFileName: 'Class 6 Maths Chapter 2.pdf',
      reason: 'Geometric Mensuration: Squaring side dimensions incorrectly or omitting square roots when finding diagonals.',
      suggestedActivity: 'Geometric cutting-and-rearranging right-triangle area proof demonstration.',
      estimatedMinutes: 45,
    },
  ],
  '8-D': [
    {
      id: '8d-1',
      rank: 1,
      topicName: 'Compound Interest vs Simple Interest Formulas',
      grade: 'Class 7 Prerequisite • Chapter 1 Comparing Quantities',
      chapterName: 'Chapter 1: Large Numbers & Comparing Quantities',
      pdfFileName: 'Class 7 Maths Chapter 1.pdf',
      reason: 'Financial Math: Using linear simple interest formula instead of exponential compounding multiplier A = P(1+R/100)^n.',
      suggestedActivity: 'Step-by-step annual interest accumulation comparison tables.',
      estimatedMinutes: 50,
    },
    {
      id: '8d-2',
      rank: 2,
      topicName: 'Factorisation by Grouping: ax + bx + ay + by',
      grade: 'Class 8 Core • Chapter 3 Factorisation',
      chapterName: 'Chapter 3: Factorisation Techniques',
      pdfFileName: 'Class 8 Maths Chapter 3.pdf',
      reason: 'Factoring: Identifying common binomial factors across grouped terms.',
      suggestedActivity: 'Pairing cards matching expanded polynomials with factored expressions.',
      estimatedMinutes: 40,
    },
    {
      id: '8d-3',
      rank: 3,
      topicName: 'Linear Equation Verification Protocols',
      grade: 'Class 7 Prerequisite • Chapter 2 Simple Expressions',
      chapterName: 'Chapter 2: Simple Expressions and Equations',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      reason: 'Verification Rigor: Asserting LHS = RHS without independently calculating both numeric expressions.',
      suggestedActivity: 'Peer review verification checklists validating LHS and RHS values independently.',
      estimatedMinutes: 30,
    },
  ],

  // Class 9
  '9-A': [
    {
      id: '9a-1',
      rank: 1,
      topicName: 'Middle-Term Splitting for Quadratic Factorisation: x² + bx + c',
      grade: 'Class 8 Prerequisite • Factorisation',
      chapterName: 'Chapter 3: Factorisation Techniques',
      pdfFileName: 'Class 8 Maths Chapter 3.pdf',
      reason: 'Factorisation Gap: Difficulty identifying factor pairs whose product equals c and sum equals b.',
      suggestedActivity: 'Product-Sum grid tables and geometric area factorization puzzles.',
      estimatedMinutes: 50,
    },
    {
      id: '9a-2',
      rank: 2,
      topicName: 'Laws of Exponents & Rational Indices: a^(m/n)',
      grade: 'Class 8 Prerequisite • Chapter 2 Power Play',
      chapterName: 'Chapter 2: Power Play (Exponents & Powers)',
      pdfFileName: 'Class 8 Maths Chapter 2.pdf',
      reason: 'Radicals & Exponents: Inability to convert radical roots into fractional index notation.',
      suggestedActivity: 'Radical and power equivalency matching cards.',
      estimatedMinutes: 40,
    },
    {
      id: '9a-3',
      rank: 3,
      topicName: 'Algebraic Identities: Difference of Two Squares (a² − b²)',
      grade: 'Class 8 Prerequisite • Chapter 2 Simple Expressions',
      chapterName: 'Chapter 2: Simple Expressions and Equations',
      pdfFileName: 'Class 7 Maths Chapter 2.pdf',
      reason: 'Identity Confusion: Confusing (a − b)² with (a² − b²) in polynomial simplifications.',
      suggestedActivity: 'Geometric paper folding area proof demonstration.',
      estimatedMinutes: 40,
    },
  ],
  '9-B': [
    {
      id: '9b-1',
      rank: 1,
      topicName: 'Coordinate Distance Formula & Quadrant Sign Conventions',
      grade: 'Class 8 Prerequisite • Coordinate Planes',
      chapterName: 'Chapter 1: Orienting Yourself (Coordinates)',
      pdfFileName: 'Class 9 Maths Chapter 1.pdf',
      reason: 'Coordinate Geometry: Sign confusion when computing (x2 − x1) with negative coordinate points.',
      suggestedActivity: 'Grid mapping exercises plotting real-world coordinate landmarks.',
      estimatedMinutes: 45,
    },
    {
      id: '9b-2',
      rank: 2,
      topicName: 'Linear Polynomials in Two Variables: ax + by + c = 0',
      grade: 'Class 8 Prerequisite • Linear Equations',
      chapterName: 'Chapter 2: Introduction to Linear Polynomials',
      pdfFileName: 'Class 9 Maths Chapter 2.pdf',
      reason: 'Two-Variable Equations: Expressing one variable in terms of the other for cartesian graph plotting.',
      suggestedActivity: 'Table of values generation and step-by-step cartesian line plotting.',
      estimatedMinutes: 45,
    },
    {
      id: '9b-3',
      rank: 3,
      topicName: 'Real Numbers & Decimal Representation of Irrationals',
      grade: 'Class 8 Prerequisite • Number Systems',
      chapterName: 'Chapter 3: The World of Numbers',
      pdfFileName: 'Class 9 Maths Chapter 3.pdf',
      reason: 'Number Systems: Distinguishing non-terminating recurring from non-recurring decimal expansions.',
      suggestedActivity: 'Long division pattern analysis of rational fractions.',
      estimatedMinutes: 35,
    },
  ],

  // Class 7
  '7-A': [
    {
      id: '7a-1',
      rank: 1,
      topicName: 'Number Line Representation & Negative Number Subtraction',
      grade: 'Class 6 Prerequisite • Chapter 3 Number Play',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Directional Error: Walking in the wrong direction on the number line when subtracting negative integers.',
      suggestedActivity: 'Interactive integer walking line mat with directional arrows.',
      estimatedMinutes: 40,
    },
    {
      id: '7a-2',
      rank: 2,
      topicName: 'Order of Operations with Parentheses & Brackets (BODMAS)',
      grade: 'Class 6 Prerequisite • Chapter 3 Number Play',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Calculation Sequence: Performing left-to-right operations ignoring operator precedence.',
      suggestedActivity: 'Tiered expression pyramids highlighting bracket resolution order.',
      estimatedMinutes: 45,
    },
    {
      id: '7a-3',
      rank: 3,
      topicName: 'One-Step Equations with Inverse Operations (x + a = b)',
      grade: 'Class 6 Prerequisite • Chapter 1 Patterns',
      chapterName: 'Chapter 1: Patterns in Mathematics',
      pdfFileName: 'Class 6 Maths Chapter 1.pdf',
      reason: 'Equation Balance: Adding to one side instead of maintaining balance across equals sign.',
      suggestedActivity: 'Physical balance scale with weights and mystery cups.',
      estimatedMinutes: 30,
    },
  ],
  '7-B': [
    {
      id: '7b-1',
      rank: 1,
      topicName: 'Fraction Multiplication & Reciprocals in Division',
      grade: 'Class 6 Prerequisite • Chapter 3 Number Play',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Fraction Operations: Forgetting to invert the divisor during fraction division.',
      suggestedActivity: 'Visual area fraction multiplication grid overlays.',
      estimatedMinutes: 35,
    },
    {
      id: '7b-2',
      rank: 2,
      topicName: 'Perimeter and Area of Rectangles and Triangles',
      grade: 'Class 6 Prerequisite • Chapter 2 Lines and Angles',
      chapterName: 'Chapter 2: Lines and Angles',
      pdfFileName: 'Class 6 Maths Chapter 2.pdf',
      reason: 'Mensuration: Confusing boundary perimeter with internal surface area units.',
      suggestedActivity: 'Geoboard perimeter and area grid constructions.',
      estimatedMinutes: 40,
    },
    {
      id: '7b-3',
      rank: 3,
      topicName: 'Decimals Multiplication and Place Value Shifts',
      grade: 'Class 6 Prerequisite • Chapter 3 Number Play',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Decimals: Miscounting total decimal places in multiplied products.',
      suggestedActivity: 'Decimals place value slider cards.',
      estimatedMinutes: 30,
    },
  ],
  '7-C': [
    {
      id: '7c-1',
      rank: 1,
      topicName: 'Number Line Representation & Negative Number Subtraction',
      grade: 'Class 6 Prerequisite • Chapter 3 Number Play',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Directional Error: Walking in the wrong direction on the number line when subtracting negative integers.',
      suggestedActivity: 'Interactive integer walking line mat with directional arrows.',
      estimatedMinutes: 40,
    },
    {
      id: '7c-2',
      rank: 2,
      topicName: 'Order of Operations with Parentheses & Brackets (BODMAS)',
      grade: 'Class 6 Prerequisite • Chapter 3 Number Play',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Calculation Sequence: Performing left-to-right operations ignoring operator precedence.',
      suggestedActivity: 'Tiered expression pyramids highlighting bracket resolution order.',
      estimatedMinutes: 45,
    },
    {
      id: '7c-3',
      rank: 3,
      topicName: 'One-Step Equations with Inverse Operations (x + a = b)',
      grade: 'Class 6 Prerequisite • Chapter 1 Patterns',
      chapterName: 'Chapter 1: Patterns in Mathematics',
      pdfFileName: 'Class 6 Maths Chapter 1.pdf',
      reason: 'Equation Balance: Adding to one side instead of maintaining balance across equals sign.',
      suggestedActivity: 'Physical balance scale with weights and mystery cups.',
      estimatedMinutes: 30,
    },
  ],

  // Class 6
  '6-A': [
    {
      id: '6a-1',
      rank: 1,
      topicName: 'Place Value Carrying & Multi-Digit Operations',
      grade: 'Class 5 Prerequisite • Whole Numbers',
      chapterName: 'Chapter 3: Number Play & Arithmetic Operations',
      pdfFileName: 'Class 6 Maths Chapter 3.pdf',
      reason: 'Carrying Slips: Carrying errors when adding columns with multiple regroupings.',
      suggestedActivity: 'Base-10 block manipulatives and vertical column alignment grids.',
      estimatedMinutes: 35,
    },
    {
      id: '6a-2',
      rank: 2,
      topicName: 'Geometric Angle Classification & Protractor Usage',
      grade: 'Class 5 Prerequisite • Basic Shapes',
      chapterName: 'Chapter 2: Lines and Angles',
      pdfFileName: 'Class 6 Maths Chapter 2.pdf',
      reason: 'Angle Measurement: Confusing inner and outer scales on standard 180° protractors.',
      suggestedActivity: 'Hands-on angle measurement hunt using classroom clock faces.',
      estimatedMinutes: 40,
    },
    {
      id: '6a-3',
      rank: 3,
      topicName: 'Fractions as Division & Equivalent Fraction Generation',
      grade: 'Class 5 Prerequisite • Fractions',
      chapterName: 'Chapter 1: Patterns in Mathematics',
      pdfFileName: 'Class 6 Maths Chapter 1.pdf',
      reason: 'Fraction Fundamentals: Adding denominators directly when adding like fractions.',
      suggestedActivity: 'Fraction pizza slices and shaded grid comparison sheets.',
      estimatedMinutes: 40,
    },
  ],

  // Class 10
  '10-A': [
    {
      id: '10a-1',
      rank: 1,
      topicName: 'Pair of Linear Equations: Substitution & Elimination Methods',
      grade: 'Class 9 Prerequisite • Linear Polynomials',
      chapterName: 'Chapter 3: Pair of Linear Equations in Two Variables',
      pdfFileName: 'Class 10 Maths Chapter 3.pdf',
      reason: 'Simultaneous Equations: Algebraic sign mistakes when multiplying an equation by coefficient multipliers.',
      suggestedActivity: 'Paired equation elimination step-by-step template drills.',
      estimatedMinutes: 50,
    },
    {
      id: '10a-2',
      rank: 2,
      topicName: 'Quadratic Equation Roots by Factorisation & Quadratic Formula',
      grade: 'Class 9 Prerequisite • Polynomials',
      chapterName: 'Chapter 2: Polynomials',
      pdfFileName: 'Class 10 Maths Chapter 2.pdf',
      reason: 'Quadratic Roots: Misidentifying signs under the radical discriminant √(b² − 4ac).',
      suggestedActivity: 'Discriminant nature-of-roots sorting activity.',
      estimatedMinutes: 45,
    },
    {
      id: '10a-3',
      rank: 3,
      topicName: 'Real Numbers & Fundamental Theorem of Arithmetic',
      grade: 'Class 9 Prerequisite • Real Numbers',
      chapterName: 'Chapter 1: Real Numbers',
      pdfFileName: 'Class 10 Maths Chapter 1.pdf',
      reason: 'Proof Rigor: Proving irrationality of √p using proof by contradiction.',
      suggestedActivity: 'Structured contradiction proof templates and prime factor trees.',
      estimatedMinutes: 45,
    },
  ],
};

/**
 * Returns prioritized teaching topics specifically tailored
 * to the selected class and section in the dashboard.
 */
export function getTeachingPrioritiesForClass(cls, allAssessments = []) {
  if (!cls) return [];

  // Extract grade number: 6, 7, 8, 9, 10
  const rawGrade = String(cls.grade || '').trim();
  const rawName = String(cls.name || '').trim();
  const subject = String(cls.subject || 'Mathematics').trim();

  let gradeNum = 8;
  const gradeMatch =
    (rawGrade + ' ' + rawName).match(/(?:grade|class)\s*(\d+)/i) ||
    rawName.match(/\b([6-9]|10)\b/);
  if (gradeMatch) {
    gradeNum = parseInt(gradeMatch[1], 10);
  }

  // Extract section: A, B, C, D
  const sectionStr = getSectionDisplay(cls);
  const secMatch = sectionStr.match(/([A-D])/i);
  const secLetter = secMatch ? secMatch[1].toUpperCase() : 'A';

  // 1. Check exact Grade-Section key (e.g. '8-A', '8-B', '9-A', '7-C')
  const exactKey = `${gradeNum}-${secLetter}`;
  if (GRADE_SECTION_PRIORITIES[exactKey]) {
    const list = GRADE_SECTION_PRIORITIES[exactKey];
    return list.map((item, idx) => ({
      ...item,
      id: `${cls._id || cls.id || 'cls'}-${exactKey}-${item.id || idx + 1}`,
    }));
  }

  // 2. Check Grade-A fallback
  const gradeAKey = `${gradeNum}-A`;
  if (GRADE_SECTION_PRIORITIES[gradeAKey]) {
    const list = GRADE_SECTION_PRIORITIES[gradeAKey];
    return list.map((item, idx) => ({
      ...item,
      id: `${cls._id || cls.id || 'cls'}-${gradeAKey}-${item.id || idx + 1}`,
    }));
  }

  // 3. Subject-specific default priorities
  if (subject.toLowerCase().includes('social')) {
    return [
      {
        id: `${cls._id || cls.id || 'cls'}-soc-1`,
        rank: 1,
        topicName: `Map Scale Interpretation & Grid Coordinates (${cls.grade || 'Class 6'})`,
        grade: 'Foundational Social Science',
        chapterName: 'Chapter 1: The Earth and Maps',
        pdfFileName: 'Class 6 Social Studies Chapter 1.pdf',
        reason: 'Spatial Reasoning: Converting graphical map scale to actual distance measurements.',
        suggestedActivity: 'Topographic grid map navigation exercises measuring distance ratios.',
        estimatedMinutes: 40,
      },
      {
        id: `${cls._id || cls.id || 'cls'}-soc-2`,
        rank: 2,
        topicName: 'Chronological Timeline Sequences & Historical Source Analysis',
        grade: 'Foundational Social Science',
        chapterName: 'Chapter 2: History & Early Societies',
        pdfFileName: 'Class 6 Social Studies Chapter 2.pdf',
        reason: 'Chronological Ordering: Confusing BCE and CE event transitions on historical timelines.',
        suggestedActivity: 'Interactive classroom timeline plotting primary historical artifacts.',
        estimatedMinutes: 35,
      },
      {
        id: `${cls._id || cls.id || 'cls'}-soc-3`,
        rank: 3,
        topicName: 'Civic Institutions & Separation of Powers',
        grade: 'Foundational Social Science',
        chapterName: 'Chapter 3: Democratic Governance',
        pdfFileName: 'Class 6 Social Studies Chapter 3.pdf',
        reason: 'Conceptual civics: Distinguishing roles of legislature, executive, and judiciary.',
        suggestedActivity: 'Mock parliament debate assigning role-specific responsibilities.',
        estimatedMinutes: 45,
      },
    ];
  }

  if (subject.toLowerCase().includes('science')) {
    return [
      {
        id: `${cls._id || cls.id || 'cls'}-sci-1`,
        rank: 1,
        topicName: `Physical Quantities & Unit Conversions (${cls.grade || 'Class 8'})`,
        grade: 'Foundational Science',
        chapterName: 'Chapter 1: Measurement & Motion',
        pdfFileName: 'Class 8 Science Chapter 1.pdf',
        reason: 'Measurement Precision: Omitting standard SI unit conversions in speed and force calculations.',
        suggestedActivity: 'Hands-on laboratory measurement station drills.',
        estimatedMinutes: 40,
      },
      {
        id: `${cls._id || cls.id || 'cls'}-sci-2`,
        rank: 2,
        topicName: 'Chemical Valency & Formula Balancing',
        grade: 'Foundational Science',
        chapterName: 'Chapter 2: Chemical Substances',
        pdfFileName: 'Class 8 Science Chapter 2.pdf',
        reason: 'Chemical Notation: Criss-cross valency mistakes in binary compound formulas.',
        suggestedActivity: 'Valency puzzle piece assembly matching cations with anions.',
        estimatedMinutes: 45,
      },
      {
        id: `${cls._id || cls.id || 'cls'}-sci-3`,
        rank: 3,
        topicName: 'Cell Structure vs Organelle Functions',
        grade: 'Foundational Science',
        chapterName: 'Chapter 3: Living Organisms',
        pdfFileName: 'Class 8 Science Chapter 3.pdf',
        reason: 'Biological Systems: Confusing plant cell walls with cell membranes under microscope tests.',
        suggestedActivity: 'Interactive 3D cell model coloring and function labeling.',
        estimatedMinutes: 35,
      },
    ];
  }

  // Default Grade 8-A fallback
  return GRADE_SECTION_PRIORITIES['8-A'].map((item, idx) => ({
    ...item,
    id: `${cls._id || cls.id || 'cls'}-8a-${item.id || idx + 1}`,
  }));
}

export default {
  getSectionDisplay,
  getTeachingPrioritiesForClass,
};
