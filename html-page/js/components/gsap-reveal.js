// GSAP/ScrollTrigger-powered replacement for the old IntersectionObserver
// fade-and-rise (see scroll-reveal.js, kept for reference/rollback — swap
// the import in main.js to bring it back). Same markup contract:
// [data-scroll-reveal] singles fade+rise in on their own, direct children
// of [data-scroll-reveal-group] do the same but staggered one after
// another. Both fire once, on the way into view, and never reverse.
//
// Uses gsap.set + gsap.to (not gsap.from) deliberately: .from() tweens
// FROM the given values TO the element's current computed value — since
// our CSS already parks these elements at opacity:0, that made .from()
// a same-to-same no-op. Explicitly setting the start state and tweening
// to the real end state sidesteps that. Also: `once: true` was flaky
// under rapid/synthetic scroll (fires onEnter but the animation never
// advances) — `toggleActions: "play none none none"` is the more
// reliable idiomatic one-shot equivalent.
const EASE = "power3.out";
const DURATION = 1.1;
const STAGGER = 0.12;
const RISE = 28;
const SCALE_FROM = 0.97;

function revealSet(gsap, targets) {
  gsap.set(targets, { opacity: 0, y: RISE, scale: SCALE_FROM });
}

// ScrollTrigger measures every trigger's position once, and re-measures
// on its own only on window load/resize. Other components change the
// page height after that: cascade cards collapse from their no-JS
// (all-open) layout, skeletons swap in, lazy images arrive. On
// /quantum-resilient-vpn/ the "why" cards collapsing took ~1900px off the
// page whenever they initialised after this file, so every reveal below
// them waited for a point far past where its content now sat, and the
// sovereignty section stayed invisible on a first, uncached visit.
// Re-measure (debounced) whenever the document's height changes.
let layoutWatcher = null;

function watchLayoutShifts(ScrollTrigger) {
  if (layoutWatcher || !("ResizeObserver" in window)) return;

  let timer = null;
  let lastHeight = document.documentElement.scrollHeight;

  layoutWatcher = new ResizeObserver(() => {
    const height = document.documentElement.scrollHeight;
    if (height === lastHeight) return;
    lastHeight = height;
    clearTimeout(timer);
    timer = setTimeout(() => ScrollTrigger.refresh(), 150);
  });
  layoutWatcher.observe(document.body);
}

export function initScrollReveal({ root = document } = {}) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  const singles = root.querySelectorAll("[data-scroll-reveal]");
  const groups = root.querySelectorAll("[data-scroll-reveal-group]");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No GSAP (blocked/failed to load) or reduced motion: just show
  // everything immediately rather than leaving it stuck hidden.
  if (!gsap || !ScrollTrigger || reduceMotion) {
    singles.forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
    groups.forEach((group) => {
      Array.from(group.children).forEach((child) => {
        child.style.opacity = 1;
        child.style.transform = "none";
      });
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  watchLayoutShifts(ScrollTrigger);

  singles.forEach((el) => {
    if (el.dataset.scrollRevealInit) return;
    el.dataset.scrollRevealInit = "true";

    revealSet(gsap, el);
    gsap.to(el, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: DURATION,
      ease: EASE,
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    });
  });

  groups.forEach((group) => {
    if (group.dataset.scrollRevealInit) return;
    group.dataset.scrollRevealInit = "true";
    const children = Array.from(group.children);
    if (!children.length) return;

    revealSet(gsap, children);
    gsap.to(children, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: DURATION,
      ease: EASE,
      stagger: STAGGER,
      scrollTrigger: {
        trigger: group,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    });
  });
}
