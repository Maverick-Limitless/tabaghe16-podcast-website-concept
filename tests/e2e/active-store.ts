/**
 * The active store for the E2E specs — the same choice the app makes
 * (src/lib/server/store.ts `resolveStoreDir`): the live-synced store when it
 * exists, otherwise the committed rights-safe demo store. Specs read real
 * records and derive their search terms from actual titles, so every
 * assertion holds identically in a synced checkout and in a clean
 * checkout's demo mode.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data");

export interface StoreEntry {
  readonly guid: string;
  readonly slug: string;
  readonly titleSource: string;
  readonly titleHeadline: string | null;
  readonly titleByline: string | null;
  readonly publishedAt: string;
  readonly durationSeconds: number | null;
  readonly acastPageUrl: string | null;
  readonly guestSlugs: readonly string[];
  readonly chapters: readonly { readonly timeSeconds: number }[] | null;
}

function readStore(name: string): StoreEntry[] {
  const raw = JSON.parse(
    readFileSync(join(DATA_DIR, name, "episodes.json"), "utf8")
  ) as StoreEntry[];
  if (raw.length === 0) {
    throw new Error(`${name} is empty — run pnpm run sync (or the demo generator) first`);
  }
  return raw;
}

export const storeDirName = existsSync(join(DATA_DIR, "store", "episodes.json"))
  ? "store"
  : existsSync(join(DATA_DIR, "demo-store", "episodes.json"))
    ? "demo-store"
    : null;

if (storeDirName === null) {
  throw new Error("no store found — run pnpm run sync or keep the committed demo store");
}

/** Every episode, newest first — the order the app guarantees. */
export const episodes: StoreEntry[] = [...readStore(storeDirName)].sort((left, right) =>
  right.publishedAt.localeCompare(left.publishedAt)
);

export const newest = episodes[0] as StoreEntry;

/**
 * A distinctive Persian search term taken from the newest episode's own
 * title, and a Latin term from whichever record carries a real Latin word —
 * both derived from the data the assertions then check, never hard-coded to
 * one checkout's contents.
 */
function wordsOf(text: string): string[] {
  return text.split(/[\s|–—\-،,؛:!?»«()[\]]+/u).filter(Boolean);
}

const persianTerm = wordsOf(newest.titleHeadline ?? newest.titleSource).find(
  (word) => /[\u0600-\u06FF]/u.test(word) && word.length >= 4
);

/*
 * A "distinctive Latin word" is a whole title word of at least four pure
 * Latin letters — the same definition the demo generator guarantees, so the
 * two cannot disagree about which record qualifies.
 */
const latinEpisode = episodes.find((episode) =>
  wordsOf(episode.titleSource).some((word) => /^[A-Za-z]{4,}$/.test(word))
);
const latinTerm = latinEpisode
  ? wordsOf(latinEpisode.titleSource).find((word) => /^[A-Za-z]{4,}$/.test(word))
  : undefined;

if (persianTerm === undefined || latinTerm === undefined) {
  throw new Error("the active store has no usable Persian/Latin search terms for the specs");
}

export const searchTerms = {
  persian: persianTerm,
  /** The record the Latin term must surface. */
  latinExpected: latinEpisode as StoreEntry,
  latin: latinTerm as string
};

/** The archive's first-page size — the same constant the UI paginates by. */
export const PAGE_SIZE = 24;
