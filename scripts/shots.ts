/**
 * Screenshot capture for visual review — writes the README's screenshots.
 * Usage: npx tsx scripts/shots.ts [episode-slug] [base-url] [out-prefix]
 * Not a test suite: it renders the real site and writes PNGs so the
 * rendered experience can be reviewed (docs/screenshots).
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const SLUG = process.argv[2] ?? "ramis-movassagh";
const BASE = process.argv[3] ?? "http://localhost:5173";
const PREFIX = process.argv[4] ?? "";
const OUT = "docs/screenshots";

const SHOTS: { name: string; path: string; width: number; height: number }[] = [
  { name: "home-desktop", path: "/", width: 1280, height: 900 },
  { name: "home-mobile", path: "/", width: 390, height: 844 },
  { name: "archive-desktop", path: "/episodes", width: 1280, height: 900 },
  { name: "episode-detail-desktop", path: `/episodes/${SLUG}`, width: 1280, height: 900 },
  { name: "episode-detail-mobile", path: `/episodes/${SLUG}`, width: 390, height: 844 }
];

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const shot of SHOTS) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${BASE}${shot.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // The source artwork host is slow from this machine; give the images a
  // long window and report what landed so the review knows.
  await page.waitForTimeout(9000);
  const imgs = await page.evaluate(
    () =>
      `${Array.from(document.images).filter((i) => i.naturalWidth > 0).length}/${document.images.length}`
  );
  await page.screenshot({ path: `${OUT}/${PREFIX}${shot.name}.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  console.log(
    `${shot.name}: saved | images ${imgs}${overflow ? " | HORIZONTAL OVERFLOW" : ""}${
      errors.length ? ` | console: ${errors.slice(0, 2).join(" / ")}` : ""
    }`
  );
  await page.close();
}

// People and topic detail pages.
const slugPage = await browser.newPage();
await slugPage.goto(`${BASE}/episodes/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 60000 });
const personHref = await slugPage
  .locator(".guest-list__name")
  .first()
  .getAttribute("href")
  .catch(() => null);
await slugPage.close();

if (personHref !== null) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}${personHref}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${PREFIX}guest-detail.png`, fullPage: true });
  console.log(`guest-detail: saved (${personHref})`);
  await page.close();
}

await browser.close();
