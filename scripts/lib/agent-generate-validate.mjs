/**
 * Shared generate-request validation (frontend contract / local bridge).
 * Provider-agnostic — no cloud vendor assumptions.
 */

export const LIMITS = Object.freeze({
  maxBodyBytes: 48_000,
  maxQueryChars: 800,
  maxEvidenceItems: 10,
  maxSnippetChars: 1200,
  maxEvidenceTotalChars: 8_000,
  maxHistoryTurns: 8,
  maxHistoryCharsPerTurn: 600,
  maxFocusChars: 400,
});

const ALLOWED_EVIDENCE_FIELDS = new Set([
  'key',
  'id',
  'type',
  'title',
  'route',
  'claimStrength',
  'role',
  'score',
  'snippet',
]);

export function validateGenerateRequest(body, rawByteLength = 0) {
  if (rawByteLength > LIMITS.maxBodyBytes) {
    return { ok: false, status: 413, error: { code: 'payload_too_large', message: 'Request body too large' } };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: { code: 'invalid_body', message: 'JSON object required' } };
  }

  const forbidden = ['system', 'messages', 'prompt', 'provider', 'model', 'apiKey', 'temperature', 'maxTokens'];
  for (const key of forbidden) {
    if (key in body) {
      return {
        ok: false,
        status: 400,
        error: { code: 'forbidden_field', message: `Field "${key}" is not allowed` },
      };
    }
  }

  const query = String(body.query || '').trim();
  if (!query) {
    return { ok: false, status: 400, error: { code: 'missing_query', message: 'query is required' } };
  }
  if (query.length > LIMITS.maxQueryChars) {
    return { ok: false, status: 400, error: { code: 'query_too_long', message: 'query exceeds limit' } };
  }

  const pack = body.evidencePack;
  if (!pack || typeof pack !== 'object') {
    return { ok: false, status: 400, error: { code: 'missing_evidence', message: 'evidencePack is required' } };
  }

  const evidence = Array.isArray(pack.evidence) ? pack.evidence : [];
  if (evidence.length > LIMITS.maxEvidenceItems) {
    return { ok: false, status: 400, error: { code: 'too_much_evidence', message: 'Too many evidence items' } };
  }

  let totalChars = 0;
  const normalizedEvidence = [];
  for (const item of evidence) {
    if (!item || typeof item !== 'object') {
      return { ok: false, status: 400, error: { code: 'bad_evidence_item', message: 'Invalid evidence item' } };
    }
    for (const k of Object.keys(item)) {
      if (!ALLOWED_EVIDENCE_FIELDS.has(k)) {
        return {
          ok: false,
          status: 400,
          error: { code: 'bad_evidence_field', message: `Evidence field "${k}" not allowed` },
        };
      }
    }
    const snippet = String(item.snippet || '').slice(0, LIMITS.maxSnippetChars);
    totalChars += snippet.length + String(item.title || '').length;
    if (totalChars > LIMITS.maxEvidenceTotalChars) {
      return { ok: false, status: 400, error: { code: 'evidence_too_large', message: 'Evidence text exceeds limit' } };
    }
    normalizedEvidence.push({
      key: String(item.key || ''),
      id: String(item.id || ''),
      type: String(item.type || ''),
      title: String(item.title || '').slice(0, 300),
      route: item.route == null ? null : String(item.route).slice(0, 200),
      claimStrength: item.claimStrength == null ? null : String(item.claimStrength).slice(0, 64),
      role: item.role == null ? null : String(item.role).slice(0, 32),
      score: typeof item.score === 'number' ? item.score : 0,
      snippet,
    });
  }

  let conversationContext = body.conversationContext || null;
  if (conversationContext != null) {
    if (typeof conversationContext !== 'object') {
      return { ok: false, status: 400, error: { code: 'bad_context', message: 'Invalid conversationContext' } };
    }
    const history = Array.isArray(conversationContext.history)
      ? conversationContext.history.slice(-LIMITS.maxHistoryTurns).map((h) => ({
          role: h?.role === 'assistant' ? 'assistant' : 'user',
          content: String(h?.content || '').slice(0, LIMITS.maxHistoryCharsPerTurn),
        }))
      : [];
    conversationContext = {
      history,
      focus: conversationContext.focus
        ? {
            id: String(conversationContext.focus.id || '').slice(0, 120),
            key: String(conversationContext.focus.key || '').slice(0, 160),
            title: String(conversationContext.focus.title || '').slice(0, LIMITS.maxFocusChars),
            route: conversationContext.focus.route
              ? String(conversationContext.focus.route).slice(0, 200)
              : null,
          }
        : null,
      uiContext: conversationContext.uiContext
        ? {
            pathname: String(conversationContext.uiContext.pathname || '').slice(0, 200),
            viewType: String(conversationContext.uiContext.viewType || '').slice(0, 64),
            recordId: conversationContext.uiContext.recordId
              ? String(conversationContext.uiContext.recordId).slice(0, 120)
              : null,
          }
        : null,
      retrievalQuery: conversationContext.retrievalQuery
        ? String(conversationContext.retrievalQuery).slice(0, LIMITS.maxQueryChars)
        : null,
    };
  }

  return {
    ok: true,
    value: {
      query,
      evidencePack: {
        query: String(pack.query || query).slice(0, LIMITS.maxQueryChars),
        confidence: String(pack.confidence || 'weak').slice(0, 32),
        confidenceReason: String(pack.confidenceReason || '').slice(0, 400),
        intentHints: Array.isArray(pack.intentHints)
          ? pack.intentHints.map((h) => String(h).slice(0, 64)).slice(0, 12)
          : [],
        evidence: normalizedEvidence,
        suggestedViews: Array.isArray(pack.suggestedViews)
          ? pack.suggestedViews.slice(0, 5).map((v) => ({
              recordId: v?.recordId ? String(v.recordId).slice(0, 120) : null,
              recordKey: v?.recordKey ? String(v.recordKey).slice(0, 160) : null,
              route: v?.route ? String(v.route).slice(0, 200) : null,
              reason: v?.reason ? String(v.reason).slice(0, 200) : null,
            }))
          : [],
      },
      conversationContext,
    },
  };
}
