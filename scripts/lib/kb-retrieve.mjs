/**
 * Provider-neutral local KB retrieval / store.
 *
 * Core (MemoryKbStore, tokenize, scoreRecord) lives in kb-retrieve-core.mjs
 * so the browser hybrid runtime can share it without Node fs/path.
 */

import fs from 'node:fs';
import path from 'node:path';
import { diffSnapshots, REPO_ROOT } from './kb-normalize.mjs';
import {
  MemoryKbStore,
  recordKey,
  scoreRecord,
  tokenize,
} from './kb-retrieve-core.mjs';

export { MemoryKbStore, recordKey, scoreRecord, tokenize };

export class JsonKbStore extends MemoryKbStore {
  constructor(filePath) {
    super();
    this.backend = 'json';
    this.filePath = filePath;
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      this._records = new Map();
      return;
    }
    const doc = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    this._records = new Map();
    for (const rec of doc.records || []) {
      this._records.set(recordKey(rec), rec);
    }
  }

  save(meta = {}) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const doc = {
      _meta: {
        description: 'Local KB retrieval index (dry-run). Not production site assets.',
        backend: 'json',
        interface: 'KbStore',
        ...meta,
      },
      records: this.list(),
    };
    fs.writeFileSync(this.filePath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    return this.filePath;
  }

  upsert(record) {
    const result = super.upsert(record);
    return result;
  }

  remove(id) {
    return super.remove(id);
  }
}

export function loadNormalizedPreview(root = REPO_ROOT, previewPath) {
  const file =
    previewPath || path.join(root, 'docs/generated/kb_preview.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      `Normalized preview not found at ${file}. Run npm run kb:normalize first.`
    );
  }
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(doc.records)) {
    throw new Error(`Invalid kb_preview.json: missing records[] at ${file}`);
  }
  return { file, records: doc.records, meta: doc._meta || {} };
}

export const DEFAULT_EVAL_QUERIES = [
  'AWS',
  'AI',
  'product',
  'mixed reality',
  'collaboration',
  'data',
  'SIGGRAPH',
  'mobile',
];

/**
 * Heuristic relevance label for eval reporting — not used for ranking.
 * Conservative: only marks obviously-on-topic hits; does not inflate scores.
 */
export function judgeRelevance(query, hit) {
  const q = query.toLowerCase();
  const titleTokens = tokenize(hit.title);
  const tagTokens = tokenize(hit.record?.tags || []);
  const textTokens = tokenize((hit.record?.text || '').slice(0, 800));
  const idTokens = tokenize(hit.id);
  const allTokens = new Set([...titleTokens, ...tagTokens, ...textTokens, ...idTokens]);
  const tokens = tokenize(query);
  const blob = `${hit.id} ${hit.title} ${(hit.record?.tags || []).join(' ')} ${(hit.record?.text || '').slice(0, 800)}`;

  if (hit.type === 'capability') {
    const cap = String(hit.record?.extras?.capability || hit.id).toLowerCase();
    if (q === 'product' && cap.includes('product')) return 'relevant';
    if (q === 'ai' && (cap.includes('ai') || cap.includes('machine_learning'))) return 'relevant';
    if (q === 'collaboration' && cap.includes('collaboration')) return 'relevant';
    if (q === 'mobile' && cap.includes('mobile')) return 'relevant';
    if (q === 'mixed reality' && cap.includes('spatial')) return 'relevant';
    if (tokens.some((t) => allTokens.has(t) || cap.includes(t))) return 'relevant';
  }

  if (hit.type === 'credential') {
    if (q === 'aws' && /\baws\b|solutions architect|credly/i.test(blob)) return 'relevant';
    if (q === 'siggraph' && /siggraph/i.test(blob)) return 'relevant';
  }

  if (['aws', 'product'].includes(q)) {
    const awsHints = /\baws\b|amazon web services|credly|solutions architect/i;
    const productHints = /\bproduct\b|product thinking|product design|saas\b/i;
    if (q === 'aws') {
      return awsHints.test(blob) ? 'relevant' : hit.score > 0 ? 'weak_or_spurious' : 'miss';
    }
    if (q === 'product') {
      return productHints.test(blob)
        ? 'relevant'
        : hit.score > 0
          ? 'weak_or_spurious'
          : 'miss';
    }
  }

  if (tokens.every((t) => allTokens.has(t)) || tokens.some((t) => idTokens.includes(t) || hit.id.toLowerCase() === t)) {
    return 'relevant';
  }
  if (tokens.some((t) => t.length >= 3 && allTokens.has(t))) return 'partial';
  return 'weak_or_spurious';
}

/**
 * Classify remaining issues after corpus enrichment (TODO 6).
 * - corpus_missing: evidence still not in indexed records
 * - vocabulary_mismatch: evidence exists but query terms don't appear on project/research text
 * - keyword_retrieval_limit: terms/maps exist but lexical ranking/expansion is weak
 */
export function classifyQueryOutcome(query, judged, store) {
  const q = query.toLowerCase();
  const hasRelevant = judged.some((j) => j.obviouslyRelevant === 'relevant');
  const capabilityHit = judged.find((j) => j.type === 'capability' && j.obviouslyRelevant === 'relevant');
  const notes = [];
  let failureCause = null;
  let status = 'ok';

  if (hasRelevant) {
    status = 'resolved_or_ok';
    if (capabilityHit && ['product', 'ai'].includes(q)) {
      notes.push(
        `Capability mapping hit (${capabilityHit.key}); project/research bodies may still omit the query token (vocabulary mismatch without the capability layer).`
      );
      if (q === 'product') {
        notes.push(
          'Remaining keyword_retrieval_limit: evidence projects (nexschool, etc.) may not rank for "product" without relationship expansion.'
        );
      }
    }
    if (q === 'aws') {
      notes.push('Previously corpus_missing (About-only); now available via credential:aws-sap.');
    }
    return { status, failureCause, notes };
  }

  status = 'failure';
  if (q === 'aws') {
    const aws = store.get('credential:aws-sap');
    failureCause = aws ? 'keyword_retrieval_limit' : 'corpus_missing';
    notes.push(aws ? 'AWS credential indexed but search missed it.' : 'AWS credential still absent from corpus.');
  } else if (q === 'product') {
    const cap = store.get('capability:product_thinking');
    failureCause = cap ? 'vocabulary_mismatch' : 'corpus_missing';
    notes.push(
      cap
        ? 'Product evidence is mapped but search did not surface the capability/queryTerms.'
        : 'No product_thinking capability mapping in corpus.'
    );
  } else if (q === 'ai') {
    const cap = store.get('capability:ai_machine_learning');
    failureCause = cap ? 'keyword_retrieval_limit' : 'corpus_missing';
    notes.push(
      cap
        ? 'AI evidence is mapped but short-token keyword ranking remains brittle.'
        : 'No ai_machine_learning capability mapping.'
    );
  } else {
    failureCause = 'keyword_retrieval_limit';
    notes.push('No obviously relevant keyword hits for this query.');
  }

  return { status, failureCause, notes };
}

export function evaluateQueries(store, queries = DEFAULT_EVAL_QUERIES, options = {}) {
  const limit = options.limit ?? 5;
  const results = [];

  for (const query of queries) {
    const hits = store.search(query, {
      limit,
      expandRelated: options.expandRelated === true,
    });
    const judged = hits.map((h) => ({
      key: h.key,
      score: h.score,
      type: h.type,
      id: h.id,
      title: h.title,
      route: h.route,
      reasons: h.reasons,
      claimStrength: h.record?.extras?.claimStrength || null,
      obviouslyRelevant: judgeRelevance(query, h),
      related: h.related || undefined,
    }));

    const outcome = classifyQueryOutcome(query, judged, store);

    results.push({
      query,
      topK: judged,
      hitCount: judged.length,
      status: outcome.status,
      failureCause: outcome.failureCause,
      notes: outcome.notes,
    });
  }

  return {
    method: 'keyword_token_v1',
    limit,
    indexed: store.size(),
    failureTaxonomy: [
      'corpus_missing — professional evidence not present in indexed records',
      'vocabulary_mismatch — evidence exists but query wording absent from source blurbs (capability map bridges this)',
      'keyword_retrieval_limit — tokens/maps exist but lexical ranking/expansion is insufficient vs semantic retrieval',
    ],
    failureSummary: {
      corpus_missing: results.filter((r) => r.failureCause === 'corpus_missing').map((r) => r.query),
      vocabulary_mismatch: results.filter((r) => r.failureCause === 'vocabulary_mismatch').map((r) => r.query),
      keyword_retrieval_limit: results.filter((r) => r.failureCause === 'keyword_retrieval_limit').map((r) => r.query),
    },
    results,
  };
}
