// Page loader. Progress is real: hero images + web fonts + window load,
// shown through a smoothed counter (never jumps, never goes backwards).
// First visit in a session shows it for at least 2.8s; moving between
// pages after that keeps it shorter (1.2s). Phones get 1.2s / 0.6s and a
// quicker exit so the page shows sooner on slower connections. Exit: content lifts out, the panel
// sweeps up with a curved edge, and `window.arenaLoaded` resolves a moment
// before it clears so the hero intro starts underneath.
const MIN_FIRST = 2800;
const MIN_REPEAT = 1200;
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
  const phone = window.matchMedia("(max-width: 767px)").matches;
  const minTime = (seen ? MIN_REPEAT : MIN_FIRST) * (phone ? 0.45 : 1);
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
  // Invest page: the counter rolls as an odometer.
  const invest = document.body.classList.contains("page-invest") && !reduce && count;
  const roller = invest ? rollingCount(count) : null;
  const render = (v) => {
    el.style.setProperty("--p", v.toFixed(4));
    if (roller) roller(v);
    else if (count) count.textContent = Math.round(v * 100);
  };

  const tick = (now) => {
    if (finished) return;
    const elapsed = now - t0;
    const real = done / tasks.length;
    // Time also nudges it along so it never looks stuck.
    const timeShare = Math.min(1, elapsed / minTime);
    const target = Math.min(real, timeShare) * (real >= 1 ? 1 : 0.92);
    shown += (target - shown) * (reduce ? 1 : phone ? 0.14 : 0.08);
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

    const tl = gsap.timeline({ onComplete: clear });
    if (phone) tl.timeScale(1.6);

    tl.to(el.querySelectorAll(".loader__center, .loader__foot"), { y: -40, opacity: 0, duration: 0.6, ease: "power3.in", stagger: 0.06 }, 0.15)
      .to(el, { yPercent: -100, borderBottomLeftRadius: "50% 18vh", borderBottomRightRadius: "50% 18vh", duration: 1.1, ease: "power4.inOut" }, 0.5)
      .add(() => resolveDone(), 0.95); // hero intro starts as the curtain lifts
  }
}

// Invest page: the counter as a rolling odometer. Three digit windows
// (hundreds, tens, ones), each over a reel that only ever rolls up: the
// ones reel holds 0…100 (as digits 0–9 over and over), tens 0…10,
// hundreds 0…1, and each moves to floor(n / place), so 9 → 0 rolls on to
// the next 0 instead of spinning back. A window slides open when its
// place is needed (9 → 10, 99 → 100), so the number never jumps
// sideways. Each digit's colour follows the load through the site's
// palette, the left ones a touch ahead, so the number carries a blend.
const PALETTE = [
  [0, [163, 139, 242]], // purple tint
  [0.18, [185, 166, 255]],
  [0.4, [143, 208, 255]], // sky
  [0.68, [100, 251, 160]], // jade
  [1, [244, 255, 34]], // lime
];

function paletteAt(t) {
  const x = Math.min(1, Math.max(0, t));
  let i = 1;
  while (i < PALETTE.length - 1 && PALETTE[i][0] < x) i++;
  const [a, ca] = PALETTE[i - 1];
  const [b, cb] = PALETTE[i];
  const k = (x - a) / (b - a || 1);
  return `rgb(${ca.map((c, j) => Math.round(c + (cb[j] - c) * k)).join(", ")})`;
}

function rollingCount(count) {
  count.textContent = "";
  count.classList.add("is-rolling");
  // [place value, reel length]: hundreds, tens, ones.
  const places = [
    [100, 2],
    [10, 11],
    [1, 101],
  ].map(([unit, rows]) => {
    const win = document.createElement("span");
    win.className = "loader__digit";
    const strip = document.createElement("span");
    strip.className = "loader__strip";
    strip.innerHTML = Array.from({ length: rows }, (_, i) => `<i>${i % 10}</i>`).join("");
    win.append(strip);
    count.append(win);
    return { unit, win, strip };
  });
  return (v) => {
    const n = Math.round(v * 100);
    places.forEach(({ unit, win, strip }, i) => {
      win.classList.toggle("is-on", n >= unit || unit === 1);
      strip.style.setProperty("--d", Math.floor(n / unit));
      win.style.color = paletteAt(v + (1 - i) * 0.06);
    });
  };
}
