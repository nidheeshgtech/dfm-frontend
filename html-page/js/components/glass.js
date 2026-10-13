// Feeds the cursor position into --glass-x / --glass-y on interactive
// glass so the radial highlight in _glass.scss follows the pointer.
// One delegated listener for the whole page; rAF-throttled. Skipped on
// touch-only devices and for reduced motion (the CSS still works,
// highlight just sits centred).
const SELECTOR = ".glass--interactive, .btn-glass";

export function initGlass() {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!finePointer || reduceMotion) return;

  let frame = null;

  document.addEventListener(
    "pointermove",
    (event) => {
      const el = event.target.closest(SELECTOR);
      if (!el || frame) return;

      frame = requestAnimationFrame(() => {
        frame = null;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--glass-x", `${event.clientX - rect.left}px`);
        el.style.setProperty("--glass-y", `${event.clientY - rect.top}px`);
      });
    },
    { passive: true },
  );
}
