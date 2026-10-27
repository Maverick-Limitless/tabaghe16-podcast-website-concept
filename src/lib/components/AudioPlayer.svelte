<script lang="ts">
  /**
   * The listen band's player (the episode-detail composition, §5.6; audio behavior).
   *
   * A real player over the episode's verified enclosure URL: play/pause,
   * seek, current time, duration, buffering, and a real error state with the
   * platform fallbacks — never a decorative play button. The audio element
   * itself lives in the page (it also feeds the chapters and the mini-player),
   * and this component presents it.
   *
   * The equalizer bars move only while media is actually playing (DESIGN.md
   * §6.1) and are the only accent-colored element on the paper side of the
   * band; every other state is carried by text or glyphs, never color alone.
   */

  import WaveButton from "./WaveButton.svelte";
  import { formatDuration } from "#lib/dates";
  import type { PlayerState } from "#lib/player";

  export interface PlatformFallback {
    readonly id: string;
    readonly label: string;
    readonly url: string;
  }

  interface Props {
    audioUrl: string | null;
    state: PlayerState;
    /** The element the page renders; null before mount and on failure mount. */
    audioElement: HTMLAudioElement | null;
    fallbackLinks: readonly PlatformFallback[];
    /** The now-playing line beside the control (the episode-detail composition). */
    title: string;
    byline: string | null;
  }

  let { audioUrl, state, audioElement, fallbackLinks, title, byline }: Props = $props();

  // The seek slider's value is the state, clamped to what the element can
  // currently report; before metadata the slider rests at zero.
  const progress = $derived(
    state.duration > 0 ? Math.min(state.currentTime / state.duration, 1) : 0
  );

  function toggle(): void {
    if (audioElement === null) {
      return;
    }
    if (audioElement.paused) {
      void audioElement.play().catch((error: DOMException) => {
        // Pausing before the play request settles rejects with AbortError —
        // a normal interruption (the fast play-then-pause), never a failure
        // state; anything else really did fail to reach the source.
        if (error.name !== "AbortError") {
          state.failed = true;
        }
      });
    } else {
      audioElement.pause();
    }
  }

  function onSeek(event: Event & { currentTarget: HTMLInputElement }): void {
    const audio = audioElement;
    if (audio === null || state.duration <= 0) {
      return;
    }
    // A drag moves the play head; it never restarts playback on its own and
    // never goes past the duration the element actually reports.
    const target = Math.min(Number(event.currentTarget.value) * state.duration, state.duration);
    audio.currentTime = target;
    state.currentTime = audio.currentTime;
  }
</script>

<div class="listen-player">
  {#if state.failed}
    <div class="listen-player__failed" role="alert">
      <p class="listen-player__failed-text">پخش از سرور صدا برقرار نشد.</p>
      <ul class="listen-player__fallbacks">
        {#each fallbackLinks as link (link.id)}
          <li>
            <a href={link.url} rel="noopener noreferrer" target="_blank">
              {link.label}
              <span class="listen-player__external" aria-hidden="true">↗</span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <WaveButton
      variant="ink"
      size="round"
      label={state.playing ? "توقف پخش" : "پخش قسمت"}
      onclick={toggle}
    >
      <span class="listen-player__glyph" aria-hidden="true">
        {#if state.loading}
          <span class="listen-player__dots"><span></span><span></span><span></span></span>
        {:else if state.playing}
          <span class="listen-player__eq" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
        {:else}
          ▶
        {/if}
      </span>
    </WaveButton>

    <div class="listen-player__track">
      <!--
        The now-playing line: the episode's own headline and guest, so the
        band identifies what is loaded even when the visitor arrived from
        search (the episode-detail composition). The live status for assistive tech is a
        separate polite region below the clock.
      -->
      <p class="listen-player__now">
        <span class="listen-player__now-title">{title}</span>
        {#if byline !== null}
          <span class="listen-player__now-byline">با {byline}</span>
        {/if}
        {#if state.playing}
          <span class="listen-player__now-cue" aria-hidden="true">
            <span class="listen-player__eq"><span></span><span></span><span></span></span>
            در حال پخش
          </span>
        {/if}
      </p>
      <p class="listen-player__status" role="status" aria-live="polite">
        {state.playing ? "در حال پخش" : state.failed ? "پخش ناموفق بود" : ""}
      </p>
      <input
        id="seek"
        class="listen-player__seek"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={progress}
        style:--progress={progress}
        oninput={onSeek}
        aria-label="جابه‌جایی در صوت"
        aria-valuetext={`${formatDuration(state.currentTime)} از ${
          state.duration > 0 ? formatDuration(state.duration) : "مدت نامعلوم"
        }`}
      />
      <p class="listen-player__clock">
        <bdi class="ltr-run" dir="ltr">{formatDuration(state.currentTime)}</bdi>
        {#if state.duration > 0}
          <span class="listen-player__clock-sep" aria-hidden="true">/</span>
          <bdi class="ltr-run" dir="ltr">{formatDuration(state.duration)}</bdi>
        {/if}
      </p>
    </div>
  {/if}

  <p class="listen-player__hidden-note">
    صدای قسمت از سرورهای آکست پخش می‌شود و روی این سایت میزبانی نمی‌شود.
  </p>

  {#if audioUrl === null}
    <p class="listen-player__no-source">
      این قسمت پیوند شنیدن ندارد؛ از پیوندهای زیر استفاده کنید.
    </p>
  {/if}
</div>

<style>
  /*
   * The layout of the band's player: a 56px control, a track that fills, and
   * the clock. On mobile the track wraps under the control. The flex growth
   * lives here because this element is the band's child, and a parent
   * component's scoped styles never reach into a child's own DOM.
   */
  .listen-player {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-4);
    flex: 1;
    min-width: 0;
  }

  .listen-player__glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    direction: ltr;
    unicode-bidi: isolate;
    /* Non-directional glyph: never mirrored (the Persian typographic rules-5). */
  }

  .listen-player__dots {
    display: inline-flex;
    gap: 4px;
  }

  .listen-player__dots span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: var(--paper);
    animation: listen-dot 900ms var(--ease-out-soft) infinite;
  }

  .listen-player__dots span:nth-child(2) {
    animation-delay: 150ms;
  }

  .listen-player__dots span:nth-child(3) {
    animation-delay: 300ms;
  }

  @keyframes listen-dot {
    0%,
    100% {
      opacity: 0.3;
      transform: translateY(0);
    }
    40% {
      opacity: 1;
      transform: translateY(-3px);
    }
  }

  /*
   * The equalizer cue: three bars, accent-colored on the ink surface, only
   * while media is actually playing (§6.1).
   */
  .listen-player__eq {
    display: inline-flex;
    align-items: flex-end;
    gap: 3px;
    height: 16px;
  }

  .listen-player__eq span {
    width: 3px;
    border-radius: 2px;
    background-color: var(--accent);
    animation: listen-eq 700ms var(--ease-out-soft) infinite alternate;
  }

  .listen-player__eq span:nth-child(1) {
    height: 60%;
    animation-delay: 0ms;
  }

  .listen-player__eq span:nth-child(2) {
    height: 100%;
    animation-delay: 120ms;
  }

  .listen-player__eq span:nth-child(3) {
    height: 45%;
    animation-delay: 240ms;
  }

  @keyframes listen-eq {
    from {
      transform: scaleY(0.4);
      transform-origin: bottom;
    }
    to {
      transform: scaleY(1);
      transform-origin: bottom;
    }
  }

  .listen-player__track {
    display: grid;
    flex: 1 1 220px;
    gap: var(--sp-1);
    min-width: 0;
  }

  /*
   * The now-playing line: headline in the display face, guest as the byline,
   * and — only while media runs — a small accent equalizer with the status
   * text beside it (never color alone: the glyphs and the words carry it).
   */
  .listen-player__now {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }

  .listen-player__now-title {
    font-family: var(--font-display);
    font-size: var(--fs-body-s);
    font-weight: 600;
    line-height: var(--lh-body-s);
  }

  .listen-player__now-byline {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .listen-player__now-cue {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  /* Screen-reader-only live status; the visible cue is in the now line. */
  .listen-player__status {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /*
   * The seek control is a native range input: arrow keys, Home/End and the
   * screen-reader slider role come for free, and RTL flips its travel
   * direction automatically — the start edge is the right edge.
   */
  .listen-player__seek {
    width: 100%;
    height: 24px;
    margin: 0;
    background: transparent;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }

  .listen-player__seek::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: var(--r-chip);
    /*
     * The fill is the accent — a >=3px non-text fill, always alongside the
     * digit clock so state is never color alone (the color rules).
     */
    background: linear-gradient(
      to left,
      var(--accent) 0%,
      var(--accent) calc(var(--progress, 0) * 100%),
      var(--stone) calc(var(--progress, 0) * 100%),
      var(--stone) 100%
    );
  }

  .listen-player__seek::-moz-range-track {
    height: 4px;
    border-radius: var(--r-chip);
    background: var(--stone);
  }

  .listen-player__seek::-moz-range-progress {
    height: 4px;
    border-radius: var(--r-chip);
    background-color: var(--accent);
  }

  .listen-player__seek::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6px;
    border: none;
    border-radius: 50%;
    background-color: var(--ink);
    transition: transform var(--dur-micro) var(--ease-press);
  }

  .listen-player__seek::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 50%;
    background-color: var(--ink);
  }

  .listen-player__seek:hover::-webkit-slider-thumb {
    transform: scale(1.1);
  }

  .listen-player__clock {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .listen-player__clock-sep {
    color: var(--stone);
  }

  .listen-player__failed {
    display: grid;
    gap: var(--sp-2);
    flex: 1 1 100%;
    padding: var(--sp-4);
    border: 1px solid var(--error);
    border-radius: var(--r-control);
    background-color: var(--surface);
  }

  .listen-player__failed-text {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--error);
    font-weight: 500;
  }

  .listen-player__fallbacks {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .listen-player__fallbacks a {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
  }

  .listen-player__external {
    font-size: 0.8em;
    color: var(--muted);
    direction: ltr;
    unicode-bidi: isolate;
  }

  .listen-player__hidden-note,
  .listen-player__no-source {
    flex: 1 1 100%;
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .listen-player__no-source {
    color: var(--warning);
  }

  @media (prefers-reduced-motion: reduce) {
    .listen-player__dots span,
    .listen-player__eq span {
      animation: none;
    }

    .listen-player__eq span {
      transform: scaleY(1);
    }
  }

  @media (max-width: 640px) {
    .listen-player__track {
      flex-basis: 100%;
    }
  }
</style>
