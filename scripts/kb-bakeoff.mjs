#!/usr/bin/env node
/**
 * Semantic vs keyword retrieval bake-off (TODO 7).
 *
 * Usage:
 *   node scripts/kb-bakeoff.mjs
 *   node scripts/kb-bakeoff.mjs --skip-minilm
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, contentHash } from './lib/kb-normalize.mjs';
import { loadNormalizedPreview } from './lib/kb-retrieve.mjs';
import { createEmbedder, estimateEmbedCostUsd } from './lib/kb-embed.mjs';
import { RetrievalStore, EmbeddingIndex } from './lib/kb-semantic-store.mjs';
import {
  loadJudgments,
  gradesFor,
  expandHitsWithRelated,
  precisionAtK,
  recallAtK,
  mrr,
  irrelevantRate,
  summarizeMethod,
  renderBakeoffMarkdown,
  buildInterpretation,
  pickRecommendation,
} from './lib/kb-bakeoff.mjs';

const args = new Set(process.argv.slice(2));
const skipMiniLm = args.has('--skip-minilm');
const outDir = path.join(REPO_ROOT, 'docs/generated');
const cacheDir = path.join(outDir, 'embeddings');
const judgmentsPath = path.join(REPO_ROOT, 'scripts/fixtures/kb_retrieval_judgments.json');

const HYBRID_WEIGHTS = { semantic: 0.65, lexical: 0.35, exactBoost: 0.15 };

async function buildSemanticStore(records, embedderName) {
  const embedder = await createEmbedder(embedderName);
  const cachePath = path.join(cacheDir, `${embedder.id}.json`);
  const index = new EmbeddingIndex(embedder, { cachePath });
  index.loadCache();
  // Reset per-run counters after load
  index.stats.embedded = 0;
  index.stats.skippedUnchanged = 0;
  index.stats.removed = 0;
  index.stats.embedMs = 0;
  index.stats.tokensEmbedded = 0;

  const t0 = Date.now();
  if (typeof embedder.fit === 'function') embedder.fit(records);
  const syncStats = await index.syncRecords(records);
  const indexMs = Date.now() - t0;
  index.saveCache({ indexedAt: new Date().toISOString(), syncStats });

  const store = new RetrievalStore({
    mode: `semantic_${embedder.id}`,
    embeddingIndex: index,
    hybridWeights: HYBRID_WEIGHTS,
  });
  store.syncRecords(records);

  return {
    store,
    embedder,
    index,
    indexMs,
    syncStats,
    embedCostUsd: estimateEmbedCostUsd(syncStats.tokensEmbedded || 0, embedder.costPer1kTokensUsd),
    queryCostUsd: 0,
  };
}

async function runMethodOnQuery(store, methodId, query, grades, expansion) {
  const limit = 5;
  const t0 = Date.now();
  let hits;
  let latencyMs;

  if (methodId === 'keyword_token_v1') {
    hits = store.search(query, { limit: expansion === 'related' ? 15 : limit });
    latencyMs = Date.now() - t0;
  } else {
    const mode = methodId.startsWith('hybrid') ? 'hybrid' : methodId;
    const result = await store.searchAsync(query, {
      limit: expansion === 'related' ? 15 : limit,
      mode,
    });
    hits = result.hits;
    latencyMs = result.latencyMs;
  }

  if (expansion === 'related') {
    hits = expandHitsWithRelated(hits, store, { limit });
  } else {
    hits = hits.slice(0, limit);
  }

  const top = hits.map((h) => ({
    key: h.key,
    score: h.score,
    type: h.type,
    id: h.id,
    title: h.title,
    route: h.route ?? null,
    grade: grades[h.key] || 0,
    expandedFrom: h.expandedFrom || null,
  }));

  return {
    method: methodId,
    expansion,
    latencyMs,
    hitCount: top.length,
    precisionAt3: precisionAtK(hits, grades, 3),
    precisionAt5: precisionAtK(hits, grades, 5),
    recallAt5: recallAtK(hits, grades, 5) ?? 0,
    mrr: mrr(hits, grades),
    irrelevantAt5: irrelevantRate(hits, grades, 5),
    top,
  };
}

async function main() {
  console.log('kb:bakeoff starting…');
  const { records } = loadNormalizedPreview(REPO_ROOT);
  if (records.length !== 69) {
    console.warn(`Warning: expected 69 records, found ${records.length}`);
  }

  const judgments = JSON.parse(fs.readFileSync(judgmentsPath, 'utf8'));
  const queries = loadJudgments(judgments);

  const keywordStore = new RetrievalStore({ mode: 'keyword_token_v1' });
  keywordStore.syncRecords(records);

  const methodDefs = [];
  const stores = {
    keyword_token_v1: keywordStore,
  };

  methodDefs.push({
    id: 'keyword_token_v1',
    description: 'Lexical keyword_token_v1 baseline (no embeddings)',
    dimensions: null,
    indexMs: 0,
    embedCostUsd: 0,
    queryCostUsd: 0,
    provider: 'local',
    model: 'keyword_token_v1',
  });

  // Semantic A: TF-IDF
  console.log('Indexing tfidf…');
  const tfidf = await buildSemanticStore(records, 'tfidf');
  stores.semantic_tfidf_local_v1 = tfidf.store;
  methodDefs.push({
    id: 'semantic_tfidf_local_v1',
    description: 'Local TF-IDF cosine (classical IR / cheap semantic baseline)',
    dimensions: tfidf.embedder.dimensions,
    indexMs: tfidf.indexMs,
    embedCostUsd: tfidf.embedCostUsd,
    queryCostUsd: 0,
    provider: tfidf.embedder.provider,
    model: tfidf.embedder.model,
    syncStats: tfidf.syncStats,
  });

  // Semantic B: hashed n-gram
  console.log('Indexing hashed n-gram…');
  const hashed = await buildSemanticStore(records, 'hashed');
  stores.semantic_hashed_ngram_local_v1 = hashed.store;
  methodDefs.push({
    id: 'semantic_hashed_ngram_local_v1',
    description: 'Local hashed word+char3 n-gram embeddings + cosine',
    dimensions: hashed.embedder.dimensions,
    indexMs: hashed.indexMs,
    embedCostUsd: hashed.embedCostUsd,
    queryCostUsd: 0,
    provider: hashed.embedder.provider,
    model: hashed.embedder.model,
    syncStats: hashed.syncStats,
  });

  // Semantic C (optional): MiniLM
  let mini = null;
  if (!skipMiniLm) {
    try {
      console.log('Indexing MiniLM (may download model on first run)…');
      mini = await buildSemanticStore(records, 'minilm');
      stores.semantic_minilm_local_v1 = mini.store;
      methodDefs.push({
        id: 'semantic_minilm_local_v1',
        description: 'Local Xenova all-MiniLM-L6-v2 neural embeddings',
        dimensions: mini.embedder.dimensions,
        indexMs: mini.indexMs,
        embedCostUsd: mini.embedCostUsd,
        queryCostUsd: 0,
        provider: mini.embedder.provider,
        model: mini.embedder.model,
        syncStats: mini.syncStats,
      });
    } catch (err) {
      console.warn(`MiniLM skipped: ${err.message}`);
    }
  }

  // Hybrid uses TF-IDF semantic + keyword on a dedicated store with tfidf index
  const hybridStore = new RetrievalStore({
    mode: 'hybrid',
    embeddingIndex: tfidf.index,
    hybridWeights: HYBRID_WEIGHTS,
  });
  hybridStore.syncRecords(records);
  stores.hybrid_keyword_tfidf_v1 = hybridStore;
  methodDefs.push({
    id: 'hybrid_keyword_tfidf_v1',
    description: 'Hybrid: 0.65 semantic(tfidf) + 0.35 lexical + exact title/slug boost',
    dimensions: tfidf.embedder.dimensions,
    indexMs: tfidf.indexMs,
    embedCostUsd: tfidf.embedCostUsd,
    queryCostUsd: 0,
    provider: 'local',
    model: 'hybrid(keyword+tfidf)',
  });

  const methodIds = Object.keys(stores);
  const expansions = ['raw', 'related'];
  const perQuery = [];
  const aggregateBuckets = {};

  for (const q of queries) {
    const grades = gradesFor(q);
    const runs = [];
    for (const methodId of methodIds) {
      for (const expansion of expansions) {
        const store = stores[methodId];
        const run = await runMethodOnQuery(store, methodId, q.query, grades, expansion);
        runs.push(run);
        const bucketKey = `${methodId}::${expansion}`;
        if (!aggregateBuckets[bucketKey]) aggregateBuckets[bucketKey] = [];
        aggregateBuckets[bucketKey].push(run);
      }
    }
    perQuery.push({
      queryId: q.id,
      query: q.query,
      kind: q.kind,
      expectedRelevant: grades,
      runs,
    });
    process.stdout.write('.');
  }
  console.log('\nEvaluating done.');

  const aggregates = Object.entries(aggregateBuckets).map(([key, rows]) => {
    const [method, expansion] = key.split('::');
    return { method, expansion, ...summarizeMethod(rows) };
  });

  // Incremental embed demo (hashed)
  const demoStats = await demonstrateIncrementalEmbed(records, hashed);

  const interpretation = buildInterpretation(aggregates, methodDefs);
  const recommendation = pickRecommendation(aggregates, methodDefs);

  const report = {
    generatedAt: new Date().toISOString(),
    corpusSize: records.length,
    judgmentsPath: path.relative(REPO_ROOT, judgmentsPath),
    hybridWeights: HYBRID_WEIGHTS,
    methods: methodDefs,
    aggregates,
    interpretation,
    recommendation,
    incrementalEmbeddingDemo: demoStats,
    failureModes: [
      'Short queries like "AI" remain brittle for pure lexical matching; semantic helps when paraphrase/synonym gap exists.',
      'Capability records can dominate conceptual queries; relationship expansion is required to surface evidence projects fairly.',
      'TF-IDF is corpus-relative: not a substitute for neural cross-domain semantics, but free and deterministic.',
      'MiniLM quality depends on local model download; hashed/TF-IDF need no network after install.',
      'Small manually labeled set (28 queries) — do not overfit hybrid weights.',
      'No paid cloud embedder was available in this environment (no API keys); adapters remain provider-neutral for later swap.',
    ],
    perQuery,
  };

  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'kb_semantic_bakeoff.json');
  const mdPath = path.join(outDir, 'kb_semantic_bakeoff.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderBakeoffMarkdown(report));

  console.log('kb:bakeoff OK');
  console.log(`md:   ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`json: ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(JSON.stringify({ aggregates, recommendation }, null, 2));
}

async function demonstrateIncrementalEmbed(records, hashedBundle) {
  const embedder = await createEmbedder('hashed');
  embedder.fit(records);
  const index = new EmbeddingIndex(embedder, {
    cachePath: path.join(cacheDir, 'incremental_demo_hashed.json'),
  });
  // Fresh
  let stats = await index.syncRecords(records);
  const firstEmbedded = stats.embedded;
  // Unchanged
  index.stats.embedded = 0;
  index.stats.skippedUnchanged = 0;
  index.stats.removed = 0;
  stats = await index.syncRecords(records);
  const secondSkipped = stats.skippedUnchanged;
  // Change one
  const edited = structuredClone(records);
  const idx = edited.findIndex((r) => r.id === 'linz');
  const { contentHash: _c, ...rest } = edited[idx];
  rest.text = `${rest.text}\nBakeoff incremental edit.`;
  edited[idx] = { ...rest, contentHash: contentHash(rest) };
  index.stats.embedded = 0;
  index.stats.skippedUnchanged = 0;
  stats = await index.syncRecords(edited);
  const changedEmbedded = stats.embedded;
  // Delete one
  const removedList = edited.filter((r) => r.id !== 'covid-data-tracker');
  index.stats.removed = 0;
  stats = await index.syncRecords(removedList);
  return {
    firstEmbedded,
    secondPassSkippedUnchanged: secondSkipped,
    changedRecordsReembedded: changedEmbedded,
    deletedRemoved: stats.removed,
    note: 'contentHash drives incremental embedding; unchanged records are not re-embedded.',
  };
}

main().catch((err) => {
  console.error('kb:bakeoff FAILED');
  console.error(err);
  process.exit(1);
});
