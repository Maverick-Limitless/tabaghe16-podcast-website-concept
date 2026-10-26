/**
 * About data — verified constants only.
 *
 * The external link table is server configuration (ARCHITECTURE.md §8.3), so it
 * is read here and passed to the page rather than imported into a client
 * component.
 */

import { CONTACT_LINK, LINK_HUB_URL, LISTEN_LINKS } from "#lib/server/config";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => ({
  listenLinks: LISTEN_LINKS,
  linkHub: { label: "همهٔ پیوندهای رسمی", url: LINK_HUB_URL },
  contact: CONTACT_LINK
});
