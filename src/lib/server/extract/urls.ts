/**
 * URL policy — docs/ARCHITECTURE.md §8.3.
 *
 * Every URL that enters the store or the rendered page passes through here
 * first. The policy is deliberately narrow: `https:` only, an explicit host
 * allowlist for feed-derived URLs, and a rejection path that returns `null`
 * rather than a "best guess" URL. feed and link security — reject unsafe URI schemes; do not
 * accept untrusted URLs.
 *
 * `null` is a first-class result. A missing URL means the corresponding
 * control is omitted at render time (no inert controls — no inert controls), so a
 * degraded link can never reach a page as a live, wrong destination.
 */

import { SPONSOR_NEVER_ALLOW_HOSTS } from "../config";

/** Schemes that can execute script or smuggle content — always rejected. */
const FORBIDDEN_SCHEMES: readonly string[] = [
  "javascript:",
  "vbscript:",
  "data:",
  "file:",
  "blob:",
  "about:",
  "chrome:",
  "filesystem:"
];

export interface ParsedUrl {
  readonly href: string;
  readonly host: string;
  readonly pathname: string;
  readonly protocol: string;
}

/**
 * Parse a URL, returning `null` for anything that is not an absolute `https:`
 * URL. Protocol-relative and bare-relative inputs fail here, because a value
 * like `//host/x` or `/relative` has no scheme to check.
 */
export function parseHttpsUrl(value: unknown): ParsedUrl | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") {
    return null;
  }
  if (parsed.host === "") {
    return null;
  }
  return {
    href: parsed.href,
    host: parsed.host,
    pathname: parsed.pathname,
    protocol: parsed.protocol
  };
}

/** Reject unsafe URI schemes wherever a URL is rendered (§9.2). */
export function isSafeScheme(value: string): boolean {
  const candidate = value.trim().toLowerCase();
  return !FORBIDDEN_SCHEMES.some((scheme) => candidate.startsWith(scheme));
}

/**
 * A public DNS host name with a registrable label — used by §6.4c to accept a
 * sponsor URL. `localhost`, bare IP literals, and a single-label host are all
 * rejected, because none of them is a real third-party destination.
 */
export function isPublicDnsHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return false;
  }
  // IPv4 literal.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    return false;
  }
  // IPv6 literal (unbracketed, as `URL.host` returns it).
  if (normalized.includes(":")) {
    return false;
  }
  const labels = normalized.split(".");
  if (labels.length < 2) {
    return false;
  }
  return labels.every(
    (label) => /^[a-z0-9-]+$/.test(label) && !label.startsWith("-") && !label.endsWith("-")
  );
}

/** An https URL on one of `hosts`, else `null` (§8.3). */
export function httpsUrlOn(value: unknown, hosts: readonly string[]): string | null {
  const parsed = parseHttpsUrl(value);
  if (parsed === null) {
    return null;
  }
  return hosts.includes(parsed.host) ? parsed.href : null;
}

/**
 * Normalize a YouTube item link to `https://www.youtube.com/watch?v=<ID>`.
 * `youtu.be/<id>` and `youtube.com/watch?v=<id>` are both understood; anything
 * else (including a channel or playlist URL) yields `null` — an embed ID is
 * never guessed (field mapping, §5.5).
 */
export function normalizeYouTubeUrl(value: unknown): string | null {
  const parsed = parseHttpsUrl(value);
  if (parsed === null) {
    return null;
  }

  let videoId: string | null = null;

  if (parsed.host === "youtu.be") {
    const match = /^\/([A-Za-z0-9_-]{6,})(?:\?|$)/.exec(parsed.pathname);
    videoId = match?.[1] ?? null;
  } else if (parsed.host === "youtube.com" || parsed.host === "www.youtube.com") {
    if (parsed.pathname === "/watch") {
      try {
        videoId = new URL(parsed.href).searchParams.get("v");
      } catch {
        videoId = null;
      }
    }
  }

  if (videoId === null || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
    return null;
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * A sponsor URL per §6.4c: https, a public DNS host, and not in the
 * never-allow set (the show's own link hub plus the two verified-degraded
 * legacy redirectors).
 */
export function isSponsorUrlAllowed(value: unknown): string | null {
  const parsed = parseHttpsUrl(value);
  if (parsed === null) {
    return null;
  }
  if (!isPublicDnsHost(parsed.host)) {
    return null;
  }
  if (SPONSOR_NEVER_ALLOW_HOSTS.includes(parsed.host)) {
    return null;
  }
  return parsed.href;
}
