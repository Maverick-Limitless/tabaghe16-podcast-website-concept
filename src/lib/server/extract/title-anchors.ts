/**
 * Bio anchors — the confirmation half of docs/ARCHITECTURE.md §6.1.
 *
 * The anchor set is what makes guest extraction safe: a title fragment becomes
 * a confirmed guest **only** when the episode's own description anchors it
 * (§6.1, "The anchor"). The failure mode is always "render the whole title, no
 * guest record" — never a wrong identity, which is why every pattern here
 * bounds its candidate and rejects an under-sized one instead of guessing.
 */

import { norm, trimEdgeControls } from "./normalize";
import type { DescriptionBlock } from "./blocks";

export interface BioAnchors {
  /** (P1) the first block's opening comma-run, 1–4 tokens. */
  readonly commaRun: string | null;
  /** (P-open) the first block's 2- and 3-token prefixes. */
  readonly twoToken: string | null;
  readonly threeToken: string | null;
  /** (P2) a name in the «… این قسمت، با <name>،» lead-in. */
  readonly leadIn: string | null;
  /** (P4) Latin opening runs of 2–3 capitalized tokens, one per block. */
  readonly latinAnchors: readonly string[];
}

/** Tokens that terminate a Latin name run when they follow it. */
const LATIN_BOUND_WORDS: ReadonlySet<string> = new Set([
  "ceo",
  "cto",
  "cio",
  "coo",
  "cfo",
  "vp",
  "founder",
  "co-founder",
  "phd",
  "md",
  "professor",
  "prof",
  "dr",
  "director",
  "manager",
  "head",
  "partner",
  "president",
  "author",
  "host",
  "investor",
  "engineer",
  "scientist",
  "researcher"
]);

const LEAD_IN_PATTERN = /این\s*قسمت،\s*با\s+([^،,]+)[،,]/u;

/** Maximum tokens a Latin opening run may collect before it is bounded. */
const MAX_LATIN_RUN = 3;

/**
 * Derive every anchor the matcher may use (§6.1c).
 *
 * P1, P-open and P2 read blocks 0–1 only; P4 scans all blocks, because the
 * English bio section of a Persian episode sits at the end of the description.
 *
 * Empty blocks are skipped when picking the first two: the feed opens many
 * descriptions with a stray `<br>`, and an empty leading block carries no
 * opening to read — the first *content* block is the bio's start.
 */
export function extractBioAnchors(blocks: readonly DescriptionBlock[]): BioAnchors {
  const content = blocks.filter((block) => block.text.trim() !== "");
  const first = content[0];
  const second = content[1];

  return {
    commaRun: first === undefined ? null : openingCommaRun(first.text),
    twoToken: first === undefined ? null : openingTokenPrefix(first.text, 2),
    threeToken: first === undefined ? null : openingTokenPrefix(first.text, 3),
    leadIn: findLeadInName([first, second]),
    latinAnchors: blocks
      .map((block) => latinOpeningRun(block.text))
      .filter((run): run is string => run !== null)
  };
}

/**
 * (P1) The first block's opening run up to its first `،`/`,`, when it holds
 * 1–4 tokens. A longer run is prose, not a name, so it is rejected.
 */
function openingCommaRun(blockText: string): string | null {
  const commaIndex = blockText.search(/[،,]/);
  if (commaIndex < 0) {
    return null;
  }
  const run = trimEdgeControls(blockText.slice(0, commaIndex));
  const tokens = run.split(/\s+/).filter((token) => token !== "");
  return tokens.length >= 1 && tokens.length <= 4 ? run : null;
}

/** (P-open) The block's first `size` tokens. */
function openingTokenPrefix(blockText: string, size: number): string | null {
  const tokens = blockText.split(/\s+/).filter((token) => token !== "");
  if (tokens.length < size) {
    return null;
  }
  return trimEdgeControls(tokens.slice(0, size).join(" "));
}

/** (P2) A name inside a Persian lead-in in blocks 0–1. */
function findLeadInName(candidates: readonly (DescriptionBlock | undefined)[]): string | null {
  for (const block of candidates) {
    if (block === undefined) {
      continue;
    }
    const match = LEAD_IN_PATTERN.exec(block.text);
    const name = match?.[1];
    if (name !== undefined) {
      const trimmed = trimEdgeControls(name);
      if (trimmed !== "") {
        return trimmed;
      }
    }
  }
  return null;
}

/**
 * (P4) A Latin opening run of 2–3 capitalized tokens at the start of a block,
 * bounded by a role word or a comma.
 *
 * A one-token run is never an identity anchor — "Mohsen is …" and
 * "ChatGPT is …" both fail here, which is the whole point of the rule.
 */
function latinOpeningRun(blockText: string): string | null {
  const tokens = blockText.split(/\s+/).filter((token) => token !== "");
  const run: string[] = [];

  for (const token of tokens) {
    if (run.length >= MAX_LATIN_RUN) {
      break;
    }
    if (!isCapitalizedLatinToken(token)) {
      break;
    }
    run.push(trimEdgeControls(token.replace(/[،,]$/, "")));
  }

  while (run.length > 2 && LATIN_BOUND_WORDS.has(norm(run[run.length - 1] ?? ""))) {
    run.pop();
  }

  if (run.length < 2) {
    return null;
  }
  const anchor = run.join(" ");
  return anchor === "" ? null : anchor;
}

function isCapitalizedLatinToken(token: string): boolean {
  const stripped = token.replace(/^[«\[(]+/, "").replace(/[،,.»\])]+$/, "");
  if (stripped === "") {
    return false;
  }
  return /^[A-Z][A-Za-z'-]*$/.test(stripped);
}
