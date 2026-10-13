// Feeds the pointer position (as %) into --mx / --my on [data-spotlight]
// so CSS can light / reveal around the cursor. Fine pointers only;
// without it the effects fall back to the element's centre.
export function initSpotlight() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.querySelectorAll("[data-spotlight]").forEach((el) => {
    let frame = null;
    el.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const box = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((event.clientX - box.left) / box.width) * 100}%`);
        el.style.setProperty("--my", `${((event.clientY - box.top) / box.height) * 100}%`);
      });
    });
  });
}
