/**
 * Provider-neutral agent tools (TODO 10).
 *
 * Models request tools; frontend later decides animation/rendering.
 * Tools may only reference validated KB IDs/routes or fixed app actions.
 */

export const APP_ROUTES = Object.freeze({
  home: '/#/',
  about: '/#/',
  contact: '/#/contact',
  projects: '/#/project',
  research: '/#/research',
  updates: '/#/updates',
  apps: '/#/apps',
});

export const TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'openRoute',
    description: 'Navigate to a known application HashRouter path.',
    argsSchema: { route: 'string' },
  },
  {
    name: 'openRecord',
    description: 'Open a portfolio/research/app/press record by KB id (slug or type:id).',
    argsSchema: { id: 'string' },
  },
  {
    name: 'listEvidence',
    description: 'Ask the UI to present the current evidence list (IDs from the pack).',
    argsSchema: { evidenceIds: 'string[]' },
  },
  {
    name: 'showContact',
    description: 'Open the contact page.',
    argsSchema: {},
  },
  {
    name: 'showCV',
    description: 'Open the CV/resume view (deterministic app action).',
    argsSchema: {},
  },
  {
    name: 'closeView',
    description: 'Close an overlay/detail view and return to the prior page context.',
    argsSchema: {},
  },
]);

export function knownToolNames() {
  return TOOL_DEFINITIONS.map((t) => t.name);
}

/**
 * Resolve a record id/key against the evidence store / pack.
 * @returns {{ ok: true, key: string, id: string, type: string, route: string|null } | { ok: false, reason: string }}
 */
export function resolveRecordRef(idOrKey, ctx) {
  const raw = String(idOrKey || '').trim();
  if (!raw) return { ok: false, reason: 'empty_id' };

  const store = ctx.store;
  const packKeys = new Set((ctx.evidencePack?.evidence || []).map((e) => e.key));
  const allowedRoutes = new Set(
    (ctx.evidencePack?.evidence || []).map((e) => e.route).filter(Boolean)
  );

  // Prefer exact type:id
  let rec = store?.get?.(raw);
  let key = raw.includes(':') ? raw : null;
  if (rec) {
    key = `${rec.type}:${rec.id}`;
  }
  if (!rec && store) {
    // bare slug
    rec = store.get(raw);
    if (rec) key = `${rec.type}:${rec.id}`;
  }
  if (!rec && ctx.records) {
    const hit = ctx.records.find((r) => r.id === raw || `${r.type}:${r.id}` === raw);
    if (hit) {
      rec = hit;
      key = `${hit.type}:${hit.id}`;
    }
  }

  if (!rec || !key) return { ok: false, reason: 'unknown_record' };

  // For navigation tools, require the record to be in the current pack OR have a stable site route
  const inPack = packKeys.has(key);
  const route = rec.route || null;
  if (!inPack && !route) {
    return { ok: false, reason: 'record_not_in_pack_and_no_route' };
  }

  // Empty / unsupported packs must not open unrelated records
  if (
    (ctx.evidencePack?.confidence === 'unsupported' || ctx.evidencePack?.confidence === 'none') &&
    !inPack
  ) {
    return { ok: false, reason: 'unsupported_pack_blocks_unrelated_nav' };
  }

  return {
    ok: true,
    key,
    id: rec.id,
    type: rec.type,
    route,
    title: rec.title,
    inPack,
    allowedRoutes: [...allowedRoutes],
  };
}

export function isAllowedAppRoute(route) {
  const r = String(route || '');
  if (!r.startsWith('/#/')) return false;
  // Allow known app shells and /#/r|p|a/:slug
  if (Object.values(APP_ROUTES).includes(r)) return true;
  if (/^\/#\/(r|p|a)\/[a-z0-9_-]+$/i.test(r)) return true;
  if (r === '/#/updates' || r === '/#/research' || r === '/#/project' || r === '/#/apps') return true;
  if (r === '/#/contact' || r === '/#/' || r === '/#') return true;
  return false;
}

/**
 * Validate and normalize a tool call. Never invent URLs.
 */
export function validateToolCall(toolCall, ctx) {
  if (!toolCall || typeof toolCall !== 'object') {
    return { ok: false, reason: 'missing_tool_call' };
  }
  const name = String(toolCall.tool || toolCall.name || '').trim();
  const args = toolCall.args && typeof toolCall.args === 'object' ? { ...toolCall.args } : {};

  if (!knownToolNames().includes(name)) {
    return { ok: false, reason: 'unknown_tool', tool: name };
  }

  if (ctx.evidencePack?.confidence === 'unsupported' || ctx.evidencePack?.confidence === 'none') {
    // Only non-KB app actions allowed
    if (!['showContact', 'showCV', 'closeView'].includes(name)) {
      return { ok: false, reason: 'unsupported_blocks_kb_tools', tool: name };
    }
  }

  switch (name) {
    case 'openRoute': {
      const route = String(args.route || '');
      if (!isAllowedAppRoute(route)) {
        return { ok: false, reason: 'invalid_route', route };
      }
      // If route is a record detail, ensure it maps to a known record when store present
      const m = route.match(/^\/#\/(r|p|a)\/([a-z0-9_-]+)$/i);
      if (m && ctx.store) {
        const typeHint = m[1] === 'r' ? 'research' : 'project';
        const slug = m[2];
        const rec = ctx.store.get(`${typeHint}:${slug}`) || ctx.store.get(slug);
        if (!rec) return { ok: false, reason: 'route_record_missing', route };
        if (
          ctx.evidencePack?.confidence !== 'unsupported' &&
          ctx.evidencePack?.evidence?.length &&
          !ctx.evidencePack.evidence.some((e) => e.id === slug || e.key.endsWith(`:${slug}`))
        ) {
          // Allow if route matches pack evidence route
          const routeInPack = ctx.evidencePack.evidence.some((e) => e.route === route);
          if (!routeInPack) {
            return { ok: false, reason: 'route_not_supported_by_pack', route };
          }
        }
      }
      return { ok: true, tool: name, args: { route } };
    }
    case 'openRecord': {
      const resolved = resolveRecordRef(args.id, ctx);
      if (!resolved.ok) return { ok: false, reason: resolved.reason, id: args.id };
      if (!resolved.route && resolved.type !== 'capability' && resolved.type !== 'credential') {
        // capabilities may lack routes — still allow listEvidence-style open via id for UI
      }
      if (
        ctx.evidencePack?.evidence?.length &&
        !resolved.inPack &&
        ctx.evidencePack.confidence !== 'unsupported'
      ) {
        // Prefer pack-backed navigation; allow stable research/project routes anyway if in KB
        if (!['research', 'project', 'press'].includes(resolved.type)) {
          return { ok: false, reason: 'record_not_in_current_evidence', id: args.id };
        }
      }
      return {
        ok: true,
        tool: name,
        args: { id: resolved.id, key: resolved.key, route: resolved.route },
      };
    }
    case 'listEvidence': {
      const allowed = new Set((ctx.evidencePack?.evidence || []).map((e) => e.key));
      const ids = Array.isArray(args.evidenceIds) ? args.evidenceIds.map(String) : [...allowed];
      const normalized = ids
        .map((id) => {
          if (allowed.has(id)) return id;
          const hit = [...allowed].find((k) => k.endsWith(`:${id}`) || k === id);
          return hit || null;
        })
        .filter(Boolean);
      if (!normalized.length && allowed.size) {
        return { ok: true, tool: name, args: { evidenceIds: [...allowed].slice(0, 8) } };
      }
      if (!normalized.length) return { ok: false, reason: 'no_valid_evidence_ids' };
      return { ok: true, tool: name, args: { evidenceIds: normalized } };
    }
    case 'showContact':
      return { ok: true, tool: name, args: { route: APP_ROUTES.contact } };
    case 'showCV':
      return { ok: true, tool: name, args: { available: false } };
    case 'closeView':
      return { ok: true, tool: name, args: {} };
    default:
      return { ok: false, reason: 'unhandled_tool', tool: name };
  }
}

/**
 * Derive a safe tool suggestion from the answer + pack (local/deterministic).
 */
export function deriveToolFromAnswer({ query, evidencePack, answer }) {
  const q = String(query || '').toLowerCase();

  if (/\b(contact|email|reach|hire|get in touch)\b/.test(q)) {
    return { tool: 'showContact', args: {} };
  }
  if (/\b(cv|resume|curriculum vitae)\b/.test(q)) {
    return { tool: 'showCV', args: {} };
  }
  if (/\b(close|dismiss|go back)\b/.test(q)) {
    return { tool: 'closeView', args: {} };
  }

  if (evidencePack?.confidence === 'unsupported' || evidencePack?.confidence === 'none') {
    return null;
  }

  // Prefer suggestedAction / top evidence with a route
  const sa = answer?.suggestedAction;
  if (sa?.recordId) {
    return { tool: 'openRecord', args: { id: sa.recordId } };
  }
  if (sa?.route && isAllowedAppRoute(sa.route)) {
    return { tool: 'openRoute', args: { route: sa.route } };
  }

  const evidence = evidencePack?.evidence || [];
  const presentable = evidence.find(
    (e) =>
      ['research', 'project', 'app'].includes(e.type) &&
      e.route &&
      /^\/#\/(r|p|a)\//.test(String(e.route))
  );
  const wantsShow =
    /\b(show|open|see|look at|tell me about|navigate|best work|impressive|notable)\b/i.test(
      query
    );
  if (wantsShow && presentable) {
    return { tool: 'openRecord', args: { id: presentable.id } };
  }

  const primary = evidence.find((e) => e.route);
  if (primary && wantsShow) {
    return { tool: 'openRecord', args: { id: primary.id } };
  }

  if (/\b(evidence|sources|citations|list)\b/.test(q) && evidencePack?.evidence?.length) {
    return {
      tool: 'listEvidence',
      args: { evidenceIds: evidencePack.evidence.map((e) => e.key).slice(0, 8) },
    };
  }

  return null;
}
