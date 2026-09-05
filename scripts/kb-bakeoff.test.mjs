import assert from 'node:assert/strict';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { contentHash } from './lib/kb-normalize.mjs';
import { createEmbedder, cosineSimilarity } from './lib/kb-embed.mjs';
import { EmbeddingIndex, RetrievalStore } from './lib/kb-semantic-store.mjs';
import { precisionAtK, recallAtK, mrr, expandHitsWithRelated } from './lib/kb-bakeoff.mjs';

function tinyRecords() {
  const mk = (type, id, title, text, tags = [], related = []) => {
    const rec = {
      type,
      id,
      route: null,
      title,
      text,
      tags,
      related,
      provenance: { sourceType: 't', sourcePath: 't', sourceId: id, fieldsUsed: ['text'] },
    };
    return { ...rec, contentHash: contentHash(rec) };
  };
  return [
    mk('credential', 'aws-sap', 'AWS Solutions Architect', 'AWS cloud certification Credly', ['aws', 'cloud']),
    mk(
      'capability',
      'product_thinking',
      'Product thinking',
      'Capability product thinking. Evidence: project:nexschool',
      ['product'],
      [
        { type: 'project', id: 'nexschool', relation: 'supports', confidence: 'confirmed' },
        { type: 'research', id: 'cadastrar', relation: 'supports', confidence: 'confirmed' },
      ]
    ),
    mk('project', 'nexschool', 'NexSchool', 'LMS modules deployment UI maintenance for schools', ['mobile']),
    mk('research', 'cadastrar', 'CadastrAR', 'Collaborative mixed reality cadastral stakeholder field decisions', [
      'xr',
      'mr',
    ]),
  ];
}

test('tfidf and hashed embedders produce comparable vectors', async () => {
  const records = tinyRecords();
  const tfidf = await createEmbedder('tfidf');
  tfidf.fit(records);
  const hashed = await createEmbedder('hashed');
  hashed.fit(records);

  const [a] = await tfidf.embedDocuments([records[0]]);
  const q = await tfidf.embedQuery('AWS cloud');
  assert.ok(cosineSimilarity(a.vector, q) > 0.1);

  const [b] = await hashed.embedDocuments([records[2]]);
  const q2 = await hashed.embedQuery('school LMS');
  assert.ok(cosineSimilarity(b.vector, q2) > 0);
});

test('embedding index skips unchanged and updates changed via contentHash', async () => {
  const records = tinyRecords();
  const embedder = await createEmbedder('hashed');
  embedder.fit(records);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'emb-'));
  const index = new EmbeddingIndex(embedder, { cachePath: path.join(dir, 'cache.json') });

  let stats = await index.syncRecords(records);
  assert.equal(stats.embedded, records.length);

  index.stats.embedded = 0;
  index.stats.skippedUnchanged = 0;
  stats = await index.syncRecords(records);
  assert.equal(stats.embedded, 0);
  assert.equal(stats.skippedUnchanged, records.length);

  const edited = structuredClone(records);
  const { contentHash: _c, ...rest } = edited[0];
  rest.text = `${rest.text} renewed`;
  edited[0] = { ...rest, contentHash: contentHash(rest) };
  index.stats.embedded = 0;
  index.stats.skippedUnchanged = 0;
  stats = await index.syncRecords(edited);
  assert.equal(stats.embedded, 1);

  const trimmed = edited.slice(1);
  index.stats.removed = 0;
  stats = await index.syncRecords(trimmed);
  assert.equal(stats.removed, 1);
});

test('semantic and hybrid searchAsync work on RetrievalStore', async () => {
  const records = tinyRecords();
  const embedder = await createEmbedder('tfidf');
  embedder.fit(records);
  const index = new EmbeddingIndex(embedder);
  await index.syncRecords(records);
  const store = new RetrievalStore({ mode: 'hybrid', embeddingIndex: index });
  store.syncRecords(records);

  const sem = await store.searchAsync('AWS', { mode: 'semantic_tfidf_local_v1', limit: 3 });
  assert.ok(sem.hits.some((h) => h.id === 'aws-sap'));

  const hyb = await store.searchAsync('product thinking', { mode: 'hybrid', limit: 3 });
  assert.ok(hyb.hits.length > 0);
});

test('metrics and related expansion', () => {
  const grades = { 'credential:aws-sap': 3, 'project:nexschool': 2 };
  const hits = [
    { key: 'credential:aws-sap', score: 1 },
    { key: 'project:foo', score: 0.5 },
    { key: 'project:nexschool', score: 0.4 },
  ];
  assert.equal(precisionAtK(hits, grades, 3), 2 / 3);
  assert.ok(mrr(hits, grades) === 1);
  assert.equal(recallAtK(hits, grades, 5), 1);

  const store = new RetrievalStore();
  store.syncRecords(tinyRecords());
  const expanded = expandHitsWithRelated(
    [{ key: 'capability:product_thinking', score: 1, type: 'capability', id: 'product_thinking', title: 'x', record: store.get('capability:product_thinking') }],
    store,
    { limit: 5 }
  );
  assert.ok(expanded.some((h) => h.key === 'project:nexschool'));
});
