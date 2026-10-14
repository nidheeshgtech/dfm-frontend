// Hero load-in, one choreographed timeline:
//   1. eyebrow   — fades in while its letter-spacing settles
//   2. switch    — simple reveal: rises up into place
//   3. title     — each word rises out of its own mask, slight tilt
//   4. lead      — words drift up out of a soft blur, in a quick wave
//   5. buttons   — simple reveal: rise up into place, one after another
// Reduced motion / no GSAP: everything simply shows.
export function initHero() {
  const hero = document.querySelector("[data-hero]");
  const gsap = window.gsap;
  if (!hero) return;

  const eyebrow = hero.querySelector(".hero__intro .t-eyebrow");
  const sw = hero.querySelector(".switch");
  const title = hero.querySelector(".hero__title");
  const lead = hero.querySelector(".hero__lead");
  const buttons = Array.from(hero.querySelectorAll(".hero__actions [data-hero-intro]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const showAll = () => {
    hero.querySelectorAll("[data-hero-intro]").forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
    hero.classList.add("is-intro-done");
  };
  if (!gsap || reduceMotion) return showAll();

  const words = title ? splitWords(title, true) : [];
  const leadWords = lead ? splitWords(lead, false) : [];
  hero.classList.add("is-intro-ready"); // title can show now (words are masked)

  // Starting states.
  if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 10, letterSpacing: "0.5em" });
  if (sw) gsap.set(sw, { opacity: 0, y: 24 });
  gsap.set(words, { yPercent: 115, rotate: 4, transformOrigin: "0% 100%" });
  if (lead) gsap.set(lead, { opacity: 1 });
  gsap.set(leadWords, { opacity: 0, y: 14, filter: "blur(6px)" });
  gsap.set(buttons, { opacity: 0, y: 24 });

  // Waits for the page loader to lift (window.arenaLoaded, loader.js).
  const tl = gsap.timeline({ paused: true, delay: 0.05, defaults: { ease: "expo.out" }, onComplete: () => hero.classList.add("is-intro-done") });
  (window.arenaLoaded || Promise.resolve()).then(() => tl.play());

  if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, letterSpacing: "", duration: 1.4, ease: "power3.out", clearProps: "letterSpacing" }, 0);
  if (sw) tl.to(sw, { opacity: 1, y: 0, duration: 1, ease: "power3.out", clearProps: "transform" }, 0.15);
  tl.to(words, { yPercent: 0, rotate: 0, duration: 1.25, stagger: 0.08, clearProps: "transform" }, 0.35);
  tl.to(leadWords, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power3.out", stagger: 0.018, clearProps: "filter,transform" }, 0.85);
  tl.to(buttons, { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.12, clearProps: "transform" }, 1.0);
}

// Wrap each word in spans (keeps inner markup like .hero__line). Masked
// words get an overflow:hidden shell so they can rise out of a line.
function splitWords(root, masked) {
  const made = [];
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) return walk(child);
      if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(part);
        const word = document.createElement("span");
        word.className = "hero-word";
        word.textContent = part;
        if (masked) {
          const mask = document.createElement("span");
          mask.className = "hero-word-mask";
          mask.append(word);
          frag.append(mask);
        } else {
          frag.append(word);
        }
        made.push(word);
      });
      child.replaceWith(frag);
    });
  };
  walk(root);
  return made;
}
