<script lang="ts">
  /**
   * Guest profile — docs/DESIGN.md §5.5 "Guest presentation rules".
   *
   * Typographic by necessity: no verified portrait source exists, so the page
   * carries no image at all rather than an invented one. Bio and role render
   * only where the store carries verified values — the store's Person record
   * is deliberately minimal, and a missing value stays missing.
   */

  import EpisodeRow from "#lib/components/EpisodeRow.svelte";
  import { faNumber } from "#lib/dates";
  import { toEpisodeRowView } from "#lib/row-view";
  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();

  const rows = $derived(data.episodes.map(toEpisodeRowView));
</script>

<svelte:head>
  <title>{data.person.displayName} — طبقه ۱۶</title>
  <meta name="description" content={`قسمت‌های طبقه ۱۶ با حضور ${data.person.displayName}.`} />
</svelte:head>

<div class="person">
  <div class="container">
    <header class="person__header">
      <a class="person__back" href="/people">
        <span class="person__back-glyph" aria-hidden="true">→</span>
        مهمان‌ها
      </a>

      <p class="person__count">
        {faNumber(data.episodes.length)} قسمت
      </p>

      <h1 class="person__name">{data.person.displayName}</h1>
    </header>

    {#if rows.length > 0}
      <ul class="person__list">
        {#each rows as row (row.slug)}
          <EpisodeRow {row} />
        {/each}
      </ul>
    {:else}
      <p class="person__empty">قسمتی با این مهمان همگام نشده است.</p>
    {/if}
  </div>
</div>

<style>
  .person {
    padding-block: var(--sp-7) var(--sp-9);
  }

  .person__back {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 44px;
    margin-block-end: var(--sp-5);
    color: var(--muted);
    font-size: var(--fs-label);
    font-weight: 500;
    text-decoration: none;
  }

  .person__back:hover {
    color: var(--ink);
  }

  .person__back-glyph {
    direction: ltr;
    unicode-bidi: isolate;
  }

  .person__header {
    display: grid;
    gap: var(--sp-3);
    margin-block-end: var(--sp-6);
  }

  .person__count {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .person__name {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .person__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .person__empty {
    max-width: 52ch;
    padding: var(--sp-5);
    border: 1px solid var(--stone);
    border-radius: var(--r-card);
    background-color: var(--surface);
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }
</style>
