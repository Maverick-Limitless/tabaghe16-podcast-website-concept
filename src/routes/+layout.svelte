<script lang="ts">
  /**
   * Root layout — the app shell: header, main landmark, footer.
   *
   * Design system entry point: the token layer, the base layer, and the
   * self-hosted Persian webfonts are loaded here, in that order, so every
   * component stands on one foundation (docs/DESIGN.md).
   */

  import "../lib/styles/fonts.css";
  import "../lib/styles/tokens.css";
  import "../lib/styles/base.css";

  // Preloaded: the two variable families DESIGN.md §3.1 names for first view.
  // IBM Plex Mono is Latin-only and small enough to load at normal priority.
  import estedadArabic from "@fontsource-variable/estedad/files/estedad-arabic-wght-normal.woff2?url";
  import vazirmatnArabic from "@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2?url";

  import Footer from "#lib/components/Footer.svelte";
  import Header from "#lib/components/Header.svelte";

  import type { Snippet } from "svelte";
  import type { LayoutData } from "./$types";

  let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
  <link rel="preload" href={estedadArabic} as="font" type="font/woff2" crossorigin="anonymous" />
  <link rel="preload" href={vazirmatnArabic} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="app-shell">
  <Header nav={data.nav} primary={data.listen} />

  <!-- tabindex makes this the focus target of the skip link in app.html. -->
  <main id="main" class="app-main" tabindex="-1">
    {@render children()}
  </main>

  <Footer
    listenLinks={data.footer.listenLinks}
    followLinks={data.footer.followLinks}
    contact={data.footer.contact}
    linkHubUrl={data.footer.linkHubUrl}
  />
</div>

<style>
  .app-shell {
    display: flex;
    min-height: 100vh;
    min-height: 100dvh;
    flex-direction: column;
  }

  .app-main {
    flex: 1 0 auto;
  }

  /* The main landmark is a programmatic focus target, not a control: the
     visible ring on it would read as a page-wide box. */
  .app-main:focus {
    outline: none;
  }
</style>
