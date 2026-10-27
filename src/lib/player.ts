/**
 * Playback state — the one player model shared by the listen band, the
 * chapters, and the mini-player (the episode-detail composition, §5.6).
 *
 * A page creates the state object with `$state` and hands it to the audio
 * element's bindings and to every player component, so play/pause, the
 * current time, and the active chapter all read from one source. The state
 * is plain data: no store, no context — the detail page is the only surface
 * that plays media in v1.
 *
 * Playback never autostarts (audio behavior): the audio element is created with
 * `preload="none"` and only the user's own press starts it.
 */

export interface PlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  /** The browser is fetching or buffering: the control shows its spinner. */
  loading: boolean;
  /** The enclosure failed to load: the control shows the fallback links. */
  failed: boolean;
}

export function initialPlayerState(): PlayerState {
  return {
    playing: false,
    currentTime: 0,
    duration: 0,
    loading: false,
    failed: false
  };
}

/**
 * Wire one audio element to the shared state.
 *
 * Every field is written from a real media event; nothing is simulated.
 * `duration` stays NaN-guarded (a live stream or metadata failure yields
 * NaN, which reads as "unknown" rather than 0). The action also normalizes
 * the element's own error text into the design's failure copy, which the
 * listen band renders alongside real platform fallbacks.
 */
export function audioBindings(node: HTMLAudioElement, state: PlayerState): { destroy(): void } {
  function syncPlayback(): void {
    state.playing = !node.paused && !node.ended;
  }

  function onPlay(): void {
    state.failed = false;
    syncPlayback();
  }

  function onPause(): void {
    syncPlayback();
  }

  function onTimeUpdate(): void {
    state.currentTime = node.currentTime;
    syncPlayback();
  }

  function onLoadedMetadata(): void {
    state.duration = Number.isFinite(node.duration) ? node.duration : 0;
  }

  function onWaiting(): void {
    state.loading = true;
  }

  function onPlaying(): void {
    state.loading = false;
    state.failed = false;
    syncPlayback();
  }

  function onCanPlay(): void {
    state.loading = false;
  }

  function onError(): void {
    state.loading = false;
    state.playing = false;
    state.failed = true;
  }

  node.addEventListener("play", onPlay);
  node.addEventListener("playing", onPlaying);
  node.addEventListener("pause", onPause);
  node.addEventListener("timeupdate", onTimeUpdate);
  node.addEventListener("loadedmetadata", onLoadedMetadata);
  node.addEventListener("waiting", onWaiting);
  node.addEventListener("canplay", onCanPlay);
  node.addEventListener("error", onError);

  return {
    destroy() {
      node.removeEventListener("play", onPlay);
      node.removeEventListener("playing", onPlaying);
      node.removeEventListener("pause", onPause);
      node.removeEventListener("timeupdate", onTimeUpdate);
      node.removeEventListener("loadedmetadata", onLoadedMetadata);
      node.removeEventListener("waiting", onWaiting);
      node.removeEventListener("canplay", onCanPlay);
      node.removeEventListener("error", onError);
    }
  };
}

/**
 * Seek the shared element to a chapter stamp.
 *
 * The seek happens only after metadata is available and the target is inside
 * the media duration (the episode-detail composition, chapters only from source metadata): a stamp beyond the duration
 * is a data error, and clamping it to the end would silently lie. Returns
 * whether the seek was applied, so the caller can count it as "played".
 */
export function seekTo(audio: HTMLAudioElement | null, seconds: number): boolean {
  if (audio === null || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return false;
  }
  if (seconds < 0 || seconds > audio.duration) {
    return false;
  }
  audio.currentTime = seconds;
  void audio.play().catch((error: DOMException) => {
    /*
     * Autoplay-policy refusal and an interruption by an immediate pause
     * both leave the element paused by user intent — the control keeps
     * showing «پخش», and the user can press it again. No error storm, and
     * neither is a source failure.
     */
    void error;
  });
  return true;
}

/**
 * Seek on a chapter press, before playback has started.
 *
 * `preload="none"` means the element has no duration until something asks
 * for it, so the first chapter press requests just the metadata
 * (kilobytes, not the media), and the seek happens the moment it arrives —
 * still "only after metadata is available", per chapters only from source metadata, but without making
 * the visitor press play first to learn where a chapter begins. A press that
 * arrives before the metadata is answered is ignored so a second press
 * cannot queue two seeks.
 *
 * When `state` is given, the pending wait is visible: the play control shows
 * its loading dots until the metadata lands, so the press is never silent.
 */
export function seekChapter(
  audio: HTMLAudioElement | null,
  seconds: number,
  state?: PlayerState
): void {
  if (audio === null) {
    return;
  }
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    seekTo(audio, seconds);
    return;
  }

  if (audio.dataset.seekPending === "true") {
    return;
  }
  audio.dataset.seekPending = "true";
  audio.preload = "metadata";
  if (state !== undefined) {
    state.loading = true;
  }

  const onReady = (): void => {
    audio.removeEventListener("loadedmetadata", onReady);
    delete audio.dataset.seekPending;
    if (state !== undefined) {
      state.loading = false;
    }
    seekTo(audio, seconds);
  };
  audio.addEventListener("loadedmetadata", onReady);
  audio.load();
}

/** The chapter currently under the play head, by index — or null. */
export function activeChapterIndex(
  chapters: readonly { timeSeconds: number }[],
  currentTime: number,
  duration: number
): number | null {
  if (duration <= 0 || chapters.length === 0) {
    return null;
  }
  let active: number | null = null;
  for (let index = 0; index < chapters.length; index += 1) {
    if (chapters[index]!.timeSeconds <= currentTime) {
      active = index;
    } else {
      break;
    }
  }
  return active;
}
