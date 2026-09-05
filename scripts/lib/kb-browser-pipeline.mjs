/**
 * Load browser KB artifact into BrowserHybridStore + buildEvidencePack (TODO 12).
 */

import path from 'node:path';
import fs from 'node:fs';
import { REPO_ROOT } from './kb-normalize.mjs';
import { buildEvidencePack, DEFAULT_RETRIEVAL_CONFIG } from './kb-evidence.mjs';
import { BrowserHybridStore, createMiniLmQueryEmbedder } from './kb-browser-hybrid.mjs';
import { createEmbedder } from './kb-embed.mjs';

export const BROWSER_KB_PUBLIC_PATH = 'assets/kb/browser_kb_v1.json';

export function browserKbDiskPath(root = REPO_ROOT) {
  return path.join(root, 'public', BROWSER_KB_PUBLIC_PATH);
}

export function loadBrowserKbArtifact(filePath) {
  const abs = filePath || browserKbDiskPath();
  if (!fs.existsSync(abs)) {
    throw new Error(`Browser KB missing at ${abs}. Run: npm run kb:browser`);
  }
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!Array.isArray(doc.records) || !doc.vectors) {
    throw new Error(`Invalid browser KB artifact: ${abs}`);
  }
  return doc;
}

/**
 * @param {{ artifact?: object, embedder?: 'minilm'|'node-minilm', cdnUrl?: string }} [options]
 */
export async function createBrowserEvidencePipeline(options = {}) {
  const artifact = options.artifact || loadBrowserKbArtifact(options.filePath);
  let embedQuery;
  let embedderMeta;

  if (options.embedQuery) {
    embedQuery = options.embedQuery;
    embedderMeta = { id: 'custom' };
  } else if (options.embedder === 'node-minilm' || typeof window === 'undefined') {
    // Node path: use local MiniLM (same model as build)
    const emb = await createEmbedder('minilm');
    embedQuery = (q) => emb.embedQuery(q);
    embedderMeta = { id: emb.id, model: emb.model };
  } else {
    const emb = await createMiniLmQueryEmbedder({ cdnUrl: options.cdnUrl });
    embedQuery = (q) => emb.embedQuery(q);
    embedderMeta = { id: emb.id, model: emb.model };
  }

  const vectors = {};
  for (const [k, v] of Object.entries(artifact.vectors)) {
    vectors[k] = Array.isArray(v) ? v : v.vector;
  }

  const store = new BrowserHybridStore({
    vectors,
    embedQuery,
    weights: artifact._meta?.weights || DEFAULT_RETRIEVAL_CONFIG.weights,
  });
  store.syncRecords(artifact.records);

  const config = {
    ...DEFAULT_RETRIEVAL_CONFIG,
    ...(artifact._meta?.retrieval || {}),
    id: 'hybrid_minilm_keyword_v1',
    mode: 'hybrid',
    embedder: 'minilm',
    weights: artifact._meta?.weights || DEFAULT_RETRIEVAL_CONFIG.weights,
  };

  return {
    store,
    records: artifact.records,
    config,
    artifactMeta: artifact._meta,
    embedderMeta,
    async buildEvidencePack(query, opts = {}) {
      return buildEvidencePack(store, { query, config, ...opts });
    },
  };
}
