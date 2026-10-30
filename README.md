# dfm-frontend

ARENA (Dubai Financial Market) landing pages — static HTML + Sass + vanilla JS.

- `html-page/index.html` — investor page
- `html-page/company.html` — company page

## Run

```bash
cd html-page
npm install
npm run watch   # Sass: scss/main.scss → css/main.css (minified)
```

Serve `dfm_arena/` from any local server (e.g. MAMP: http://localhost:8888/dfm_arena/html-page/). Fonts load from `../assets/fonts`.

## Review switches (URL params)

- `?stage=v1…v5` — hero / "What is ARENA" background variants (shows a picker)
- `?globe=v1` — old flat canvas globe instead of the 3D one
- `?menu=dark` — dark mobile/tablet menu (light is default)
- `?menubg=aurora` — aurora menu background (dots is default)

## Folders

- `assets/` — fonts
- `backups/globe-v1-canvas/` — original flat globe (restore notes inside)
- `image-originals/` — uncompressed source images

## Deploy (Vercel)

Static, no build step — `css/main.css` is committed, minified (`npm run watch` and `npm run build` both write it compressed; `npm run dev` keeps sources for debugging). `vercel.json` redirects `/` to `/html-page/` (investor page); company page is `/html-page/company.html`. Keep the Vercel project root at the repo root so `../assets/fonts` resolves.

## SEO and sharing

- Each page has its title, meta description, canonical, Open Graph and Twitter tags in `<head>`; share images are `html-page/images/og/*.jpg` (1200×630).
- Icons: `html-page/images/favicon/` (ICO, SVG, Apple touch icon, PNGs) and `site.webmanifest`; `/favicon.ico` at the root for browsers that ask for it.
- `robots.txt` and `sitemap.xml` at the root.
- Backup pages (`index-v*.html`) carry `noindex` (meta tag and an `X-Robots-Tag` header in `vercel.json`).
- `.vercelignore` keeps sources, backups and tooling out of the deploy.
