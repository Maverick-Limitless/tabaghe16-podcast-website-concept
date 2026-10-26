/**
 * Store schemas — docs/ARCHITECTURE.md §5.
 *
 * These schemas are the contract between the sync writer (`scripts/sync.ts`,
 * owned by the data stage) and every reader. They are applied on both sides:
 * the writer validates before it commits, and each loader re-validates on
 * read, because the store is a hand-editable text file and the build must
 * refuse to render invalid data rather than render nonsense (§11.3).
 *
 * Every field is either copied from the feed, derived from it by the extraction
 * rules, curated, or null — a field is never invented to fill a gap.
 */

import { z } from "zod";
import { ENCLOSURE_HOST, ENCLOSURE_PATH_PATTERN, IMAGE_HOST } from "./config";

/* -- URL and timestamp helpers (§8.3) ------------------------------------ */

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

/** https-only, on an allowlisted host list. */
function isHttpsUrlOn(value: string, hosts: readonly string[]): boolean {
  if (!isHttpsUrl(value)) {
    return false;
  }
  try {
    return hosts.includes(new URL(value).host);
  } catch {
    return false;
  }
}

/** Enclosure shape only — sync never fetches media to validate it (§7.1). */
function isEnclosureUrl(value: string): boolean {
  if (!isHttpsUrl(value)) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.host === ENCLOSURE_HOST && ENCLOSURE_PATH_PATTERN.test(parsed.pathname);
  } catch {
    return false;
  }
}

const httpsUrl = z.string().refine(isHttpsUrl, "must be an absolute https URL");
const pioImageUrl = z
  .string()
  .refine((value) => isHttpsUrlOn(value, [IMAGE_HOST]), "must be https on assets.pippa.io");
const enclosureUrl = z.string().refine(isEnclosureUrl, "must be a sphinx.acast.com enclosure");
const isoDateTime = z.string().refine(isIsoDateTime, "must be an ISO-8601 UTC timestamp");

const nonEmptyString = z.string().min(1);
const nonNegativeInt = z.number().int().nonnegative();

/* -- Value objects (§5.3) ------------------------------------------------ */

export const ChapterSchema = z
  .object({
    timeRaw: nonEmptyString,
    timeSeconds: nonNegativeInt,
    label: nonEmptyString
  })
  .strict();

export const SponsorEntrySchema = z
  .object({
    text: nonEmptyString,
    url: httpsUrl
  })
  .strict();

export const SponsorSchema = z
  .object({
    heading: nonEmptyString,
    entries: z.array(SponsorEntrySchema)
  })
  .strict();

export type Chapter = z.infer<typeof ChapterSchema>;
export type SponsorEntry = z.infer<typeof SponsorEntrySchema>;
export type Sponsor = z.infer<typeof SponsorSchema>;

/* -- Entities (§5.1, §5.2, §5.4, §5.5) ---------------------------------- */

export const EpisodeSchema = z
  .object({
    guid: nonEmptyString,
    slug: nonEmptyString,
    episodeNo: nonNegativeInt.nullable(),
    season: nonNegativeInt.nullable(),
    titleSource: z.string(),
    titleHeadline: z.string().nullable(),
    titleByline: z.string().nullable(),
    roleText: z.string().nullable(),
    publishedAt: isoDateTime,
    durationSeconds: nonNegativeInt.nullable(),
    audioUrl: enclosureUrl.nullable(),
    audioBytes: nonNegativeInt.nullable(),
    audioType: z.string().nullable(),
    imageUrl: pioImageUrl.nullable(),
    acastPageUrl: httpsUrl.nullable(),
    videoUrl: httpsUrl.nullable(),
    guestSlugs: z.array(nonEmptyString),
    chapters: z.array(ChapterSchema).nullable(),
    chapterLinesRemoved: z.boolean(),
    sponsor: SponsorSchema.nullable(),
    descriptionHtml: z.string(),
    descriptionExcerpt: z.string(),
    hostedOnAcast: z.string().nullable(),
    lastSeenAt: isoDateTime
  })
  .strict();

export const PersonSchema = z
  .object({
    slug: nonEmptyString,
    displayName: nonEmptyString,
    isHost: z.boolean(),
    image: z.null(),
    bio: z.null()
  })
  .strict();

export const TopicSchema = z
  .object({
    slug: nonEmptyString,
    title: nonEmptyString,
    description: z.string().nullable(),
    episodeGuids: z.array(nonEmptyString)
  })
  .strict();

export const SyncRunSchema = z
  .object({
    startedAt: isoDateTime,
    finishedAt: isoDateTime.nullable(),
    status: z.enum(["ok", "failed"]),
    counts: z
      .object({
        fetched: nonNegativeInt,
        new: nonNegativeInt,
        updated: nonNegativeInt,
        unchanged: nonNegativeInt,
        skippedInvalid: nonNegativeInt
      })
      .strict(),
    lastSuccessfulSyncAt: isoDateTime.nullable(),
    error: z.string().nullable()
  })
  .strict();

/** Editorial override (§4.2). Sync never reads or writes this shape. */
export const OverrideSchema = z
  .object({
    featured: z.boolean().optional(),
    note: z.string().optional(),
    hide: z.boolean().optional()
  })
  .strict();

/* -- Store-level schemas ------------------------------------------------- */

export const EpisodeStoreSchema = z.array(EpisodeSchema);
export const PersonStoreSchema = z.array(PersonSchema);
export const TopicStoreSchema = z.array(TopicSchema);
export const OverrideStoreSchema = z.record(nonEmptyString, OverrideSchema);

export type Episode = z.infer<typeof EpisodeSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type SyncRun = z.infer<typeof SyncRunSchema>;
export type Override = z.infer<typeof OverrideSchema>;
