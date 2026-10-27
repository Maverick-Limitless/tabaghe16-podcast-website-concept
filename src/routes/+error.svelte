<script lang="ts">
  /**
   * Not-found — docs/ARCHITECTURE.md §9.1.
   *
   * Also the `404.html` the static adapter emits for unmatched URLs, so it is
   * self-contained: it must render even when the layout's data failed to load.
   *
   * Copy direction from the copy direction: emptiness gives directions, not mood.
   */

  import { page } from "$app/state";

  // `page.status` is the response status (-1 when no status was reported, e.g.
  // the prerendered `404.html` fallback for an unmatched URL).
  const status = page.status > 0 ? page.status : 404;
</script>

<svelte:head>
  <title>{status === 404 ? "پیدا نشد" : "خطا"} — طبقه ۱۶</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="notfound">
  <div class="container notfound__inner">
    <p class="notfound__code">
      <bdi class="ltr-run" dir="ltr">{status}</bdi>
    </p>
    <h1 class="notfound__title">این صفحه در طبقهٔ ما نیست.</h1>
    <div class="notfound__actions">
      <a class="notfound__primary" href="/episodes">گشت در آرشیو</a>
      <a class="notfound__secondary" href="/">بازگشت به خانه</a>
    </div>
  </div>
</div>

<style>
  .notfound {
    display: grid;
    place-items: center;
    min-height: 60vh;
    padding-block: var(--sp-9);
  }

  .notfound__inner {
    display: grid;
    gap: var(--sp-4);
    justify-items: center;
    text-align: center;
  }

  .notfound__code {
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    color: var(--muted);
  }

  .notfound__title {
    max-width: 26ch;
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .notfound__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-4);
    justify-content: center;
    margin-block-start: var(--sp-3);
  }

  .notfound__primary {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding-inline: var(--sp-5);
    border-radius: var(--r-control);
    background-color: var(--ink);
    color: var(--paper);
    font-size: var(--fs-label);
    font-weight: 500;
    text-decoration: none;
  }

  .notfound__primary:hover {
    background-color: var(--graphite);
  }

  .notfound__secondary {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding-inline: var(--sp-2);
    font-size: var(--fs-label);
    font-weight: 500;
  }
</style>
