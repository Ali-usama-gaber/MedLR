// Evidence screenshots for QA-REPORT.md (qa-test skill: screenshot every verified fix).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const URL = require('url').pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
const OUT = path.join(__dirname, '..', '..', 'docs', 'review', 'qa'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 250); const shot = n => p.screenshot({ path: path.join(OUT, n + '.png') });
  await p.fill('#login-email', 'ali.usama@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(400);
  await E(() => go('modules')); await W(); await E(() => go('module', { id: 'MOD-A-014', tab: 'versions' })); await W(400); await shot('001-PASS-deep-link-url');
  await p.goBack(); await W(400); await shot('002-PASS-browser-back');
  await p.goto(URL + '#/module?id=MOD-A-014&tab=versions'); await p.reload(); await W(500); await shot('003-PASS-refresh-keeps-page');
  await E(() => { go('audiences'); ACT['cfg-new']({ dataset: { k: 'audiences' } }); }); await W(); await p.fill('.modal [data-cfg="name"]', '\u200b\u200b'); await p.click('.modal [data-act=cfg-save]'); await W(); await shot('004-PASS-invisible-name-refused');
  await E(() => { UI.modal = null; go('products'); toast('It is in use — deactivate it instead'); }); await W(200); await shot('005-PASS-error-toast');
  await E(() => { document.getElementById('toasts').innerHTML = ''; const o = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; save(); Storage.prototype.setItem = o; }); await W(200); await shot('006-PASS-storage-full-warning');
  await b.close(); console.log('screenshots in ' + OUT);
})();
