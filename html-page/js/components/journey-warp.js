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
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms }));
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
      uniforms.uDir.value = dir;
      uniforms.uProgress.value = 0;
      renderer.render(scene, camera);
      canvas.classList.add("is-on");

      return new Promise((resolve) => {
        tween = gsap.to(uniforms.uProgress, {
          value: 1,
          duration: 1.35,
          ease: "power2.inOut",
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
