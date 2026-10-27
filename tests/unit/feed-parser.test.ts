/**
 * Feed parsing — docs/ARCHITECTURE.md §8.2, §11.1-3; feed and link security
 *
 * The parser's safety property is structural: no entity resolution at all,
 * so both XXE and entity-expansion are removed as failure classes rather
 * than mitigated. These tests prove the property directly against
 * XML_PARSER_OPTIONS, then cover the field reading over the sanitized
 * fixture feed: the duplicated itunes:* fallbacks, duration and date
 * parsing, and the numeric-reference decode the descriptions need.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createFeedParser,
  parseCount,
  parseDuration,
  parseRfcDate,
  readRawItem,
  XML_PARSER_OPTIONS,
  type RawFeedItem
} from "#lib/server/extract/feed";

const FIXTURE = readFileSync("tests/fixtures/tabaghe16-feed-fixture.xml", "utf8");

/** Parse the fixture feed into its raw item records, in document order. */
function fixtureItems(): RawFeedItem[] {
  const parsed = createFeedParser().parse(FIXTURE) as { rss?: { channel?: { item?: unknown[] } } };
  const items = parsed.rss?.channel?.item ?? [];
  return items
    .map((node) => readRawItem(node))
    .filter((item): item is RawFeedItem => item !== null);
}

describe("parser safety options", () => {
  it("never resolves entities (the XXE / billion-laughs property)", () => {
    expect(XML_PARSER_OPTIONS.processEntities).toBe(false);
    expect(XML_PARSER_OPTIONS.htmlEntities).toBe(false);

    const parser = createFeedParser();
    const internal = parser.parse(
      `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY b "EXPANDED">]><r><a>&b;</a></r>`
    ) as { r?: { a?: string } };
    // The entity stays literal: expansion never happened.
    expect(internal.r?.a).toBe("&b;");
  });

  it("throws on an external entity declaration", () => {
    const parser = createFeedParser();
    const payload = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><r><a>&xxe;</a></r>`;
    expect(() => parser.parse(payload)).toThrow();
  });
});

describe("fixture field reading", () => {
  it("parses all seven fixture items", () => {
    expect(fixtureItems()).toHaveLength(7);
  });

  it("reads EP212's verbatim fields, including the slug mismatch", () => {
    const ep212 = fixtureItems().find((item) => item.guid === "6ad2b6333243d006bb488d6d");
    expect(ep212).toBeDefined();
    // Page slug 215-… on episode 212: numbering is never an address (§6.2).
    expect(ep212?.acastEpisodeUrl).toBe("215-shirin-mojarad");
    expect(ep212?.episodeNo).toBe(212);
    expect(ep212?.durationSeconds).toBe(6075);
    expect(ep212?.title).toContain("شیرین مجرد");
    expect(ep212?.enclosureUrl).toContain("sphinx.acast.com");
  });

  it("reads the multi-guest special sharing episode number 190", () => {
    const special = fixtureItems().find((item) => item.title.includes("فراتر از استارتاپ"));
    expect(special?.episodeNo).toBe(190);
  });

  it("keeps the CDATA-wrapped title with nested brackets", () => {
    const shopify = fixtureItems().find((item) => item.title.includes("Shopify"));
    expect(shopify?.title).toContain("[English]");
  });
});

describe("duplicated itunes:* fallbacks", () => {
  it("falls back to itunes:title only when the primary title is absent", () => {
    const parser = createFeedParser();
    const parsed = parser.parse(
      `<rss><channel><item><guid>g1</guid><itunes:title>عنوانِ جایگزین</itunes:title><pubDate>Sat, 17 Oct 2026 04:10:06 +0000</pubDate></item></channel></rss>`
    ) as { rss?: { channel?: { item?: unknown[] } } };
    const item = readRawItem(parsed.rss?.channel?.item?.[0]);
    expect(item?.title).toBe("عنوانِ جایگزین");
  });

  it("returns null for an item with no title of any kind", () => {
    const parser = createFeedParser();
    const parsed = parser.parse(
      `<rss><channel><item><guid>g2</guid><pubDate>Sat, 17 Oct 2026 04:10:06 +0000</pubDate></item></channel></rss>`
    ) as { rss?: { channel?: { item?: unknown[] } } };
    expect(readRawItem(parsed.rss?.channel?.item?.[0])).toBeNull();
  });

  it("falls back to itunes:summary for the description", () => {
    const parser = createFeedParser();
    const parsed = parser.parse(
      `<rss><channel><item><guid>g3</guid><title>عنوان</title><itunes:summary>خلاصه</itunes:summary></item></channel></rss>`
    ) as { rss?: { channel?: { item?: unknown[] } } };
    const item = readRawItem(parsed.rss?.channel?.item?.[0]);
    expect(item?.description).toBe("خلاصه");
  });
});

describe("numeric character references in descriptions", () => {
  it("decodes them once at the read boundary", () => {
    const parser = createFeedParser();
    const parsed = parser.parse(
      `<rss><channel><item><guid>g4</guid><title>عنوان</title><description><![CDATA[today&#39;s episode]]></description></item></channel></rss>`
    ) as { rss?: { channel?: { item?: unknown[] } } };
    const item = readRawItem(parsed.rss?.channel?.item?.[0]);
    expect(item?.description).toBe("today's episode");
  });
});

describe("scalar parsing", () => {
  it("parses durations in every shape the feed uses", () => {
    expect(parseDuration("1:41:15")).toBe(6075);
    expect(parseDuration("41:15")).toBe(2475);
    expect(parseDuration("3674")).toBe(3674);
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });

  it("parses RFC-822 dates to normalized UTC ISO and rejects junk", () => {
    expect(parseRfcDate("Sat, 17 Oct 2026 04:10:06 +0000")).toBe("2026-10-17T04:10:06.000Z");
    expect(parseRfcDate("not a date")).toBeNull();
    expect(parseRfcDate(null)).toBeNull();
  });

  it("reads counts with a safe fallback", () => {
    expect(parseCount("212")).toBe(212);
    expect(parseCount("x")).toBeNull();
    expect(parseCount(null)).toBeNull();
  });
});
