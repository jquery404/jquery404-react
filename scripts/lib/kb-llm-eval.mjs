/**
 * Grounded-answer evaluation rubric + automatic violation checks (TODO 9).
 */

export function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function detectViolations({ query, evidencePack, answer, meta }) {
  const violations = [];
  const allowed = new Set((evidencePack?.evidence || []).map((e) => e.key));
  const packConf = evidencePack?.confidence || 'unsupported';

  if (meta && meta.schemaOk === false) {
    violations.push({ code: 'schema_failure', detail: 'Model output failed JSON/schema parse' });
  }

  if (!answer?.answer || !String(answer.answer).trim()) {
    violations.push({ code: 'empty_answer', detail: 'Missing answer text' });
  }

  const cited = answer?.evidenceIds || [];
  for (const id of cited) {
    if (!allowed.has(id)) {
      violations.push({ code: 'foreign_evidence_id', detail: id });
    }
  }

  const factualPositive =
    packConf !== 'unsupported' &&
    answer?.answerability !== 'unsupported' &&
    !/\b(does not|don't|do not|no evidence|cannot|can't|not support|portfolio does not)\b/i.test(
      answer?.answer || ''
    );

  if (factualPositive && cited.length === 0 && countWords(answer?.answer) > 12) {
    violations.push({ code: 'missing_evidence_ids', detail: 'Factual answer without evidenceIds' });
  }

  if (packConf === 'unsupported') {
    const assertsPositiveJob =
      /\b(worked at google|works at google|microsoft employee|built chatgpt|managed 100|knows rust|fluent in rust)\b/i.test(
        answer?.answer || ''
      );
    const rejects =
      answer?.answerability === 'unsupported' ||
      /\b(does not|don't|no evidence|not contain|cannot confirm|portfolio does not|no record)\b/i.test(
        answer?.answer || ''
      );
    if (assertsPositiveJob || !rejects) {
      violations.push({
        code: 'unsupported_overclaim',
        detail: 'Unsupported pack but answer asserts or fails to reject premise',
      });
    }
    if ((answer?.evidenceIds || []).length > 0) {
      violations.push({
        code: 'unsupported_with_citations',
        detail: 'Cited evidence on an unsupported question',
      });
    }
  }

  // Inference discipline: Product Manager title
  if (/\bproduct manager\b/i.test(query) && /\b(is|was|worked as|served as)\s+(a\s+)?product manager\b/i.test(answer?.answer || '')) {
    const hasDirectPm = (evidencePack?.evidence || []).some((e) =>
      /\bproduct manager\b/i.test(`${e.title} ${e.snippet}`)
    );
    if (!hasDirectPm) {
      violations.push({
        code: 'inference_title_overclaim',
        detail: 'Claimed formal Product Manager title without direct evidence',
      });
    }
  }

  // Length policy soft check
  const words = countWords(answer?.answer);
  if (words > 180) {
    violations.push({ code: 'too_verbose', detail: `${words} words` });
  }

  return violations;
}

/**
 * Score 0–1 dimensions. Deterministic heuristics + violation penalties.
 */
export function scoreGroundedResponse({ querySpec, evidencePack, answer, meta, violations }) {
  const vset = new Set((violations || []).map((v) => v.code));
  const packConf = evidencePack?.confidence || 'unsupported';
  const expect = querySpec.expect || {};

  // Grounding
  let grounding = 0.7;
  if (vset.has('foreign_evidence_id')) grounding -= 0.4;
  if (vset.has('missing_evidence_ids') && packConf !== 'unsupported') grounding -= 0.25;
  if (vset.has('schema_failure')) grounding -= 0.2;
  if ((answer?.evidenceIds || []).length > 0 && packConf !== 'unsupported') grounding += 0.15;
  grounding = clamp01(grounding);

  // Hallucination (1 = clean)
  let hallucinationScore = 1;
  if (vset.has('unsupported_overclaim')) hallucinationScore -= 0.7;
  if (vset.has('inference_title_overclaim')) hallucinationScore -= 0.5;
  if (vset.has('unsupported_with_citations')) hallucinationScore -= 0.2;
  hallucinationScore = clamp01(hallucinationScore);

  // Inference discipline
  let inference = 0.7;
  if (expect.inference === 'must_not_claim_pm_title') {
    inference = vset.has('inference_title_overclaim') ? 0.1 : 0.95;
  } else if (expect.inference === 'may_infer_capability') {
    inference = answer?.inferenceUsed ? 0.85 : 0.55;
  } else if (expect.inference === 'direct_only') {
    inference = answer?.inferenceUsed ? 0.45 : 0.9;
  }
  if (vset.has('inference_title_overclaim')) inference = Math.min(inference, 0.2);

  // Usefulness
  let usefulness = 0.5;
  const q = querySpec.query.toLowerCase();
  const a = (answer?.answer || '').toLowerCase();
  if (expect.kind === 'unsupported') {
    usefulness = hallucinationScore > 0.6 ? 0.9 : 0.2;
  } else if (expect.kind === 'direct_credential' && /aws|certif|credential|credly/.test(a)) {
    usefulness = 0.95;
  } else if (expect.kind === 'ai_synthesis' && /(tensorflow|picturesque|machine learning|3d object|ai)/i.test(a)) {
    usefulness = 0.9;
  } else if (expect.kind === 'product_inference' && /(product|nexschool|nexcrm|inferred|not.*(title|manager))/i.test(a)) {
    usefulness = 0.85;
  } else if (countWords(a) >= 20) {
    usefulness = 0.65;
  }
  if (!a) usefulness = 0;

  // Conciseness
  const words = countWords(answer?.answer);
  let conciseness = 0.8;
  if (words < 15 && expect.kind !== 'unsupported' && expect.kind !== 'direct_credential') conciseness = 0.45;
  if (words >= 40 && words <= 110) conciseness = 1;
  if (words > 150) conciseness = 0.4;
  if (vset.has('too_verbose')) conciseness = 0.3;

  // Evidence usage — prefer high-score / capability keys for conceptual queries
  let evidenceUsage = 0.5;
  const topKeys = (evidencePack?.evidence || []).slice(0, 3).map((e) => e.key);
  const cited = new Set(answer?.evidenceIds || []);
  const overlap = topKeys.filter((k) => cited.has(k)).length;
  if (packConf === 'unsupported') {
    evidenceUsage = cited.size === 0 ? 1 : 0.2;
  } else if (overlap >= 1) evidenceUsage = 0.75 + 0.1 * overlap;
  else if (cited.size > 0) evidenceUsage = 0.55;
  evidenceUsage = clamp01(evidenceUsage);

  // Unsupported handling
  let unsupportedHandling = 0.7;
  if (expect.kind === 'unsupported') {
    unsupportedHandling = vset.has('unsupported_overclaim') ? 0.1 : 0.95;
  } else {
    unsupportedHandling = answer?.answerability === 'unsupported' && packConf !== 'unsupported' ? 0.35 : 0.8;
  }

  const overall =
    grounding * 0.22 +
    hallucinationScore * 0.22 +
    inference * 0.14 +
    usefulness * 0.14 +
    evidenceUsage * 0.1 +
    unsupportedHandling * 0.1 +
    conciseness * 0.08;

  return {
    overall: round3(overall),
    grounding: round3(grounding),
    hallucinationResistance: round3(hallucinationScore),
    inferenceDiscipline: round3(inference),
    usefulness: round3(usefulness),
    conciseness: round3(conciseness),
    evidenceUsage: round3(evidenceUsage),
    unsupportedHandling: round3(unsupportedHandling),
    violationCount: violations.length,
  };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

export function aggregateModelScores(rows) {
  const n = rows.length || 1;
  const avg = (field) => rows.reduce((s, r) => s + (r.scores?.[field] || 0), 0) / n;
  const hallucRate = rows.filter((r) => (r.violations || []).some((v) => v.code.includes('overclaim'))).length / n;
  const schemaFails = rows.filter((r) => (r.violations || []).some((v) => v.code === 'schema_failure')).length;
  return {
    queries: rows.length,
    overall: round3(avg('overall')),
    grounding: round3(avg('grounding')),
    hallucinationResistance: round3(avg('hallucinationResistance')),
    hallucinationRate: round3(hallucRate),
    inferenceDiscipline: round3(avg('inferenceDiscipline')),
    usefulness: round3(avg('usefulness')),
    conciseness: round3(avg('conciseness')),
    evidenceUsage: round3(avg('evidenceUsage')),
    unsupportedHandling: round3(avg('unsupportedHandling')),
    avgLatencyMs: round3(rows.reduce((s, r) => s + (r.meta?.latencyMs || 0), 0) / n),
    avgCostUsd: round3(rows.reduce((s, r) => s + (r.meta?.costUsd || 0), 0) / n),
    avgInputTokens: round3(rows.reduce((s, r) => s + (r.meta?.inputTokens || 0), 0) / n),
    avgOutputTokens: round3(rows.reduce((s, r) => s + (r.meta?.outputTokens || 0), 0) / n),
    schemaFailureCount: schemaFails,
  };
}
