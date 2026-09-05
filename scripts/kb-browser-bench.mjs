#!/usr/bin/env node
/**
 * Browser-compatible retrieval bench (Node harness with same artifact + MiniLM).
 * Measures artifact size + query latency for hybrid_minilm_keyword_v1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { REPO_ROOT } from './lib/kb-normalize.mjs';
import { createBrowserEvidencePipeline, browserKbDiskPath } from './lib/kb-browser-pipeline.mjs';

const QUERIES = [
  'What has Faisal done with AI?',
  'Show me CadastrAR',
  'Does he have AWS certification?',
  'Did he work at Google?',
  'Why should we hire him?',
];

async function main() {
  const artifactPath = browserKbDiskPath();
  if (!fs.existsSync(artifactPath)) {
    console.error('Missing browser KB. Run: npm run kb:browser');
    process.exit(1);
  }
  const bytes = fs.statSync(artifactPath).size;
  const metaPath = path.join(REPO_ROOT, 'public/assets/kb/browser_kb_meta.json');
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};

  console.log('=== Browser KB bench (Node MiniLM query path) ===');
  console.log(`artifact: ${(bytes / 1024).toFixed(1)} KiB`);
  console.log(`records: ${meta.recordCount || '?'}`);
  console.log(`model note: ${meta.modelDownloadNote || 'Xenova MiniLM ~22MB CDN/HF cache'}`);

  const t0 = performance.now();
  const pipeline = await createBrowserEvidencePipeline({ filePath: artifactPath });
  const initMs = Math.round(performance.now() - t0);
  console.log(`pipeline init (incl. MiniLM load): ${initMs} ms`);

  const latencies = [];
  for (const q of QUERIES) {
    const t = performance.now();
    const pack = await pipeline.buildEvidencePack(q);
    const ms = Math.round(performance.now() - t);
    latencies.push(ms);
    console.log(
      `  [${ms}ms] conf=${pack.confidence} n=${pack.evidence.length} · ${q.slice(0, 48)} → ${pack.evidence[0]?.key || '—'}`
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    artifactBytes: bytes,
    initMs,
    firstQueryMs: latencies[0],
    warmQueryMsAvg: Math.round(latencies.slice(1).reduce((a, b) => a + b, 0) / Math.max(latencies.length - 1, 1)),
    latencies,
    queries: QUERIES,
    configId: 'hybrid_minilm_keyword_v1',
    browserNotes: {
      runtimeBundle: 'public/assets/kb/runtime.mjs (~30KB)',
      minilmDownload: '~22MB quantized ONNX via CDN/HF (cached in browser Cache API / IndexedDB by transformers.js)',
      compatibility: 'Modern Chromium/Firefox/Safari with WebAssembly + WebGL/WASM SIMD preferred',
    },
  };

  const out = path.join(REPO_ROOT, 'docs/generated/kb_browser_bench.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${out}`);
  console.log(`first=${report.firstQueryMs}ms warmAvg=${report.warmQueryMsAvg}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
