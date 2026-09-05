/**
 * Provider-neutral embedding adapters.
 *
 * Contract:
 *   embedDocuments(records) -> { key, vector, contentHash }[]
 *   embedQuery(query) -> Float64Array | number[]
 *
 * Retrieval code must not depend on vendor response shapes.
 */

import crypto from 'node:crypto';
import { tokenize, recordKey } from './kb-retrieve-core.mjs';

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function recordEmbedText(record) {
  return [record.title, (record.tags || []).join(' '), record.text].filter(Boolean).join('\n');
}

function l2Normalize(vec) {
  let n = 0;
  for (const v of vec) n += v * v;
  n = Math.sqrt(n) || 1;
  return vec.map((v) => v / n);
}

/** Stable string hash → bucket in [0, dim). */
function hashBucket(token, dim, seed = 0) {
  const h = crypto.createHash('sha256').update(`${seed}:${token}`).digest();
  return h.readUInt32BE(0) % dim;
}

/**
 * Classical TF-IDF dense vectors over corpus vocabulary.
 * Free, local, deterministic. Cost ≈ $0.
 */
export class TfidfEmbedder {
  constructor(options = {}) {
    this.id = 'tfidf_local_v1';
    this.provider = 'local';
    this.model = 'tfidf-unigram';
    this.maxFeatures = options.maxFeatures ?? 2048;
    this.dimensions = null;
    this.vocab = null;
    this.idf = null;
    this.fitted = false;
    this.costPer1kTokensUsd = 0;
  }

  fit(records) {
    const df = new Map();
    const docs = records.map((r) => tokenize(recordEmbedText(r)));
    for (const tokens of docs) {
      for (const t of new Set(tokens)) {
        df.set(t, (df.get(t) || 0) + 1);
      }
    }
    const N = Math.max(docs.length, 1);
    const ranked = [...df.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, this.maxFeatures);
    this.vocab = new Map(ranked.map(([t], i) => [t, i]));
    this.idf = new Float64Array(ranked.length);
    ranked.forEach(([t, dfi], i) => {
      this.idf[i] = Math.log((N + 1) / (dfi + 1)) + 1;
    });
    this.dimensions = this.vocab.size;
    this.fitted = true;
    return this;
  }

  _vectorize(tokens) {
    if (!this.fitted) throw new Error('TfidfEmbedder.fit() required before embed');
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Float64Array(this.dimensions);
    for (const [t, count] of tf) {
      const i = this.vocab.get(t);
      if (i === undefined) continue;
      vec[i] = (1 + Math.log(count)) * this.idf[i];
    }
    return l2Normalize(Array.from(vec));
  }

  async embedDocuments(records) {
    if (!this.fitted) this.fit(records);
    return records.map((r) => ({
      key: recordKey(r),
      contentHash: r.contentHash,
      vector: this._vectorize(tokenize(recordEmbedText(r))),
    }));
  }

  async embedQuery(query) {
    if (!this.fitted) throw new Error('TfidfEmbedder.fit() required before embedQuery');
    return this._vectorize(tokenize(query));
  }
}

/**
 * Hashed word + character n-gram embeddings (feature hashing).
 * Second local backend with different geometry than TF-IDF.
 * Free, local, near-deterministic. Cost ≈ $0.
 */
export class HashedNgramEmbedder {
  constructor(options = {}) {
    this.id = 'hashed_ngram_local_v1';
    this.provider = 'local';
    this.model = 'word+char3-hash';
    this.dimensions = options.dimensions ?? 384;
    this.costPer1kTokensUsd = 0;
    this.docFreq = new Map();
    this.nDocs = 0;
    this.fitted = false;
  }

  _features(text) {
    const tokens = tokenize(text);
    const feats = [...tokens];
    const compact = tokens.join(' ');
    for (let i = 0; i < compact.length - 2; i += 1) {
      feats.push(`#${compact.slice(i, i + 3)}`);
    }
    return feats;
  }

  fit(records) {
    this.docFreq = new Map();
    this.nDocs = records.length;
    for (const r of records) {
      const feats = new Set(this._features(recordEmbedText(r)));
      for (const f of feats) this.docFreq.set(f, (this.docFreq.get(f) || 0) + 1);
    }
    this.fitted = true;
    return this;
  }

  _vectorize(text) {
    const feats = this._features(text);
    const vec = new Float64Array(this.dimensions);
    const tf = new Map();
    for (const f of feats) tf.set(f, (tf.get(f) || 0) + 1);
    const N = Math.max(this.nDocs, 1);
    for (const [f, count] of tf) {
      const df = this.docFreq.get(f) || 0;
      const idf = Math.log((N + 1) / (df + 1)) + 1;
      const i = hashBucket(f, this.dimensions, 17);
      const sign = hashBucket(f, 2, 99) === 0 ? 1 : -1;
      vec[i] += sign * (1 + Math.log(count)) * idf;
    }
    return l2Normalize(Array.from(vec));
  }

  async embedDocuments(records) {
    if (!this.fitted) this.fit(records);
    return records.map((r) => ({
      key: recordKey(r),
      contentHash: r.contentHash,
      vector: this._vectorize(recordEmbedText(r)),
    }));
  }

  async embedQuery(query) {
    if (!this.fitted) throw new Error('HashedNgramEmbedder.fit() required before embedQuery');
    return this._vectorize(query);
  }
}

/**
 * Optional neural local embedder via @xenova/transformers (MiniLM).
 * Loaded dynamically; if package missing, createEmbedder throws clearly.
 */
export class MiniLmLocalEmbedder {
  constructor(options = {}) {
    this.id = 'minilm_local_v1';
    this.provider = 'local';
    this.model = options.model || 'Xenova/all-MiniLM-L6-v2';
    this.dimensions = 384;
    this.costPer1kTokensUsd = 0;
    this._pipe = null;
  }

  async _ensure() {
    if (this._pipe) return this._pipe;
    const { pipeline, env } = await import('@xenova/transformers');
    env.allowLocalModels = false;
    this._pipe = await pipeline('feature-extraction', this.model, {
      quantized: true,
    });
    return this._pipe;
  }

  async _embedOne(text) {
    const extractor = await this._ensure();
    const out = await extractor(String(text || '').slice(0, 2000), {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(out.data);
  }

  async embedDocuments(records) {
    const result = [];
    for (const r of records) {
      result.push({
        key: recordKey(r),
        contentHash: r.contentHash,
        vector: await this._embedOne(recordEmbedText(r)),
      });
    }
    if (result[0]) this.dimensions = result[0].vector.length;
    return result;
  }

  async embedQuery(query) {
    return this._embedOne(query);
  }
}

export async function createEmbedder(name, options = {}) {
  switch (name) {
    case 'tfidf':
    case 'tfidf_local_v1':
      return new TfidfEmbedder(options);
    case 'hashed':
    case 'hashed_ngram_local_v1':
      return new HashedNgramEmbedder(options);
    case 'minilm':
    case 'minilm_local_v1': {
      try {
        await import('@xenova/transformers');
      } catch {
        throw new Error(
          'minilm embedder requires @xenova/transformers. Install with: npm i -D @xenova/transformers'
        );
      }
      return new MiniLmLocalEmbedder(options);
    }
    default:
      throw new Error(`Unknown embedder: ${name}`);
  }
}

export function estimateEmbedCostUsd(tokenEstimate, costPer1k) {
  return (tokenEstimate / 1000) * (costPer1k || 0);
}

export function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4));
}
