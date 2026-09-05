import assert from 'node:assert/strict';
import test from 'node:test';
import { contentHash } from './lib/kb-normalize.mjs';
import { RetrievalStore } from './lib/kb-semantic-store.mjs';
import { createEmbedder } from './lib/kb-embed.mjs';
import { EmbeddingIndex } from './lib/kb-semantic-store.mjs';
import {
  validateToolCall,
  deriveToolFromAnswer,
  isAllowedAppRoute,
} from './lib/kb-agent-tools.mjs';
import {
  createAgentRuntime,
  rewriteFollowUpQuery,
  createSession,
  serializeSession,
} from './lib/kb-agent.mjs';
import { createLocalComposerAdapter } from './lib/kb-llm.mjs';

function mk(type, id, title, text, extras = {}) {
  const rec = {
    type,
    id,
    route: type === 'research' ? `/#/r/${id}` : type === 'project' ? `/#/p/${id}` : null,
    title,
    text,
    tags: extras.tags || [],
    related: extras.related || [],
    provenance: { sourceType: 't', sourcePath: 't', sourceId: id, fieldsUsed: ['text'] },
    extras,
  };
  return { ...rec, contentHash: contentHash(rec) };
}

async function tinyPipeline() {
  const records = [
    mk(
      'research',
      'cadastrar',
      'CadastrAR',
      'Collaborative mixed reality cadastral field decisions with stakeholders. Technology: Unity XR, geospatial data.',
      { tags: ['xr', 'mr'] }
    ),
    mk(
      'research',
      'thesis',
      'Mixed Reality PhD Thesis',
      'PhD multi-user asymmetric telecollaboration mixed reality.',
      { tags: ['xr'] }
    ),
    mk('credential', 'aws-sap', 'AWS Solutions Architect – Professional', 'AWS SAP Credly certification', {
      kind: 'certification',
      tags: ['aws'],
    }),
    mk(
      'capability',
      'ai_machine_learning',
      'AI / machine learning',
      'Capability AI machine learning TensorFlow',
      {
        claimStrength: 'direct',
        notes: 'Direct ML evidence',
        tags: ['ai'],
      }
    ),
  ];
  // credential route null is fine
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
  return {
    store,
    records,
    config: {
      id: 'test_hybrid',
      mode: 'hybrid',
      expandRelated: true,
      weights: { semantic: 0.6, lexical: 0.3, exactBoost: 0.2 },
      budget: {
        topK: 6,
        maxEvidenceItems: 6,
        maxCharsTotal: 4000,
        maxCharsPerItem: 600,
        maxExpandedPerPrimary: 2,
        minScoreFloor: 0.15,
        dedupeJaccard: 0.72,
      },
    },
  };
}

test('route allowlist rejects invented URLs', () => {
  assert.equal(isAllowedAppRoute('/#/r/cadastrar'), true);
  assert.equal(isAllowedAppRoute('/#/contact'), true);
  assert.equal(isAllowedAppRoute('https://evil.example/hack'), false);
  assert.equal(isAllowedAppRoute('/admin'), false);
});

test('tool validation rejects unknown records and unsupported nav', () => {
  const store = new RetrievalStore();
  const pack = { confidence: 'strong', evidence: [{ key: 'research:cadastrar', id: 'cadastrar', route: '/#/r/cadastrar' }] };
  const bad = validateToolCall({ tool: 'openRecord', args: { id: 'not-real' } }, { store, evidencePack: pack });
  assert.equal(bad.ok, false);

  const unsupported = validateToolCall(
    { tool: 'openRecord', args: { id: 'cadastrar' } },
    { store, evidencePack: { confidence: 'unsupported', evidence: [] } }
  );
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.reason, 'unsupported_blocks_kb_tools');

  const contact = validateToolCall(
    { tool: 'showContact', args: {} },
    { store, evidencePack: { confidence: 'unsupported', evidence: [] } }
  );
  assert.equal(contact.ok, true);
  assert.equal(contact.args.route, '/#/contact');

  const cv = validateToolCall(
    { tool: 'showCV', args: {} },
    { store, evidencePack: { confidence: 'strong', evidence: [] } }
  );
  assert.equal(cv.ok, true);
  assert.equal(cv.args.available, false);
});

test('follow-up rewrite injects focus', () => {
  const session = createSession({
    focus: { id: 'cadastrar', key: 'research:cadastrar', title: 'CadastrAR', route: '/#/r/cadastrar' },
  });
  const q = rewriteFollowUpQuery('What technology did he use there?', session);
  assert.match(q, /CadastrAR/);
});

test('session is serializable', () => {
  const s = createSession({ focus: { id: 'x', title: 'X' }, history: [{ role: 'user', content: 'hi' }] });
  const out = serializeSession(s);
  assert.equal(out.focus.id, 'x');
  assert.equal(JSON.parse(JSON.stringify(out)).history[0].content, 'hi');
});

test('agent multi-turn: cadastrar → follow-up → unsupported → contact', async () => {
  const pipeline = await tinyPipeline();
  const agent = createAgentRuntime(pipeline, {
    adapter: createLocalComposerAdapter('grounded_composer'),
    fallbackAdapter: null,
  });
  const session = agent.createSession();
  const events = [];

  const r1 = await agent.handleMessage({
    sessionId: session.id,
    message: 'Tell me about CadastrAR',
    onEvent: (e) => events.push(e.type),
  });
  assert.ok(r1.answer);
  assert.ok(events.includes('retrieval.started'));
  assert.ok(events.includes('retrieval.completed'));
  assert.ok(events.includes('answer.completed'));
  assert.ok(r1.session.focus?.id === 'cadastrar' || r1.evidenceIds.some((id) => id.includes('cadastrar')));

  const r2 = await agent.handleMessage({
    sessionId: session.id,
    message: 'What technology did he use there?',
  });
  assert.match(r2.meta.retrievalQuery, /CadastrAR|cadastrar/i);
  assert.equal(r2.sessionId, session.id);

  const r3 = await agent.handleMessage({
    sessionId: session.id,
    message: 'Did he work at Google?',
  });
  assert.equal(r3.answerability, 'unsupported');
  assert.equal(r3.toolCall, null);

  const r4 = await agent.handleMessage({
    sessionId: session.id,
    message: 'Show contact',
  });
  assert.ok(r4.toolCall);
  assert.equal(r4.toolCall.tool, 'showContact');

  const r5 = await agent.handleMessage({
    sessionId: session.id,
    message: 'Open my CV please',
  });
  assert.equal(r5.toolCall?.tool, 'showCV');
});

test('provider failover on primary failure', async () => {
  const pipeline = await tinyPipeline();
  const failing = {
    id: 'fail:test',
    provider: 'fail',
    model: 'test',
    async generateGroundedAnswer() {
      throw new Error('HTTP 503 provider timeout');
    },
  };
  const fallback = createLocalComposerAdapter('grounded_composer');
  const agent = createAgentRuntime(pipeline, { adapter: failing, fallbackAdapter: fallback });
  const session = agent.createSession();
  const result = await agent.handleMessage({
    sessionId: session.id,
    message: 'Does he know AWS?',
  });
  assert.equal(result.meta.failoverUsed, true);
  assert.equal(result.provider, 'local');
  assert.match(result.answer, /AWS/i);
});

test('invalid tool route rejected', () => {
  const pack = {
    confidence: 'strong',
    evidence: [{ key: 'research:cadastrar', id: 'cadastrar', route: '/#/r/cadastrar' }],
  };
  const result = validateToolCall(
    { tool: 'openRoute', args: { route: '/#/r/invented-slug-xyz' } },
    {
      store: {
        get() {
          return null;
        },
      },
      evidencePack: pack,
    }
  );
  assert.equal(result.ok, false);
});

test('deriveToolFromAnswer for contact', () => {
  const t = deriveToolFromAnswer({
    query: 'How can I contact Faisal?',
    evidencePack: { confidence: 'strong', evidence: [] },
    answer: { suggestedAction: null },
  });
  assert.equal(t.tool, 'showContact');
});

test('deriveToolFromAnswer prefers research/project over event for best work', () => {
  const t = deriveToolFromAnswer({
    query: 'Show me his best work',
    evidencePack: {
      confidence: 'strong',
      evidence: [
        {
          key: 'event:siggraph-2023-6-10-aug-23',
          id: 'siggraph-2023-6-10-aug-23',
          type: 'event',
          route: '/#/updates',
          title: 'SIGGRAPH 2023',
        },
        {
          key: 'research:mrmac',
          id: 'mrmac',
          type: 'research',
          route: '/#/r/mrmac',
          title: 'MRMAC',
        },
      ],
    },
    answer: { suggestedAction: null },
  });
  assert.equal(t.tool, 'openRecord');
  assert.equal(t.args.id, 'mrmac');
});

test('openRecord accepts in-pack credential without route', async () => {
  const pipeline = await tinyPipeline();
  const pack = {
    confidence: 'strong',
    evidence: [
      {
        key: 'credential:aws-sap',
        id: 'aws-sap',
        type: 'credential',
        route: null,
        title: 'AWS SAP',
      },
    ],
  };
  const ok = validateToolCall(
    { tool: 'openRecord', args: { id: 'aws-sap' } },
    { store: pipeline.store, records: pipeline.records, evidencePack: pack }
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.args.key, 'credential:aws-sap');
});

test('project navigation tool from tell-me-about query', async () => {
  const pipeline = await tinyPipeline();
  const agent = createAgentRuntime(pipeline, {
    adapter: createLocalComposerAdapter('grounded_composer'),
    fallbackAdapter: null,
  });
  const session = agent.createSession();
  const result = await agent.handleMessage({
    sessionId: session.id,
    message: 'Tell me about CadastrAR',
  });
  assert.ok(result.toolCall);
  assert.ok(['openRecord', 'openRoute'].includes(result.toolCall.tool));
  if (result.toolCall.tool === 'openRecord') {
    assert.equal(result.toolCall.args.id, 'cadastrar');
  } else {
    assert.equal(result.toolCall.args.route, '/#/r/cadastrar');
  }
  assert.ok(!('cssClass' in (result.toolCall.args || {})));
  assert.ok(!('selector' in (result.toolCall.args || {})));
});

test('unsupported answer does not use failover', async () => {
  const pipeline = await tinyPipeline();
  const agent = createAgentRuntime(pipeline, {
    adapter: createLocalComposerAdapter('grounded_composer'),
    fallbackAdapter: createLocalComposerAdapter('cautious'),
  });
  const session = agent.createSession();
  const result = await agent.handleMessage({
    sessionId: session.id,
    message: 'Did he work at Google?',
  });
  assert.equal(result.answerability, 'unsupported');
  assert.equal(result.meta.failoverUsed, false);
  assert.equal(result.toolCall, null);
});

test('streamMessage yields normalized events then final', async () => {
  const pipeline = await tinyPipeline();
  const agent = createAgentRuntime(pipeline, {
    adapter: createLocalComposerAdapter('grounded_composer'),
    fallbackAdapter: null,
  });
  const session = agent.createSession();
  const types = [];
  let final = null;
  for await (const ev of agent.streamMessage({
    sessionId: session.id,
    message: 'Does he know AWS?',
  })) {
    types.push(ev.type);
    if (ev.final) final = ev.result;
  }
  assert.ok(types.includes('retrieval.started'));
  assert.ok(types.includes('retrieval.completed'));
  assert.ok(types.includes('answer.delta'));
  assert.ok(types.includes('answer.completed'));
  assert.ok(final?.answer);
  assert.ok(!types.some((t) => /openai|gemini|chunk/i.test(t)));
});

test('follow-up rewrite skips focus for contact/CV', () => {
  const session = createSession({
    focus: { id: 'cadastrar', key: 'research:cadastrar', title: 'CadastrAR' },
  });
  assert.equal(rewriteFollowUpQuery('Show contact', session), 'Show contact');
  assert.equal(rewriteFollowUpQuery('Open CV', session), 'Open CV');
});
