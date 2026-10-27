/**
 * HTML sanitization — docs/ARCHITECTURE.md §6.5; feed and link security
 *
 * The allowlist is the entire policy: feed descriptions are third-party
 * CDATA HTML, and these tests pin every edge the policy names — what
 * survives, what is stripped, "strip never blank" for unsafe hrefs, the
 * forced rel/target on every link, and the text-fidelity rules (ZWNJ,
 * entities) the Persian page depends on.
 */

import { describe, expect, it } from "vitest";

import { sanitizeDescriptionHtml, sanitizedHtmlToText } from "#lib/server/extract/sanitize";

describe("sanitizeDescriptionHtml", () => {
  it("keeps exactly the allowlisted tags", () => {
    const html =
      "<p>یک <strong>مهم</strong> و <em>نکته</em></p><blockquote>نقل</blockquote><ul><li>فهرست</li></ul>";
    const out = sanitizeDescriptionHtml(html);
    expect(out).toContain("<strong>مهم</strong>");
    expect(out).toContain("<em>نکته</em>");
    expect(out).toContain("<blockquote>نقل</blockquote>");
    expect(out).toContain("<li>فهرست</li>");
  });

  it("strips scripts, iframes, images, and event handlers", () => {
    const out = sanitizeDescriptionHtml(
      `<p>متن</p><script>alert(1)</script><iframe src="https://x.example"></iframe><img src="https://x.example/i.png" onerror="alert(2)"><p onclick="alert(3)">بیشتر</p>`
    );
    expect(out).not.toContain("script");
    expect(out).not.toContain("iframe");
    expect(out).not.toContain("img");
    expect(out).not.toContain("onerror");
    expect(out).toContain("متن");
  });

  it("keeps an https link and forces rel and target", () => {
    const out = sanitizeDescriptionHtml('<p><a href="https://example.com/page">پیوند</a></p>');
    expect(out).toContain('href="https://example.com/page"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("keeps a mailto link", () => {
    const out = sanitizeDescriptionHtml('<p><a href="mailto:a@b.example">نامه</a></p>');
    expect(out).toContain('href="mailto:a@b.example"');
  });

  it("strips an unsafe scheme but never blanks the link text", () => {
    const out = sanitizeDescriptionHtml('<p><a href="javascript:alert(1)">متنِ پیوند</a></p>');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("متنِ پیوند");
  });

  it("drops class, id, and style attributes", () => {
    const out = sanitizeDescriptionHtml('<p class="x" id="y" style="color:red">متن</p>');
    expect(out).not.toContain("class=");
    expect(out).not.toContain("id=");
    expect(out).not.toContain("style=");
  });

  it("preserves ZWNJ inside words", () => {
    const out = sanitizeDescriptionHtml("<p>گفت‌وگوهای طبقه ۱۶</p>");
    expect(out).toContain("گفت‌وگو");
  });

  it("decodes numeric character references once (the twice-escaped feed form)", () => {
    // The feed writes `&#39;` inside CDATA; the page must show «'», not «&#39;».
    const out = sanitizeDescriptionHtml("<p>today&#39;s episode</p>");
    expect(out).toContain("today's");
    expect(out).not.toContain("&#39;");
  });
});

describe("sanitizedHtmlToText", () => {
  it("reduces sanitized HTML to clean plain text", () => {
    const text = sanitizedHtmlToText("<p>یک</p><p>دو</p>");
    expect(text).toContain("یک");
    expect(text).toContain("دو");
    expect(text).not.toContain("<p>");
  });

  it("unescapes the remaining entities and collapses whitespace", () => {
    const text = sanitizedHtmlToText("<p>a & b&nbsp;&nbsp;&nbsp;c</p>");
    expect(text).toBe("a & b c");
  });
});
