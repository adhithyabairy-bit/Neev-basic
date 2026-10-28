/**
 * Neev Platform - Filename Sanitization & Generation Utilities
 * Formats student-specific filenames according to strict naming conventions.
 */

/**
 * Sanitizes a student's full name into a safe filename slug.
 * Rules:
 * - Convert name to lowercase
 * - Trim leading and trailing whitespace
 * - Replace whitespace sequences with a single underscore
 * - Remove characters invalid in filenames (keep only a-z, 0-9, and underscore)
 * - Collapse repeated underscores into a single underscore
 * - Remove leading and trailing underscores
 * - Graceful fallback if empty or invalid
 *
 * @param {string} name - Raw student name input
 * @param {string} fallback - Fallback slug if name is invalid or empty
 * @returns {string} Safe filename slug
 */
export function sanitizeStudentName(name, fallback = 'student') {
  if (!name || typeof name !== 'string') {
    return fallback;
  }

  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Generates student-specific PDF filenames for reports and question papers.
 *
 * Examples:
 * - generatePdfFilename('Adithya', 'gap') -> 'adithya_gap.pdf'
 * - generatePdfFilename('Rahul', 'gap') -> 'rahul_gap.pdf'
 * - generatePdfFilename('Sai Kumar', 'gap') -> 'sai_kumar_gap.pdf'
 * - generatePdfFilename('Adithya', 'questions') -> 'adithya_questions.pdf'
 * - generatePdfFilename('Rahul', 'questions') -> 'rahul_questions.pdf'
 * - generatePdfFilename('', 'gap') -> 'student_gap.pdf'
 *
 * @param {string} studentName - Student's full name
 * @param {'gap' | 'questions' | string} reportType - Deliverable category
 * @returns {string} Sanitized PDF filename
 */
export function generatePdfFilename(studentName, reportType = 'gap') {
  const normalizedType =
    typeof reportType === 'string' && reportType.toLowerCase().trim() === 'questions'
      ? 'questions'
      : 'gap';

  const safeSlug = sanitizeStudentName(studentName, 'student');
  return `${safeSlug}_${normalizedType}.pdf`;
}
