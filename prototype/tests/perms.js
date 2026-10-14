const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href);
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 120); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W());
  const login = async email => { await E(() => ACT.logout()); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(250); };
  const blocked = async r => { await G(r); return (await p.textContent('#content')).includes('do not have access'); };
  // Medical Team Member
  await login('ahmed.ali@saja.com');
  for (const r of ['users', 'roles', 'settings', 'products', 'sops', 'workflows', 'reports', 'module-new']) ok(await blocked(r), 'Medical Team Member blocked from ' + r);
  ok(!(await blocked('audit')), 'Medical Team Member can open the audit trail (View audit trail granted)');
  await G('module', { id: 'MOD-B-015' }); ok(!(await p.$('[data-act=submit-open]')) && !(await p.$('[data-go=module-edit]')), 'no edit or submit on modules for a reviewer');
  await G('review', { id: 'MOD-B-007' }); ok(await p.isVisible('[data-act=decide][data-d=pass]') && !(await p.$('[data-act=sign]')), 'Medical Team Member can complete the Medical review step, cannot sign');
  await G('review', { id: 'MOD-A-018' }); ok(!(await p.$('[data-act=decide]')), 'cannot act on the Medical Team Lead step');
  // Medical Team Lead + permission changes
  await login('sara.ahmed@saja.com'); await G('review', { id: 'MOD-A-018' }); ok(await p.isVisible('[data-act=sign]') && await p.isVisible('[data-act=decide][data-d=reject]'), 'Medical Team Lead can approve and reject');
  await login('ali.usama@saja.com'); await G('roles'); await E(r => { UI.modal = { type: 'role', id: r }; render(); }, 'Medical-Lead'); await W(); await p.click('[data-act=perm-toggle][data-role="Medical-Lead"][data-perm=reject]'); await W(); await E(() => { UI.modal = null; render(); }); await E(r => { UI.modal = { type: 'role', id: r }; render(); }, 'Medical-Lead'); await W(); await p.click('[data-act=perm-toggle][data-role="Medical-Lead"][data-perm=approve]'); await W(); await E(() => { UI.modal = null; render(); });
  await login('sara.ahmed@saja.com'); await G('review', { id: 'MOD-A-018' }); ok(!(await p.$('[data-act=decide][data-d=reject]')), 'revoking Reject removes the Reject button');
  ok(!(await p.$('[data-act=sign]')) && await E(() => !canActOn(me(), modById('MOD-A-018'))), 'revoking Approve (intermediate step) removes the right to sign step 2 of 6');
  // view permission
  await login('ali.usama@saja.com'); await G('roles'); await E(() => { S.roles['Marketing-Member'] = S.roles['Marketing-Member'].filter(x => !['page_modules', 'page_library'].includes(x)); save(); });
  await login('youssef.amin@saja.com'); ok(await blocked('modules') && await blocked('library'), 'revoking page access blocks Modules and the Library');
  const nav = await E(() => [...document.querySelectorAll('.nav-item')].map(x => x.textContent.trim()).join('|')); ok(!nav.includes('Modules'), 'nav hides what the role cannot open');
  // library management permission
  await login('layla.nasser@saja.com'); await G('module', { id: 'MOD-A-021' }); ok(await p.isVisible('[data-act=mod-archive]'), 'Regulatory Team Lead (Manage library) can withdraw content');
  await p.click('[data-act=mod-archive]'); await W(); await G('library'); ok(!(await p.textContent('#content')).includes('A steadier course'), 'withdrawn module leaves the library');
  ok(await E(() => S.audit.some(e => e.action === 'Module archived' && e.user === 'u-layla')), 'audit: Module archived by Layla');
  await login('omar.khalil@saja.com'); await G('module', { id: 'MOD-A-014' }); ok(!(await p.$('[data-act=mod-archive]')), 'Content Team Lead cannot withdraw content');
  // inactive user cannot sign in
  await E(() => ACT.logout()); await W(); await p.fill('#login-email', 'dina.mostafa@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W();
  ok((await p.textContent('body')).includes('inactive'), 'inactive user cannot sign in');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
