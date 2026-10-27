/**
 * The rights-safe demo store generator (README §demo, DEPLOYMENT §demo).
 *
 * The public repository must not redistribute the feed's editorial content
 * (full descriptions, chapter text, sponsor blurbs, episode artwork), so the
 * committed demo store carries only what a fact-checkable archive needs:
 * real titles, publication dates, durations, official page and enclosure
 * links, and the guest-name records the routes render — every other content
 * field is emptied or nulled. Episode artwork is dropped so the product's own
 * designed number-plate placeholders carry every media frame.
 *
 * Run after `pnpm run sync` from the working copy:
 *
 *   npx tsx scripts/make-demo-store.ts
 *
 * The selection is deterministic: the newest eight episodes, the oldest two,
 * and an even spread across the whole archive in between, so the demo shows
 * every year group, both sort directions, load-more, and the search paths
 * the E2E suite exercises.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Episode, Person } from "../src/lib/server/schema";

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "data");
const SOURCE = join(DATA_DIR, "store", "episodes.json");
const OUT_DIR = join(DATA_DIR, "demo-store");

/** How many records the demo carries: enough for every UI state, no more. */
const TARGET_COUNT = 26;

/** Newest spread for the front page plus the two E2E search targets. */
const NEWEST_COUNT = 8;

interface EpisodeFile extends Episode {
  readonly publishedAt: string;
}

function byNewest(left: EpisodeFile, right: EpisodeFile): number {
  return right.publishedAt.localeCompare(left.publishedAt);
}

/** Strip one record down to facts and official links. */
function toDemoRecord(episode: EpisodeFile): Episode {
  return {
    ...episode,
    // Editorial content from the feed is not redistributed in the demo.
    chapters: null,
    chapterLinesRemoved: false,
    sponsor: null,
    descriptionHtml: "",
    descriptionExcerpt: "",
    hostedOnAcast: null,
    // The product's own plate placeholders carry every media frame.
    imageUrl: null
  };
}

async function main(): Promise<void> {
  const source = JSON.parse(await readFile(SOURCE, "utf8")) as EpisodeFile[];
  if (source.length === 0) {
    throw new Error("data/store is empty — run pnpm run sync first");
  }

  const newestFirst = [...source].sort(byNewest);
  const picked = new Map<string, EpisodeFile>();

  for (const episode of newestFirst.slice(0, NEWEST_COUNT)) {
    picked.set(episode.guid, episode);
  }
  for (const episode of newestFirst.slice(-2)) {
    picked.set(episode.guid, episode);
  }

  // Even spread over the rest, newest-first, until the target size.
  const rest = newestFirst.filter((episode) => !picked.has(episode.guid));
  const step = Math.max(1, Math.floor(rest.length / (TARGET_COUNT - picked.size)));
  for (const episode of rest.filter((_, index) => index % step === 0)) {
    if (picked.size >= TARGET_COUNT) {
      break;
    }
    picked.set(episode.guid, episode);
  }
  // Top up from the newest remaining if the stride undershot.
  for (const episode of rest) {
    if (picked.size >= TARGET_COUNT) {
      break;
    }
    picked.set(episode.guid, episode);
  }

  /*
   * Guarantee one record whose title carries a distinctive Latin word — a
   * whole word of at least four pure Latin letters, the same definition the
   * E2E helper uses to derive its query — so the demo can demonstrate
   * mixed-script search. The newest such episode wins; the choice is
   * generic.
   */
  const wordsOf = (text: string): string[] =>
    text.split(/[\s|–—\-،,؛:!?»«()[\]]+/u).filter(Boolean);
  const hasDistinctiveLatin = (episode: EpisodeFile): boolean =>
    wordsOf(episode.titleSource).some((word) => /^[A-Za-z]{4,}$/.test(word));
  if (![...picked.values()].some(hasDistinctiveLatin)) {
    const latinEpisode = newestFirst.find(hasDistinctiveLatin);
    if (latinEpisode !== undefined) {
      picked.set(latinEpisode.guid, latinEpisode);
    }
  }

  const demoEpisodes = [...picked.values()].sort(byNewest).map(toDemoRecord);
  const guestSlugs = new Set(demoEpisodes.flatMap((episode) => episode.guestSlugs));
  const people = (
    JSON.parse(await readFile(join(DATA_DIR, "store", "people.json"), "utf8")) as Person[]
  )
    .filter((person) => guestSlugs.has(person.slug))
    .map((person) => ({ ...person }));

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    join(OUT_DIR, "episodes.json"),
    `${JSON.stringify(demoEpisodes, null, 2)}\n`,
    "utf8"
  );
  await writeFile(join(OUT_DIR, "people.json"), `${JSON.stringify(people, null, 2)}\n`, "utf8");
  // Topics and overrides are editor-curated at the data root and shared by
  // both modes; the demo store carries only the synced-shape records.

  const withDescription = demoEpisodes.filter((e) => e.descriptionHtml !== "").length;
  const withArt = demoEpisodes.filter((e) => e.imageUrl !== null).length;
  process.stdout.write(
    [
      `demo store written: ${demoEpisodes.length} episodes, ${people.length} people`,
      `content check — descriptions: ${withDescription}, artwork: ${withArt} (both must be 0)`,
      `years covered: ${[...new Set(demoEpisodes.map((e) => e.publishedAt.slice(0, 4)))].sort().join(", ")}`
    ].join("\n") + "\n"
  );
}

main().catch((cause: unknown) => {
  process.stderr.write(`demo store generation failed: ${String(cause)}\n`);
  process.exitCode = 1;
});
