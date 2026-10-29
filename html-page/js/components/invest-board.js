// Invest offerings ("Offerings, opening soon"): fills in today's date
// (Dubai time) on any "Updated" line, and runs the coming-soon deck
// ([data-iv-soons]): each card has a slot (data-pos -1 / 0 / 1, styled in
// _iv-upcoming.scss); a side card or a dot brings that market to the
// front and the others take the side slots (?offers=a); by default the
// cards sit side by side instead. The market filter tabs only
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

  initSoonDeck(board.querySelector("[data-iv-soons]"));
}

function initSoonDeck(deck) {
  if (!deck) return;
  // Default (C): the three cards side by side, white, each with its
  // market number set large in a tinted panel. For comparison,
  // ?offers=b shows the full-photo cards side by side and ?offers=a the
  // fanned deck. Side by side, every card stays a front card.
  const alt = new URLSearchParams(window.location.search).get("offers") || "c";
  if (alt === "b" || alt === "c") {
    deck.classList.add("iv-soons--row");
    deck.querySelectorAll("[data-pos]").forEach((card) => (card.dataset.pos = "0"));
    if (alt === "c") deck.classList.add("iv-soons--c");
    return;
  }
  const cards = Array.from(deck.querySelectorAll("[data-pos]"));
  const dots = Array.from(deck.querySelectorAll(".iv-soons__dots button"));
  const n = cards.length;

  const front = (i) => {
    cards.forEach((card, j) => {
      // Signed distance from the front card, wrapped: -1, 0 or 1.
      let d = (j - i + n) % n;
      if (d > n / 2) d -= n;
      card.dataset.pos = d;
    });
    dots.forEach((dot, j) => dot.setAttribute("aria-pressed", String(j === i)));
  };

  // (The cards hold no links, so a click anywhere on a side card works.)
  deck.addEventListener("click", (event) => {
    const card = cards.find((c) => c.contains(event.target));
    if (card && card.dataset.pos !== "0") front(cards.indexOf(card));
  });
  dots.forEach((dot, i) => dot.addEventListener("click", () => front(i)));
  front(cards.findIndex((c) => c.dataset.pos === "0"));
}
