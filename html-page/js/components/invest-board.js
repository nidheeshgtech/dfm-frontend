// Invest offerings ("Offerings, opening soon"): fills in today's date
// (Dubai time) on the list's "Updated" line. The market filter tabs only
// exist on the older demo board (index-v2.html): they dim the cards of
// the other markets.
const TZ = "Asia/Dubai";

export function initInvestBoard() {
  const board = document.querySelector("[data-iv-board]");
  if (!board) return;

  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date());
  board.querySelectorAll("[data-iv-board-date]").forEach((el) => (el.textContent = date));

  const tabs = Array.from(board.querySelectorAll("[data-iv-filter]"));
  const offers = Array.from(board.querySelectorAll("[data-market]"));
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      const market = tab.dataset.ivFilter;
      tabs.forEach((t) => {
        t.classList.toggle("is-on", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      offers.forEach((offer) => offer.classList.toggle("is-dim", market !== "all" && offer.dataset.market !== market));
    }),
  );
}
