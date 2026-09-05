# AI KB Normalizer Spec (provider-neutral)

**Date:** 2026-09-04  
**Depends on:** [`docs/AI_KNOWLEDGE_INVENTORY.md`](AI_KNOWLEDGE_INVENTORY.md)  
**Scope:** Design + dry-run validation against real repo records. No production `public/assets/kb/`, no embeddings, no LLM APIs, no chat UI.

---

## 1. Goals

Transform **canonical portfolio sources** into **normalized retrieval records** so a future retrieval layer can return:

1. **Evidence text** suitable for an LLM context window  
2. **Metadata** so the frontend can open the correct existing page (`/#/r/…`, `/#/p/…`, `/#/a/…`, press archive paths)

Constraints:

- Provider-neutral (OpenAI / Gemini / Mistral / DeepSeek / local embeddings later)
- Vector-DB-neutral (Pinecone / Chroma / Cloudflare Vectorize / none — keyword search OK)
- One source of truth: website JSON remains canonical; normalized output is **derived**
- Do not invent facts absent from sources
- Do not promote uncertain relationships to facts

---

## 2. Canonical sources (read priority)

| Priority | Source | Used for |
|---|---|---|
| 1 | `public/assets/research.json` → `research[]` | Research with site detail pages |
| 2 | `public/assets/portfolio.json` → `portfolio[]` | Projects |
| 3 | `public/assets/apps.json` → `apps[]` | App-store metadata **merged into** matching portfolio, not as competing entities |
| 4 | `public/archive/press/*/meta.json` (+ optional HTML later) | Press supporting evidence |
| 5 | `src/components/Events.js` (until migrated) | Talks; link via URL heuristics only when confirmed |
| 6 | `research.json` → `project[]` list-only / books | Secondary entities without `/r/:slug` |

**Dedup rule for research:** For any slug that exists in `research[]`, **ignore** the parallel list `publications[]` entry when emitting the primary entity (list copy is presentation-only). List-only pubs without a detail slug remain separate (see §7).

---

## 3. Normalized record shape

Each emitted object is a **retrieval record** (may equal one “chunk” for v1; later a record may split into multiple chunks).

```ts
type KbRecord = {
  // Identity
  type: "research" | "project" | "press" | "event" | "book" | "list_research" | "credential";
  id: string;                 // reuse existing slug/id; never invent parallel IDs for site entities
  route: string | null;       // HashRouter path for UI navigation, or null if external-only
  alsoRoutes?: string[];      // e.g. ["/a/nexschool"] when portfolio is canonical

  // Human labels
  title: string;
  summary?: string;           // short; often first sentence of desc — not invented beyond source

  // Retrieval
  text: string;               // cleaned plain text for embedding / keyword search
  tags: string[];

  // Relationships (confirmed only)
  related: Array<{
    type: KbRecord["type"];
    id: string;
    relation: "same_as" | "press_about" | "presented_at" | "listed_as" | "supports";
    confidence: "confirmed" | "uncertain";
  }>;

  // Provenance
  provenance: {
    sourceType: string;       // e.g. "research.json#research"
    sourcePath: string;       // file path in repo
    sourceId: string;         // slug/id inside that file
    fieldsUsed: string[];     // which fields fed `text`
  };

  // Optional structured extras (passthrough, not required for retrieval)
  extras?: Record<string, unknown>;
};
```

**ID rules**

| Entity | `id` | `route` |
|---|---|---|
| Research detail | existing `slug` | `/#/r/{slug}` |
| Portfolio project | existing `slug` | `/#/p/{slug}` |
| App-only (no portfolio) | existing `slug` | `/#/a/{slug}` |
| Press | existing `meta.id` | `/archive/press/{id}/` (static) |
| Event (future) | new slug when migrated | `/#/updates` until deep links exist |
| List-only / book | see §7 | often `null` or PDF/external URL in `extras` |

---

## 4. Text extraction rules (no invented content)

### 4.1 Plain-text cleaning

- Strip HTML tags from `authors` strings and any HTML blobs (`<b>`, anchors).
- Collapse whitespace; keep sentence punctuation.
- Do **not** paraphrase or add evaluative adjectives.
- Do **not** dump raw JSON keys into `text`.

### 4.2 Research detail (`research[]`) → `text`

Concatenate in order (omit empty):

1. `Title: {title}`
2. `Venue: {journal}`
3. `Award: {award}` if present
4. `Authors: {comma-separated names from authors[].name}`
5. `Tags: {tags}` (normalize to comma-separated list)
6. Body: `desc` (primary). If `desc` empty, fall back to list pub `links.abstract` for same slug.
7. If `articles[].list` exists: append  
   `Press coverage: {header}` for each (titles only from source; full archive body is optional later chunk)

`tags`: split `tags` string on commas, trim, lowercase.

### 4.3 Portfolio → `text`

1. `Title: {title}`
2. `Tags: {tags}`
3. Body: `desc`
4. If external `url`: `Project link: {url}`

### 4.4 Apps merge into portfolio (same slug)

When `apps.json` has the same `slug` as portfolio:

- **Canonical entity type:** `project`
- **Canonical id/route:** portfolio (`/#/p/{slug}`)
- **Attach** without second competing record:
  - `alsoRoutes: ["/a/{slug}"]`
  - Merge into `text` only **non-duplicative** fields: `tagline`, `category`, `platform`, `version`, `updated`, store metadata
  - Prefer portfolio `desc` when both exist (role language often richer); append app `desc` only if it adds material not already present (simple containment check), else skip
  - Union tags from both sources

### 4.5 Press `meta.json` → `text`

1. `Title: {title}`
2. `Source: {source}`
3. `Original: {originalUrl}`
4. `Related research: {relatedResearch joined}`

Full HTML archive body = optional second-phase chunk (`type: press`, same `id`, `extras.chunkKind: "archive_body"`) — **out of scope for sample**.

### 4.6 Events (pre-migration)

Emit only when useful for relationships / thin evidence:

1. `Title: {title}`
2. `Date: {date}`
3. `Place: {place}`
4. `Role: {role}`
5. `Award: {award}` if present

`id`: provisional `event:{slugify(title+date)}` **only for derived sample**; production migration should assign stable slugs. Mark `provenance.sourceType: "Events.js"`.

---

## 5. Relationship rules

Emit `related[]` only when **confirmed** in inventory:

| Relation | When |
|---|---|
| `press_about` | press `relatedResearch` contains research slug |
| `presented_at` | event `url` contains `/#/r/{slug}` or `/r/{slug}` |
| `same_as` | portfolio slug === apps slug (direction: project → app route via `alsoRoutes`; optional related entry type `project`/`app` not needed if merged) |
| `listed_as` | research list pub url points at detail slug (informational; usually omit if detail is canonical) |
| `supports` | research `articles[].archive` path maps to press id |

**Uncertain** (GeoCart↔CadastrAR, jigshare↔jigmail, thematic CollabXR↔thesis):  
either omit, or include with `confidence: "uncertain"` and **never** use for grounded answers as fact.

---

## 6. Representative dry-runs

### 6.1 `mrmac` — research detail

| Item | Value |
|---|---|
| Canonical source | `research.json` → `research[slug=mrmac]` |
| Fields extracted | `title`, `journal`, `authors[].name`, `tags`, `desc` |
| Retrieval text | Title + venue + authors + tags + full `desc` |
| Metadata | `type: research`, `id: mrmac` |
| Route | `/#/r/mrmac` |
| Relationships | Confirmed event ISMAR 2023 → `presented_at` (event url contains `/r/mrmac`) |
| Dedupe | List pub `/r/mrmac` skipped as duplicate of detail |
| Provenance | `public/assets/research.json`, fields listed in sample |

### 6.2 `rtstage` — research + related press

| Item | Value |
|---|---|
| Canonical source | `research[slug=rtstage]` |
| Fields | + `award`, `articles[].header/url/archive` |
| Retrieval text | Includes award + press coverage titles |
| Route | `/#/r/rtstage` |
| Relationships | `related` → three press ids with `press_about` / inverse `supports`; Event SIGGRAPH 2023 award is thematic — event url is **external** (not `/r/rtstage`), so event link is **uncertain** unless later curated |
| Press records | Separate `type: press` records for each `meta.id`, each `related` → `rtstage` |

### 6.3 `linz` — portfolio project

| Item | Value |
|---|---|
| Canonical source | `portfolio.json` → `slug=linz` |
| Fields | `title`, `desc`, `tags`, `url` |
| Route | `/#/p/linz` |
| Relationships | none confirmed |
| Dedupe | n/a |

### 6.4 `nexschool` — portfolio + app duplicate

| Item | Value |
|---|---|
| Canonical source | **portfolio** `nexschool` |
| Secondary | apps `nexschool` |
| Resolution | **One** record `type: project`, `id: nexschool`, `route: /#/p/nexschool`, `alsoRoutes: ["/a/nexschool"]` |
| Text | Portfolio `desc` (includes Front End Developer responsibilities) + app `tagline`, `category`, `platform` |
| Competing answers | Avoided by not emitting a second `type` entity for the app |

Same rule applies to `nexcrm`.

### 6.5 `xrgait` — research + related event

| Item | Value |
|---|---|
| Canonical source | `research[slug=xrgait]` |
| Event | OzCHI 2025 — `url` contains `/#/r/xrgait` → **confirmed** `presented_at` |
| Route | `/#/r/xrgait` |
| List pub | skipped (duplicate of detail) |

---

## 7. Edge cases

### List-only research items

Examples: CollabXR (external Amplify URL), DC workshop PDF, Picturesque (Play Store).

- Emit `type: "list_research"` (or `book` for books)
- `id`: derive stable slug from title slugify **or** arxiv/ISBN when present — document as **derived**, not a site route id
- `route`: `null` unless an in-app page exists
- `extras.externalUrl` / `extras.pdfPath` from source
- Do **not** invent `/#/r/...` pages

### Books

Example: TensorFlow Lite for Mobile Development.

- `type: "book"`
- `id`: e.g. `book:tensorflow-lite-for-mobile-development` (derived)
- `route`: `null`
- `text` from `title`, `desc`, `attributes` (Released, Publisher, ISBN), link labels
- Valuable for AI-topic questions; keep separate from research slugs

### Events with no stable ID

- Until `events.json` migration: provisional derived ids only in docs/samples
- Prefer storing relationships on the **research** record (`related` event provisional id) rather than treating events as primary evidence bodies
- TODO later: migrate Events.js → JSON with real slugs

### Broken / uncertain `jigshare`

- Event NZGDC 2025 points to `/#/r/jigshare`
- **No** `jigshare` in `research[]`
- Portfolio has `jigmail`, not `jigshare`
- Normalizer behavior:
  - Do **not** emit `presented_at` → jigmail
  - Emit event record with `related: [{ id: "jigshare", confidence: "uncertain", relation: "presented_at" }]` **or** flag `extras.unresolvedRoute: "/#/r/jigshare"`
  - Surface as data-quality issue for humans; AI must not claim a research page exists

### GeoCart ↔ CadastrAR

- Venue/year overlap only; event URL is cartography.org  
- **Do not** auto-link; leave uncertain until curated `relatedResearch: ["cadastrar"]`

---

## 8. Sample artifact

See [`docs/examples/sample_kb_chunks.json`](examples/sample_kb_chunks.json).

This file is a **dry-run illustration**, not production KB. It includes records for:

- `mrmac`, `rtstage`, `xrgait` (research)
- one press item about `rtstage`
- `linz`, `nexschool` (projects; nexschool merged)
- OzCHI event (provisional) related to `xrgait`
- notes objects for jigshare / list-only handling

---

## 9. Downstream usage (non-binding)

Any future pipeline can:

1. Embed `text` with any embedding model  
2. Store vectors anywhere  
3. On hit, pass `text` + `title` to an LLM  
4. Pass `route` / `alsoRoutes` to the React app for navigation  
5. Cite `provenance` in the answer UI  

Nothing in the record schema requires a specific vendor.

---

## 10. Validation checklist (this TODO)

| Requirement | Status |
|---|---|
| One source of truth → AI-ready chunks | Spec + samples |
| Existing slugs/routes survive | `/#/r/mrmac`, `/#/p/linz`, etc. |
| Duplicates handled deterministically | nexschool merge rule |
| Confirmed relationships survive | press→rtstage, event→xrgait |
| Uncertain stay uncertain | jigshare, GeoCart |
| Provenance retained | `provenance` on every record |
| Provider-neutral | No OpenAI/Gemini-specific fields |

---

## 11. Recommended TODO 4 (do not implement now)

**Implement a Node (or Python) dry-run script** `scripts/normalize-kb.mjs` that:

1. Reads the real JSON files  
2. Emits `docs/examples/generated_kb_preview.json` (gitignored or docs-only)  
3. Prints a report: entity counts, skipped list-duplicates, unresolved event routes (`jigshare`), merge decisions  

Still **no** `public/assets/kb/`, no embeddings, no LLM, no chat, no Events migration.

That proves the normalizer is executable before choosing hosting/RAG infrastructure.
