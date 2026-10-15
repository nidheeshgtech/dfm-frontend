// Live HTML phone screens for "A familiar investor experience", laid over
// the screen area of each phone image (the frame stays the photo). Each
// screen animates when its step opens (investor-xp.js fires "xp:step"):
//   0 Access    — index counts up, chart rises from flat in a wave with a
//                 glowing cursor on its front, then ticks live; range pill
//                 slides to Year, opportunities card rises
//   1 Subscribe — photo settles, logo pops, offer card rises, figures count,
//                 allocation bar fills
//   2 Trade     — quote ticks, Buy slides in, the amount types in digit by
//                 digit, order value counts, limit field gets focus
// ?xpapp=0 keeps the plain images.
export function initXpApp() {
  const gsap = window.gsap;
  const apps = Array.from(document.querySelectorAll("[data-xp-app]"));
  if (!apps.length || !gsap) return;
  if (new URLSearchParams(window.location.search).get("xpapp") === "0") return;

  const root = apps[0].closest("[data-xp]");
  const phone = apps[0].closest(".xp__phone");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (v, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const q = (app, s) => app.querySelector(s);
  const qa = (app, s) => Array.from(app.querySelectorAll(s));
  let tl = null;

  const count = (t, el, from, to, d, dur, at) => {
    if (!el) return;
    const o = { v: from };
    t.fromTo(o, { v: from }, { v: to, duration: dur, ease: "power2.out", onUpdate: () => (el.textContent = fmt(o.v, d)) }, at);
  };

  // ---- Access chart: rising wave + live tick ----
  // Points come from the markup once (the static paths stay the fallback).
  const chartData = new WeakMap();
  const pts = (d) => (d.match(/-?[\d.]+ -?[\d.]+/g) || []).map((p) => p.split(" ").map(Number));
  const toD = (a) => a.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const chart = (app) => {
    if (chartData.has(app)) return chartData.get(app);
    const svg = q(app, ".xp-app__chart");
    const line = q(app, ".xp-app__line");
    const line2 = q(app, ".xp-app__line2");
    const area = q(app, ".xp-app__area");
    if (!svg || !line || !line2 || !area) return null;
    const cursor = document.createElement("div");
    cursor.className = "xp-app__cursor";
    cursor.innerHTML = "<i></i><b></b>";
    svg.after(cursor);
    const a = pts(line.getAttribute("d"));
    const b = pts(line2.getAttribute("d"));
    const data = { svg, line, line2, area, cursor, a, b, ta: trend(a), tb: trend(b) };
    chartData.set(app, data);
    return data;
  };
  // Soft trend of a line (wide moving average, two passes): the shape the
  // chart grows out of.
  const trend = (p, r = 16) => {
    let ys = p.map(([, y]) => y);
    for (let pass = 0; pass < 2; pass++) {
      ys = ys.map((_, i) => {
        let sum = 0;
        let c = 0;
        for (let j = Math.max(0, i - r); j <= Math.min(ys.length - 1, i + r); j++) (sum += ys[j]), c++;
        return sum / c;
      });
    }
    return ys;
  };
  const smooth = (k) => k * k * (3 - 2 * k); // smoothstep: no overshoot

  // Both lines start as their soft trend; a wide wave runs left → right and
  // the detail eases in as the front passes. The cursor (dot + scan line)
  // rides the front, then rests on the last price, which keeps ticking.
  const rise = (t, app, at) => {
    const c = chart(app);
    if (!c) return;
    const { a, b, ta, tb, line, line2, area, cursor } = c;
    const W = 0.4; // width of the wave front (share of the chart)
    const n = a.length - 1;
    const o = { t: 0 };
    const place = (x, y) => {
      cursor.style.setProperty("--x", `${x / 10}%`);
      cursor.style.setProperty("--y", `${y / 3}%`);
    };
    const draw = () => {
      const front = o.t * (1 + W);
      const k = (x) => smooth(Math.min(1, Math.max(0, (front - x / 1000) / W)));
      const na = a.map(([x, y], i) => [x, ta[i] + (y - ta[i]) * k(x)]);
      const nb = b.map(([x, y], i) => [x, tb[i] + (y - tb[i]) * k(x)]);
      line.setAttribute("d", toD(na));
      line2.setAttribute("d", toD(nb));
      area.setAttribute("d", `${toD(na)} L1000 300 L0 300 Z`);
      // Cursor sits mid-front, interpolated between points so it glides.
      const f = Math.min(1, Math.max(0, front - W * 0.5)) * n;
      const i0 = Math.floor(f);
      const i1 = Math.min(n, i0 + 1);
      const u = f - i0;
      place(na[i0][0] + (na[i1][0] - na[i0][0]) * u, na[i0][1] + (na[i1][1] - na[i0][1]) * u);
    };
    line.style.strokeDasharray = line2.style.strokeDasharray = "";
    cursor.classList.remove("is-live");
    t.set([line, line2], { strokeDasharray: "none", strokeDashoffset: 0 }, 0)
      .fromTo([line, line2], { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, at)
      .fromTo(cursor, { opacity: 0 }, { opacity: 1, duration: 0.6 }, at + 0.2)
      .fromTo(area, { opacity: 0 }, { opacity: 1, duration: 2, ease: "power2.out" }, at + 0.2)
      .fromTo(o, { t: 0 }, { t: 1, duration: 2.8, ease: "sine.inOut", onUpdate: draw, onStart: draw }, at)
      .add(() => cursor.classList.add("is-live"), at + 2.8);

    // Live tick: the last few points drift a little, the dot follows.
    const tail = 10;
    const live = gsap.timeline({ repeat: -1, repeatDelay: 0.2 });
    const drift = { v: 0 };
    let from = 0;
    let to = 0;
    live.to(drift, {
      v: 1,
      duration: 1.6,
      ease: "sine.inOut",
      onStart: () => {
        from = to;
        to = (Math.random() - 0.4) * 14;
      },
      onUpdate: () => {
        const off = from + (to - from) * drift.v;
        const na = a.map(([x, y], i) => [x, y - off * Math.max(0, 1 - (n - i) / tail)]);
        const nb = b.map(([x, y], i) => [x, y - off * 0.8 * Math.max(0, 1 - (n - i) / tail)]);
        line.setAttribute("d", toD(na));
        line2.setAttribute("d", toD(nb));
        area.setAttribute("d", `${toD(na)} L1000 300 L0 300 Z`);
        place(na[n][0], na[n][1]);
      },
    });
    t.add(live, at + 3);
  };

  const scenes = {
    0(app) {
      const t = gsap.timeline({ defaults: { ease: "power3.out" } });
      const tabs = qa(app, ".xp-app__tabs span");
      tabs.forEach((s, i) => s.classList.toggle("is-on", i === 0));
      t.fromTo(q(app, ".xp-app__bar"), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.6 }, 0)
        .fromTo(q(app, ".xp-app__index"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.1);
      count(t, q(app, "[data-xp-app-index]"), 3180.42, 3273.19, 2, 1.6, 0.1);
      t.fromTo(q(app, ".xp-app__change"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6 }, 0.5)
        .fromTo(q(app, ".xp-app__tab-pill"), { xPercent: -200 }, { xPercent: 0, duration: 0.9, ease: "power3.inOut" }, 1.4)
        .add(() => tabs.forEach((s, i) => s.classList.toggle("is-on", i === 2)), 1.75)
        .fromTo(q(app, ".xp-app__card"), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 1.1);
      rise(t, app, 0.3);
      return t;
    },

    1(app) {
      const t = gsap.timeline({ defaults: { ease: "power3.out" } });
      t.fromTo(q(app, ".xp-app__photo img"), { scale: 1.06, transformOrigin: "50% 0%" }, { scale: 1, duration: 1.6, ease: "power2.out" }, 0)
        .fromTo(q(app, ".xp-app__offer"), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 0.15)
        .fromTo(q(app, ".xp-app__logo"), { scale: 0.6, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.8, ease: "back.out(2)" }, 0.4)
        .fromTo(qa(app, ".xp-app__chips span"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 0.45)
        .fromTo(qa(app, ".xp-app__name span"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.55)
        .fromTo(qa(app, ".xp-app__links span"), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1 }, 0.8)
        .fromTo(q(app, ".xp-app__stats"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.95);
      qa(app, "[data-xp-num]").forEach((el, i) => count(t, el, 0, Number(el.dataset.xpNum), 0, 1.2, 1.05 + i * 0.1));
      t.fromTo(q(app, ".xp-app__progress i"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.inOut" }, 1.15)
        .fromTo(q(app, ".xp-app__timeline"), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.5);
      return t;
    },

    2(app) {
      const t = gsap.timeline({ defaults: { ease: "power3.out" } });
      const amount = q(app, "[data-xp-amount]");
      const limit = q(app, "[data-xp-limit]");
      t.fromTo(q(app, ".xp-app__thead"), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5 }, 0)
        .fromTo(q(app, ".xp-app__quote"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, 0.1);
      count(t, q(app, "[data-xp-price]"), 4.06, 4.12, 2, 1, 0.2);
      t.fromTo(qa(app, ".xp-app__book span"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 }, 0.35)
        .fromTo(q(app, ".xp-app__side"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4)
        .fromTo(q(app, ".xp-app__buy"), { clipPath: "polygon(0 0, 0% 0, 12% 50%, 0% 100%, 0 100%)" }, { clipPath: "polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)", duration: 0.8, ease: "power3.inOut" }, 0.5)
        .fromTo(q(app, ".xp-app__order"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 0.65);
      // Type the amount, then the limit price, digit by digit.
      t.add(() => (amount.textContent = ""), 0.65);
      ["4", "45", "450", "4,500"].forEach((txt, i) => t.add(() => (amount.textContent = txt), 1 + i * 0.16));
      count(t, q(app, "[data-xp-est]"), 0, 4000, 2, 0.9, 1.15);
      t.fromTo(q(app, ".xp-app__limit"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.4)
        .fromTo(q(app, ".xp-app__input"), { boxShadow: "0 0 0 0 rgba(59,37,196,0.35)" }, { boxShadow: "0 0 0 6px rgba(59,37,196,0)", duration: 0.9, ease: "power2.out" }, 1.6);
      t.add(() => (limit.textContent = ""), 1.4);
      ["4", "4.", "4.5", "4.50", "4.500"].forEach((txt, i) => t.add(() => (limit.textContent = txt), 1.6 + i * 0.12));
      return t;
    },
  };

  const show = (step) => {
    phone.dataset.appStep = String(step);
    tl?.kill();
    if (reduce) return;
    const app = apps.find((a) => a.dataset.xpApp === String(step));
    if (app && scenes[step]) tl = scenes[step](app);
  };

  root?.addEventListener("xp:step", (e) => show(e.detail));

  // investor-xp opened its first step before we were listening: sync now,
  // and play once the section is actually on screen.
  const screens = Array.from(root?.querySelectorAll("[data-xp-screen]") || []);
  phone.dataset.appStep = String(Math.max(0, screens.findIndex((s) => s.classList.contains("is-active"))));
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      show(Number(phone.dataset.appStep));
    },
    { threshold: 0.3 },
  );
  io.observe(phone);
}
