#!/usr/bin/env node
/**
 * Multi-provider grounded answer bake-off (TODO 9).
 *
 *   npm run llm:bakeoff
 *   npm run llm:answer -- "What has Faisal done with AI?"
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './lib/kb-normalize.mjs';
import { loadEnvFile } from './lib/load-env.mjs';
import { createEvidencePipeline } from './lib/kb-pipeline.mjs';
import { buildEvidencePack } from './lib/kb-evidence.mjs';
import {
  createModelAdapter,
  generateGroundedAnswer,
  parseBakeoffModelList,
  listConfiguredLiveProviders,
  GROUNDING_SYSTEM_POLICY,
} from './lib/kb-llm.mjs';
import {
  detectViolations,
  scoreGroundedResponse,
  aggregateModelScores,
} from './lib/kb-llm-eval.mjs';

loadEnvFile();

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const queryArg = argv.filter((a) => !a.startsWith('--')).join(' ').trim();
const wantAnswer =
  flags.has('--answer') || process.env.npm_lifecycle_event === 'llm:answer';

async function runSingleAnswer(query) {
  const pipeline = await createEvidencePipeline();
  const pack = await buildEvidencePack(pipeline.store, { query, config: pipeline.config });
  const result = await generateGroundedAnswer({
    query,
    evidencePack: pack,
    conversationContext: null,
  });
  console.log(JSON.stringify({ query, evidenceConfidence: pack.confidence, ...result }, null, 2));
}

async function runBakeoff() {
  console.log('llm:bakeoff starting…');
  const live = listConfiguredLiveProviders();
  let modelSpecs = parseBakeoffModelList(process.env.LLM_BAKEOFF_MODELS);

  if (live.length && modelSpecs.every((m) => m.provider === 'local')) {
    const extras = [];
    if (live.includes('groq')) extras.push({ provider: 'groq', model: 'llama-3.1-8b-instant' });
    if (live.includes('deepseek')) extras.push({ provider: 'deepseek', model: 'deepseek-chat' });
    if (live.includes('openai_compatible')) {
      extras.push({ provider: 'openai_compatible', model: process.env.AI_MODEL || 'gpt-4o-mini' });
    }
    if (live.includes('gemini')) {
      extras.push({ provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite' });
    }
    if (live.includes('mistral')) extras.push({ provider: 'mistral', model: 'mistral-small-latest' });
    modelSpecs = [...modelSpecs, ...extras].slice(0, 5);
  }

  const adapters = [];
  for (const spec of modelSpecs) {
    try {
      adapters.push(createModelAdapter(spec.provider, spec.model));
    } catch (err) {
      console.warn(`Skipping ${spec.provider}:${spec.model} — ${err.message}`);
    }
  }
  if (adapters.length < 3) {
    for (const v of ['grounded_composer', 'extractive', 'cautious']) {
      if (!adapters.some((a) => a.model === v)) adapters.push(createModelAdapter('local', v));
    }
  }

  console.log(
    `Models: ${adapters.map((a) => a.id).join(', ')}` +
      (live.length ? ` (live keys: ${live.join(', ')})` : ' (no cloud API keys — local composers only)')
  );

  const pipeline = await createEvidencePipeline();
  const fixture = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'scripts/fixtures/kb_llm_bakeoff_queries.json'), 'utf8')
  );

  const packs = {};
  for (const q of fixture.queries) {
    packs[q.id] = await buildEvidencePack(pipeline.store, {
      query: q.query,
      config: pipeline.config,
    });
    process.stdout.write('p');
  }
  console.log(' packs ready');

  const perModel = {};
  for (const adapter of adapters) {
    perModel[adapter.id] = [];
    for (const q of fixture.queries) {
      const pack = packs[q.id];
      let result;
      try {
        result = await adapter.generateGroundedAnswer({
          query: q.query,
          evidencePack: pack,
          conversationContext: null,
        });
      } catch (err) {
        result = {
          answer: {
            answer: '',
            evidenceIds: [],
            answerability: 'unsupported',
            inferenceUsed: false,
            suggestedAction: null,
          },
          meta: {
            provider: adapter.provider,
            model: adapter.model,
            latencyMs: 0,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            schemaOk: false,
            error: err.message,
          },
        };
      }
      const violations = detectViolations({
        query: q.query,
        evidencePack: pack,
        answer: result.answer,
        meta: result.meta,
      });
      const scores = scoreGroundedResponse({
        querySpec: q,
        evidencePack: pack,
        answer: result.answer,
        meta: result.meta,
        violations,
      });
      perModel[adapter.id].push({
        queryId: q.id,
        query: q.query,
        packConfidence: pack.confidence,
        answer: result.answer,
        meta: result.meta,
        violations,
        scores,
      });
      process.stdout.write('.');
    }
    console.log(` ${adapter.id}`);
  }

  const aggregates = Object.entries(perModel).map(([id, rows]) => ({
    modelId: id,
    provider: rows[0]?.meta?.provider,
    model: rows[0]?.meta?.model,
    ...aggregateModelScores(rows),
  }));
  aggregates.sort((a, b) => b.overall - a.overall);

  const recommendation = pickRecommendation(aggregates, live);
  const samples = buildSamples(perModel, aggregates);

  const report = {
    generatedAt: new Date().toISOString(),
    systemPolicyFingerprint: hashLite(GROUNDING_SYSTEM_POLICY),
    evidenceConfig: pipeline.config.id,
    liveProvidersDetected: live,
    note:
      live.length === 0
        ? 'No cloud LLM API keys were configured. Bake-off used local grounded composers to validate the harness on identical evidence packs. Set keys in .env (see .env.example) and re-run for production model selection.'
        : 'Cloud providers were included alongside any local baselines.',
    models: aggregates,
    recommendation,
    samples,
    perModel,
  };

  const outDir = path.join(REPO_ROOT, 'docs/generated');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'llm_bakeoff.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'llm_bakeoff.md'), renderMarkdown(report));

  console.log('llm:bakeoff OK');
  console.log('md:   docs/generated/llm_bakeoff.md');
  console.log(JSON.stringify({ models: aggregates, recommendation }, null, 2));
}

function pickRecommendation(aggregates, live) {
  const best = aggregates[0];
  const fallback =
    aggregates.find((a) => a.modelId !== best.modelId && a.usefulness >= best.usefulness - 0.05) ||
    aggregates[1];
  return {
    defaultModel: {
      provider: best.provider,
      model: best.model,
      modelId: best.modelId,
      why: `Highest overall rubric score (${best.overall}) with grounding=${best.grounding}, hallucinationResistance=${best.hallucinationResistance}.`,
    },
    fallbackModel: fallback
      ? {
          provider: fallback.provider,
          model: fallback.model,
          modelId: fallback.modelId,
          why: `Runner-up for harder synthesis (usefulness=${fallback.usefulness}, inference=${fallback.inferenceDiscipline}).`,
        }
      : null,
    envExample: {
      AI_PROVIDER: best.provider === 'local' ? 'openai_compatible' : best.provider,
      AI_MODEL: best.provider === 'local' ? 'gpt-4o-mini' : best.model,
      note:
        best.provider === 'local'
          ? 'Local composer won offline bake-off. For production, set a live provider key and re-run llm:bakeoff before locking defaults.'
          : 'Wire these into .env without changing retrieval/evidence/agent code.',
    },
    cloudKeysPresent: live.length > 0,
  };
}

function buildSamples(perModel, aggregates) {
  const bestId = aggregates[0]?.modelId;
  const rows = perModel[bestId] || [];
  const good = rows.filter((r) => r.scores.overall >= 0.75).slice(0, 3);
  const bad = rows.filter((r) => r.scores.overall < 0.55 || r.violations.length).slice(0, 3);
  return {
    modelId: bestId,
    good: good.map(sampleRow),
    bad: bad.map(sampleRow),
  };
}

function sampleRow(r) {
  return {
    query: r.query,
    answer: r.answer?.answer,
    scores: r.scores,
    violations: r.violations,
  };
}

function hashLite(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return `h${h.toString(16)}`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# LLM grounded-answer bake-off');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Evidence config: \`${report.evidenceConfig}\``);
  lines.push('');
  lines.push(report.note);
  lines.push('');
  lines.push('## Models (identical packs / policy / schema)');
  lines.push('');
  lines.push(
    '| model | overall | grounding | hallu. resist | inference | unsupported | latency ms | cost/query | schema fails |'
  );
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const m of report.models) {
    lines.push(
      `| ${m.modelId} | ${m.overall} | ${m.grounding} | ${m.hallucinationResistance} | ${m.inferenceDiscipline} | ${m.unsupportedHandling} | ${m.avgLatencyMs} | $${m.avgCostUsd} | ${m.schemaFailureCount} |`
    );
  }
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(report.recommendation, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Sample good answers');
  lines.push('');
  for (const s of report.samples.good || []) {
    lines.push(`### ${s.query}`);
    lines.push('');
    lines.push(`> ${s.answer}`);
    lines.push('');
    lines.push(`Score ${s.scores.overall}`);
    lines.push('');
  }
  lines.push('## Sample weak / violated answers');
  lines.push('');
  for (const s of report.samples.bad || []) {
    lines.push(`### ${s.query}`);
    lines.push('');
    lines.push(`> ${s.answer || '_empty_'}`);
    lines.push('');
    lines.push(`Violations: ${JSON.stringify(s.violations)}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

if (wantAnswer) {
  if (!queryArg) {
    console.error('Usage: npm run llm:answer -- "question"');
    process.exit(1);
  }
  runSingleAnswer(queryArg).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  runBakeoff().catch((err) => {
    console.error('llm:bakeoff FAILED');
    console.error(err);
    process.exit(1);
  });
}
