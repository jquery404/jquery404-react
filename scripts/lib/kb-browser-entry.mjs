/**
 * ESM entry bundled to public/assets/kb/runtime.mjs for the browser (TODO 12).
 * No Node fs — artifact is passed in from fetch().
 */
import { buildEvidencePack, DEFAULT_RETRIEVAL_CONFIG } from './kb-evidence.mjs';
import { BrowserHybridStore, createMiniLmQueryEmbedder } from './kb-browser-hybrid.mjs';

/**
 * @param {object} artifact — browser_kb_v1.json contents
 */
export async function createBrowserKbFromArtifact(artifact, options = {}) {
  if (!artifact?.records || !artifact?.vectors) {
    throw new Error('Invalid browser KB artifact');
  }

  const emb = await createMiniLmQueryEmbedder({
    cdnUrl: options.cdnUrl,
    model: artifact._meta?.model || 'Xenova/all-MiniLM-L6-v2',
  });

  const vectors = {};
  for (const [k, v] of Object.entries(artifact.vectors)) {
    vectors[k] = Array.isArray(v) ? v : v.vector;
  }

  const store = new BrowserHybridStore({
    vectors,
    embedQuery: (q) => emb.embedQuery(q),
    weights: artifact._meta?.weights || DEFAULT_RETRIEVAL_CONFIG.weights,
  });
  store.syncRecords(artifact.records);

  const config = {
    ...DEFAULT_RETRIEVAL_CONFIG,
    ...(artifact._meta?.retrieval || {}),
    id: 'hybrid_minilm_keyword_v1',
    mode: 'hybrid',
    embedder: 'minilm',
  };

  return {
    records: artifact.records,
    store,
    config,
    embedder: emb,
    meta: artifact._meta,
    async warm() {
      await emb.warm();
    },
    async buildEvidencePack(query, opts = {}) {
      return buildEvidencePack(store, { query, config, ...opts });
    },
  };
}

export { DEFAULT_RETRIEVAL_CONFIG };
