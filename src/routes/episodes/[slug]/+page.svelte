<script lang="ts">
  /**
   * Episode detail — the episode-detail composition (desktop) and §5.6 (mobile).
   *
   * The page's single job: take a visitor from "that conversation with person
   * Y about X" to hearing it at the right minute. The listen band is the
   * centrepiece — a real player over the verified enclosure, honest platform
   * links, and chapters that seek only where the audio can actually go.
   *
   * The audio element lives here because three surfaces read from one player
   * state: the band's controls, the chapter list, and the sticky mini-player.
   */

  import AudioPlayer from "#lib/components/AudioPlayer.svelte";
  import EpisodeArt from "#lib/components/EpisodeArt.svelte";
  import ChapterList from "#lib/components/ChapterList.svelte";
  import MiniPlayer from "#lib/components/MiniPlayer.svelte";
  import WaveButton from "#lib/components/WaveButton.svelte";
  import { faNumber, formatDuration, formatJalaliDate, isoDay } from "#lib/dates";
  import { audioBindings, initialPlayerState } from "#lib/player";
  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();

  // One player, three readers. The element is bound by the template below;
  // every other surface receives the same state object and the element.
  let audioElement = $state<HTMLAudioElement | null>(null);
  let playerState = $state(initialPlayerState());
  let miniDismissed = $state(false);
  let shareNote = $state<string | null>(null);
  let shareTimer: number | undefined;

  const showMini = $derived(playerState.playing && !miniDismissed);

  async function share(): Promise<void> {
    const url = data.url;
    try {
      await navigator.clipboard.writeText(url);
      shareNote = "پیوند قسمت رونوشت شد";
    } catch {
      shareNote = "رونوشت نشد؛ پیوند را از نوار نشانی مرورگر بردارید.";
    }
    window.clearTimeout(shareTimer);
    shareTimer = window.setTimeout(() => {
      shareNote = null;
    }, 6000);
  }
</script>

<svelte:head>
  <title>{data.episode.titleSource} — طبقه ۱۶</title>
  <meta name="description" content={data.episode.descriptionExcerpt} />
  <link rel="canonical" href={data.url} />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="fa_IR" />
  <meta property="og:title" content={data.episode.titleSource} />
  <meta property="og:description" content={data.episode.descriptionExcerpt} />
  <meta property="og:url" content={data.url} />
  {#if data.episode.imageUrl !== null}
    <meta property="og:image" content={data.episode.imageUrl} />
  {/if}
  <!-- Structured data from verified fields only (performance); the loader
       serializes it so the object never enters the client bundle. The
       ignore keeps the formatter from reading the interpolated script
       content as JavaScript. -->
  <!-- prettier-ignore -->
  <script type="application/ld+json">
{@html data.structuredJson}
  </script>
</svelte:head>

<article class="episode">
  <div class="container">
    <a class="episode__back" href="/episodes">
      <span class="episode__back-glyph" aria-hidden="true">→</span>
      آرشیو
    </a>

    <header class="episode__header">
      <p class="episode__eyebrow">
        {#if data.episode.episodeNo !== null}
          <span class="episode__nametag">قسمت {faNumber(data.episode.episodeNo)}</span>
        {/if}
        <time datetime={isoDay(data.episode.publishedAt)}>
          {formatJalaliDate(data.episode.publishedAt)}
        </time>
        {#if data.episode.durationSeconds !== null}
          <bdi class="ltr-run" dir="ltr">{formatDuration(data.episode.durationSeconds)}</bdi>
        {/if}
      </p>
      <h1 class="episode__title">
        {data.episode.titleHeadline ?? data.episode.titleSource}
      </h1>
      {#if data.episode.titleByline !== null}
        <p class="episode__byline">با {data.episode.titleByline}</p>
      {/if}
    </header>
  </div>

  <div class="container">
    <section class="listen-band" aria-label="شنیدن">
      <div class="listen-band__inner">
        <div class="listen-band__art">
          <EpisodeArt
            imageUrl={data.episode.imageUrl}
            episodeNo={data.episode.episodeNo}
            alt={`روی جلد قسمت ${
              data.episode.episodeNo === null ? "" : faNumber(data.episode.episodeNo)
            }؛ ${data.episode.titleSource}`}
            shape="thumb"
            color
            priority
          />
        </div>
        <AudioPlayer
          audioUrl={data.episode.audioUrl}
          state={playerState}
          audioElement={audioElement}
          fallbackLinks={data.listenLinks}
          title={data.episode.titleHeadline ?? data.episode.titleSource}
          byline={data.episode.titleByline}
        />
      </div>

      <ul class="listen-band__links">
        {#if data.episode.acastPageUrl !== null}
          <li>
            <a href={data.episode.acastPageUrl} rel="noopener noreferrer" target="_blank">
              صفحهٔ آکست
              <span class="listen-band__external" aria-hidden="true">↗</span>
            </a>
          </li>
        {/if}
        {#if data.episode.videoUrl !== null}
          <li>
            <a href={data.episode.videoUrl} rel="noopener noreferrer" target="_blank">
              تماشا در یوتیوب
              <span class="listen-band__external" aria-hidden="true">↗</span>
            </a>
          </li>
        {/if}
      </ul>

      <div class="listen-band__share">
        <WaveButton variant="quiet" onclick={share}>اشتراک‌گذاری</WaveButton>
        <p class="listen-band__share-live" role="status" aria-live="polite">
          {shareNote ?? ""}
        </p>
      </div>
    </section>
  </div>

  {#if data.episode.audioUrl !== null}
    <!--
      One element, three readers. preload="none" means nothing is fetched
      until the visitor's own press; the enclosure URL resolves its redirect
      per playback request inside the browser's media stack, and the resolved
      signed URL is never cached (the media playback constraints).
    -->
    <audio
      bind:this={audioElement}
      use:audioBindings={playerState}
      src={data.episode.audioUrl}
      preload="none"
      class="audio-hidden"
    ></audio>
  {/if}

  <div class="container">
    <div class="episode__columns">
      <div class="episode__main">
        <section class="episode-section" aria-labelledby="about-label">
          <div class="folio-label" id="about-label">دربارهٔ این قسمت</div>
          <!--
            Sanitized at ingestion by the extract stage's allowlist policy
            (p/br/a/strong/em/b/i/ul/ol/li/blockquote; a[href] with
            rel="noopener noreferrer"): the source description renders as
            prose, unrewritten and attributed (§5.5).
          -->
          <div class="prose episode__prose">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- Store data, not request input: sanitized at ingestion by extract/sanitize.ts's narrow allowlist (scripts/sync.ts → build.ts). -->
            {@html data.episode.descriptionHtml}
          </div>
          {#if data.episode.hostedOnAcast !== null}
            <p class="episode__hosted-note">{data.episode.hostedOnAcast}</p>
          {/if}
        </section>

        {#if data.episode.chapters !== null && data.episode.chapters.length > 0}
          <section class="episode-section" aria-labelledby="chapters-label">
            <div class="folio-label" id="chapters-label">فهرست بخش‌ها</div>
            <ChapterList
              chapters={data.episode.chapters}
              audioElement={audioElement}
              state={playerState}
            />
          </section>
        {/if}
      </div>

      <aside class="episode__side">
        {#if data.guests.length > 0}
          <section class="side-card" aria-labelledby="guest-label">
            <div class="folio-label" id="guest-label">مهمان</div>
            <ul class="guest-list">
              {#each data.guests as person (person.slug)}
                <li class="guest-list__item">
                  <a class="guest-list__name" href={`/people/${person.slug}`}>
                    {person.displayName}
                  </a>
                </li>
              {/each}
            </ul>
            {#if data.guests.length === 1}
              <a class="side-card__more" href={`/people/${data.guests[0]!.slug}`}>
                همهٔ قسمت‌های {data.guests[0]!.displayName} →
              </a>
            {/if}
          </section>
        {/if}

        {#if data.episode.sponsor !== null}
          <!--
            The sponsor box is the source's own block, validated at ingestion:
            heading, blurb, and an allowlisted URL, rendered verbatim and
            boxed so it never reads as an editorial recommendation (§5.5).
          -->
          <section class="side-card side-card--sponsor" aria-labelledby="sponsor-label">
            <div class="folio-label" id="sponsor-label">{data.episode.sponsor.heading}</div>
            <ul class="sponsor-list">
              {#each data.episode.sponsor.entries as entry, index (index)}
                <li class="sponsor-list__item">
                  <a href={entry.url} rel="noopener noreferrer" target="_blank">
                    {entry.text}
                    <span class="sponsor-list__external" aria-hidden="true">↗</span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if data.related.length > 0}
          <section class="side-card" aria-labelledby="related-label">
            <div class="folio-label" id="related-label">قسمت‌های مرتبط</div>
            <ul class="related-list">
              {#each data.related as item (item.episode.slug)}
                <li class="related-list__item">
                  <a href={`/episodes/${item.episode.slug}`}>
                    <span class="related-list__title">
                      {item.episode.titleHeadline ?? item.episode.titleSource}
                    </span>
                    <span class="related-list__reason">
                      {item.reason === "guest" ? "مهمان مشترک" : "از آرشیو"}
                    </span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </aside>
    </div>
  </div>
</article>

{#if showMini}
  <MiniPlayer
    headline={data.episode.titleHeadline ?? data.episode.titleSource}
    imageUrl={data.episode.imageUrl}
    episodeNo={data.episode.episodeNo}
    href={`/episodes/${data.episode.slug}`}
    state={playerState}
    {audioElement}
    onDismiss={() => {
      miniDismissed = true;
    }}
  />
{/if}

<style>
  /* -- Back link (§5.5): directional, points at the start edge (right) ---- */

  .episode__back {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 44px;
    margin-block-end: var(--sp-5);
    color: var(--muted);
    font-size: var(--fs-label);
    font-weight: 500;
    text-decoration: none;
  }

  .episode__back:hover {
    color: var(--ink);
  }

  .episode__back-glyph {
    direction: ltr;
    unicode-bidi: isolate;
  }

  /* -- Title block -------------------------------------------------------- */

  .episode__header {
    display: grid;
    gap: var(--sp-3);
    max-width: var(--prose-max);
    margin-block-end: var(--sp-6);
  }

  .episode__eyebrow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-3);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .episode__nametag {
    padding: var(--sp-1) var(--sp-3);
    border: 1px solid var(--stone);
    border-radius: var(--r-chip);
    background-color: var(--surface);
  }

  .episode__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
    text-wrap: balance;
  }

  .episode__byline {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  /* -- Listen band (§5.5) -------------------------------------------------- */

  /*
   * The band is the one surface card on the page: border-only at rest, the
   * 88px artwork the single place the present-tense color enters (DESIGN.md
   * §4). Rounded --r-card, never a nested-card stack (§5.5 row).
   */
  .listen-band {
    margin-block-end: var(--sp-8);
    padding: var(--sp-5);
    border: 1px solid var(--stone);
    border-radius: var(--r-card);
    background-color: var(--surface);
  }

  .listen-band__inner {
    display: flex;
    align-items: center;
    gap: var(--sp-5);
  }

  .listen-band__art {
    flex: none;
    width: 88px;
  }

  /*
   * Platform links are quiet text links with the external glyph — never
   * buttons-sized rivals to the play control (the episode-detail composition). The video
   * action joins this row only for episodes with a verified per-episode
   * video link, which the loader knows.
   */
  .listen-band__links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-5);
    margin: var(--sp-5) 0 0;
    padding: var(--sp-4) 0 0;
    border-block-start: 1px solid var(--stone);
    list-style: none;
  }

  .listen-band__links a {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 32px;
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
  }

  .listen-band__external {
    font-size: 0.8em;
    color: var(--muted);
    direction: ltr;
    unicode-bidi: isolate;
  }

  .listen-band__share {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    margin-block-start: var(--sp-3);
  }

  /*
   * The share confirmation is a status region: announced politely, never
   * stealing focus, cleared after a comfortable reading time (the copy direction).
   */
  .listen-band__share-live {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--success);
  }

  .listen-band__share-live:empty {
    display: none;
  }

  /* -- Two columns (§5.5): text 7, side 5; side sticks under the header --- */

  .episode__columns {
    display: grid;
    gap: var(--sp-7);
    align-items: start;
    padding-block-end: var(--sp-9);
  }

  .episode__main {
    display: grid;
    gap: var(--sp-7);
    min-width: 0;
  }

  .episode-section {
    display: grid;
    gap: var(--sp-4);
  }

  .episode__prose {
    font-size: var(--fs-body);
    line-height: var(--lh-body);
  }

  /* The source's own hosting attribution, kept verbatim (§5.5). */
  .episode__hosted-note {
    max-width: var(--prose-max);
    margin-block-start: var(--sp-5);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }

  .episode__side {
    display: grid;
    gap: var(--sp-5);
    min-width: 0;
  }

  .side-card {
    display: grid;
    gap: var(--sp-4);
    padding: var(--sp-5);
    border: 1px solid var(--stone);
    border-radius: var(--r-card);
    background-color: var(--surface);
  }

  .side-card__more {
    justify-self: start;
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
  }

  /*
   * The sponsor box keeps the source's own heading and copy, boxed and
   * clearly separated so it never reads as editorial (§5.5).
   */
  .side-card--sponsor {
    border-color: var(--warning);
    border-style: dashed;
  }

  .guest-list {
    display: grid;
    gap: var(--sp-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Typographic guest presentation: no portraits, none verified (§4, §9.9). */
  .guest-list__name {
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 600;
    line-height: var(--lh-title);
    text-decoration: none;
  }

  .guest-list__name:hover {
    text-decoration-line: underline;
  }

  .sponsor-list {
    display: grid;
    gap: var(--sp-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sponsor-list__item a {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
  }

  .sponsor-list__external {
    font-size: 0.8em;
    color: var(--muted);
    direction: ltr;
    unicode-bidi: isolate;
  }

  .related-list {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .related-list__item + .related-list__item a {
    border-block-start: 1px solid var(--stone);
  }

  .related-list__item a {
    display: grid;
    gap: var(--sp-1);
    padding-block: var(--sp-3);
    text-decoration: none;
  }

  .related-list__item a:hover {
    text-decoration-line: underline;
  }

  .related-list__title {
    font-family: var(--font-display);
    font-size: var(--fs-body-s);
    font-weight: 600;
    line-height: var(--lh-body-s);
  }

  /* The transparent reason (the copy direction "Related"): a chip, not a score. */
  .related-list__reason {
    justify-self: start;
    padding: 2px var(--sp-3);
    border-radius: var(--r-chip);
    background-color: var(--paper);
    color: var(--muted);
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
  }

  @media (min-width: 1024px) {
    .episode__columns {
      grid-template-columns: 7fr 5fr;
      gap: var(--sp-6);
    }

    .episode__side {
      position: sticky;
      inset-block-start: calc(var(--header-h) + var(--sp-5));
    }
  }
</style>
