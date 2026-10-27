<script lang="ts">
  /**
   * Topic archive — docs/ARCHITECTURE.md §9.4; the copy direction (topics are
   * editor-curated only).
   *
   * The episode list is the curated membership by GUID, newest first. When
   * the description was written for the site, it renders; otherwise the page
   * stays quiet rather than inventing a definition.
   */

  import EpisodeRow from "#lib/components/EpisodeRow.svelte";
  import { faNumber } from "#lib/dates";
  import { toEpisodeRowView } from "#lib/row-view";
  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();

  const rows = $derived(data.episodes.map(toEpisodeRowView));
</script>

<svelte:head>
  <title>{data.topic.title} — طبقه ۱۶</title>
  <meta
    name="description"
    content={data.topic.description ?? `قسمت‌های طبقه ۱۶ دربارهٔ ${data.topic.title}.`}
  />
</svelte:head>

<div class="topic">
  <div class="container">
    <header class="topic__header">
      <a class="topic__back" href="/topics">
        <span class="topic__back-glyph" aria-hidden="true">→</span>
        موضوع‌ها
      </a>

      <div class="folio-label">موضوع</div>

      <h1 class="topic__title">{data.topic.title}</h1>

      {#if data.topic.description !== null}
        <p class="topic__description">{data.topic.description}</p>
      {/if}

      <p class="topic__count">{faNumber(data.episodes.length)} قسمت</p>
    </header>

    {#if rows.length > 0}
      <ul class="topic__list">
        {#each rows as row (row.slug)}
          <EpisodeRow {row} />
        {/each}
      </ul>
    {:else}
      <p class="topic__empty">هنوز قسمتی به این موضوع پیوند نشده است.</p>
    {/if}
  </div>
</div>

<style>
  .topic {
    padding-block: var(--sp-7) var(--sp-9);
  }

  .topic__back {
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

  .topic__back:hover {
    color: var(--ink);
  }

  .topic__back-glyph {
    direction: ltr;
    unicode-bidi: isolate;
  }

  .topic__header {
    display: grid;
    gap: var(--sp-3);
    margin-block-end: var(--sp-6);
  }

  .topic__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .topic__description {
    max-width: var(--prose-max);
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .topic__count {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .topic__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .topic__empty {
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
