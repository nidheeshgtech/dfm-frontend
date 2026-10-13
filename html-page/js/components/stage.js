// Scroll-scrubbed shared background for hero + "What is ARENA".
// See scss/sections/_stage.scss for the markup contract.
//
//   data-stage="pan"    company: tall mesh photo pans up so its lower
//                       half (the full circle) comes into view, while
//                       scaling 1.15 → 1 — the camera pulling back.
//   data-stage="orbit"  investor: swirl rises from below the fold and
//                       grows (Figma: 1227px half-circle → 1460px full
//                       circle), fading 50% → 20%, while the backdrop
//                       goes light grey → near-black as section two
//                       arrives.
//
// Variants (pan only for now) — pick with data-stage-variant="v2" on the
// stage, or ?stage=v2 in the URL (wins, handy for side-by-side review):
//   v1  scroll-scrubbed pull-back (default)
//   v2  focus-pull intro on load, pull-back + slight dome rotation on
//       scroll, hero copy parallaxes away, cursor drift on the circle
//   v3  iris opens on load; on scroll a ghost exposure zooms faster and
//       converges onto the main one (tunnel depth); h1 lines split apart
//   v4  image holds in the hero; when section two arrives it PLAYS a
//       timed 1.6s lens twist (180° turn + zoom-out + motion blur),
//       reversing on the way back up — not scroll-scrubbed
//   v5  same timed trigger, no rotation: the long hero image zooms out,
//       softens and fades while banner-bg-short.webp (full circle) zooms
//       1.2 → 1 in through a soft circular reveal
//
// Adds .stage--live only once the animation is wired, so no-JS /
// reduced-motion / missing GSAP keep the per-section static backgrounds.
const SCRUB = 1.5;

function variantFor(stage) {
  const fromUrl = new URLSearchParams(window.location.search).get("stage");
  if (["v1", "v2", "v3", "v4", "v5"].includes(fromUrl)) return fromUrl;
  return stage.dataset.stageVariant || "v1";
}

export function initStage() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const stages = document.querySelectorAll("[data-stage]");
  if (!stages.length || !gsap || !ScrollTrigger) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  gsap.registerPlugin(ScrollTrigger);

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

    if (stage.dataset.stage === "orbit") {
      orbit(gsap, stage, bg, media, scrollTrigger);
    } else if (variantFor(stage) === "v2") {
      stage.classList.add("stage--v2");
      panV2(gsap, stage, media, scrollTrigger);
    } else if (variantFor(stage) === "v3") {
      stage.classList.add("stage--v3");
      panV3(gsap, stage, media, scrollTrigger);
    } else if (variantFor(stage) === "v4") {
      stage.classList.add("stage--v4");
      panV4(gsap, window.ScrollTrigger, stage, media);
    } else if (variantFor(stage) === "v5") {
      stage.classList.add("stage--v5");
      panV5(gsap, window.ScrollTrigger, stage, media);
    } else {
      pan(gsap, stage, media, scrollTrigger);
    }
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
    img,
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

// v2 — "focus pull + orbit".
function panV2(gsap, stage, media, scrollTrigger) {
  const { img, startScale, endScale, yFor } = panGeometry(media);
  const haze = stage.querySelector(".stage__haze");
  const hero = stage.querySelector(".hero");
  const heroCopy = hero ? hero.querySelectorAll(".hero__content, .hero__actions") : [];

  gsap.set(media, { transformOrigin: `50% ${PAN_CIRCLE_Y * 100}%` });
  if (img) gsap.set(img, { transformOrigin: `50% ${PAN_CIRCLE_Y * 100}%` });

  // 1. Load: lens focus — blurred, over-zoomed and dim → sharp.
  if (img) {
    gsap.fromTo(
      img,
      { filter: "blur(14px)", scale: 1.25, opacity: 0 },
      { filter: "blur(0px)", scale: 1, opacity: 1, duration: 1.8, ease: "power3.out", clearProps: "filter" },
    );
  }
  if (haze) gsap.fromTo(haze, { opacity: 0 }, { opacity: 1, duration: 1.6, delay: 0.5, ease: "power2.out" });

  // 2. Scroll: pull back to the full circle while the dome turns 8° → 0.
  gsap.fromTo(
    media,
    { y: yFor(0.14), scale: startScale, rotation: 8 },
    { y: yFor(0.5), scale: endScale, rotation: 0, ease: "none", scrollTrigger },
  );

  if (haze) {
    gsap.fromTo(
      haze,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "none",
        immediateRender: false, // let the load fade-in own the first frame
        scrollTrigger: { trigger: stage, start: "top top", end: "40% top", scrub: true },
      },
    );
  }

  // Hero copy drifts up faster than the page and fades — depth.
  if (heroCopy.length) {
    gsap.to(heroCopy, {
      y: -140,
      opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom 30%", scrub: true },
    });
  }

  // 3. Cursor drift: a few px of follow on fine pointers only.
  if (img && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const toX = gsap.quickTo(img, "x", { duration: 1.2, ease: "power3.out" });
    const toY = gsap.quickTo(img, "y", { duration: 1.2, ease: "power3.out" });
    window.addEventListener(
      "pointermove",
      (event) => {
        toX((event.clientX / window.innerWidth - 0.5) * -24);
        toY((event.clientY / window.innerHeight - 0.5) * -16);
      },
      { passive: true },
    );
  }
}

// v3 — "iris + double exposure".
function panV3(gsap, stage, media, scrollTrigger) {
  const { startScale, endScale, yFor } = panGeometry(media);
  const origin = `50% ${PAN_CIRCLE_Y * 100}%`;
  const haze = stage.querySelector(".stage__haze");
  const hero = stage.querySelector(".hero");

  // Ghost exposure: a clone of the media layer, screen-blended on top.
  const ghost = media.cloneNode(true);
  ghost.removeAttribute("data-stage-media");
  ghost.classList.add("stage__media--ghost");
  ghost.setAttribute("aria-hidden", "true");
  media.after(ghost);

  gsap.set([media, ghost], { transformOrigin: origin });

  // 1. Load: iris opens from the dome's centre over the navy.
  gsap.fromTo(
    [media, ghost],
    { clipPath: `circle(0% at ${origin})` },
    { clipPath: `circle(160% at ${origin})`, duration: 1.8, ease: "expo.out", clearProps: "clipPath" },
  );
  if (haze) gsap.fromTo(haze, { opacity: 0 }, { opacity: 1, duration: 1.4, delay: 0.6, ease: "power2.out" });

  // 2. Scroll: main layer pulls back as v1; ghost starts 35% bigger and
  //    faded, then converges to the exact same frame → one sharp image.
  gsap.fromTo(
    media,
    { y: yFor(0.14), scale: startScale },
    { y: yFor(0.5), scale: endScale, ease: "none", scrollTrigger },
  );
  gsap.fromTo(
    ghost,
    { y: yFor(0.14), scale: () => startScale() * 1.35, opacity: 0.45 },
    { y: yFor(0.5), scale: endScale, opacity: 0, ease: "none", scrollTrigger },
  );

  if (haze) {
    gsap.fromTo(
      haze,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "none",
        immediateRender: false,
        scrollTrigger: { trigger: stage, start: "top top", end: "40% top", scrub: true },
      },
    );
  }

  // 3. Title lines split apart (left / right) as the hero leaves.
  if (hero) {
    const lines = hero.querySelectorAll(".hero__line");
    const heroScroll = { trigger: hero, start: "top top", end: "bottom 25%", scrub: true };
    // Explicit from-values + immediateRender:false: hero.js is still
    // fading these in on load, so don't snapshot their mid-intro state.
    const away = (targets, to) =>
      gsap.fromTo(
        targets,
        { xPercent: 0, y: 0, opacity: 1 },
        { ...to, opacity: 0, ease: "none", immediateRender: false, scrollTrigger: { ...heroScroll } },
      );
    if (lines.length === 2) {
      away(lines[0], { xPercent: -18 });
      away(lines[1], { xPercent: 18 });
    }
    away(hero.querySelectorAll(".hero__intro, .hero__lead, .hero__actions"), { y: -60, stagger: 0.04 });
  }
}

// v4 — "lens twist": a timed transition between the two framings.
function panV4(gsap, ScrollTrigger, stage, media) {
  const { img, startScale, endScale, yFor } = panGeometry(media);
  const haze = stage.querySelector(".stage__haze");
  const next = stage.querySelector(".what-is");

  gsap.set(media, { transformOrigin: `50% ${PAN_CIRCLE_Y * 100}%` });

  // Hero framing, held while the hero is on screen.
  const hold = () => gsap.set(media, { y: yFor(0.14)(), scale: startScale(), rotation: 0 });
  hold();

  const build = () => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power4.inOut" } });
    tl.to(media, { y: yFor(0.5), rotation: 180, duration: 1.6 }, 0)
      // Overshoot a touch past the full-circle size, then settle.
      .to(media, { scale: () => endScale() * 0.94, duration: 1.2 }, 0)
      .to(media, { scale: endScale, duration: 0.6, ease: "power2.out" }, 1.1);
    if (img) {
      tl.to(img, { filter: "blur(6px)", duration: 0.7, ease: "power2.in" }, 0.1).to(
        img,
        { filter: "blur(0px)", duration: 0.8, ease: "power2.out" },
        0.8,
      );
    }
    if (haze) tl.to(haze, { opacity: 0, duration: 0.9, ease: "power2.out" }, 0);
    return tl;
  };

  let tl = build();
  let played = false;

  ScrollTrigger.create({
    trigger: next || stage,
    start: "top 70%",
    onEnter: () => {
      played = true;
      tl.timeScale(1).play();
    },
    onLeaveBack: () => {
      played = false;
      tl.timeScale(1.25).reverse();
    },
  });

  // Viewport changed: rebuild with fresh measurements, keep the state.
  ScrollTrigger.addEventListener("refreshInit", () => {
    tl.kill();
    gsap.set(img, { filter: "none" });
    hold();
    tl = build();
    if (played) tl.progress(1);
  });
}

// v5 — "dissolve swap": hero image hands over to the full-circle image.
const SWAP_SRC = "images/company/banner-bg-short.webp";

function panV5(gsap, ScrollTrigger, stage, media) {
  const { img, startScale, yFor } = panGeometry(media);
  const pin = stage.querySelector(".stage__pin");
  const haze = stage.querySelector(".stage__haze");
  const next = stage.querySelector(".what-is");

  // Second layer: the full-circle image, covering the viewport.
  const swap = document.createElement("div");
  swap.className = "stage__swap";
  swap.setAttribute("aria-hidden", "true");
  swap.innerHTML = `<img src="${SWAP_SRC}" width="1923" height="1042" alt="">`;
  (haze || media).before(swap);

  gsap.set(media, { transformOrigin: `50% ${PAN_CIRCLE_Y * 100}%` });
  const hold = () => gsap.set(media, { y: yFor(0.14)(), scale: startScale(), opacity: 1 });
  hold();
  gsap.set(swap, { opacity: 0, scale: 1.2, "--reveal": "0%" });

  const build = () => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    // Out: hero framing eases back, softens, fades.
    tl.to(media, { scale: () => startScale() * 0.85, opacity: 0, duration: 1.4 }, 0);
    if (img) tl.to(img, { filter: "blur(8px)", duration: 1.2, ease: "power2.in" }, 0);
    // In: full circle settles from 1.2 → 1 through a widening soft circle.
    tl.to(swap, { opacity: 1, duration: 0.9, ease: "power2.out" }, 0.25)
      .to(swap, { scale: 1, duration: 1.6, ease: "power3.out" }, 0.2)
      .to(swap, { "--reveal": "120%", duration: 1.4, ease: "power2.out" }, 0.2);
    if (haze) tl.to(haze, { opacity: 0, duration: 0.8, ease: "power2.out" }, 0);
    return tl;
  };

  let tl = build();
  let played = false;

  ScrollTrigger.create({
    trigger: next || stage,
    start: "top 70%",
    onEnter: () => {
      played = true;
      tl.timeScale(1).play();
    },
    onLeaveBack: () => {
      played = false;
      tl.timeScale(1.25).reverse();
    },
  });

  ScrollTrigger.addEventListener("refreshInit", () => {
    tl.kill();
    if (img) gsap.set(img, { filter: "none" });
    hold();
    gsap.set(swap, { opacity: 0, scale: 1.2, "--reveal": "0%" });
    tl = build();
    if (played) tl.progress(1);
  });

  if (pin) pin.classList.add("has-swap");
}

function orbit(gsap, stage, bg, media, scrollTrigger) {
  const FROM_SCALE = 0.84; // Figma: 1227px hero swirl vs 1460px full circle
  const vh = () => window.innerHeight;
  const h = () => media.offsetHeight;

  // Start: visible top edge of the (scaled-down) swirl at 56% of the
  // viewport, as in Figma, so only the upper half shows on any screen.
  // End: circle centred in the viewport.
  const startY = () => vh() * 0.56 - (h() * (1 - FROM_SCALE)) / 2;
  const endY = () => vh() * 0.5 - h() / 2;

  gsap.fromTo(
    media,
    { y: startY, scale: FROM_SCALE, opacity: 0.5 },
    { y: endY, scale: 1, opacity: 0.2, ease: "none", scrollTrigger },
  );

  // Backdrop colour follows section two's arrival, not the whole stage,
  // so its white heading lands on dark.
  const next = stage.querySelector(".what-is");
  gsap.fromTo(
    bg,
    { backgroundColor: "#f0f3f2" },
    {
      backgroundColor: "#07080f",
      ease: "none",
      scrollTrigger: {
        trigger: next || stage,
        start: "top bottom",
        end: "top 45%",
        scrub: true,
      },
    },
  );
}
