// Invest hero v3 (index-v3.html, .iv-hero--flow): scrubbed scroll
// choreography that makes the three beats feel like one section. As the
// first screen scrolls away, the centred intro drifts up and dims; the
// iVestor phone rises out of a slight 3D tilt and settles flat while its
// chips glide in from the sides. Runs both ways. Desktop only, and not
// with reduced motion (the layout reads fine static).
const QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

export function initIvFlow() {
  const hero = document.querySelector(".iv-hero--flow");
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!hero || !gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const intro = hero.querySelector(".iv-flow__intro");
  const stage = hero.querySelector(".iv-flow__stage");
  const phone = stage?.querySelector(".iv-phone");
  const chips = Array.from(stage?.querySelectorAll(".iv-chip") || []);
  if (!intro || !stage || !phone) return;

  const mm = gsap.matchMedia();
  mm.add(QUERY, () => {
    // 1 → 2: intro lifts away.
    gsap.to(intro.querySelectorAll(".iv-hero__top, .iv-hero__copy, .iv-flow__cue"), {
      y: -90,
      opacity: 0.15,
      ease: "none",
      stagger: 0.04,
      scrollTrigger: { trigger: intro, start: "top top", end: "bottom 20%", scrub: 0.6 },
    });

    // Phone rises and straightens.
    gsap.set(stage, { perspective: 1400 });
    gsap.fromTo(
      phone,
      { y: 160, scale: 0.84, rotateX: 22, opacity: 0.35, transformOrigin: "50% 100%" },
      {
        y: 0,
        scale: 1,
        rotateX: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: stage, start: "top bottom", end: "top 25%", scrub: 0.6 },
      },
    );

    // Chips glide in from their own side.
    chips.forEach((chip, i) => {
      const fromLeft = chip.classList.contains("iv-chip--1") || chip.classList.contains("iv-chip--4");
      gsap.fromTo(
        chip,
        // Slide + blur (their opacity belongs to invest-phone.js's
        // active / dim cycle).
        { x: fromLeft ? -90 : 90, filter: "blur(10px)" },
        {
          x: 0,
          filter: "blur(0px)",
          ease: "none",
          scrollTrigger: { trigger: stage, start: `top ${85 - i * 6}%`, end: `top ${35 - i * 4}%`, scrub: 0.6 },
        },
      );
    });

    return () => gsap.set([phone, ...chips], { clearProps: "all" });
  });
}
