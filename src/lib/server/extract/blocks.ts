/**
 * Description blocks — the shared substrate for the extraction rules of
 * docs/ARCHITECTURE.md §6.3 (chapters) and §6.4 (sponsors).
 *
 * Feed descriptions are HTML, but both extraction rules work on *blocks*: the
 * `<p>`-delimited runs (§6.1c: "blocks = split on `<p>`/`</p>`/`<br>`, tags
 * stripped"). Splitting the same way for both rules is what makes the ordering
 * guarantee of §6.3b hold — sponsor extraction defines an area, and chapter
 * extraction never reaches inside it.
 *
 * Every block keeps its index, because §6.4b needs "following sibling blocks"
 * and the fall-through rule of §6.4d needs to put back *exactly* the lines it
 * took.
 */

import { collapseWhitespace, norm } from "./normalize";
import { parseChapterLine } from "./chapters";

export interface DescriptionBlock {
  /** Zero-based position in the description, used by sibling lookups. */
  readonly index: number;
  /** The block's text with tags stripped and whitespace collapsed. */
  readonly text: string;
  /** The block's text normalized for comparison. */
  readonly normalized: string;
  /** True for a block that carries no text at all. */
  readonly isEmpty: boolean;
}

/** Split raw description HTML into blocks, in document order. */
export function splitBlocks(rawHtml: string): DescriptionBlock[] {
  const segments = rawHtml.split(/<\/?p[^>]*>|<br\s*\/?>/gi);
  const blocks: DescriptionBlock[] = [];

  for (const segment of segments) {
    const text = collapseWhitespace(stripTags(segment));
    blocks.push({
      index: blocks.length,
      text,
      normalized: norm(text),
      isEmpty: text === ""
    });
  }
  return blocks;
}

/** Strip every tag from a fragment, leaving only its text. */
export function stripTags(fragment: string): string {
  return fragment
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?[a-zA-Z][^>]*>/g, " ");
}

/* -- Recognized block types ------------------------------------------------ */

/**
 * A block that is a chapter line (§6.3a).
 *
 * The chapter parser owns the shape test; this wrapper is what lets the
 * extraction pipeline treat "one block per line" uniformly, so a chapter
 * candidate is a block the same way a sponsor heading is.
 */
export function isChapterBlock(block: DescriptionBlock): boolean {
  return parseChapterLine(block.text) !== null;
}

/**
 * The Acast footer sentence append to every description. Kept verbatim per
 * CONTENT_SOURCES.md:129 and rendered as the «میزبانی روی آکست» fine print
 * (the episode-detail composition) — never merged into the prose.
 */
const ACAST_FOOTER_PATTERN = /^hosted on acast\.?\s+see acast\.com\/privacy/i;

export function isAcastFooterBlock(block: DescriptionBlock): boolean {
  return ACAST_FOOTER_PATTERN.test(block.normalized) && block.normalized.length < 90;
}

/** The exact footer sentence as it appeared in the source, when present. */
export function findAcastFooter(blocks: readonly DescriptionBlock[]): string | null {
  const footer = blocks.find(isAcastFooterBlock);
  return footer === undefined ? null : footer.text;
}

/**
 * A linktr.ee-only line. It terminates the sponsor area of §6.4b and is never
 * a sponsor entry (the show's own hub is in the never-allow set).
 */
const LINKTR_ONLY_PATTERN = /^https?:\/\/(www\.)?linktr\.ee\/[A-Za-z0-9\-_./]*$/;

export function isLinktrOnlyBlock(block: DescriptionBlock): boolean {
  return LINKTR_ONLY_PATTERN.test(block.normalized) && block.normalized.length < 120;
}

/**
 * The two attested sponsor headings (§6.4a). The match is exact on the
 * normalized text, with a trailing `:` tolerated and stripped — a heading with
 * extra words around it is not a heading, which keeps a prose sentence that
 * merely mentions sponsors from being lifted out of a description.
 */
const SPONSOR_HEADING_PATTERN = /^(حامیان این قسمت|اسپانسر این قسمت)$/;

export function isSponsorHeadingBlock(block: DescriptionBlock): boolean {
  return SPONSOR_HEADING_PATTERN.test(stripTrailingColon(block.normalized));
}

function stripTrailingColon(value: string): string {
  return value.endsWith(":") ? value.slice(0, -1).trim() : value;
}

/**
 * URL tokens inside a block, in the source's own casing.
 *
 * The host check lowercases internally (`new URL()` normalizes the host), so
 * the token keeps the casing the source wrote — a sponsor blurb and its query
 * string are reproduced verbatim (§6.4c), never folded.
 */
export function urlsIn(block: DescriptionBlock): string[] {
  const matches = block.text.match(/https?:\/\/[^\s]+/g) ?? [];
  return matches.map((match) => match.replace(/[)،,.;»«"'»>]+$/, ""));
}

/** A non-URL text run of ≥ 2 words — the sponsor blurb of §6.4c-ii. */
export function nonUrlText(block: DescriptionBlock): string {
  return block.text
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
