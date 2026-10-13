// "A familiar investor experience": accordion (one open at a time) that
// auto-plays while in view — the top line fills over each step's
// duration, then the next opens. Any click / key takes over and stops
// autoplay. The phone spotlight moves to the screen area for the step.
//
// Tablet / mobile (single column): the phone visual moves INSIDE the open
// step, under its text, and pans to that step's part of the screen — so
// the picture changes right where you tapped. No autoplay there.
const STEP_MS = 6000;

export function initInvestorXp() {
  document.querySelectorAll("[data-xp]").forEach(setup);
}

function setup(root) {
  const gsap = window.gsap;
  const steps = Array.from(root.querySelectorAll("[data-xp-step]"));
  const fill = root.querySelector(".xp-steps__fill");
  const spot = root.querySelector(".xp__spot");
  if (!steps.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stacked = window.matchMedia("(max-width: 1023.98px)");
  const visual = root.querySelector(".xp__visual");
  const visualHome = visual?.parentNode;
  const phone = visual?.querySelector(".xp__phone");
  const screens = Array.from(root.querySelectorAll("[data-xp-screen]"));
  let current = 0;
  let auto = !reduceMotion && !stacked.matches;
  let timer = null;

  // Pan the phone so the step's spot sits mid-frame (stacked only).
  const pan = () => {
    if (!phone) return;
    if (!stacked.matches) {
      phone.style.removeProperty("translate");
      return;
    }
    const frame = visual.clientHeight;
    const height = phone.offsetHeight;
    // Each step has its own screen now: show the phone from the top.
    const y = Math.min(0, Math.max(frame - height, screens.length ? 0 : frame / 2 - (parseFloat(steps[current].dataset.spot || "50") / 100) * height));
    phone.style.translate = `0 ${Math.round(y)}px`;
  };

  // Put the visual in the open step (stacked) or back in its column.
  const placeVisual = (animate) => {
    if (!visual) return;
    if (!stacked.matches) {
      visual.classList.remove("is-inline");
      if (visual.parentNode !== visualHome) visualHome.append(visual);
      pan();
      return;
    }
    const target = steps[current].querySelector(".xp-step__inner");
    if (visual.parentNode !== target) {
      visual.classList.add("is-inline");
      target.append(visual);
      if (animate && gsap && !reduceMotion) {
        // Only the phone animates in — the dot backdrop stays steady
        // (no flash of the background on every step change).
        if (phone) gsap.fromTo(phone, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.05 });
      }
    }
    requestAnimationFrame(pan);
  };

  const open = (index) => {
    current = index;
    steps.forEach((step, i) => {
      const active = i === index;
      step.classList.toggle("is-open", active);
      step.querySelector("[aria-expanded]").setAttribute("aria-expanded", String(active));
    });
    if (spot) spot.style.setProperty("--spot-y", steps[index].dataset.spot || "50%");
    // One phone screen per step (cross-fade).
    screens.forEach((img, i) => img.classList.toggle("is-active", i === Math.min(index, screens.length - 1)));
    placeVisual(true);
    playLine();
  };

  // Line = overall progress: segment i fills from i/n to (i+1)/n.
  const playLine = () => {
    if (!fill) return;
    const n = steps.length;
    const from = (current / n) * 100;
    const to = ((current + 1) / n) * 100;
    if (!gsap) {
      fill.style.width = `${to}%`;
      return;
    }
    gsap.killTweensOf(fill);
    if (!auto) {
      gsap.to(fill, { width: `${to}%`, duration: 0.6, ease: "power3.out" });
      return;
    }
    gsap.fromTo(
      fill,
      { width: `${from}%` },
      { width: `${to}%`, duration: STEP_MS / 1000, ease: "none", onComplete: () => auto && open((current + 1) % n) },
    );
  };

  const takeOver = () => {
    auto = false;
    clearTimeout(timer);
  };

  steps.forEach((step, i) => {
    const btn = step.querySelector("[aria-expanded]");
    btn.addEventListener("click", () => {
      takeOver();
      open(i);
    });
    btn.addEventListener("keydown", (event) => {
      const map = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: steps.length - 1 };
      if (!(event.key in map)) return;
      event.preventDefault();
      const target = (map[event.key] + steps.length) % steps.length;
      steps[target].querySelector("[aria-expanded]").focus();
    });
  });

  open(0);

  stacked.addEventListener("change", () => {
    if (stacked.matches) takeOver();
    placeVisual(false);
    playLine();
  });
  window.addEventListener("resize", () => requestAnimationFrame(pan));
  visual?.querySelector(".xp__screen")?.addEventListener("load", pan);

  // Autoplay only while the section is on screen.
  if (auto && gsap && "IntersectionObserver" in window) {
    gsap.getTweensOf(fill).forEach((t) => t.pause());
    new IntersectionObserver(([entry]) => {
      gsap.getTweensOf(fill).forEach((t) => (entry.isIntersecting ? t.resume() : t.pause()));
    }, { threshold: 0.35 }).observe(root);
  }
}
