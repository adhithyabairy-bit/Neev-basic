import crypto from 'crypto';

/**
 * Pluggable Embedding Service for Neev RAG Pipeline
 * Generates vector representations of syllabus text chunks and retrieval queries.
 *
 * Supports:
 * - Real OpenAI/OpenAI-compatible embedding models (e.g. text-embedding-3-small)
 * - Deterministic offline mock provider for testing and development with zero external API costs.
 */

const DEFAULT_DIMENSION = 1536;

/**
 * Calculates cosine similarity between two normalized vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates a deterministic normalized 1536-dimensional vector from text using term hashing.
 * Semantically similar texts sharing vocabulary share higher dot products.
 */
function generateDeterministicVector(text, dimension = DEFAULT_DIMENSION) {
  const vector = new Float32Array(dimension);
  if (!text || typeof text !== 'string') return Array.from(vector);

  const clean = text.toLowerCase();
  const words = clean.match(/[a-z0-9_-]+/g) || [];

  for (const word of words) {
    // Generate two hash codes for bucket placement and sign
    const hash = crypto.createHash('sha256').update(word).digest();
    const idx1 = hash.readUInt16LE(0) % dimension;
    const idx2 = hash.readUInt16LE(2) % dimension;
    const sign1 = (hash[4] % 2 === 0 ? 1 : -1) * (word.length > 3 ? 1.5 : 1.0);
    const sign2 = (hash[5] % 2 === 0 ? 1 : -1) * (word.length > 5 ? 2.0 : 1.0);

    vector[idx1] += sign1;
    vector[idx2] += sign2;
  }

  // Also encode character 3-grams for partial match tolerance
  for (let i = 0; i < clean.length - 2; i += 2) {
    const gram = clean.slice(i, i + 3);
    const gramHash = crypto.createHash('md5').update(gram).digest();
    const idx = gramHash.readUInt16LE(0) % dimension;
    vector[idx] += 0.4;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dimension; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimension; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return Array.from(vector);
}

class EmbeddingService {
  constructor() {
    this.provider = (process.env.EMBEDDING_PROVIDER || 'mock').toLowerCase();
    this.apiKey = process.env.EMBEDDING_API_KEY || null;
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.dimension = parseInt(process.env.EMBEDDING_DIMENSION, 10) || DEFAULT_DIMENSION;
  }

  getDimension() {
    return this.dimension;
  }

  getModelName() {
    return this.apiKey ? this.model : `deterministic-mock-${this.dimension}d`;
  }

  /**
   * Generates embedding for a single text string.
   * @param {string} text - Input text
   * @returns {Promise<number[]>} Vector array
   */
  async generateEmbedding(text) {
    const results = await this.generateBatchEmbeddings([text]);
    return results[0] || [];
  }

  /**
   * Generates embeddings for a batch of text strings.
   * @param {string[]} texts - Array of input texts
   * @returns {Promise<number[][]>} Array of vector arrays
   */
  async generateBatchEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];

    // If no external API key is configured or provider is mock, use deterministic provider
    if (!this.apiKey || this.provider === 'mock') {
      return texts.map((t) => generateDeterministicVector(t, this.dimension));
    }

    // Live OpenAI-compatible provider
    try {
      const endpoint = process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts.map((t) => (t || '').slice(0, 8000)),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          `Embedding API returned HTTP ${response.status}: ${errorJson.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return (data.data || []).map((item) => item.embedding);
    } catch (err) {
      console.warn(
        `[EmbeddingService] External embedding provider failed (${err.message}). Falling back to deterministic local embeddings.`
      );
      return texts.map((t) => generateDeterministicVector(t, this.dimension));
    }
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;

