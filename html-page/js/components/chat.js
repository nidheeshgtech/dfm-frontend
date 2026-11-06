// ARENA assistant: a floating chat on every page. A glass dock sits
// bottom-centre ("Ask ARENA anything ⌘K"); clicking it, or ⌘K / Ctrl+K
// anywhere, opens a big centred command prompt over a dimmed page.
//
// No live AI yet: replies come from the page's own FAQ (when it has one)
// plus the markets / contact facts below, matched by shared words
// (invest-ask.js), and are written out word by word after a short
// "typing" pause. Anything with [href="#assistant"] (the FAQ's "Ask the
// assistant" button) opens it too.
import { words, near } from "./invest-ask.js";

const CONTACT = "You can reach the ARENA team on <a href=\"tel:+97140000000\">+971&nbsp;4&nbsp;000&nbsp;0000</a> or <a href=\"mailto:arena@dfm.ae\">arena@dfm.ae</a>.";

// Facts every page can answer (copy from the Invest and routes deck).
const FACTS = [
  {
    q: "What is Growth companies?",
    a: "Growth companies is open to the market: growing companies raise capital from the wide market, anyone with a DFM investor number can subscribe in the iVestor app, and shares trade freely from listing day.",
    link: ["growth-market.html", "Explore Growth companies"],
  },
  {
    q: "What is Private companies?",
    a: "Private companies is by invitation: pre-IPO companies raise from a select circle of approved investors, and shares change hands in private trading windows.",
    link: ["private-market.html", "Explore Private companies"],
  },
  {
    q: "What is Family business?",
    a: "Family business is for succession: ownership moves between family members and generations, and trading stays private, inside the circle you approve.",
    link: ["closed-market.html", "Explore Family business"],
  },
  {
    q: "How do I contact the ARENA team?",
    a: `${CONTACT} Calls are confidential, before you commit to anything.`,
  },
];

const SUGGESTIONS = {
  invest: ["Who can invest on ARENA?", "What does it cost to invest?", "What is Private companies?"],
  company: ["What is Growth companies?", "How do I contact the ARENA team?", "What is Family business?"],
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

  const root = document.createElement("div");
  root.className = "chat chat--c";
  root.dataset.chat = "";
  root.innerHTML = paletteMarkup();
  document.body.append(root);

  const launcher = root.querySelector(".chat__launcher");
  const panel = root.querySelector(".chat__panel");
  const log = root.querySelector("[data-chat-log]");
  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const send = root.querySelector(".chat__send");
  if (audience === "company") input.placeholder = "Ask about raising, markets, eligibility…";
  let busy = false;

  // ---- Messages ----
  const scrollDown = () => log.scrollTo({ top: log.scrollHeight, behavior: reduce ? "auto" : "smooth" });

  const add = (who, html = "") => {
    const msg = document.createElement("div");
    msg.className = `chat__msg chat__msg--${who}`;
    msg.innerHTML = `<div class="chat__bubble">${html}</div>`;
    log.append(msg);
    scrollDown();
    return msg.querySelector(".chat__bubble");
  };

  const chips = (list) => {
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
  const reply = (text, extra = "") =>
    new Promise((resolve) => {
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
      await reply(`I don't have an answer for that one yet. ${CONTACT}`);
    }
    busy = false;
    chips(SUGGESTIONS[audience].filter((s) => s !== hit?.q).slice(0, 2));
  }

  // Busy while the greeting writes out, so an early question can't race
  // the opening chips.
  const start = async () => {
    busy = true;
    log.innerHTML = "";
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

  // ⌘K / Ctrl+K anywhere opens (or closes) the prompt.
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen(!root.classList.contains("is-open"));
    }
  });
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  root.querySelectorAll("[data-chat-kbd]").forEach((k) => (k.textContent = mac ? "⌘K" : "Ctrl K"));

  input.addEventListener("input", () => (send.disabled = !input.value.trim()));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Dock, scrim and centred command prompt.
function paletteMarkup() {
  return `
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
