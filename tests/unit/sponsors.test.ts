/**
 * Sponsor extraction — docs/ARCHITECTURE.md §6.4; audio behavior, §9.5.
 *
 * The sponsor box renders only blocks the rules can validate: one of the
 * two attested source headings, a parseable blurb, and an allowlisted URL.
 * The show's own link hub and the legacy degraded redirectors are in the
 * never-allow set, and a heading with no valid entries is not a sponsor
 * block — the lines fall back into the prose verbatim, attribution intact
 * (feed and link security: copy is never rewritten, never silently dropped).
 */

import { describe, expect, it } from "vitest";

import { extractSponsor } from "#lib/server/extract/sponsors";
import { splitBlocks } from "#lib/server/extract/blocks";

/** Run the extractor over a raw description the way the pipeline does. */
function from(description: string) {
  return extractSponsor(splitBlocks(description));
}

describe("extractSponsor", () => {
  it("extracts a heading with a blurb and an allowlisted URL", () => {
    const result = from(
      "<p>پیش از بخش‌ها</p><br><p>حامیان این قسمت:</p><br><p>سرویسِ آزمایشی، برای علاقه‌مندان https://example.com/promo</p><br><p>Hosted on Acast. See acast.com/privacy for more information.</p>"
    );
    expect(result.sponsor).not.toBeNull();
    // The heading is kept verbatim, colon included — attribution (§7).
    expect(result.sponsor?.heading).toBe("حامیان این قسمت:");
    expect(result.sponsor?.entries).toHaveLength(1);
    expect(result.sponsor?.entries[0]?.url).toBe("https://example.com/promo");
    expect(result.sponsor?.entries[0]?.text).toContain("سرویسِ آزمایشی");
    // The sponsor area's blocks are marked removed from the prose.
    expect(result.removedBlockIndices.length).toBeGreaterThan(0);
  });

  it("recognizes the second attested heading form", () => {
    const result = from(
      "<p>اسپانسر این قسمت:</p><br><p>معرفیِ سرویسِ پادکست https://example.com/x</p>"
    );
    expect(result.sponsor?.heading).toBe("اسپانسر این قسمت:");
    expect(result.sponsor?.entries).toHaveLength(1);
  });

  it("never turns the show's own link hub into a sponsor entry", () => {
    // The fixture's EP212: a heading followed only by the linktr.ee hub.
    const result = from(
      "<p>حامیان این قسمت:</p><br><p>https://linktr.ee/tabaghe16</p><br><p>Hosted on Acast. See acast.com/privacy for more information.</p>"
    );
    expect(result.sponsor).toBeNull();
    // And nothing was removed from the prose by the failed attempt.
    expect(result.removedBlockIndices).toHaveLength(0);
  });

  it("rejects the legacy degraded redirectors", () => {
    const redl = from("<p>حامیان این قسمت:</p><br><p>بلور https://redl.ink/dead</p>");
    const spoti = from("<p>حامیان این قسمت:</p><br><p>پیوند https://spoti.fi/x</p>");
    expect(redl.sponsor).toBeNull();
    expect(spoti.sponsor).toBeNull();
  });

  it("returns null when no heading exists", () => {
    const result = from("<p>یک توضیحِ معمولی دربارهٔ قسمت</p><br><p>https://example.com/x</p>");
    expect(result.sponsor).toBeNull();
  });

  it("does not treat a prose sentence mentioning sponsors as a heading", () => {
    const result = from("<p>در این قسمت از حامیان این قسمت صحبت کردیم</p>");
    expect(result.sponsor).toBeNull();
  });
});
