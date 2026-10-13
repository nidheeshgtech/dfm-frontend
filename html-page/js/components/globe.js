// Dotted globe (Figma "Locations" 2797:664) drawn on canvas from the
// 3,165 dot positions extracted from the design SVG (js/data/globe.json,
// 59KB vs the 800KB SVG). Dot radius in the design encodes depth (front
// dots are bigger), so it drives:
//   - intro: dots fade/grow in from the globe's centre outward
//   - idle: a band of light sweeps across, like the globe turning
//   - pointer: subtle parallax, deeper for front dots
// Pins (investor cards) are HTML on top; they pop in once the globe is up.
//
// v1 — kept as the fallback for globe3d.js (no WebGL) and for review via
// ?globe=v1. Backup of the original files: ../backups/globe-v1-canvas/.
const DATA_URL = new URL("../data/globe.json", import.meta.url);

export function initGlobe() {
  document.querySelectorAll("[data-globe]").forEach(setupFlatGlobe);
}

export async function setupFlatGlobe(root) {
  const canvas = root.querySelector("canvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  let data;
  try {
    data = await (await fetch(DATA_URL)).json();
  } catch (e) {
    console.error("globe: data failed to load", e);
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const { w: W, h: H, dots } = data;
  const rMin = Math.min(...dots.map((d) => d[2]));
  const rMax = Math.max(...dots.map((d) => d[2]));
  const cx = W / 2;
  const cy = H * 0.55;
  const maxDist = Math.hypot(W / 2, H);
  // Per-dot constants: depth 0 (back) → 1 (front), intro delay by distance.
  const meta = dots.map(([x, y, r]) => ({
    depth: (r - rMin) / (rMax - rMin || 1),
    delay: Math.hypot(x - cx, y - cy) / maxDist,
  }));

  let scale = 1;
  let dpr = 1;
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    scale = (box.width / W) * dpr;
    if (!running) draw(performance.now());
  };

  let intro = reduceMotion ? 1 : 0; // 0 → 1
  let introStart = null;
  let px = 0;
  let py = 0; // pointer offset, smoothed
  let tx = 0;
  let ty = 0;
  let visible = false;
  let running = false;

  const draw = (now) => {
    if (introStart !== null && intro < 1) intro = Math.min(1, (now - introStart) / 1800);
    px += (tx - px) * 0.08;
    py += (ty - py) * 0.08;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sweep: a soft vertical light band travelling left → right every 7s.
    const sweep = reduceMotion ? -1 : ((now / 7000) % 1) * 1.6 - 0.3;

    for (let i = 0; i < dots.length; i++) {
      const [x, y, r] = dots[i];
      const { depth, delay } = meta[i];
      const t = Math.min(1, Math.max(0, (intro * 1.6 - delay) / 0.6));
      if (t <= 0) continue;
      const ease = 1 - Math.pow(1 - t, 3);

      const band = sweep < 0 ? 0 : Math.max(0, 1 - Math.abs(x / W - sweep) / 0.12);
      const alpha = (0.28 + depth * 0.32 + band * 0.35) * ease;
      const ox = px * (0.3 + depth) * 14;
      const oy = py * (0.3 + depth) * 10;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = band > 0.5 ? "#4e17e5" : "#0d0e1a";
      ctx.beginPath();
      ctx.arc((x + ox) * scale, (y + oy) * scale, r * (0.6 + 0.4 * ease) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (running) requestAnimationFrame(draw);
  };

  const start = () => {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(draw);
  };
  const stop = () => {
    running = false;
  };

  new ResizeObserver(resize).observe(canvas);
  resize();

  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        if (introStart === null) {
          introStart = performance.now();
          root.classList.add("is-live");
        }
        start();
      } else {
        stop();
      }
    },
    { threshold: 0.15 },
  ).observe(root);

  if (reduceMotion) {
    root.classList.add("is-live");
    draw(performance.now());
  }

  if (finePointer && !reduceMotion) {
    root.addEventListener("pointermove", (event) => {
      const box = root.getBoundingClientRect();
      tx = ((event.clientX - box.left) / box.width - 0.5) * 2;
      ty = ((event.clientY - box.top) / box.height - 0.5) * 2;
    });
    root.addEventListener("pointerleave", () => {
      tx = 0;
      ty = 0;
    });
  }
}
