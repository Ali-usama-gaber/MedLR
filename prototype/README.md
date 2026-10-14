# SAJA MedLR — interactive client prototype

A self-contained front-end prototype. There is no backend: it runs on mock data. The workspace is kept in the browser's `localStorage` (key `saja-medlr-v7`) and uploaded files in IndexedDB, so data survives a reload and is shared by every tab of the same browser.

- **Open:** `dist/index.html` in any modern browser. It is one standalone file. The published copy is `../docs/index.html` (served as GitHub Pages) — `python build.py` refreshes both.
- **Build:** `python build.py` (or `python3`). Inlines `src/*`, the logo, seed media, self-hosted fonts and pdf.js into `dist/index.html` and `dist/artifact.html`, then copies to `../docs/index.html`. Works on Windows, macOS and Linux. Refresh fonts with `node vendor/fetch-fonts.js`.
- **Links:** every page has its own URL (for example `index.html#/module?id=MOD-A-014&tab=versions`). Browser Back/Forward, refresh, bookmarks and shared links open the same page; a link opened while signed out opens after sign-in.
- **Personas:** switch user from the top-right user menu (avatar → user). The administrator is Ali Usama.
- **Workspace data:** Settings → Workspace data — download a backup (one JSON file with every record, audit trail and uploaded files) or restore from a backup. Settings → General also has *Restore initial workspace* for the seed demo. The workspace is browser-only; clearing browser storage deletes it.
- **Idle sign-out:** Settings → Approval settings → *Sign out after inactivity* (default 30 min; 0 = never). One minute before sign-out a warning appears; any mouse, key or touch keeps the session. Recorded in the audit trail.

## Tests

Browser regression suites (Playwright, Chromium).

- **Setup:** `npm install` inside `prototype/` (or `npm install -g playwright`), then `npx playwright install chromium`.
- **All suites:** `npm test` or `node tests/run.js` (cross-platform; `tests/run.sh` does the same on Linux/macOS).
- **Parallel:** `npm run test:parallel` or `node tests/run.js --parallel`.
- **Some suites:** `node tests/run.js nav perms qa-adversary`.
- **Exploratory probe:** `npm run test:probe` or `node tests/jinx-probe.js` — lists findings without failing.
- **Visual guard (CSS refactors):** `node tests/style-snapshot.js save` then `node tests/style-snapshot.js compare`.
- **CSS hygiene:** `node tests/css-usage.js` → `node tests/css-prune.js` → `node tests/css-dedupe.js`.
- The latest QA report is `QA-REPORT.md`.

All products, markets, people and content are fictional. Nothing here is a real medical claim.
