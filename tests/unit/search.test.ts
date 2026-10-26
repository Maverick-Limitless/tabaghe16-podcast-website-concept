/**
 * Search normalization — docs/DESIGN.md §5.6, PRD §5.6.
 *
 * The archive's search is a plain substring match over text both sides
 * normalize with one function. These tests pin the folds the feed actually
 * needs (Arabic-script variants, mixed digits, ZWNJ) plus the ones the
 * normalization promises (diacritics, whitespace, case), and the row-search
 * text builder's field coverage.
 */

import { describe, expect, it } from "vitest";

import { buildSearchText, normalizeForSearch } from "#lib/search";

describe("normalizeForSearch", () => {
  it("folds Arabic Yeh and Kaf to their Persian forms", () => {
    // The feed's older items mix script variants; a Persian reader types Persian.
    expect(normalizeForSearch("ي").toLowerCase()).toBe(normalizeForSearch("ی").toLowerCase());
    expect(normalizeForSearch("ك").toLowerCase()).toBe(normalizeForSearch("ک").toLowerCase());
  });

  it("folds Arabic and Persian digits to ASCII", () => {
    expect(normalizeForSearch("قسمت ۲۱۲")).toContain("212");
    expect(normalizeForSearch("١٢٣")).toBe("123");
  });

  it("drops ZWNJ so joined spellings match spaced ones", () => {
    // «گفت‌وگو» must find «گفت وگو» — the join is spelling, not meaning.
    expect(normalizeForSearch("گفت‌وگو")).toBe(normalizeForSearch("گفت وگو"));
  });

  it("strips diacritics", () => {
    const vocalized = normalizeForSearch("مُحَمَّد");
    const plain = normalizeForSearch("محمد");
    expect(vocalized).toBe(plain);
  });

  it("collapses whitespace runs and lowercases Latin", () => {
    expect(normalizeForSearch("  Shopify   Product ")).toBe("shopify product");
  });

  it("returns empty for empty input and never throws", () => {
    expect(normalizeForSearch("")).toBe("");
  });

  it("keeps a Latin brand word findable from a Persian query", () => {
    const row = normalizeForSearch("EP 203 - [English] Inside Shopify's Product DNA");
    const query = normalizeForSearch("shopify");
    expect(row).toContain(query);
  });
});

describe("buildSearchText", () => {
  const episode = {
    titleSource: "EP212 - رقابت برای ساخت هوش مصنوعی شخصی | شیرین مجرد، مدیر محصول گوگل",
    titleHeadline: "رقابت برای ساخت هوش مصنوعی شخصی",
    titleByline: "شیرین مجرد",
    descriptionExcerpt: "شیرین مجرد، مدیر محصول گوگل در حوزه هوش مصنوعی شخصی",
    chapters: [{ label: "مهاجرت و زندگی در سان‌فرانسیسکو" }, { label: "از علم داده تا اپل و گوگل" }]
  };

  it("covers title, headline, byline, excerpt, and chapter labels", () => {
    const text = buildSearchText(episode);
    expect(text).toContain(normalizeForSearch("رقابت برای ساخت هوش مصنوعی شخصی"));
    expect(text).toContain(normalizeForSearch("شیرین مجرد"));
    expect(text).toContain(normalizeForSearch("مهاجرت و زندگی در سان‌فرانسیسکو"));
  });

  it("skips null parts without leaving stray separators", () => {
    const text = buildSearchText({
      titleSource: "یک گفت‌وگو",
      titleHeadline: null,
      titleByline: null,
      descriptionExcerpt: "",
      chapters: null
    });
    expect(text).toBe(normalizeForSearch("یک گفت‌وگو"));
  });
});
