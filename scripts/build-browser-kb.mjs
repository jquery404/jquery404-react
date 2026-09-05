#!/usr/bin/env node
/**
 * Build browser-ready KB artifact from canonical portfolio sources (TODO 12).
 *
 *   research/portfolio/credentials/… → normalizer → MiniLM vectors → public/assets/kb/
 *
 * Do not hand-edit the output. Re-run after content changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, runNormalize } from './lib/kb-normalize.mjs';
import { createEvidencePipeline } from './lib/kb-pipeline.mjs';
import { recordKey } from './lib/kb-retrieve-core.mjs';
import { DEFAULT_RETRIEVAL_CONFIG, DEFAULT_HYBRID_WEIGHTS, DEFAULT_EVIDENCE_BUDGET } from './lib/kb-evidence.mjs';

const OUT_DIR = path.join(REPO_ROOT, 'public/assets/kb');
const OUT_FILE = path.join(OUT_DIR, 'browser_kb_v1.json');
const META_FILE = path.join(OUT_DIR, 'browser_kb_meta.json');

async function main() {
  const skipNormalize = process.argv.includes('--skip-normalize');
  if (!skipNormalize) {
  console.log('[kb:browser] Normalizing canonical sources…');
  runNormalize();
  }

  console.log('[kb:browser] Building MiniLM hybrid pipeline…');
  const pipeline = await createEvidencePipeline({ embedder: 'minilm' });
  const { records, index, config } = pipeline;

  const vectors = {};
  for (const [key, row] of index.vectors.entries()) {
    vectors[key] = row.vector;
  }

  // Slim records for the browser — keep retrieval fields only
  const slim = records.map((r) => ({
    type: r.type,
    id: r.id,
    title: r.title,
    text: r.text,
    tags: r.tags || [],
    route: r.route ?? null,
    alsoRoutes: r.alsoRoutes || [],
    related: r.related || [],
    provenance: r.provenance || null,
    contentHash: r.contentHash,
    extras: r.extras
      ? {
          claimStrength: r.extras.claimStrength,
          notes: r.extras.notes,
          evidenceKeys: r.extras.evidenceKeys,
          kind: r.extras.kind,
          capability: r.extras.capability,
          thumbnail: r.extras.thumbnail,
          desc: r.extras.desc,
        }
      : undefined,
  }));

  const artifact = {
    _meta: {
      description:
        'Browser-ready portfolio KB for client-side hybrid MiniLM+keyword retrieval (TODO 12). Public content only — no secrets.',
      version: 1,
      generatedAt: new Date().toISOString(),
      configId: 'hybrid_minilm_keyword_v1',
      embedder: 'minilm_local_v1',
      model: 'Xenova/all-MiniLM-L6-v2',
      dimensions: slim.length && vectors[recordKey(slim[0])]
        ? vectors[recordKey(slim[0])].length
        : 384,
      recordCount: slim.length,
      vectorCount: Object.keys(vectors).length,
      weights: { ...DEFAULT_HYBRID_WEIGHTS },
      budget: { ...DEFAULT_EVIDENCE_BUDGET },
      retrieval: { ...DEFAULT_RETRIEVAL_CONFIG, ...config, id: 'hybrid_minilm_keyword_v1' },
    },
    records: slim,
    vectors,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const json = `${JSON.stringify(artifact)}\n`;
  fs.writeFileSync(OUT_FILE, json, 'utf8');

  const meta = {
    path: 'assets/kb/browser_kb_v1.json',
    bytes: Buffer.byteLength(json),
    recordCount: slim.length,
    vectorCount: Object.keys(vectors).length,
    dimensions: artifact._meta.dimensions,
    configId: 'hybrid_minilm_keyword_v1',
    generatedAt: artifact._meta.generatedAt,
    modelDownloadNote:
      'Query embeddings use Xenova/all-MiniLM-L6-v2 quantized ONNX (~22MB) via @xenova/transformers in the browser (CDN/HF cache). Document vectors ship in this artifact.',
  };
  fs.writeFileSync(META_FILE, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  console.log(
    `[kb:browser] Wrote ${OUT_FILE} (${(meta.bytes / 1024).toFixed(1)} KiB, ${meta.recordCount} records, ${meta.vectorCount} vectors)`
  );
}

main().catch((err) => {
  console.error('[kb:browser] FAILED', err);
  process.exit(1);
});
