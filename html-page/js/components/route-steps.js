// Route pages, "How the raise works": the line between the steps fills as
// the section scrolls through, and each step lights up when the fill
// reaches its dot (the last one, the milestone, in jade). Scrubbed by
// ScrollTrigger so it runs both ways. Without JS / with reduced motion
// every step stays lit (the CSS default).
export function initRouteSteps() {
  const ScrollTrigger = window.ScrollTrigger;
  const lists = Array.from(document.querySelectorAll("[data-rt-steps]"));
  if (!ScrollTrigger || !lists.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  lists.forEach((list) => {
    const steps = Array.from(list.querySelectorAll("[data-rt-step]"));
    const n = steps.length;
    if (n < 2) return;
    list.classList.add("is-live");

    const update = (p) => {
      list.style.setProperty("--p", p.toFixed(4));
      // Step i sits at i / (n - 1) along the line; light it once reached.
      steps.forEach((s, i) => s.classList.toggle("is-on", p >= i / (n - 1) - 0.001));
    };
    update(0);

    ScrollTrigger.create({
      trigger: list,
      start: "top 80%",
      end: "bottom 55%",
      scrub: 0.6,
      onUpdate: (self) => update(self.progress),
    });
  });
}
