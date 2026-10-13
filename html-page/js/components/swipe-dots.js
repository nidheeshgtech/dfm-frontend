// Dots for horizontal swipe rows ([data-swipe], e.g. the team cards on
// tablet / mobile). Dots only show while the row actually overflows;
// the active dot follows the card nearest the row's start edge, and
// tapping a dot scrolls to its card.
export function initSwipeDots() {
  document.querySelectorAll("[data-swipe]").forEach(setup);
}

function setup(row) {
  const items = Array.from(row.children);
  if (items.length < 2) return;

  const dots = document.createElement("div");
  dots.className = "swipe-dots";
  dots.setAttribute("role", "group");
  dots.setAttribute("aria-label", "Choose card");
  const buttons = items.map((item, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swipe-dots__dot";
    b.setAttribute("aria-label", `Card ${i + 1} of ${items.length}`);
    b.addEventListener("click", () => {
      row.scrollTo({ left: item.offsetLeft - row.offsetLeft - parseFloat(getComputedStyle(row).scrollPaddingLeft || 0), behavior: "smooth" });
    });
    dots.append(b);
    return b;
  });
  row.after(dots);

  let frame = null;
  const update = () => {
    frame = null;
    const overflow = row.scrollWidth > row.clientWidth + 2;
    dots.hidden = !overflow;
    if (!overflow) return;
    const start = row.getBoundingClientRect().left + parseFloat(getComputedStyle(row).scrollPaddingLeft || 0);
    let best = 0;
    let bestDist = Infinity;
    items.forEach((item, i) => {
      const d = Math.abs(item.getBoundingClientRect().left - start);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    // At the far end, the last card is "current" even if it can't snap left.
    if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 2) best = items.length - 1;
    buttons.forEach((b, i) => b.setAttribute("aria-current", String(i === best)));
  };

  row.addEventListener("scroll", () => (frame ||= requestAnimationFrame(update)), { passive: true });
  new ResizeObserver(update).observe(row);
  update();
}
