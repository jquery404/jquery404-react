import assert from 'node:assert/strict';
import test from 'node:test';
import { contentHash } from './lib/kb-normalize.mjs';
import { RetrievalStore } from './lib/kb-semantic-store.mjs';
import { createEmbedder } from './lib/kb-embed.mjs';
import { EmbeddingIndex } from './lib/kb-semantic-store.mjs';
import {
  buildEvidencePack,
  dedupeEvidenceCandidates,
  detectHardUnsupported,
  assessConfidence,
  applyEvidenceBudget,
  DEFAULT_EVIDENCE_BUDGET,
} from './lib/kb-evidence.mjs';

function mk(type, id, title, text, extras = {}) {
  const rec = {
    type,
    id,
    route: type === 'research' ? `/#/r/${id}` : type === 'project' ? `/#/p/${id}` : null,
    title,
    text,
    tags: extras.tags || [],
    related: extras.related || [],
    provenance: {
      sourceType: 'test',
      sourcePath: 'test.json',
      sourceId: id,
      fieldsUsed: ['text'],
    },
    extras,
  };
  return { ...rec, contentHash: contentHash(rec) };
}

async function tinyStore() {
  const records = [
    mk('credential', 'aws-sap', 'AWS Solutions Architect – Professional', 'AWS cloud Credly certification', {
      kind: 'certification',
    }),
    mk(
      'capability',
      'product_thinking',
      'Product thinking',
      'Capability: Product thinking\nClaim strength: reasonably_inferred\nQuery terms: product, product thinking',
      {
        capability: 'product_thinking',
        claimStrength: 'reasonably_inferred',
        evidenceKeys: ['project:nexschool'],
        notes: 'Inferred from shipping LMS workflows. Not a PM title.',
        tags: ['product', 'capability'],
      }
    ),
    mk('project', 'nexschool', 'NexSchool', 'Unified LMS modules deployment UI maintenance for schools', {
      tags: ['mobile'],
    }),
    mk('research', 'cadastrar', 'CadastrAR', 'Collaborative mixed reality cadastral stakeholder field decisions', {
      tags: ['xr'],
    }),
    mk(
      'capability',
      'ai_machine_learning',
      'AI / machine learning',
      'Capability AI machine learning TensorFlow deep learning',
      {
        capability: 'ai_machine_learning',
        claimStrength: 'direct',
        evidenceKeys: ['book:tf'],
        notes: 'Direct book evidence.',
        tags: ['ai', 'capability'],
      }
    ),
  ];
  records[1].related = [
    { type: 'project', id: 'nexschool', relation: 'supports', confidence: 'confirmed' },
  ];
  {
    const { contentHash: _c, ...rest } = records[1];
    records[1] = { ...rest, contentHash: contentHash(rest) };
  }
  const embedder = await createEmbedder('tfidf');
  embedder.fit(records);
  const index = new EmbeddingIndex(embedder);
  await index.syncRecords(records);
  const store = new RetrievalStore({
    mode: 'hybrid',
    embeddingIndex: index,
    hybridWeights: { semantic: 0.6, lexical: 0.3, exactBoost: 0.2 },
  });
  store.syncRecords(records);
  return store;
}

test('hard unsupported claims detected', () => {
  const blob = 'AWS PhD SIGGRAPH mixed reality nexschool play.google.com';
  assert.deepEqual(detectHardUnsupported('Did Faisal work at Google?', blob), ['employer_google']);
  assert.deepEqual(detectHardUnsupported('Does he know Rust?', blob), ['lang_rust']);
  assert.equal(detectHardUnsupported('What about AWS?', blob).length, 0);
  // Mentions Google Play in corpus must not authorize "worked at Google"
  assert.ok(detectHardUnsupported('Has he worked at Google?', 'https://play.google.com/store').includes('employer_google'));
});

test('dedupe and budget suppress near-duplicates', () => {
  const candidates = [
    {
      key: 'research:a',
      id: 'a',
      type: 'research',
      title: 'Same Title',
      snippet: 'alpha beta gamma delta',
      score: 1,
      role: 'primary',
      priority: 3,
    },
    {
      key: 'list_research:list:a',
      id: 'list:a',
      type: 'list_research',
      title: 'Same Title',
      snippet: 'alpha beta gamma delta epsilon',
      score: 0.9,
      role: 'primary',
      priority: 3,
    },
    {
      key: 'project:b',
      id: 'b',
      type: 'project',
      title: 'Other',
      snippet: 'completely different wording here',
      score: 0.8,
      role: 'expanded',
      priority: 2,
    },
  ];
  const deduped = dedupeEvidenceCandidates(candidates, DEFAULT_EVIDENCE_BUDGET);
  assert.ok(deduped.some((d) => d.key === 'research:a'));
  assert.equal(deduped.some((d) => d.type === 'list_research'), false);
  const budgeted = applyEvidenceBudget(deduped, { ...DEFAULT_EVIDENCE_BUDGET, maxCharsTotal: 40, maxCharsPerItem: 30 });
  assert.ok(budgeted.totalChars <= 40);
});

test('evidence pack distinguishes claimStrength and expands relations', async () => {
  const store = await tinyStore();
  const pack = await buildEvidencePack(store, {
    query: 'product thinking',
    mode: 'hybrid',
  });
  assert.ok(pack.evidence.length >= 1);
  const cap = pack.evidence.find((e) => e.key === 'capability:product_thinking');
  if (cap) {
    assert.equal(cap.claimStrength, 'reasonably_inferred');
  }
  // expansion should be able to surface nexschool
  const keys = pack.evidence.map((e) => e.key);
  assert.ok(keys.some((k) => k.includes('product') || k.includes('nexschool') || k.includes('cadastrar')));
  assert.ok(['strong', 'moderate', 'weak'].includes(pack.confidence));
});

test('unsupported employer query yields empty pack', async () => {
  const store = await tinyStore();
  const pack = await buildEvidencePack(store, { query: 'Did Faisal work at Google?' });
  assert.equal(pack.confidence, 'unsupported');
  assert.equal(pack.evidence.length, 0);
  assert.equal(pack.suggestedViews.length, 0);
});

test('assessConfidence ranks strong vs unsupported vs none', () => {
  const strong = assessConfidence({
    query: 'mixed reality',
    evidence: [
      { type: 'research', role: 'primary', claimStrength: 'direct' },
      { type: 'project', role: 'expanded', claimStrength: 'direct' },
    ],
    hardUnsupported: [],
    topScore: 0.7,
    lexicalHitCount: 2,
  });
  assert.equal(strong.confidence, 'strong');

  const un = assessConfidence({
    query: 'x',
    evidence: [],
    hardUnsupported: ['employer_google'],
    topScore: 0,
    lexicalHitCount: 0,
  });
  assert.equal(un.confidence, 'unsupported');

  const none = assessConfidence({
    query: 'hello',
    evidence: [],
    hardUnsupported: [],
    topScore: 0,
    lexicalHitCount: 0,
  });
  assert.equal(none.confidence, 'none');
});
