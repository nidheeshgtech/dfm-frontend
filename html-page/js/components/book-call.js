// "Book a call" popup for every [data-book-call] link. Native <dialog>
// (focus trap, Esc, top layer) over a dimmed, blurred page: a split card
// with the chosen person's portrait and a live summary (date, time, place,
// length) on a navy panel; on the right the form — floating-label inputs,
// colour-dot market pills, an avatar picker, a date field with a pop-up
// calendar, time pills and segmented switches for place / length — then
// a sent state. Links can pre-select a market (data-book-market="growth")
// or a person (data-book-person="kam"). The links keep a real href
// (mailto / #contact), so without JS they still work.
//
// No backend yet: submit validates, shows the sent state and logs the
// request. Wire it to the booking API / CRM where the TODO is.
const PEOPLE = [
  { id: "kam", name: "Kam Mattu", role: "Head of Listings", img: "images/team/p2.webp" },
  { id: "ramzi", name: "Ramzi Bazzy", role: "Vice President", img: "images/team/p1.webp" },
  { id: "meera", name: "Meera Al Ghobash", role: "Senior Manager", img: "images/team/p3.webp" },
];
const MARKETS = [
  ["growth", "Growth Market"],
  ["private", "Private Market"],
  ["closed", "Closed Market"],
];
const TIMES = ["10:00", "13:00", "15:00"];
const MONTHS = "January February March April May June July August September October November December".split(" ");

export function initBookCall() {
  const triggers = document.querySelectorAll("[data-book-call]");
  if (!triggers.length || typeof HTMLDialogElement === "undefined") return;
  initSingle(triggers);
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Tomorrow or later, skipping the weekend.
function nextWorkday(from) {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

function initSingle(triggers) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstOpen = nextWorkday(today);
  let date = firstOpen;
  let month = new Date(firstOpen.getFullYear(), firstOpen.getMonth(), 1);

  const dialog = buildSingle();
  const form = dialog.querySelector("form");
  const body = dialog.querySelector(".one__body");
  const portrait = dialog.querySelector("[data-portrait]");
  const s = (k) => dialog.querySelector(`[data-s="${k}"]`);
  let opener = null;
  let closing = false;

  const picked = (name) => form.querySelector(`[name="${name}"]:checked`);
  const summary = () => {
    const p = PEOPLE.find((x) => x.id === picked("person")?.value) || PEOPLE[0];
    if (portrait.dataset.id !== p.id) {
      portrait.dataset.id = p.id;
      portrait.classList.remove("is-in");
      void portrait.offsetWidth;
      portrait.src = p.img;
      portrait.classList.add("is-in");
    }
    s("name").textContent = p.name;
    s("role").textContent = p.role;
    s("date").textContent = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    dialog.querySelector("[data-date-label]").textContent = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    s("time").textContent = `${picked("time")?.value || TIMES[0]} GST`;
    s("place").textContent = picked("place")?.value || "In person";
    s("length").textContent = picked("length")?.value || "30 minutes";
  };

  // ---- Date field + popover calendar ----
  const dateBtn = dialog.querySelector("[data-date-btn]");
  const pop = dialog.querySelector("[data-date-pop]");
  const cal = dialog.querySelector("[data-cal]");
  const calTitle = dialog.querySelector("[data-cal-title]");
  const prev = dialog.querySelector("[data-cal-prev]");
  const renderCal = () => {
    calTitle.textContent = `${MONTHS[month.getMonth()]} ${month.getFullYear()}`;
    const lead = (month.getDay() + 6) % 7;
    const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    let html = "";
    for (let k = 0; k < lead; k++) html += "<span></span>";
    for (let d = 1; d <= n; d++) {
      const day = new Date(month.getFullYear(), month.getMonth(), d);
      const off = day < firstOpen || day.getDay() === 0 || day.getDay() === 6;
      html += `<button type="button" data-day="${d}"${off ? " disabled" : ""}${sameDay(day, date) ? ' aria-pressed="true"' : ""}>${d}</button>`;
    }
    cal.innerHTML = html;
    prev.disabled = month <= new Date(firstOpen.getFullYear(), firstOpen.getMonth(), 1);
  };
  function togglePop(open = pop.hidden) {
    pop.hidden = !open;
    dateBtn.setAttribute("aria-expanded", String(open));
    dialog.querySelector(".one__date-wrap").classList.toggle("is-open", open);
    if (open) {
      month = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCal();
      // Open upward when there's room above in the scroll area, else down.
      const room = dateBtn.getBoundingClientRect().top - body.getBoundingClientRect().top;
      pop.classList.toggle("is-down", room < pop.offsetHeight + 16);
      pop.scrollIntoView({ block: "nearest", behavior: "smooth" });
      cal.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
    }
  }
  dateBtn.addEventListener("click", () => togglePop());
  cal.addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]");
    if (!b || b.disabled) return;
    date = new Date(month.getFullYear(), month.getMonth(), Number(b.dataset.day));
    summary();
    togglePop(false);
    dateBtn.focus({ preventScroll: true });
  });
  prev.addEventListener("click", () => {
    month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    renderCal();
  });
  dialog.querySelector("[data-cal-next]").addEventListener("click", () => {
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    renderCal();
  });
  // Click outside / Esc closes the popover (Esc only the popover).
  dialog.addEventListener("click", (e) => {
    if (!pop.hidden && !e.target.closest(".one__date-wrap")) togglePop(false);
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      togglePop(false);
      dateBtn.focus();
    }
  });

  form.addEventListener("change", (e) => {
    if (e.target.name === "market") dialog.querySelector(".one__markets").classList.remove("is-error");
    summary();
  });
  form.addEventListener("input", (e) => e.target.closest(".one__float")?.classList.remove("is-error"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let first = null;
    form.querySelectorAll("input[required]").forEach((input) => {
      const bad = !input.value.trim() || (input.type === "email" && !/^\S+@\S+\.\S+$/.test(input.value));
      input.closest(".one__float").classList.toggle("is-error", bad);
      if (bad && !first) first = input;
    });
    const noMarket = !form.querySelector('[name="market"]:checked');
    dialog.querySelector(".one__markets").classList.toggle("is-error", noMarket);
    if (first || noMarket) {
      (first || dialog.querySelector(".one__markets")).scrollIntoView({ behavior: "smooth", block: "center" });
      first?.focus({ preventScroll: true });
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.markets = Array.from(form.querySelectorAll('[name="market"]:checked')).map((m) => m.value);
    data.date = date.toISOString().slice(0, 10);
    // TODO: POST to the booking endpoint once it exists.
    console.info("ARENA booking request", data);
    s("email").textContent = data.email;
    dialog.classList.add("is-sent");
    body.scrollTop = 0;
  });

  const open = (trigger) => {
    opener = trigger;
    form.reset();
    dialog.classList.remove("is-sent");
    form.querySelectorAll(".is-error").forEach((el) => el.classList.remove("is-error"));
    dialog.querySelector(".one__markets").classList.remove("is-error");
    const market = trigger.dataset.bookMarket || "growth";
    form.querySelectorAll('[name="market"]').forEach((m) => (m.checked = m.value === market));
    form.querySelector(`[name="person"][value="${trigger.dataset.bookPerson || PEOPLE[0].id}"]`).checked = true;
    date = firstOpen;
    month = new Date(firstOpen.getFullYear(), firstOpen.getMonth(), 1);
    togglePop(false);
    summary();
    body.scrollTop = 0;
    window.lenis?.stop();
    document.documentElement.classList.add("has-modal");
    dialog.showModal();
    form.querySelector('[name="company"]').focus({ preventScroll: true });
    requestAnimationFrame(() => dialog.classList.add("is-open"));
  };
  const close = () => {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.remove("is-open");
    setTimeout(() => {
      closing = false;
      dialog.close();
      window.lenis?.start();
      document.documentElement.classList.remove("has-modal");
      opener?.focus({ preventScroll: true });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380);
  };

  triggers.forEach((t) =>
    t.addEventListener("click", (e) => {
      e.preventDefault();
      open(t);
    }),
  );
  dialog.querySelectorAll("[data-one-close]").forEach((b) => b.addEventListener("click", close));
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
}

function buildSingle() {
  const MARKET_DOT = { growth: "#a38bf2", private: "#64fba0", closed: "#f4ff22" };
  const float = (name, label, type = "text", auto = "") =>
    `<label class="one__float"><input name="${name}" type="${type}" placeholder=" "${auto ? ` autocomplete="${auto}"` : ""} required><span>${label}</span><em>${type === "email" ? "Enter a valid email" : "Required"}</em></label>`;
  const seg = (name, values) =>
    `<div class="one__seg">${values.map((v, i) => `<label><input type="radio" name="${name}" value="${v}"${i ? "" : " checked"}><span>${v}</span></label>`).join("")}<i aria-hidden="true"></i></div>`;

  const dialog = document.createElement("dialog");
  dialog.className = "one";
  dialog.setAttribute("aria-labelledby", "one-title");
  dialog.innerHTML = `
    <div class="one__panel">
      <aside class="one__visual" aria-hidden="true">
        <img class="one__portrait is-in" data-portrait src="${PEOPLE[0].img}" width="1000" height="1100" alt="">
        <span class="one__shade"></span>
        <img class="one__mark" src="images/shared/mark-light.svg" width="64" height="64" alt="">
        <div class="one__card">
          <p class="one__eyebrow">You’re meeting</p>
          <b data-s="name"></b>
          <small data-s="role"></small>
          <ul class="one__facts">
            <li><svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 3.5v4m8-4v4M4 10h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span data-s="date"></span></li>
            <li><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span data-s="time"></span></li>
            <li><svg viewBox="0 0 24 24"><path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="11" r="2" fill="currentColor"/></svg><span data-s="place"></span></li>
            <li><svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9m8-18c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span data-s="length"></span></li>
          </ul>
        </div>
      </aside>

      <div class="one__main">
        <header class="one__head">
          <div>
            <p class="one__eyebrow">ARENA · Business Development</p>
            <h2 class="one__title" id="one-title">Request a meeting</h2>
          </div>
          <button class="one__close" type="button" data-one-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        </header>

        <form class="one__form" novalidate>
          <div class="one__body">
            <div class="one__fill">
              <div class="one__grid">
                ${float("company", "Company name", "text", "organization")}
                ${float("name", "Contact person", "text", "name")}
                ${float("email", "Email address", "email", "email")}
                ${float("phone", "Phone number (+971)", "tel", "tel")}
              </div>

              <p class="one__label">Market of interest</p>
              <div class="one__pills one__markets">${MARKETS.map(
                ([v, l]) => `<label class="one__pill"><input type="checkbox" name="market" value="${v}"><span><i style="--dot: ${MARKET_DOT[v]}"></i>${l}</span></label>`,
              ).join("")}</div>

              <p class="one__label">Who would you like to meet?</p>
              <div class="one__people">${PEOPLE.map(
                (p) => `<label class="one__avatar"><input type="radio" name="person" value="${p.id}"><img src="${p.img}" width="72" height="72" alt="" loading="lazy"><b>${p.name}</b><small>${p.role}</small></label>`,
              ).join("")}</div>

              <div class="one__row one__row--2">
                <div class="one__date-wrap">
                  <p class="one__label">Date</p>
                  <button class="one__date" type="button" aria-haspopup="dialog" aria-expanded="false" data-date-btn>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 3.5v4m8-4v4M4 10h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                    <span data-date-label></span>
                    <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></i>
                  </button>
                  <div class="one__pop" data-date-pop hidden>
                    <div class="one__pop-head"><b data-cal-title></b><span><button type="button" data-cal-prev aria-label="Previous month">‹</button><button type="button" data-cal-next aria-label="Next month">›</button></span></div>
                    <div class="one__pop-days" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
                    <div class="one__pop-grid" data-cal></div>
                  </div>
                </div>
                <div><p class="one__label">Time (GST)</p><div class="one__pills">${TIMES.map((t, i) => `<label class="one__pill"><input type="radio" name="time" value="${t}"${i ? "" : " checked"}><span>${t}</span></label>`).join("")}</div></div>
              </div>
              <div class="one__row one__row--2">
                <div><p class="one__label">Meeting location</p>${seg("place", ["In person", "Virtual meeting"])}</div>
                <div><p class="one__label">How long do you need?</p>${seg("length", ["30 minutes", "1 hour"])}</div>
              </div>

              <p class="one__note">Confidential and commitment-free. Your details go only to the ARENA Business Development team. Prefer email? <a href="mailto:arena@dfm.ae">arena@dfm.ae</a></p>
            </div>

            <div class="one__done" role="status">
              <span class="one__tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
              <h3>You’re booked in.</h3>
              <p>We’ll confirm the details by email at <b data-s="email"></b> within one working day.</p>
              <button class="one__submit one__submit--ghost" type="button" data-one-close>Close</button>
            </div>
          </div>

          <footer class="one__foot">
            <button class="one__submit" type="submit"><span>Request meeting</span><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></i></button>
          </footer>
        </form>
      </div>
    </div>`;
  document.body.append(dialog);
  return dialog;
}
