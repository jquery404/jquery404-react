#!/usr/bin/env node
/**
 * Evidence-pack CLI (TODO 8).
 *
 *   npm run kb:evidence -- "What has Faisal done with AI?"
 *   npm run kb:evidence -- --json "What has Faisal done with AI?"
 *   npm run kb:evidence -- --eval
 *   npm run kb:evidence -- --compare-hybrid
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './lib/kb-normalize.mjs';
import { createEvidencePipeline } from './lib/kb-pipeline.mjs';
import {
  buildEvidencePack,
  formatEvidencePackText,
  DEFAULT_RETRIEVAL_CONFIG,
  DEFAULT_HYBRID_WEIGHTS,
} from './lib/kb-evidence.mjs';
import { RetrievalStore } from './lib/kb-semantic-store.mjs';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const queryParts = argv.filter((a) => !a.startsWith('--'));
const asJson = flags.has('--json');
const doEval = flags.has('--eval');
const doCompare = flags.has('--compare-hybrid');

async function main() {
  if (doCompare) {
    await runHybridCompare();
    return;
  }
  if (doEval) {
    await runEval();
    return;
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    console.error('Usage: kb:evidence [--json] "<question>"');
    console.error('       kb:evidence --eval');
    console.error('       kb:evidence --compare-hybrid');
    process.exit(1);
  }

  const pipeline = await createEvidencePipeline();
  const pack = await buildEvidencePack(pipeline.store, {
    query,
    config: pipeline.config,
  });

  if (asJson) {
    console.log(JSON.stringify(pack, null, 2));
  } else {
    console.log(formatEvidencePackText(pack));
  }
}

async function runHybridCompare() {
  console.log('Comparing MiniLM alone vs hybrid MiniLM+keyword…');
  const pipeline = await createEvidencePipeline({ weights: DEFAULT_HYBRID_WEIGHTS });
  const { store, records, index } = pipeline;

  const semanticOnly = new RetrievalStore({
    mode: 'semantic_minilm_local_v1',
    embeddingIndex: index,
    hybridWeights: DEFAULT_HYBRID_WEIGHTS,
  });
  semanticOnly.syncRecords(records);

  const fixture = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'scripts/fixtures/kb_evidence_eval_queries.json'), 'utf8')
  );

  const rows = [];
  for (const q of fixture.hybridCompare) {
    const mini = await buildEvidencePack(semanticOnly, {
      query: q.query,
      mode: 'semantic_minilm_local_v1',
      config: { ...DEFAULT_RETRIEVAL_CONFIG, id: 'semantic_minilm_local_v1', mode: 'semantic' },
    });
    const hybrid = await buildEvidencePack(store, {
      query: q.query,
      mode: 'hybrid',
      config: pipeline.config,
    });
    rows.push({
      queryId: q.id,
      query: q.query,
      minilm: summarizePack(mini),
      hybrid: summarizePack(hybrid),
      winner: pickWinner(mini, hybrid),
    });
    process.stdout.write('.');
  }
  console.log('');

  const hybridWins = rows.filter((r) => r.winner === 'hybrid').length;
  const miniWins = rows.filter((r) => r.winner === 'minilm').length;
  const ties = rows.filter((r) => r.winner === 'tie').length;

  // Prefer hybrid if it wins or ties majority — exact match boost helps AWS/CadastrAR
  const defaultConfig =
    hybridWins + ties >= miniWins
      ? {
          ...DEFAULT_RETRIEVAL_CONFIG,
          id: 'hybrid_minilm_keyword_v1',
          rationale:
            'Hybrid MiniLM+keyword selected: matches MiniLM on conceptual queries and improves exact slug/title cases via lexical+exact boost; relationship expansion unchanged.',
        }
      : {
          ...DEFAULT_RETRIEVAL_CONFIG,
          id: 'semantic_minilm_local_v1',
          mode: 'semantic',
          rationale: 'MiniLM alone edged hybrid on this slice; keep hybrid available for exact-match queries.',
        };

  const report = {
    generatedAt: new Date().toISOString(),
    weights: DEFAULT_HYBRID_WEIGHTS,
    score: { hybridWins, miniWins, ties },
    defaultConfig,
    rows,
  };

  const outDir = path.join(REPO_ROOT, 'docs/generated');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'kb_hybrid_compare.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ score: report.score, defaultConfig }, null, 2));
  return report;
}

function summarizePack(pack) {
  return {
    confidence: pack.confidence,
    evidenceCount: pack.evidence.length,
    totalChars: pack.retrievalMeta.totalChars,
    topKeys: pack.evidence.slice(0, 5).map((e) => e.key),
    topScore: pack.retrievalMeta.topScore ?? pack.evidence[0]?.score ?? 0,
    hasRoute: pack.routes.length > 0,
  };
}

function pickWinner(mini, hybrid) {
  const confRank = { strong: 3, moderate: 2, weak: 1, none: 0, unsupported: 0 };
  const mc = confRank[mini.confidence] ?? 0;
  const hc = confRank[hybrid.confidence] ?? 0;
  if (hc !== mc) return hc > mc ? 'hybrid' : 'minilm';
  // Prefer more grounded items with routes, then higher top score
  const mScore =
    (mini.evidence.filter((e) => e.route).length || 0) * 2 +
    mini.evidence.length +
    (mini.retrievalMeta.topScore || 0);
  const hScore =
    (hybrid.evidence.filter((e) => e.route).length || 0) * 2 +
    hybrid.evidence.length +
    (hybrid.retrievalMeta.topScore || 0);
  if (Math.abs(hScore - mScore) < 0.15) return 'tie';
  return hScore > mScore ? 'hybrid' : 'minilm';
}

async function runEval() {
  // Ensure hybrid compare + default selection first
  const compare = await runHybridCompare();
  const pipeline = await createEvidencePipeline({
    weights: compare.defaultConfig.weights || DEFAULT_HYBRID_WEIGHTS,
  });

  const fixture = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'scripts/fixtures/kb_evidence_eval_queries.json'), 'utf8')
  );

  const mode = compare.defaultConfig.mode || 'hybrid';
  const unsupportedRows = [];
  for (const q of fixture.unsupported) {
    const pack = await buildEvidencePack(pipeline.store, {
      query: q.query,
      mode,
      config: { ...pipeline.config, ...compare.defaultConfig },
    });
    unsupportedRows.push({
      queryId: q.id,
      query: q.query,
      expectConfidence: q.expectConfidence,
      confidence: pack.confidence,
      evidenceCount: pack.evidence.length,
      topKeys: pack.evidence.map((e) => e.key),
      pass: pack.confidence === 'unsupported' && pack.evidence.length === 0,
    });
  }

  const recruiterRows = [];
  for (const q of fixture.recruiter) {
    const pack = await buildEvidencePack(pipeline.store, {
      query: q.query,
      mode,
      config: { ...pipeline.config, ...compare.defaultConfig },
    });
    const inferred = pack.evidence.filter((e) => e.claimStrength === 'reasonably_inferred');
    recruiterRows.push({
      queryId: q.id,
      query: q.query,
      confidence: pack.confidence,
      confidenceReason: pack.confidenceReason,
      primaryEvidence: pack.evidence.filter((e) => e.role === 'primary').map((e) => e.key),
      expandedEvidence: pack.evidence.filter((e) => e.role === 'expanded').map((e) => e.key),
      claimStrengths: [...new Set(pack.evidence.map((e) => e.claimStrength).filter(Boolean))],
      inferredCapabilityCount: inferred.length,
      suggestedViews: pack.suggestedViews,
      totalChars: pack.retrievalMeta.totalChars,
      evidenceCount: pack.evidence.length,
      possiblyIrrelevant: pack.evidence
        .filter((e) => e.score < 0.25 && e.role === 'primary')
        .map((e) => e.key),
      answerabilityNote:
        pack.confidence === 'unsupported'
          ? 'Insufficient evidence for a grounded answer.'
          : pack.evidence.length
            ? 'Evidence pack would enable a grounded answer without inventing employers/skills.'
            : 'Empty pack.',
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    selectedConfig: compare.defaultConfig,
    hybridCompareScore: compare.score,
    unsupported: {
      passRate: unsupportedRows.filter((r) => r.pass).length / unsupportedRows.length,
      rows: unsupportedRows,
    },
    recruiter: recruiterRows,
  };

  const outDir = path.join(REPO_ROOT, 'docs/generated');
  const jsonPath = path.join(outDir, 'kb_evidence_eval.json');
  const mdPath = path.join(outDir, 'kb_evidence_eval.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderEvalMd(report));

  console.log('kb:evidence eval OK');
  console.log(`md:   ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(
    JSON.stringify(
      {
        selectedConfig: report.selectedConfig.id,
        unsupportedPassRate: report.unsupported.passRate,
        recruiter: recruiterRows.map((r) => ({
          id: r.queryId,
          confidence: r.confidence,
          n: r.evidenceCount,
          chars: r.totalChars,
        })),
      },
      null,
      2
    )
  );
}

function renderEvalMd(report) {
  const lines = [];
  lines.push('# KB evidence-pack evaluation');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Selected retrieval configuration');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(report.selectedConfig, null, 2));
  lines.push('```');
  lines.push('');
  lines.push(
    `Hybrid compare: hybridWins=${report.hybridCompareScore.hybridWins}, miniWins=${report.hybridCompareScore.miniWins}, ties=${report.hybridCompareScore.ties}`
  );
  lines.push('');
  lines.push('## Unsupported / hallucination probes');
  lines.push('');
  lines.push(`Pass rate: **${report.unsupported.passRate}**`);
  lines.push('');
  lines.push('| query | confidence | evidence | pass |');
  lines.push('|---|---|---:|:---:|');
  for (const r of report.unsupported.rows) {
    lines.push(`| ${r.query} | ${r.confidence} | ${r.evidenceCount} | ${r.pass ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Recruiter-style queries');
  lines.push('');
  for (const r of report.recruiter) {
    lines.push(`### ${r.queryId}: \`${r.query}\``);
    lines.push('');
    lines.push(`- Confidence: **${r.confidence}** — ${r.confidenceReason}`);
    lines.push(`- Primary: ${r.primaryEvidence.join(', ') || '—'}`);
    lines.push(`- Expanded: ${r.expandedEvidence.join(', ') || '—'}`);
    lines.push(`- Claim strengths: ${r.claimStrengths.join(', ') || '—'}`);
    lines.push(`- Size: ${r.evidenceCount} items / ${r.totalChars} chars`);
    if (r.possiblyIrrelevant.length) {
      lines.push(`- Possibly weak inclusions: ${r.possiblyIrrelevant.join(', ')}`);
    }
    if (r.suggestedViews?.length) {
      lines.push(
        `- Suggested views: ${r.suggestedViews.map((v) => v.route).join(', ')}`
      );
    }
    lines.push(`- ${r.answerabilityNote}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

main().catch((err) => {
  console.error('kb:evidence FAILED');
  console.error(err);
  process.exit(1);
});
