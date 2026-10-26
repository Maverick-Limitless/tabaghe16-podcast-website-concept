/**
 * Frozen build-time configuration (docs/ARCHITECTURE.md §8.1, §8.5).
 *
 * This module is server-only. Nothing here reads request input, and the feed
 * URL is a constant with no environment or request override — the only
 * alternative input is `--input <local file>`, used by tests and offline
 * review. Keeping that property structural is what makes the SSRF rules of
 * PRD §9.2 hold without runtime machinery.
 */

/** The official source of truth for episode metadata and audio enclosures. */
export const FEED_URL = "https://feeds.acast.com/public/shows/tabaghe16";

/**
 * Optional build-time origin for canonical URLs, the sitemap, and Open Graph
 * URLs. Zero environment variables are required: unset builds default to the
 * preview server origin so a local build never claims a public address.
 *
 * Resolved lazily and cached, so importing this module never touches
 * `process.env` — the schema module imports the URL-policy constants below
 * without inheriting an environment dependency.
 */
const DEFAULT_ORIGIN = "http://localhost:4173";

let cachedOrigin: string | undefined;

function resolveOrigin(): string {
  const raw = process.env.PUBLIC_ORIGIN;

  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_ORIGIN;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error(`PUBLIC_ORIGIN must be an absolute URL, received ${JSON.stringify(raw)}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error("PUBLIC_ORIGIN must use https: when it is set");
  }

  return parsed.origin;
}

export function getOrigin(): string {
  cachedOrigin ??= resolveOrigin();
  return cachedOrigin;
}

/** Days after which the archive shows the stale-data banner (§11.3). */
export const STALE_AFTER_DAYS = 14;

/* -- URL policy (§8.3) ---------------------------------------------------- */

export const ENCLOSURE_HOST = "sphinx.acast.com";

/**
 * Enclosure path shape: /p/open/s/<showId>/e/<episodeId>/media.mp3. Sync
 * validates this shape only — it never fetches media, and never uses HEAD
 * (a HEAD returns a misleading 200 text/plain; CONTENT_SOURCES.md).
 */
export const ENCLOSURE_PATH_PATTERN = /^\/p\/open\/s\/[^/]+\/e\/[^/]+\/media\.mp3$/;

export const IMAGE_HOST = "assets.pippa.io";

/** Hosts an item-level `<link>` may point at before it is accepted. */
export const ITEM_LINK_HOSTS: readonly string[] = [
  "shows.acast.com",
  "youtu.be",
  "www.youtube.com",
  "youtube.com"
];

/**
 * Sponsor URLs never allow these hosts: the show's own link hub and the two
 * verified-degraded legacy redirectors (CONTENT_SOURCES.md).
 */
export const SPONSOR_NEVER_ALLOW_HOSTS: readonly string[] = [
  "linktr.ee",
  "redl.ink",
  "spoti.fi",
  "acast.com"
];

/* -- Verified external destinations -------------------------------------- */
/*
 * Platform and social links are hardcoded constants taken from the verified
 * link table in docs/CONTENT_SOURCES.md — never derived from feed text, so a
 * degraded link inside an old description can never reach the rendered page.
 * Persian labels follow docs/DESIGN.md §5.7.
 */

export interface PlatformLink {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

/** Where a visitor can actually listen or watch, in footer order. */
export const LISTEN_LINKS: readonly PlatformLink[] = [
  {
    id: "acast-feed",
    label: "فید آکست",
    url: "https://feeds.acast.com/public/shows/tabaghe16"
  },
  {
    id: "youtube",
    label: "یوتیوب",
    url: "https://www.youtube.com/@tabaghe16"
  },
  {
    id: "spotify",
    label: "اسپاتیفای",
    url: "https://open.spotify.com/show/4y7SUQIsT9OaAB9tXBwGzG"
  },
  {
    id: "apple",
    label: "اپل پادکست",
    url: "https://podcasts.apple.com/ca/podcast/tabaghe-16-%D8%B7%D8%A8%D9%82%D9%87/id1522543116"
  },
  {
    id: "castbox",
    label: "کست‌باکس",
    url: "https://castbox.fm/channel/Tabaghe-16-%D8%B7%D8%A8%D9%82%D9%87-id3083907"
  }
];

/** Official presences for the «دنبال کردن» column. */
export const FOLLOW_LINKS: readonly PlatformLink[] = [
  {
    id: "instagram",
    label: "اینستاگرام",
    url: "https://www.instagram.com/tabaghe16/"
  },
  {
    id: "telegram",
    label: "تلگرام",
    url: "https://t.me/tabaghe16"
  }
];

/**
 * The one verified sponsorship/contact route (listed on the official Linktree
 * under "Sponsorship / تبلیغات" and "تماس با ما"). No other contact channel
 * has been verified, so none is offered.
 */
export const CONTACT_LINK: PlatformLink = {
  id: "telegram-admin",
  label: "تماس و تبلیغات",
  url: "https://t.me/tabaghe16admin"
};

/** The show's own link hub, for the footer's "more links" line. */
export const LINK_HUB_URL = "https://linktr.ee/tabaghe16";

/** Show identity constants used by headers, meta, and structured data. */
export const SHOW = {
  name: "طبقه ۱۶",
  latinName: "Tabaghe 16",
  author: "سهیل علوی",
  authorLatin: "Soheil Alavi",
  language: "fa-IR"
} as const;
