
# SQL Runtime Integration

## 1) Place sql.js (WASM build)
Download the sql.js dist and add these files to your repo:
- `/assets/sql/sql-wasm.js`
- `/assets/sql/sql-wasm.wasm`

(From https://github.com/sql-js/sql.js/releases — use the `dist` files.)

## 2) Put datasets & content
- Datasets: `/assets/sql/datasets/retail.sqlite`, `movies.sqlite`, `hr.sqlite`
- Content JSON: `/assets/sql/puzzles.json`, `/assets/sql/lessons.json`
- Schemas (optional but recommended): `/assets/sql/metadata/schema-*.json`

## 3) Add pages
- `/sql/puzzles.html`
- `/sql/lab.html`

## 4) Scripts (already referenced in the pages)
- `/assets/js/sql/engine.js`
- `/assets/js/sql/verify.js`
- `/assets/js/sql/puzzles-page.js`
- `/assets/js/sql/lab-page.js`

## 5) Test locally
- Use a static server so `fetch()` works (e.g., `python -m http.server`).
- Visit `/sql/puzzles.html` and `/sql/lab.html`.
