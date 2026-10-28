// Invest hero: the illustrative iVestor phone. Every few seconds the next
// floating activity chip beside the phone lights up. The portfolio chart
// grows out of a soft trend in a wave with a glowing cursor on its front,
// then ticks live (same feel as the Access screen in xp-app.js); the
// portfolio value counts up with the wave and follows the live tick. The
// wallet screen ([data-iv-wallet]) gets .is-live so its CSS animations
// (holding chart draw-in, scroll) start with it. Runs only while the hero
// is on screen. Reduced motion: first chip stays lit, static chart,
// nothing cycles.
const INTERVAL = 3200;

export function initInvestPhone() {
  const root = document.querySelector("[data-iv-phone]");
  if (!root) return;

  const chips = Array.from(root.querySelectorAll("[data-iv-chip]"));
  const wallet = root.querySelector("[data-iv-wallet]");
  if (!chips.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = -1;
  let timer = null;

  const show = (i) => {
    index = i % chips.length;
    chips.forEach((c, j) => c.classList.toggle("is-active", j === index));
  };

  if (reduceMotion) {
    show(0);
    return;
  }

  const chart = initChart(root);

  const start = () => {
    chart?.play();
    wallet?.classList.add("is-live");
    wallet?.classList.remove("is-paused");
    if (timer) return;
    show(index + 1);
    timer = setInterval(() => show(index + 1), INTERVAL);
  };
  const stop = () => {
    chart?.pause();
    wallet?.classList.add("is-paused");
    clearInterval(timer);
    timer = null;
  };

  (window.arenaLoaded || Promise.resolve()).then(() => {
    if (!("IntersectionObserver" in window)) return start();
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { threshold: 0.2 }).observe(root);
  });
}

// ---- Portfolio chart: rising wave + live tick ----
// The markup holds a coarse line (the static fallback). It is resampled
// into a denser line with a little market noise; both the line and its
// area start as a soft trend, and a wide wave front runs left → right
// easing the detail in. The cursor (dot + scan line) rides the front,
// then rests on the last value, which keeps drifting.
const W = 300;
const H = 70;

function initChart(root) {
  const gsap = window.gsap;
  const svg = root.querySelector("[data-iv-spark]");
  const cursor = root.querySelector("[data-iv-cursor]");
  const line = svg?.querySelector(".iv-phone__spark-line");
  const area = svg?.querySelector(".iv-phone__spark-area");
  const valueEl = root.querySelector("[data-iv-value]");
  const VALUE = valueEl ? Number(valueEl.textContent.replace(/[^\d.]/g, "")) : 0;
  const setValue = (v) => valueEl && (valueEl.textContent = Math.round(v).toLocaleString("en-US"));
  if (!gsap || !svg || !cursor || !line || !area) return null;

  const coarse = (line.getAttribute("d").match(/-?[\d.]+ -?[\d.]+/g) || []).map((p) => p.split(" ").map(Number));
  if (coarse.length < 2) return null;

  // Resample every 3 units, linear between markup points, plus a fixed
  // noise (sum of sines) so the detail differs from the trend.
  const pts = [];
  for (let x = 0, j = 0; x <= W; x += 3) {
    while (j < coarse.length - 2 && coarse[j + 1][0] < x) j++;
    const [x0, y0] = coarse[j];
    const [x1, y1] = coarse[j + 1];
    const base = y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1));
    const noise = 2.4 * Math.sin(x * 0.21) + 1.5 * Math.sin(x * 0.53 + 1) + 0.9 * Math.sin(x * 1.37 + 2);
    pts.push([x, Math.min(H - 4, Math.max(4, base + noise))]);
  }
  const n = pts.length - 1;

  // Soft trend (wide moving average, two passes): the shape it grows out of.
  let trend = pts.map(([, y]) => y);
  for (let pass = 0; pass < 2; pass++) {
    trend = trend.map((_, i) => {
      let sum = 0;
      let c = 0;
      for (let j = Math.max(0, i - 10); j <= Math.min(n, i + 10); j++) (sum += trend[j]), c++;
      return sum / c;
    });
  }

  const toD = (a) => a.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const render = (a) => {
    line.setAttribute("d", toD(a));
    area.setAttribute("d", `${toD(a)} L${W} ${H} L0 ${H} Z`);
  };
  const place = (x, y) => {
    cursor.style.setProperty("--x", `${(x / W) * 100}%`);
    cursor.style.setProperty("--y", `${(y / H) * 100}%`);
  };
  const smooth = (k) => k * k * (3 - 2 * k); // smoothstep: no overshoot

  svg.classList.add("is-wave");
  render(trend.map((y, i) => [pts[i][0], y]));

  const FRONT = 0.4; // width of the wave front (share of the chart)
  const o = { t: 0 };
  const draw = () => {
    const front = o.t * (1 + FRONT);
    const k = (x) => smooth(Math.min(1, Math.max(0, (front - x / W) / FRONT)));
    const a = pts.map(([x, y], i) => [x, trend[i] + (y - trend[i]) * k(x)]);
    render(a);
    // Cursor sits mid-front, interpolated between points so it glides.
    const f = Math.min(1, Math.max(0, front - FRONT * 0.5)) * n;
    const i0 = Math.floor(f);
    const i1 = Math.min(n, i0 + 1);
    const u = f - i0;
    place(a[i0][0] + (a[i1][0] - a[i0][0]) * u, a[i0][1] + (a[i1][1] - a[i0][1]) * u);
  };

  // Live tick: the last few points drift a little, the dot follows.
  const tail = 12;
  const drift = { v: 0 };
  let from = 0;
  let to = 0;
  const live = gsap.timeline({ repeat: -1, repeatDelay: 0.2, paused: true });
  live.to(drift, {
    v: 1,
    duration: 1.6,
    ease: "sine.inOut",
    onStart: () => {
      from = to;
      to = (Math.random() - 0.4) * 6;
    },
    onUpdate: () => {
      const off = from + (to - from) * drift.v;
      const a = pts.map(([x, y], i) => [x, Math.max(2, y - off * Math.max(0, 1 - (n - i) / tail))]);
      render(a);
      place(a[n][0], a[n][1]);
      setValue(VALUE + off * 45); // the line rises → the value rises
    },
  });

  const count = { v: VALUE * 0.96 };
  if (valueEl) setValue(count.v);

  const tl = gsap
    .timeline({ paused: true, delay: 0.3 })
    .to(count, { v: VALUE, duration: 2.8, ease: "power2.out", onUpdate: () => setValue(count.v) }, 0)
    .fromTo([line, area], { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0)
    .fromTo(cursor, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.2)
    .fromTo(o, { t: 0 }, { t: 1, duration: 2.8, ease: "sine.inOut", onUpdate: draw, onStart: draw }, 0)
    .add(() => {
      cursor.classList.add("is-live");
      live.play();
    }, 2.9);

  let played = false;
  return {
    play() {
      if (!played) {
        played = true;
        tl.play();
      } else if (tl.progress() < 1) tl.resume();
      else live.resume();
    },
    pause() {
      tl.pause();
      live.pause();
    },
  };
}
