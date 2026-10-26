/**
 * Chapter parsing — docs/ARCHITECTURE.md §6.3.
 *
 * There is no structured chapters element in this feed (zero Podcasting 2.0
 * tags in all 215 items), so chapters are parsed from *description text* only,
 * and only where the format is verifiable. That constraint is the whole design:
 *
 * - **Line shape (§6.3a):** optional bidi controls, then `M:SS` | `MM:SS` |
 *   `HH:MM:SS` (minutes may exceed 59 — real data has `69:30`), then a
 *   separator that is any mix of space, ZWNJ, LRM, RLM, FSI/PDI, ` | `, ` - `,
 *   `–`, then a non-empty label of ≤ 120 chars.
 * - **Threshold (§6.3b):** a list exists only with ≥ 3 valid lines, so one or
 *   two stray timestamps in prose never manufacture chapters.
 * - **Extraction (§6.3c):** a confirmed list is removed from the prose; lines
 *   that do not match, or a sub-threshold list, stay verbatim.
 * - **Bounds (§6.3d):** when `durationSeconds` exists, stamps at or beyond the
 *   duration are kept but flagged, because the player clamps seeks to the
 *   media's real duration at runtime.
 *
 * Minutes above 59 are tolerated by converting to seconds arithmetically
 * (`69:30` → 4170), which is the only reading that keeps an out-of-spec stamp
 * from becoming a nonsense timestamp.
 */

import { collapseWhitespace, norm, toAsciiDigits } from "./normalize";

/** Maximum label length (§6.3a). */
const MAX_LABEL_LENGTH = 120;

/** Lines required before a list is considered chapters (§6.3b). */
export const MIN_CHAPTER_LINES = 3;

export interface ChapterLine {
  /** The timestamp exactly as it appeared, digits already folded to ASCII. */
  readonly timeRaw: string;
  readonly timeSeconds: number;
  /** The label, bidi controls stripped, ZWNJ inside words preserved. */
  readonly label: string;
  /** The full line, for removal from the prose. */
  readonly rawLine: string;
}

/**
 * A timestamp followed by a separator and a label.
 *
 * The separator class is deliberately permissive — `[\s\u200C\u200E\u200F]`
 * covers the plain-space, ZWNJ, LRM and RLM separators, and `[|–—-]` covers
 * the pipe, en dash, em dash and hyphen. FSI/PDI (U+2066–U+2069) wrap the label
 * in the newest style, so they are stripped from the label rather than treated
 * as separators.
 */
const CHAPTER_LINE_PATTERN =
  /^[\s\u200E\u200F\u2066-\u2069\u061C]*((?:\d{1,3}:)?\d{1,2}:\d{2})[\s\u200C\u200E\u200F\u2066-\u2069]*([|–—\-][\s\u200C\u200E\u200F\u2066-\u2069]*)?(.+)$/u;

/**
 * Parse every line that looks like a chapter line, in document order. This is
 * the *candidate* pass: the caller applies the ≥3 threshold.
 */
export function parseChapterLines(lines: readonly string[]): ChapterLine[] {
  const parsed: ChapterLine[] = [];

  for (const line of lines) {
    const collapsed = collapseWhitespace(line);
    if (collapsed === "") {
      continue;
    }
    const chapter = parseChapterLine(collapsed);
    if (chapter !== null) {
      parsed.push(chapter);
    }
  }
  return parsed;
}

/** Parse one line, or `null` when it is not a verifiable chapter line. */
export function parseChapterLine(line: string): ChapterLine | null {
  const collapsed = collapseWhitespace(line);
  if (collapsed === "") {
    return null;
  }

  const match = CHAPTER_LINE_PATTERN.exec(collapsed);
  if (match === null) {
    return null;
  }

  const rawStamp = match[1] ?? "";
  const labelText = cleanLabel(match[3] ?? "");
  if (labelText === null) {
    return null;
  }

  const seconds = stampToSeconds(rawStamp);
  if (seconds === null) {
    return null;
  }

  return {
    timeRaw: rawStamp,
    timeSeconds: seconds,
    label: labelText,
    rawLine: collapsed
  };
}

/** `HH:MM:SS`, `MM:SS`, `M:SS` — or `null` for anything else. */
export function stampToSeconds(stamp: string): number | null {
  const normalized = toAsciiDigits(stamp.trim());
  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const numbers: number[] = [];
  for (const [index, part] of parts.entries()) {
    // The final part is always whole seconds, written with exactly two
    // digits; the minutes/hours parts may be one to three. `1:2` is not a
    // shape the feed writes and does not become 62 seconds.
    const isSeconds = index === parts.length - 1;
    if (!/^\d{1,3}$/.test(part) || (isSeconds && !/^\d{2}$/.test(part))) {
      return null;
    }
    numbers.push(Number.parseInt(part, 10));
  }

  const [hoursOrMinutes, minutesOrSeconds, seconds] =
    parts.length === 3 ? numbers : [0, numbers[0] ?? 0, numbers[1] ?? 0];

  const total = (hoursOrMinutes ?? 0) * 3600 + minutesOrSeconds * 60 + (seconds ?? 0);

  // A stamp is only plausible inside a media file; the longest real item in
  // this feed is 11,195 s (CONTENT_SOURCES.md), so anything past a 24-hour
  // reading is a malformed value rather than an out-of-spec minute value.
  if (total > 86_400 || hoursOrMinutes > 23 || minutesOrSeconds > 595) {
    return null;
  }
  return total;
}

/**
 * Clean a candidate label, or return `null` when the line is not a chapter
 * line. A label longer than the §6.3a bound of 120 chars, a label that is only
 * punctuation, or an empty label all fail the line shape — the line then stays
 * in the prose verbatim instead of becoming a mangled chapter.
 */
function cleanLabel(raw: string): string | null {
  /*
   * ZWNJ (U+200C) and ZWJ (U+200D) are kept: they are spelling, not marks —
   * «بخش‌هایی» stays one word as the source wrote it.
   */
  const withoutBidi = raw.replace(/[\u200B\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, "");
  // ZWNJ inside words is preserved (tests/fixtures/README.md); only the marks
  // that carry no visual value are dropped, then whitespace is collapsed.
  const collapsed = collapseWhitespace(withoutBidi);
  if (collapsed === "") {
    return null;
  }
  if (norm(collapsed) === "") {
    return null;
  }
  // A label that carries no letter or digit is punctuation noise — a lone
  // pipe or dash left behind by a truncated line — and stays in the prose.
  if (!/\p{L}|\p{N}/u.test(collapsed)) {
    return null;
  }
  if (collapsed.length > MAX_LABEL_LENGTH) {
    return null;
  }
  return collapsed;
}

/**
 * Apply the §6.3 threshold and deduplicate by timestamp (first label wins).
 * Returns `null` when the list is below the threshold — the caller then leaves
 * the lines in the prose untouched.
 */
export function buildChapterList(lines: readonly string[]): ChapterLine[] | null {
  const parsed = parseChapterLines(lines);
  if (parsed.length < MIN_CHAPTER_LINES) {
    return null;
  }
  return dedupeChapters(parsed);
}

/** Sort by time and merge duplicate stamps, keeping the first label seen. */
export function dedupeChapters(parsed: readonly ChapterLine[]): ChapterLine[] {
  const byStamp = new Map<number, ChapterLine>();
  for (const chapter of parsed) {
    if (!byStamp.has(chapter.timeSeconds)) {
      byStamp.set(chapter.timeSeconds, chapter);
    }
  }
  return [...byStamp.values()].sort((left, right) => left.timeSeconds - right.timeSeconds);
}
