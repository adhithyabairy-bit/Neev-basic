/**
 * Chunking Service for Syllabus Ingestion
 * Splits document text by page into overlapping semantic text chunks.
 * Preserves sentence boundaries and avoids cutting words or formulas in half.
 */

/**
 * Splits text into sentences using standard punctuation boundaries.
 */
function splitIntoSentences(text) {
  if (!text) return [];
  // Split on period, exclamation, or question mark followed by space or newline, while keeping punctuation
  return text
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Chunks a list of pages into overlapping text segments.
 *
 * @param {Array<{ pageNumber: number, text: string }>} pages - Extracted text per page
 * @param {Object} options - { chunkSize: number, chunkOverlap: number }
 * @returns {Array<{ pageNumber: number, chunkIndex: number, chunkText: string }>}
 */
export function chunkDocumentPages(pages, options = {}) {
  const chunkSize = options.chunkSize || parseInt(process.env.RAG_CHUNK_SIZE, 10) || 750;
  const chunkOverlap = options.chunkOverlap || parseInt(process.env.RAG_CHUNK_OVERLAP, 10) || 120;

  const chunks = [];
  let globalChunkIndex = 0;

  for (const { pageNumber, text } of pages) {
    if (!text || !text.trim()) continue;

    const cleanText = text.replace(/\r\n/g, '\n').trim();

    // If page content is smaller than chunk size, emit it as a single chunk
    if (cleanText.length <= chunkSize) {
      chunks.push({
        pageNumber,
        chunkIndex: globalChunkIndex++,
        chunkText: cleanText,
      });
      continue;
    }

    // Split page into paragraphs or sentences
    const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim());
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();

      if (!trimmedPara) continue;

      if ((currentChunk + '\n\n' + trimmedPara).trim().length <= chunkSize) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
      } else {
        // Current paragraph causes overflow. If currentChunk has content, flush it
        if (currentChunk.trim().length > 0) {
          chunks.push({
            pageNumber,
            chunkIndex: globalChunkIndex++,
            chunkText: currentChunk.trim(),
          });

          // Calculate overlap from the end of currentChunk
          const overlapText = currentChunk.slice(-chunkOverlap);
          currentChunk = overlapText;
        }

        // If paragraph itself is larger than chunkSize, split by sentences
        if (trimmedPara.length > chunkSize) {
          const sentences = splitIntoSentences(trimmedPara);
          for (const sentence of sentences) {
            if ((currentChunk + ' ' + sentence).trim().length <= chunkSize) {
              currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            } else {
              if (currentChunk.trim().length > 0) {
                chunks.push({
                  pageNumber,
                  chunkIndex: globalChunkIndex++,
                  chunkText: currentChunk.trim(),
                });
                const overlapText = currentChunk.slice(-chunkOverlap);
                currentChunk = overlapText;
              }
              currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            }
          }
        } else {
          currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
        }
      }
    }

    // Flush any remaining chunk on this page
    if (currentChunk && currentChunk.trim().length > 20) {
      chunks.push({
        pageNumber,
        chunkIndex: globalChunkIndex++,
        chunkText: currentChunk.trim(),
      });
    }
  }

  return chunks;
}

export default {
  chunkDocumentPages,
};

