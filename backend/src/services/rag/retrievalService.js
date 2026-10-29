import mongoose from 'mongoose';
import SyllabusChunk from '../../models/SyllabusChunk.js';
import embeddingService, { cosineSimilarity } from './embeddingService.js';

/**
 * Retrieval Service for Syllabus RAG
 * Searches persistent syllabus chunks using Atlas Vector Search or cosine similarity fallback.
 * Strictly isolates chunks by teacherId so teachers never access other teachers' private syllabus documents.
 */

/**
 * Retrieves the most relevant syllabus text passages for a given query and lesson context.
 *
 * @param {Object} params
 * @param {ObjectId} params.teacherId - Authenticated teacher ID
 * @param {string} params.queryText - Question text, answer context, or topic query
 * @param {string} params.subject - Subject filter (e.g. 'Mathematics')
 * @param {string} params.grade - Grade filter (e.g. 'Grade 8')
 * @param {string} params.lessonName - Optional lesson/topic filter
 * @param {number} params.topK - Number of passages to retrieve (default: 4)
 * @returns {Promise<{ chunks: Array<Object>, retrievalMethod: string }>}
 */
export async function retrieveRelevantSyllabusChunks({
  teacherId,
  queryText,
  subject = '',
  grade = '',
  lessonName = '',
  topK = 4,
}) {
  if (!queryText || !queryText.trim()) {
    return { chunks: [], retrievalMethod: 'empty-query' };
  }

  // If database is not connected (e.g. offline unit testing), return empty chunks
  if (mongoose.connection.readyState !== 1) {
    return {
      chunks: [],
      retrievalMethod: 'db-offline-fallback',
    };
  }

  // 1. Generate query embedding vector
  const queryEmbedding = await embeddingService.generateEmbedding(queryText);
  const vectorIndexName = process.env.ATLAS_VECTOR_INDEX_NAME || 'syllabus_vector_index';

  // 2. Try Atlas Vector Search ($vectorSearch)
  try {
    const filterConditions = {
      teacherId,
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
          limit: topK,
          filter: filterConditions,
        },
      },
      {
        $project: {
          documentId: 1,
          sourceFileName: 1,
          pageNumber: 1,
          chunkIndex: 1,
          chunkText: 1,
          lessonName: 1,
          grade: 1,
          subject: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const atlasResults = await SyllabusChunk.aggregate(pipeline);

    if (atlasResults && atlasResults.length > 0) {
      return {
        chunks: atlasResults,
        retrievalMethod: 'atlas-vector',
      };
    }
  } catch (atlasErr) {
    // Atlas Vector Search is not enabled on local/non-Atlas instances or index is pending
    // We seamlessly fall back to local cosine similarity calculation
  }

  // 3. Fallback: Query chunks from MongoDB filtered by teacher & subject, then compute cosine similarity
  try {
    const filter = { teacherId };
    if (subject) filter.subject = subject;
    if (grade) filter.grade = grade;

    // Retrieve candidate chunks
    const candidates = await SyllabusChunk.find(filter)
      .select('documentId sourceFileName pageNumber chunkIndex chunkText lessonName grade subject embedding')
      .limit(200)
      .lean();

    if (candidates && candidates.length > 0) {
      const scoredCandidates = candidates
        .map((chunk) => {
          const score = chunk.embedding && chunk.embedding.length > 0
            ? cosineSimilarity(queryEmbedding, chunk.embedding)
            : 0;
          return {
            ...chunk,
            score: Math.round(score * 100) / 100,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      // Return if best score exceeds a baseline
      if (scoredCandidates.length > 0 && scoredCandidates[0].score > 0) {
        return {
          chunks: scoredCandidates,
          retrievalMethod: 'cosine-similarity-fallback',
        };
      }
    }
  } catch (fallbackErr) {
    console.warn('[RetrievalService] Cosine fallback warning:', fallbackErr.message);
  }

  // 4. Keyword text search fallback
  try {
    const keywordResults = await SyllabusChunk.find(
      {
        teacherId,
        $text: { $search: queryText },
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(topK)
      .lean();

    if (keywordResults && keywordResults.length > 0) {
      return {
        chunks: keywordResults,
        retrievalMethod: 'keyword-fallback',
      };
    }
  } catch (keywordErr) {
    // Text index might not be built or text query empty
  }

  // If no passages found, return empty list gracefully
  return {
    chunks: [],
    retrievalMethod: 'none-found',
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
      const page = chunk.pageNumber ? `Page ${chunk.pageNumber}` : 'General';
      const topic = chunk.lessonName ? `Topic: ${chunk.lessonName}` : '';
      return `[Exemplar/Syllabus Passage ${idx + 1}] (${source}, ${page} ${topic}):\n"${chunk.chunkText.trim()}"`;
    })
    .join('\n\n');
}

export default {
  retrieveRelevantSyllabusChunks,
  formatChunksAsEvidence,
};

