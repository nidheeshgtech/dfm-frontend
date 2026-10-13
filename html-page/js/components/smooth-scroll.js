import Lenis from "../vendor/lenis.js";

// Site-wide smooth scrolling. Lenis drives its own rAF loop (autoRaf)
// and already respects prefers-reduced-motion on its own (default
// respectReducedMotion: true), so reduced-motion users still get
// normal instant scrolling with no extra check needed here.
export function initSmoothScroll() {
  const lenis = new Lenis({
    autoRaf: true,
    lerp: 0.1,
    wheelMultiplier: 1,
  });

  // Lenis animates scroll itself rather than moving the native
  // scrollbar frame-by-frame, so anything watching window scroll
  // events directly (ScrollTrigger, in gsap-reveal.js) never fires
  // without this — keep it in sync on every Lenis tick.
  if (window.ScrollTrigger) {
    lenis.on("scroll", window.ScrollTrigger.update);
  }

  bindAnchorLinks(lenis);

  // Shared handle so overlays (video modal) can pause page scrolling.
  window.lenis = lenis;

  return lenis;
}

// Same-page hash links (header nav, "All products →", etc.) normally
// jump instantly via the browser's native hash navigation, which
// bypasses Lenis entirely and fights the smooth-scroll everywhere
// else on the site. Intercepting the click and driving it through
// lenis.scrollTo ourselves — rather than Lenis's own `anchors` option,
// which doesn't preventDefault and so races the native jump — is what
// actually makes it smooth. The header is fixed and overlays content,
// so the target lands just below it rather than under it.
function bindAnchorLinks(lenis) {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href*="#"]');
    if (!link) return;

    const url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return;

    const target = document.querySelector(decodeURIComponent(url.hash));
    if (!target) return;

    event.preventDefault();
    const headerHeight = parseFloat(getComputedStyle(document.body).getPropertyValue("--header-height")) || 80;
    // Full-screen sections opt out of the header gap with
    // data-scroll-offset="0" so they fill the viewport exactly and
    // nothing from the section above peeks in at the top.
    const offset = target.dataset.scrollOffset !== undefined ? -parseFloat(target.dataset.scrollOffset) || 0 : -(headerHeight + 16);
    // An explicit duration + easeInOutCubic reads as a deliberate,
    // gentle glide (slow-in, fast-middle, slow-out) — the default
    // lerp-only scroll (used for wheel/drag) settles the same way
    // every time regardless of distance, which feels abrupt on a
    // long jump like this.
    lenis.scrollTo(target, {
      offset,
      duration: 1.2,
      easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    });
  });
}
