<script lang="ts">
  /**
   * The signature control — «موجِ زیر فرش» (docs/DESIGN.md §6).
   *
   * Renders a link when `href` is given and a button otherwise, so one
   * component covers every wave surface (hero CTA, archive CTA, the listen
   * band's play control, the share control) with the same motion system.
   * Rationed on purpose: the wave belongs to primary CTAs and play controls
   * only (DESIGN.md §6 "Constraints") — links, chips and rows keep their
   * micro states.
   *
   * States (PRD §7.1.6): hover, focus-visible (the base layer's ink ring),
   * active (the wave), disabled (a real state, never a decorative control),
   * and pending — the label swaps, the width is preserved, no wave runs.
   */

  import type { Snippet } from "svelte";

  import { wave } from "#lib/actions/wave";
  import "../styles/wave.css";

  export type WaveVariant = "ink" | "surface" | "quiet";

  interface Props {
    /** When set, the control renders as a link to this href. */
    href?: string;
    variant?: WaveVariant;
    size?: "md" | "lg" | "round" | "round-sm";
    /** Buttons only: a real disabled state, never a decorative control. */
    disabled?: boolean;
    /** When true, the button renders the pending state; the caller owns the action. */
    pending?: boolean;
    /** Forwarded to a rendered <button>. */
    type?: "button" | "submit";
    /** Forwarded to the underlying element for caller-side positioning. */
    class?: string;
    /**
     * Optional accessible name for controls whose content is a glyph rather
     * than text (the play/pause control). Text buttons keep their child text
     * as the name, so this stays unset there.
     */
    label?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
  }

  let {
    href,
    variant = "ink",
    size = "md",
    disabled = false,
    pending = false,
    type = "button",
    class: className,
    label,
    children,
    onclick
  }: Props = $props();

  const isLink = $derived(href !== undefined);

  const SIZE_CLASSES: Record<string, string> = {
    md: "",
    lg: "wave-btn--lg",
    round: "wave-btn--round",
    "round-sm": "wave-btn--round-sm"
  };

  const classes = $derived(
    [
      "wave-btn",
      `wave-btn--${variant}`,
      SIZE_CLASSES[size] ?? "",
      pending ? "wave-btn--pending" : "",
      className ?? ""
    ]
      .filter((value) => value !== "")
      .join(" ")
  );
</script>

<svelte:element
  this={isLink ? "a" : "button"}
  class={classes}
  use:wave
  {...isLink ? { href } : { type, disabled }}
  {...pending ? { "aria-busy": true } : {}}
  {...label === undefined ? {} : { "aria-label": label }}
  {onclick}
>
  <span class="wave-fabric" aria-hidden="true"></span>
  {#if pending}
    <span class="wave-spinner" aria-hidden="true"><span></span><span></span><span></span></span>
  {/if}
  {@render children?.()}
</svelte:element>
