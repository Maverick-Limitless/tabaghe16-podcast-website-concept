/**
 * Home — the editorial front page against real store data (end-to-end testing).
 *
 * The suite never reaches a third-party service: the artwork host is
 * blocked per-test, which is exactly the slow-host condition the plate
 * system is designed for, so the assertions hold under both a fast
 * network (images land) and a blocked one (plates carry the composition).
 */

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/assets.pippa.io/**", (route) => route.abort());
});

test("renders the thesis, the featured episode, and the archive CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/طبقه ۱۶/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("گفت‌وگوهایی برای دیدن");
  // The featured band: label, title, byline, and the wave CTA.
  await expect(page.locator(".featured__title a")).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "شنیدن" })
      .or(page.getByRole("link", { name: "شنیدن" }))
      .first()
  ).toBeVisible();
  // The count line interpolates the synced store, never a hard-coded total.
  await expect(page.locator(".hero__count")).toContainText("قسمت");
});

test("recent episodes render with the plate-backed media system", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".episode-card");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(3);

  // With the image host blocked, every media box still shows its designed
  // plate — the episode's own number — and nothing reports broken.
  const plates = page.locator(".art__plate");
  await expect(plates.first()).toBeVisible();
  expect(await plates.count()).toBeGreaterThanOrEqual(count);
});

test("the lead card carries the display-size title", async ({ page }) => {
  await page.goto("/");
  const lead = page.locator(".recent__item--lead .episode-card--lead");
  await expect(lead).toBeVisible();
  await expect(lead.locator(".episode-card__title")).toBeVisible();
});

test("the section heading links to the archive at the folio edge", async ({ page }) => {
  await page.goto("/");
  const link = page.locator(".recent__heading-link");
  await expect(link).toHaveAttribute("href", "/episodes");
  await expect(link).toContainText("همهٔ قسمت‌ها");
});

test("no horizontal overflow on the first viewport", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(overflow).toBe(false);
});
