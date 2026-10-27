/**
 * Episode assembly — docs/ARCHITECTURE.md §5.1 and §11.1-4.
 *
 * The pipeline order is fixed by the architecture: raw field validation →
 * normalization → extraction (title/guests, chapters, sponsors, links) →
 * an `Episode`. An item that cannot be stored honestly is counted
 * `skippedInvalid` and logged with its GUID; one bad item never aborts the run.
 *
 * Every field is copied from the feed, derived by a §6 rule, or `null`.
 * Nothing is invented to fill a gap (no invented content, §5.1).
 */

import { ENCLOSURE_HOST, ENCLOSURE_PATH_PATTERN, IMAGE_HOST, ITEM_LINK_HOSTS } from "../config";
import { EpisodeSchema, type Chapter, type Episode, type Sponsor } from "../schema";
import { isAcastFooterBlock, isChapterBlock, splitBlocks, type DescriptionBlock } from "./blocks";
import { buildChapterList } from "./chapters";
import type { RawFeedItem } from "./feed";
import { sanitizeDescriptionHtml, sanitizedHtmlToText } from "./sanitize";
import { extractTitle } from "./title";
import { collapseWhitespace } from "./normalize";
import { extractSponsor } from "./sponsors";
import { normalizeYouTubeUrl, parseHttpsUrl } from "./urls";

/** Length of `descriptionExcerpt` (§5.1). */
export const EXCERPT_LENGTH = 200;

export interface BuildContext {
  /** The slug the allocator assigned to this GUID. */
  readonly slug: string;
  /** Person slugs for this item's confirmed guests (empty when none). */
  readonly guestSlugs: readonly string[];
  /** When the current run observed this item (§5.1 `lastSeenAt`). */
  readonly lastSeenAt: string;
}

export interface BuildResult {
  readonly episode: Episode | null;
  /** Set only when the item was rejected. */
  readonly reason: string | null;
}

/**
 * Build one Episode from a raw item.
 *
 * Returns `{ episode: null, reason }` when the record cannot be stored
 * honestly: a missing GUID, an unparseable `pubDate`, a missing title, or a
 * record that fails the Episode schema. The caller counts these as
 * `skippedInvalid`.
 */
export function buildEpisode(item: RawFeedItem, context: BuildContext): BuildResult {
  if (item.guid === "") {
    return { episode: null, reason: "missing guid" };
  }
  if (item.publishedAt === null) {
    return { episode: null, reason: `unparseable pubDate ${JSON.stringify(item.pubDate)}` };
  }
  if (item.title.trim() === "") {
    return { episode: null, reason: "missing title" };
  }

  const analysis = analyzeDescription(item.description);
  const title = extractTitle(item.title, analysis.blocksWithoutFooterAndAreas);

  const proseBlocks = analysis.blocks.filter(
    (block) => !analysis.removedIndices.has(block.index) && !isAcastFooterBlock(block)
  );

  const descriptionHtml = sanitizeDescriptionHtml(joinBlocks(proseBlocks));
  const descriptionExcerpt = buildExcerpt(descriptionHtml);

  const episode: Episode = {
    guid: item.guid,
    slug: context.slug,
    episodeNo: item.episodeNo,
    season: item.season,
    titleSource: item.title,
    titleHeadline: title.headline,
    titleByline: title.byline,
    roleText: title.roleText,
    publishedAt: item.publishedAt,
    durationSeconds: item.durationSeconds,
    audioUrl: enclosureUrlOrNull(item),
    audioBytes: item.enclosureBytes,
    audioType: item.enclosureType,
    imageUrl: httpsUrlOnHostOrNull(item.imageUrl, IMAGE_HOST),
    acastPageUrl: acastPageUrlOrNull(item),
    videoUrl: normalizeYouTubeUrl(item.link),
    guestSlugs: [...context.guestSlugs],
    // The store's schema types are mutable; the analysis carries the same
    // values already validated, so the shapes are copied plainly.
    chapters:
      analysis.chapters === null ? null : analysis.chapters.map((chapter) => ({ ...chapter })),
    chapterLinesRemoved: analysis.removedChapterIndices.length > 0,
    sponsor:
      analysis.sponsor === null
        ? null
        : {
            heading: analysis.sponsor.heading,
            entries: analysis.sponsor.entries.map((entry) => ({ ...entry }))
          },
    descriptionHtml,
    descriptionExcerpt,
    hostedOnAcast: analysis.footerText,
    lastSeenAt: context.lastSeenAt
  };

  const parsed = EpisodeSchema.safeParse(episode);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    return { episode: null, reason: `schema validation failed: ${fields}` };
  }
  return { episode: parsed.data, reason: null };
}

interface DescriptionAnalysis {
  /** Every block of the raw description, in order. */
  readonly blocks: readonly DescriptionBlock[];
  /** Blocks with the Acast footer and every extracted area removed. */
  readonly blocksWithoutFooterAndAreas: readonly DescriptionBlock[];
  /** Block indices removed from the prose (sponsor area + chapter lines). */
  readonly removedIndices: ReadonlySet<number>;
  readonly removedChapterIndices: readonly number[];
  readonly chapters: Chapter[] | null;
  readonly sponsor: Sponsor | null;
  readonly footerText: string | null;
}

/**
 * Run the extraction rules over one description in the §6.3b order: sponsors
 * first, chapters second, so chapter extraction never reaches inside the
 * sponsor area.
 */
/**
 * Exported for the sync pipeline: guest confirmation needs the same filtered
 * block list the assembler uses, and duplicating the §6.3b order in the
 * pipeline would let the two paths drift apart.
 */
export function analyzeDescription(rawDescription: string): DescriptionAnalysis {
  const blocks = splitBlocks(rawDescription);

  const footer = blocks.find(isAcastFooterBlock);
  const withoutFooter = footer === undefined ? blocks : blocks.filter((block) => block !== footer);

  const sponsor = extractSponsor(withoutFooter);

  const chapterPool = withoutFooter.filter(
    (block) => !sponsor.removedBlockIndices.includes(block.index)
  );
  const chapterBlocks = chapterPool.filter(isChapterBlock);
  const chapterList = buildChapterList(chapterBlocks.map((block) => block.text));

  const removedChapterIndices =
    chapterList === null ? [] : chapterBlocks.map((block) => block.index);

  const removedIndices = new Set<number>([
    ...sponsor.removedBlockIndices,
    ...removedChapterIndices,
    ...(footer === undefined ? [] : [footer.index])
  ]);

  return {
    blocks,
    blocksWithoutFooterAndAreas: blocks.filter((block) => !removedIndices.has(block.index)),
    removedIndices,
    removedChapterIndices,
    chapters:
      chapterList === null
        ? null
        : chapterList.map((line) => ({
            timeRaw: line.timeRaw,
            timeSeconds: line.timeSeconds,
            label: line.label
          })),
    sponsor:
      sponsor.sponsor === null
        ? null
        : {
            heading: sponsor.sponsor.heading,
            entries: sponsor.sponsor.entries.map((entry) => ({ text: entry.text, url: entry.url }))
          },
    footerText: footer?.text ?? null
  };
}

/**
 * Rebuild the HTML of the surviving blocks.
 *
 * `splitBlocks` gives each block's tag-stripped text, so the prose is rejoined
 * as `<p>` elements and then sanitized. What survives is only what the allowlist
 * permits, and no disallowed markup from the source can reach the store — the
 * sanitizer is the final gate, not the splitter.
 */
function joinBlocks(blocks: readonly DescriptionBlock[]): string {
  return blocks
    .map(
      (block) =>
        `<p>${block.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    )
    .join("");
}

function buildExcerpt(sanitizedHtml: string): string {
  const text = collapseWhitespace(sanitizedHtmlToText(sanitizedHtml));
  if (text.length <= EXCERPT_LENGTH) {
    return text;
  }
  // The bound covers the ellipsis: 200 is the whole field, not 200 + 1.
  return `${text.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`;
}

/* -- URL policy at the feed boundary (§8.3) -------------------------------- */

/**
 * The enclosure URL is shape-checked only (§7.1): https, the Acast host, and
 * the `/p/open/s/<showId>/e/<episodeId>/media.mp3` path shape. Sync never
 * fetches media, and never uses HEAD.
 */
function enclosureUrlOrNull(item: RawFeedItem): string | null {
  const parsed = parseHttpsUrl(item.enclosureUrl);
  if (parsed === null || parsed.host !== ENCLOSURE_HOST) {
    return null;
  }
  return ENCLOSURE_PATH_PATTERN.test(parsed.pathname) ? parsed.href : null;
}

function httpsUrlOnHostOrNull(value: string | null, host: string): string | null {
  const parsed = parseHttpsUrl(value);
  if (parsed === null || parsed.host !== host) {
    return null;
  }
  return parsed.href;
}

/**
 * The episode page URL per §5.1: the item `<link>` when its host is on the
 * allowlist; otherwise derived from `acast:episodeUrl`; otherwise `null`.
 * Anchor-era items keep `null` — their legacy links are degraded redirects
 * (CONTENT_SOURCES.md:94).
 */
function acastPageUrlOrNull(item: RawFeedItem): string | null {
  const parsed = parseHttpsUrl(item.link);
  if (parsed !== null && ITEM_LINK_HOSTS.includes(parsed.host)) {
    return parsed.href;
  }
  if (item.acastEpisodeUrl === null || !/^[A-Za-z0-9\-._~]+$/.test(item.acastEpisodeUrl)) {
    return null;
  }
  return `https://shows.acast.com/tabaghe16/episodes/${item.acastEpisodeUrl}`;
}

/* -- Idempotency support (§11.1-5) ----------------------------------------- */

/**
 * The stored fields that may change on a re-sync. `slug`, identity, and
 * first-seen data are excluded: a re-run that changes nothing but `lastSeenAt`
 * must not count as an update, and an episode's identity is preserved even when
 * its title is edited upstream (sync safety).
 */
export function changedFields(previous: Episode, next: Episode): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(next) as (keyof Episode)[]) {
    if (key === "lastSeenAt" || key === "slug" || key === "guid") {
      continue;
    }
    if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) {
      changed.push(key);
    }
  }
  return changed;
}
