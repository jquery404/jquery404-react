/**
 * Load browser KB artifact + MiniLM (lazy). Portfolio must render before model warm-up.
 *
 * Asset URLs must be origin-absolute (`/assets/...`). Relative paths like
 * `assets/kb/...` resolve against the document path and can hit CRA's
 * historyApiFallback (200 + index.html), which then fails as JSON.
 */
let artifactPromise = null;
let enginePromise = null;
let warmPromise = null;

export const kbLoadState = {
  artifact: 'idle', // idle | loading | ready | error
  model: 'idle', // idle | loading | ready | error
  error: null,
};

/** Root-absolute public asset URL (never path-relative). */
export function publicAssetUrl(assetPath) {
  const cleaned = String(assetPath || '').replace(/^\/+/, '');
  const rootPath = `/${cleaned}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(rootPath, window.location.origin).href;
  }
  // Ignore PUBLIC_URL for local asset resolution — it is not required for HashRouter + public/
  return rootPath;
}

export function getKbPublicUrl() {
  return publicAssetUrl('assets/kb/browser_kb_v1.json');
}

export function getRuntimePublicUrl() {
  return publicAssetUrl('assets/kb/runtime.mjs');
}

async function readJsonResponse(res, label) {
  const text = await res.text();
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new Error(`${label}: empty response`);
  }
  if (trimmed.startsWith('<') || /<!DOCTYPE/i.test(trimmed.slice(0, 64))) {
    throw new Error(
      `${label}: got HTML instead of JSON from ${res.url || '(unknown url)'}. ` +
        'Check the request URL is origin-absolute (/assets/...) and the local bridge/proxy is not required for this file.'
    );
  }
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`${label}: invalid JSON (${err.message})`);
  }
}

export async function prefetchKbArtifact() {
  if (artifactPromise) return artifactPromise;
  kbLoadState.artifact = 'loading';
  artifactPromise = (async () => {
    const url = getKbPublicUrl();
    // Avoid force-cache: a prior HTML fallback can poison the cache for this URL.
    const res = await fetch(url, {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Browser KB HTTP ${res.status} for ${url}`);
    const artifact = await readJsonResponse(res, 'Browser KB');
    if (!artifact?.records || !artifact?.vectors) {
      throw new Error('Browser KB artifact missing records/vectors');
    }
    kbLoadState.artifact = 'ready';
    return artifact;
  })().catch((err) => {
    artifactPromise = null;
    kbLoadState.artifact = 'error';
    kbLoadState.error = err.message;
    throw err;
  });
  return artifactPromise;
}

/**
 * Build engine; optionally skip MiniLM warm (first query will warm).
 */
export async function loadBrowserKbEngine(options = {}) {
  const warm = options.warm !== false;
  if (enginePromise) {
    const engine = await enginePromise;
    if (warm) await ensureModelWarm(engine);
    return engine;
  }

  enginePromise = (async () => {
    const artifact = await prefetchKbArtifact();
    const runtimeUrl = getRuntimePublicUrl();
    const mod = await import(/* webpackIgnore: true */ runtimeUrl);
    if (typeof mod.createBrowserKbFromArtifact !== 'function') {
      throw new Error('KB runtime missing createBrowserKbFromArtifact');
    }
    const engine = await mod.createBrowserKbFromArtifact(artifact, { skipWarm: true });
    return engine;
  })().catch((err) => {
    enginePromise = null;
    throw err;
  });

  const engine = await enginePromise;
  if (warm) await ensureModelWarm(engine);
  return engine;
}

export async function ensureModelWarm(engine) {
  if (kbLoadState.model === 'ready') return;
  if (warmPromise) return warmPromise;
  kbLoadState.model = 'loading';
  warmPromise = (async () => {
    if (engine?.warm) await engine.warm();
    else if (engine?.embedder?.warm) await engine.embedder.warm();
    kbLoadState.model = 'ready';
  })().catch((err) => {
    warmPromise = null;
    kbLoadState.model = 'error';
    kbLoadState.error = err.message;
    throw err;
  });
  return warmPromise;
}

/** Opportunistic background init — call after idle / panel open. */
export function scheduleKbWarm(delayMs = 2500) {
  if (typeof window === 'undefined') return () => {};
  const id = window.setTimeout(() => {
    loadBrowserKbEngine({ warm: true }).catch(() => {
      /* non-fatal until first question */
    });
  }, delayMs);
  return () => window.clearTimeout(id);
}
