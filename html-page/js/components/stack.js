// Markets: flat stacking cards under a sticky heading. The
// heading and each .market are position:sticky
// (CSS, only in the media query below); this scrubs the card UNDERNEATH
// as the next one slides over it — shrinks a little and darkens (no 3D) —
// and gives each card's photo a gentle settle as it arrives.
//
// v2 "deck" (default via data-stack-variant="v2"; ?stack=v1 shows the old one; after
// Skiper UI "Card stack scroll"): every card sticks at the same spot; as
// each new card rises in, the ones behind shrink and step UP, so their top
// edges fan out above the current card.
const STACK_QUERY = "(min-width: 1024px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)";

export function initStack() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const lists = document.querySelectorAll("[data-stack]");
  if (!lists.length || !gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // matchMedia sets up / tears down the tweens as the query flips.
  const mm = gsap.matchMedia();
  mm.add(STACK_QUERY, () => {
    const stopMeasuring = measureStuckHeading();

    lists.forEach((list) => {
      const cards = Array.from(list.querySelectorAll("[data-stack-item]"));
      cards.forEach((item, index) => item.style.setProperty("--i", index));

      const fromUrl = new URLSearchParams(window.location.search).get("stack");
      if ((fromUrl || list.dataset.stackVariant) === "v2") {
        setupDeck(list, cards);
        return;
      }

      cards.forEach((item, index) => {
        const card = item.querySelector(".market__card");
        const shade = item.querySelector(".market__shade");
        const photo = item.querySelector(".market__media");

        // Arrival: photo settles from a slight zoom while the card rises in.
        if (photo) {
          gsap.fromTo(
            photo,
            { scale: 1.12 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: item, start: "top bottom", end: "top top", scrub: true },
            },
          );
        }

        const next = cards[index + 1];
        if (!next || !card) return;

        // Departure: as the next card travels from the bottom of the screen
        // to its sticky slot, this one eases back (flat) and dims.
        const scrollTrigger = {
          trigger: next,
          start: "top bottom",
          end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`,
          scrub: true,
          invalidateOnRefresh: true,
        };
        gsap.fromTo(card, { scale: 1 }, { scale: 0.94, ease: "none", scrollTrigger });
        if (shade) gsap.fromTo(shade, { opacity: 0 }, { opacity: 0.55, ease: "none", scrollTrigger: { ...scrollTrigger } });
      });
    });

    releaseHeadWithCards();

    return () => {
      stopMeasuring();
      document.querySelectorAll("[data-stack]").forEach((list) => list.classList.remove("markets__list--deck"));
      document.querySelectorAll("[data-stack-item]").forEach((item) => item.style.removeProperty("--i"));
    };
  });
}

// The sticky heading shows everything except its top padding (minus a
// small gap). Publish that height as --markets-stuck-h so the cards stick
// right under it and size themselves to the space that's left.
function measureStuckHeading() {
  const observers = [];

  document.querySelectorAll("[data-markets]").forEach((wrap) => {
    const head = wrap.querySelector(".markets-head");
    if (!head) return;

    const update = () => {
      const styles = getComputedStyle(wrap);
      const padTop = parseFloat(getComputedStyle(head).paddingTop) || 0;
      const gap = parseFloat(styles.getPropertyValue("--head-stuck-gap")) || 0;
      wrap.style.setProperty("--markets-stuck-h", `${Math.round(head.offsetHeight - padTop + gap)}px`);
      window.ScrollTrigger?.refresh();
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(head);
    observers.push([observer, wrap]);
  });

  return () =>
    observers.forEach(([observer, wrap]) => {
      observer.disconnect();
      wrap.style.removeProperty("--markets-stuck-h");
    });
}

// Sticky alone would keep the heading pinned until the end of the wrapper,
// so after the last card lands the cards would slide away underneath it.
// Instead, once the stack is complete (list bottom meets the viewport
// bottom), lift the heading 1:1 with the scroll so it leaves together
// with the cards. The tween ends exactly where native sticky releases,
// so motion stays continuous after that.
function releaseHeadWithCards() {
  const gsap = window.gsap;

  document.querySelectorAll("[data-markets]").forEach((wrap) => {
    const head = wrap.querySelector(".markets-head");
    const list = wrap.querySelector("[data-stack]");
    if (!head || !list) return;

    const distance = () => {
      const stuckTop = parseFloat(getComputedStyle(head).top) || 0;
      const tail = wrap.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom;
      return Math.max(0, window.innerHeight + tail - (stuckTop + head.offsetHeight));
    };

    gsap.fromTo(
      head,
      { y: 0 },
      {
        y: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: list,
          start: "bottom bottom",
          end: () => `+=${distance()}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  });
}

// ---- v2: deck ----
// Each card's "depth" = how many later cards have (partly) landed on it,
// as a continuous value from their scroll progress. Depth drives scale,
// upward step and shade, so the motion is fully scrubbed and reversible.
function setupDeck(list, cards) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  list.classList.add("markets__list--deck");
  list.style.setProperty("--stack-n", cards.length);

  const SCALE_STEP = 0.06;
  const SHADE_STEP = 0.28;
  const parts = cards.map((item) => ({
    item,
    card: item.querySelector(".market__card"),
    shade: item.querySelector(".market__shade"),
    photo: item.querySelector(".market__media"),
  }));

  // Photo settle on arrival, as in v1.
  parts.forEach(({ item, photo }) => {
    if (!photo) return;
    gsap.fromTo(photo, { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: item, start: "top bottom", end: "top top", scrub: true } });
  });

  const update = () => {
    const vh = window.innerHeight;
    const step = parseFloat(getComputedStyle(list).getPropertyValue("--deck-peek")) || 24;
    // 0 → 1 as a card travels from the bottom of the screen to its slot.
    const landed = parts.map(({ item }) => {
      const top = item.getBoundingClientRect().top;
      const slot = parseFloat(getComputedStyle(item).top) || 0;
      return Math.min(1, Math.max(0, (vh - top) / Math.max(1, vh - slot)));
    });
    parts.forEach(({ card, shade }, i) => {
      let depth = 0;
      for (let j = i + 1; j < landed.length; j++) depth += landed[j];
      gsap.set(card, { scale: 1 - depth * SCALE_STEP, y: -depth * step, force3D: true });
      if (shade) gsap.set(shade, { opacity: Math.min(0.7, depth * SHADE_STEP) });
    });
  };

  ScrollTrigger.create({
    trigger: list,
    start: "top bottom",
    end: "bottom top",
    onUpdate: update,
    onRefresh: update,
  });
  update();
}
