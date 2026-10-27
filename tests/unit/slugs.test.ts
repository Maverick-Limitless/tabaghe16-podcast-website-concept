/**
 * Slugs — docs/ARCHITECTURE.md §6.2.
 *
 * Slugs are the site's stable addresses: episode slugs come from the feed's
 * own `acast:episodeUrl` (never from episode numbers, which the feed gets
 * wrong), person slugs from display names with Persian kept verbatim. The
 * collision suffix is deterministic in the caller's order, which is what
 * keeps two sync runs from renumbering a published URL.
 */

import { describe, expect, it } from "vitest";

import { dedupeSlugs, episodeSlug, isUrlSafeSlug, slugifyPerson } from "#lib/server/extract/slugs";

describe("slugifyPerson", () => {
  it("keeps Persian verbatim and joins tokens with dashes", () => {
    expect(slugifyPerson("شیرین مجرد")).toBe("شیرین-مجرد");
  });

  it("lowercases Latin and strips punctuation", () => {
    expect(slugifyPerson("Shirin Mojarad")).toBe("shirin-mojarad");
    expect(slugifyPerson("Vali Nasr")).toBe("vali-nasr");
  });

  it("handles mixed Latin + Persian names token by token", () => {
    // The design doc's own example name (the Persian typographic rules).
    expect(slugifyPerson("Mohsen Malayeri محسن ملایری")).toBe("mohsen-malayeri-محسن-ملایری");
  });

  it("strips ZWNJ before tokenizing so it never becomes a dash", () => {
    expect(slugifyPerson("گفت‌وگو")).toBe("گفتوگو");
  });
});

describe("episodeSlug", () => {
  it("uses acast:episodeUrl when it is URL-safe", () => {
    expect(episodeSlug("215-shirin-mojarad", "guid-1")).toBe("215-shirin-mojarad");
    expect(episodeSlug("korosh-koochekian-sabor", "guid-2")).toBe("korosh-koochekian-sabor");
  });

  it("falls back to ep-<guid> for unsafe values", () => {
    expect(episodeSlug("a/b", "guid-3")).toBe("ep-guid-3");
    expect(episodeSlug("has space", "guid-4")).toBe("ep-guid-4");
    expect(episodeSlug("q?x", "guid-5")).toBe("ep-guid-5");
    expect(episodeSlug("", "guid-6")).toBe("ep-guid-6");
  });

  it("rejects over-long values", () => {
    expect(episodeSlug("a".repeat(129), "guid-7")).toBe("ep-guid-7");
  });
});

describe("isUrlSafeSlug", () => {
  it("accepts RFC 3986 unreserved characters only", () => {
    expect(isUrlSafeSlug("ep-210")).toBe(true);
    expect(isUrlSafeSlug("a.b_c~d")).toBe(true);
    expect(isUrlSafeSlug("")).toBe(false);
    expect(isUrlSafeSlug("شیرین")).toBe(false);
    expect(isUrlSafeSlug("a/b")).toBe(false);
    expect(isUrlSafeSlug("a%b")).toBe(false);
  });
});

describe("dedupeSlugs", () => {
  it("suffixes collisions deterministically in the caller's order", () => {
    const older = { id: "a" };
    const newer = { id: "b" };
    // Same base slug, different order keys: the earlier item keeps the base.
    const assigned = dedupeSlugs(
      [newer, older],
      () => "x",
      (item) => (item.id === "a" ? 1 : 2)
    );

    expect(assigned.get(older)).toBe("x");
    expect(assigned.get(newer)).toBe("x-2");
  });

  it("is stable across runs with different input order", () => {
    const a = { id: "x", order: 1 };
    const b = { id: "x", order: 2 };
    const run1 = dedupeSlugs(
      [b, a],
      (item) => item.id,
      (item) => item.order
    );
    const run2 = dedupeSlugs(
      [a, b],
      (item) => item.id,
      (item) => item.order
    );
    expect(run1.get(a)).toBe("x");
    expect(run2.get(a)).toBe("x");
    expect(run1.get(b)).toBe(run2.get(b));
  });
});
