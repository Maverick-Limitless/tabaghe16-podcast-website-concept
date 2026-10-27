/**
 * The local media fixture shared by the E2E specs (end-to-end testing: fixture-based
 * playback, clearly distinguished from live external media).
 *
 * A silent PCM WAV served from the enclosure's URL: the browser's media
 * stack gets real metadata and real seekable audio, deterministically, with
 * no third-party request ever leaving the test browser.
 */

/** A silent PCM WAV of `seconds` — RIFF header plus zero-valued samples. */
export function silentWav(seconds: number, sampleRate = 8000): Buffer {
  const dataBytes = seconds * sampleRate * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  return buffer;
}

/** The enclosure host and its per-request redirect target (CSP media-src). */
export const MEDIA_URL_PATTERN = /sphinx\.acast\.com|stitcher2\.acast\.com/;

/** Serve the fixture for every media request; abort the artwork host. */
export async function installMediaFixture(
  page: import("@playwright/test").Page,
  seconds = 120
): Promise<void> {
  await page.route("**/assets.pippa.io/**", (route) => route.abort());
  const wav = silentWav(seconds);
  await page.route(MEDIA_URL_PATTERN, (route) =>
    route.fulfill({ body: wav, contentType: "audio/wav" })
  );
}
