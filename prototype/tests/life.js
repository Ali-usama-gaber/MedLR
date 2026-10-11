const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const sopPick = async (k, v) => { await p.click(`[data-act=msel-open][data-id=sop-${k}]`); await p.waitForTimeout(80); await p.click(`.msel-opt[data-act=sop-toggle][data-k=${k}][data-v="${v}"]`); await p.waitForTimeout(80); await p.keyboard.press('Escape'); await p.waitForTimeout(80); };
  const submitBtn = async () => { if (await p.evaluate(() => /^module-(new|edit)$/.test(UI.route.name) && UI.draft && UI.draft.step === 3 && !UI.draft.workflow)) { await p.click('[data-act=msel-open][data-id=d-wf]'); await p.waitForTimeout(80); await p.click('.wfp-opt'); await p.waitForTimeout(80); } await p.click('button[type=submit]'); };
  const flt = async (k, v) => { await p.click('[data-act=flt-open]'); await p.waitForTimeout(60); const el = await p.$('#fd-' + k); if ((await el.evaluate(e => e.tagName)) === 'SELECT') await p.selectOption('#fd-' + k, v); else await p.fill('#fd-' + k, v); await p.click('[data-act=flt-apply]'); await p.waitForTimeout(80); };
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html');
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 120);
  const pick = async (id, vals) => { await p.click(`[data-msel=${id}] .msel-add`); await W(60); for (const v of vals) { await p.click(`[data-msel=${id}] .msel-opt[data-v="${v}"]`); await W(40); } await p.keyboard.press('Escape'); await W(80); };
 const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W());
  const login = async email => { await E(() => { S.signedIn = false; save(); go('login'); }); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await submitBtn(); await W(250); };
  const cfgAdd = async (k, vals, bools) => { await G(k); await p.click(`[data-act=cfg-new][data-k=${k}]`); await W(); for (const [f, v] of Object.entries(vals)) { const el = await p.$('#cf-' + f); if ((await el.evaluate(e => e.tagName)) === 'SELECT') await p.selectOption('#cf-' + f, v); else await p.fill('#cf-' + f, v); } for (const f of bools || []) { await p.click(`[data-act=cfg-bool][data-f=${f}]`); await W(); } await p.click('[data-act=cfg-save]'); await W(); };
  const idOf = (coll, key, val) => E(([c, k, v]) => (S[c].find(x => x[k] === v) || {}).id, [coll, key, val]);
  // ===== Admin configures the system
  await login('ali.usama@saja.com'); ok(await E(() => isAdmin(me())), 'admin signed in');
  await cfgAdd('products', { name: 'Product D', area: 'Oncology', code: 'PD', indication: 'Breast cancer' }); const PD = await idOf('products', 'name', 'Product D'); ok(await E(pd => productInds(pd).length === 1 && productInds(pd)[0].name === 'Breast cancer', PD), 'product has one indication record'); const PD_ = await idOf('products', 'name', 'Product D'); ok(!!PD, 'product created: ' + PD);
  await cfgAdd('markets', { name: 'Qatar', id: 'qa', authority: 'MOPH Qatar', lang: 'Arabic, English' }); ok(await E(() => S.markets.some(m => m.id === 'QA')), 'country created (code normalised to QA)');
  await cfgAdd('channels', { name: 'Congress' }); const CH = await idOf('channels', 'name', 'Congress'); ok(!!CH, 'channel created');
  await cfgAdd('audiences', { name: 'HCP – Oncologists' }); const AU = await idOf('audiences', 'name', 'HCP – Oncologists'); ok(!!AU, 'audience created');
  await cfgAdd('materials', { name: 'Congress Poster', channel: CH, workflow: 'WF-ASSET-FULL' }); const MT = await idOf('materialTypes', 'name', 'Congress Poster'); ok(!!MT, 'material type created');
  await cfgAdd('moduletypes', { name: 'Oncology Safety Statement', desc: 'Safety information for oncology products', icon: 'shield', tone: 'safety' }, ['safety']); const TS = await idOf('moduleTypes', 'name', 'Oncology Safety Statement'); ok(await E(t => mtype(t).safety, TS), 'module type created and flagged as safety statement');
  await cfgAdd('teams', { name: 'Medical Affairs — Oncology', fn: 'Medical' }); const TM = await idOf('teams', 'name', 'Medical Affairs — Oncology'); ok(!!TM, 'team created');
  await cfgAdd('references', { title: 'ONCO-1 study — primary results', source: 'Clinical study report CSR-ONCO-1, 2026', kind: 'study' }); const RF = await idOf('references', 'title', 'ONCO-1 study — primary results'); ok(!!RF, 'reference registered in library');
  // users through the wizard
  const mkUser = async (name, email, fn, level, team) => { await G('user-new'); await p.fill('#u-name', name); await p.fill('#u-email', email); await submitBtn(); await W(); await p.click(`[data-act=u-fn][data-v="${fn}"]`); await W(); if (level) { await p.click(`[data-act=u-level][data-v=${level}]`); await W(); } await submitBtn(); await W(); await p.selectOption('#u-team', team); await W(); await submitBtn(); await W(); await submitBtn(); await W(250); return E(e => (S.users.find(u => u.email === e) || {}).id, email); };
  const NADIA = await mkUser('Nadia Farouk', 'nadia.farouk@saja.com', 'Content', 'Lead', 'T-CON'); ok(await E(id => roleLabel(user(id)) === 'Content Lead', NADIA), 'user created: Content Team Lead');
  const KHALED = await mkUser('Khaled Omar', 'khaled.omar@saja.com', 'Medical', 'Lead', TM); ok(await E(([id, t]) => user(id).team === t, [KHALED, TM]), 'user created: Medical Team Lead in the Oncology team');
  // roles & permissions take effect
  await G('roles'); await E(r => { UI.modal = { type: 'role', id: r }; render(); }, 'Content-Lead'); await W(); await p.click('[data-act=perm-toggle][data-role="Content-Lead"][data-perm=submit]'); await W(); await E(() => { UI.modal = null; render(); });
  ok(await E(id => !canSubmit(user(id)), NADIA), 'revoking Submit from Content Team Lead takes effect');
  await E(r => { UI.modal = { type: 'role', id: r }; render(); }, 'Content-Lead'); await W(); await p.click('[data-act=perm-toggle][data-role="Content-Lead"][data-perm=submit]'); await W(); await E(() => { UI.modal = null; render(); }); ok(await E(id => canSubmit(user(id)), NADIA), 'granting Submit back takes effect');
  // workflow through the wizard, Medical Lead step limited to the Oncology team
  await G('workflow-new'); await p.fill('#w-name', 'Oncology — Standard'); await submitBtn(); await W();
  await p.click('[data-act=nwf-tpl][data-v=std]'); await W();
  await p.selectOption('select[data-nwf=team][data-i="1"]', TM); await W();
  await p.click('[data-act=nwf-del][data-i="2"]'); await W(); // drop Legal Member review
  await p.click('[data-act=nwf-del][data-i="3"]'); await W(); // drop Regulatory Member review
  await submitBtn(); await W(); await submitBtn(); await W(250);
  const WF = await E(() => (S.workflows.find(w => w.name === 'Oncology — Standard') || {}).id);
  ok(await E(id => { const w = wfById(id); return w.appliesTo === 'Module' && w.steps.length === 4 && w.steps[1].team && w.steps.map(s => s.fn + s.level).join() === 'MedicalMember,MedicalLead,LegalLead,RegulatoryLead'; }, WF), 'workflow created: Medical Member → Medical Lead (Oncology team) → Legal Lead → Regulatory Lead');
  // SOP scoped to Product D + Qatar + Clinical Claim
  await G('sops'); await p.click('[data-act=sop-new]'); await W(); await p.fill('#sop-name', 'Product D — Qatar clinical claims'); await p.selectOption('#sop-rule', 'review_window'); await W(); await p.fill('#sop-m', '6');
  await sopPick('types', 'TY-CLAIM'); await W(); await sopPick('products', PD); await W(); await sopPick('markets', 'QA'); await W();
  await p.fill('#sop-name', 'Product D — Qatar clinical claims'); await p.click('[data-act=sop-save]'); await W();
  ok(await E(() => S.sops.some(s => s.name === 'Product D — Qatar clinical claims' && s.months === 6 && s.scope.markets[0] === 'QA')), 'SOP created with product, country and type scope');
  // ===== Content Team Lead creates the module
  await login('nadia.farouk@saja.com'); ok(await E(() => me().name === 'Nadia Farouk'), 'signed in as Nadia (Content Team Lead)');
  const nav = await E(() => [...document.querySelectorAll('.nav-item')].map(x => x.textContent.trim()).join('|')); ok(!/Users|Roles|Settings|Products/.test(nav), 'no administration in her navigation');
  await G('users'); ok((await p.textContent('#content')).includes('do not have access'), 'users page is blocked for her role');
  await G('module-new'); await p.$eval('[data-act=d-type][data-v=TY-CLAIM]', e => e.scrollIntoView({ block: 'center' })); await p.click('[data-act=d-type][data-v=TY-CLAIM]'); await submitBtn(); await W();
  await p.fill('#d-title', 'Clinical Claim D — Progression-free survival'); await p.fill('#d-body', 'In ONCO-1, Product D extended progression-free survival versus standard therapy.¹');
  ok(!(await p.$('select#d-owner')), 'owner fixed to herself (no owner picker without user management)'); await submitBtn(); await W();
  await p.click('[data-msel=d-products] .msel-add'); await W(); ok(await p.isVisible(`.msel-opt[data-v="${PD}"]`), 'new product offered in the module form'); await p.keyboard.press('Escape'); await W(); await pick('d-products', [PD]); ok(await E(() => UI.draft.indications.length === 1), 'indication taken from the product'); await p.selectOption('#d-aud', AU);
  await pick('d-markets', ['QA', 'SA']); await p.click(`[data-act=d-toggle][data-k=channels][data-v="${CH}"]`); await p.click('[data-act=d-toggle][data-k=channels][data-v="CH-PRINT"]');
  await submitBtn(); await W(); await p.selectOption('#d-addref', RF); await W(); await submitBtn(); await W(); await submitBtn(); await W(300);
  const MID = await E(() => UI.route.p.id); ok(/^MOD-D-\d+$/.test(MID), 'module created ' + MID);
  ok(await E(([id, me_]) => modById(id).owner === me_ && S.audit.some(e => e.objId === id && e.action === 'Module created' && e.user === me_), [MID, NADIA]), 'module owned by Nadia and audit names her');
  await p.click('[data-act=submit-open]'); await W(); const sm = await p.textContent('.modal');
  ok(await p.isDisabled('[data-act=submit-confirm]') && sm.includes('Product D — Qatar clinical claims') && sm.includes('6 months'), 'the new SOP triggers for the matching module and blocks submission');
  await p.click('[data-act=modal-close]'); await G('module-edit', { id: MID }); await E(() => wizShow(UI.draft, 3)); await p.fill('#d-rev', await E(() => toISO(Date.now() + 150 * DAY))); await p.dispatchEvent('#d-rev', 'change'); await W(); await p.click('[data-act=wiz-save]'); await W(300);
  ok(await E(id => !validationIssues(modById(id), 'Module').length, MID), 'after fixing the review date validation passes');
  await p.click('[data-act=submit-open]'); await W(); await p.click(`[data-act=submit-wf][data-v="${WF}"]`); await W(); await p.click('[data-act=submit-confirm]'); await W();
  ok(await E(([id, wf]) => modById(id).review && modById(id).review.wf === wf, [MID, WF]), 'submitted into the Oncology workflow');
  // ===== reviewers act as themselves
  const act = async (email, d, note) => { await login(email); await G('review', { id: MID }); if (d === 'sign') { await p.click('[data-act=sign]'); await W(); await p.click('label.choice'); await W(); await p.fill('#m-pass', 'pw'); await p.click('[data-act=sign-confirm]'); await W(200); return; } await p.click(`[data-act=decide][data-d=${d}]`); await W(); if (note) await p.fill('#m-note', note); await p.click('[data-act=decide-confirm]'); await W(200); };
  await act('ahmed.ali@saja.com', 'pass', 'Checked against ONCO-1.');
  await login('sara.ahmed@saja.com'); ok(await E(id => !canActOn(me(), modById(id)), MID), 'Sara (Medical Lead, other team) cannot act on the Oncology-team step');
  await act('khaled.omar@saja.com', 'amend', 'State the median PFS values.');
  ok(await E(id => statusOf(modById(id)) === 'Amendment Requested' && modById(id).resume.step === 1, MID), 'amendment requested at the Medical Team Lead step');
  await login('nadia.farouk@saja.com'); await G('module-edit', { id: MID }); await p.fill('#d-body', 'In ONCO-1, Product D extended median progression-free survival to 11.2 vs 7.4 months.¹'); await p.fill('#d-reason', 'Added the median PFS values.'); await p.click('[data-act=wiz-save]'); await W(300);
  await p.click('[data-act=resubmit-open]'); await W(); await p.click('[data-act=resubmit-confirm]'); await W();
  ok(await E(id => modById(id).review.step === 1 && modById(id).review.cycle === 1, MID), 'resubmitted: resumes at the Medical Team Lead step in the same cycle');
  await act('khaled.omar@saja.com', 'sign'); await act('rania.haddad@saja.com', 'sign'); await act('layla.nasser@saja.com', 'sign');
  ok(await E(id => statusOf(modById(id)) === 'Approved' && live(modById(id)).v === 1, MID), 'v1 approved');
  const apr = await E(id => latest(modById(id)).cycles[0].decisions.filter(x => ['Reviewed', 'Approved'].includes(x.decision)).map(x => user(x.by).name + '|' + x.role).join(';'), MID);
  ok(apr === 'Ahmed Ali|Medical Member;Khaled Omar|Medical Lead;Rania Haddad|Legal Lead;Layla Nasser|Regulatory Lead', 'approval records hold the real reviewers and roles');
  // ===== v2 changes scope, then rejected; v3 restarts full cycle
  await login('nadia.farouk@saja.com'); await G('module', { id: MID }); await p.click('[data-act=new-version]'); await W();
  await p.fill('#d-reason', 'Extend to UAE.'); await p.click('[data-act=wiz-go][data-i="2"]'); await W(); await pick('d-markets', ['AE']); await p.click('[data-act=wiz-save]'); await W(300);
  ok(await E(id => !liveMeta(modById(id)).markets.includes('AE') && modById(id).markets.includes('AE'), MID), 'while v2 is a draft the library keeps v1’s approved countries');
  await p.click('[data-act=submit-open]'); await W(); await p.click(`[data-act=submit-wf][data-v="${WF}"]`); await W(); await p.click('[data-act=submit-confirm]'); await W();
  await act('ahmed.ali@saja.com', 'pass'); await act('khaled.omar@saja.com', 'reject', 'UAE label not yet approved.');
  ok(await E(id => statusOf(modById(id)) === 'Rejected' && live(modById(id)).v === 1, MID), 'v2 rejected; v1 stays live');
  await login('nadia.farouk@saja.com'); await G('module', { id: MID }); await p.click('[data-act=new-version]'); await W(); await p.fill('#d-reason', 'Resubmitting after UAE label approval.'); await p.click('[data-act=wiz-save]'); await W(300);
  await p.click('[data-act=submit-open]'); await W(); await p.click(`[data-act=submit-wf][data-v="${WF}"]`); await W(); await p.click('[data-act=submit-confirm]'); await W();
  ok(await E(id => modById(id).review.step === 0 && latest(modById(id)).v === 3, MID), 'v3 starts a full cycle at step 1');
  await act('ahmed.ali@saja.com', 'pass'); await act('khaled.omar@saja.com', 'sign'); await act('rania.haddad@saja.com', 'sign'); await act('layla.nasser@saja.com', 'sign');
  ok(await E(id => modById(id).versions.map(v => v.v + v.status).join() === '1Superseded,2Rejected,3Approved', MID), 'version history: v1 Superseded, v2 Rejected, v3 Approved');
  ok(await E(id => liveMeta(modById(id)).markets.includes('AE') && [...verOf(modById(id), 1).meta.markets].sort().join() === 'QA,SA', MID), 'v3 scope live; v1 snapshot keeps its own countries');
  // ===== safety module for Product D through the low-risk workflow
  await login('nadia.farouk@saja.com'); await G('module-new'); await p.click(`[data-act=d-type][data-v="${TS}"]`); await submitBtn(); await W();
  await p.fill('#d-title', 'Safety — Product D'); await p.fill('#d-body', 'Product D may cause neutropenia. Monitor blood counts before each cycle.'); await submitBtn(); await W();
  await pick('d-products', [PD]); ok(await E(() => UI.draft.indications.length === 1), 'indication taken from the product'); await p.selectOption('#d-aud', AU);
  await pick('d-markets', ['QA']); await p.click('[data-act=d-toggle][data-k=channels][data-v="CH-PRINT"]'); await submitBtn(); await W(); await submitBtn(); await W(); await submitBtn(); await W(300);
  const SID = await E(() => UI.route.p.id); await p.click('[data-act=submit-open]'); await W(); await p.click('[data-act=submit-wf][data-v=WF-LOW]'); await W(); await p.click('[data-act=submit-confirm]'); await W();
  const actOn = async (email, id) => { await login(email); await G('review', { id }); await p.click('[data-act=sign]'); await W(); await p.click('label.choice'); await W(); await p.fill('#m-pass', 'pw'); await p.click('[data-act=sign-confirm]'); await W(200); };
  await actOn('sara.ahmed@saja.com', SID); await actOn('layla.nasser@saja.com', SID); ok(await E(id => statusOf(modById(id)) === 'Approved', SID), 'safety module approved through Low-risk workflow');
  // ===== library
  await login('karim.fawzi@saja.com'); await E(() => { UI.f = {}; }); await G('library'); await flt('lprod', PD); await W(); await flt('lmkt', 'QA'); await W();
  const lib = await p.textContent('.lib-tbl'); ok(lib.includes('Progression-free') && lib.includes('Safety — Product D'), 'both approved Product D modules in the library (filtered by product + Qatar)');
  // ===== asset assembly by Marketing Team Lead
  await G('assets'); await p.click('[data-act=asset-new]'); await W(); await p.selectOption('#an-type', MT); await W(); await p.fill('#an-name', 'Congress Poster — ONCO-1');
  await pick('an-products', [PD]); await pick('an-markets', ['QA']); await p.selectOption('#an-ch', 'CH-PRINT'); await W(); await p.selectOption('#an-aud', AU); await W(); await p.click('[data-act=asset-create]'); await W(300);
  const AID = await E(() => UI.route.p.id); ok(/^AST-/.test(AID), 'asset created ' + AID);
  await p.click(`[data-act=blk-add][data-module="${MID}"]`); await W(); await p.click('[data-act=asset-submit]'); await W();
  ok(await p.isDisabled('[data-act=asset-submit-confirm]') && (await p.textContent('.modal')).includes('Oncology Safety Statement'), 'safety SOP names the configured safety module type'); await p.click('[data-act=modal-close]');
  await p.click(`[data-act=blk-add][data-module="${SID}"]`); await W(); await p.click('[data-act=new-text]'); await W(); await p.fill('#nt-text', 'Visit booth 12 at the regional oncology congress.'); await p.click('[data-act=new-text-confirm]'); await W();
  ok(await E(id => assetWorkflow(assetById(id)) === mat(assetById(id).type).workflow, AID), 'new text routes through the Material Type’s workflow');
  await p.click('[data-act=asset-submit]'); await W(); await p.click('[data-act=asset-submit-confirm]'); await W();
  const actA = async email => { await login(email); await G('asset-review', { id: AID }); await p.click('[data-act=sign]'); await W(); await p.click('label.choice'); await W(); await p.fill('#m-pass', 'pw'); await p.click('[data-act=sign-confirm]'); await W(200); };
  await actA('sara.ahmed@saja.com'); await actA('layla.nasser@saja.com'); ok(await E(id => statusOf(assetById(id)) === 'Approved', AID), 'asset approved');
  // ===== admin: reports, audit, cover, renames, deactivation
  await login('ali.usama@saja.com');
  ok(await E(([id, pd]) => { const c = allCycles().filter(c => c.products.includes(pd)); return c.length === 5 && c.filter(x => x.outcome === 'Rejected').length === 1 && c.reduce((n, x) => n + (x.amendments || 0), 0) === 1; }, [MID, PD]), 'reports data: 5 Product D cycles incl. 1 rejection and 1 amendment');
  await E(() => { UI.f = {}; }); await G('reports', { tab: 'workflow' }); await flt('rprod', PD); await W(); const rw = await p.textContent('#content'); ok(rw.includes('Oncology — Standard') && rw.includes('33%'), 'workflow report shows the Oncology workflow and its 33% rejection rate');
  await G('reports', { tab: 'workflow' }); ok((await p.textContent('#content')).includes('Nadia Farouk'), 'usage report counts Nadia’s activity');
  await G('cover', { id: MID, k: 'Module', v: '3' }); const cv = await p.textContent('.letter'); ok(cv.includes('Khaled Omar') && cv.includes('Qatar') && cv.includes('UAE') && cv.includes('Oncology — Standard') && cv.includes('v3'), 'cover letter v3 built from the record');
  await G('cover', { id: MID, k: 'Module', v: '1' }); const c1 = await p.textContent('.letter'); ok(!c1.includes('UAE') && c1.includes('Superseded') && c1.includes('1 amendment'), 'cover letter v1 keeps v1 scope, shows superseded and the amendment');
  const evs = await E(id => S.audit.filter(e => e.objId === id).map(e => user(e.user).name.split(' ')[0] + ':' + e.action), MID);
  ['Nadia:Module created', 'Nadia:Submitted for review', 'Ahmed:Review started', 'Khaled:Amendment requested', 'Nadia:Amended & resubmitted', 'Khaled:Rejected', 'Nadia:Version created', 'Layla:Module approved', 'Layla:Module superseded'].forEach(x => ok(evs.includes(x), 'audit: ' + x));
  // rename product, deactivate country
  await G('item', { k: 'products', id: PD }); await p.click('[data-act=cfg-edit]'); await W(); await p.fill('#cf-name', 'Oncolix'); await p.click('[data-act=cfg-save]'); await W();
  await G('module', { id: MID }); const kv = await E(() => [...document.querySelectorAll('.kv dt')].find(d => d.textContent === 'Products').nextElementSibling.textContent); ok(kv.includes('Oncolix') && !kv.includes('Product D'), 'product rename shows in the module’s Products field');
  await G('library'); await E(() => { UI.f = {}; render(); }); await p.click('[data-act=flt-open]'); await W(); ok((await p.$$eval('#fd-lprod option', o => o.map(x => x.textContent))).includes('Oncolix'), 'renamed product appears in library filters'); await p.keyboard.press('Escape'); await W();
  await G('cover', { id: MID, k: 'Module', v: '3' }); ok((await p.textContent('.letter')).includes('Oncolix'), 'product rename shows on the cover letter');
  ok(await E(() => S.audit.some(e => e.action === 'Product updated' && e.prev === 'Product D' && e.next === 'Oncolix')), 'audit: Product updated Product D → Oncolix');
  await G('item', { k: 'markets', id: 'QA' }); await p.click('[data-act=cfg-toggle]'); await W();
  await G('module-new'); await p.$eval('[data-act=d-type][data-v=TY-CLAIM]', e => e.scrollIntoView({ block: 'center' })); await p.click('[data-act=d-type][data-v=TY-CLAIM]'); await submitBtn(); await p.fill('#d-title', 'tmp'); await p.fill('#d-body', 'temporary body'); await submitBtn(); await W(); await p.click('[data-msel=d-markets] .msel-add'); await W(); ok(!(await p.$('.msel-opt[data-v=QA]')) && await p.isVisible('.msel-opt[data-v=SA]'), 'deactivated country not offered for new modules'); await p.keyboard.press('Escape');
  await G('module', { id: MID }); ok((await p.textContent('#content')).includes('Qatar'), 'existing module still shows Qatar');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
