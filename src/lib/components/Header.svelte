<script lang="ts">
  /**
   * Global header — the shell.
   *
   * Deliberately minimal and honest: the wordmark is text (no invented brand
   * mark), the primary action only exists when there is a real destination for
   * it, and secondary actions only exist when the underlying data supports
   * them (no inert controls — no inert controls).
   *
   * Below 641 px the inline nav is replaced by a menu button that opens the
   * drawer: it slides from the start edge (the right, in RTL), moves focus in
   * on open and returns it to the button on close, closes on Esc and on a
   * scrim press, and traps Tab while open (accessibility).
   */

  import { page } from "$app/state";
  import { untrack } from "svelte";

  export interface NavItem {
    readonly href: string;
    readonly label: string;
  }

  interface Props {
    nav: readonly NavItem[];
    primary?: { readonly href: string; readonly label: string } | null;
  }

  let { nav, primary = null }: Props = $props();

  let menuOpen = $state(false);
  let menuButton = $state<HTMLButtonElement | null>(null);
  let drawer = $state<HTMLElement | null>(null);

  function closeMenu(returnFocus: boolean): void {
    menuOpen = false;
    if (returnFocus) {
      menuButton?.focus();
    }
  }

  function onDrawerKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key !== "Tab" || drawer === null) {
      return;
    }
    // A real focus trap: Tab cycles inside the drawer while it is open, so
    // the page behind never becomes reachable by accident (accessibility).
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !drawer.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Close the drawer whenever the route changes, so a followed link never
  // leaves the sheet hanging over the destination page. The pathname is the
  // only tracked dependency: `menuOpen` is read untracked, because tracking
  // it would make the opening click re-run this effect and instantly close
  // what the click just opened.
  $effect(() => {
    const path = page.url.pathname;
    untrack(() => {
      if (path && menuOpen) {
        closeMenu(false);
      }
    });
  });

  // Focus moves into the sheet on open (accessibility) — the first control, so a
  // screen-reader user lands on the navigation itself, not the container.
  $effect(() => {
    if (menuOpen && drawer !== null) {
      const first = drawer.querySelector<HTMLElement>("a[href], button:not([disabled])");
      (first ?? drawer).focus();
    }
  });
</script>

<header class="site-header">
  <div class="site-header__bar">
    <a class="wordmark" href="/">
      <span class="wordmark__mark">۱۶</span>
      <span class="wordmark__text">طبقه ۱۶</span>
    </a>

    <nav class="site-nav" aria-label="ناوبری اصلی">
      <ul class="site-nav__list">
        {#each nav as item (item.href)}
          <li><a class="site-nav__link" href={item.href}>{item.label}</a></li>
        {/each}
      </ul>
    </nav>

    <button
      type="button"
      class="site-menu-button"
      bind:this={menuButton}
      aria-expanded={menuOpen}
      aria-controls="mobile-drawer"
      onclick={() => (menuOpen ? closeMenu(true) : (menuOpen = true))}
    >
      <span class="site-menu-button__glyph" aria-hidden="true">☰</span>
      فهرست
    </button>

    {#if primary}
      <a class="header-action" href={primary.href}>
        <span class="header-action__glyph" aria-hidden="true">▶</span>
        {primary.label}
      </a>
    {/if}
  </div>
</header>

{#if menuOpen}
  <div class="drawer-scrim" role="presentation" onclick={() => closeMenu(true)}></div>
  <div
    class="drawer"
    id="mobile-drawer"
    bind:this={drawer}
    role="dialog"
    aria-modal="true"
    aria-label="فهرست"
    tabindex="-1"
    onkeydown={onDrawerKeydown}
  >
    <nav class="drawer__nav" aria-label="فهرست ناوبری">
      <ul class="drawer__list">
        {#each nav as item (item.href)}
          <li>
            <a class="drawer__link" href={item.href}>{item.label}</a>
          </li>
        {/each}
      </ul>
    </nav>
    {#if primary}
      <a class="drawer__action" href={primary.href}>
        <span class="drawer__action-glyph" aria-hidden="true">▶</span>
        {primary.label}
      </a>
    {/if}
  </div>
{/if}

<style>
  .site-header {
    position: sticky;
    inset-block-start: 0;
    z-index: var(--z-header);
    background-color: color-mix(in srgb, var(--paper) 95%, transparent);
    backdrop-filter: blur(8px);
    border-block-end: 1px solid var(--stone);
  }

  /* The one translucent floating surface on the page besides the mini-player
     (the elevation budget two-surface budget). */
  .site-header__bar {
    display: flex;
    align-items: center;
    gap: var(--sp-5);
    min-height: var(--header-h);
    max-width: var(--content-max);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }

  .wordmark {
    display: inline-flex;
    align-items: baseline;
    gap: var(--sp-2);
    font-family: var(--font-display);
    font-size: var(--fs-title);
    font-weight: 700;
    line-height: var(--lh-title);
    color: var(--ink);
    text-decoration: none;
  }

  /* The numeral is the one place a monospaced Latin run is allowed in the
     wordmark; it is isolated so it never reorders against Persian text. */
  .wordmark__mark {
    font-family: var(--font-mono);
    font-size: var(--fs-body-s);
    font-weight: 500;
    color: var(--muted);
    direction: ltr;
    unicode-bidi: isolate;
  }

  .site-nav {
    margin-inline-end: auto;
  }

  .site-nav__list {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .site-nav__link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding-inline: var(--sp-2);
    color: var(--ink);
    font-size: var(--fs-label);
    font-weight: 500;
    text-decoration: none;
    border-radius: var(--r-control);
    transition: color var(--dur-micro) var(--ease-press);
  }

  .site-nav__link:hover {
    color: var(--muted);
  }

  .header-action {
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

  .header-action:hover {
    background-color: var(--graphite);
  }

  .header-action__glyph {
    font-size: 0.75em;
    /* Play glyph is non-directional: never mirrored in RTL (the Persian typographic rules-5). */
    direction: ltr;
    unicode-bidi: isolate;
  }

  /* -- Mobile: menu button + drawer ---------------------------------------- */

  .site-menu-button {
    display: none;
    align-items: center;
    gap: var(--sp-2);
    min-height: 44px;
    padding-inline: var(--sp-3);
    border: 1px solid var(--stone);
    border-radius: var(--r-chip);
    background-color: var(--surface);
    color: var(--ink);
    font-size: var(--fs-label);
    font-weight: 500;
    transition: border-color var(--dur-micro) var(--ease-press);
  }

  .site-menu-button:hover {
    border-color: var(--ink);
  }

  .site-menu-button__glyph {
    direction: ltr;
    unicode-bidi: isolate;
  }

  .drawer-scrim {
    position: fixed;
    inset: 0;
    z-index: var(--z-scrim);
    background-color: var(--scrim);
  }

  /*
   * Slides from the start edge. The document is RTL (app.html), so
   * inline-start is the right edge: the sheet is pinned there and enters
   * from beyond the viewport's right edge (the shell).
   */
  .drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: var(--z-drawer);
    display: grid;
    align-content: start;
    gap: var(--sp-6);
    width: min(320px, 88vw);
    padding: var(--sp-6) var(--sp-5);
    background-color: var(--surface);
    box-shadow: var(--e-3);
    animation: drawer-slide var(--dur-modal) var(--ease-out-soft);
  }

  @keyframes drawer-slide {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .drawer__nav {
    display: grid;
    gap: var(--sp-2);
  }

  .drawer__list {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .drawer__link {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding-inline: var(--sp-3);
    border-radius: var(--r-control);
    color: var(--ink);
    font-size: var(--fs-body-s);
    font-weight: 500;
    text-decoration: none;
    transition: background-color var(--dur-micro) var(--ease-press);
  }

  .drawer__link:hover {
    background-color: var(--paper);
  }

  .drawer__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    min-height: 48px;
    padding-inline: var(--sp-5);
    border-radius: var(--r-control);
    background-color: var(--ink);
    color: var(--paper);
    font-size: var(--fs-label);
    font-weight: 500;
    text-decoration: none;
  }

  .drawer__action-glyph {
    font-size: 0.75em;
    direction: ltr;
    unicode-bidi: isolate;
  }

  @media (max-width: 640px) {
    .site-nav__list {
      gap: var(--sp-3);
    }

    .site-nav__link {
      padding-inline: var(--sp-1);
      font-size: var(--fs-label);
    }

    .header-action {
      padding-inline: var(--sp-3);
    }
  }

  @media (max-width: 1023px) {
    .site-nav {
      display: none;
    }

    .site-menu-button {
      display: inline-flex;
      margin-inline-end: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer {
      animation: none;
    }
  }

  @media (max-width: 640px) {
    .site-nav__list {
      gap: var(--sp-3);
    }

    .site-nav__link {
      padding-inline: var(--sp-1);
      font-size: var(--fs-label);
    }

    .header-action {
      padding-inline: var(--sp-3);
    }
  }
</style>
