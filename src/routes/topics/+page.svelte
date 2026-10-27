<script lang="ts">
  /**
   * Topic index — docs/ARCHITECTURE.md §9.4.
   *
   * Editor-curated only, so it stays dormant until a human curates
   * `data/topics.json`. An empty state is honest; a mined taxonomy would be
   * invented data (no invented taxonomies).
   */

  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>موضوع‌ها — طبقه ۱۶</title>
  <meta name="description" content="موضوع‌های گردآوری‌شدهٔ گفت‌وگوهای طبقه ۱۶." />
</svelte:head>

<div class="page">
  <div class="container">
    <header class="page__header">
      <h1 class="page__title">موضوع‌ها</h1>
      <p class="page__standfirst">
        فهرست موضوع‌ها یک کارِ ویراستاریِ دستی است و تنها با گردآوریِ آدم‌های برنامه پر می‌شود.
      </p>
    </header>

    {#if data.topics.length === 0}
      <p class="page__empty">
        هنوز موضوعی گردآوری نشده است. تا آن زمان، قسمت‌ها را می‌توانید از
        <a href="/episodes">آرشیو</a> پیدا کنید.
      </p>
    {:else}
      <ul class="topic-list">
        {#each data.topics as topic (topic.slug)}
          <li class="topic-row">
            <a class="topic-row__link" href={`/topics/${topic.slug}`}>
              <span class="topic-row__title">{topic.title}</span>
              {#if topic.description !== null}
                <span class="topic-row__description">{topic.description}</span>
              {/if}
              <span class="topic-row__count">{topic.episodeCountLabel} قسمت</span>
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
    max-width: 52ch;
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

  .topic-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .topic-row + .topic-row .topic-row__link {
    border-block-start: 1px solid var(--stone);
  }

  .topic-row__link {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sp-3);
    min-height: 44px;
    padding-block: var(--sp-4);
    text-decoration: none;
  }

  .topic-row__link:hover .topic-row__title {
    text-decoration-line: underline;
  }

  .topic-row__title {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 600;
    line-height: var(--lh-title);
  }

  .topic-row__description {
    flex-basis: 100%;
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .topic-row__count {
    margin-inline-start: auto;
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }
</style>
