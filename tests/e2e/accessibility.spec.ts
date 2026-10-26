/**
 * Automated accessibility audit — WCAG 2.2 AA via axe (PRD §10, §13.5).
 *
 * Every public route is analyzed in both projects. The artwork host is
 * blocked, which is the designed fallback state (the number plates) — an
 * accessible experience under degraded loading is part of the contract,
 * not an excuse for one only under ideal conditions.
 *
 * What this suite is not: a screen-reader pass. axe catches structure,
 * names, contrast, and roles; the manual keyboard pass lives in
 * docs/TESTING.md, and the drawer/wave specs assert the focus behaviors.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { newest } from "./active-store";
import { installMediaFixture } from "./media-fixture";

if (newest.guestSlugs.length === 0) {
  throw new Error("the active store's newest episode has no guest for the guest-profile route");
}

const ROUTES: { name: string; path: string }[] = [
  { name: "home", path: "/" },
  { name: "archive", path: "/episodes" },
  { name: "episode detail", path: `/episodes/${newest.slug}` },
  { name: "guest profile", path: `/people/${newest.guestSlugs[0]}` },
  { name: "about", path: "/about" },
  { name: "partnerships", path: "/partnerships" },
  { name: "privacy", path: "/privacy" },
  { name: "not found", path: "/no-such-page" }
];

test.beforeEach(async ({ page }) => {
  await installMediaFixture(page);
});

for (const route of ROUTES) {
  test(`axe: ${route.name} has no critical or serious violations`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    // Give hydration and the plates a beat to settle; the analysis is of
    // the steady state a visitor reads.
    await page.waitForTimeout(1200);

    const results = await new AxeBuilder({ page })
      // The WCAG 2.2 AA target: the standard tag set including 2.1 and 2.2.
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    );
    const summary = serious.map((violation) => `${violation.id}: ${violation.help}`).join("; ");
    expect(serious, `axe violations on ${route.path} — ${summary || "none"}`).toStrictEqual([]);
  });
}
