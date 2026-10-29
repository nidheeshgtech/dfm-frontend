// Invest hero device screens (index.html, .ivs-site / .ivs-dash): as each
// page scrolls inside its device, its parts rise in when they enter the
// screen and reset once they leave it, so every loop plays again. Inside a
// part, its text (tags, names, lines, facts, buttons) fades up one piece
// after another and every figure counts up from zero; parts that hold
// something animated (funding bars, the chart, the allocation bar) start
// it when they come in (.is-in, _iv-screens.scss). Reduced motion:
// everything shows as is.
const PARTS = [
  ".ivs-hero__title",
  ".ivs-hero__lead",
  ".ivs-toggle",
  ".ivs-sec__title",
  ".ivs-sec__lead",
  ".ivs-pills",
  ".ivs-card",
  ".ivs-sec > .ivs-btn",
  ".ivs-sec__head > .ivs-btn",
  ".ivs-pm__card",
  ".ivs-pm__row",
  ".ivs-ev",
  ".ivs-foot__cols > div",
  ".ivd-head__row",
  ".ivd-total",
  ".ivd-kpi",
  ".ivd-box",
  ".ivd-svc",
  ".ivd-note",
  ".ivd-wl__row",
  ".ivd-disc__row",
].join(", ");

// Pieces inside a part that fade up in turn.
const PIECES = [
  ".ivs-pills > span",
  ".ivs-card__body > *",
  ".ivs-card__box > p",
  ".ivs-tags > span",
  ".ivs-pm__body > *",
  ".ivs-pm__row > *",
  ".ivs-ev__body > *",
  ".ivd-head__row > div > *",
  ".ivd-total > *",
  ".ivd-kpi > *",
  ".ivd-box__head > div > *",
  ".ivd-box__head > .ivs-btn",
  ".ivd-box > .ivd-range",
  ".ivd-box > .ivd-perf",
  ".ivd-box > .ivd-split__legend",
  ".ivd-box > .ivd-tabs",
  ".ivd-note > *",
  ".ivd-wl__row > *",
  ".ivd-disc__row > *",
].join(", ");

// Figures that count; dates, times, phone numbers, IDs and quarters don't.
const NUM = /\d[\d,]*(?:\.\d+)?/g;
const SKIP = /:|AM|PM|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\+971|NIN|©|Q\d|@/;

export function initIvScreens() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  document.querySelectorAll(".ivs").forEach((page) => {
    const screen = page.parentElement;
    const parts = [...page.querySelectorAll(PARTS)];
    parts.forEach((el) => {
      el.setAttribute("data-ivs-r", "");
      const same = [...el.parentElement.children].filter((c) => c.matches(PARTS));
      el.style.setProperty("--d", `${Math.min(same.indexOf(el), 5) * 0.08}s`);
    });

    page.querySelectorAll(PIECES).forEach((el) => {
      if (el.hasAttribute("data-ivs-r")) return;
      el.setAttribute("data-ivs-c", "");
      const same = [...el.parentElement.children];
      el.style.setProperty("--i", Math.min(same.indexOf(el), 8));
    });

    // Each figure belongs to its nearest part and counts when that comes in.
    const figures = new Map();
    page.querySelectorAll("b, small, span, p, em, h4, h5").forEach((el) => {
      const text = el.textContent;
      if (el.children.length || !/\d/.test(text) || SKIP.test(text) || el.closest(".ivs-tick")) return;
      const part = el.closest("[data-ivs-r]");
      if (!part) return;
      if (!figures.has(part)) figures.set(part, []);
      figures.get(part).push({ el, text });
    });

    // A part is "in" when it is on its device screen AND the device is on
    // the page's screen (so nothing plays out of sight on load).
    const onScreen = new Set();
    let visible = false;
    const apply = (part) => {
      const on = visible && onScreen.has(part);
      if (on === part.classList.contains("is-in")) return;
      part.classList.toggle("is-in", on);
      if (on) figures.get(part)?.forEach(count);
    };

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) onScreen.add(e.target);
          else onScreen.delete(e.target);
          apply(e.target);
        }),
      { root: screen, threshold: 0.15 },
    );
    parts.forEach((el) => io.observe(el));

    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      parts.forEach(apply);
    }, { threshold: 0.5 }).observe(screen);
  });
}

// Counts every number in the text up from zero, keeping its decimals and
// thousands commas.
function count(fig) {
  const nums = [...fig.text.matchAll(NUM)].map(([m]) => ({
    value: Number(m.replace(/,/g, "")),
    dec: (m.split(".")[1] || "").length,
    commas: m.includes(","),
  }));
  const t0 = performance.now();
  const run = ++fig.run || (fig.run = 1);
  const step = (now) => {
    if (run !== fig.run) return;
    const p = Math.min(1, (now - t0) / 1300);
    const e = 1 - Math.pow(1 - p, 3);
    let i = 0;
    fig.el.textContent = fig.text.replace(NUM, () => {
      const { value, dec, commas } = nums[i++];
      const v = value * e;
      return commas ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
    });
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
