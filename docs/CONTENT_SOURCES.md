# Tabaghe 16 (طبقه ۱۶) — Content Sources

Every fact below was verified live on **2026-10-22** by fetching the named source directly (curl status checks, feed parsing, and API cross-checks run on that date). Nothing is carried over from earlier snapshots; the raw feed (~1.2 MB) was parsed programmatically and never inspected as raw text.

## Source of truth

| Content | Canonical source | Why |
| --- | --- | --- |
| Episode metadata (titles, dates, durations, numbering, descriptions, chapter lines, sponsor mentions, artwork URLs) | **Acast RSS feed**: `https://feeds.acast.com/public/shows/tabaghe16` | The only machine-readable, complete listing. Apple's directory registers the same feed: the iTunes Lookup API (id 1522543116) returns `feedUrl = https://feeds.acast.com/public/shows/625bd31dc030a00012e0dba7`, which is the ID-based form of the same feed declared by the feed's own `itunes:new-feed-url`. |
| Episode audio | **Acast enclosures** in the same feed (`sphinx.acast.com/.../media.mp3`) | All 214 items carry an Acast-hosted MP3 enclosure, including the pre-2022 Anchor-era items. Audio is served through signed, expiring redirect URLs — see "Fetching audio". |
| Video | **YouTube channel**: `https://www.youtube.com/@tabaghe16` | Served page: channel title "طبقه 16", handle `@Tabaghe16`, channel ID `UCkQHRufVtt7tchYqo5_mwww`, ~72.6K subscribers. The show's channel summary says "Available on YouTube, Apple, Spotify, Castbox, and all major streaming platforms"; YouTube is the only video source found. |
| Link hub | **Linktree**: `https://linktr.ee/tabaghe16` | The podcaster's own maintained list of official presences; also the link appended to recent episode descriptions ("نسخه صوتی پادکست و لینک‌های بیشتر"). |

No official standalone website was verified in the sources reviewed.

## The RSS feed (verified 2026-10-22)

- **URL**: `https://feeds.acast.com/public/shows/tabaghe16` — HTTP 200, 1,236,799 bytes. RSS 2.0 with `xmlns:atom`, `xmlns:itunes`, `xmlns:media`, `xmlns:googleplay`, `xmlns:podaccess`, `xmlns:acast`. Generator `acast.com`, `ttl` 60, language `fa`, copyright `Soheil Alavi`, `itunes:type` episodic, `itunes:explicit` false.
- **Show identity**: `acast:showId` `625bd31dc030a00012e0dba7`, `acast:showUrl` `tabaghe16`, `acast:network` "Soheil Alavi". The show was **imported from Anchor** (`acast:importedFeed`: `https://anchor.fm/s/2a940a28/podcast/rss`); the channel `<link>` still points at `https://anchor.fm/soheil-alavi`, which today redirects to the Spotify for Creators profile (`https://creators.spotify.com/pod/profile/soheil-alavi/`, HTTP 200).
- **Episode count**: **214 items** at fetch time, strictly newest-first. Cross-checked against the iTunes Lookup API (`lookup?id=1522543116`): `trackCount: 214`, `releaseDate: 2026-10-17T04:10:00Z` — matching the feed's newest item exactly. Directory listing: collection "Tabaghe 16 طبقه" by Soheil Alavi, genre Society & Culture.
- **Latest episode**: **EP212 — "رقابت برای ساخت هوش مصنوعی شخصی | شیرین مجرد، مدیر محصول گوگل"**, published `Sat, 17 Oct 2026 04:10:06 GMT`, duration `1:41:15`. **Earliest**: "Episode 1 - Mohsen Malayeri" (2020-07-07).
- **Durations**: present on all 214 items as `H:MM:SS`; range 1,591 s (≈26 min) to 11,195 s (≈3 h 06 m).
- **Show artwork**: `https://assets.pippa.io/shows/625bd31dc030a00012e0dba7/show-cover.jpg`; every item also has per-episode artwork on `assets.pippa.io`.
- **Contact metadata**: `itunes:owner` = Soheil Alavi, `info+625bd31dc030a00012e0dba7@mg-eu.acast.com` (an Acast-proxied relay address, not a personal mailbox).

### Item field structure (counts over 214 items)

Every item carries: `title` and identical `itunes:title` (214/214 equal); `guid` (`isPermaLink="false"`, Acast episode ID); `pubDate`; `description` and identical `itunes:summary` (214/214 equal, CDATA-wrapped HTML); `link`; `enclosure` (url `https://sphinx.acast.com/p/open/s/<showId>/e/<episodeId>/media.mp3`, byte `length`, `type="audio/mpeg"` — 214/214 on `sphinx.acast.com`); `itunes:duration`; `itunes:episodeType` `full`; `itunes:explicit` false; `itunes:image`; `acast:episodeId`, `acast:showId`, `acast:settings` (opaque). `itunes:episode` on 212/214; `acast:episodeUrl` on 156; `itunes:season` on 1 (Episode 1). Not present at item level: `content:encoded`, `itunes:subtitle`, `itunes:keywords`, and all Podcasting 2.0 tags (`podcast:chapters`, `podcast:transcript`, etc. — zero in the whole feed).

Item `<link>` hosts: `shows.acast.com/tabaghe16/episodes/<slug>` (153 items), legacy `anchor.fm` URLs (58, the Anchor-era items), `youtu.be` (3).

### Fetching audio (implementation note)

Verified on the newest enclosure (EP212) with live requests:

- A plain `HEAD` to the enclosure URL returns a misleading **200** with `content-type: text/plain` and a 2-byte body.
- A **ranged GET** (`Range: bytes=0-15`) returns `302` to a signed `stitcher2.acast.com/...mp3` URL carrying `Expires`, `Key-Pair-Id` and `Signature` query parameters; following it yields **206 Partial Content**, `content-type: audio/mpeg`, and real MP3 bytes (an `ID3` header).

Consequence: never validate enclosures via HEAD, never cache or persist resolved audio URLs, and treat them as ephemeral — resolve per request, or better, link/embed the official platforms instead.

## Description anatomy

`description`/`itunes:summary` is CDATA HTML and the richest field. Layouts observed in the fetched items:

1. **Recent era (2025–2026, e.g. EP212, EP211, EP210)**: Persian guest bio → Persian episode summary → **chapter/timestamp lines** → English bio/summary → guest links (usually LinkedIn) → **sponsor block** ("حامیان این قسمت:" / "اسپانسر این قسمت") → "Tabaghe 16" + linktr.ee line → hashtags (#پادکست #طبقه۱۶) → Acast footer ("Hosted on Acast. See acast.com/privacy for more information." — appended by Acast to every description).
2. **Older era (2020 Anchor import, e.g. Episode 1)**: bare-text English guest bio with no `<p>` markup, no chapters, no sponsors, plus the Acast footer.

### Chapters / timestamps

Chapters are **plain text inside the description** — there is no RSS chapters namespace or structured element. 48 of 214 items contain three or more `MM:SS`-style timestamps. Separators vary (bidi control characters included, because parsers must tolerate them):

- `00:00` + LRM (U+200E) + ` | ` + FSI-isolated (U+2066…U+2069) label — EP212
- `00:00` + space + LRM + `-` + space + RLM (U+200F) + label — EP211
- `00:00` + ZWNJ (U+200C) + label — EP210
- `00:00` + plain space + label — EP209
- single-digit `0:00` + space or `-` + label — EP205/EP207/EP208

Even within one episode formats mix: EP211's last stamp is `01:44:00` (`HH:MM:SS`) while the rest are `MM:SS`, and EP210 contains out-of-spec minute values (`69:30`, `74:38`). Treat chapters as optional (a minority of episodes have them) and tolerate every style.

## Guests

Guests are identifiable from metadata alone: the dominant title pattern is `EP### - <topic or guest> | <guest name/role>` — 163 of 214 titles contain the `|` separator (e.g. "EP212 - رقابت برای ساخت هوش مصنوعی شخصی | شیرین مجرد، مدیر محصول گوگل"; older items "Episode N - <name>"). The guest's bio opens the description and a guest link (usually LinkedIn) appears near its end. The word "مهمان" (guest) appears explicitly in only 8 descriptions — the title and bio are the reliable signals. Multi-guest specials exist, e.g. "فراتر از استارتاپ | مهراد هیدن، سعید رحمانی، سهیل" (`itunes:episode` 190).

## Sponsors

Sponsor mentions live inside per-episode descriptions as Persian blocks, headed **"حامیان این قسمت:"** (supporters of this episode) or **"اسپانسر این قسمت"** (sponsor of this episode), each entry with a blurb and a URL. Verified examples from the fetched feed:

- EP212 supporters: **Toranj Capital** (`https://toranjcapital.com`, licensed investment funds) and **Hoosha** (`https://hoosha.com`, Persian AI platform).
- Episode 172 sponsor: **Saadat Rent** (`https://www.saadatrent.com?ref_id=Tabaghe16`) plus hosting by **Limoo Host** (`https://limoo.host`); other items reference one-off sponsors by URL (melligold.com, wallex.ir, shavaz.com, liara.ir, and others).

Signal counts across the feed: "اسپانسر" in 30 descriptions, "حامی" in 48. Sponsor membership is per-episode and changes over time — treat it as episode data, not a show-level constant. (The Linktree hub also carries Linktree-injected affiliate/recommendation links; those belong to the Linktree platform, not to the show.)

## Verified platform links

All checked live on 2026-10-22 (final HTTP status after redirects, `curl -sL -o /dev/null -w "%{http_code}"`):

| Platform | URL | Result |
| --- | --- | --- |
| Acast RSS (source of truth) | https://feeds.acast.com/public/shows/tabaghe16 | 200 |
| Acast show page | https://shows.acast.com/tabaghe16 | 200 |
| Linktree (official link hub) | https://linktr.ee/tabaghe16 | 200 |
| YouTube channel | https://www.youtube.com/@tabaghe16 | 200 — "طبقه 16", @Tabaghe16, channel UCkQHRufVtt7tchYqo5_mwww, ~72.6K subscribers |
| YouTube (hub's subscribe link) | http://www.youtube.com/c/tabaghe16?sub_confirmation=1 | 200 |
| Apple Podcasts | https://podcasts.apple.com/ca/podcast/tabaghe-16-%D8%B7%D8%A8%D9%82%D9%87/id1522543116 | 200 — iTunes Lookup: 214 tracks, release 2026-10-17, same Acast feedUrl |
| Spotify | https://open.spotify.com/show/4y7SUQIsT9OaAB9tXBwGzG | 200 |
| Castbox | https://castbox.fm/channel/Tabaghe-16-%D8%B7%D8%A8%D9%82%D9%87-id3083907 | 200 |
| Instagram | https://www.instagram.com/tabaghe16/ | 200 |
| Telegram channel | https://t.me/tabaghe16 | 200 |
| SoundCloud (host) | https://soundcloud.com/soh3il | 200 |
| X / Twitter (host) | https://twitter.com/soh3il | 200 |
| LinkedIn (host) | https://www.linkedin.com/in/soh3il/ | 200 |
| Anchor legacy host profile | https://anchor.fm/soheil-alavi | 200 → redirects to creators.spotify.com/pod/profile/soheil-alavi/ |

**Degraded legacy links found inside old episode descriptions** (do not use):

- `https://redl.ink/tabaghe16/links` — connection timed out at check time (curl exit 28); unreachable.
- `https://spoti.fi/2CiyRoH` — HTTP 200 but it is a client-side redirect page (Branch.io) that references only the Spotify root URL (`open.spotify.com/`), not the show; the show-specific target could not be verified via curl. Use the Spotify show URL above.
- `https://t.me/tabaghe16Spotify` — legacy Telegram-adjacent link found once in an old item; not present on the current hub; unverified as a current route.

## Sponsorship / contact route

The verified sponsorship and contact route is the Telegram account **`https://t.me/tabaghe16admin`** (HTTP 200). It is listed on the official Linktree under two titles: **"Sponsorship / تبلیغات"** and **"تماس با ما"** (Contact us). Secondary, feed-metadata-only: the `itunes:owner` email in the RSS feed is an Acast-proxied relay (`info+625bd31dc030a00012e0dba7@mg-eu.acast.com`), not a personal mailbox; no other contact channel was verified.

## Standalone website

No official standalone website was verified in the sources reviewed. Supporting observations:

- The official Linktree lists only platforms and socials — no website.
- No feed description or channel field references an own-domain site; the channel `<link>` is the legacy Anchor/Spotify-for-Creators profile.
- `tabaghe16.com` resolves and redirects to `https://shows.acast.com/tabaghe16` (the official Acast show page), but hosts no content of its own and no official source references it, so its ownership cannot be verified; it is a redirect, not a standalone site.
- `tabaghe16.ir`, `tabaghe16.net`, `tabaghe16.ca`, `tabaghe16.org` have no DNS A records.

## Data limitations

1. **Episode numbering is not clean.** 214 items; 212 carry `itunes:episode`. Duplicated numbers exist — 30, 156 and 190 each appear on two items (e.g. "فراتر از استارتاپ | مهراد هیدن، سعید رحمانی، سهیل" shares 190 with "EP 190 – Babak Badkoobeh | برندسازی و عوامل موفقیت در بازاریابی"). One item is titled "Episode 157" but tagged 156. Two items have no `itunes:episode` at all: "Episode 145 - Masoud Shahmoradi | …" and "EP 123 - دکتر پایار رادفر - Lab-Grown Meat". **Sort by `pubDate`, never by episode number.**
2. **Page slugs don't match episode numbers.** EP212's page link is `/episodes/215-shirin-mojarad`; the multi-guest special's slug is `ep-190`. Never derive episode numbers from slugs.
3. **Chapters are optional and inconsistently formatted** — five separator styles, bidi control characters, mixed `MM:SS` / `M:SS` / `HH:MM:SS` stamps, and out-of-spec minute values (`69:30`). Only 48/214 items have timestamp lists. There is no structured chapters element.
4. **Description formats differ by era** (recent Persian/HTML vs 2020 Anchor-era bare English text); old items embed dead or degraded links (`redl.ink` times out; the `spoti.fi` shortlink does not point at the show server-side).
5. **Durations are `H:MM:SS` strings** and enclosure `length` is bytes; one old item carries `itunes:season`, none others do.
6. **Platform pages are JS-rendered shells for non-browser clients** — subscriber counts and Spotify tracklists beyond HTTP status/og-metadata could not be independently extracted via curl (YouTube figures above came from the served page's embedded data).
7. **Apple/iTunes counts are directory-side snapshots** — they matched the feed exactly on 2026-10-22 but can lag; the feed remains the source of truth.
8. `acast:settings` (channel and every item) is an opaque blob and `acast:signature` exists at channel level; ignore both.

## Content-rights concerns

- The feed declares `<copyright>Soheil Alavi</copyright>`; episode audio and artwork belong to the podcaster and are hosted by Acast.
- **Do not re-host, proxy, or persist audio.** Enclosures resolve through signed, expiring `stitcher2.acast.com` URLs (verified: `Expires`/`Signature` parameters, `206 audio/mpeg` responses). Link or embed the official platforms (Acast page, Apple, Spotify, YouTube) rather than mirroring media.
- Descriptions embed third-party material verbatim: guest bios, guest social links, and sponsor advertising copy (Toranj, Hoosha, Saadat Rent, Limoo Host, and per-episode one-offs). Preserve attribution when displaying; sponsor membership is per-episode and time-sensitive.
- Acast appends a privacy footer to every description; keep it when quoting descriptions verbatim, and do not imply Acast's endorsement of any site built on this data.
- The test fixtures in `tests/fixtures/` are deliberately sanitized: real feed structure and metadata, heavily trimmed descriptions, placeholder owner email/settings, no audio or image files.

## Fixtures

- `tests/fixtures/tabaghe16-feed-fixture.xml` — miniature RSS mirroring the real feed's namespaces, channel fields and item structure, with 7 representative items (newest era with chapters + sponsors, two other chapter styles, multi-guest duplicate-number special, CDATA title with nested brackets, missing-`itunes:episode` item, oldest Anchor-era item). Descriptions trimmed to short excerpts; well-formed per `xmllint --noout`.
- `tests/fixtures/tabaghe16-episodes.json` — the same 7 episodes as parsed records.
- `tests/fixtures/tabaghe16-chapters-ep211.json` — the chapter list parsed from EP 211's description (bidi control characters stripped from labels; ZWNJ inside words preserved).
- `tests/fixtures/README.md` — provenance and sanitization notes.
