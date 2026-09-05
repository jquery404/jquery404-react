/**
 * Semantic / hybrid retrieval backends behind the KbStore search surface.
 * Keyword scoring stays in kb-retrieve.mjs; this module adds vector modes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { MemoryKbStore, recordKey, scoreRecord, tokenize } from './kb-retrieve-core.mjs';
import { cosineSimilarity, createEmbedder, recordEmbedText, estimateTokens } from './kb-embed.mjs';

/**
 * Incremental embedding index keyed by recordKey + contentHash.
 */
export class EmbeddingIndex {
  constructor(embedder, options = {}) {
    this.embedder = embedder;
    this.vectors = new Map(); // key -> { contentHash, vector, dims }
    this.cachePath = options.cachePath || null;
    this.stats = {
      embedded: 0,
      skippedUnchanged: 0,
      removed: 0,
      loadMs: 0,
      embedMs: 0,
      tokensEmbedded: 0,
    };
  }

  loadCache() {
    if (!this.cachePath || !fs.existsSync(this.cachePath)) return;
    const t0 = Date.now();
    const doc = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
    if (doc.embedderId && doc.embedderId !== this.embedder.id) return;
    this.vectors = new Map();
    for (const row of doc.vectors || []) {
      this.vectors.set(row.key, {
        contentHash: row.contentHash,
        vector: row.vector,
        dims: row.vector?.length,
      });
    }
    this.stats.loadMs = Date.now() - t0;
  }

  saveCache(meta = {}) {
    if (!this.cachePath) return null;
    fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
    const doc = {
      _meta: {
        description: 'Experimental embedding cache. Not production site assets.',
        embedderId: this.embedder.id,
        provider: this.embedder.provider,
        model: this.embedder.model,
        dimensions: this.embedder.dimensions,
        ...meta,
      },
      embedderId: this.embedder.id,
      vectors: [...this.vectors.entries()].map(([key, v]) => ({
        key,
        contentHash: v.contentHash,
        vector: v.vector,
      })),
    };
    fs.writeFileSync(this.cachePath, `${JSON.stringify(doc)}\n`, 'utf8');
    return this.cachePath;
  }

  /**
   * Sync embeddings using contentHash: unchanged skip, changed/new embed, deleted remove.
   * Corpus-fit embedders must be fitted once before sync (or will fit on first call).
   */
  async syncRecords(records) {
    const nextKeys = new Set(records.map((r) => recordKey(r)));
    for (const key of [...this.vectors.keys()]) {
      if (!nextKeys.has(key)) {
        this.vectors.delete(key);
        this.stats.removed += 1;
      }
    }

    if (typeof this.embedder.fit === 'function' && !this.embedder.fitted) {
      this.embedder.fit(records);
    }

    const toEmbed = [];
    for (const r of records) {
      const key = recordKey(r);
      const prev = this.vectors.get(key);
      if (prev && prev.contentHash === r.contentHash) {
        this.stats.skippedUnchanged += 1;
      } else {
        toEmbed.push(r);
      }
    }

    if (toEmbed.length) {
      const t0 = Date.now();
      const embedded = await this.embedder.embedDocuments(toEmbed);
      this.stats.embedMs += Date.now() - t0;
      for (const row of embedded) {
        const src = toEmbed.find((r) => recordKey(r) === row.key);
        this.vectors.set(row.key, {
          contentHash: row.contentHash,
          vector: row.vector,
          dims: row.vector.length,
        });
        this.stats.embedded += 1;
        this.stats.tokensEmbedded += estimateTokens(recordEmbedText(src || {}));
      }
      this.embedder.dimensions = embedded[0]?.vector?.length ?? this.embedder.dimensions;
    }

    return { ...this.stats, indexed: this.vectors.size };
  }

  async queryVector(query) {
    return this.embedder.embedQuery(query);
  }

  searchByVector(queryVec, recordsByKey, options = {}) {
    const limit = options.limit ?? 10;
    const scored = [];
    for (const [key, row] of this.vectors) {
      const rec = recordsByKey.get(key);
      if (!rec) continue;
      const score = cosineSimilarity(queryVec, row.vector);
      if (score <= 0) continue;
      scored.push({
        key,
        score: Math.round(score * 100000) / 100000,
        reasons: ['semantic_cosine'],
        type: rec.type,
        id: rec.id,
        title: rec.title,
        route: rec.route ?? null,
        alsoRoutes: rec.alsoRoutes || [],
        contentHash: rec.contentHash,
        record: structuredClone(rec),
      });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });
    return scored.slice(0, limit);
  }
}

/**
 * Store that supports keyword | semantic | hybrid search modes.
 * Extends MemoryKbStore so get/upsert/applyDiff/getRelated stay identical.
 */
export class RetrievalStore extends MemoryKbStore {
  constructor(options = {}) {
    super();
    this.mode = options.mode || 'keyword_token_v1';
    this.embeddingIndex = options.embeddingIndex || null;
    this.hybridWeights = options.hybridWeights || {
      semantic: 0.65,
      lexical: 0.35,
      exactBoost: 0.15,
    };
  }

  async ensureSemanticReady(records) {
    if (!this.embeddingIndex) return;
    // Fit hashed/tfidf on full corpus before first sync if needed
    const emb = this.embeddingIndex.embedder;
    if (typeof emb.fit === 'function') emb.fit(records);
    await this.embeddingIndex.syncRecords(records);
  }

  /**
   * @param {string} query
   * @param {{ limit?: number, expandRelated?: boolean, mode?: string }} [options]
   */
  async searchAsync(query, options = {}) {
    const mode = options.mode || this.mode;
    const limit = options.limit ?? 10;
    const t0 = Date.now();
    let hits;

    if (mode === 'keyword_token_v1' || mode === 'keyword') {
      hits = super.search(query, { ...options, expandRelated: false });
    } else if (mode === 'hybrid' || mode.startsWith('hybrid')) {
      hits = await this._hybridSearch(query, limit);
    } else {
      // Any semantic_* mode uses the configured embeddingIndex
      hits = await this._semanticSearch(query, limit);
    }

    if (options.expandRelated) {
      for (const hit of hits) {
        hit.related = this.getRelated(recordKey(hit.record), { limit: 5 });
      }
    }

    return { hits, latencyMs: Date.now() - t0, mode };
  }

  // Lexical-only sync search (always available for hybrid probes / evidence packs)
  search(query, options = {}) {
    return MemoryKbStore.prototype.search.call(this, query, options);
  }

  async _semanticSearch(query, limit) {
    if (!this.embeddingIndex) throw new Error('No embeddingIndex configured');
    const qv = await this.embeddingIndex.queryVector(query);
    const byKey = new Map(this.list().map((r) => [recordKey(r), r]));
    return this.embeddingIndex.searchByVector(qv, byKey, { limit });
  }

  async _hybridSearch(query, limit) {
    const w = this.hybridWeights;
    const lexicalHits = super.search(query, { limit: 50, expandRelated: false });
    const lexMax = Math.max(...lexicalHits.map((h) => h.score), 1e-9);
    const lexRawMap = new Map(lexicalHits.map((h) => [h.key, h.score]));
    const lexMap = new Map(lexicalHits.map((h) => [h.key, h.score / lexMax]));

    const semanticHits = await this._semanticSearch(query, 50);
    const semRawMap = new Map(semanticHits.map((h) => [h.key, h.score]));
    const semMax = Math.max(...semanticHits.map((h) => h.score), 1e-9);
    const keys = new Set([...lexMap.keys(), ...semanticHits.map((h) => h.key)]);
    const byKey = new Map(this.list().map((r) => [recordKey(r), r]));
    const qTokens = new Set(tokenize(query));

    const merged = [];
    for (const key of keys) {
      const rec = byKey.get(key);
      if (!rec) continue;
      const semRaw = semRawMap.get(key) || 0;
      const lexRaw = lexRawMap.get(key) || 0;
      const sem = semRaw / semMax;
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

export { createEmbedder, scoreRecord };
