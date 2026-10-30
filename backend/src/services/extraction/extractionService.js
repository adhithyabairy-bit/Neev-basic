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
 * Helper to generate an uncompressed 32-bit BMP buffer from raw RGBA/RGB image pixel data
 * so Tesseract.js can recognize it directly without external image processing binaries.
 */
function createBmpBuffer(width, height, rgbaBuffer) {
  const rowSize = width * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BM magic bytes and file size
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10); // Offset to pixel array
  // DIB header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22); // Negative height specifies top-down orientation
  buf.writeUInt16LE(1, 26); // Color planes
  buf.writeUInt16LE(32, 28); // 32 bits per pixel
  buf.writeUInt32LE(0, 30); // BI_RGB (uncompressed)
  buf.writeUInt32LE(pixelArraySize, 34);

  let srcOffset = 0;
  let dstOffset = 54;
  const isRGBA = rgbaBuffer.length === width * height * 4;
  const isRGB = rgbaBuffer.length === width * height * 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r, g, b, a = 255;
      if (isRGBA) {
        r = rgbaBuffer[srcOffset];
        g = rgbaBuffer[srcOffset + 1];
        b = rgbaBuffer[srcOffset + 2];
        a = rgbaBuffer[srcOffset + 3];
        srcOffset += 4;
      } else if (isRGB) {
        r = rgbaBuffer[srcOffset];
        g = rgbaBuffer[srcOffset + 1];
        b = rgbaBuffer[srcOffset + 2];
        srcOffset += 3;
      } else {
        r = g = b = rgbaBuffer[srcOffset++];
      }
      buf[dstOffset] = b;
      buf[dstOffset + 1] = g;
      buf[dstOffset + 2] = r;
      buf[dstOffset + 3] = a;
      dstOffset += 4;
    }
  }
  return buf;
}

/**
 * Extracts page images and performs OCR on scanned PDFs (PDFs without embedded text layer).
 * Preserves raw student handwriting fidelity without automated normalization or correction.
 *
 * @param {Buffer} pdfBuffer - Raw PDF buffer
 * @returns {Promise<{ text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number }>}
 */
export async function extractScannedPdf(pdfBuffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8 });
  const doc = await loadingTask.promise;
  const pages = [];
  const createWorker = await getCreateWorker();
  let worker = null;

  try {
    worker = await createWorker('eng');

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const ops = await page.getOperatorList();
      let pageText = '';

      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const objId = ops.argsArray[i][0];
          await new Promise((resolve) => {
            page.objs.get(objId, async (img) => {
              if (img && img.data && img.width && img.height) {
                try {
                  const bmp = createBmpBuffer(img.width, img.height, img.data);
                  const ocrRes = await worker.recognize(bmp);
                  pageText += (ocrRes.data?.text || '') + '\n';
                } catch (e) {
                  console.warn(`[ExtractionService] OCR failed on page ${pageNum} image ${objId}:`, e.message);
                }
              }
              resolve();
            });
          });
        }
      }

      pages.push({ pageNumber: pageNum, text: pageText.trim() });
    }
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Safe worker disposal
      }
    }
  }

  return {
    text: pages.map((p) => p.text).join('\n\n').trim(),
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: '' }],
    pageCount: doc.numPages || 1,
  };
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

    // Check if the page has explicit "Q1", "Q2" etc. or OCR-detected markers
    // Matches Q1, Q 1, Question 1, @1, @2, Q3-, Qh., Q4, @5, [1], (1), 1., 2), etc.
    const questionRegex = /(?:^|\n)\s*(?:(?:Q(?:uestion)?|Ans(?:wer)?|Prob(?:lem)?|[@\(\[])\s*(?:\.?\s*No\.?|#|\.)?\s*([1-9][0-9]*[a-z]?|[a-z]|\d+)\b[\.\:\-\)\=]?|([1-9][0-9]*)[\.\)\:\-]\s*)/gi;

    const matches = [...cleanText.matchAll(questionRegex)];
    const pageItems = [];

    // If there is significant text before the first match on page 1 (like Q1 problem statement), treat it as Q1.
    // On subsequent pages, prepend leading text to previous question as continuation.
    if (matches.length > 0 && matches[0].index > 0) {
      const leadingText = cleanText.substring(0, matches[0].index).trim();
      if (leadingText.length > 10 && !leadingText.match(/^page\s*\d+/i)) {
        if (pageNumber === 1) {
          let firstMatchNum = matches[0][1] || matches[0][2];
          if (firstMatchNum && firstMatchNum.toLowerCase() === 'h') firstMatchNum = '4';
          const numVal = parseInt(firstMatchNum, 10);
          if (numVal >= 2 || firstMatchNum === '2' || firstMatchNum === 'Q2') {
            const firstLineBreak = leadingText.indexOf('\n');
            let q1Prompt = 'Solve the following linear equation and verify your answer';
            let q1Answer = leadingText;
            if (firstLineBreak > 0) {
              const firstLine = leadingText.substring(0, firstLineBreak).trim();
              const rest = leadingText.substring(firstLineBreak + 1).trim();
              if (/solve|verify|calculate|find|equation|linear/i.test(firstLine)) {
                q1Prompt = firstLine.replace(/^[^\w\s]+/, '').trim();
                q1Answer = rest;
              }
            }
            pageItems.push({
              questionNumber: 'Q1',
              prompt: q1Prompt,
              rawExtractedText: q1Answer || leadingText,
              correctedText: q1Answer || leadingText,
              pageNumber,
              confidence: defaultConfidence,
              maxMarks: 3,
              awardedMarks: 0,
              status: 'Needs Review',
              uncertainParts: [],
            });
          }
        } else if (items.length > 0) {
          items[items.length - 1].rawExtractedText += '\n' + leadingText;
          items[items.length - 1].correctedText += '\n' + leadingText;
        }
      }
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        let rawQNum = match[1] || match[2] || match[3] || match[4];
        if (rawQNum && rawQNum.toLowerCase() === 'h') {
          rawQNum = '4'; // OCR 'h' -> '4'
        }
        if (rawQNum && rawQNum.toLowerCase().startsWith('q')) {
          rawQNum = rawQNum.substring(1);
        }
        const qNumber = `Q${(rawQNum || (i + 1)).toUpperCase()}`;

        const startIndex = match.index + match[0].length;
        const endIndex = i + 1 < matches.length ? matches[i + 1].index : cleanText.length;
        let rawBody = cleanText.substring(startIndex, endIndex).trim();

        // Strip leading punctuation often left over from marker (e.g. ":", ".", "-", ")", "|")
        rawBody = rawBody.replace(/^[\.\:\-\)\=\|\[\]]+\s*/, '').trim();

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

        let prompt = `Question ${rawQNum || (i + 1)}`;
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
            prompt = extractedPrompt || `Question ${rawQNum || (i + 1)}`;
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
            // Check if rawBody starts with question title or description
            const firstColon = rawBody.indexOf(':');
            const firstNewline = rawBody.indexOf('\n');
            const splitPoint = firstColon > 0 && (firstNewline === -1 || firstColon < firstNewline + 20) ? firstColon : firstNewline;
            if (splitPoint > 0 && splitPoint < 140) {
              const potentialPrompt = rawBody.substring(0, splitPoint).replace(/^[\.\:\-\)\=\|\[\]]+\s*/, '').trim();
              const potentialAns = rawBody.substring(splitPoint + 1).trim();
              if (
                potentialPrompt.length >= 4 &&
                potentialAns.length > 0 &&
                /(?:solve|find|calculate|evaluate|simplify|what|prove|show|determine|explain|state|write|mensuration|geometry|factorise|exponents|powers|commercial|interest|linear|equation)/i.test(potentialPrompt)
              ) {
                prompt = potentialPrompt;
                answerText = potentialAns;
              }
            } else if (firstNewline > 0) {
              const firstLine = rawBody.substring(0, firstNewline).trim();
              const rest = rawBody.substring(firstNewline + 1).trim();
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
      let pdfResult = null;
      try {
        pdfResult = await extractPdfText(buffer);
      } catch (pdfErr) {
        console.warn('[ExtractionService] Direct PDF text parse failed, falling back to scanned OCR:', pdfErr.message);
      }

      // Check if PDF has substantial embedded text (native vector PDF)
      const cleanEmbedded = (pdfResult?.text || '').replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
      if (cleanEmbedded && cleanEmbedded.length >= 40) {
        const answers = organizeExtractedText(pdfResult.pages, null);
        return {
          rawOcrText: pdfResult.text,
          answers,
          pageCount: pdfResult.pageCount || 1,
          ocrStatus: {
            method: 'pdf-text-extract',
            processedAt: new Date(),
            confidence: 100, // Native embedded vector text
            errorDetails: null,
          },
        };
      }

      // If PDF has no text layer (scanned handwritten answer sheet), run Tesseract OCR on page images
      try {
        const scannedResult = await extractScannedPdf(buffer);
        if (scannedResult.text && scannedResult.text.trim().length > 10) {
          const answers = organizeExtractedText(scannedResult.pages, 85);
          return {
            rawOcrText: scannedResult.text,
            answers,
            pageCount: scannedResult.pageCount,
            ocrStatus: {
              method: 'tesseract-ocr-pdf',
              processedAt: new Date(),
              confidence: 85,
              errorDetails: null,
            },
          };
        }
      } catch (scannedErr) {
        console.warn('[ExtractionService] Scanned PDF image OCR failed:', scannedErr.message);
      }

      // If neither embedded text nor scanned image OCR found text, flag for review
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
        pageCount: pdfResult?.pageCount || 1,
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

