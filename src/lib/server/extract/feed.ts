/**
 * Feed parsing — docs/ARCHITECTURE.md §8.2 and §11.1-3 (sync safety, §9.2).
 *
 * `fast-xml-parser` is configured so that **no entity resolution happens at
 * all**: external entities throw, and internal DOCTYPE entities are never
 * expanded. That removes both XXE and entity-expansion (billion laughs) as
 * classes of failure rather than mitigating them — the 10 MB response cap of
 * §8.2 then only has to bound ordinary document size.
 *
 * Two options carry that property, and both are verified in
 * `tests/unit/feed-parser.test.ts` rather than asserted by comment:
 *
 * - `processEntities: false` — an external-entity payload throws
 *   `Error: External entities are not supported`; a defined internal entity is
 *   left as the literal `&b;`.
 * - `htmlEntities: false` — no HTML entity decoding, which prevents a payload
 *   from reaching the parser as a decoded character.
 *
 * Because entity resolution is off, a predefined entity in a *plain-text* node
 * would stay literal. `text()` therefore decodes exactly the five predefined
 * XML entities in a single pass for plain-text nodes, and leaves CDATA
 * untouched — CDATA is literal by XML's own rules, and every description in
 * this feed is CDATA-wrapped.
 */

import { XMLParser } from "fast-xml-parser";

import { toAsciiDigits } from "./normalize";

/** The property `cdataPropName` wraps CDATA sections in, so text() can tell. */
const CDATA_PROP = "__cdata";

/** Parser options, exported so tests can prove the safety property directly. */
export const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // CDATA is structurally distinguishable from a plain-text node.
  cdataPropName: CDATA_PROP,
  // No entity resolution of any kind — see the module comment.
  processEntities: false,
  htmlEntities: false,
  // Tag values stay strings: the mapper owns every numeric conversion, so a
  // silent `Number()` on a malformed value cannot turn a bad duration into 0.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  // Arrays: `item` is the only repeated element this feed has, and forcing it
  // keeps a single-item feed and a many-item feed shaped alike.
  isArray: (tagName: string) => tagName === "item",
  ignoreDeclaration: true,
  ignorePiTags: true
} as const;

export function createFeedParser(): XMLParser {
  return new XMLParser(XML_PARSER_OPTIONS);
}

/* -- Text and attribute access --------------------------------------------- */

/** A parsed XML node is always a record when it is not a scalar. */
type XmlNode = Record<string, unknown>;

/**
 * Read a node's text: CDATA verbatim, plain text with the five predefined XML
 * entities decoded in one pass, everything else `null`.
 */
export function text(value: unknown): string | null {
  if (typeof value === "string") {
    return decodePredefinedXmlEntities(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  const node = asObject(value);
  if (node !== null) {
    const cdata = node[CDATA_PROP];
    if (typeof cdata === "string") {
      // CDATA is literal; decoding here would corrupt an intentional `&amp;`.
      return cdata;
    }
    const inner = node["#text"];
    if (typeof inner === "string") {
      return decodePredefinedXmlEntities(inner);
    }
  }
  return null;
}

function decodePredefinedXmlEntities(value: string): string {
  if (!value.includes("&")) {
    return value;
  }
  // A single pass, so `&amp;amp;` decodes once to `&amp;` — exactly what XML
  // specifies — and cannot be re-scanned into an amplified value.
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (match, entity: string) => {
    switch (entity) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      default:
        return "'";
    }
  });
}

/** Read an attribute off a node, or `null` when absent. */
export function attribute(node: unknown, name: string): string | null {
  const parsed = asObject(node);
  if (parsed !== null) {
    const value = parsed[`@_${name}`];
    if (typeof value === "string") {
      return decodePredefinedXmlEntities(value);
    }
  }
  return null;
}

/* -- Numbers, dates, durations -------------------------------------------- */

/** A non-negative integer from a string, or `null` (§11.1-4: never guessed). */
export function parseCount(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const normalized = toAsciiDigits(value.trim());
  if (!/^\d{1,10}$/.test(normalized)) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

const MONTHS: Readonly<Record<string, number>> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

/**
 * RFC 2822/RFC 1123 date → ISO-8601 UTC, or `null`.
 *
 * Written as an explicit grammar rather than `Date.parse`, because the latter
 * is engine-dependent for obsolete forms and would silently accept a
 * near-miss. A malformed `pubDate` yields `null` and the item is then rejected
 * by the Episode schema (§11.1-4) — counted `skippedInvalid`, never guessed.
 */
export function parseRfcDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const match =
    /^(?:[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3,4})\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([+-]\d{4}|[+-]\d{2}:\d{2}|[A-Za-z]{1,5})?$/.exec(
      value.trim()
    );
  if (match === null) {
    return null;
  }

  const day = Number.parseInt(match[1] ?? "", 10);
  const month = MONTHS[(match[2] ?? "").toLowerCase()];
  const year = Number.parseInt(match[3] ?? "", 10);
  const hour = Number.parseInt(match[4] ?? "", 10);
  const minute = Number.parseInt(match[5] ?? "", 10);
  const second = match[6] === undefined ? 0 : Number.parseInt(match[6], 10);

  if (month === undefined || !Number.isFinite(month)) {
    return null;
  }
  if (day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const offsetMinutes = parseZone(match[7] ?? "");
  let epoch = Date.UTC(year, month, day, hour, minute, second);
  if (Number.isNaN(epoch)) {
    return null;
  }
  epoch -= offsetMinutes * 60_000;

  // Reject a day that does not exist in its month (Date.UTC rolls 31 Feb to 2
  // Mar, which would silently publish a date the source never wrote).
  const roundTrip = new Date(epoch);
  if (
    roundTrip.getUTCDate() !== day ||
    roundTrip.getUTCMonth() !== month ||
    roundTrip.getUTCFullYear() !== year
  ) {
    return null;
  }

  return roundTrip.toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

function parseZone(zone: string): number {
  if (zone === "") {
    return 0;
  }

  const named = zone.toUpperCase();
  if (named === "GMT" || named === "UTC" || named === "UT" || named === "Z" || named === "ZULU") {
    return 0;
  }

  const offsetMatch = /^([+-])(\d{2}):?(\d{2})$/.exec(zone);
  if (offsetMatch === null) {
    // An unknown three-letter zone is treated as UTC, which is what RFC 2822
    // recommends for obsolete zone names and what the feed uses ("GMT").
    return 0;
  }
  const sign = offsetMatch[1] === "-" ? -1 : 1;
  return (
    sign *
    (Number.parseInt(offsetMatch[2] ?? "0", 10) * 60 + Number.parseInt(offsetMatch[3] ?? "0", 10))
  );
}

/**
 * `itunes:duration` → seconds.
 *
 * `H:MM:SS` and `M:SS` are the two shapes §5.1 names; a bare integer is
 * tolerated as seconds, which is what the iTunes specification means by a
 * duration with no colon. Anything else — an empty string, a word, a
 * component past 59 in the minute position — is `null` rather than 0, so a
 * malformed duration never becomes "zero seconds long" in the player.
 */
export function parseDuration(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const normalized = toAsciiDigits(value.trim());
  if (normalized === "") {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    const seconds = Number.parseInt(normalized, 10);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }

  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseComponent(parts[0]);
    minutes = parseComponent(parts[1]);
    seconds = parseComponent(parts[2]);
  } else {
    minutes = parseComponent(parts[0]);
    seconds = parseComponent(parts[1]);
  }

  if (minutes >= 60 || seconds >= 60) {
    // Minutes and seconds are always two digits in this shape; `1:75` is a
    // typo, not an out-of-spec minute value.
    return null;
  }
  if (hours < 0 || minutes < 0 || seconds < 0) {
    return null;
  }

  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 86_400 ? null : total;
}

function parseComponent(part: string | undefined): number {
  if (part === undefined || !/^\d{1,3}$/.test(part)) {
    return -1;
  }
  return Number.parseInt(part, 10);
}

/* -- Feed-level access ----------------------------------------------------- */

export interface FeedChannelInfo {
  readonly itunesAuthor: string | null;
  readonly acastShowId: string | null;
}

/** Channel-level values the extraction rules need as anchors. */
export function readChannelInfo(channel: unknown): FeedChannelInfo {
  const node = asObject(channel);
  return {
    itunesAuthor: text(node?.["itunes:author"]),
    acastShowId: text(node?.["acast:showId"])
  };
}

export interface RawFeedItem {
  readonly guid: string;
  readonly title: string;
  readonly pubDate: string | null;
  readonly publishedAt: string | null;
  readonly durationRaw: string | null;
  readonly durationSeconds: number | null;
  readonly enclosureUrl: string | null;
  readonly enclosureBytes: number | null;
  readonly enclosureType: string | null;
  readonly imageUrl: string | null;
  readonly link: string | null;
  readonly acastEpisodeUrl: string | null;
  readonly episodeNo: number | null;
  readonly season: number | null;
  readonly description: string;
}

/**
 * Map one parsed `<item>` to the raw record the extraction rules consume.
 *
 * `title` and `description` fall back to the duplicated `itunes:*` pairs, which
 * this feed carries identically on every item, but only when the primary is
 * absent — never preferring one over the other when the primary exists.
 */
export function readRawItem(item: unknown): RawFeedItem | null {
  const node = asObject(item);
  if (node === null) {
    return null;
  }

  const guid = text(node["guid"]) ?? text(node["acast:episodeId"]);
  if (guid === null || guid === "") {
    return null;
  }

  const title = text(node["title"]) ?? text(node["itunes:title"]);
  if (title === null) {
    return null;
  }

  const description = decodeDescriptionReferences(
    text(node["description"]) ?? text(node["itunes:summary"]) ?? ""
  );
  const pubDate = text(node["pubDate"]);

  const enclosure = node["enclosure"];
  const enclosureUrl = attribute(enclosure, "url");

  return {
    guid,
    title,
    pubDate,
    publishedAt: parseRfcDate(pubDate),
    durationRaw: text(node["itunes:duration"]),
    durationSeconds: parseDuration(text(node["itunes:duration"])),
    enclosureUrl,
    enclosureBytes: parseCount(attribute(enclosure, "length")),
    enclosureType: attribute(enclosure, "type"),
    imageUrl: attribute(node["itunes:image"], "href"),
    link: text(node["link"]),
    acastEpisodeUrl: text(node["acast:episodeUrl"]),
    episodeNo: parseCount(text(node["itunes:episode"])),
    season: parseCount(text(node["itunes:season"])),
    description
  };
}

/**
 * Decode numeric character references in a description, once.
 *
 * The description is CDATA-wrapped and the CDATA is literal by XML's rules,
 * so the feed's own escaping (`&#39;` for an apostrophe) survives the parse as
 * characters. Downstream, `build.ts` re-escapes a raw `&` when it rebuilds the
 * prose blocks, and without this decode the round trip doubles the escape —
 * the page then renders «&#39;» visibly instead of «'».
 *
 * Only numeric references are decoded here; the predefined five are already
 * handled by `text()` for plain-text nodes and are left literal in CDATA,
 * where they are the author's own text. Decoding happens exactly once, at the
 * boundary, and the result is plain text that the sanitizer re-escapes on
 * output — no markup can be resurrected by a numeric reference, because the
 * description's tags are re-parsed from the fully-escaped rebuild either way.
 */
function decodeDescriptionReferences(value: string): string {
  if (!value.includes("&#")) {
    return value;
  }
  return value.replace(/&#(\d{1,7});|&#[xX]([0-9a-fA-F]{1,6});/g, (match, decimal, hex) => {
    const codePoint = decimal !== undefined ? Number(decimal) : Number.parseInt(hex, 16);
    if (
      !Number.isInteger(codePoint) ||
      codePoint < 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return match;
    }
    return String.fromCodePoint(codePoint);
  });
}

function asObject(value: unknown): XmlNode | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const node: unknown = value;
  return typeof node === "object" && node !== null ? (node as XmlNode) : null;
}
