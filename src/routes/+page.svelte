<script lang="ts">
  /**
   * Home — the home composition and §7.
   *
   * The thesis line and the deck are the design's proposed editorial copy, not
   * official show copy (no invented taxonomies). Every figure in the deck is interpolated
   * from the synced store at render time — no total is ever hard-coded, because
   * the feed grows (dynamic counts, never hard-coded). With an unsynchronized store the page says so
   * plainly instead of inventing content (no invented content).
   */

  import EpisodeArt from "#lib/components/EpisodeArt.svelte";
  import EpisodeCard from "#lib/components/EpisodeCard.svelte";
  import WaveButton from "#lib/components/WaveButton.svelte";
  import { faNumber, formatDuration, formatJalaliDate, isoDay } from "#lib/dates";
  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();

  // The load data is read through `data.…` rather than destructured, so no
  // local value is a snapshot of an earlier render. `recentRest` is derived
  // because it depends on `featured`.
  const recentRest = $derived.by(() => {
    const { featured: f, recent: r } = data;
    return f === null ? r : r.filter((e) => e.slug !== f.slug);
  });
</script>

<svelte:head>
  <title>طبقه ۱۶ — پادکستِ گفت‌وگو</title>
  <meta
    name="description"
    content="آرشیف گفت‌وگوی طبقه ۱۶؛ از تازه‌ترین قسمت تا نخستین، با تاریخ، مدت و پیوندهای رسمیِ شنیدن."
  />
</svelte:head>

<section class="hero">
  <div class="container hero__inner">
    <p class="hero__eyebrow">پادکستِ گفت‌وگو</p>
    <h1 class="hero__thesis">گفت‌وگوهایی برای دیدنِ عمیق‌ترِ آدم‌ها و ایده‌ها</h1>
    <div class="hero__rule" aria-hidden="true"></div>
    <p class="hero__deck">
      طبقه ۱۶ یک اتاقِ گفت‌وگوست — از تیر ۱۳۹۹، با آدم‌هایی که می‌سازند، پژوهش می‌کنند و فکر
      می‌کنند.
      {#if data.site.episodeCount > 0}
        <span class="hero__count">
          {faNumber(data.site.episodeCount)} قسمت، هر کدام یک گفت‌گوی بلند.
        </span>
      {:else}
        <span class="hero__count">هنوز هیچ قسمتی همگام نشده است.</span>
      {/if}
    </p>

    <div class="hero__actions">
      {#if data.featured !== null}
        <WaveButton href={`/episodes/${data.featured.slug}`}>شنیدنِ تازه‌ترین قسمت</WaveButton>
      {/if}
      <a class="hero__secondary" href="/episodes">گشت در آرشیو</a>
    </div>
  </div>
</section>

{#if data.featured !== null}
  <section class="featured" aria-labelledby="featured-label">
    <div class="container featured__inner">
      <div class="featured__text">
        <div class="folio-label" id="featured-label">تازه‌ترین گفت‌وگو</div>
        <p class="featured__meta">
          {#if data.featured.episodeNo !== null}
            <span class="featured__nametag">قسمت {faNumber(data.featured.episodeNo)}</span>
          {/if}
          <time datetime={isoDay(data.featured.publishedAt)}>
            {formatJalaliDate(data.featured.publishedAt)}
          </time>
          {#if data.featured.durationSeconds !== null}
            <bdi class="ltr-run" dir="ltr">{formatDuration(data.featured.durationSeconds)}</bdi>
          {/if}
        </p>
        <h2 class="featured__title">
          <a href={`/episodes/${data.featured.slug}`}>
            {data.featured.titleHeadline ?? data.featured.titleSource}
          </a>
        </h2>
        {#if data.featured.titleByline !== null}
          <p class="featured__byline">با {data.featured.titleByline}</p>
        {/if}
        {#if data.featured.descriptionExcerpt !== ""}
          <p class="featured__excerpt">{data.featured.descriptionExcerpt}</p>
        {/if}
        <div class="featured__actions">
          <WaveButton href={`/episodes/${data.featured.slug}`}>
            <span class="featured__play-glyph" aria-hidden="true">▶</span>
            شنیدن
          </WaveButton>
          {#if data.featured.chapters !== null && data.featured.chapters.length > 0}
            <span class="featured__fact"
              >{faNumber(data.featured.chapters.length)} بخشِ زمان‌دار</span
            >
          {/if}
        </div>
      </div>

      {#if data.featured.imageUrl !== null || data.featured.episodeNo !== null}
        <div class="featured__art">
          <EpisodeArt
            imageUrl={data.featured.imageUrl}
            episodeNo={data.featured.episodeNo}
            alt={`روی جلد قسمت ${
              data.featured.episodeNo === null ? "" : faNumber(data.featured.episodeNo)
            }؛ ${data.featured.titleSource}`}
            shape="feature"
            color
            priority
          />
        </div>
      {/if}
    </div>
  </section>
{/if}

{#if recentRest.length > 0}
  <section class="recent" aria-labelledby="recent-label">
    <div class="container">
      <div class="recent__heading">
        <div class="folio-label" id="recent-label">قسمت‌های تازه</div>
        <a class="recent__heading-link" href="/episodes">
          همهٔ قسمت‌ها
          <span class="recent__heading-arrow" aria-hidden="true">→</span>
        </a>
      </div>
      <ul class="recent__list">
        {#each recentRest as episode, index (episode.slug)}
          <li class="recent__item" class:recent__item--lead={index === 0}>
            <EpisodeCard {episode} lead={index === 0} />
          </li>
        {/each}
      </ul>
    </div>
  </section>
{/if}

{#if data.topics.length > 0}
  <section class="topics" aria-labelledby="topics-label">
    <div class="container">
      <div class="folio-label" id="topics-label">موضوع‌ها</div>
      <ul class="topics__list">
        {#each data.topics as topic (topic.slug)}
          <li>
            <a class="chip" href={`/topics/${topic.slug}`}>
              {topic.title}
              <span class="chip__count">{faNumber(data.topicCounts.get(topic.slug) ?? 0)}</span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </section>
{/if}

{#if data.people.length > 0}
  <section class="people" aria-labelledby="people-label">
    <div class="container">
      <div class="folio-label" id="people-label">مهمان‌ها</div>
      <ul class="people__list">
        {#each data.people as person (person.slug)}
          <li>
            <a class="person-chip" href={`/people/${person.slug}`}>
              {person.displayName}
              <span class="person-chip__count">
                {faNumber(data.personCounts.get(person.slug) ?? 0)} قسمت
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </section>
{/if}

<section class="archive-cta" aria-labelledby="archive-cta-label">
  <div class="container archive-cta__inner">
    <div class="folio-label" id="archive-cta-label">
      {data.site.episodeCount > 0
        ? `همهٔ ${faNumber(data.site.episodeCount)} قسمت`
        : "همهٔ قسمت‌ها"}
    </div>
    <WaveButton href="/episodes">گشت در آرشیو</WaveButton>
    <p class="archive-cta__note">مرتب‌شده با تاریخ انتشار، از تازه‌ترین تا نخستین.</p>
  </div>
</section>

<style>
  .hero {
    padding-block: var(--sp-9) var(--sp-8);
  }

  .hero__inner {
    display: grid;
    gap: var(--sp-4);
  }

  .hero__eyebrow {
    font-size: var(--fs-label);
    font-weight: 500;
    color: var(--muted);
  }

  .hero__thesis {
    max-width: 22ch;
    font-size: var(--fs-hero);
    line-height: var(--lh-hero);
    font-weight: 700;
    text-wrap: balance;
  }

  .hero__rule {
    width: var(--sp-8);
    height: 2px;
    background-color: var(--ink);
  }

  .hero__deck {
    max-width: 52ch;
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    color: var(--ink);
  }

  .hero__count {
    color: var(--muted);
  }

  .hero__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-4);
    margin-block-start: var(--sp-4);
  }

  /* The play glyph inside the featured CTA: non-directional, isolated. */
  .featured__play-glyph {
    direction: ltr;
    unicode-bidi: isolate;
    font-size: 0.8em;
  }

  .hero__secondary {
    display: inline-flex;
    align-items: center;
    min-height: 48px;
    padding-inline: var(--sp-2);
    color: var(--ink);
    font-size: var(--fs-label);
    font-weight: 500;
  }

  /* The folio label, the prose model, and the audio clip live in base.css —
     one system, no per-page copies. */

  .featured {
    padding-block: var(--sp-8);
  }

  .featured__inner {
    display: grid;
    gap: var(--sp-6);
    align-items: center;
  }

  .featured__text {
    display: grid;
    gap: var(--sp-3);
    justify-items: start;
  }

  .featured__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-3);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .featured__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .featured__title a {
    text-decoration: none;
  }

  .featured__title a:hover {
    text-decoration-line: underline;
  }

  .featured__byline {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  /* The CTA row: the wave button plus the chapter count as a quiet fact —
     never a badge wall, one fact the source actually carries. */
  .featured__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-4);
    margin-block-start: var(--sp-2);
  }

  .featured__fact {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .featured__excerpt {
    max-width: 52ch;
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  /* The single slot that keeps source colour: colour is the present tense
     (the imagery system). The geometry and the plate live in EpisodeArt. */
  .featured__art {
    display: block;
  }

  .recent,
  .topics,
  .people {
    padding-block: var(--sp-7);
  }

  /*
   * The section heading: the folio label's hairline runs to the far edge,
   * and the archive link sits at that edge — the label is navigation, so
   * the row it names carries its destination (the Persian typographic rules-1).
   */
  .recent__heading {
    display: flex;
    align-items: center;
    gap: var(--sp-5);
    margin-block-end: var(--sp-5);
  }

  .recent__heading .folio-label {
    flex: 1;
  }

  .recent__heading-link {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 44px;
    color: var(--ink);
    font-size: var(--fs-label);
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
    transition: color var(--dur-micro) var(--ease-press);
  }

  .recent__heading-link:hover {
    color: var(--muted);
    text-decoration-line: underline;
  }

  .recent__heading-arrow {
    direction: ltr;
    unicode-bidi: isolate;
  }

  .recent__list,
  .topics__list,
  .people__list {
    display: grid;
    gap: var(--sp-5);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .recent__list {
    display: grid;
    gap: var(--sp-6);
  }

  /*
   * The entrance: cards rise four pixels and fade in, forty milliseconds
   * apart — one orchestrated moment for the home's most-read section, not
   * a scroll-reveal pattern (§6.1: no mandatory reveals). Runs once, on
   * load, and never under reduced motion.
   */
  .recent__item {
    animation: recent-in var(--dur-std) var(--ease-out-soft) backwards;
  }

  .recent__item:nth-child(2) {
    animation-delay: 40ms;
  }

  .recent__item:nth-child(3) {
    animation-delay: 80ms;
  }

  .recent__item:nth-child(4) {
    animation-delay: 120ms;
  }

  .recent__item:nth-child(5) {
    animation-delay: 160ms;
  }

  .recent__item:nth-child(6) {
    animation-delay: 200ms;
  }

  @keyframes recent-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .topics__list,
  .people__list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
  }

  .chip,
  .person-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 44px;
    padding-inline: var(--sp-4);
    border: 1px solid var(--stone);
    border-radius: var(--r-chip);
    background-color: var(--surface);
    color: var(--ink);
    font-size: var(--fs-label);
    text-decoration: none;
    transition: border-color var(--dur-micro) var(--ease-press);
  }

  .chip:hover,
  .person-chip:hover {
    border-color: var(--ink);
  }

  .chip__count,
  .person-chip__count {
    font-family: var(--font-body);
    color: var(--muted);
  }

  .archive-cta {
    padding-block: var(--sp-9);
  }

  .archive-cta__inner {
    display: grid;
    gap: var(--sp-4);
    justify-items: center;
    text-align: center;
  }

  .archive-cta__inner .folio-label {
    justify-self: stretch;
  }

  .archive-cta__note {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  @media (min-width: 1024px) {
    .featured__inner {
      grid-template-columns: 7fr 5fr;
    }

    /*
     * Editorial asymmetry, spent on the lead: the newest conversation spans
     * two of the three columns with a display-size title, the rest sit in
     * the calm three-up rhythm (§5 — density at desktop).
     */
    .recent__list {
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-6);
    }

    .recent__item--lead {
      grid-column: span 2;
      grid-row: span 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .recent__item {
      animation: none;
    }
  }
</style>
