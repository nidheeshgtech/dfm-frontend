// Page loader. Progress is real: hero images + web fonts + window load,
// shown through a smoothed counter (never jumps, never goes backwards).
// First visit in a session shows it for at least 1.6s; moving between the
// two pages after that keeps it brief. Exit: content lifts out, the panel
// sweeps up with a curved edge, and `window.arenaLoaded` resolves a moment
// before it clears so the hero intro starts underneath.
const MIN_FIRST = 1600;
const MIN_REPEAT = 500;
const MAX_WAIT = 7000;

let resolveDone;
window.arenaLoaded = new Promise((r) => (resolveDone = r));

export function initLoader() {
  window.arenaLoaderRunning = true; // the inline failsafe in <head> stands down
  const el = document.querySelector("[data-loader]");
  const root = document.documentElement;
  if (!el) {
    root.classList.remove("is-page-loading");
    resolveDone();
    return;
  }

  const gsap = window.gsap;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = el.querySelector("[data-loader-count]");
  let seen = false;
  try {
    seen = sessionStorage.getItem("arena-loaded") === "1";
    sessionStorage.setItem("arena-loaded", "1");
  } catch {}
  const minTime = seen ? MIN_REPEAT : MIN_FIRST;
  const t0 = performance.now();

  window.lenis?.stop();

  // ---- What we wait for ----
  const heroImgs = Array.from(document.querySelectorAll(".stage img, [data-hero] img")).filter((img) => img.loading !== "lazy");
  const tasks = [
    ...heroImgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); }))),
    document.fonts ? document.fonts.ready : Promise.resolve(),
    document.readyState === "complete" ? Promise.resolve() : new Promise((r) => window.addEventListener("load", r, { once: true })),
  ];
  let done = 0;
  tasks.forEach((t) => t.then(() => done++));

  // ---- Smoothed progress ----
  let shown = 0;
  let finished = false;
  const render = (v) => {
    el.style.setProperty("--p", v.toFixed(4));
    if (count) count.textContent = Math.round(v * 100);
  };

  const tick = (now) => {
    if (finished) return;
    const elapsed = now - t0;
    const real = done / tasks.length;
    // Time also nudges it along so it never looks stuck.
    const timeShare = Math.min(1, elapsed / minTime);
    const target = Math.min(real, timeShare) * (real >= 1 ? 1 : 0.92);
    shown += (target - shown) * (reduce ? 1 : 0.08);
    if (target >= 1 && 1 - shown < 0.004) shown = 1;
    render(shown);
    if (shown >= 1) return exit();
    if (elapsed > MAX_WAIT) {
      shown = 1;
      render(1);
      return exit();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ---- Exit ----
  function exit() {
    finished = true;
    const clear = () => {
      el.classList.add("is-gone");
      root.classList.remove("is-page-loading");
      window.lenis?.start();
      window.ScrollTrigger?.refresh();
    };

    if (reduce || !gsap) {
      resolveDone();
      el.style.transition = "opacity 0.3s";
      el.style.opacity = "0";
      setTimeout(clear, 320);
      return;
    }

    const variant = ["type", "aperture", "shutter", "glass", "dots", "arch", "split", "counter"].find((v) => root.classList.contains(`loader-${v}`));
    const tl = gsap.timeline({ onComplete: clear });

    if (variant === "aperture") {
      // The window opens to the whole screen — the page is already behind it.
      tl.to(el.querySelectorAll(".loader__center, .loader__foot"), { opacity: 0, duration: 0.4, ease: "power2.in" }, 0.1)
        .to(el, { "--open": 1, duration: 1.4, ease: "power3.in" }, 0.25)
        .add(() => resolveDone(), 0.85);
      return;
    }

    if (variant === "split") {
      tl.to(el.querySelectorAll(".loader__center, .loader__foot, .loader__glow"), { opacity: 0, duration: 0.4, ease: "power2.in" }, 0.1)
        .to(el.querySelector(".loader__split i"), { opacity: 0, duration: 0.3 }, 0.3)
        .to(el.querySelector(".loader__split span:first-child"), { xPercent: -100, duration: 1.1, ease: "power4.inOut" }, 0.35)
        .to(el.querySelector(".loader__split span:nth-child(2)"), { xPercent: 100, duration: 1.1, ease: "power4.inOut" }, 0.35)
        .add(() => resolveDone(), 0.75);
      return;
    }

    if (variant === "arch") {
      tl.to(el.querySelectorAll(".loader__center, .loader__foot"), { opacity: 0, y: -30, duration: 0.5, ease: "power3.in" }, 0.1)
        .to(el.querySelector(".loader__arch"), { scale: 3.2, opacity: 0, duration: 1.2, ease: "power3.in" }, 0.2);
    }

    if (variant === "counter") {
      tl.to(el.querySelector(".loader__count span"), { yPercent: -110, duration: 0.7, ease: "power3.in" }, 0.1)
        .to(el.querySelectorAll(".loader__center, .loader__tag, .loader__bar, .loader__count sup"), { opacity: 0, duration: 0.4 }, 0.15);
    }

    if (variant === "shutter") {
      tl.to(el.querySelectorAll(".loader__center, .loader__foot"), { opacity: 0, y: -30, duration: 0.5, ease: "power3.in" }, 0.1)
        .to(el.querySelectorAll(".loader__cols span"), { yPercent: -100, duration: 0.9, ease: "power4.inOut", stagger: 0.08 }, 0.35)
        .to(el.querySelector(".loader__glow"), { opacity: 0, duration: 0.6 }, 0.35)
        .add(() => resolveDone(), 0.75);
      return;
    }

    if (variant === "glass") {
      tl.to(el.querySelector(".loader__center"), { y: -40, scale: 0.96, opacity: 0, duration: 0.6, ease: "power3.in" }, 0.1)
        .to(el.querySelector(".loader__foot"), { opacity: 0, duration: 0.4 }, 0.1)
        .to(el, { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 0.45)
        .add(() => resolveDone(), 0.55);
      return;
    }

    if (variant === "type") {
      tl.to(el.querySelectorAll(".loader__type span"), { yPercent: -120, opacity: 0, duration: 0.8, ease: "power3.in", stagger: 0.06 }, 0.1)
        .to(el.querySelectorAll(".loader__center, .loader__foot"), { opacity: 0, duration: 0.4 }, 0.1);
    } else if (!variant) {
      tl.to(el.querySelectorAll(".loader__center, .loader__foot"), { y: -40, opacity: 0, duration: 0.6, ease: "power3.in", stagger: 0.06 }, 0.15);
    }
    tl.to(el, { yPercent: -100, borderBottomLeftRadius: "50% 18vh", borderBottomRightRadius: "50% 18vh", duration: 1.1, ease: "power4.inOut" }, variant === "type" ? 0.65 : 0.5)
      .add(() => resolveDone(), variant === "type" ? 1.1 : 0.95); // hero intro starts as the curtain lifts
  }
}
