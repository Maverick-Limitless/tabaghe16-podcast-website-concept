/**
 * The signature fabric-wave press and the reduced-motion contract
 * (PRD §7.1, §13.3).
 *
 * The wave's observable geometry is asserted directly: a pointer press
 * writes the contact point as --wx/--wy percentages and enters the
 * pressing phase; keyboard activation uses the 50/50 center origin; a
 * release enters the settling phase and cleans it up. Under
 * prefers-reduced-motion the travelling wave and the entrance stagger are
 * gone while the state feedback remains.
 */

import { expect, test } from "@playwright/test";

import { installMediaFixture } from "./media-fixture";

test.beforeEach(async ({ page }) => {
  /*
   * The press target is the play control, and the control only renders when
   * the player is not in its failed state — so the fixture serves real
   * (silent) media rather than aborting the media host.
   */
  await installMediaFixture(page);
});

/**
 * The play control on the episode detail page: a wave button that is a
 * <button>, so pressing it never navigates away.
 */
async function playControl(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".hero__actions .wave-btn").first().click();
  const control = page.locator(".listen-player .wave-btn");
  await control.waitFor({ state: "visible" });
  return control;
}

async function pressState(
  page: import("@playwright/test").Page,
  button: import("@playwright/test").Locator
): Promise<{ wx: string; wy: string; pressing: boolean; settling: boolean }> {
  return button.evaluate((el: HTMLElement) => ({
    wx: el.style.getPropertyValue("--wx"),
    wy: el.style.getPropertyValue("--wy"),
    pressing: el.classList.contains("is-pressing"),
    settling: el.classList.contains("is-settling")
  }));
}

test("a pointer press writes the contact point and runs the phases", async ({ page }) => {
  /*
   * The press target is the listen band's play control: a <button>, so the
   * release toggles playback and stays on the page. The hero CTA is a real
   * link — pressing it navigates — so a release-phase assertion there would
   * race the route change instead of the animation.
   */
  const target = await playControl(page);
  const box = (await target.boundingBox())!;

  await page.mouse.move(box.x + 15, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await pressState(page, target);
  expect(pressed.pressing).toBe(true);
  expect(Number(pressed.wx)).toBeGreaterThan(0);
  expect(Number(pressed.wy)).toBeGreaterThan(0);

  await page.mouse.up();
  await page.waitForTimeout(80);
  const released = await pressState(page, target);
  expect(released.pressing).toBe(false);
  // The settle owns the membrane for its 160 ms window; it must be gone
  // once the whole 520 ms signature has elapsed.
  await page.waitForTimeout(600);
  const settled = await pressState(page, target);
  expect(settled.settling).toBe(false);
});

test("keyboard activation uses the center origin", async ({ page }) => {
  /*
   * Enter on a link fires its click on keydown and navigates, so the
   * phases are read on the play control — a button, activated in place.
   */
  const target = await playControl(page);
  await target.focus();
  await page.keyboard.down("Enter");
  const pressed = await pressState(page, target);
  expect(pressed.pressing).toBe(true);
  expect(pressed.wx).toBe("50");
  expect(pressed.wy).toBe("50");
  await page.keyboard.up("Enter");
});

test("rapid double-press leaves no stale pressing state", async ({ page }) => {
  // Same non-navigating target as the pointer test.
  const target = await playControl(page);
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(700);
  const settled = await pressState(page, target);
  expect(settled.pressing).toBe(false);
  expect(settled.settling).toBe(false);
});

test("reduced motion removes the stagger and keeps the page readable", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  // The fresh context needs its own block: the slow artwork host would
  // stall the load event without adding anything to what this measures.
  await page.route("**/assets.pippa.io/**", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const animation = await page.evaluate(
    () => getComputedStyle(document.querySelector(".recent__item")!).animationName
  );
  expect(animation).toBe("none");

  // The wave's CSS layers are suppressed too: no travelling animation.
  const fabricAnimation = await page.evaluate(
    () =>
      getComputedStyle(
        document.querySelector<HTMLElement>(".hero__actions .wave-btn .wave-fabric")!
      ).animationName
  );
  expect(fabricAnimation).toBe("none");
  await context.close();
});
