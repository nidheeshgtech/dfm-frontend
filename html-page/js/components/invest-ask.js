// "Ask ARENA" bar beside the FAQ. Until the assistant is live it answers
// from the FAQ: suggestion chips open their question directly; typed
// questions open the answer sharing the most words with them.
const STOP_WORDS = new Set("a an and any are can do does for get have how i in is it me much my of on or the there to what when where who will with you your".split(" "));
// Everyday words mapped onto the ones the answers use.
const SYNONYMS = { fee: "cost", fees: "cost", charge: "cost", price: "cost", minimum: "start", abroad: "outside", international: "outside", refund: "allocated", oversubscribed: "allocated", launch: "first", eligible: "invest" };

const words = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map((w) => SYNONYMS[w] || w);

// "fee" matches "fees", "invest" matches "investor".
const near = (a, b) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

export function initInvestAsk() {
  const form = document.querySelector("[data-iv-ask]");
  if (!form) return;

  const input = form.querySelector("[data-iv-ask-input]");
  const status = form.querySelector("[data-iv-ask-status]");
  const items = Array.from(document.querySelectorAll("#faq .faq-item"));

  const open = (btn) => {
    const item = btn.closest(".faq-item");
    if (!item.classList.contains("is-open")) btn.click();
    item.classList.remove("is-flash");
    void item.offsetWidth;
    item.classList.add("is-flash");
    // Desktop: the list sits beside the bar; small screens: scroll to it.
    if (window.matchMedia("(max-width: 1023.98px)").matches) {
      item.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    btn.focus({ preventScroll: true });
    status.textContent = "";
  };

  form.querySelectorAll("[data-iv-ask-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const btn = document.getElementById(chip.dataset.ivAskChip);
      if (btn) open(btn);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = words(input.value);
    if (!query.length) return input.focus();

    let best = null;
    let bestScore = 0;
    items.forEach((item) => {
      const q = words(item.querySelector(".faq-item__q").textContent);
      const a = words(item.querySelector(".faq-item__a").textContent);
      const score = query.reduce((sum, w) => sum + (q.some((x) => near(x, w)) ? 2 : 0) + (a.some((x) => near(x, w)) ? 1 : 0), 0);
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    });

    if (best) open(best.querySelector(".faq-item__btn"));
    else status.textContent = "The ARENA assistant goes live at launch. Meanwhile, try a suggestion above or call the team.";
  });
}
