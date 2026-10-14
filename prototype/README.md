# SAJA MedLR — interactive client prototype

A self-contained front-end prototype. There is no backend: it runs on mock data. The workspace is kept in the browser's `localStorage` (key `saja-medlr-v7`) and uploaded files in IndexedDB, so data survives a reload and is shared by every tab of the same browser.

- **Open:** `dist/index.html` in any modern browser. It is one standalone file. The published copies are `../index.html` and `../docs/index.html` (copy `dist/index.html` over them after a build).
- **Build:** run `python build.py` (or `python3`). This inlines `src/*`, the logo, seed media and pdf.js into `dist/index.html` and `dist/artifact.html`. Works on Windows, macOS and Linux.
- **Links:** every page has its own URL (for example `index.html#/module?id=MOD-A-014&tab=versions`). Browser Back/Forward, refresh, bookmarks and shared links open the same page; a link opened while signed out opens after sign-in.
- **Demo:** use the *Demo guide* button at the bottom right. It walks through the 13-step journey and switches persona for each step.
- **Personas:** switch user from the top-right user menu. The administrator is Ali Usama.
- **Reset:** the user menu has *Reset demo*, which restores the seed data.

## Tests

Browser regression suites (Playwright, Chromium). One-time setup: `npm install -g playwright` and `npx playwright install chromium`.

- **All suites:** `node tests/run.js` (cross-platform; `tests/run.sh` does the same on Linux/macOS).
- **Some suites:** `node tests/run.js nav perms qa-adversary`.
- **Exploratory adversary probe:** `node tests/jinx-probe.js` lists findings without failing.
- The latest QA report is `QA-REPORT.md`.

All products, markets, people and content are fictional. Nothing here is a real medical claim.
