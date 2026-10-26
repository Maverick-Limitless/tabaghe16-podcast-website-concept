/**
 * The episode row view model — one shared shape for every list of episodes
 * (archive, guest pages, search results when they arrive), so no page
 * re-derives labels or re-invents row markup (DESIGN.md §5.3; PRD §8 "no
 * duplicate component systems").
 *
 * Labels are formatted here, once, from store fields: the name tag is
 * omitted when the source has no episode number (never parsed out of a
 * title), dates are Jalali with the machine Gregorian value carried in the
 * `day` field, and durations keep Latin digits in the mono face.
 */

import { faNumber, formatDuration, formatYearPair, isoDay } from "#lib/dates";
import type { Episode } from "#lib/server/schema";

export interface EpisodeRowView {
  readonly slug: string;
  /** «قسمت ۲۱۲» — null when the source has no number. */
  readonly episodeNumberLabel: string | null;
  readonly headline: string;
  readonly byline: string | null;
  readonly publishedAt: string;
  readonly day: string;
  readonly yearLabel: string;
  readonly durationLabel: string | null;
  /** Verified artwork URL and number, for the row's mono thumb. */
  readonly imageUrl: string | null;
  readonly episodeNo: number | null;
  /** Descriptive alt from verified fields; empty when the source has no art. */
  readonly artAlt: string;
  /** True when the source carries validated chapter timestamps (§5.4 filter). */
  readonly hasChapters: boolean;
}

export function toEpisodeRowView(episode: Episode): EpisodeRowView {
  return {
    slug: episode.slug,
    episodeNumberLabel: episode.episodeNo === null ? null : `قسمت ${faNumber(episode.episodeNo)}`,
    headline: episode.titleHeadline ?? episode.titleSource,
    byline: episode.titleByline,
    publishedAt: episode.publishedAt,
    day: isoDay(episode.publishedAt),
    yearLabel: formatYearPair(episode.publishedAt),
    durationLabel:
      episode.durationSeconds === null ? null : formatDuration(episode.durationSeconds),
    imageUrl: episode.imageUrl,
    episodeNo: episode.episodeNo,
    artAlt:
      episode.imageUrl === null
        ? ""
        : `روی جلد قسمت ${episode.episodeNo === null ? "" : faNumber(episode.episodeNo)}؛ ${episode.titleSource}`,
    hasChapters: episode.chapters !== null && episode.chapters.length > 0
  };
}

export interface EpisodeYearGroup {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly EpisodeRowView[];
}

/**
 * Group rows by publication year in feed order — chronology is the spine of
 * the archive, because episode numbers are unreliable (CONTENT_SOURCES.md).
 * Each row is already in newest-first order from the caller.
 */
export function groupByYear(rows: readonly EpisodeRowView[]): EpisodeYearGroup[] {
  const order: string[] = [];
  const byYear = new Map<string, EpisodeRowView[]>();

  for (const row of rows) {
    const key = row.day.slice(0, 4);
    const bucket = byYear.get(key);
    if (bucket === undefined) {
      byYear.set(key, [row]);
      order.push(key);
    } else {
      bucket.push(row);
    }
  }

  return order.map((key) => ({
    key,
    label: rows.find((row) => row.day.startsWith(key))?.yearLabel ?? key,
    rows: byYear.get(key) ?? []
  }));
}
