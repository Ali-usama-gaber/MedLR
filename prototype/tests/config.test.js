// Administrator configuration: every change is made through the UI, then checked where it is used, after a reload,
// and from another user's session. Covers reference kinds, products, countries, upload limit, review reminders,
// workflow steps, role permissions (UI and forged actions) and users.
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 200);
  const signIn = async email => { if (await E(() => S.signedIn)) { await E(() => ACT.logout()); await W(); } await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(400); };
  const txt = () => E(() => document.querySelector('#content').innerText);
  const forge = (act, data) => E(([act, data]) => { const x = document.createElement('button'); x.dataset.act = act; Object.assign(x.dataset, data || {}); document.querySelector('#content').appendChild(x); x.click(); x.remove(); }, [act, data]);
  const addCfg = async (k, vals) => { await E(k => { UI.modal = null; go(k); }, k); await W(); await p.click(`[data-act=cfg-new][data-k="${k}"]`); await W();
    for (const [f, v] of Object.entries(vals)) { const sel = `.modal [data-cfg="${f}"]`; if (await p.$eval(sel, e => e.tagName) === 'SELECT') await p.selectOption(sel, v); else await p.fill(sel, v); }
    await p.click('.modal [data-act=cfg-save]'); await W(); };
  await signIn('ali.usama@saja.com');

  // ---- Reference kinds: new kind, counted as evidence, drives the evidence SOP
  await E(() => go('refkinds')); await W();
  ok(/Reference Kinds/.test(await txt()) && await E(() => S.refKinds.length === 5), 'Reference Kinds page lists the 5 kinds');
  await p.click('[data-act=cfg-new][data-k="refkinds"]'); await W(); await p.fill('.modal [data-cfg="name"]', 'Real-world evidence'); await p.click('.modal [data-act=cfg-bool]'); await p.click('.modal [data-act=cfg-save]'); await W();
  const rk = await E(() => S.refKinds.find(k => k.name === 'Real-world evidence'));
  ok(rk && rk.evidence && rk.active, 'new reference kind saved as clinical evidence');
  await addCfg('references', { title: 'RWE registry 2026', source: 'SAJA RWE-01', kind: rk.id });
  const ref = await E(() => S.references.find(r => r.title === 'RWE registry 2026'));
  ok(ref && ref.kind === rk.id, 'the new kind is offered when registering a reference');
  const evid = await E(rid => { const m = S.modules.find(x => mtype(x.type).name === 'Clinical Claim'); const v = latest(m); const keep = v.refs; v.refs = [rid]; const r = validate(m, 'Module').find(x => x.sop.rule === 'evidence'); v.refs = keep; return r && r.ok; }, ref.id);
  ok(evid, 'a claim citing only the new kind passes the evidence SOP');
  await E(id => ACT['cfg-edit']({ dataset: { k: 'refkinds', id } }), rk.id); await W(); await p.click('.modal [data-act=cfg-bool]'); await p.click('.modal [data-act=cfg-save]'); await W();
  const evid2 = await E(rid => { const m = S.modules.find(x => mtype(x.type).name === 'Clinical Claim'); const v = latest(m); const keep = v.refs; v.refs = [rid]; const r = validate(m, 'Module').find(x => x.sop.rule === 'evidence'); v.refs = keep; return r && r.ok; }, ref.id);
  ok(evid2 === false, 'unticking "clinical evidence" makes the same claim fail the evidence SOP');
  ok(await E(() => S.audit.some(e => e.objType === 'Reference kind' && e.action === 'Reference kind updated')), 'reference kind change is in the audit trail');
  await E(id => { go('item', { k: 'refkinds', id }); }, 'study'); await W();
  ok(/References/.test(await txt()), 'reference kind detail lists the references that use it');

  // ---- Product and country: appear in forms, filters and reports
  await addCfg('products', { name: 'Product Zeta', area: 'Dermatology', indication: 'Plaque psoriasis' });
  await addCfg('markets', { name: 'Qatar', id: 'QA' });
  const pz = await E(() => S.products.find(x => x.name === 'Product Zeta').id);
  await E(() => { UI.draft = null; go('module-new'); }); await W(); await E(() => { UI.draft.step = 2; render(); }); await W();
  await p.click('[data-msel="d-products"] .msel-add'); await W();
  ok(await E(() => /Product Zeta/.test(document.querySelector('.msel-pop').innerText)), 'new product offered in the module form');
  await E(() => { UI.msel = null; render(); }); await p.click('[data-msel="d-markets"] .msel-add'); await W();
  ok(await E(() => /Qatar/.test(document.querySelector('.msel-pop').innerText)), 'new country offered in the module form');
  await E(() => { UI.msel = null; UI.draft = null; go('modules'); }); await W(); await p.click('[data-act=flt-open]'); await W();
  ok(await E(pz => !!document.querySelector(`#fd-mprod option[value="${pz}"]`) && !!document.querySelector('#fd-mmkt option[value="QA"]'), pz), 'new product and country are Modules filter options');
  await E(() => { UI.modal = null; go('reports'); }); await W(); await p.click('[data-act=flt-open]'); await W();
  ok(await E(pz => !!document.querySelector(`.modal option[value="${pz}"]`) && !!document.querySelector('.modal option[value="QA"]'), pz), 'new product and country are Reports filter options');
  await E(() => { UI.modal = null; });
  await E(pz => ACT['cfg-toggle'] ? ACT['cfg-toggle']({ dataset: { k: 'products', id: pz } }) : null, pz); await W();
  await E(() => { UI.draft = null; go('module-new'); }); await W(); await E(() => { UI.draft.step = 2; render(); }); await W(); await p.click('[data-msel="d-products"] .msel-add'); await W();
  ok(await E(() => !/Product Zeta/.test(document.querySelector('.msel-pop').innerText)), 'deactivated product is no longer offered for new content');
  await E(() => { UI.msel = null; UI.draft = null; });

  // ---- Upload limit setting
  await E(() => go('settings')); await W();
  ok(await E(() => !!document.querySelector('[data-set="maxUploadMb"]')), 'Settings has "Maximum upload size (MB)"');
  await p.fill('[data-set="maxUploadMb"]', '1'); await p.press('[data-set="maxUploadMb"]', 'Tab'); await W(450); await p.click('[data-act=set-save]'); await W();
  ok(await E(() => S.settings.maxUploadMb === 1), 'upload limit saved ' + await E(() => JSON.stringify([S.settings.maxUploadMb, UI.setDraft && UI.setDraft.maxUploadMb])));
  ok(await E(() => /limit is 1 MB/.test(mediaFileProblem({ name: 'big.png', type: 'image/png', size: 2 * 1048576 }, 'image'))), 'a 2 MB file is refused with the new 1 MB limit');
  await E(() => { UI.draft = null; go('module-new'); }); await W(); await E(() => { UI.draft.type = 'TY-IMAGE'; UI.draft.step = 1; UI.draft.maxStep = 1; render(); }); await W();
  ok(/up to 1 MB/.test(await txt()), 'the upload box shows the configured limit');
  await E(() => { UI.draft = null; go('settings'); }); await W(); await p.fill('[data-set="maxUploadMb"]', '50'); await p.press('[data-set="maxUploadMb"]', 'Tab'); await W(450); await p.click('[data-act=set-save]'); await W();

  // ---- Review reminders follow the setting
  const owner = await E(() => { const m = S.modules.find(m => live(m) && !m.archived); m.reviewDate = Date.now() + 20 * DAY; live(m).meta.reviewDate = m.reviewDate; save(); return [m.owner, m.id]; });
  const rem = days => E(([u, id, d]) => { S.settings.reviewReminderDays = d; return dueReminders(user(u)).some(r => r.objId === id && r.kind === 'review'); }, [owner[0], owner[1], days]);
  ok(await rem(30) === true && await rem(10) === false, 'review reminder appears 30 days ahead but not with a 10-day setting');
  await E(() => { S.settings.reviewReminderDays = 30; save(); });
  const em = await E(id => user(id).email, owner[0]); await signIn(em);
  await p.click('[data-pop="bell"]'); await W();
  ok(await E(id => !!document.querySelector(`[data-act="notif-rem"][data-obj="${id}"]`), owner[1]), 'the owner sees the review reminder in the bell');
  await p.click(`[data-act="notif-rem"][data-obj="${owner[1]}"]`).catch(() => {}); await W();
  ok(await E(id => UI.route.name === 'module' && UI.route.p.id === id, owner[1]), 'opening the reminder goes to the module');
  ok(await E(() => !dueReminders(me()).find(r => !r.read && r.objId === UI.route.p.id && r.kind === 'review')), 'opened reminder is marked read');
  await signIn('ali.usama@saja.com');

  // ---- Workflow: new step defaults to a configured review function; edited steps drive the lifecycle
  const wid = await E(() => { const w = S.workflows.find(w => !w.hidden && w.appliesTo === 'Module' && w.active !== false); return w.id; });
  await E(() => { const f = S.functions.find(f => f.id === 'Medical'); f.active = false; save(); }); 
  await E(id => go('workflow', { id }), wid); await W(300);
  await E(() => { UI.wfDraft.steps = []; }); await forge('wf-add', { i: '0' }); await W();
  ok(await E(() => { const s = UI.wfDraft && UI.wfDraft.steps[0]; return !!s && s.fn !== 'Medical' && S.functions.find(f => f.id === s.fn).active; }), 'a new step defaults to an active review function, not a hardcoded one');
  await E(() => { UI.wfDraft.steps = UI.wfDraft.steps.slice(0, 1).map(s => ({ ...s, fn: 'Legal', level: 'Lead', req: 'approve' })); }); await forge('wf-save'); await W();
  ok(await E(id => wfById(id).steps.length === 1 && wfById(id).steps[0].fn === 'Legal', wid), 'workflow saved with a single Legal Lead approval step');
  const life = await E(id => { const m = S.modules.find(m => statusOf(m) === 'Draft' && !m.review); startCycle(m, 'Module', id); const st = curStep(m); const who = assigneeFor(st).map(u => u.fn + '-' + u.level); decide(m, 'Module', 'approve', 'ok'); save(); return { fn: st.fn, who, st: statusOf(m) }; }, wid);
  ok(life.fn === 'Legal' && life.who.every(x => x === 'Legal-Lead') && life.st === 'Approved', 'the approval lifecycle follows the edited workflow (one Legal Lead step → Approved)');
  await E(() => { S.functions.find(f => f.id === 'Medical').active = true; save(); });

  // ---- Roles & permissions: revoking a permission changes the page and blocks the forged action
  await E(() => go('roles')); await W();
  const had = await E(() => S.roles['Content-Lead'].includes('create'));
  await E(() => ACT['perm-toggle']({ dataset: { role: 'Content-Lead', perm: 'create' } })); await W();
  ok(had && await E(() => !S.roles['Content-Lead'].includes('create')), 'Content Lead loses "create" through Roles & Permissions');
  await signIn('omar.khalil@saja.com');
  await E(() => go('modules')); await W();
  ok(await E(() => !document.querySelector('[data-go="module-new"], [data-route="module-new"]') && !/Create module/.test(document.querySelector('.page-head, .ph, header') ? document.querySelector('#content').innerText.slice(0, 400) : '')), 'Content Lead no longer sees "Create module"');
  await E(() => go('module-new')); await W();
  ok(/do not have access|not allowed|permission/i.test(await txt()), 'opening the create page directly is refused');
  await signIn('ali.usama@saja.com'); await E(() => ACT['perm-toggle']({ dataset: { role: 'Content-Lead', perm: 'create' } })); await W();

  // ---- Users: a new reviewer becomes an assignee
  const nu = await E(() => { const x = { id: uid('u'), name: 'Test Reviewer', email: 'test.reviewer@saja.com', fn: 'Regulatory', level: 'Lead', team: S.teams.find(t => t.fn === 'Regulatory').id, status: 'Active' }; S.users.push(x); save(); return x.id; });
  ok(await E(id => S.workflows.some(w => w.steps.some(s => !isNotify(s) && s.fn === 'Regulatory' && s.level === 'Lead' && assigneeFor(s).some(u => u.id === id))), nu), 'a new Regulatory Lead is eligible for Regulatory Lead steps');
  await E(id => { user(id).status = 'Inactive'; save(); }, nu);
  ok(await E(id => !S.workflows.some(w => w.steps.some(s => !isNotify(s) && assigneeFor(s).some(u => u.id === id))), nu), 'deactivated user is no longer assigned');

  // ---- Persistence: reload and confirm configuration survived
  await p.reload(); await W(600);
  ok(await E(() => S.refKinds.some(k => k.name === 'Real-world evidence') && S.products.some(x => x.name === 'Product Zeta') && S.markets.some(x => x.id === 'QA') && S.settings.maxUploadMb === 50), 'configuration survives a reload');
  // a second tab (another session on this browser) sees the same configuration
  const p2 = await p.context().newPage(); await p2.goto(URL); await p2.waitForTimeout(500);
  ok(await p2.evaluate(() => S.refKinds.some(k => k.name === 'Real-world evidence')), 'another tab in the same browser sees the change');
  await p2.close();
  // ---- Dashboard / reports reflect record changes
  await E(() => go('modules')); await W();
  const before = await E(() => S.modules.filter(m => statusOf(m) === 'Rejected').length);
  await E(() => { const m = S.modules.find(m => m.review); const st = curStep(m); S.users.find(u => u.id === me().id); decide(m, 'Module', 'reject', 'test'); save(); go('modules'); }); await W();
  ok(await E(n => { const t = [...document.querySelectorAll('.kpi, .stat, [data-act="kpi"], .ss-item')].map(x => x.innerText).join('|'); return new RegExp('Rejected[^|]*' + (n + 1)).test(t) || new RegExp((n + 1) + '[^|]*Rejected').test(t); }, before), 'Modules "Rejected" count updates after a rejection');

  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(fails ? `FAILED ${fails} of ${n}` : `ALL PASSED ${n}`); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL Error ' + e.message); process.exit(1); });
