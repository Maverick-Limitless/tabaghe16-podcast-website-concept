# Tabaghe 16 — Independent Website Concept

**طبقه ۱۶** — a Persian-first editorial archive and discovery concept for the [Tabaghe 16](https://shows.acast.com/tabaghe16) podcast.

> **This is an independent, unsolicited concept proposal.** It is not the official Tabaghe 16 website and is not affiliated with, endorsed by, or approved by the show or its owner. Public visibility is for review and evaluation only — see [Rights](#rights-and-non-affiliation) and the [`LICENSE`](./LICENSE) notice.

## The pitch

Tabaghe 16's long-form conversations are distributed across listening, video, and social platforms. This concept explores a complementary, first-party archive where listeners can search every episode, connect guests and topics, reach chapter-level context where the source provides it, and move directly to the official listen/watch destinations — without re-hosting the show's media or replacing its existing channels.

The official platforms remain the home of the show. A link hub already routes people there well; what it cannot do is answer "which episode was that conversation about X, with Y?" across a six-year archive. That is the one job this concept exists for.

## Screenshots

Captured from the running rights-safe demo of this exact code (the number-plate media frames are the project's own designed placeholders for episode artwork):

| View                            | File                                        |
| ------------------------------- | ------------------------------------------- |
| Home — desktop                  | `docs/screenshots/home-desktop.png`         |
| Home — mobile                   | `docs/screenshots/home-mobile.png`          |
| Archive with search and filters | `docs/screenshots/archive-desktop.png`      |
| Episode detail with the player  | `docs/screenshots/episode-detail.png`       |
| Search in action                | `docs/screenshots/search-or-navigation.png` |

## What is implemented

Everything listed here exists in this code and is covered by its test suites:

- **Persian-first, RTL throughout** — Jalali dates (with machine Gregorian values alongside), Persian digits in editorial data, isolated Latin runs for timestamps and names, zero-width non-joiner preserved from the source, a mobile drawer with full focus management.
- **Editorial home** — a featured episode band, an asymmetric recent grid with a lead card, typographic guest chips, and a designed media placeholder system (the artwork plate) that keeps every composition whole even when the source image host is slow or unreachable.
- **Archive** — chronological year groups with client-side search over normalized Persian/Latin text (Arabic/Persian character and digit folding), year and has-chapters filters, newest/oldest sort, load-more, a recovery empty state, and shareable query URLs.
- **Episode pages** — a real player over the episode's verified enclosure (play/pause, seek, clock, buffering and failure states with platform fallbacks), the source's own chapter list (each row seeks playback; the first press fetches only the media metadata), the guest, the sponsor block rendered verbatim in its own treatment, and related episodes with their transparent reasons.
- **Guest and topic routes** — guest pages list each confirmed guest's episodes; topic routes are ready for a curated topic list (none ships by default, because the feed carries no categories and inventing a taxonomy is out of scope).
- **The signature press** — a fabric-wave interaction on primary actions and play controls: the surface responds at the pointer's contact point, a restrained wave travels and settles, keyboard activation uses the center origin, and `prefers-reduced-motion` replaces the whole thing with a simple color change.
- **Accessibility** — WCAG 2.x AA audited with axe on every public route in both mobile and desktop test projects (zero serious or critical violations), a manual keyboard pass, and reduced-motion support.
- **Honest data** — every field is copied from the official Acast feed, derived by a documented rule, or absent. Episode numbering is a label, never an address.

## How it works

- **Stack** — SvelteKit 3 + Svelte 5 (strict TypeScript), Vite, fully prerendered static output, pnpm. `fast-xml-parser` (entity resolution disabled), `sanitize-html` (narrow allowlist), `zod` (store schemas). Vitest + Playwright for tests. Self-hosted OFL fonts (Vazirmatn, Estedad, IBM Plex Mono).
- **Data flow** — `pnpm run sync` fetches the official Acast RSS feed (the single allowlisted source, bounded by timeout and size caps), runs every item through validated extraction rules, and writes a JSON store that the build prerenders from. There is no server runtime, no database, and no client-side API: `loaders` re-validate the store with zod on every read. Audio never passes through this site — the player consumes the enclosure URL directly, per playback request, in the visitor's browser.
- **The rights-safe demo mode** — this repository's committed data is a **demo store** (`data/demo-store/`): 26 minimal records — real titles, dates, durations, official outbound links, guest names — with no descriptions, chapter text, sponsor blurbs, or source artwork, and the project's own placeholders carrying every media frame. The demo is a real configuration of the same product, not a mock: a clean checkout runs in demo mode automatically. Running `pnpm run sync` against the official feed creates the live store (`data/store/`, git-ignored here) and the site serves the full archive instead — including full descriptions, chapters, and source artwork loaded from the provider at runtime. The generator for the demo records is `scripts/make-demo-store.ts`.

Full details: `docs/ARCHITECTURE.md` (routes, schema, security boundaries), `docs/CONTENT_SOURCES.md` (source mapping and limitations), `docs/DEPLOYMENT.md` (hosting, the refresh rhythm, rollback).

## Run it locally

```sh
git clone <this-repository> && cd tabaghe16-podcast-website-concept
pnpm install            # Node.js >= 22.17
pnpm run dev            # demo mode at http://localhost:5173
```

That is the whole setup: the demo store ships with the checkout. To serve the real archive instead:

```sh
pnpm run sync           # fetch the official feed (network required)
pnpm run dev            # live mode — 200+ episodes, full metadata
```

| Command               | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `pnpm run dev`        | Dev server (demo or live, per the store present)                   |
| `pnpm run build`      | Production build — prerenders every page                           |
| `pnpm run preview`    | Serve the production build at :4173                                |
| `pnpm run check`      | Type-check everything, tests included                              |
| `pnpm run lint`       | ESLint + Prettier                                                  |
| `pnpm test`           | Unit suite (Vitest)                                                |
| `npx playwright test` | E2E suite against the production build (auto-builds and serves it) |

The E2E suite plays media against a local silent-audio fixture served from the enclosure's URL and blocks all third-party requests — it never reaches an external service.

## Limitations — stated plainly

- No official endorsement, and no permission to use the show's name, marks, artwork, or content beyond what appears here as factual metadata and outbound links.
- Not production-ready for official operation: no admin panel (refreshing content is `pnpm run sync` + a commit), playback stops on route changes, and the curated topic list is empty by design.
- The demo's 26 records exist to exercise every feature of the product; they are not the full archive and the README screenshots show demo data.
- Accessibility is verified by axe plus a manual keyboard pass; a dedicated screen-reader session has not been performed.

## Rights and non-affiliation

- **This is not open source.** The restrictive notice in [`LICENSE`](./LICENSE) grants review and evaluation only — no right to copy, modify, redistribute, or commercially exploit this project without written permission. Third-party materials (fonts under OFL 1.1, notices in `licenses/`; the show's name, marks, episode content, and artwork) remain the property of their respective owners.
- **Non-affiliation:** this project is an independent concept. Until the podcast's owner approves it, it must not be presented as official, and nothing here may imply endorsement.
- **Security:** see `docs/SECURITY.md` for the implemented controls and how to report an issue.

---

_Concept design and implementation: Maverick Limitless. Data: the official Acast feed for Tabaghe 16. Fonts: Vazirmatn, Estedad, IBM Plex Mono (SIL OFL 1.1)._
