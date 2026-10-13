// Hero load-in: eyebrow, switch, lead and CTAs rise in one after another.
// The h1 is deliberately NOT hidden (it's the LCP element) — it only
// gets a small lift, never opacity 0.
export function initHero() {
  const hero = document.querySelector("[data-hero]");
  const gsap = window.gsap;
  if (!hero) return;

  const items = hero.querySelectorAll("[data-hero-intro]");
  const title = hero.querySelector(".hero__title");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!gsap || reduceMotion) {
    items.forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 1 }, delay: 0.1 });
  tl.fromTo(items, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.12 }, 0);
  if (title) tl.fromTo(title, { y: 20 }, { y: 0, duration: 1.2 }, 0.1);
}
