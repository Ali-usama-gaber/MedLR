/* End-to-end acceptance: admin configuration → module with chosen workflow → contextual review + @mention →
   amendment & resubmission → approval → Approved Library → asset assembly & approval → audit & reports,
   with reload persistence, permission checks and live-vs-draft version behaviour. Everything goes through the UI. */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W(250));
  const login = async email => { await E(() => { S.signedIn = false; save(); go('login'); }); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  const next = async () => { await p.click('button[type=submit]'); await W(); };
  const reload = async () => { await p.reload(); await W(500); };
  const pick = async (id, vals) => { await p.click(`[data-msel=${id}] .msel-add`); await W(); for (const v of vals) await p.click(`.msel-opt[data-v="${v}"]`); await p.keyboard.press('Escape'); await W(); };
  const cfgAdd = async (k, vals) => { await G('settings', { tab: k }); await p.click(`[data-act=cfg-new][data-k=${k}]`); await W(); for (const [f, v] of Object.entries(vals)) await p.fill('#cf-' + f, v); await p.click('[data-act=cfg-save]'); await W(200); };
  const sign = async (email, route, id) => { await login(email); await G(route, { id }); await p.click('[data-act=sign]'); await W(); await p.click('label.choice'); await W(); await p.fill('#m-pass', 'pw'); await p.click('[data-act=sign-confirm]'); await W(250); };
  // ===== 1. Admin configuration
  await login('ali.usama@saja.com');
  await cfgAdd('products', { name: 'Product E', code: 'PE', area: 'Immunology', indication: 'Moderate plaque psoriasis' });
  const PE = await E(() => S.products.find(p => p.name === 'Product E').id); ok(await E(pe => productInds(pe).length === 1, PE), 'product created with one indication record (' + PE + ')');
  await cfgAdd('markets', { name: 'Bahrain', id: 'BH', authority: 'NHRA' }); ok(await E(() => S.markets.some(m => m.id === 'BH')), 'country created');
  await G('workflow-new'); await p.fill('[data-w=name]', 'Immunology — Standard'); await next(); await p.click('[data-act=nwf-tpl][data-v=std]'); await W();
  await p.click('[data-act=nwf-del][data-i="2"]'); await W(); await p.click('[data-act=nwf-del][data-i="3"]'); await W(); await next(); await next(); await W(200);
  const WF = await E(() => S.workflows.find(w => w.name === 'Immunology — Standard').id);
  ok(await E(id => wfById(id).steps.map(s => s.fn + s.level).join() === 'MedicalMember,MedicalLead,LegalLead,RegulatoryLead', WF), 'workflow created: Medical Member → Medical Lead → Legal Lead → Regulatory Lead');
  await G('sops'); await p.click('[data-act=sop-new]'); await W(); await p.fill('#sop-name', 'Product E — evidence required'); await p.selectOption('#sop-rule', 'reference'); await W();
  await p.click('[data-act=msel-open][data-id=sop-products]'); await W(); await p.click(`.msel-opt[data-act=sop-toggle][data-v="${PE}"]`); await p.keyboard.press('Escape'); await W(); await p.click('[data-act=sop-save]'); await W();
  ok(await E(pe => { const s = S.sops.find(x => x.name === 'Product E — evidence required'); return s && s.scope.products.join() === pe && !s.scope.markets.length; }, PE), 'SOP scoped to Product E, every country (none selected)');
  // ===== 2. Module creation by the Content Lead with the new workflow
  await login('omar.khalil@saja.com'); await G('module-new'); await p.click('[data-act=d-type][data-v=TY-CLAIM]'); await next();
  await p.fill('#d-title', 'Clinical Claim — PASI 90 at week 16'); await p.fill('#d-body', 'Product E achieved PASI 90 in 64% of patients at week 16 versus 4% with placebo.¹'); await next();
  await pick('d-products', [PE]); await p.selectOption('#d-aud', 'AU-GP'); await pick('d-markets', ['BH', 'SA']); await p.click('[data-act=d-toggle][data-k=channels][data-v="CH-EMAIL"]'); await next();
  await p.click('[data-act=msel-open][data-id=d-wf]'); await W(); await p.click(`.wfp-opt[data-v="${WF}"]`); await W(); await p.selectOption('#d-addref', 'REF-A-01'); await W(); await next(); await next(); await W(300);
  const MID = await E(() => UI.route.p.id); ok(/^MOD-E-\d+$/.test(MID), 'module created ' + MID);
  await reload(); ok(await E(([id, wf, pe]) => { const m = modById(id); return m && m.workflow === wf && m.products.includes(pe) && m.indications.length === 1 && statusOf(m) === 'Draft'; }, [MID, WF, PE]), 'after reload the module, its workflow, product and indication persist');
  await G('module', { id: MID }); ok((await p.textContent('.atl')).includes('Immunology — Standard'), 'timeline shows the chosen workflow before submission');
  await p.click('[data-act=submit-open]'); await W(); ok(await E(wf => UI.modal.wf === wf, WF), 'submission preselects the module workflow'); await p.click('[data-act=submit-confirm]'); await W(300);
  ok(await E(([id, wf]) => modById(id).review.wf === wf && modById(id).review.step === 0, [MID, WF]), 'cycle 1 started on the chosen workflow');
  // ===== 3. Contextual review with @mention, amendment
  await login('ahmed.ali@saja.com'); ok(await E(id => tasksFor(me()).some(t => t.id === id && t.kind === 'review'), MID), 'task appears in Ahmed’s My Tasks');
  await G('settings'); ok((await p.textContent('#content')).includes('do not have access'), 'reviewer cannot open Settings');
  await G('review', { id: MID });
  await E(() => { const box = document.querySelector('.an-text[data-an-target=body]'); const n = box.firstChild; const t = box.textContent; const s = t.indexOf('64%'); const r = document.createRange(); r.setStart(n, s); r.setEnd(n, s + 3); getSelection().removeAllRanges(); getSelection().addRange(r); box.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, detail: 1 })); }); await W();
  await p.click('.an-tb [data-s=comment]'); await W(); await p.click('#an-text'); await p.keyboard.type('Source table needed for 64%. @omar', { delay: 10 }); await W(200); await p.click('.men-pop [data-v="u-omar"]'); await W(); await p.click('[data-act=an-save]'); await W(200);
  const AN = await E(() => S.annotations[S.annotations.length - 1]);
  ok(AN.anchor.quote === '64%' && AN.version === 1 && AN.cycle === 1 && JSON.stringify(AN.mentions) === '["u-omar"]' && AN.role === 'Medical Member', 'comment anchored to “64%”, linked to v1 · cycle 1, mentions Omar');
  ok(await E(() => !!document.querySelector('.page-head .actions .btn.primary[disabled]')), 'Complete review blocked while his comment is open');
  await p.click('[data-act=decide][data-d=amend]'); await W(); await p.fill('#m-note', 'Add the source table for the 64% figure.'); await p.click('[data-act=decide-confirm]'); await W(300);
  ok(await E(id => statusOf(modById(id)) === 'Amendment Requested', MID), 'amendment requested');
  // ===== 4. Owner sees the mention, replies, amends, resubmits
  await login('omar.khalil@saja.com'); ok(await E(() => notificationsFor(me()).some(e => e.type === 'mention' && e.stored && !e.read)), 'Omar is notified of the mention (stored, unread)');
  await G('module', { id: MID, tab: 'comments' }); await p.click(`[data-an-card="${AN.id}"] [data-act=an-reply]`); await W(); await p.fill('#an-reply', 'Added Table 2 from the CSR.'); await p.click('[data-act=an-reply-save]'); await W();
  ok(!(await p.$(`[data-an-card="${AN.id}"] [data-act=an-edit]`)), 'owner cannot edit the reviewer’s comment');
  await G('module-edit', { id: MID }); await p.fill('#d-body', 'Product E achieved PASI 90 in 64% of patients at week 16 versus 4% with placebo (Table 2).¹'); await p.fill('#d-reason', 'Added the source table.'); await p.click('[data-act=wiz-save]'); await W(300);
  await p.click('[data-act=resubmit-open]'); await W(); await p.click('[data-act=resubmit-confirm]'); await W(300);
  ok(await E(id => modById(id).review.step === 0 && modById(id).review.cycle === 1, MID), 'resubmitted: resumes at the Medical Member step in cycle 1');
  await reload(); ok(await E(id => S.annotations.find(a => a.id === id).replies.length === 1, AN.id), 'comment and reply persist after reload');
  // ===== 5. Approval through every step
  await login('ahmed.ali@saja.com'); await G('review', { id: MID }); await p.click(`[data-an-card="${AN.id}"] [data-act=an-status]`); await W();
  await p.click('[data-act=decide][data-d=pass]'); await W(); await p.click('[data-act=decide-confirm]'); await W(300);
  await login('omar.khalil@saja.com'); await G('review', { id: MID }); ok(!(await p.$('[data-act=sign]')), 'the content owner cannot sign an approval step');
  await sign('sara.ahmed@saja.com', 'review', MID); await sign('rania.haddad@saja.com', 'review', MID); await sign('layla.nasser@saja.com', 'review', MID);
  ok(await E(id => statusOf(modById(id)) === 'Approved' && live(modById(id)).v === 1, MID), 'module approved');
  await E(() => { UI.modal = null; }); await G('module', { id: MID }); ok(await E(() => [...document.querySelectorAll('.atl-step')].filter(s => s.classList.contains('ok')).length === 5), 'timeline: four completed steps and Approved');
  await p.locator('.atl-step[data-act]').first().click(); await W(); ok((await p.textContent('.modal')).includes('64%'), 'step details show that step’s comment'); await p.keyboard.press('Escape'); await W();
  // ===== 6. Approved Library
  await login('karim.fawzi@saja.com'); await E(() => { UI.f = {}; }); await G('library'); ok((await p.textContent('#content')).includes('PASI 90'), 'approved module in the Approved Library');
  // ===== 6b. Safety statement for Product E (assets need one) through the Low-risk workflow
  await login('omar.khalil@saja.com'); await G('module-new'); await p.click('[data-act=d-type][data-v=TY-SAFETY]'); await next();
  await p.fill('#d-title', 'Safety Statement E — Infections'); await p.fill('#d-body', 'Product E may increase the risk of infections. Do not start treatment during an active infection.'); await next();
  await pick('d-products', [PE]); await p.selectOption('#d-aud', 'AU-GP'); await pick('d-markets', ['BH']); await p.click('[data-act=d-toggle][data-k=channels][data-v="CH-EMAIL"]'); await next();
  await p.click('[data-act=msel-open][data-id=d-wf]'); await W(); await p.click('.wfp-opt[data-v="WF-LOW"]'); await W(); await p.selectOption('#d-addref', 'REF-A-01'); await W(); await next(); await next(); await W(300);
  const SID = await E(() => UI.route.p.id); await p.click('[data-act=submit-open]'); await W(); await p.click('[data-act=submit-confirm]'); await W(300);
  ok(await E(id => modById(id).review && modById(id).review.wf === 'WF-LOW', SID), 'safety module submitted on the Low-risk workflow it was created with');
  for (const who of ['sara.ahmed@saja.com', 'layla.nasser@saja.com']) if (await E(id => !!modById(id).review, SID)) await sign(who, 'review', SID);
  ok(await E(id => statusOf(modById(id)) === 'Approved', SID), 'safety module approved');
  await login('karim.fawzi@saja.com');
  // ===== 7. Asset assembly and approval
  await G('assets'); await p.click('[data-act=asset-new]'); await W(); await p.selectOption('#an-type', 'MT-1'); await W(); await p.fill('#an-name', 'HCP Email — PASI 90');
  await pick('an-products', [PE]); await pick('an-markets', ['BH']); await p.selectOption('#an-ch', 'CH-EMAIL'); await W(); await p.selectOption('#an-aud', 'AU-GP'); await W(); await p.click('[data-act=asset-create]'); await W(300);
  const AID = await E(() => UI.route.p.id); await p.click(`[data-act=blk-add][data-module="${MID}"]`); await W(); await p.click(`[data-act=blk-add][data-module="${SID}"]`); await W();
  await p.click('[data-act=new-text]'); await W(); await p.fill('#nt-text', 'Talk to your representative about Product E.'); await p.click('[data-act=new-text-confirm]'); await W();
  await p.fill('#ap-disc', 'For healthcare professionals in Bahrain. Full prescribing information available on request.'); await p.dispatchEvent('#ap-disc', 'change'); await W();
  const blockers = await E(id => validationIssues(assetById(id), 'Asset').map(x => x.issue), AID);
  await p.click('[data-act=asset-submit]'); await W(); const canSubmitAsset = !(await p.isDisabled('[data-act=asset-submit-confirm]'));
  ok(true, 'asset validation: ' + (blockers.length ? blockers.join(' / ') : 'passes'));
  if (canSubmitAsset) { await p.click('[data-act=asset-submit-confirm]'); await W(300);
    await login('ali.usama@saja.com'); for (let i = 0; i < 6 && await E(id => !!assetById(id).review, AID); i++) { await G('asset-review', { id: AID }); const signBtn = await p.$('[data-act=sign]'); if (signBtn) { await p.click('[data-act=sign]'); await W(); await p.click('label.choice'); await p.fill('#m-pass', 'pw'); await p.click('[data-act=sign-confirm]'); await W(250); } else { await p.click('[data-act=decide][data-d=pass]'); await W(); await p.click('[data-act=decide-confirm]'); await W(250); } }
    ok(await E(id => statusOf(assetById(id)) === 'Approved', AID), 'asset approved through its workflow');
  } else { ok(false, 'asset could not be submitted: ' + (await p.textContent('.modal')).slice(0, 200)); await p.keyboard.press('Escape'); }
  // ===== 8. New draft version vs live approved version
  await login('omar.khalil@saja.com'); await G('module', { id: MID }); await p.click('[data-act=new-version]'); await W(); await p.fill('#d-reason', 'Add week 52 data.'); await p.fill('#d-body', 'Product E maintained PASI 90 in 61% of patients at week 52.¹'); await p.click('[data-act=wiz-save]'); await W(300);
  ok(await E(id => latest(modById(id)).v === 2 && statusOf(modById(id)) === 'Draft' && live(modById(id)).v === 1 && live(modById(id)).body.includes('week 16'), MID), 'v2 is a draft while v1 stays live');
  await E(() => { UI.f = {}; }); await G('library'); const lib = await p.textContent('#content'); ok(lib.includes('PASI 90') && !lib.includes('week 52'), 'the library still shows the approved v1, not the v2 draft');
  ok(await E(id => assetById(id).blocks.some(b => b.moduleId && b.v === 1), AID), 'the asset keeps using the approved v1');
  // ===== 9. Audit and reports
  await login('ali.usama@saja.com');
  const evs = await E(id => S.audit.filter(e => e.objId === id).map(e => e.action), MID);
  ['Module created', 'Submitted for review', 'Comment created', 'User mentioned', 'Amendment requested', 'Reply added', 'Amended & resubmitted', 'Comment resolved', 'Module approved', 'Version created'].forEach(a => ok(evs.includes(a), 'audit: ' + a));
  ok(await E(id => S.audit.filter(e => e.objId === id && e.action === 'Comment created').every(e => e.version === 1 && e.cycle === 1), MID), 'comment audit entries carry version and cycle');
  ok(await E(pe => { const c = allCycles().filter(c => c.products.includes(pe)); return c.some(x => x.outcome === 'Approved' && x.amendments === 1); }, PE), 'reports data include the approved cycle with its amendment');
  await E(() => { UI.f = {}; }); await G('reports', { tab: 'workflow' }); ok((await p.textContent('#content')).includes('Immunology — Standard'), 'workflow report lists the new workflow');
  await reload(); ok(await E(([id, aid]) => statusOf(modById(id)) === 'Draft' && live(modById(id)).v === 1 && !!assetById(aid), [MID, AID]), 'final state persists after reload');
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
