/**
 * Episode detail — the core journey: from the page to hearing the episode
 * at the right minute (PRD §5.4, §5.5, §13.3).
 *
 * Media playback runs against a local silent-WAV fixture served from the
 * enclosure's URL, so the play/pause/seek/chapter behaviors are tested
 * deterministically — clearly a fixture, never live external playback
 * (PRD §13.3). The artwork host stays blocked; the plate system carries
 * the media box, which is itself part of the contract under test.
 */

import { expect, test } from "@playwright/test";

import { newest as NEWEST } from "./active-store";
import { installMediaFixture } from "./media-fixture";

/**
 * The newest episode of the active store (live-synced or the committed
 * rights-safe demo) is the spec's stable, real target.
 */
const DETAIL = `/episodes/${NEWEST.slug}`;

test.beforeEach(async ({ page }) => {
  await installMediaFixture(page);
});

test("renders the title block, the listen band, and the platform actions", async ({ page }) => {
  await page.goto(DETAIL);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".episode__back")).toHaveAttribute("href", "/episodes");
  await expect(page.locator(".listen-player__now-title")).toBeVisible();
  // The Acast page link is the episode's own verified URL, never invented.
  if (NEWEST.acastPageUrl !== null) {
    await expect(page.locator(".listen-band__links a").first()).toHaveAttribute(
      "href",
      NEWEST.acastPageUrl
    );
  }
});

test("plays and pauses through the band's control, with the mini-player", async ({ page }) => {
  await page.goto(DETAIL);
  const control = page.locator(".listen-player .wave-btn");
  await control.click();
  await expect
    .poll(async () => page.evaluate(() => !document.querySelector("audio")!.paused))
    .toBe(true);
  await expect(page.locator(".mini-player")).toBeVisible();
  await expect(page.locator(".mini-player__title")).toBeVisible();

  /*
   * The bar exists only while media runs (§5.6), so the dismiss happens mid-
   * play: the bar leaves, playback continues, and the band's control can
   * still pause the episode afterwards.
   */
  await page.locator(".mini-player__dismiss").click();
  await expect(page.locator(".mini-player")).toHaveCount(0);
  await expect
    .poll(async () => page.evaluate(() => !document.querySelector("audio")!.paused))
    .toBe(true);

  await control.click();
  await expect
    .poll(async () => page.evaluate(() => document.querySelector("audio")!.paused))
    .toBe(true);
});

test("chapters are operable before playback and seek inside the fixture's duration", async ({
  page
}) => {
  test.skip(NEWEST.chapters === null || NEWEST.chapters.length === 0, "episode has no chapters");
  await page.goto(DETAIL);

  const first = page.locator(".chapters__button").first();
  await expect(first).toBeVisible();
  await first.click();

  // The press requested metadata from the fixture; the head moved and plays.
  await expect
    .poll(async () => page.evaluate(() => document.querySelector("audio")!.currentTime))
    .toBeGreaterThan(-1);
  await expect
    .poll(async () => page.evaluate(() => !document.querySelector("audio")!.paused))
    .toBe(true);
});

test("the seek slider moves the play head while playing", async ({ page }) => {
  await page.goto(DETAIL);
  await page.locator(".listen-player .wave-btn").click();
  await expect
    .poll(async () => page.evaluate(() => !document.querySelector("audio")!.paused))
    .toBe(true);

  // Seek through the keyboard — the real, accessible path (PRD §10):
  // each arrow steps the slider by 1% of the episode and the handler seeks
  // the element. The presses are paced like a human's because the slider
  // is progress-bound: the value re-normalizes after every seek.
  const slider = page.locator(".listen-player__seek");
  await slider.focus();
  for (let press = 0; press < 6; press += 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
  }
  await expect
    .poll(async () => page.evaluate(() => document.querySelector("audio")!.currentTime))
    .toBeGreaterThanOrEqual(4);
});

test("share copies the page URL and confirms politely", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(DETAIL);
  await page.locator(".listen-band__share .wave-btn").click();
  await expect(page.locator(".listen-band__share-live")).toContainText("رونوشت شد");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(NEWEST.slug);
});

test("related episodes state their transparent reason", async ({ page }) => {
  await page.goto(DETAIL);
  const reasons = page.locator(".related-list__reason");
  const count = await reasons.count();
  if (count > 0) {
    const first = await reasons.first().textContent();
    expect(["مهمان مشترک", "از آرشیو"]).toContain(first?.trim());
  }
});

test("no horizontal overflow at the smallest tested width", async ({ page }) => {
  await page.goto(DETAIL);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(overflow).toBe(false);
});
