/**
 * Mobile navigation — the drawer's full behavior contract (PRD §6.7, §10):
 * tactile open, focus moved in and trapped, Esc / scrim / navigation close,
 * and focus returned to the menu button.
 */

import { expect, test } from "@playwright/test";

// The drawer is the mobile navigation; the desktop project exercises the
// inline nav instead, so this suite runs on the mobile project only.
test.beforeEach(async ({ page }) => {
  await page.route("**/assets.pippa.io/**", (route) => route.abort());
});

test("opens from the menu button and moves focus inside", async ({ page, isMobile }) => {
  test.skip(!isMobile, "drawer is the mobile navigation");
  await page.goto("/");
  await page.locator(".site-menu-button").click();
  await expect(page.locator(".drawer")).toBeVisible();
  // Focus landed on the first control inside the sheet.
  await expect(page.locator(".drawer__link").first()).toBeFocused();
});

test("traps Tab inside the sheet while open", async ({ page, isMobile }) => {
  test.skip(!isMobile, "drawer is the mobile navigation");
  await page.goto("/");
  await page.locator(".site-menu-button").click();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
  }
  const inside = await page.evaluate(() =>
    document.querySelector(".drawer")!.contains(document.activeElement)
  );
  expect(inside).toBe(true);
});

test("closes on Escape and returns focus to the menu button", async ({ page, isMobile }) => {
  test.skip(!isMobile, "drawer is the mobile navigation");
  await page.goto("/");
  await page.locator(".site-menu-button").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".drawer")).toHaveCount(0);
  await expect(page.locator(".site-menu-button")).toBeFocused();
});

test("closes on a scrim press without moving focus elsewhere", async ({ page, isMobile }) => {
  test.skip(!isMobile, "drawer is the mobile navigation");
  await page.goto("/");
  await page.locator(".site-menu-button").click();
  // Press the visible scrim edge, away from the sheet itself.
  await page.locator(".drawer-scrim").click({ position: { x: 8, y: 400 } });
  await expect(page.locator(".drawer")).toHaveCount(0);
  await expect(page.locator(".site-menu-button")).toBeFocused();
});

test("a followed link closes the drawer over the destination page", async ({ page, isMobile }) => {
  test.skip(!isMobile, "drawer is the mobile navigation");
  await page.goto("/");
  await page.locator(".site-menu-button").click();
  await page.locator(".drawer__link", { hasText: "قسمت‌ها" }).click();
  await expect(page.locator(".drawer")).toHaveCount(0);
  await expect(page).toHaveURL(/\/episodes/);
});

test("the desktop navigation stays inline", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop shows the inline nav");
  await page.goto("/");
  await expect(page.locator(".site-nav__link").first()).toBeVisible();
  await expect(page.locator(".site-menu-button")).toBeHidden();
});
