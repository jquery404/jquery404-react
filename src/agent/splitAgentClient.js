import { validateToolCall, deriveToolFromAnswer } from './toolContract';
import { isRedundantNavigation } from './executeTool';
import {
  loadBrowserKbEngine,
  getKbPublicUrl,
  prefetchKbArtifact,
  kbLoadState,
  scheduleKbWarm,
} from './browserKbEngine';

const perfStats = {
  kbUrl: null,
  kbLoadMs: 0,
  modelInitMs: 0,
  firstQueryMs: null,
  warmQueryMs: null,
  recordCount: 0,
};

export function getBrowserKbPerfStats() {
  return { ...perfStats };
}

function rewriteFollowUpQuery(message, session) {
  const text = String(message || '').trim();
  if (!text) return text;
  if (/\b(contact|email|cv|resume|curriculum vitae|close|dismiss)\b/i.test(text)) {
    return text;
  }
  const focus = session?.focus;
  if (!focus?.title && !focus?.id) return text;
  const focusLabel = focus.title || focus.id;
  const focusKey = focus.key || null;
  const alreadyMentionsFocus =
    (focusLabel && text.toLowerCase().includes(String(focusLabel).toLowerCase())) ||
    (focusKey && text.includes(focusKey));
  if (alreadyMentionsFocus) return text;

  const focusSuffix = focusKey
    ? `(context: ${focusLabel} [${focusKey}])`
    : `(context: ${focusLabel})`;

  if (/\b(there|that project|that work|that research|it)\b/i.test(text) && focusLabel) {
    return `${text} ${focusSuffix}`;
  }
  const lower = text.toLowerCase();
  const needsFocus =
    /\b(there|that|this|it|those|them|his|he|why|how|when|where|connect|relate|related|technology|tech|phd)\b/i.test(
      text
    ) || /^(what|which|how|why|when|where)\b/i.test(lower);
  if (needsFocus && text.split(/\s+/).length <= 16 && focusLabel) {
    return `${text} ${focusSuffix}`;
  }
  return text;
}

export function applyUiContextFocus(session, uiContext) {
  if (!session || !uiContext?.recordId) return session?.focus || null;
  const type = uiContext.viewType;
  if (!['research', 'project', 'app'].includes(type)) return session.focus || null;
  const id = uiContext.recordId;
  const key = `${type}:${id}`;
  if (session.focus?.id === id) {
    session.focus = {
      ...session.focus,
      key: session.focus.key || key,
      type: session.focus.type || type,
      route: session.focus.route || uiContext.hashRoute || null,
      title: session.focus.title || id,
    };
    return session.focus;
  }
  session.focus = {
    key,
    id,
    title: id,
    route: uiContext.hashRoute || null,
    type,
  };
  return session.focus;
}

function updateFocus(session, evidencePack, toolCall) {
  const evidence = evidencePack?.evidence || [];
  if (toolCall?.tool === 'openRecord' && (toolCall.args?.key || toolCall.args?.id)) {
    const hit =
      evidence.find((e) => e.key === toolCall.args.key || e.id === toolCall.args.id) || {
        key: toolCall.args.key,
        id: toolCall.args.id,
        title: toolCall.args.id,
        route: toolCall.args.route,
      };
    return {
      key: hit.key,
      id: hit.id,
      title: hit.title,
      route: hit.route,
      type: hit.type,
    };
  }
  if (evidencePack?.confidence !== 'unsupported' && evidencePack?.confidence !== 'none') {
    const primary =
      evidence.find((e) => e.role === 'primary' && e.route) ||
      evidence.find((e) => e.role === 'primary') ||
      evidence.find((e) => e.route) ||
      evidence[0];
    if (primary) {
      return {
        key: primary.key,
        id: primary.id,
        title: primary.title,
        route: primary.route,
        type: primary.type,
      };
    }
  }
  return session.focus || null;
}

function packForGateway(evidencePack) {
  return {
    query: evidencePack.query,
    confidence: evidencePack.confidence,
    confidenceReason: evidencePack.confidenceReason,
    intentHints: evidencePack.intentHints || [],
    evidence: (evidencePack.evidence || []).map((e) => ({
      key: e.key,
      id: e.id,
      type: e.type,
      title: e.title,
      route: e.route,
      claimStrength: e.claimStrength,
      role: e.role,
      score: e.score,
      snippet: e.snippet,
    })),
    suggestedViews: evidencePack.suggestedViews || [],
  };
}

export function createSplitAgentClient(gateway) {
  const sessions = new Map();
  const listeners = new Set();
  const generateUrl = String(gateway.generateUrl || '').replace(/\/$/, '');

  function getSession(id) {
    if (id && sessions.has(id)) return sessions.get(id);
    const s = {
      id: id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}`),
      history: [],
      focus: null,
      uiContext: null,
    };
    sessions.set(s.id, s);
    return s;
  }

  function emit(fn, ev) {
    const event = { ts: new Date().toISOString(), ...ev };
    if (typeof fn === 'function') fn(event);
    for (const l of listeners) l(event);
  }

  return {
    mode: 'split',
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async health() {
      try {
        perfStats.kbUrl = getKbPublicUrl();
        await prefetchKbArtifact().catch(() => null);

        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        try {
          const res = await fetch(`${generateUrl}/health`, { signal: ctrl.signal });
          const body = await res.json().catch(() => ({}));
          return {
            ok: res.ok && body.ok !== false,
            mode: 'split',
            kb: { ...getBrowserKbPerfStats(), loadState: { ...kbLoadState } },
            gateway: body,
          };
        } finally {
          clearTimeout(t);
        }
      } catch (err) {
        return {
          ok: false,
          mode: 'split',
          error: { message: err.message, code: 'split_unavailable' },
          kb: { ...getBrowserKbPerfStats(), loadState: { ...kbLoadState } },
        };
      }
    },
    scheduleWarm(delayMs) {
      return scheduleKbWarm(delayMs);
    },
    async sendMessage(input = {}) {
      const onEvent = input.onEvent;
      const session = getSession(input.sessionId);
      if (input.uiContext) session.uiContext = input.uiContext;
      applyUiContextFocus(session, input.uiContext);

      const userMessage = String(input.message || '').trim();
      emit(onEvent, { type: 'session.started', sessionId: session.id });

      if (!userMessage) {
        const error = { message: 'Empty message' };
        emit(onEvent, { type: 'error', error });
        throw Object.assign(new Error(error.message), { code: 'bad_request', error });
      }

      const early = deriveToolFromAnswer({
        query: userMessage,
        evidencePack: { confidence: 'strong', evidence: [] },
        answer: {},
      });
      if (early && ['showContact', 'showCV', 'closeView'].includes(early.tool)) {
        const validated = validateToolCall(early, {
          evidencePack: { confidence: 'strong', evidence: [] },
          records: [],
        });
        const ack =
          early.tool === 'showContact'
            ? 'Opening Contact — email jquery404@gmail.com, or leave a message on the page. Chat stays open for follow-ups.'
            : early.tool === 'showCV'
              ? 'There is no downloadable CV in this portfolio. Key credentials are on the About page (PhD, AWS SAP, SIGGRAPH). Ask about specific projects or research instead.'
              : 'Closing the current view.';
        const toolCall = validated.ok ? { tool: validated.tool, args: validated.args } : null;
        emit(onEvent, { type: 'answer.delta', text: ack, sessionId: session.id });
        if (toolCall) emit(onEvent, { type: 'tool.requested', toolCall, sessionId: session.id });
        emit(onEvent, {
          type: 'answer.completed',
          answerability: 'strong',
          evidenceIds: [],
          toolCall,
          sessionId: session.id,
        });
        session.history.push({ role: 'user', content: userMessage });
        session.history.push({ role: 'assistant', content: ack, toolCall });
        return {
          sessionId: session.id,
          answer: ack,
          evidenceIds: [],
          answerability: 'strong',
          inferenceUsed: false,
          toolCall,
          toolRejected: validated.ok ? null : { proposed: early, reason: validated.reason },
          evidencePack: { confidence: 'strong', evidence: [], suggestedViews: [], routes: [] },
          provider: 'local',
          model: 'app_intent',
          meta: { latencyMs: 0, skippedLlm: true, retrievalLocal: true },
          session: { id: session.id, focus: session.focus, historyLength: session.history.length },
        };
      }

      const retrievalQuery = rewriteFollowUpQuery(userMessage, session);
      emit(onEvent, {
        type: 'retrieval.started',
        query: retrievalQuery,
        sessionId: session.id,
        initializing: kbLoadState.model !== 'ready',
      });

      const tKb = performance.now();
      let engine;
      try {
        engine = await loadBrowserKbEngine({ warm: true });
      } catch (err) {
        const error = {
          message:
            'Portfolio search could not start. You can still browse the site — try chat again shortly.',
          code: 'kb_error',
        };
        emit(onEvent, { type: 'error', error, sessionId: session.id });
        throw Object.assign(new Error(error.message), { code: 'kb_error', error });
      }
      const kbElapsed = Math.round(performance.now() - tKb);
      perfStats.kbLoadMs = kbElapsed;
      perfStats.recordCount = engine.records?.length || 0;
      if (kbLoadState.model === 'ready') {
        if (perfStats.modelInitMs == null || perfStats.modelInitMs === 0) {
          perfStats.modelInitMs = kbElapsed;
        }
      }

      const tRet = performance.now();
      const evidencePack = await engine.buildEvidencePack(retrievalQuery);
      const retrievalMs = Math.round(performance.now() - tRet);
      if (perfStats.firstQueryMs == null) perfStats.firstQueryMs = retrievalMs;
      else perfStats.warmQueryMs = retrievalMs;

      emit(onEvent, {
        type: 'retrieval.completed',
        confidence: evidencePack.confidence,
        evidenceCount: evidencePack.evidence.length,
        latencyMs: retrievalMs,
        sessionId: session.id,
      });

      const conversationContext = {
        history: (session.history || []).slice(-6).map((h) => ({
          role: h.role,
          content: String(h.content || '').slice(0, 500),
        })),
        focus: session.focus,
        uiContext: session.uiContext,
        retrievalQuery,
      };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), gateway.timeoutMs || 60000);

      let gen;
      try {
        const res = await fetch(`${generateUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            query: userMessage,
            evidencePack: packForGateway(evidencePack),
            conversationContext,
          }),
          signal: ctrl.signal,
        });
        const rawText = await res.text();
        const trimmed = rawText.replace(/^\uFEFF/, '').trim();
        if (!trimmed || trimmed.startsWith('<') || /<!DOCTYPE/i.test(trimmed.slice(0, 64))) {
          const error = {
            message:
              'Generate endpoint returned HTML instead of JSON. Is the local bridge running (npm run agent:bridge)?',
            code: 'bridge_unavailable',
          };
          emit(onEvent, { type: 'error', error, sessionId: session.id });
          throw Object.assign(new Error(error.message), { code: error.code, error });
        }
        let body = {};
        try {
          body = JSON.parse(trimmed);
        } catch (err) {
          const error = { message: `Invalid generate JSON: ${err.message}`, code: 'gateway_error' };
          emit(onEvent, { type: 'error', error, sessionId: session.id });
          throw Object.assign(new Error(error.message), { code: error.code, error });
        }
        if (!res.ok || body.ok === false) {
          const error = body.error || { message: `Generate HTTP ${res.status}`, code: 'gateway_error' };
          emit(onEvent, { type: 'error', error, sessionId: session.id });
          throw Object.assign(new Error(error.message), { code: error.code || 'gateway_error', error });
        }
        gen = body.result || body;
      } catch (err) {
        if (err.name === 'AbortError') {
          const error = { message: 'Generate timed out', code: 'timeout' };
          emit(onEvent, { type: 'error', error });
          throw Object.assign(new Error(error.message), { code: 'timeout', error });
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }

      const answerObj = {
        answer: gen.answer || '',
        evidenceIds: gen.evidenceIds || [],
        answerability: gen.answerability || evidencePack.confidence,
        inferenceUsed: !!gen.inferenceUsed,
        suggestedAction: gen.suggestedAction || null,
      };

      emit(onEvent, { type: 'answer.delta', text: answerObj.answer, sessionId: session.id });

      let proposed = deriveToolFromAnswer({
        query: userMessage,
        evidencePack,
        answer: answerObj,
      });
      if (
        answerObj.suggestedAction &&
        !(proposed && ['showContact', 'showCV', 'closeView'].includes(proposed.tool))
      ) {
        const sa = answerObj.suggestedAction;
        proposed = sa.tool
          ? { tool: sa.tool, args: sa.args || {} }
          : sa.route
            ? { tool: 'openRoute', args: { route: sa.route } }
            : sa.recordId
              ? { tool: 'openRecord', args: { id: sa.recordId } }
              : proposed;
      }

      let toolCall = null;
      let toolRejected = null;
      if (proposed) {
        const validated = validateToolCall(proposed, {
          evidencePack,
          records: engine.records,
          store: {
            get(id) {
              return engine.records.find((r) => r.id === id || `${r.type}:${r.id}` === id) || null;
            },
          },
        });
        if (validated.ok) {
          const next = { tool: validated.tool, args: validated.args };
          if (isRedundantNavigation(next, session.uiContext)) {
            toolCall = null;
          } else {
            toolCall = next;
            emit(onEvent, { type: 'tool.requested', toolCall, sessionId: session.id });
          }
        } else {
          toolRejected = { proposed, reason: validated.reason };
        }
      }

      emit(onEvent, {
        type: 'answer.completed',
        answerability: answerObj.answerability,
        evidenceIds: answerObj.evidenceIds,
        toolCall,
        sessionId: session.id,
        meta: gen.meta,
      });

      session.history.push({ role: 'user', content: userMessage });
      session.history.push({
        role: 'assistant',
        content: answerObj.answer,
        evidenceIds: answerObj.evidenceIds,
        toolCall,
      });
      if (session.history.length > 24) session.history = session.history.slice(-24);
      session.focus = updateFocus(session, evidencePack, toolCall);

      return {
        sessionId: session.id,
        answer: answerObj.answer,
        evidenceIds: answerObj.evidenceIds,
        answerability: answerObj.answerability,
        inferenceUsed: answerObj.inferenceUsed,
        suggestedAction: answerObj.suggestedAction,
        toolCall,
        toolRejected,
        evidencePack: {
          confidence: evidencePack.confidence,
          confidenceReason: evidencePack.confidenceReason,
          evidence: evidencePack.evidence,
          routes: evidencePack.routes,
          suggestedViews: evidencePack.suggestedViews,
        },
        provider: gen.meta?.provider || 'gateway',
        model: gen.meta?.model || 'unknown',
        meta: {
          ...(gen.meta || {}),
          retrievalLocal: true,
          retrievalMs,
          retrievalQuery,
          kb: getBrowserKbPerfStats(),
        },
        session: { id: session.id, focus: session.focus, historyLength: session.history.length },
      };
    },
  };
}
