// Adversary regression ("Jinx" mode of the qa-test skill): navigation attacks (Back/Forward, refresh, deep links,
// tampered URLs), hostile input (script injection, 1200-char, RTL/emoji, blank and zero-width names), rapid clicks,
// storage failure, two tabs on one workspace, error feedback, and extreme viewports.
const { chromium } = require('playwright');
const URL = require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150);
  const route = () => E(() => UI.route.name + ' ' + JSON.stringify(UI.route.p));
  const signIn = async (pg, email) => { await pg.fill('#login-email', email); await pg.fill('#login-pass', 'pw'); await pg.click('button[type=submit]'); await pg.waitForTimeout(300); };

  // ---- Navigation: URL, Back/Forward, refresh, deep link, tampered URL
  ok(await E(() => !location.hash), 'signed out: no page in the URL');
  await signIn(p, '  ALI.USAMA@saja.com '); ok(await E(() => S.signedIn && me().id === 'u-ali'), 'sign-in accepts surrounding spaces and any letter case');
  ok(await E(() => location.hash === '#/home'), 'after sign-in the URL shows #/home');
  await E(() => go('modules')); await W(); await E(() => go('module', { id: 'MOD-A-014', tab: 'versions' })); await W();
  ok(await E(() => location.hash === '#/module?id=MOD-A-014&tab=versions'), 'URL names the page and its parameters: ' + await E(() => location.hash));
  await p.goBack(); await W(300); ok((await route()).startsWith('modules'), 'browser Back returns to the previous page (Modules), app stays loaded');
  await p.goForward(); await W(300); ok((await route()) === 'module {"id":"MOD-A-014","tab":"versions"}', 'browser Forward re-opens the module on the same tab');
  await E(() => { UI.modal = { type: 'confirm-reset' }; render(); }); await W(); await p.goBack(); await W(300);
  ok(await E(() => !UI.modal && UI.route.name === 'modules'), 'Back with a dialog open closes it and goes back');
  await E(() => go('module', { id: 'MOD-A-014', tab: 'versions' })); await W(); await p.reload(); await W(500);
  ok((await route()) === 'module {"id":"MOD-A-014","tab":"versions"}', 'refresh keeps the current page and tab');
  await p.goto(URL + '#/review?id=MOD-B-007'); await W(500); ok((await route()) === 'review {"id":"MOD-B-007"}', 'pasted deep link opens that page');
  await p.goto(URL + '#/no-such-page?x=%E0%A4%A'); await W(500); ok(await E(() => UI.route.name === 'home' && location.hash === '#/home'), 'unknown or malformed URL falls back to Home');
  await p.goto(URL + '#/module?id=%3Cimg%20src%3Dx%20onerror%3Dwindow.__pwn%3D1%3E'); await W(500);
  ok(await E(() => !window.__pwn && /not found|no longer/i.test(document.querySelector('#content').innerText)), 'tampered id in the URL shows "not found" and runs no script');
  await E(() => ACT.logout()); await W(); ok(await E(() => !location.hash), 'sign-out clears the page from the URL');
  await p.goto(URL + '#/module?id=MOD-A-021'); await W(400); ok(await E(() => !!document.querySelector('#login-email')), 'a deep link while signed out asks to sign in first');
  await signIn(p, 'ali.usama@saja.com'); ok((await route()) === 'module {"id":"MOD-A-021"}', 'after sign-in the linked page opens');
  await E(() => ACT.logout()); await W(); await p.goto(URL + '#/users'); await W(300); await signIn(p, 'ahmed.ali@saja.com');
  ok(await E(() => document.querySelector('#content').innerText.includes('do not have access')), 'deep link to a page the role may not open still shows the access message');
  await E(() => ACT.logout()); await W(); await signIn(p, 'ali.usama@saja.com');
  for (const [r, o] of [['module', { id: 'NOPE' }], ['asset', { id: 'x' }], ['user', { id: 'zzz' }], ['workflow', { id: 'x' }], ['item', { k: 'nope', id: 'x' }], ['item', { k: 'products', id: 'x' }], ['cover', { id: 'x', k: 'Module', v: '9' }], ['assemble', { id: 'nope' }], ['totally-unknown']]) await E(([r, o]) => { UI.modal = null; go(r, o || {}); }, [r, o]);
  ok(!errs.length, 'invalid ids on every detail page render without errors ' + errs.join(' | '));
  // ---- Hostile input in configuration
  const XSS = '<img src=x onerror="window.__pwn=1"><script>window.__pwn=2</script>';
  const add = async (k, name) => { await E(k => { UI.modal = null; go(k); ACT['cfg-new']({ dataset: { k } }); }, k); await W(); await p.fill('.modal [data-cfg="name"]', name);
    for (const el of await p.$$('.modal input[data-cfg]')) { const f = await el.getAttribute('data-cfg'); if (f !== 'name' && !(await el.inputValue())) await el.fill(f === 'id' ? 'QZ' : 'Test ' + f); }
    await p.click('.modal [data-act=cfg-save]'); await W(200); return E(() => !UI.modal); };
  ok(await add('products', XSS) && await E(() => !window.__pwn), 'script in a product name is stored as text and never runs');
  await E(() => go('modules')); await W(); ok(await E(() => !window.__pwn && !document.querySelector('#app img[src="x"]')), 'the product name renders as text in lists');
  ok(await add('channels', 'منتج تجريبي ✅ 💊👨‍⚕️ עברית') && await E(() => S.channels.some(c => c.name.startsWith('منتج'))), 'RTL text and emoji names are kept exactly');
  ok(!(await add('audiences', '   ')) && await E(() => /Required/.test(document.querySelector('.modal').innerText)), 'spaces-only name refused with "Required"');
  ok(!(await add('audiences', '\u200b\u200b\u2060')) && await E(() => !S.audiences.some(a => !a.name.replace(/[\s\u200b-\u200f\u2060-\u2064\ufeff]/g, ''))), 'zero-width-only name refused');
  ok(await add('audiences', '\u200bCardiac nurses \u200b') && await E(() => S.audiences.some(a => a.name === 'Cardiac nurses')), 'invisible characters around a name are trimmed');
  await E(() => { UI.modal = null; go('sops'); ACT['sop-new']({ dataset: {} }); }); await W();
  await p.fill('.modal [data-sop=name]', '\u200b '); await p.click('.modal [data-act=sop-save]'); await W();
  ok(await E(() => !!UI.modal && !S.sops.some(s => !s.name.replace(/[\s\u200b]/g, ''))), 'SOP with an invisible name refused');
  await E(() => { UI.modal = null; render(); });
  ok(await add('products', 'P'.repeat(1200)), '1200-character product name accepted');
  const wide = await E(() => ['products', 'home', 'modules', 'library', 'reports'].filter(r => { UI.modal = null; go(r); return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1; }));
  ok(!wide.length, 'a 1200-character name does not make any page wider than the screen ' + wide.join(', '));
  await E(() => { go('audiences'); ACT['cfg-new']({ dataset: { k: 'audiences' } }); }); await W(); await p.fill('.modal [data-cfg="name"]', 'Rapid audience');
  await E(() => { const x = document.querySelector('.modal [data-act=cfg-save]'); for (let i = 0; i < 6; i++) x && x.click(); }); await W(300);
  ok(await E(() => S.audiences.filter(a => a.name === 'Rapid audience').length === 1), 'six fast clicks on Save create one record');

  // ---- Storage failure is reported once; refusals look like errors
  const q = await E(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    const box = document.getElementById('toasts'); box.innerHTML = ''; save(); save(); save(); const shown = [...box.children].filter(t => /could not be saved/.test(t.textContent));
    Storage.prototype.setItem = orig; save(); return { n: shown.length, err: !!shown[0] && shown[0].classList.contains('err') && shown[0].getAttribute('role') === 'alert' }; });
  ok(q.n === 1 && q.err, 'storage full: one clear error message (not silent, not repeated)');
  const t = await E(() => { const box = document.getElementById('toasts'); box.innerHTML = ''; toast('It is in use — deactivate it instead'); toast('Team created'); return [...box.children].map(x => x.className + '|' + x.getAttribute('role')); });
  ok(t[0] === 'toast err|alert' && t[1] === 'toast|status', 'refusals use the error style and alert role; confirmations stay normal (' + t.join(', ') + ')');

  // ---- Two tabs on one workspace
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push('tab2: ' + e.message)); await p2.goto(URL + '#/products'); await p2.waitForTimeout(500);
  ok(await p2.evaluate(() => UI.route.name === 'products' && S.signedIn), 'second tab opens signed in on the linked page');
  await E(() => { S.products[0].name = 'Renamed in tab 1'; save(); }); await p2.waitForTimeout(300);
  ok(await p2.evaluate(() => S.products[0].name === 'Renamed in tab 1' && document.querySelector('#content').innerText.includes('Renamed in tab 1')), 'the other tab shows the change without a reload');
  await p2.evaluate(() => { S.markets[0].name = 'Renamed in tab 2'; save(); }); await W(300);
  ok(await E(() => { const s = JSON.parse(localStorage.getItem(STORE_KEY)); return s.products[0].name === 'Renamed in tab 1' && s.markets[0].name === 'Renamed in tab 2' && S.markets[0].name === 'Renamed in tab 2'; }), 'saving in one tab never overwrites the other tab’s changes');
  await p2.close();

  // ---- Extreme viewports
  for (const [w, h] of [[320, 640], [5000, 1200], [667, 375]]) {
    await p.setViewportSize({ width: w, height: h }); await W(150);
    const over = await E(() => [['home'], ['modules'], ['module', { id: 'MOD-A-014' }], ['review', { id: 'MOD-B-007' }], ['assets'], ['assemble', { id: 'AST-105' }], ['reports'], ['roles'], ['settings'], ['audit'], ['workflow', { id: 'WF-STD' }], ['user-new'], ['module-new']].filter(([r, o]) => { UI.modal = null; go(r, o || {}); return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1; }).map(x => x[0]));
    ok(!over.length, `${w}×${h}: no page wider than the screen ${over.join(', ')}`);
  }
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(`${n} checks`); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
