// Invest offerings board: market filter tabs (All / Growth / Private /
// Closed) dim the placeholder offer cards that don't match. Links with
// [data-iv-board-link="growth"] (the market cards' CTAs) pre-select a tab
// on their way down to the board.
export function initInvestBoard() {
  const board = document.querySelector("[data-iv-board]");
  if (!board) return;

  const tabs = Array.from(board.querySelectorAll("[data-iv-filter]"));
  const offers = Array.from(board.querySelectorAll("[data-market]"));

  const select = (market) => {
    tabs.forEach((tab) => {
      const on = tab.dataset.ivFilter === market;
      tab.classList.toggle("is-on", on);
      tab.setAttribute("aria-selected", String(on));
    });
    offers.forEach((offer) => {
      offer.classList.toggle("is-dim", market !== "all" && offer.dataset.market !== market);
    });
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => select(tab.dataset.ivFilter)));

  document.querySelectorAll("[data-iv-board-link]").forEach((link) => {
    link.addEventListener("click", () => select(link.dataset.ivBoardLink));
  });
}
