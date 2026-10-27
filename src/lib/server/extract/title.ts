/**
 * Guest confirmation and title output — docs/ARCHITECTURE.md §6.1d–g.
 *
 * This module owns the answer to "is this title fragment the episode's guest?".
 * Everything that could be a name is either confirmed by the episode's own bio
 * anchor or left alone, and a title with no confirmed part renders whole with
 * no person record — which is the conservative outcome no invented taxonomies requires, since
 * inventing a guest is worse than showing none.
 */

import { norm, isTokenPrefixMatch, trimEdgeControls, normTokens } from "./normalize";
import { isNonNamePart, splitTitle, type TitlePart, type TitleSplit } from "./title-segments";
import { extractBioAnchors, type BioAnchors } from "./title-anchors";
import type { DescriptionBlock } from "./blocks";

/** The host, as documented in §6.1c. */
export const HOST_ALIASES: readonly string[] = ["سهیل", "سهیل علوی", "soheil alavi"];

const HOST_ALIASES_NORMALIZED: ReadonlySet<string> = new Set(
  HOST_ALIASES.map((alias) => norm(alias))
);

/** The `من، X و Y` enumerator of §6.1g. */
const ENUMERATOR_PATTERN = /من،?\s*([^،,]+)\s+و\s+([^،,.]+)/u;

export interface TitleExtraction {
  /** The editorial headline, or `null` when the title renders whole. */
  readonly headline: string | null;
  /** The guest byline, or `null` when no guest was confirmed. */
  readonly byline: string | null;
  /** Role/affiliation fragments from the guest segment and later segments. */
  readonly roleText: string | null;
  /** Guest parts in title order. */
  readonly guestNames: readonly string[];
  /** True when a part was confirmed as the host by alias. */
  readonly guestIsHost: boolean;
}

/**
 * Extract the headline, byline, and role text for one episode.
 *
 * The result type makes the no-guest case explicit rather than a fallback
 * that pages have to remember: `headline === null` means "render `titleSource`
 * whole, create no person record".
 */
export function extractTitle(
  rawTitle: string,
  blocks: readonly DescriptionBlock[]
): TitleExtraction {
  const split = splitTitle(rawTitle);
  const anchors = extractBioAnchors(blocks);

  const confirmed = confirmGuestParts(split, anchors);
  if (confirmed.length === 0) {
    return { headline: null, byline: null, roleText: null, guestNames: [], guestIsHost: false };
  }

  const enumeratorConfirmed = applyEnumerator(split, blocks, confirmed);

  // §6.1e — the earliest confirmed part in title order decides the guest
  // segment; every other confirmed part of that segment is a guest too.
  const winner = enumeratorConfirmed[0] ?? confirmed[0];
  const guestSegmentIndex = winner?.segmentIndex ?? 0;
  const guestSegment = split.segments[guestSegmentIndex];

  const confirmedIndices = new Set(enumeratorConfirmed.map((part) => part.partIndex));
  const guestIndices = new Set(
    (guestSegment?.parts ?? [])
      .filter((part) => confirmedIndices.has(part.partIndex))
      .map((part) => part.partIndex)
  );

  const guestNames = split.parts
    .filter((part) => guestIndices.has(part.partIndex))
    .map((part) => part.text);

  const guestIsHost = guestNames.some((name) => HOST_ALIASES_NORMALIZED.has(norm(name)));

  const headline = pickHeadline(split, guestSegmentIndex);
  /*
   * The headline was edge-trimmed by pickHeadline, so the comparison trims
   * the candidate too — otherwise a trailing space in the source segment
   * makes this lookup miss, and the headline then repeats itself inside the
   * role text (a defect the fixture test caught).
   */
  const chosenSegment = split.segments.find(
    (segment) =>
      segment.parts[0]?.segmentIndex !== guestSegmentIndex && segment.text.trim() === headline
  );

  const roleFragments: string[] = [];
  for (const segment of split.segments) {
    if (segment.parts.length === 0) {
      continue;
    }
    if (segment.parts[0]?.segmentIndex === guestSegmentIndex) {
      // The remaining parts of the guest segment are its role text.
      for (const part of segment.parts) {
        if (!guestIndices.has(part.partIndex)) {
          roleFragments.push(part.text);
        }
      }
      continue;
    }
    // A later non-guest segment appends to the role text; the headline segment
    // is already rendered as the headline, so it never repeats itself there.
    if (
      chosenSegment === undefined ||
      segment.parts[0]?.segmentIndex !== chosenSegment.parts[0]?.segmentIndex
    ) {
      roleFragments.push(segment.text);
    }
  }

  const roleText = roleFragments.length === 0 ? null : joinFragments(roleFragments);

  return {
    headline,
    byline: guestNames.length === 0 ? null : joinNames(guestNames),
    roleText,
    guestNames,
    guestIsHost
  };
}

/** Parts of the split that one of the anchors confirms (§6.1d). */
function confirmGuestParts(split: TitleSplit, anchors: BioAnchors): TitlePart[] {
  const confirmed: TitlePart[] = [];

  for (const part of split.parts) {
    if (isNonNamePart(part.text)) {
      continue;
    }
    if (isConfirmedPart(part, anchors)) {
      confirmed.push(part);
    }
  }
  return confirmed;
}

/** A part is confirmed on an anchor equality, a token-prefix, or a host alias. */
function isConfirmedPart(part: TitlePart, anchors: BioAnchors): boolean {
  if (HOST_ALIASES_NORMALIZED.has(norm(part.text))) {
    return true;
  }

  const candidates: string[] = [
    anchors.commaRun ?? "",
    anchors.twoToken ?? "",
    anchors.threeToken ?? "",
    anchors.leadIn ?? ""
  ];

  for (const anchor of candidates) {
    if (anchor === "") {
      continue;
    }
    if (norm(part.text) === norm(anchor)) {
      return true;
    }
    // Token-prefix: the part starts with the anchor plus at least one more
    // token, so «کوروش کوچکیان صبور» confirms over anchor «کوروش کوچکیان».
    if (isTokenPrefixMatch(part.text, anchor)) {
      return true;
    }
  }

  // Latin anchors additionally require the ≥2-token rule, which
  // `latinOpeningRun` already enforces by construction.
  for (const anchor of anchors.latinAnchors) {
    if (norm(part.text) === norm(anchor) || isTokenPrefixMatch(part.text, anchor)) {
      return true;
    }
  }

  return false;
}

/**
 * §6.1g — the «من، X و Y» enumerator.
 *
 * The multi-guest special's narrative bio does not open with the guests' names,
 * so two parts of one segment are confirmed through the host's own sentence in
 * the description. Returns the confirmed set, or the original set when the
 * sentence is absent or names no title part.
 */
function applyEnumerator(
  split: TitleSplit,
  blocks: readonly DescriptionBlock[],
  confirmed: readonly TitlePart[]
): TitlePart[] {
  const leadBlocks = blocks.slice(0, 2);
  const names: string[] = [];

  for (const block of leadBlocks) {
    const match = ENUMERATOR_PATTERN.exec(block.text);
    if (match !== null) {
      names.push(trimEdgeControls(match[1] ?? ""), trimEdgeControls(match[2] ?? ""));
    }
  }
  if (names.length < 2) {
    return [...confirmed];
  }

  const extra = split.parts.filter(
    (part) => !confirmed.includes(part) && names.some((name) => norm(part.text) === norm(name))
  );
  return [...confirmed, ...extra];
}

/**
 * The token-richest non-guest segment, ties broken by earliest position.
 * When every segment is a guest segment there is no headline candidate and the
 * title renders whole (the caller returns `null` for both headline and byline).
 */
function pickHeadline(split: TitleSplit, guestSegmentIndex: number): string | null {
  const candidates = split.segments.filter(
    (segment) => segment.parts[0]?.segmentIndex !== guestSegmentIndex && segment.text !== ""
  );
  if (candidates.length === 0) {
    return null;
  }

  let best = candidates[0] ?? null;
  for (const candidate of candidates) {
    if (normTokens(candidate.text).length > normTokens(best?.text ?? "").length) {
      best = candidate;
    }
  }
  // The segment text can carry an edge space from the pipe split; the store
  // keeps editorial text clean without touching anything inside the words.
  const chosen = best?.text ?? null;
  return chosen === null ? null : chosen.trim();
}
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  return `${names.slice(0, -1).join("، ")} و ${names[names.length - 1] ?? ""}`;
}

/** Role fragments joined the same way, so a segment never loses its wording. */
function joinFragments(fragments: readonly string[]): string {
  return joinNames(fragments);
}
