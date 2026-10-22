// Route pages, "Why companies choose it": each card's mini visual
// ([data-rt-viz]) gets its own GSAP timeline that repeats while the card
// is on screen and pauses when it leaves. Without JS (or with reduced
// motion) the markup's resting frame stays. Same pattern as
// invest-loops.js on the Invest page.
export function initRouteViz() {
  const gsap = window.gsap;
  const els = Array.from(document.querySelectorAll("[data-rt-viz]"));
  if (!gsap || !els.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  els.forEach((el) => {
    const build = VIZ[el.dataset.rtViz];
    if (!build) return;
    el.classList.add("is-loop");
    const tl = build(el, gsap);
    if (!tl) return;
    tl.pause();
    if (!("IntersectionObserver" in window)) return tl.play();
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.3 }).observe(el);
  });
}

const q = (el, s) => el.querySelector(s);
const qa = (el, s) => Array.from(el.querySelectorAll(s));
const toggle = (els, cls, on) => [].concat(els).forEach((e) => e && e.classList.toggle(cls, on));
const fmt = (v) => Math.round(v).toLocaleString("en-US");
// A beat of nothing at the end of a loop.
const hold = (tl, at, d = 0.4) => tl.to({}, { duration: d }, at);

const VIZ = {
  // ARENA reaches listing while the traditional IPO is still on its way.
  race(el, gsap) {
    const [ipo, arena] = qa(el, ".rt-race__bar i");
    const tag = q(el, ".rt-race em");
    const tl = gsap.timeline({ repeat: -1 });
    tl.set([ipo, arena], { scaleX: 0, opacity: 1 }, 0)
      .set(tag, { opacity: 0, scale: 0.6 }, 0)
      .to(arena, { scaleX: 1, duration: 1.5, ease: "power2.inOut" }, 0.3)
      .to(ipo, { scaleX: 0.38, duration: 1.5, ease: "power2.inOut" }, 0.3)
      .to(tag, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.4)" }, 1.8)
      .to(ipo, { scaleX: 1, duration: 3.2, ease: "power1.inOut" }, 1.8)
      .to([ipo, arena, tag], { opacity: 0, duration: 0.4 }, 5.4);
    return hold(tl, 5.8, 0.2);
  },

  // Demand shifts, the price line follows, then settles.
  bars(el, gsap) {
    const bars = qa(el, ".rt-bars i");
    const line = q(el, ".rt-bars__line");
    const profiles = [
      [22, 34, 50, 66, 80, 90, 72, 46, 28],
      [34, 52, 72, 90, 78, 60, 44, 30, 20],
      [28, 42, 58, 76, 92, 70, 50, 34, 22],
    ];
    const tops = ["24%", "28%", "30%"];
    const tl = gsap.timeline({ repeat: -1, onRepeat: () => toggle(line, "is-set", false) });
    tl.fromTo(bars, { height: "4%" }, { height: (i) => `${profiles[2][i]}%`, duration: 0.9, ease: "power3.out", stagger: 0.05 }, 0)
      .fromTo(line, { opacity: 0, top: tops[2] }, { opacity: 1, duration: 0.4 }, 0.7);
    [0, 1, 2].forEach((p, k) => {
      const at = 1.8 + k * 1.4;
      tl.to(bars, { height: (i) => `${profiles[p][i]}%`, duration: 1, ease: "sine.inOut", stagger: 0.03 }, at).to(line, { top: tops[p], duration: 1, ease: "sine.inOut" }, at + 0.1);
    });
    tl.call(() => toggle(line, "is-set", true), null, 5.6)
      .to(line, { opacity: 0, duration: 0.4 }, 7.2)
      .to(bars, { height: "4%", duration: 0.5, ease: "power2.in", stagger: 0.03 }, 7.2);
    return tl;
  },

  // Investors light up across the grid while the count climbs.
  pool(el, gsap) {
    const dots = qa(el, ".rt-pool i");
    const count = q(el, "[data-rt-count]");
    // Fixed shuffled order so the grid fills unevenly.
    const order = dots.map((d, i) => [d, (i * 37) % dots.length]).sort((a, b) => a[1] - b[1]).map(([d]) => d);
    const o = { v: 0 };
    const tl = gsap.timeline({ repeat: -1, onRepeat: () => toggle(dots, "is-on", false) });
    order.forEach((d, i) => tl.call(() => toggle(d, "is-on", true), null, 0.2 + i * 0.045));
    tl.fromTo(o, { v: 0 }, { v: 1000000, duration: 2.4, ease: "power2.out", onUpdate: () => (count.textContent = `${fmt(o.v)}+`) }, 0.2)
      .call(() => toggle(dots, "is-on", false), null, 4.6);
    return hold(tl, 4.7, 0.5);
  },

  // The price line draws in, then trades flash Buy / Sell.
  trade(el, gsap) {
    const chart = q(el, ".rt-trade__chart");
    const [buy, sell] = qa(el, ".rt-trade__chips b");
    const side = (s) => (toggle(buy, "is-on", !s), toggle(sell, "is-on", s));
    const tl = gsap.timeline({ repeat: -1 });
    tl.fromTo(chart, { clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0% 0 0)", duration: 2, ease: "power2.inOut" }, 0.2)
      .call(() => side(true), null, 2.4)
      .call(() => side(false), null, 3.2)
      .call(() => side(true), null, 4)
      .call(() => side(false), null, 4.8)
      .to(chart, { opacity: 0, duration: 0.4 }, 5.6);
    return hold(tl, 6, 0.2);
  },

  // Two sliders move between settings; the values follow.
  terms(el, gsap) {
    const [raise, share] = qa(el, ".rt-slider");
    const [rv, sv] = qa(el, "[data-rt-val]");
    const steps = [
      [30, 75, 35, 25],
      [55, 100, 45, 30],
      [80, 125, 28, 20],
    ];
    const tl = gsap.timeline({ repeat: -1 });
    steps.forEach(([r, aed, s, pct], k) => {
      const at = k * 1.6;
      tl.to(raise, { "--v": `${r}%`, duration: 0.9, ease: "power3.inOut" }, at)
        .to(share, { "--v": `${s}%`, duration: 0.9, ease: "power3.inOut" }, at + 0.2)
        .call(() => (rv.textContent = `AED ${aed}M`), null, at + 0.5)
        .call(() => (sv.textContent = `${pct}%`), null, at + 0.7);
    });
    return hold(tl, 4.8, 0.3);
  },

  // A dot hops up the steps; the top one is the IPO.
  stairs(el, gsap) {
    const steps = qa(el, ".rt-stairs i");
    const dot = q(el, ".rt-stairs__dot");
    const flag = q(el, ".rt-stairs em");
    const at = (i) => {
      const box = el.getBoundingClientRect();
      const r = steps[i].getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top - 9 };
    };
    const tl = gsap.timeline({ repeat: -1, onRepeat: () => toggle(steps, "is-on", false) });
    tl.set(flag, { opacity: 0, y: 6 }, 0).set(dot, { x: () => at(0).x, y: () => at(0).y + 20, opacity: 0 }, 0).to(dot, { y: () => at(0).y, opacity: 1, duration: 0.4 }, 0.2);
    steps.forEach((s, i) => {
      const t = 0.7 + i * 0.7;
      if (i) {
        tl.to(dot, { x: () => at(i).x, duration: 0.55, ease: "power1.inOut" }, t - 0.6).to(dot, { keyframes: { y: [() => at(i - 1).y - 26, () => at(i).y] }, duration: 0.55, ease: "power1.inOut" }, t - 0.6);
      }
      tl.call(() => toggle(s, "is-on", true), null, t);
    });
    tl.to(flag, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(2.4)" }, 3.5)
      .to([dot, flag], { opacity: 0, duration: 0.4 }, 5)
      .call(() => toggle(steps, "is-on", false), null, 5.3);
    return hold(tl, 5.4, 0.2);
  },

  // Founders and early backers sell part of their stake to new investors.
  donut(el, gsap) {
    const [a, b, c] = qa(el, ".rt-donut__seg");
    const val = q(el, "[data-rt-val]");
    const o = { a: 50, b: 30 };
    const draw = () => {
      const cc = 100 - o.a - o.b;
      a.setAttribute("stroke-dasharray", `${o.a} ${100 - o.a}`);
      b.setAttribute("stroke-dasharray", `${o.b} ${100 - o.b}`);
      b.setAttribute("stroke-dashoffset", -o.a);
      c.setAttribute("stroke-dasharray", `${cc} ${100 - cc}`);
      c.setAttribute("stroke-dashoffset", -(o.a + o.b));
      val.textContent = `${Math.round(cc)}%`;
    };
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(o, { a: 50, b: 30, onComplete: draw }, 0)
      .to(o, { a: 40, b: 22, duration: 1.6, ease: "power2.inOut", onUpdate: draw }, 0.6)
      .fromTo(c, { strokeWidth: 14 }, { strokeWidth: 20, duration: 0.3, yoyo: true, repeat: 1 }, 2.2)
      .to(o, { a: 50, b: 30, duration: 1.2, ease: "power2.inOut", onUpdate: draw }, 4.2);
    return hold(tl, 5.4, 0.4);
  },

  // Many small holders fold into one consolidated line.
  cap(el, gsap) {
    const small = qa(el, ".rt-cap__row.is-small");
    const merged = q(el, ".rt-cap__row.is-merged");
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(small, { height: 12, opacity: 1, marginTop: 0 }, 0)
      .set(merged, { height: 0, opacity: 0 }, 0)
      .fromTo(qa(el, ".rt-cap__row em"), { scaleX: 0, transformOrigin: "0 50%" }, { scaleX: 1, duration: 0.6, ease: "power3.out", stagger: 0.05 }, 0.1)
      .to(small, { height: 0, opacity: 0, marginTop: -7, duration: 0.5, ease: "power2.inOut", stagger: 0.12 }, 1.8)
      .to(merged, { height: 12, opacity: 1, duration: 0.5, ease: "back.out(2)" }, 2.4)
      .to(merged, { opacity: 0, duration: 0.4 }, 4.6);
    return hold(tl, 5, 0.2);
  },

  // Links reach out to the institutions one by one.
  known(el, gsap) {
    const links = qa(el, ".rt-net__link");
    const nodes = qa(el, ".rt-net__node");
    const tl = gsap.timeline({ repeat: -1, onRepeat: () => toggle(nodes, "is-on", false) });
    tl.set(links, { strokeDashoffset: 1 }, 0);
    links.forEach((l, i) => {
      const at = 0.3 + i * 0.4;
      tl.to(l, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, at).call(() => toggle(nodes[i], "is-on", true), null, at + 0.45);
    });
    tl.fromTo(nodes, { attr: { r: 9 } }, { attr: { r: 11 }, duration: 0.25, yoyo: true, repeat: 1, stagger: 0.05 }, 3)
      .to(links, { strokeDashoffset: -1, duration: 0.6, ease: "power2.in" }, 4.6)
      .call(() => toggle(nodes, "is-on", false), null, 4.9);
    return hold(tl, 5.2, 0.2);
  },

  // A share passes between holders, never leaving the circle.
  ring(el, gsap) {
    const ins = qa(el, ".rt-ring__in");
    const token = q(el, ".rt-ring__token");
    const pos = ins.map((c) => ({ cx: +c.getAttribute("cx"), cy: +c.getAttribute("cy") }));
    const path = [0, 2, 4, 1, 3, 0];
    const tl = gsap.timeline({ repeat: -1 });
    path.slice(1).forEach((to, k) => {
      const at = k * 0.9;
      tl.to(token, { attr: pos[to], duration: 0.7, ease: "power2.inOut" }, at)
        .call(() => ins.forEach((c, i) => toggle(c, "is-on", i === to)), null, at + 0.65)
        .fromTo(ins[to], { attr: { r: 7 } }, { attr: { r: 9 }, duration: 0.2, yoyo: true, repeat: 1 }, at + 0.65);
    });
    return hold(tl, 4.5, 0.3);
  },

  // A ping spreads from Dubai; cities light up as it passes.
  reach(el, gsap) {
    const ping = q(el, ".rt-reach__ping");
    const hub = q(el, ".rt-reach__hub i");
    const cities = qa(el, ".rt-reach__city");
    const o = { r: 0 };
    let dist = [];
    let max = 1;
    const measure = () => {
      const h = hub.getBoundingClientRect();
      dist = cities.map((c) => {
        const r = c.querySelector("i").getBoundingClientRect();
        return Math.hypot(r.left - h.left, r.top - h.top);
      });
      max = Math.max(...dist) + 20;
    };
    const tl = gsap.timeline({ repeat: -1, onRepeat: () => toggle(cities, "is-on", false) });
    tl.call(measure, null, 0)
      .fromTo(
        o,
        { r: 0 },
        {
          r: 1,
          duration: 2.6,
          ease: "power1.out",
          onUpdate: () => {
            const px = o.r * max;
            gsap.set(ping, { width: px * 2, height: px * 2, marginLeft: -px, marginTop: -px, opacity: 1 - o.r * 0.8 });
            cities.forEach((c, i) => px >= dist[i] && toggle(c, "is-on", true));
          },
        },
        0.2,
      )
      .to(ping, { opacity: 0, duration: 0.4 }, 2.8)
      .call(() => toggle(cities, "is-on", false), null, 4.6);
    return hold(tl, 4.8, 0.2);
  },

  // The needle swings, then settles on a fair price.
  gauge(el, gsap) {
    const needle = q(el, ".rt-gauge__needle");
    const fill = q(el, ".rt-gauge__fill");
    const tag = q(el, ".rt-gauge__tag");
    // Needle angle −90…90 → arc 0…1.
    const o = { a: -90 };
    const draw = () => {
      needle.style.rotate = `${o.a}deg`;
      fill.style.strokeDashoffset = 1 - (o.a + 90) / 180;
    };
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(tag, { opacity: 0, scale: 0.6 }, 0)
      .fromTo(o, { a: -90 }, { a: 55, duration: 1, ease: "power2.out", onUpdate: draw, onStart: draw }, 0.2)
      .to(o, { a: -30, duration: 0.8, ease: "power2.inOut", onUpdate: draw }, 1.2)
      .to(o, { a: 18, duration: 1.4, ease: "elastic.out(1, 0.5)", onUpdate: draw }, 2)
      .to(tag, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.4)" }, 2.6)
      .to(tag, { opacity: 0, duration: 0.3 }, 5)
      .to(o, { a: -90, duration: 0.6, ease: "power2.in", onUpdate: draw }, 5);
    return hold(tl, 5.6, 0.3);
  },

  // Approved holders tick in; an outsider is turned away. ("people":
  // every employee gets a stake and the stake bar fills.)
  owners(el, gsap) {
    const avs = qa(el, ".rt-av:not(.is-outsider)");
    const out = q(el, ".rt-av.is-outsider");
    const bar = q(el, ".rt-owners__bar i");
    const tl = gsap.timeline({ repeat: -1, onRepeat: () => toggle([...avs, out], "is-in", false) });
    tl.set(bar, { scaleX: 0 }, 0);
    avs.forEach((a, i) => tl.call(() => toggle(a, "is-in", true), null, 0.4 + i * 0.35));
    tl.to(bar, { scaleX: 1, duration: 1.8, ease: "power2.out" }, 0.4);
    if (out) {
      tl.to(out, { x: -14, duration: 0.4, ease: "power2.out" }, 2.4)
        .call(() => toggle(out, "is-in", true), null, 2.75)
        .to(out, { x: 0, duration: 0.5, ease: "back.out(2)" }, 3)
        .to(out, { opacity: 0.4, duration: 0.3 }, 3.2)
        .to(out, { opacity: 1, duration: 0.3 }, 4.8);
    }
    tl.call(() => toggle([...avs, out], "is-in", false), null, 4.8);
    return hold(tl, 5, 0.3);
  },

  // Ownership moves from founders to the next generation, at a clear price.
  succession(el, gsap) {
    const [f, n] = qa(el, ".rt-gen");
    const [fv, nv] = qa(el, "[data-rt-val]");
    const tag = q(el, ".rt-gen__tag");
    const o = { v: 80 };
    const draw = () => {
      f.style.setProperty("--v", `${o.v}%`);
      n.style.setProperty("--v", `${100 - o.v}%`);
      fv.textContent = `${Math.round(o.v)}%`;
      nv.textContent = `${Math.round(100 - o.v)}%`;
    };
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(tag, { opacity: 0, y: -6 }, 0)
      .fromTo(o, { v: 80 }, { v: 45, duration: 2, ease: "power2.inOut", onUpdate: draw, onStart: draw }, 0.4)
      .to(tag, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(2.4)" }, 2.4)
      .to(tag, { opacity: 0, duration: 0.3 }, 4.6)
      .to(o, { v: 80, duration: 0.8, ease: "power2.inOut", onUpdate: draw }, 4.6);
    return hold(tl, 5.4, 0.3);
  },

  // Lines are redacted one by one, then the file is stamped.
  redact(el, gsap) {
    const bars = qa(el, ".rt-doc__line i");
    const stamp = q(el, ".rt-doc__stamp");
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(bars, { scaleX: 0 }, 0)
      .set(stamp, { opacity: 0, scale: 1.6 }, 0)
      .to(bars, { scaleX: 1, duration: 0.45, ease: "power2.inOut", stagger: 0.35 }, 0.4)
      .to(stamp, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 2.2)
      .to([stamp, ...bars], { opacity: 0, duration: 0.4 }, 4.6)
      .set(bars, { opacity: 1, scaleX: 0 }, 5);
    return hold(tl, 5, 0.3);
  },
};
