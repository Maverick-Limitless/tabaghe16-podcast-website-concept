<script lang="js">
  /**
   * Privacy notice — the one aesthetic risk and §9.4.
   *
   * Describes what this build actually does: a static site with no accounts,
   * no analytics, no cookies, and no server that receives visitor data. It
   * does not promise anything on behalf of the platforms it links to.
   */
</script>

<svelte:head>
  <title>حریمِ خصوصی — طبقه ۱۶</title>
  <meta
    name="description"
    content="این سایت حسابی، Analytics یا کوکی ندارد؛ صدا روی سرورهای آکست پخش می‌شود."
  />
</svelte:head>

<div class="page">
  <div class="container">
    <header class="page__header">
      <h1 class="page__title">حریمِ خصوصی</h1>
    </header>

    <div class="prose">
      <section class="block">
        <h2 class="block__title">چه چیزی گردآوری نمی‌شود</h2>
        <p>
          این وب‌سایت حسابِ کاربری، فرمِ تماس، Analytics، پیکسلِ ردیابی و کوکی ندارد. چیزی که
          می‌خوانید یا می‌شنوید روی این سایت ثبت نمی‌شود و پیشرفتِ پخش نیز روی همین دستگاهِ شما
          می‌ماند؛ به سروری نمی‌رود.
        </p>
      </section>

      <section class="block">
        <h2 class="block__title">پخشِ صدا و تصویر</h2>
        <p>
          وقتی روی «شنیدن» می‌زنید، مرورگرِ شما مستقیماً به فایلِ صوتیِ قسمت روی سرورهای آکست وصل
          می‌شود. آن پیوند امضاشده و کوتاه‌عمر است و این سایت آن را ذخیره یا بازتوزیع نمی‌کند؛ صدا
          روی پلتفرمِ اصلی میزبانی می‌شود. پیوندهایی که به یوتیوب، اسپاتیفای، اپل پادکست، کست‌باکس
          یا اینستاگرام می‌دهیم، شما را به سرویسِ خودشان می‌برند و قواعدِ حریمِ خصوصیِ همان‌ها در
          آنجا اعمال می‌شود.
        </p>
      </section>

      <section class="block">
        <h2 class="block__title">قلم‌ها</h2>
        <p>
          قلم‌هایی که این سایت با آن‌ها نوشته شده — استعداد، وزیرمتن و IBM Plex Mono — با پروانهٔ
          SIL Open Font License 1.1 از خودِ این سایت بارگذاری می‌شوند، نه از سرویسِ دیگری. متنِ
          پروانه‌ها در مخزنِ پروژه موجود است.
        </p>
      </section>

      <section class="block">
        <h2 class="block__title">تماس</h2>
        <p>
          هر پرسشی دربارهٔ این طرح دارید، از مسیرِ رسمیِ تماسِ برنامه بپرسید:
          <a href="https://t.me/tabaghe16admin" rel="noopener noreferrer" target="_blank">
            t.me/tabaghe16admin
          </a>
        </p>
      </section>

      <p class="fineprint">
        این وب‌سایت یک طرحِ مستقل و تأییدنشده است. حقِ صدا، متن و تصاویرِ اصلی متعلق به سهیل علوی
        است و روی پلتفرم‌های رسمی میزبانی می‌شود.
      </p>
    </div>
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
    gap: var(--sp-6);
    max-width: var(--prose-max);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
  }

  .block {
    display: grid;
    gap: var(--sp-3);
  }

  .block__title {
    font-size: var(--fs-title);
    line-height: var(--lh-title);
    font-weight: 600;
  }

  .block p {
    margin: 0;
    color: var(--ink);
  }

  .fineprint {
    font-size: var(--fs-meta);
    line-height: var(--lh-meta);
    color: var(--muted);
  }
</style>
