<script lang="ts">
  /**
   * Global footer — the shell.
   *
   * The single ink band of the site. Every destination arrives as a prop from
   * the layout's server load, because the verified link table is server-side
   * configuration (docs/ARCHITECTURE.md §8.3) and must not reach the client
   * bundle. The link hub's own shorteners and the legacy degraded redirectors
   * are deliberately never used. All links are real and verified, and the fine
   * print carries the required non-affiliation note (public documentation policy) plus the Acast
   * attribution the source requires.
   */

  export interface FooterLink {
    readonly id: string;
    readonly label: string;
    readonly url: string;
  }

  interface Props {
    listenLinks: readonly FooterLink[];
    followLinks: readonly FooterLink[];
    contact: FooterLink;
    linkHubUrl: string;
  }

  let { listenLinks, followLinks, contact, linkHubUrl }: Props = $props();
</script>

<footer class="site-footer on-ink">
  <div class="site-footer__inner">
    <div class="site-footer__columns">
      <section class="site-footer__column" aria-labelledby="footer-listen">
        <h2 class="site-footer__heading" id="footer-listen">شنیدن در</h2>
        <ul class="site-footer__list">
          {#each listenLinks as link (link.id)}
            <li>
              <a href={link.url} rel="noopener noreferrer" target="_blank">
                {link.label}
                <span class="site-footer__external" aria-hidden="true">↗</span>
              </a>
            </li>
          {/each}
        </ul>
      </section>

      <section class="site-footer__column" aria-labelledby="footer-follow">
        <h2 class="site-footer__heading" id="footer-follow">دنبال کردن</h2>
        <ul class="site-footer__list">
          {#each followLinks as link (link.id)}
            <li>
              <a href={link.url} rel="noopener noreferrer" target="_blank">
                {link.label}
                <span class="site-footer__external" aria-hidden="true">↗</span>
              </a>
            </li>
          {/each}
        </ul>
      </section>

      <section class="site-footer__column" aria-labelledby="footer-contact">
        <h2 class="site-footer__heading" id="footer-contact">تماس و تبلیغات</h2>
        <ul class="site-footer__list">
          <li>
            <a href={contact.url} rel="noopener noreferrer" target="_blank">
              {contact.label}
              <span class="site-footer__external" aria-hidden="true">↗</span>
            </a>
          </li>
          <li>
            <a href={linkHubUrl} rel="noopener noreferrer" target="_blank">
              همهٔ پیوندهای رسمی
              <span class="site-footer__external" aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
      </section>
    </div>

    <div class="site-footer__fineprint">
      <p>
        این وب‌سایت یک طرحِ مستقل و تأییدنشده است و تا تأییدِ صاحبِ پادکست، سایتِ رسمیِ طبقه ۱۶ به
        شمار نمی‌آید.
      </p>
      <p>
        میزبانیِ صدا و فید: آکست. حقِ صدا، متن و تصاویرِ اصلی متعلق به سهیل علوی است و روی
        پلتفرم‌های رسمی میزبانی می‌شود.
      </p>
      <p>© سهیل علوی</p>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    background-color: var(--ink);
    /* Secondary text on a dark surface uses stone, never muted (the color rules). */
    --footer-muted: var(--stone);
  }

  .site-footer__inner {
    max-width: var(--content-max);
    margin-inline: auto;
    padding: var(--sp-8) var(--gutter) var(--sp-6);
  }

  .site-footer__columns {
    display: grid;
    gap: var(--sp-6);
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    max-width: 720px;
  }

  .site-footer__heading {
    margin-block-end: var(--sp-3);
    font-family: var(--font-body);
    font-size: var(--fs-label);
    font-weight: 500;
    line-height: var(--lh-label);
    color: var(--footer-muted);
  }

  .site-footer__list {
    display: grid;
    gap: var(--sp-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .site-footer__list a {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 32px;
    color: var(--paper);
    font-size: var(--fs-body-s);
    text-decoration-color: var(--graphite);
  }

  .site-footer__list a:hover {
    text-decoration-color: currentColor;
  }

  .site-footer__external {
    font-size: 0.8em;
    /* Non-directional affordance: never mirrored (the Persian typographic rules-5). */
    direction: ltr;
    unicode-bidi: isolate;
    color: var(--footer-muted);
  }

  .site-footer__fineprint {
    display: grid;
    gap: var(--sp-2);
    margin-block-start: var(--sp-7);
    padding-block-start: var(--sp-5);
    border-block-start: 1px solid var(--graphite);
    max-width: 680px;
  }

  .site-footer__fineprint p {
    margin: 0;
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--footer-muted);
  }
</style>
