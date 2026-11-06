# dfm-frontend

ARENA (Dubai Financial Market) landing pages — static HTML + Sass + vanilla JS.

- `html-page/index.html` — Investors page
- `html-page/company.html` — Home (raise capital) page
- `html-page/growth-companies.html` (Growth companies), `private-companies.html` (Private companies), `family-business.html` (Family business), `esop.html` (ESOP) — the four company pages, same section order

Review: "Why companies choose it" has two versions on the company pages. Default = B (two cards play once, slower, then stop); add `?why=a` for A (no animation). Remove the unused one in `js/components/route-viz.js` once the client chooses.
- `html-page/eligibility.html` — strategic fit assessment

## Run

```bash
cd html-page
npm install
npm run watch   # Sass: scss/main.scss → css/main.css (minified)
```

Serve `dfm_arena/` from any local server (e.g. MAMP: http://localhost:8888/dfm_arena/html-page/). Fonts are in `html-page/fonts`.

## Folders

- `html-page/fonts/` — Fester typeface

## Deploy (Vercel)

Static, no build step — `css/main.css` is committed, minified (`npm run watch` and `npm run build` both write it compressed; `npm run dev` keeps sources for debugging). `vercel.json` redirects `/` to `/html-page/` (investor page); company page is `/html-page/company.html`.

## SEO and sharing

- Each page has its title, meta description, canonical, Open Graph and Twitter tags in `<head>`; share images are `html-page/images/og/*.jpg` (1200×630).
- Icons: `html-page/images/favicon/` (ICO, SVG, Apple touch icon, PNGs) and `site.webmanifest`; `/favicon.ico` at the root for browsers that ask for it.
- `robots.txt` and `sitemap.xml` at the root.
- `.vercelignore` keeps sources and tooling out of the deploy.
