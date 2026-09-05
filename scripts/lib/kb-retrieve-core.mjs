/**
 * Browser-safe KB retrieval core (no Node fs/path).
 * Used by Node retrieval and browser hybrid runtime.
 */

export function recordKey(recordOrType, maybeId) {
  if (typeof recordOrType === 'object' && recordOrType) {
    return `${recordOrType.type}:${recordOrType.id}`;
  }
  if (maybeId !== undefined) return `${recordOrType}:${maybeId}`;
  // Already a compound key, or bare id
  return String(recordOrType);
}

export function tokenize(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
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
  if (Array.isArray(value)) return tokenize(value.join(' '));
  return tokenize(value);
}

/**
 * Score one record against a query. Deterministic given same inputs.
 */
export function scoreRecord(record, query, options = {}) {
  const qRaw = String(query || '').trim();
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
    phraseText: options.phraseText ?? 8,
  };

  let score = 0;
  const reasons = [];

  const idLower = String(record.id || '').toLowerCase();
  const idTokens = tokenize(record.id);
  const typeId = `${record.type}:${record.id}`.toLowerCase();
  if (idLower === qLower || typeId === qLower || idLower === qTokens.join('-') || idTokens.join('') === qTokens.join('')) {
    score += weights.idExact;
    reasons.push('id_exact');
  } else if (
    qTokens.some(
      (t) =>
        idLower === t ||
        idTokens.includes(t) ||
        // Substring id match only for longer tokens (avoid "ai" ⊂ "brain")
        (t.length >= 3 && idLower.includes(t))
    )
  ) {
    score += weights.idPartial;
    reasons.push('id_partial');
  }

  const titleTokens = fieldTokens(record.title);
  const tagTokens = fieldTokens(record.tags || []);
  const textTokens = fieldTokens(record.text);

  if (qLower.length >= 3 && String(record.title || '').toLowerCase().includes(qLower)) {
    score += weights.phraseTitle;
    reasons.push('phrase_title');
  } else if (qLower.length >= 3 && String(record.text || '').toLowerCase().includes(qLower)) {
    score += weights.phraseText;
    reasons.push('phrase_text');
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

  // Round to avoid float noise in deterministic ordering
  score = Math.round(score * 1000) / 1000;
  return { score, reasons: [...new Set(reasons)].sort() };
}

/**
 * In-memory KB store implementing the retrieval contract.
 */
export class MemoryKbStore {
  constructor() {
    /** @type {Map<string, object>} */
    this._records = new Map();
    this.backend = 'memory';
  }

  upsert(record) {
    if (!record?.type || !record?.id) {
      throw new Error('upsert requires record.type and record.id');
    }
    const key = recordKey(record);
    const prev = this._records.get(key);
    const action =
      !prev ? 'inserted' : prev.contentHash !== record.contentHash ? 'updated' : 'noop';
    if (action !== 'noop') {
      this._records.set(key, structuredClone(record));
    }
    return { key, action };
  }

  remove(id) {
    const key = this._resolveKey(id);
    if (!key) return { key: id, action: 'missing' };
    this._records.delete(key);
    return { key, action: 'deleted' };
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
    return [...this._records.values()]
      .map((r) => structuredClone(r))
      .sort((a, b) => {
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
        record: structuredClone(rec),
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
      if (!includeUncertain && rel.confidence === 'uncertain') continue;
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
        route: target?.route ?? null,
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
      noopUpserts: 0,
    };

    for (const key of changeSet.unchanged || []) {
      stats.skippedUnchanged += 1;
    }

    for (const key of [...(changeSet.added || []), ...(changeSet.changed || [])]) {
      const rec = lookup.get(key);
      if (!rec) {
        stats.missingForUpsert += 1;
        continue;
      }
      const { action } = this.upsert(rec);
      if (action === 'inserted') stats.inserted += 1;
      else if (action === 'updated') stats.updated += 1;
      else stats.noopUpserts += 1;
    }

    for (const key of changeSet.removed || []) {
      const { action } = this.remove(key);
      if (action === 'deleted') stats.deleted += 1;
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
    // Bare id: unique match only
    const matches = [...this._records.keys()].filter((k) => k.endsWith(`:${raw}`) || k === raw);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      // Prefer exact type:id if caller passed type:id already handled; else null for ambiguity
      return null;
    }
    return null;
  }
}

function toLookup(nextRecords) {
  if (nextRecords instanceof Map) return nextRecords;
  const map = new Map();
  if (Array.isArray(nextRecords)) {
    for (const rec of nextRecords) map.set(recordKey(rec), rec);
  } else if (nextRecords && typeof nextRecords === 'object') {
    for (const [k, v] of Object.entries(nextRecords)) map.set(k, v);
  }
  return map;
}

/** Same semantics as kb-normalize.diffSnapshots — kept local to avoid Node fs imports. */
export function diffRecordSnapshots(previousRecords = [], nextRecords = []) {
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
    removed: removed.sort(),
  };
}
