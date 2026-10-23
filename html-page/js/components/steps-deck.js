// Invest page, "When an offer goes live" as a stacked deck: the step
// cards are sticky (CSS, desktop only); this works out how far each later
// card has landed on the ones before it and writes that as --depth, which
// the CSS turns into shrink + step up + dim. Fully scrubbed, so it runs
// both ways. Same idea as the markets deck in stack.js.
import { initDotWave } from "./xp-wave.js";

const DECK_QUERY = "(min-width: 1024px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)";

export function initStepsDeck() {
  const ScrollTrigger = window.ScrollTrigger;
  const list = document.querySelector("[data-steps-deck]");
  if (!list || !ScrollTrigger) return;
  const cards = Array.from(list.querySelectorAll("[data-steps-card]"));

  // Card / screen options for approval (default j):
  //   ?steps=a | b | c  dark cards, light screens
  //   ?steps=d | e | f  white cards, dark screens
  //   ?steps=g | h | i  D plus a background on the left: swirl / rings / dot wave
  //   ?steps=j          aurora cards, app-window screens, step tracker
  //   ?steps=k          the light version of j
  //   ?steps=l          k with a masked photo behind each window
  //   ?steps=m          the dark version of l
  // ?steps= wins; otherwise a page can pick its own (body data-steps-skin).
  const param = new URLSearchParams(window.location.search).get("steps") || document.body.dataset.stepsSkin;
  const skin = [..."abcdefghijklm"].includes(param) ? param : "j";
  list.closest(".iv-steps")?.setAttribute("data-skin", skin);

  // J / K / L: "01 Discover · 02 Subscribe · 03 Trade" under each card's copy,
  // built from the step titles, with this card's step lit.
  if ("jklm".includes(skin)) {
    const titles = cards.map((c) => c.querySelector(".iv-steps__title")?.textContent.trim() || "");
    cards.forEach((card, i) => {
      const track = document.createElement("ol");
      track.className = "iv-steps__track";
      track.setAttribute("aria-hidden", "true");
      titles.forEach((t, j) => {
        const li = document.createElement("li");
        li.textContent = `${String(j + 1).padStart(2, "0")} ${t}`;
        if (j < i) li.className = "is-done";
        if (j === i) li.className = "is-on";
        track.append(li);
      });
      card.append(track);
    });
  }
  // I: each card's dot wave, drawn in that step's colour.
  if (skin === "i") {
    cards.forEach((c) => {
      const bg = c.querySelector(".iv-steps__bg");
      if (!bg) return;
      bg.dataset.dotColor = getComputedStyle(c).getPropertyValue("--acc").trim() || "#4e17e5";
      initDotWave(bg);
    });
  }

  // J / K / L: the app window sits flat; while the front card (the one not
  // covered by the next) is hovered it tilts in 3D after the pointer, with
  // a glare sliding across it, and eases back flat on leave. Cards behind
  // in the stack ignore the pointer. Fine pointers on desktop only.
  if ("jklm".includes(skin) && window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)").matches) {
    cards.forEach((card) => {
      const screen = card.querySelector(".iv-screen");
      if (!screen) return;
      let frame = null;
      const reset = () => {
        card.classList.remove("is-tilting");
        ["--rx", "--ry", "--gx", "--gy"].forEach((p) => screen.style.removeProperty(p));
      };
      card.addEventListener("pointermove", (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          // Only the active card: another card has (mostly) landed on it.
          if ((parseFloat(card.style.getPropertyValue("--depth")) || 0) > 0.15) return reset();
          const box = card.getBoundingClientRect();
          const x = (e.clientX - box.left) / box.width - 0.5; // -0.5 … 0.5
          const y = (e.clientY - box.top) / box.height - 0.5;
          card.classList.add("is-tilting");
          screen.style.setProperty("--ry", `${(x * 26).toFixed(2)}deg`);
          screen.style.setProperty("--rx", `${(-y * 18).toFixed(2)}deg`);
          screen.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
          screen.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
        });
      });
      card.addEventListener("pointerleave", reset);
    });
  }

  const mq = window.matchMedia(DECK_QUERY);

  const update = () => {
    if (!mq.matches) return cards.forEach((c) => c.style.removeProperty("--depth"));
    const vh = window.innerHeight;
    // 0 → 1 as a card travels from the bottom of the screen to its slot.
    const landed = cards.map((c) => {
      const top = c.getBoundingClientRect().top;
      const slot = parseFloat(getComputedStyle(c).top) || 0;
      return Math.min(1, Math.max(0, (vh - top) / Math.max(1, vh - slot)));
    });
    cards.forEach((c, i) => {
      let depth = 0;
      for (let j = i + 1; j < landed.length; j++) depth += landed[j];
      c.style.setProperty("--depth", depth.toFixed(3));
      // Covered by the next card: drop any hover tilt.
      if (depth > 0.15 && c.classList.contains("is-tilting")) {
        c.classList.remove("is-tilting");
        const sc = c.querySelector(".iv-screen");
        ["--rx", "--ry", "--gx", "--gy"].forEach((p) => sc?.style.removeProperty(p));
      }
    });
  };

  ScrollTrigger.create({ trigger: list, start: "top bottom", end: "bottom top", onUpdate: update, onRefresh: update });
  mq.addEventListener("change", update);
  update();
}
