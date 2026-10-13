// Header: hides while scrolling down, slides back in on scroll up,
// white logo/text while it sits over a [data-header="light"] section,
// and the mobile menu toggle. Listens to native scroll, which Lenis
// keeps in sync.
const SCROLL_THRESHOLD = 8; // px from top that still counts as "top"
const DIRECTION_DELTA = 6; // ignore tiny jitters before flipping state

export function initHeader() {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;

  bindHideOnScroll(header);

  watchSections(header, '[data-header="light"]', "is-on-dark");
  watchSections(header, '[data-header="dark"]', "is-on-light");
  bindMenu(header);
}

// Toggle a header class while the header's bottom edge is inside one of
// the matching sections ([data-header="light"] = dark section, white
// header; [data-header="dark"] = light section, dark header).
// ScrollTrigger when available; plain scroll check if not.
function watchSections(header, selector, className) {
  const sections = document.querySelectorAll(selector);
  if (!sections.length) return;

  const ScrollTrigger = window.ScrollTrigger;
  const headerHeight = () => header.offsetHeight;
  const active = new Set();
  const apply = () => header.classList.toggle(className, active.size > 0);

  if (ScrollTrigger) {
    window.gsap?.registerPlugin(ScrollTrigger);
    sections.forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: () => `top ${headerHeight()}px`,
        end: () => `bottom ${headerHeight()}px`,
        onToggle: (self) => {
          if (self.isActive) active.add(section);
          else active.delete(section);
          apply();
        },
      });
    });
    return;
  }

  const check = () => {
    const line = headerHeight();
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) active.add(section);
      else active.delete(section);
    });
    apply();
  };
  check();
  window.addEventListener("scroll", check, { passive: true });
}

function bindHideOnScroll(header) {
  let lastY = window.scrollY;
  let frame = null;

  const update = () => {
    frame = null;
    const y = window.scrollY;
    const delta = y - lastY;
    const pastHeader = y > header.offsetHeight;
    const pinned = header.classList.contains("is-menu-open") || header.contains(document.activeElement);

    header.classList.toggle("is-scrolled", y > SCROLL_THRESHOLD);

    if (!pastHeader || pinned) {
      header.classList.remove("is-hidden");
      lastY = y;
    } else if (Math.abs(delta) >= DIRECTION_DELTA) {
      header.classList.toggle("is-hidden", delta > 0);
      lastY = y;
    }
  };

  update();
  window.addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );

  // Keyboard users tabbing into the header always get it back.
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
}

function bindMenu(header) {
  const button = header.querySelector("[data-menu-button]");
  const nav = header.querySelector("[data-menu]");
  if (!button || !nav) return;

  // Menu theme: data-menu-theme on the header, ?menu=light|dark overrides.
  const theme = new URLSearchParams(window.location.search).get("menu");
  if (theme === "light" || theme === "dark") header.dataset.menuTheme = theme;
  // Background variation: dots (default) or aurora — ?menubg=aurora.
  const bg = new URLSearchParams(window.location.search).get("menubg");
  if (bg === "dots" || bg === "aurora") header.dataset.menuBg = bg;

  const setOpen = (open) => {
    // The panel grows out of the button, wherever it sits.
    if (open) {
      const box = button.getBoundingClientRect();
      header.style.setProperty("--menu-x", `${Math.round(box.left + box.width / 2)}px`);
      header.style.setProperty("--menu-y", `${Math.round(box.top + box.height / 2)}px`);
    }
    header.classList.toggle("is-menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    // Full-screen menu on mobile: the page behind stays put.
    document.documentElement.classList.toggle("has-menu", open);
    if (open) window.lenis?.stop();
    else window.lenis?.start();
  };

  // Leaving the mobile layout closes it.
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (event) => event.matches && setOpen(false));

  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
}
