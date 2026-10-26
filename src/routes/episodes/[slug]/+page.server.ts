/**
 * Episode detail data — docs/ARCHITECTURE.md §9.1, §10.2; DESIGN.md §5.5–5.6.
 *
 * One page, one job: take a visitor from "that conversation with person Y
 * about X" to hearing it at the right minute. Everything the view renders is
 * either a store field, a derived selection with a stated rule, or absent —
 * the loader never fills a gap with invented content (PRD §1.4).
 *
 * Related episodes follow transparent rules, surfaced per row so the page can
 * state them: shared guests first (the strongest verified signal), then the
 * archive's own chronology — never an opaque score (DESIGN.md §7 "Related").
 */

import { error } from "@sveltejs/kit";

import { getOrigin, LISTEN_LINKS } from "#lib/server/config";
import { loadStore, siteMeta, visibleEpisodes } from "#lib/server/store";
import type { Episode, Person } from "#lib/server/schema";

import type { PageServerLoad } from "./$types";

export const prerender = true;

/**
 * Every visible episode gets a prerendered page — the whole archive is
 * server-rendered HTML with no client API call (PRD §11.1). A slug outside
 * this list serves the not-found page, which the static adapter emits as
 * the shared 404 fallback.
 */
export async function entries(): Promise<{ slug: string }[]> {
  const store = await loadStore();
  return visibleEpisodes(store).map((episode) => ({ slug: episode.slug }));
}

/** Why a related episode is related — shown to the reader, not hidden. */
export type RelatedReason = "guest" | "recent";

export interface RelatedEpisode {
  readonly episode: Episode;
  readonly reason: RelatedReason;
}

/** ISO-8601 duration (PT1H41M15S) for the structured data block. */
function isoDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `PT${hours}H${minutes}M${seconds}S`;
}

export const load: PageServerLoad = async ({ params }) => {
  const store = await loadStore();
  const episodes = visibleEpisodes(store);
  const episode = episodes.find((candidate) => candidate.slug === params.slug);

  if (episode === undefined) {
    error(404, "این قسمت پیدا نشد؛ ممکن است از آرشیف حذف شده باشد.");
  }

  const others = episodes.filter((candidate) => candidate.slug !== episode!.slug);

  // Guests: only slug-resolved people render in the guest box; a name the
  // extraction rules could not confirm stays invisible rather than invented.
  const guests: Person[] = episode!.guestSlugs
    .map((slug) => store.people.find((person) => person.slug === slug))
    .filter((person): person is Person => person !== undefined);

  const guestSlugs = new Set(episode!.guestSlugs);
  const byGuest = others.filter((candidate) =>
    candidate.guestSlugs.some((slug) => guestSlugs.has(slug))
  );

  // Fill to three with the archive's own chronology; the reason row states
  // which rule produced each.
  const related: RelatedEpisode[] = [
    ...byGuest.map((ep) => ({ episode: ep, reason: "guest" as const })),
    ...others
      .filter((ep) => !byGuest.includes(ep))
      .map((ep) => ({ episode: ep, reason: "recent" as const }))
  ].slice(0, 3);

  const url = `${getOrigin()}/episodes/${episode!.slug}`;

  // Structured data only from fields the page genuinely carries (PRD §11.2);
  // serialized here so the object never enters the client bundle.
  const structured = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode!.titleSource,
    datePublished: episode!.publishedAt,
    ...(episode!.durationSeconds !== null
      ? { duration: isoDuration(episode!.durationSeconds) }
      : {}),
    ...(episode!.audioUrl !== null
      ? { associatedMedia: { "@type": "MediaObject", contentUrl: episode!.audioUrl } }
      : {}),
    ...(episode!.imageUrl !== null ? { image: episode!.imageUrl } : {}),
    ...(episode!.acastPageUrl !== null ? { url: episode!.acastPageUrl } : {}),
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "طبقه ۱۶"
    }
  };

  return {
    episode: episode!,
    guests,
    related,
    url,
    structuredJson: JSON.stringify(structured),
    listenLinks: LISTEN_LINKS,
    site: siteMeta(store)
  };
};
