# AI Knowledge Inventory

**Date:** 2026-09-04  
**Scope:** Analysis only. No KB files, embeddings, chat UI, or production-code changes.  
**Source of truth for this document:** repository contents as inspected on this date.

---

## A. What knowledge already exists?

### 1. `public/assets/research.json`

**Role:** Primary research / publications / books corpus. Also drives homepage featured research via `homeResearch`.

**Top-level structure:**

| Key | Shape | Purpose |
|---|---|---|
| `homeResearch` | `string[]` of routes like `"/r/xrgait"` | Freeze which pubs appear on home |
| `project` | array of **groups** (`type`: `research` \| `project` \| `book`) | Research *list* page grouping |
| `research` | array of **detail records** | Research *detail* pages at `/#/r/:slug` |

**Group record (`project[]`) — important fields:**

- `type`, `title`, `thumbnail`
- optional `desc`, `attributes` (Problem/Solution or book metadata), `links`
- `publications[]` with: `thumbnail`, `authors` (HTML string), `title`, `venue`, `url`, `links` (`project`, `pdf`, `abstract`, `bibtex`, `slides`, `video`, `award`, `googleplay`, …)

**Detail record (`research[]`) — important fields:**

- **Stable ID:** `slug` (e.g. `cadastrar`, `xrgait`, `thesis`)
- `title`, `desc`, `journal`, `authors[]` (`name`, `url`, `affiliation`)
- `tags` (comma string), `bibtex`, `url` (PDF path), `file_info`
- media: `thumbnail`, `paper_thumb`, `gallery[]`, optional `slides`, `articles[]`, `content[]`, `award`

**Stable IDs / routes:**

| Identity | Route |
|---|---|
| `slug` on detail records | `/#/r/{slug}` |
| List pub `url` when form `/r/{slug}` | same |
| Some list pubs use external URL or PDF path only | **no** in-site detail route |

**Detail enough for AI retrieval?**

- **Yes (strong):** slug detail records — long `desc`/abstracts, authors, venue, tags, often slides/gallery/press links.
- **Partial:** list-only pubs (CollabXR external site, DC workshop PDF, Picturesque Play link) — abstracts exist, but no `/r/:id` page.
- **Thin:** books (title, publisher, ISBN/date, short desc).

**Canonical vs duplicated:**

- For slug’d work: **list group publication + detail record are duplicated** (title/abstract/desc/bibtex appear in both). Detail record is richer (authors structured, gallery, articles). Treat **`research[]` detail as canonical for slug’d items**; list groups as derived presentation for `/research`.
- `homeResearch` is a **derived index**, not a third copy of content.

---

### 2. `public/assets/portfolio.json`

**Role:** Industry / personal project portfolio.

**Structure:** `{ "portfolio": [ … ] }`

**Important fields (field union across all records):**

`slug`, `title`, `desc`, `thumbnail`, `tags`, `gallery[]`, optional `url`

Gallery items: `type` (`image` \| `video`), `url`, optional `ratio`.

**Stable IDs / routes:**

| Identity | Route |
|---|---|
| `slug` | `/#/p/{slug}` |

**Detail enough for AI retrieval?**

- **Moderate:** short marketing/`desc` (often 50–320 chars). Some include role phrases (e.g. Front End Developer, senior mobile application developer).
- **Weak for deep RAG:** no architecture, stack list as structured fields, impact metrics, employer name as a field, timeline, or responsibilities object.
- Tags are coarse: `web`, `app`, `android`, `ios`, `game`, `3d`, `animation` only.

**Canonical:** Yes for those projects. Apps below may **overlap** for NexSchool / NexCRM.

**Count:** 29 portfolio projects.

---

### 3. `public/assets/apps.json`

**Role:** App-store-style presentation for a subset of products.

**Structure:** `{ "apps": [ … ] }`

**Important fields:**  
`slug`, `title`, `tagline`, `desc`, `icon`, `category`, `platform[]`, `version`, `size`, `updated`, `rating`, `downloads`, `tags`, `android`, `ios`, `gallery[]`

**Stable IDs / routes:**

| Identity | Route |
|---|---|
| `slug` | `/#/a/{slug}` |

**Detail enough for AI retrieval?** Moderate product blurbs + metadata; still no deep role/impact narrative.

**Canonical vs duplicated:**

- **Duplicated with portfolio** for `nexschool` and `nexcrm` (same slugs, overlapping titles/descriptions, different gallery/icon packaging).
- Neither file declares a `canonicalOf` link; relationship is by **identical slug** (confident match).

**Count:** 2 apps.

---

### 4. `src/components/Events.js`

**Role:** Talks / demos / workshops list for Updates + home teaser.

**Structure:** exported `events` array of plain objects:

`thumb`, `date`, `title`, `place`, `role` (`presented` \| `attended`), `url`, `html`, optional `award`

**Stable IDs:** **None.** Identity is array index / title string only.

**Routes:**

- List UI: `/#/updates`
- `url` is often external conference site, or sometimes a hash link into research (`/#/r/…`)

**Detail enough for AI retrieval?** Thin (venue + date + role). Award only on SIGGRAPH 2023 entry. Little abstract/body text.

**Canonical:** Yes for talk *appearances*, but content is sparse and not JSON.

**Count:** 14 events.

---

### 5. `public/archive/press/**`

**Role:** Offline mirrors of external press about SIGGRAPH Real-Time Live work.

**Files:**

- `public/archive/press/manifest.json` — index of entries
- `*/meta.json` — per-article metadata
- `*/index.html`, `go.html`, assets — archived HTML

**`meta.json` fields:**  
`id`, `title`, `source`, `originalUrl`, `retrievedAt`, `archivePath` / path, optional `checkUrl` / `checkType`, **`relatedResearch`: `["rtstage"]`**

**Stable IDs / routes:**

| Identity | Access |
|---|---|
| press `id` (e.g. `siggraph-2023-virtual-arena`) | `/archive/press/{id}/` (static), linked from research articles |
| related research slug `rtstage` | `/#/r/rtstage` |

**Detail enough for AI retrieval?** Archived HTML is rich third-party narrative; `meta.json` alone is thin but **explicitly linked** to research.

**Canonical:** Press is **external reporting**; research detail + award field remain primary for “what Faisal claims.” Archives are supporting evidence.

**Count:** 3 press entries, all `relatedResearch: ["rtstage"]`.

---

### 6. Other material sources (professional, not full KB corpora)

| Source | What it holds | Stable ID / route | Retrieval value |
|---|---|---|---|
| `src/components/About.js` hero copy | Name, tagline (`Computer graphics · XR · HCI`), tool icons, **Ph.D.**, **AWS SAP**, **SIGGRAPH RTL** pills | Links to `/#/r/thesis`, Credly, `/#/r/rtstage` | High-signal *claims*, low narrative depth |
| GitHub Issues blog (`Blog.js` / `Post.js`) | Informal “notes from the lab” | Issue number → `/#/blog/:id` | Ephemeral, rate-limited, not in repo JSON |
| `public/assets/papers/**` | PDFs/slides | Path only | Excellent *source docs* if chunked later; not structured metadata |
| `public/movies/movdb.json`, Photo, Travel | Personal interests | Various | Out of scope for professional AI unless explicitly wanted |
| `Contact.js` | Disqus only | `/#/contact` | No bio/CV content |

---

## B. Content inventory (entities present in the repo)

Entities below exist in repository data. Nothing invented.

### Research detail pages (`research.json` → `research[]`) — 8

| slug | Topic signal (from title/tags) |
|---|---|
| `cadastrar` | Collaborative MR for cadastral field decision support |
| `xrgait` | Immersive gait training + wearable sensing |
| `thesis` | Multi-user asymmetric MR telecollaboration (PhD) |
| `avatar360` | Avatar-assisted 6-DoF in 360° panoramas |
| `mrmac` | Mixed Reality Multi-user Asymmetric Collaboration |
| `vicarious` | Context-aware viewpoint selection for MR collaboration |
| `rtstage` | Real-time stage modelling / VFX for live performance (+ Audience Choice Award) |
| `rtauditorium` | Real-time auditorium modelling / VFX (SIGGRAPH Asia RTL) |

### Research-list-only / grouped extras (in `project[]`, no `/r/:slug` detail)

| Title | Notes |
|---|---|
| CollabXR systematic review | External Amplify URL + PDF under `/assets/papers/` |
| `[DC] Improving Multi-User Interaction…` | Workshop paper, PDF path as `url` |
| 3D Object Recognition System | Problem/Solution + densifying/denoising paper + Best Paper Award |
| Picturesque | Deep learning photo tagging app (Play Store link) |
| TensorFlow Lite for Mobile Development | Book (Apress) |
| Cookbook - The Oregano Sage | Non-professional book |

### Portfolio projects (`portfolio.json`) — 29

Slugs:  
`linz`, `nexschool`, `nexcrm`, `jigmail`, `covid-data-tracker`, `signatureclub-app-igt`, `grabgetgo`, `myeg-app`, `foodie-app`, `space-terror`, `musicalight`, `speed-challenger`, `rivality`, `reddish-chair`, `puzzlebox`, `propeller`, `pixar-fs`, `medic-bottle`, `iron-penguin`, `faisal-desk`, `curious-3d`, `cpu-cooler`, `bad-monkeys`, `belgrade-pass`, `brain-teasers`, `car-rim-design`, `car-wheel`, `compass-live`, `the-carpet`

### Apps (`apps.json`) — 2

`nexschool`, `nexcrm`

### Events / talks (`Events.js`) — 14

GeoCart’2026, OzCHI 2025, NZGDC 2025, IEEEVR 2024, SIGGRAPH Asia 2023, ISMAR 2023, VRST 2023, SIGGRAPH 2023 (+ Audience Choice Award), SIGGRAPH Asia 2022, IEEE VR 2022, NZGDC 2021, TakiWaehere hackathon (attended), Auckland XR workshop (attended), SWEN 422 CCRPG

### Press archives — 3

All related to SIGGRAPH 2023 Real-Time Live / `rtstage`.

### Credential claims (About UI, not a data file)

- Ph.D., Computer Graphics → links thesis  
- AWS Solutions Architect – Professional → Credly  
- SIGGRAPH Real-Time Live! → `rtstage`

---

## C. Cross-source relationships

### Confirmed (explicit ID or identical slug / explicit link)

| Relationship | Evidence |
|---|---|
| Press → research `rtstage` | `meta.json` `relatedResearch: ["rtstage"]`; research `articles[].archive` paths |
| Research list ↔ research detail | Same `/r/{slug}` URLs for cadastrar, xrgait, thesis, avatar360, mrmac, vicarious, rtstage, rtauditorium |
| Apps ↔ portfolio | Identical slugs `nexschool`, `nexcrm` |
| Event OzCHI 2025 → `xrgait` | `url` contains `/#/r/xrgait` |
| Event IEEEVR 2024 → `avatar360` | `/#/r/avatar360` |
| Event ISMAR 2023 → `mrmac` | `/#/r/mrmac` |
| Event VRST 2023 → `vicarious` | `/#/r/vicarious` |
| Event SIGGRAPH Asia 2023 → `rtauditorium` | `/#/r/rtauditorium` |
| About Ph.D. pill → thesis | Link `/r/thesis` |
| About SIGGRAPH pill → rtstage | Link `/r/rtstage` |
| Event SIGGRAPH 2023 award ↔ research award | Both state Audience Choice Award; research also has press articles |

### Uncertain (name/venue/theme only — do not treat as proven)

| Pair | Why uncertain |
|---|---|
| GeoCart’2026 event ↔ CadastrAR research | Same conference theme/year; event URL is cartography.org, **not** `/r/cadastrar` |
| NZGDC 2025 URL `/#/r/jigshare` ↔ portfolio `jigmail` | **No** `jigshare` slug in `research.json`; `jigmail` is portfolio-only. Likely broken or renamed link |
| SIGGRAPH Asia 2022 / IEEE VR 2022 events ↔ specific papers | External URLs only; no `/r/:id` |
| CollabXR list entry ↔ thesis theme | Thematic overlap (XR collaboration) only |
| Picturesque research-group project ↔ any portfolio app | No shared slug; Play Store only |

### Not found as shared entities

- Portfolio games/3D models do **not** appear in research.json.
- TensorFlow book does **not** appear in portfolio/apps.
- Blog issues are not mirrored into JSON.

---

## D. What the future AI could answer from the *current* corpus

Legend:

- **Direct** — stated in source text/fields  
- **Inferable** — reasonable capability inference from evidence (must be labeled as inference, not fact stuffing)  
- **Unsupported** — corpus does not support answering honestly

### “What has Faisal done with mixed reality?”

| Kind | Evidence |
|---|---|
| Direct | Detail records: `thesis`, `mrmac`, `vicarious`, `avatar360`, `rtstage`, `rtauditorium`, `cadastrar`, `xrgait` (XR/VR tags and titles); CollabXR abstract; events at ISMAR/VRST/IEEE VR/SIGGRAPH RTL |
| Inferable | Breadth across telecollaboration, live performance VFX, gait rehab, cadastral field support |
| Unsupported | Exact years of employment “as XR engineer at X”, team size owned, product ARR, etc. |

### “What has he built?”

| Kind | Evidence |
|---|---|
| Direct | 29 portfolio projects; 2 apps; research systems described in abstracts (MRMAC, Vicarious, Avatar360, XRGait, CadastrAR, RTL platforms); Picturesque app |
| Inferable | Full-stack range (web/Android/iOS/Unity icons on About; tags) |
| Unsupported | Exhaustive list of every employer deliverable; proprietary code ownership claims beyond desc text |

### “What research has he done?”

| Kind | Evidence |
|---|---|
| Direct | All `research[]` + list pubs/books in `research.json`; venues; bibtex; thesis |
| Inferable | Research arc: multi-user MR telecollaboration → live VFX → sensing/rehab → cadastral MR |
| Unsupported | Citation counts, h-index (Scholar link exists on Research page UI but not as structured data here) |

### “Has he done anything involving AI?”

| Kind | Evidence |
|---|---|
| Direct | **TensorFlow Lite for Mobile Development** book; **Picturesque** (“deep learning” tagging); **3D Object Recognition** / point-cloud denoising + CNN on ModelNet; Best Paper on density-based denoising |
| Inferable | Familiarity with deploying ML to mobile/embedded (book positioning) |
| Unsupported | “Built LLMs / generative AI products,” “AI researcher” as primary identity. CollabXR text mentions integrating AI as a **field gap/opportunity**, not as Faisal’s shipped AI product. Naive substring search for `"ai"` in JSON is **unreliable** (false positives inside words). |

### “What experience demonstrates product thinking?”

| Kind | Evidence |
|---|---|
| Direct | Sparse. Portfolio descs: NexSchool (modules, deployment, UI/UX, maintenance); MyEG (senior mobile, enhance/implement); NexCRM (SME sales workflows); LINZ Plan Generation (domain workflow for survey/title plans); CadastrAR abstract mentions **stakeholders** and field decision support |
| Inferable | End-to-end ownership language in a few descs; shipping consumer/gov apps; CRM/LMS domain framing |
| Unsupported | Formal product management title, roadmaps, discovery interviews, OKRs, market sizing — **not in corpus** |

### “What evidence is there of leadership?”

| Kind | Evidence |
|---|---|
| Direct | Very thin. First-author papers; PhD authorship; “presented” roles at major venues; award on RTL |
| Inferable | Leading demos/talks; coordinating multi-author research (names listed, but **roles not labeled** lead/PI/student) |
| Unsupported | People management, hiring, budget ownership, lab leadership titles |

### “What has he done with collaboration?”

| Kind | Evidence |
|---|---|
| Direct | Core theme of thesis, MRMAC, Vicarious, Avatar360, CadastrAR, CollabXR review; multi-author papers; RTL team performances |
| Inferable | Deep specialization in *remote/asymmetric XR collaboration* as research niche |
| Unsupported | Soft-skill “team player” fluff without citing those works |

---

## E. Missing knowledge (gaps)

Present only weakly or not at all in structured site data:

| Gap | Notes |
|---|---|
| Employment history | No jobs/companies timeline file. Employer names appear *inside* some portfolio descs (IGT, MyEG) inconsistently |
| Skills taxonomy | Only icon hints + coarse tags; no skills.json |
| Education beyond PhD pill | PhD linked; no undergrad/masters structured record |
| Certifications | AWS SAP linked via Credly in About UI only — not in JSON |
| Awards inventory | Scattered (`award` fields, Events, press) — no unified awards list |
| Role / responsibility model | Almost never structured (`role: "lead"` etc.); buried in free text |
| Impact / outcomes | No metrics (users, latency, adoption) as fields |
| Technical architecture | No stack/architecture sections on research/portfolio records |
| AI work as first-class topic | Exists (book, Picturesque, 3D recognition) but **not tagged** under a clear AI category |
| Product-oriented narrative | Inferable only; not curated |
| Event↔research links | Incomplete/broken (`jigshare`); GeoCart not wired to CadastrAR |
| Blog corpus offline | Issues API — not freeze-dried for KB |
| Stable IDs for events / books / list-only pubs | Missing |

Do **not** invent filler records for these. Gaps are inputs for later curation.

---

## F. Recommended normalization strategy

**Recommendation: hybrid, with build-time projection as the default path for RAG.**

1. **Canonical sources stay as they are today**
   - `research.json` (prefer `research[]` for slug’d work)
   - `portfolio.json`
   - `apps.json` (or treat as view of portfolio for shared slugs)
   - press `meta.json`
   - (later) structured events JSON if migrated

2. **Build-time (or scripted) normalizer generates derived KB chunks**
   - One record → one or more chunks
   - Each chunk carries **source metadata**: `{ type, id, route, sourcePath, updatedFrom }`
   - Never a hand-maintained parallel `kb/projects.json` that rewrites the same project

3. **Manual curated overlay only for gaps**
   - Tiny optional file later (e.g. employment, skills, “how to infer product thinking”) that **references** existing IDs rather than restating abstracts
   - Prevents stale dual biographies

**Why this is safest against duplication/staleness:**

- Website edits to `portfolio.json` / `research.json` flow into RAG on next build
- Chat answers can cite `/#/p/linz` or `/#/r/mrmac` with the same ID the UI already uses
- Avoids three competing truths (JSON + kb + prompt facts)

**Consuming raw JSON at runtime in the browser alone** is possible for naive keyword search, but poor for embeddings/privacy/API keys on GitHub Pages — keep retrieval/LLM off the static host or behind a proxy. The **normalized artifact** can still be generated from the same JSON.

---

## G. Events.js decision

**Today:** fine to remain code for the live Updates UI.

**For AI KB:** should **eventually** become structured data (e.g. `public/assets/events.json`) because:

- no stable IDs
- hard to reuse outside React
- several `url`s already encode research links — better as `relatedResearch: ["xrgait"]`
- GeoCart ↔ CadastrAR cannot be expressed cleanly today

**Do not migrate in this task.** When migrated: add `id`/`slug`, keep `date`/`place`/`role`/`award`, replace brittle hash URLs with explicit related IDs.

---

## H. Proposed record identity strategy

**Reuse existing IDs. Do not invent a parallel scheme.**

| Entity type | Canonical ID | Website evidence route | Notes |
|---|---|---|---|
| Research detail | `slug` from `research[]` | `/#/r/{slug}` | Primary |
| Portfolio project | `slug` from `portfolio[]` | `/#/p/{slug}` | Primary |
| App | `slug` from `apps[]` | `/#/a/{slug}` | If same as portfolio slug, emit **one** KB entity with dual routes or `alsoAvailableAs: ["/a/…"]` |
| Press | `id` from press meta | `/archive/press/{id}/` + `relatedResearch` | Supporting |
| Event (future) | new slug when migrated | `/#/updates` (+ deep link if added) | Not available yet |
| List-only research/book | derive slug from title/ISBN/arxiv once, or `sourcePath` pointer | external / PDF path | Needs careful de-dupe vs detail records |
| Credentials | e.g. `cred:aws-sap`, `cred:phd` | About links / Credly | Only if curated overlay added |

**Suggested KB chunk metadata shape (illustrative, not implemented):**

```json
{
  "type": "research",
  "id": "mrmac",
  "route": "/#/r/mrmac",
  "sourcePath": "public/assets/research.json#research[slug=mrmac]",
  "title": "…",
  "text": "…"
}
```

HashRouter means public links for users/agents should prefer the `/#/…` form used by the live site.

---

## I. Proposed TODO 3 (smallest next implementation task)

**Do not start TODO 3 until approved.**

### Recommended TODO 3

**Write a dry-run mapping spec + sample normalizer output for 5–10 existing records** (documentation + maybe a docs-only example JSON), without creating `public/assets/kb/`, without embeddings, without OpenAI:

1. Pick representatives: e.g. `mrmac` (research), `rtstage`+one press id, `linz` (portfolio), `nexschool` (portfolio+app dedupe), `xrgait`+OzCHI event (event link).
2. Specify exact field → chunk text rules (what to concatenate; how to handle HTML authors).
3. Specify dedupe rule for `nexschool` / `nexcrm`.
4. Flag list-only items and broken `jigshare` as out-of-scope or “needs human fix.”
5. Deliverable: `docs/AI_KB_NORMALIZER_SPEC.md` (+ optional `docs/examples/sample_chunks.json` for those few IDs).

**Why this is the smallest useful next step:** it locks the “one source of truth → derived chunks → route metadata” design against real records before any RAG infrastructure or UI exists.

**Explicitly not TODO 3:** migrating Events.js, building chat, installing AI SDKs, creating production `kb/`, calling OpenAI.

---

## Appendix: Quick counts

| Corpus | Count |
|---|---|
| Research detail slugs | 8 |
| Research list groups | 7 (incl. books/projects) |
| Portfolio projects | 29 |
| Apps | 2 |
| Events | 14 |
| Press archives | 3 |
| Home freeze list | 2 (`xrgait`, `thesis`) |
