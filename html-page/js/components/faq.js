// FAQ accordion: one answer open at a time; clicking the open one closes
// it. Heights animate in CSS (grid-template-rows), so nothing to measure.
// Lists with [data-faq-tabs] are split into topic tabs ([data-faq-group]
// panels): one topic shows at a time, each shows its first SHOWN
// questions and a "Show all N questions" button for the rest.
const SHOWN = 5;

export function initFaq() {
  document.querySelectorAll("[data-faq]").forEach((list) => {
    const items = Array.from(list.querySelectorAll(".faq-item"));
    const visible = () => items.filter((item) => item.offsetParent !== null);
    const closeAll = () =>
      items.forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector("[aria-expanded]").setAttribute("aria-expanded", "false");
      });

    items.forEach((item) => {
      const btn = item.querySelector("[aria-expanded]");
      btn.addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        closeAll();
        item.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
      });
      btn.addEventListener("keydown", (event) => {
        const shown = visible();
        const i = shown.indexOf(item);
        const map = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: shown.length - 1 };
        if (!(event.key in map)) return;
        event.preventDefault();
        shown[(map[event.key] + shown.length) % shown.length].querySelector("[aria-expanded]").focus();
      });
    });

    if (list.hasAttribute("data-faq-tabs")) initTabs(list, closeAll);
  });
}

function initTabs(list, closeAll) {
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
  const groups = Array.from(list.querySelectorAll("[data-faq-group]"));
  const more = list.querySelector("[data-faq-more]");

  const clip = (group) => {
    const count = group.querySelectorAll(".faq-item").length;
    const long = count > SHOWN;
    group.classList.toggle("is-clipped", long);
    if (!more) return;
    more.hidden = !long;
    more.textContent = `Show all ${count} questions`;
  };

  const select = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const group = list.querySelector(`#${tab.getAttribute("aria-controls")}`);
    groups.forEach((g) => (g.hidden = g !== group));
    closeAll();
    const first = group.querySelector(".faq-item");
    if (first) {
      first.classList.add("is-open");
      first.querySelector("[aria-expanded]").setAttribute("aria-expanded", "true");
    }
    clip(group);
    if (focus) tab.focus();
    // Bring the tab into view inside the (sideways-scrolling) tab row only.
    const row = tab.parentElement;
    row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in map)) return;
      event.preventDefault();
      select(tabs[(map[event.key] + tabs.length) % tabs.length], true);
    });
  });

  more?.addEventListener("click", () => {
    const group = groups.find((g) => !g.hidden);
    group?.classList.remove("is-clipped");
    more.hidden = true;
    group?.querySelectorAll(".faq-item")[SHOWN]?.querySelector("[aria-expanded]").focus();
  });

  const active = tabs.find((t) => t.classList.contains("is-on")) || tabs[0];
  if (active) clip(list.querySelector(`#${active.getAttribute("aria-controls")}`));
}
