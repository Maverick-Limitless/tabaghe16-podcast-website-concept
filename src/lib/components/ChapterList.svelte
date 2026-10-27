<script lang="ts">
  /**
   * «فهرست بخش‌ها» — the episode's chapter list (the episode-detail composition).
   *
   * Rendered from validated source chapters only (schema §5.3): every stamp
   * and label comes from the feed, and when the source has none the section
   * itself is absent rather than filled with invented rows.
   *
   * With audio available each row is a real button: the press requests the
   * element's metadata when it has none yet, and the seek lands only once
   * that metadata is in and the stamp is inside the media duration
   * (player.ts `seekChapter`) — so a bad stamp can never claim to have played
   * somewhere the audio cannot go. Without an enclosure the rows are plain
   * list items: a button that cannot act is worse than no button (no inert controls).
   *
   * Mono stamps are isolated LTR runs; the playing row carries an accent tick
   * *and* a glyph swap, so the state is never color-only (accessibility).
   */

  import { activeChapterIndex, seekChapter, type PlayerState } from "#lib/player";
  import type { Chapter } from "#lib/server/schema";

  interface Props {
    chapters: readonly Chapter[];
    audioElement: HTMLAudioElement | null;
    state: PlayerState;
  }

  let { chapters, audioElement, state }: Props = $props();

  // A row is operable whenever the episode has an enclosure — the press
  // fetches metadata on demand instead of requiring playback first.
  const canSeek = $derived(audioElement !== null);
  const activeIndex = $derived(activeChapterIndex(chapters, state.currentTime, state.duration));

  function activate(chapter: Chapter): void {
    if (!canSeek) {
      return;
    }
    seekChapter(audioElement, chapter.timeSeconds, state);
  }
</script>

<ol class="chapters">
  {#each chapters as chapter, index (chapter.timeRaw + chapter.label)}
    <li class="chapters__row" class:chapters__row--active={index === activeIndex}>
      {#if canSeek}
        <button
          type="button"
          class="chapters__button"
          onclick={() => activate(chapter)}
          aria-current={index === activeIndex ? "true" : undefined}
        >
          <bdi class="chapters__stamp" dir="ltr">{chapter.timeRaw}</bdi>
          <span class="chapters__label">{chapter.label}</span>
          {#if index === activeIndex}
            <span class="chapters__playing" aria-hidden="true">❚❚</span>
          {:else}
            <span class="chapters__play" aria-hidden="true">▶</span>
          {/if}
        </button>
      {:else}
        <div class="chapters__static">
          <bdi class="chapters__stamp" dir="ltr">{chapter.timeRaw}</bdi>
          <span class="chapters__label">{chapter.label}</span>
        </div>
      {/if}
    </li>
  {/each}
</ol>

<style>
  .chapters {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chapters__row + .chapters__row .chapters__button,
  .chapters__row + .chapters__row .chapters__static {
    border-block-start: 1px solid var(--stone);
  }

  .chapters__button,
  .chapters__static {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    width: 100%;
    min-height: 44px;
    padding: var(--sp-2) var(--sp-1);
    background: none;
    border: none;
    /* Every row carries the transparent tick border, so activating a row
       never shifts its text (performance). */
    border-inline-start: 2px solid transparent;
    border-radius: var(--r-inner);
    text-align: start;
  }

  .chapters__button {
    cursor: pointer;
    transition: background-color var(--dur-micro) var(--ease-press);
  }

  .chapters__button:hover {
    background-color: var(--surface);
  }

  .chapters__row--active .chapters__button {
    background-color: var(--surface);
  }

  /* The accent tick: a >=3px non-text fill on paper, always with the glyph
     swap beside it (the color rules — state is never color alone). */
  .chapters__row--active .chapters__button {
    border-inline-start-color: var(--accent);
  }

  .chapters__stamp {
    flex: none;
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .chapters__row--active .chapters__stamp {
    color: var(--ink);
  }

  .chapters__label {
    flex: 1;
    min-width: 0;
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
  }

  .chapters__play,
  .chapters__playing {
    flex: none;
    font-size: 0.75em;
    color: var(--muted);
    direction: ltr;
    unicode-bidi: isolate;
  }

  .chapters__playing {
    color: var(--ink);
  }

  .chapters__button:hover .chapters__play {
    color: var(--ink);
  }

  @media (prefers-reduced-motion: reduce) {
    .chapters__button {
      transition: none;
    }
  }
</style>
