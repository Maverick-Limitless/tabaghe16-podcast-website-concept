/**
 * Deterministic search normalization — "search and smart discovery
 * without AI": one shared function for both sides of the archive.
 *
 * One shared function for both sides of the archive: the loader normalizes
 * each row's searchable text once at build time, the page normalizes the
 * query on every keystroke, and the match is a plain substring comparison —
 * explainable, indexable, and honest about what it does. No server-only
 * imports here: this module ships to the client.
 *
 * What the normalizer folds, and why:
 *  - Arabic Yeh/Keh to their Persian forms (ي→ی, ك→ک): the feed's older
 *    items mix the script variants, and a Persian reader types Persian.
 *  - Arabic Teh Marbuta and Alef Maksura to their Persian counterparts.
 *  - Persian and Arabic-Indic digits to ASCII: «قسمت ۲۱۲» finds «212».
 *  - Zero-width non-joiner and other zero-width marks to nothing: «گفت‌وگو»
 *    must match «گفت وگو» — the join is spelling, not meaning.
 *  - Diacritics stripped: vocalized spellings still match plain ones.
 *  - All whitespace runs collapsed to single spaces.
 *
 * The original display text is never altered — this form exists only for
 * comparison (deterministic search: normalize "without damaging the original display
 * text").
 */

/** Arabic-script character folds: source variant → Persian form. */
const CHARACTER_FOLDS: Record<string, string> = {
  ي: "ی",
  ك: "ک",
  ة: "ه",
  ى: "ی",
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ؤ: "و"
};

const ARABIC_INDIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;
/* No ZWNJ/ZWJ here — the joiners fold to spaces before this runs. */
const ZERO_WIDTH_AND_CONTROLS = /[\u200B\u200E\u200F\u2060\uFEFF\u061C]/g;
const DIACRITICS = /[\u064B-\u065F\u0670]/g;
const WHITESPACE_RUNS = /\s+/g;

export function normalizeForSearch(value: string): string {
  if (value === "") {
    return "";
  }

  let folded = "";
  for (const character of value) {
    folded += CHARACTER_FOLDS[character] ?? character;
  }

  return (
    folded
      .replace(ARABIC_INDIC_DIGITS, (digit) => {
        const code = digit.codePointAt(0) ?? 0;
        const offset = code >= 0x06f0 ? 0x06f0 : 0x0660;
        return String.fromCodePoint(code - offset + 0x30);
      })
      /*
       * Order matters: the word-joiners (ZWNJ/ZWJ) become spaces first, so
       * «گفت‌وگو» and «گفت وگو» reduce to the same comparison text — the
       * join is spelling, not meaning. The remaining zero-width and bidi
       * marks carry nothing and drop, then diacritics, then space runs.
       */
      .replace(/[\u200C\u200D]/g, " ")
      .replace(ZERO_WIDTH_AND_CONTROLS, "")
      .replace(DIACRITICS, "")
      .replace(WHITESPACE_RUNS, " ")
      .trim()
      .toLowerCase()
  );
}

/**
 * Build one row's searchable text from the fields the store actually
 * carries: the source title (whole, including the guest segment the split
 * rules may have rendered into a byline), the headline, the byline, the
 * description excerpt, and chapter labels where the source provides them.
 *
 * Runs at build time in the archive loader; the client receives the finished
 * string and never re-derives it.
 */
export interface SearchableEpisode {
  readonly titleSource: string;
  readonly titleHeadline: string | null;
  readonly titleByline: string | null;
  readonly descriptionExcerpt: string;
  readonly chapters: readonly { readonly label: string }[] | null;
}

export function buildSearchText(episode: SearchableEpisode): string {
  const parts = [
    episode.titleSource,
    episode.titleHeadline,
    episode.titleByline,
    episode.descriptionExcerpt,
    ...(episode.chapters?.map((chapter) => chapter.label) ?? [])
  ].filter((part): part is string => part !== null && part !== "");

  return normalizeForSearch(parts.join(" "));
}
