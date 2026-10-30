/**
 * Neev Platform - Client-Side PDF Document Generator
 * Generates genuine, compliant PDF 1.4 binary documents without external libraries.
 * These files open natively in Adobe Acrobat, Chrome, Firefox, Edge, and Preview.
 *
 * Implements strict ASCII sanitization to eliminate mojibake/garbled math symbols
 * and provides robust multi-page PDF generation with 5 distinct, dedicated reports:
 * 1. Student Gap Analysis Report (generateGapReportPdfBlob)
 * 2. Personalized Learning Roadmap (generateRoadmapPdfBlob)
 * 3. Syllabus Continuity & Prerequisite Impact Report (generateSyllabusContinuityPdfBlob)
 * 4. Diagnostic Practice Questions Paper for Student (generateQuestionsPdfBlob - NO solutions)
 * 5. Teacher Answer Key & Marking Guide (generateAnswerKeyPdfBlob - WITH model solutions)
 */

/**
 * Sanitizes all Unicode characters, mathematical symbols, superscripts, and currency
 * into clean, standard ASCII characters supported by standard Type 1 Helvetica font.
 */
export function sanitizeForPdf(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    // Mathematical operators & comparison
    .replace(/\u2212/g, '-') // Unicode minus sign
    .replace(/\u2013/g, '-') // En dash
    .replace(/\u2014/g, ' - ') // Em dash
    .replace(/\u2018|\u2019/g, "'") // Smart single quotes
    .replace(/\u201C|\u201D/g, '"') // Smart double quotes
    .replace(/\u00F7/g, ' / ') // Division sign
    .replace(/\u00D7/g, ' * ') // Multiplication sign
    .replace(/\u2022/g, '-') // Bullet point
    .replace(/\u20B9/g, 'Rs. ') // Rupee symbol
    .replace(/\u2260/g, '!=') // Not equal
    .replace(/\u2264/g, '<=') // Less than or equal
    .replace(/\u2265/g, '>=') // Greater than or equal
    .replace(/\u00B1/g, '+/-') // Plus-minus
    .replace(/\u221A/g, 'sqrt') // Square root
    .replace(/\u03C0/g, 'pi') // Greek pi
    .replace(/\u221E/g, 'infinity') // Infinity
    .replace(/\u2192/g, '->') // Right arrow
    .replace(/\u21D2/g, '=>') // Implies arrow

    // Superscripts to standard ASCII carets:
    .replace(/\u207B/g, '-') // Superscript minus
    .replace(/\u00B9/g, '^1')
    .replace(/\u00B2/g, '^2')
    .replace(/\u00B3/g, '^3')
    .replace(/\u2074/g, '^4')
    .replace(/\u2075/g, '^5')
    .replace(/\u2076/g, '^6')
    .replace(/\u2077/g, '^7')
    .replace(/\u2078/g, '^8')
    .replace(/\u2079/g, '^9')
    .replace(/\u2070/g, '^0')
    .replace(/\u1D50/g, '^m') // Superscript m
    .replace(/\u207F/g, '^n') // Superscript n
    .replace(/\u02E3/g, '^x') // Superscript x
    .replace(/\u02B8/g, '^y') // Superscript y

    // Subscripts:
    .replace(/\u2081/g, '_1')
    .replace(/\u2082/g, '_2')
    .replace(/\u2083/g, '_3')
    .replace(/\u2084/g, '_4')
    .replace(/\u2080/g, '_0')

    // Filter out any other non-printable or non-ASCII characters to prevent mojibake
    .replace(/[^\x20-\x7E\t]/g, '');
}

/**
 * Escapes characters that have special meaning inside PDF text literals
 * after applying strict ASCII sanitization.
 */
function escapePdfText(str) {
  if (!str) return '';
  const sanitized = sanitizeForPdf(str);
  return sanitized
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

/**
 * Wraps text into lines that fit within a maximum character count.
 */
export function wrapText(text, maxChars = 75) {
  if (!text) return [];
  const sanitized = sanitizeForPdf(text);
  const words = sanitized.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Builds a valid multi-page PDF 1.4 document containing the provided pages of text commands.
 *
 * @param {Array<Array<{ text: string, x: number, y: number, size?: number, font?: string }>>} pagesItems
 * @returns {Blob} Standard application/pdf Blob
 */
export function buildMultiPagePdfBlob(pagesItems = []) {
  if (!pagesItems || pagesItems.length === 0) {
    pagesItems = [[]];
  }

  const numPages = pagesItems.length;

  const kids = [];
  for (let i = 0; i < numPages; i++) {
    const pageObjNum = 5 + 2 * i;
    kids.push(`${pageObjNum} 0 R`);
  }

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${numPages} >>\nendobj\n`;
  const obj3 = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  const pageObjects = [];
  const contentObjects = [];

  for (let i = 0; i < numPages; i++) {
    const pageObjNum = 5 + 2 * i;
    const streamObjNum = 6 + 2 * i;
    const items = pagesItems[i] || [];

    let streamContent = 'BT\n';
    items.forEach((item) => {
      const font = item.font || 'F1';
      const size = item.size || 10;
      const safeText = escapePdfText(item.text);
      streamContent += `/${font} ${size} Tf\n`;
      streamContent += `1 0 0 1 ${item.x} ${item.y} Tm\n`;
      streamContent += `(${safeText}) Tj\n`;
    });
    streamContent += 'ET\n';

    const streamLength = streamContent.length;

    const pageObj = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjNum} 0 R >>\nendobj\n`;
    const streamObj = `${streamObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`;

    pageObjects.push(pageObj);
    contentObjects.push(streamObj);
  }

  const header = '%PDF-1.4\n';

  const objects = [obj1, obj2, obj3, obj4];
  for (let i = 0; i < numPages; i++) {
    objects.push(pageObjects[i]);
    objects.push(contentObjects[i]);
  }

  const totalObjs = objects.length;
  const offsets = [];
  let currentOffset = header.length;

  for (let i = 0; i < totalObjs; i++) {
    offsets.push(currentOffset);
    currentOffset += objects[i].length;
  }

  const xrefOffset = currentOffset;
  const pad = (num) => String(num).padStart(10, '0');

  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < totalObjs; i++) {
    xref += `${pad(offsets[i])} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPdf = header + objects.join('') + xref + trailer;
  return new Blob([fullPdf], { type: 'application/pdf' });
}

/**
 * Robust Page Layout Manager for multi-page documents.
 * Ensures automatic page breaking when text exceeds vertical bounds.
 */
class DocumentLayout {
  constructor(headerTitle, studentName, className) {
    this.headerTitle = headerTitle;
    this.studentName = studentName;
    this.className = className;
    this.pages = [];
    this.currentPage = [];
    this.y = 800;
  }

  ensureSpace(neededHeight) {
    if (this.y - neededHeight < 65) {
      this.newPage();
    }
  }

  newPage() {
    this.pages.push(this.currentPage);
    this.currentPage = [];
    this.y = 800;

    // Running sub-header on subsequent pages
    this.currentPage.push({
      text: sanitizeForPdf(this.headerTitle),
      x: 50,
      y: this.y,
      size: 10,
      font: 'F2',
    });
    this.currentPage.push({
      text: `Student: ${sanitizeForPdf(this.studentName)}   |   ${sanitizeForPdf(this.className)}`,
      x: 360,
      y: this.y,
      size: 8.5,
      font: 'F1',
    });
    this.y -= 26;
  }

  addText(text, x, size = 10, font = 'F1', lineSpacing = 14) {
    this.ensureSpace(lineSpacing);
    this.currentPage.push({ text: sanitizeForPdf(text), x, y: this.y, size, font });
    this.y -= lineSpacing;
  }

  addWrappedText(text, x, maxChars = 75, size = 9, font = 'F1', lineSpacing = 12) {
    const lines = wrapText(text, maxChars);
    lines.forEach((line) => {
      this.ensureSpace(lineSpacing);
      this.currentPage.push({ text: line, x, y: this.y, size, font });
      this.y -= lineSpacing;
    });
  }

  addDivider(lineSpacing = 16) {
    this.ensureSpace(lineSpacing);
    this.currentPage.push({
      text: '---------------------------------------------------------------------------------------------------------',
      x: 50,
      y: this.y,
      size: 7.5,
      font: 'F1',
    });
    this.y -= lineSpacing;
  }

  finish(footerLabel) {
    if (this.currentPage.length > 0) {
      this.pages.push(this.currentPage);
    }
    if (this.pages.length === 0) {
      this.pages = [[]];
    }
    const total = this.pages.length;
    this.pages.forEach((pageItems, idx) => {
      pageItems.push({
        text: sanitizeForPdf(`${footerLabel}  --  ${this.studentName} (${this.className})  --  Page ${idx + 1} of ${total}`),
        x: 60,
        y: 35,
        size: 8,
        font: 'F1',
      });
    });
    return buildMultiPagePdfBlob(this.pages);
  }
}

// ============================================================================
// 1. STUDENT LEARNING GAP ANALYSIS REPORT (Distinct Report 1)
// ============================================================================
export function generateGapReportPdfBlob({
  studentName = 'Student',
  examName = 'Assessment',
  className = 'Grade 8',
  subject = 'Mathematics',
  gapsData = [],
}) {
  const doc = new DocumentLayout('NEEV - STUDENT LEARNING GAP ANALYSIS REPORT', studentName, className);

  // Document Title Header
  doc.addText('NEEV - STUDENT LEARNING GAP ANALYSIS REPORT', 50, 13, 'F2', 18);
  doc.addText(`Student Name: ${studentName}`, 50, 10, 'F2', 14);
  doc.addText(`Date: ${new Date().toLocaleDateString()}   |   Target Assessment: ${examName}`, 50, 9.5, 'F1', 14);
  doc.addText(`Enrolled Class: ${className}   |   Subject: ${subject}`, 50, 9.5, 'F1', 20);

  // Executive Diagnostic Summary
  doc.addText('EXECUTIVE DIAGNOSTIC SUMMARY', 50, 11, 'F2', 14);
  const validGaps = (gapsData || []).filter((g) => {
    if (!g) return false;
    const clean = String(g.topicName || '').toLowerCase();
    return (
      clean !== '' &&
      !clean.includes('none observed') &&
      !clean.includes('no evident misconception') &&
      !clean.includes('correct understanding')
    );
  });

  doc.addWrappedText(
    `This report provides pedagogical evidence of prerequisite conceptual gaps diagnosed from student answer sheets in ${subject}. Foundational remediation is sequenced to rebuild essential competencies before advancing in the curriculum.`,
    50,
    78,
    9,
    'F1',
    12
  );
  doc.addText(`Total Foundational Gaps Diagnosed: ${validGaps.length}`, 50, 9.5, 'F2', 16);
  doc.addDivider(14);

  // Section 1: Detailed Prerequisite Gaps
  doc.addText('1. DETAILED PREREQUISITE GAP DIAGNOSTICS & EVIDENCE', 50, 11, 'F2', 16);

  if (validGaps.length === 0) {
    doc.addText('No critical prerequisite gaps identified. The student demonstrates solid curriculum mastery.', 60, 9.5, 'F1', 16);
  } else {
    validGaps.forEach((gap, idx) => {
      doc.ensureSpace(70);
      doc.addText(
        `Gap #${idx + 1}: ${gap.topicName} [${gap.grade || 'Foundational Prerequisite'}]`,
        55,
        10,
        'F2',
        14
      );

      if (gap.questionNumber) {
        doc.addText(`Evaluated Question: Question ${gap.questionNumber}   |   Status: ${gap.status || 'Verified from Answer Evidence'}`, 65, 8.5, 'F1', 12);
      }

      if (gap.evidence) {
        doc.addWrappedText(`Diagnostic Student Work Evidence: ${gap.evidence}`, 65, 74, 8.5, 'F1', 11);
      }

      if (gap.misconception) {
        doc.addWrappedText(`Conceptual Misconception: ${gap.misconception}`, 65, 74, 8.5, 'F2', 11);
      }

      if (gap.dependentTopics && gap.dependentTopics.length > 0) {
        doc.addWrappedText(`Impacted Syllabus Competencies: ${gap.dependentTopics.join(', ')}`, 65, 74, 8.5, 'F1', 12);
      }

      doc.y -= 6;
    });
  }

  doc.addDivider(16);

  // Section 2: Pedagogical Recommendations for Teachers & Parents
  doc.addText('2. RECOMMENDED TEACHER INTERVENTIONS & STUDY FOCUS', 50, 11, 'F2', 16);
  doc.addWrappedText(
    '1. Concrete Modeling: Revisit foundational concepts using concrete number lines and inverse operation balance scales.',
    60,
    76,
    9,
    'F1',
    13
  );
  doc.addWrappedText(
    '2. Error Dissection: Work through 2 contrasting examples illustrating the student slip versus the correct mathematical transformation.',
    60,
    76,
    9,
    'F1',
    13
  );
  doc.addWrappedText(
    '3. Retest Readiness: Complete the accompanying 2-mark diagnostic practice questions to verify conceptual retention.',
    60,
    76,
    9,
    'F1',
    18
  );

  // Section 3: Teacher Verification Sign-off
  doc.ensureSpace(50);
  doc.addText('3. TEACHER VERIFICATION & ACKNOWLEDGEMENT', 50, 11, 'F2', 16);
  doc.addText('Evaluated By: ___________________________        Teacher Signature: _______________________', 60, 9, 'F1', 16);
  doc.addText('Date Approved: __________________________        Review Checkpoint: _______________________', 60, 9, 'F1', 16);

  return doc.finish('Neev Student Learning Gap Analysis Report');
}

// ============================================================================
// 2. PERSONALIZED REMEDIATION LEARNING ROADMAP (Distinct Report 2)
// ============================================================================
export function generateRoadmapPdfBlob({
  studentName = 'Student',
  examName = 'Assessment',
  className = 'Grade 8',
  subject = 'Mathematics',
  roadmapData = [],
}) {
  const doc = new DocumentLayout('NEEV - PERSONALIZED REMEDIATION LEARNING ROADMAP', studentName, className);

  // Header Banner
  doc.addText('NEEV - PERSONALIZED REMEDIATION LEARNING ROADMAP', 50, 13, 'F2', 18);
  doc.addText(`Student Name: ${studentName}`, 50, 10, 'F2', 14);
  doc.addText(`Date: ${new Date().toLocaleDateString()}   |   Assessment Target: ${examName}`, 50, 9.5, 'F1', 14);
  doc.addText(`Class: ${className}   |   Subject: ${subject}   |   Ordering: Prerequisite-First Sequential`, 50, 9.5, 'F1', 20);

  // Roadmap Overview
  const validRoadmap = (roadmapData || []).filter((rm) => {
    if (!rm) return false;
    const clean = String(rm.topic || '').toLowerCase();
    return (
      clean !== '' &&
      !clean.includes('none observed') &&
      !clean.includes('no evident misconception') &&
      !clean.includes('correct understanding')
    );
  });

  const totalMinutes = validRoadmap.reduce((sum, item) => sum + (item.estimatedMinutes || 25), 0);
  const totalPractice = validRoadmap.reduce((sum, item) => sum + (item.practiceQuestions || 4), 0);

  doc.addText('REMEDIATION OVERVIEW & STUDY PLAN', 50, 11, 'F2', 14);
  doc.addText(
    `Total Milestones: ${validRoadmap.length} Sequenced Steps   |   Total Practice: ${totalPractice} Problems   |   Estimated Duration: ~${totalMinutes} Mins`,
    50,
    9.5,
    'F2',
    14
  );
  doc.addWrappedText(
    'This roadmap sequences remediation starting from foundational roots before progressing to dependent multi-step skills. Follow milestones in exact order for optimal mastery.',
    50,
    78,
    9,
    'F1',
    14
  );
  doc.addDivider(14);

  // Section 1: Sequenced Milestones
  doc.addText('1. ORDERED REMEDIATION MILESTONES', 50, 11, 'F2', 16);

  if (validRoadmap.length === 0) {
    doc.addText('All remediation milestones are currently completed.', 60, 9.5, 'F1', 16);
  } else {
    validRoadmap.forEach((item, idx) => {
      doc.ensureSpace(80);
      doc.addText(
        `Step ${item.rank || idx + 1}: ${item.topic} [${item.grade || 'Remediation Step'}]`,
        55,
        10,
        'F2',
        14
      );

      if (item.prereqChain) {
        doc.addText(`Prerequisite Dependency: ${item.prereqChain}`, 65, 8.5, 'F1', 12);
      }

      if (item.recommendedActivity) {
        doc.addWrappedText(`Recommended Study Activity: ${item.recommendedActivity}`, 65, 74, 8.5, 'F1', 11);
      }

      if (item.workedExamples) {
        doc.addWrappedText(`Worked Examples & Instruction: ${item.workedExamples}`, 65, 74, 8.5, 'F1', 11);
      }

      doc.addText(
        `Practice Assignment: ${item.practiceQuestions || 4} Targeted Problems   |   Time: ~${item.estimatedMinutes || 25} Mins`,
        65,
        8.5,
        'F2',
        12
      );

      doc.addText(
        'Progress Check:  [  ] Not Started        [  ] In Progress        [  ] Mastered',
        65,
        8.5,
        'F1',
        16
      );
    });
  }

  doc.addDivider(16);

  // Section 2: Structured Weekly Study Plan
  doc.addText('2. STRUCTURED TIMELINE & RETEST READINESS', 50, 11, 'F2', 16);
  doc.addWrappedText(
    'Phase 1 (Days 1 - 3): Review prerequisite chapters and complete guided worked examples for Step 1.',
    60,
    76,
    9,
    'F1',
    13
  );
  doc.addWrappedText(
    'Phase 2 (Days 4 - 6): Practice targeted independent problem sets for remaining milestones.',
    60,
    76,
    9,
    'F1',
    13
  );
  doc.addWrappedText(
    'Phase 3 (Day 7): Complete the Diagnostic Gap-Based Retest Paper (2 marks each) under teacher supervision.',
    60,
    76,
    9,
    'F1',
    18
  );

  // Section 3: Signatures
  doc.ensureSpace(50);
  doc.addText('3. ROADMAP COMPLETION COMMITMENT', 50, 11, 'F2', 16);
  doc.addText('Student Signature: _______________________        Parent Signature: _______________________', 60, 9, 'F1', 16);
  doc.addText('Teacher Supervisor: _____________________        Completion Target: _____________________', 60, 9, 'F1', 16);

  return doc.finish('Neev Personalized Learning Roadmap');
}

// ============================================================================
// 3. SYLLABUS CONTINUITY & PREREQUISITE IMPACT REPORT (Distinct Report 3)
// ============================================================================
export function generateSyllabusContinuityPdfBlob({
  studentName = 'Student',
  className = 'Grade 8',
  subject = 'Mathematics',
  examName = 'Assessment',
  gapsData = [],
  roadmapData = [],
}) {
  const doc = new DocumentLayout('NEEV - SYLLABUS CONTINUITY & DELAYED CHAPTERS REPORT', studentName, className);

  const isClass10 =
    className.includes('10') ||
    className.toLowerCase().includes('class 10') ||
    className.toLowerCase().includes('grade 10');

  // Header Banner
  doc.addText('NEEV - SYLLABUS CONTINUITY & PREREQUISITE GAP REPORT', 50, 13, 'F2', 18);
  doc.addText(`Student Name: ${studentName}`, 50, 10, 'F2', 14);
  doc.addText(`Date: ${new Date().toLocaleDateString()}   |   Subject: ${subject}`, 50, 9.5, 'F1', 14);
  doc.addText(`Enrolled Class: ${className}   |   Examination Scope: ${examName}`, 50, 9.5, 'F1', 20);

  // Section 1: Previous Class Delayed Chapters
  doc.addText('1. PREVIOUS CLASS PREREQUISITE CHAPTERS REQUIRING REVISION', 50, 11, 'F2', 16);

  const validGaps = (gapsData || []).filter((g) => g.prerequisiteLesson);

  if (validGaps.length === 0) {
    doc.addText('No delayed prerequisite curriculum topics identified from previous grades.', 60, 9.5, 'F1', 16);
  } else {
    validGaps.forEach((gap, idx) => {
      doc.ensureSpace(65);
      const p = gap.prerequisiteLesson;
      const gradeText = p.grade || 'Previous Grade';
      const chNum = p.chapterNumber || (idx + 1);

      doc.addText(
        `Item ${idx + 1}: ${gradeText} -- Chapter ${chNum}: ${p.chapterName}`,
        55,
        10,
        'F2',
        14
      );

      doc.addWrappedText(`Core Delayed Concept: ${p.concept || gap.topicName}`, 65, 74, 8.5, 'F1', 11);

      if (p.pdfFileName || p.fileName) {
        doc.addText(`NCERT Textbook Reference: ${p.pdfFileName || p.fileName}`, 65, 8.5, 'F2', 11);
      }

      if (p.studyTip) {
        doc.addWrappedText(`Study & Remediation Tip: ${p.studyTip}`, 65, 74, 8, 'F1', 11);
      }

      doc.y -= 4;
    });
  }

  doc.addDivider(16);

  // Section 2: Future Affecting Chapters up to Class 10
  doc.addText('2. DOWNSTREAM CHAPTERS AFFECTED IN FUTURE GRADES (UP TO CLASS 10)', 50, 11, 'F2', 16);

  if (isClass10) {
    doc.addText('* Class 10 Board Examination Impact:', 60, 9.5, 'F2', 13);
    doc.addWrappedText(
      'Direct risk of mark loss in CBSE / State Board Examination questions and internal assessments.',
      70,
      74,
      8.5,
      'F1',
      12
    );

    doc.addText('* Senior Secondary (Class 11 & Class 12) Advisory:', 60, 9.5, 'F2', 13);
    doc.addWrappedText(
      'Conceptual gaps will impact Higher Secondary STEM, Commerce with Math, and calculus coursework. (Detailed Class 11 and Class 12 chapters are not mapped as curriculum branches into elective streams). Focus immediately on Class 10 Board exam syllabus resolution.',
      70,
      74,
      8.5,
      'F1',
      16
    );
  } else {
    const futureLessonsMap = new Map();
    validGaps.forEach((g) => {
      (g.futureLessonsAffected || []).forEach((f) => {
        const fGrade = String(f.grade || '').toLowerCase();
        if (fGrade.includes('11') || fGrade.includes('12')) return;
        const key = `${f.grade}_${f.lessonName}`;
        if (!futureLessonsMap.has(key)) {
          futureLessonsMap.set(key, f);
        }
      });
    });

    const futureLessons = Array.from(futureLessonsMap.values());

    if (futureLessons.length === 0) {
      doc.addText('Class 9 and Class 10 core chapters protected with proactive foundational remediation.', 60, 9.5, 'F1', 16);
    } else {
      futureLessons.forEach((f) => {
        doc.ensureSpace(35);
        doc.addText(`* ${f.grade}: ${f.lessonName}`, 60, 9.5, 'F2', 13);
        doc.addWrappedText(`Curriculum Dependency Risk: ${f.risk || 'Essential foundation for multi-step problems.'}`, 70, 74, 8, 'F1', 11);
      });
    }
  }

  doc.addDivider(16);

  // Section 3: Curriculum Continuity Sign-off
  doc.ensureSpace(50);
  doc.addText('3. CURRICULUM CONTINUITY APPROVAL', 50, 11, 'F2', 16);
  doc.addText('Evaluated By: ___________________________        Teacher Signature: _______________________', 60, 9, 'F1', 16);
  doc.addText('Academic Coordinator: ____________________        Date: ___________________________________', 60, 9, 'F1', 16);

  return doc.finish('Neev Syllabus Continuity Plan');
}

// ============================================================================
// 4. DIAGNOSTIC PRACTICE QUESTIONS PAPER FOR STUDENT (Distinct Report 4)
//    Contains ONLY questions & generous workspace for student (NO solutions)
// ============================================================================
export function generateQuestionsPdfBlob({
  studentName = 'Student',
  examName = 'Diagnostic Retest',
  className = 'Grade 8',
  subject = 'Mathematics',
  testQuestions = [],
}) {
  const doc = new DocumentLayout('NEEV - DIAGNOSTIC GAP-BASED PRACTICE QUESTIONS PAPER', studentName, className);

  const safeQuestions = Array.isArray(testQuestions) ? testQuestions : [];
  const totalQuestions = safeQuestions.length;
  const totalMarks = totalQuestions * 2;

  // Header Banner
  doc.addText('NEEV - DIAGNOSTIC GAP-BASED PRACTICE QUESTIONS PAPER', 50, 13, 'F2', 18);
  doc.addText(`Student Name: ${studentName}`, 50, 10, 'F2', 14);
  doc.addText(`Date: ${new Date().toLocaleDateString()}   |   Time Allowed: ~30 Minutes`, 50, 9.5, 'F1', 14);
  doc.addText(`Class: ${className}   |   Subject: ${subject}   |   Total Marks: ${totalMarks} (${totalQuestions} Questions @ 2 Marks Each)`, 50, 9.5, 'F2', 20);

  // Student Instructions
  doc.addText('GENERAL INSTRUCTIONS FOR STUDENTS:', 50, 10.5, 'F2', 14);
  doc.addText('1. Answer all questions in the space provided below each question.', 60, 9, 'F1', 12);
  doc.addText('2. Each question carries strictly 2 marks.', 60, 9, 'F1', 12);
  doc.addText('3. Show complete step-by-step mathematical reasoning. Rough work must not be erased.', 60, 9, 'F1', 16);
  doc.addDivider(14);

  // Questions with student workspace
  safeQuestions.forEach((q, idx) => {
    doc.ensureSpace(120);

    doc.addText(`Question ${idx + 1} (2 Marks) [${q.type || 'Short Answer'}]`, 50, 10.5, 'F2', 14);
    doc.addWrappedText(q.prompt, 60, 78, 10, 'F1', 13);

    if (q.targetConcept) {
      doc.addText(`Remediation Focus: ${q.targetConcept}`, 60, 8.5, 'F1', 13);
    }

    // Student Workspace: Clear lines for working out the problem
    doc.addText('[ Workspace / Show your working below ]', 60, 8, 'F2', 12);
    doc.addText('_________________________________________________________________________________________', 60, 8, 'F1', 18);
    doc.addText('_________________________________________________________________________________________', 60, 8, 'F1', 18);
    doc.addText('_________________________________________________________________________________________', 60, 8, 'F1', 18);
    doc.addText('Final Answer: ________________________________________      [ Marks Awarded: _____ / 2 ]', 60, 8.5, 'F2', 24);
  });

  return doc.finish('Neev Student Practice Paper');
}

// ============================================================================
// 5. TEACHER ANSWER KEY & MARKING GUIDE (Distinct Report 5)
//    Confidential teacher document with step-by-step model solutions & mark rubrics
// ============================================================================
export function generateAnswerKeyPdfBlob({
  studentName = 'Student',
  examName = 'Diagnostic Retest',
  className = 'Grade 8',
  subject = 'Mathematics',
  testQuestions = [],
}) {
  const doc = new DocumentLayout('NEEV - TEACHER MARKING KEY & DIAGNOSTIC EVALUATION GUIDE', studentName, className);

  const safeQuestions = Array.isArray(testQuestions) ? testQuestions : [];
  const totalQuestions = safeQuestions.length;
  const totalMarks = totalQuestions * 2;

  // Header Banner
  doc.addText('NEEV - TEACHER ANSWER KEY & MARKING GUIDE', 50, 13, 'F2', 16);
  doc.addText('CONFIDENTIAL - STRICTLY FOR TEACHER / EVALUATOR REFERENCE ONLY', 50, 9.5, 'F2', 16);
  doc.addText(`Target Student: ${studentName}   |   Date: ${new Date().toLocaleDateString()}`, 50, 9.5, 'F1', 14);
  doc.addText(`Class: ${className}   |   Subject: ${subject}   |   Total Marks: ${totalMarks} (${totalQuestions} Questions @ 2 Marks Each)`, 50, 9.5, 'F2', 20);

  // Evaluation Philosophy
  doc.addText('TEACHER SCORING RUBRIC & EVALUATION PRINCIPLES:', 50, 10.5, 'F2', 14);
  doc.addText('1. Standard Allocation: 1 Mark for correct method / algebraic setup; 1 Mark for accurate final value.', 60, 9, 'F1', 12);
  doc.addText('2. Partial Credit Policy: If student sets up correct equation but makes an arithmetic slip, award 1 Mark.', 60, 9, 'F1', 12);
  doc.addText('3. Misconception Verification: Note whether the student exhibits the anticipated misconception listed below.', 60, 9, 'F1', 16);
  doc.addDivider(14);

  // Questions with Model Solutions & Mark Allocations
  safeQuestions.forEach((q, idx) => {
    doc.ensureSpace(120);

    doc.addText(`Question ${idx + 1} (2 Marks) -- TEACHER MARKING KEY`, 50, 10.5, 'F2', 14);
    doc.addWrappedText(`Question Prompt: ${q.prompt}`, 60, 78, 9.5, 'F1', 13);

    if (q.targetConcept) {
      doc.addText(`Target Prerequisite Skill: ${q.targetConcept}`, 60, 8.5, 'F1', 12);
    }

    // Step-by-step Model Solution
    const solutionText =
      q.expectedAnswer && q.expectedAnswer !== '(Rubric exemplar solution)' && q.expectedAnswer.trim()
        ? q.expectedAnswer.trim()
        : synthesizeModelSolution(q.prompt);

    doc.addText('Model Step-by-Step Solution:', 60, 9, 'F2', 12);
    doc.addWrappedText(solutionText, 65, 76, 9, 'F1', 12);

    // Marks Breakdown
    doc.addText('Mark Breakdown (2 Marks Total):', 60, 8.5, 'F2', 11);
    doc.addText('  * Step 1 (1 Mark): Correct method, transposition, or formula substitution.', 65, 8.5, 'F1', 11);
    doc.addText('  * Step 2 (1 Mark): Accurate final computation, unit, and statement.', 65, 8.5, 'F1', 12);

    // Misconception Alert
    const warning = synthesizeMisconceptionWarning(q.prompt, q.targetConcept);
    doc.addWrappedText(`Misconception Alert: ${warning}`, 60, 76, 8.5, 'F2', 12);

    if (q.prerequisiteChapter || q.syllabusTopic) {
      doc.addText(`NCERT Anchor: ${q.prerequisiteChapter || q.syllabusTopic}`, 60, 8, 'F1', 16);
    } else {
      doc.y -= 4;
    }
  });

  doc.addDivider(16);

  // Evaluator Sign-off
  doc.ensureSpace(50);
  doc.addText('TEACHER DIAGNOSTIC CONFIRMATION', 50, 11, 'F2', 16);
  doc.addText('Total Marks Awarded: _____ / ' + totalMarks + '        Retest Status: [  ] Passed (Gap Resolved)    [  ] Further Practice Needed', 60, 9, 'F2', 16);
  doc.addText('Teacher Signature: _______________________        Evaluation Date: _______________________', 60, 9, 'F1', 16);

  return doc.finish('Neev Teacher Reference Key - CONFIDENTIAL');
}

/**
 * Helper to ensure a concrete mathematical model solution is always available.
 */
function synthesizeModelSolution(prompt = '') {
  const p = prompt.toLowerCase();
  if (p.includes('8 - (-15)') || p.includes('(-15) + (-6)')) {
    return 'Step 1: 8 - (-15) + (-6) = 8 + 15 - 6 [1 Mark]\nStep 2: 23 - 6 = 17 [1 Mark]';
  }
  if (p.includes('4m - 9 = 27')) {
    return 'Step 1: 4m = 27 + 9 => 4m = 36 [1 Mark]\nStep 2: m = 36 / 4 => m = 9 [1 Mark]';
  }
  if (p.includes('-3(4x - 5)') || p.includes('4x - 5')) {
    return 'Step 1: Distribute -3: -3 * 4x + (-3 * -5) = -12x + 15 [1 Mark]\nStep 2: Combine like terms: -12x + 15 + 2x = -10x + 15 [1 Mark]';
  }
  if (p.includes('3(x + 4) = 2x + 18')) {
    return 'Step 1: Expand brackets: 3x + 12 = 2x + 18 => 3x - 2x = 18 - 12 [1 Mark]\nStep 2: x = 6 [1 Mark]';
  }
  if (p.includes('5^m') || p.includes('exponents')) {
    return 'Step 1: 5^(m - (-3)) = 5^5 => 5^(m + 3) = 5^5 [1 Mark]\nStep 2: Equate exponents: m + 3 = 5 => m = 2 [1 Mark]';
  }
  if (p.includes('16b^2 - 49')) {
    return 'Step 1: Recognize identity: (4b)^2 - 7^2 [1 Mark]\nStep 2: Apply (a - b)(a + b) = (4b - 7)(4b + 7) [1 Mark]';
  }
  if (p.includes('5x - 3 = 3x + 7')) {
    return 'Step 1: 5x - 3x = 7 + 3 => 2x = 10 [1 Mark]\nStep 2: x = 5; Verification: LHS = 22, RHS = 22 [1 Mark]';
  }
  return 'Step 1: Apply appropriate algebraic transformation or formula [1 Mark]\nStep 2: Execute arithmetic computation accurately to obtain the final value [1 Mark]';
}

/**
 * Helper to provide targeted misconception warnings for teachers.
 */
function synthesizeMisconceptionWarning(prompt = '', concept = '') {
  const p = (prompt + ' ' + concept).toLowerCase();
  if (p.includes('integer') || p.includes('negative')) {
    return 'Student may drop the double-negative brackets without converting to positive (-(-a) to -a). Check intermediate signs.';
  }
  if (p.includes('distributive') || p.includes('parenthes')) {
    return 'Student frequently distributes to the first term only and forgets to multiply the second term inside parentheses.';
  }
  if (p.includes('exponent') || p.includes('power')) {
    return 'Student may attempt to multiply the base or equate exponents without first converting both sides to equal bases.';
  }
  if (p.includes('transpos') || p.includes('equation')) {
    return 'Student may move a term across the equals sign without reversing its arithmetic sign (e.g. + to -).';
  }
  return 'Verify that the student shows complete algebraic steps and does not jump directly to an unverified guess.';
}

export default {
  sanitizeForPdf,
  wrapText,
  buildMultiPagePdfBlob,
  generateQuestionsPdfBlob,
  generateAnswerKeyPdfBlob,
  generateGapReportPdfBlob,
  generateRoadmapPdfBlob,
  generateSyllabusContinuityPdfBlob,
};
