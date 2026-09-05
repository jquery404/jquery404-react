/**
 * Retrieval bake-off metrics and report helpers.
 */

const RELEVANT_MIN = 1; // grade >= 1 counts as relevant for P/R/MRR

export function loadJudgments(doc) {
  return doc.queries || [];
}

export function gradesFor(querySpec) {
  return querySpec.relevant || {};
}

export function isRelevant(grades, key, minGrade = RELEVANT_MIN) {
  return (grades[key] || 0) >= minGrade;
}

/** Expand hit list with related evidence keys (deduped, preserves order). */
export function expandHitsWithRelated(hits, store, options = {}) {
  const limit = options.limit ?? 5;
  const seen = new Set();
  const out = [];

  const push = (hitLike) => {
    if (!hitLike?.key || seen.has(hitLike.key)) return;
    seen.add(hitLike.key);
    out.push(hitLike);
  };

  for (const hit of hits) {
    push(hit);
    const related = store.getRelated(hit.key, { limit: 8 });
    for (const rel of related) {
      if (!rel.found) continue;
      const rec = store.get(rel.key);
      if (!rec) continue;
      push({
        key: rel.key,
        score: (hit.score || 0) * 0.85,
        reasons: [`expanded_from:${hit.key}`, rel.relation],
        type: rec.type,
        id: rec.id,
        title: rec.title,
        route: rec.route ?? null,
        record: rec,
        expandedFrom: hit.key,
      });
    }
    if (out.length >= limit * 3) break;
  }
  return out.slice(0, limit);
}

export function precisionAtK(hits, grades, k) {
  const top = hits.slice(0, k);
  if (!top.length) return 0;
  const rel = top.filter((h) => isRelevant(grades, h.key)).length;
  return rel / k;
}

export function recallAtK(hits, grades, k) {
  const relevantKeys = Object.keys(grades).filter((key) => isRelevant(grades, key));
  if (!relevantKeys.length) return null;
  const top = new Set(hits.slice(0, k).map((h) => h.key));
  const hitRel = relevantKeys.filter((key) => top.has(key)).length;
  return hitRel / relevantKeys.length;
}

export function mrr(hits, grades) {
  for (let i = 0; i < hits.length; i += 1) {
    if (isRelevant(grades, hits[i].key)) return 1 / (i + 1);
  }
  return 0;
}

export function irrelevantRate(hits, grades, k = 5) {
  const top = hits.slice(0, k);
  if (!top.length) return 0;
  const irr = top.filter((h) => !isRelevant(grades, h.key)).length;
  return irr / top.length;
}

export function summarizeMethod(perQueryRows) {
  const n = perQueryRows.length || 1;
  const avg = (field) => perQueryRows.reduce((s, r) => s + (r[field] ?? 0), 0) / n;
  const zero = perQueryRows.filter((r) => r.hitCount === 0).length / n;
  return {
    queries: perQueryRows.length,
    precisionAt3: round4(avg('precisionAt3')),
    precisionAt5: round4(avg('precisionAt5')),
    recallAt5: round4(avg('recallAt5')),
    mrr: round4(avg('mrr')),
    zeroResultRate: round4(zero),
    irrelevantAt5Rate: round4(avg('irrelevantAt5')),
    avgLatencyMs: round4(avg('latencyMs')),
  };
}

function round4(x) {
  return Math.round((x || 0) * 10000) / 10000;
}

export function gradeLabel(n) {
  if (n >= 3) return 'highly relevant';
  if (n === 2) return 'relevant';
  if (n === 1) return 'supporting';
  return 'irrelevant';
}

export function renderBakeoffMarkdown(report) {
  const lines = [];
  lines.push('# KB semantic retrieval bake-off');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Corpus size: **${report.corpusSize}** normalized records (same TODO 6 KB).`);
  lines.push('');
  lines.push('## Methods');
  lines.push('');
  for (const m of report.methods) {
    lines.push(
      `- **${m.id}**: ${m.description} · dims=${m.dimensions ?? 'n/a'} · indexMs=${m.indexMs} · embedCostUsd≈${m.embedCostUsd} · queryCostUsd≈${m.queryCostUsd}`
    );
  }
  lines.push('');
  lines.push('### Hybrid weights (transparent, not over-tuned)');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(report.hybridWeights, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Aggregate metrics');
  lines.push('');
  lines.push('| method | expansion | P@3 | P@5 | R@5 | MRR | zero-result | irr@5 | avg latency ms |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const row of report.aggregates) {
    lines.push(
      `| ${row.method} | ${row.expansion} | ${row.precisionAt3} | ${row.precisionAt5} | ${row.recallAt5} | ${row.mrr} | ${row.zeroResultRate} | ${row.irrelevantAt5Rate} | ${row.avgLatencyMs} |`
    );
  }
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  for (const bullet of report.interpretation || []) lines.push(`- ${bullet}`);
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push(report.recommendation || '');
  lines.push('');
  lines.push('## Per-query results');
  lines.push('');

  for (const q of report.perQuery) {
    lines.push(`### ${q.queryId}: \`${q.query}\` (${q.kind})`);
    lines.push('');
    for (const run of q.runs) {
      lines.push(`#### ${run.method} · expansion=${run.expansion} · latency=${run.latencyMs}ms · P@5=${run.precisionAt5} · R@5=${run.recallAt5} · MRR=${run.mrr}`);
      lines.push('');
      if (!run.top.length) {
        lines.push('_No hits._');
      } else {
        lines.push('| rank | score | key | judged |');
        lines.push('|---:|---:|---|---|');
        run.top.forEach((h, i) => {
          lines.push(`| ${i + 1} | ${h.score} | ${h.key} | ${gradeLabel(h.grade)} |`);
        });
      }
      lines.push('');
    }
  }

  lines.push('## Known failure modes');
  lines.push('');
  for (const f of report.failureModes || []) lines.push(`- ${f}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function buildInterpretation(aggregates, methods) {
  const raw = aggregates.filter((a) => a.expansion === 'raw');
  const expanded = aggregates.filter((a) => a.expansion === 'related');
  const byMethod = Object.fromEntries(raw.map((a) => [a.method, a]));
  const keyword = byMethod.keyword_token_v1;
  const bullets = [];

  if (!keyword) return ['Insufficient aggregate data.'];

  const semanticMethods = raw.filter((a) => a.method !== 'keyword_token_v1' && !a.method.startsWith('hybrid'));
  const bestSem = [...semanticMethods].sort((a, b) => b.mrr - a.mrr || b.precisionAt5 - a.precisionAt5)[0];
  const hybrid = raw.find((a) => a.method.startsWith('hybrid'));

  if (bestSem) {
    const deltaMrr = round4(bestSem.mrr - keyword.mrr);
    const deltaP = round4(bestSem.precisionAt5 - keyword.precisionAt5);
    if (deltaMrr > 0.02 || deltaP > 0.02) {
      bullets.push(
        `Semantic retrieval (${bestSem.method}) materially improves over keyword on aggregate (ΔMRR=${deltaMrr}, ΔP@5=${deltaP}).`
      );
    } else if (deltaMrr < -0.02 || deltaP < -0.02) {
      bullets.push(
        `Semantic retrieval (${bestSem.method}) underperforms keyword on aggregate (ΔMRR=${deltaMrr}, ΔP@5=${deltaP}).`
      );
    } else {
      bullets.push(
        `Semantic vs keyword is roughly tied on aggregate metrics (ΔMRR=${deltaMrr}, ΔP@5=${deltaP}); gains are query-dependent.`
      );
    }
  }

  if (hybrid && keyword) {
    const beatsKeyword = hybrid.mrr >= keyword.mrr && hybrid.precisionAt5 >= keyword.precisionAt5;
    const beatsSem = bestSem ? hybrid.mrr >= bestSem.mrr - 0.01 : false;
    bullets.push(
      beatsKeyword
        ? `Hybrid improves or matches keyword (MRR ${hybrid.mrr} vs ${keyword.mrr}).`
        : `Hybrid does not clearly beat keyword on MRR (${hybrid.mrr} vs ${keyword.mrr}).`
    );
    if (bestSem) {
      bullets.push(
        beatsSem
          ? `Hybrid is competitive with best semantic (${bestSem.method}).`
          : `Best pure semantic (${bestSem.method}) still edges hybrid on MRR.`
      );
    }
  }

  const kwExp = expanded.find((a) => a.method === 'keyword_token_v1');
  if (kwExp && keyword) {
    bullets.push(
      `Relationship expansion changes keyword R@5 ${keyword.recallAt5} → ${kwExp.recallAt5} and P@5 ${keyword.precisionAt5} → ${kwExp.precisionAt5} (compare expansion only within the same method).`
    );
  }

  bullets.push(
    'Exact lexical queries (AWS, CadastrAR, SIGGRAPH) often remain strong for keyword; conceptual queries (product thinking, artificial intelligence, stakeholder) are where semantic/hybrid should help most.'
  );

  const cheapest = methods
    .filter((m) => m.id !== 'keyword_token_v1')
    .sort((a, b) => a.embedCostUsd - b.embedCostUsd || a.indexMs - b.indexMs)[0];
  if (cheapest && bestSem) {
    bullets.push(
      `Quality/cost/latency: prefer ${bestSem.method} for quality; ${cheapest.id} is cheapest to index (${cheapest.indexMs}ms, ~$${cheapest.embedCostUsd}).`
    );
  }

  return bullets;
}

export function pickRecommendation(aggregates, methods) {
  const raw = aggregates.filter((a) => a.expansion === 'raw');
  const related = aggregates.filter((a) => a.expansion === 'related');
  const hybrid = raw.find((a) => a.method.startsWith('hybrid'));
  const keyword = raw.find((a) => a.method === 'keyword_token_v1');
  const semantic = raw
    .filter((a) => a.method !== 'keyword_token_v1' && !a.method.startsWith('hybrid'))
    .sort((a, b) => b.mrr - a.mrr || b.precisionAt5 - a.precisionAt5)[0];

  const ranked = [...raw].sort((a, b) => b.mrr - a.mrr || b.precisionAt5 - a.precisionAt5);
  const winner = ranked[0];
  const bestRelated = [...related].sort((a, b) => b.precisionAt5 - a.precisionAt5 || b.recallAt5 - a.recallAt5)[0];

  let text = `Best raw MRR on this small portfolio benchmark: **${winner.method}** (MRR=${winner.mrr}, P@5=${winner.precisionAt5}, R@5=${winner.recallAt5}). `;
  if (bestRelated) {
    text += `With relationship expansion, best evidence quality is **${bestRelated.method}+related** (P@5=${bestRelated.precisionAt5}, R@5=${bestRelated.recallAt5}). `;
  }
  if (semantic && winner.method === semantic.method) {
    text += `Recommend **${semantic.method}** for conceptual/paraphrase queries (e.g. "artificial intelligence"), keep **keyword_token_v1** for exact IDs/slugs (AWS, CadastrAR), and enable **getRelated()** when capability records rank first. `;
  } else if (hybrid && winner.method === hybrid.method) {
    text +=
      'Recommend **hybrid retrieval** as the default experimental strategy: keyword for exact IDs/slugs and semantic for conceptual recruiter queries, with optional getRelated expansion. ';
  } else {
    text +=
      'Keyword remains competitive; adopt semantic where conceptual-query lift is confirmed, plus relationship expansion for capability→evidence. ';
  }
  text +=
    'Do **not** commit to a production vendor yet — backends here are local/free ($0); swap in a hosted embedder behind `embedDocuments`/`embedQuery` when needed. A future hybrid(minilm+keyword)+related is the natural next experiment before any chat UI.';
  return text;
}
