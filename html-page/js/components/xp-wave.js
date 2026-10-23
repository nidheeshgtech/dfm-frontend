// "A familiar investor experience" backdrop: the dot-wave artwork
// (dot_wave_transparent.svg, 2,368 dots → js/data/xp-wave.json) drawn on a
// canvas and set rippling — a slow travelling wave lifts the dots, crests
// catch the light (bigger + brighter), and on desktop the pointer pushes a
// soft swell through the fabric. Sits where the static xp-dots.webp was;
// the phone stays on top. Renders only while on screen.
//
// Any [data-dot-wave] box gets the same rippling dots as a backdrop
// (e.g. the invest FAQ panel); there the canvas just fills the box.
// initDotWave(box) does the same on demand; box.dataset.dotColor sets
// the dot colour (white by default).
//
// ?xpbg=v1 (or reduced motion / no canvas) keeps the static image.
const DATA_URL = new URL("../data/xp-wave.json", import.meta.url);

export function initXpWave() {
  if (new URLSearchParams(window.location.search).get("xpbg") === "v1") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll("[data-xp] .xp__visual").forEach((visual) => {
    setup(visual, "xp__wave").catch((e) => console.warn("xp-wave: keeping static dots", e));
  });
  document.querySelectorAll("[data-dot-wave]").forEach((box) => {
    setup(box, "dot-wave__canvas").catch((e) => console.warn("xp-wave: no dot wave", e));
  });
}

let data = null;

export function initDotWave(box) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setup(box, "dot-wave__canvas").catch((e) => console.warn("xp-wave: no dot wave", e));
}

async function setup(visual, className) {
  data ||= fetch(DATA_URL).then((r) => r.json());
  const { w: W, h: H, dots } = await data;
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  visual.prepend(canvas);
  visual.classList.add("has-wave");

  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let scale = 1;
  let ox = 0;
  let oy = 0;
  let dpr = 1;

  // object-fit: cover, object-position: 100% 0 — same crop as the old image.
  const resize = () => {
    const box = visual.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(box.width * dpr);
    const ch = Math.round(box.height * dpr);
    // Resizing a canvas wipes it — only do it when the size really changed.
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    scale = Math.max(box.width / W, box.height / H);
    ox = box.width - W * scale; // right-aligned
    oy = 0; // top-aligned
  };

  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, power: 0 };
  if (fine) {
    visual.addEventListener("pointermove", (e) => {
      const b = visual.getBoundingClientRect();
      pointer.tx = (e.clientX - b.left - ox) / scale;
      pointer.ty = (e.clientY - b.top - oy) / scale;
    });
    visual.addEventListener("pointerenter", () => (pointer.power = 1));
    visual.addEventListener("pointerleave", () => (pointer.power = 0));
  }

  let running = false;
  let swell = 0;
  const draw = (now) => {
    const t = now / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    swell += (pointer.power - swell) * 0.05;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = visual.dataset.dotColor || "#fff";

    for (let i = 0; i < dots.length; i++) {
      const [x, y, r, o] = dots[i];
      // Two crossing travelling waves → a slow cloth-like ripple.
      const w1 = Math.sin(x * 0.012 + y * 0.006 - t * 1.1);
      const w2 = Math.sin(x * -0.005 + y * 0.011 - t * 0.7 + 1.3);
      const wave = w1 * 0.65 + w2 * 0.35; // -1 … 1

      // Pointer swell: dots near the cursor lift and grow.
      let push = 0;
      if (swell > 0.01) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d2 = dx * dx + dy * dy;
        push = Math.exp(-d2 / 9000) * swell;
      }

      const lift = wave * 7 + push * 14;
      const light = 0.55 + 0.45 * (wave * 0.5 + 0.5) + push * 0.4;
      const px = ox + x * scale;
      const py = oy + (y - lift) * scale;
      const pr = Math.max(0.3, r * (0.75 + 0.35 * (wave * 0.5 + 0.5) + push * 0.5)) * scale;

      ctx.globalAlpha = Math.min(1, o * light);
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (running) requestAnimationFrame(draw);
  };

  const start = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(draw);
  };

  // Redraw straight away after any resize / move, so there's never an
  // empty frame (the visual moves between steps on mobile).
  new ResizeObserver(() => {
    resize();
    const keep = running;
    running = false;
    draw(performance.now());
    running = keep;
  }).observe(visual);
  resize();
  draw(performance.now());

  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : (running = false)), { rootMargin: "100px 0px" }).observe(visual);
  document.addEventListener("visibilitychange", () => (document.hidden ? (running = false) : start()));
}
