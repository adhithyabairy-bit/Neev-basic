import mongoose from 'mongoose';
import SyllabusChunk from '../../models/SyllabusChunk.js';
import embeddingService, { cosineSimilarity } from './embeddingService.js';

/**
 * Production Retrieval Service for Syllabus RAG
 *
 * Requirements:
 * - Queries persistent MongoDB Atlas Vector Search ($vectorSearch) when available.
 * - Explicitly reports degraded mode when Atlas Vector Search is bypassed or unavailable.
 * - Strictly enforces teacher ownership and shared curriculum boundaries (tenant isolation).
 * - Distinguishes between shared curriculum (isShared: true) and private teacher uploads.
 * - Filters by subject and grade.
 * - Prevents duplicate chunks.
 * - Ranks chunks by relevance score.
 * - Fast keyword fallback if vector search is offline or yields 0 results.
 * - Clear handling when no relevant evidence is found.
 */

/**
 * Helper to deduplicate chunks by text content hash or normalized snippet.
 */
function deduplicateChunks(chunks) {
  if (!Array.isArray(chunks)) return [];
  const seen = new Set();
  const unique = [];
  for (const chunk of chunks) {
    if (!chunk) continue;
    const key = (chunk.contentHash || chunk.chunkText || '')
      .trim()
      .toLowerCase()
      .slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(chunk);
  }
  return unique;
}

/**
 * Retrieves the most relevant syllabus text passages for a given query and lesson context.
 *
 * @param {Object} params
 * @param {ObjectId|string} params.teacherId - Authenticated teacher ID (mandatory)
 * @param {string} params.queryText - Question text, answer context, or topic query
 * @param {string} params.subject - Subject filter (e.g. 'Mathematics')
 * @param {string} params.grade - Grade filter (e.g. 'Grade 8')
 * @param {string} params.lessonName - Optional lesson/topic filter
 * @param {number} params.topK - Number of passages to retrieve (default: 4)
 * @returns {Promise<{ chunks: Array<Object>, retrievalMethod: string, isDegraded: boolean, vectorSearchAvailable: boolean, vectorDimensions: number, message?: string }>}
 */
export async function retrieveRelevantSyllabusChunks({
  teacherId,
  queryText,
  subject = '',
  grade = '',
  lessonName = '',
  topK = 4,
}) {
  if (!teacherId) {
    throw new Error('SECURITY_VIOLATION: Teacher ID is mandatory for syllabus retrieval.');
  }

  const dimension = embeddingService.getDimension();

  if (!queryText || !queryText.trim()) {
    return {
      chunks: [],
      retrievalMethod: 'empty_query',
      isDegraded: false,
      vectorSearchAvailable: false,
      vectorDimensions: dimension,
      message: 'Empty query provided; no retrieval performed.',
    };
  }

  // Database connectivity guard (for fast unit testing without live DB connection)
  if (mongoose.connection.readyState !== 1) {
    return {
      chunks: [],
      retrievalMethod: 'db_offline',
      isDegraded: true,
      vectorSearchAvailable: false,
      vectorDimensions: dimension,
      message: 'Database is offline; retrieval degraded.',
    };
  }

  const cleanGrade = (grade || '').replace('Class', 'Grade').trim();
  const gradeRegex = cleanGrade ? new RegExp(cleanGrade.replace(/\s+/g, '\\s*'), 'i') : null;
  const subjectRegex = subject ? new RegExp(subject.split(/[\/\s]/)[0], 'i') : null;

  // Strict tenant boundary: only retrieve chunks owned by this teacher OR marked as shared/curated
  const teacherObjectId = mongoose.isValidObjectId(teacherId)
    ? new mongoose.Types.ObjectId(teacherId.toString())
    : teacherId;

  const tenantCondition = {
    $or: [{ teacherId: teacherObjectId }, { isShared: true }],
  };

  // 1. ATTEMPT ATLAS VECTOR SEARCH ($vectorSearch)
  let queryEmbedding = [];
  try {
    queryEmbedding = await embeddingService.generateEmbedding(queryText);
  } catch (embErr) {
    console.warn('[RetrievalService] Query embedding notice:', embErr.message);
  }

  const vectorDimensions = queryEmbedding.length || dimension;
  const vectorIndexName = process.env.ATLAS_VECTOR_INDEX_NAME || 'syllabus_vector_index';

  if (queryEmbedding && queryEmbedding.length > 0) {
    try {
      const filterConditions = {
        $or: [{ teacherId: teacherObjectId }, { isShared: true }],
      };
      if (subject) filterConditions.subject = subject;
      if (grade) filterConditions.grade = grade;

      const pipeline = [
        {
          $vectorSearch: {
            index: vectorIndexName,
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: Math.max(40, topK * 10),
            limit: topK * 2,
            filter: filterConditions,
          },
        },
        {
          $project: {
            documentId: 1,
            chunkId: 1,
            sourceFileName: 1,
            pageNumber: 1,
            pageRange: 1,
            chunkIndex: 1,
            chunkText: 1,
            lessonName: 1,
            grade: 1,
            subject: 1,
            isShared: 1,
            contentHash: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const atlasResults = await SyllabusChunk.aggregate(pipeline);
      const uniqueAtlas = deduplicateChunks(atlasResults).slice(0, topK);

      if (uniqueAtlas && uniqueAtlas.length > 0) {
        return {
          chunks: uniqueAtlas,
          retrievalMethod: 'atlas_vector_search',
          isDegraded: false,
          vectorSearchAvailable: true,
          vectorDimensions,
        };
      }
    } catch {
      // Atlas Vector Search is not active or index is not yet built; proceed to in-memory cosine fallback
    }

    // 2. Local Cosine Similarity Fallback with strict tenant isolation
    try {
      const cosineFilter = {
        $and: [
          tenantCondition,
          ...(subjectRegex ? [{ subject: subjectRegex }] : subject ? [{ subject }] : []),
          ...(gradeRegex ? [{ grade: gradeRegex }] : grade ? [{ grade }] : []),
        ],
      };

      const candidates = await SyllabusChunk.find(cosineFilter)
        .select('documentId chunkId sourceFileName pageNumber pageRange chunkIndex chunkText lessonName grade subject isShared contentHash embedding')
        .limit(150)
        .lean();

      if (candidates && candidates.length > 0) {
        const scoredCandidates = candidates
          .map((chunk) => {
            const score =
              chunk.embedding && chunk.embedding.length === vectorDimensions
                ? cosineSimilarity(queryEmbedding, chunk.embedding)
                : 0;
            return {
              ...chunk,
              score: Math.round(score * 100) / 100,
            };
          })
          .filter((c) => c.score > 0.15)
          .sort((a, b) => b.score - a.score);

        const uniqueScored = deduplicateChunks(scoredCandidates).slice(0, topK);

        if (uniqueScored.length > 0) {
          return {
            chunks: uniqueScored,
            retrievalMethod: 'local_cosine_fallback',
            isDegraded: true,
            vectorSearchAvailable: false,
            vectorDimensions,
          };
        }
      }
    } catch (fallbackErr) {
      console.warn('[RetrievalService] Local cosine fallback warning:', fallbackErr.message);
    }
  }

  // 3. FAST PRE-INDEXED KEYWORD RETRIEVAL (Zero Embedding Generation / Text Index Fallback)
  // Scoped strictly to tenantCondition to ensure teacher isolation
  try {
    const textToScan = `${lessonName || ''} ${queryText || ''}`;
    const keywords = textToScan
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 3 &&
          !['question', 'solve', 'verify', 'find', 'calculate', 'marks', 'step', 'answer', 'equation'].includes(
            w.toLowerCase()
          )
      )
      .slice(0, 8);

    if (keywords.length > 0) {
      const keywordOr = keywords.map((w) => ({
        $or: [
          { lessonName: new RegExp(w, 'i') },
          { chunkText: new RegExp(w, 'i') },
          { sourceFileName: new RegExp(w, 'i') },
        ],
      }));

      const keywordFilter = {
        $and: [
          tenantCondition,
          ...(subjectRegex ? [{ subject: subjectRegex }] : []),
          ...(gradeRegex ? [{ grade: gradeRegex }] : []),
          { $or: keywordOr },
        ],
      };

      const fastChunks = await SyllabusChunk.find(keywordFilter)
        .select('documentId chunkId sourceFileName pageNumber pageRange chunkIndex chunkText lessonName grade subject isShared contentHash')
        .limit(topK * 2)
        .lean();

      const uniqueFast = deduplicateChunks(fastChunks).slice(0, topK);

      if (uniqueFast && uniqueFast.length > 0) {
        return {
          chunks: uniqueFast,
          retrievalMethod: 'fast_keyword_lookup',
          isDegraded: true,
          vectorSearchAvailable: false,
          vectorDimensions: 768,
        };
      }
    }

    // Secondary grade/subject fallback scoped to tenant
    const fallbackFilter = {
      $and: [
        tenantCondition,
        ...(subjectRegex ? [{ subject: subjectRegex }] : []),
        ...(gradeRegex ? [{ grade: gradeRegex }] : []),
      ],
    };

    const gradeChunks = await SyllabusChunk.find(fallbackFilter)
      .select('documentId chunkId sourceFileName pageNumber pageRange chunkIndex chunkText lessonName grade subject isShared contentHash')
      .limit(topK * 2)
      .lean();

    const uniqueGrade = deduplicateChunks(gradeChunks).slice(0, topK);

    if (uniqueGrade && uniqueGrade.length > 0) {
      return {
        chunks: uniqueGrade,
        retrievalMethod: 'preindexed_grade_subject',
        isDegraded: true,
        vectorSearchAvailable: false,
        vectorDimensions: 768,
      };
    }
  } catch (err) {
    console.warn('[RetrievalService] Pre-indexed lookup note:', err.message);
  }

  // 4. No relevant passages found
  return {
    chunks: [],
    retrievalMethod: 'none_found',
    isDegraded: true,
    vectorSearchAvailable: false,
    vectorDimensions: dimension,
    message: 'No relevant curriculum passages found for this topic/question.',
  };
}

/**
 * Formats retrieved chunks into bounded evidence text suitable for LLM context prompts.
 */
export function formatChunksAsEvidence(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'No relevant syllabus excerpts found for this topic.';
  }

  return chunks
    .map((chunk, idx) => {
      const source = chunk.sourceFileName || 'Syllabus';
      const page = chunk.pageRange
        ? `Pages ${chunk.pageRange}`
        : chunk.pageNumber
        ? `Page ${chunk.pageNumber}`
        : 'General';
      const topic = chunk.lessonName ? `Topic: ${chunk.lessonName}` : '';
      return `[Exemplar/Syllabus Passage ${idx + 1}] (${source}, ${page} ${topic}):\n"${chunk.chunkText.trim()}"`;
    })
    .join('\n\n');
}

export default {
  retrieveRelevantSyllabusChunks,
  formatChunksAsEvidence,
};
