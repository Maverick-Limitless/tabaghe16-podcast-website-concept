/**
 * Guest directory data — docs/ARCHITECTURE.md §9.5.
 *
 * Typographic only: the feed carries no guest portraits, so no image field
 * exists and none is invented. Per-person episode counts are derived at read
 * time from `guestSlugs`, never stored.
 */

import { faNumber } from "#lib/dates";
import { loadStore, visibleEpisodes } from "#lib/server/store";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => {
  const store = await loadStore();
  const episodes = visibleEpisodes(store);

  const people = store.people.map((person) => {
    const count = episodes.filter((episode) => episode.guestSlugs.includes(person.slug)).length;

    return {
      slug: person.slug,
      displayName: person.displayName,
      isHost: person.isHost,
      episodeCount: count,
      episodeCountLabel: faNumber(count)
    };
  });

  // Guests with no rendered episode (for example, all their episodes are
  // hidden by an override) would produce a dead link, so they are left out.
  return { people: people.filter((person) => person.episodeCount > 0) };
};
