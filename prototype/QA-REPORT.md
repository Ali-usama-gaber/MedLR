# QA Test Report — SAJA MedLR

**URL:** `prototype/dist/index.html` (file://, also published as `index.html` and `docs/index.html`)
**Date:** 2026-10-14
**Mode:** Full: Discovery + Standard (existing acceptance criteria) + Adversary (Jinx), using the [qa-test](https://github.com/adampaulwalker/qa-test) skill
**Overall status:** 22 / 22 suites pass after the fixes. The adversary probe went from 7 findings to 0.

## Summary
The existing regression suites (21 suites, about 1,000 checks) passed before and after the work. Adversary testing found 7 issues the suites did not cover: 6 High and 1 Low. All 7 are fixed. A new `qa-adversary` suite (35 checks) now guards them. Separately, the test and build tooling only ran on Linux; it now runs on Windows too.

## Adversary findings (Jinx) and fixes

| # | Severity | Category | Issue (before) | Fix | Evidence |
|---|---|---|---|---|---|
| 1 | HIGH | Navigation | The current page was not in the URL, so pages could not be bookmarked or shared | Every page is now in the hash, e.g. `#/module?id=MOD-A-014&tab=versions` | `docs/review/qa/001-PASS-deep-link-url.png` |
| 2 | HIGH | Navigation | Browser **Back** left the app completely (`about:blank`) | Uses `history.pushState` and a `popstate` handler. Back/Forward move between pages, and an open dialog closes first | `002-PASS-browser-back.png` |
| 3 | HIGH | Navigation | **Refresh** always landed on Home | The page and tab from the URL are restored on load. A link opened while signed out opens after sign-in | `003-PASS-refresh-keeps-page.png` |
| 4 | HIGH | Input | Names made of only zero-width or invisible characters were accepted, creating blank entries in every dropdown | Shared `blank()` / `clean()` helpers in all name checks (reference data, users, modules, workflows, SOPs, assets) | `004-PASS-invisible-name-refused.png` |
| 5 | HIGH | State | When browser storage was full or blocked, `save()` failed silently and every change was lost on reload | One clear error message until storage works again | `006-PASS-storage-full-warning.png` |
| 6 | HIGH | State | Two tabs: tab B never saw tab A's changes and overwrote them on its next save (data loss) | A `storage` event listener: each tab picks up the other's data and keeps its own sign-in, page and unsaved form | `qa-adversary` suite |
| 7 | LOW | Visual | Refusals ("It is in use…", "You are not allowed…") looked exactly like success messages (green tick) | Error toasts get their own colour, an alert icon, `role="alert"` and a longer display time | `005-PASS-error-toast.png` |

Checked with no issue found: script injection in names, URLs and search (always escaped); 1,200-character names (no overflow); RTL text and emoji (kept exactly); six fast clicks on Save (one record); invalid or tampered IDs in every detail route ("not found" page, no errors); a deep link to a page the role may not open (access message shown); and 320 px, 667×375 and 5000 px viewports (no horizontal overflow).

## Tooling fixes
- `build.py`: explicit UTF-8 reads and writes with LF line endings, so the output is the same on Windows and Linux. Also replaced the deprecated `utcnow()`.
- All 21 suites had the hard-coded path `file:///home/user/...`. They now build the path from their own location.
- New `tests/run.js`: a cross-platform runner with a summary and failure details. `node tests/run.js [suite…]` runs everything or the named suites.
- `formstate.test.js` now counts real document loads, so hash navigation is not counted as a reload.
- `README.md` corrected: it said `sessionStorage`, but the app uses `localStorage` and IndexedDB. Added sections on links and tests.

## Results (final run)

| Suite | Checks | Status |
|---|---|---|
| e2e, perms, life, media, ann, ann2, fileview, forms, acceptance, smoke2, notif, rail, nav, home, formstate, v2 | 42 + 23 + 65 + 33 + 28 + 44 + 16 + 38 + 45 + page crawl + 19 + 23 + 15 + 28 + 14 + 44 | PASS |
| qa-perm, qa-popup, qa-crawl, qa-data, qa-forms | 26 + 390 + 19 + 15 + 24 | PASS |
| **qa-adversary (new)** | 35 | PASS |

## Recommendations (not done: these need a product decision or a backend)
1. **Authentication is simulated.** Any password is accepted. That is fine for a prototype, but a real build needs server-side authentication and authorisation. All permission checks today run in the browser.
2. **The audit trail is editable in the browser** (localStorage). For GxP / 21 CFR Part 11 it has to be append-only on a server, with the e-signature re-authenticated.
3. **Storage size:** large uploads live in IndexedDB but the workspace JSON is in localStorage (about 5 MB). Very large workspaces will now show the new warning; a backend removes the limit.
4. Run `node tests/run.js` before each delivery, and `node tests/jinx-probe.js` for a quick exploratory pass.

## Environment
- Browser: Chromium (Playwright 1.x), headless
- Viewports: 1440×900 (main), plus 1920, 1280, 960, 820, 768, 667×375, 390, 320 and 5000 px in the viewport checks
- OS: Windows; Node 24; Python 3.14
