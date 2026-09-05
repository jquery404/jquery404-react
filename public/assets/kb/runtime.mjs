// scripts/lib/kb-retrieve-core.mjs
function recordKey(recordOrType, maybeId) {
  if (typeof recordOrType === "object" && recordOrType) {
    return `${recordOrType.type}:${recordOrType.id}`;
  }
  if (maybeId !== void 0) return `${recordOrType}:${maybeId}`;
  return String(recordOrType);
}
function tokenize(input) {
  return String(input || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
}
function countTokenHits(haystackTokens, queryToken) {
  let n = 0;
  for (const t of haystackTokens) {
    if (t === queryToken) n += 1;
    else if (queryToken.length >= 3 && t.startsWith(queryToken)) n += 0.5;
  }
  return n;
}
function fieldTokens(value) {
  if (Array.isArray(value)) return tokenize(value.join(" "));
  return tokenize(value);
}
function scoreRecord(record, query, options = {}) {
  const qRaw = String(query || "").trim();
  if (!qRaw) return { score: 0, reasons: [] };
  const qLower = qRaw.toLowerCase();
  const qTokens = tokenize(qRaw);
  if (!qTokens.length) return { score: 0, reasons: [] };
  const weights = {
    idExact: options.idExact ?? 100,
    idPartial: options.idPartial ?? 40,
    title: options.title ?? 12,
    tag: options.tag ?? 10,
    text: options.text ?? 2,
    phraseTitle: options.phraseTitle ?? 25,
    phraseText: options.phraseText ?? 8
  };
  let score = 0;
  const reasons = [];
  const idLower = String(record.id || "").toLowerCase();
  const idTokens = tokenize(record.id);
  const typeId = `${record.type}:${record.id}`.toLowerCase();
  if (idLower === qLower || typeId === qLower || idLower === qTokens.join("-") || idTokens.join("") === qTokens.join("")) {
    score += weights.idExact;
    reasons.push("id_exact");
  } else if (qTokens.some(
    (t) => idLower === t || idTokens.includes(t) || // Substring id match only for longer tokens (avoid "ai" ⊂ "brain")
    t.length >= 3 && idLower.includes(t)
  )) {
    score += weights.idPartial;
    reasons.push("id_partial");
  }
  const titleTokens = fieldTokens(record.title);
  const tagTokens = fieldTokens(record.tags || []);
  const textTokens = fieldTokens(record.text);
  if (qLower.length >= 3 && String(record.title || "").toLowerCase().includes(qLower)) {
    score += weights.phraseTitle;
    reasons.push("phrase_title");
  } else if (qLower.length >= 3 && String(record.text || "").toLowerCase().includes(qLower)) {
    score += weights.phraseText;
    reasons.push("phrase_text");
  }
  for (const qt of qTokens) {
    const titleHits = countTokenHits(titleTokens, qt);
    if (titleHits) {
      score += titleHits * weights.title;
      reasons.push(`title:${qt}`);
    }
    const tagHits = countTokenHits(tagTokens, qt);
    if (tagHits) {
      score += tagHits * weights.tag;
      reasons.push(`tag:${qt}`);
    }
    const textHits = countTokenHits(textTokens, qt);
    if (textHits) {
      score += Math.min(textHits, 8) * weights.text;
      reasons.push(`text:${qt}`);
    }
  }
  score = Math.round(score * 1e3) / 1e3;
  return { score, reasons: [...new Set(reasons)].sort() };
}
var MemoryKbStore = class {
  constructor() {
    this._records = /* @__PURE__ */ new Map();
    this.backend = "memory";
  }
  upsert(record) {
    if (!record?.type || !record?.id) {
      throw new Error("upsert requires record.type and record.id");
    }
    const key = recordKey(record);
    const prev = this._records.get(key);
    const action = !prev ? "inserted" : prev.contentHash !== record.contentHash ? "updated" : "noop";
    if (action !== "noop") {
      this._records.set(key, structuredClone(record));
    }
    return { key, action };
  }
  remove(id) {
    const key = this._resolveKey(id);
    if (!key) return { key: id, action: "missing" };
    this._records.delete(key);
    return { key, action: "deleted" };
  }
  get(id) {
    const key = this._resolveKey(id);
    if (!key) return null;
    const rec = this._records.get(key);
    return rec ? structuredClone(rec) : null;
  }
  has(id) {
    return this._resolveKey(id) !== null;
  }
  size() {
    return this._records.size;
  }
  list() {
    return [...this._records.values()].map((r) => structuredClone(r)).sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });
  }
  /**
   * @param {string} query
   * @param {{ limit?: number, expandRelated?: boolean, types?: string[] }} [options]
   */
  search(query, options = {}) {
    const limit = options.limit ?? 10;
    const types = options.types ? new Set(options.types) : null;
    const scored = [];
    for (const rec of this._records.values()) {
      if (types && !types.has(rec.type)) continue;
      const { score, reasons } = scoreRecord(rec, query);
      if (score <= 0) continue;
      scored.push({
        key: recordKey(rec),
        score,
        reasons,
        type: rec.type,
        id: rec.id,
        title: rec.title,
        route: rec.route ?? null,
        alsoRoutes: rec.alsoRoutes || [],
        contentHash: rec.contentHash,
        record: structuredClone(rec)
      });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });
    const top = scored.slice(0, limit);
    if (options.expandRelated) {
      for (const hit of top) {
        hit.related = this.getRelated(recordKey(hit.record), { limit: 5 });
      }
    }
    return top;
  }
  /**
   * Confirmed relationships only by default.
   */
  getRelated(id, options = {}) {
    const rec = this.get(id);
    if (!rec) return [];
    const limit = options.limit ?? 20;
    const includeUncertain = options.includeUncertain === true;
    const out = [];
    for (const rel of rec.related || []) {
      if (!includeUncertain && rel.confidence === "uncertain") continue;
      const targetKey = `${rel.type}:${rel.id}`;
      const target = this._records.get(targetKey);
      out.push({
        relation: rel.relation,
        confidence: rel.confidence,
        key: targetKey,
        found: Boolean(target),
        type: rel.type,
        id: rel.id,
        title: target?.title ?? null,
        route: target?.route ?? null
      });
      if (out.length >= limit) break;
    }
    return out;
  }
  /**
   * Apply a TODO 4 changeSet. Unchanged keys are skipped (no upsert).
   * @param {{ added: string[], changed: string[], unchanged?: string[], removed: string[] }} changeSet
   * @param {Map<string, object>|Record<string, object>|object[]} nextRecords
   */
  applyDiff(changeSet, nextRecords) {
    const lookup = toLookup(nextRecords);
    const stats = {
      inserted: 0,
      updated: 0,
      skippedUnchanged: 0,
      deleted: 0,
      missingForUpsert: 0,
      missingForDelete: 0,
      noopUpserts: 0
    };
    for (const key of changeSet.unchanged || []) {
      stats.skippedUnchanged += 1;
    }
    for (const key of [...changeSet.added || [], ...changeSet.changed || []]) {
      const rec = lookup.get(key);
      if (!rec) {
        stats.missingForUpsert += 1;
        continue;
      }
      const { action } = this.upsert(rec);
      if (action === "inserted") stats.inserted += 1;
      else if (action === "updated") stats.updated += 1;
      else stats.noopUpserts += 1;
    }
    for (const key of changeSet.removed || []) {
      const { action } = this.remove(key);
      if (action === "deleted") stats.deleted += 1;
      else stats.missingForDelete += 1;
    }
    return stats;
  }
  /**
   * Full sync from a next record set vs current store contents.
   * Proves incremental behaviour using the same classification as TODO 4.
   */
  syncRecords(nextRecords) {
    const nextList = Array.isArray(nextRecords) ? nextRecords : [...toLookup(nextRecords).values()];
    const previous = this.list();
    const changeSet = diffRecordSnapshots(previous, nextList);
    const stats = this.applyDiff(changeSet, nextList);
    return { changeSet, stats };
  }
  _resolveKey(id) {
    const raw = String(id);
    if (this._records.has(raw)) return raw;
    const matches = [...this._records.keys()].filter((k) => k.endsWith(`:${raw}`) || k === raw);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      return null;
    }
    return null;
  }
};
function toLookup(nextRecords) {
  if (nextRecords instanceof Map) return nextRecords;
  const map = /* @__PURE__ */ new Map();
  if (Array.isArray(nextRecords)) {
    for (const rec of nextRecords) map.set(recordKey(rec), rec);
  } else if (nextRecords && typeof nextRecords === "object") {
    for (const [k, v] of Object.entries(nextRecords)) map.set(k, v);
  }
  return map;
}
function diffRecordSnapshots(previousRecords = [], nextRecords = []) {
  const prev = new Map(previousRecords.map((r) => [`${r.type}:${r.id}`, r]));
  const next = new Map(nextRecords.map((r) => [`${r.type}:${r.id}`, r]));
  const added = [];
  const changed = [];
  const unchanged = [];
  const removed = [];
  for (const [key, rec] of next) {
    if (!prev.has(key)) added.push(key);
    else if (prev.get(key).contentHash !== rec.contentHash) changed.push(key);
    else unchanged.push(key);
  }
  for (const key of prev.keys()) {
    if (!next.has(key)) removed.push(key);
  }
  return {
    added: added.sort(),
    changed: changed.sort(),
    unchanged: unchanged.sort(),
    removed: removed.sort()
  };
}

// scripts/lib/kb-evidence.mjs
var DEFAULT_HYBRID_WEIGHTS = {
  semantic: 0.6,
  lexical: 0.3,
  exactBoost: 0.2
};
var DEFAULT_EVIDENCE_BUDGET = {
  topK: 8,
  maxEvidenceItems: 8,
  maxCharsTotal: 6e3,
  maxCharsPerItem: 900,
  maxExpandedPerPrimary: 3,
  /** Drop semantic-only hits below this hybrid/normalized score when lexical=0 */
  minScoreFloor: 0.22,
  /** Near-duplicate Jaccard threshold on snippet tokens */
  dedupeJaccard: 0.72
};
var DEFAULT_RELEVANCE = {
  /** Absolute MiniLM cosine — admit without lexical/intent support */
  semRawMin: 0.34,
  /** Softer absolute cosine when intent boost is strong enough */
  semRawMinWithIntent: 0.2,
  /** Minimum applyIntentBoost magnitude to use the soft semantic floor */
  intentBoostMin: 0.25,
  /** Absolute keyword score + normalized lex for the contentful-lexical path */
  lexRawMin: 12,
  lexNormMin: 0.15,
  contentTokenMinLen: 4
};
var LEXICAL_FUNCTION_WORDS = new Set(
  `a an the and or but if then else when what which who whom whose how why where is are was were be been being do does did doing have has had having can could should would will just about into onto from with without within for to of in on at by as it its this that these those you your me my we our they their he she his her i am not no yes so too very really also than there here up down out over under again more most other some such only own same s t don now`.split(
    /\s+/
  )
);
var DEFAULT_RETRIEVAL_CONFIG = {
  id: "hybrid_minilm_keyword_v1",
  mode: "hybrid",
  embedder: "minilm",
  expandRelated: true,
  weights: DEFAULT_HYBRID_WEIGHTS,
  budget: DEFAULT_EVIDENCE_BUDGET,
  relevance: DEFAULT_RELEVANCE
};
var UNSUPPORTED_CLAIM_PATTERNS = [
  {
    id: "employer_google",
    pattern: /\bgoogle\b/i,
    queryIntent: /\b(work|worked|working|employ|job|career|hired)\b/i,
    corpusMustMatch: /\b(worked at google|engineer at google|employee (?:at|of) google)\b/i
  },
  {
    id: "employer_microsoft",
    pattern: /\bmicrosoft\b/i,
    queryIntent: /\b(work|worked|working|employ|job|career|hired)\b/i,
    corpusMustMatch: /\b(worked at microsoft|engineer at microsoft|employee (?:at|of) microsoft)\b/i
  },
  {
    id: "lang_rust",
    pattern: /\brust\b/i,
    queryIntent: /\b(know|knew|skill|fluent|experience|program|code|rust)\b/i,
    corpusMustMatch: /\brust\b/i
  },
  {
    id: "product_chatgpt",
    pattern: /\bchatgpt\b/i,
    queryIntent: null,
    corpusMustMatch: /\bchatgpt\b/i
  },
  {
    id: "managed_100",
    pattern: /\b100\s+engineers\b/i,
    queryIntent: null,
    corpusMustMatch: null
  },
  {
    id: "venture_capital",
    pattern: /\bventure\s+capital\b|\braised\b.{0,40}\b(funding|capital|seed|series)\b/i,
    queryIntent: null,
    corpusMustMatch: /\bventure\s+capital\b|\braised\b.{0,40}\b(funding|capital)\b/i
  }
];
function snippetFromRecord(record, maxChars) {
  const text = String(record?.text || "").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trim()}\u2026`;
}
function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}
function dedupeEvidenceCandidates(candidates, budget) {
  const sorted = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.key.localeCompare(b.key);
  });
  const kept = [];
  const keptKeys = /* @__PURE__ */ new Set();
  const keptSnippetTokens = [];
  for (const c of sorted) {
    if (keptKeys.has(c.key)) continue;
    if (c.type === "list_research") {
      const detailDup = kept.find(
        (k) => k.type === "research" && jaccard(tokenize(k.title), tokenize(c.title)) >= 0.5
      );
      if (detailDup) continue;
    }
    if (c.role === "expanded" && c.expandedFrom) {
      const parent = kept.find((k) => k.key === c.expandedFrom);
      if (parent?.type === "capability") {
      }
    }
    const toks = tokenize(c.snippet);
    const tooSimilar = keptSnippetTokens.some(
      (prev) => jaccard(prev, toks) >= (budget.dedupeJaccard ?? 0.72)
    );
    if (tooSimilar) continue;
    if (c.type === "project" && keptKeys.has(`project:${c.id}`)) continue;
    kept.push(c);
    keptKeys.add(c.key);
    keptSnippetTokens.push(toks);
    if (kept.length >= (budget.maxEvidenceItems ?? 8)) break;
  }
  return kept;
}
function applyEvidenceBudget(items, budget) {
  const maxTotal = budget.maxCharsTotal ?? 6e3;
  const maxPer = budget.maxCharsPerItem ?? 900;
  const out = [];
  let used = 0;
  for (const item of items) {
    let snippet = item.snippet || "";
    if (snippet.length > maxPer) snippet = `${snippet.slice(0, maxPer - 1).trim()}\u2026`;
    if (used + snippet.length > maxTotal && out.length > 0) break;
    if (used + snippet.length > maxTotal) {
      const remain = Math.max(80, maxTotal - used);
      snippet = `${snippet.slice(0, remain - 1).trim()}\u2026`;
    }
    out.push({ ...item, snippet, charCount: snippet.length });
    used += snippet.length;
  }
  return { items: out, totalChars: used };
}
function detectHardUnsupported(query, corpusTextBlob) {
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
function inferIntentHints(query) {
  const q = query.toLowerCase();
  const hints = [];
  if (/\b(ai|machine learning|ml|deep learning|artificial intelligence)\b/.test(q)) hints.push("ai_ml");
  if (/\bproduct(\s|-)?(management|thinking|design)?\b/.test(q)) hints.push("product");
  if (/\b(cloud|aws)\b/.test(q)) hints.push("cloud");
  if (/\b(leadership|lead)\b/.test(q)) hints.push("leadership");
  if (/\b(stakeholder|enterprise)\b/.test(q)) hints.push("stakeholder_enterprise");
  if (/\b(collab|collaboration|mixed reality|xr|mr|vr)\b/.test(q)) hints.push("xr_collab");
  if (/\b(research|phd|publication)\b/.test(q)) hints.push("research");
  if (/\b(mobile|android|ios)\b/.test(q)) hints.push("mobile");
  if (/\b(impressive|best|notable)\b/.test(q)) hints.push("highlights");
  if (/\b(built|builds|building|projects?|portfolio|made|created|shipped)\b/.test(q)) {
    hints.push("portfolio_overview");
  }
  if (/\b(this site|this portfolio|your site|your portfolio)\b/.test(q) || /\b(who (are you|is faisal)|about (you|faisal|this site|this portfolio)|what (is|does) (this|the) (site|portfolio))\b/.test(
    q
  )) {
    hints.push("site_meta");
    if (!hints.includes("portfolio_overview")) hints.push("portfolio_overview");
  }
  return hints;
}
function expandRetrievalQuery(query, intentHints = []) {
  const q = String(query || "").trim();
  if (!q) return q;
  if (!intentHints.includes("site_meta")) return q;
  if (/\b(project|research|capability|portfolio overview)\b/i.test(q)) return q;
  return `${q} \u2014 portfolio overview projects research capabilities`;
}
function parseHybridSignals(hit) {
  let sem = 0;
  let lex = 0;
  let semRaw = 0;
  let lexRaw = 0;
  for (const r of hit?.reasons || []) {
    const s = String(r);
    if (s.startsWith("semRaw=")) semRaw = Number(s.slice(7)) || 0;
    else if (s.startsWith("lexRaw=")) lexRaw = Number(s.slice(7)) || 0;
    else if (s.startsWith("sem=")) sem = Number(s.slice(4)) || 0;
    else if (s.startsWith("lex=")) lex = Number(s.slice(4)) || 0;
  }
  return { sem, lex, semRaw, lexRaw };
}
function contentTokensForLexical(query, relevance = DEFAULT_RELEVANCE) {
  const minLen = relevance.contentTokenMinLen ?? 4;
  return tokenize(query).filter((t) => t.length >= minLen && !LEXICAL_FUNCTION_WORDS.has(t));
}
function hasContentfulLexicalOverlap(hit, query, relevance = DEFAULT_RELEVANCE) {
  const content = contentTokensForLexical(query, relevance);
  if (!content.length) return false;
  const rec = hit.record || hit;
  const fields = [rec.id, rec.title, ...rec.tags || []].map((x) => String(x || "").toLowerCase());
  const fieldToks = new Set(fields.flatMap((f) => tokenize(f)));
  return content.some(
    (t) => fieldToks.has(t) || fields.some((f) => f === t || t.length >= 5 && f.includes(t))
  );
}
function isRelevantEvidenceHit(hit, options = {}) {
  const relevance = { ...DEFAULT_RELEVANCE, ...options.relevance || {} };
  const intentBoost = Number(options.intentBoost) || 0;
  const query = options.query || "";
  const { semRaw, lexRaw, lex } = parseHybridSignals(hit);
  if (semRaw >= relevance.semRawMin) return { ok: true, reason: "sem_raw" };
  if (intentBoost >= relevance.intentBoostMin && semRaw >= relevance.semRawMinWithIntent) {
    return { ok: true, reason: "intent_sem" };
  }
  if (hasContentfulLexicalOverlap(hit, query, relevance) && lexRaw >= relevance.lexRawMin && lex >= relevance.lexNormMin) {
    return { ok: true, reason: "content_lex" };
  }
  return { ok: false, reason: "insufficient" };
}
function applyIntentBoost(hit, intentHints) {
  let boost = 0;
  const key = hit.key || `${hit.type}:${hit.id}`;
  const blob = `${hit.title} ${hit.record?.text || ""} ${(hit.record?.tags || []).join(" ")}`.toLowerCase();
  if (intentHints.includes("ai_ml")) {
    if (key === "capability:ai_machine_learning") boost += 0.45;
    if (/tensorflow|machine learning|deep learning|\bcnn\b|picturesque|object recognition/.test(blob))
      boost += 0.2;
    if (/faisal desk|photoshop|flash artwork/.test(blob) && !/machine learning|ai\b|tensorflow/.test(blob))
      boost -= 0.35;
  }
  if (intentHints.includes("product")) {
    if (key === "capability:product_thinking") boost += 0.45;
    if (/nexschool|nexcrm|myeg|linz|cadastrar|stakeholder/.test(blob)) boost += 0.15;
  }
  if (intentHints.includes("cloud")) {
    if (key === "credential:aws-sap") boost += 0.5;
    if (/\baws\b|solutions architect|credly|cloud/.test(blob)) boost += 0.2;
  }
  if (intentHints.includes("xr_collab")) {
    if (key === "capability:spatial_computing_xr" || key === "capability:collaboration") boost += 0.35;
    if (/mixed reality|telecollaboration|xr|collaborat/.test(blob)) boost += 0.1;
  }
  if (intentHints.includes("leadership")) {
    if (key === "credential:phd-computer-graphics" || key === "credential:siggraph-rtl-2023") boost += 0.35;
    if (key === "research:thesis" || key === "research:rtstage") boost += 0.3;
    if (/thesis|audience choice|siggraph|first author/.test(blob)) boost += 0.1;
  }
  if (intentHints.includes("stakeholder_enterprise")) {
    if (key === "capability:product_thinking") boost += 0.4;
    if (/cadastrar|linz|nexschool|nexcrm|myeg/.test(key)) boost += 0.2;
  }
  if (intentHints.includes("portfolio_overview")) {
    if (key === "capability:product_thinking" || key === "capability:research" || key === "capability:mobile_engineering" || key === "capability:spatial_computing_xr" || key === "capability:collaboration") {
      boost += 0.35;
    }
    if (hit.type === "research" && hit.record?.route) boost += 0.2;
  }
  if (intentHints.includes("highlights")) {
    if (/siggraph|audience choice|award|thesis|phd/.test(blob)) boost += 0.2;
  }
  return boost;
}
function assessConfidence({ query, evidence, hardUnsupported, topScore, lexicalHitCount }) {
  if (hardUnsupported.length) {
    return {
      confidence: "unsupported",
      reason: `Query asserts facts absent from KB (${hardUnsupported.join(", ")}).`
    };
  }
  if (!evidence.length) {
    return {
      confidence: "none",
      reason: "No sufficiently relevant portfolio evidence for this query."
    };
  }
  const hasDirect = evidence.some((e) => e.claimStrength === "direct") || evidence.some((e) => ["research", "project", "credential", "book"].includes(e.type) && e.role === "primary");
  const hasCapability = evidence.some((e) => e.type === "capability");
  const inferredOnly = hasCapability && evidence.filter((e) => e.type === "capability").every((e) => e.claimStrength === "reasonably_inferred") && !evidence.some((e) => ["research", "project", "credential", "book"].includes(e.type));
  if (topScore >= 0.55 && (hasDirect || hasCapability && evidence.length >= 2)) {
    return { confidence: "strong", reason: "High retrieval score with direct or multi-item grounded evidence." };
  }
  if (topScore >= 0.35 && evidence.length >= 2) {
    return {
      confidence: inferredOnly ? "moderate" : "strong",
      reason: inferredOnly ? "Evidence is primarily capability inference; treat claimStrength carefully." : "Solid multi-item evidence pack."
    };
  }
  if (lexicalHitCount > 0 || topScore >= 0.28) {
    return { confidence: "moderate", reason: "Partial lexical/semantic support; pack may be incomplete." };
  }
  if (evidence.length === 1 && topScore < 0.28) {
    return { confidence: "weak", reason: "Single low-scoring hit; answerability uncertain." };
  }
  return { confidence: "weak", reason: "Low retrieval support." };
}
function hitToCandidate(hit, role, budget, extra = {}) {
  const rec = hit.record;
  const maxPer = budget.maxCharsPerItem ?? 900;
  let snippet = snippetFromRecord(rec, maxPer);
  if (rec.type === "capability" && rec.extras?.notes) {
    snippet = [
      `Capability: ${rec.title}`,
      `Claim strength: ${rec.extras.claimStrength}`,
      rec.extras.notes,
      `Evidence IDs: ${(rec.extras.evidenceKeys || []).join(", ")}`
    ].join("\n");
    if (snippet.length > maxPer) snippet = `${snippet.slice(0, maxPer - 1).trim()}\u2026`;
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
    relationToQuery: extra.relationToQuery || (role === "expanded" ? "related_evidence" : "retrieved"),
    claimStrength: rec.extras?.claimStrength || (rec.type === "capability" ? null : "direct"),
    relatedRecordIds: (rec.related || []).filter((r) => r.confidence !== "uncertain").map((r) => `${r.type}:${r.id}`),
    expandedFrom: extra.expandedFrom || null,
    priority: role === "primary" ? 3 : role === "expanded" ? 2 : 1,
    reasons: hit.reasons || []
  };
}
async function buildEvidencePack(store, options = {}) {
  const query = String(options.query || "").trim();
  const config = {
    ...DEFAULT_RETRIEVAL_CONFIG,
    ...options.config,
    weights: { ...DEFAULT_HYBRID_WEIGHTS, ...options.config?.weights || {} },
    budget: { ...DEFAULT_EVIDENCE_BUDGET, ...options.config?.budget || {}, ...options.budget || {} },
    relevance: {
      ...DEFAULT_RELEVANCE,
      ...options.config?.relevance || {},
      ...options.relevance || {}
    }
  };
  const budget = config.budget;
  const relevance = config.relevance;
  const topK = options.topK ?? budget.topK ?? 8;
  const expandRelated = options.expandRelated ?? config.expandRelated ?? true;
  const mode = options.mode || config.mode || "hybrid";
  const t0 = Date.now();
  const intentHints = inferIntentHints(query);
  const retrievalQuery = expandRetrievalQuery(query, intentHints);
  const corpusBlob = store.list().map((r) => `${r.title}
${r.text}`).join("\n");
  const hardUnsupported = detectHardUnsupported(query, corpusBlob);
  if (hardUnsupported.length) {
    const conf2 = assessConfidence({
      query,
      evidence: [],
      hardUnsupported,
      topScore: 0,
      lexicalHitCount: 0
    });
    return {
      query,
      intentHints,
      evidence: [],
      routes: [],
      suggestedViews: [],
      confidence: conf2.confidence,
      confidenceReason: conf2.reason,
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
        discarded: ["hard_unsupported_claim"]
      }
    };
  }
  const { hits, latencyMs, mode: usedMode } = await store.searchAsync(retrievalQuery, {
    limit: Math.max(topK, 12),
    mode,
    expandRelated: false
  });
  let lexicalHitCount = 0;
  try {
    lexicalHitCount = store.search(retrievalQuery, { limit: 10 }).length;
  } catch {
    lexicalHitCount = hits.filter((h) => /lex=0\.[1-9]|lex=[1-9]/.test((h.reasons || []).join(" "))).length;
  }
  const floor = budget.minScoreFloor ?? 0.22;
  const scoredHits = hits.map((hit) => {
    const boost = applyIntentBoost(hit, intentHints);
    return {
      ...hit,
      score: Math.round((hit.score + boost) * 1e5) / 1e5,
      reasons: [...hit.reasons || [], ...boost ? [`intent_boost=${boost}`] : []],
      _intentBoost: boost
    };
  }).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const discarded = [];
  const primaries = [];
  for (const hit of scoredHits) {
    const signals = parseHybridSignals(hit);
    const semanticOnly = signals.lex === 0 || signals.lex === 0 && String(mode).startsWith("semantic");
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
      relevance
    });
    if (!sufficiency.ok) {
      discarded.push(`${hit.key}:${sufficiency.reason}`);
      continue;
    }
    primaries.push(
      hitToCandidate(
        {
          ...hit,
          reasons: [...hit.reasons || [], `relevance=${sufficiency.reason}`]
        },
        "primary",
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
              record: rec
            },
            "expanded",
            budget,
            {
              expandedFrom: primary.key,
              relationToQuery: `${rel.relation}_via_${primary.id}`
            }
          )
        );
        added += 1;
        if (added >= (budget.maxExpandedPerPrimary ?? 3)) break;
      }
    }
  }
  const priorityBoost = (c) => {
    let p = c.priority;
    if (c.type === "credential" || c.type === "research" || c.type === "project") p += 0.5;
    if (c.type === "capability" && c.claimStrength === "direct") p += 0.4;
    if (c.type === "capability" && c.claimStrength === "reasonably_inferred") p -= 0.1;
    if (c.type === "event" || c.type === "press") p -= 0.2;
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
    lexicalHitCount
  });
  const suggestedViews = items.filter((e) => e.route).slice(0, 5).map((e, i) => ({
    recordId: e.id,
    recordKey: e.key,
    route: e.route,
    reason: i === 0 ? "primary evidence" : e.role === "expanded" ? "related evidence" : "supporting evidence"
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
      expandedFrom: e.expandedFrom
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
      primaryCount: items.filter((e) => e.role === "primary").length,
      expandedCount: items.filter((e) => e.role === "expanded").length,
      totalChars,
      topScore,
      lexicalHitCount,
      discarded: discarded.slice(0, 24),
      retrievalQuery: retrievalQuery !== query ? retrievalQuery : void 0
    }
  };
}

// scripts/lib/kb-browser-hybrid.mjs
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
var BrowserHybridStore = class extends MemoryKbStore {
  constructor(options = {}) {
    super();
    this.mode = "hybrid";
    this.hybridWeights = options.weights || { ...DEFAULT_HYBRID_WEIGHTS };
    this._vectors = /* @__PURE__ */ new Map();
    if (options.vectors) {
      const entries = options.vectors instanceof Map ? options.vectors.entries() : Object.entries(options.vectors);
      for (const [k, v] of entries) this._vectors.set(k, v);
    }
    this.embedQuery = options.embedQuery;
    if (typeof this.embedQuery !== "function") {
      throw new Error("BrowserHybridStore requires embedQuery(query) => Promise<number[]>");
    }
  }
  async searchAsync(query, options = {}) {
    const mode = options.mode || this.mode;
    const limit = options.limit ?? 10;
    const t0 = Date.now();
    let hits;
    if (mode === "keyword" || mode === "keyword_token_v1") {
      hits = super.search(query, { ...options, expandRelated: false });
    } else {
      hits = await this._hybridSearch(query, limit);
    }
    if (options.expandRelated) {
      for (const hit of hits) {
        hit.related = this.getRelated(recordKey(hit.record), { limit: 5 });
      }
    }
    return { hits, latencyMs: Date.now() - t0, mode };
  }
  search(query, options = {}) {
    return MemoryKbStore.prototype.search.call(this, query, options);
  }
  async _hybridSearch(query, limit) {
    const w = this.hybridWeights;
    const lexicalHits = super.search(query, { limit: 50, expandRelated: false });
    const lexMax = Math.max(...lexicalHits.map((h) => h.score), 1e-9);
    const lexRawMap = new Map(lexicalHits.map((h) => [h.key, h.score]));
    const lexMap = new Map(lexicalHits.map((h) => [h.key, h.score / lexMax]));
    const qv = await this.embedQuery(query);
    const semanticHits = [];
    for (const [key, vector] of this._vectors) {
      const score = cosineSimilarity(qv, vector);
      if (score > 0) semanticHits.push({ key, score });
    }
    semanticHits.sort((a, b) => b.score - a.score);
    const topSem = semanticHits.slice(0, 50);
    const semRawMap = new Map(topSem.map((h) => [h.key, h.score]));
    const semMax = Math.max(...topSem.map((h) => h.score), 1e-9);
    const keys = /* @__PURE__ */ new Set([...lexMap.keys(), ...topSem.map((h) => h.key)]);
    const byKey = new Map(this.list().map((r) => [recordKey(r), r]));
    const qTokens = new Set(tokenize(query));
    const semMap = new Map(topSem.map((h) => [h.key, h.score / semMax]));
    const merged = [];
    for (const key of keys) {
      const rec = byKey.get(key);
      if (!rec) continue;
      const semRaw = semRawMap.get(key) || 0;
      const lexRaw = lexRawMap.get(key) || 0;
      const sem = semMap.get(key) || 0;
      const lex = lexMap.get(key) || 0;
      let exactBoost = 0;
      const idToks = tokenize(rec.id);
      const titleToks = tokenize(rec.title);
      if ([...qTokens].some((t) => idToks.includes(t) || titleToks.includes(t))) {
        exactBoost = w.exactBoost;
      }
      const score = w.semantic * sem + w.lexical * lex + exactBoost;
      if (score <= 0) continue;
      merged.push({
        key,
        score: Math.round(score * 1e5) / 1e5,
        reasons: [
          "hybrid",
          `sem=${sem.toFixed(3)}`,
          `lex=${lex.toFixed(3)}`,
          `semRaw=${semRaw.toFixed(4)}`,
          `lexRaw=${Number(lexRaw).toFixed(1)}`
        ],
        type: rec.type,
        id: rec.id,
        title: rec.title,
        route: rec.route ?? null,
        alsoRoutes: rec.alsoRoutes || [],
        contentHash: rec.contentHash,
        record: structuredClone(rec)
      });
    }
    merged.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });
    return merged.slice(0, limit);
  }
};
async function createMiniLmQueryEmbedder(options = {}) {
  const model = options.model || "Xenova/all-MiniLM-L6-v2";
  let pipe = null;
  const cdnUrl = options.cdnUrl || "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";
  async function ensure() {
    if (pipe) return pipe;
    const transformers = await import(
      /* webpackIgnore: true */
      cdnUrl
    );
    const { pipeline, env } = transformers;
    if (env) env.allowLocalModels = false;
    pipe = await pipeline("feature-extraction", model, { quantized: true });
    return pipe;
  }
  return {
    id: "minilm_local_v1",
    model,
    async embedQuery(query) {
      const extractor = await ensure();
      const out = await extractor(String(query || "").slice(0, 2e3), {
        pooling: "mean",
        normalize: true
      });
      return Array.from(out.data);
    },
    async warm() {
      await ensure();
      await this.embedQuery("warmup");
    }
  };
}

// scripts/lib/kb-browser-entry.mjs
async function createBrowserKbFromArtifact(artifact, options = {}) {
  if (!artifact?.records || !artifact?.vectors) {
    throw new Error("Invalid browser KB artifact");
  }
  const emb = await createMiniLmQueryEmbedder({
    cdnUrl: options.cdnUrl,
    model: artifact._meta?.model || "Xenova/all-MiniLM-L6-v2"
  });
  const vectors = {};
  for (const [k, v] of Object.entries(artifact.vectors)) {
    vectors[k] = Array.isArray(v) ? v : v.vector;
  }
  const store = new BrowserHybridStore({
    vectors,
    embedQuery: (q) => emb.embedQuery(q),
    weights: artifact._meta?.weights || DEFAULT_RETRIEVAL_CONFIG.weights
  });
  store.syncRecords(artifact.records);
  const config = {
    ...DEFAULT_RETRIEVAL_CONFIG,
    ...artifact._meta?.retrieval || {},
    id: "hybrid_minilm_keyword_v1",
    mode: "hybrid",
    embedder: "minilm"
  };
  return {
    records: artifact.records,
    store,
    config,
    embedder: emb,
    meta: artifact._meta,
    async warm() {
      await emb.warm();
    },
    async buildEvidencePack(query, opts = {}) {
      return buildEvidencePack(store, { query, config, ...opts });
    }
  };
}
export {
  DEFAULT_RETRIEVAL_CONFIG,
  createBrowserKbFromArtifact
};
