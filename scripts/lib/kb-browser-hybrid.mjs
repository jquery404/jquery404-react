/**
 * Browser hybrid retrieval store (TODO 12).
 * Uses precomputed MiniLM document vectors + live MiniLM query embedding.
 * Does not load Node fs or EmbeddingIndex disk caches.
 */

import { MemoryKbStore, recordKey, tokenize } from './kb-retrieve-core.mjs';
import { DEFAULT_HYBRID_WEIGHTS } from './kb-evidence.mjs';

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

/**
 * @param {Map<string, number[]>|Record<string, number[]>} vectorsByKey
 * @param {(query: string) => Promise<number[]>} embedQuery
 */
export class BrowserHybridStore extends MemoryKbStore {
  constructor(options = {}) {
    super();
    this.mode = 'hybrid';
    this.hybridWeights = options.weights || { ...DEFAULT_HYBRID_WEIGHTS };
    this._vectors = new Map();
    if (options.vectors) {
      const entries =
        options.vectors instanceof Map
          ? options.vectors.entries()
          : Object.entries(options.vectors);
      for (const [k, v] of entries) this._vectors.set(k, v);
    }
    this.embedQuery = options.embedQuery;
    if (typeof this.embedQuery !== 'function') {
      throw new Error('BrowserHybridStore requires embedQuery(query) => Promise<number[]>');
    }
  }

  async searchAsync(query, options = {}) {
    const mode = options.mode || this.mode;
    const limit = options.limit ?? 10;
    const t0 = Date.now();
    let hits;
    if (mode === 'keyword' || mode === 'keyword_token_v1') {
      hits = super.search(query, { ...options, expandRelated: false });
    } else {
      hits = await this._hybridSearch(query, limit);
    }
    if (options.expandRelated) {
      for (const hit of hits) {
        hit.related = this.getRelated(recordKey(hit.record), { limit: 5 });
      }
    }
    return { hits, latencyMs: Date.now() - t0, mode };
  }

  search(query, options = {}) {
    return MemoryKbStore.prototype.search.call(this, query, options);
  }

  async _hybridSearch(query, limit) {
    const w = this.hybridWeights;
    const lexicalHits = super.search(query, { limit: 50, expandRelated: false });
    const lexMax = Math.max(...lexicalHits.map((h) => h.score), 1e-9);
    const lexRawMap = new Map(lexicalHits.map((h) => [h.key, h.score]));
    const lexMap = new Map(lexicalHits.map((h) => [h.key, h.score / lexMax]));

    const qv = await this.embedQuery(query);
    const semanticHits = [];
    for (const [key, vector] of this._vectors) {
      const score = cosineSimilarity(qv, vector);
      if (score > 0) semanticHits.push({ key, score });
    }
    semanticHits.sort((a, b) => b.score - a.score);
    const topSem = semanticHits.slice(0, 50);
    const semRawMap = new Map(topSem.map((h) => [h.key, h.score]));
    const semMax = Math.max(...topSem.map((h) => h.score), 1e-9);

    const keys = new Set([...lexMap.keys(), ...topSem.map((h) => h.key)]);
    const byKey = new Map(this.list().map((r) => [recordKey(r), r]));
    const qTokens = new Set(tokenize(query));
    const semMap = new Map(topSem.map((h) => [h.key, h.score / semMax]));

    const merged = [];
    for (const key of keys) {
      const rec = byKey.get(key);
      if (!rec) continue;
      const semRaw = semRawMap.get(key) || 0;
      const lexRaw = lexRawMap.get(key) || 0;
      const sem = semMap.get(key) || 0;
      const lex = lexMap.get(key) || 0;
      let exactBoost = 0;
      const idToks = tokenize(rec.id);
      const titleToks = tokenize(rec.title);
      if ([...qTokens].some((t) => idToks.includes(t) || titleToks.includes(t))) {
        exactBoost = w.exactBoost;
      }
      const score = w.semantic * sem + w.lexical * lex + exactBoost;
      if (score <= 0) continue;
      merged.push({
        key,
        score: Math.round(score * 100000) / 100000,
        reasons: [
          'hybrid',
          `sem=${sem.toFixed(3)}`,
          `lex=${lex.toFixed(3)}`,
          `semRaw=${semRaw.toFixed(4)}`,
          `lexRaw=${Number(lexRaw).toFixed(1)}`,
        ],
        type: rec.type,
        id: rec.id,
        title: rec.title,
        route: rec.route ?? null,
        alsoRoutes: rec.alsoRoutes || [],
        contentHash: rec.contentHash,
        record: structuredClone(rec),
      });
    }
    merged.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });
    return merged.slice(0, limit);
  }
}

/**
 * Create MiniLM query embedder for browser (CDN) or Node (@xenova/transformers).
 */
export async function createMiniLmQueryEmbedder(options = {}) {
  const model = options.model || 'Xenova/all-MiniLM-L6-v2';
  let pipe = null;
  // Always load via CDN ESM in this browser-oriented module so esbuild does not
  // pull onnxruntime-node into public/assets/kb/runtime.mjs.
  const cdnUrl =
    options.cdnUrl || 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm';

  async function ensure() {
    if (pipe) return pipe;
    const transformers = await import(/* webpackIgnore: true */ cdnUrl);
    const { pipeline, env } = transformers;
    if (env) env.allowLocalModels = false;
    pipe = await pipeline('feature-extraction', model, { quantized: true });
    return pipe;
  }

  return {
    id: 'minilm_local_v1',
    model,
    async embedQuery(query) {
      const extractor = await ensure();
      const out = await extractor(String(query || '').slice(0, 2000), {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(out.data);
    },
    async warm() {
      await ensure();
      await this.embedQuery('warmup');
    },
  };
}
