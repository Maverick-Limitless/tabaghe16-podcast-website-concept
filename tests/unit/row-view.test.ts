/**
 * The row view model — docs/DESIGN.md §5.3, §3.3.
 *
 * Every label a list renders is derived here, once, from store fields: the
 * name tag appears only when the source numbered the episode (numbers are
 * labels, never addresses), dates carry both calendar keys, durations stay
 * Latin in the mono voice, and the thumb's alt text comes from verified
 * fields only.
 */

import { describe, expect, it } from "vitest";

import { toEpisodeRowView } from "#lib/row-view";
import type { Episode } from "#lib/server/schema";

/** A minimal store episode with only the fields under test. */
function episode(fields: Partial<Episode>): Episode {
  return {
    guid: "g",
    slug: "ep-1",
    episodeNo: null,
    season: null,
    titleSource: "عنوانِ کامل",
    titleHeadline: null,
    titleByline: null,
    roleText: null,
    publishedAt: "2026-10-17T04:10:06.000Z",
    durationSeconds: null,
    audioUrl: null,
    audioBytes: null,
    audioType: null,
    imageUrl: null,
    acastPageUrl: null,
    videoUrl: null,
    guestSlugs: [],
    chapters: null,
    chapterLinesRemoved: false,
    sponsor: null,
    descriptionHtml: "",
    descriptionExcerpt: "",
    hostedOnAcast: null,
    lastSeenAt: "2026-10-25T00:00:00.000Z",
    ...fields
  };
}

describe("toEpisodeRowView", () => {
  it("derives the name tag from the source number only", () => {
    expect(toEpisodeRowView(episode({ episodeNo: 212 })).episodeNumberLabel).toContain("۲۱۲");
    expect(toEpisodeRowView(episode({ episodeNo: null })).episodeNumberLabel).toBeNull();
  });

  it("uses the headline when the title was split, else the whole title", () => {
    const row = toEpisodeRowView(episode({ titleHeadline: "سرتیتر", titleByline: "مهمان" }));
    expect(row.headline).toBe("سرتیتر");
    expect(row.byline).toBe("مهمان");

    const whole = toEpisodeRowView(episode({}));
    expect(whole.headline).toBe("عنوانِ کامل");
    expect(whole.byline).toBeNull();
  });

  it("carries both calendar keys and the machine day", () => {
    const row = toEpisodeRowView(episode({}));
    expect(row.day).toBe("2026-10-17");
    expect(row.yearLabel).toBe("۱۴۰۵ · 2026");
  });

  it("formats duration only when the source provides one", () => {
    expect(toEpisodeRowView(episode({ durationSeconds: 6075 })).durationLabel).toBe("1:41:15");
    expect(toEpisodeRowView(episode({})).durationLabel).toBeNull();
  });

  it("builds the thumb alt from verified fields, empty when there is no art", () => {
    const withArt = toEpisodeRowView(
      episode({ episodeNo: 212, imageUrl: "https://assets.pippa.io/x.jpeg" })
    );
    expect(withArt.artAlt).toContain("۲۱۲");
    expect(toEpisodeRowView(episode({})).artAlt).toBe("");
  });

  it("marks chapter presence for the archive filter", () => {
    const withChapters = toEpisodeRowView(
      episode({ chapters: [{ timeRaw: "00:00", timeSeconds: 0, label: "آغاز" }] })
    );
    expect(withChapters.hasChapters).toBe(true);
    expect(toEpisodeRowView(episode({})).hasChapters).toBe(false);
  });
});
