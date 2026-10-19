const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 200); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W(300));
  const login = async email => { await E(() => ACT.logout()); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  const navs = () => E(() => [...document.querySelectorAll('.side .nav-item')].map(b => b.title));
  await login('ali.usama@saja.com');
  let n = await navs();
  ok(n.includes('Reference Data') && n.includes('People & Teams') && !n.includes('Users') && !n.includes('References'), 'admin sidebar: Reference Data + People & Teams (no separate Users), References folded in (' + n.join(', ') + ')');
  ok(n.length <= 15, 'sidebar not overcrowded (' + n.length + ' items)');
  await G('settings');
  const tabs = await E(() => [...document.querySelectorAll('.set-tab')].map(b => b.textContent.trim()));
  ok(!tabs.some(t => /Products|Countries|Teams|Functions|References|Channels|Audiences/.test(t)), 'Settings keeps only preferences (' + tabs.join(', ') + ')');
  await p.click('.side .nav-item[title="Reference Data"]'); await W(300);
  const rows = await E(() => [...document.querySelectorAll('.hub-tbl tbody tr')].map(r => [r.querySelector('b').textContent, +r.cells[1].textContent]));
  const real = await E(() => ({ Products: S.products.length, Countries: S.markets.length, 'Module Types': S.moduleTypes.length, 'Material Types': S.materialTypes.length, Channels: S.channels.length, Audiences: S.audiences.length, References: S.references.length, 'Reference Kinds': S.refKinds.length }));
  ok(rows.length === 8 && rows.every(([k, v]) => real[k] === v), 'overview counts computed from records ' + JSON.stringify(rows));
  // counts update live after adding a product
  await p.click('.set-tab:has-text("Products")'); await W(300);
  ok(await E(() => UI.route.name === 'products' && !!document.querySelector('.crumbs')), 'Products opens inside Reference Data with breadcrumbs');
  const before = await E(() => S.products.length);
  await p.click('[data-act=cfg-new]'); await W(300);
  await E(() => { const f = document.querySelectorAll('.modal input.input, .modal textarea, .drawer input.input'); return f.length; });
  await p.fill('.modal input.input >> nth=0', 'Zylotrex'); await p.fill('.modal input.input >> nth=1', 'ZX').catch(() => {});
  await E(() => { document.querySelectorAll('.modal input.input').forEach(i => { if (!i.value) { i.value = 'X test'; i.dispatchEvent(new Event('input', { bubbles: true })); } }); }); await W();
  await p.click('.modal [data-act=cfg-save]').catch(() => {}); await W(300);
  const after = await E(() => S.products.length);
  ok(after === before + 1, 'product created from Reference Data (' + before + '→' + after + ')');
  ok((await p.textContent('.set-tab:has-text("Products") .n')).trim() === String(after), 'side count updates from the data');
  // item page breadcrumb back to hub
  await G('item', { k: 'teams', id: 'T-MED' });
  const cr = await E(() => [...document.querySelectorAll('.crumbs button, .crumbs .cur')].map(x => x.textContent.trim()));
  ok(cr[0] === 'People & Teams' && cr[1] === 'Teams', 'team detail breadcrumbs: ' + cr.join(' › '));
  ok(await E(() => document.querySelector('.side .nav-item.active').title === 'People & Teams'), 'People & Teams highlighted in the sidebar on a team page');
  ok(await E(() => S.teams.every(t => t.active)), 'seeded teams are active');
  // content member: only References in Reference Data, no Organisation
  await login('hana.zaki@saja.com'); n = await navs();
  ok(!n.includes('People & Teams') && !n.includes('Settings'), 'content member has no People & Teams/Settings');
  if (n.includes('Reference Data')) { await G('refdata'); const t2 = await E(() => [...document.querySelectorAll('.set-tab')].map(b => b.textContent.trim())); ok(t2.length === 2 && /References/.test(t2[1]), 'content member sees only References (' + t2.join(', ') + ')'); ok(!(await p.$('[data-act=cfg-new]')), 'and cannot add'); }
  await G('products'); ok(await E(() => !document.querySelector('.hub-tbl') && !document.querySelector('[data-act=cfg-new]')), 'content member is blocked from Products');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
