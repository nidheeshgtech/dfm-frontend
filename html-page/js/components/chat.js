// ARENA assistant: a floating chat on every page. The launcher is a small
// orb (ARENA mark, a colour ring turning round it) bottom-right that
// stretches into an "Ask ARENA" pill on hover and leans towards the
// pointer; a greeting bubble pops out once a few seconds in. Clicking
// bursts the panel open from the orb (a growing circle).
//
// ?chat=b swaps in option B, the "order ticket" chat: a swirl coin tucked
// into the right edge of the screen opens a full-height drawer with a
// ticker of suggested questions; questions and answers are numbered
// tickets (Q-01 · YOU / A-01 · ARENA) and each answer is "matched" with a
// scanning bar before it lands with a MATCHED stamp.
// ?chat=c: a glass dock bottom-centre ("Ask ARENA anything ⌘K"); click or
// ⌘K / Ctrl+K opens a big centred command prompt over a dimmed page.
// ?chat=d: an iVestor phone peeking up from the bottom-left corner; click
// and the whole phone slides up with the chat running inside it.
// ?chat=e: a bot orb at the right centre; the chat card wipes open
// beside it.
// ?chat=f: an "Ask ARENA" tab on the right edge that slides out on hover;
// it opens a full-height dark sheet from the edge.
//
// No live AI yet: replies come from the page's own FAQ (when it has one)
// plus the markets / contact facts below, matched with the same word
// scoring as the "Ask ARENA" bar (invest-ask.js), and are written out
// word by word after a short "typing" pause. Anything with
// [href="#assistant"] (the FAQ's "Ask the assistant" button) opens it too.
import { words, near } from "./invest-ask.js";

const CONTACT = "You can reach the ARENA team on <a href=\"tel:+97140000000\">+971 4 000 0000</a> or <a href=\"mailto:arena@dfm.ae\">arena@dfm.ae</a>.";

// Facts every page can answer (copy from the Invest and routes deck).
const FACTS = [
  {
    q: "What is the Growth Market?",
    a: "The Growth Market is open to the market: growing companies raise capital from the wide market, anyone with a DFM investor number can subscribe in the iVestor app, and shares trade freely from listing day.",
    link: ["growth-market.html", "Explore Growth Market"],
  },
  {
    q: "What is the Private Market?",
    a: "The Private Market is by invitation: pre-IPO companies raise from a select circle of approved investors, and shares change hands in private trading windows.",
    link: ["private-market.html", "Explore Private Market"],
  },
  {
    q: "What is the Closed Market?",
    a: "The Closed Market is admission only: family businesses open ownership to family and employees, and trading stays private, inside the circle.",
    link: ["closed-market.html", "Explore Closed Market"],
  },
  {
    q: "How do I contact the ARENA team?",
    a: `${CONTACT} Calls are confidential, before you commit to anything.`,
  },
];

const SUGGESTIONS = {
  invest: ["Who can invest on ARENA?", "What does it cost to invest?", "What is the Private Market?"],
  company: ["What is the Growth Market?", "How do I contact the ARENA team?", "What is the Closed Market?"],
};

const GREETING = {
  invest: "Hi, I'm the ARENA assistant. Ask me about investing, the three markets or how offers work.",
  company: "Hi, I'm the ARENA assistant. Ask me about raising capital, the three markets or talking to the team.",
};

export function initChat() {
  if (document.querySelector("[data-chat]")) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const audience = document.body.classList.contains("page-invest") ? "invest" : "company";

  // Knowledge: this page's FAQ, then the shared facts.
  const knowledge = [
    ...Array.from(document.querySelectorAll(".faq-item")).map((item) => ({
      q: item.querySelector(".faq-item__q")?.textContent.trim() || "",
      a: escapeHtml(item.querySelector(".faq-item__a")?.textContent.trim() || ""),
    })),
    ...FACTS,
  ].filter((k) => k.q && k.a);

  // C (the bottom-centre "Ask ARENA anything" dock) is the default on every
  // page; ?chat= or body data-chat-variant still pick another demo.
  const param = new URLSearchParams(window.location.search).get("chat") || document.body.dataset.chatVariant;
  const variant = ["a", "b", "c", "d", "e", "f"].includes(param) ? param : "c";
  const root = document.createElement("div");
  root.className = `chat chat--${variant}`;
  root.dataset.chat = "";
  root.innerHTML =
    variant === "b" ? ticketMarkup(SUGGESTIONS[audience])
    : variant === "c" ? paletteMarkup()
    : variant === "d" ? phoneMarkup()
    : variant === "e" ? railMarkup()
    : variant === "f" ? tabsMarkup()
    : `
    <div class="chat__greet" role="status" hidden>
      <button class="chat__greet-close" type="button" aria-label="Dismiss">×</button>
      <p><b>Hi there</b> Questions about ARENA? Ask me anything.</p>
    </div>
    <button class="chat__launcher" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Ask ARENA">
      <span class="chat__ring" aria-hidden="true"></span>
      <span class="chat__orb" aria-hidden="true"><img src="images/shared/mark-light.svg" width="64" height="64" alt=""></span>
      <span class="chat__label">Ask ARENA</span>
      <span class="chat__close-icon" aria-hidden="true"></span>
    </button>
    ${orbPanel()}`;
  document.body.append(root);

  const launcher = root.querySelector(".chat__launcher");
  const panel = root.querySelector(".chat__panel");
  const log = root.querySelector("[data-chat-log]");
  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const send = root.querySelector(".chat__send");
  if (audience === "company" && variant !== "d") input.placeholder = "Ask about raising, markets, eligibility…";
  const greet = root.querySelector(".chat__greet");
  let busy = false;
  let ticket = 0;
  const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // ---- Messages ----
  const scrollDown = () => log.scrollTo({ top: log.scrollHeight, behavior: reduce ? "auto" : "smooth" });

  const add = (who, html = "") => {
    const msg = document.createElement("div");
    msg.className = `chat__msg chat__msg--${who}`;
    if (variant === "b") {
      // Ticket: Q-01 · YOU · 14:32 / A-01 · ARENA · …
      if (who === "me") ticket += 1;
      const id = `${who === "me" ? "Q" : "A"}-${String(ticket).padStart(2, "0")}`; // greeting is A-00
      msg.innerHTML = `<div class="chat__ticket-head"><b>${id}</b><span>${who === "me" ? "You" : "ARENA"}</span><time>${now()}</time></div><div class="chat__bubble">${html}</div>`;
    } else {
      msg.innerHTML = `<div class="chat__bubble">${html}</div>`;
    }
    log.append(msg);
    scrollDown();
    return msg.querySelector(".chat__bubble");
  };

  const chips = (list) => {
    if (variant === "b") return; // the ticker carries the suggestions
    const wrap = document.createElement("div");
    wrap.className = "chat__chips";
    list.forEach((text) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chat__chip";
      b.textContent = text;
      b.addEventListener("click", () => ask(text));
      wrap.append(b);
    });
    log.append(wrap);
    scrollDown();
  };

  // Bot reply: typing dots, then the text written out word by word.
  const reply = (text, extra = "", matched = true) =>
    variant === "b" ? replyTicket(text, extra, matched) : new Promise((resolve) => {
      const bubble = add("bot", '<span class="chat__typing"><i></i><i></i><i></i></span>');
      const wait = reduce ? 0 : 650 + Math.min(900, text.length * 6);
      setTimeout(() => {
        if (reduce) {
          bubble.innerHTML = text + extra;
          scrollDown();
          return resolve();
        }
        // Split on spaces but keep any <a …> link whole.
        const parts = text.match(/<a [^>]*>.*?<\/a>\S*|\S+/g) || [];
        bubble.innerHTML = "";
        let i = 0;
        const step = () => {
          bubble.innerHTML = parts.slice(0, ++i).join(" ");
          if (i % 4 === 0) scrollDown();
          if (i < parts.length) return setTimeout(step, 28);
          bubble.insertAdjacentHTML("beforeend", extra);
          scrollDown();
          resolve();
        };
        step();
      }, wait);
    });

  // B: a scanning "Matching…" bar, then the answer fades in line by line
  // and the ticket gets its stamp (MATCHED, or ROUTED TO TEAM).
  const replyTicket = (text, extra, matched) =>
    new Promise((resolve) => {
      const bubble = add("bot", '<span class="chat__match"><i></i><em>Matching</em></span>');
      const head = bubble.previousElementSibling;
      const ms = reduce ? 0 : 700 + Math.min(700, text.length * 4);
      setTimeout(() => {
        bubble.innerHTML = `<span class="chat__reveal">${text}</span>${extra}`;
        const label = ticket === 0 ? "Desk open" : matched ? `Matched · ${(ms / 1000).toFixed(1)}s` : "Routed to team";
        head.insertAdjacentHTML("beforeend", `<i class="chat__stamp${matched ? "" : " is-routed"}">${label}</i>`);
        scrollDown();
        resolve();
      }, ms);
    });

  const answerFor = (question) => {
    const query = words(question);
    let best = null;
    let bestScore = 0;
    knowledge.forEach((k) => {
      const q = words(k.q);
      const a = words(k.a);
      const score = query.reduce((sum, w) => sum + (q.some((x) => near(x, w)) ? 2 : 0) + (a.some((x) => near(x, w)) ? 1 : 0), 0);
      if (score > bestScore) {
        best = k;
        bestScore = score;
      }
    });
    return bestScore >= 2 ? best : null;
  };

  async function ask(question) {
    const text = question.trim();
    if (!text || busy) return;
    busy = true;
    log.querySelectorAll(".chat__chips").forEach((c) => c.remove());
    add("me", escapeHtml(text));
    input.value = "";
    send.disabled = true;
    const hit = answerFor(text);
    if (hit) {
      const link = hit.link ? `<a class="chat__more" href="${hit.link[0]}">${hit.link[1]} →</a>` : "";
      await reply(hit.a, link);
    } else {
      await reply(`I don't have an answer for that one yet. ${CONTACT}`, "", false);
    }
    busy = false;
    chips(SUGGESTIONS[audience].filter((s) => s !== hit?.q).slice(0, 2));
  }

  // Busy while the greeting writes out, so an early question can't race
  // the opening chips.
  const start = async () => {
    busy = true;
    log.innerHTML = "";
    ticket = 0;
    await reply(GREETING[audience]);
    chips(SUGGESTIONS[audience]);
    busy = false;
  };

  // ---- Open / close ----
  let started = false;
  const setOpen = (open) => {
    root.classList.toggle("is-open", open);
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close the ARENA assistant" : "Ask ARENA");
    if (open) {
      panel.hidden = false;
      hideGreet();
      requestAnimationFrame(() => root.classList.add("is-shown"));
      if (!started) {
        started = true;
        start();
      }
      setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 380);
    } else {
      root.classList.remove("is-shown");
      setTimeout(() => {
        if (!root.classList.contains("is-open")) panel.hidden = true;
      }, reduce ? 0 : 450);
    }
  };

  launcher.addEventListener("click", () => setOpen(!root.classList.contains("is-open")));
  root.querySelector("[data-chat-close]").addEventListener("click", () => {
    setOpen(false);
    launcher.focus();
  });
  root.querySelectorAll("[data-chat-ask]").forEach((b) => b.addEventListener("click", () => ask(b.dataset.chatAsk)));
  root.querySelector("[data-chat-scrim]")?.addEventListener("click", () => setOpen(false));
  root.querySelector("[data-chat-reset]").addEventListener("click", () => {
    if (!busy) start();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open")) {
      setOpen(false);
      launcher.focus();
    }
  });
  document.querySelectorAll('[href="#assistant"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      setOpen(true);
    }),
  );

  // C: ⌘K / Ctrl+K anywhere opens (or closes) the prompt.
  if (variant === "c") {
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!root.classList.contains("is-open"));
      }
    });
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    root.querySelectorAll("[data-chat-kbd]").forEach((k) => (k.textContent = mac ? "⌘K" : "Ctrl K"));
  }

  input.addEventListener("input", () => (send.disabled = !input.value.trim()));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
  });

  // ---- Greeting bubble (once per session) ----
  function hideGreet() {
    greet.classList.remove("is-in");
    setTimeout(() => (greet.hidden = true), 400);
  }
  greet.querySelector(".chat__greet-close").addEventListener("click", (e) => {
    e.stopPropagation();
    hideGreet();
  });
  greet.addEventListener("click", () => setOpen(true));
  // Only the orb, the rail and the tabs get a bubble.
  let greeted = !["a", "e", "f"].includes(variant);
  try {
    greeted ||= sessionStorage.getItem("arena-chat-greet") === "1";
  } catch {}
  if (!greeted) {
    (window.arenaLoaded || Promise.resolve()).then(() =>
      setTimeout(() => {
        if (root.classList.contains("is-open")) return;
        greet.hidden = false;
        requestAnimationFrame(() => greet.classList.add("is-in"));
        try {
          sessionStorage.setItem("arena-chat-greet", "1");
        } catch {}
        setTimeout(hideGreet, 9000);
      }, 4000),
    );
  }

  // ---- Magnetic launcher (fine pointers) ----
  if (variant === "a" && !reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    launcher.addEventListener("pointermove", (e) => {
      const b = launcher.getBoundingClientRect();
      launcher.style.setProperty("--mx", `${((e.clientX - b.left - b.width / 2) * 0.18).toFixed(1)}px`);
      launcher.style.setProperty("--my", `${((e.clientY - b.top - b.height / 2) * 0.18).toFixed(1)}px`);
    });
    launcher.addEventListener("pointerleave", () => {
      launcher.style.removeProperty("--mx");
      launcher.style.removeProperty("--my");
    });
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// The orb's chat card (A), reused by the rail (E).
function orbPanel() {
  return `
    <section class="chat__panel" id="chat-panel" role="dialog" aria-modal="false" aria-label="ARENA assistant" hidden>
      <header class="chat__head">
        <span class="chat__avatar" aria-hidden="true"><img src="images/shared/mark-light.svg" width="64" height="64" alt=""></span>
        <span class="chat__who">
          <b>ARENA Assistant</b>
          <small><i></i>Instant answers from ARENA</small>
        </span>
        <button class="chat__icon-btn" type="button" data-chat-reset aria-label="New chat"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="chat__icon-btn" type="button" data-chat-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </header>
      <div class="chat__log" data-chat-log aria-live="polite"></div>
      <form class="chat__form" data-chat-form>
        <label class="chat__field">
          <span class="chat__sr">Your question</span>
          <input type="text" name="q" placeholder="Ask about investing, markets, fees…" autocomplete="off" data-chat-input>
          <button class="chat__send" type="submit" aria-label="Send" disabled><svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </label>
        <p class="chat__note">Information only, not investment advice.</p>
      </form>
    </section>`;
}

// AI assistant icons: a bot face (E; eyes blink, antenna glows) and a chat
// bubble with sparkles (F; sparkles twinkle).
const BOT = '<svg class="chat__bot" viewBox="0 0 32 32"><path d="M16 4.5v3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle class="chat__bot-tip" cx="16" cy="4" r="2.2"/><rect x="5.5" y="8.5" width="21" height="17" rx="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 15v4.5M29 15v4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><g class="chat__bot-eyes"><circle cx="12" cy="16" r="2.1" fill="currentColor"/><circle cx="20" cy="16" r="2.1" fill="currentColor"/></g><path d="M13 21h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const AI_BUBBLE = '<svg class="chat__ai" viewBox="0 0 32 32"><path d="M7 6h18a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-8.5L10 29v-5H7a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path class="chat__ai-big" d="M14 9.5c.5 3 2.2 4.7 5.2 5.2-3 .5-4.7 2.2-5.2 5.2-.5-3-2.2-4.7-5.2-5.2 3-.5 4.7-2.2 5.2-5.2Z" fill="currentColor"/><path class="chat__ai-small" d="M22 9c.25 1.3.95 2 2.25 2.25-1.3.25-2 .95-2.25 2.25-.25-1.3-.95-2-2.25-2.25C21.05 11 21.75 10.3 22 9Z" fill="currentColor"/></svg>';
const GREET = '<div class="chat__greet" role="status" hidden><button class="chat__greet-close" type="button" aria-label="Dismiss">×</button><p><b>Hi there</b> Questions about ARENA? Ask me anything.</p></div>';

// Option E markup: a bot orb at the right centre; the orb's chat card
// opens beside it.
function railMarkup() {
  return `
    ${GREET}
    <button class="chat__launcher" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Ask ARENA">
      <span class="chat__ring" aria-hidden="true"></span>
      <span class="chat__orb" aria-hidden="true">${BOT}</span>
      <span class="chat__close-icon" aria-hidden="true"></span>
      <span class="chat__tip">Ask ARENA</span>
    </button>
    ${orbPanel()}`;
}

// Option F markup: an Ask ARENA tab on the right edge and a full-height
// sheet.
function tabsMarkup() {
  return `
    ${GREET}
    <button class="chat__launcher chat__tab chat__tab--main" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Ask ARENA">
      <span class="chat__tab-icon" aria-hidden="true">${AI_BUBBLE}</span>
      <span class="chat__tab-label">Ask ARENA</span>
    </button>
    <div class="chat__scrim" data-chat-scrim aria-hidden="true"></div>
    <section class="chat__panel" id="chat-panel" role="dialog" aria-modal="false" aria-label="ARENA assistant" hidden>
      <header class="chat__head">
        <span class="chat__avatar" aria-hidden="true">${AI_BUBBLE}</span>
        <span class="chat__who">
          <b>ARENA Assistant</b>
          <small><i></i>Instant answers from ARENA</small>
        </span>
        <button class="chat__icon-btn" type="button" data-chat-reset aria-label="New chat"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="chat__icon-btn" type="button" data-chat-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </header>
      <div class="chat__log" data-chat-log aria-live="polite"></div>
      <form class="chat__form" data-chat-form>
        <label class="chat__field">
          <span class="chat__sr">Your question</span>
          <input type="text" name="q" placeholder="Ask about investing, markets, fees…" autocomplete="off" data-chat-input>
          <button class="chat__send" type="submit" aria-label="Send" disabled><svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </label>
        <p class="chat__person">Prefer a person? <a href="#contact" data-book-call>Request a call</a></p>
      </form>
    </section>`;
}

// Option B markup: edge coin, scrim, drawer with ticker, tickets, prompt.
function ticketMarkup(suggestions) {
  const ticker = suggestions
    .concat(FACTS.slice(0, 3).map((f) => f.q))
    .map((q) => `<button type="button" class="chat__tick" data-chat-ask="${q}">${q}</button>`)
    .join('<i aria-hidden="true">◆</i>');
  return `
    <div class="chat__greet" hidden><button class="chat__greet-close" type="button">×</button></div>
    <button class="chat__launcher" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Ask ARENA">
      <span class="chat__coin" aria-hidden="true"><img src="images/shared/mark-light.svg" width="64" height="64" alt=""></span>
      <span class="chat__label">Ask ARENA</span>
    </button>
    <div class="chat__scrim" data-chat-scrim aria-hidden="true"></div>
    <section class="chat__panel" id="chat-panel" role="dialog" aria-modal="false" aria-label="ARENA assistant" hidden>
      <header class="chat__head">
        <span class="chat__coin chat__coin--head" aria-hidden="true"><img src="images/shared/mark-light.svg" width="64" height="64" alt=""></span>
        <span class="chat__who">
          <small>ARENA · Desk</small>
          <b>Ask the market desk</b>
        </span>
        <button class="chat__icon-btn" type="button" data-chat-reset aria-label="New session"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="chat__icon-btn" type="button" data-chat-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </header>
      <div class="chat__ticker"><div class="chat__ticker-track">${ticker}<i aria-hidden="true">◆</i>${ticker}</div></div>
      <div class="chat__log" data-chat-log aria-live="polite"></div>
      <form class="chat__form" data-chat-form>
        <label class="chat__field">
          <span class="chat__prompt" aria-hidden="true">›</span>
          <span class="chat__sr">Your question</span>
          <input type="text" name="q" placeholder="Type a question" autocomplete="off" data-chat-input>
          <button class="chat__send" type="submit" aria-label="Send" disabled>Send<kbd>↵</kbd></button>
        </label>
        <p class="chat__note">Information only, not investment advice.</p>
      </form>
    </section>`;
}

// Option C markup: bottom-centre dock, scrim, centred command prompt.
function paletteMarkup() {
  return `
    <div class="chat__greet" hidden><button class="chat__greet-close" type="button">×</button></div>
    <button class="chat__launcher" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Ask ARENA anything">
      <span class="chat__spark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.5c.5 3.8 2.7 6 6.5 6.5-3.8.5-6 2.7-6.5 6.5-.5-3.8-2.7-6-6.5-6.5 3.8-.5 6-2.7 6.5-6.5Z" fill="currentColor"/></svg></span>
      <span class="chat__label">Ask ARENA anything</span>
      <kbd class="chat__kbd" data-chat-kbd>⌘K</kbd>
    </button>
    <div class="chat__scrim" data-chat-scrim aria-hidden="true"></div>
    <section class="chat__panel" id="chat-panel" role="dialog" aria-modal="false" aria-label="ARENA assistant" hidden>
      <form class="chat__form" data-chat-form>
        <label class="chat__field">
          <span class="chat__spark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.5c.5 3.8 2.7 6 6.5 6.5-3.8.5-6 2.7-6.5 6.5-.5-3.8-2.7-6-6.5-6.5 3.8-.5 6-2.7 6.5-6.5Z" fill="currentColor"/></svg></span>
          <span class="chat__sr">Your question</span>
          <input type="text" name="q" placeholder="Ask about investing, markets, fees…" autocomplete="off" data-chat-input>
          <button class="chat__send" type="submit" aria-label="Send" disabled><svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </label>
      </form>
      <div class="chat__log" data-chat-log aria-live="polite"></div>
      <footer class="chat__foot">
        <span><kbd>↵</kbd> ask</span><span><kbd>esc</kbd> close</span>
        <button class="chat__foot-btn" type="button" data-chat-reset>New question</button>
        <button class="chat__foot-btn" type="button" data-chat-close>Close</button>
        <p class="chat__note">Information only, not investment advice.</p>
      </footer>
    </section>`;
}

// Option D markup: an iVestor phone peeking from the bottom-left; the
// panel is the full phone.
function phoneMarkup() {
  const status = `<span class="chat__status"><b>9:41</b><i class="chat__notch"></i><span class="chat__sys"><i></i><i></i><i></i><em></em></span></span>`;
  return `
    <div class="chat__greet" hidden><button class="chat__greet-close" type="button">×</button></div>
    <button class="chat__launcher" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Ask ARENA">
      <span class="chat__peek" aria-hidden="true">
        ${status}
        <span class="chat__peek-app"><img src="images/shared/mark-light.svg" width="64" height="64" alt=""><b>ARENA</b><small>Ask me anything</small></span>
      </span>
      <span class="chat__badge" aria-hidden="true">1</span>
    </button>
    <section class="chat__panel" id="chat-panel" role="dialog" aria-modal="false" aria-label="ARENA assistant" hidden>
      ${status}
      <header class="chat__head">
        <button class="chat__icon-btn" type="button" data-chat-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="chat__avatar" aria-hidden="true"><img src="images/shared/mark-light.svg" width="64" height="64" alt=""></span>
        <span class="chat__who"><b>ARENA</b><small><i></i>Online</small></span>
        <button class="chat__icon-btn" type="button" data-chat-reset aria-label="New chat"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </header>
      <div class="chat__log" data-chat-log aria-live="polite"></div>
      <form class="chat__form" data-chat-form>
        <label class="chat__field">
          <span class="chat__sr">Your question</span>
          <input type="text" name="q" placeholder="Message" autocomplete="off" data-chat-input>
          <button class="chat__send" type="submit" aria-label="Send" disabled><svg viewBox="0 0 24 24"><path d="M12 19V6m-6 6 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </label>
      </form>
      <i class="chat__home" aria-hidden="true"></i>
    </section>`;
}
