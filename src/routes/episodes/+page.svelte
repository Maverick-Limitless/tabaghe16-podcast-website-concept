<script lang="ts">
  /**
   * Archive — the archive row model (desktop), §5.4 (mobile), §7 (states).
   *
   * Search-first, chronology-spined: the sticky bar carries the query and
   * the sort, the year and chapters filters sit beneath it as chips, and
   * the rows render through the shared EpisodeRow system.
   *
   * The whole discovery layer is deterministic and local: the loader ships
   * every row with its normalized search text, and filtering, sorting, and
   * load-more all run over that data without a round-trip. The route is
   * prerendered, so a shared ?q=… URL seeds its state on the client at
   * mount (a static build has one canonical archive; the filter
   * combinations stay non-crawlable by design, performance), and from there
   * the state leads while the URL follows through shallow routing.
   */

  import { browser } from "$app/env";
  import { pushState } from "$app/navigation";
  import { page } from "$app/state";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import { untrack } from "svelte";

  import EpisodeRow from "#lib/components/EpisodeRow.svelte";
  import { faNumber, formatJalaliDate } from "#lib/dates";
  import { groupByYear } from "#lib/row-view";
  import { normalizeForSearch } from "#lib/search";
  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();

  /** Rows per page; load-more appends the same amount. */
  const PAGE_SIZE = 24;
  /** The input settles for this long before the query applies (§5.6). */
  const SEARCH_DEBOUNCE_MS = 150;

  type Seed = { q: string; year: string; sort: "newest" | "oldest"; chapters: boolean };

  /**
   * The URL is the source of truth on arrival. On the server the page is
   * prerendered, so there is nothing to read — the canonical archive
   * renders. On the client the seed is read once, deliberately untracked:
   * this component is recreated on every navigation, so each mount reads
   * the address bar a single time and then owns the state.
   */
  function readSeed(): Seed {
    if (!browser) {
      return { q: "", year: "", sort: "newest", chapters: false };
    }
    const params = page.url.searchParams;
    return {
      q: params.get("q") ?? "",
      year: params.get("year") ?? "",
      sort: params.get("sort") === "oldest" ? "oldest" : "newest",
      chapters: params.get("chapters") === "1"
    };
  }

  const seed = untrack(readSeed);
  let query = $state(seed.q);
  let year = $state(seed.year);
  let sort = $state(seed.sort);
  let chaptersOnly = $state(seed.chapters);
  let visibleCount = $state(PAGE_SIZE);
  let searchInput = $state(seed.q);

  let searchTimer: number | undefined;

  function applySearch(value: string): void {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      query = value;
      visibleCount = PAGE_SIZE;
      syncUrl();
    }, SEARCH_DEBOUNCE_MS);
  }

  function setYear(value: string): void {
    year = year === value ? "" : value;
    visibleCount = PAGE_SIZE;
    syncUrl();
  }

  function toggleChapters(): void {
    chaptersOnly = !chaptersOnly;
    visibleCount = PAGE_SIZE;
    syncUrl();
  }

  function setSort(event: Event & { currentTarget: HTMLSelectElement }): void {
    sort = event.currentTarget.value === "oldest" ? "oldest" : "newest";
    visibleCount = PAGE_SIZE;
    syncUrl();
  }

  function clearAll(): void {
    query = "";
    searchInput = "";
    year = "";
    chaptersOnly = false;
    visibleCount = PAGE_SIZE;
    syncUrl();
  }

  /**
   * Keep the URL shareable (deterministic search) without a reload: SvelteKit's shallow
   * routing updates the address bar and history while this page keeps its
   * data. Empty params drop out of the URL so the clean archive stays
   * canonical.
   */
  function syncUrl(): void {
    const params = new SvelteURLSearchParams();
    if (query !== "") params.set("q", query);
    if (year !== "") params.set("year", year);
    if (sort === "oldest") params.set("sort", "oldest");
    if (chaptersOnly) params.set("chapters", "1");
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    pushState(`/episodes${suffix}`, {});
  }

  // One derivation, both sides of hydration.
  const normalizedQuery = $derived(normalizeForSearch(query));
  const filtered = $derived.by(() => {
    let rows = data.rows;
    if (chaptersOnly) {
      rows = rows.filter((row) => row.hasChapters);
    }
    if (year !== "") {
      rows = rows.filter((row) => row.day.startsWith(year));
    }
    if (normalizedQuery !== "") {
      rows = rows.filter((row) => row.searchText.includes(normalizedQuery));
    }
    return sort === "oldest" ? [...rows].reverse() : rows;
  });
  const visible = $derived(filtered.slice(0, visibleCount));
  const groups = $derived(groupByYear(visible));
  const isFiltered = $derived(query !== "" || year !== "" || chaptersOnly);
  const yearChips = $derived(
    data.years.map((key) => ({
      key,
      label: data.rows.find((row) => row.day.startsWith(key))?.yearLabel ?? key
    }))
  );

  // The stale-data banner is the only public sync surface in an admin-less
  // build (the archive row model, §9.11): shown while the store is older than the
  // configured threshold, dismissible for this session.
  let staleDismissed = $state(false);
  const showStale = $derived(data.site.status === "stale" && !staleDismissed);
</script>

<svelte:head>
  <title>آرشیو قسمت‌ها — طبقه ۱۶</title>
  <meta
    name="description"
    content="همهٔ قسمت‌های طبقه ۱۶؛ از تازه‌ترین تا نخستین، به ترتیب تاریخ انتشار."
  />
</svelte:head>

<div class="archive">
  <div class="container">
    <header class="archive__header">
      <h1 class="archive__title">آرشیو</h1>
      <p class="archive__standfirst">
        همهٔ قسمت‌ها؛ از تازه‌ترین تا نخستین.
        {#if isFiltered}
          <span class="archive__standfirst-count">
            {faNumber(filtered.length)} قسمت از {faNumber(data.episodeCount)}
          </span>
        {/if}
      </p>
    </header>
  </div>

  <div class="archive__bar">
    <div class="container archive__bar-inner">
      <div class="archive__search">
        <span class="archive__search-glyph" aria-hidden="true">⌕</span>
        <input
          class="archive__search-input"
          type="search"
          inputmode="search"
          value={searchInput}
          placeholder="جست‌وجو در قسمت‌ها؛ عنوان، مهمان، موضوع…"
          aria-label="جست‌وجو در آرشیو"
          oninput={(event) => {
            applySearch(event.currentTarget.value);
            searchInput = event.currentTarget.value;
          }}
        />
        {#if query !== ""}
          <button
            type="button"
            class="archive__search-clear"
            aria-label="پاک‌کردن جست‌وجو"
            onclick={() => {
              query = "";
              searchInput = "";
              visibleCount = PAGE_SIZE;
              syncUrl();
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        {/if}
      </div>

      <label class="archive__sort">
        <span class="archive__sort-label">مرتب‌سازی</span>
        <select
          class="archive__sort-select"
          aria-label="مرتب‌سازی قسمت‌ها"
          value={sort}
          onchange={setSort}
        >
          <option value="newest">تازه‌ترین</option>
          <option value="oldest">قدیمی‌ترین</option>
        </select>
      </label>
    </div>

    <div class="container archive__filters" role="group" aria-label="فیلترها">
      <button
        type="button"
        class="archive__chip"
        class:archive__chip--on={chaptersOnly}
        aria-pressed={chaptersOnly}
        onclick={toggleChapters}
      >
        فقط قسمت‌های دارای بخش
      </button>
      <span class="archive__chip-sep" aria-hidden="true"></span>
      {#each yearChips as chip (chip.key)}
        <button
          type="button"
          class="archive__chip"
          class:archive__chip--on={year === chip.key}
          aria-pressed={year === chip.key}
          onclick={() => setYear(chip.key)}
        >
          {chip.label}
        </button>
      {/each}
    </div>

    {#if showStale}
      <div class="container">
        <p class="archive__stale" role="status">
          آخرین همگام‌سازی با فید: {formatJalaliDate(data.site.lastSuccessfulSyncAt ?? "")}.
          تازه‌ترین قسمت‌ها ممکن است کمی بعدتر نمایش داده شوند.
          <button
            type="button"
            class="archive__stale-close"
            onclick={() => (staleDismissed = true)}
          >
            بستن
          </button>
        </p>
      </div>
    {/if}
  </div>

  <div class="container">
    {#if data.episodeCount === 0}
      <p class="archive__empty">
        هنوز هیچ قسمتی همگام نشده است. پس از نخستین همگام‌سازی با فید، قسمت‌ها اینجا به ترتیب تاریخ
        انتشار نمایش داده می‌شوند.
      </p>
    {:else if filtered.length === 0}
      <div class="archive__empty">
        <p class="archive__empty-title">چیزی با این جست‌وجو پیدا نشد.</p>
        <p class="archive__empty-note">یک فیلتر را بردارید، یا نام مهمان را جست‌وجو کنید.</p>
        <div class="archive__empty-actions">
          <button type="button" class="archive__empty-clear" onclick={clearAll}>
            پاک‌کردن فیلترها
          </button>
          <a class="archive__empty-link" href="/people">مهمان‌ها</a>
        </div>
      </div>
    {:else}
      {#each groups as group (group.key)}
        <section class="year-group" aria-labelledby={`year-${group.key}`}>
          <h2 class="year-group__label" id={`year-${group.key}`}>{group.label}</h2>
          <ul class="year-group__list">
            {#each group.rows as row (row.slug)}
              <EpisodeRow {row} />
            {/each}
          </ul>
        </section>
      {/each}

      {#if visibleCount < filtered.length}
        <div class="archive__more">
          <p class="archive__more-count">
            {faNumber(visible.length)} از {faNumber(filtered.length)} قسمت
          </p>
          <button
            type="button"
            class="archive__more-button"
            onclick={() => (visibleCount += PAGE_SIZE)}
          >
            نمایش قسمت‌های بیشتر
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .archive {
    padding-block: var(--sp-7) var(--sp-9);
  }

  .archive__header {
    display: grid;
    gap: var(--sp-2);
    margin-block-end: var(--sp-6);
  }

  .archive__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .archive__standfirst {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .archive__standfirst-count {
    color: var(--ink);
    font-weight: 500;
  }

  /* -- The sticky discovery bar (the archive row model) -----------------------------
   * Solid paper + hairline, never blur — the two translucent surfaces are
   * the header and the mini-player (§2.5's budget).
   */
  .archive__bar {
    position: sticky;
    top: var(--header-h);
    z-index: var(--z-header);
    margin-block-end: var(--sp-7);
    background-color: var(--paper);
    border-block-end: 1px solid var(--stone);
  }

  .archive__bar-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-3);
    padding-block: var(--sp-3);
  }

  .archive__search {
    position: relative;
    flex: 1 1 240px;
    display: flex;
    align-items: center;
  }

  .archive__search-glyph {
    position: absolute;
    inset-inline-start: var(--sp-4);
    color: var(--muted);
    font-size: var(--fs-body-s);
    pointer-events: none;
  }

  .archive__search-input {
    width: 100%;
    min-height: 48px;
    padding-inline: calc(var(--sp-8) + var(--sp-2)) var(--sp-4);
    border: 1px solid var(--stone);
    border-radius: var(--r-control);
    background-color: var(--surface);
    color: var(--ink);
    font-size: var(--fs-body-s);
    transition: border-color var(--dur-micro) var(--ease-press);
  }

  .archive__search-input:focus-visible {
    outline: var(--focus-ring) solid var(--ink);
    outline-offset: var(--focus-offset);
  }

  .archive__search-input::placeholder {
    color: var(--muted);
  }

  .archive__search-clear {
    position: absolute;
    inset-inline-end: var(--sp-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--r-chip);
    background: none;
    color: var(--muted);
    font-size: var(--fs-body-s);
    transition: color var(--dur-micro) var(--ease-press);
  }

  .archive__search-clear:hover {
    color: var(--ink);
  }

  .archive__sort {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .archive__sort-label {
    font-size: var(--fs-meta);
    color: var(--muted);
  }

  .archive__sort-select {
    min-height: 44px;
    padding-inline: var(--sp-3);
    border: 1px solid var(--stone);
    border-radius: var(--r-control);
    background-color: var(--surface);
    font-size: var(--fs-label);
    cursor: pointer;
  }

  .archive__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-2);
    padding-block: 0 var(--sp-3);
  }

  .archive__chip {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding-inline: var(--sp-4);
    border: 1px solid var(--stone);
    border-radius: var(--r-chip);
    background-color: var(--surface);
    color: var(--ink);
    font-size: var(--fs-label);
    transition:
      border-color var(--dur-micro) var(--ease-press),
      background-color var(--dur-micro) var(--ease-press);
  }

  .archive__chip:hover {
    border-color: var(--ink);
  }

  /* The selected state is never color alone: the pressed chip fills with
     ink and its label inverts (§10 — state by more than color). */
  .archive__chip--on {
    border-color: var(--ink);
    background-color: var(--ink);
    color: var(--paper);
  }

  .archive__chip-sep {
    width: 1px;
    height: 24px;
    background-color: var(--stone);
  }

  .archive__stale {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-2);
    margin-block-end: var(--sp-4);
    padding: var(--sp-3) var(--sp-4);
    border: 1px solid var(--warning);
    border-radius: var(--r-control);
    background-color: var(--surface);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--warning);
  }

  .archive__stale-close {
    margin-inline-start: auto;
    min-height: 32px;
    padding-inline: var(--sp-3);
    border: none;
    border-radius: var(--r-chip);
    background: none;
    color: var(--warning);
    font-size: var(--fs-meta);
    text-decoration: underline;
  }

  .archive__empty {
    display: grid;
    gap: var(--sp-3);
    max-width: 52ch;
    padding: var(--sp-6);
    border: 1px solid var(--stone);
    border-radius: var(--r-card);
    background-color: var(--surface);
  }

  .archive__empty-title {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 600;
    line-height: var(--lh-title);
  }

  .archive__empty-note {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .archive__empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-4);
    margin-block-start: var(--sp-2);
  }

  .archive__empty-clear {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding-inline: var(--sp-5);
    border: none;
    border-radius: var(--r-control);
    background-color: var(--ink);
    color: var(--paper);
    font-size: var(--fs-label);
    font-weight: 500;
  }

  .archive__empty-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding-inline: var(--sp-2);
    font-size: var(--fs-label);
    font-weight: 500;
  }

  .year-group {
    margin-block-end: var(--sp-7);
  }

  .year-group__label {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    font-family: var(--font-body);
    font-size: var(--fs-label);
    font-weight: 500;
    line-height: var(--lh-label);
    color: var(--muted);
  }

  /* The label's hairline is the shared folio rule (base.css); the year key
     adds its own weight through the same muted voice. */
  .year-group__label::after {
    content: "";
    flex: 1;
    height: 1px;
    background-color: var(--stone);
  }

  .year-group__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .archive__more {
    display: grid;
    justify-items: center;
    gap: var(--sp-3);
    padding-block: var(--sp-2);
  }

  .archive__more-count {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .archive__more-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding-inline: var(--sp-7);
    border: 1px solid var(--stone);
    border-radius: var(--r-control);
    background-color: var(--surface);
    color: var(--ink);
    font-size: var(--fs-label);
    font-weight: 500;
    transition: border-color var(--dur-micro) var(--ease-press);
  }

  .archive__more-button:hover {
    border-color: var(--ink);
  }

  @media (max-width: 640px) {
    .archive__sort {
      flex: 1 1 100%;
      justify-content: space-between;
    }

    .archive__sort-select {
      flex: 1;
    }
  }
</style>
