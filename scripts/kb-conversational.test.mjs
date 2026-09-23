/**
 * Conversational RAG relevance / sufficiency regression tests.
 * Calibrated against judgment fixtures + casual negatives (no greeting keyword list).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEvidencePipeline } from './lib/kb-pipeline.mjs';
import {
  assessConfidence,
  buildEvidencePack,
  DEFAULT_RELEVANCE,
  isRelevantEvidenceHit,
} from './lib/kb-evidence.mjs';
import { rewriteFollowUpQuery } from './lib/kb-agent.mjs';
import { deriveToolFromAnswer } from './lib/kb-agent-tools.mjs';
import { GROUNDING_SYSTEM_POLICY } from './lib/kb-llm.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const judgments = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/fixtures/kb_retrieval_judgments.json'), 'utf8')
);

const CASUAL = [
  'hello',
  "hey, how's it going?",
  "that's cool",
  'thanks',
  "that's interesting",
  'what can I ask you?',
  "what's the weather?",
  'random unrelated sentence about bananas and soccer',
];

const PORTFOLIO = [
  'AI',
  'product management',
  'technical leadership',
  'mixed reality',
  'cloud architecture',
  'what have you built?',
  'What has Faisal done with AI?',
  'tell me about product work',
  'Show me CadastrAR',
];

let store;

async function packFor(query) {
  return buildEvidencePack(store, { query });
}

test('setup conversational pipeline', async () => {
  const pipeline = await createEvidencePipeline({ mode: 'hybrid' });
  store = pipeline.store;
  assert.ok(store);
});

test('casual / unrelated messages get empty evidence with confidence none', async () => {
  for (const query of CASUAL) {
    const pack = await packFor(query);
    assert.equal(pack.evidence.length, 0, `${query} should have no evidence`);
    assert.equal(pack.confidence, 'none', `${query} → none`);
    assert.equal(pack.suggestedViews.length, 0);
  }
});

test('portfolio conceptual queries retain relevant evidence', async () => {
  for (const query of PORTFOLIO) {
    const pack = await packFor(query);
    assert.ok(pack.evidence.length > 0, `${query} should retrieve evidence`);
    assert.notEqual(pack.confidence, 'none', `${query} confidence`);
    assert.notEqual(pack.confidence, 'unsupported', `${query} confidence`);
  }
});

test('judgment fixture queries still admit a graded-relevant key', async () => {
  let hits = 0;
  for (const j of judgments.queries) {
    const pack = await packFor(j.query);
    const relevant = new Set(Object.keys(j.relevant || {}));
    const keys = pack.evidence.map((e) => e.key);
    const ok = keys.some((k) => relevant.has(k));
    assert.ok(
      ok,
      `${j.id}: expected one of ${[...relevant].slice(0, 4).join(', ')}; got ${keys.slice(0, 4).join(', ')}`
    );
    hits += 1;
  }
  assert.equal(hits, judgments.queries.length);
});

test('unsupported claims stay unsupported with empty evidence', async () => {
  for (const query of ['Did Faisal work at Google?', 'Does he know Rust?']) {
    const pack = await packFor(query);
    assert.equal(pack.confidence, 'unsupported');
    assert.equal(pack.evidence.length, 0);
  }
});

test('follow-up rewrite injects focus key without treating it as evidence', () => {
  const session = {
    focus: { key: 'research:cadastrar', id: 'cadastrar', title: 'CadastrAR', type: 'research' },
  };
  const q1 = rewriteFollowUpQuery('Why did you build it?', session);
  assert.match(q1, /cadastrar/i);
  assert.match(q1, /research:cadastrar/);

  const q2 = rewriteFollowUpQuery('How does it connect to your PhD?', session);
  assert.match(q2, /research:cadastrar/);
});

test('contextual follow-ups retrieve cadastrar / phd evidence', async () => {
  const open = await packFor('Show me CadastrAR');
  assert.ok(open.evidence.some((e) => e.key === 'research:cadastrar'));

  const why = await packFor('Why did you build it? (context: CadastrAR [research:cadastrar])');
  assert.ok(
    why.evidence.some((e) => e.key === 'research:cadastrar'),
    `why pack keys=${why.evidence.map((e) => e.key).join(',')}`
  );

  const phd = await packFor(
    'How does it connect to your PhD? (context: CadastrAR [research:cadastrar])'
  );
  assert.ok(
    phd.evidence.some(
      (e) =>
        e.key === 'research:cadastrar' ||
        e.key === 'credential:phd-computer-graphics' ||
        e.key === 'research:thesis' ||
        e.key === 'capability:research'
    ),
    `phd pack keys=${phd.evidence.map((e) => e.key).join(',')}`
  );
});

test('site / portfolio meta questions retrieve overview evidence', async () => {
  for (const query of ['what is this site about', 'tell me about this portfolio']) {
    const pack = await packFor(query);
    assert.ok(pack.evidence.length > 0, `${query} should retrieve evidence`);
    assert.notEqual(pack.confidence, 'none');
  }
});

test('movie questions retrieve the personal movies interest record', async () => {
  for (const query of ['movies', 'does he like movies?', 'what films does Faisal like?']) {
    const pack = await packFor(query);
    const hit = pack.evidence.find((e) => e.key === 'interest:movies');
    assert.ok(hit, `${query} keys=${pack.evidence.map((e) => e.key).join(',')}`);
    assert.equal(hit.route, '/#/movies');
    assert.notEqual(pack.confidence, 'none');
  }
  const work = await packFor('mixed reality');
  assert.ok(!work.evidence.some((e) => e.type === 'interest'));
});

test('hobby questions surface every personal interest; topic questions find theirs', async () => {
  for (const query of ['hobbies', 'what does he do for fun?', 'what are his interests?']) {
    const keys = (await packFor(query)).evidence.map((e) => e.key);
    for (const k of ['interest:movies', 'interest:photography', 'interest:travel']) {
      assert.ok(keys.includes(k), `${query} missing ${k}; got ${keys.join(',')}`);
    }
  }
  const topics = {
    'where has he travelled?': ['interest:travel', '/#/travel'],
    'has he been to Japan?': ['interest:travel', '/#/travel'],
    'does he take photos?': ['interest:photography', '/#/photo'],
  };
  for (const [query, [key, route]] of Object.entries(topics)) {
    const hit = (await packFor(query)).evidence.find((e) => e.key === key);
    assert.ok(hit, `${query} → ${key}`);
    assert.equal(hit.route, route);
  }
  const research = await packFor('what are his research interests?');
  assert.ok(!research.evidence.some((e) => e.type === 'interest'));
});

test('grounding policy frames interests as personal taste, not recommendations', () => {
  assert.match(GROUNDING_SYSTEM_POLICY, /"interest" \(movies, photography, travel\)/);
  assert.match(GROUNDING_SYSTEM_POLICY, /Do not recommend films or destinations/);
});

test('interest pages open only when the visitor asks to see them', () => {
  const evidencePack = {
    confidence: 'strong',
    evidence: [{ key: 'interest:travel', id: 'travel', type: 'interest', route: '/#/travel' }],
    suggestedViews: [],
  };
  const answer = { suggestedAction: { recordId: null, route: '/#/travel' } };
  assert.equal(deriveToolFromAnswer({ query: 'where has he been?', evidencePack, answer }), null);
  assert.equal(
    deriveToolFromAnswer({ query: 'tell me about his travels', evidencePack, answer }),
    null
  );
  assert.deepEqual(deriveToolFromAnswer({ query: 'show me his travel map', evidencePack, answer }), {
    tool: 'openRoute',
    args: { route: '/#/travel' },
  });
});

test('casual packs do not derive navigation tools', () => {
  const tool = deriveToolFromAnswer({
    query: 'hello',
    evidencePack: { confidence: 'none', evidence: [], suggestedViews: [] },
    answer: { suggestedAction: { recordId: 'cadastrar', route: '/#/r/cadastrar' } },
  });
  assert.equal(tool, null);
});

test('assessConfidence empty non-hard → none', () => {
  const conf = assessConfidence({
    query: 'hello',
    evidence: [],
    hardUnsupported: [],
    topScore: 0,
    lexicalHitCount: 0,
  });
  assert.equal(conf.confidence, 'none');
});

test('relevance defaults documented for regression', () => {
  assert.equal(DEFAULT_RELEVANCE.semRawMin, 0.34);
  assert.equal(DEFAULT_RELEVANCE.semRawMinWithIntent, 0.2);
  assert.equal(DEFAULT_RELEVANCE.intentBoostMin, 0.25);
  assert.equal(
    isRelevantEvidenceHit(
      { score: 0.6, reasons: ['sem=1', 'lex=0', 'semRaw=0.21', 'lexRaw=0'] },
      { query: 'hello', intentBoost: 0 }
    ).ok,
    false
  );
});

test('grounding policy allows natural conversation without exposing secrets', () => {
  assert.match(GROUNDING_SYSTEM_POLICY, /Converse naturally/);
  assert.match(GROUNDING_SYSTEM_POLICY, /Casual conversation does not require/);
  assert.ok(!/GROQ_API_KEY|system prompt secret/i.test(GROUNDING_SYSTEM_POLICY));
});
