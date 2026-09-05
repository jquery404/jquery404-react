/**
 * Provider-neutral grounded evidence-pack pipeline (TODO 8).
 *
 * question → retrieval → related evidence → ranked evidence pack
 * No LLM prose. Packs are safe to hand to any future model adapter.
 */

import { recordKey, tokenize } from './kb-retrieve-core.mjs';

/** Default hybrid weights (MiniLM + keyword). Transparent; not overfitted. */
export const DEFAULT_HYBRID_WEIGHTS = {
  semantic: 0.6,
  lexical: 0.3,
  exactBoost: 0.2,
};

export const DEFAULT_EVIDENCE_BUDGET = {
  topK: 8,
  maxEvidenceItems: 8,
  maxCharsTotal: 6000,
  maxCharsPerItem: 900,
  maxExpandedPerPrimary: 3,
  /** Drop semantic-only hits below this hybrid/normalized score when lexical=0 */
  minScoreFloor: 0.22,
  /** Near-duplicate Jaccard threshold on snippet tokens */
  dedupeJaccard: 0.72,
};

/**
 * Relevance / sufficiency gates for admitting Top-K hybrid hits as evidence.
 * Calibrated against scripts/fixtures/kb_retrieval_judgments.json + casual negatives.
 * Hybrid scores alone are insufficient: sem is max-normalized per query, so casual
 * nearest-neighbours often land near ~0.6 with no real portfolio relationship.
 */
export const DEFAULT_RELEVANCE = {
  /** Absolute MiniLM cosine — admit without lexical/intent support */
  semRawMin: 0.34,
  /** Softer absolute cosine when intent boost is strong enough */
  semRawMinWithIntent: 0.2,
  /** Minimum applyIntentBoost magnitude to use the soft semantic floor */
  intentBoostMin: 0.25,
  /** Absolute keyword score + normalized lex for the contentful-lexical path */
  lexRawMin: 12,
  lexNormMin: 0.15,
  contentTokenMinLen: 4,
};

/** Function words ignored when judging contentful lexical overlap (not a greeting list). */
export const LEXICAL_FUNCTION_WORDS = new Set(
  `a an the and or but if then else when what which who whom whose how why where is are was were be been being do does did doing have has had having can could should would will just about into onto from with without within for to of in on at by as it its this that these those you your me my we our they their he she his her i am not no yes so too very really also than there here up down out over under again more most other some such only own same s t don now`.split(
    /\s+/
  )
);

export const DEFAULT_RETRIEVAL_CONFIG = {
  id: 'hybrid_minilm_keyword_v1',
  mode: 'hybrid',
  embedder: 'minilm',
  expandRelated: true,
  weights: DEFAULT_HYBRID_WEIGHTS,
  budget: DEFAULT_EVIDENCE_BUDGET,
  relevance: DEFAULT_RELEVANCE,
};

/** Claims that must appear in corpus text to be answerable. */
export const UNSUPPORTED_CLAIM_PATTERNS = [
  {
    id: 'employer_google',
    pattern: /\bgoogle\b/i,
    queryIntent: /\b(work|worked|working|employ|job|career|hired)\b/i,
    corpusMustMatch: /\b(worked at google|engineer at google|employee (?:at|of) google)\b/i,
  },
  {
    id: 'employer_microsoft',
    pattern: /\bmicrosoft\b/i,
    queryIntent: /\b(work|worked|working|employ|job|career|hired)\b/i,
    corpusMustMatch: /\b(worked at microsoft|engineer at microsoft|employee (?:at|of) microsoft)\b/i,
  },
  {
    id: 'lang_rust',
    pattern: /\brust\b/i,
    queryIntent: /\b(know|knew|skill|fluent|experience|program|code|rust)\b/i,
    corpusMustMatch: /\brust\b/i,
  },
  {
    id: 'product_chatgpt',
    pattern: /\bchatgpt\b/i,
    queryIntent: null,
    corpusMustMatch: /\bchatgpt\b/i,
  },
  {
    id: 'managed_100',
    pattern: /\b100\s+engineers\b/i,
    queryIntent: null,
    corpusMustMatch: null,
  },
  {
    id: 'venture_capital',
    pattern: /\bventure\s+capital\b|\braised\b.{0,40}\b(funding|capital|seed|series)\b/i,
    queryIntent: null,
    corpusMustMatch: /\bventure\s+capital\b|\braised\b.{0,40}\b(funding|capital)\b/i,
  },
];

export function snippetFromRecord(record, maxChars) {
  const text = String(record?.text || '').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/**
 * Prefer detail over list duplicates; skip near-duplicate snippets;
 * avoid re-adding project text already covered by a kept capability expansion note.
 */
export function dedupeEvidenceCandidates(candidates, budget) {
  const sorted = [...candidates].sort((a, b) => {
    // Score-first so intent-boosted capabilities beat name-coincidence projects
    if (b.score !== a.score) return b.score - a.score;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.key.localeCompare(b.key);
  });

  const kept = [];
  const keptKeys = new Set();
  const keptSnippetTokens = [];

  for (const c of sorted) {
    if (keptKeys.has(c.key)) continue;

    // Prefer research detail over list_research with overlapping title tokens
    if (c.type === 'list_research') {
      const detailDup = kept.find(
        (k) =>
          k.type === 'research' &&
          jaccard(tokenize(k.title), tokenize(c.title)) >= 0.5
      );
      if (detailDup) continue;
    }

    // If we already have the project/research evidence from a capability, skip thin list dups
    if (c.role === 'expanded' && c.expandedFrom) {
      const parent = kept.find((k) => k.key === c.expandedFrom);
      if (parent?.type === 'capability') {
        // ok to keep — that's the point of expansion
      }
    }

    const toks = tokenize(c.snippet);
    const tooSimilar = keptSnippetTokens.some(
      (prev) => jaccard(prev, toks) >= (budget.dedupeJaccard ?? 0.72)
    );
    if (tooSimilar) continue;

    // Skip apps that duplicate portfolio project with same id (already merged in normalizer)
    if (c.type === 'project' && keptKeys.has(`project:${c.id}`)) continue;

    kept.push(c);
    keptKeys.add(c.key);
    keptSnippetTokens.push(toks);
    if (kept.length >= (budget.maxEvidenceItems ?? 8)) break;
  }

  return kept;
}

export function applyEvidenceBudget(items, budget) {
  const maxTotal = budget.maxCharsTotal ?? 6000;
  const maxPer = budget.maxCharsPerItem ?? 900;
  const out = [];
  let used = 0;

  for (const item of items) {
    let snippet = item.snippet || '';
    if (snippet.length > maxPer) snippet = `${snippet.slice(0, maxPer - 1).trim()}…`;
    if (used + snippet.length > maxTotal && out.length > 0) break;
    if (used + snippet.length > maxTotal) {
      const remain = Math.max(80, maxTotal - used);
      snippet = `${snippet.slice(0, remain - 1).trim()}…`;
    }
    out.push({ ...item, snippet, charCount: snippet.length });
    used += snippet.length;
  }

  return { items: out, totalChars: used };
}

export function detectHardUnsupported(query, corpusTextBlob) {
  const hits = [];
  for (const rule of UNSUPPORTED_CLAIM_PATTERNS) {
    if (!rule.pattern.test(query)) continue;
    if (rule.queryIntent && !rule.queryIntent.test(query)) continue;
    if (rule.corpusMustMatch === null) {
      hits.push(rule.id);
      continue;
    }
    if (!rule.corpusMustMatch.test(corpusTextBlob)) hits.push(rule.id);
  }
  return hits;
}

export function inferIntentHints(query) {
  const q = query.toLowerCase();
  const hints = [];
  if (/\b(ai|machine learning|ml|deep learning|artificial intelligence)\b/.test(q)) hints.push('ai_ml');
  if (/\bproduct(\s|-)?(management|thinking|design)?\b/.test(q)) hints.push('product');
  if (/\b(cloud|aws)\b/.test(q)) hints.push('cloud');
  if (/\b(leadership|lead)\b/.test(q)) hints.push('leadership');
  if (/\b(stakeholder|enterprise)\b/.test(q)) hints.push('stakeholder_enterprise');
  if (/\b(collab|collaboration|mixed reality|xr|mr|vr)\b/.test(q)) hints.push('xr_collab');
  if (/\b(research|phd|publication)\b/.test(q)) hints.push('research');
  if (/\b(mobile|android|ios)\b/.test(q)) hints.push('mobile');
  if (/\b(impressive|best|notable)\b/.test(q)) hints.push('highlights');
  if (/\b(built|builds|building|projects?|portfolio|made|created|shipped)\b/.test(q)) {
    hints.push('portfolio_overview');
  }
  if (
    /\b(this site|this portfolio|your site|your portfolio)\b/.test(q) ||
    /\b(who (are you|is faisal)|about (you|faisal|this site|this portfolio)|what (is|does) (this|the) (site|portfolio))\b/.test(
      q
    )
  ) {
    hints.push('site_meta');
    if (!hints.includes('portfolio_overview')) hints.push('portfolio_overview');
  }
  return hints;
}

/**
 * Retrieval hint only — does not invent facts. Helps vague site/about questions
 * land on capability/project evidence when the literal phrasing is too weak.
 */
export function expandRetrievalQuery(query, intentHints = []) {
  const q = String(query || '').trim();
  if (!q) return q;
  if (!intentHints.includes('site_meta')) return q;
  if (/\b(project|research|capability|portfolio overview)\b/i.test(q)) return q;
  return `${q} — portfolio overview projects research capabilities`;
}

export function parseHybridSignals(hit) {
  let sem = 0;
  let lex = 0;
  let semRaw = 0;
  let lexRaw = 0;
  for (const r of hit?.reasons || []) {
    const s = String(r);
    if (s.startsWith('semRaw=')) semRaw = Number(s.slice(7)) || 0;
    else if (s.startsWith('lexRaw=')) lexRaw = Number(s.slice(7)) || 0;
    else if (s.startsWith('sem=')) sem = Number(s.slice(4)) || 0;
    else if (s.startsWith('lex=')) lex = Number(s.slice(4)) || 0;
  }
  return { sem, lex, semRaw, lexRaw };
}

export function contentTokensForLexical(query, relevance = DEFAULT_RELEVANCE) {
  const minLen = relevance.contentTokenMinLen ?? 4;
  return tokenize(query).filter((t) => t.length >= minLen && !LEXICAL_FUNCTION_WORDS.has(t));
}

/** True when query has contentful tokens that exactly match title/id/tags (not prefix-only). */
export function hasContentfulLexicalOverlap(hit, query, relevance = DEFAULT_RELEVANCE) {
  const content = contentTokensForLexical(query, relevance);
  if (!content.length) return false;
  const rec = hit.record || hit;
  const fields = [rec.id, rec.title, ...(rec.tags || [])].map((x) => String(x || '').toLowerCase());
  const fieldToks = new Set(fields.flatMap((f) => tokenize(f)));
  return content.some(
    (t) => fieldToks.has(t) || fields.some((f) => f === t || (t.length >= 5 && f.includes(t)))
  );
}

/**
 * Top-K hybrid hits are candidates. Admit only when absolute semantic, intent-aligned
 * soft semantic, or contentful lexical support is sufficient.
 */
export function isRelevantEvidenceHit(hit, options = {}) {
  const relevance = { ...DEFAULT_RELEVANCE, ...(options.relevance || {}) };
  const intentBoost = Number(options.intentBoost) || 0;
  const query = options.query || '';
  const { semRaw, lexRaw, lex } = parseHybridSignals(hit);

  if (semRaw >= relevance.semRawMin) return { ok: true, reason: 'sem_raw' };
  if (intentBoost >= relevance.intentBoostMin && semRaw >= relevance.semRawMinWithIntent) {
    return { ok: true, reason: 'intent_sem' };
  }
  if (
    hasContentfulLexicalOverlap(hit, query, relevance) &&
    lexRaw >= relevance.lexRawMin &&
    lex >= relevance.lexNormMin
  ) {
    return { ok: true, reason: 'content_lex' };
  }
  return { ok: false, reason: 'insufficient' };
}

/** Intent-aware score adjustment — prefer grounded capability/credential hits over name coincidence. */
export function applyIntentBoost(hit, intentHints) {
  let boost = 0;
  const key = hit.key || `${hit.type}:${hit.id}`;
  const blob = `${hit.title} ${hit.record?.text || ''} ${(hit.record?.tags || []).join(' ')}`.toLowerCase();

  if (intentHints.includes('ai_ml')) {
    if (key === 'capability:ai_machine_learning') boost += 0.45;
    if (/tensorflow|machine learning|deep learning|\bcnn\b|picturesque|object recognition/.test(blob))
      boost += 0.2;
    // Penalize weak name-only / unrelated creative projects
    if (/faisal desk|photoshop|flash artwork/.test(blob) && !/machine learning|ai\b|tensorflow/.test(blob))
      boost -= 0.35;
  }
  if (intentHints.includes('product')) {
    if (key === 'capability:product_thinking') boost += 0.45;
    if (/nexschool|nexcrm|myeg|linz|cadastrar|stakeholder/.test(blob)) boost += 0.15;
  }
  if (intentHints.includes('cloud')) {
    if (key === 'credential:aws-sap') boost += 0.5;
    if (/\baws\b|solutions architect|credly|cloud/.test(blob)) boost += 0.2;
  }
  if (intentHints.includes('xr_collab')) {
    if (key === 'capability:spatial_computing_xr' || key === 'capability:collaboration') boost += 0.35;
    if (/mixed reality|telecollaboration|xr|collaborat/.test(blob)) boost += 0.1;
  }
  if (intentHints.includes('leadership')) {
    if (key === 'credential:phd-computer-graphics' || key === 'credential:siggraph-rtl-2023') boost += 0.35;
    if (key === 'research:thesis' || key === 'research:rtstage') boost += 0.3;
    if (/thesis|audience choice|siggraph|first author/.test(blob)) boost += 0.1;
  }
  if (intentHints.includes('stakeholder_enterprise')) {
    if (key === 'capability:product_thinking') boost += 0.4;
    if (/cadastrar|linz|nexschool|nexcrm|myeg/.test(key)) boost += 0.2;
  }
  if (intentHints.includes('portfolio_overview')) {
    if (
      key === 'capability:product_thinking' ||
      key === 'capability:research' ||
      key === 'capability:mobile_engineering' ||
      key === 'capability:spatial_computing_xr' ||
      key === 'capability:collaboration'
    ) {
      boost += 0.35;
    }
    if (hit.type === 'research' && hit.record?.route) boost += 0.2;
  }
  if (intentHints.includes('highlights')) {
    if (/siggraph|audience choice|award|thesis|phd/.test(blob)) boost += 0.2;
  }
  return boost;
}

/**
 * Deterministic answerability from retrieval sufficiency — not model confidence.
 */
export function assessConfidence({ query, evidence, hardUnsupported, topScore, lexicalHitCount }) {
  if (hardUnsupported.length) {
    return {
      confidence: 'unsupported',
      reason: `Query asserts facts absent from KB (${hardUnsupported.join(', ')}).`,
    };
  }
  if (!evidence.length) {
    return {
      confidence: 'none',
      reason: 'No sufficiently relevant portfolio evidence for this query.',
    };
  }

  const hasDirect =
    evidence.some((e) => e.claimStrength === 'direct') ||
    evidence.some((e) => ['research', 'project', 'credential', 'book'].includes(e.type) && e.role === 'primary');
  const hasCapability = evidence.some((e) => e.type === 'capability');
  const inferredOnly =
    hasCapability &&
    evidence.filter((e) => e.type === 'capability').every((e) => e.claimStrength === 'reasonably_inferred') &&
    !evidence.some((e) => ['research', 'project', 'credential', 'book'].includes(e.type));

  if (topScore >= 0.55 && (hasDirect || (hasCapability && evidence.length >= 2))) {
    return { confidence: 'strong', reason: 'High retrieval score with direct or multi-item grounded evidence.' };
  }
  if (topScore >= 0.35 && evidence.length >= 2) {
    return {
      confidence: inferredOnly ? 'moderate' : 'strong',
      reason: inferredOnly
        ? 'Evidence is primarily capability inference; treat claimStrength carefully.'
        : 'Solid multi-item evidence pack.',
    };
  }
  if (lexicalHitCount > 0 || topScore >= 0.28) {
    return { confidence: 'moderate', reason: 'Partial lexical/semantic support; pack may be incomplete.' };
  }
  if (evidence.length === 1 && topScore < 0.28) {
    return { confidence: 'weak', reason: 'Single low-scoring hit; answerability uncertain.' };
  }
  return { confidence: 'weak', reason: 'Low retrieval support.' };
}

function hitToCandidate(hit, role, budget, extra = {}) {
  const rec = hit.record;
  const maxPer = budget.maxCharsPerItem ?? 900;
  // Capability records: keep claimStrength + notes, not huge evidence key dumps only
  let snippet = snippetFromRecord(rec, maxPer);
  if (rec.type === 'capability' && rec.extras?.notes) {
    snippet = [
      `Capability: ${rec.title}`,
      `Claim strength: ${rec.extras.claimStrength}`,
      rec.extras.notes,
      `Evidence IDs: ${(rec.extras.evidenceKeys || []).join(', ')}`,
    ].join('\n');
    if (snippet.length > maxPer) snippet = `${snippet.slice(0, maxPer - 1).trim()}…`;
  }

  return {
    key: hit.key,
    id: rec.id,
    type: rec.type,
    title: rec.title,
    snippet,
    route: rec.route ?? null,
    alsoRoutes: rec.alsoRoutes || [],
    tags: rec.tags || [],
    thumbnail: rec.extras?.thumbnail || null,
    desc: rec.extras?.desc || null,
    provenance: rec.provenance || null,
    score: hit.score,
    role,
    relationToQuery: extra.relationToQuery || (role === 'expanded' ? 'related_evidence' : 'retrieved'),
    claimStrength: rec.extras?.claimStrength || (rec.type === 'capability' ? null : 'direct'),
    relatedRecordIds: (rec.related || [])
      .filter((r) => r.confidence !== 'uncertain')
      .map((r) => `${r.type}:${r.id}`),
    expandedFrom: extra.expandedFrom || null,
    priority: role === 'primary' ? 3 : role === 'expanded' ? 2 : 1,
    reasons: hit.reasons || [],
  };
}

/**
 * Build a grounded evidence pack from an already-indexed RetrievalStore.
 */
export async function buildEvidencePack(store, options = {}) {
  const query = String(options.query || '').trim();
  const config = {
    ...DEFAULT_RETRIEVAL_CONFIG,
    ...options.config,
    weights: { ...DEFAULT_HYBRID_WEIGHTS, ...(options.config?.weights || {}) },
    budget: { ...DEFAULT_EVIDENCE_BUDGET, ...(options.config?.budget || {}), ...(options.budget || {}) },
    relevance: {
      ...DEFAULT_RELEVANCE,
      ...(options.config?.relevance || {}),
      ...(options.relevance || {}),
    },
  };
  const budget = config.budget;
  const relevance = config.relevance;
  const topK = options.topK ?? budget.topK ?? 8;
  const expandRelated = options.expandRelated ?? config.expandRelated ?? true;
  const mode = options.mode || config.mode || 'hybrid';

  const t0 = Date.now();
  const intentHints = inferIntentHints(query);
  const retrievalQuery = expandRetrievalQuery(query, intentHints);

  const corpusBlob = store
    .list()
    .map((r) => `${r.title}\n${r.text}`)
    .join('\n');
  const hardUnsupported = detectHardUnsupported(query, corpusBlob);

  if (hardUnsupported.length) {
    const conf = assessConfidence({
      query,
      evidence: [],
      hardUnsupported,
      topScore: 0,
      lexicalHitCount: 0,
    });
    return {
      query,
      intentHints,
      evidence: [],
      routes: [],
      suggestedViews: [],
      confidence: conf.confidence,
      confidenceReason: conf.reason,
      retrievalMeta: {
        configId: config.id,
        mode,
        expandRelated,
        weights: config.weights,
        budget,
        latencyMs: Date.now() - t0,
        hardUnsupported,
        primaryCount: 0,
        expandedCount: 0,
        totalChars: 0,
        discarded: ['hard_unsupported_claim'],
      },
    };
  }

  const { hits, latencyMs, mode: usedMode } = await store.searchAsync(retrievalQuery, {
    limit: Math.max(topK, 12),
    mode,
    expandRelated: false,
  });

  let lexicalHitCount = 0;
  try {
    lexicalHitCount = store.search(retrievalQuery, { limit: 10 }).length;
  } catch {
    lexicalHitCount = hits.filter((h) => /lex=0\.[1-9]|lex=[1-9]/.test((h.reasons || []).join(' '))).length;
  }

  const floor = budget.minScoreFloor ?? 0.22;
  const scoredHits = hits
    .map((hit) => {
      const boost = applyIntentBoost(hit, intentHints);
      return {
        ...hit,
        score: Math.round((hit.score + boost) * 100000) / 100000,
        reasons: [...(hit.reasons || []), ...(boost ? [`intent_boost=${boost}`] : [])],
        _intentBoost: boost,
      };
    })
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const discarded = [];
  const primaries = [];
  for (const hit of scoredHits) {
    const signals = parseHybridSignals(hit);
    const semanticOnly = signals.lex === 0 || (signals.lex === 0 && String(mode).startsWith('semantic'));
    if (semanticOnly && hit.score < floor) {
      discarded.push(`${hit.key}:below_floor`);
      continue;
    }
    if (hit.score < floor * 0.85) {
      discarded.push(`${hit.key}:below_soft_floor`);
      continue;
    }
    const sufficiency = isRelevantEvidenceHit(hit, {
      query: retrievalQuery,
      intentBoost: hit._intentBoost || 0,
      relevance,
    });
    if (!sufficiency.ok) {
      discarded.push(`${hit.key}:${sufficiency.reason}`);
      continue;
    }
    primaries.push(
      hitToCandidate(
        {
          ...hit,
          reasons: [...(hit.reasons || []), `relevance=${sufficiency.reason}`],
        },
        'primary',
        budget
      )
    );
    if (primaries.length >= topK) break;
  }

  const expanded = [];
  if (expandRelated) {
    for (const primary of primaries.slice(0, topK)) {
      const related = store.getRelated(primary.key, { limit: budget.maxExpandedPerPrimary ?? 3 });
      let added = 0;
      for (const rel of related) {
        if (!rel.found) continue;
        if (primaries.some((p) => p.key === rel.key)) continue;
        const rec = store.get(rel.key);
        if (!rec) continue;
        expanded.push(
          hitToCandidate(
            {
              key: rel.key,
              score: primary.score * 0.9,
              reasons: [`expanded_from:${primary.key}`, rel.relation],
              record: rec,
            },
            'expanded',
            budget,
            {
              expandedFrom: primary.key,
              relationToQuery: `${rel.relation}_via_${primary.id}`,
            }
          )
        );
        added += 1;
        if (added >= (budget.maxExpandedPerPrimary ?? 3)) break;
      }
    }
  }

  // Prefer direct/credential/research before weak events when budgeting
  const priorityBoost = (c) => {
    let p = c.priority;
    if (c.type === 'credential' || c.type === 'research' || c.type === 'project') p += 0.5;
    if (c.type === 'capability' && c.claimStrength === 'direct') p += 0.4;
    if (c.type === 'capability' && c.claimStrength === 'reasonably_inferred') p -= 0.1;
    if (c.type === 'event' || c.type === 'press') p -= 0.2;
    return { ...c, priority: p };
  };

  const deduped = dedupeEvidenceCandidates(
    [...primaries, ...expanded].map(priorityBoost),
    budget
  );
  const { items, totalChars } = applyEvidenceBudget(deduped, budget);

  const topScore = items[0]?.score ?? 0;
  const conf = assessConfidence({
    query,
    evidence: items,
    hardUnsupported: [],
    topScore,
    lexicalHitCount,
  });

  const suggestedViews = items
    .filter((e) => e.route)
    .slice(0, 5)
    .map((e, i) => ({
      recordId: e.id,
      recordKey: e.key,
      route: e.route,
      reason: i === 0 ? 'primary evidence' : e.role === 'expanded' ? 'related evidence' : 'supporting evidence',
    }));

  const routes = [...new Set(items.map((e) => e.route).filter(Boolean))];

  return {
    query,
    intentHints,
    evidence: items.map((e) => ({
      id: e.id,
      key: e.key,
      type: e.type,
      title: e.title,
      snippet: e.snippet,
      route: e.route,
      alsoRoutes: e.alsoRoutes,
      provenance: e.provenance,
      score: e.score,
      role: e.role,
      relationToQuery: e.relationToQuery,
      claimStrength: e.claimStrength,
      relatedRecordIds: e.relatedRecordIds,
      expandedFrom: e.expandedFrom,
    })),
    routes,
    suggestedViews,
    confidence: conf.confidence,
    confidenceReason: conf.reason,
    retrievalMeta: {
      configId: config.id,
      mode: usedMode,
      expandRelated,
      weights: config.weights,
      budget,
      relevance,
      latencyMs: latencyMs ?? Date.now() - t0,
      hardUnsupported: [],
      primaryCount: items.filter((e) => e.role === 'primary').length,
      expandedCount: items.filter((e) => e.role === 'expanded').length,
      totalChars,
      topScore,
      lexicalHitCount,
      discarded: discarded.slice(0, 24),
      retrievalQuery: retrievalQuery !== query ? retrievalQuery : undefined,
    },
  };
}

export function formatEvidencePackText(pack) {
  const lines = [];
  lines.push(`Query: ${pack.query}`);
  lines.push(`Confidence: ${pack.confidence} — ${pack.confidenceReason}`);
  lines.push(`Config: ${pack.retrievalMeta.configId} · mode=${pack.retrievalMeta.mode} · ${pack.retrievalMeta.latencyMs}ms`);
  lines.push(`Evidence: ${pack.evidence.length} items · ${pack.retrievalMeta.totalChars} chars`);
  if (pack.intentHints?.length) lines.push(`Intent hints: ${pack.intentHints.join(', ')}`);
  lines.push('');
  pack.evidence.forEach((e, i) => {
    lines.push(`${i + 1}. [${e.type}] ${e.title} (${e.key})`);
    lines.push(`   score=${e.score} · role=${e.role} · claimStrength=${e.claimStrength ?? 'n/a'}`);
    if (e.route) lines.push(`   route: ${e.route}`);
    if (e.expandedFrom) lines.push(`   expandedFrom: ${e.expandedFrom}`);
    if (e.provenance?.sourcePath) lines.push(`   source: ${e.provenance.sourcePath}`);
    lines.push(`   ---`);
    e.snippet.split('\n').forEach((ln) => lines.push(`   ${ln}`));
    lines.push('');
  });
  if (pack.suggestedViews?.length) {
    lines.push('Suggested views:');
    for (const v of pack.suggestedViews) {
      lines.push(` - ${v.route} (${v.reason}) [${v.recordKey}]`);
    }
  }
  return lines.join('\n');
}
