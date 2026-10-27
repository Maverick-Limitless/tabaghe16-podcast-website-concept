/**
 * Topic archive data — docs/ARCHITECTURE.md §9.4.
 *
 * Topics are an editor-curated deterministic list in `data/topics.json`,
 * attached to episodes by GUID. The route renders the curated set as-is: no
 * keyword mining, no inferred membership (no invented taxonomies "not invented
 * taxonomies"). An unknown slug 404s like any other.
 */

import { error } from "@sveltejs/kit";

import { loadStore, siteMeta, visibleEpisodes } from "#lib/server/store";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export async function entries(): Promise<{ slug: string }[]> {
  const store = await loadStore();
  return store.topics.map((topic) => ({ slug: topic.slug }));
}

export const load: PageServerLoad = async ({ params }) => {
  const store = await loadStore();
  const topic = store.topics.find((candidate) => candidate.slug === params.slug);

  if (topic === undefined) {
    error(404, "این موضوع پیدا نشد.");
  }

  const wanted = new Set(topic!.episodeGuids);
  const episodes = visibleEpisodes(store).filter((episode) => wanted.has(episode.guid));

  return {
    topic: topic!,
    episodes,
    site: siteMeta(store)
  };
};
