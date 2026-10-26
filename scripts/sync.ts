/**
 * Feed synchronization — docs/ARCHITECTURE.md §11.1-5.
 *
 * Reads the official Acast RSS feed, runs every item through the extraction
 * rules, and writes the committed JSON store the pages render. Idempotent:
 * running it twice leaves the store byte-identical except `lastSeenAt`.
 *
 * Network policy (PRD §9.2): the feed URL is the single allowlisted constant
 * from config.ts — never request input — fetched with a timeout, a response
 * size cap, and a post-fetch host check. `--input <file>` runs the identical
 * pipeline from a local file, which is how the fixture-based tests and
 * offline review work.
 *
 * Usage:
 *   pnpm run sync                      # fetch the official feed
 *   pnpm run sync -- --input file.xml  # run from a local file
 *
 * Sanitized output only: no secrets, no tokens, no stack traces — a failing
 * item is reported by GUID and reason (§11.4).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeDescription, buildEpisode, changedFields } from "../src/lib/server/extract/build";
import {
  createFeedParser,
  readChannelInfo,
  readRawItem,
  type RawFeedItem
} from "../src/lib/server/extract/feed";
import { dedupeSlugs, episodeSlug, slugifyPerson } from "../src/lib/server/extract/slugs";
import { extractTitle } from "../src/lib/server/extract/title";
import { FEED_URL } from "../src/lib/server/config";
import {
  EpisodeStoreSchema,
  PersonStoreSchema,
  SyncRunSchema,
  type Episode,
  type Person
} from "../src/lib/server/schema";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const EPISODES_PATH = join(DATA_DIR, "store", "episodes.json");
const PEOPLE_PATH = join(DATA_DIR, "store", "people.json");
const SYNC_RUN_PATH = join(DATA_DIR, "store", "sync-run.json");

/** Bounded fetch: 30 s, 25 MB, https-only, allowlisted host. */
const FETCH_TIMEOUT_MS = 30_000;
const MAX_FEED_BYTES = 25 * 1024 * 1024;

function parseArgs(argv: readonly string[]): { input: string | null } {
  const index = argv.indexOf("--input");
  if (index === -1) {
    return { input: null };
  }
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error("--input requires a file path");
  }
  return { input: value };
}

async function fetchFeed(): Promise<string> {
  const response = await fetch(FEED_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" }
  });

  if (!response.ok) {
    throw new Error(`feed responded ${response.status}`);
  }

  // The redirect chain must land on an allowlisted Acast host — the fetch
  // must not be steerable to any other origin.
  const finalHost = new URL(response.url).host;
  if (finalHost !== "feeds.acast.com") {
    throw new Error(`feed redirected to an unexpected host: ${finalHost}`);
  }

  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_FEED_BYTES) {
    throw new Error(`feed declares ${declared} bytes, over the ${MAX_FEED_BYTES} cap`);
  }

  const text = await response.text();
  if (text.length > MAX_FEED_BYTES) {
    throw new Error(`feed body exceeds the ${MAX_FEED_BYTES} cap`);
  }
  return text;
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const { input } = parseArgs(process.argv.slice(2));

  const xml = input === null ? await fetchFeed() : await readFile(input, "utf8");
  const parser = createFeedParser();
  const parsed = parser.parse(xml) as { rss?: { channel?: unknown[] } };
  const channels = Array.isArray(parsed.rss?.channel) ? parsed.rss!.channel : [parsed.rss?.channel];
  const channelNode = channels.find((value) => value !== undefined && value !== null) ?? {};
  const channel = readChannelInfo(channelNode);

  const itemNodes = ((channelNode as { item?: unknown[] }).item ?? []) as unknown[];
  const rawItems = itemNodes
    .map((node) => readRawItem(node))
    .filter((item): item is RawFeedItem => item !== null);

  // The previous store, read for idempotent upsert; missing means first run.
  let previousEpisodes: Episode[] = [];
  let previousPeople: Person[] = [];
  try {
    previousEpisodes = EpisodeStoreSchema.parse(
      JSON.parse(await readFile(EPISODES_PATH, "utf8")) as unknown
    );
    previousPeople = PersonStoreSchema.parse(
      JSON.parse(await readFile(PEOPLE_PATH, "utf8")) as unknown
    );
  } catch {
    previousEpisodes = [];
    previousPeople = [];
  }
  const previousByGuid = new Map(previousEpisodes.map((episode) => [episode.guid, episode]));

  // Stable slugs: acast:episodeUrl when URL-safe, else ep-<guid>, deduped in
  // publication order so a collision suffix never moves between two runs.
  const validItems = rawItems.filter(
    (item) => item.guid !== "" && item.publishedAt !== null && item.title.trim() !== ""
  );
  const slugByGuid = new Map<string, string>(
    [
      ...dedupeSlugs(
        validItems,
        (item) => episodeSlug(item.acastEpisodeUrl, item.guid),
        (item) => Date.parse(item.publishedAt ?? "")
      )
    ].map(([item, slug]) => [item.guid, slug])
  );

  // Guests: the confirmed names per item, from the same title rules the
  // assembler uses. First appearance (oldest first) fixes person slugs.
  const namesByGuid = new Map<string, { names: string[]; isHost: boolean }>();
  for (const item of validItems) {
    const analysis = analyzeDescription(item.description);
    const title = extractTitle(item.title, analysis.blocksWithoutFooterAndAreas);
    namesByGuid.set(item.guid, { names: [...title.guestNames], isHost: title.guestIsHost });
  }

  const appearanceOrder = new Map<string, number>();
  for (const item of [...validItems].sort(
    (left, right) => Date.parse(left.publishedAt ?? "") - Date.parse(right.publishedAt ?? "")
  )) {
    const entry = namesByGuid.get(item.guid);
    if (entry === undefined) {
      continue;
    }
    for (const name of entry.names) {
      const key = slugifyPerson(name);
      if (key !== "" && !appearanceOrder.has(key)) {
        appearanceOrder.set(key, Date.parse(item.publishedAt ?? ""));
      }
    }
  }

  /*
   * People first, episodes second: the episode loop needs the final person
   * slugs (a collision suffix has to match the person record it belongs to),
   * and the person set is fully known from the guest extraction above.
   *
   * One appearance order, one slug each: dedupeSlugs assigns the `-2` suffix
   * in first-appearance order (oldest first), so two sync runs — with the
   * feed in any order — allocate identical slugs. A person already in the
   * store keeps the slug it has, so profile URLs never move.
   */
  const wantedPeople = new Map<string, { displayName: string; isHost: boolean }>();
  for (const item of validItems) {
    const guests = namesByGuid.get(item.guid);
    if (guests === undefined) {
      continue;
    }
    for (const name of guests.names) {
      const base = slugifyPerson(name);
      if (base !== "" && !wantedPeople.has(base)) {
        wantedPeople.set(base, { displayName: name, isHost: guests.isHost });
      }
    }
  }

  const personEntries = [...wantedPeople.entries()].map(([base, info]) => ({
    base,
    displayName: info.displayName,
    isHost: info.isHost
  }));
  const existingSlugByName = new Map(
    previousPeople.map((person) => [person.displayName, person.slug])
  );
  const assignedPersonSlugs = dedupeSlugs(
    personEntries,
    (entry) => existingSlugByName.get(entry.displayName) ?? entry.base,
    (entry) => appearanceOrder.get(entry.base) ?? Number.MAX_SAFE_INTEGER
  );
  const personSlugByName = new Map(
    personEntries.map((entry) => [entry.displayName, assignedPersonSlugs.get(entry) ?? entry.base])
  );

  const lastSeenAt = new Date().toISOString();
  const episodes: Episode[] = [];
  const skipped: { guid: string; reason: string }[] = [];
  // Items the feed returned but the assembler refuses to store are counted
  // and named here (sanitized), so a growing skipped count is visible.
  for (const item of rawItems) {
    if (validItems.includes(item)) {
      continue;
    }
    const reason =
      item.guid === ""
        ? "missing guid"
        : item.publishedAt === null
          ? `unparseable pubDate ${JSON.stringify(item.pubDate)}`
          : "missing title";
    skipped.push({ guid: item.guid !== "" ? item.guid : "(no guid)", reason });
  }
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of validItems) {
    const slug = slugByGuid.get(item.guid);
    if (slug === undefined) {
      continue;
    }
    const guests = namesByGuid.get(item.guid);
    const guestSlugs = (guests?.names ?? [])
      .map((name) => personSlugByName.get(name))
      .filter((value): value is string => value !== undefined);

    const result = buildEpisode(item, { slug, guestSlugs, lastSeenAt });
    if (result.episode === null) {
      skipped.push({ guid: item.guid, reason: result.reason ?? "unknown" });
      continue;
    }

    const previous = previousByGuid.get(item.guid);
    if (previous === undefined) {
      created += 1;
    } else if (changedFields(previous, result.episode).length === 0) {
      unchanged += 1;
    } else {
      updated += 1;
    }
    episodes.push(result.episode);
  }

  // Episodes that vanished from the feed keep their pages: a temporary feed
  // truncation must not silently un publish six years of archive.
  const feedGuids = new Set(validItems.map((item) => item.guid));
  const retained = previousEpisodes.filter((episode) => !feedGuids.has(episode.guid));
  const allEpisodes = [...episodes, ...retained].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt)
  );

  // People: the assigned set above, in the store's sorted order. A retained
  // episode may reference a person no current item names, so every stored
  // person is kept — a profile never loses its episodes.
  const people: Person[] = personEntries
    .map((entry) => ({
      slug: personSlugByName.get(entry.displayName) ?? entry.base,
      displayName: entry.displayName,
      isHost: entry.isHost,
      image: null,
      bio: null
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "fa"));
  for (const person of previousPeople) {
    if (!people.some((candidate) => candidate.slug === person.slug)) {
      people.push(person);
    }
  }

  const validatedEpisodes = EpisodeStoreSchema.parse(allEpisodes);
  const validatedPeople = PersonStoreSchema.parse(people);

  await mkdir(join(DATA_DIR, "store"), { recursive: true });
  await writeFile(EPISODES_PATH, `${JSON.stringify(validatedEpisodes, null, 2)}\n`, "utf8");
  await writeFile(PEOPLE_PATH, `${JSON.stringify(validatedPeople, null, 2)}\n`, "utf8");
  await writeFile(
    SYNC_RUN_PATH,
    `${JSON.stringify(
      SyncRunSchema.parse({
        startedAt,
        finishedAt: new Date().toISOString(),
        status: "ok",
        counts: {
          fetched: rawItems.length,
          new: created,
          updated,
          unchanged,
          skippedInvalid: skipped.length
        },
        lastSuccessfulSyncAt: new Date().toISOString(),
        error: null
      }),
      null,
      2
    )}\n`,
    "utf8"
  );

  // Sanitized operator summary: counts, the channel identity, and per-item
  // skip reasons — no URLs, no payloads.
  process.stdout.write(
    [
      `feed: ${channel.acastShowId ?? "unknown-show"} (${channel.itunesAuthor ?? "unknown author"})`,
      `items: ${rawItems.length} fetched, ${validItems.length} valid, ${skipped.length} skipped`,
      `episodes: ${created} new, ${updated} updated, ${unchanged} unchanged, ${retained.length} retained`,
      `people: ${validatedPeople.length}`,
      `written: data/store/episodes.json, data/store/people.json, data/store/sync-run.json`,
      ...skipped.map((entry) => `skipped ${entry.guid}: ${entry.reason}`)
    ].join("\n") + "\n"
  );
}

main().catch((cause: unknown) => {
  const message = cause instanceof Error ? cause.message : String(cause);
  process.stderr.write(`sync failed: ${message}\n`);
  process.exitCode = 1;
});
