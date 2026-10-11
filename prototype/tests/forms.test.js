const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W(300));
  const login = async email => { await E(() => ACT.logout()); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  const next = async () => { await p.click('button[type=submit]'); await W(); };
  await login('ali.usama@saja.com');
  // ---- module form: workflow picker lists every eligible workflow
  await G('module-new'); await p.click('[data-act=d-type][data-v=TY-CLAIM]'); await next();
  await p.fill('#d-title', 'Clinical Claim — Workflow picker test'); await p.fill('#d-body', 'Product A reduced hospitalisation by 21% versus standard care.'); await next();
  // + Add new product: modal on top of the form, then selected in the form with its indication
  await p.click('[data-act=cfg-quick][data-k=products]'); await W(); ok(await E(() => UI.modal && UI.modal.type === 'cfg' && UI.modal.quick === 'draft:products'), '“Add new product” opens the product form without leaving the module form');
  await p.fill('#cf-name', 'Product Q'); await p.fill('#cf-code', 'PQ'); await p.fill('#cf-area', 'Oncology'); await p.fill('#cf-indication', 'Metastatic breast cancer'); await p.click('[data-act=cfg-save]'); await W(200);
  const PQ = await E(() => S.products.find(x => x.name === 'Product Q').id);
  ok(await E(pq => UI.draft.products.includes(pq) && UI.draft.indications.length === 1 && UI.draft.title === 'Clinical Claim — Workflow picker test', PQ), 'new product selected, its indication applied, typed entries kept');
  await p.click('[data-act=cfg-quick][data-k=audiences]'); await W(); await p.fill('#cf-name', 'HCP – Oncologists'); await p.click('[data-act=cfg-save]'); await W(200);
  ok(await E(() => aud(UI.draft.audience).name === 'HCP – Oncologists'), 'new audience selected in the form');
  await p.click('[data-msel=d-markets] .msel-add'); await W(); await p.click('.msel-opt[data-v="SA"]'); await p.keyboard.press('Escape'); await W();
  await p.click('[data-act=cfg-quick][data-k=channels]'); await W(); await p.fill('#cf-name', 'Congress'); await p.click('[data-act=cfg-save]'); await W(200);
  ok(await E(() => UI.draft.channels.length === 1 && chan(UI.draft.channels[0]).name === 'Congress'), 'new channel selected in the form'); await next();
  await p.selectOption('#d-addref', 'REF-A-01'); await W();
  const elig = await E(() => eligibleModuleWorkflows().length);
  await p.click('[data-act=msel-open][data-id=d-wf]'); await W(); ok((await p.locator('.wfp-opt').count()) === elig, 'workflow dropdown lists every eligible workflow (' + elig + ')');
  ok(await E(() => [...document.querySelectorAll('.wfp-opt')].every(o => o.querySelector('.wfp-steps'))), 'each workflow shows its approval steps');
  await p.keyboard.type('lead only', { delay: 10 }); await W(); ok((await p.locator('.wfp-opt').count()) === 1, 'workflow search filters the list');
  await p.keyboard.press('Escape'); await W();
  await next(); ok(await E(() => UI.draft.step === 3) && (await p.textContent('.wfp + .err, .panel')).length > 0 && await E(() => !!document.querySelector('.wfp.invalid')), 'cannot continue without choosing a workflow (nothing is selected silently)');
  // ---- + Add new workflow: leave, create, come back with entries kept and the workflow selected
  await p.click('[data-act=wf-addnew]'); await W(300); ok(await E(() => UI.route.name === 'workflow-new') && (await p.textContent('#content')).includes('Workflow picker test'), 'Add new workflow opens Workflow Management with a way back');
  await p.fill('[data-w=name]', 'Oncology — fast track'); await p.fill('[data-w=desc]', 'Lead-only route for oncology congress claims'); await p.click('button[type=submit]'); await W();
  await p.click('[data-act=nwf-tpl][data-v=std]'); await W(); await p.click('button[type=submit]'); await W(); await p.click('button[type=submit]'); await W(400);
  const NW = await E(() => S.workflows.find(w => w.name === 'Oncology — fast track').id);
  ok(await E(nw => UI.route.name === 'module-new' && UI.draft.workflow === nw && UI.draft.title === 'Clinical Claim — Workflow picker test' && UI.draft.refs.includes('REF-A-01') && UI.draft.channels.length === 1, NW), 'back in Create Module: entries kept and the new workflow selected');
  await p.click('[data-act=msel-open][data-id=d-wf]'); await W(); ok(await E(nw => !!document.querySelector(`.wfp-opt[data-v="${nw}"]`), NW), 'new workflow available immediately in the dropdown'); await p.keyboard.press('Escape'); await W();
  await next(); await next(); await W(300); const MID = await E(() => UI.route.p.id);
  ok(await E(([id, nw]) => modById(id).workflow === nw && S.audit.some(e => e.objId === id && e.action === 'Module created'), [MID, NW]), 'module saved with its workflow relationship');
  ok((await p.textContent('.atl')).includes('Oncology — fast track'), 'approval timeline shows the chosen workflow before submission');
  await p.click('[data-act=submit-open]'); await W(); ok(await E(nw => UI.modal.wf === nw, NW), 'submission defaults to the module’s workflow');
  await p.click('[data-act=submit-confirm]'); await W(300); ok(await E(([id, nw]) => modById(id).review && modById(id).review.wf === nw, [MID, NW]), 'the approval cycle runs on the chosen workflow');
  // ---- asset modal: add a country without losing the form
  await G('assets'); await p.click('[data-act=asset-new]'); await W(); await p.fill('#an-name', 'Congress handout'); await p.dispatchEvent('#an-name', 'input');
  await p.click('.modal [data-act=cfg-quick][data-k=markets]'); await W(); await p.fill('#cf-name', 'Oman'); await p.fill('#cf-id', 'OM'); await p.click('[data-act=cfg-save]'); await W(200);
  ok(await E(() => UI.modal && UI.modal.type === 'asset-new' && UI.modal.d.markets.includes('OM') && UI.modal.d.name === 'Congress handout'), 'asset form returns with the new country selected and its name kept');
  await p.keyboard.press('Escape'); await W();
  // ---- SOP: searchable multi-selects, select all / clear all, none = all
  await G('sops'); await p.click('[data-act=sop-new]'); await W(); await p.fill('#sop-name', 'Scope test SOP');
  await p.click('[data-act=msel-open][data-id=sop-products]'); await W(); await p.keyboard.type('Product B'); await W(); ok((await p.locator('.msel-opt').count()) === 1, 'SOP product dropdown is searchable');
  await p.click('[data-act=sop-bulk][data-k=products][data-v=all]'); await W(); ok(await E(() => UI.modal.d.products.length === S.products.length), 'Select all');
  ok((await p.locator('.msel-below .mchip').count()) === await E(() => S.products.length), 'selected values shown as chips below the dropdown');
  await p.click('[data-act=sop-bulk][data-k=products][data-v=none]'); await W(); ok(await E(() => UI.modal.d.products.length === 0) && (await p.textContent('.modal')).includes('All products (none selected)'), 'Clear all returns to “all products”');
  await p.click('.msel-opt[data-act=sop-toggle][data-v="P-B"]'); await p.click('.msel-opt[data-act=sop-toggle][data-v="P-B"]'); await p.click('.msel-opt[data-act=sop-toggle][data-v="P-B"]'); await W();
  ok(await E(() => JSON.stringify(UI.modal.d.products) === '["P-B"]'), 'no duplicate selections'); await p.keyboard.press('Escape'); await W();
  await p.click('[data-act=sop-save]'); await W(200);
  ok(await E(() => { const s = S.sops.find(x => x.name === 'Scope test SOP'); return s && sopApplies(s, modById('MOD-B-007'), 'Module') && !sopApplies(s, modById('MOD-A-014'), 'Module') && s.scope.markets.length === 0 && sopApplies(s, { ...modById('MOD-B-007'), markets: ['OM'] }, 'Module'); }), 'saved SOP: one product limits it, empty countries means every country');
  // ---- Compare all roles: draft, unsaved indicator, cancel, save
  await G('roles'); await p.click('[data-act=role-compare]'); await W(); ok(await p.isVisible('.cmp-ov'), 'Compare all roles opens as a popup with an overview');
  ok((await p.locator('.cmp-tabs .tab').count()) === 6, 'six categorised tabs');
  await p.click('[data-act=cmp-tab][data-v=content]'); await W(); await p.click('[data-act=cmp-toggle][data-role="Content-Member"][data-perm=submit]'); await W();
  ok((await p.textContent('.modal')).includes('1 unsaved change') && await E(() => !S.roles['Content-Member'].includes('submit')), 'edits are a draft with an unsaved indicator');
  await p.click('[data-act=cmp-cancel]'); await W(); ok(await E(() => !UI.modal && !S.roles['Content-Member'].includes('submit')), 'Cancel discards the draft');
  await p.click('[data-act=role-compare]'); await W(); await p.click('[data-act=cmp-tab][data-v=content]'); await W(); await p.click('[data-act=cmp-toggle][data-role="Content-Member"][data-perm=submit]'); await W(); await p.click('[data-act=cmp-save]'); await W(200);
  ok(await E(() => S.roles['Content-Member'].includes('submit') && canSubmit(user('u-hana')) && S.audit.some(e => e.action === 'Permission granted' && e.objId === 'Content-Member')), 'Save updates the real permissions and authorisation');
  await p.click('[data-act=role-compare]'); await W(); await p.click('[data-act=cmp-tab][data-v=review]'); await W(); await p.click('[data-act=cmp-diff]'); await W();
  ok(await E(() => [...document.querySelectorAll('.cmp-tbl tbody tr')].length < cmpKeys('review').length + 1), '“Only show differences” narrows the rows'); await p.click('[data-act=cmp-cancel]'); await W();
  // ---- Settings tabs
  await G('settings'); ok((await p.locator('.set-tab').count()) >= 12, 'Settings shows vertical tabs (' + (await p.locator('.set-tab').count()) + ')');
  await p.click('.set-tab[data-tab=products]'); await W(300); ok(await E(() => UI.route.p.tab === 'products' && document.querySelectorAll('.set-main table tbody tr').length === S.products.length), 'Products tab shows the products table');
  await G('settings', { tab: 'markets' }); ok((await p.textContent('.set-main h1')).includes('Countries'), 'deep link to the Countries tab');
  await G('channels'); ok(await E(() => !!document.querySelector('.set-tab.on[data-tab=channels]')), 'old Channels link opens inside the Settings tabs');
  await G('settings', { tab: 'lifecycle' }); ok(await p.isVisible('#st-expiryWarnDays'), 'Lifecycle rules tab shows its settings');
  // ---- permissions: add-new hidden or disabled with a reason
  await login('hana.zaki@saja.com'); await G('module-new'); await p.click('[data-act=d-type][data-v=TY-CLAIM]'); await next(); await p.fill('#d-title', 'x'); await p.fill('#d-body', 'Some content body'); await next();
  ok(!(await p.$('[data-act=cfg-quick][data-k=products]')) && !!(await p.$('.add-new.disabled[title*="permission"]')), 'without Manage settings, Add new is disabled and explains why');
  await G('settings'); ok((await p.textContent('#content')).includes('do not have access'), 'Settings blocked for a Content Member');
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
