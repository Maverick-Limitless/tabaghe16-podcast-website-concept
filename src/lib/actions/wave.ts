/**
 * `use:wave` — the fabric-wave press action (the fabric-wave press, "Origin rules").
 *
 * Writes the contact point as percentages (--wx/--wy) on pointerdown, holds
 * `.is-pressing` while the membrane is down, then swaps to `.is-settling` on
 * release so the spring recovery runs from the pressed scale. Keyboard
 * activation (Enter/Space) uses the center origin and the exact same phases,
 * so both input paths are equally legible (keyboard activation uses the center origin).
 *
 * The action is enhancement only: without it, CSS `:active` still gives the
 * instant depress and a static center sheen (wave.css). A second concurrent
 * pointer is ignored; a pointer released outside the button still settles via
 * the window-level listener.
 */

const CENTER = 50;
const PRESS_CLASS = "is-pressing";
const SETTLE_CLASS = "is-settling";

export function wave(node: HTMLElement): { destroy(): void } {
  let pressedPointer: number | null = null;
  let settleTimer: number | undefined;

  function setOrigin(clientX: number, clientY: number): void {
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      return;
    }
    // Percentages of the button box keep the wave correct through resizes.
    node.style.setProperty("--wx", `${((clientX - box.left) / box.width) * 100}`);
    node.style.setProperty("--wy", `${((clientY - box.top) / box.height) * 100}`);
  }

  function press(clientX: number, clientY: number): void {
    window.clearTimeout(settleTimer);
    node.classList.remove(SETTLE_CLASS);
    setOrigin(clientX, clientY);
    node.classList.add(PRESS_CLASS);
  }

  /** Keyboard and programmatic activation: the center origin, 50%/50%. */
  function pressCenter(): void {
    window.clearTimeout(settleTimer);
    node.classList.remove(SETTLE_CLASS);
    node.style.setProperty("--wx", `${CENTER}`);
    node.style.setProperty("--wy", `${CENTER}`);
    node.classList.add(PRESS_CLASS);
  }

  function release(): void {
    if (!node.classList.contains(PRESS_CLASS)) {
      return;
    }
    node.classList.remove(PRESS_CLASS);
    node.classList.add(SETTLE_CLASS);
    // The settle phase owns the membrane for --dur-wave-settle; the class is
    // dropped afterwards so a later press starts from a clean state.
    settleTimer = window.setTimeout(() => {
      node.classList.remove(SETTLE_CLASS);
    }, 520);
  }

  function onPointerDown(event: PointerEvent): void {
    if (pressedPointer !== null) {
      return;
    }
    pressedPointer = event.pointerId;
    press(event.clientX, event.clientY);
  }

  // Released inside or outside the button: the window listener catches both,
  // so the wave always settles.
  function onWindowPointerUp(): void {
    if (pressedPointer !== null) {
      pressedPointer = null;
      release();
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if (event.repeat) {
      return;
    }
    pressCenter();
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    release();
  }

  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("keydown", onKeyDown);
  node.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("pointercancel", onWindowPointerUp);

  return {
    destroy() {
      window.clearTimeout(settleTimer);
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("keydown", onKeyDown);
      node.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    }
  };
}
