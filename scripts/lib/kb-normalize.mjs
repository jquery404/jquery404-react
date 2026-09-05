import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');

const RESEARCH_PATH = 'public/assets/research.json';
const PORTFOLIO_PATH = 'public/assets/portfolio.json';
const APPS_PATH = 'public/assets/apps.json';
const CREDENTIALS_PATH = 'public/assets/credentials.json';
const CAPABILITIES_PATH = 'public/assets/capabilities.json';
const EVENTS_PATH = 'src/components/Events.js';
const PRESS_GLOB_ROOT = 'public/archive/press';

const RECORD_TYPE_PREFIXES = [
  'list_research',
  'credential',
  'capability',
  'research',
  'project',
  'press',
  'event',
  'book',
];

/** Parse `type:id` evidence keys where id may itself contain colons. */
export function parseRecordKey(key) {
  const raw = String(key || '');
  for (const type of RECORD_TYPE_PREFIXES) {
    const prefix = `${type}:`;
    if (raw.startsWith(prefix)) {
      return { type, id: raw.slice(prefix.length) };
    }
  }
  return null;
}

/** Stable stringify for deterministic hashing (sorted keys). */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function contentHash(recordWithoutHash) {
  return crypto.createHash('sha256').update(stableStringify(recordWithoutHash)).digest('hex').slice(0, 16);
}

export function stripHtml(input) {
  return String(input || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].sort();
  }
  return [
    ...new Set(
      String(value || '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    ),
  ].sort();
}

export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function extractResearchSlugFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/\/(?:#\/)?r\/([a-z0-9_-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function readJson(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Malformed JSON at ${absPath}: ${err.message}`);
  }
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function finalizeRecord(record) {
  const { contentHash: _ignored, ...rest } = record;
  const hash = contentHash(rest);
  return { ...rest, contentHash: hash };
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.id.localeCompare(b.id);
  });
}

export function parseEventsFromSource(sourceText) {
  const events = [];
  const blockRe =
    /\{\s*thumb:\s*('[^']*'|"[^"]*")\s*,\s*date:\s*("[^"]*"|'[^']*')\s*,\s*title:\s*("[^"]*"|'[^']*')\s*,\s*place:\s*("[^"]*"|'[^']*')\s*,\s*role:\s*('[^']*'|"[^"]*")\s*,(?:\s*award:\s*('[^']*'|"[^"]*")\s*,)?\s*url:\s*('[^']*'|"[^"]*")/g;

  let match;
  while ((match = blockRe.exec(sourceText)) !== null) {
    const unquote = (s) => s.slice(1, -1);
    events.push({
      date: unquote(match[2]),
      title: unquote(match[3]),
      place: unquote(match[4]),
      role: unquote(match[5]),
      award: match[6] ? unquote(match[6]) : undefined,
      url: unquote(match[7]),
    });
  }
  return events;
}

function buildResearchText(detail) {
  const parts = [];
  const fieldsUsed = [];
  if (detail.title) {
    parts.push(`Title: ${stripHtml(detail.title)}`);
    fieldsUsed.push('title');
  }
  if (detail.journal) {
    parts.push(`Venue: ${stripHtml(detail.journal)}`);
    fieldsUsed.push('journal');
  }
  if (detail.award) {
    parts.push(`Award: ${stripHtml(detail.award)}`);
    fieldsUsed.push('award');
  }
  if (Array.isArray(detail.authors) && detail.authors.length) {
    parts.push(`Authors: ${detail.authors.map((a) => stripHtml(a.name)).filter(Boolean).join(', ')}`);
    fieldsUsed.push('authors');
  }
  if (detail.tags) {
    parts.push(`Tags: ${detail.tags}`);
    fieldsUsed.push('tags');
  }
  if (detail.desc) {
    parts.push(stripHtml(detail.desc));
    fieldsUsed.push('desc');
  }
  const articles = detail.articles?.list || [];
  if (articles.length) {
    parts.push(`Press coverage: ${articles.map((a) => stripHtml(a.header)).filter(Boolean).join('; ')}`);
    fieldsUsed.push('articles');
  }
  return { text: parts.filter(Boolean).join('\n'), fieldsUsed };
}

function buildPortfolioText(item, app) {
  const parts = [];
  const fieldsUsed = ['title', 'tags', 'desc'];
  parts.push(`Title: ${stripHtml(item.title)}`);
  if (app?.tagline) {
    parts.push(`Tagline: ${stripHtml(app.tagline)}`);
    fieldsUsed.push('tagline');
  }
  if (app?.category) {
    parts.push(`Category: ${stripHtml(app.category)}`);
    fieldsUsed.push('category');
  }
  if (Array.isArray(app?.platform) && app.platform.length) {
    parts.push(`Platforms: ${app.platform.join(', ')}`);
    fieldsUsed.push('platform');
  }
  const tagParts = [item.tags, app?.tags].filter(Boolean).join('; ');
  if (tagParts) parts.push(`Tags: ${tagParts}`);
  if (item.desc) parts.push(stripHtml(item.desc));
  if (app?.desc) {
    const appDesc = stripHtml(app.desc);
    const portDesc = stripHtml(item.desc || '');
    if (appDesc && !portDesc.includes(appDesc) && appDesc !== portDesc) {
      // Attach only if it adds material (not exact duplicate / not already contained)
      const novel = appDesc.length > 40 && !portDesc.includes(appDesc.slice(0, Math.min(60, appDesc.length)));
      if (novel) {
        parts.push(appDesc);
        fieldsUsed.push('apps.desc');
      }
    }
  }
  if (item.url) {
    parts.push(`Project link: ${item.url}`);
    fieldsUsed.push('url');
  }
  return { text: parts.filter(Boolean).join('\n'), fieldsUsed };
}

/**
 * Core normalizer. `data` may be injected for fixtures.
 */
export function normalizeKnowledgeBase(data, options = {}) {
  const warnings = [];
  const errors = [];
  const unresolved = [];
  const stats = {
    canonical: {
      researchDetails: 0,
      portfolio: 0,
      apps: 0,
      press: 0,
      events: 0,
      listResearchCandidates: 0,
      books: 0,
      credentials: 0,
      capabilities: 0,
    },
    generated: {},
    duplicatesMerged: 0,
    listPubsSkippedAsDetailDupes: 0,
  };

  const researchJson = data.researchJson;
  const portfolioJson = data.portfolioJson;
  const appsJson = data.appsJson;
  const pressMetas = data.pressMetas || [];
  const events = data.events || [];
  const credentialsJson = data.credentialsJson || { credentials: [] };
  const capabilitiesJson = data.capabilitiesJson || { capabilities: [] };

  assert(researchJson && typeof researchJson === 'object', 'research.json missing or invalid root', errors);
  assert(portfolioJson && typeof portfolioJson === 'object', 'portfolio.json missing or invalid root', errors);
  assert(appsJson && typeof appsJson === 'object', 'apps.json missing or invalid root', errors);
  if (errors.length) {
    const err = new Error(errors.join('\n'));
    err.validationErrors = errors;
    throw err;
  }

  const researchDetails = Array.isArray(researchJson.research) ? researchJson.research : null;
  const researchGroups = Array.isArray(researchJson.project) ? researchJson.project : null;
  const portfolio = Array.isArray(portfolioJson.portfolio) ? portfolioJson.portfolio : null;
  const apps = Array.isArray(appsJson.apps) ? appsJson.apps : null;

  assert(researchDetails, 'research.json must contain research[] array', errors);
  assert(researchGroups, 'research.json must contain project[] array', errors);
  assert(portfolio, 'portfolio.json must contain portfolio[] array', errors);
  assert(apps, 'apps.json must contain apps[] array', errors);
  if (errors.length) {
    const err = new Error(errors.join('\n'));
    err.validationErrors = errors;
    throw err;
  }

  const detailBySlug = new Map();
  for (const [i, detail] of researchDetails.entries()) {
    if (!detail || typeof detail !== 'object') {
      errors.push(`research[${i}] is not an object`);
      continue;
    }
    if (!detail.slug || !detail.title) {
      errors.push(`research[${i}] missing required slug/title`);
      continue;
    }
    const slug = String(detail.slug);
    if (detailBySlug.has(slug)) {
      errors.push(`Duplicate research slug: ${slug}`);
      continue;
    }
    detailBySlug.set(slug, detail);
  }

  const portfolioBySlug = new Map();
  for (const [i, item] of portfolio.entries()) {
    if (!item || typeof item !== 'object') {
      errors.push(`portfolio[${i}] is not an object`);
      continue;
    }
    if (!item.slug || !item.title) {
      errors.push(`portfolio[${i}] missing required slug/title`);
      continue;
    }
    if (portfolioBySlug.has(item.slug)) {
      errors.push(`Duplicate portfolio slug: ${item.slug}`);
      continue;
    }
    portfolioBySlug.set(item.slug, item);
  }

  const appsBySlug = new Map();
  for (const [i, app] of apps.entries()) {
    if (!app || typeof app !== 'object') {
      errors.push(`apps[${i}] is not an object`);
      continue;
    }
    if (!app.slug || !app.title) {
      errors.push(`apps[${i}] missing required slug/title`);
      continue;
    }
    if (appsBySlug.has(app.slug)) {
      errors.push(`Duplicate apps slug: ${app.slug}`);
      continue;
    }
    appsBySlug.set(app.slug, app);
  }

  if (errors.length) {
    const err = new Error(errors.join('\n'));
    err.validationErrors = errors;
    throw err;
  }

  stats.canonical.researchDetails = detailBySlug.size;
  stats.canonical.portfolio = portfolioBySlug.size;
  stats.canonical.apps = appsBySlug.size;
  stats.canonical.press = pressMetas.length;
  stats.canonical.events = events.length;

  const records = [];
  const researchIds = new Set(detailBySlug.keys());

  // --- Research details ---
  for (const [slug, detail] of detailBySlug) {
    const { text, fieldsUsed } = buildResearchText(detail);
    const related = [];

    // Press relationships attached later from press side; also from articles archives
    const articles = detail.articles?.list || [];
    for (const art of articles) {
      const archive = art.archive || '';
      const m = archive.match(/\/archive\/press\/([^/]+)\//);
      if (m) {
        related.push({
          type: 'press',
          id: m[1],
          relation: 'supports',
          confidence: 'confirmed',
        });
      }
    }

    records.push(
      finalizeRecord({
        type: 'research',
        id: slug,
        route: `/#/r/${slug}`,
        title: stripHtml(detail.title),
        text,
        tags: splitTags(detail.tags),
        related,
        provenance: {
          sourceType: 'research.json#research',
          sourcePath: RESEARCH_PATH,
          sourceId: slug,
          fieldsUsed,
        },
        extras: {
          journal: detail.journal || null,
          award: detail.award || null,
          authorNames: (detail.authors || []).map((a) => stripHtml(a.name)).filter(Boolean),
          thumbnail: detail.thumbnail ? `/assets/imgs/research/${detail.thumbnail}` : null,
          desc: detail.desc ? stripHtml(detail.desc) : null,
        },
      })
    );
  }

  // --- List-only pubs / books ---
  for (const [gi, group] of researchGroups.entries()) {
    if (!group || typeof group !== 'object') {
      errors.push(`research.project[${gi}] is not an object`);
      continue;
    }
    if (group.type === 'book') {
      stats.canonical.books += 1;
      if (!group.title) {
        errors.push(`research.project[${gi}] book missing title`);
        continue;
      }
      const id = slugify(group.title) || `book-${gi}`;
      const attrLines = Object.entries(group.attributes || {}).map(
        ([k, v]) => `${k}: ${stripHtml(String(v))}`
      );
      const text = [
        `Title: ${stripHtml(group.title)}`,
        group.desc ? stripHtml(group.desc) : '',
        ...attrLines,
      ]
        .filter(Boolean)
        .join('\n');
      records.push(
        finalizeRecord({
          type: 'book',
          id,
          route: null,
          title: stripHtml(group.title),
          text,
          tags: ['book'],
          related: [],
          provenance: {
            sourceType: 'research.json#project[book]',
            sourcePath: RESEARCH_PATH,
            sourceId: id,
            fieldsUsed: ['title', 'desc', 'attributes'],
          },
          extras: { attributes: group.attributes || {}, links: group.links || [] },
        })
      );
      continue;
    }

    const pubs = Array.isArray(group.publications) ? group.publications : [];
    for (const [pi, pub] of pubs.entries()) {
      stats.canonical.listResearchCandidates += 1;
      const slugFromUrl = extractResearchSlugFromUrl(pub.url) || extractResearchSlugFromUrl(pub.links?.project);
      if (slugFromUrl && researchIds.has(slugFromUrl)) {
        stats.listPubsSkippedAsDetailDupes += 1;
        continue;
      }

      // List-only
      const title =
        stripHtml(pub.title) ||
        stripHtml(group.title) ||
        (pub.paper ? stripHtml(pub.paper).slice(0, 120) : '');
      if (!title) {
        warnings.push(`list pub project[${gi}].publications[${pi}] has no title; skipped`);
        continue;
      }
      const idBase = slugFromUrl || slugify(title) || `list-${gi}-${pi}`;
      const id = `list:${idBase}`;
      const abstract = stripHtml(pub.links?.abstract || '');
      const attrs = group.attributes
        ? Object.entries(group.attributes)
            .map(([k, v]) => `${k}: ${stripHtml(String(v))}`)
            .join('\n')
        : '';
      const text = [
        `Title: ${title}`,
        pub.venue ? `Venue: ${stripHtml(pub.venue)}` : '',
        pub.links?.award ? `Award: ${stripHtml(pub.links.award)}` : '',
        pub.authors ? `Authors: ${stripHtml(pub.authors)}` : '',
        abstract,
        attrs,
      ]
        .filter(Boolean)
        .join('\n');

      records.push(
        finalizeRecord({
          type: 'list_research',
          id,
          route: null,
          title,
          text,
          tags: splitTags(group.type),
          related: [],
          provenance: {
            sourceType: 'research.json#project[list]',
            sourcePath: RESEARCH_PATH,
            sourceId: id,
            fieldsUsed: ['title', 'venue', 'authors', 'links.abstract', 'attributes'].filter(Boolean),
          },
          extras: {
            externalUrl: pub.url || pub.links?.pdf || pub.links?.googleplay || null,
            pdf: pub.links?.pdf || null,
            groupTitle: group.title || null,
            groupType: group.type || null,
          },
        })
      );
    }
  }

  // --- Portfolio (+ apps merge) ---
  for (const [slug, item] of portfolioBySlug) {
    const app = appsBySlug.get(slug) || null;
    if (app) stats.duplicatesMerged += 1;
    const { text, fieldsUsed } = buildPortfolioText(item, app);
    const record = {
      type: 'project',
      id: slug,
      route: `/#/p/${slug}`,
      title: stripHtml(item.title),
      text,
      tags: splitTags([item.tags, app?.tags].filter(Boolean).join(',')),
      related: [],
      provenance: {
        sourceType: app ? 'portfolio.json#portfolio+apps.json#apps' : 'portfolio.json#portfolio',
        sourcePath: PORTFOLIO_PATH,
        sourceId: slug,
        fieldsUsed,
        ...(app
          ? {
              secondarySourcePath: APPS_PATH,
              mergePolicy: 'portfolio_canonical_apps_attached',
            }
          : {}),
      },
      extras: {
        externalUrl: item.url || null,
        thumbnail: item.thumbnail ? `/assets/imgs/project/${item.thumbnail}` : null,
        desc: item.desc ? stripHtml(item.desc) : null,
        ...(app
          ? {
              category: app.category || null,
              platform: app.platform || null,
              version: app.version || null,
              updated: app.updated || null,
            }
          : {}),
      },
    };
    if (app) record.alsoRoutes = [`/#/a/${slug}`];
    records.push(finalizeRecord(record));
  }

  // Apps without portfolio counterpart
  for (const [slug, app] of appsBySlug) {
    if (portfolioBySlug.has(slug)) continue;
    const text = [
      `Title: ${stripHtml(app.title)}`,
      app.tagline ? `Tagline: ${stripHtml(app.tagline)}` : '',
      app.category ? `Category: ${stripHtml(app.category)}` : '',
      Array.isArray(app.platform) ? `Platforms: ${app.platform.join(', ')}` : '',
      app.tags ? `Tags: ${app.tags}` : '',
      stripHtml(app.desc || ''),
    ]
      .filter(Boolean)
      .join('\n');
    records.push(
      finalizeRecord({
        type: 'project',
        id: slug,
        route: `/#/a/${slug}`,
        title: stripHtml(app.title),
        text,
        tags: splitTags(app.tags),
        related: [],
        provenance: {
          sourceType: 'apps.json#apps',
          sourcePath: APPS_PATH,
          sourceId: slug,
          fieldsUsed: ['title', 'tagline', 'category', 'platform', 'tags', 'desc'],
        },
        extras: {
          category: app.category || null,
          platform: app.platform || null,
          thumbnail: app.icon || null,
          desc: app.desc ? stripHtml(app.desc) : null,
        },
      })
    );
  }

  // --- Press ---
  const pressIds = new Set();
  for (const meta of pressMetas) {
    if (!meta?.id || !meta?.title) {
      errors.push(`press meta missing id/title: ${JSON.stringify(meta)}`);
      continue;
    }
    pressIds.add(meta.id);
    const relatedResearch = Array.isArray(meta.relatedResearch) ? meta.relatedResearch : [];
    const related = [];
    for (const slug of relatedResearch) {
      if (researchIds.has(slug)) {
        related.push({
          type: 'research',
          id: slug,
          relation: 'press_about',
          confidence: 'confirmed',
        });
      } else {
        unresolved.push({
          kind: 'press_related_research_missing',
          pressId: meta.id,
          researchSlug: slug,
          confidence: 'uncertain',
          action: 'relatedResearch points to unknown research slug',
        });
      }
    }
    records.push(
      finalizeRecord({
        type: 'press',
        id: meta.id,
        route: `/archive/press/${meta.id}/`,
        title: stripHtml(meta.title),
        text: [
          `Title: ${stripHtml(meta.title)}`,
          meta.source ? `Source: ${stripHtml(meta.source)}` : '',
          meta.originalUrl ? `Original: ${meta.originalUrl}` : '',
          relatedResearch.length ? `Related research: ${relatedResearch.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        tags: ['press'],
        related,
        provenance: {
          sourceType: 'press/meta.json',
          sourcePath: meta._sourcePath || `${PRESS_GLOB_ROOT}/${meta.id}/meta.json`,
          sourceId: meta.id,
          fieldsUsed: ['title', 'source', 'originalUrl', 'relatedResearch'],
        },
        extras: {
          originalUrl: meta.originalUrl || null,
          retrievedAt: meta.retrievedAt || null,
        },
      })
    );
  }

  // Attach event relationships onto research + emit provisional event records
  for (const ev of events) {
    const eventId = slugify(`${ev.title}-${ev.date}`);
    const linkedSlug = extractResearchSlugFromUrl(ev.url);
    const related = [];

    if (linkedSlug) {
      if (researchIds.has(linkedSlug)) {
        related.push({
          type: 'research',
          id: linkedSlug,
          relation: 'presented_at',
          confidence: 'confirmed',
        });
        // Also annotate research record
        const researchRec = records.find((r) => r.type === 'research' && r.id === linkedSlug);
        if (researchRec) {
          researchRec.related.push({
            type: 'event',
            id: eventId,
            relation: 'presented_at',
            confidence: 'confirmed',
          });
          // Re-hash after mutation
          const { contentHash: _c, ...rest } = researchRec;
          Object.assign(researchRec, finalizeRecord(rest));
        }
      } else {
        unresolved.push({
          kind: 'event_route',
          eventTitle: ev.title,
          eventId,
          url: ev.url,
          missingResearchSlug: linkedSlug,
          confidence: 'uncertain',
          action: 'do_not_guess_portfolio_match; human fix or drop',
        });
        related.push({
          type: 'research',
          id: linkedSlug,
          relation: 'presented_at',
          confidence: 'uncertain',
        });
      }
    }

    const text = [
      `Title: ${ev.title}`,
      `Date: ${ev.date}`,
      `Place: ${ev.place}`,
      `Role: ${ev.role}`,
      ev.award ? `Award: ${ev.award}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    records.push(
      finalizeRecord({
        type: 'event',
        id: eventId,
        route: '/#/updates',
        title: ev.title,
        text,
        tags: ['event', ev.role].filter(Boolean),
        related,
        provenance: {
          sourceType: 'Events.js',
          sourcePath: EVENTS_PATH,
          sourceId: eventId,
          fieldsUsed: ['title', 'date', 'place', 'role', 'award', 'url'].filter(
            (f) => f !== 'award' || ev.award
          ),
          note: 'Provisional derived id until Events.js migration',
        },
        extras: {
          sourceUrl: ev.url,
          idStability: 'provisional',
          award: ev.award || null,
        },
      })
    );
  }

  // --- Credentials (canonical structured claims from About / research / events) ---
  const credentials = Array.isArray(credentialsJson.credentials) ? credentialsJson.credentials : [];
  stats.canonical.credentials = credentials.length;
  const indexedKeys = new Set(records.map((r) => `${r.type}:${r.id}`));

  for (const [ci, cred] of credentials.entries()) {
    if (!cred?.id || !cred?.title) {
      errors.push(`credentials[${ci}] missing required id/title`);
      continue;
    }
    const related = [];
    for (const slug of cred.relatedResearch || []) {
      if (researchIds.has(slug)) {
        related.push({
          type: 'research',
          id: slug,
          relation: 'supports',
          confidence: 'confirmed',
        });
      } else {
        unresolved.push({
          kind: 'credential_related_research_missing',
          credentialId: cred.id,
          researchSlug: slug,
          confidence: 'uncertain',
          action: 'relatedResearch points to unknown research slug',
        });
      }
    }

    const text = [
      `Title: ${stripHtml(cred.title)}`,
      cred.kind ? `Kind: ${cred.kind}` : '',
      cred.issuer ? `Issuer: ${stripHtml(cred.issuer)}` : '',
      stripHtml(cred.summary || ''),
      cred.url ? `Credential link: ${cred.url}` : '',
      (cred.tags && `Tags: ${cred.tags}`) || '',
    ]
      .filter(Boolean)
      .join('\n');

    records.push(
      finalizeRecord({
        type: 'credential',
        id: String(cred.id),
        route: cred.route || null,
        title: stripHtml(cred.title),
        text,
        tags: splitTags(cred.tags),
        related,
        provenance: {
          sourceType: 'credentials.json',
          sourcePath: CREDENTIALS_PATH,
          sourceId: String(cred.id),
          fieldsUsed: ['title', 'kind', 'issuer', 'summary', 'url', 'tags', 'relatedResearch'],
        },
        extras: {
          kind: cred.kind || null,
          issuer: cred.issuer || null,
          externalUrl: cred.url || null,
          sourceRefs: cred.sourceRefs || [],
        },
      })
    );
    indexedKeys.add(`credential:${cred.id}`);
  }

  // --- Capabilities (curated evidence map; no restated project bodies) ---
  const capabilities = Array.isArray(capabilitiesJson.capabilities) ? capabilitiesJson.capabilities : [];
  stats.canonical.capabilities = capabilities.length;
  const CLAIM_STRENGTHS = new Set(['direct', 'strongly_supported', 'reasonably_inferred']);

  for (const [ci, cap] of capabilities.entries()) {
    if (!cap?.id || !cap?.capability) {
      errors.push(`capabilities[${ci}] missing required id/capability`);
      continue;
    }
    if (!CLAIM_STRENGTHS.has(cap.claimStrength)) {
      errors.push(
        `capabilities[${ci}] (${cap.id}) invalid claimStrength: ${cap.claimStrength}`
      );
      continue;
    }

    const related = [];
    for (const evidenceKey of cap.evidenceKeys || []) {
      const parsed = parseRecordKey(evidenceKey);
      if (!parsed) {
        unresolved.push({
          kind: 'capability_evidence_malformed',
          capabilityId: cap.id,
          evidenceKey,
          confidence: 'uncertain',
          action: 'evidence key must be type:id',
        });
        continue;
      }
      if (!indexedKeys.has(evidenceKey) && !records.some((r) => r.type === parsed.type && r.id === parsed.id)) {
        unresolved.push({
          kind: 'capability_evidence_missing',
          capabilityId: cap.id,
          evidenceKey,
          confidence: 'uncertain',
          action: 'capability references unknown canonical record; do not invent',
        });
        related.push({
          type: parsed.type,
          id: parsed.id,
          relation: 'supports',
          confidence: 'uncertain',
        });
        continue;
      }
      related.push({
        type: parsed.type,
        id: parsed.id,
        relation: 'supports',
        confidence: 'confirmed',
      });
    }

    const label = stripHtml(cap.label || cap.capability);
    const queryTerms = Array.isArray(cap.queryTerms) ? cap.queryTerms.map(String) : [];
    const text = [
      `Capability: ${label}`,
      `Claim strength: ${cap.claimStrength}`,
      queryTerms.length ? `Query terms: ${queryTerms.join(', ')}` : '',
      (cap.evidenceKeys || []).length
        ? `Evidence: ${(cap.evidenceKeys || []).join(', ')}`
        : '',
      cap.notes ? stripHtml(cap.notes) : '',
    ]
      .filter(Boolean)
      .join('\n');

    records.push(
      finalizeRecord({
        type: 'capability',
        id: String(cap.id),
        route: null,
        title: label,
        text,
        tags: splitTags(['capability', cap.capability, ...queryTerms].join(',')),
        related,
        provenance: {
          sourceType: 'capabilities.json',
          sourcePath: CAPABILITIES_PATH,
          sourceId: String(cap.id),
          fieldsUsed: ['capability', 'label', 'claimStrength', 'queryTerms', 'evidenceKeys', 'notes'],
        },
        extras: {
          capability: cap.capability,
          claimStrength: cap.claimStrength,
          queryTerms,
          evidenceKeys: cap.evidenceKeys || [],
          notes: cap.notes || null,
        },
      })
    );
  }

  if (errors.length) {
    const err = new Error(errors.join('\n'));
    err.validationErrors = errors;
    throw err;
  }

  // Validate generated records
  const validation = validateRecords(records, { researchIds, portfolioBySlug, pressIds, warnings });

  const sorted = sortRecords(records);
  for (const rec of sorted) {
    stats.generated[rec.type] = (stats.generated[rec.type] || 0) + 1;
  }

  return {
    generatedAt: options.clock ? options.clock() : new Date().toISOString(),
    records: sorted,
    unresolved: unresolved.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    warnings: [...warnings, ...validation.warnings].sort(),
    stats: {
      ...stats,
      normalizedTotal: sorted.length,
    },
    validation,
  };
}

export function validateRecords(records, ctx = {}) {
  const warnings = [];
  const failures = [];
  const seen = new Set();

  for (const rec of records) {
    if (!rec.type || !rec.id || !rec.title || typeof rec.text !== 'string') {
      failures.push(`Record missing required fields: ${JSON.stringify({ type: rec.type, id: rec.id })}`);
      continue;
    }
    const key = `${rec.type}:${rec.id}`;
    if (seen.has(key)) failures.push(`Duplicate generated identity: ${key}`);
    seen.add(key);

    if (rec.type === 'research') {
      if (rec.route !== `/#/r/${rec.id}`) {
        failures.push(`Research route mismatch for ${rec.id}: ${rec.route}`);
      }
    }
    if (rec.type === 'project' && rec.route?.startsWith('/#/p/')) {
      if (rec.route !== `/#/p/${rec.id}`) {
        failures.push(`Project route mismatch for ${rec.id}: ${rec.route}`);
      }
    }
    if (!rec.provenance?.sourcePath || !rec.provenance?.sourceId) {
      failures.push(`Missing provenance on ${key}`);
    }
    if (!rec.contentHash || !/^[a-f0-9]{16}$/.test(rec.contentHash)) {
      failures.push(`Invalid contentHash on ${key}`);
    }
    // Verify hash integrity
    const { contentHash: hash, ...rest } = rec;
    const expected = contentHash(rest);
    if (hash !== expected) failures.push(`contentHash drift on ${key}`);

    for (const rel of rec.related || []) {
      if (!rel.confidence) failures.push(`related missing confidence on ${key}`);
      if (rel.confidence === 'confirmed') {
        if (rel.type === 'research' && ctx.researchIds && !ctx.researchIds.has(rel.id)) {
          // allowed only if this is temporary — treat as failure for confirmed
          failures.push(`Confirmed related research missing: ${key} -> ${rel.id}`);
        }
      }
    }
  }

  return { ok: failures.length === 0, failures, warnings };
}

/**
 * Diff previous vs next record sets by contentHash.
 */
export function diffSnapshots(previousRecords = [], nextRecords = []) {
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

export function loadCanonicalFromDisk(root = REPO_ROOT) {
  const researchJson = readJson(path.join(root, RESEARCH_PATH));
  const portfolioJson = readJson(path.join(root, PORTFOLIO_PATH));
  const appsJson = readJson(path.join(root, APPS_PATH));

  const credentialsPath = path.join(root, CREDENTIALS_PATH);
  const capabilitiesPath = path.join(root, CAPABILITIES_PATH);
  const credentialsJson = fs.existsSync(credentialsPath)
    ? readJson(credentialsPath)
    : { credentials: [] };
  const capabilitiesJson = fs.existsSync(capabilitiesPath)
    ? readJson(capabilitiesPath)
    : { capabilities: [] };

  const pressDir = path.join(root, PRESS_GLOB_ROOT);
  const pressMetas = [];
  if (fs.existsSync(pressDir)) {
    for (const name of fs.readdirSync(pressDir).sort()) {
      const metaPath = path.join(pressDir, name, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      const meta = readJson(metaPath);
      meta._sourcePath = path.posix.join(PRESS_GLOB_ROOT, name, 'meta.json');
      pressMetas.push(meta);
    }
  }

  const eventsPath = path.join(root, EVENTS_PATH);
  let events = [];
  if (fs.existsSync(eventsPath)) {
    events = parseEventsFromSource(fs.readFileSync(eventsPath, 'utf8'));
  }

  return {
    researchJson,
    portfolioJson,
    appsJson,
    pressMetas,
    events,
    credentialsJson,
    capabilitiesJson,
  };
}

export function writePreview(result, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const recordsPath = path.join(outDir, 'kb_preview.json');
  const reportPath = path.join(outDir, 'kb_report.json');
  const summaryPath = path.join(outDir, 'kb_summary.json');

  let previous = [];
  const prevPath = recordsPath;
  if (fs.existsSync(prevPath)) {
    try {
      const prevDoc = JSON.parse(fs.readFileSync(prevPath, 'utf8'));
      previous = prevDoc.records || [];
    } catch {
      previous = [];
    }
  }

  const changeSet = diffSnapshots(previous, result.records);

  const previewDoc = {
    _meta: {
      description: 'Dry-run normalized KB preview. Not production. Not shipped to GitHub Pages site assets.',
      generatedAt: result.generatedAt,
      normalizer: 'scripts/normalize-kb.mjs',
      spec: 'docs/AI_KB_NORMALIZER_SPEC.md',
    },
    records: result.records,
  };

  const reportDoc = {
    generatedAt: result.generatedAt,
    unresolved: result.unresolved,
    warnings: result.warnings,
    validation: result.validation,
    changeSet,
  };

  const summaryDoc = {
    generatedAt: result.generatedAt,
    canonical: result.stats.canonical,
    generatedByType: result.stats.generated,
    normalizedTotal: result.stats.normalizedTotal,
    duplicatesMerged: result.stats.duplicatesMerged,
    listPubsSkippedAsDetailDupes: result.stats.listPubsSkippedAsDetailDupes,
    unresolvedCount: result.unresolved.length,
    warningCount: result.warnings.length,
    validationOk: result.validation.ok,
    changeSetCounts: {
      added: changeSet.added.length,
      changed: changeSet.changed.length,
      unchanged: changeSet.unchanged.length,
      removed: changeSet.removed.length,
    },
  };

  // Deterministic file bytes: fixed key order via stable stringify pretty-print
  const writePretty = (file, obj) => {
    fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
  };

  writePretty(recordsPath, previewDoc);
  writePretty(reportPath, reportDoc);
  writePretty(summaryPath, summaryDoc);

  return { recordsPath, reportPath, summaryPath, changeSet, summaryDoc };
}

export function runNormalize(root = REPO_ROOT, outDir = path.join(root, 'docs/generated')) {
  const data = loadCanonicalFromDisk(root);
  const result = normalizeKnowledgeBase(data);
  if (!result.validation.ok) {
    const err = new Error(`Validation failed:\n${result.validation.failures.join('\n')}`);
    err.validation = result.validation;
    throw err;
  }
  const written = writePreview(result, outDir);
  return { result, written };
}
