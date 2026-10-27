/**
 * Store access — docs/ARCHITECTURE.md §11.2.
 *
 * The single module that reads the committed JSON store, re-validates it with
 * zod (the store is a hand-editable text file), merges editorial overrides,
 * and derives the view models pages render. Loaders never touch the network.
 *
 * Two store directories exist: the live-synced `data/store/` and the
 * committed rights-safe `data/demo-store/`. `resolveStoreDir()` picks the
 * live store when it exists and the demo store otherwise, so a clean
 * checkout runs in demo mode and a synced checkout runs live — one real
 * configuration, not a screenshot-only page.
 *
 * Missing file means "not synchronized yet" and yields an empty collection;
 * a present but invalid file is a hard build failure that names the file and
 * the schema, so a hand-corrupted store can never be served (§11.3).
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { STALE_AFTER_DAYS } from "./config";
import {
  EpisodeStoreSchema,
  OverrideStoreSchema,
  PersonStoreSchema,
  SyncRunSchema,
  TopicStoreSchema,
  type Episode,
  type Override,
  type Person,
  type SyncRun,
  type Topic
} from "./schema";

/**
 * The store lives at the project root, and this module runs from three
 * different places: from source (`src/lib/server`), from the dev server, and
 * from the bundled build output (`build/server/...`). Counting `../` segments
 * would break whenever the output layout changes, so the directory is found by
 * walking up from this file until an existing `data/` folder appears.
 */
function findDataDir(): string {
  let current = dirname(fileURLToPath(import.meta.url));

  for (let depth = 0; depth < 10; depth += 1) {
    const candidate = join(current, "data");
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return resolve(process.cwd(), "data");
}

const DATA_DIR = findDataDir();

/**
 * The store directory in use: the live-synced `store/` when a synced store
 * exists, otherwise the committed rights-safe `demo-store/` (docs/DEPLOYMENT
 * §demo, README §demo). The demo store is the default state of a clean
 * checkout: it carries a small set of minimal records — real titles, dates,
 * durations, and official outbound links only, with no descriptions,
 * chapters, sponsor blocks, or source artwork — so the product runs and can
 * be reviewed without redistributing the feed's editorial content. Running
 * `pnpm run sync` creates the live store and demo mode yields to it.
 */
export function resolveStoreDir(): string {
  const live = join(DATA_DIR, "store");
  if (existsSync(join(live, "episodes.json"))) {
    return live;
  }
  const demo = join(DATA_DIR, "demo-store");
  if (existsSync(join(demo, "episodes.json"))) {
    return demo;
  }
  return live;
}

const STORE_DIR = resolveStoreDir();

export interface Store {
  readonly episodes: readonly Episode[];
  readonly people: readonly Person[];
  readonly topics: readonly Topic[];
  readonly overrides: Readonly<Record<string, Override>>;
  readonly syncRun: SyncRun | null;
}

export type DataStatus = "unsynced" | "ok" | "failed" | "stale";

export interface SiteMeta {
  readonly episodeCount: number;
  readonly personCount: number;
  readonly topicCount: number;
  readonly hasTopics: boolean;
  readonly hasPeople: boolean;
  readonly lastSuccessfulSyncAt: string | null;
  readonly status: DataStatus;
}

/**
 * Read a store file from the resolved store directory (live or demo).
 */
async function readStoreFile<T>(
  relativePath: string,
  parse: (value: unknown) => T,
  fallback: () => T
): Promise<T> {
  return readFrom(join(STORE_DIR, relativePath), parse, fallback);
}

/**
 * Read an editor-curated file from the data root. Topics and overrides are
 * human-curated and shared by both modes: sync never writes them, and the
 * demo store does not carry copies, so a curator's file applies in demo and
 * live mode alike.
 */
async function readCuratedFile<T>(
  relativePath: string,
  parse: (value: unknown) => T,
  fallback: () => T
): Promise<T> {
  return readFrom(join(DATA_DIR, relativePath), parse, fallback);
}

async function readFrom<T>(
  path: string,
  parse: (value: unknown) => T,
  fallback: () => T
): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return fallback();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new Error(`${path} is not valid JSON`, { cause });
  }

  try {
    return parse(parsed);
  } catch (cause) {
    throw new Error(
      `${path} failed schema validation: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause }
    );
  }
}

export async function loadStore(): Promise<Store> {
  const [episodes, people, topics, overrides, syncRun] = await Promise.all([
    readStoreFile("episodes.json", EpisodeStoreSchema.parse, () => []),
    readStoreFile("people.json", PersonStoreSchema.parse, () => []),
    readCuratedFile("topics.json", TopicStoreSchema.parse, () => []),
    readCuratedFile("overrides.json", OverrideStoreSchema.parse, () => ({})),
    readStoreFile("sync-run.json", SyncRunSchema.parse, () => null)
  ]);

  return { episodes, people, topics, overrides, syncRun };
}

/* -- Overrides (§4.2) ---------------------------------------------------- */

/**
 * An override can hide an episode from every public surface. Sync never reads
 * or writes the override file, so a feed refresh cannot erase a curated value.
 */
export function isHidden(episode: Episode, overrides: Readonly<Record<string, Override>>): boolean {
  return overrides[episode.guid]?.hide === true;
}

export function isFeatured(
  episode: Episode,
  overrides: Readonly<Record<string, Override>>
): boolean {
  return overrides[episode.guid]?.featured === true;
}

/* -- Ordering and selection ---------------------------------------------- */

/** `publishedAt` is the only honest ordering key (CONTENT_SOURCES.md). */
export function newestFirst(episodes: readonly Episode[]): Episode[] {
  return [...episodes].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function visibleEpisodes(store: Store): Episode[] {
  return newestFirst(store.episodes.filter((episode) => !isHidden(episode, store.overrides)));
}

/**
 * The featured slot is the editorially featured episode when one is set, and
 * otherwise the newest visible episode.
 */
export function featuredEpisode(store: Store): Episode | null {
  const visible = visibleEpisodes(store);
  const featured = visible.find((episode) => isFeatured(episode, store.overrides));
  return featured ?? visible[0] ?? null;
}

export function recentEpisodes(store: Store, limit: number): Episode[] {
  return visibleEpisodes(store).slice(0, limit);
}

/* -- Site meta used by the shell ---------------------------------------- */

function daysSince(iso: string): number {
  const then = Date.parse(iso);
  const now = Date.now();
  return (now - then) / 86_400_000;
}

export function siteMeta(store: Store): SiteMeta {
  const lastSuccessfulSyncAt = store.syncRun?.lastSuccessfulSyncAt ?? null;
  const episodeCount = visibleEpisodes(store).length;

  let status: DataStatus;
  if (store.syncRun?.status === "failed") {
    status = "failed";
  } else if (lastSuccessfulSyncAt === null) {
    status = "unsynced";
  } else if (daysSince(lastSuccessfulSyncAt) > STALE_AFTER_DAYS) {
    status = "stale";
  } else {
    status = "ok";
  }

  return {
    episodeCount,
    personCount: store.people.length,
    topicCount: store.topics.length,
    hasTopics: store.topics.length > 0,
    hasPeople: store.people.length > 0,
    lastSuccessfulSyncAt,
    status
  };
}
