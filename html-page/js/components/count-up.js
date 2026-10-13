// Counts numeric [data-count-to] elements up from 0 when they scroll
// into view — same GSAP/ScrollTrigger machinery as gsap-reveal.js, so
// it fires once and degrades gracefully (no GSAP or reduced motion:
// leave the static markup value alone) exactly like that component.
// Extended for this site: data-count-decimals="1" keeps decimals
// (1.2M, 1.3tr — put the unit outside the span).
const EASE = "power2.out";
const DURATION = 1.4;

export function initCountUp({ root = document } = {}) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const targets = root.querySelectorAll("[data-count-to]");
  if (!targets.length || !gsap || !ScrollTrigger || reduceMotion) return;

  gsap.registerPlugin(ScrollTrigger);

  targets.forEach((el) => {
    if (el.dataset.countUpInit) return;
    el.dataset.countUpInit = "true";

    const to = parseFloat(el.dataset.countTo);
    if (!Number.isFinite(to)) return;
    const decimals = parseInt(el.dataset.countDecimals || "0", 10);
    const format = (value) =>
      value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    const counter = { value: 0 };
    el.textContent = format(0);

    gsap.to(counter, {
      value: to,
      duration: DURATION,
      ease: EASE,
      onUpdate: () => {
        el.textContent = format(counter.value);
      },
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    });
  });
}
