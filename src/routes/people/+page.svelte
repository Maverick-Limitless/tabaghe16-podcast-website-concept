<script lang="ts">
  /**
   * Guest directory — docs/ARCHITECTURE.md §9.5.
   *
   * Typographic only. The feed provides no guest portraits, so there is no
   * portrait anywhere in the system and none is invented (PRD §6.7).
   */

  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>مهمان‌ها — طبقه ۱۶</title>
  <meta name="description" content="مهمان‌های طبقه ۱۶ و قسمت‌های هر یک، به ترتیبِ هم‌زمانی." />
</svelte:head>

<div class="page">
  <div class="container">
    <header class="page__header">
      <h1 class="page__title">مهمان‌ها</h1>
      <p class="page__standfirst">آدم‌هایی که در طبقه ۱۶ مهمان بوده‌اند.</p>
    </header>

    {#if data.people.length === 0}
      <p class="page__empty">
        هنوز فهرستی از مهمان‌ها همگام نشده است. پس از نخستین همگام‌سازی با فید، مهمان‌هایی که نامشان
        در قسمت‌ها تأیید شده باشد اینجا نمایش داده می‌شوند.
      </p>
    {:else}
      <ul class="person-list">
        {#each data.people as person (person.slug)}
          <li class="person-row">
            <a class="person-row__link" href={`/people/${person.slug}`}>
              <span class="person-row__name">{person.displayName}</span>
              {#if person.isHost}
                <span class="person-row__host">میزبان</span>
              {/if}
              <span class="person-row__count">{person.episodeCountLabel} قسمت</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .page {
    padding-block: var(--sp-7) var(--sp-9);
  }

  .page__header {
    display: grid;
    gap: var(--sp-2);
    margin-block-end: var(--sp-6);
  }

  .page__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .page__standfirst {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .page__empty {
    max-width: 52ch;
    padding: var(--sp-5);
    border: 1px solid var(--stone);
    border-radius: var(--r-card);
    background-color: var(--surface);
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .person-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .person-row + .person-row .person-row__link {
    border-block-start: 1px solid var(--stone);
  }

  .person-row__link {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sp-3);
    min-height: 44px;
    padding-block: var(--sp-3);
    text-decoration: none;
  }

  .person-row__link:hover .person-row__name {
    text-decoration-line: underline;
  }

  .person-row__name {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 600;
    line-height: var(--lh-title);
  }

  .person-row__host {
    padding: 0 var(--sp-2);
    border: 1px solid var(--stone);
    border-radius: var(--r-chip);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .person-row__count {
    margin-inline-start: auto;
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }
</style>
