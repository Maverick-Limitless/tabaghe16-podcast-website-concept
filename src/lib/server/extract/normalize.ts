/**
 * Normalization — docs/ARCHITECTURE.md §6.6.
 *
 * One shared normalizer is used everywhere the project compares or matches
 * Persian and Latin text: the §6.1 guest gate, slug building, and the client
 * search index (deterministic search). Having a single implementation is what makes
 * "Persian and Latin queries behave identically" true by construction rather
 * than by convention in five separate call sites.
 *
 * The rule that matters most: **the original display text is never mutated**.
 * `norm()` is for comparison and matching only; every stored field keeps the
 * source's own characters, and the ZWNJ *inside* words is always preserved in
 * display text (tests/fixtures/README.md) — it is dropped only for matching.
 */

/* -- Character classes ----------------------------------------------------- */

/** Bidi controls and zero-width characters that carry no matching value. */
const BIDI_AND_ZERO_WIDTH = /[\u200B-\u200F\u061C\u2066-\u2069\u202A-\u202E]/g;

/** Arabic diacritics (harakat), extended Arabic marks, and Quranic marks. */
const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

/** Persian/Arabic-Indic decimal digits, both the Arabic and Persian subranges. */
const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

/**
 * Latin-1 supplement diacritics that fold cleanly to ASCII, keyed by their
 * *lowercase* form. `norm()` lowercases before it folds, so only the lowercase
 * spellings have to appear here.
 */
const LATIN_DIACRITICS: Readonly<Record<string, string>> = {
  à: "a",
  á: "a",
  â: "a",
  ã: "a",
  ä: "a",
  å: "a",
  è: "e",
  é: "e",
  ê: "e",
  ë: "e",
  ì: "i",
  í: "i",
  î: "i",
  ï: "i",
  ò: "o",
  ó: "o",
  ô: "o",
  õ: "o",
  ö: "o",
  ù: "u",
  ú: "u",
  û: "u",
  ü: "u",
  ç: "c",
  ñ: "n",
  ý: "y",
  ÿ: "y"
};

/* -- Bidi-safe trimming ---------------------------------------------------- */

/**
 * Strip bidi controls and zero-width characters from both edges of a value.
 *
 * Feed titles sometimes open or close with an invisible mark, which would
 * make two visually identical names compare unequal (and would also wrap
 * badly inside a Persian sentence). ZWNJ inside words is preserved.
 */
export function trimEdgeControls(value: string): string {
  return value
    .replace(/^[\u200B-\u200F\u061C\u2066-\u2069\u202A-\u202E]+/, "")
    .replace(/[\u200B-\u200F\u061C\u2066-\u2069\u202A-\u202E]+$/, "");
}

/**
 * Convert Persian/Arabic-Indic digits to ASCII.
 *
 * Two planes exist and the feed mixes them, so both are folded. `toEnglishDigits`
 * is the exported name used by the date and chapter parsers.
 */
export function toAsciiDigits(value: string): string {
  return value.replace(ARABIC_DIGITS, (digit) => {
    const code = digit.codePointAt(0) ?? 0;
    // Arabic-Indic U+0660–U+0669 and extended Persian U+06F0–U+06F9 both
    // start at a multiple of 16, so the value is `code - offset`.
    const offset = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String.fromCodePoint(code - offset + 0x30);
  });
}

/** The §6.6 normalizer: the single comparison form for search and matching. */
export function norm(value: string): string {
  return value
    .replace(DIACRITICS, "")
    .replace(/ي/g, "ی") // Arabic Yeh → Persian Yeh
    .replace(/ك/g, "ک") // Arabic Kaf → Persian Kaf
    .replace(/[\u200C\u200B-\u200F\u061C\u2066-\u2069\u202A-\u202E]/g, "")
    .replace(ARABIC_DIGITS, toAsciiDigits)
    .toLowerCase()
    .replace(/[à-ÿ]/g, (char) => LATIN_DIACRITICS[char] ?? char)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split into comparison tokens. Used by the token-prefix rule of §6.1d, where
 * a name must match a whole-token boundary rather than a substring.
 */
export function normTokens(value: string): string[] {
  const normalized = norm(value);
  return normalized === "" ? [] : normalized.split(" ");
}

/**
 * True when `part` covers `anchor` as whole tokens: equal, or `anchor` is a
 * token-prefix of `part` ("کوروش کوچکیان صبور" over anchor "کوروش کوچکیان").
 */
export function isTokenPrefixMatch(part: string, anchor: string): boolean {
  const partTokens = normTokens(part);
  const anchorTokens = normTokens(anchor);
  if (partTokens.length === 0 || anchorTokens.length === 0) {
    return false;
  }
  if (partTokens.length < anchorTokens.length) {
    return false;
  }
  return anchorTokens.every((token, index) => partTokens[index] === token);
}

/** Words of a string after normalization, with digits already folded. */
export function tokenCount(value: string): number {
  return normTokens(value).length;
}

/**
 * Collapse whitespace for prose used in excerpts and meta descriptions.
 * ZWNJ inside words is preserved here, because the output is *display* text —
 * only bidi controls and runs of whitespace are touched.
 */
export function collapseWhitespace(value: string): string {
  return (
    value
      /*
       * ZWNJ (U+200C) and ZWJ (U+200D) are word-joiners, not spaces: the range
       * below deliberately names the marks it folds (ZWSP, LRM, RLM, ALM and
       * the embedding controls) and leaves the joiners in the display text —
       * «گفت‌وگو» must survive as written.
       */
      .replace(/[\u200B\u200E\u200F\u061C\u202A-\u202E]/g, " ")
      .replace(/[\u2066-\u2069]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export { BIDI_AND_ZERO_WIDTH };
