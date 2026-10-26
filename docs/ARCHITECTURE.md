# Tabaghe 16 — Technical Architecture (docs/ARCHITECTURE.md)

- **Document type:** Implementable engineering blueprint for the independent Tabaghe 16 website concept. Companion to `the product requirements (kept private)` (requirements), `the design system spec (kept private)` (visual/motion system), and `docs/CONTENT_SOURCES.md` (verified data sources). Builders implement this document literally.
- **Citation note:** references of the form `PRD §N` and `DESIGN.md §N` point to the project's product requirements and design-system specifications, which are retained privately and are not part of this public release; the section numbers are kept for traceability.
- **Status:** Architecture for an independent, unapproved concept (PRD §1.1). Everything here is buildable with data that verifiably exists; where source data is absent, the route/feature is specified to render empty or be omitted rather than invented (the no-invented-content rule, §6.7).
- **Revision 1 (2026-10-23):** first complete version, written to resolve the plan-review blockers (missing architecture document; unbuildable topics; unspecified guest extraction; unresolved audio/video strategy) and the reviewed risks (archive-row HTML validity, E2E coverage, performance measurement, translucent-surface budget, sponsor-block rules, sync freshness ownership, environment-variable decision, webfont count).

## 0. Grounding: what was read and run in this pass

Read in this session (workspace paths):

- `the product requirements (kept private)` in full — routes (§4), content model (§5), technical standards (§8), security (§9), testing (§13).
- `docs/CONTENT_SOURCES.md` in full — feed anatomy, enclosure signing (§"Fetching audio"), guest/sponsor/chapter signals, platform links, data limitations.
- `the design system spec (kept private)` in full (Revision 2) — tokens, layouts (§5), copy direction (§7), open items (§9).
- `tests/fixtures/tabaghe16-feed-fixture.xml` (7 representative items incl. the multi-guest special, the `[English]` CDATA title, EP145's sponsor irregularity, the Anchor-era Episode 1), `tests/fixtures/tabaghe16-episodes.json`, `tests/fixtures/tabaghe16-chapters-ep211.json`, `tests/fixtures/README.md`.

Checks run live (2026-10-23, all by the author of this document):

1. **Dependency versions** — `npm view <pkg> version` and `npm view <pkg>@<v> peerDependencies engines` for every package in §2. Versions and peer-range justifications below are quoted from those commands, not guessed.
2. **Extraction-rule validation against the live feed** — a Node prototype of the §6 rules was run against `https://feeds.acast.com/public/shows/tabaghe16` (fetched programmatically; the raw XML was never read into context, only computed digests). Results cited inline in §6.1 and §6.4. The feed now has **215 items**; the newest is **EP 213** («کامپیوتر کوانتومی چیست؟ | رامیس موثق | MIT PhD, ex-Google/IBM», published 2026-10-23) — one more than at the 2026-10-22 research baseline, confirming the PRD's rule that episode counts and "latest episode" are dynamic and must never be hard-coded (PRD §2.2).
3. **XML parser safety** — `fast-xml-parser@5.11.2` installed locally and fed an external-entity payload and an internal-entity-expansion payload; observed behavior is quoted in §8.2.

## 1. System overview

A Persian-first, right-to-left **statically-prerendered SvelteKit site**: a CLI sync fetches the official Acast RSS feed, extracts and validates episode data into committed JSON stores, and every public page is server-rendered (prerendered) from those stores at build time. There is **no runtime server, no database, no admin panel** — by decision (§4), justified against PRD §8.1's database clause and §4.2's admin-safety clause.

```mermaid
flowchart LR
  subgraph build["Build-time (pnpm run sync + pnpm run build)"]
    F["Acast RSS feed\nfeeds.acast.com/public/shows/tabaghe16"] -->|allowlisted fetch,\nTLS, 30s timeout, 10 MB cap| S["scripts/sync.ts\nfast-xml-parser + zod"]
    S -->|validate + extract\n(episodes, chapters, sponsors,\ntitle/guests, slugs)| E["data/store/*.json\n(committed JSON store)"]
    O["data/overrides.json\n(editorial, committed)"] --> L
    E --> L["+page.server.ts loaders\n(SvelteKit, prerender)"]
    L --> P["Static HTML + assets\n(adapter-static)"]
    S -->|regenerate| SI["static/search-index.json"]
  end
  P --> B["Static host\n(any static file host)"]
  U["Visitor browser"] --> B
  U -->|"audio playback: GET enclosure\n(Range), per request"| AC["sphinx.acast.com\n302 → signed stitcher2.acast.com\n(expiring; never cached/persisted)"]
```

Why prerendered-static rather than a running SSR server (decision, recorded for `the project decision log (kept private)`):

- All data changes only through `pnpm run sync` + git commit (§4), so request-time rendering buys nothing; prerendered HTML **is** server-rendered HTML for crawlers (satisfies PRD §8.1 "server-side rendering for public episode pages and crawlable metadata").
- It removes the entire runtime attack surface: no server-side fetch endpoints (SSRF surface = sync CLI only), no sessions, no cookies, no CORS, no rate-limit obligations (the security baseline "rate-limit public search/contact endpoints if they accept requests" — ours accept none).
- the content model.2.5 ("if a source is unavailable, the site must not go blank") becomes structural: a feed outage can only affect the next build, never a served page.
- PRD §8.1 permits a simpler persistence model when it is "demonstrably simpler and safer for the target host" and requires the decision to be recorded — §4 records it.

**Deployment freshness contract:** data freshness equals commit frequency. `docs/DEPLOYMENT.md` owns the recurring refresh path (`pnpm run sync && git commit && deploy`); the only public surface of sync status is the stale-data banner (§11.3).

## 2. Stack and versions (verified 2026-10-23)

Package manager: **pnpm** (sole package manager, lockfile committed — PRD §8.1). Node `>=22.17` (`@sveltejs/kit@3.1.0` engine floor, verified via `npm view @sveltejs/kit engines`; engines field: `">=22.17"`; 24.x LTS recommended locally).

| Package | Version | Role / why |
| --- | --- | --- |
| `svelte` | **5.57.2** | UI framework (PRD §8.1; kit peer range `^5.57.1` verified). |
| `@sveltejs/kit` | **3.1.0** | Routing, prerendered server loaders, project conventions. |
| `@sveltejs/adapter-static` | **4.0.0** | Emits a fully static build with `fallback: "404.html"` (§9.1). |
| `@sveltejs/vite-plugin-svelte` | **7.3.1** | Svelte compilation (kit peer `^7.0.0` verified). |
| `vite` | **8.3.5** | Dev server and build (kit peer `^8.0.12` verified). |
| `typescript` | **6.0.3** | Strict TS. **Not** 7.0.2: `npm view` shows latest is 7.0.2, but `svelte-check@4.7.7` peers `^5.0.0 \|\| ^6.0.0` and `@sveltejs/kit@3.1.0` peers `^6.0.0` — 6.0.3 is the newest version inside every tool's verified peer range. |
| `svelte-check` | **4.7.7** | Type checking for `.svelte` + project (the `check` gate). |
| `fast-xml-parser` | **5.11.2** | RSS parsing: non-validating, pure JS, throws on external entities (verified, §8.2). |
| `zod` | **4.6.7** | Schema validation at the feed boundary and on every store read (PRD §8.2). |
| `sanitize-html` | **2.18.1** | Narrow-allowlist HTML sanitization of feed descriptions (§6.5; the security baseline). |
| `vitest` | **5.0.5** | Unit/integration tests (PRD §8.1). |
| `@playwright/test` | **1.64.1** | E2E, viewport matrix, reduced-motion emulation, route interception. |
| `@axe-core/playwright` | **4.14.0** | Automated accessibility checks inside Playwright (PRD §13.5). |
| `eslint` | **10.13.0** | Linting (`eslint-plugin-svelte` peer `^8.57.1 \|\| ^9 \|\| ^10` verified). |
| `eslint-plugin-svelte` | **3.23.1** | Svelte-aware lint rules. |
| `prettier` / `prettier-plugin-svelte` | **3.9.10 / 4.1.1** | Formatting; `lint` runs `prettier --check` so formatting is gated. |
| `tsx` | **4.23.15** | Runs `scripts/sync.ts` (TypeScript) without a build step — the `sync` script. |
| `@types/sanitize-html`, `@types/node` | current | Type support for the above. |

Runtime dependencies are exactly: `svelte`, `@sveltejs/kit`, `@sveltejs/adapter-static`, `@sveltejs/vite-plugin-svelte`, `fast-xml-parser`, `zod`, `sanitize-html` — everything else is devDependencies. The site ships **no client framework beyond Svelte hydration** and **no animation library**: the design system spec (kept private)'s motion system is CSS keyframes + one small Svelte action (`use:wave`), which is explicitly sufficient (the design system spec (kept private) §6; PRD §8.1 "native CSS/Svelte transitions should remain the default").

Fonts (resolve the one-vs-three webfont conflict in the design system spec (kept private) §9.1 — this document is authoritative for the scaffold stage): **three families, self-hosted** under `static/fonts/` with their OFL 1.1 license texts (licenses verified in the design system spec (kept private) §0): `Estedad` variable (display), `Vazirmatn` variable (body/UI), `IBM Plex Mono` regular (Latin-only utility). Preload only the two variable files; IBM Plex Mono loads at normal priority. First-view font budget ≤ 350 KB woff2 (the design system spec (kept private) §3.1), enforced in the performance pass (§14). Pin exact font versions in `package.json` via a font download script (`scripts/vendor-fonts.mjs`, run once by the scaffold stage; output committed) rather than fetching at build time.

## 3. package.json scripts (exact)

The automated gates run `pnpm run <script>` after every build stage, so these are the contract; all must be real and green from the scaffold stage onward (scaffold may use `vitest run --passWithNoTests` until the data stage replaces it — per the build plan, not a permanent state).

```jsonc
{
  "scripts": {
    "dev": "vite dev --port 5173",
    "build": "vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "sync": "tsx scripts/sync.ts"
  }
}
```

- `dev`/`preview` on fixed ports (5173/4173) — Playwright's `webServer` uses `build` + `preview` on 4173 with `--strictPort` so a port clash fails loudly instead of silently testing a stale server.
- `sync` accepts `--input <path/to/file.xml>` to run against a local fixture instead of the network (used by tests and by reviewing a feed change offline); the live URL is **not** configurable — it is a frozen constant (§8.1).
- `scripts/screenshots.mjs` exists as a file (run with `node scripts/screenshots.mjs` against the preview server); it is not a package script because the visual-review stage invokes it directly.
- Gates per stage: scaffold `lint, check, build` · data layer `lint, check, test, build` · all later stages `lint, check, test, build` · test stage and final gate add `test:e2e`.

## 4. Persistence decision — committed, validated JSON stores (no admin, no DB)

**Decision (for `the project decision log (kept private)`):** the persistence model is committed JSON files under `data/`, written only by `scripts/sync.ts`, validated by zod on both write and read, with editorial overrides in a separate committed file. No PostgreSQL, no SQLite, no admin panel.

Justification against the brief: PRD §8.1 prescribes PostgreSQL *only* "if authenticated administration is included" — admin is omitted (PRD §4.2's safety clause: "If real authenticated administration cannot be completed safely, omit it from the released build and document a simple, maintainable content-maintenance workflow instead"; a concept build with no deploy target has no secure credential story). A git-committed store gives this project, for free, what a database would add: durable history (rollback = `git revert`), reviewable data diffs (every sync's effect is a visible diff), atomic cutover (§11.1), and zero infrastructure. The store size (215 episodes ≈ 1–2 MB JSON) is trivially held in git. the content model.1's "Editorial override" and "Sync run" entities are preserved as files (`data/overrides.json`, `data/store/sync-run.json`).

### 4.1 Store layout (all committed; all validated by zod schemas in `src/lib/server/schema.ts`)

```
data/
  store/
    episodes.json      # Episode[] — source-synced records keyed by feed GUID (§5.1)
    people.json         # Person[] — only guests that passed the §6.1 extraction gate + the host
    sync-run.json       # SyncRun — last run's status; lastSuccessfulSyncAt drives the stale banner
  overrides.json        # editorial overrides; never written by sync (§4.2)
  topics.json           # editor-curated topics; empty list by default (§9.4)
```

`static/search-index.json` (generated by sync, committed) is a derived build artifact of the store, not a source of truth.

### 4.2 Overrides — explicit separation (the content model.1)

`data/overrides.json` maps episode GUIDs to curated values. Allowed override keys (zod-validated): `featured: boolean` (home featured slot; default = latest episode), `note: string` (editorial note, shown under the description), `hide: boolean` (never render this episode). Sync **never** reads or writes this file; loaders merge it over the store at read time, so "a feed refresh can never silently erase a valid local override" is true by construction — the two files never touch.

### 4.3 Content-maintenance workflow (replaces the admin panel)

1. `pnpm run sync` — fetches, validates, atomically updates `data/store/*` (§11.1).
2. Review the git diff (data changes and any newly-extracted guest identities are visible — §6.1e).
3. Commit. Deploy host rebuilds (or CI builds) — `docs/DEPLOYMENT.md` documents this as the recurring refresh path and any scheduler wiring.

## 5. Domain model (typed, zod-validated; missing values stay missing)

`src/lib/server/schema.ts` defines the zod schemas and exports the inferred strict TypeScript types. Every field is either copied from the feed, derived from the feed by a §6 rule, curated (§4.2), or `null` — never invented (the no-invented-content rule, §5.1).

### 5.1 Episode (`data/store/episodes.json`)

| Field | Type | Source / rule |
| --- | --- | --- |
| `guid` | string | Feed `<guid>` (Acast episode ID; `isPermaLink="false"`). Stable primary key; upsert key (§11.1). |
| `slug` | string | §6.2 episode slugs — stable, unique, never derived from episode numbers (CONTENT_SOURCES.md "Data limitations" #2). |
| `episodeNo` | number \| null | `itunes:episode` verbatim when present; **display-only name-tag**, never a sort key and never parsed from titles (sort by `publishedAt`, always). Missing on 2 real items → null. |
| `season` | number \| null | `itunes:season` (1 old item). |
| `titleSource` | string | Raw `<title>` verbatim. |
| `titleHeadline` | string \| null | §6.1 split — the editorial headline; null means "render `titleSource` whole". |
| `titleByline` | string \| null | §6.1 split — guest/role side; null when no confirmed guest. |
| `roleText` | string \| null | §6.1 — role/affiliation fragment(s) from the guest segment. |
| `publishedAt` | string (ISO UTC) | Normalized `<pubDate>`. The only ordering key. |
| `durationSeconds` | number \| null | Parsed from `itunes:duration` (`H:MM:SS`; tolerate `M:SS`). |
| `audioUrl` | string \| null | Enclosure URL, https-only, host must be `sphinx.acast.com`, path shape `/p/open/s/<showId>/e/<episodeId>/media.mp3` (§8.3). Never resolved, never re-validated by HEAD (§7.1). |
| `audioBytes`, `audioType` | number \| null, string \| null | Enclosure attributes. |
| `imageUrl` | string \| null | `itunes:image` https URL on `assets.pippa.io`; null when absent (alt strategy per the design system spec (kept private) §4). |
| `acastPageUrl` | string \| null | Item `<link>` when its host is `shows.acast.com`; otherwise derived `https://shows.acast.com/tabaghe16/episodes/<acast:episodeUrl>` when `acast:episodeUrl` exists; else null (Anchor-era items keep null — their legacy `<link>`s are degraded redirects, CONTENT_SOURCES.md:94). |
| `videoUrl` | string \| null | Item `<link>` when host is `youtu.be`/`youtube.com`, normalized to `https://www.youtube.com/watch?v=<ID>`; else **null** (§7.3). |
| `guestSlugs` | string[] | Slugs into `people.json`; empty array when no guest passed the §6.1 gate. |
| `chapters` | Chapter[] \| null | §6.3; null when fewer than 3 valid chapter lines. |
| `chapterLinesRemoved` | boolean | Whether chapter lines were extracted out of the prose (§6.3c). |
| `sponsor` | { heading: string; entries: SponsorEntry[] } \| null | §6.4; null when the block did not validate. |
| `descriptionHtml` | string | Sanitized HTML of the description (§6.5), with extracted chapter lines and the Acast footer removed (both rendered separately — footer as the «میزبانی روی آکست» fine print, the design system spec (kept private) §5.5). |
| `descriptionExcerpt` | string | First ~200 chars of sanitized text — cards and meta description. |
| `hostedOnAcast` | string \| null | The Acast footer sentence verbatim, when present (kept, per CONTENT_SOURCES.md:129). |
| `lastSeenAt` | string (ISO UTC) | Set by every successful sync that includes the item (the content model.1). |

### 5.2 Person (`data/store/people.json`)

Created **only** by the §6.1 gate (title side matched to the episode's own bio anchor, or a host alias). `slug` (§6.2), `displayName` (source verbatim, edge-trimmed of bidi controls), `isHost` (boolean; the one host record is pinned from the channel's `itunes:author`), `roleText` (per-episode roles are NOT copied here; the person page lists per-episode bylines instead), `episodeSlugs` (derived at read time; not stored), `image: null` (**no portrait source exists** — CONTENT_SOURCES.md:23,28; portraits are out of scope until a rights-cleared source is verified, PRD §6.7), `bio: null` (no verified person-level bio source exists; bios remain episode content). No bios, no roles, no images are ever generated to fill these fields.

### 5.3 Chapter, SponsorEntry (inlined in Episode)

`Chapter = { timeRaw: string; timeSeconds: number; label: string }` (shape proven by `tests/fixtures/tabaghe16-chapters-ep211.json`). `SponsorEntry = { text: string; url: string }` — text verbatim from the source block, url https and policy-checked (§6.4).

### 5.4 SyncRun (`data/store/sync-run.json`)

`{ startedAt, finishedAt, status: "ok" | "failed", counts: { fetched, new, updated, unchanged, skippedInvalid }, lastSuccessfulSyncAt, error?: string }`. `error` is a sanitized message class (e.g. `"feed fetch failed: timeout after 30000ms"`), never a stack trace or secret-bearing URL (the content model.1).

### 5.5 Topic (`data/topics.json`)

`{ slug, title, description, episodeGuids: string[] }[]` — **editor-curated only** (§9.4). Ships as `[]`.

## 6. Extraction rules (canonical, deterministic, test-first)

These rules are the single source of truth for what the store contains. They are implemented as pure functions in `src/lib/server/extract/` and must be covered by fixture-driven unit tests (§13.1) before any page consumes their output. **No other module may re-derive titles, guests, chapters, or sponsors** — pages render store fields only.

### 6.1 Title split and guest extraction

**Problem being solved.** 164 of 215 live titles contain a `|` separator, but the guest side is not fixed: the feed mixes `EP212 - <topic> | <name>، <role>` (guest after the pipe) with `EP 211 - <name> | <topic>` / `EP 210 - <name> | <role>` (guest before the pipe), multi-guest lists («فراتر از استارتاپ | مهراد هیدن، سعید رحمانی، سهیل» — fixture line 94, where the third "guest" is the host), two-pipe titles («EP 213 - <topic> | <name> | <role>»), hyphen-separated old-era titles («Episode 154 - Reza Madad - <topic>»), and old-era `Episode N - <name>` titles with English names and English bios. A naive "guest = after the pipe" rule mislabels roughly half the recent archive; keyword-mining or transliteration matching is forbidden (PRD §6.7; no invented data).

**The anchor.** Per CONTENT_SOURCES.md ("Guests": "The guest's bio opens the description"), the episode's own description opens with the guest's bio. The rule set therefore confirms a title fragment as a guest **only when the episode's own bio anchors it** — same-script, normalized, no transliteration. Failure mode is always "render the whole title, no guest record" — never a wrong identity.

**Algorithm (implement exactly; all steps pure and unit-testable):**

a. **Prefix strip.** From the raw title, strip a leading episode-tag prefix matching `^\s*(ep\s*\d+|episode\s+\d+|\d+)\s*[-–—:،]?\s*` (case-insensitive; tolerates `EP212 -`, `EP 211 -`, `187 –`, `Episode 145 -`), then a leading bracket marker `^\[[^\]]*\]\s*` (e.g. `[English]`). The displayed name-tag chip always comes from `itunes:episode`, never from this prefix (the design system spec (kept private) §3.3-2).

b. **Segments.** Split the remainder on `|` (U+007C with optional surrounding spaces/bidi controls) into segments; then split every segment on **spaced dashes** (` - `, ` – `, ` — `; never intra-word hyphens like `ex-Google`). Each segment is split into parts on `،` and `,`. All positions are recorded.

c. **Bio anchors** — from the description's plain-text blocks (blocks = split on `<p>`/`</p>`/`<br>`, tags stripped):
   - **P1 (opening comma-run):** the first block's opening run up to its first `،`/`,` (1–4 tokens), if the block starts with it (e.g. «شیرین مجرد» from «شیرین مجرد، مدیر محصول گوگل …»; «آتوسا» from «آتوسا، …»).
   - **P-open (opening token-run):** the first block's 3-token and 2-token prefixes (catches «نگار صابریان از مدیران ارشد…» → «نگار صابریان»; «کوروش کوچکیان صبور …»).
   - **P2 (lead-in):** in blocks 0–1, a run following «… این قسمت، با <name>،» (the EP145-style Persian lead-in).
   - **P4 (Latin, all blocks):** a Latin opening run of **2–3 capitalized tokens** at the start of *any* block, bounded by `is|was|has|had|a|an|the|CEO|founder|PhD|MD|VP|role words…` or a comma (e.g. "Hamid Pourjam" from "Hamid Pourjam is …" in the English bio section; "Dan Vahdat" from "Dan Vahdat, CEO of Huma"). **Latin anchors require ≥2 tokens** — a lone "Mohsen"/"ChatGPT" is not an identity anchor.
   - **Host aliases:** `سهیل`, `سهیل علوی`, `Soheil Alavi` (the latter two from the channel's `itunes:author`; «سهیل» documented as the bare-given-name alias used by the EP190 title).

d. **Match rule.** A title *part* is a confirmed guest iff `norm(part)` equals `norm(anchor)`, or `norm(part)` starts with `norm(anchor) + " "` (token-prefix; Latin anchors additionally require the ≥2-token rule), or the part is a host alias. `norm` is the shared search normalizer (§6.6). Both sides are edge-trimmed of bidi controls (ZWNJ **inside** words is always preserved — fixture README). A part in the `NON_NAME` denylist (below) never matches.

e. **Winner and output.** Among confirmed parts, take the one earliest in title order (segment index, then part index); its **segment** is the guest segment. All other confirmed parts of that segment are also guests (multi-guest). Remaining parts of that segment become `roleText`. `titleHeadline` = the token-richest non-guest segment (ties → earliest); further non-guest segments append to `roleText`. `titleByline` = the guest parts joined with «،» + «و» before the last (the «با» prefix is added at render time, never stored). If **no** part confirms: `titleHeadline = null`, `titleByline = null` — the page renders `titleSource` whole, with its pipe, and **no person record is created**. No-pipe titles use the same cascade over their single candidate segment; `Episode N - <name>` old-era items confirm only via P4.

f. **`NON_NAME` denylist** (seeded, extend only by committed change with a test): `«هوش مصنوعی»`, `"artificial intelligence"`, `"machine learning"`, `«یادگیری ماشین»`, `"chatgpt"`, `"openai"`, `"google"`, `"apple"`. Rationale: probe runs showed topic/brand phrases that otherwise pass the anchor match («هوش مصنوعی» matched in 2 episodes' bios; "ChatGPT" matched a bio opening "ChatGPT is …"). This is a curated, reviewable list — the same editorial-curation principle as §9.4 topics, not keyword mining.

g. **`من، X و Y` enumerator.** If blocks 0–1 contain `من،? <partA> و <partB>` for two parts of the same title segment, both parts are confirmed guests (catches the EP190 special's «مهراد هیدن» and «سعید رحمانی» whose narrative bio does not open with the names).

**Validated against the live feed (2026-10-23, 215 items):** 79 episodes yield confirmed guests (80 distinct persons, incl. the host; 1 repeat guest — Farokh Shahabi ×2); 104 pipe-titles and 32 no-pipe titles render whole. Era coverage: confirmed guests exist in 2020–22, 2023–24, and 2025–26 buckets, so `/people` has real navigation value (PRD §4.1). Spot-checks (each pinned as a unit test in §13.1): EP212 → headline «رقابت برای ساخت هوش مصنوعی شخصی», guest «شیرین مجرد», role «مدیر محصول گوگل»; EP 211/EP 210 → guest from the *left* side of the pipe; EP 213 (two pipes) → guest «رامیس موثق», role "MIT PhD, ex-Google/IBM"; EP 190 → three guests incl. host-as-guest; Episode 154/155 → hyphen-split names; EP 203, EP 145, EP 1 → whole-title render (no Latin↔Persian transliteration is ever attempted). People pages exist only for stored persons; a person's episodes are exactly the episodes whose `guestSlugs` contain them.

### 6.2 Slugs

- **Episode:** derived from stable feed fields, never from episode numbers (page slugs mismatch numbers — CONTENT_SOURCES.md "Data limitations" #2): `slug = <acast:episodeUrl>` when present and URL-safe (e.g. `215-shirin-mojarad`, `korosh-koochekian-sabor`), else `ep-<guid>`. Collisions resolve deterministically with `-2`, `-3` suffixes in `publishedAt` order. Stable across syncs.
- **Person:** `slugify(displayName)` — Persian kept as-is (ZWNJ stripped, spaces → `-`, lowercased Latin, punctuation stripped), e.g. `شیرین-مجرد`, `hamid-pourjam`; host gets `سهیل-علوی`. Collision → `-2` suffix in first-appearance order. Persian slugs are percent-encoded by the router; canonical URLs use the encoded form consistently.
- **Topic:** curated slug in `data/topics.json` (same slugify).

### 6.3 Chapters (from description text only — no structured element exists)

a. **Line shape:** a chapter line = optional bidi controls, then a timestamp `M:SS` | `MM:SS` | `HH:MM:SS` (tolerate minutes > 59 — real data has `69:30`; convert to seconds), then any mix of `space`, ZWNJ (U+200C), LRM (U+200E), RLM (U+200F), FSI/PDI (U+2066–U+2069), ` | `, ` - `, `–`, then a non-empty label (≤ 120 chars). All five separator styles attested in CONTENT_SOURCES.md:50-58 and the fixture must parse.
b. **Threshold:** a chapter list exists only if **≥ 3** valid lines are found; 1–2 stray timestamps do not create one. Sponsor extraction (§6.4) runs first; chapter extraction does not touch the sponsor area.
c. **Extraction:** confirmed lists are removed from the description prose (`chapterLinesRemoved: true`); non-matching or sub-threshold lines stay in prose verbatim. Records sort by `timeSeconds`; duplicates merge (first label wins).
d. **Bounds:** when `durationSeconds` exists, stamps ≥ duration are kept but flagged; the player clamps seeks to the media's real duration at runtime (the content model.4 — seek only after metadata is available and within the media duration).
e. Reference output format: `tests/fixtures/tabaghe16-chapters-ep211.json`; ~51 of 215 live items currently yield ≥3 chapter lines (probe, 2026-10-23; moves with the feed — never hard-code it).

### 6.4 Sponsor blocks

a. **Heading match (exact, normalized):** a block whose normalized text equals «حامیان این قسمت» or «اسپانسر این قسمت» (trailing `:` tolerated, stripped). These are the only attested forms (live-feed census 2026-10-23: «حامیان این قسمت» in 21 items, «اسپانسر این قسمت» in 30). Sponsor membership is per-episode and time-sensitive (CONTENT_SOURCES.md) — never a show-level constant.
b. **Sponsor area:** the heading block plus following sibling blocks, ending at the Acast footer line, a linktr.ee-only line, or the next recognized block type.
c. **Entry validation:** an entry = one block containing (i) ≥1 `https://` URL whose host is a public DNS name and **not** in the never-allow set {`linktr.ee`, `redl.ink`, `spoti.fi`, `acast.com`} (the show's own hub + verified-degraded legacy hosts — CONTENT_SOURCES.md:94-98), and (ii) a non-URL text run of ≥ 2 words (the blurb, kept **verbatim** — copy is never rewritten, the security baseline). URL-only or blurb-less lines are not entries.
d. **Fall-through:** if the area yields zero valid entries, `sponsor = null` and **every line of the area, including the heading, remains in the description prose verbatim** (nothing is silently dropped or mangled; the design system spec (kept private) §5.5). Fixture case: EP145's «اسپانسر این قسمت» + «Everywhere else https://linktr.ee/…» falls through entirely (fixture line 146).
e. **Rendering contract:** the heading keeps the source's own wording in the visually separated box per the design system spec (kept private) §7; links carry `rel="noopener noreferrer"`; the label is never styled as editorial content.

### 6.5 HTML sanitization (feed descriptions → `descriptionHtml`)

`sanitize-html` with the narrow allowlist: tags `p, br, a, strong, em, b, i, ul, ol, li, blockquote`; on `a` keep only `href` (must be `https:` or `mailto:`, else the attribute is dropped and the text kept), and force-add `rel="noopener noreferrer" target="_blank"`; **everything else stripped** — `script`, `iframe`, `img`, `style`, event handlers, `class`, `id` (the security baseline). Unit tests assert: script/iframes removed, `javascript:` hrefs neutralized, Persian text/ZWNJ preserved, `<br>` kept.

### 6.6 Normalization (`norm`) — one shared function for search, matching, and slugs

Arabic Yeh→Persian Yeh (ي→ی), Arabic Kaf→Persian Kaf (ك→ک), strip Arabic diacritics (`U+064B–U+065F, U+0670, U+06D6–U+06ED`), Persian/Arabic digits→ASCII, strip bidi controls (LRM/RLM/FSI/PDI/ALM) and ZWSP/ZWNJ **for matching only**, collapse whitespace, lowercase Latin. Original display text is never mutated. Applied everywhere search/matching happens (the content model.6).

## 7. Audio and video strategy (per verified source behavior)

### 7.1 Direct-enclosure playback — resolve per request, never cache

The player consumes the item's **enclosure URL as stored** (`https://sphinx.acast.com/.../media.mp3`) in a native `<audio>` element. The 302 to the signed, expiring `stitcher2.acast.com` URL happens **inside the browser's media stack, per playback request** — the signed URL never enters application code, is never cached, never persisted, and never appears in the store, HTML, or logs (CONTENT_SOURCES.md:33-39: "never cache or persist resolved audio URLs"). Because the stored sphinx URL is itself a stable redirector, embedding it in prerendered HTML is correct and needs no server round-trip of our own.

Hard rules:

- **Never validate enclosures via HEAD** — a HEAD returns a misleading `200 text/plain` with a 2-byte body (CONTENT_SOURCES.md:36-37). Sync validates the URL *shape* only (§8.3); it does not fetch media at all.
- **Never proxy, re-host, mirror, or persist audio** (CONTENT_SOURCES.md "Content-rights concerns"; the content model.3, §1.4). The application never issues media requests server-side.
- Optional liveness probe: sync may issue **one** ranged GET (`Range: bytes=0-15`) against the newest enclosure and log `302→206/audio-mpeg` as a diagnostic; failure is recorded, never fatal.

### 7.2 Player component (`src/lib/components/AudioPlayer.svelte`)

Native `<audio preload="none" src={episode.audioUrl}>` with a custom control surface (the design system spec (kept private) §5.5/§5.6): play/pause (wave button, ≥44×44 target), progress/seek bar (accent fill ≥3 px, always paired with text state — never color alone), current time/duration in Plex Mono inside `<bdi dir="ltr">`, volume, playback speed (native, tested, optional), Persian `aria-label`s, full keyboard operation. States, all real: idle → loading (`waiting` event → «در حال بارگذاری…» on the control) → playing (equalizer cue only while actually playing) → paused; **error** (`error` event → the the design system spec (kept private) §7 copy «پخش از سرور صدا برقرار نشد.» plus real fallback links: «شنیدن در اسپاتیفای / اپل / فید آکست»). No autoplay (the content model.5). The sticky mini-player (the design system spec (kept private) §5.6) is dismissible and preserves state intentionally.

### 7.3 Chapters ↔ player

Chapter rows are buttons that set `audio.currentTime` **only after `loadedmetadata`** and only for targets within the real media duration (clamp §6.3d); the playing chapter is marked with the accent tick + text cue. Keyboard operable; stamps always `<bdi dir="ltr">`.

### 7.4 Video rule (replaces any unconditional watch button)

«تماشا در یوتیوب» renders as a per-episode action **only when `episode.videoUrl` is non-null** — at the 2026-10-22 baseline that is 3/214 items whose `<link>` host is `youtu.be` (CONTENT_SOURCES.md:30); the count may drift with the feed, the rule does not. Every other episode gets **no video control at all** (omitted, never inert — PRD §7.4), and its secondary action is «شنیدن در اسپاتیفای» (or the strongest verified platform). The channel-level «کانال یوتیوب» link lives in the footer/listen-band platform row only, never dressed as a per-episode action (the content model.2). **No YouTube iframes in v1** — external links only (the content model.5 permits this; embeds are a deferred item, §17), which keeps `frame-src 'none'` in the CSP.

## 8. Security boundaries

### 8.1 Surface model

Static build; the **only** outbound-fetching code in the project is `scripts/sync.ts` (a build-time CLI). At runtime there is no server, no API route that accepts input, no session, no cookie — search runs client-side over a static JSON file. Consequently: no runtime SSRF surface, no rate-limit obligation (the security baseline's conditional clauses do not trigger), no CORS. "Never accept a feed URL from an unauthenticated public request" (the security baseline) holds structurally: the feed URL is a frozen constant in `src/lib/server/config.ts` with no environment or request override; the only alternative input is `--input <local file>` (tests/offline review).

### 8.2 Fetch and parse safety (sync only)

HTTPS-only fetch with `AbortSignal.timeout(30000)`; response size cap **10 MB** (live feed ≈ 1.04 MB, measured 2026-10-23); follow ≤3 redirects, https targets only; retry ×2 with backoff (1 s, 4 s) on network/5xx errors. Parser: `fast-xml-parser@5.11.2` — **verified locally 2026-10-23**: an external-entity payload makes the parser throw `Error: External entities are not supported` under both `processEntities` settings, and a custom internal entity (`&b;` defined in DOCTYPE) is **not expanded** (output keeps the literal `&b;`). No XXE vector and no entity-expansion amplification; the 10 MB cap remains the primary input guard.

### 8.3 URL policy (every URL entering the store or HTML)

`https:` only — `javascript:`, `data:`, `file:`, and bare-relative URLs are rejected by zod refinements and by the sanitizer. Feed-derived URLs are additionally shape-checked: enclosures must match `sphinx.acast.com/p/open/s/<showId>/e/<episodeId>/media.mp3`; images must be `https://assets.pippa.io/...`; sponsor URLs per §6.4c. Platform links shown in footer/listen-band are **hardcoded constants** from CONTENT_SOURCES.md's verified table (never feed-derived), and every external link renders with `rel="noopener noreferrer"`.

### 8.4 Content Security Policy and headers

Meta-CSP in `src/app.html` (enforced for every served page):

```
default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' https://assets.pippa.io;
  media-src 'self' https://sphinx.acast.com https://stitcher2.acast.com;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  frame-src 'none';
  base-uri 'self';
  form-action 'none'
```

- `media-src` allowlists **both** Acast hosts — omitting the `stitcher2.acast.com` 302 target would kill playback (the reviewed blocker). No other media origin is ever added.
- `frame-src 'none'` matches §7.4 (no embeds in v1). `connect-src 'self'` = the search index only.
- `style-src 'self'` works with Svelte's scoped `<style>` elements. If a component ever needs a style *attribute* in markup, refactor it — `use:wave`'s `--wx/--wy` custom properties are set via `el.style.setProperty` (CSSOM), which CSP does not block, so no `'unsafe-inline'` is required.
- Meta CSP cannot express `frame-ancestors` or HSTS; these ship as **host headers** (§15.2): `frame-ancestors 'none'` (clickjacking, PRD §9.3), `Strict-Transport-Security: max-age=15552000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### 8.5 Secrets, environment variables (zero required)

No secrets exist anywhere in this project: public feed, static site, no accounts, no admin. **Zero environment variables are required** for install, dev, sync, test, build, or preview (decision to be recorded in `the project decision log (kept private)` — the reviewed risk). Exactly one **optional build-time** variable exists: `PUBLIC_ORIGIN` — the absolute origin used to build canonical URLs, the sitemap, and OG absolute URLs. Default (unset): `http://localhost:4173`, matching the preview server, so an unset build is honest about being local. `.env.example` contains only this variable with a comment and a placeholder origin. PRD §13.1's "validation of environment variables and required configuration" is implemented as a unit test over `src/lib/server/config.ts`: the config must load with an empty environment, and when `PUBLIC_ORIGIN` is present it must be a valid `https://` absolute URL or the build fails fast with a clear error.

### 8.6 Dependency and static checks

`pnpm audit` (resolve or document high/critical), `lint`, `check`, and the test suite run in CI on every push/PR (PRD §9.5, §14). No secrets in the tree; `.gitignore` covers `.env*` (except `.env.example`), `node_modules`, `.svelte-kit`, `build`, `test-results`, and `playwright-report`.

## 9. Route map and SEO

### 9.1 Routes (all prerendered; `adapter-static` with `fallback: "404.html"` = `src/routes/+error.svelte`)

| Route | Source of data | Renders when |
| --- | --- | --- |
| `/` (home) | store: featured (latest unless overridden), 6 recent, people strip, topics section, sync-run staleness | always |
| `/episodes` (archive) | `static/search-index.json` client-side; SSR skeleton = year-grouped rows from store | always |
| `/episodes/[slug]` | store by slug | slug exists, else 404 |
| `/people` | `people.json` | non-empty (validated: 80 records, 2026-10-23) |
| `/people/[slug]` | store (episodes by `guestSlugs`) | slug exists, else 404 |
| `/topics` | `topics.json` | **empty list → HTTP-equivalent redirect to `/episodes`** (§9.4) |
| `/topics/[slug]` | `topics.json` | slug curated, else 404 |
| `/about`, `/partnerships`, `/privacy` | static content + verified constants (CONTENT_SOURCES.md) | always |
| `/404` via `+error.svelte` | — | unknown routes |
| `/sitemap.xml`, `/robots.txt` | store + `PUBLIC_ORIGIN`, prerendered server endpoints | always |

No admin routes (§4). No `/search` route: inline archive search is complete and shareable by URL (PRD §4.1 marks a dedicated page optional); the 404 page carries the recovery search.

### 9.2 SEO mechanics (PRD §11.3)

- `<html lang="fa" dir="rtl">`; unique Persian `<title>` + meta description per route (templates in §9.3); description from `descriptionExcerpt` (≤160 chars) on episode pages.
- **Canonical URLs** absolute via `PUBLIC_ORIGIN` on every page; the archive's filter/sort state lives in the query string only (client-parsed on hydration, `history.replaceState`), so there are no crawlable filter combinations or thin pages.
- `sitemap.xml`: home, all episode slugs, people index + person slugs, topics when curated, about/partnerships/privacy — nothing else; `robots.txt` allows all and points at the sitemap.
- Open Graph/Twitter: card with episode artwork (`imageUrl`) on episode pages, show cover on the rest; titles/bilingual where the source supplies both.
- **Structured data**, emitted only with genuinely present fields and validated in E2E: `PodcastSeries` (home: name «طبقه ۱۶», url, author Person «سهیل علوی», inLanguage `fa`); `PodcastEpisode` (episode pages: name = `titleSource`, episodeNumber when non-null, datePublished, timeRequired ISO-8601 from `durationSeconds`, partOfSeries, associatedMedia AudioObject with the *stored* sphinx enclosure URL); `BreadcrumbList` (episode, person, topic pages); `Person` on `/people/[slug]` with **only** `name` and `url` — no `jobTitle`, no image, no affiliation unless `roleText` exists on that episode's byline. Nothing is emitted for pages whose required fields are null.
- Jalali dates display via `Intl.DateTimeFormat('fa-IR')` with the machine value in `<time datetime="…">` (the design system spec (kept private) §3.3-3); a unit test pins several known date conversions (the design system spec (kept private) §9.4).

### 9.3 Title/description templates (exact)

- Home: «طبقه ۱۶ — پادکستِ گفت‌وگو» / «آرشیو کامل ۲۱۵ قسمت گفت‌وگوهای طبقه ۱۶؛ جست‌وجو بر اساس مهمان، موضوع و تاریخ.» — **counts are interpolated from the store at render time**, never hard-coded (PRD §2.2; the feed grew to 215 items between the research baseline and this document).
- Episode: «{headline or titleSource} | طبقه ۱۶» + «با {byline}» fragment when present; description: excerpt.
- Person: «{displayName} — مهمان‌های طبقه ۱۶» / first-episode excerpt.
- Archive: «آرشیو قسمت‌ها — طبقه ۱۶» / «همهٔ قسمت‌ها؛ از تازه‌ترین تا نخستین.» (matches the design system spec (kept private) §7 labels).

### 9.4 Topics — editor-curated only (resolves the reviewed blocker)

**No topic data exists in the feed**: `itunes:keywords` is absent from all items, there are no per-item categories, and only show-level hashtags exist (CONTENT_SOURCES.md:28, verified). Keyword-mining descriptions into a taxonomy is the invented taxonomy PRD §6.7 forbids. Therefore: topics are a small **editor-curated deterministic list** in `data/topics.json` — each entry carries an explicit `episodeGuids` array; an episode belongs to a topic only by that explicit list. Never mined. The file **ships empty**, and while it is empty: the `/topics` route redirects to `/episodes`, the «موضوع‌ها» nav item and the home topics section are omitted (the design system spec (kept private) §5.1/§5.7 already specify the conditional rendering — the data stage must not fabricate pill counts to fill it). Curation is a human editorial act done via git commits; the decision and workflow are recorded for `the project decision log (kept private)`.

### 9.5 People — built, typographic, no portraits (resolves the reviewed blocker)

`/people` and `/people/[slug]` **are built** because the §6.1 gate yields a real directory (80 persons incl. the host; 79 episodes with confirmed guests — validated against the live feed, §6.1). Guest presentation is typographic everywhere — **no portraits ship** (no guest-imagery source exists; the feed carries only per-episode artwork on `assets.pippa.io` — CONTENT_SOURCES.md:23,28; PRD §6.7's rights rule). Person page: display name, host badge when `isHost`, the person's episodes (byline fragments + Jalali dates), and nothing else — no bio, no role, no image, until a verified source exists. The home «مهمان‌ها» strip renders because the directory is non-empty.

## 10. Search and discovery (deterministic, explainable — no AI, the content model.6)

### 10.1 Client search

- `static/search-index.json` (generated by sync): one record per non-hidden episode — `slug, epNo, headline, byline, guestNames, excerpt, normHaystack, yearJalali, yearGregorian, durationSeconds, hasChapters, hasVideo, topicSlugs`. At 215 episodes ≈ 100–150 KB raw / ~30–40 KB gzip; fetched lazily on first archive interaction (never on home load).
- Matching: `norm`-normalized substring over `normHaystack` (title + byline + guest names + excerpt) — Persian and Latin queries behave identically; input debounced ~150 ms with immediate feedback; loading/empty/error states designed (the design system spec (kept private) §7): empty state suggests removing a filter or searching a guest.
- Filters: topic (when curated), Jalali year, guest, media availability (chapters/video); sort: newest by `publishedAt` (default, only). Filter state lives in the URL query (`?q=&year=&topic=&guest=&media=`), parsed client-side on hydration — shareable, no server round-trip, no crawlable filter paths.

### 10.2 Related episodes (episode page)

Deterministic scoring, reasons surfaced as chips (the design system spec (kept private) §7): shared confirmed guests (+3 per person), then shared curated topics (+2 per topic); rank by score, tie-break newest `publishedAt`; cap at 3; each row shows its reason chip («مهمان مشترک» / «موضوع مشترک»). If no rule yields any candidate, the section is omitted entirely — never padded with "recent" episodes under a false "related" label.

### 10.3 List-row interaction pattern (fixes the reviewed invalid-HTML risk)

Every list row with two actions (episode rows in archive, related rows, person-page rows) uses the **stretched-link pattern** (the design system spec (kept private) §5.3): the row is a plain `position: relative` container; the headline text is an `<a>` stretched over the row via an `::after { position:absolute; inset:0 }` overlay; the play control is a **separate sibling `<button>`** raised above the overlay (`position: relative; z-index: 1`). No interactive element ever nests inside another; tab order is link → play; both controls operate for mouse, touch, and keyboard. This is the only permitted row pattern.

## 11. Sync-to-SSR data flow and failure behavior

### 11.1 `scripts/sync.ts` — pipeline (exact order)

1. Load config (`src/lib/server/config.ts`): frozen `FEED_URL`, or `--input <file>` for fixtures/offline review. No env, no request input (§8.1).
2. Fetch (§8.2): https, 30 s timeout, 10 MB cap, ≤3 https redirects, retry ×2 (1 s, 4 s) on network/5xx only.
3. Parse with fast-xml-parser; map channel + items.
4. Per item: zod-validate raw fields → normalize (dates RFC→ISO UTC, durations, digits) → extract per §6 (title/guests, chapters, sponsors, links) → build an `Episode`. Items that fail validation are counted `skippedInvalid` and logged with their GUID — one bad item never aborts the run.
5. Upsert by `guid` against the previous store: existing record → update mutable fields, keep identity (`slug`, first-seen data); new record → create. **Idempotent:** running the same feed twice yields `new: 0, updated: 0` and byte-identical stores (unit-tested over the fixture, the content model.3). Episodes are never deleted by sync; `lastSeenAt` tracks presence, hiding is an override (§4.2) — upstream removals never break stable URLs (the content model.3 "preserve a historical episode's identity").
6. Rebuild `people.json` from all episodes' confirmed guests (+ host alias mapping), preserving existing person slugs.
7. **Atomic write:** assemble all output in memory → zod-validate the whole store → write each file as `*.json.tmp` → `rename()` over the old file. Any mid-write failure leaves the previous store fully intact.
8. Regenerate `static/search-index.json` (§10.1).
9. Write `sync-run.json`: `status: "ok"`, counts, `lastSuccessfulSyncAt: now`.
10. Print a sanitized summary: counts, **new/changed guest identities** (for human diff review — §6.1e), skipped GUIDs. No stack traces; there are no secrets in this system.

### 11.2 Store → SSR (build time)

Every page's data comes from `+page.server.ts` loaders that read the committed store files via `fs` at **prerender time**, re-validate with zod (the store is a hand-editable text file), merge `overrides.json` (§4.2), and return view models. Loaders never touch the network. `src/lib/server/store.ts` is the single read/merge/derive module (featured pick, year grouping, person→episodes index, related scoring §10.2, staleness §11.3). Pages render store fields only (§6 preamble).

### 11.3 Failure behavior matrix

| Failure | Behavior |
| --- | --- |
| Feed unreachable / timeout / 5xx after retries | Sync exits non-zero; store **untouched** (atomicity §11.1-7); `sync-run.json` gets `status: "failed"` + sanitized error; previously built site keeps serving last-good data — the public site never goes blank (the content model.2.5). |
| Feed malformed / oversized / TLS failure | Same as above (parse errors before any write). |
| Some items invalid | Those items `skippedInvalid`; all valid items sync; run status `ok`. |
| Store file hand-corrupted before build | Loader zod validation fails loudly at build with the file+schema named — the build refuses to serve invalid data rather than rendering nonsense. |
| Stale data (no successful sync for `STALE_AFTER_DAYS = 14`, constant in `config.ts`) | The archive renders the dismissible stale-data banner under the search bar: «آخرین همگام‌سازی با فید: {date}. تازه‌ترین قسمت‌ها ممکن است کمی بعدتر نمایش داده شوند.» (`--warning` on paper, the design system spec (kept private) §7). This is the **only** public SyncRun surface in an admin-less build (§1); the banner's data (`lastSuccessfulSyncAt`) is baked in at build time, matching the freshness-equals-commit-frequency model. |

`docs/DEPLOYMENT.md` owns the recurring refresh runbook (`pnpm run sync` → review diff → commit → rebuild), any scheduler wiring, rollback (`git revert` + rebuild), and how to disable external links safely if a source breaks (PRD §14 "Document" list).

## 12. File-by-file plan

```
package.json, pnpm-lock.yaml, tsconfig.json (strict), svelte.config.js (adapter-static, fallback "404.html"),
vite.config.ts (kit + vitest config), eslint.config.js, .prettierrc, .gitignore (§8.6), .env.example (§8.5),
playwright.config.ts (webServer: build+preview :4173 strictPort; route-block all external hosts)
scripts/sync.ts                 # §11.1 pipeline (run via tsx)
scripts/vendor-fonts.mjs        # one-time font vendoring → static/fonts/ + license texts (scaffold stage)
scripts/screenshots.mjs         # 1440/390 captures → docs/screenshots/ (test stage; run against preview)
src/app.html                    # lang="fa" dir="rtl", meta CSP (§8.4), font preloads, skip link
src/routes/+layout.svelte       # header/drawer/footer shell, <main id="main">, toasts
src/routes/+layout.server.ts    # site meta: counts (dynamic), staleness, nav conditionals (topics empty?, people non-empty?)
src/routes/+error.svelte        # Persian 404 + recovery search/links (also the 404.html fallback)
src/routes/+page.svelte|+page.server.ts                        # home (§9.1 rows)
src/routes/episodes/+page.svelte|+page.server.ts               # archive: SSR year-grouped rows; client search (§10.1)
src/routes/episodes/[slug]/+page.svelte|+page.server.ts        # episode detail; 404 unknown slug
src/routes/people/+page.svelte|+page.server.ts                 # directory (typographic)
src/routes/people/[slug]/+page.svelte|+page.server.ts          # person page; 404 unknown slug
src/routes/topics/+page.server.ts                              # redirect(307, '/episodes') while topics.json empty
src/routes/topics/[slug]/+page.svelte|+page.server.ts          # curated topic archive; 404 unknown
src/routes/about|partnerships|privacy/+page.svelte            # static content, verified constants only
src/routes/sitemap.xml/+server.ts, src/routes/robots.txt/+server.ts   # prerendered endpoints (§9.2)
src/lib/server/config.ts        # frozen: FEED_URL, allowlists, ORIGIN(PUBLIC_ORIGIN), STALE_AFTER_DAYS, platform links, host aliases, NON_NAME
src/lib/server/schema.ts        # zod schemas + inferred types (§5)
src/lib/server/store.ts         # read+validate+merge overrides+derive (§11.2)
src/lib/server/extract/feed.ts|title.ts|chapters.ts|sponsors.ts|sanitize.ts|normalize.ts|slugs.ts  # §6 pure functions
src/lib/components/             # Header, Footer, NavDrawer, EpisodeCard, EpisodeRow (stretched-link §10.3),
                                # AudioPlayer (§7.2), MiniPlayer, ChapterList, SponsorBox, PersonCard,
                                # TopicPills, SearchPanel, FilterSheet, StaleBanner, ShareToast, Skeleton
src/lib/actions/wave.ts         # use:wave — the design system spec (kept private) §6 (pointer origin, keyboard center, reduced-motion off)
src/lib/search/client.ts        # index fetch, norm matching, filters/sort (§10.1)
src/lib/seo.ts                  # title/description/JSON-LD builders + canonical helper (§9.2)
src/lib/dates.ts                # Jalali Intl formatting + <time> values (the design system spec (kept private) §3.3-3)
src/lib/styles/                 # tokens.css, base.css (RTL-first), wave.css, skeleton.css
static/fonts/                   # Estedad+Vazirmatn variable, Plex Mono regular, OFL license texts
static/search-index.json        # generated by sync; committed
data/store/*.json, data/overrides.json, data/topics.json   # §4.1
tests/unit/*.test.ts            # §13.1 matrix — fixtures from tests/fixtures/ (do not modify fixtures)
tests/e2e/*.spec.ts             # §13.3 matrix
.github/workflows/ci.yml        # documentation stage; same gates as local (PRD §14)
```

## 13. Test plan (mapped to PRD §13; fixtures in `tests/fixtures/` are the regression corpus)

### 13.1 Unit / integration (vitest, no network)

- **Feed parsing:** the 7-item fixture end-to-end → assert the parsed records equal the shape of `tabaghe16-episodes.json` (plus extraction outputs); missing fields, malformed RFC dates, malformed durations, duplicate GUIDs (second occurrence → `skippedInvalid`), oversize input rejected by the cap.
- **Normalization:** Arabic ي/ك→Persian, digit variants, diacritics, ZWNJ preserved in display text while ignored in matching.
- **Slugs:** episode (episodeUrl-derived, guid fallback), person (Persian slug), collision `-2` determinism; stable across two sync runs.
- **URL policy:** `javascript:`/`http:`/wrong-host enclosures and images rejected; sponsor never-allow hosts; sanitizer allowlist (§6.5) incl. script/iframe removal.
- **Chapters:** all five separator styles parse; `69:30`-style minutes convert; `< 3` lines ⇒ no list; EP211 golden test against `tabaghe16-chapters-ep211.json` (all 14 rows incl. the `01:44:00` HH:MM:SS tail); bounds flagging; extraction removes exactly the chapter lines from prose.
- **Sponsors:** both attested headings recognized; valid entry (blurb+https URL) extracted verbatim; EP145 irregular line falls through to prose untouched; heading-only or URL-only areas produce `sponsor: null` + untouched prose.
- **Title/guest extraction (§6.1):** fixture-pinned cases — EP212 (guest after pipe + role), EP 211/EP 210 (guest *before* pipe), EP 190 (multi-guest + «من، X و Y» enumerator + host alias «سهیل»), EP 203 and Episode 145 and Episode 1 (whole-title render, no guest record), plus synthetic cases: hyphen-split (`Episode 154 - Reza Madad - <topic>`), two-pipe (`EP 213 … | name | role`), `NON_NAME` denylist entries, and Latin 1-token anchor rejection.
- **Idempotency:** `sync --input fixture` twice → byte-identical stores, `new: 0, updated: 0`.
- **Config/env (PRD §13.1):** config loads with empty environment; `PUBLIC_ORIGIN` must be a valid `https://` URL when set, build fails fast otherwise (§8.5).
- **Dates:** Jalali conversions pinned to known pairs; `<time datetime>` Gregorian values.
- **Related scoring (§10.2):** shared-guest before shared-topic ordering, tie-break, reason chips, empty ⇒ omitted section.

### 13.2 End-to-end (Playwright; webServer builds production output and serves :4173; **all external hosts route-blocked by default** — sphinx/stitcher2/pippa/youtu.be — so the suite never touches third-party services, PRD §13.3 "no external network", §13.7)

The full PRD §13.3 matrix — the gated suite is this list, not a subset (resolves the reviewed E2E-gap risk; anything not implemented must be recorded in `the testing record (kept private)` with the reason):

1. Home loads with real recent episodes (≥ 6 cards; featured = latest by `publishedAt`).
2. Archive search: one Persian and one Latin term both return the expected fixture/store episode.
3. Filters combine and clear (year + guest; topic filter absent while uncurated).
4. Episode links open the correct stable detail page; unknown slug → 404.
5. **Audio player operable with a mocked enclosure** — `page.route` fulfills `media.mp3` with a tiny *generated* silent MP3 (checked in as a test asset, clearly fixture-based, never live external playback).
6. **Chapter seek:** clicking a chapter updates `audio.currentTime` (clamped to the mocked media's duration) and marks the row.
7. **Media failure:** `page.route` aborts the enclosure → error copy «پخش از سرور صدا برقرار نشد.» + platform fallback links visible.
8. **Missing image:** abort an artwork request → stone placeholder, no layout shift.
9. **Loading state:** delay the search-index response → skeleton rows in final geometry, then results.
10. External platform links carry the verified destinations and `rel="noopener noreferrer"` (href assertion, no navigation).
11. Mobile navigation opens/closes without trapping focus (focus in, focus returned, Esc).
12. **No horizontal overflow at 320, 360, 390, and 430 CSS px** (all four).
13. **Desktop layout at 768, 1024, 1280, 1440, and 1920 px** (home/archive/episode spot-checked).
14. Reduced-motion emulation suppresses the traveling wave (state change still immediate).
15. Keyboard: focus visible everywhere, player controls labeled, dialog focus return.
16. 404 route recovers; `/topics` redirects to `/episodes` while the curated list is empty.
17. axe (`@axe-core/playwright`) on home, archive, episode, people, partnerships — fails the suite on real violations.
18. RTL/bidi spot-checks: byline renders «با …» only when a guest is confirmed; Latin runs isolated `<bdi dir="ltr">`; digit policy (Persian prose digits, mono Latin time).
19. Stale banner: with a test store whose `lastSuccessfulSyncAt` is old, the banner shows; fresh store → absent.
20. JSON-LD parses and carries required fields on home + episode; canonical + OG tags present.

### 13.3 Accessibility, visual, performance, security (beyond the suite)

- **A11y:** automated axe in E2E (17) **plus** a manual keyboard/screen-reader-oriented review recorded in `the testing record (kept private)` with limitations (PRD §13.5 — automated tools alone are insufficient).
- **Visual QA:** `scripts/screenshots.mjs` at 1440/390 → the two structured review iterations of the build flow (PRD §13.4).
- **Performance (mandatory lab pass — resolves the reviewed risk):** run Lighthouse (or equivalent) against the preview server on **home, `/episodes`, and one episode page** at mobile emulation (plus one desktop pass), record tool, date, and scores in `the testing record (kept private)`, and budget §14 (fonts, filter) against them. PRD §11.1's honesty rules apply: lab scores are lab scores; no real-user INP/CWV claims until a public deployment exists.
- **Security:** `pnpm audit` (fix or document high/critical), secret scan of the tree and intended history, and the §13.1 policy tests; all dynamic checks target the local preview only (PRD §9.5, §13.7). No penetration-test claim.

## 14. Performance budgets and mitigations (measured, not assumed — PRD §11)

| Cost | Budget / mitigation |
| --- | --- |
| Fonts (first view) | ≤ 350 KB woff2: Estedad + Vazirmatn variable files preloaded (Arabic+Latin subsets), IBM Plex Mono regular loads lazily (the design system spec (kept private) §3.1). Measured in the §13.3 lab pass. |
| Grayscale filter (the design system spec (kept private) §4) | Applies only to media actually rendered; every archive image is `loading="lazy"`; year-group rows get `content-visibility: auto` so off-screen rows never pay the composite. If the lab pass regresses low-end TBT/INP proxies, swap the runtime filter for the static stone/paper duotone overlay (the design system spec (kept private) §4 fallback) — a one-token change. |
| Images | Fixed `width`/`height` + `aspect-ratio` (16:10) everywhere — zero layout shift; below-the-fold lazy; the home LCP element (featured artwork) preloaded with `fetchpriority="high"`. |
| Client JS | Svelte-only; no animation library (§2); `search-index.json` fetched lazily on first archive interaction (§10.1), never on home load. |
| Motion | transform/opacity/filter only — layout properties are never animated (the design system spec (kept private) §2.6), so CLS stays at the images' mercy, which is zero by the width/height rule. |
| Lab targets (directional) | LCP ≤ 2.5 s, CLS ≤ 0.1, TBT small at mobile emulation. Real-user CWV/INP are **not claimed** from lab data (PRD §11.1); no performance claim ships in README without the recorded §13.3 numbers. |

## 15. Deployment topology

1. **Target:** any static file host. Build pipeline: `pnpm install --frozen-lockfile` → `pnpm build` → publish `build/`. The committed store means **no sync runs in CI** — data changes only via the §4.3 workflow (sync locally → review diff → commit), which keeps CI hermetic and the data history reviewable.
2. **Headers:** meta CSP (§8.4) ships in the HTML; `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` require host headers — ship a `public/_headers` file (Cloudflare Pages format, portable mapping table) and document the per-host equivalents in `docs/DEPLOYMENT.md`. Honest limitation: `vite preview` cannot send these headers; the E2E suite asserts the meta CSP only.
3. **Ops runbook owner:** `docs/DEPLOYMENT.md` — recurring refresh (`pnpm run sync` + commit + rebuild), optional scheduler wiring on the host, rollback (`git revert` + rebuild), and how to disable external links safely if a source breaks (PRD §14).
4. **Visibility:** the concept deploys only to a private/preview environment until the podcast owner approves public release (PRD §12.1); instructions must not presume a public domain, and `PUBLIC_ORIGIN` stays unset (localhost default) for local builds.

## 16. Decisions this architecture makes (to be consolidated into `the project decision log (kept private)` by the documentation stage)

1. **No admin panel** — content maintenance is the CLI workflow of §4.3 (PRD §4.2 safety clause).
2. **Committed, zod-validated JSON store** instead of PostgreSQL (PRD §8.1's "demonstrably simpler and safer" clause; no admin ⇒ no §8.1 database requirement).
3. **Full prerender via adapter-static** — build-time server rendering satisfies the SSR/SEO requirement for a data-static site (§1).
4. **Topics: editor-curated deterministic list, ships empty; routes/nav/home-section conditional** — never keyword-mined (§9.4; PRD §6.7).
5. **Guest identity: bio-anchored extraction gate with canonical rules + tests; typographic presentation only; no portraits** — no transliteration, conservative whole-title fallback (§6.1, §9.5).
6. **Zero required environment variables**; one optional build-time `PUBLIC_ORIGIN` (§8.5) — `.env.example` documents exactly this.
7. **Fonts: three self-hosted families, two preloaded** (§2) — reconciles the build plan's singular "Persian webfont" with the design system spec (kept private) §3.1's three-family system before the scaffold ships the wrong subset.
8. **Audio: direct enclosure playback, per-request 302 resolution inside the media stack; signed URLs never cached/persisted; no HEAD validation; CSP `media-src` covers both `sphinx.acast.com` and `stitcher2.acast.com`; error path wired to real platform links** (§7).
9. **Video: per-episode action only when a verified per-episode link exists; otherwise omitted; channel-level YouTube only in the footer** (§7.4).
10. **Translucent surfaces: exactly two — sticky header and mini-player; the archive sticky search bar is solid paper** (adopting the design system spec (kept private) Revision 2 §2.5, which already resolved the three-surface contradiction).
11. **Stale-data banner is the only public sync-status surface**; threshold `STALE_AFTER_DAYS = 14` (§11.3).
12. **Sponsor boxes render only validated source blocks; irregular lines fall through to prose verbatim** (§6.4).
13. **Chapters parse from description text with a ≥3-line threshold and are removed from prose only when the list validates** (§6.3).

## 17. Open items and known limitations (honest, per PRD §12.3 "Known limitations")

- Click-to-load YouTube embeds are deferred; v1 links out only (§7.4). If added later: extend `frame-src` deliberately and keep click-to-load (the content model.5).
- The guest gate intentionally misses Latin-title/Persian-bio episodes (e.g. EP145, EP157-class): they render whole and have no person record. Closing that gap would require transliteration — forbidden as invented identity mapping.
- Topic routes stay dormant until a human curates `data/topics.json`.
- Manual screen-reader and touch-device passes are human work; `the testing record (kept private)` records what ran and what did not (PRD §13.5).
- Lab performance numbers are directional only; no real-user CWV exists until an approved public deployment (PRD §11.1).
- CI runs the same gates locally; "CI has not run on GitHub yet" is recorded by the documentation stage until a repository exists (PRD §12.1).
- The feed grew from 214 to 215 items between the research baseline (2026-10-22) and this document (2026-10-23, §0 check 2) — every count in this document is a snapshot of that date and must be recomputed at build time from the store, never hard-coded (PRD §2.2).

