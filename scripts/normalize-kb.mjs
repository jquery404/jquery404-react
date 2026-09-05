#!/usr/bin/env node
import path from 'node:path';
import { REPO_ROOT, runNormalize, loadCanonicalFromDisk, normalizeKnowledgeBase } from './lib/kb-normalize.mjs';

const args = new Set(process.argv.slice(2));
const validateOnly = args.has('--validate') || args.has('-v');

try {
  if (validateOnly) {
    const data = loadCanonicalFromDisk(REPO_ROOT);
    const result = normalizeKnowledgeBase(data);
    if (!result.validation.ok) {
      console.error('kb:validate FAILED');
      for (const f of result.validation.failures) console.error(` - ${f}`);
      process.exit(1);
    }
    console.log('kb:validate OK');
    console.log(
      JSON.stringify(
        {
          normalizedTotal: result.stats.normalizedTotal,
          byType: result.stats.generated,
          unresolved: result.unresolved.length,
          warnings: result.warnings.length,
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const outDir = path.join(REPO_ROOT, 'docs/generated');
  const { result, written } = runNormalize(REPO_ROOT, outDir);

  console.log('kb:normalize OK');
  console.log(`preview: ${path.relative(REPO_ROOT, written.recordsPath)}`);
  console.log(`report:  ${path.relative(REPO_ROOT, written.reportPath)}`);
  console.log(`summary: ${path.relative(REPO_ROOT, written.summaryPath)}`);
  console.log(
    JSON.stringify(
      {
        canonical: result.stats.canonical,
        normalizedTotal: result.stats.normalizedTotal,
        byType: result.stats.generated,
        duplicatesMerged: result.stats.duplicatesMerged,
        listPubsSkippedAsDetailDupes: result.stats.listPubsSkippedAsDetailDupes,
        unresolved: result.unresolved.length,
        warnings: result.warnings.length,
        changeSet: written.summaryDoc.changeSetCounts,
      },
      null,
      2
    )
  );

  if (result.unresolved.length) {
    console.log('\nUnresolved:');
    for (const u of result.unresolved) {
      console.log(` - ${u.kind}: ${u.eventTitle || u.pressId || ''} ${u.url || u.missingResearchSlug || ''}`);
    }
  }
} catch (err) {
  console.error('kb:normalize FAILED');
  console.error(err.message);
  process.exit(1);
}
