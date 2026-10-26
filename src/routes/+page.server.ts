/**
 * Home data — docs/ARCHITECTURE.md §9.1.
 *
 * Featured (override wins, otherwise the newest visible episode), a short
 * recent list, the counts the editorial copy interpolates, and the conditional
 * strips. Everything comes from the committed store at build time.
 */

import {
  featuredEpisode,
  loadStore,
  recentEpisodes,
  siteMeta,
  visibleEpisodes
} from "#lib/server/store";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => {
  const store = await loadStore();
  const episodes = visibleEpisodes(store);

  return {
    featured: featuredEpisode(store),
    recent: recentEpisodes(store, 6),
    people: store.people.slice(0, 6),
    topics: store.topics,
    site: siteMeta(store),
    // Per-person episode counts are derived at read time, never stored
    // (docs/ARCHITECTURE.md §5.2).
    personCounts: new Map(
      store.people.map((person) => [
        person.slug,
        episodes.filter((episode) => episode.guestSlugs.includes(person.slug)).length
      ])
    ),
    topicCounts: new Map(store.topics.map((topic) => [topic.slug, topic.episodeGuids.length]))
  };
};
