const { chromium } = require('playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const sopPick = async (k, v) => { await p.click(`[data-act=msel-open][data-id=sop-${k}]`); await p.waitForTimeout(80); await p.click(`.msel-opt[data-act=sop-toggle][data-k=${k}][data-v="${v}"]`); await p.waitForTimeout(80); await p.keyboard.press('Escape'); await p.waitForTimeout(80); };
  const submitBtn = async () => { if (await p.evaluate(() => /^module-(new|edit)$/.test(UI.route.name) && UI.draft && UI.draft.step === 3 && !UI.draft.workflow)) { await p.click('[data-act=msel-open][data-id=d-wf]'); await p.waitForTimeout(80); await p.click('.wfp-opt'); await p.waitForTimeout(80); } await p.click('button[type=submit]'); };
  const flt = async (k, v) => { await p.click('[data-act=flt-open]'); await p.waitForTimeout(60); const el = await p.$('#fd-' + k); if ((await el.evaluate(e => e.tagName)) === 'SELECT') await p.selectOption('#fd-' + k, v); else await p.fill('#fd-' + k, v); await p.click('[data-act=flt-apply]'); await p.waitForTimeout(80); };
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href);
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 120);
  const pick = async (id, vals) => { await p.click(`[data-msel=${id}] .msel-add`); await W(60); for (const v of vals) { await p.click(`[data-msel=${id}] .msel-opt[data-v="${v}"]`); await W(40); } await p.keyboard.press('Escape'); await W(80); };

  ok(await p.isVisible('#login-email'), 'login page shows');
  ok(!(await E(() => document.body.innerText)).match(/demo|prototype/i), 'no demo/prototype wording on login');
  await p.fill('#login-pass', 'secret'); await submitBtn(); await W(300);
  ok(await E(() => me().name === 'Ali Usama' && isAdmin(me())), 'signed in as Administrator');
  const body = await E(() => document.body.innerText); ok(!/junior|senior|demo/i.test(body), 'no Junior/Senior/Demo wording on home');
  // nav order
  const nav = await E(() => [...document.querySelectorAll('.nav-item span:first-of-type')].map(x => x.textContent));
  ok(nav.slice(0, 5).join('|') === 'Home|Modules|My Tasks|Assets|Approved Library', 'IA order: ' + nav.slice(0, 5).join(' › '));

  // ---- create module through the wizard
  await E(() => go('module-new')); await W();
  await p.click('[data-act=d-type][data-v="TY-CLAIM"]'); await submitBtn(); await W();
  await p.fill('#d-title', 'Clinical Claim — Test multi-product'); await p.fill('#d-body', 'Product A and Product B improved outcomes in the test study.'); await submitBtn(); await W();
  await pick('d-products', ['P-A', 'P-B']);
 
  await p.selectOption('#d-aud', 'AU-CARD');
  await pick('d-markets', ['SA', 'AE', 'KW']);
  await p.click('[data-act=d-toggle][data-k=channels][data-v="CH-EMAIL"]');
  await submitBtn(); await W();
  await p.selectOption('#d-addref', 'REF-A-03'); await W(); await submitBtn(); await W();
  ok(await p.isVisible('.sop-row.bad'), 'validation panel flags missing medical evidence before saving');
  await submitBtn(); await W(300);
  const id = await E(() => UI.route.p.id); ok(/^MOD-X-\d+$/.test(id), 'module created with multi-product id ' + id);
  ok(await E(id => modById(id).products.length === 2 && modById(id).markets.length === 3, id), 'module has 2 products and 3 countries');
  // ---- validation blocks submission
  await p.click('[data-act=submit-open]'); await W();
  ok(await p.isDisabled('[data-act=submit-confirm]'), 'submit blocked while an SOP fails');
  ok((await p.textContent('.modal')).includes('Medical evidence'), 'modal says exactly what to fix');
  await p.click('[data-act=modal-close]');
  // fix: add study reference via edit form
  await E(id => go('module-edit', { id }), id); await W();
  await E(() => wizShow(UI.draft, 3)); await p.selectOption('#d-addref', 'REF-A-01'); await W();
  await p.click('[data-act=wiz-save]'); await W(300);
  ok(await E(id => validationIssues(modById(id), 'Module').length === 0, id), 'validation passes after adding a study reference');
  ok(await E(id => S.audit.some(e => e.objId === id && e.action === 'Reference added'), id), 'audit: Reference added');
  await p.click('[data-act=submit-open]'); await W(); await p.click('[data-act=submit-confirm]'); await W();
  ok(await E(id => modById(id).review.step === 0 && modById(id).review.cycle === 1, id), 'submitted: cycle 1 at step 1');

  const decideUI = async (d, note) => { await E(id => go('review', { id }), id); await W(); await p.click(`[data-act=decide][data-d=${d}]`); await W(); if (note) await p.fill('#m-note', note); await p.click('[data-act=decide-confirm]'); await W(200); };
  const signUI = async () => { await E(id => go('review', { id }), id); await W(); await p.click('[data-act=sign]'); await W(); await p.click('label.choice'); await W(); await p.fill('#m-pass', 'secret'); await p.click('[data-act=sign-confirm]'); await W(200); };
  await decideUI('pass', 'Looks fine.'); await signUI(); await decideUI('pass'); // Legal member
  ok(await E(id => modById(id).review.step === 3, id), 'progressed to Legal Team Lead approval');
  // ---- amend & resubmit resumes at the same step
  await E(id => go('review', { id }), id); await W(); await p.click('[data-act=decide][data-d=amend]'); await W();
  ok((await p.textContent('.modal')).includes('resume approval from the current review step'), 'amend modal shows resume copy');
  await p.click('[data-act=decide-confirm]'); await W(); ok(await p.isVisible('.modal .err'), 'amend requires a note');
  await p.fill('#m-note', 'Qualify the claim with the study population.'); await p.click('[data-act=decide-confirm]'); await W(200);
  ok(await E(id => statusOf(modById(id)) === 'Amendment Requested' && modById(id).resume.step === 3, id), 'status Amendment Requested, resume at step 4');
  await E(id => go('module', { id }), id); await W(); await p.click('[data-act=resubmit-open]'); await W();
  await p.fill('#m-note', 'Added the study population.'); await p.click('[data-act=resubmit-confirm]'); await W(200);
  ok(await E(id => modById(id).review.step === 3 && modById(id).review.cycle === 1 && latest(modById(id)).v === 1, id), 'resubmission resumed at Legal Team Lead, same cycle, same version');
  await signUI(); await decideUI('pass');
  // ---- reject restarts the full cycle with a new version
  await E(id => go('review', { id }), id); await W(); await p.click('[data-act=decide][data-d=reject]'); await W();
  ok((await p.textContent('.modal')).includes('restart the approval cycle'), 'reject modal shows restart copy');
  await p.fill('#m-note', 'Comparative claim not supported.'); await p.click('[data-act=decide-confirm]'); await W(200);
  ok(await E(id => statusOf(modById(id)) === 'Rejected' && !modById(id).resume, id), 'status Rejected');
  await E(id => go('module', { id }), id); await W(); await p.click('[data-act=new-version]'); await W();
  await E(() => wizShow(UI.draft, 1)); await p.fill('#d-reason', 'Rewritten against the study endpoint.'); await p.fill('#d-body', 'In the test study, Product A and Product B improved the primary endpoint.'); await p.click('[data-act=wiz-save]'); await W(300);
  ok(await E(id => latest(modById(id)).v === 2 && statusOf(modById(id)) === 'Draft', id), 'version 2 created as Draft');
  await p.click('[data-act=submit-open]'); await W(); await p.click('[data-act=submit-confirm]'); await W();
  ok(await E(id => modById(id).review.step === 0 && latest(modById(id)).cycles.length === 1, id), 'v2 restarts the full cycle from step 1');
  await decideUI('pass'); await signUI(); await decideUI('pass'); await signUI(); await decideUI('pass'); await signUI();
  ok(await E(id => statusOf(modById(id)) === 'Approved', id), 'v2 approved after all six steps');
  ok(await p.isVisible('.success'), 'success dialog shown');
  await p.click('[data-act=success-go][data-to=cover]'); await W();
  const cover = await p.textContent('.letter'); ok(cover.includes('Product A, Product B') && cover.includes('Saudi Arabia, UAE, Kuwait') && cover.includes('Approval cycle'), 'cover letter lists products, countries, cycle');
  // version history
  await E(id => go('module', { id, tab: 'versions' }), id); await W();
  ok(await p.locator('table.tbl tbody tr').count() === 2, 'version history shows v1 and v2');
  await p.click('tbody tr:last-child [data-act=version-open]'); await W(); ok((await p.textContent('.modal')).includes('Rejected'), 'v1 approval history shows the rejected cycle'); await p.click('[data-act=modal-close]');
  // library filter
  await E(() => { UI.f = {}; go('library'); }); await W(); await flt('lprod', 'P-B'); await W();
  ok((await p.textContent('.lib-tbl')).includes(id), 'approved module appears in library filtered by Product B');
  // audit filters
  await E(() => go('audit')); await W(); await flt('uq', id); await W(); await flt('ucat', 'Approval'); await W();
  const at = await p.textContent('.audit-tbl'); ok(at.includes('Amendment requested') && at.includes('Rejected') && at.includes('Amended & resubmitted'), 'audit search + action filter shows the approval history');
  ok(await E(id => ['Module created', 'Version created', 'Content edited', 'Reference added', 'Review started', 'User assigned', 'Module approved'].every(a => S.audit.some(e => e.objId === id && e.action === a)), id), 'audit recorded created / version / edited / reference / review started / assigned / approved');
  // reports
  for (const t of ['perf', 'content', 'materials', 'workflow', 'usage']) { await E(t => go('reports', { tab: t }), t); await W(60); }
  await E(() => go('reports', { tab: 'perf' })); await flt('rstep', 'Legal'); await W(); ok((await p.textContent('.content')).includes('Legal'), 'reports filter by review step');
  // roles
  await E(() => go('roles')); await W(); await E(r => { UI.modal = { type: 'role', id: r }; render(); }, 'Content-Member'); await W(); await p.click('[data-act=perm-toggle][data-role="Content-Member"][data-perm=submit]'); await W(); await E(() => { UI.modal = null; render(); });
  ok(await E(() => S.roles['Content-Member'].includes('submit') && S.audit.some(e => e.action === 'Permission granted')), 'permission granted and audited');
  // SOP create
  await E(() => go('sops')); await W(); await p.click('[data-act=sop-new]'); await W(); await p.fill('#sop-name', 'Local disclaimer — Saudi Arabia'); await p.selectOption('#sop-rule', 'disclaimer'); await W(); await p.selectOption('#sop-app', 'Asset'); await W(); await sopPick('markets', 'SA'); await W(); await p.click('[data-act=sop-save]'); await W();
  ok(await E(() => S.sops.some(s => s.name === 'Local disclaimer — Saudi Arabia' && s.scope.markets.includes('SA'))), 'SOP created');
  // settings
  await E(() => go('settings', { tab: 'lifecycle' })); await W(); await p.fill('#st-expiryWarnDays', '60'); await W(400); await p.click('[data-act=set-save]'); await W();
  ok(await E(() => S.settings.expiryWarnDays === 60 && S.audit.some(e => e.action === 'Setting changed' && e.next === '60')), 'setting saved with prev/new audit');
  // asset SOP checks
  await E(() => go('assemble', { id: 'AST-105' })); await W(); await p.click('[data-act=asset-submit]'); await W();
  ok(await p.isDisabled('[data-act=asset-submit-confirm]'), 'asset submit blocked by SOPs (safety + disclaimer)'); const am = await p.textContent('.modal'); ok(am.includes('Safety Statement') && am.includes('disclaimer'), 'asset modal explains safety and disclaimer issues'); await p.click('[data-act=modal-close]');
  await p.click('[data-act=blk-add][data-module="MOD-X-001"]'); await W(); await p.fill('#ap-disc', 'For healthcare professionals in Kuwait only. Approved by MOH Kuwait.'); await p.press('#ap-disc', 'Tab'); await W();
  await p.click('[data-act=asset-submit]'); await W(); ok(!(await p.isDisabled('[data-act=asset-submit-confirm]')), 'asset passes after adding safety module and disclaimer');
  await p.click('[data-act=asset-submit-confirm]'); await W(); ok(await E(() => statusOf(assetById('AST-105')) === 'In Review'), 'asset submitted');
  ok(await E(() => S.audit.some(e => e.objId === 'AST-105' && e.action === 'Module reused') && S.audit.some(e => e.objId === 'AST-105' && e.action === 'Asset updated' && /disclaimer/i.test(e.note))), 'audit: module reused + asset updated');
  // users
  await E(() => go('user-new')); await W(); await p.fill('#u-name', 'Nour Hassan'); await p.fill('#u-email', 'nour.hassan@saja.com'); await submitBtn(); await W();
  await p.click('[data-act=u-fn][data-v=Legal]'); await p.click('[data-act=u-level][data-v=Lead]'); await submitBtn(); await W(); await submitBtn(); await W(); await submitBtn(); await W(300);
  ok(await E(() => S.users.some(u => u.name === 'Nour Hassan' && roleLabel(u) === 'Legal Lead')), 'user created as Legal Lead');
  await p.click('[data-act=user-status]'); await W(); ok(await E(() => S.users.find(u => u.name === 'Nour Hassan').status === 'Inactive'), 'user deactivated');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
})();
