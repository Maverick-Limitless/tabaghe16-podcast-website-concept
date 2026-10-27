/**
 * Guest profile data — docs/ARCHITECTURE.md §9.1; the episode-detail composition guest rules.
 *
 * A profile exists only for a person the extraction rules confirmed (the
 * store is the sole source: no bios are written here, because none are
 * verified — no invented taxonomies). The page is the person's episode list in newest
 * order, with the honest count the store can support.
 */

import { error } from "@sveltejs/kit";

import { loadStore, siteMeta, visibleEpisodes } from "#lib/server/store";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export async function entries(): Promise<{ slug: string }[]> {
  const store = await loadStore();
  return store.people.map((person) => ({ slug: person.slug }));
}

export const load: PageServerLoad = async ({ params }) => {
  const store = await loadStore();
  const person = store.people.find((candidate) => candidate.slug === params.slug);

  if (person === undefined) {
    error(404, "این مهمان پیدا نشد.");
  }

  const episodes = visibleEpisodes(store).filter((episode) =>
    episode.guestSlugs.includes(person!.slug)
  );

  return {
    person: person!,
    episodes,
    site: siteMeta(store)
  };
};
