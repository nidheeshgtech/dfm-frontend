// Invest hero device screens (index.html, .ivs-site / .ivs-dash): as each
// page scrolls inside its device, its parts rise in when they enter the
// screen and reset once they leave it, so every loop plays again. Parts
// that hold something animated (funding bars, the chart, the allocation
// bar) start it when they come in (.is-in, _iv-screens.scss). Siblings
// stagger by a step each. Reduced motion: everything shows as is.
const PARTS = [
  ".ivs-hero__title",
  ".ivs-hero__lead",
  ".ivs-toggle",
  ".ivs-sec__title",
  ".ivs-sec__lead",
  ".ivs-pills",
  ".ivs-card",
  ".ivs-sec > .ivs-btn",
  ".ivs-sec__head > .ivs-btn",
  ".ivs-pm__card",
  ".ivs-pm__row",
  ".ivs-ev",
  ".ivs-foot__cols > div",
  ".ivd-head__row",
  ".ivd-total",
  ".ivd-kpi",
  ".ivd-box",
  ".ivd-svc",
  ".ivd-note",
  ".ivd-wl__row",
  ".ivd-disc__row",
].join(", ");

export function initIvScreens() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  document.querySelectorAll(".ivs").forEach((page) => {
    const screen = page.parentElement;
    const parts = [...page.querySelectorAll(PARTS)];
    parts.forEach((el) => {
      el.setAttribute("data-ivs-r", "");
      const same = [...el.parentElement.children].filter((c) => c.matches(PARTS));
      el.style.setProperty("--d", `${Math.min(same.indexOf(el), 5) * 0.08}s`);
    });

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-in", e.isIntersecting)),
      { root: screen, threshold: 0.15 },
    );
    parts.forEach((el) => io.observe(el));
  });
}
