const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const D = __dirname;
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  let navs = 0; p.on('framenavigated', f => { if (f === p.mainFrame()) navs++; });
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); navs = 0;
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150);
  const sub = async () => { await p.click('#content button[type=submit]'); await W(); };
  await p.fill('#login-email', 'ali.usama@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300);
  await E(() => go('module-new')); await W(300);
  await p.click('[data-act=d-type][data-v=TY-IMAGE]'); await sub();
  await p.setInputFiles('#d-file', D + '/upload.png'); await p.waitForFunction(() => UI.draft.media && UI.draft.media.fileId && !UI.draft.mediaBusy); await W(200);
  await p.fill('#d-title', 'Image — unsaved state check'); await p.fill('#d-body', 'Typed text that must survive.');
  const before = await E(() => { const f = document.querySelector('#content form'); f._k = 1; const img = document.querySelector('.media-stage img'); if (img) img._k = 1; return { file: UI.draft.media.fileId, sum: UI.draft.media.checksum }; });
  // Add new country, then Add new material/module type entities from the same form: modal over the form, back to it
  await sub(); // to the details step
  for (const [k, vals] of [['markets', { id: 'QA', name: 'Qatar' }], ['audiences', { name: 'Hospital pharmacists (test)' }], ['products', { name: 'Product Z', code: 'PZ', area: 'Oncology', indication: 'Solid tumours' }]]) {
    const btn = await p.$(`[data-act=cfg-quick][data-k=${k}]`); if (!btn) { ok(false, 'Add new ' + k + ' available'); continue; }
    await btn.click(); await W();
    ok(await E(() => UI.modal && UI.modal.type === 'cfg' && UI.route.name === 'module-new'), `Add new ${k}: modal over the form, no navigation`);
    for (const [f, v] of Object.entries(vals)) { const el = await p.$('#cf-' + f); if (el) await el.fill(v); }
    await p.click('[data-act=cfg-save]'); await W(250);
    if (await E(() => !!UI.modal)) console.log('modal still open:', await E(() => document.querySelector('.modal').innerText.slice(0, 400)));
    ok(await E(() => !UI.modal), `${k} saved and the modal closed`);
  }
  const after = await E(() => ({ file: UI.draft.media && UI.draft.media.fileId, sum: UI.draft.media && UI.draft.media.checksum, title: UI.draft.title, body: UI.draft.body, formKept: document.querySelector('#content form')._k === 1, qa: UI.draft.markets.includes('QA'), aud: aud(UI.draft.audience).name, pz: UI.draft.products.some(id => product(id).name === 'Product Z') }));
  ok(after.file === before.file && after.sum === before.sum, 'uploaded file kept (same file id and checksum)');
  ok(after.title === 'Image — unsaved state check' && after.body === 'Typed text that must survive.', 'typed entries kept');
  ok(after.qa && after.aud === 'Hospital pharmacists (test)' && after.pz, 'each new entity auto-selected (Qatar, Hospital pharmacists, Product Z)');
  ok(after.formKept, 'form DOM never re-mounted (no refresh)');
  ok(navs === 0, 'no browser navigation/reload happened (' + navs + ')');
  ok(await E(() => !sessionStorage.length && !Object.keys(localStorage).some(k => /draft/i.test(k))), 'unsaved draft not written to browser storage');
  // go back to the upload step: preview still there
  await E(() => { UI.draft.step = 1; render(); }); await W(200);
  ok(await p.isVisible('.media-stage img'), 'draft upload preview still shown on the upload step');
  ok(!errs.length, 'no page errors ' + errs.join('|'));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
