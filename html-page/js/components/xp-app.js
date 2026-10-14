// Live HTML phone screens for "A familiar investor experience", laid over
// the screen area of each phone image (the frame stays the photo). Each
// screen animates when its step opens (investor-xp.js fires "xp:step"):
//   0 Access    — index counts up, chart draws, range pill slides to Year,
//                 opportunities card rises
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

  const scenes = {
    0(app) {
      const t = gsap.timeline({ defaults: { ease: "power3.out" } });
      const tabs = qa(app, ".xp-app__tabs span");
      tabs.forEach((s, i) => s.classList.toggle("is-on", i === 0));
      t.fromTo(q(app, ".xp-app__bar"), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.6 }, 0)
        .fromTo(q(app, ".xp-app__index"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.1);
      count(t, q(app, "[data-xp-app-index]"), 3180.42, 3273.19, 2, 1.6, 0.1);
      t.fromTo(q(app, ".xp-app__change"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6 }, 0.5)
        .fromTo([q(app, ".xp-app__line2"), q(app, ".xp-app__line")], { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", stagger: 0.12 }, 0.35)
        .fromTo(q(app, ".xp-app__area"), { opacity: 0, clipPath: "inset(0 100% 0 0)" }, { opacity: 1, clipPath: "inset(0 0% 0 0)", duration: 1.8, ease: "power2.inOut" }, 0.45)
        .fromTo(q(app, ".xp-app__tab-pill"), { xPercent: -200 }, { xPercent: 0, duration: 0.9, ease: "power3.inOut" }, 1.4)
        .add(() => tabs.forEach((s, i) => s.classList.toggle("is-on", i === 2)), 1.75)
        .fromTo(q(app, ".xp-app__card"), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 1.1);
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
