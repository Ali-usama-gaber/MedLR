// Cross-page data consistency: the same entity or metric shows the same value everywhere, record changes propagate
// by id, inactive/deleted reference data is handled, and everything survives a reload.
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 250);
  const signIn = async email => { if (await E(() => S.signedIn)) { await E(() => ACT.logout()); await W(); } await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(400); };
  const visit = async (r, o) => { await E(([r, o]) => { UI.modal = null; UI.f = {}; go(r, o || {}); }, [r, o]); await W(350); };
  const kpi = label => E(l => { const k = [...document.querySelectorAll('.kpi, .hz-k')].find(x => { const t = x.querySelector('.k-label, .hz-kl'); return t && t.textContent.trim().startsWith(l); }); return k ? +k.querySelector('b, .hz-kv').firstChild.textContent.replace(/[^\d-]/g, '') : null; }, label);
  const libCount = async () => { await visit('library'); return E(() => +((document.querySelector('#content').innerText.match(/(\d+) modules?/) || [])[1])); };
  const counts = async () => { await visit('home'); const home = await kpi('Approved modules'); await visit('modules'); const mods = await kpi('In the Approved Library'); const lib = await libCount(); const truth = await E(() => S.modules.filter(inLibrary).length); return { home, mods, lib, truth }; };
  await signIn('ali.usama@saja.com');

  // ---- Same metric on Home, Modules and Library
  let c = await counts(); ok(c.home === c.truth && c.mods === c.truth && c.lib === c.truth, 'Approved Library count agrees on Home, Modules and Library: ' + JSON.stringify(c));
  await E(() => { S.settings.libraryShowExpiring = false; save(); });
  c = await counts(); ok(c.home === c.truth && c.mods === c.truth && c.lib === c.truth, 'still agrees with "show expiring" off: ' + JSON.stringify(c));
  await E(() => { S.settings.libraryShowExpiring = true; save(); });
  // nav badge = modules list
  await visit('modules');
  ok(await E(() => +document.querySelector('.side .nav-item[title="Modules"] .badge, .side .nav-item[title="Modules"] .n, .side .nav-item[title="Modules"] em')?.textContent === S.modules.length || document.querySelector('.side').innerText.includes('Modules\n' + S.modules.length)) && /(\d+) of (\d+)/.test(await E(() => document.querySelector('.fcount').textContent)) && await E(() => document.querySelector('.fcount').textContent.endsWith(S.modules.length + '')), 'Modules nav badge equals the Modules list total');
  // tasks: Home, My Tasks tabs and nav badge
  await visit('home'); const homeTasks = await kpi('My tasks');
  await visit('tasks'); const tabSum = await E(() => [...document.querySelectorAll('.tab .n, [role=tab] .n')].slice(0, 4).reduce((s, x) => s + +x.textContent, 0));
  const truthTasks = await E(() => tasksFor(me()).length);
  ok(homeTasks === truthTasks && tabSum === truthTasks, `task count agrees: Home ${homeTasks}, My Tasks tabs ${tabSum}, records ${truthTasks}`);
  // reports buckets add up, each module once
  const rep = await E(() => { go('reports', { tab: 'content' }); const t = document.querySelector('#content').innerText; return t; }); await W(300);
  const r = await E(() => { const mods = S.modules; const valid = mods.filter(libValid).length; return { valid, total: mods.length }; });
  await visit('reports', { tab: 'content' });
  ok(await kpi('Approved') === r.valid, 'Reports "Approved" equals approved-and-valid modules (' + r.valid + ')');
  const parts = await E(() => ['Approved', 'In review', 'Draft'].map(l => { const k = [...document.querySelectorAll('.kpi')].find(x => x.querySelector('.k-label').textContent.trim().startsWith(l)); return k ? +k.querySelector('b').textContent : 0; }));
  ok(parts.reduce((s, x) => s + x, 0) <= r.total, 'Reports buckets never exceed the module total ' + JSON.stringify(parts) + ' / ' + r.total);

  // ---- Approving a module moves every count together
  const before = await counts();
  const mid = await E(() => { const m = S.modules.find(m => m.review); const wf = wfById(m.review.wf); while (m.review) { const st = curStep(m); decide(m, 'Module', st.req === 'approve' ? 'approve' : 'pass', 'ok'); } save(); return m.id; });
  const after = await counts();
  ok(after.truth === before.truth + 1 && after.home === after.truth && after.mods === after.truth && after.lib === after.truth, `approving ${mid} adds 1 on Home, Modules and Library: ${before.truth} → ${JSON.stringify(after)}`);

  // ---- Rename by id: every page shows the new name, ids unchanged
  const pid = await E(() => S.products[0].id); const oldName = await E(() => S.products[0].name);
  await visit('products'); await E(id => ACT['cfg-edit']({ dataset: { k: 'products', id } }), pid); await W();
  await p.fill('.modal [data-cfg="name"]', 'Cardiolex'); await p.click('.modal [data-act=cfg-save]'); await W();
  const mod = await E(id => S.modules.find(m => m.products.includes(id) && libValid(m)).id, pid);
  await visit('modules'); ok(/Cardiolex/.test(await E(() => document.querySelector('#content').innerText)) && !(await E(o => document.querySelector('#content tbody').innerText.includes(o), oldName)), 'renamed product shows in the Modules list');
  await visit('library'); ok(await E(() => document.querySelector('#content').innerText.includes('Cardiolex')), 'renamed product shows in the Library');
  await visit('module', { id: mod }); ok(await E(() => document.querySelector('#content').innerText.includes('Cardiolex')), 'renamed product shows on the module page');
  await visit('reports'); await p.click('[data-act=flt-open]'); await W(); ok(await E(id => { const o = document.querySelector(`.modal option[value="${id}"]`); return !!o && o.textContent === 'Cardiolex'; }, pid), 'renamed product is the Reports filter option (same id)');
  ok(await E(id => S.modules.some(m => m.products.includes(id)) && !S.modules.some(m => m.products.includes('Cardiolex')), pid), 'records keep the product id, not the name');
  const ch = await E(() => { const m = S.modules.find(m => m.channels.length); return [m.id, m.channels[0]]; });
  await E(([, cid]) => { const c = S.channels.find(x => x.id === cid); c.name = 'E-mail campaign'; save(); }, ch);
  await visit('module', { id: ch[0] }); ok(await E(() => document.querySelector('#content').innerText.includes('E-mail campaign')), 'renamed channel shows on the module page');

  // ---- Inactive reference data: kept on history, refused on new content
  await E(id => { S.products.find(x => x.id === id).active = false; save(); }, pid);
  await visit('module', { id: mod }); ok(await E(() => document.querySelector('#content').innerText.includes('Cardiolex')), 'deactivated product still shows on existing modules');
  const err = await E(id => { UI.route = { name: 'module-new', p: {} }; const D = { ...blankDraft(), type: 'TY-CLAIM', title: 'x', body: 'A long enough body text', products: [id], markets: ['SA'], channels: [S.channels.find(c => c.active).id], audience: S.audiences[0].id, workflow: eligibleModuleWorkflows()[0].id }; return validateDraft(D).products; }, pid);
  ok(/inactive/.test(err || ''), 'a new module cannot be saved with a deactivated product: ' + err);
  const keep = await E(([id, mid]) => { const m = modById(mid); UI.route = { name: 'module-edit', p: { id: mid } }; const D = { ...blankDraft(), type: m.type, title: 'x', body: 'A long enough body text', products: [...m.products], markets: [...m.markets], channels: [...m.channels], audience: m.audience, workflow: eligibleModuleWorkflows()[0].id }; const e = validateDraft(D).products; UI.route = { name: 'home', p: {} }; return e; }, [pid, mod]);
  ok(!keep, 'editing a module that already had the product is still allowed');
  const ast = await E(id => { const a = S.assets.find(x => x.products.includes(id)) || S.assets[0]; if (!a.products.includes(id)) a.products.push(id); return a.id; }, pid);
  ok(await E(id => assetValidation(assetById(id)).sops.some(x => x.label === 'Active reference data' && /Cardiolex/.test(x.issue)), ast), 'an asset with a deactivated product reports it before submission');
  await E(id => { S.products.find(x => x.id === id).active = true; save(); }, pid);

  // ---- Delete only when unused
  await visit('item', { k: 'products', id: pid }); ok(await E(() => !document.querySelector('[data-act=cfg-delete]')), 'a product in use offers no Delete');
  await E(() => { S.audiences.push({ id: 'AU-TMP', name: 'Temp audience', active: true }); save(); });
  await visit('item', { k: 'audiences', id: 'AU-TMP' }); await p.click('[data-act=cfg-delete]'); await W(); const cf = await p.$('.modal [data-act*="confirm"], .modal .btn.danger'); if (cf) { await cf.click(); await W(); }
  ok(await E(() => !S.audiences.some(a => a.id === 'AU-TMP')), 'an unused audience can be deleted');

  // ---- Asset eligibility follows the asset's channel
  const elig = await E(() => { const m = S.modules.find(m => libValid(m) && liveMeta(m).channels.length < S.channels.length); const lm = liveMeta(m); const out = S.channels.find(c => !lm.channels.includes(c.id)).id; const a = { id: 'X', products: [...lm.products], markets: [lm.markets[0]], channel: out, audience: lm.audience, type: S.materialTypes[0].id, blocks: [] };
    const no = eligibility(m, a).ok; a.channel = lm.channels[0]; const yes = eligibility(m, a).ok; return [no, yes]; });
  ok(elig[0] === false && elig[1] === true, 'module eligibility in an asset follows the asset channel');

  // ---- My Tasks reflects real assignments
  const t = await E(() => { const m = S.modules.find(m => statusOf(m) === 'Draft' && !m.review); startCycle(m, 'Module', m.workflow || eligibleModuleWorkflows()[0].id); save(); const who = assigneeFor(curStep(m)).filter(u => u.status === 'Active'); return [m.id, who.map(u => u.email), S.users.filter(u => u.status === 'Active' && !isAdmin(u) && !who.includes(u)).map(u => u.email)[0]]; });
  await signIn(t[1][0]); await visit('tasks'); 
  ok(await E(id => tasksFor(me()).some(x => x.id === id) && document.querySelector('#content').innerText.includes(modById(id).title), t[0]), 'the assigned reviewer sees the new submission in My Tasks (' + t[1][0] + ')');
  await signIn(t[2]); await visit('tasks');
  ok(await E(id => !tasksFor(me()).some(x => x.id === id), t[0]), 'a non-assignee does not get the task');

  // ---- Persistence
  await signIn('ali.usama@saja.com'); await p.reload(); await W(600);
  ok(await E(id => S.products.find(x => x.id === id).name === 'Cardiolex' && S.channels.some(c => c.name === 'E-mail campaign'), pid), 'renames survive a reload');
  c = await counts(); ok(c.home === c.truth && c.mods === c.truth && c.lib === c.truth, 'counts still agree after reload: ' + JSON.stringify(c));

  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(fails ? `FAILED ${fails} of ${n}` : `ALL PASSED ${n}`); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL Error ' + e.message); process.exit(1); });
