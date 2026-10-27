<script lang="ts">
  /**
   * About — docs/ARCHITECTURE.md §9.1.
   *
   * Factual show overview, credited to the official sources. Nothing here is
   * estimated: audience figures, episode counts, and platform metadata all
   * change with the feed, so the page describes the show rather than reporting
   * numbers about it (dynamic counts, never hard-coded, §1.4).
   */

  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>دربارهٔ طبقه ۱۶</title>
  <meta
    name="description"
    content="طبقه ۱۶ گفت‌وگوی درازی است با آدم‌هایی که می‌سازند، پژوهش می‌کنند و فکر می‌کنند؛ میزبانی سهیل علوی."
  />
</svelte:head>

<div class="page">
  <div class="container">
    <header class="page__header">
      <h1 class="page__title">دربارهٔ طبقه ۱۶</h1>
    </header>

    <div class="prose">
      <p>
        طبقه ۱۶ پادکستیِ گفت‌وگو است که میزبانش سهیل علوی است و در آپارتمانِ طبقهٔ شانزدهمِ او در
        تورنتو ضبط می‌شود. مهمان‌ها — آدم‌هایی که می‌سازند، پژوهش می‌کنند و فکر می‌کنند — در
        گفت‌وگوهای بلند دربارهٔ فناوری، کارآفرینی، کسب‌وکار، هنر، روان‌شناسی و زندگی روی میکروفن
        می‌آیند.
      </p>

      <p>
        قسمت‌ها روی آکست منتشر می‌شوند و روی یوتیوب، اسپاتیفای، اپل پادکست و کست‌باکس نیز در
        دسترس‌اند. هر صفحهٔ قسمت در این سایت به همان پیوندهای رسمی وصل است؛ صدا و تصویر روی
        پلتفرم‌های اصلی میزبانی می‌شوند و اینجا بازتوزیع نمی‌شوند.
      </p>

      <p>
        این وب‌سایت یک طرحِ مستقل و تأییدنشده است و تا تأییدِ صاحبِ پادکست، سایتِ رسمیِ طبقه ۱۶ به
        شمار نمی‌آید. حقِ صدا، متن و تصاویرِ اصلی متعلق به سهیل علوی است.
      </p>
    </div>

    <section class="links" aria-labelledby="about-links">
      <h2 class="links__heading" id="about-links">شنیدن در</h2>
      <ul class="links__list">
        {#each data.listenLinks as link (link.id)}
          <li>
            <a href={link.url} rel="noopener noreferrer" target="_blank">
              {link.label}
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        {/each}
        <li>
          <a href={data.linkHub.url} rel="noopener noreferrer" target="_blank">
            {data.linkHub.label}
            <span aria-hidden="true">↗</span>
          </a>
        </li>
        <li>
          <a href={data.contact.url} rel="noopener noreferrer" target="_blank">
            {data.contact.label}
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>
    </section>
  </div>
</div>

<style>
  .page {
    padding-block: var(--sp-7) var(--sp-9);
  }

  .page__header {
    margin-block-end: var(--sp-6);
  }

  .page__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .prose {
    display: grid;
    gap: var(--sp-4);
    max-width: var(--prose-max);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
  }

  .links {
    margin-block-start: var(--sp-7);
  }

  .links__heading {
    margin-block-end: var(--sp-3);
    font-family: var(--font-body);
    font-size: var(--fs-label);
    font-weight: 500;
    line-height: var(--lh-label);
    color: var(--muted);
  }

  .links__list {
    display: grid;
    gap: var(--sp-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .links__list a {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 44px;
    font-size: var(--fs-body-s);
  }
</style>
