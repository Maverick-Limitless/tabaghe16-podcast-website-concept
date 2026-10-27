/**
 * Topic index data — docs/ARCHITECTURE.md §9.4.
 *
 * Topics are an editor-curated deterministic list in `data/topics.json`; they
 * are never mined from descriptions, because the feed carries no per-item
 * categories and an invented taxonomy is what no invented taxonomies forbids. The file ships
 * empty, so this load returns an empty list until a human curates one.
 */

import { faNumber } from "#lib/dates";
import { loadStore } from "#lib/server/store";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => {
  const store = await loadStore();

  const topics = store.topics.map((topic) => ({
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    episodeCount: topic.episodeGuids.length,
    episodeCountLabel: faNumber(topic.episodeGuids.length)
  }));

  return { topics };
};
