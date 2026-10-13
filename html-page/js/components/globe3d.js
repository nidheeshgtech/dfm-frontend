// "Capital reaches ARENA from around the world" — v2: a real 3D dotted
// globe (Three.js points + custom shader) behind the HTML investor cards.
//
//   - Land dots are generated on the sphere from a 0.5° land bit-mask
//     (js/data/land-mask.json, Natural Earth 50m), density per breakpoint.
//   - Front dots are crisp, rear dots fade out; sizes / greys vary a little.
//   - Each card has a lat/lon anchor; anchors are projected to screen every
//     frame, so their pulse markers ride the surface while the cards stay in
//     their design positions. Hover / focus highlights the country and draws
//     a fine line card → anchor; click rotates that country to the front.
//   - Slow auto-spin (~105s per turn), soft float, mouse parallax, horizontal
//     drag with inertia (touch: pan-y stays native, so page scroll is never
//     captured).
//   - Renders only while on screen. Reduced motion: static, no auto-spin.
//
// Fallback: no WebGL (or ?globe=v1) → the v1 flat canvas globe (globe.js).
import { setupFlatGlobe } from "./globe.js";

const THREE_URL = new URL("../vendor/three.module.min.js", import.meta.url).href;
const MASK_URL = new URL("../data/land-mask.json", import.meta.url);

const DIST = 4; // camera distance in globe radii
const TURN_SECONDS = 105;
const TILT = 0.42; // rad — north leans toward the viewer, like the design
const FRONT_LON = 22; // Africa / Europe face the viewer by default

export function initGlobe() {
  const forceFlat = new URLSearchParams(window.location.search).get("globe") === "v1";

  document.querySelectorAll("[data-globe]").forEach((root) => {
    if (forceFlat || !hasWebGL()) {
      useFlat(root);
      return;
    }

    root.classList.add("globe--3d");
    // Three.js is ~170KB gzipped: only fetch it when the section is close.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        setup(root).catch((error) => {
          console.error("globe3d: falling back to flat globe", error);
          useFlat(root);
        });
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(root);
  });
}

function useFlat(root) {
  root.classList.remove("globe--3d");
  root.classList.add("globe--flat");
  // A canvas that already handed out a WebGL context can't give a 2D one.
  const canvas = root.querySelector("canvas");
  if (canvas) canvas.replaceWith(canvas.cloneNode(false));
  setupFlatGlobe(root);
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------

const VERTEX = /* glsl */ `
  uniform float uReveal;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uFocus;
  uniform float uFocusStrength;
  attribute float aSize;
  attribute float aShade;
  attribute float aDelay;
  varying float vAlpha;
  varying float vShade;
  varying float vFocus;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 normal = normalize(mat3(modelMatrix) * position);
    float facing = dot(normal, normalize(cameraPosition - world.xyz));
    float front = smoothstep(-0.2, 0.55, facing);

    // Sequential reveal: each dot waits for its delay, then eases in.
    float t = clamp((uReveal * 1.45 - aDelay) / 0.45, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    float focus = smoothstep(0.972, 0.996, dot(normalize(position), uFocus)) * uFocusStrength;

    vAlpha = mix(0.05, 1.0, front) * t;
    vShade = aShade;
    vFocus = focus * front;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    float size = uSize * aSize * mix(0.6, 1.0, front) * (0.35 + 0.65 * t) * (1.0 + vFocus * 0.3);
    gl_PointSize = size * uPixelRatio * (${DIST.toFixed(1)} / -mv.z);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uDark;
  uniform vec3 uLight;
  uniform vec3 uAccent;
  varying float vAlpha;
  varying float vShade;
  varying float vFocus;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float edge = fwidth(d);
    float a = 1.0 - smoothstep(0.5 - edge * 1.5, 0.5, d);
    if (a <= 0.0) discard;
    vec3 color = mix(uLight, uDark, vShade);
    color = mix(color, uAccent, vFocus * 0.7);
    gl_FragColor = vec4(color, a * vAlpha * (0.82 + vFocus * 0.18));
  }
`;

// Dot density per layout (degrees between dots).
const densityFor = (width) => (width < 768 ? 2.3 : width < 1024 ? 1.85 : 1.45);

async function setup(root) {
  const [THREE, mask] = await Promise.all([import(THREE_URL), fetch(MASK_URL).then((r) => r.json())]);
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  const map = root.querySelector("[data-globe-map]");
  const stage = map.querySelector(".globe__stage");
  const canvas = stage.querySelector("canvas");
  const anchorLayer = stage.querySelector(".globe__anchors");
  const links = Array.from(stage.querySelectorAll(".globe__link")); // line + travelling pulse
  const pins = Array.from(map.querySelectorAll(".globe-pin[data-lat]"));
  const items = pins.map((pin) => pin.closest(".globe-pins__item") || pin);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---- Three ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, DIST);

  const holder = new THREE.Group(); // float + scroll scale + tilt
  const globe = new THREE.Group(); // spin
  holder.add(globe);
  scene.add(holder);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uReveal: { value: reduceMotion ? 1 : 0 },
      uSize: { value: 5 },
      uPixelRatio: { value: 1 },
      uFocus: { value: new THREE.Vector3(0, 0, 1) },
      uFocusStrength: { value: 0 },
      uDark: { value: new THREE.Color("#0d0e1a") },
      uLight: { value: new THREE.Color("#9a9ca6") },
      uAccent: { value: new THREE.Color("#4e17e5") },
    },
  });
  // fwidth() needs the derivatives extension on WebGL1.
  material.extensions = { derivatives: true };

  let points = null;
  let density = 0;
  const bits = Uint8Array.from(atob(mask.mask), (c) => c.charCodeAt(0));
  const isLand = (lat, lon) => {
    const r = Math.min(mask.h - 1, Math.max(0, Math.floor((90 - lat) / 0.5)));
    const c = Math.min(mask.w - 1, Math.floor((((lon + 180) % 360) + 360) % 360 / 0.5));
    const i = r * mask.w + c;
    return bits[i >> 3] & (1 << (i & 7));
  };

  const buildPoints = (step) => {
    const pos = [];
    const size = [];
    const shade = [];
    const delay = [];
    const front = toVec(THREE, 18, FRONT_LON);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    for (let lat = -56; lat <= 84; lat += step) {
      const count = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / step));
      for (let k = 0; k < count; k++) {
        const lon = -180 + ((k + 0.5) * 360) / count;
        if (!isLand(lat, lon)) continue;
        const v = toVec(THREE, lat, lon);
        pos.push(v.x, v.y, v.z);
        size.push(0.78 + rand() * 0.44);
        shade.push(0.35 + Math.pow(rand(), 0.7) * 0.65);
        // Reveal sweeps out from the front-centre, with a little scatter.
        delay.push((1 - v.dot(front)) * 0.42 + rand() * 0.18);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
    geometry.setAttribute("aShade", new THREE.Float32BufferAttribute(shade, 1));
    geometry.setAttribute("aDelay", new THREE.Float32BufferAttribute(delay, 1));

    if (points) {
      points.geometry.dispose();
      globe.remove(points);
    }
    points = new THREE.Points(geometry, material);
    globe.add(points);
  };

  // ---- Anchors (HTML markers riding the surface) ----
  const anchors = pins.map((pin) => {
    const lat = parseFloat(pin.dataset.lat);
    const lon = parseFloat(pin.dataset.lon);
    const el = document.createElement("span");
    el.className = "globe-anchor";
    anchorLayer.append(el);
    return { pin, lat, lon, local: toVec(THREE, lat, lon), el, x: 0, y: 0, facing: 0 };
  });

  // ---- State ----
  const state = {
    spin: -rad(FRONT_LON),
    intro: reduceMotion ? 0 : 0.7, // extra spin eased away on entrance
    tilt: TILT,
    auto: reduceMotion ? 0 : 1, // auto-rotation factor (0 paused → 1)
    velocity: 0, // drag inertia, rad/s
    parallaxX: 0,
    parallaxY: 0,
    scale: 1,
    float: 0,
  };
  const pointer = { x: 0, y: 0 };
  let active = -1;
  let resumeTimer = 0;

  // ---- Layout: fit the sphere to the design box ----
  let stageBox = { w: 1, h: 1 };
  let radiusPx = 1;

  const layout = () => {
    const canvasBox = canvas.getBoundingClientRect();
    const box = stage.getBoundingClientRect();
    if (!canvasBox.width || !box.width) return;

    const cs = getComputedStyle(stage);
    const r = parseFloat(cs.getPropertyValue("--globe-r")) || 0.555;
    const cx = parseFloat(cs.getPropertyValue("--globe-cx")) || 0.5;
    const cy = parseFloat(cs.getPropertyValue("--globe-cy")) || 0.55;

    const W = canvasBox.width;
    const H = canvasBox.height;
    radiusPx = r * box.height;
    // Sphere centre in canvas pixels (the canvas overhangs the stage box).
    const centerX = box.left - canvasBox.left + cx * box.width;
    const centerY = box.top - canvasBox.top + cy * box.height;

    // A full view centred on the sphere, cropped to the canvas, so the
    // globe is never skewed by an off-axis perspective.
    const fullW = 2 * Math.max(centerX, W - centerX);
    const fullH = 2 * Math.max(centerY, H - centerY);
    const tanHalf = Math.tan(Math.asin(1 / DIST)) * (fullH / 2 / radiusPx);
    camera.fov = (2 * Math.atan(tanHalf) * 180) / Math.PI;
    camera.aspect = fullW / fullH;
    camera.setViewOffset(fullW, fullH, fullW / 2 - centerX, fullH / 2 - centerY, W, H);
    camera.updateProjectionMatrix();

    // Render at the screen's real pixel density (iPhones are 3×) and, when
    // the page is pinch-zoomed, at that zoom too — so dots stay crisp.
    // Capped to keep the GPU work sane.
    const zoom = window.visualViewport?.scale || 1;
    const dpr = Math.min((window.devicePixelRatio || 1) * zoom, 3);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    material.uniforms.uPixelRatio.value = dpr;
    material.uniforms.uSize.value = Math.max(2.4, radiusPx * 0.0135);

    stageBox = { w: W, h: H, left: canvasBox.left, top: canvasBox.top };
    anchorLayer.style.setProperty("--w", `${W}px`);

    const next = densityFor(window.innerWidth);
    if (next !== density) {
      density = next;
      buildPoints(density);
    }
    dirty = true;
  };

  // ---- Interaction ----
  const setActive = (index) => {
    active = index;
    anchors.forEach((a, i) => {
      a.el.classList.toggle("is-active", i === index);
      a.pin.classList.toggle("is-active", i === index);
    });
    if (index >= 0) material.uniforms.uFocus.value.copy(anchors[index].local);
    if (gsap) gsap.to(material.uniforms.uFocusStrength, { value: index >= 0 ? 1 : 0, duration: 0.6, ease: "power2.out", onUpdate: () => (dirty = true) });
    else material.uniforms.uFocusStrength.value = index >= 0 ? 1 : 0;
    dirty = true;
  };

  const pauseAuto = (resumeAfter = 3.5) => {
    clearTimeout(resumeTimer);
    if (reduceMotion) return;
    gsap?.killTweensOf(state, "auto");
    state.auto = 0;
    resumeTimer = setTimeout(() => {
      if (gsap) gsap.to(state, { auto: 1, duration: 2.4, ease: "power1.inOut" });
      else state.auto = 1;
    }, resumeAfter * 1000);
  };

  // Rotate the shortest way so the anchor faces the viewer.
  const focusOn = (index) => {
    const a = anchors[index];
    let target = -rad(a.lon);
    const twoPi = Math.PI * 2;
    target = state.spin + ((((target - state.spin) % twoPi) + twoPi * 1.5) % twoPi) - Math.PI;
    // Tilt a little toward the country's latitude, within a calm range.
    const tilt = Math.min(0.62, Math.max(0.12, rad(a.lat) * 0.75));
    state.velocity = 0;
    pauseAuto(4);
    if (gsap && !reduceMotion) {
      gsap.to(state, { spin: target, tilt, duration: 1.8, ease: "power3.inOut", overwrite: "auto", onUpdate: () => (dirty = true) });
    } else {
      state.spin = target;
      state.tilt = tilt;
      dirty = true;
    }
  };

  pins.forEach((pin, i) => {
    pin.addEventListener("click", () => {
      setActive(i);
      focusOn(i);
      if (!finePointer) {
        clearTimeout(pin._clear);
        pin._clear = setTimeout(() => active === i && setActive(-1), 4500);
      }
    });
    pin.addEventListener("focus", () => setActive(i));
    pin.addEventListener("blur", () => active === i && setActive(-1));
    if (finePointer) {
      pin.addEventListener("pointerenter", () => setActive(i));
      pin.addEventListener("pointerleave", () => document.activeElement !== pin && active === i && setActive(-1));
    }
  });

  // Mouse parallax (desktop) — a few degrees at most.
  if (finePointer && !reduceMotion) {
    root.addEventListener("pointermove", (event) => {
      const box = root.getBoundingClientRect();
      pointer.x = ((event.clientX - box.left) / box.width - 0.5) * 2;
      pointer.y = ((event.clientY - box.top) / box.height - 0.5) * 2;
    });
    root.addEventListener("pointerleave", () => {
      pointer.x = 0;
      pointer.y = 0;
    });
  }

  // Horizontal drag with inertia. touch-action: pan-y (CSS) leaves vertical
  // swipes to the browser; if it starts scrolling we get pointercancel.
  let drag = null;
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), moved: false };
  });
  window.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(event.clientY - drag.y)) return;
      drag.moved = true;
      stage.setPointerCapture?.(event.pointerId);
      root.classList.add("is-dragging");
      pauseAuto(30);
    }
    const now = performance.now();
    const delta = dx / (radiusPx * 1.6);
    state.spin += delta;
    state.velocity = delta / Math.max(0.008, (now - drag.t) / 1000);
    drag.x = event.clientX;
    drag.t = now;
    dirty = true;
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) pauseAuto(2.5);
    drag = null;
    root.classList.remove("is-dragging");
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // ---- Loop ----
  let visible = false;
  let running = false;
  let dirty = true;
  let last = performance.now();
  const autoSpeed = (Math.PI * 2) / TURN_SECONDS;

  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!reduceMotion) {
      if (!drag?.moved) {
        state.spin += state.velocity * dt;
        state.velocity *= Math.pow(0.04, dt); // inertia decay
        if (Math.abs(state.velocity) < 0.002) state.velocity = 0;
        state.spin += autoSpeed * state.auto * dt;
      }
      state.parallaxX += (pointer.x * 0.06 - state.parallaxX) * Math.min(1, dt * 3);
      state.parallaxY += (pointer.y * 0.05 - state.parallaxY) * Math.min(1, dt * 3);
      state.float = Math.sin((now / 1000) * ((Math.PI * 2) / 7)) * 0.012;
      dirty = true;
    }

    if (dirty) {
      apply();
      renderer.render(scene, camera);
      placeAnchors();
      dirty = false;
    }
    requestAnimationFrame(frame);
  };

  const apply = () => {
    globe.rotation.y = state.spin + state.intro + state.parallaxX;
    holder.rotation.x = state.tilt + state.parallaxY;
    holder.position.y = state.float;
    holder.scale.setScalar(state.scale);
    holder.updateMatrixWorld(true);
  };

  const tmp = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const placeAnchors = () => {
    const reveal = material.uniforms.uReveal.value;
    anchors.forEach((a) => {
      tmp.copy(a.local).applyMatrix4(globe.matrixWorld);
      const centre = new THREE.Vector3().setFromMatrixPosition(holder.matrixWorld);
      const normal = tmp.clone().sub(centre).normalize();
      camDir.copy(camera.position).sub(tmp).normalize();
      a.facing = normal.dot(camDir);
      tmp.project(camera);
      a.x = (tmp.x * 0.5 + 0.5) * stageBox.w;
      a.y = (-tmp.y * 0.5 + 0.5) * stageBox.h;
      const vis = Math.max(0, Math.min(1, (a.facing - 0.08) / 0.25)) * Math.min(1, Math.max(0, reveal * 1.6 - 0.8));
      a.el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
      a.el.style.opacity = vis.toFixed(3);
    });
    drawLink();
  };

  // Fine line from the active card's avatar to its anchor (desktop only:
  // on mobile the cards sit in a carousel under the globe).
  const drawLink = () => {
    const a = anchors[active];
    const show = a && a.facing > 0.12 && window.innerWidth >= 768;
    links.forEach((l) => l.classList.toggle("is-visible", !!show));
    if (!show) return;
    const avatar = a.pin.querySelector(".globe-pin__avatar").getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    const x1 = avatar.left + avatar.width / 2 - canvasBox.left;
    const y1 = avatar.top + avatar.height / 2 - canvasBox.top;
    const midX = (x1 + a.x) / 2;
    const midY = Math.min(y1, a.y) - Math.abs(a.x - x1) * 0.18;
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${midX.toFixed(1)} ${midY.toFixed(1)} ${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
    links.forEach((l) => l.setAttribute("d", d));
  };

  const start = () => {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
  };

  const ro = new ResizeObserver(() => {
    layout();
    if (!running) {
      apply();
      renderer.render(scene, camera);
      placeAnchors();
    }
  });
  ro.observe(stage);
  // Pinch-zoom doesn't resize the canvas, so re-render at the new zoom.
  let zoomTimer = 0;
  window.visualViewport?.addEventListener("resize", () => {
    clearTimeout(zoomTimer);
    zoomTimer = setTimeout(() => {
      layout();
      if (!running) {
        apply();
        renderer.render(scene, camera);
        placeAnchors();
      }
    }, 120);
  });
  layout();

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      visible ? start() : stop();
    },
    { rootMargin: "80px 0px" },
  );
  io.observe(stage);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);

  // ---- Mobile: investor cards auto-advance ----
  // Below 768px the cards are a swipe row; every few seconds the next card
  // slides in and the globe turns to that investor's country. Any touch on
  // the row pauses it; it picks up again after a quiet spell.
  const list = map.querySelector(".globe-pins");
  const mobile = window.matchMedia("(max-width: 767.98px)");
  let autoIndex = 0;
  let autoTimer = 0;
  let idleUntil = 0;

  const showCard = (i) => {
    autoIndex = i;
    const item = items[i];
    const pad = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
    list.scrollTo({ left: item.offsetLeft - list.offsetLeft - pad, behavior: reduceMotion ? "auto" : "smooth" });
    setActive(i);
    focusOn(i);
  };

  const tick = () => {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if (mobile.matches && visible && !document.hidden && Date.now() > idleUntil) {
        showCard((autoIndex + 1) % items.length);
      }
      tick();
    }, 3800);
  };

  if (list && !reduceMotion) {
    const hold = () => (idleUntil = Date.now() + 7000);
    list.addEventListener("pointerdown", hold, { passive: true });
    list.addEventListener("touchstart", hold, { passive: true });
    list.addEventListener("wheel", hold, { passive: true });
    // Keep the index in step with manual swipes.
    list.addEventListener(
      "scroll",
      () => {
        if (!mobile.matches) return;
        const left = list.scrollLeft;
        let best = 0;
        items.forEach((item, i) => {
          if (Math.abs(item.offsetLeft - list.offsetLeft - left) < Math.abs(items[best].offsetLeft - list.offsetLeft - left)) best = i;
        });
        autoIndex = best;
      },
      { passive: true },
    );
    tick();
  }

  // ---- Entrance + scroll ----
  if (reduceMotion || !gsap || !ScrollTrigger) {
    root.classList.add("is-live");
    gsap?.set(items, { opacity: 1 });
    dirty = true;
  } else {
    gsap.registerPlugin(ScrollTrigger);
    gsap.set(canvas, { opacity: 0 });
    gsap.set(items, { opacity: 0, y: 24 });

    const intro = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    intro
      .to(canvas, { opacity: 1, duration: 1.2, ease: "power2.out" }, 0)
      .to(material.uniforms.uReveal, { value: 1, duration: 2.8, ease: "power2.out" }, 0)
      .to(state, { intro: 0, duration: 3.2, ease: "power3.out" }, 0)
      .add(() => root.classList.add("is-live"), 1.2)
      .to(items, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: "transform" }, 0.9);

    ScrollTrigger.create({
      trigger: root,
      start: "top 70%",
      once: true,
      onEnter: () => intro.play(),
    });

    // Barely-there depth: the globe grows ~5% as the section scrolls through.
    gsap.fromTo(
      state,
      { scale: 0.97 },
      { scale: 1.02, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true } },
    );
  }

  // ---- Cleanup when the page is torn down ----
  window.addEventListener(
    "pagehide",
    () => {
      stop();
      clearTimeout(autoTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      points?.geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
    { once: true },
  );
}

function rad(deg) {
  return (deg * Math.PI) / 180;
}

// lat/lon → unit sphere. lon 0 faces +z (the camera) when spin is 0.
function toVec(THREE, lat, lon) {
  const phi = rad(lat);
  const lambda = rad(lon);
  return new THREE.Vector3(Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda));
}
