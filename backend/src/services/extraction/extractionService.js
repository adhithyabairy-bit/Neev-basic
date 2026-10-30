// Ensure standard web geometry APIs (DOMMatrix, DOMPoint, DOMRect) exist on globalThis in serverless environments
import '../../utils/domPolyfill.js';

// Lazy dynamic imports for serverless cold start performance and AWS Lambda compatibility
let PDFParseClass = null;
async function getPDFParse() {
  if (!PDFParseClass) {
    const mod = await import('pdf-parse');
    PDFParseClass = mod.PDFParse || mod.default?.PDFParse || mod.default;
  }
  return PDFParseClass;
}

let createWorkerFn = null;
async function getCreateWorker() {
  if (!createWorkerFn) {
    const mod = await import('tesseract.js');
    createWorkerFn = mod.createWorker || mod.default?.createWorker || mod.default;
  }
  return createWorkerFn;
}

/**
 * Helper to identify general marking instructions, rubrics, or examiner guidelines
 * that should not be converted into questions.
 */
function isInstructionOrGuideline(text) {
  const clean = text
    .replace(/(?:Academic\s*Excellence\s*Academy[^\n]*|Marking\s*Scheme[^\n]*Page\s*\d+\s*of\s*\d+|Page\s*\d+\s*of\s*\d+)/gi, '')
    .trim();
  const lower = clean.toLowerCase();

  // If the block contains question indicators, calculations, or steps, it is NOT an instruction
  const hasQuestionSignals =
    lower.includes('step 1') ||
    lower.includes('step 2') ||
    lower.includes('solution') ||
    lower.includes('principal') ||
    lower.includes('formula') ||
    lower.includes('factorise') ||
    lower.includes('exponents') ||
    lower.includes('interest') ||
    lower.includes('equation') ||
    lower.includes('pythagoras') ||
    lower.includes('solve') ||
    lower.includes('calculate') ||
    lower.includes('simplify') ||
    lower.includes('ans:') ||
    lower.includes('answer:');

  if (hasQuestionSignals) {
    return false;
  }

  const instructionPhrases = [
    'award full marks',
    'step-wise marks',
    'accept alternative',
    'no fractional marks',
    'general instructions',
    'instructions for evaluators',
    'instructions to examiners',
    'guidelines for marking',
    'marking scheme guidelines',
    'examiners must',
    'candidates must',
  ];

  return instructionPhrases.some((phrase) => lower.includes(phrase));
}

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

  for (const { pageNumber, text } of pages) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      continue;
    }

    // Check if the page has explicit "Q1", "Q2" etc.
    const explicitQRegex = /(?:^|\n)\s*(?:Q(?:uestion)?\s*(?:\.?\s*No\.?|#|\.)?\s*(\d+[a-z]?))\b/gi;
    const explicitMatches = [...cleanText.matchAll(explicitQRegex)];
    const hasMultipleExplicitQ = explicitMatches.length >= 2;

    // If explicit Q markers exist, prioritize them over bare numbers like "1.", "2."
    const questionRegex = hasMultipleExplicitQ
      ? /(?:^|\n)\s*(?:Q(?:uestion)?\s*(?:\.?\s*No\.?|#|\.)?\s*(\d+[a-z]?))\b/gi
      : /(?:^|\n)\s*(?:(?:Q(?:uestion)?|Ans(?:wer)?|Prob(?:lem)?)\s*(?:\.?\s*No\.?|#|\.)?\s*(\d+[a-z]?)|(\d+)[\.\)\:\-]\s*|\((\d+[a-z]?)\)\s*|\[(\d+[a-z]?)\]\s*)/gi;

    const matches = [...cleanText.matchAll(questionRegex)];
    const pageItems = [];

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const rawQNum = match[1] || match[2] || match[3] || match[4];
        const qNumber = rawQNum.toLowerCase().startsWith('q') ? rawQNum.toUpperCase() : `Q${rawQNum.toUpperCase()}`;

        const startIndex = match.index + match[0].length;
        const endIndex = i + 1 < matches.length ? matches[i + 1].index : cleanText.length;
        let rawBody = cleanText.substring(startIndex, endIndex).trim();

        // Strip leading punctuation often left over from marker (e.g. ":", ".", "-", ")")
        rawBody = rawBody.replace(/^[\.\:\-\)\=]+\s*/, '').trim();

        // Skip general instruction blocks that aren't actual questions
        if (isInstructionOrGuideline(rawBody)) {
          continue;
        }

        // Extract max marks if specified (e.g., "3 Marks", "[4 Marks]")
        let maxMarks = 5;
        const marksMatch = rawBody.match(/(?:\[|\()?(\d+)\s*(?:Marks?|Pts?|Points?)(?:\]|\))?/i);
        if (marksMatch) {
          maxMarks = parseInt(marksMatch[1], 10);
        }

        let prompt = `Question ${rawQNum}`;
        let answerText = rawBody;

        // Check for table headers like "Steps & Answer Key \t Mark Breakdown"
        const tableHeaderMatch = rawBody.match(/(?:(?:Solution\s*)?Steps?\s*(?:&|and)?\s*Answer\s*Key|Solution\s*Key|Model\s*Answer|Expected\s*Steps?)\s*(?:\t|\n|[^\n]*Mark\s*Breakdown)?/i);

        if (tableHeaderMatch) {
          const headerIndex = tableHeaderMatch.index;
          const preHeader = rawBody.substring(0, headerIndex).trim();
          const postHeader = rawBody.substring(headerIndex + tableHeaderMatch[0].length).trim();

          let extractedPrompt = preHeader
            .replace(/\s*(?:\[|\()?(\d+)\s*(?:Marks?|Pts?|Points?)(?:\]|\))?/i, '')
            .replace(/\s*Solution\s*$/i, '')
            .trim();

          const eqMatch = postHeader.match(/^(?:Equation|Problem|Question|Statement|Given)\s*:\s*([^\n]+)/i);
          if (eqMatch) {
            prompt = extractedPrompt ? `${extractedPrompt} — ${eqMatch[0]}` : eqMatch[0];
            answerText = postHeader.substring(eqMatch[0].length).trim();
          } else {
            prompt = extractedPrompt || `Question ${rawQNum}`;
            answerText = postHeader;
          }
        } else {
          // Check if rawBody contains an explicit question prompt followed by an answer
          const ansSplitRegex = /(?:\n|^)\s*(?:Ans(?:wer)?|Sol(?:ution)?)\s*[:\.\-]?\s*/i;
          const ansMatch = rawBody.match(ansSplitRegex);
          if (ansMatch && ansMatch.index > 0) {
            const possiblePrompt = rawBody.substring(0, ansMatch.index).trim();
            const possibleAnswer = rawBody.substring(ansMatch.index + ansMatch[0].length).trim();
            if (possiblePrompt.length > 0 && possibleAnswer.length > 0) {
              prompt = possiblePrompt;
              answerText = possibleAnswer;
            }
          } else {
            // If first line starts with a common question verb or has a question mark
            const firstLineBreak = rawBody.indexOf('\n');
            if (firstLineBreak > 0) {
              const firstLine = rawBody.substring(0, firstLineBreak).trim();
              const rest = rawBody.substring(firstLineBreak + 1).trim();
              if (
                firstLine.endsWith('?') ||
                /^(?:solve|find|calculate|evaluate|simplify|what|prove|show|determine|explain|state|write)\b/i.test(firstLine)
              ) {
                prompt = firstLine;
                if (rest.length > 0) {
                  answerText = rest;
                }
              }
            }
          }
        }

        // Clean running header/footer noise from answerText
        answerText = answerText
          .replace(/(?:Page\s*\d+\s*of\s*\d+|Academic\s*Excellence\s*Academy[^\n]*)/gi, '')
          .trim();

        // Identify uncertain parts (e.g. illegible markers or question marks)
        const uncertainParts = [];
        if (rawBody.includes('???') || rawBody.includes('[illegible]')) {
          uncertainParts.push('Illegible handwriting or uncertain symbol');
        }
        if (defaultConfidence !== null && defaultConfidence < 70) {
          uncertainParts.push(`Low OCR confidence (${defaultConfidence}%)`);
        }

        pageItems.push({
          questionNumber: qNumber,
          prompt,
          rawExtractedText: answerText || rawBody || '(No answer text detected for this question)',
          correctedText: answerText || rawBody || '',
          pageNumber,
          confidence: defaultConfidence,
          maxMarks,
          awardedMarks: 0,
          status: 'Needs Review',
          uncertainParts,
        });
      }
    }

    if (pageItems.length > 0) {
      items.push(...pageItems);
    } else {
      // If no question markers survived or detected, group by multi-paragraph blocks or page
      // If no question markers detected, check if there are distinct multi-paragraph blocks
      const paragraphs = cleanText
        .split(/\n\s*\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const uncertainParts = [];
      if (defaultConfidence !== null && defaultConfidence < 70) {
        uncertainParts.push(`Low OCR confidence (${defaultConfidence}%)`);
      }
      if (!cleanText || cleanText.length < 10) {
        uncertainParts.push('Short or partially readable text');
      }

      if (paragraphs.length > 1 && paragraphs.length <= 10) {
        paragraphs.forEach((pText, pIdx) => {
          items.push({
            questionNumber: `P${pageNumber}-Q${pIdx + 1}`,
            prompt: `Page ${pageNumber} — Section ${pIdx + 1}`,
            rawExtractedText: pText,
            correctedText: pText,
            pageNumber,
            confidence: defaultConfidence,
            maxMarks: 5,
            awardedMarks: 0,
            status: 'Needs Review',
            uncertainParts: [...uncertainParts],
          });
        });
      } else {
        // Single page-level answer block
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
  const PDFParse = await getPDFParse();
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
  const createWorker = await getCreateWorker();
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

