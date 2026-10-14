// Liquid "pillow" image transition for the listing-journey panel (after the
// sliders-14 reference): the photo bulges and warps, the next one wells up
// through it along an organic noisy edge (thin purple rim), then settles
// flat. A WebGL canvas laid over the <img>s only while a transition runs;
// the real <img>s stay the source of truth (and the no-WebGL fallback).
const THREE_URL = new URL("../vendor/three.module.min.js", import.meta.url).href;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit; // xy scale, zw offset (object-fit: cover)
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;     // +1 forward, -1 back
  uniform vec3 uBg;
  uniform vec3 uRim;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  vec4 sampleFit(sampler2D t, vec4 fit, vec2 uv) {
    vec2 st = uv * fit.xy + fit.zw;
    return texture2D(t, st);
  }

  void main() {
    float p = uProgress;
    float bulge = sin(p * 3.14159265);           // 0 → 1 → 0

    // Pillow warp: centre pushes in, edges bow out (wobbles with noise).
    vec2 c = vUv - 0.5;
    float r2 = dot(c, c);
    float wob = noise(vUv * 3.0 + p * 2.0) - 0.5;
    vec2 warped = 0.5 + c * (1.0 - bulge * (0.22 - r2 * 0.9 + wob * 0.08));

    // Outside the warped frame → panel background (soft edge).
    vec2 edge = smoothstep(vec2(0.0), vec2(0.012), warped) * smoothstep(vec2(0.0), vec2(0.012), 1.0 - warped);
    float inside = edge.x * edge.y;

    // Reveal: new image wells up from the centre, edge drifts in the
    // direction of travel, broken up by noise.
    vec2 rc = c + vec2(uDir * 0.12 * (1.0 - p), 0.0);
    float n = noise(vUv * 5.0 + vec2(p * 1.5, 0.0)) * 0.35;
    float d = length(rc * vec2(1.0, 1.25)) + n;
    float front = p * 1.55 - 0.1;
    float mask = smoothstep(front, front - 0.12, d);
    float rim = smoothstep(0.025, 0.0, abs(d - front + 0.06)) * bulge;

    // Tiny chroma split while it's moving.
    vec2 shift = c * bulge * 0.012;
    vec4 a = vec4(
      sampleFit(uFrom, uFromFit, warped + shift).r,
      sampleFit(uFrom, uFromFit, warped).g,
      sampleFit(uFrom, uFromFit, warped - shift).b, 1.0);
    vec4 b = vec4(
      sampleFit(uTo, uToFit, warped * (1.0 - 0.06 * (1.0 - p)) + 0.03 * (1.0 - p) + shift).r,
      sampleFit(uTo, uToFit, warped * (1.0 - 0.06 * (1.0 - p)) + 0.03 * (1.0 - p)).g,
      sampleFit(uTo, uToFit, warped * (1.0 - 0.06 * (1.0 - p)) + 0.03 * (1.0 - p) - shift).b, 1.0);

    vec3 col = mix(a.rgb, b.rgb, mask);
    col = mix(col, uRim, rim * 0.35);
    col = mix(uBg, col, inside);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// "Ripple" (default): a water-drop transition. Concentric waves spread
// from the centre and refract the old photo; the new one is revealed inside
// a growing, softly wobbling circle with a thin light caustic on its edge,
// while the old photo sinks back. ?journey=pillow keeps the bulge warp.
const FRAG_RIPPLE = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit;
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;
  uniform vec3 uBg;
  uniform vec3 uRim;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  vec4 sampleFit(sampler2D t, vec4 fit, vec2 uv) { return texture2D(t, uv * fit.xy + fit.zw); }

  void main() {
    float p = uProgress;
    vec2 origin = vec2(0.5 + uDir * 0.08, 0.55);
    vec2 d = (vUv - origin) * vec2(uAspect, 1.0);
    float r = length(d);
    vec2 dir = r > 0.0001 ? d / r : vec2(0.0);

    // Reaches the farthest corner exactly at p = 1.
    float maxR = length(vec2(uAspect * 0.58, 0.55)) + 0.08;
    float radius = p * maxR;
    float wave = sin(r * 42.0 - p * 26.0) * exp(-abs(r - radius) * 7.0);
    float amp = sin(p * 3.14159265) * 0.028;
    vec2 offset = dir * wave * amp / vec2(uAspect, 1.0);

    float n = (noise(vUv * 6.0 + p * 2.0) - 0.5) * 0.06;
    float mask = smoothstep(radius + 0.02, radius - 0.04, r + n);
    float rim = smoothstep(0.035, 0.0, abs(r + n - radius + 0.01)) * sin(p * 3.14159265);

    vec2 fromUv = (vUv - 0.5) * (1.0 + p * 0.06) + 0.5 + offset;
    vec3 a = sampleFit(uFrom, uFromFit, fromUv).rgb * (1.0 - p * 0.35);
    vec2 toUv = (vUv - 0.5) * (1.0 - (1.0 - p) * 0.08) + 0.5 + offset * 0.6;
    vec3 b = sampleFit(uTo, uToFit, toUv).rgb;

    vec3 col = mix(a, b, mask);
    col += uRim * rim * 0.35 + vec3(1.0) * rim * 0.12;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FRAG_INK = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit;
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;
  uniform vec3 uBg;
  uniform vec3 uRim;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
  vec3 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0) * uFromFit.xy + uFromFit.zw).rgb; }
  vec3 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0) * uToFit.xy + uToFit.zw).rgb; }

  // Ink bleed: the new photo spreads through the old like ink in water.
  void main() {
    float p = uProgress;
    vec2 q = vUv * vec2(uAspect, 1.0);
    float n = fbm(q * 2.5 + vec2(p * 0.8, -p * 0.5));
    float front = p * 1.35 - 0.2;
    float side = (uDir > 0.0 ? 1.0 - vUv.x : vUv.x) * 0.35;
    float m = 1.0 - smoothstep(front - 0.12, front + 0.02, n + side);
    float edge = smoothstep(0.1, 0.0, abs(n + side - front + 0.05)) * sin(p * 3.14159);
    vec3 col = mix(A(vUv + (n - 0.5) * 0.02 * p), B(vUv), m);
    col = mix(col, col * 0.55, edge * 0.6);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FRAG_SMOKE = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit;
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;
  uniform vec3 uBg;
  uniform vec3 uRim;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
  vec3 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0) * uFromFit.xy + uFromFit.zw).rgb; }
  vec3 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0) * uToFit.xy + uToFit.zw).rgb; }

  // Smoke dissolve: the old photo breaks into drifting smoke.
  void main() {
    float p = uProgress;
    vec2 q = vUv * vec2(uAspect, 1.0) * 3.0;
    float n = fbm(q + vec2(0.0, -p * 1.5));
    vec2 drift = vec2((n - 0.5) * 0.08, -p * 0.12) * p;
    float t = smoothstep(n - 0.15, n + 0.15, p * 1.3 - 0.15);
    vec3 a = A(vUv + drift);
    a = mix(a, vec3(dot(a, vec3(0.33))) * 1.2, t * 0.5);
    gl_FragColor = vec4(mix(a, B(vUv), t), 1.0);
  }
`;

const FRAG_DOTS = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit;
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;
  uniform vec3 uBg;
  uniform vec3 uRim;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
  vec3 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0) * uFromFit.xy + uFromFit.zw).rgb; }
  vec3 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0) * uToFit.xy + uToFit.zw).rgb; }

  // Dot mosaic: the photo breaks into round ARENA-style dots that wash
  // across, then re-form as the new photo.
  void main() {
    float p = uProgress;
    float cells = 46.0;
    vec2 grid = vec2(cells * uAspect, cells);
    vec2 cell = floor(vUv * grid);
    vec2 cuv = (cell + 0.5) / grid;
    vec2 f = fract(vUv * grid) - 0.5;
    float order = (uDir > 0.0 ? cuv.x : 1.0 - cuv.x) * 0.7 + hash(cell) * 0.3;
    float local = clamp((p * 1.6 - order * 0.6) / 0.6, 0.0, 1.0);
    float pix = smoothstep(0.0, 0.35, local) * (1.0 - smoothstep(0.65, 1.0, local));
    float dotR = 0.5 - 0.32 * sin(local * 3.14159);
    float inDot = 1.0 - smoothstep(dotR - 0.08, dotR, length(f));
    vec3 src = local < 0.5 ? mix(A(vUv), A(cuv), pix) : mix(B(vUv), B(cuv), pix);
    gl_FragColor = vec4(mix(uBg, src, mix(1.0, inDot, pix)), 1.0);
  }
`;

const FRAG_BLINDS = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit;
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;
  uniform vec3 uBg;
  uniform vec3 uRim;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
  vec3 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0) * uFromFit.xy + uFromFit.zw).rgb; }
  vec3 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0) * uToFit.xy + uToFit.zw).rgb; }

  // 3D blinds: vertical strips flip one after another.
  void main() {
    float p = uProgress;
    float strips = 12.0;
    float x = uDir > 0.0 ? vUv.x : 1.0 - vUv.x;
    float idx = floor(x * strips);
    float local = clamp(p * 1.8 - idx / strips * 0.8, 0.0, 1.0);
    float ang = local * 3.14159265;
    float fx = fract(x * strips);
    float w = abs(cos(ang));
    float sx = (fx - 0.5) / max(w, 0.001) + 0.5;
    float base = (idx + clamp(sx, 0.0, 1.0)) / strips;
    vec2 uv = vec2(uDir > 0.0 ? base : 1.0 - base, vUv.y);
    vec3 col = ang > 1.5707963 ? B(uv) : A(uv);
    if (sx < 0.0 || sx > 1.0) col = uBg; else col *= 0.55 + 0.45 * w;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FRAG_ZOOM = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit;
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;
  uniform vec3 uBg;
  uniform vec3 uRim;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
  vec3 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0) * uFromFit.xy + uFromFit.zw).rgb; }
  vec3 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0) * uToFit.xy + uToFit.zw).rgb; }

  // Zoom tunnel: the old photo rushes toward you, the new one emerges.
  void main() {
    float p = uProgress;
    vec2 c = vUv - 0.5;
    vec3 a = vec3(0.0), b = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float k = float(i) / 7.0;
      float blur = sin(p * 3.14159) * 0.06 * k;
      a += A(0.5 + c * (1.0 - p * 0.55 - blur));
      b += B(0.5 + c * (1.25 - p * 0.25 + blur));
    }
    vec3 col = mix(a / 8.0, b / 8.0, smoothstep(0.35, 0.75, p));
    col += vec3(1.0) * sin(p * 3.14159) * 0.08 * (1.0 - length(c));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FRAG_LIGHT = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec4 uFromFit;
  uniform vec4 uToFit;
  uniform float uProgress;
  uniform float uDir;
  uniform vec3 uBg;
  uniform vec3 uRim;
  uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
  vec3 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0) * uFromFit.xy + uFromFit.zw).rgb; }
  vec3 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0) * uToFit.xy + uToFit.zw).rgb; }

  // Light sweep: a soft diagonal band of light crosses, the new photo behind.
  void main() {
    float p = uProgress;
    float x = (uDir > 0.0 ? vUv.x : 1.0 - vUv.x) + (vUv.y - 0.5) * 0.35;
    float front = p * 1.6 - 0.3;
    float m = smoothstep(front + 0.05, front - 0.05, x);
    float band = exp(-pow((x - front) * 9.0, 2.0)) * sin(p * 3.14159);
    vec3 col = mix(A(vUv), B(vUv), m);
    col += vec3(1.0, 0.98, 1.0) * band * 0.55 + uRim * band * 0.25;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export async function createWarp(media) {
  const THREE = await import(THREE_URL);
  const canvas = document.createElement("canvas");
  canvas.className = "journey-panel__warp";
  canvas.setAttribute("aria-hidden", "true");
  media.append(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const blank = new THREE.DataTexture(new Uint8Array([27, 29, 43, 255]), 1, 1);
  blank.needsUpdate = true;
  const uniforms = {
    uFrom: { value: blank },
    uTo: { value: blank },
    uFromFit: { value: new THREE.Vector4(1, 1, 0, 0) },
    uToFit: { value: new THREE.Vector4(1, 1, 0, 0) },
    uProgress: { value: 0 },
    uDir: { value: 1 },
    uBg: { value: new THREE.Color("#1b1d2b") },
    uRim: { value: new THREE.Color("#a98bff") },
    uAspect: { value: 1 },
  };
  // ?journey=<name> picks the effect (default ripple).
  const EFFECTS = { ripple: FRAG_RIPPLE, pillow: FRAG, ink: FRAG_INK, smoke: FRAG_SMOKE, dots: FRAG_DOTS, blinds: FRAG_BLINDS, zoom: FRAG_ZOOM, light: FRAG_LIGHT };
  const pick = new URLSearchParams(window.location.search).get("journey");
  const style = EFFECTS[pick] || FRAG_RIPPLE;
  const pillow = style === FRAG;
  // ?journey=pillow keeps the earlier bulge warp.
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: style, uniforms }));
  scene.add(mesh);

  const cache = new Map();
  const textureFor = (img) => {
    const src = img.currentSrc || img.src;
    if (cache.has(src)) return cache.get(src);
    // Copy at the image's natural size: an <img>'s .width is its layout
    // width, which three would allocate and then overflow on upload.
    const scale = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
    const bmp = document.createElement("canvas");
    bmp.width = Math.max(1, Math.round(img.naturalWidth * scale));
    bmp.height = Math.max(1, Math.round(img.naturalHeight * scale));
    bmp.getContext("2d").drawImage(img, 0, 0, bmp.width, bmp.height);
    const tex = new THREE.CanvasTexture(bmp);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    cache.set(src, tex);
    return tex;
  };

  // object-fit: cover + object-position → uv scale/offset.
  const fitFor = (img, w, h, out) => {
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const box = w / h;
    const pic = iw / ih;
    const [px, py] = (getComputedStyle(img).objectPosition || "50% 50%").split(" ").map((v) => parseFloat(v) / 100);
    let sx = 1;
    let sy = 1;
    if (pic > box) sx = box / pic;
    else sy = pic / box;
    // uv.y is bottom-up in GL; object-position y is top-down.
    out.set(sx, sy, (1 - sx) * (isNaN(px) ? 0.5 : px), (1 - sy) * (1 - (isNaN(py) ? 0.5 : py)));
  };

  const size = () => {
    const w = media.clientWidth;
    const h = media.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    return [w, h];
  };

  let tween = null;

  return {
    // Resolves when the warp has finished (or immediately if it can't run).
    play(fromImg, toImg, dir, gsap) {
      tween?.kill();
      const [w, h] = size();
      if (!w || !h) return Promise.resolve();
      uniforms.uFrom.value = textureFor(fromImg);
      uniforms.uTo.value = textureFor(toImg);
      fitFor(fromImg, w, h, uniforms.uFromFit.value);
      fitFor(toImg, w, h, uniforms.uToFit.value);
      uniforms.uAspect.value = w / h;
      uniforms.uDir.value = dir;
      uniforms.uProgress.value = 0;
      renderer.render(scene, camera);
      canvas.classList.add("is-on");

      return new Promise((resolve) => {
        tween = gsap.to(uniforms.uProgress, {
          value: 1,
          duration: pillow ? 1.35 : 1.6,
          ease: pillow ? "power2.inOut" : "power1.inOut",
          onUpdate: () => renderer.render(scene, camera),
          onComplete: () => {
            canvas.classList.remove("is-on");
            resolve();
          },
        });
      });
    },
  };
}

// Review picker: lists every effect when ?journey= is in the URL.
export const JOURNEY_EFFECTS = ["ripple", "pillow", "ink", "smoke", "dots", "blinds", "zoom", "light"];
