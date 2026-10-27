/**
 * Root layout data — docs/ARCHITECTURE.md §9.1, §11.2.
 *
 * Everything the global chrome needs, loaded once at build time from the
 * committed store: navigation (with the conditional items the design specifies),
 * site counts and staleness for the shell, the primary listen destination, and
 * the verified external link table for the footer.
 */

import { CONTACT_LINK, FOLLOW_LINKS, LINK_HUB_URL, LISTEN_LINKS } from "#lib/server/config";
import { loadStore, siteMeta, visibleEpisodes } from "#lib/server/store";

import type { LayoutServerLoad } from "./$types";

export const prerender = true;

export interface NavItem {
  readonly href: string;
  readonly label: string;
}

export const load: LayoutServerLoad = async () => {
  const store = await loadStore();
  const meta = siteMeta(store);
  const latest = visibleEpisodes(store)[0] ?? null;

  // «موضوع‌ها» appears only when a curated topic list exists and «مهمان‌ها»
  // only when verified guest data supports it (the shell). Both are
  // absent in an unsynchronized store, so the nav renders without them.
  const nav: NavItem[] = [
    { href: "/episodes", label: "قسمت‌ها" },
    ...(meta.hasTopics ? [{ href: "/topics", label: "موضوع‌ها" }] : []),
    ...(meta.hasPeople ? [{ href: "/people", label: "مهمان‌ها" }] : []),
    { href: "/about", label: "درباره" }
  ];

  return {
    nav,
    site: meta,
    listen: latest === null ? null : { href: `/episodes/${latest.slug}`, label: "شنیدن" },
    footer: {
      listenLinks: LISTEN_LINKS,
      followLinks: FOLLOW_LINKS,
      contact: CONTACT_LINK,
      linkHubUrl: LINK_HUB_URL
    }
  };
};
