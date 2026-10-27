<script lang="ts">
  /**
   * Episode artwork — the one image process for the whole site
   * (the imagery system).
   *
   * The feed's per-episode artwork is the only verified image source, and it
   * arrives from the source host at unpredictable speed. This component
   * makes that an editorial decision instead of a failure mode:
   *
   *  - resting state is print: warm monochrome, so six years of
   *    heterogeneous covers read as one publication;
   *  - `color` renders source color — the present tense, rationed to the
   *    featured slot and the episode being read;
   *  - the designed plate is always the backdrop: before the image lands
   *    and if it never does, the frame shows the episode's own number in
   *    the mono face on paper, so the composition is complete without the
   *    network. No blank boxes, no broken-image icons.
   *
   * The aspect ratio is fixed by CSS and the image fades into the plate, so
   * a late or failed image never shifts the layout it appears in.
   */

  import { faNumber } from "#lib/dates";

  interface Props {
    imageUrl: string | null;
    /** Verified store value; rendered on the plate when it exists. */
    episodeNo: number | null;
    /** Descriptive Persian alt, generated from verified fields only. */
    alt: string;
    /** Full source color — the present tense (featured slot, detail page). */
    color?: boolean;
    /** Above-the-fold art loads eagerly; everything else waits. */
    priority?: boolean;
    /** Geometry of the slot, so the plate always matches the media box. */
    shape?: "feature" | "card" | "thumb";
  }

  let {
    imageUrl,
    episodeNo,
    alt,
    color = false,
    priority = false,
    shape = "card"
  }: Props = $props();

  let loaded = $state(false);
  let failed = $state(false);
  let imgElement = $state<HTMLImageElement | null>(null);

  /**
   * Reveal-on-load, CSP-clean twice over: `onload`/`onerror` attributes and
   * `use:` actions on media elements both make Svelte server-render inline
   * replay attributes, which a strict script-src blocks — and the block
   * swallows the reveal with it. `bind:this` plus this effect attaches real
   * listeners instead, and the `complete` check catches images that finish
   * before hydration: they never fire `load` again.
   */
  $effect(() => {
    const node = imgElement;
    if (node === null) {
      return;
    }

    const done = (): void => {
      loaded = true;
    };
    const fail = (): void => {
      failed = true;
    };

    if (node.complete && node.naturalWidth > 0) {
      done();
      return;
    }

    node.addEventListener("load", done, { once: true });
    node.addEventListener("error", fail, { once: true });
    return () => {
      node.removeEventListener("load", done);
      node.removeEventListener("error", fail);
    };
  });
</script>

<figure class="art art--{shape}" class:art--color={color}>
  {#if imageUrl !== null && !failed}
    <img
      bind:this={imgElement}
      class="art__img"
      class:art__img--loaded={loaded}
      src={imageUrl}
      {alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchpriority={priority ? "high" : "auto"}
    />
  {/if}

  <div class="art__plate">
    {#if episodeNo !== null}
      <span class="art__plate-number" dir="ltr">{faNumber(episodeNo)}</span>
      <span class="art__plate-caption">قسمت</span>
    {:else}
      <span class="art__plate-mark" aria-hidden="true">۱۶</span>
    {/if}
  </div>
</figure>

<style>
  .art {
    position: relative;
    display: block;
    margin: 0;
    overflow: hidden;
    background-color: var(--surface);
  }

  .art--feature {
    aspect-ratio: 16 / 10;
    border-radius: var(--r-feature);
  }

  .art--card {
    aspect-ratio: 16 / 10;
    border-radius: var(--r-inner);
  }

  .art--thumb {
    aspect-ratio: 1 / 1;
    border-radius: var(--r-inner);
  }

  /* The image fades into the plate: a slow source host shows the designed
     frame first, then the cover resolves over it — never a blank box and
     never a layout shift. */
  .art__img {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    opacity: 0;
    transition: opacity var(--dur-std) var(--ease-out-soft);
  }

  .art__img--loaded {
    opacity: 1;
  }

  /*
   * Resting state is print: the warm monochrome wash makes six years of
   * heterogeneous covers read as ink on this paper (§4). `filter` is a
   * per-element GPU composite on media that is actually rendered — archive
   * lists pair it with lazy loading, so off-screen rows never pay for it.
   */
  .art__img {
    filter: grayscale(1) contrast(1.02) sepia(0.06);
  }

  /* Color is the present tense: the featured slot and the episode being
     read keep source color, always (§4's one rule). */
  .art--color .art__img {
    filter: none;
  }

  .art__plate {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--sp-1);
    /*
     * The plate speaks the system's own language: paper-tinted surface, a
     * hairline frame inset from the edge, and the episode's number in the
     * data voice. It is a designed object, not a placeholder.
     */
    background-color: var(--paper);
    box-shadow: inset 0 0 0 1px var(--stone);
    border-radius: inherit;
  }

  .art--feature .art__plate {
    /* The night-window edge: a single amber hairline on the featured slot
       only — the one place the room's light shows on the paper side. */
    box-shadow:
      inset 0 0 0 1px var(--stone),
      inset 0 0 0 4px var(--paper),
      inset 0 0 0 5px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  /*
   * The plate number is an editorial figure in Persian digits — the display
   * face, per the bilingual-digit rule (the Persian typographic rules-2): mono is for
   * Latin machine data only, and Plex Mono carries no Arabic glyphs, so
   * the digits would fall through to a system face anyway.
   */
  .art__plate-number {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 600;
    line-height: var(--lh-title);
    color: var(--muted);
  }

  .art--feature .art__plate-number {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    color: var(--ink);
  }

  .art__plate-caption {
    font-family: var(--font-body);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .art__plate-mark {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 700;
    color: var(--muted);
  }

  .art--thumb .art__plate-number {
    font-size: var(--fs-body-s);
  }

  .art--thumb .art__plate-caption {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .art__img {
      transition: none;
    }
  }
</style>
