# dfm-frontend

ARENA (Dubai Financial Market) landing pages — static HTML + Sass + vanilla JS.

- `html-page/index.html` — investor page
- `html-page/company.html` — company page

## Run

```bash
cd html-page
npm install
npm run watch   # Sass: scss/main.scss → css/main.css
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

Static, no build step — `css/main.css` is committed (run `npm run build` in `html-page/` before pushing SCSS changes). `vercel.json` redirects `/` to `/html-page/` (investor page); company page is `/html-page/company.html`. Keep the Vercel project root at the repo root so `../assets/fonts` resolves.
