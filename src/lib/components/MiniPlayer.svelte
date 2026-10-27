<script lang="ts">
  /**
   * The sticky mini-player (the mobile composition).
   *
   * Appears only while media is actually playing, keeps playing across
   * scrolling, and is dismissible — it never traps focus, never covers the
   * footer's fine print, and returns the page scroll position intact. The
   * second (and last) translucent surface of the two-surface budget: the
   * first is the sticky header (§2.5).
   *
   * The bar enters with one spring-like rise (transform + opacity only, no
   * layout shift) and returns instantly under reduced motion.
   */

  import EpisodeArt from "./EpisodeArt.svelte";
  import WaveButton from "./WaveButton.svelte";
  import type { PlayerState } from "#lib/player";

  interface Props {
    headline: string;
    imageUrl: string | null;
    episodeNo: number | null;
    href: string;
    state: PlayerState;
    audioElement: HTMLAudioElement | null;
    onDismiss: () => void;
  }

  let { headline, imageUrl, episodeNo, href, state, audioElement, onDismiss }: Props = $props();

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
</script>

<div class="mini-player" class:mini-player--playing={state.playing}>
  <a class="mini-player__art" {href} tabindex="-1" aria-hidden="true">
    <EpisodeArt {imageUrl} {episodeNo} alt="" shape="thumb" />
  </a>

  <WaveButton
    variant="ink"
    size="round-sm"
    label={state.playing ? "توقف پخش" : "پخش قسمت"}
    onclick={toggle}
  >
    <span class="mini-player__glyph" aria-hidden="true">
      {state.playing ? "❚❚" : "▶"}
    </span>
  </WaveButton>

  <a class="mini-player__title" {href}>{headline}</a>

  <p class="mini-player__status" aria-live="polite">
    {state.playing ? "در حال پخش" : "متوقف شد"}
  </p>

  <button
    type="button"
    class="mini-player__dismiss"
    onclick={onDismiss}
    aria-label="بستن پخش‌کننده"
  >
    <span aria-hidden="true">×</span>
  </button>
</div>

<style>
  .mini-player {
    position: fixed;
    inset-block-end: var(--sp-4);
    inset-inline: var(--sp-4);
    z-index: var(--z-player);
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    max-width: calc(var(--content-max) - var(--sp-8));
    margin-inline: auto;
    min-height: 64px;
    padding: var(--sp-2) var(--sp-4);
    border: 1px solid var(--stone);
    border-radius: var(--r-card);
    background-color: color-mix(in srgb, var(--surface) 90%, transparent);
    backdrop-filter: blur(12px);
    box-shadow: var(--e-2);
    /* One rise into place: transform + opacity, so the bar's arrival never
       shifts the page under it (§6.1 — the modal tier's timing). */
    animation: mini-player-in var(--dur-modal) var(--ease-out-soft);
  }

  @keyframes mini-player-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mini-player__art {
    flex: none;
    width: 40px;
  }

  .mini-player__glyph {
    direction: ltr;
    unicode-bidi: isolate;
    line-height: 1;
  }

  .mini-player__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-family: var(--font-display);
    font-size: var(--fs-body-s);
    font-weight: 600;
    line-height: var(--lh-body-s);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .mini-player__status {
    flex: none;
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .mini-player__dismiss {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--r-chip);
    background: none;
    color: var(--muted);
    font-size: var(--fs-title);
    line-height: 1;
    transition: color var(--dur-micro) var(--ease-press);
  }

  .mini-player__dismiss:hover {
    color: var(--ink);
  }

  @media (max-width: 640px) {
    .mini-player__status {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mini-player {
      /* The bar positions instantly; dismiss and play stay immediate. */
      animation: none;
    }
  }
</style>
