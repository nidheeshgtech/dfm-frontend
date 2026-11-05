// Markets: stacking cards (heading scrolls away normally). Each
// .market is position:sticky (CSS, only in the media query below).
//
// "Deck" (after Skiper UI "Card stack scroll"): every card sticks at the
// same spot; as each new card rises in, the ones behind shrink, darken and
// step UP, so their top edges fan out above the current card. Each card's
// photo gets a gentle settle as it arrives.
const STACK_QUERY = "(min-width: 1024px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)";

export function initStack() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const lists = document.querySelectorAll("[data-stack]");
  if (!lists.length || !gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  revealCardContent(gsap);

  // matchMedia sets up / tears down the tweens as the query flips.
  const mm = gsap.matchMedia();
  mm.add(STACK_QUERY, () => {
    lists.forEach((list) => {
      setupDeck(list, Array.from(list.querySelectorAll("[data-stack-item]")));
    });

    return () => {
      document.querySelectorAll("[data-stack]").forEach((list) => list.classList.remove("markets__list--deck"));
    };
  });
}

// ---- Deck ----
// Each card's "depth" = how many later cards have (partly) landed on it,
// as a continuous value from their scroll progress. Depth drives scale,
// upward step and shade, so the motion is fully scrubbed and reversible.
function setupDeck(list, cards) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  list.classList.add("markets__list--deck");
  list.style.setProperty("--stack-n", cards.length);

  const SCALE_STEP = 0.06;
  const SHADE_STEP = 0.28;
  const parts = cards.map((item) => ({
    item,
    card: item.querySelector(".market__card"),
    shade: item.querySelector(".market__shade"),
    photo: item.querySelector(".market__media"),
  }));

  // Photo settles from a slight zoom as the card rises in.
  parts.forEach(({ item, photo }) => {
    if (!photo) return;
    gsap.fromTo(photo, { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: item, start: "top bottom", end: "top top", scrub: true } });
  });

  const update = () => {
    const vh = window.innerHeight;
    const step = parseFloat(getComputedStyle(list).getPropertyValue("--deck-peek")) || 24;
    // 0 → 1 as a card travels from the bottom of the screen to its slot.
    const landed = parts.map(({ item }) => {
      const top = item.getBoundingClientRect().top;
      const slot = parseFloat(getComputedStyle(item).top) || 0;
      return Math.min(1, Math.max(0, (vh - top) / Math.max(1, vh - slot)));
    });
    parts.forEach(({ card, shade }, i) => {
      let depth = 0;
      for (let j = i + 1; j < landed.length; j++) depth += landed[j];
      gsap.set(card, { scale: 1 - depth * SCALE_STEP, y: -depth * step, force3D: true });
      if (shade) gsap.set(shade, { opacity: Math.min(0.7, depth * SHADE_STEP) });
    });
  };

  ScrollTrigger.create({
    trigger: list,
    start: "top bottom",
    end: "bottom top",
    onUpdate: update,
    onRefresh: update,
  });
  update();
}

// ---- Card content reveal (all sizes) ----
// As each card comes up, its text rises out of a mask line by line:
// title, subtitle, description, then the glass box lifts in and its stats
// + button follow. Plays on the way down, reverses on the way back up.
function revealCardContent(gsap) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll("[data-stack-item]").forEach((item) => {
    const card = item.querySelector(".market__card");
    const lines = [".market__title", ".market__subtitle", ".market__text"].map((s) => item.querySelector(s)).filter(Boolean);
    const panel = item.querySelector(".market__panel");
    const bits = Array.from(item.querySelectorAll(".market__stat, .market__cta"));
    if (!card) return;

    gsap.set(lines, { yPercent: 60, opacity: 0, clipPath: "inset(0 0 100% 0)" });
    if (panel) gsap.set(panel, { y: 40, opacity: 0, scale: 0.97, transformOrigin: "50% 100%" });
    gsap.set(bits, { y: 18, opacity: 0 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    tl.to(lines, { yPercent: 0, opacity: 1, clipPath: "inset(0 0 0% 0)", duration: 0.9, stagger: 0.12 }, 0);
    if (panel) tl.to(panel, { y: 0, opacity: 1, scale: 1, duration: 0.9 }, 0.3);
    tl.to(bits, { y: 0, opacity: 1, duration: 0.6, stagger: 0.07 }, 0.5);

    window.ScrollTrigger.create({
      trigger: card,
      start: "top 65%",
      onEnter: () => tl.play(),
      onLeaveBack: () => tl.reverse(),
    });
  });
}
