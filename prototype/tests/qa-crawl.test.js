// Crawl: every page × every role (access, errors), every control on every admin page (clicked, data restored after),
// controls that look actionable but do nothing, and page overflow at five viewports.
const { chromium } = require('playwright');
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const PAGES = [['home'], ['modules'], ['module', { id: 'MOD-A-018' }], ['module', { id: 'MOD-C-010' }], ['module', { id: 'MOD-B-020' }], ['module-new'], ['module-edit', { id: 'MOD-B-015' }], ['review', { id: 'MOD-B-007' }], ['tasks'], ['assets'], ['asset', { id: 'AST-106' }], ['assemble', { id: 'AST-105' }], ['asset-review', { id: 'AST-106' }], ['library'], ['cover', { kind: 'Module', id: 'MOD-C-001', v: 1 }], ['reports'], ['lifecycle'], ['audit'], ['sops'], ['workflows'], ['workflow', { id: 'WF-STD' }], ['workflow-new'], ['refdata'], ['products'], ['markets'], ['moduletypes'], ['materials'], ['channels'], ['audiences'], ['references'], ['item', { k: 'products', id: 'P-A' }], ['org'], ['users'], ['user', { id: 'u-sara' }], ['user-new'], ['user-edit', { id: 'u-hana' }], ['teams'], ['functions'], ['roles'], ['settings'], ['settings', { tab: 'notifications' }], ['settings', { tab: 'data' }]];
const SKIP_ACT = ['logout', 'reset-confirm', 'print', 'audit-export'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a);
  const login = async email => { await E(() => ACT.logout()); await p.waitForSelector('#login-email'); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForFunction(e => S.signedIn && me().email === e, email); };
  // 1) every page for every role: allowed pages render without errors, the rest show the access message
  const users = ['ali.usama', 'hana.zaki', 'omar.khalil', 'ahmed.ali', 'sara.ahmed', 'mona.adel', 'rania.haddad', 'tarek.samir', 'layla.nasser', 'karim.fawzi', 'youssef.amin'];
  for (const u of users) { await login(u + '@saja.com'); errs.length = 0;
    const r = await E(PAGES => { const bad = []; let shown = 0; PAGES.forEach(([name, o]) => { try { UI.modal = null; go(name, o || {}); } catch (e) { bad.push(name + ': ' + e.message); return; } const c = document.querySelector('#content'); const denied = c.textContent.includes('do not have access'); const allowed = can(me(), ROUTE_PERM[name] || 'view'); if (allowed && !denied) shown++; if (!c.textContent.trim()) bad.push(name + ' empty'); if (allowed === denied && !['module', 'review', 'asset', 'assemble', 'asset-review', 'cover', 'module-edit', 'item', 'user', 'user-edit'].includes(name)) bad.push(name + (allowed ? ' wrongly blocked' : ' NOT blocked')); }); return { bad, shown }; }, PAGES);
    ok(!r.bad.length && !errs.length, `${u}: ${r.shown} pages render, protected pages refused ${r.bad.concat(errs).join('; ')}`); }
  // 2) every control on every page, as Administrator; data restored after each click
  await login('ali.usama@saja.com'); const snap = await E(() => JSON.stringify(S));
  const orphans = []; let clicked = 0; const broken = [];
  for (const [name, o] of PAGES) {
    await E(([name, o, snap]) => { S = JSON.parse(snap); UI.modal = null; UI.pop = null; UI.f = {}; go(name, o || {}); }, [name, o, snap]);
    // controls that look like actions but are wired to nothing
    orphans.push(...(await E(name => [...document.querySelectorAll('#app button, #app [role=button], #app a')].filter(el => !el.disabled && !el.closest('[disabled]') && !el.dataset.act && !el.dataset.go && !el.dataset.pop && el.type !== 'submit' && !el.closest('[data-act], [data-go]') && !(el.tagName === 'A' && (el.getAttribute('href') || el.hasAttribute('download'))) && !el.hasAttribute('data-file-dl') && !el.closest('label') && !el.dataset.tab && !el.dataset.an && !el.dataset.anf && !el.dataset.d && !el.getAttribute('onclick') && el.offsetParent).map(el => name + ': ' + (el.textContent.trim() || el.getAttribute('aria-label') || el.className).slice(0, 40)), name)));
    const count = await E(() => document.querySelectorAll('#app [data-act], #app [data-go]').length);
    for (let i = 0; i < Math.min(count, 120); i++) {
      const info = await E(([name, o, i, snap, SKIP]) => { S = JSON.parse(snap); UI.modal = null; UI.pop = null; UI.msel = null; go(name, o || {}); const el = [...document.querySelectorAll('#app [data-act], #app [data-go]')][i]; if (!el || el.disabled || SKIP.includes(el.dataset.act) || el.hasAttribute('data-file-dl')) return null; const label = (el.dataset.act || 'go:' + el.dataset.go) + ' "' + (el.textContent || '').trim().slice(0, 30) + '"'; try { el.click(); } catch (e) { return label + ' THREW ' + e.message; } return label; }, [name, o, i, snap, SKIP_ACT]);
      if (!info) continue; clicked++; await p.waitForTimeout(20);
      if (errs.length || info.includes('THREW')) { broken.push(name + ' · ' + info + ' ' + errs.join(' | ')); errs.length = 0; }
    }
  }
  await E(snap => { S = JSON.parse(snap); save(); }, snap);
  ok(!broken.length, `${clicked} controls clicked across ${PAGES.length} pages without errors${broken.length ? ': ' + broken.slice(0, 15).join(' || ') : ''}`);
  ok(!orphans.length, `no decorative buttons (controls with no action)${orphans.length ? ': ' + [...new Set(orphans)].slice(0, 20).join(' | ') : ''}`);
  // 3) page overflow at five viewports
  for (const [vl, vp] of [['1920', [1920, 1080]], ['1440', [1440, 900]], ['1440@150%', [960, 600]], ['768', [768, 1024]], ['390', [390, 844]]]) {
    await p.setViewportSize({ width: vp[0], height: vp[1] }); await p.waitForTimeout(200);
    const over = await E(PAGES => { const out = []; PAGES.forEach(([name, o]) => { UI.modal = null; go(name, o || {}); const de = document.documentElement; if (de.scrollWidth > de.clientWidth + 1) { const wide = [...document.querySelectorAll('#content *')].filter(e => e.getBoundingClientRect().right > de.clientWidth + 1 && !(() => { for (let x = e.parentElement; x; x = x.parentElement) if (['auto', 'scroll', 'hidden'].includes(getComputedStyle(x).overflowX)) return true; return false; })()).slice(0, 2).map(e => e.tagName + '.' + String(e.className).split(' ')[0]); out.push(name + (o && o.id ? '(' + o.id + ')' : '') + ' +' + (de.scrollWidth - de.clientWidth) + 'px ' + wide.join(',')); } }); return out; }, PAGES);
    ok(!over.length, `${vl}: no page is wider than the screen${over.length ? ': ' + over.join(' | ') : ''}`);
  }
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(`${n} checks`); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
