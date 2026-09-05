import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLocalComposerAdapter,
  normalizeGroundedAnswer,
  parseModelJson,
  buildGroundedMessages,
  GROUNDING_SYSTEM_POLICY,
} from './lib/kb-llm.mjs';
import { detectViolations, scoreGroundedResponse } from './lib/kb-llm-eval.mjs';

const samplePack = {
  query: 'What has Faisal done with AI?',
  confidence: 'strong',
  confidenceReason: 'ok',
  evidence: [
    {
      key: 'capability:ai_machine_learning',
      id: 'ai_machine_learning',
      type: 'capability',
      title: 'AI / machine learning',
      claimStrength: 'direct',
      snippet: 'TensorFlow Lite book and Picturesque',
      score: 1,
      role: 'primary',
    },
    {
      key: 'book:tensorflow-lite-for-mobile-development',
      id: 'tensorflow-lite-for-mobile-development',
      type: 'book',
      title: 'TensorFlow Lite',
      claimStrength: 'direct',
      snippet: 'Deploy ML models on mobile',
      score: 0.9,
      role: 'expanded',
    },
  ],
  suggestedViews: [{ recordId: 'ai_machine_learning', route: null, reason: 'primary' }],
};

const unsupportedPack = {
  query: 'Did he work at Google?',
  confidence: 'unsupported',
  confidenceReason: 'employer_google',
  evidence: [],
  suggestedViews: [],
};

test('parse and normalize grounded JSON', () => {
  const raw = '```json\n{"answer":"Yes AWS.","evidenceIds":["credential:aws-sap","fake"],"answerability":"strong","inferenceUsed":false,"suggestedAction":null}\n```';
  const parsed = parseModelJson(raw);
  const pack = {
    evidence: [{ key: 'credential:aws-sap' }],
  };
  const norm = normalizeGroundedAnswer(parsed, pack);
  assert.equal(norm.evidenceIds.length, 1);
  assert.equal(norm.evidenceIds[0], 'credential:aws-sap');
});

test('messages include policy and identical pack shape', () => {
  const m = buildGroundedMessages({ query: 'x', evidencePack: samplePack });
  assert.match(m.system, /claimStrength/);
  assert.match(m.user, /capability:ai_machine_learning/);
  assert.ok(GROUNDING_SYSTEM_POLICY.length > 100);
});

test('local composer rejects unsupported packs', async () => {
  const adapter = createLocalComposerAdapter('grounded_composer');
  const { answer, meta } = await adapter.generateGroundedAnswer({
    query: 'Did he work at Google?',
    evidencePack: unsupportedPack,
  });
  assert.equal(answer.answerability, 'unsupported');
  assert.equal(answer.evidenceIds.length, 0);
  assert.equal(meta.costUsd, 0);
  const violations = detectViolations({
    query: 'Did he work at Google?',
    evidencePack: unsupportedPack,
    answer,
    meta,
  });
  assert.equal(violations.filter((v) => v.code === 'unsupported_overclaim').length, 0);
});

test('PM title overclaim is flagged', () => {
  const pack = {
    confidence: 'moderate',
    evidence: [
      {
        key: 'capability:product_thinking',
        claimStrength: 'reasonably_inferred',
        title: 'Product thinking',
        snippet: 'inferred',
      },
    ],
  };
  const answer = {
    answer: 'Yes, Faisal worked as a Product Manager for many years.',
    evidenceIds: ['capability:product_thinking'],
    answerability: 'strong',
    inferenceUsed: true,
    suggestedAction: null,
  };
  const violations = detectViolations({
    query: 'Has Faisal worked as a Product Manager?',
    evidencePack: pack,
    answer,
    meta: { schemaOk: true },
  });
  assert.ok(violations.some((v) => v.code === 'inference_title_overclaim'));
});

test('scoring rewards grounded AWS answer', async () => {
  const adapter = createLocalComposerAdapter('grounded_composer');
  const pack = {
    confidence: 'strong',
    evidence: [
      {
        key: 'credential:aws-sap',
        type: 'credential',
        title: 'AWS SAP',
        claimStrength: 'direct',
        snippet: 'AWS Solutions Architect Professional',
        score: 1,
      },
    ],
    suggestedViews: [],
  };
  const { answer, meta } = await adapter.generateGroundedAnswer({
    query: 'Does he know AWS?',
    evidencePack: pack,
  });
  const violations = detectViolations({
    query: 'Does he know AWS?',
    evidencePack: pack,
    answer,
    meta,
  });
  const scores = scoreGroundedResponse({
    querySpec: { query: 'Does he know AWS?', expect: { kind: 'direct_credential', inference: 'direct_only' } },
    evidencePack: pack,
    answer,
    meta,
    violations,
  });
  assert.ok(scores.overall > 0.6);
  assert.match(answer.answer, /AWS/i);
});
