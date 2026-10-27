<script lang="ts">
  /**
   * The episode row — the archive's chronological row, extracted so the
   * archive, the guest pages, and every future list render one row system
   * (the archive row model "Row interaction model").
   *
   * Two real actions per row, zero nesting: the headline is an <a> stretched
   * over the row by a ::after overlay, and the play affordance is a separate
   * sibling <a> raised above it. Both point at the same episode page —
   * neither inert, neither invalid.
   *
   * The mono thumb is the row's print texture: the archive as a table of
   * contents for conversations (design thesis, §4), with the designed plate
   * underneath so the index never shows a blank frame.
   */

  import EpisodeArt from "./EpisodeArt.svelte";
  import type { EpisodeRowView } from "#lib/row-view";

  interface Props {
    row: EpisodeRowView;
  }

  let { row }: Props = $props();
</script>

<li class="episode-row">
  <div class="episode-row__inner">
    <div class="episode-row__thumb">
      <EpisodeArt
        imageUrl={row.imageUrl}
        episodeNo={row.episodeNo}
        alt={row.artAlt}
        shape="thumb"
      />
    </div>

    <div class="episode-row__text">
      {#if row.episodeNumberLabel !== null}
        <span class="episode-row__nametag">{row.episodeNumberLabel}</span>
      {/if}

      <h3 class="episode-row__title">
        <a href={`/episodes/${row.slug}`}>{row.headline}</a>
      </h3>
      {#if row.byline !== null}
        <p class="episode-row__byline">با {row.byline}</p>
      {/if}
      <p class="episode-row__meta">
        <time datetime={row.day}>{row.yearLabel}</time>
        {#if row.durationLabel !== null}
          <bdi class="episode-row__duration ltr-run" dir="ltr">
            {row.durationLabel}
          </bdi>
        {/if}
      </p>
    </div>

    <a
      class="episode-row__play"
      href={`/episodes/${row.slug}`}
      aria-label={`شنیدن: ${row.headline}`}
    >
      <span aria-hidden="true">▶</span>
    </a>
  </div>
</li>

<style>
  .episode-row__inner {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding-block: var(--sp-4);
    transition: background-color var(--dur-fast) var(--ease-out-soft);
  }

  .episode-row__thumb {
    flex: none;
    width: 64px;
  }

  @media (min-width: 641px) {
    .episode-row__thumb {
      width: 72px;
    }
  }

  /*
   * The separator between rows lives on the sibling edge, which only exists
   * in a parent list — outside this component's own template. The selector
   * is therefore global by design: `.episode-row` is a system class shared
   * by the archive, the guest pages, and the related lists, and the rule
   * must apply wherever two rows sit together.
   */
  :global(.episode-row + .episode-row .episode-row__inner) {
    border-block-start: 1px solid var(--stone);
  }

  .episode-row__nametag {
    flex: none;
    padding: var(--sp-1) var(--sp-3);
    border-radius: var(--r-chip);
    background-color: var(--surface);
    color: var(--muted);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
  }

  .episode-row__text {
    display: grid;
    gap: var(--sp-1);
    flex: 1;
    min-width: 0;
  }

  .episode-row__title {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 600;
    line-height: var(--lh-title);
  }

  .episode-row__title a {
    text-decoration: none;
  }

  .episode-row__title a:hover {
    text-decoration-line: underline;
  }

  /* The stretched link: covers the row without nesting anything inside it. */
  .episode-row__title a::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: var(--z-content);
  }

  .episode-row__byline {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .episode-row__meta {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .episode-row__duration {
    font-family: var(--font-mono);
  }

  /* A real sibling control, raised above the stretched link overlay. */
  .episode-row__play {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: var(--r-chip);
    background-color: var(--ink);
    color: var(--paper);
    font-size: 0.8em;
    text-decoration: none;
    /* The row's play affordance is quiet until approached: desktop reveals
       it on hover/focus, touch keeps it visible always (there is no hover
       to earn it with). */
    transition:
      background-color var(--dur-micro) var(--ease-press),
      opacity var(--dur-fast) var(--ease-out-soft),
      transform var(--dur-fast) var(--ease-out-soft);
  }

  @media (hover: hover) and (pointer: fine) {
    .episode-row__play {
      opacity: 0;
      transform: scale(0.92);
    }

    .episode-row:hover .episode-row__play,
    .episode-row:focus-within .episode-row__play {
      opacity: 1;
      transform: scale(1);
    }
  }

  .episode-row__play:hover {
    background-color: var(--graphite);
  }

  .episode-row__play span {
    direction: ltr;
    unicode-bidi: isolate;
  }

  @media (max-width: 640px) {
    .episode-row__inner {
      align-items: center;
    }

    .episode-row__title {
      font-size: var(--fs-body-s);
      line-height: var(--lh-body-s);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .episode-row__inner,
    .episode-row__play {
      transition: none;
    }

    .episode-row__play {
      opacity: 1;
      transform: none;
    }
  }
</style>
