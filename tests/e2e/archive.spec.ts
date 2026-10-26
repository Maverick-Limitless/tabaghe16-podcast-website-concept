/**
 * Archive discovery — search, filters, sort, load-more, states, and the
 * shareable URL (PRD §5.6, §13.3). All filtering is local over the shipped
 * data, so the assertions are deterministic against the committed store.
 */

import { expect, test } from "@playwright/test";

import { PAGE_SIZE, episodes, searchTerms } from "./active-store";

test.beforeEach(async ({ page }) => {
  await page.route("**/assets.pippa.io/**", (route) => route.abort());
});

test("renders the year-grouped chronology with the discovery bar", async ({ page }) => {
  await page.goto("/episodes");
  await expect(page.getByRole("heading", { name: "آرشیو", exact: true })).toBeVisible();
  await expect(page.locator(".archive__search-input")).toBeVisible();
  const rows = page.locator(".episode-row");
  // The first page: capped by the page size, however large the archive is.
  expect(await rows.count()).toBe(Math.min(PAGE_SIZE, episodes.length));
  await expect(page.locator(".year-group__label").first()).toContainText("·");
});

test("searches Persian text through the archive", async ({ page }) => {
  await page.goto("/episodes");
  // A distinctive term taken from a real title in the active store.
  await page.fill(".archive__search-input", searchTerms.persian);
  await expect(page.locator(".episode-row").first()).toBeVisible();
  const rows = await page.locator(".episode-row").count();
  expect(rows).toBeGreaterThan(0);
  expect(rows).toBeLessThanOrEqual(Math.min(PAGE_SIZE, episodes.length));
  // The URL became shareable.
  await expect(page).toHaveURL(/q=/);
});

test("searches a Latin word from a mixed-script title", async ({ page }) => {
  await page.goto("/episodes");
  // A real Latin word from a real title in the active store — several
  // records may mention it, so the expected record is located by its own
  // title, wherever it sits in the filtered order.
  await page.fill(".archive__search-input", searchTerms.latin);
  const rows = await page.locator(".episode-row").count();
  expect(rows).toBeGreaterThan(0);
  const expectedRow = page.locator(".episode-row__title", {
    hasText: searchTerms.latinExpected.titleHeadline ?? searchTerms.latinExpected.titleSource
  });
  await expect(expectedRow.first()).toBeVisible();
});

test("clears back to the full archive from the search field", async ({ page }) => {
  await page.goto("/episodes");
  await page.fill(".archive__search-input", searchTerms.persian);
  await page.waitForTimeout(400);
  await page.locator(".archive__search-clear").click();
  await expect(page.locator(".episode-row")).not.toHaveCount(1);
  await expect(page).not.toHaveURL(/q=/);
});

test("combines the year and chapters filters, then clears", async ({ page }) => {
  await page.goto("/episodes");
  const yearChip = page.locator(".archive__chip").nth(1);
  await yearChip.click();
  const withYear = await page.locator(".episode-row").count();
  await expect(page).toHaveURL(/year=/);

  await page.locator(".archive__chip").first().click();
  const withBoth = await page.locator(".episode-row").count();
  await expect(page).toHaveURL(/chapters=1/);
  expect(withBoth).toBeLessThanOrEqual(withYear);

  // Clear both: back to the full first page.
  await page.locator(".archive__chip").first().click();
  await yearChip.click();
  await expect(page.locator(".episode-row")).not.toHaveCount(withBoth);
});

test("sorts oldest-first and puts an early episode on top", async ({ page }) => {
  await page.goto("/episodes");
  await page.selectOption(".archive__sort-select", "oldest");
  // Under a fully parallel run the shallow-routing pushState can lag a
  // loaded worker; the URL is the shareability contract, so it gets the
  // wider window.
  await expect(page).toHaveURL(/sort=oldest/, { timeout: 10000 });
  // The oldest group's label names ۱۳۹۹, the first year of the show.
  await expect(page.locator(".year-group__label").first()).toContainText("۱۳۹۹");
  await expect(page.locator(".episode-row").first()).toBeVisible();
});

test("loads more pages on demand", async ({ page }) => {
  test.skip(episodes.length <= PAGE_SIZE, "the store does not fill a first page");
  await page.goto("/episodes");
  const before = await page.locator(".episode-row").count();
  await page.locator(".archive__more-button").click();
  // The button is removed when the last page is reached, and the rows
  // append on render — poll rather than racing a fixed wait.
  await expect.poll(async () => page.locator(".episode-row").count()).toBeGreaterThan(before);
});

test("shows the recovery empty state and clears filters from it", async ({ page }) => {
  await page.goto("/episodes");
  await page.fill(".archive__search-input", "zzzz-no-such-episode");
  await expect(page.locator(".archive__empty-title")).toContainText("چیزی با این جست‌وجو پیدا نشد");
  await page.locator(".archive__empty-clear").click();
  await expect(page.locator(".episode-row").first()).toBeVisible();
});

test("a shared query URL seeds the same result on a fresh load", async ({ page }) => {
  await page.goto(`/episodes?q=${encodeURIComponent(searchTerms.latin)}`);
  await expect(page.locator(".archive__search-input")).toHaveValue(searchTerms.latin);
  expect(await page.locator(".episode-row").count()).toBeGreaterThan(0);
});
