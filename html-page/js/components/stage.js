// Scroll-scrubbed shared background for hero + "What is ARENA".
// See scss/sections/_stage.scss for the markup contract.
//
//   data-stage="pan"    company: tall mesh photo pans up so its lower
//                       half (the full circle) comes into view, while
//                       scaling down — the camera pulling back.
//
// Adds .stage--live only once the animation is wired, so no-JS /
// reduced-motion / missing GSAP keep the per-section static backgrounds.
const SCRUB = 1.5;

export function initStage() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const stages = document.querySelectorAll("[data-stage]");
  if (!stages.length || !gsap || !ScrollTrigger) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  gsap.registerPlugin(ScrollTrigger);
  // Mobile address bar showing/hiding resizes the viewport; don't
  // recalculate every trigger mid-scroll for that (causes jumps).
  ScrollTrigger.config({ ignoreMobileResize: true });

  stages.forEach((stage) => {
    const bg = stage.querySelector(".stage__pin");
    const media = stage.querySelector("[data-stage-media]");
    if (!bg || !media) return;

    stage.classList.add("stage--live");

    const scrollTrigger = {
      trigger: stage,
      start: "top top",
      end: "bottom bottom",
      scrub: SCRUB,
      invalidateOnRefresh: true,
    };

    pan(gsap, stage, media, scrollTrigger);
  });

  // Images decide the media height the tweens are measured against.
  stages.forEach((stage) => {
    stage.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    });
  });
}

// Circle geometry measured on images/company/banner-bg-long.webp.
const PAN_CIRCLE_Y = 0.674; // hole centre, fraction of image height
const PAN_CIRCLE_D = 0.416; // hole diameter, fraction of image width

// Figma hero: you're inside the oval — opening ~80% of the width,
// centre near the top, its lower curve closing under the text.
// Figma "What is ARENA": the full circle, ~47% wide, centred.
// transform-origin sits on the circle centre, so scaling never moves it;
// y just parks that centre at a fraction of the viewport height.
function panGeometry(media) {
  const img = media.querySelector("img");
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const hole = () => (img ? img.offsetWidth : vw()) * PAN_CIRCLE_D;

  return {
    startScale: () => Math.max(1.2, (vw() * 0.8) / hole()),
    endScale: () => Math.max(1, (vw() * 0.47) / hole()),
    yFor: (fraction) => () => vh() * fraction - media.offsetHeight * PAN_CIRCLE_Y,
  };
}

function pan(gsap, stage, media, scrollTrigger) {
  const { startScale, endScale, yFor } = panGeometry(media);

  gsap.set(media, { transformOrigin: `50% ${PAN_CIRCLE_Y * 100}%` });
  gsap.fromTo(
    media,
    { y: yFor(0.14), scale: startScale },
    { y: yFor(0.5), scale: endScale, ease: "none", scrollTrigger },
  );

  // Silver haze inside the opening (Figma: sky through the oval) fades
  // out as the camera pulls back.
  const haze = stage.querySelector(".stage__haze");
  if (haze) {
    gsap.fromTo(
      haze,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: stage, start: "top top", end: "45% top", scrub: true },
      },
    );
  }
}
