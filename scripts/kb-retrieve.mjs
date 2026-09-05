#!/usr/bin/env node
/**
 * Local retrieval CLI over normalized KB preview (TODO 5).
 *
 * Usage:
 *   node scripts/kb-retrieve.mjs sync
 *   node scripts/kb-retrieve.mjs search "mixed reality"
 *   node scripts/kb-retrieve.mjs eval
 *   node scripts/kb-retrieve.mjs get research:cadastrar
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './lib/kb-normalize.mjs';
import {
  JsonKbStore,
  loadNormalizedPreview,
  evaluateQueries,
  DEFAULT_EVAL_QUERIES,
} from './lib/kb-retrieve.mjs';

const args = process.argv.slice(2);
const cmd = args[0] || 'sync';
const outDir = path.join(REPO_ROOT, 'docs/generated');
const indexPath = path.join(outDir, 'kb_index.json');

function openStore() {
  return new JsonKbStore(indexPath);
}

try {
  if (cmd === 'sync') {
    const { records, file } = loadNormalizedPreview(REPO_ROOT);
    const store = openStore();
    const before = store.size();
    const { changeSet, stats } = store.syncRecords(records);
    store.save({
      syncedAt: new Date().toISOString(),
      sourcePreview: path.relative(REPO_ROOT, file),
      lastSync: stats,
    });

    const syncReport = {
      sourcePreview: path.relative(REPO_ROOT, file),
      indexPath: path.relative(REPO_ROOT, indexPath),
      before,
      after: store.size(),
      changeSetCounts: {
        added: changeSet.added.length,
        changed: changeSet.changed.length,
        unchanged: changeSet.unchanged.length,
        removed: changeSet.removed.length,
      },
      applyStats: stats,
    };
    const reportPath = path.join(outDir, 'kb_sync_report.json');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(syncReport, null, 2)}\n`);

    console.log('kb:retrieve sync OK');
    console.log(JSON.stringify(syncReport, null, 2));
    process.exit(0);
  }

  if (cmd === 'search') {
    const query = args.slice(1).join(' ').trim();
    if (!query) {
      console.error('Usage: kb-retrieve search <query>');
      process.exit(1);
    }
    const store = openStore();
    if (!store.size()) {
      console.error('Index empty. Run: npm run kb:retrieve:sync');
      process.exit(1);
    }
    const expand = args.includes('--related');
    const hits = store.search(query, { limit: 10, expandRelated: expand });
    console.log(JSON.stringify({ query, hits: hits.map(({ record, ...rest }) => rest) }, null, 2));
    process.exit(0);
  }

  if (cmd === 'get') {
    const id = args[1];
    if (!id) {
      console.error('Usage: kb-retrieve get <type:id|id>');
      process.exit(1);
    }
    const store = openStore();
    const rec = store.get(id);
    if (!rec) {
      console.error(`Not found: ${id}`);
      process.exit(1);
    }
    console.log(JSON.stringify({ record: rec, related: store.getRelated(id) }, null, 2));
    process.exit(0);
  }

  if (cmd === 'eval') {
    const { records, file } = loadNormalizedPreview(REPO_ROOT);
    const store = openStore();
    // Ensure index matches latest preview before eval
    const { changeSet, stats } = store.syncRecords(records);
    store.save({
      syncedAt: new Date().toISOString(),
      sourcePreview: path.relative(REPO_ROOT, file),
      lastSync: stats,
    });

    const evaluation = evaluateQueries(store, DEFAULT_EVAL_QUERIES, { limit: 5 });
    evaluation.sync = {
      changeSetCounts: {
        added: changeSet.added.length,
        changed: changeSet.changed.length,
        unchanged: changeSet.unchanged.length,
        removed: changeSet.removed.length,
      },
      applyStats: stats,
    };
    evaluation.corpusEnrichment = {
      credentialsPath: 'public/assets/credentials.json',
      capabilitiesPath: 'public/assets/capabilities.json',
      note: 'TODO 6 closed About-only credential gaps and added capability→evidence maps without duplicating project bodies.',
    };

    const evalPath = path.join(outDir, 'kb_retrieval_eval.json');
    const mdPath = path.join(outDir, 'kb_retrieval_eval.md');
    fs.writeFileSync(evalPath, `${JSON.stringify(evaluation, null, 2)}\n`);
    fs.writeFileSync(mdPath, renderEvalMarkdown(evaluation));

    console.log('kb:retrieve eval OK');
    console.log(`json: ${path.relative(REPO_ROOT, evalPath)}`);
    console.log(`md:   ${path.relative(REPO_ROOT, mdPath)}`);
    console.log(
      JSON.stringify(
        {
          indexed: evaluation.indexed,
          failureSummary: evaluation.failureSummary,
          queries: evaluation.results.map((r) => ({
            query: r.query,
            status: r.status,
            failureCause: r.failureCause,
            hits: r.hitCount,
            top: r.topK.slice(0, 3).map((h) => `${h.score}:${h.key}`),
          })),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.error(`Unknown command: ${cmd}`);
  console.error('Commands: sync | search <q> | get <id> | eval');
  process.exit(1);
} catch (err) {
  console.error('kb:retrieve FAILED');
  console.error(err.message);
  process.exit(1);
}

function renderEvalMarkdown(evaluation) {
  const lines = [];
  lines.push('# KB retrieval evaluation (keyword baseline)');
  lines.push('');
  lines.push(`Method: \`${evaluation.method}\``);
  lines.push(`Indexed records: **${evaluation.indexed}**`);
  lines.push('');
  lines.push('Scores are keyword-only (title / tags / text / id). Not manually tuned.');
  lines.push('');
  lines.push('## Failure taxonomy');
  lines.push('');
  for (const t of evaluation.failureTaxonomy || []) lines.push(`- ${t}`);
  lines.push('');
  lines.push('## Failure summary');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(evaluation.failureSummary || {}, null, 2));
  lines.push('```');
  lines.push('');

  for (const row of evaluation.results) {
    lines.push(`## Query: \`${row.query}\``);
    lines.push('');
    lines.push(`Status: **${row.status}**${row.failureCause ? ` · cause: \`${row.failureCause}\`` : ''}`);
    lines.push('');
    if (!row.topK.length) {
      lines.push('_No hits._');
    } else {
      lines.push('| rank | score | type | id | route | relevant? | claimStrength |');
      lines.push('|---:|---:|---|---|---|---|---|');
      row.topK.forEach((h, i) => {
        lines.push(
          `| ${i + 1} | ${h.score} | ${h.type} | ${h.id} | ${h.route ?? '—'} | ${h.obviouslyRelevant} | ${h.claimStrength ?? '—'} |`
        );
      });
    }
    for (const n of row.notes || []) lines.push(`- ${n}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
