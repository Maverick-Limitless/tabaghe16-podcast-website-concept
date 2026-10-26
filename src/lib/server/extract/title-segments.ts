/**
 * Title segmentation — the mechanical half of docs/ARCHITECTURE.md §6.1.
 *
 * The guest side of a title is not fixed in this feed: guests appear after the
 * pipe («EP212 - <topic> | <name>، <role>») and before it («EP 211 - <name> |
 * <topic>»), in multi-guest lists, across two pipes, and after a hyphen in the
 * Anchor-era titles. This module turns a raw title into ordered segments and
 * parts; `title.ts` decides which parts are guests.
 *
 * The `NON_NAME` denylist lives here because it is a property of *parts*, not
 * of the bio anchors: a topic phrase or a brand name is never an identity, no
 * matter what matches it (§6.1f).
 */

import { norm, trimEdgeControls } from "./normalize";

/** An episode-tag prefix, stripped in step (a). */
const PREFIX_PATTERN = /^\s*(?:episode\s*\d+|ep\s*\d+|\d+)\s*[-–—:،]?\s*/i;

/** A leading bracket marker such as `[English]`, stripped in step (a). */
const BRACKET_PATTERN = /^\[[^\]]*\]\s*/;

export interface TitlePart {
  readonly text: string;
  readonly segmentIndex: number;
  readonly partIndex: number;
}

export interface TitleSegment {
  readonly text: string;
  readonly parts: readonly TitlePart[];
}

export interface TitleSplit {
  readonly prefix: string;
  readonly bracket: string;
  readonly remainder: string;
  readonly segments: readonly TitleSegment[];
  readonly parts: readonly TitlePart[];
}

/**
 * Split a raw title into ordered segments and parts (§6.1a–b).
 *
 * Segments come from the pipe; every segment is then split on *spaced* dashes
 * (never intra-word hyphens like `ex-Google`); every resulting piece is split
 * on `،` and `,`. Each part carries its (segmentIndex, partIndex) position,
 * which is the ordering key the winner rule of §6.1e uses.
 */
export function splitTitle(rawTitle: string): TitleSplit {
  const prefixMatch = PREFIX_PATTERN.exec(rawTitle);
  const prefix = prefixMatch === null ? "" : prefixMatch[0];
  let remainder = rawTitle.slice(prefix.length);

  const bracketMatch = BRACKET_PATTERN.exec(remainder);
  const bracket = bracketMatch === null ? "" : bracketMatch[0];
  remainder = remainder.slice(bracket.length);

  const segments: TitleSegment[] = [];
  const parts: TitlePart[] = [];

  const pipeSegments = remainder.split("|");
  let partIndex = 0;

  pipeSegments.forEach((pipeSegment, segmentIndex) => {
    const pieces = splitOnSpacedDashes(pipeSegment);
    const segmentParts: TitlePart[] = [];

    for (const piece of pieces) {
      for (const piecePart of splitOnCommas(piece)) {
        const text = trimEdgeControls(piecePart);
        if (text === "") {
          continue;
        }
        const part: TitlePart = { text, segmentIndex, partIndex };
        partIndex += 1;
        segmentParts.push(part);
        parts.push(part);
      }
    }

    segments.push({ text: trimEdgeControls(pipeSegment), parts: segmentParts });
  });

  return { prefix, bracket, remainder, segments, parts };
}

/**
 * Split on a dash that has whitespace or a bidi character on at least one side.
 * Intra-word hyphens (`ex-Google`, `Podcast-16`) are never separators.
 */
function splitOnSpacedDashes(segment: string): string[] {
  const result: string[] = [];
  let current = "";

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index] ?? "";

    if (isDash(char)) {
      const before = current.slice(-1) ?? "";
      const after = segment[index + 1] ?? "";
      if (isSpaceOrControl(before) || isSpaceOrControl(after)) {
        result.push(current);
        current = "";
        index += 1;
        while (index < segment.length && isSpaceOrControl(segment[index] ?? "")) {
          index += 1;
        }
        index -= 1;
        continue;
      }
    }
    current += char;
  }
  result.push(current);

  return result.map((piece) => trimEdgeControls(piece)).filter((piece) => piece !== "");
}

/** Split on `،` (U+060C) and ASCII `,`, keeping separators out of the parts. */
function splitOnCommas(piece: string): string[] {
  return piece.split(/[،,]/).map((part) => part.trim());
}

function isDash(char: string): boolean {
  return char === "-" || char === "–" || char === "—";
}

function isSpaceOrControl(char: string): boolean {
  if (char === "") {
    return false;
  }
  if (char === " " || char === "\t" || char === "\n") {
    return true;
  }
  const code = char.codePointAt(0) ?? 0;
  // ZWNJ and the bidi controls that surround dashes in real titles.
  return (
    (code >= 0x200b && code <= 0x200f) ||
    code === 0x061c ||
    code === 0x2066 ||
    code === 0x2067 ||
    code === 0x2068 ||
    code === 0x2069 ||
    (code >= 0x202a && code <= 0x202e)
  );
}

/* -- §6.1f — the NON_NAME denylist ---------------------------------------- */

/**
 * Topic and brand phrases that otherwise pass the anchor match.
 *
 * Seeded from probe runs: «هوش مصنوعی» matched a bio opening in two episodes
 * and "ChatGPT" matched "ChatGPT is …". This is a curated, reviewable list —
 * the same editorial-curation principle as §9.4 topics, not keyword mining.
 * Extend only by a committed change with a test.
 */
export const NON_NAME: readonly string[] = [
  "هوش مصنوعی",
  "artificial intelligence",
  "machine learning",
  "یادگیری ماشین",
  "chatgpt",
  "openai",
  "google",
  "apple"
];

const NON_NAME_NORMALIZED: ReadonlySet<string> = new Set(NON_NAME.map((entry) => norm(entry)));

/** True when a part is on the denylist and can never be a guest name. */
export function isNonNamePart(part: string): boolean {
  return NON_NAME_NORMALIZED.has(norm(part));
}
