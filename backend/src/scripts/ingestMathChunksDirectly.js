import 'dotenv/config';
import crypto from 'crypto';
import connectDB, { disconnectDB } from '../config/db.js';
import Teacher from '../models/Teacher.js';
import SyllabusDocument from '../models/SyllabusDocument.js';
import SyllabusChunk from '../models/SyllabusChunk.js';

const mathChapters = [
  {
    fileName: 'Class 6 Maths Chapter 1.pdf',
    grade: 'Grade 6',
    subject: 'Mathematics',
    lessonName: 'Patterns in Mathematics & Number Foundations',
    chunks: [
      'Chapter 1: Patterns in Mathematics & Number Foundations. Natural numbers, whole numbers, and consecutive number sequences. Identifying repeating numerical sequences and geometric shape tessellations.',
      'Place value system, Indian and International numeration systems, commas placement, and estimating sums/differences through rounding off.'
    ]
  },
  {
    fileName: 'Class 6 Maths Chapter 2.pdf',
    grade: 'Grade 6',
    subject: 'Mathematics',
    lessonName: 'Lines, Angles and Plane Shapes',
    chunks: [
      'Chapter 2: Lines, Angles and Plane Shapes. Basic geometric ideas: points, line segments, rays, parallel and intersecting lines. Angles: acute, right, obtuse, straight, and reflex angles.',
      'Polygons and plane figures: triangles, quadrilaterals, rectangles, and squares. Properties of rectangles: opposite sides equal, all angles 90 degrees, and Pythagoras relation in right-angled triangles where diagonal^2 = length^2 + width^2.'
    ]
  },
  {
    fileName: 'Class 6 Maths Chapter 3.pdf',
    grade: 'Grade 6',
    subject: 'Mathematics',
    lessonName: 'Number Play & Arithmetic Operations',
    chunks: [
      'Chapter 3: Number Play & Arithmetic Operations. BODMAS order of operations: Brackets, Orders/Exponents, Division and Multiplication (left-to-right), Addition and Subtraction (left-to-right).',
      'Operations with positive and negative signed integers on the number line. Rules for addition and subtraction of integers with carrying and regrouping.'
    ]
  },
  {
    fileName: 'Class 7 Maths Chapter 1.pdf',
    grade: 'Grade 7',
    subject: 'Mathematics',
    lessonName: 'Large Numbers & Comparing Quantities',
    chunks: [
      'Chapter 1: Large Numbers & Comparing Quantities. Ratios, percentages, and fractional conversions. Commercial mathematics: cost price, selling price, profit and loss percentages.',
      'Simple Interest formula: SI = (P * R * T) / 100, where P is principal amount, R is annual interest rate, and T is time in years. Total amount A = P + SI.'
    ]
  },
  {
    fileName: 'Class 7 Maths Chapter 2.pdf',
    grade: 'Grade 7',
    subject: 'Mathematics',
    lessonName: 'Simple Expressions and Equations',
    chunks: [
      'Chapter 2: Simple Expressions and Equations. Algebraic balance scale principle: an equation remains valid if identical operations are performed on both LHS and RHS. Transposition of variables and constants across equals sign with sign reversal (+ becomes -, - becomes +, * becomes /).',
      'Solving linear equations in one variable: step-by-step isolation of the unknown variable x and numerical substitution into LHS and RHS for verification.'
    ]
  },
  {
    fileName: 'Class 7 Maths Chapter 3.pdf',
    grade: 'Grade 7',
    subject: 'Mathematics',
    lessonName: 'Fractions, Decimals & Rational Numbers',
    chunks: [
      'Chapter 3: Fractions, Decimals & Rational Numbers. Operations on rational numbers p/q (q != 0). Addition, subtraction, multiplication, and reciprocal division of fractions.',
      'Converting terminating and non-terminating recurring decimals into standard rational form.'
    ]
  },
  {
    fileName: 'Class 8 Maths Chapter 1.pdf',
    grade: 'Grade 8',
    subject: 'Mathematics',
    lessonName: 'Rational Numbers & Real Number Properties',
    chunks: [
      'Chapter 1: Rational Numbers. Closure, commutativity, associativity, and distributivity properties for addition and multiplication of rational numbers.',
      'Additive identity (0), multiplicative identity (1), additive inverse (-a/b), and multiplicative inverse/reciprocal (b/a). Representation of rational numbers on the continuous number line.'
    ]
  },
  {
    fileName: 'Class 8 Maths Chapter 2.pdf',
    grade: 'Grade 8',
    subject: 'Mathematics',
    lessonName: 'Power Play (Exponents & Powers)',
    chunks: [
      'Chapter 2: Power Play (Exponents & Powers). Laws of integral exponents: a^m * a^n = a^(m+n); a^m / a^n = a^(m-n); (a^m)^n = a^(mn); a^0 = 1; negative exponent law a^(-n) = 1 / (a^n).',
      'Solving exponential equations by equating powers of common bases: if b^x = b^y (where b != 0, 1, -1), then x = y. Standard scientific exponential notation for small and large numbers.'
    ]
  },
  {
    fileName: 'Class 8 Maths Chapter 3.pdf',
    grade: 'Grade 8',
    subject: 'Mathematics',
    lessonName: 'Algebraic Expressions, Identities & Factorisation',
    chunks: [
      'Chapter 3: Algebraic Expressions, Identities & Factorisation. Polynomial terminology: monomials, binomials, trinomials, and polynomials. Addition and multiplication of algebraic terms.',
      'Standard algebraic identities: (a + b)^2 = a^2 + 2ab + b^2; (a - b)^2 = a^2 - 2ab + b^2; difference of squares a^2 - b^2 = (a - b)(a + b). Factoring by taking out common monomial factors and grouping binomial terms.'
    ]
  },
  {
    fileName: 'Class 9 Maths Chapter 1.pdf',
    grade: 'Grade 9',
    subject: 'Mathematics',
    lessonName: 'Coordinate Geometry & Real Numbers',
    chunks: [
      'Chapter 1: Coordinate Geometry & Real Numbers. Cartesian coordinate plane: x-axis (abscissa), y-axis (ordinate), origin (0,0), and four quadrants.',
      'Locating points (x, y) and calculating distance between points derived from the Pythagoras theorem: d = sqrt((x2 - x1)^2 + (y2 - y1)^2).'
    ]
  },
  {
    fileName: 'Class 9 Maths Chapter 2.pdf',
    grade: 'Grade 9',
    subject: 'Mathematics',
    lessonName: 'Polynomials & Factor Theorem',
    chunks: [
      'Chapter 2: Polynomials & Factor Theorem. Degree of a polynomial, zeros of a polynomial p(x), Remainder Theorem, and Factor Theorem.',
      'Splitting the middle term method for quadratic trinomials ax^2 + bx + c and algebraic cubic polynomial factorisation.'
    ]
  },
  {
    fileName: 'Class 10 Maths Chapter 1.pdf',
    grade: 'Grade 10',
    subject: 'Mathematics',
    lessonName: 'Real Numbers & Fundamental Theorem of Arithmetic',
    chunks: [
      'Chapter 1: Real Numbers & Fundamental Theorem of Arithmetic. Every composite number can be expressed (factorised) uniquely as a product of primes.',
      'Computing HCF and LCM using prime factorisation: HCF(a, b) * LCM(a, b) = a * b. Proving irrationality of sqrt(2), sqrt(3), and sqrt(5) by contradiction.'
    ]
  },
  {
    fileName: 'Class 10 Maths Chapter 2.pdf',
    grade: 'Grade 10',
    subject: 'Mathematics',
    lessonName: 'Polynomials & Quadratic Equations',
    chunks: [
      'Chapter 2: Polynomials & Quadratic Equations. Relationship between zeros and coefficients of quadratic polynomial ax^2 + bx + c: alpha + beta = -b/a, alpha * beta = c/a.',
      'Standard quadratic equation ax^2 + bx + c = 0, discriminant D = b^2 - 4ac, and nature of real and distinct roots.'
    ]
  },
  {
    fileName: 'Class 10 Maths Chapter 3.pdf',
    grade: 'Grade 10',
    subject: 'Mathematics',
    lessonName: 'Pair of Linear Equations in Two Variables',
    chunks: [
      'Chapter 3: Pair of Linear Equations in Two Variables. Graphical and algebraic methods of solving simultaneous equations: substitution method, elimination method, and cross-multiplication.',
      'Consistency criteria: intersecting lines (unique solution, a1/a2 != b1/b2), coincident lines (infinitely many solutions), parallel lines (no solution).'
    ]
  }
];

async function run() {
  await connectDB();
  const teacher = await Teacher.findOne({ email: 'neev123@gmail.com' });
  if (!teacher) {
    console.error('Teacher neev123@gmail.com not found');
    await disconnectDB();
    return;
  }

  console.log(`Ingesting Mathematics syllabus chunks for teacher: ${teacher.name} (${teacher._id})`);

  let totalChunks = 0;
  for (const ch of mathChapters) {
    let doc = await SyllabusDocument.findOne({
      teacherId: teacher._id,
      fileName: ch.fileName
    });

    if (!doc) {
      doc = await SyllabusDocument.create({
        teacherId: teacher._id,
        title: ch.lessonName,
        fileName: ch.fileName,
        originalFileName: ch.fileName,
        storageKey: `curriculum/${ch.fileName}`,
        storageProvider: 'local',
        storageBucket: 'neev-curriculum',
        mimeType: 'application/pdf',
        fileSize: 4000,
        fileHash: crypto.createHash('md5').update(ch.fileName).digest('hex'),
        grade: ch.grade,
        subject: ch.subject,
        status: 'completed'
      });
    }

    for (let i = 0; i < ch.chunks.length; i++) {
      const text = ch.chunks[i];
      const chunkId = `math_${ch.fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`;
      const contentHash = crypto.createHash('md5').update(text).digest('hex');

      await SyllabusChunk.findOneAndUpdate(
        { chunkId },
        {
          chunkId,
          documentId: doc._id,
          teacherId: teacher._id,
          grade: ch.grade,
          subject: ch.subject,
          lessonName: ch.lessonName,
          sourceFileName: ch.fileName,
          pageNumber: i + 1,
          pageRange: `${i + 1}`,
          chunkIndex: i,
          chunkText: text,
          contentHash,
          status: 'indexed'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      totalChunks++;
    }
  }

  console.log(`Successfully indexed ${totalChunks} Mathematics syllabus chunks in MongoDB Atlas!`);
  await disconnectDB();
}

run().catch(console.error);

