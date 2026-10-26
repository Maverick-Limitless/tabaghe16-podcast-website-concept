/**
 * Partnerships data — the verified contact route only.
 *
 * No metrics exist to report (PRD §1.4), so the load provides exactly one
 * thing: the contact link from the verified source table.
 */

import { CONTACT_LINK } from "#lib/server/config";

import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => ({
  contact: CONTACT_LINK
});
