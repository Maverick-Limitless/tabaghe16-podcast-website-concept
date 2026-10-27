<script lang="ts">
  /**
   * Editorial episode card — the home composition (recent grid) and §4.
   *
   * Renders store fields only: the artwork is the only image source the feed
   * provides, and it renders through the one image process (EpisodeArt) so
   * the card's media box is complete even when the source host is slow or
   * down. When the title was split by the extraction rules, the headline is
   * the link text and the byline renders beneath it; otherwise the whole
   * source title renders.
   */

  import EpisodeArt from "./EpisodeArt.svelte";
  import { faNumber, formatDuration, formatJalaliDate, isoDay } from "#lib/dates";
  import type { Episode } from "#lib/server/schema";

  interface Props {
    episode: Episode;
    /** The lead card of a grid: larger title scale, the editorial lead. */
    lead?: boolean;
  }

  let { episode, lead = false }: Props = $props();

  // Derived, not snapshotted: the card re-renders when the parent passes a new
  // episode object rather than keeping values captured from the first render.
  const headline = $derived(episode.titleHeadline ?? episode.titleSource);
  const hasByline = $derived(episode.titleByline !== null);

  const href = $derived(`/episodes/${episode.slug}`);
  const artAlt = $derived(
    episode.imageUrl === null
      ? ""
      : `روی جلد قسمت ${episode.episodeNo === null ? "" : faNumber(episode.episodeNo)}؛ ${episode.titleSource}`
  );
</script>

<article class="episode-card" class:episode-card--lead={lead}>
  <a class="episode-card__media" {href} tabindex="-1" aria-hidden="true">
    <EpisodeArt
      imageUrl={episode.imageUrl}
      episodeNo={episode.episodeNo}
      alt={artAlt}
      shape="card"
    />
  </a>

  <div class="episode-card__body">
    {#if episode.episodeNo !== null}
      <span class="episode-card__nametag">
        قسمت <span class="episode-card__number">{faNumber(episode.episodeNo)}</span>
      </span>
    {/if}

    <h3 class="episode-card__title">
      <a {href}>{headline}</a>
    </h3>

    {#if hasByline}
      <p class="episode-card__byline">با {episode.titleByline}</p>
    {/if}

    <p class="episode-card__meta">
      <time datetime={isoDay(episode.publishedAt)}>{formatJalaliDate(episode.publishedAt)}</time>
      {#if episode.durationSeconds !== null}
        <span class="episode-card__duration">
          <bdi class="ltr-run" dir="ltr">{formatDuration(episode.durationSeconds)}</bdi>
        </span>
      {/if}
    </p>
  </div>
</article>

<style>
  .episode-card {
    display: grid;
    gap: var(--sp-3);
    padding-block: var(--sp-4);
    border-block-start: 1px solid var(--stone);
  }

  .episode-card__media {
    display: block;
    overflow: hidden;
    border-radius: var(--r-inner);
    background-color: var(--surface);
    /*
     * The card's approach state: the border sharpens and the media lifts by
     * two pixels — transform and border only, never a shadow on every card
     * (the elevation budget). Reduced motion drops the lift, keeps the border.
     */
    transition:
      border-color var(--dur-fast) var(--ease-out-soft),
      transform var(--dur-fast) var(--ease-out-soft);
  }

  @media (hover: hover) and (pointer: fine) {
    .episode-card:hover .episode-card__media,
    .episode-card:focus-within .episode-card__media {
      border-color: var(--ink);
      transform: translateY(-2px);
    }
  }

  .episode-card--lead .episode-card__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
  }

  .episode-card__body {
    display: grid;
    gap: var(--sp-1);
  }

  .episode-card__nametag {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .episode-card__number {
    font-family: var(--font-mono);
  }

  .episode-card__title {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 600;
    line-height: var(--lh-title);
  }

  .episode-card__title a {
    text-decoration: none;
  }

  .episode-card__title a:hover {
    text-decoration-line: underline;
  }

  .episode-card__byline {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .episode-card__meta {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .episode-card__duration {
    font-family: var(--font-mono);
  }

  @media (min-width: 641px) {
    .episode-card {
      grid-template-columns: 96px 1fr;
      align-items: start;
      gap: var(--sp-4);
    }
  }
</style>
