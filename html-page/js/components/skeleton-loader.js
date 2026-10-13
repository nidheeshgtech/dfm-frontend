const DEFAULT_TIMEOUT = 5000;
const processed = new WeakSet();

/**
 * Resolves once every media element inside `root` has loaded or errored,
 * or after `timeout` ms — whichever comes first, so a stalled network
 * request can never leave a component stuck mid-skeleton.
 */
function waitForMedia(root, timeout) {
  // Deliberately NOT iframe (embeds bring their own poster). A wrapper can
  // narrow what it waits on with data-skeleton-wait="selector" — e.g. the
  // journey panel only waits for its visible photo, not all five.
  const media = Array.from(root.querySelectorAll(root.dataset.skeletonWait || "img, video"));

  if (media.length === 0) {
    return Promise.resolve();
  }

  const waiters = media.map((el) => {
    if (el.tagName === "IMG" && el.complete) {
      return Promise.resolve();
    }

    if (el.tagName === "VIDEO" && el.readyState >= 3) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const done = () => {
        el.removeEventListener("load", done);
        el.removeEventListener("loadeddata", done);
        el.removeEventListener("error", done);
        resolve();
      };

      el.addEventListener("load", done, { once: true });
      el.addEventListener("loadeddata", done, { once: true });
      el.addEventListener("error", done, { once: true });
    });
  });

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });

  return Promise.race([Promise.all(waiters), timeoutPromise]);
}

function settle(root) {
  root.classList.remove("is-loading");
  root.classList.add("is-loaded");
}

/**
 * Initializes one [data-skeleton] component: waits for its media, then
 * flips it from is-loading to is-loaded. Safe to call more than once for
 * the same element — already-processed components are skipped.
 */
function initComponent(root, timeout) {
  if (!root || processed.has(root)) {
    return;
  }

  processed.add(root);
  root.classList.add("is-loading");

  const start = () => waitForMedia(root, timeout).then(() => settle(root));

  // Lazy images below the fold won't even start loading until they're
  // near the viewport, so don't start the timeout clock until then either —
  // otherwise the shimmer would give up before the image ever began.
  const hasLazy = root.querySelector('img[loading="lazy"]');
  if (!hasLazy || !("IntersectionObserver" in window)) {
    start();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      start();
    },
    { rootMargin: "300px 0px" },
  );
  io.observe(root);
}

/**
 * Scans `root` for [data-skeleton] components and initializes each one
 * independently. Then watches for components inserted later (e.g. by
 * dynamic/AJAX content) and initializes those too.
 */
export function initSkeletonLoader({ root = document, timeout = DEFAULT_TIMEOUT } = {}) {
  root.querySelectorAll("[data-skeleton]").forEach((el) => {
    initComponent(el, timeout);
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) {
          return;
        }

        if (node.matches("[data-skeleton]")) {
          initComponent(node, timeout);
        }

        node.querySelectorAll?.("[data-skeleton]").forEach((el) => {
          initComponent(el, timeout);
        });
      });
    }
  });

  observer.observe(root === document ? document.body : root, {
    childList: true,
    subtree: true,
  });

  return observer;
}
