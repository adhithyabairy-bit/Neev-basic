/**
 * Neev Platform - Client-Side PDF Document Generator
 * Generates genuine, compliant PDF 1.4 binary documents without external libraries.
 * These files open natively in Adobe Acrobat, Chrome, Firefox, Edge, and Preview.
 */

/**
 * Escapes characters that have special meaning inside PDF text literals.
 */
function escapePdfText(str) {
  if (!str) return '';
  return String(str)
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
  const words = String(text).split(' ');
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
 * Builds a minimalist, valid PDF 1.4 document containing the provided text commands.
 *
 * @param {Array<{ text: string, x: number, y: number, size?: number, font?: string }>} textItems
 * @returns {Blob} Standard application/pdf Blob
 */
function buildPdfBlob(textItems = []) {
  // Construct page stream content
  let streamContent = 'BT\n';
  textItems.forEach((item) => {
    const font = item.font || 'F1';
    const size = item.size || 11;
    const safeText = escapePdfText(item.text);
    streamContent += `/${font} ${size} Tf\n`;
    streamContent += `1 0 0 1 ${item.x} ${item.y} Tm\n`;
    streamContent += `(${safeText}) Tj\n`;
  });
  streamContent += 'ET\n';

  const streamLength = streamContent.length;

  // Assembly of PDF objects
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  const obj6 = `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`;

  const header = '%PDF-1.4\n';

  // Calculate byte offsets for XRef table
  const offset0 = 0;
  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;
  const offset5 = offset4 + obj4.length;
  const offset6 = offset5 + obj5.length;
  const xrefOffset = offset6 + obj6.length;

  const pad = (num) => String(num).padStart(10, '0');

  const xref =
    'xref\n' +
    '0 7\n' +
    '0000000000 65535 f \n' +
    `${pad(offset1)} 00000 n \n` +
    `${pad(offset2)} 00000 n \n` +
    `${pad(offset3)} 00000 n \n` +
    `${pad(offset4)} 00000 n \n` +
    `${pad(offset5)} 00000 n \n` +
    `${pad(offset6)} 00000 n \n`;

  const trailer =
    `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPdf = header + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + xref + trailer;

  return new Blob([fullPdf], { type: 'application/pdf' });
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
  const textItems = [];
  let y = 800;

  // Header Banner
  textItems.push({ text: 'NEEV - AI-POWERED LEARNING GAP ANALYSIS REPORT', x: 50, y, size: 14, font: 'F2' });
  y -= 20;
  textItems.push({ text: `Student Name: ${studentName}`, x: 50, y, size: 11, font: 'F2' });
  textItems.push({ text: `Date: ${new Date().toLocaleDateString()}`, x: 420, y, size: 10, font: 'F1' });
  y -= 16;
  textItems.push({ text: `Class: ${className}   |   Subject: ${subject}`, x: 50, y, size: 10, font: 'F1' });
  y -= 16;
  textItems.push({ text: `Target Assessment: ${examName}`, x: 50, y, size: 10, font: 'F1' });
  y -= 24;

  // Section 1: Identified Prerequisite Learning Gaps
  textItems.push({ text: '1. IDENTIFIED PREREQUISITE LEARNING GAPS', x: 50, y, size: 12, font: 'F2' });
  y -= 18;

  if (gapsData.length === 0) {
    textItems.push({ text: 'No critical prerequisite learning gaps were identified.', x: 60, y, size: 10, font: 'F1' });
    y -= 16;
  } else {
    gapsData.forEach((gap, index) => {
      textItems.push({
        text: `${index + 1}. ${gap.topicName} [${gap.grade || 'Foundational'}]`,
        x: 60,
        y,
        size: 10,
        font: 'F2',
      });
      y -= 14;

      const lines = wrapText(`Evidence: ${gap.evidence || 'Observed in evaluated answer steps.'}`, 75);
      lines.forEach((line) => {
        textItems.push({ text: `   ${line}`, x: 60, y, size: 9, font: 'F1' });
        y -= 12;
      });

      if (gap.dependentTopics && gap.dependentTopics.length > 0) {
        textItems.push({
          text: `   Affects: ${gap.dependentTopics.join(', ')}`,
          x: 60,
          y,
          size: 9,
          font: 'F1',
        });
        y -= 14;
      }
    });
  }

  y -= 12;

  // Section 2: Sequenced Remediation Roadmap
  textItems.push({ text: '2. PERSONALIZED REMEDIATION ROADMAP', x: 50, y, size: 12, font: 'F2' });
  y -= 18;

  if (roadmapData.length === 0) {
    textItems.push({ text: 'Remediation plan is currently being compiled.', x: 60, y, size: 10, font: 'F1' });
  } else {
    roadmapData.slice(0, 5).forEach((item) => {
      textItems.push({
        text: `Step ${item.rank}: ${item.topic} (${item.estimatedMinutes || 25} mins)`,
        x: 60,
        y,
        size: 10,
        font: 'F2',
      });
      y -= 14;

      const actLines = wrapText(`Activity: ${item.recommendedActivity || 'Targeted problem set.'}`, 75);
      actLines.forEach((line) => {
        textItems.push({ text: `   ${line}`, x: 60, y, size: 9, font: 'F1' });
        y -= 12;
      });
    });
  }

  // Footer
  textItems.push({
    text: 'Generated by Neev Platform  --  Pedagogical AI Learning Diagnostics  --  Confidential',
    x: 100,
    y: 35,
    size: 8,
    font: 'F1',
  });

  return buildPdfBlob(textItems);
}

/**
 * Generates a real PDF Blob for a student's Diagnostic Gap-Based Questions Paper.
 */
export function generateQuestionsPdfBlob({
  studentName = 'Student',
  examName = 'Diagnostic Retest',
  className = 'Grade 8',
  subject = 'Mathematics',
  testQuestions = [],
}) {
  const textItems = [];
  let y = 800;

  // Header Banner
  textItems.push({ text: 'NEEV - DIAGNOSTIC GAP-BASED PRACTICE QUESTIONS', x: 50, y, size: 14, font: 'F2' });
  y -= 20;
  textItems.push({ text: `Student Name: ${studentName}`, x: 50, y, size: 11, font: 'F2' });
  textItems.push({ text: `Date: ${new Date().toLocaleDateString()}`, x: 420, y, size: 10, font: 'F1' });
  y -= 16;
  textItems.push({ text: `Class: ${className}   |   Subject: ${subject}`, x: 50, y, size: 10, font: 'F1' });
  y -= 16;
  const totalMarks = testQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  textItems.push({ text: `Diagnostic Assessment   |   Total Marks: ${totalMarks}`, x: 50, y, size: 10, font: 'F1' });
  y -= 20;

  // Instructions
  textItems.push({
    text: 'INSTRUCTIONS: Solve all questions showing step-by-step mathematical reasoning.',
    x: 50,
    y,
    size: 9,
    font: 'F2',
  });
  y -= 24;

  // Questions
  testQuestions.forEach((q, index) => {
    textItems.push({
      text: `Question ${q.number || index + 1} (${q.marks} Marks) [${q.type || 'Problem Solving'}]`,
      x: 50,
      y,
      size: 11,
      font: 'F2',
    });
    y -= 16;

    const promptLines = wrapText(q.prompt, 78);
    promptLines.forEach((line) => {
      textItems.push({ text: line, x: 60, y, size: 10, font: 'F1' });
      y -= 14;
    });

    if (q.targetConcept) {
      textItems.push({
        text: `Target Remediation: ${q.targetConcept}`,
        x: 60,
        y,
        size: 9,
        font: 'F1',
      });
      y -= 18;
    } else {
      y -= 8;
    }

    // Space for student work
    textItems.push({ text: '[ Show your working below ]', x: 60, y, size: 8, font: 'F1' });
    y -= 28;
  });

  // Footer
  textItems.push({
    text: `Student Deliverable: ${studentName}  --  Neev Learning Gap Practice Paper`,
    x: 120,
    y: 35,
    size: 8,
    font: 'F1',
  });

  return buildPdfBlob(textItems);
}
