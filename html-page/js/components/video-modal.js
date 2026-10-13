// Video popup for [data-video-modal] links (materials "How raising on
// ARENA works" card). Native <dialog> (focus trap, Esc, top layer) built
// once per page; the Vimeo iframe is created on open and removed on close
// so playback always stops. The link's href is a real Vimeo URL, so
// without JS it still works.
//
//   <a href="https://vimeo.com/ID" data-video-modal data-vimeo-id="ID">
//
// Swap the video: change data-vimeo-id (and href) on the card.
export function initVideoModal() {
  const triggers = document.querySelectorAll("[data-video-modal]");
  if (!triggers.length || typeof HTMLDialogElement === "undefined") return;

  const dialog = buildDialog();
  const frame = dialog.querySelector(".video-modal__frame");
  const eyebrow = dialog.querySelector(".video-modal__eyebrow");
  const title = dialog.querySelector(".video-modal__title");
  const meta = dialog.querySelector(".video-modal__meta");
  let opener = null;
  let closing = false;

  const open = (trigger) => {
    const id = trigger.dataset.vimeoId;
    if (!id) return;
    opener = trigger;

    // Copy the card's text so the popup always matches it.
    eyebrow.textContent = trigger.querySelector(".video-card__eyebrow")?.textContent || "";
    title.textContent = trigger.querySelector(".video-card__title")?.textContent || "";
    meta.innerHTML = trigger.querySelector(".video-card__meta")?.innerHTML || "";

    frame.classList.remove("is-ready");
    const iframe = document.createElement("iframe");
    iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&title=0&byline=0&portrait=0&dnt=1&color=4e17e5`;
    iframe.title = title.textContent || "Video";
    iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    iframe.allowFullscreen = true;
    iframe.addEventListener("load", () => frame.classList.add("is-ready"), { once: true });
    frame.append(iframe);

    window.lenis?.stop();
    document.documentElement.classList.add("has-modal");
    dialog.showModal();
    // Keep focus on our close button (not inside the Vimeo iframe), so Esc
    // and Tab stay with the popup.
    dialog.querySelector(".video-modal__close").focus({ preventScroll: true });
    requestAnimationFrame(() => dialog.classList.add("is-open"));
  };

  const close = () => {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.remove("is-open");

    const finish = () => {
      closing = false;
      dialog.close();
      frame.querySelector("iframe")?.remove();
      window.lenis?.start();
      document.documentElement.classList.remove("has-modal");
      opener?.focus({ preventScroll: true });
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) finish();
    else setTimeout(finish, 380);
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return; // new tab still works
      event.preventDefault();
      open(trigger);
    });
  });

  dialog.querySelector(".video-modal__close").addEventListener("click", close);
  // Click on the dimmed backdrop (outside the panel) closes.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  // Esc: animate out instead of the instant native close.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
}

function buildDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "video-modal";
  dialog.setAttribute("aria-labelledby", "video-modal-title");
  dialog.innerHTML = `
    <div class="video-modal__panel">
      <div class="video-modal__head">
        <div>
          <p class="video-modal__eyebrow"></p>
          <h2 class="video-modal__title" id="video-modal-title"></h2>
        </div>
        <button class="video-modal__close" type="button" aria-label="Close video" autofocus>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="video-modal__frame">
        <div class="skeleton skeleton--fill skeleton--dark"><span class="skeleton__shimmer"></span></div>
      </div>
      <p class="video-modal__meta"></p>
    </div>`;
  document.body.append(dialog);
  return dialog;
}
