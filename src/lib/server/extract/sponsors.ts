/**
 * Sponsor blocks — docs/ARCHITECTURE.md §6.4.
 *
 * Sponsor membership is per-episode and time-sensitive (CONTENT_SOURCES.md), so
 * it is extracted from the episode's own description and never promoted to a
 * show-level constant.
 *
 * The two rules that shape this module:
 *
 * - **Fall-through (§6.4d).** If the area yields zero valid entries,
 *   `sponsor = null` and every line of the area — the heading included —
 *   remains in the description prose verbatim. Nothing is silently dropped or
 *   mangled. EP145's «اسپانسر این قسمت» plus a linktr.ee-only line is the pinned
 *   fixture case for this.
 * - **No link is ever inferred.** An entry needs both a blurb of ≥ 2 non-URL
 *   words and an https URL on a public host outside the never-allow set; a
 *   URL-only or blurb-less line is not an entry.
 */

import { isSponsorUrlAllowed } from "./urls";
import {
  isAcastFooterBlock,
  isLinktrOnlyBlock,
  isSponsorHeadingBlock,
  nonUrlText,
  urlsIn,
  wordCount,
  type DescriptionBlock
} from "./blocks";

export interface SponsorExtraction {
  readonly sponsor: {
    readonly heading: string;
    readonly entries: readonly { text: string; url: string }[];
  } | null;
  /** Indices of the blocks removed from the prose (empty on fall-through). */
  readonly removedBlockIndices: readonly number[];
}

/**
 * Extract the sponsor block described by §6.4.
 *
 * The area starts at a heading and runs through following sibling blocks until
 * it hits the Acast footer, a linktr.ee-only line, or the next recognized block
 * type. The terminator itself is not part of the area, which is what keeps the
 * show's own link hub in the prose where §5.1 puts it.
 */
export function extractSponsor(blocks: readonly DescriptionBlock[]): SponsorExtraction {
  const headingIndex = blocks.findIndex(isSponsorHeadingBlock);
  if (headingIndex === -1) {
    return { sponsor: null, removedBlockIndices: [] };
  }

  const areaEnd = findAreaEnd(blocks, headingIndex);
  const area = blocks.slice(headingIndex, areaEnd);

  const entries = collectEntries(area);
  if (entries.length === 0) {
    // §6.4d — the whole area, heading included, stays in the prose.
    return { sponsor: null, removedBlockIndices: [] };
  }

  return {
    sponsor: {
      // The heading keeps the source's own wording (§6.4e).
      heading: blocks[headingIndex]?.text ?? "",
      entries
    },
    removedBlockIndices: area.map((block) => block.index)
  };
}

/** The exclusive end index of the sponsor area starting at `startIndex`. */
function findAreaEnd(blocks: readonly DescriptionBlock[], startIndex: number): number {
  for (let index = startIndex + 1; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block === undefined) {
      break;
    }
    if (isAcastFooterBlock(block) || isLinktrOnlyBlock(block) || isSponsorHeadingBlock(block)) {
      return index;
    }
  }
  return blocks.length;
}

/**
 * One entry per block carrying both a valid https URL and a blurb of ≥ 2
 * non-URL words (§6.4c). Blocks that fail validation are skipped, not rewritten.
 */
function collectEntries(area: readonly DescriptionBlock[]): { text: string; url: string }[] {
  const entries: { text: string; url: string }[] = [];

  for (const block of area) {
    if (isSponsorHeadingBlock(block) || block.isEmpty) {
      continue;
    }

    const url = firstAllowedSponsorUrl(block);
    if (url === null) {
      continue;
    }

    const blurb = nonUrlText(block);
    if (wordCount(blurb) < 2) {
      continue;
    }

    entries.push({ text: blurb, url });
  }

  return entries;
}

function firstAllowedSponsorUrl(block: DescriptionBlock): string | null {
  for (const candidate of urlsIn(block)) {
    const allowed = isSponsorUrlAllowed(candidate);
    if (allowed !== null) {
      return allowed;
    }
  }
  return null;
}
