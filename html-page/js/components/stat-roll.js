// Odometer figures: each digit of a [data-roll] number (e.g. "992",
// "17.2") is a vertical strip of 0–9 that spins and lands on its digit
// when the figures scroll into view, the rightmost digit spinning most
// and each figure a beat after the one before. The wrapping [data-roll-group]
// gets .is-in at the same moment (its divider lines draw in, labels rise).
// In the hero they wait for the page loader and the hero intro first.
// Reduced motion or no IntersectionObserver: the static number stays.
export function initStatRoll() {
  const groups = document.querySelectorAll("[data-roll-group]");
  if (!groups.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

  groups.forEach((group) => {
    group.classList.add("is-roll");
    group.querySelectorAll("[data-roll]").forEach((el, n) => {
      const text = el.dataset.roll;
      el.setAttribute("aria-label", text);
      el.textContent = "";
      const digits = [...text].filter((c) => /\d/.test(c)).length;
      let fromRight = digits;
      [...text].forEach((ch) => {
        if (!/\d/.test(ch)) {
          const s = document.createElement("span");
          s.className = "roll__sep";
          s.setAttribute("aria-hidden", "true");
          s.textContent = ch;
          el.append(s);
          return;
        }
        fromRight -= 1;
        const d = Number(ch);
        const cycles = 3 - Math.min(fromRight, 2); // rightmost spins most
        const box = document.createElement("span");
        box.className = "roll";
        box.setAttribute("aria-hidden", "true");
        const ghost = document.createElement("span");
        ghost.className = "roll__ghost";
        ghost.textContent = ch;
        const strip = document.createElement("span");
        strip.className = "roll__strip";
        for (let k = 0; k <= cycles * 10 + d; k++) {
          const i = document.createElement("span");
          i.textContent = String(k % 10);
          strip.append(i);
        }
        strip.style.setProperty("--to", cycles * 10 + d);
        strip.style.transitionDelay = `${n * 0.18 + (digits - 1 - fromRight) * 0.08}s`;
        box.append(ghost, strip);
        el.append(box);
      });
    });

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        // Next frame, so the strips start from 0 before they move.
        requestAnimationFrame(() => requestAnimationFrame(() => group.classList.add("is-in")));
      },
      { threshold: 0.4 },
    );
    // Figures in the hero are on screen at load: wait for the page loader
    // and the hero's own intro (buttons land ~1.5s after it) so they roll
    // in last instead of behind the loader.
    if (group.closest("[data-hero]")) {
      (window.arenaLoaded || Promise.resolve()).then(() => setTimeout(() => io.observe(group), 1700));
    } else {
      io.observe(group);
    }
  });
}
