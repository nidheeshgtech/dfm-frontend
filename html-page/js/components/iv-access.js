// Invest "Access and classification" ([data-iv-access]): the ruled rows
// (_iv-access.scss). Each row gets .is-seen once it arrives and .is-on
// while it crosses the middle of the screen.
export function initIvAccess() {
  const section = document.querySelector("[data-iv-access]");
  if (!section) return;

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
