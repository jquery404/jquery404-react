import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserEvidencePipeline, browserKbDiskPath } from './lib/kb-browser-pipeline.mjs';
import { buildEvidencePack, DEFAULT_RETRIEVAL_CONFIG } from './lib/kb-evidence.mjs';
import { createEvidencePipeline } from './lib/kb-pipeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('browser KB artifact exists or can be referenced', () => {
  const p = browserKbDiskPath(root);
  // Artifact is build output; skip heavy assert if missing in fresh clone
  if (!fs.existsSync(p)) {
    assert.ok(true, 'artifact not built yet — run npm run kb:browser');
    return;
  }
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(doc._meta.configId, 'hybrid_minilm_keyword_v1');
  assert.ok(doc.records.length > 20);
  assert.ok(Object.keys(doc.vectors).length === doc.records.length);
});

test('browser hybrid pack matches Node hybrid on AWS query (when artifact present)', async (t) => {
  const p = browserKbDiskPath(root);
  if (!fs.existsSync(p)) {
    t.skip('browser KB artifact missing');
    return;
  }

  const browser = await createBrowserEvidencePipeline({ filePath: p });
  const node = await createEvidencePipeline({ embedder: 'minilm' });

  const q = 'Does he have AWS certification?';
  const bPack = await browser.buildEvidencePack(q);
  const nPack = await buildEvidencePack(node.store, {
    query: q,
    config: { ...DEFAULT_RETRIEVAL_CONFIG, id: 'hybrid_minilm_keyword_v1' },
  });

  assert.ok(bPack.evidence.some((e) => e.key === 'credential:aws-sap'));
  assert.ok(nPack.evidence.some((e) => e.key === 'credential:aws-sap'));
  assert.equal(bPack.confidence, nPack.confidence);

  const bTop = bPack.evidence.slice(0, 3).map((e) => e.key);
  const nTop = nPack.evidence.slice(0, 3).map((e) => e.key);
  // Top hit should agree; allow small rank jitter below
  assert.equal(bTop[0], nTop[0]);
});

test('unsupported Google claim stays unsupported on browser pipeline', async (t) => {
  const p = browserKbDiskPath(root);
  if (!fs.existsSync(p)) {
    t.skip('browser KB artifact missing');
    return;
  }
  const browser = await createBrowserEvidencePipeline({ filePath: p });
  const pack = await browser.buildEvidencePack('Did he work at Google?');
  assert.equal(pack.confidence, 'unsupported');
  assert.equal(pack.evidence.length, 0);
});
