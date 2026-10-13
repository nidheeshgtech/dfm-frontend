// "Your listing journey" tabs. Each [data-journey-tab] selects a step:
// the lime progress line grows to its dot, earlier steps become
// "visited", and the panel swaps photo (soft zoom + wipe in the line's
// direction) and caption (roll up). Arrow keys and Home / End work;
// ARIA tab pattern.
//
// Narrow (vertical stepper): the photo panel moves to sit right under the
// selected step, so the picture changes where you tapped — and the page
// is nudged so the tapped step doesn't jump.
export function initJourney() {
  document.querySelectorAll("[data-journey]").forEach(setup);
}

function setup(root) {
  const gsap = window.gsap;
  const tabs = Array.from(root.querySelectorAll("[data-journey-tab]"));
  const steps = root.querySelector(".journey-steps");
  const images = Array.from(root.querySelectorAll("[data-journey-img]"));
  const stepLabel = root.querySelector("[data-journey-step]");
  const copy = root.querySelector(".journey-panel__copy");
  const note = root.querySelector(".journey-panel__note");
  if (!tabs.length || !steps) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const vertical = window.matchMedia("(max-width: 899.98px)");
  let current = Math.max(0, tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"));

  // Panel follows the selected step on the vertical layout.
  const panel = root.querySelector(".journey-panel");
  const panelHome = panel?.parentNode;

  const placePanel = (index, animate) => {
    if (!panel) return;
    if (!vertical.matches) {
      if (panel.parentNode !== panelHome) panelHome.append(panel);
      return;
    }
    const tab = tabs[index];
    if (panel.previousElementSibling === tab) return;

    // Keep the tapped step where it is on screen while content moves.
    const before = tab.getBoundingClientRect().top;
    tab.after(panel);
    const delta = tab.getBoundingClientRect().top - before;
    if (Math.abs(delta) > 1) {
      if (window.lenis) window.lenis.scrollTo(window.scrollY + delta, { immediate: true, force: true });
      else window.scrollBy(0, delta);
    }

    if (animate && gsap && !reduceMotion) {
      gsap.fromTo(panel, { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out", clearProps: "opacity,transform" });
    }
  };

  // Line length up to the selected dot (centre of its card).
  const placeLine = () => {
    const dot = tabs[current].querySelector(".journey-step__dot");
    const box = steps.getBoundingClientRect();
    const d = dot.getBoundingClientRect();
    const length = vertical.matches ? d.top + d.height / 2 - box.top : d.left + d.width / 2 - box.left;
    steps.style.setProperty("--progress", `${Math.max(0, Math.round(length))}px`);
  };

  const select = (index, { focus = false, animate = true } = {}) => {
    index = Math.max(0, Math.min(tabs.length - 1, index));
    const from = current;
    current = index;

    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle("is-visited", i < index);
    });
    if (focus) tabs[index].focus({ preventScroll: true });
    placePanel(index, animate);

    // Wait a frame on the vertical layout so expanded text has resized.
    requestAnimationFrame(placeLine);
    if (vertical.matches) setTimeout(placeLine, 520);

    swapPanel(from, index, animate && !reduceMotion && gsap);
  };

  // A tab's photo may not have arrived yet (lazy / slow network): show
  // the shimmer over the panel until it has, then run the swap.
  const media = root.querySelector(".journey-panel__media");
  let pending = 0;

  const whenLoaded = (img) =>
    new Promise((resolve) => {
      if (img.complete && img.naturalWidth) return resolve();
      img.loading = "eager";
      const timer = setTimeout(resolve, 5000);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });

  const swapPanel = (from, to, motion) => {
    const incoming = images[to];
    if (!incoming || (incoming.complete && incoming.naturalWidth) || !media) {
      runSwap(from, to, motion);
      return;
    }

    const ticket = ++pending;
    media.classList.remove("is-loaded");
    media.classList.add("is-loading");
    whenLoaded(incoming).then(() => {
      if (ticket !== pending) return; // a newer tab click took over
      media.classList.remove("is-loading");
      media.classList.add("is-loaded");
      runSwap(from, to, motion);
    });
  };

  const runSwap = (from, to, motion) => {
    const label = tabs[to].dataset.label || "";
    const incoming = images[to];
    const outgoing = images[from];

    if (!motion || from === to) {
      images.forEach((img, i) => img.classList.toggle("is-active", i === to));
      if (stepLabel) {
        stepLabel.textContent = label;
        stepLabel.removeAttribute("aria-label");
      }
      return;
    }

    const forward = to > from;
    const wipeFrom = vertical.matches
      ? forward ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)"
      : forward ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";

    images.forEach((img) => gsap.killTweensOf(img));
    images.forEach((img, i) => {
      if (i !== to && i !== from) img.classList.remove("is-active");
    });

    incoming.classList.add("is-active");
    gsap.set(incoming, { zIndex: 2 });
    if (outgoing) gsap.set(outgoing, { zIndex: 1 });

    gsap.fromTo(
      incoming,
      { clipPath: wipeFrom, scale: 1.12 },
      {
        clipPath: "inset(0 0 0 0)",
        scale: 1,
        duration: 1.1,
        ease: "power3.inOut",
        onComplete: () => {
          if (outgoing && outgoing !== incoming) outgoing.classList.remove("is-active");
          gsap.set(incoming, { clearProps: "clipPath,zIndex" });
        },
      },
    );
    if (outgoing) gsap.to(outgoing, { scale: 1.05, duration: 1.1, ease: "power3.inOut", clearProps: "scale" });

    if (copy) rollCopy(gsap, stepLabel, note, label);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
    tab.addEventListener("keydown", (event) => {
      const keys = vertical.matches ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
      let target = null;
      if (event.key === keys[1]) target = i + 1;
      if (event.key === keys[0]) target = i - 1;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = tabs.length - 1;
      if (target === null) return;
      event.preventDefault();
      select(target, { focus: true });
    });
  });

  // Re-measure on resize / layout switch / font load.
  new ResizeObserver(() => placeLine()).observe(steps);
  vertical.addEventListener("change", () => select(current, { animate: false }));
  document.fonts?.ready.then(placeLine);

  select(current, { animate: false });

  // Once the section is close, fetch the other steps' photos in the
  // background so tab clicks are usually instant.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        whenLoaded(images[current]).then(() => images.forEach((img) => (img.loading = "eager")));
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(root);
  }
}

// ---- Caption roll ----
// Step label rolls letter by letter like a flip counter (old letters tip
// back over the top, new ones roll up from underneath); the note follows
// word by word. Screen readers get the plain text via aria-label.
function split(el, text, unit) {
  el.setAttribute("aria-label", text);
  el.textContent = "";
  const made = [];
  text.split(" ").forEach((word, i) => {
    if (i) el.append(" ");
    const wrap = document.createElement("span");
    wrap.className = "roll-word";
    wrap.setAttribute("aria-hidden", "true");
    // Letters sit inside a no-wrap word so lines still break only at spaces.
    (unit === "char" ? Array.from(word) : [word]).forEach((part) => {
      const span = document.createElement("span");
      span.className = "roll-unit";
      span.textContent = part;
      wrap.append(span);
      made.push(span);
    });
    el.append(wrap);
  });
  return made;
}

const units = (el) => (el ? Array.from(el.querySelectorAll(".roll-unit")) : []);

function rollCopy(gsap, stepLabel, note, label) {
  const targets = [stepLabel, note].filter(Boolean);
  gsap.killTweensOf(targets.flatMap(units));

  const out = gsap.timeline();
  if (stepLabel) {
    const old = units(stepLabel).length ? units(stepLabel) : split(stepLabel, stepLabel.textContent, "char");
    out.to(old, { rotateX: 90, yPercent: -60, opacity: 0, duration: 0.3, ease: "power2.in", stagger: 0.012 }, 0);
  }
  if (note) {
    const old = units(note).length ? units(note) : split(note, note.textContent, "word");
    out.to(old, { rotateX: 70, yPercent: -40, opacity: 0, duration: 0.25, ease: "power2.in", stagger: 0.004 }, 0);
  }

  out.add(() => {
    const tl = gsap.timeline();
    if (stepLabel) {
      tl.fromTo(
        split(stepLabel, label, "char"),
        { rotateX: -90, yPercent: 60, opacity: 0 },
        { rotateX: 0, yPercent: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)", stagger: 0.02 },
        0,
      );
    }
    if (note) {
      tl.fromTo(
        split(note, note.getAttribute("aria-label") || note.textContent, "word"),
        { rotateX: -70, yPercent: 50, opacity: 0, filter: "blur(4px)" },
        { rotateX: 0, yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "power3.out", stagger: 0.012 },
        0.12,
      );
    }
  });
}
