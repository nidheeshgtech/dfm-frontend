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

  // A slow 3D constellation: institutions orbit "Your company" on a tilted
  // ring (nearer = bigger and brighter, farther = smaller, faded, soft),
  // links follow them and light pulses travel in along each link.
  orbit(el, gsap) {
    const nodes = qa(el, ".rt-orbit__node");
    const links = q(el, "[data-links]");
    const pulses = q(el, "[data-pulses]");
    const NS = "http://www.w3.org/2000/svg";
    const [cx, cy, rx, ry] = [200, 84, 168, 54];
    const lines = nodes.map(() => links.appendChild(document.createElementNS(NS, "line")));
    const dots = nodes.map(() => pulses.appendChild(document.createElementNS(NS, "circle")));
    lines.forEach((l) => {
      l.setAttribute("class", "rt-orbit__link");
      l.setAttribute("x1", cx);
      l.setAttribute("y1", cy);
    });
    dots.forEach((d) => {
      d.setAttribute("class", "rt-orbit__pulse");
      d.setAttribute("r", 3);
    });
    const n = nodes.length;
    const render = (t) => {
      nodes.forEach((node, i) => {
        const a = t * 0.32 + (i / n) * Math.PI * 2;
        const x = cx + rx * Math.cos(a);
        const y = cy + ry * Math.sin(a);
        const d = (Math.sin(a) + 1) / 2; // 0 back … 1 front
        node.style.left = `${(x / 400) * 100}%`;
        node.style.top = `${(y / 168) * 100}%`;
        node.style.transform = `translate(-50%, -50%) scale(${0.62 + 0.46 * d})`;
        node.style.opacity = (0.32 + 0.68 * d).toFixed(3);
        node.style.filter = `blur(${((1 - d) * 1.4).toFixed(2)}px)`;
        node.style.zIndex = d > 0.45 ? 3 : 1;
        lines[i].setAttribute("x2", x.toFixed(1));
        lines[i].setAttribute("y2", y.toFixed(1));
        lines[i].style.opacity = (0.12 + 0.5 * d).toFixed(3);
        const p = (t * 0.42 + i / n) % 1; // pulse travels node → core
        dots[i].setAttribute("cx", (x + (cx - x) * p).toFixed(1));
        dots[i].setAttribute("cy", (y + (cy - y) * p).toFixed(1));
        dots[i].style.opacity = (Math.sin(p * Math.PI) * (0.35 + 0.65 * d)).toFixed(3);
      });
    };
    const o = { t: 0 };
    render(0);
    return gsap.timeline({ repeat: -1 }).to(o, { t: 60, duration: 60, ease: "none", onUpdate: () => render(o.t) });
  },

  // A tilted 3D ring: holders ride round it in perspective while a share
  // hops between them in an arc, never leaving the circle; outsiders stay
  // blurred beyond it.
  ring3d(el, gsap) {
    const holders = qa(el, ".rt-ring3d__holder");
    const token = q(el, ".rt-ring3d__token");
    const [cx, cy, rx, ry] = [200, 88, 132, 42];
    const n = holders.length;
    const HOP = 1.15;
    const pos = (i, t) => {
      const a = t * 0.22 + (i / n) * Math.PI * 2;
      return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), d: (Math.sin(a) + 1) / 2 };
    };
    const place = (node, x, y, scale, z) => {
      node.style.left = `${(x / 400) * 100}%`;
      node.style.top = `${(y / 168) * 100}%`;
      node.style.transform = `translate(-50%, -50%) scale(${scale})`;
      node.style.zIndex = z;
    };
    let lit = -1;
    const render = (t) => {
      const hop = Math.floor(t / HOP);
      const from = (hop * 2) % n;
      const to = (hop * 2 + 2) % n;
      const k = Math.min(1, (t % HOP) / 0.75);
      const e = k * k * (3 - 2 * k);
      holders.forEach((h, i) => {
        const p = pos(i, t);
        place(h, p.x, p.y, 0.7 + 0.42 * p.d, p.d > 0.5 ? 4 : 1);
        h.style.opacity = (0.45 + 0.55 * p.d).toFixed(3);
      });
      const a = pos(from, t);
      const b = pos(to, t);
      const x = a.x + (b.x - a.x) * e;
      const y = a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * 30;
      place(token, x, y, 0.85 + 0.3 * Math.max(a.d, b.d), 5);
      const now = k >= 1 ? to : -1;
      if (now !== lit) {
        holders.forEach((h, i) => h.classList.toggle("is-on", i === now));
        lit = now;
      }
    };
    const o = { t: 0 };
    render(0);
    return gsap.timeline({ repeat: -1 }).to(o, { t: HOP * 30, duration: HOP * 30, ease: "none", onUpdate: () => render(o.t) });
  },

  // Gulf map: a small burst pops at Dubai; arcs draw out to each city
  // (nearest first) and the city pops as its arc lands.
  map(el, gsap) {
    const NS = "http://www.w3.org/2000/svg";
    const pings = qa(el, ".rt-map__ping");
    const arcs = qa(el, ".rt-map__arc");
    const cities = qa(el, ".rt-map__city");
    const pops = cities.map((city) => {
      const c = city.querySelector("circle");
      const pop = document.createElementNS(NS, "circle");
      pop.setAttribute("class", "rt-map__pop");
      pop.setAttribute("cx", c.getAttribute("cx"));
      pop.setAttribute("cy", c.getAttribute("cy"));
      pop.setAttribute("r", 0);
      return city.insertBefore(pop, c);
    });
    // Nearest first.
    const order = arcs
      .map((arc, i) => {
        const c = cities[i].querySelector("circle");
        return { i, d: Math.hypot(c.cx.baseVal.value - 305, c.cy.baseVal.value - 116) };
      })
      .sort((p, q2) => p.d - q2.d);
    const tl = gsap.timeline({ repeat: -1, onRepeat: () => toggle(cities, "is-on", false) });
    tl.set(arcs, { strokeDashoffset: 1, opacity: 1 }, 0);
    pings.forEach((p, i) => tl.fromTo(p, { attr: { r: 3 }, opacity: 0.8 }, { attr: { r: 24 }, opacity: 0, duration: 0.9, ease: "power2.out" }, i * 0.18));
    order.forEach(({ i }, k) => {
      const at = 0.4 + k * 0.32;
      tl.to(arcs[i], { strokeDashoffset: 0, duration: 0.7, ease: "power2.out" }, at)
        .call(() => toggle(cities[i], "is-on", true), null, at + 0.6)
        .fromTo(pops[i], { attr: { r: 3 }, opacity: 0.7 }, { attr: { r: 14 }, opacity: 0, duration: 0.7, ease: "power2.out" }, at + 0.6);
    });
    return tl.to(arcs, { opacity: 0, duration: 0.6 }, 5.2).call(() => toggle(cities, "is-on", false), null, 5.6).to({}, { duration: 0.3 }, 5.8);
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

  // The family file slides into an envelope, the flap folds shut in 3D
  // and a wax seal stamps on; then it opens again.
  seal(el, gsap) {
    const env = q(el, ".rt-env");
    const letter = q(el, ".rt-env__letter");
    const flap = q(el, ".rt-env__flap");
    const seal = q(el, ".rt-env__seal");
    const burst = q(el, ".rt-env__burst");
    // The flap sits behind the letter while open, in front once past upright.
    const shut = (on) => () => toggle(env, "is-shut", on);
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(letter, { y: -54 }, 0)
      .set(flap, { rotateX: 180, transformPerspective: 360 }, 0)
      .set(seal, { scale: 0, opacity: 0 }, 0)
      .set(burst, { scale: 0.4, opacity: 0 }, 0)
      .set(env, { rotateY: -16, rotateX: 8 }, 0)
      .call(shut(false), null, 0)
      .to(letter, { y: 0, duration: 0.8, ease: "power2.inOut" }, 0.4)
      .to(flap, { rotateX: 0, duration: 0.7, ease: "power2.inOut" }, 1.25)
      .call(shut(true), null, 1.6)
      .to(seal, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.6)" }, 2)
      .fromTo(burst, { scale: 0.4, opacity: 0.8 }, { scale: 2.2, opacity: 0, duration: 0.7, ease: "power2.out" }, 2.1)
      .to(env, { rotateY: 0, rotateX: 0, duration: 1.4, ease: "power2.inOut" }, 1.2)
      .to(seal, { scale: 0, opacity: 0, duration: 0.3, ease: "power2.in" }, 4.4)
      .to(env, { rotateY: -16, rotateX: 8, duration: 1.2, ease: "power2.inOut" }, 4.5)
      .to(flap, { rotateX: 180, duration: 0.6, ease: "power2.inOut" }, 4.7)
      .call(shut(false), null, 5)
      .to(letter, { y: -54, duration: 0.7, ease: "power2.inOut" }, 5.2);
    return hold(tl, 5.9, 0.3);
  },
};
