// Strategic fit assessment (eligibility.html): four steps of tap answers
// ([data-key] groups of .fit-chip, [data-multi] = choose several) plus a
// contact step. Each step checks its answers before moving on; the last
// one scores the answers into a recommended ARENA route, a fit badge and
// four readiness checks. Scoring follows the issuer assessment prototype.
// Nothing is sent anywhere in this build.
const ROUTES = {
  growth: { name: "Growth Market", href: "growth-market.html", why: "Raising from the wide market, with shares that trade freely, matches what you told us." },
  private: { name: "Private Market", href: "private-market.html", why: "A select circle of approved investors and a pre-IPO profile point this way." },
  closed: { name: "Closed Market", href: "closed-market.html", why: "Keeping ownership inside a trusted circle points to a Closed Market admission." },
};

// Questions each step must answer (step 4 checks the contact fields).
const NEED = [
  ["jurisdiction", "structure", "sector", "stage", "ownership"],
  ["priorities", "outcomes", "timeframe"],
  ["access", "revenue", "deal", "track", "governance"],
  [],
];

export function initFitForm() {
  const form = document.querySelector("[data-fit]");
  if (!form) return;

  const card = form.closest(".fit__card");
  const steps = [...form.querySelectorAll(".fit-step")];
  const bars = [...card.querySelectorAll(".fit__bar i")];
  const nav = [...document.querySelectorAll("[data-fit-nav] li")];
  const back = form.querySelector("[data-fit-back]");
  const next = form.querySelector("[data-fit-next]");
  const nextLabel = next.querySelector(".btn-pill__label");
  const hint = form.querySelector("[data-fit-hint]");
  const result = card.querySelector("[data-fit-result]");
  const $ = (id) => document.getElementById(id);
  const answers = {};
  let step = 0;

  const show = (i, focus = true) => {
    step = i;
    steps.forEach((s, j) => (s.hidden = j !== i));
    bars.forEach((b, j) => b.classList.toggle("is-on", j <= i));
    nav.forEach((li, j) => {
      li.classList.toggle("is-on", j === i);
      li.classList.toggle("is-done", j < i);
    });
    back.hidden = i === 0;
    nextLabel.textContent = i === 3 ? "See my result" : "Continue";
    hint.textContent = "";
    if (focus) {
      steps[i].querySelector(".fit-step__title").setAttribute("tabindex", "-1");
      steps[i].querySelector(".fit-step__title").focus({ preventScroll: true });
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Chips: one answer per group, or several in [data-multi] groups.
  form.querySelectorAll("[data-key]").forEach((group) => {
    const key = group.dataset.key;
    const multi = group.hasAttribute("data-multi");
    const chips = [...group.querySelectorAll(".fit-chip")];
    if (multi) answers[key] = [];
    chips.forEach((chip, idx) =>
      chip.addEventListener("click", () => {
        if (multi) {
          const on = chip.getAttribute("aria-pressed") !== "true";
          chip.setAttribute("aria-pressed", String(on));
          answers[key] = chips.flatMap((c, j) => (c.getAttribute("aria-pressed") === "true" ? [j] : []));
        } else {
          chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
          answers[key] = idx;
        }
        group.classList.remove("is-missing");
      }),
    );
  });

  const answered = (k) => (Array.isArray(answers[k]) ? answers[k].length > 0 : answers[k] !== undefined);

  const check = () => {
    form.querySelectorAll(".is-missing").forEach((el) => el.classList.remove("is-missing"));
    if (step === 0 && !$("fitCompany").value.trim()) {
      $("fitCompany").closest(".fit-field").classList.add("is-missing");
      return "Please add your company name.";
    }
    if (step === 3) {
      if (!$("fitName").value.trim()) return mark("fitName", "Please add your name.");
      if (!/.+@.+\..+/.test($("fitEmail").value.trim())) return mark("fitEmail", "Please add a valid business email.");
      if (!$("fitConsent").checked) return "Please tick the consent box so the team can contact you.";
      return "";
    }
    const missing = NEED[step].filter((k) => !answered(k));
    missing.forEach((k) => form.querySelector(`[data-key="${k}"]`).classList.add("is-missing"));
    return missing.length ? "Please answer every question to continue." : "";
  };
  const mark = (id, msg) => {
    $(id).closest(".fit-field").classList.add("is-missing");
    return msg;
  };

  const score = () => {
    const a = answers;
    const s = { growth: 0, private: 0, closed: 0 };
    if (a.ownership === 1) s.closed += 2;
    if (a.ownership === 2) s.private += 1;
    if (a.ownership === 4) s.private += 2;
    (a.priorities || []).forEach((i) => {
      if (i === 0) s.growth += 2;
      if (i === 1 || i === 3 || i === 4) s.growth += 1;
      if (i === 2 || i === 5) s.private += 2;
      if (i === 6) s.private += 1;
      if (i === 7) s.closed += 2;
    });
    (a.outcomes || []).forEach((i) => {
      if (i === 0) s.private += 1;
      if (i === 1) s.private += 2;
      if (i === 2) s.closed += 2;
      if (i === 3) s.growth += 1;
    });
    if (a.access === 0) s.closed += 2;
    if (a.access === 1) s.private += 2;
    if (a.access === 2) s.growth += 2;
    if (a.deal === 3) s.private += 1;
    let route = "growth";
    if (s.private > s[route]) route = "private";
    if (s.closed > s[route]) route = "closed";

    const under = a.revenue === 0 || a.deal === 0;
    const outside = a.jurisdiction === 4;
    const shortTrack = a.track === 2;
    const structIssue = a.structure >= 2;
    let badge = "Thank you. The team will review your path";
    let tone = "warn";
    if (!under && !outside && !shortTrack && !structIssue) [badge, tone] = ["Strong strategic fit", "ok"];
    else if (!under && !outside && !shortTrack) [badge, tone] = ["Promising fit, with preparation", "mid"];

    const flags = [];
    if (a.deal >= 1 && a.deal <= 3 && a.revenue >= 1 && a.revenue <= 3) flags.push(["Scale", "Meets the expected range", true]);
    else if (a.deal === 4 || a.revenue === 4) flags.push(["Scale", "To be confirmed together", false]);
    else flags.push(["Scale", "Below the typical range", false]);
    flags.push(a.track === 0 ? ["Track record", "In place", true] : a.track === 1 ? ["Track record", "Revenue history to build", false] : ["Track record", "Under two years", false]);
    flags.push(a.governance === 0 ? ["Governance", "In place", true] : ["Governance", "Preparation recommended", false]);
    flags.push(a.structure <= 1 ? ["Legal structure", "In place", true] : ["Legal structure", "Restructuring assessment", false]);
    return { route, badge, tone, flags };
  };

  const showResult = () => {
    const { route, badge, tone, flags } = score();
    const r = ROUTES[route];
    const badgeEl = result.querySelector("[data-fit-badge]");
    badgeEl.textContent = badge;
    badgeEl.dataset.tone = tone;
    result.querySelector("[data-fit-route]").dataset.route = route;
    result.querySelector("[data-fit-path]").textContent = r.name;
    result.querySelector("[data-fit-why]").textContent = r.why;
    const link = result.querySelector("[data-fit-link]");
    link.href = r.href;
    link.textContent = `View the ${r.name}`;
    result.querySelector("[data-fit-flags]").innerHTML = flags
      .map(([k, v, ok]) => `<li><span>${k}</span><b class="${ok ? "is-ok" : "is-warn"}">${v}</b></li>`)
      .join("");
    form.hidden = true;
    result.hidden = false;
    card.classList.add("is-done");
    nav.forEach((li) => {
      li.classList.remove("is-on");
      li.classList.add("is-done");
    });
    result.focus({ preventScroll: true });
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const restart = () => {
    Object.keys(answers).forEach((k) => delete answers[k]);
    form.querySelectorAll("[data-key]").forEach((g) => {
      if (g.hasAttribute("data-multi")) answers[g.dataset.key] = [];
    });
    form.reset();
    form.querySelectorAll(".fit-chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    form.querySelectorAll(".is-missing").forEach((el) => el.classList.remove("is-missing"));
    result.hidden = true;
    form.hidden = false;
    card.classList.remove("is-done");
    show(0);
  };

  next.addEventListener("click", () => {
    const err = check();
    if (err) {
      hint.textContent = err;
      form.querySelector(".is-missing")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (step < 3) show(step + 1);
    else showResult();
  });
  back.addEventListener("click", () => show(Math.max(0, step - 1)));
  result.querySelector("[data-fit-restart]").addEventListener("click", restart);
  form.addEventListener("input", (e) => e.target.closest(".fit-field")?.classList.remove("is-missing"));
  show(0, false);
}
