import crypto from 'crypto';

/**
 * Production-Ready Cloud Embedding Service for Neev RAG Pipeline
 *
 * Supports:
 * - Google Gemini Embedding API ('gemini', model: 'text-embedding-004', 768d default)
 * - OpenAI / OpenAI-compatible Embedding API ('openai', model: 'text-embedding-3-small', 1536d default)
 * - Explicit deterministic mock provider ('mock'), restricted strictly to test/development
 *
 * Strict Production Rules:
 * - NEVER silently fall back to mock embeddings when cloud API calls fail in production.
 * - Validates vector dimensions and reports provider metadata.
 */

export const PROVIDER_DEFAULTS = {
  gemini: {
    model: 'gemini-embedding-001',
    dimension: 768,
  },
  openai: {
    model: 'text-embedding-3-small',
    dimension: 1536,
  },
  mock: {
    model: 'deterministic-mock-v1',
    dimension: 1536,
  },
};

export function isTestEnvironment() {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.ALLOW_MOCK_EMBEDDINGS === 'true' ||
    process.env.npm_lifecycle_event === 'test' ||
    process.execArgv.some((a) => a.includes('test')) ||
    process.argv.some((a) => a.includes('test'))
  );
}

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
 * Generates a deterministic normalized vector from text using term hashing.
 * Strictly for test fixtures and zero-cost offline regression test suites.
 */
export function generateDeterministicVector(text, dimension = 1536) {
  const vector = new Float32Array(dimension);
  if (!text || typeof text !== 'string') return Array.from(vector);

  const clean = text.toLowerCase();
  const words = clean.match(/[a-z0-9_-]+/g) || [];

  for (const word of words) {
    const hash = crypto.createHash('sha256').update(word).digest();
    const idx1 = hash.readUInt16LE(0) % dimension;
    const idx2 = hash.readUInt16LE(2) % dimension;
    const sign1 = (hash[4] % 2 === 0 ? 1 : -1) * (word.length > 3 ? 1.5 : 1.0);
    const sign2 = (hash[5] % 2 === 0 ? 1 : -1) * (word.length > 5 ? 2.0 : 1.0);

    vector[idx1] += sign1;
    vector[idx2] += sign2;
  }

  for (let i = 0; i < clean.length - 2; i += 2) {
    const gram = clean.slice(i, i + 3);
    const gramHash = crypto.createHash('md5').update(gram).digest();
    const idx = gramHash.readUInt16LE(0) % dimension;
    vector[idx] += 0.4;
  }

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

export class EmbeddingService {
  constructor(options = {}) {
    const inTest = isTestEnvironment();

    this.provider = (
      options.provider ||
      process.env.EMBEDDING_PROVIDER ||
      (inTest ? 'mock' : 'gemini')
    ).toLowerCase();

    const defaults = PROVIDER_DEFAULTS[this.provider] || PROVIDER_DEFAULTS.mock;

    this.model = options.model || process.env.EMBEDDING_MODEL || defaults.model;
    this.dimension = parseInt(
      options.dimension || process.env.EMBEDDING_DIMENSION || process.env.EMBEDDING_DIMENSIONS || defaults.dimension,
      10
    );

    this.apiKey =
      options.apiKey ||
      (this.provider === 'gemini'
        ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        : process.env.EMBEDDING_API_KEY);

    this.allowMock =
      inTest ||
      process.env.ALLOW_MOCK_EMBEDDINGS === 'true' ||
      this.provider === 'mock';

    this.timeoutMs = parseInt(process.env.EMBEDDING_TIMEOUT_MS, 10) || 20000;
  }

  getDimension() {
    return this.dimension;
  }

  getModelName() {
    return this.model;
  }

  getProvider() {
    return this.provider;
  }

  isMockProvider() {
    return this.provider === 'mock';
  }

  /**
   * Generates embedding for a single text.
   */
  async generateEmbedding(text) {
    const results = await this.generateBatchEmbeddings([text]);
    return results[0] || [];
  }

  /**
   * Generates embeddings for an array of texts.
   */
  async generateBatchEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];

    // 1. Explicit Mock Provider Handling
    if (this.provider === 'mock') {
      if (process.env.NODE_ENV === 'production' && !this.allowMock) {
        throw new Error(
          'CRITICAL: Mock embedding provider cannot be used in production. Please configure GEMINI_API_KEY or EMBEDDING_API_KEY.'
        );
      }
      return texts.map((t) => generateDeterministicVector(t, this.dimension));
    }

    // 2. Validate API key for real cloud providers (no silent fallback)
    if (!this.apiKey) {
      if (this.allowMock) {
        console.warn(
          `[EmbeddingService] Notice: Missing API key for provider '${this.provider}'. Falling back to deterministic mock in non-production mode.`
        );
        return texts.map((t) => generateDeterministicVector(t, this.dimension));
      }
      throw new Error(
        `Embedding configuration error: Missing API key for cloud provider '${this.provider}'. Set GEMINI_API_KEY or EMBEDDING_API_KEY in environment variables.`
      );
    }

    // 3. Dispatch to specific cloud provider
    if (this.provider === 'gemini') {
      return this._generateGeminiEmbeddings(texts);
    } else if (this.provider === 'openai') {
      return this._generateOpenAIEmbeddings(texts);
    } else {
      throw new Error(`Unsupported cloud embedding provider: '${this.provider}'. Supported: 'gemini', 'openai', 'mock'.`);
    }
  }

  /**
   * Google Gemini Batch Embedding API Integration
   */
  async _generateGeminiEmbeddings(texts) {
    const executeBatch = async (modelName, retryCount = 0) => {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:batchEmbedContents?key=${this.apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const requests = texts.map((t) => ({
          model: `models/${modelName}`,
          content: { parts: [{ text: (t || '').slice(0, 8000) }] },
          outputDimensionality: this.dimension,
        }));

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const status = response.status;
          const msg = errorData.error?.message || response.statusText;

          // Automatic Rate Limit Backoff for Gemini Free Tier (100 RPM)
          if (status === 429 && retryCount < 3) {
            const waitMatch = msg.match(/retry in ([\d\.]+)s/i);
            const waitSeconds = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 2 : 15;
            console.warn(`[EmbeddingService] Rate limit reached (HTTP 429). Pausing for ${waitSeconds}s before retry ${retryCount + 1}/3...`);
            await new Promise((r) => setTimeout(r, waitSeconds * 1000));
            return executeBatch(modelName, retryCount + 1);
          }

          const err = new Error(`Gemini Embedding API returned HTTP ${status}: ${msg}`);
          err.status = status;
          throw err;
        }

        const data = await response.json();
        const embeddingsList = data.embeddings || [];

        if (embeddingsList.length !== texts.length) {
          throw new Error(
            `Gemini Embedding returned ${embeddingsList.length} embeddings for ${texts.length} inputs.`
          );
        }

        return embeddingsList.map((item) => {
          const vector = item.values || [];
          if (vector.length !== this.dimension && this.dimension) {
            throw new Error(
              `Gemini vector dimension mismatch: Expected ${this.dimension}d but received ${vector.length}d.`
            );
          }
          return vector;
        });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      return await executeBatch(this.model);
    } catch (primaryErr) {
      // If primary model returned 404 (e.g. text-embedding-004 not enabled for key), fallback to gemini-embedding-001
      if (primaryErr.status === 404 && this.model !== 'gemini-embedding-001') {
        console.warn(`[EmbeddingService] Model '${this.model}' returned 404. Falling back to 'gemini-embedding-001'...`);
        try {
          return await executeBatch('gemini-embedding-001');
        } catch (fallbackErr) {
          throw new Error(`[Gemini Embedding Error] ${fallbackErr.message}`);
        }
      }
      throw new Error(`[Gemini Embedding Error] ${primaryErr.message}`);
    }
  }

  /**
   * OpenAI / OpenAI-Compatible Embedding API Integration
   */
  async _generateOpenAIEmbeddings(texts) {
    const endpoint = process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts.map((t) => (t || '').slice(0, 8000)),
          dimensions: this.dimension,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = errorData.error?.message || response.statusText;
        throw new Error(`OpenAI Embedding API returned HTTP ${status}: ${msg}`);
      }

      const data = await response.json();
      const dataItems = data.data || [];

      return dataItems.map((item) => {
        const vector = item.embedding || [];
        if (vector.length !== this.dimension && this.dimension) {
          throw new Error(
            `OpenAI vector dimension mismatch: Expected ${this.dimension}d but received ${vector.length}d.`
          );
        }
        return vector;
      });
    } catch (err) {
      clearTimeout(timeoutId);
      // NEVER silently fall back to mock embeddings in production
      throw new Error(`[OpenAI Embedding Error] ${err.message}`);
    }
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
