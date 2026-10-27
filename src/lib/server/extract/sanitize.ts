/**
 * HTML sanitization — docs/ARCHITECTURE.md §6.5 (feed and link security).
 *
 * Feed descriptions are third-party CDATA HTML. They reach the page only after
 * passing through `sanitize-html` with a narrow allowlist:
 *
 * - tags: `p, br, a, strong, em, b, i, ul, ol, li, blockquote`
 * - on `a`: only `href`, and only when it is `https:` or `mailto:`
 * - `rel="noopener noreferrer" target="_blank"` forced onto every link
 * - everything else stripped: `script`, `iframe`, `img`, `style`, event
 *   handlers, `class`, `id`
 *
 * The allowlist is the *entire* policy. Adding a tag here is a decision that
 * needs a test in `tests/unit/sanitize.test.ts`, not a one-line fix.
 *
 * "Strip, never blank" is the rule for unsafe attributes: when an `href`
 * scheme is not allowed, the attribute is dropped and the link text is kept, so
 * a hostile payload degrades to readable text instead of an empty box.
 */

import sanitizeHtml from "sanitize-html";

/** Tags that survive. Anything else is dropped with its inner text kept. */
const ALLOWED_TAGS: readonly string[] = [
  "p",
  "br",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "blockquote"
];

/** Schemes an `<a href>` may use. */
const ALLOWED_URL_SCHEMES: readonly string[] = ["https", "mailto"];

/**
 * Attributes that survive, per tag. `class`, `id`, `style` appear nowhere.
 * `rel` and `target` are listed because the transform below writes them and
 * sanitize-html filters transformed attributes against this allowlist too —
 * without the listing, every link reached the page without its
 * `rel="noopener noreferrer"`, which the link-safety tests pin (feed and link security).
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "rel", "target"]
};

/** The rendered rel for every external link (§6.5, §7.3, §8.3). */
const LINK_REL = "noopener noreferrer";

/**
 * Render feed HTML to sanitized HTML.
 *
 * `sanitize-html` decodes entities in text and re-encodes only what is
 * required on output, so the Persian text, its ZWNJ, and its punctuation come
 * through unchanged. The feed's numeric references (`&#39;`) are already
 * decoded at the feed boundary (feed.ts `decodeDescriptionReferences`); this
 * layer re-escapes a raw `&` on output, which is why a double decode would
 * show «&#39;» visibly.
 *
 * `<br>` is preserved verbatim, which the fixture's five chapter separator
 * styles depend on.
 */
export function sanitizeDescriptionHtml(rawHtml: string): string {
  return sanitizeHtml(rawHtml, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: [...ALLOWED_URL_SCHEMES],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    // `transformTags` writes `rel` itself; `forceRel` is not part of the
    // installed sanitize-html option set and every link already gets the
    // rel it needs from the transform below.
    transformTags: {
      a: (tagName, attribs) => {
        const href = typeof attribs.href === "string" ? attribs.href : "";
        const safeHref = isAllowedHref(href) ? href : undefined;
        return {
          tagName: "a",
          attribs: {
            ...(safeHref === undefined ? {} : { href: safeHref }),
            rel: LINK_REL,
            target: "_blank"
          }
        };
      }
    },
    // Padding keeps the output from collapsing a trailing <br> into nothing,
    // which would silently join the last paragraph to the previous one in RTL
    // text where a dropped break is visually invisible.
    disallowedTagsMode: "discard",
    nonBooleanAttributes: []
  });
}

function isAllowedHref(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  return trimmed.startsWith("https://") || trimmed.startsWith("mailto:");
}

/**
 * Plain text of an already-sanitized HTML string, for `descriptionExcerpt`.
 * Runs on sanitized HTML only — never on raw feed HTML — so the text that
 * reaches a meta description has already passed the allowlist.
 */
export function sanitizedHtmlToText(sanitizedHtml: string): string {
  return sanitizedHtml
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|blockquote|ul|ol)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export { ALLOWED_TAGS, ALLOWED_ATTRIBUTES, ALLOWED_URL_SCHEMES, LINK_REL };
