// "Ripple" image transition for the listing-journey panel: a water-drop
// effect where the next photo is revealed inside a growing circle. A WebGL
// canvas laid over the <img>s only while a transition runs; the real
// <img>s stay the source of truth (and the no-WebGL fallback).
const THREE_URL = new URL("../vendor/three.module.min.js", import.meta.url).href;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Concentric waves spread from the centre and refract the old photo; the
// new one is revealed inside a growing, softly wobbling circle with a thin
// light caustic on its edge, while the old photo sinks back.
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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG_RIPPLE, uniforms }));
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
          duration: 1.6,
          ease: "power1.inOut",
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
