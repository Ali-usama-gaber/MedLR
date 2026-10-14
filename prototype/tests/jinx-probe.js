// Exploratory adversary probe (qa-test skill, "Jinx"): reports findings, asserts nothing.
const { chromium } = require('playwright');
const URL = require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href;
const F = []; const note = (sev, cat, page, what) => { F.push({ sev, cat, page, what }); console.log(`[${sev}] ${cat} · ${page} · ${what}`); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150);
  const login = async email => { await E(() => { S.signedIn = false; save(); go('login'); }); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  const flushErr = page => { if (errs.length) { note('CRITICAL', 'Runtime', page, 'page error: ' + errs.join(' | ').slice(0, 300)); errs.length = 0; } };

  // ---- Auth / navigation
  await p.fill('#login-email', ''); await p.fill('#login-pass', ''); await p.click('button[type=submit]'); await W();
  if (!(await p.textContent('body')).includes('Enter your email')) note('HIGH', 'State', 'login', 'empty submit gives no error');
  await p.fill('#login-email', '   ALI.USAMA@SAJA.COM  '); await p.fill('#login-pass', 'x'); await p.click('button[type=submit]'); await W(300);
  if (!(await E(() => S.signedIn))) note('MEDIUM', 'Input', 'login', 'email with spaces/uppercase not accepted');
  await E(() => go('modules')); await W(); await E(() => go('module', { id: 'MOD-A-014' })); await W();
  if (!(await E(() => location.hash))) note('HIGH', 'Navigation', 'all', 'route is not in the URL: pages cannot be bookmarked or shared (deep link)');
  await p.goBack().catch(() => {}); await W(300);
  const afterBack = await E(() => ({ href: location.href, route: typeof UI !== 'undefined' ? UI.route.name : '(app gone)' })).catch(() => ({ href: '?', route: '(left app)' }));
  if (afterBack.route !== 'modules') note('HIGH', 'Navigation', 'module', 'browser Back does not return to the previous page (got ' + afterBack.route + ', ' + afterBack.href.slice(-40) + ')');
  await p.goto(URL); await W(300);
  await E(() => go('module', { id: 'MOD-A-014', tab: 'versions' })); await W(); await p.reload(); await W(400);
  const afterReload = await E(() => UI.route.name + ' ' + JSON.stringify(UI.route.p));
  if (!afterReload.startsWith('module ')) note('HIGH', 'Navigation', 'module', 'refresh loses the current page, lands on: ' + afterReload);
  for (const [r, o] of [['module', { id: 'NOPE' }], ['asset', { id: '<img src=x>' }], ['user', { id: 'zzz' }], ['workflow', { id: 'x' }], ['item', { k: 'nope', id: 'x' }], ['item', { k: 'products', id: 'x' }], ['cover', { id: 'x', k: 'Module', v: '9' }], ['review', { id: 'MOD-A-014' }], ['asset-review', { id: 'AST-101' }], ['assemble', { id: 'nope' }], ['totally-unknown']]) {
    try { await E(([r, o]) => { UI.modal = null; go(r, o || {}); }, [r, o]); } catch (e) { note('CRITICAL', 'Navigation', r, 'go() threw for ' + JSON.stringify(o) + ': ' + e.message.slice(0, 160)); }
    await W(60); flushErr(r + JSON.stringify(o || {}));
    const txt = await E(() => (document.querySelector('#content') || document.body).innerText);
    if (/undefined|\[object Object\]|NaN/.test(txt)) note('MEDIUM', 'Navigation', r, 'bad id shows raw values: ' + (txt.match(/.{0,30}(undefined|\[object Object\]|NaN).{0,30}/) || [''])[0]);
    if (!txt.trim()) note('HIGH', 'Navigation', r, 'blank page for ' + JSON.stringify(o || {}));
  }
  await E(() => { UI.modal = null; go('home'); });
  // ---- Input attacks on reference data (XSS, long, RTL, emoji, whitespace)
  const XSS = '<img src=x onerror="window.__pwn=1">"\'><script>window.__pwn=2</script>{{7*7}}';
  const LONG = 'A'.repeat(1200); const RTL = 'منتج تجريبي ✅ 💊👨‍⚕️ עברית';
  await login('ali.usama@saja.com');
  for (const [k, field, val] of [['products', 'name', XSS], ['products', 'name', LONG], ['channels', 'name', RTL], ['audiences', 'name', '   '], ['audiences', 'name', '\u200b\u200b']]) {
    await E(k => { go(k); ACT['cfg-new']({ dataset: { k } }); }, k); await W();
    if (!(await p.$(`.modal [data-cfg="${field}"]`))) { note('LOW', 'Input', k, 'no ' + field + ' field in create modal'); continue; }
    await p.fill(`.modal [data-cfg="${field}"]`, val);
    for (const el of await p.$$('.modal [data-cfg]')) { const n = await el.getAttribute('data-cfg'); if (n !== field && (await el.evaluate(e => e.tagName)) === 'INPUT' && !(await el.inputValue())) await el.fill(n === 'id' ? 'QZ' : 'Test ' + n); }
    await p.click('.modal [data-act=cfg-save]'); await W(200); flushErr(k);
    const pwn = await E(() => window.__pwn); if (pwn) note('CRITICAL', 'Input', k, 'script injection executed (' + pwn + ')');
    if (!val.replace(/[\s\u200b]/g, '') && await E(k => CONFIG[k].coll().some(x => !String(x.name).replace(/[\s\u200b]/g, '')), k)) note('HIGH', 'Input', k, 'blank / zero-width name accepted: ' + JSON.stringify(val));
    await E(() => { UI.modal = null; render(); });
  }
  for (const r of ['products', 'home', 'modules', 'module-new', 'library', 'reports']) { await E(r => { UI.modal = null; go(r); }, r); await W(80); flushErr(r + ' (long names)'); const de = await E(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (de > 1) note('MEDIUM', 'Visual', r, '1200-char product name makes the page ' + de + 'px wider than the screen'); }

  // ---- Interaction: rapid clicks on create
  await E(() => { UI.modal = null; go('products'); ACT['cfg-new']({ dataset: { k: 'audiences' } }); }); await W();
  await E(() => { go('audiences'); ACT['cfg-new']({ dataset: { k: 'audiences' } }); }); await W();
  await p.fill('.modal [data-cfg="name"]', 'Rapid audience');
  await E(() => { const b = document.querySelector('.modal [data-act=cfg-save]'); for (let i = 0; i < 6; i++) b && b.click(); }); await W(300);
  const dup = await E(() => S.audiences.filter(a => a.name === 'Rapid audience').length); if (dup > 1) note('HIGH', 'Interaction', 'audiences', 'rapid clicks created ' + dup + ' duplicates');
  flushErr('rapid');

  // ---- State: storage full
  const quota = await E(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; const box = document.getElementById('toasts'); box.innerHTML = ''; try { save(); } catch (e) { return 'threw'; } finally { Storage.prototype.setItem = orig; save(); } return /could not be saved/i.test(box.textContent) ? 'warned' : 'silent'; });
  if (quota !== 'warned') note('HIGH', 'State', 'all', 'when browser storage is full, changes are not saved and the user is not told (' + quota + ') — data loss on reload');

  // ---- State: two tabs
  const p2 = await ctx.newPage(); await p2.goto(URL); await p2.waitForTimeout(400);
  await E(() => { S.products[0].name = 'Renamed in tab 1'; save(); }); await p2.waitForTimeout(300);
  if ((await p2.evaluate(() => S.products[0].name)) !== 'Renamed in tab 1') {
    await p2.evaluate(() => { S.markets[0].name = 'Tab 2 edit'; save(); });
    const lost = await p.evaluate(() => JSON.parse(localStorage.getItem(STORE_KEY)).products[0].name !== 'Renamed in tab 1');
    note(lost ? 'HIGH' : 'MEDIUM', 'State', 'all', 'a second tab does not see changes from the first' + (lost ? ' and silently overwrites them on its next save (data loss)' : ''));
  }
  await p2.close();

  // ---- Error toasts
  const tk = await E(() => { toast('Cannot deactivate: test', 'err'); const t = [...document.querySelectorAll('#toasts .toast')].pop(); return t ? t.className : ''; });
  if (!/err|bad/.test(tk)) note('LOW', 'Visual', 'all', 'error toasts look identical to success toasts (green tick)');

  // ---- Extreme viewports
  for (const [w, h] of [[320, 640], [5000, 1200], [667, 375]]) {
    await p.setViewportSize({ width: w, height: h }); await W(150);
    const over = await E(() => { const out = []; for (const [r, o] of [['home'], ['modules'], ['module', { id: 'MOD-A-014' }], ['review', { id: 'MOD-B-007' }], ['assets'], ['assemble', { id: 'AST-105' }], ['reports'], ['roles'], ['settings'], ['audit'], ['workflow', { id: 'WF-STD' }], ['user-new'], ['module-new']]) { UI.modal = null; go(r, o || {}); const de = document.documentElement; if (de.scrollWidth > de.clientWidth + 1) out.push(r + ' +' + (de.scrollWidth - de.clientWidth)); } return out; });
    if (over.length) note('MEDIUM', 'Visual', over.join(', '), 'horizontal overflow at ' + w + 'x' + h);
    flushErr('viewport ' + w);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await E(() => go('modules')); await W(); await p.fill('#global-search', XSS).catch(() => {}); await W(200); flushErr('search');
  if (await E(() => window.__pwn)) note('CRITICAL', 'Input', 'search', 'script injection via search');
  console.log(JSON.stringify(F));
  console.log('\n' + F.length + ' findings'); await b.close();
})();
