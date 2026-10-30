// Invest "Access and classification" ([data-iv-access]). Default: the
// ruled rows (_iv-access.scss): each row .is-seen once it arrives, .is-on
// while it crosses the middle of the screen. For comparison: ?access=b
// the flow strip (waits for .is-in to fill its track and bring the steps
// in), ?access=d the stepper (one step active at a time, moving on by
// itself while in view), ?access=a the earlier plain ruled list.
export function initIvAccess() {
  const section = document.querySelector("[data-iv-access]");
  if (!section) return;

  const alt = new URLSearchParams(window.location.search).get("access");
  if (alt === "a") {
    section.classList.remove("iv-access--rows");
    return;
  }
  if (alt === "d") {
    section.classList.replace("iv-access--rows", "iv-access--steps");
    initSteps(section);
    return;
  }
  if (alt === "b") {
    section.classList.replace("iv-access--rows", "iv-access--flow");
    initFlow(section);
    return;
  }

  initRows(section);
}

function initFlow(section) {
  const list = section.querySelector(".iv-access__list");
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      section.classList.add("is-in");
      io.disconnect();
    },
    { threshold: 0.3 },
  );
  io.observe(list);
}

function initRows(section) {
  const rows = section.querySelectorAll(".iv-access__item");
  const seen = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-seen");
        seen.unobserve(e.target);
      }),
    { rootMargin: "0px 0px -15% 0px" },
  );
  const on = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle("is-on", e.isIntersecting)),
    { rootMargin: "-40% 0px -40% 0px" },
  );
  rows.forEach((row) => {
    seen.observe(row);
    on.observe(row);
  });
}

function initSteps(section) {
  const items = Array.from(section.querySelectorAll(".iv-access__item"));
  const phone = window.matchMedia("(max-width: 767px)");
  const DUR = 6000;
  let index = 0;
  let timer = 0;
  let inView = false;
  let paused = false;

  section.style.setProperty("--iva-dur", `${DUR}ms`);

  // Right-hand panel: a copy of each text, all in one grid cell so the
  // panel keeps the height of the longest.
  const panel = document.createElement("li");
  panel.className = "iva-panel";
  panel.setAttribute("aria-hidden", "true");
  const texts = items.map((item) => {
    const p = document.createElement("p");
    p.textContent = item.querySelector(".iv-access__text").textContent;
    panel.append(p);
    return p;
  });
  section.querySelector(".iv-access__list").append(panel);

  const show = (i) => {
    index = (i + items.length) % items.length;
    items.forEach((item, n) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-current", String(n === index));
    });
    void items[index].offsetWidth; // restart the bar
    items[index].classList.add("is-active");
    texts.forEach((p, n) => p.classList.toggle("is-active", n === index));
    schedule();
  };

  const schedule = () => {
    clearTimeout(timer);
    if (inView && !paused && !phone.matches) timer = setTimeout(() => show(index + 1), DUR);
  };

  items.forEach((item, n) => {
    item.tabIndex = 0;
    item.addEventListener("click", () => show(n));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        show(n);
      }
    });
  });

  const list = section.querySelector(".iv-access__list");
  const setPaused = (p) => {
    paused = p;
    section.classList.toggle("is-paused", p);
    // Resuming restarts the current step's timer from where the bar is
    // only roughly, so give it a fresh full run.
    if (!p) show(index);
    else clearTimeout(timer);
  };
  list.addEventListener("mouseenter", () => setPaused(true));
  list.addEventListener("mouseleave", () => setPaused(false));

  new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      if (inView) show(index);
      else clearTimeout(timer);
    },
    { threshold: 0.4 },
  ).observe(list);

  items[0].classList.add("is-active");
  texts[0].classList.add("is-active");
}
