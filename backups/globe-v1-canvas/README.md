# Globe v1 (flat canvas) — backup 2026-10-13

Original "Capital reaches ARENA" globe before the Three.js 3D upgrade.

Restore:
  cp globe.js        ../../html-page/js/components/globe.js
  cp _globe.scss     ../../html-page/scss/sections/_globe.scss
  cp globe.json      ../../html-page/js/data/globe.json
  replace <section class="globe"> … </section> in index.html + company.html with globe-section.html
