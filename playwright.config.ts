import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;

/**
 * Playwright — docs/ARCHITECTURE.md §3 and §13.2.
 *
 * Tests the production build, not the dev server: `build` then `preview` on the
 * same fixed port the preview script uses, with --strictPort so a port clash
 * fails loudly instead of silently testing a stale server. External hosts are
 * expected to be blocked per-test with `page.route`, so the suite never
 * reaches a third-party service.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One local retry absorbs worker-load flakes on a laptop running both
  // projects in parallel; a retry-passed test is reported as flaky, never
  // silently green. CI keeps its wider retry margin.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL,
    trace: "on-first-retry"
  },

  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } }
  ],

  webServer: {
    command: "pnpm run build && pnpm run preview",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
