/**
 * Execute validated agent tools in the React app.
 * Only accepts normalized { tool, args } from the runtime — never invents URLs.
 */

/**
 * Convert HashRouter absolute hash paths like `/#/r/cadastrar` → `/r/cadastrar`.
 */
export function hashRouteToPath(route) {
  const raw = String(route || '').trim();
  if (!raw) return null;
  if (raw.startsWith('/#/')) return raw.slice(2) || '/';
  if (raw.startsWith('/#')) return raw.slice(2) || '/';
  if (raw.startsWith('/')) return raw;
  return null;
}

/**
 * Infer navigate path from openRecord args (route preferred).
 */
export function pathForOpenRecord(args = {}) {
  if (args.route) {
    const p = hashRouteToPath(args.route);
    if (p) return p;
  }
  const id = args.id;
  const key = args.key || '';
  const type = key.includes(':') ? key.split(':')[0] : null;
  if (!id) return null;
  if (type === 'research' || key.startsWith('research:')) return `/r/${id}`;
  if (type === 'project' || key.startsWith('project:')) return `/p/${id}`;
  if (type === 'app' || key.startsWith('app:')) return `/a/${id}`;
  return null;
}

/** True when openRecord/openRoute would navigate to the page already in uiContext. */
export function isRedundantNavigation(toolCall, uiContext) {
  if (!toolCall || !uiContext?.recordId) return false;
  const focusedId = String(uiContext.recordId);
  if (toolCall.tool === 'openRecord') {
    return String(toolCall.args?.id || '') === focusedId;
  }
  if (toolCall.tool === 'openRoute') {
    const path = hashRouteToPath(toolCall.args?.route);
    if (!path) return false;
    if (uiContext.pathname && path === uiContext.pathname) return true;
    return path === `/r/${focusedId}` || path === `/p/${focusedId}` || path === `/a/${focusedId}`;
  }
  return false;
}

/**
 * @returns {{ kind: string, path?: string|null, evidenceIds?: string[], note?: string } | null}
 */
export function planToolExecution(toolCall) {
  if (!toolCall?.tool) return null;
  const args = toolCall.args || {};

  switch (toolCall.tool) {
    case 'openRoute': {
      const path = hashRouteToPath(args.route);
      if (!path) return { kind: 'invalid', note: 'Missing or invalid route' };
      return { kind: 'navigate', path };
    }
    case 'openRecord': {
      const path = pathForOpenRecord(args);
      if (path) return { kind: 'navigate', path, recordId: args.id, key: args.key };
      return {
        kind: 'evidence',
        evidenceIds: args.key ? [args.key] : args.id ? [args.id] : [],
        note: 'Record has no page route — showing evidence reference only',
      };
    }
    case 'showContact':
      return { kind: 'navigate', path: hashRouteToPath(args.route) || '/contact' };
    case 'showCV':
      return {
        kind: 'cv_unavailable',
        note:
          'No downloadable CV is published in this portfolio. See About recognitions (PhD, AWS SAP, SIGGRAPH) or ask about specific work.',
      };
    case 'closeView':
      return { kind: 'close' };
    case 'listEvidence':
      return {
        kind: 'evidence',
        evidenceIds: Array.isArray(args.evidenceIds) ? args.evidenceIds : [],
      };
    default:
      return { kind: 'invalid', note: `Unknown tool: ${toolCall.tool}` };
  }
}

/**
 * @param {object} toolCall
 * @param {{ navigate: Function, goBack?: Function, onEvidence?: Function, onNote?: Function }} handlers
 */
export function executeAgentTool(toolCall, handlers = {}) {
  const plan = planToolExecution(toolCall);
  if (!plan) return { ok: false, reason: 'missing_tool' };

  if (plan.kind === 'invalid') {
    return { ok: false, reason: plan.note || 'invalid' };
  }

  if (plan.kind === 'navigate' && plan.path && typeof handlers.navigate === 'function') {
    handlers.navigate(plan.path);
    if (plan.note && typeof handlers.onNote === 'function') handlers.onNote(plan.note);
    return { ok: true, plan };
  }

  if (plan.kind === 'cv_unavailable') {
    if (typeof handlers.onNote === 'function') handlers.onNote(plan.note);
    return { ok: true, plan };
  }

  if (plan.kind === 'close') {
    if (typeof handlers.goBack === 'function') handlers.goBack();
    else if (typeof handlers.navigate === 'function') handlers.navigate('/');
    return { ok: true, plan };
  }

  if (plan.kind === 'evidence') {
    if (typeof handlers.onEvidence === 'function') {
      handlers.onEvidence(plan.evidenceIds || []);
    }
    if (plan.note && typeof handlers.onNote === 'function') handlers.onNote(plan.note);
    return { ok: true, plan };
  }

  return { ok: false, reason: 'unhandled_plan' };
}

export default executeAgentTool;
