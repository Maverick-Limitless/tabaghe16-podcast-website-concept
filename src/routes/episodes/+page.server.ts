/**
 * Archive data — docs/ARCHITECTURE.md §9.1 and §10.1.
 *
 * The server load ships the full row set in `publishedAt` order — the only
 * honest ordering key, because episode numbers are unreliable
 * (CONTENT_SOURCES.md "Data limitations") — plus each row's normalized
 * search text and the year keys.
 *
 * The route is prerendered, so the loader never reads query parameters (a
 * static build has one canonical archive; filter combinations stay
 * non-crawlable by design, PRD §11.2). Search, filters, sort, and load-more
 * run client-side over this data: the page seeds its state from the URL at
 * mount, typing never costs a round-trip, and the URL stays shareable
 * through shallow routing.
 */

import { buildSearchText } from "#lib/search";
import { toEpisodeRowView, type EpisodeRowView } from "#lib/row-view";
import { loadStore, siteMeta, visibleEpisodes } from "#lib/server/store";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export interface ArchiveRow extends EpisodeRowView {
  /** Normalized searchable text, built once at load (search.ts). */
  readonly searchText: string;
}

export const load: PageServerLoad = async () => {
  const store = await loadStore();
  const episodes = visibleEpisodes(store);
  const rows: ArchiveRow[] = episodes.map((episode) => ({
    ...toEpisodeRowView(episode),
    searchText: buildSearchText(episode)
  }));

  const years = [...new Set(rows.map((row) => row.day.slice(0, 4)))].sort(
    (left, right) => Number(right) - Number(left)
  );

  return {
    rows,
    years,
    episodeCount: rows.length,
    site: siteMeta(store)
  };
};
