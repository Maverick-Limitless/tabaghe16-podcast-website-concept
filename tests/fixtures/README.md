# Test fixtures — Tabaghe 16 feed

Sanitized sample fixtures modeling the official Acast RSS feed
(`https://feeds.acast.com/public/shows/tabaghe16`), generated programmatically from a **live
fetch on 2026-10-22**. The real feed at fetch time had **214 items**; latest episode **EP212**
(published 2026-10-17), oldest **Episode 1** (2020-07-07). See `docs/CONTENT_SOURCES.md` for the
full source-of-truth mapping.

## Files

| File | What it is |
| --- | --- |
| `tabaghe16-feed-fixture.xml` | Miniature RSS feed: the real feed's namespaces and channel fields, plus 7 representative `<item>` elements copied verbatim from the real feed **except** the description content (trimmed, see below). Well-formed XML (`xmllint --noout` clean). |
| `tabaghe16-episodes.json` | The same 7 episodes as parsed records (numbers, dates, durations, URLs, excerpt, flags) for data-layer tests. |
| `tabaghe16-chapters-ep211.json` | The chapter list parsed out of EP 211's description lines — the format a chapter renderer should produce from description text. |

## The 7 items and why each was chosen

1. **EP212** (newest) — current-era description: bio → chapters → sponsor supporters →
   linktr.ee line → Acast footer; chapter style `00:00` + LRM + pipe + FSI-isolated label;
   page slug does not match the episode number (`215-shirin-mojarad`).
2. **EP 211** — chapter style `00:00` + LRM + hyphen + RLM; 14 chapter lines mixing `MM:SS`
   stamps with a final `HH:MM:SS` stamp (`01:44:00`).
3. **EP 210** — chapter style `00:00` + ZWNJ separator; source description also contains
   out-of-spec stamps above 59 minutes (`69:30`, `74:38`).
4. **"فراتر از استارتاپ | …"** — multi-guest special sharing `itunes:episode` **190** with
   "EP 190 – Babak Badkoobeh" (duplicate numbers exist in the real feed: 30, 156, 190);
   no `EP` prefix in the title.
5. **EP 203** — CDATA-wrapped title containing nested square brackets
   (`EP 203 - [English] Inside Shopify's Product DNA …`).
6. **"Episode 145"** — one of only two real items with **no** `itunes:episode` element
   (the other is "EP 123"); has a sponsor mention but no chapters.
7. **"Episode 1"** (oldest) — 2020 Anchor-era item: bare-text English bio (no `<p>`),
   legacy `anchor.fm` page link, the only item with `itunes:season`.

## What is real

- Namespaces (`xmlns:atom`, `xmlns:itunes`, `xmlns:media`, `xmlns:googleplay`,
  `xmlns:podaccess`, `xmlns:acast`) and channel fields, including `itunes:new-feed-url` and
  the Anchor import marker `acast:importedFeed`.
- Titles, publication dates, durations, GUIDs (`isPermaLink="false"`), episode numbers,
  page links, enclosure URLs (`sphinx.acast.com/p/open/s/<showId>/e/<episodeId>/media.mp3`
  with byte `length`), and per-episode artwork URLs (`assets.pippa.io/...`).
- `title`/`itunes:title` and `description`/`itunes:summary` are duplicated pairs, exactly
  as in the real feed.
- Chapter lines keep their original Unicode bidi control characters (LRM U+200E,
  RLM U+200F, FSI U+2066, PDI U+2069, ZWNJ U+200C) — a chapter parser must tolerate them.
- The Acast footer sentence appended to descriptions.

## What is trimmed / sanitized

- Descriptions are **rebuilt from short excerpts**: the first paragraph (bio head, ≤340
  chars), a `[…]` marker, up to 3 real chapter lines (≤170 chars each), a trimmed sponsor
  paragraph (≤240 chars) and/or link paragraph (≤200 chars) when present, plus the footer
  sentence. Real descriptions run ~500–3000 chars; guest bios, episode summaries and full
  sponsor blurbs are **not** reproduced.
- The channel `itunes:owner` email is replaced with `owner@example.com` (the real feed
  carries an Acast-proxied address), and the opaque `acast:settings` blob is replaced with
  `sanitized-placeholder`.
- **No media files, no images.** Enclosure/artwork entries are URL strings only; tests must
  not fetch them over the network.

## Intended use

Feed-parser and page-render tests: field extraction, chapter parsing (bidi-tolerant, mixed
`MM:SS`/`M:SS`/`HH:MM:SS` stamps), sponsor-block detection, guest extraction from titles,
ordering by `pubDate` (never by episode number), and duplicate/missing/slug-mismatch handling.
