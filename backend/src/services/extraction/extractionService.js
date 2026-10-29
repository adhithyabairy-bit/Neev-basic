import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';

/**
 * Segmentation Heuristic
 * Splits extracted text into question blocks based on standard question markers.
 * If no question markers are detected, groups by page or sensible text blocks.
 * Never invents question numbers, prompts, or fake student answers.
 *
 * @param {Array<{ pageNumber: number, text: string }>} pages - Extracted text per page
 * @param {number|null} defaultConfidence - OCR confidence score or null for direct text
 * @returns {Array<Object>} List of organized question/answer items
 */
export function organizeExtractedText(pages, defaultConfidence = null) {
  const items = [];

  // Question marker pattern: Matches "Q1.", "Q1:", "Q1)", "Question 1:", "1.", "1)", "1:" at start of line
  const questionRegex = /(?:^|\n)\s*(?:Q(?:uestion)?\s*(\d+[a-z]?)|(\d+)[\.\)\:\-]\s*)/gi;

  for (const { pageNumber, text } of pages) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      continue;
    }

    // Check for explicit question markers
    const matches = [...cleanText.matchAll(questionRegex)];

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const rawQNum = match[1] || match[2];
        const qNumber = rawQNum.toLowerCase().startsWith('q') ? rawQNum.toUpperCase() : `Q${rawQNum}`;

        const startIndex = match.index + match[0].length;
        const endIndex = i + 1 < matches.length ? matches[i + 1].index : cleanText.length;
        const answerBody = cleanText.substring(startIndex, endIndex).trim();

        // Identify uncertain parts (e.g. illegible markers or question marks)
        const uncertainParts = [];
        if (answerBody.includes('???') || answerBody.includes('[illegible]')) {
          uncertainParts.push('Illegible handwriting or uncertain symbol');
        }
        if (defaultConfidence !== null && defaultConfidence < 70) {
          uncertainParts.push(`Low OCR confidence (${defaultConfidence}%)`);
        }

        items.push({
          questionNumber: qNumber,
          prompt: `Question ${rawQNum}`,
          rawExtractedText: answerBody || '(No answer text detected for this question)',
          correctedText: answerBody || '',
          pageNumber,
          confidence: defaultConfidence,
          maxMarks: 5,
          awardedMarks: 0,
          status: 'Needs Review',
          uncertainParts,
        });
      }
    } else {
      // If no question markers detected, treat page text as a page-level answer block
      // Preserves ground truth without fabricating question numbers or text!
      const uncertainParts = [];
      if (defaultConfidence !== null && defaultConfidence < 70) {
        uncertainParts.push(`Low OCR confidence (${defaultConfidence}%)`);
      }
      if (!cleanText || cleanText.length < 10) {
        uncertainParts.push('Short or partially readable text');
      }

      items.push({
        questionNumber: `Page ${pageNumber}`,
        prompt: `Extracted content from Page ${pageNumber}`,
        rawExtractedText: cleanText,
        correctedText: cleanText,
        pageNumber,
        confidence: defaultConfidence,
        maxMarks: 5,
        awardedMarks: 0,
        status: 'Needs Review',
        uncertainParts,
      });
    }
  }

  // If entire document was blank
  if (items.length === 0) {
    items.push({
      questionNumber: 'Page 1',
      prompt: 'Unreadable or blank answer sheet',
      rawExtractedText: '',
      correctedText: '',
      pageNumber: 1,
      confidence: 0,
      maxMarks: 5,
      awardedMarks: 0,
      status: 'Needs Review',
      uncertainParts: ['No extractable text found on uploaded document. Please check scan clarity.'],
    });
  }

  return items;
}

/**
 * Extracts text from a text-based PDF using pdf-parse.
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<{ text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number }>}
 */
export async function extractPdfText(buffer) {
  let parser = null;
  try {
    parser = new PDFParse({ data: buffer });
    await parser.load();

    const textResult = await parser.getText();
    const pageCount = textResult.total || 1;

    // Split text by page separators if available, or map to pages
    const pageTexts = [];
    const rawFullText = textResult.text || '';

    // pdf-parse uses '-- <page> of <total> --' separator in v2
    const pageChunks = rawFullText.split(/--\s*\d+\s*of\s*\d+\s*--/gi);

    if (pageChunks.length > 1) {
      pageChunks.forEach((chunk, idx) => {
        const text = chunk.trim();
        if (text || idx > 0) {
          pageTexts.push({ pageNumber: idx + 1, text });
        }
      });
    } else {
      pageTexts.push({ pageNumber: 1, text: rawFullText.trim() });
    }

    return {
      text: rawFullText.trim(),
      pages: pageTexts.length > 0 ? pageTexts : [{ pageNumber: 1, text: rawFullText.trim() }],
      pageCount: Math.max(pageCount, pageTexts.length),
    };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Safe disposal
      }
    }
  }
}

/**
 * Extracts text from an image (JPEG, PNG) using Tesseract.js.
 * @param {Buffer} buffer - Image file buffer
 * @returns {Promise<{ text: string, confidence: number, pages: Array<{ pageNumber: number, text: string }> }>}
 */
export async function extractImageOcr(buffer) {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const result = await worker.recognize(buffer);

    const rawText = result.data?.text || '';
    const confidence = Math.round(result.data?.confidence || 0);

    return {
      text: rawText.trim(),
      confidence,
      pages: [{ pageNumber: 1, text: rawText.trim() }],
      pageCount: 1,
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Safe disposal
      }
    }
  }
}

/**
 * Main Extraction Service
 * Routes document to appropriate engine based on MIME type and content.
 * Returns normalized extraction result ready for AnswerSheet document persistence.
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type ('application/pdf', 'image/jpeg', 'image/png')
 * @returns {Promise<{ rawOcrText: string, answers: Array<Object>, pageCount: number, ocrStatus: Object }>}
 */
export async function processDocumentExtraction(buffer, mimeType) {
  const isPdf = mimeType === 'application/pdf';

  try {
    if (isPdf) {
      const pdfResult = await extractPdfText(buffer);

      // Check if PDF had embedded text
      if (pdfResult.text && pdfResult.text.length > 15) {
        const answers = organizeExtractedText(pdfResult.pages, null);
        return {
          rawOcrText: pdfResult.text,
          answers,
          pageCount: pdfResult.pageCount,
          ocrStatus: {
            method: 'pdf-text-extract',
            processedAt: new Date(),
            confidence: 100, // Native embedded vector text
            errorDetails: null,
          },
        };
      }

      // If PDF has no text layer (scanned PDF), flag for manual teacher transcription/review
      const answers = organizeExtractedText(
        [{ pageNumber: 1, text: '' }],
        null
      );
      answers[0].uncertainParts = [
        'Scanned document without embedded text layer. Please review scan directly.',
      ];

      return {
        rawOcrText: '',
        answers,
        pageCount: pdfResult.pageCount || 1,
        ocrStatus: {
          method: 'pdf-scan-review',
          processedAt: new Date(),
          confidence: null,
          errorDetails: 'Scanned document with no embedded text layer.',
        },
      };
    }

    // Image file (JPEG, PNG): Run Tesseract OCR
    const imageResult = await extractImageOcr(buffer);
    const answers = organizeExtractedText(imageResult.pages, imageResult.confidence);

    return {
      rawOcrText: imageResult.text,
      answers,
      pageCount: imageResult.pageCount || 1,
      ocrStatus: {
        method: 'tesseract-ocr',
        processedAt: new Date(),
        confidence: imageResult.confidence,
        errorDetails: null,
      },
    };
  } catch (err) {
    console.error('[ExtractionService] Extraction error:', err);
    return {
      rawOcrText: '',
      answers: [
        {
          questionNumber: 'Page 1',
          prompt: 'Extraction Failed',
          rawExtractedText: '',
          correctedText: '',
          pageNumber: 1,
          confidence: 0,
          maxMarks: 5,
          awardedMarks: 0,
          status: 'Needs Review',
          uncertainParts: [`Extraction error: ${err.message}`],
        },
      ],
      pageCount: 1,
      ocrStatus: {
        method: isPdf ? 'pdf-text-extract' : 'tesseract-ocr',
        processedAt: new Date(),
        confidence: 0,
        errorDetails: err.message,
      },
    };
  }
}

export default {
  processDocumentExtraction,
  extractPdfText,
  extractImageOcr,
  organizeExtractedText,
};

