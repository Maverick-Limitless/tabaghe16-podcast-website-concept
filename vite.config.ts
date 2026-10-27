import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

/**
 * Build, dev, and unit-test configuration.
 *
 * SvelteKit 3 takes its configuration through the `sveltekit()` Vite plugin,
 * so the legacy `svelte.config.js` file no longer exists and its options live
 * here. The static adapter fully prerenders every public page to HTML;
 * `fallback` makes URLs outside the prerendered set serve the Persian
 * not-found page instead of an empty shell (docs/ARCHITECTURE.md §1, §9.1).
 */
export default defineConfig(async () => ({
  plugins: [
    sveltekit({
      adapter: adapter({
        fallback: "404.html"
      }),
      prerender: {
        /*
         * Every dynamic route ships an `entries()` from the store, so the
         * only routes the crawler can legitimately fail to reach are the
         * editor-curated collections that are currently empty (topics
         * ships with an empty list — no invented taxonomies forbids inventing one). An
         * unseen /topics/[slug] is the correct outcome: the fallback serves
         * the not-found page when someone types such a URL.
         *
         * Adding a new dynamic route without entries() would silently
         * produce nothing — keep every dynamic route's entries() in place.
         */
        handleUnseenRoutes: "ignore"
      },
      csp: {
        /*
         * The policy from docs/ARCHITECTURE.md §8.4, in SvelteKit's config
         * so the framework's own inline bootstrap script can be hashed into
         * script-src on prerendered pages (a static strict script-src in a
         * meta tag blocks SvelteKit's bootstrap and silently breaks the
         * app). 'auto' uses hashes for the production build and nonces in
         * the dev server.
         */
        mode: "auto",
        directives: {
          "default-src": ["self"],
          "script-src": ["self"],
          /*
           * The one deliberate allowance: the signature wave writes its
           * contact point (--wx/--wy) and the player writes its progress
           * fill as runtime custom properties, and Svelte's `style:`
           * directives are inline style attributes too. A hash cannot
           * cover a value computed per press, and CSS injection has no
           * data path here — scripts stay strict.
           */
          "style-src": ["self", "unsafe-inline"],
          // Artwork: the source host the feed's images live on.
          "img-src": ["self", "https://assets.pippa.io"],
          /*
           * media-src covers both Acast hosts: the enclosure URL redirects
           * per playback request to a signed stitcher2.acast.com URL inside
           * the browser's media stack (CONTENT_SOURCES.md).
           */
          "media-src": ["self", "https://sphinx.acast.com", "https://stitcher2.acast.com"],
          "font-src": ["self"],
          "connect-src": ["self"],
          "object-src": ["none"],
          // v1 links out to YouTube instead of embedding it.
          "frame-src": ["none"],
          "base-uri": ["self"],
          "form-action": ["none"]
        }
      }
    })
  ],

  // Unit/integration tests run in Node against pure domain modules; browser
  // behaviour is covered by Playwright (see playwright.config.ts).
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node"
  }
}));
