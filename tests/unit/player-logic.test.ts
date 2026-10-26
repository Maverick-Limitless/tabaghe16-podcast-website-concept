/**
 * Player chapter logic — docs/DESIGN.md §5.5, PRD §5.4.
 *
 * The active-chapter rule is a pure function over stamps and the play head,
 * and it gates a real UI state (the accent tick and the glyph swap), so its
 * edges are pinned here: no duration means no marker, the marker lands only
 * under a stamp the head has passed, and it clears when seeking back.
 */

import { describe, expect, it } from "vitest";

import { activeChapterIndex } from "#lib/player";

const CHAPTERS = [
  { timeSeconds: 0 },
  { timeSeconds: 104 },
  { timeSeconds: 6240 },
  { timeSeconds: 6075 }
].sort((left, right) => left.timeSeconds - right.timeSeconds);

describe("activeChapterIndex", () => {
  it("returns null before the first stamp and without a duration", () => {
    expect(activeChapterIndex(CHAPTERS, 0, 0)).toBeNull();
  });

  it("marks the chapter the play head is inside", () => {
    expect(activeChapterIndex(CHAPTERS, 0, 7000)).toBe(0);
    expect(activeChapterIndex(CHAPTERS, 120, 7000)).toBe(1);
    expect(activeChapterIndex(CHAPTERS, 6100, 7000)).toBe(2);
    expect(activeChapterIndex(CHAPTERS, 7000, 7000)).toBe(3);
  });

  it("handles an empty chapter list", () => {
    expect(activeChapterIndex([], 10, 100)).toBeNull();
  });
});
