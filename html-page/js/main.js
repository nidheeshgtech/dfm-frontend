import { initSmoothScroll } from "./components/smooth-scroll.js";
import { initLoader } from "./components/loader.js";
import { initScrollReveal } from "./components/gsap-reveal.js";
import { initCountUp } from "./components/count-up.js";
import { initGlass } from "./components/glass.js";
import { initHeader } from "./components/header.js";
import { initStage } from "./components/stage.js";
import { initHero } from "./components/hero.js";
import { initVersionSwitch } from "./components/version-switch.js";
import { initStack } from "./components/stack.js";
import { initJourney } from "./components/journey.js";
import { initInvestorXp } from "./components/investor-xp.js";
import { initGlobe } from "./components/globe3d.js";
import { initFaq } from "./components/faq.js";
import { initSpotlight } from "./components/spotlight.js";
import { initSkeletonLoader } from "./components/skeleton-loader.js";
import { initVideoModal } from "./components/video-modal.js";
import { initSwipeDots } from "./components/swipe-dots.js";
import { initXpWave } from "./components/xp-wave.js";
import { initXpApp } from "./components/xp-app.js";

function init() {
  // ORDER MATTERS: Lenis first (it hooks ScrollTrigger.update), then reveal.
  try {
    initSmoothScroll();
  } catch (e) {
    console.error("init: initSmoothScroll threw", e);
  }

  [initLoader, initSkeletonLoader, initHeader, initStage, initHero, initStack, initJourney, initInvestorXp, initXpWave, initXpApp, initGlobe, initFaq, initSpotlight, initVideoModal, initSwipeDots, initScrollReveal, initCountUp, initGlass, initVersionSwitch].forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(`init: ${fn.name} threw`, e);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
