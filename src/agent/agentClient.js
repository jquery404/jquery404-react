/**
 * Frontend AgentClient — provider/runtime agnostic.
 * Talks only to a transport (local bridge today; HTTP/SSE backend later).
 *
 * Never import scripts/lib/* from React.
 */

import { createSplitAgentClient } from './splitAgentClient';

const DEFAULT_BASE = '/api/agent';

function resolveBaseUrl(override) {
  if (override) return override.replace(/\/$/, '');
  const fromEnv = process.env.REACT_APP_AGENT_API;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  return DEFAULT_BASE;
}

/**
 * Public generate gateway base (no secrets).
 * Dev default: CRA proxy /api/agent → local bridge.
 * Optional later: REACT_APP_AGENT_GENERATE_URL for a hosted generate service.
 */
export function resolveGenerateUrl() {
  const configured = process.env.REACT_APP_AGENT_GENERATE_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  return resolveBaseUrl();
}

export function resolveAgentMode() {
  const mode = String(process.env.REACT_APP_AGENT_MODE || '').toLowerCase();
  if (mode === 'legacy' || mode === 'bridge') return 'legacy';
  if (mode === 'split') return 'split';
  // Default: split architecture (browser retrieval + generate gateway)
  return 'split';
}

export function isAgentUiEnabled() {
  if (process.env.REACT_APP_AGENT_ENABLED === 'false') return false;
  if (process.env.REACT_APP_AGENT_ENABLED === 'true') return true;
  // Enable when a production generate URL is configured, or in development
  if (process.env.REACT_APP_AGENT_GENERATE_URL) return true;
  return process.env.NODE_ENV === 'development';
}

function parseSseChunk(buffer, onEvent) {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() || '';
  for (const part of parts) {
    const lines = part.split('\n');
    const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
    if (!dataLines.length) continue;
    try {
      onEvent(JSON.parse(dataLines.join('\n')));
    } catch {
      // ignore malformed chunk
    }
  }
  return rest;
}

export class HttpAgentClient {
  /**
   * @param {{ baseUrl?: string, timeoutMs?: number }} [options]
   */
  constructor(options = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.timeoutMs = options.timeoutMs || 120000;
    this._listeners = new Set();
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(event) {
    for (const fn of this._listeners) {
      try {
        fn(event);
      } catch {
        // listener errors must not break the client
      }
    }
  }

  async health() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: ctrl.signal });
      if (!res.ok) {
        return { ok: false, error: { message: `Health HTTP ${res.status}` } };
      }
      return await res.json();
    } catch (err) {
      return {
        ok: false,
        error: {
          message: err.name === 'AbortError' ? 'Health check timed out' : err.message,
          code: 'bridge_unavailable',
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * @param {{
   *   sessionId?: string,
   *   message: string,
   *   uiContext?: object,
   *   conversationHistory?: array,
   *   stream?: boolean,
   *   onEvent?: (ev: object) => void,
   * }} input
   */
  async sendMessage(input = {}) {
    const { message, sessionId, uiContext, conversationHistory, onEvent, stream = true } = input;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    const forward = (ev) => {
      if (typeof onEvent === 'function') onEvent(ev);
      this._emit(ev);
    };

    try {
      const res = await fetch(`${this.baseUrl}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: stream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message,
          uiContext,
          conversationHistory,
          stream,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        let errBody = null;
        try {
          errBody = await res.json();
        } catch {
          /* ignore */
        }
        const error = errBody?.error || {
          message: `Agent HTTP ${res.status}`,
          code: res.status === 502 ? 'bridge_unavailable' : 'http_error',
        };
        forward({ type: 'error', error });
        throw Object.assign(new Error(error.message), { code: error.code, error });
      }

      const contentType = res.headers.get('content-type') || '';
      if (stream && contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult = null;
        const onStreamEvent = (ev) => {
          if (ev.type === 'result') {
            finalResult = ev.result;
          } else {
            forward(ev);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = parseSseChunk(buffer, onStreamEvent);
        }
        if (buffer.trim()) {
          parseSseChunk(`${buffer}\n\n`, onStreamEvent);
        }
        if (!finalResult) {
          throw Object.assign(new Error('Agent stream ended without result'), {
            code: 'incomplete_stream',
          });
        }
        return finalResult;
      }

      const data = await res.json();
      if (!data.ok || !data.result) {
        const error = data.error || { message: 'Invalid agent response' };
        forward({ type: 'error', error });
        throw Object.assign(new Error(error.message), { code: error.code, error });
      }
      for (const ev of data.result.events || []) forward(ev);
      return data.result;
    } catch (err) {
      if (err.name === 'AbortError') {
        const error = { message: 'Agent request timed out', code: 'timeout' };
        forward({ type: 'error', error });
        throw Object.assign(new Error(error.message), { code: 'timeout', error });
      }
      if (err.code) throw err;
      const error = {
        message: err.message || 'Agent unavailable',
        code: 'bridge_unavailable',
      };
      forward({ type: 'error', error });
      throw Object.assign(new Error(error.message), { code: 'bridge_unavailable', error });
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Singleton used by AgentProvider — swap implementation for production later. */
let defaultClient = null;

export function getAgentClient() {
  if (!defaultClient) {
    if (resolveAgentMode() === 'split') {
      defaultClient = createSplitAgentClient({
        generateUrl: resolveGenerateUrl(),
        timeoutMs: Number(process.env.REACT_APP_AGENT_TIMEOUT_MS || 90000),
      });
    } else {
      defaultClient = new HttpAgentClient();
    }
  }
  return defaultClient;
}

export function setAgentClient(client) {
  defaultClient = client;
}

export default HttpAgentClient;
