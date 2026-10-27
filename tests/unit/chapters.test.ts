/**
 * Chapter parsing — docs/ARCHITECTURE.md §6.3; fixtures/README.md documents
 * the five chapter separator styles the real feed uses and the out-of-spec
 * minute stamps (69:30, 74:38) some older descriptions carry.
 *
 * Every rule here is a data-integrity rule: a chapter line that cannot be
 * verified stays in the prose verbatim rather than becoming a mangled
 * chapter (chapters only from source metadata — never invent chapter labels or times).
 */

import { describe, expect, it } from "vitest";

import {
  buildChapterList,
  dedupeChapters,
  parseChapterLine,
  stampToSeconds,
  type ChapterLine
} from "#lib/server/extract/chapters";

describe("stampToSeconds", () => {
  it("parses the three shapes the feed uses", () => {
    expect(stampToSeconds("00:00")).toBe(0);
    expect(stampToSeconds("01:44")).toBe(104);
    expect(stampToSeconds("1:41:15")).toBe(6075);
    expect(stampToSeconds("01:44:00")).toBe(6240);
  });

  it("accepts the older items' out-of-spec minute stamps", () => {
    // EP210 carries 69:30 and 74:38 (fixtures/README.md #3); minutes up to
    // 595 read as a plausible position inside a media file.
    expect(stampToSeconds("69:30")).toBe(4170);
    expect(stampToSeconds("74:38")).toBe(4478);
  });

  it("folds Persian digits before parsing", () => {
    expect(stampToSeconds("۰۱:۴۴")).toBe(104);
  });

  it("rejects malformed and implausible stamps", () => {
    expect(stampToSeconds("25:00:00")).toBeNull();
    expect(stampToSeconds("99000:00")).toBeNull();
    expect(stampToSeconds("1:2")).toBeNull();
    expect(stampToSeconds("00:0")).toBeNull();
    expect(stampToSeconds("")).toBeNull();
  });
});

describe("parseChapterLine", () => {
  it("parses the plain pipe style", () => {
    const line = parseChapterLine("00:00 | بخش‌هایی از گفتگو");
    expect(line?.timeRaw).toBe("00:00");
    expect(line?.label).toBe("بخش‌هایی از گفتگو");
  });

  it("parses the hyphen and dash styles", () => {
    expect(parseChapterLine("01:42 - مهاجرت و زندگی در سان‌فرانسیسکو")?.timeSeconds).toBe(102);
    expect(parseChapterLine("01:42 – مهاجرت")?.timeSeconds).toBe(102);
    expect(parseChapterLine("01:42 — مهاجرت")?.timeSeconds).toBe(102);
  });

  it("parses the bidi-wrapped newest style (LRM/FSI/PDI)", () => {
    // EP212's style: stamp + LRM + pipe + FSI-isolated label + PDI.
    const line = parseChapterLine("‎00:00‎ | ⁧بخش‌هایی از گفتگو⁩");
    expect(line?.timeSeconds).toBe(0);
    expect(line?.label).toBe("بخش‌هایی از گفتگو");
  });

  it("preserves ZWNJ inside the label", () => {
    expect(parseChapterLine("05:00 | گفت‌وگو")?.label).toBe("گفت‌وگو");
  });

  it("rejects lines without a label or a verifiable stamp", () => {
    expect(parseChapterLine("00:00 |")).toBeNull();
    expect(parseChapterLine("")).toBeNull();
    expect(parseChapterLine("یک جملهٔ معمولی در توضیح قسمت")).toBeNull();
    const long = "x".repeat(200);
    expect(parseChapterLine(`00:00 | ${long}`)).toBeNull();
  });
});

describe("buildChapterList", () => {
  it("returns null below the minimum of three lines", () => {
    expect(buildChapterList(["00:00 | الف", "01:00 | ب"])).toBeNull();
    expect(buildChapterList([])).toBeNull();
  });

  it("sorts by time and keeps the first label per stamp", () => {
    const list = buildChapterList([
      "05:00 | سوم",
      "00:00 | نخست",
      "05:00 | تکرارِ پنجم",
      "01:00 | دوم"
    ]);
    expect(list?.map((chapter) => chapter.label)).toEqual(["نخست", "دوم", "سوم"]);
  });
});

describe("dedupeChapters", () => {
  it("merges duplicate stamps, first label wins, sorted output", () => {
    const parsed: ChapterLine[] = [
      { timeRaw: "02:00", timeSeconds: 120, label: "دوم", rawLine: "02:00 | دوم" },
      { timeRaw: "01:00", timeSeconds: 60, label: "یکم", rawLine: "01:00 | یکم" },
      { timeRaw: "1:00", timeSeconds: 60, label: "تکرار", rawLine: "1:00 | تکرار" }
    ];
    const merged = dedupeChapters(parsed);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.label).toBe("یکم");
  });
});
