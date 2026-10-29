// Looping card visuals on the invest page: "Why invest on ARENA" (4),
// "How you earn" (3) and "When an offer goes live" (3). Each
// [data-iv-loop] element gets its own GSAP timeline that repeats while
// the card is on screen and pauses when it leaves. Without JS (or with
// reduced motion) the visuals stay as the static markup draws them.
export function initInvestLoops() {
  const gsap = window.gsap;
  const els = Array.from(document.querySelectorAll("[data-iv-loop]"));
  if (!gsap || !els.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  els.forEach((el) => {
    const build = LOOPS[el.dataset.ivLoop];
    if (!build) return;
    el.classList.add("is-loop");
    const tl = build(el, gsap);
    if (!tl) return;
    tl.pause();
    if (!("IntersectionObserver" in window)) return tl.play();
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.25 }).observe(el);
  });
}

const q = (el, s) => el.querySelector(s);
const qa = (el, s) => Array.from(el.querySelectorAll(s));
const toggle = (els, cls, on) => [].concat(els).forEach((e) => e && e.classList.toggle(cls, on));

// ---- Isometric "Why" illustrations: one short move each, played once ----
const ISO = { C: Math.cos(Math.PI / 6), S: 0.5 };
const isoPt = (o, x, y, z) => [o.cx + (x - y) * ISO.C * o.s, o.cy + (x + y) * ISO.S * o.s - z * o.s];
const pts = (o, list) => list.map(([x, y, z]) => isoPt(o, x, y, z).map((n) => n.toFixed(2)).join(",")).join(" ");
// Redraws a box (left, right, top polygons) at height h.
function setBox(g, o, [x, y, z, w, d], h) {
  const [l, r, t] = g.querySelectorAll("polygon");
  l.setAttribute("points", pts(o, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]));
  r.setAttribute("points", pts(o, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]));
  t.setAttribute("points", pts(o, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]));
  g.querySelector("polyline")?.setAttribute("points", pts(o, [[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y, z + h]]));
}

const LOOPS = {
  // 01: the steps build up left to right, the building drops onto the
  // top step, then the marker lands on the first step.
  "iso-stage"(el, gsap) {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(qa(el, ".iso-step"), { y: 18, opacity: 0, duration: 0.6, stagger: 0.12 })
      .from(q(el, ".iso-tower"), { y: -24, opacity: 0, duration: 0.6 }, "-=0.2")
      .from(q(el, ".iso-marker .iso-pin, .iso-marker .iso-pin-dot"), { y: -46, opacity: 0, duration: 0.7, ease: "bounce.out" }, "+=0.1")
      .from(q(el, ".iso-marker .iso-pin-dot"), { y: -46, opacity: 0, duration: 0.7, ease: "bounce.out" }, "<")
      .from(q(el, ".iso-shadow"), { scale: 0.2, opacity: 0, transformOrigin: "50% 50%", duration: 0.7 }, "<");
    return tl;
  },

  // 02: the columns rise one after another (redrawn in iso, no squash),
  // then the offer-price plane settles onto them.
  "iso-demand"(el, gsap) {
    const svg = q(el, "svg");
    const [cx, cy, s] = (svg.dataset.iso || "150,58,10").split(",").map(Number);
    const o = { cx, cy, s };
    const cols = qa(el, "[data-iso-col]").map((g) => ({ g, spec: JSON.parse(g.dataset.isoCol), k: { v: 0 } }));
    cols.forEach((c) => setBox(c.g, o, c.spec, 0.01));
    const tl = gsap.timeline();
    cols.forEach((c, i) =>
      tl.to(c.k, { v: 1, duration: 0.7, ease: "power3.out", onUpdate: () => setBox(c.g, o, c.spec, Math.max(0.01, c.spec[5] * c.k.v)) }, i * 0.07),
    );
    tl.from(q(el, "[data-iso-plane]"), { y: -26, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.2");
    return tl;
  },

  // 03: tiles set down in a row, the block hops along them to the end,
  // then the shield pops up.
  "iso-chain"(el, gsap) {
    const block = q(el, "[data-iso-block]");
    const path = JSON.parse(block.dataset.isoPath);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(qa(el, ".iso-tile"), { y: 12, opacity: 0, duration: 0.5, stagger: 0.1 })
      .from(q(el, ".iso-track"), { opacity: 0, duration: 0.4 })
      .from(block, { y: -30, opacity: 0, duration: 0.5, ease: "bounce.out" });
    path.slice(1).forEach(([x, y], i) => {
      const [px, py] = path[i];
      tl.to(block, { x: (px + x) / 2, y: (py + y) / 2 - 10, duration: 0.22, ease: "power1.out" }, "+=0.12")
        .to(block, { x, y, duration: 0.22, ease: "power1.in" });
    });
    tl.from(q(el, ".iso-shieldg"), { scale: 0.4, opacity: 0, transformOrigin: "50% 100%", duration: 0.5, ease: "back.out(2)" }, "+=0.05");
    return tl;
  },

  // 04: the ID card slides in, its links draw out, and the three market
  // blocks light up in their colours one after another.
  "iso-account"(el, gsap) {
    const blocks = qa(el, "[data-iso-mkt]");
    const links = qa(el, "[data-iso-link]");
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(q(el, "[data-iso-card]"), { x: -30, y: -16, opacity: 0, duration: 0.8 })
      .from(blocks, { y: 14, opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.3")
      .from(links, { opacity: 0, duration: 0.3, stagger: 0.15 });
    blocks.forEach((b, i) => tl.call(() => b.classList.add("is-lit"), null, `>-${i ? 0 : 0.1}`).to({}, { duration: 0.25 }));
    return tl;
  },

  // ---- Why 1: progress runs offer stage → listing day → IPO ----
  stage(el, gsap) {
    const fill = q(el, ".iv-stage-fill");
    const steps = qa(el, ".iv-stage-step");
    const reset = () => toggle(steps.slice(1), "is-hit", false);
    return gsap
      .timeline({ repeat: -1, onRepeat: reset })
      .fromTo(fill, { scaleX: 0, opacity: 1 }, { scaleX: 0.5, duration: 1.4, ease: "power2.inOut" }, 0.3)
      .call(() => toggle(steps[1], "is-hit", true), null, 1.7)
      .to(fill, { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, 2.3)
      .call(() => toggle(steps[2], "is-hit", true), null, 3.7)
      .to(fill, { opacity: 0, duration: 0.5 }, 5)
      .call(reset, null, 5.2)
      .to({}, { duration: 0.3 }, 5.5);
  },

  // ---- Why 2: demand builds, shifts, and the offer price follows ----
  demand(el, gsap) {
    const bars = qa(el, ".iv-demand i");
    const price = q(el, ".iv-demand__price");
    const profiles = [
      [28, 42, 58, 76, 92, 70, 50, 34, 22],
      [22, 34, 50, 66, 80, 90, 72, 46, 28],
      [34, 52, 72, 90, 78, 60, 44, 30, 20],
    ];
    const lines = ["30%", "24%", "28%"];
    const tl = gsap.timeline({ repeat: -1 });
    tl.fromTo(bars, { height: "4%" }, { height: (i) => `${profiles[0][i]}%`, duration: 0.9, ease: "power3.out", stagger: 0.06 }, 0)
      .fromTo(price, { opacity: 0, top: lines[0] }, { opacity: 1, duration: 0.5 }, 0.8);
    [1, 2, 0].forEach((p, k) => {
      const at = 2.2 + k * 1.8;
      tl.to(bars, { height: (i) => `${profiles[p][i]}%`, duration: 1.2, ease: "sine.inOut", stagger: 0.03 }, at)
        .to(price, { top: lines[p], duration: 1.2, ease: "sine.inOut" }, at + 0.1);
    });
    return tl
      .to(price, { opacity: 0, duration: 0.4 }, 8)
      .to(bars, { height: "4%", duration: 0.6, ease: "power2.in", stagger: 0.04 }, 8);
  },

  // ---- Why 3: each step ticks green in turn, then the DFM bar shines ----
  chain(el, gsap) {
    const steps = qa(el, "span");
    const bar = q(el, "b");
    const reset = () => {
      toggle(steps, "is-on", false);
      toggle(bar, "is-sweep", false);
    };
    reset();
    const tl = gsap.timeline({ repeat: -1, onRepeat: reset });
    steps.forEach((s, i) => tl.call(() => toggle(s, "is-on", true), null, 0.4 + i * 0.55));
    return tl.call(() => toggle(bar, "is-sweep", true), null, 2.7).to({}, { duration: 2 }, 3);
  },

  // ---- Why 4: Subscribe → Hold → Trade, holdings shift with it ----
  account(el, gsap) {
    const pill = q(el, ".iv-account__pill");
    const tabs = qa(el, ".iv-account__seg b");
    const rows = qa(el, ".iv-account__row");
    const bars = rows.map((r) => q(r, "em"));
    const fills = [
      [70, 20, 10],
      [70, 55, 40],
      [45, 75, 85],
    ];
    const tl = gsap.timeline({ repeat: -1 });
    fills.forEach((f, k) => {
      const at = k * 1.8;
      tl.to(pill, { xPercent: k * 100, duration: 0.6, ease: "power3.inOut" }, at)
        .call(() => tabs.forEach((t, i) => toggle(t, "is-on", i === k)), null, at + 0.25)
        .call(() => rows.forEach((r, i) => toggle(r, "is-on", i === k)), null, at + 0.25)
        .to(bars, { "--f": (i) => `${f[i]}%`, duration: 0.9, ease: "power2.out" }, at + 0.3);
    });
    return tl.to({}, { duration: 0.1 }, 5.3);
  },

  // ---- Earn 1: value line draws from offer price toward the IPO ----
  growth(el, gsap) {
    const svg = q(el, "svg");
    const clip = q(el, "[data-iv-clip]");
    const reveal = q(el, "[data-iv-reveal]");
    const path = q(el, ".iv-earn__line");
    const dot = q(el, ".iv-earn__dot--end");
    const mark = q(el, ".iv-earn__mark--end");
    if (!svg || !clip || !path || !dot) return null;

    // Sample the curve once so the dot can sit on it at any x.
    const len = path.getTotalLength();
    const pts = Array.from({ length: 121 }, (_, i) => path.getPointAtLength((len * i) / 120));
    const yAt = (x) => {
      const j = Math.max(1, pts.findIndex((p) => p.x >= x));
      const a = pts[j - 1];
      const b = pts[j] || a;
      return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x || 1));
    };
    const x0 = pts[0].x;
    const x1 = pts[pts.length - 1].x;
    const o = { x: x0 };
    const draw = () => {
      clip.setAttribute("width", o.x);
      dot.setAttribute("cx", o.x);
      dot.setAttribute("cy", yAt(o.x));
    };

    return gsap
      .timeline({ repeat: -1 })
      .set(reveal, { opacity: 1 }, 0)
      .fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0)
      .set(mark, { opacity: 0, y: 6 }, 0)
      .fromTo(o, { x: x0 }, { x: x1, duration: 2.6, ease: "power1.inOut", onUpdate: draw, onStart: draw }, 0.2)
      .to(mark, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, 2.7)
      .to(dot, { attr: { r: 9 }, duration: 0.25, yoyo: true, repeat: 1 }, 2.7)
      .to([reveal, dot, mark], { opacity: 0, duration: 0.5 }, 5)
      .to({}, { duration: 0.3 }, 5.5);
  },

  // ---- Earn 2: payouts land one period at a time ----
  dividend(el, gsap) {
    const bars = qa(el, ".iv-payouts i");
    const coins = bars.map((b) => q(b, "b"));
    const gap = 0.45;
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(bars, { opacity: 1 }, 0);
    bars.forEach((bar, i) => {
      tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "power3.out" }, i * gap)
        .fromTo(coins[i], { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "bounce.out" }, i * gap + 0.25);
    });
    const end = bars.length * gap + 1.8;
    return tl.to(bars, { opacity: 0, duration: 0.5, stagger: 0.04 }, end).to({}, { duration: 0.3 }, end + 0.7);
  },

  // ---- Earn 3: a scanner crosses the private bar; windows light as it passes ----
  exit(el, gsap) {
    const bar = q(el, ".iv-exit__bar--windows");
    const wins = qa(bar, "i");
    const scan = q(bar, "em");
    if (!bar || !scan) return null;
    const spans = [8, 43, 78].map((l) => [l, l + 14]);
    const o = { p: 0 };
    return gsap.timeline({ repeat: -1 }).fromTo(
      o,
      { p: 0 },
      {
        p: 100,
        duration: 4.5,
        ease: "none",
        onUpdate: () => {
          scan.style.left = `${o.p}%`;
          wins.forEach((w, i) => toggle(w, "is-on", o.p >= spans[i][0] && o.p <= spans[i][1]));
        },
      },
    );
  },

  // ---- Step 1: search, filter, tap an offer, open its document ----
  discover(el, gsap) {
    const text = q(el, "[data-iv-type]");
    const chips = qa(el, ".iv-screen__filters b");
    const [growth, priv] = qa(el, ".iv-screen__row");
    const doc = q(el, ".iv-screen__doc");
    const placeholder = text.textContent;
    const tl = gsap.timeline({ repeat: -1 });
    const filter = (i) => chips.forEach((c, k) => toggle(c, "is-on", k === i));
    const type = (word, at) => {
      [...word].forEach((_, i) => tl.call(() => ((text.textContent = word.slice(0, i + 1)), toggle(text, "is-typed", true)), null, at + i * 0.08));
      return at + word.length * 0.08;
    };
    const pick = (row, other, chip, word, at) => {
      const t = type(word, at);
      tl.call(() => (filter(chip), toggle(other, "is-dim", true), toggle(row, "is-dim", false)), null, t + 0.2)
        .call(() => toggle(row, "is-tap", true), null, t + 0.9)
        .call(() => (toggle(row, "is-tap", false), toggle(doc, "is-ping", true)), null, t + 1.5)
        .call(() => toggle(doc, "is-ping", false), null, t + 2.2);
    };
    pick(growth, priv, 1, "Growth", 0.4);
    pick(priv, growth, 2, "Private", 3.3);
    return tl
      .call(() => ((text.textContent = placeholder), toggle(text, "is-typed", false), filter(0), toggle([growth, priv], "is-dim", false)), null, 6.4)
      .to({}, { duration: 1 }, 6.5);
  },

  // ---- Step 2: type the amount, check the fields, submit ----
  subscribe(el, gsap) {
    const amount = q(el, "[data-iv-amount]");
    const fields = qa(el, ".iv-screen__field");
    const btn = q(el, ".iv-screen__btn");
    const label = btn.textContent;
    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => (amount.textContent = "0"), null, 0);
    ["1", "10", "100", "1,000", "10,000"].forEach((v, i) => tl.call(() => (amount.textContent = v), null, 0.4 + i * 0.18));
    fields.forEach((f, i) => {
      tl.call(() => toggle(f, "is-focus", true), null, 1.5 + i * 0.6).call(() => toggle(f, "is-focus", false), null, 2 + i * 0.6);
    });
    return tl
      .call(() => toggle(btn, "is-press", true), null, 2.9)
      .call(() => (toggle(btn, "is-press", false), toggle(btn, "is-done", true), (btn.textContent = "Subscription sent ✓")), null, 3.1)
      .call(() => (toggle(btn, "is-done", false), (btn.textContent = label)), null, 5)
      .to({}, { duration: 0.4 }, 5.1);
  },

  // ---- Step 3: allocation lands, price line draws, Buy ↔ Sell ----
  trade(el, gsap) {
    const note = q(el, ".iv-screen__note");
    const chart = q(el, ".iv-screen__chart");
    const pill = q(el, ".iv-screen__pill");
    const [buy, sell] = qa(el, ".iv-screen__side b");
    const side = (s) => {
      gsap.to(pill, { xPercent: s ? 100 : 0, duration: 0.5, ease: "power3.inOut" });
      toggle(buy, "is-on", !s);
      toggle(sell, "is-on", s);
    };
    // Wipe the line in from the left. (A pathLength dash draw breaks
    // here: the stroke is non-scaling, so the dash maths runs in screen
    // units and leaves gaps.)
    return gsap
      .timeline({ repeat: -1 })
      .fromTo(note, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.8)" }, 0)
      .fromTo(chart, { clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0% 0 0)", duration: 1.8, ease: "power2.inOut" }, 0.4)
      .call(() => side(true), null, 2.8)
      .call(() => side(false), null, 4.2)
      .to([note, chart], { opacity: 0, duration: 0.5 }, 5.6)
      .to({}, { duration: 0.3 }, 6.1);
  },
};
