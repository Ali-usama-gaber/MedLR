const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto(require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href);
  await p.fill('#login-pass', 'x'); await p.click('button[type=submit]'); await p.waitForTimeout(300);
  const routes = [['home'], ['modules'], ['module', { id: 'MOD-A-014' }], ['module', { id: 'MOD-A-014', tab: 'approval' }], ['module', { id: 'MOD-A-014', tab: 'versions' }], ['module', { id: 'MOD-A-014', tab: 'lifecycle' }], ['module', { id: 'MOD-B-011' }], ['module', { id: 'MOD-C-003' }], ['module', { id: 'MOD-A-009' }], ['review', { id: 'MOD-A-018' }], ['approvals'], ['assets'], ['asset', { id: 'AST-101' }], ['asset', { id: 'AST-101', tab: 'versions' }], ['assemble', { id: 'AST-105' }], ['asset-review', { id: 'AST-106' }], ['library'], ['library', { tab: 'materials' }], ['lifecycle'], ['audit'], ['reports'], ['reports', { tab: 'content' }], ['reports', { tab: 'materials' }], ['reports', { tab: 'workflow' }], ['reports', { tab: 'usage' }], ['users'], ['user', { id: 'u-sara' }], ['user-new'], ['user-edit', { id: 'u-sara' }], ['roles'], ['functions'], ['teams'], ['products'], ['markets'], ['moduletypes'], ['materials'], ['channels'], ['audiences'], ['references'], ['item', { k: 'products', id: 'P-A' }], ['item', { k: 'markets', id: 'KW' }], ['item', { k: 'moduletypes', id: 'TY-SAFETY' }], ['item', { k: 'materials', id: 'MT-1' }], ['item', { k: 'channels', id: 'CH-EMAIL' }], ['item', { k: 'audiences', id: 'AU-CARD' }], ['item', { k: 'references', id: 'REF-A-01' }], ['item', { k: 'teams', id: 'T-MED' }], ['item', { k: 'functions', id: 'Medical' }], ['sops'], ['settings'], ['workflows'], ['workflow', { id: 'WF-STD' }], ['workflow-new'], ['module-new'], ['module-edit', { id: 'MOD-B-011' }], ['cover', { id: 'MOD-A-014', k: 'Module', v: '1' }], ['cover', { id: 'AST-101', k: 'Asset', v: '1' }]];
  for (const [r, o] of routes) {
    await p.evaluate(([r, o]) => go(r, o || {}), [r, o]); await p.waitForTimeout(40);
    const t = await p.evaluate(() => { const h = document.querySelector('.page-head h1, .home-head h1, .empty h4'); return (h || {}).textContent || '(none)'; });
    const bad = await p.evaluate(() => { const t = document.querySelector('#content').innerText; const m = t.match(/undefined|\[object Object\]|NaN|\b(TY|CH|AU|MT)-[A-Z0-9]+/g); return m ? m.slice(0,4).join(',') : ''; });
    if (bad || /not found|access/i.test(t)) console.log('CHECK', r, JSON.stringify(o || {}), '→', t, bad);
  }
  console.log(errs.length ? errs.join('\n') : 'NO PAGE ERRORS'); await b.close();
})();
