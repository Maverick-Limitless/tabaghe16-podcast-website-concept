<script lang="ts">
  /**
   * Partnerships — docs/ARCHITECTURE.md §9.1, no invented taxonomies.
   *
   * Professional and concise, with no invented audience numbers, CPM,
   * demographics, conversion rates, sponsor names, packages, or testimonials.
   * A media kit is something the show owner provides; this page says so and
   * links the one verified contact route rather than fabricating an address.
   */

  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>همکاری و تبلیغات — طبقه ۱۶</title>
  <meta name="description" content="همکاری با طبقه ۱۶: مسیرِ رسمیِ تماس با صاحب پادکست." />
</svelte:head>

<div class="page">
  <div class="container">
    <header class="page__header">
      <h1 class="page__title">همکاری و تبلیغات</h1>
      <p class="page__standfirst">
        طبقه ۱۶ هر هفته گفت‌وگوی بلندی منتشر می‌کند که مخاطبان فارسی‌زبان در پلتفرم‌های رسمی آن را
        دنبال می‌کنند.
      </p>
    </header>

    <div class="prose">
      <p>
        برنامهٔ رسانه‌ای، شمارهٔ مخاطبان، هزینهٔ همکاری و جزئیاتِ هر قرارداد را صاحبِ پادکست تعیین
        می‌کند و اینجا چیزی دربارهٔ آن‌ها اعلام نمی‌شود. اگر برای همکاری آمده‌اید، مسیرِ رسمیِ تماس
        پیویشته در پایین است و درخواست شما مستقیماً به تیم برنامه می‌رسد.
      </p>

      <p>
        کارهایی که می‌توانید پیشنهاد دهید: معرفیِ محصول یا سرویس در ابتدا یا انتهای قسمت‌های مربوطه
        (اسپانسرِ قسمت)، همکاریِ چندقسمتی در قالبِ موضوعی مشخص، یا همکاریِ سازمانیِ بلندمدت. اگر
        فرمتی مدنظرتان است که در فهرست نیست، در گفت‌وگو پیشنهادش کنید.
      </p>

      <p>هر همکاری در قسمت مشخص می‌شود و از محتوای ویراستاریِ مستقل جدا می‌ماند.</p>
    </div>

    <section class="contact" aria-labelledby="partnership-contact">
      <h2 class="contact__heading" id="partnership-contact">مسیرِ تماس</h2>
      <p class="contact__note">تنها مسیرِ تأییدشدهٔ تماس و تبلیغات، همین پیوند است.</p>
      <a class="contact__action" href={data.contact.url} rel="noopener noreferrer" target="_blank">
        {data.contact.label}
        <span aria-hidden="true">↗</span>
      </a>
    </section>
  </div>
</div>

<style>
  .page {
    padding-block: var(--sp-7) var(--sp-9);
  }

  .page__header {
    display: grid;
    gap: var(--sp-2);
    margin-block-end: var(--sp-6);
  }

  .page__title {
    font-size: var(--fs-display);
    line-height: var(--lh-display);
    font-weight: 700;
  }

  .page__standfirst {
    max-width: 56ch;
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    color: var(--muted);
  }

  .prose {
    display: grid;
    gap: var(--sp-4);
    max-width: var(--prose-max);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
  }

  .contact {
    display: grid;
    gap: var(--sp-3);
    justify-items: start;
    margin-block-start: var(--sp-7);
    padding: var(--sp-5);
    border: 1px solid var(--stone);
    border-radius: var(--r-card);
    background-color: var(--surface);
  }

  .contact__heading {
    font-family: var(--font-body);
    font-size: var(--fs-label);
    font-weight: 500;
    line-height: var(--lh-label);
    color: var(--muted);
  }

  .contact__note {
    font-size: var(--fs-body-s);
    line-height: var(--lh-body-s);
    color: var(--muted);
  }

  .contact__action {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 44px;
    padding-inline: var(--sp-4);
    border-radius: var(--r-chip);
    background-color: var(--ink);
    color: var(--paper);
    font-size: var(--fs-label);
    font-weight: 500;
    text-decoration: none;
    transition: background-color var(--dur-micro) var(--ease-press);
  }

  .contact__action:hover {
    background-color: var(--graphite);
  }
</style>
