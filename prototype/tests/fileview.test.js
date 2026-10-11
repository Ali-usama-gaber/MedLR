const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true, acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); let downloads = 0; p.on('download', () => downloads++);
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.fill('#login-pass', 'x'); await p.click('button[type=submit]'); await p.waitForTimeout(300);
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150);
  ok(!(await E(() => document.documentElement.innerHTML.includes('Open PDF'))), 'no action is labelled “Open PDF”');
  // PDF
  await E(() => go('module', { id: 'MOD-C-010' })); await W(800);
  ok((await p.locator('[data-act=file-open]').count()) >= 1 && !(await p.$('.fp a[data-file-dl], .fp [data-act=file-dl]')), 'PDF preview opens on click; no Preview/Download buttons beside it');
  ok(await E(() => [...document.querySelectorAll('button, a')].every(b => !/^(Preview|Download)$/.test(b.textContent.trim()))), 'no standalone Preview/Download buttons on the module page');
  await p.locator('.fmenu-btn').first().click(); await W();
  ok(await p.isVisible('.fmenu-pop a[data-file-dl]') && await p.isVisible('.fmenu-pop [data-act=file-open]'), 'file actions menu offers Open in viewer and Download original');
  await p.keyboard.press('Escape'); await E(() => { UI.pop = null; render(); }); await W();
  await p.locator('[data-act=file-open]').first().click(); await W(300);
  ok(await p.isVisible('.modal .fv'), 'Preview opens the in-app viewer');
  try { await p.waitForSelector('.fv-pages img', { timeout: 90000 }); ok(true, 'PDF pages render inside the app'); } catch (e) { ok(await p.isVisible('.fv-frame'), 'PDF falls back to the in-app browser viewer'); }
  await p.click('[data-act=fv-zoom][data-v="1"]'); await W(); ok((await p.textContent('.fv-zoom .mono')).includes('125'), 'zoom in works in the document viewer');
  ok(downloads === 0, 'Preview did not download anything');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.click('.modal a[data-file-dl]')]);
  ok(!!dl && /\.pdf$/i.test(dl.suggestedFilename()), 'Download is explicit and saves the original (' + dl.suggestedFilename() + ')');
  await p.keyboard.press('Escape'); await W();
  // image
  downloads = 0; await E(() => go('module', { id: 'MOD-A-050' })); await W(500); await p.locator('[data-act=file-open]').first().click(); await W(300);
  ok(await p.isVisible('.fv-canvas img'), 'image preview opens'); await p.click('[data-act=fv-zoom][data-v="1"]'); await p.click('[data-act=fv-zoom][data-v="1"]'); await W();
  ok(await E(() => document.querySelector('.fv-canvas img').style.width === '150%'), 'image zooms to 150%'); await p.keyboard.press('Escape'); await W();
  // video
  await E(() => go('module', { id: 'MOD-B-020' })); await W(500); await p.locator('[data-act=file-open]').first().click(); await W(300);
  ok(await E(() => { const v = document.querySelector('.fv-video video'); return !!v && v.controls; }), 'video opens in an in-app player with controls'); await p.keyboard.press('Escape'); await W();
  // from the version history modal: Preview, then Close returns to the version
  await E(() => { go('module', { id: 'MOD-A-050', tab: 'versions' }); UI.modal = { type: 'version', kind: 'Module', id: 'MOD-A-050', v: '1' }; render(); }); await W(300);
  await p.locator('.modal [data-act=file-open]').first().click(); await W(); ok(await E(() => UI.modal.type === 'file'), 'Preview from version history');
  await p.click('.modal-foot [data-act=modal-close]'); await W(); ok(await E(() => UI.modal && UI.modal.type === 'version'), 'closing the viewer returns to the version history');
  ok(downloads === 0, 'no unexpected downloads across previews');
  ok(!errs.length, 'no page errors ' + errs.join('|')); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
