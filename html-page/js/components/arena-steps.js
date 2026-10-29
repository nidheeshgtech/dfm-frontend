// ARENA — Discover / Subscribe / Trade steps (PRYPCO-style pinned scroll)
// Desktop (>=960px): the stage pins and steps swap with scroll progress.
// Mobile: steps stack; each one activates as it enters the viewport.
// Plain JS, no dependencies. Works alongside Lenis (reads window scroll).
// Version B (?how=b, .ars--deck): no pinned stage; each step is a card.
// Desktop (>=960px): the cards are sticky and stack, each later card
// sliding up over the one before, which shrinks a touch, steps up and dims
// (--depth, scrubbed both ways). The front card is the active one, so its
// pop-ups fly in each time it comes to the front. Below 960px they simply
// stack and play once.
import { initDotWave } from "./xp-wave.js";

// Version B: dot colour per step panel.
const DOTS = { discover: "#4a9fe0", subscribe: "#64fba0", trade: "#d6e84a" };

export function initArenaSteps(root = document) {
  root.querySelectorAll("[data-ars]").forEach((section) => {
    // The stacking deck is the default; ?how=a shows the pinned version.
    if (new URLSearchParams(window.location.search).get("how") === "a") section.classList.remove("ars--deck");
    const deck = section.classList.contains("ars--deck");
    // B: the Discover screen goes into the hand-held photo's screen box.
    const handScreen = deck && section.querySelector(".ars-handshot__screen");
    const discoverScreen = section.querySelector(".ars__step--discover .ars-phone__screen");
    if (handScreen && discoverScreen) handScreen.append(discoverScreen);
    // B: Subscribe and Trade screens go onto hand photos ([data-ars-photo],
    // natural size data-w × data-h, phone at data-fx / data-fy). Each photo
    // covers its panel, zoomed by data-zoom and shifted to keep the phone
    // centred; the screen box is mapped onto the photo's phone in CSS.
    if (deck) {
      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      section.querySelectorAll("[data-ars-photo]").forEach((photo) => {
        const step = photo.closest("[data-ars-step]");
        const screen = step?.querySelector(".ars-phone-wrap .ars-phone__screen");
        if (!screen) return;
        photo.querySelector(".ars-photo__screen").append(screen);
        const { w, h, fx, fy, zoom = 1 } = Object.fromEntries(Object.entries(photo.dataset).map(([k, v]) => [k, Number(v)]));
        photo.style.width = `${w}px`;
        photo.style.height = `${h}px`;
        const scene = photo.closest(".ars__scene");
        const fit = () => {
          const sw = scene.clientWidth;
          const sh = scene.clientHeight;
          const k = Math.max(sw / w, sh / h) * zoom;
          const tx = clamp(sw / 2 - fx * k, sw - w * k, 0);
          const ty = clamp(sh / 2 - fy * k, sh - h * k, 0);
          photo.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
        };
        fit();
        new ResizeObserver(fit).observe(scene);
      });
    }
    // Deck: each card gets its step number with a three-part progress bar
    // ("03 ▬▬▬") above the title and "01 Discover · 02 Subscribe · 03 Trade"
    // at the foot of the copy, this card's step lit (built from the titles).
    if (deck) {
      const cards = [...section.querySelectorAll("[data-ars-step]")];
      const titles = cards.map((c) => c.querySelector(".ars__name")?.textContent.trim() || "");
      cards.forEach((card, i) => {
        const copy = card.querySelector(".ars__copy");
        if (!copy) return;
        const num = document.createElement("span");
        num.className = "ars__num";
        num.setAttribute("aria-hidden", "true");
        num.style.setProperty("--s", i + 1);
        num.textContent = String(i + 1).padStart(2, "0");
        copy.querySelector(".ars__name")?.before(num);
        const track = document.createElement("ol");
        track.className = "ars__track";
        track.setAttribute("aria-hidden", "true");
        titles.forEach((t, j) => {
          const li = document.createElement("li");
          li.textContent = `${String(j + 1).padStart(2, "0")} ${t}`;
          if (j < i) li.className = "is-done";
          if (j === i) li.className = "is-on";
          track.append(li);
        });
        copy.append(track);
      });
    }

    // B: a rippling dot wave (the FAQ one) behind each phone.
    if (deck) {
      section.querySelectorAll("[data-ars-step]").forEach((step) => {
        const scene = step.querySelector(".ars__scene");
        const key = Object.keys(DOTS).find((k) => step.classList.contains(`ars__step--${k}`));
        if (!scene || !key) return;
        const dots = document.createElement("div");
        dots.className = "ars-dots";
        dots.setAttribute("aria-hidden", "true");
        dots.dataset.dotColor = DOTS[key];
        scene.prepend(dots);
        initDotWave(dots);
      });
    }
    const scroller = section.querySelector("[data-ars-scroller]");
    const steps = [...section.querySelectorAll("[data-ars-step]")];
    const rail = [...section.querySelectorAll("[data-ars-go]")];
    const panel = section.querySelector(".ars__panel");
    const mq = window.matchMedia("(min-width: 960px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let active = -1;
    let io = null;

    // count-up for prices on the v6 cards (e.g. AED 0.00 -> AED 1.20)
    function countUp(step) {
      if (reduce) return;
      step.querySelectorAll("[data-ars-count]").forEach((el) => {
        const to = parseFloat(el.dataset.to || "0");
        const dec = Number(el.dataset.dec || 2);
        const pre = el.dataset.pre || "";
        const t0 = performance.now();
        cancelAnimationFrame(el._raf);
        const tick = (t) => {
          const k = Math.min(1, (t - t0) / 900);
          el.textContent = pre + (to * (1 - Math.pow(1 - k, 3))).toFixed(dec);
          if (k < 1) el._raf = requestAnimationFrame(tick);
        };
        el._raf = requestAnimationFrame(tick);
      });
    }

    // types into the search field on the Discover screen while that step is active
    const typers = [...section.querySelectorAll("[data-ars-type]")].map((el) => ({
      el,
      step: el.closest("[data-ars-step]"),
      txt: el.querySelector(".ars-type__txt"),
      words: (el.dataset.words || "").split("|").filter(Boolean),
      run: 0,
    }));
    function startTyping(t) {
      const run = ++t.run;
      if (reduce) { t.txt.textContent = t.words[0] || ""; t.el.classList.add("is-typing", "has-text"); return; }
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const alive = () => run === t.run;
      (async () => {
        let w = 0;
        await wait(700);
        while (alive()) {
          const word = t.words[w % t.words.length];
          t.el.classList.add("is-typing");
          for (let k = 1; k <= word.length && alive(); k++) { t.txt.textContent = word.slice(0, k); t.el.classList.add("has-text"); await wait(110 + Math.random() * 70); }
          await wait(1800);
          for (let k = word.length - 1; k >= 0 && alive(); k--) { t.txt.textContent = word.slice(0, k); t.el.classList.toggle("has-text", k > 0); await wait(45); }
          if (!alive()) break;
          t.el.classList.remove("is-typing");
          await wait(700);
          w++;
        }
      })();
    }
    function stopTyping(t) { t.run++; t.txt.textContent = ""; t.el.classList.remove("is-typing", "has-text"); }
    function syncTyping() {
      typers.forEach((t) => {
        const on = t.step && t.step.classList.contains("is-active");
        if (on && !t.on) { t.on = true; startTyping(t); }
        else if (!on && t.on) { t.on = false; stopTyping(t); }
      });
    }

    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach((s, j) => {
        s.classList.toggle("is-active", j === i);
        s.classList.toggle("is-past", j < i);
      });
      if (panel) panel.style.setProperty("--ars-i", i);
      if (steps[i]) countUp(steps[i]);
      syncTyping();
    }

    const pinned = () => mq.matches && !deck;

    function onScroll() {
      if (!pinned()) return;
      const r = scroller.getBoundingClientRect();
      const span = scroller.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
      const n = steps.length;
      setActive(Math.min(n - 1, Math.floor(p * n * 0.9999)));
      rail.forEach((b, j) => {
        const local = Math.min(1, Math.max(0, p * n - j));
        b.style.setProperty("--p", local.toFixed(3));
        b.toggleAttribute("aria-current", j === active);
      });
    }

    rail.forEach((b) =>
      b.addEventListener("click", () => {
        const j = Number(b.dataset.arsGo);
        const span = scroller.offsetHeight - window.innerHeight;
        const top = window.scrollY + scroller.getBoundingClientRect().top + (span * (j + 0.15)) / steps.length;
        window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      })
    );

    let deckKick = null;

    function setupMode() {
      if (io) { io.disconnect(); io = null; }
      if (pinned()) {
        active = -1;
        onScroll();
      } else if (deck && mq.matches) {
        active = -1;
        steps.forEach((s) => s.classList.remove("is-active", "is-past"));
        deckKick?.();
      } else {
        // stacked: each step plays once when it scrolls into view and then
        // stays on (toggling it off and on again restarted the pop-ups and
        // count-ups mid-scroll, which read as a jerk on phones)
        active = -1;
        steps.forEach((s) => s.classList.remove("is-active", "is-past"));
        io = new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              e.target.classList.add("is-active");
              countUp(e.target);
              io.unobserve(e.target);
              syncTyping();
            }),
          { threshold: 0.25 }
        );
        steps.forEach((s) => io.observe(s));
      }
    }

    if (deck) deckKick = initDeck(steps, mq, reduce, setActive);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    mq.addEventListener ? mq.addEventListener("change", setupMode) : mq.addListener(setupMode);
    setupMode();
  });
}


// ---- Version B: sticky card deck ----
// --i offsets each card's sticky top so the edges of the cards behind show.
// For every card but the last, --depth (0 → 1) is how far the next card
// has slid over it; CSS turns it into scale, lift and a dimming veil.
function initDeck(steps, mq, reduce, setActive) {
  steps.forEach((s, i) => s.style.setProperty("--i", i));
  let raf = 0;

  const frame = () => {
    raf = 0;
    if (!mq.matches) {
      steps.forEach((s) => s.style.removeProperty("--depth"));
      return;
    }
    // Front card: the last one whose top has passed the middle of the screen.
    const mid = window.innerHeight * 0.5;
    let front = 0;
    steps.forEach((card, i) => {
      if (card.getBoundingClientRect().top < mid) front = i;
    });
    setActive(front);
    if (reduce) return;
    steps.forEach((card, i) => {
      const next = steps[i + 1];
      if (!next) return;
      const stick = parseFloat(getComputedStyle(next).top) || 0;
      const gap = next.getBoundingClientRect().top - stick;
      const depth = Math.min(1, Math.max(0, 1 - gap / card.offsetHeight));
      card.style.setProperty("--depth", depth.toFixed(3));
    });
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick, { passive: true });
  kick();
  return kick;
}
