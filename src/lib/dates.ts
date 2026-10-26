/**
 * Date and time formatting — docs/DESIGN.md §3.3-3.
 *
 * Display dates are Jalali via `Intl.DateTimeFormat('fa-IR')`; the machine
 * Gregorian value is carried alongside in a `<time datetime="…">` attribute so
 * the page is honest for both readers and machines. Durations render as Latin
 * `H:MM:SS` in the mono face, because that is the show's own timestamp
 * vernacular (DESIGN.md §3.1).
 *
 * Formatting is pinned to UTC so a stored ISO timestamp always yields the same
 * calendar day regardless of where the build runs.
 */

const JALALI_PARTS = new Intl.DateTimeFormat("fa-IR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

const JALALI_YEAR = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  timeZone: "UTC"
});

const GREGORIAN_YEAR = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  timeZone: "UTC"
});

/**
 * «شنبه ۲۵ مهر ۱۴۰۵» — long Jalali form, in the order DESIGN.md §3.3-3 shows.
 * The parts are reassembled in that order because ICU's own long format puts
 * the weekday last («۱۴۰۵ مهر ۲۵, شنبه»), which reads wrong in an RTL page.
 */
export function formatJalaliDate(iso: string): string {
  const parts = new Map(
    JALALI_PARTS.formatToParts(new Date(iso)).map((part) => [part.type, part.value])
  );

  return [parts.get("weekday"), parts.get("day"), parts.get("month"), parts.get("year")]
    .filter((value): value is string => value !== undefined && value !== "")
    .join(" ");
}

/** The day part of an ISO timestamp, for `<time datetime>`. */
export function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * «۱۴۰۵ · 2026» — the two-key year label used by archive year groups, which
 * carry both calendars so neither reader is left guessing.
 */
export function formatYearPair(iso: string): string {
  return `${JALALI_YEAR.format(new Date(iso))} · ${GREGORIAN_YEAR.format(new Date(iso))}`;
}

/**
 * Latin `H:MM:SS`, or `M:SS` under an hour, for the mono face.
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Latin digits to Persian digits (`212` → «۲۱۲») — DESIGN.md §3.3-2.
 *
 * Used for counts, episode name-tags, and any editorial figure in Persian
 * prose, which the design specifies in Persian digits. Machine data (stamps,
 * durations, URLs, Latin brand words) keeps Latin digits and is never routed
 * through this helper.
 */
export function faNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(value);
}
