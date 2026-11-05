// Invest page.
export function initInvestLoops() {
  playInView();
}

// "Why invest" render loops ([data-iv-video]): muted clips that play only
// while on screen. With reduced motion they stay on their poster.
function playInView() {
  const vids = Array.from(document.querySelectorAll("[data-iv-video]"));
  if (!vids.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return vids.forEach((v) => v.play().catch(() => {}));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())),
    { threshold: 0.25 },
  );
  vids.forEach((v) => io.observe(v));
}
