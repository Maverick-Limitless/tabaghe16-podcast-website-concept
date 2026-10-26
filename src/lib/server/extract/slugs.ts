/**
 * Slugs — docs/ARCHITECTURE.md §6.2.
 *
 * Episode slugs come from stable feed fields (`acast:episodeUrl`), never from
 * episode numbers, because a page slug does not match an episode number
 * (CONTENT_SOURCES.md "Data limitations" #2: EP212's page link is
 * `/episodes/215-shirin-mojarad`). Deriving a slug from a number would produce
 * a URL that changes the day the show's numbering is fixed upstream.
 *
 * Person slugs are `slugify(displayName)` with Persian text kept as-is; the
 * router percent-encodes them, so a canonical URL and its escaped form stay
 * consistent.
 *
 * Every function here is pure and deterministic: the same input, in any order,
 * produces the same output. Collision suffixes are added by the caller, which
 * is the only place that knows the ordering rule.
 */

import { norm } from "./normalize";

/** Persian/Arabic script blocks, including Persian presentation forms. */
const PERSIAN_CHARACTER = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * `slugify(displayName)` per §6.2: Persian kept as-is (ZWNJ stripped, spaces →
 * `-`, lowercased Latin, punctuation stripped). Latin and Persian may be mixed
 * in one name ("Mohsen Malayeri محسن ملایری"), so each token is slugified by
 * its own script rule and the tokens are joined with `-`.
 */
export function slugifyPerson(displayName: string): string {
  const tokens = displayName
    .trim()
    .replace(/\u200C/g, "")
    .split(/\s+/)
    .filter((token) => token !== "");

  const slugged = tokens.map((token) => slugifyToken(token)).filter((token) => token !== "");

  return slugged.join("-");
}

function slugifyToken(token: string): string {
  const hasPersian = [...token].some((char) => PERSIAN_CHARACTER.test(char));
  const hasLatin = /[A-Za-z0-9]/.test(token);

  if (hasPersian) {
    // Persian is kept verbatim; only the punctuation around it is stripped.
    return token.replace(/[^\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, "");
  }
  if (hasLatin) {
    // Latin is lowercased and reduced to `[a-z0-9-_.]`.
    return token.toLowerCase().replace(/[^a-z0-9\-_.]/g, "");
  }
  // Digits and other scripts: fold digits, drop everything else.
  return norm(token).replace(/[^a-z0-9]/g, "");
}

/**
 * The episode slug: `acast:episodeUrl` when it is already URL-safe, else
 * `ep-<guid>`. "URL-safe" means the value survives a path segment unchanged —
 * `215-shirin-mojarad` and `ep-210` both do; a value containing `/`, `?`, `#`,
 * `%`, or a space does not and falls back to the GUID form.
 */
export function episodeSlug(acastEpisodeUrl: unknown, guid: string): string {
  if (typeof acastEpisodeUrl === "string" && isUrlSafeSlug(acastEpisodeUrl)) {
    return acastEpisodeUrl;
  }
  return `ep-${guid}`;
}

export function isUrlSafeSlug(value: string): boolean {
  if (value === "" || value.length > 128) {
    return false;
  }
  // Unreserved characters per RFC 3986 §2.3, so the value cannot escape its
  // path segment or change meaning once percent-encoded.
  return /^[A-Za-z0-9\-._~]+$/.test(value);
}

/**
 * A slug that already exists in the collection gets a deterministic `-2`, `-3`,
 * … suffix, assigned in the caller's ordering (episode: `publishedAt`; person:
 * first appearance). Deterministic ordering is what keeps a collision suffix
 * stable across two sync runs.
 */
export function dedupeSlugs<T>(
  items: readonly T[],
  slugOf: (item: T) => string,
  orderOf: (item: T) => number
): Map<T, string> {
  const sorted = [...items].sort((left, right) => orderOf(left) - orderOf(right));
  const used = new Set<string>();
  const assigned = new Map<T, string>();

  for (const item of sorted) {
    const base = slugOf(item);
    let candidate = base;
    let counter = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    used.add(candidate);
    assigned.set(item, candidate);
  }
  return assigned;
}
