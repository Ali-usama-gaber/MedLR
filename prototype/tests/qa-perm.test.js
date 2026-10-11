// Action-level permission enforcement: controls are forged into the page and clicked through the real
// dispatcher (the same path as a hidden or tampered button). Records must not change.
const { chromium } = require('playwright');
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150);
  const login = async email => { await E(() => ACT.logout()); await p.waitForSelector('#login-email'); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForFunction(e => S.signedIn && me().email === e, email); await W(200); };
  // Inject a control with the given data-* and click it; optional setup runs first (e.g. a modal state + inputs).
  const forge = (act, data = {}, setup = '') => E(([act, data, setup]) => { try { if (setup) (0, eval)(setup); render(); } catch (e) { UI.modal = null; } const el = document.createElement('button'); el.dataset.act = act; Object.entries(data).forEach(([k, v]) => { el.dataset[k] = v; }); el.textContent = 'forged'; document.getElementById('app').appendChild(el); try { el.click(); } catch (e) { } }, [act, data, setup]).then(() => W(200));
  const snap = () => E(() => JSON.stringify({ roles: S.roles, settings: S.settings, sops: S.sops.length, users: S.users.map(u => u.status), products: S.products.length, prodNames: S.products.map(x => x.name + x.active), wfs: S.workflows.length, mods: S.modules.map(m => [m.id, m.archived, m.versions.length, m.review && m.review.step, m.review && m.review.cycle, statusOf(m)]), assets: S.assets.map(a => [a.id, a.blocks.length, a.products.join(), a.versions.length, statusOf(a)]) }));
  const closeAll = () => E(() => { UI.modal = null; UI.pop = null; try { render(); } catch (e) { } });
  await login('ali.usama@saja.com'); await E(() => { S.__marker = 'keep'; save(); });
  const roles = [['hana.zaki@saja.com', 'Content Member'], ['omar.khalil@saja.com', 'Content Lead'], ['ahmed.ali@saja.com', 'Medical Member'], ['sara.ahmed@saja.com', 'Medical Lead'], ['mona.adel@saja.com', 'Legal Member'], ['rania.haddad@saja.com', 'Legal Lead'], ['tarek.samir@saja.com', 'Regulatory Member'], ['layla.nasser@saja.com', 'Regulatory Lead'], ['karim.fawzi@saja.com', 'Marketing Lead'], ['youssef.amin@saja.com', 'Marketing Member']];
  for (const [email, label] of roles) {
    await login(email); const info = await E(() => ({ id: me().id, mu: can(me(), 'manage_users'), ms: can(me(), 'manage_settings'), msop: can(me(), 'manage_sops'), mw: can(me(), 'manage_workflows'), wd: can(me(), 'withdraw') }));
    const before = await snap(); const den = [];
    const tryDenied = async (act, data, setup, test) => { await forge(act, data, setup); const after = await snap(); const changed = after !== before || (test ? !(await p.evaluate(`(${test})()`)) : false); if (changed) den.push(act); await closeAll(); };
    if (!info.mu) { await tryDenied('roles-reset'); await tryDenied('perm-toggle', { role: 'Content-Member', perm: 'view_reports' }); await tryDenied('user-status', { id: 'u-hana' }); await tryDenied('cmp-save', {}, 'UI.modal={type:"compare",tab:"overview",d:JSON.parse(JSON.stringify(S.roles))};UI.modal.d["Content-Member"]=[]'); }
    if (!info.ms) { await tryDenied('set-save', {}, 'UI.setDraft={...S.settings,orgName:"HACKED"}'); await tryDenied('reset-confirm', {}, 'UI.modal={type:"confirm-reset"};render();setTimeout(()=>0);', '() => S.__marker === "keep" && S.settings.orgName !== "HACKED"'); await tryDenied('cfg-delete', { k: 'products', id: 'P-C' }); await tryDenied('cfg-toggle', { k: 'products', id: 'P-A' }); }
    if (!info.msop) await tryDenied('sop-active', { id: 'SOP-01' });
    if (!info.mw) await tryDenied('wf-del', { id: 'WF-LOW' });
    if (!info.wd) await tryDenied('mod-archive', { id: 'MOD-A-050' });
    // review decisions on steps this user does not hold
    const steps = await E(() => S.modules.filter(m => m.review).map(m => [m.id, canActOn(me(), m), curStep(m).req]));
    for (const [id, mine, req] of steps) if (!mine) {
      await tryDenied('decide', { kind: 'Module', id, d: 'pass' }, '', `() => !UI.modal`);
      await tryDenied('decide-confirm', { req: '0' }, `UI.modal={type:'decide',kind:'Module',id:'${id}',d:'${req === 'approve' ? 'reject' : 'pass'}'};render();`);
      await tryDenied('sign-confirm', {}, `UI.modal={type:'sign',kind:'Module',id:'${id}',att:true};render();`);
    }
    // edit-side actions on content outside the user's rights
    const others = await E(() => ({ mods: S.modules.filter(m => !canEditObj(me(), m)).map(m => [m.id, statusOf(m)]), assets: S.assets.filter(a => !canEditObj(me(), a)).map(a => a.id), amend: S.modules.filter(m => statusOf(m) === 'Amendment Requested' && !canAmendObj(me(), m)).map(m => m.id), cv: can(me(), 'create_version'), cr: can(me(), 'create') }));
    for (const [id, st] of others.mods.slice(0, 4)) { if (['Draft', 'Awaiting Lead submission'].includes(st)) await tryDenied('submit-confirm', {}, `UI.modal={type:'submit',id:'${id}',wf:S.settings.defaultModuleWorkflow};render();`); if (['Approved', 'Rejected'].includes(st)) await tryDenied('new-version', { id }, '', `() => UI.route.name !== 'module-edit'`); }
    for (const id of others.amend) await tryDenied('resubmit-confirm', {}, `UI.modal={type:'resubmit',kind:'Module',id:'${id}'};render();`);
    for (const id of others.assets.slice(0, 3)) { await tryDenied('blk-add', { id, module: 'MOD-C-002' }); await tryDenied('asset-save', { id }); await tryDenied('a-toggle', { id, k: 'products', v: 'P-B' }); }
    if (!others.cr) await tryDenied('asset-new', {}, '', '() => !UI.modal');
    ok(!den.length, `${label}: forged actions are refused (${den.length ? 'ALLOWED: ' + den.join(', ') : 'all refused'})`);
  }
  // positive controls: the right people can still act
  await login('ahmed.ali@saja.com'); const mine = await E(() => (S.modules.find(m => m.review && canActOn(me(), m) && curStep(m).req !== 'approve') || {}).id);
  await forge('decide', { kind: 'Module', id: mine, d: 'pass' }); ok(!!mine && await E(() => UI.modal && UI.modal.type === 'decide'), 'control: Medical Member can open the review decision on their own step (' + mine + ')'); await closeAll();
  await login('sara.ahmed@saja.com'); const lead = await E(() => (S.modules.find(m => m.review && canActOn(me(), m) && curStep(m).req === 'approve') || {}).id);
  await forge('sign', { kind: 'Module', id: lead }); ok(!!lead && await E(() => UI.modal && UI.modal.type === 'sign'), 'control: Medical Lead can open the signature on their approval step (' + lead + ')'); await closeAll();
  await login('ali.usama@saja.com'); await E(() => { S.roles['Content-Member'].push('x-marker'); save(); }); await forge('roles-reset'); ok(await E(() => !S.roles['Content-Member'].includes('x-marker')), 'control: Administrator can restore role defaults');
  // ineligible module cannot be added to an asset, even by its owner
  const inel = await E(() => { const a = S.assets.find(x => statusOf(x) === 'Draft'); const m = S.modules.find(m => !a.blocks.some(b => b.moduleId === m.id) && (!live(m) || !eligibility(m, a).ok)); return a && m ? [a.id, m.id, a.blocks.length, !!live(m)] : null; });
  if (inel) { await E(([id]) => go('assemble', { id }), inel); await W(300); await forge('blk-add', { id: inel[0], module: inel[1] }); ok(await E(([id, , nb]) => assetById(id).blocks.length === nb, inel), `ineligible module ${inel[1]} (live: ${inel[3]}) is not added to ${inel[0]}`); }
  else ok(false, 'found a draft asset and an ineligible module for the eligibility check');
  const elig = await E(() => { const a = S.assets.find(x => statusOf(x) === 'Draft'); const m = S.modules.find(m => live(m) && !a.blocks.some(b => b.moduleId === m.id) && eligibility(m, a).ok); return a && m ? [a.id, m.id, a.blocks.length] : null; });
  if (elig) { await forge('blk-add', { id: elig[0], module: elig[1] }); ok(await E(([id, , nb]) => assetById(id).blocks.length === nb + 1, elig), `control: eligible module ${elig[1]} is added to ${elig[0]}`); }
  // forbidden routes render an access message for every non-admin role
  for (const [email, label] of roles) { await login(email); const r = await E(() => { const out = []; ['users', 'user', 'user-new', 'roles', 'org', 'teams', 'functions', 'settings', 'sops', 'workflows', 'workflow-new', 'products', 'markets', 'refdata', 'audit', 'reports', 'lifecycle', 'module-new', 'assets', 'library', 'tasks', 'modules'].forEach(r => { const allowed = can(me(), ROUTE_PERM[r] || 'view'); go(r, r === 'user' ? { id: 'u-sara' } : {}); const denied = document.querySelector('#content').textContent.includes('do not have access'); if (allowed === denied) out.push(r + (allowed ? ' wrongly blocked' : ' NOT blocked')); }); return out; });
    ok(!r.length, `${label}: every route matches its permission (${r.join(', ') || 'ok'})`); }
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
