// Forms, validation, search/filter/reset, pagination, typing preserved across background re-renders, sign-in/out.
const { chromium } = require('playwright');
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150);
  const signIn = async email => { await p.waitForSelector('#login-email'); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  // sign-in/out cycle with different people (regression: a background re-render used to wipe the typed email and password)
  for (const u of ['ali.usama', 'hana.zaki', 'sara.ahmed', 'ali.usama']) { await E(() => S.signedIn && ACT.logout()); await signIn(u + '@saja.com'); ok(await E(e => S.signedIn && me().email === e, u + '@saja.com'), `signs in as ${u} after the previous user signed out`); }
  await E(() => ACT.logout()); await p.fill('#login-email', 'nobody@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W();
  ok(await E(() => !S.signedIn && document.querySelector('#app').innerText.includes('No account uses that email address.')), 'unknown email is refused with a message');
  await p.fill('#login-email', 'dina.mostafa@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W();
  ok(await E(() => !S.signedIn), 'inactive user cannot sign in');
  await signIn('ali.usama@saja.com');
  // typing survives a background re-render; an app-driven change still updates the field
  await E(() => go('module-new')); await W(); await E(() => { ACT['d-type']({ dataset: { v: 'TY-CLAIM' } }); UI.draft.step = 1; render(); }); await W();
  await p.click('#d-title'); await p.keyboard.type('Typed before a background refresh', { delay: 5 });
  await E(() => { renderSoon(); render(); }); await W(400);
  ok((await p.inputValue('#d-title')) === 'Typed before a background refresh', 'typed text kept through background re-renders');
  await E(() => { UI.draft.title = 'Set by the app'; render(); }); ok((await p.inputValue('#d-title')) === 'Set by the app', 'a value changed by the app still shows');
  // required-field validation with visible messages
  await E(() => { UI.draft.title = ''; UI.draft.body = ''; render(); }); await p.fill('#d-title', ''); await p.fill('#d-body', ''); await p.click('#content button[type=submit]'); await W();
  ok(await E(() => UI.draft.step === 1 && document.querySelectorAll('#content .err, #content .invalid').length > 0), 'module form: empty name/content blocks Next with field errors');
  await E(() => go('user-new')); await W(); await p.click('#content button[type=submit]'); await W();
  ok(await E(() => document.querySelectorAll('#content .err, #content .invalid').length > 0), 'user form: required fields flagged');
  await E(() => go('products')); await W(); await p.click('[data-act=cfg-new]'); await W(); await p.click('[data-act=cfg-save]'); await W();
  ok(await E(() => !!UI.modal && document.querySelectorAll('.modal .err, .modal .invalid').length > 0), 'add product: required fields flagged, dialog stays open');
  await E(() => { UI.modal = null; go('assets'); }); await W(); await p.click('[data-act=asset-new]'); await W(); await p.click('[data-act=asset-create]'); await W();
  ok(await E(() => !!UI.modal && !!document.querySelector('.modal .err, .modal .invalid, .modal .banner')), 'create asset: missing name flagged');
  await E(() => { UI.modal = null; go('workflow-new'); }); await W(); await p.click('#content button[type=submit]'); await W();
  ok(await E(() => document.querySelectorAll('#content .err, #content .invalid').length > 0), 'new workflow: name required');
  // search, filter, reset
  await E(() => { UI.f = {}; go('modules'); }); const all = await E(() => S.modules.length);
  await E(() => { UI.f.mq = 'claim'; render(); }); const q = await E(() => +document.querySelector('#content').innerText.match(/(\d+) of (\d+)/)[1]);
  ok(q > 0 && q < all && q === await E(() => S.modules.filter(m => modText(m).includes('claim')).length), `search narrows the list (${q} of ${all})`);
  await E(() => { UI.f.mprod = 'P-A'; render(); }); const q2 = await E(() => +document.querySelector('#content').innerText.match(/(\d+) of (\d+)/)[1]);
  ok(q2 <= q && q2 === await E(() => S.modules.filter(m => modText(m).includes('claim') && m.products.includes('P-A')).length), `search + product filter combine (${q2})`);
  await p.click('.fchip button'); await W(); ok(await E(() => Object.values(UI.f).filter(Boolean).length === 1), 'removing one filter chip keeps the other');
  await E(() => { (FILTERS.modules || []).forEach(x => { UI.f[x.k] = ''; }); render(); }); ok(await E(n => +document.querySelector('#content').innerText.match(/(\d+) of (\d+)/)[1] === n, all), 'clearing filters restores the full list');
  await E(() => { UI.f.mq = 'zzzz-no-match'; render(); }); ok(await E(() => /0 of/.test(document.querySelector('#content').innerText) && !!document.querySelector('#content .empty')), 'no results shows an empty state'); await E(() => { UI.f = {}; });
  // filter dialog keeps edits until Apply; Cancel discards
  await E(() => go('audit')); await W(); await p.click('[data-act=flt-open]'); await W(); await p.selectOption('.modal select >> nth=0', { index: 1 }); await p.click('.modal [data-act=modal-close]'); await W();
  ok(await E(() => !Object.values(UI.f).some(Boolean)), 'filter dialog: Cancel discards the change');
  // pagination
  await E(() => { UI.f = {}; go('audit'); }); const pg = await E(() => ({ rows: document.querySelectorAll('#content table.tbl tbody tr:not([hidden])').length, total: S.audit.length, info: (document.querySelector('.pager .info') || {}).textContent }));
  ok(pg.rows === 10 && pg.info.includes('of ' + pg.total), `pagination shows 10 rows and the total (${pg.info})`);
  await p.click('.pager [data-act=pg]:not([disabled]) >> text=Next'); await W(); const pg2 = await E(() => ({ first: document.querySelector('#content table.tbl tbody tr:not([hidden])').textContent.slice(0, 40), info: document.querySelector('.pager .info').textContent }));
  ok(/11–20/.test(pg2.info), `Next moves to rows 11–20 (${pg2.info})`);
  ok(await E(() => { UI.f.ucat = 'Approval'; render(); const i = document.querySelector('.pager .info'); return !!i && /Showing 1–/.test(i.textContent); }), 'changing a filter returns to page 1'); await E(() => { UI.f = {}; });
  // modal keeps unsaved text when a nested "Add new" opens and closes
  await E(() => go('module-new')); await W(); await E(() => { ACT['d-type']({ dataset: { v: 'TY-CLAIM' } }); UI.draft.step = 2; render(); }); await W();
  await p.click('[data-act=cfg-quick][data-k=products]'); await W(); await p.fill('#cf-name', 'Half-typed product'); await p.click('.modal [data-act=modal-close]'); await W();
  ok(await E(() => UI.route.name === 'module-new' && UI.draft && UI.draft.step === 2 && !S.products.some(x => x.name === 'Half-typed product')), 'cancelling Add new returns to the form unchanged and saves nothing');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(`${n} checks`); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
