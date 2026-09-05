/**
 * Load a ready RetrievalStore for evidence packs (MiniLM + optional hybrid).
 */

import path from 'node:path';
import { REPO_ROOT } from './kb-normalize.mjs';
import { loadNormalizedPreview } from './kb-retrieve.mjs';
import { createEmbedder } from './kb-embed.mjs';
import { EmbeddingIndex, RetrievalStore } from './kb-semantic-store.mjs';
import { DEFAULT_HYBRID_WEIGHTS, DEFAULT_RETRIEVAL_CONFIG } from './kb-evidence.mjs';

/**
 * @param {{ embedder?: string, weights?: object, cacheDir?: string, root?: string }} [options]
 */
export async function createEvidencePipeline(options = {}) {
  const root = options.root || REPO_ROOT;
  const embedderName = options.embedder || DEFAULT_RETRIEVAL_CONFIG.embedder;
  const weights = { ...DEFAULT_HYBRID_WEIGHTS, ...(options.weights || {}) };
  const cacheDir = options.cacheDir || path.join(root, 'docs/generated/embeddings');

  const { records, file } = loadNormalizedPreview(root);
  const embedder = await createEmbedder(embedderName);
  const cachePath = path.join(cacheDir, `${embedder.id}.json`);
  const index = new EmbeddingIndex(embedder, { cachePath });
  index.loadCache();
  if (typeof embedder.fit === 'function') embedder.fit(records);
  await index.syncRecords(records);
  index.saveCache({ pipeline: 'evidence', sourcePreview: file });

  const store = new RetrievalStore({
    mode: 'hybrid',
    embeddingIndex: index,
    hybridWeights: weights,
  });
  store.syncRecords(records);

  return {
    store,
    records,
    embedder,
    index,
    weights,
    previewPath: file,
    config: {
      ...DEFAULT_RETRIEVAL_CONFIG,
      embedder: embedderName,
      weights,
      id: embedderName === 'minilm' ? 'hybrid_minilm_keyword_v1' : `hybrid_${embedderName}_keyword_v1`,
    },
  };
}
