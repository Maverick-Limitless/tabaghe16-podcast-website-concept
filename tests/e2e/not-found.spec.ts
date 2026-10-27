/**
 * The not-found journey (admin safety, §13.3): an unknown episode slug or page
 * must land on the Persian recovery page with real exits — not an empty
 * shell — on both the prerendered fallback and client-side navigation.
 */

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/assets.pippa.io/**", (route) => route.abort());
});

test("an unknown episode slug serves the recovery page", async ({ page }) => {
  const response = await page.goto("/episodes/this-slug-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("این صفحه در طبقهٔ ما نیست");
  await expect(page.locator(".notfound__primary")).toHaveAttribute("href", "/episodes");
  await expect(page.locator(".notfound__secondary")).toHaveAttribute("href", "/");
});

test("an unknown top-level path serves the fallback too", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("این صفحه در طبقهٔ ما نیست");
});
