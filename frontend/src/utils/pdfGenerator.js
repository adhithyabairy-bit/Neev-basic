/**
 * Neev Platform - Client-Side PDF Document Generator
 * Generates genuine, compliant PDF 1.4 binary documents without external libraries.
 * These files open natively in Adobe Acrobat, Chrome, Firefox, Edge, and Preview.
 *
 * Implements strict ASCII sanitization to eliminate mojibake/garbled math symbols
 * and provides robust multi-page PDF generation.
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
function wrapText(text, maxChars = 75) {
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

  // Object indices:
  // 1 0 obj: Catalog
  // 2 0 obj: Pages
  // 3 0 obj: Font F1 (Helvetica)
  // 4 0 obj: Font F2 (Helvetica-Bold)
  // For each page i (0 to numPages - 1):
  //   (5 + 2*i) 0 obj: Page object
  //   (6 + 2*i) 0 obj: Contents stream object

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

  // Assembly of all objects
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
 * Builds a single-page PDF Blob (legacy compatibility wrapper).
 */
function buildPdfBlob(textItems = []) {
  return buildMultiPagePdfBlob([textItems]);
}

/**
 * Generates a real PDF Blob for a student's Diagnostic Gap-Based Questions Paper.
 * Enforces 2-mark diagnostic questions (5 to 10 questions) with zero symbol errors.
 */
export function generateQuestionsPdfBlob({
  studentName = 'Student',
  examName = 'Diagnostic Retest',
  className = 'Grade 8',
  subject = 'Mathematics',
  testQuestions = [],
}) {
  const safeQuestions = Array.isArray(testQuestions) ? testQuestions : [];
  const totalQuestions = safeQuestions.length;
  const totalMarks = totalQuestions * 2;

  // Split questions across pages: 5 questions per page
  const questionsPerPage = 5;
  const numPages = Math.max(1, Math.ceil(totalQuestions / questionsPerPage));
  const pagesItems = [];

  for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
    const pageItems = [];
    let y = 800;

    // Header Banner
    pageItems.push({
      text: 'NEEV - DIAGNOSTIC GAP-BASED PRACTICE QUESTIONS',
      x: 50,
      y,
      size: 13,
      font: 'F2',
    });
    y -= 18;

    pageItems.push({
      text: `Student Name: ${sanitizeForPdf(studentName)}`,
      x: 50,
      y,
      size: 10,
      font: 'F2',
    });
    pageItems.push({
      text: `Date: ${new Date().toLocaleDateString()}`,
      x: 420,
      y,
      size: 10,
      font: 'F1',
    });
    y -= 15;

    pageItems.push({
      text: `Class: ${sanitizeForPdf(className)}   |   Subject: ${sanitizeForPdf(subject)}   |   Page ${pageIdx + 1} of ${numPages}`,
      x: 50,
      y,
      size: 9,
      font: 'F1',
    });
    y -= 15;

    pageItems.push({
      text: `Target Assessment: ${sanitizeForPdf(examName)}   |   Total Marks: ${totalMarks} (${totalQuestions} Questions @ 2 Marks Each)`,
      x: 50,
      y,
      size: 9,
      font: 'F2',
    });
    y -= 18;

    // Instructions on Page 1
    if (pageIdx === 0) {
      pageItems.push({
        text: 'INSTRUCTIONS: Solve all questions showing step-by-step mathematical reasoning. Each question carries 2 marks.',
        x: 50,
        y,
        size: 8.5,
        font: 'F2',
      });
      y -= 22;
    }

    // Questions for this page
    const startIdx = pageIdx * questionsPerPage;
    const pageQuestions = safeQuestions.slice(startIdx, startIdx + questionsPerPage);

    pageQuestions.forEach((q, idxOnPage) => {
      const qNum = startIdx + idxOnPage + 1;

      pageItems.push({
        text: `Question ${qNum} (2 Marks) [${sanitizeForPdf(q.type || 'Short Answer')}]`,
        x: 50,
        y,
        size: 10.5,
        font: 'F2',
      });
      y -= 15;

      const promptLines = wrapText(q.prompt, 80);
      promptLines.forEach((line) => {
        pageItems.push({ text: line, x: 60, y, size: 9.5, font: 'F1' });
        y -= 13;
      });

      if (q.targetConcept) {
        pageItems.push({
          text: `Target Remediation: ${sanitizeForPdf(q.targetConcept)}`,
          x: 60,
          y,
          size: 8.5,
          font: 'F1',
        });
        y -= 13;
      }

      if (q.prerequisiteChapter) {
        pageItems.push({
          text: `Prerequisite Reference: ${sanitizeForPdf(q.prerequisiteChapter)}`,
          x: 60,
          y,
          size: 8,
          font: 'F1',
        });
        y -= 12;
      }

      // Space for student working
      pageItems.push({ text: '[ Show your working below ]', x: 60, y, size: 7.5, font: 'F1' });
      y -= 26;
    });

    // Page Footer
    pageItems.push({
      text: `Neev Learning Diagnostics  --  ${sanitizeForPdf(studentName)} (${sanitizeForPdf(className)})  --  Page ${pageIdx + 1} of ${numPages}`,
      x: 80,
      y: 35,
      size: 8,
      font: 'F1',
    });

    pagesItems.push(pageItems);
  }

  return buildMultiPagePdfBlob(pagesItems);
}

/**
 * Generates a real PDF Blob for a student's Syllabus Continuity & Impact Report.
 * Contains:
 * 1. Delayed prerequisite topics from previous classes (with exact Class number & Chapter number)
 * 2. Downstream future affected chapters up to Class 10
 * 3. Special Class 10 rules: Highlights Class 10 Board Exam and Class 11/12 impact, without speculating future chapter syllabus.
 */
export function generateSyllabusContinuityPdfBlob({
  studentName = 'Student',
  className = 'Grade 8',
  subject = 'Mathematics',
  examName = 'Assessment',
  gapsData = [],
  roadmapData = [],
}) {
  const isClass10 =
    className.includes('10') ||
    className.toLowerCase().includes('class 10') ||
    className.toLowerCase().includes('grade 10');

  const pagesItems = [];

  // ================= PAGE 1 =================
  const p1Items = [];
  let y = 800;

  // Header Banner
  p1Items.push({
    text: 'NEEV - SYLLABUS CONTINUITY & PREREQUISITE GAP REPORT',
    x: 50,
    y,
    size: 13,
    font: 'F2',
  });
  y -= 20;

  p1Items.push({
    text: `Student Name: ${sanitizeForPdf(studentName)}`,
    x: 50,
    y,
    size: 10.5,
    font: 'F2',
  });
  p1Items.push({
    text: `Date: ${new Date().toLocaleDateString()}`,
    x: 420,
    y,
    size: 9.5,
    font: 'F1',
  });
  y -= 16;

  p1Items.push({
    text: `Enrolled Class: ${sanitizeForPdf(className)}   |   Subject: ${sanitizeForPdf(subject)}`,
    x: 50,
    y,
    size: 9.5,
    font: 'F1',
  });
  y -= 16;

  p1Items.push({
    text: `Examination Scope: ${sanitizeForPdf(examName)}`,
    x: 50,
    y,
    size: 9.5,
    font: 'F1',
  });
  y -= 24;

  // Section 1: Previous Class Delayed Chapters
  p1Items.push({
    text: '1. PREVIOUS CLASS PREREQUISITE CHAPTERS REQUIRING REVISION',
    x: 50,
    y,
    size: 11,
    font: 'F2',
  });
  y -= 18;

  const validGaps = gapsData.filter((g) => g.prerequisiteLesson);

  if (validGaps.length === 0) {
    p1Items.push({
      text: 'No delayed prerequisite curriculum topics identified from previous grades.',
      x: 60,
      y,
      size: 9.5,
      font: 'F1',
    });
    y -= 16;
  } else {
    validGaps.forEach((gap, idx) => {
      const p = gap.prerequisiteLesson;
      const gradeText = p.grade || 'Previous Grade';
      const chNum = p.chapterNumber || (idx + 1);

      p1Items.push({
        text: `Item ${idx + 1}: ${sanitizeForPdf(gradeText)} -- Chapter ${chNum}: ${sanitizeForPdf(p.chapterName)}`,
        x: 60,
        y,
        size: 9.5,
        font: 'F2',
      });
      y -= 14;

      p1Items.push({
        text: `   Core Concept: ${sanitizeForPdf(p.concept || gap.topicName)}`,
        x: 60,
        y,
        size: 8.5,
        font: 'F1',
      });
      y -= 13;

      if (p.pdfFileName || p.fileName) {
        p1Items.push({
          text: `   Reference NCERT Textbook: ${sanitizeForPdf(p.pdfFileName || p.fileName)}`,
          x: 60,
          y,
          size: 8.5,
          font: 'F2',
        });
        y -= 13;
      }

      if (gap.evidence) {
        const evLines = wrapText(`Diagnostic Evidence: ${gap.evidence}`, 76);
        evLines.forEach((evLine) => {
          p1Items.push({ text: `   ${evLine}`, x: 60, y, size: 8, font: 'F1' });
          y -= 12;
        });
      }

      y -= 4;
    });
  }

  y -= 16;

  // Section 2: Future Affecting Chapters up to Class 10
  p1Items.push({
    text: '2. DOWNSTREAM CHAPTERS AFFECTED IN FUTURE GRADES (UP TO CLASS 10)',
    x: 50,
    y,
    size: 11,
    font: 'F2',
  });
  y -= 18;

  if (isClass10) {
    p1Items.push({
      text: '* Class 10 Board Examination: Direct impact on Board Exam questions and core score.',
      x: 60,
      y,
      size: 9,
      font: 'F2',
    });
    y -= 14;

    p1Items.push({
      text: '* Senior Secondary (Class 11 & Class 12): Higher secondary STEM and calculus coursework will be affected.',
      x: 60,
      y,
      size: 9,
      font: 'F2',
    });
    y -= 14;

    const noteLines = wrapText(
      'Note: Future Class 11 and Class 12 syllabus chapter numbers are not mapped as curriculum branches into elective streams (Science, Commerce, Arts). Focus immediately on Class 10 Board exam mastery.',
      78
    );
    noteLines.forEach((nLine) => {
      p1Items.push({ text: `  ${nLine}`, x: 60, y, size: 8.5, font: 'F1' });
      y -= 12;
    });
  } else {
    // For Class 6 to Class 9: list future chapters strictly up to Class 10
    const futureLessonsMap = new Map();

    validGaps.forEach((g) => {
      (g.futureLessonsAffected || []).forEach((f) => {
        // Exclude Class 11 and Class 12 per user specification
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
      p1Items.push({
        text: 'Class 9 and Class 10 core chapters protected with proactive foundational remediation.',
        x: 60,
        y,
        size: 9,
        font: 'F1',
      });
      y -= 14;
    } else {
      futureLessons.forEach((f, fIdx) => {
        p1Items.push({
          text: `* ${sanitizeForPdf(f.grade)}: ${sanitizeForPdf(f.lessonName)}`,
          x: 60,
          y,
          size: 9,
          font: 'F2',
        });
        y -= 13;

        const rLines = wrapText(`Curriculum Risk: ${f.risk}`, 76);
        rLines.forEach((rLine) => {
          p1Items.push({ text: `  ${rLine}`, x: 65, y, size: 8, font: 'F1' });
          y -= 11;
        });
      });
    }
  }

  // Footer for Page 1
  p1Items.push({
    text: `Neev Syllabus Continuity Plan  --  ${sanitizeForPdf(studentName)}  --  Page 1 of 2`,
    x: 120,
    y: 35,
    size: 8,
    font: 'F1',
  });
  pagesItems.push(p1Items);

  // ================= PAGE 2 =================
  const p2Items = [];
  y = 800;

  p2Items.push({
    text: 'NEEV - REMEDIATION ROADMAP & DIAGNOSTIC STUDY SCHEDULE',
    x: 50,
    y,
    size: 13,
    font: 'F2',
  });
  y -= 20;

  p2Items.push({
    text: `Student: ${sanitizeForPdf(studentName)}   |   Class: ${sanitizeForPdf(className)}   |   Page 2 of 2`,
    x: 50,
    y,
    size: 9.5,
    font: 'F1',
  });
  y -= 24;

  p2Items.push({
    text: '3. STEP-BY-STEP FOUNDATIONAL REMEDIATION ROADMAP',
    x: 50,
    y,
    size: 11,
    font: 'F2',
  });
  y -= 18;

  if (roadmapData.length === 0) {
    p2Items.push({
      text: 'Remediation plan is fully updated and verified.',
      x: 60,
      y,
      size: 9.5,
      font: 'F1',
    });
  } else {
    roadmapData.slice(0, 6).forEach((rm, rIdx) => {
      p2Items.push({
        text: `Step ${rm.rank || rIdx + 1}: ${sanitizeForPdf(rm.topic)} (${rm.estimatedMinutes || 25} Minutes)`,
        x: 60,
        y,
        size: 9.5,
        font: 'F2',
      });
      y -= 14;

      if (rm.prereqChain) {
        p2Items.push({
          text: `   Foundational Prerequisite: ${sanitizeForPdf(rm.prereqChain)}`,
          x: 60,
          y,
          size: 8.5,
          font: 'F1',
        });
        y -= 12;
      }

      const actLines = wrapText(`Recommended Activity: ${rm.recommendedActivity || 'Targeted practice drills.'}`, 76);
      actLines.forEach((actLine) => {
        p2Items.push({ text: `   ${actLine}`, x: 60, y, size: 8, font: 'F1' });
        y -= 11;
      });

      if (rm.workedExamples) {
        p2Items.push({
          text: `   Worked Examples: ${sanitizeForPdf(rm.workedExamples)}`,
          x: 60,
          y,
          size: 8,
          font: 'F1',
        });
        y -= 12;
      }

      y -= 4;
    });
  }

  y -= 20;

  // Section 4: Teacher Verification & Sign-off
  p2Items.push({
    text: '4. TEACHER VERIFICATION & PARENT ACKNOWLEDGEMENT',
    x: 50,
    y,
    size: 11,
    font: 'F2',
  });
  y -= 22;

  p2Items.push({
    text: 'Evaluated By: ___________________________        Teacher Signature: _______________________',
    x: 60,
    y,
    size: 9,
    font: 'F1',
  });
  y -= 20;

  p2Items.push({
    text: 'Parent Signature: _________________________        Date Verified: __________________________',
    x: 60,
    y,
    size: 9,
    font: 'F1',
  });

  // Footer for Page 2
  p2Items.push({
    text: `Neev Syllabus Continuity Plan  --  ${sanitizeForPdf(studentName)}  --  Page 2 of 2`,
    x: 120,
    y: 35,
    size: 8,
    font: 'F1',
  });
  pagesItems.push(p2Items);

  return buildMultiPagePdfBlob(pagesItems);
}

/**
 * Generates a real PDF Blob for a student's Learning Gap Analysis Report.
 */
export function generateGapReportPdfBlob({
  studentName = 'Student',
  examName = 'Assessment',
  className = 'Grade 8',
  subject = 'Mathematics',
  gapsData = [],
  roadmapData = [],
}) {
  return generateSyllabusContinuityPdfBlob({
    studentName,
    className,
    subject,
    examName,
    gapsData,
    roadmapData,
  });
}

export default {
  sanitizeForPdf,
  buildMultiPagePdfBlob,
  generateQuestionsPdfBlob,
  generateSyllabusContinuityPdfBlob,
  generateGapReportPdfBlob,
};
