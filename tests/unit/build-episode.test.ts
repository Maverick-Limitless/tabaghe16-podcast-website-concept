/**
 * Episode assembly — docs/ARCHITECTURE.md §5.1, §6, §11.1-4.
 *
 * These tests run the real pipeline over the sanitized fixture feed: raw
 * validation → normalization → extraction (title/guests, chapters, sponsors)
 * → a store-shaped `Episode`. They pin the invariants the site's honesty
 * rests on (no invented content): every field is copied from the feed, derived by a
 * documented rule, or null — and an item that cannot be stored honestly is
 * rejected with a reason, never mangled into the store.
 *
 * Idempotency is covered through `changedFields`: the function the sync
 * uses to decide whether a re-run changed an episode at all.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildEpisode, changedFields } from "#lib/server/extract/build";
import { createFeedParser, readRawItem, type RawFeedItem } from "#lib/server/extract/feed";
import { episodeSlug } from "#lib/server/extract/slugs";
import type { Episode } from "#lib/server/schema";

const FIXTURE = readFileSync("tests/fixtures/tabaghe16-feed-fixture.xml", "utf8");

function fixtureItems(): RawFeedItem[] {
  const parsed = createFeedParser().parse(FIXTURE) as { rss?: { channel?: { item?: unknown[] } } };
  const items = parsed.rss?.channel?.item ?? [];
  return items
    .map((node) => readRawItem(node))
    .filter((item): item is RawFeedItem => item !== null);
}

/** Build with the same context shape the sync script provides. */
function build(item: RawFeedItem, slug?: string) {
  return buildEpisode(item, {
    slug: slug ?? episodeSlug(item.acastEpisodeUrl, item.guid),
    guestSlugs: [],
    lastSeenAt: "2026-10-25T00:00:00.000Z"
  });
}

/** The EP212 item: the fixture's newest and most feature-complete record. */
function ep212Item(): RawFeedItem {
  const item = fixtureItems().find((candidate) => candidate.guid === "6ad2b6333243d006bb488d6d");
  if (item === undefined) {
    throw new Error("EP212 missing from fixture");
  }
  return item;
}

describe("assembly over the fixture", () => {
  it("builds a store-valid episode for every fixture item", () => {
    const results = fixtureItems().map((item) => build(item));
    expect(results.every((result) => result.episode !== null)).toBe(true);
  });

  it("splits EP212's title into headline, byline, and role text", () => {
    const { episode } = build(ep212Item());
    expect(episode?.titleHeadline).toBe("رقابت برای ساخت هوش مصنوعی شخصی");
    expect(episode?.titleByline).toBe("شیرین مجرد");
    expect(episode?.roleText).toBe("مدیر محصول گوگل");
  });

  it("extracts EP212's chapters, sorted with Latin stamps", () => {
    const { episode } = build(ep212Item());
    const chapters = episode?.chapters ?? [];
    expect(chapters.length).toBeGreaterThanOrEqual(3);
    expect(chapters[0]?.timeRaw).toBe("00:00");
    const seconds = chapters.map((chapter) => chapter.timeSeconds);
    expect([...seconds].sort((left, right) => left - right)).toEqual(seconds);
  });

  it("separates the Acast footer from the prose, and rejects the fixture's linktr-only sponsor heading", () => {
    const { episode } = build(ep212Item());
    expect(episode?.hostedOnAcast).toContain("Hosted on Acast");
    expect(episode?.descriptionHtml).not.toContain("Hosted on Acast");

    /*
     * The fixture trimmed EP212's description down to a sponsor heading
     * followed only by the show's own linktr.ee hub line. The hub is in the
     * never-allow set (config.ts SPONSOR_NEVER_ALLOW_HOSTS), so a heading
     * with no valid entries correctly produces no sponsor block — and the
     * heading itself falls back into the prose rather than vanishing.
     * (sponsors.test.ts pins the positive extraction rules directly.)
     */
    expect(episode?.sponsor).toBeNull();
    expect(episode?.descriptionHtml).toContain("حامیان این قسمت");
  });

  it("keeps the page slug and the enclosure host as verified", () => {
    const { episode } = build(ep212Item());
    expect(episode?.slug).toBe("215-shirin-mojarad");
    expect(episode?.audioUrl).toContain("sphinx.acast.com");
    expect(episode?.acastPageUrl).toBe(
      "https://shows.acast.com/tabaghe16/episodes/215-shirin-mojarad"
    );
  });

  it("derives a bounded excerpt from the sanitized prose", () => {
    const { episode } = build(ep212Item());
    const excerpt = episode?.descriptionExcerpt ?? "";
    expect(excerpt.length).toBeGreaterThan(0);
    expect(excerpt.length).toBeLessThanOrEqual(200);
  });

  it("removes extracted chapter lines from the prose and records it", () => {
    const { episode } = build(ep212Item());
    expect(episode?.chapterLinesRemoved).toBe(true);
    expect(episode?.descriptionHtml).not.toContain("00:00");
  });
});

describe("rejection rules", () => {
  const base = ep212Item();

  it("rejects an item with no guid, naming the reason", () => {
    expect(build({ ...base, guid: "" }).reason).toContain("guid");
  });

  it("rejects an unparseable publication date", () => {
    expect(build({ ...base, publishedAt: null, pubDate: "junk" }).reason).toContain("pubDate");
  });

  it("rejects an empty title", () => {
    expect(build({ ...base, title: "   " }).reason).toContain("title");
  });
});

describe("changedFields (idempotency support)", () => {
  const { episode } = build(ep212Item());
  if (episode === null) {
    throw new Error("fixture episode failed to build");
  }

  it("reports nothing for a re-run that only refreshed lastSeenAt", () => {
    const nextRun: Episode = { ...episode, lastSeenAt: "2026-10-26T00:00:00.000Z" };
    expect(changedFields(episode, nextRun)).toEqual([]);
  });

  it("reports the edited field when the upstream title changes", () => {
    const edited: Episode = { ...episode, titleHeadline: "سرتیترِ تازه" };
    const changed = changedFields(episode, edited);
    expect(changed).toContain("titleHeadline");
    // Identity fields never count as an update.
    expect(changed).not.toContain("guid");
    expect(changed).not.toContain("slug");
  });
});
