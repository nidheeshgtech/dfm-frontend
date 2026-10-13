// FAQ accordion: one answer open at a time; clicking the open one closes
// it. Heights animate in CSS (grid-template-rows), so nothing to measure.
export function initFaq() {
  document.querySelectorAll("[data-faq]").forEach((list) => {
    const items = Array.from(list.querySelectorAll(".faq-item"));

    items.forEach((item, i) => {
      const btn = item.querySelector("[aria-expanded]");
      btn.addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        items.forEach((other) => {
          other.classList.remove("is-open");
          other.querySelector("[aria-expanded]").setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
      });
      btn.addEventListener("keydown", (event) => {
        const map = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 };
        if (!(event.key in map)) return;
        event.preventDefault();
        items[(map[event.key] + items.length) % items.length].querySelector("[aria-expanded]").focus();
      });
    });
  });
}
