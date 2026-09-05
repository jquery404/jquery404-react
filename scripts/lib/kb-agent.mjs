/**
 * Provider-neutral agent runtime (TODO 10).
 *
 * user message → buildEvidencePack → generateGroundedAnswer → optional validated tool
 *
 * Events are normalized (no vendor stream names leak out).
 */

import { randomUUID } from 'node:crypto';
import { loadEnvFile } from './load-env.mjs';
import { buildEvidencePack, DEFAULT_RETRIEVAL_CONFIG } from './kb-evidence.mjs';
import {
  createModelAdapter,
  generateGroundedAnswer,
  emptyGroundedAnswer,
} from './kb-llm.mjs';
import {
  validateToolCall,
  deriveToolFromAnswer,
  TOOL_DEFINITIONS,
} from './kb-agent-tools.mjs';

loadEnvFile();

/**
 * Normalized agent events (provider-neutral).
 * Token-level streaming is deferred: adapters currently emit one `answer.delta`
 * with the full text; chunked deltas can plug in without changing event names.
 */
export const AGENT_EVENT_TYPES = Object.freeze([
  'session.started',
  'retrieval.started',
  'retrieval.completed',
  'answer.delta',
  'tool.requested',
  'answer.completed',
  'error',
]);

export function createEventEmitter() {
  const listeners = new Set();
  return {
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit(type, payload = {}) {
      if (!AGENT_EVENT_TYPES.includes(type)) {
        throw new Error(`Unknown agent event type: ${type}`);
      }
      const event = { type, ts: new Date().toISOString(), ...payload };
      for (const fn of listeners) fn(event);
      return event;
    },
  };
}

/**
 * Expand follow-ups using session focus (pronouns / "there" / "that").
 */
export function rewriteFollowUpQuery(message, session) {
  const text = String(message || '').trim();
  if (!text) return text;

  // App actions should not inherit prior project focus into retrieval
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

  const lower = text.toLowerCase();
  const needsFocus =
    /\b(there|that|this|it|those|them|his|he|why|how|when|where|connect|relate|related|technology|tech|phd)\b/i.test(
      text
    ) || /^(what|which|how|why|when|where)\b/i.test(lower);

  if (/\b(there|that project|that work|that research|it)\b/i.test(text) && focusLabel) {
    return `${text} ${focusSuffix}`;
  }
  if (/^(how does that compare|compare that|and his phd|his phd)\b/i.test(lower) && focusLabel) {
    return `${text} (comparing with ${focusLabel}${focusKey ? ` [${focusKey}]` : ''}; also consider PhD/thesis evidence)`;
  }
  if (needsFocus && text.split(/\s+/).length <= 16 && focusLabel) {
    return `${text} ${focusSuffix}`;
  }
  return text;
}

export function updateSessionFocus(session, evidencePack, toolCall) {
  const next = { ...session, history: [...(session.history || [])] };
  const evidence = evidencePack?.evidence || [];
  let focus = session.focus || null;

  if (toolCall?.tool === 'openRecord' && (toolCall.args?.key || toolCall.args?.id)) {
    const key = toolCall.args.key || toolCall.args.id;
    const hit = evidence.find((e) => e.key === key || e.id === toolCall.args.id) || {
      key,
      id: toolCall.args.id,
      title: toolCall.args.id,
      route: toolCall.args.route,
      type: null,
    };
    focus = {
      key: hit.key || key,
      id: hit.id || toolCall.args.id,
      title: hit.title || toolCall.args.id,
      route: hit.route || toolCall.args.route || null,
      type: hit.type || null,
    };
  } else if (evidencePack?.confidence !== 'unsupported' && evidencePack?.confidence !== 'none') {
    const primary =
      evidence.find((e) => e.role === 'primary' && e.route) ||
      evidence.find((e) => e.role === 'primary') ||
      evidence.find((e) => e.route) ||
      evidence[0];
    if (primary) {
      focus = {
        key: primary.key,
        id: primary.id,
        title: primary.title,
        route: primary.route,
        type: primary.type,
      };
    }
  }

  if (focus) next.focus = focus;
  return next;
}

export function serializeSession(session) {
  return JSON.parse(JSON.stringify(session));
}

export function createSession(seed = {}) {
  return {
    id: seed.id || randomUUID(),
    createdAt: seed.createdAt || new Date().toISOString(),
    history: seed.history || [],
    focus: seed.focus || null,
    uiContext: seed.uiContext || null,
    lastEvidenceKeys: seed.lastEvidenceKeys || [],
  };
}

function isFailoverWorthyError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    /timeout|timed out|rate.?limit|429|500|502|503|504|econnreset|enotfound|network|fetch failed|http 5|provider/i.test(
      msg
    )
  );
}

function createPrimaryAdapter() {
  const provider = process.env.AI_PROVIDER || 'local';
  const model = process.env.AI_MODEL || 'grounded_composer';
  try {
    return createModelAdapter(provider, model);
  } catch {
    return createModelAdapter('local', 'grounded_composer');
  }
}

function createFallbackAdapter() {
  const provider = process.env.AI_FALLBACK_PROVIDER;
  const model = process.env.AI_FALLBACK_MODEL || process.env.AI_MODEL;
  if (!provider) return null;
  try {
    return createModelAdapter(provider, model);
  } catch {
    return null;
  }
}

/**
 * Create an agent runtime bound to an evidence pipeline (store + config).
 */
export function createAgentRuntime(pipeline, options = {}) {
  const store = pipeline.store;
  const records = pipeline.records;
  const retrievalConfig = pipeline.config || DEFAULT_RETRIEVAL_CONFIG;
  const sessions = new Map();
  const primaryAdapter = options.adapter || createPrimaryAdapter();
  const fallbackAdapter = options.fallbackAdapter !== undefined
    ? options.fallbackAdapter
    : createFallbackAdapter();

  function getSession(sessionId) {
    if (sessionId && sessions.has(sessionId)) return sessions.get(sessionId);
    const session = createSession({ id: sessionId });
    sessions.set(session.id, session);
    return session;
  }

  /**
   * @param {{
   *   message: string,
   *   sessionId?: string,
   *   conversationHistory?: array,
   *   uiContext?: object,
   *   onEvent?: function,
   * }} input
   */
  async function handleMessage(input = {}) {
    const events = createEventEmitter();
    if (typeof input.onEvent === 'function') events.on(input.onEvent);

    const session = getSession(input.sessionId);
    if (input.uiContext) session.uiContext = input.uiContext;
    if (Array.isArray(input.conversationHistory) && input.conversationHistory.length) {
      // Allow callers to inject serializable history
      session.history = input.conversationHistory.map((h) => ({ ...h }));
    }

    events.emit('session.started', { sessionId: session.id });

    const userMessage = String(input.message || '').trim();
    if (!userMessage) {
      const err = { message: 'Empty message' };
      events.emit('error', { sessionId: session.id, error: err });
      return {
        sessionId: session.id,
        answer: '',
        evidenceIds: [],
        answerability: 'unsupported',
        inferenceUsed: false,
        toolCall: null,
        toolRejected: null,
        evidencePack: null,
        provider: primaryAdapter.provider,
        model: primaryAdapter.model,
        meta: { latencyMs: 0, costUsd: 0, failoverUsed: false },
        events: [],
        error: err,
        session: serializeSession(session),
      };
    }

    const retrievalQuery = rewriteFollowUpQuery(userMessage, session);
    const conversationContext = {
      history: (session.history || []).slice(-6),
      focus: session.focus,
      uiContext: session.uiContext,
      retrievalQuery,
    };

    const collected = [];
    const track = (type, payload) => {
      collected.push(events.emit(type, { sessionId: session.id, ...payload }));
    };

    const t0 = Date.now();

    // Deterministic app intents — no retrieval / LLM required
    const earlyTool = deriveToolFromAnswer({
      query: userMessage,
      evidencePack: { confidence: 'strong', evidence: [] },
      answer: { suggestedAction: null },
    });
    if (earlyTool && ['showContact', 'showCV', 'closeView'].includes(earlyTool.tool)) {
      const validated = validateToolCall(earlyTool, {
        store,
        records,
        evidencePack: { confidence: 'strong', evidence: [] },
      });
      const ack =
        earlyTool.tool === 'showContact'
          ? 'Opening Contact — email jquery404@gmail.com, or leave a message on the page. Chat stays open for follow-ups.'
          : earlyTool.tool === 'showCV'
            ? 'There is no downloadable CV in this portfolio. Key credentials are on the About page (PhD, AWS SAP, SIGGRAPH). Ask about specific work instead.'
            : 'Closing the current view.';
      const toolCall = validated.ok ? { tool: validated.tool, args: validated.args } : null;
      track('answer.delta', { text: ack });
      if (toolCall) track('tool.requested', { toolCall });
      const latencyMs = Date.now() - t0;
      track('answer.completed', {
        answerability: 'strong',
        evidenceIds: [],
        toolCall,
        meta: { latencyMs, costUsd: 0, failoverUsed: false, provider: 'local', model: 'app_intent' },
      });
      session.history.push({ role: 'user', content: userMessage, at: new Date().toISOString() });
      session.history.push({
        role: 'assistant',
        content: ack,
        evidenceIds: [],
        answerability: 'strong',
        toolCall,
        at: new Date().toISOString(),
      });
      sessions.set(session.id, session);
      return {
        sessionId: session.id,
        answer: ack,
        evidenceIds: [],
        answerability: 'strong',
        inferenceUsed: false,
        suggestedAction: null,
        toolCall,
        toolRejected: validated.ok ? null : { proposed: earlyTool, reason: validated.reason },
        evidencePack: {
          confidence: 'strong',
          confidenceReason: 'app_intent',
          evidence: [],
          routes: [],
          suggestedViews: [],
        },
        provider: 'local',
        model: 'app_intent',
        meta: {
          latencyMs,
          costUsd: 0,
          failoverUsed: false,
          retrievalQuery,
          provider: 'local',
          model: 'app_intent',
          skippedLlm: true,
        },
        events: collected,
        session: serializeSession(session),
      };
    }

    track('retrieval.started', { query: retrievalQuery });
    let evidencePack;
    try {
      evidencePack = await buildEvidencePack(store, {
        query: retrievalQuery,
        config: retrievalConfig,
      });
    } catch (err) {
      track('error', { stage: 'retrieval', error: { message: err.message } });
      throw err;
    }
    track('retrieval.completed', {
      confidence: evidencePack.confidence,
      evidenceCount: evidencePack.evidence.length,
      latencyMs: evidencePack.retrievalMeta?.latencyMs,
    });

    // Stream answer as a single delta for local; live adapters may later emit chunks
    let gen;
    let failoverUsed = false;
    let adapterUsed = primaryAdapter;
    try {
      gen = await generateGroundedAnswer(
        {
          query: userMessage,
          evidencePack,
          conversationContext,
        },
        primaryAdapter
      );
    } catch (err) {
      if (fallbackAdapter && isFailoverWorthyError(err)) {
        failoverUsed = true;
        adapterUsed = fallbackAdapter;
        track('error', {
          stage: 'answer_primary',
          error: { message: err.message },
          failover: true,
        });
        gen = await generateGroundedAnswer(
          {
            query: userMessage,
            evidencePack,
            conversationContext,
          },
          fallbackAdapter
        );
      } else {
        track('error', { stage: 'answer', error: { message: err.message } });
        throw err;
      }
    }

    const answerObj = gen.answer || emptyGroundedAnswer();
    // Emit normalized delta (full text for now — adapters can stream later)
    track('answer.delta', { text: answerObj.answer });

    // Tool selection: app intents first, then model suggestedAction, then derive; validate
    let proposed = deriveToolFromAnswer({
      query: userMessage,
      evidencePack,
      answer: answerObj,
    });

    const appIntent = proposed && ['showContact', 'showCV', 'closeView'].includes(proposed.tool);
    if (!appIntent) {
      if (answerObj.tool && answerObj.args) {
        proposed = { tool: answerObj.tool, args: answerObj.args };
      } else if (answerObj.suggestedAction) {
        proposed = answerObj.suggestedAction.route
          ? { tool: 'openRoute', args: { route: answerObj.suggestedAction.route } }
          : { tool: 'openRecord', args: { id: answerObj.suggestedAction.recordId } };
      }
    }

    // Re-derive if still empty
    if (!proposed) {
      proposed = deriveToolFromAnswer({
        query: userMessage,
        evidencePack,
        answer: answerObj,
      });
    }

    let toolCall = null;
    let toolRejected = null;
    if (proposed) {
      const validated = validateToolCall(proposed, {
        store,
        records,
        evidencePack,
      });
      if (validated.ok) {
        toolCall = { tool: validated.tool, args: validated.args };
        track('tool.requested', { toolCall });
      } else {
        toolRejected = { proposed, reason: validated.reason };
      }
    }

    const latencyMs = Date.now() - t0;
    const meta = {
      ...(gen.meta || {}),
      latencyMs,
      costUsd: gen.meta?.costUsd || 0,
      failoverUsed,
      retrievalQuery,
      provider: adapterUsed.provider,
      model: adapterUsed.model,
    };

    track('answer.completed', {
      answerability: answerObj.answerability,
      evidenceIds: answerObj.evidenceIds,
      toolCall,
      meta,
    });

    // Update session
    session.history.push({ role: 'user', content: userMessage, at: new Date().toISOString() });
    session.history.push({
      role: 'assistant',
      content: answerObj.answer,
      evidenceIds: answerObj.evidenceIds,
      answerability: answerObj.answerability,
      toolCall,
      at: new Date().toISOString(),
    });
    if (session.history.length > 24) {
      session.history = session.history.slice(-24);
    }
    session.lastEvidenceKeys = evidencePack.evidence.map((e) => e.key);
    Object.assign(session, updateSessionFocus(session, evidencePack, toolCall));
    sessions.set(session.id, session);

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
      provider: adapterUsed.provider,
      model: adapterUsed.model,
      meta,
      events: collected,
      session: serializeSession(session),
    };
  }

  return {
    primaryAdapter,
    fallbackAdapter,
    toolDefinitions: TOOL_DEFINITIONS,
    getSession,
    createSession: () => {
      const s = createSession();
      sessions.set(s.id, s);
      return serializeSession(s);
    },
    importSession(data) {
      const s = createSession(data);
      sessions.set(s.id, s);
      return serializeSession(s);
    },
    handleMessage,
    /** Async generator yielding normalized events then a final result event wrapper */
    async *streamMessage(input = {}) {
      const queue = [];
      let done = false;
      let result;
      let error;
      const onEvent = (ev) => queue.push(ev);
      const run = handleMessage({ ...input, onEvent })
        .then((r) => {
          result = r;
          done = true;
        })
        .catch((e) => {
          error = e;
          done = true;
        });

      while (!done || queue.length) {
        while (queue.length) yield queue.shift();
        if (!done) await new Promise((r) => setTimeout(r, 5));
      }
      await run;
      if (error) throw error;
      yield { type: 'answer.completed', final: true, result };
    },
  };
}
