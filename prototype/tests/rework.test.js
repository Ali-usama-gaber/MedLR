// Rework after rejection / amendment (download current file, upload a new version), Person and Title filters,
// validation checks on module types and channels, and the asset builder without "Add new text".
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 200);
  const signIn = async email => { if (await E(() => S.signedIn)) { await E(() => ACT.logout()); await W(); } await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(400); };
  await signIn('ali.usama@saja.com');

  // Two image modules in draft: send one to "amend", one to "reject" (decisions recorded as Administrator).
  const ids = await E(() => { const free = m => isMediaType(m.type) && !m.archived && !m.review && !m.resume && latest(m).media; const ms = [S.modules.find(m => free(m) && kindOfType(m.type) === 'image'), S.modules.find(m => free(m) && kindOfType(m.type) !== 'image')].filter(Boolean);
    ms.forEach((m, i) => { if (statusOf(m) !== 'Draft') newVersion(m, 'Module', 'test'); startCycle(m, 'Module', m.workflow || eligibleModuleWorkflows()[0].id); decide(m, 'Module', 'pass', ''); decide(m, 'Module', i ? 'reject' : 'amend', i ? 'Wrong chart' : 'Fix the axis label'); });
    save(); return ms.map(m => m.id); });
  ok(ids.length === 2, 'two media modules prepared: ' + ids.join(', '));
  const [A, R] = ids;
  const snap = id => E(id => { const m = modById(id); const l = latest(m); return { v: l.v, nv: m.versions.length, file: l.media && l.media.fileId, name: l.media && l.media.name, rev: l.media && l.media.rev, files: (l.files || []).length, st: statusOf(m), products: m.products.join(), markets: m.markets.join(), title: m.title, audit: S.audit.filter(e => e.objId === id).length, anns: (S.annotations || []).filter(a => a.objId === id).length, cycles: l.cycles.length, resume: m.resume && m.resume.step }; }, id);

  // ---- Amendment requested
  const a0 = await snap(A);
  await E(id => go('module', { id }), A); await W(500);
  ok(await p.isVisible(`[data-rework="${A}"]`), 'amendment: the rework panel shows on the module page for the owner side');
  ok(await p.isVisible(`[data-rework="${A}"] a[download]`), 'amendment: "Download current version" is offered');
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.click(`[data-rework="${A}"] a[download]`); const d = await dl;
  ok(!!d && d.suggestedFilename() === a0.name, 'amendment: download saves the current file (' + (d && d.suggestedFilename()) + ')');
  await p.setInputFiles(`#rw-file-${A}`, path.join(__dirname, 'upload.pdf')); await W(300); if (await p.$('[data-act=rework-confirm]')) await p.click('[data-act=rework-confirm]'); await W(600);
  ok(await E(() => /accepts PNG, JPEG/.test((document.querySelector('[data-rework] .err') || {}).textContent || '')), 'amendment: a PDF on an image module is refused with a clear message');
  ok((await snap(A)).file === a0.file, 'amendment: refused upload leaves the file unchanged');
  await p.setInputFiles(`#rw-file-${A}`, path.join(__dirname, 'upload2.png')); await W(300); if (await p.$('[data-act=rework-confirm]')) await p.click('[data-act=rework-confirm]'); await W(1500);
  const a1 = await snap(A);
  ok(a1.file !== a0.file && a1.name === 'upload2.png', 'amendment: the new file replaces the current one');
  ok(a1.v === a0.v && a1.nv === a0.nv && a1.rev === 2 && a1.files === 1, 'amendment: same version, file revision 2, previous file kept in its history');
  ok(a1.st === 'Amendment Requested' && a1.resume === a0.resume && a1.cycles === a0.cycles, 'amendment: not resubmitted automatically; resume point and cycle kept');
  ok(a1.products === a0.products && a1.markets === a0.markets && a1.title === a0.title && a1.anns === a0.anns, 'amendment: id, metadata and comments preserved');
  ok(a1.audit === a0.audit + 1 && await E(id => S.audit.filter(e => e.objId === id).slice(-1)[0].action === 'Media replaced', A), 'amendment: upload recorded in the audit trail');
  ok(await E(id => document.querySelector('#content').innerText.includes('upload2.png') && latest(modById(id)).media.uploadedBy === me().id, A), 'amendment: preview shows the new file with its uploader');
  const r1 = await E(id => { const m = modById(id); const st = resumeAmended(m, 'Module', 'new file'); save(); return { step: m.review.step, st: stepLabel(st), keep: curCycle(m).decisions.some(x => x.decision === 'Reviewed') }; }, A);
  ok(r1.step === a0.resume && r1.keep, 'amendment: resubmitting resumes at the step that asked (' + r1.st + '), earlier approval kept');

  // ---- Rejected
  const b0 = await snap(R);
  await E(id => go('module', { id }), R); await W(500);
  ok(await p.isVisible(`[data-rework="${R}"]`) && await p.isVisible(`[data-rework="${R}"] a[download]`), 'rejection: download and upload offered');
  const rk = await E(id => kindOfType(modById(id).type), R); const rf = rk === 'video' ? 'upload.webm' : rk === 'document' ? 'upload.pdf' : 'upload.png';
  await p.setInputFiles(`#rw-file-${R}`, path.join(__dirname, rf)); await W(300); if (await p.$('[data-act=rework-confirm]')) await p.click('[data-act=rework-confirm]'); await W(2500);
  const b1 = await snap(R);
  ok(b1.nv === b0.nv + 1 && b1.v === b0.v + 1 && b1.st === 'Draft' && b1.name === rf, 'rejection: a new version v' + b1.v + ' is created as a draft with the new file');
  ok(await E(id => { const m = modById(id); return m.versions[m.versions.length - 2].status === 'Rejected' && !!m.versions[m.versions.length - 2].media; }, R), 'rejection: the rejected version and its file stay in version history');
  ok(b1.products === b0.products && b1.markets === b0.markets && b1.title === b0.title && b1.anns === b0.anns, 'rejection: metadata and comments preserved');
  ok(await E(() => /Next: submit version/.test(document.querySelector('#content').innerText)), 'rejection: the next action (submit) is shown');
  ok(await E(id => { const m = modById(id); startCycle(m, 'Module', m.workflow || eligibleModuleWorkflows()[0].id); const ok = m.review.step === 0 || isNotify(wfById(m.review.wf).steps[0]); m.review = null; latest(m).cycles.pop(); setStatus(m, 'Draft'); save(); return ok; }, R), 'rejection: submitting the new version starts from the first step');
  await E(id => go('module', { id, tab: 'versions' }), A); await W(300);
  ok(await E(() => /file revision 2/.test(document.querySelector('#content').innerText)), 'version history lists the file revision');

  // ---- Confirmation names the module and the new version; nothing is uploaded before it
  const cm = await E(() => { const m = S.modules.find(m => isMediaType(m.type) && !m.archived && latest(m).media && statusOf(m) === 'Amendment Requested') || (() => { const x = S.modules.find(m => isMediaType(m.type) && !m.archived && latest(m).media && !m.review && !m.resume); if (statusOf(x) !== 'Draft') newVersion(x, 'Module', 't'); startCycle(x, 'Module', x.workflow || eligibleModuleWorkflows()[0].id); decide(x, 'Module', 'amend', 'check'); return x; })(); save(); go('module', { id: m.id }); return [m.id, latest(m).media.fileId, latest(m).v, kindOfType(m.type)];}); await W(400);
  await p.setInputFiles(`#rw-file-${cm[0]}`, path.join(__dirname, { image: 'upload.png', video: 'upload.webm', document: 'upload.pdf' }[cm[3]])); await W(300);
  ok(await E(([id, f]) => latest(modById(id)).media.fileId === f, cm) && await E(id => { const c = document.querySelector(`[data-rw-confirm="${id}"]`); return !!c && c.innerText.includes(id) && /upload\.(png|webm|pdf)/.test(c.innerText) && /file revision/.test(c.innerText); }, cm[0]), 'choosing a file asks to confirm the module, file and new revision before uploading');
  await p.click('[data-act=rework-cancel]'); await W();
  ok(await E(([id, f]) => latest(modById(id)).media.fileId === f && !document.querySelector('[data-rw-confirm]'), cm), 'Cancel uploads nothing');
  // ---- Permissions: someone who may not amend sees no upload and a forged upload is refused
  const other = await E(id => { const m = modById(id); const u = S.users.find(x => x.status === 'Active' && !isAdmin(x) && !canAmendObj(x, m) && !canEditObj(x, m)); return u && u.email; }, A);
  // put module A back into "amendment requested" for the check
  await E(id => { const m = modById(id); decide(m, 'Module', 'amend', 'again'); save(); }, A);
  await signIn(other);
  await E(id => go('module', { id }), A); await W(500);
  ok(!(await p.$(`[data-rework="${A}"]`)), 'unauthorised user (' + other + ') sees no download/upload panel');
  const before = await snap(A);
  await E(async id => { const f = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2])], 'x.png', { type: 'image/png' }); await reworkUpload(id, f); }, A); await W(400);
  ok((await snap(A)).file === before.file, 'forged upload by an unauthorised user is refused');

  // ---- Filters: Person (Material Owner) and Title
  await signIn('ali.usama@saja.com');
  await E(() => { UI.f = {}; go('modules'); }); await W(300);
  const all = await E(() => document.querySelectorAll('#content tbody tr').length);
  const owner = await E(() => { const c = {}; S.modules.forEach(m => c[m.owner] = (c[m.owner] || 0) + 1); return Object.entries(c).sort((a, b) => a[1] - b[1])[0][0]; });
  await p.click('[data-act=flt-open]'); await W(); await p.fill('#fd-mown-q', (await E(id => user(id).name, owner)).slice(0, 4));
  ok(await E(id => [...document.querySelectorAll('#fd-mown option')].filter(o => !o.hidden && o.value).every(o => o.text.toLowerCase().includes(user(id).name.slice(0, 4).toLowerCase())), owner), 'Person filter: search narrows the people list');
  await p.selectOption('#fd-mown', owner); await p.click('[data-act=flt-apply]'); await W(300);
  const byOwner = await E(id => S.modules.filter(m => m.owner === id).length, owner);
  ok(await E(() => document.querySelectorAll('#content tbody tr').length) === byOwner, 'Person filter shows only that owner’s modules (' + byOwner + ')');
  ok(await E(() => /Person \(Material Owner\):/.test(document.querySelector('.fbar').innerText)), 'Person filter shows an active chip');
  const word = await E(id => S.modules.find(m => m.owner === id).title.split(/\s+/).find(w => w.length > 4), owner);
  await E(w => { UI.f.mtitle = w; render(); }, word); await W();
  const both = await E(([id, w]) => S.modules.filter(m => m.owner === id && m.title.toLowerCase().includes(w.toLowerCase())).length, [owner, word]);
  ok(await E(() => document.querySelectorAll('#content tbody tr').length) === both && both > 0, 'Person + Title together: ' + both + ' result(s)');
  await E(() => { UI.f.mprod = S.products[0].id; render(); }); await W();
  const three = await E(([id, w]) => S.modules.filter(m => m.owner === id && m.title.toLowerCase().includes(w.toLowerCase()) && m.products.includes(S.products[0].id)).length, [owner, word]);
  ok(await E(() => document.querySelectorAll('#content tbody tr').length) === three || (three === 0 && !!document.querySelector('#content .empty')), 'Person + Title + Product combine');
  await p.click('.fchip button[data-k="mown"]'); await W();
  ok(await E(() => !UI.f.mown && !!UI.f.mtitle), 'removing the Person chip keeps the Title filter');
  await p.click('[data-act=flt-clear]'); await W();
  ok(await E(() => document.querySelectorAll('#content tbody tr').length) === all, 'Clear all restores every module');
  await E(() => { UI.f.mtitle = 'zzzz-no-such-title'; render(); }); await W();
  ok(await E(() => !!document.querySelector('#content .empty')), 'Title filter with no match shows the empty state');
  await E(() => { UI.f = {}; render(); });

  // ---- Validation checks on module types and channels
  await E(() => go('moduletypes')); await W(); await E(() => ACT['cfg-edit']({ dataset: { k: 'moduletypes', id: 'TY-IMAGE' } })); await W();
  ok(await p.isVisible('.modal [data-msel="cf-sops"]'), 'module type form has a Validation checks multi-select');
  await p.click('.modal [data-msel="cf-sops"] .msel-add'); await W(); await p.fill('#mselq-cf-sops', 'annual'); await W();
  ok(await E(() => document.querySelectorAll('.modal .msel-opt').length === 1), 'validation checks are searchable');
  await p.click('.modal .msel-opt'); await W(); await p.click('.modal [data-act=cfg-save]'); await W();
  ok(await E(() => mtype('TY-IMAGE').sops.join() === 'SOP-08'), 'module type saves its validation checks');
  await E(() => ACT['cfg-edit']({ dataset: { k: 'moduletypes', id: 'TY-IMAGE' } })); await W();
  ok(await E(() => /Product B — annual review/.test(document.querySelector('.modal').innerText)), 'editing the type shows the configured check');
  await E(() => { UI.modal = null; go('channels'); ACT['cfg-new']({ dataset: { k: 'channels' } }); }); await W();
  await p.fill('.modal [data-cfg="name"]', 'Congress booth');
  await p.click('.modal [data-msel="cf-sops"] .msel-add'); await W(); await p.fill('#mselq-cf-sops', 'annual'); await W(); await p.click('.modal .msel-opt'); await W();
  await p.fill('#mselq-cf-sops', 'Reference'); await W(); await p.click('.modal .msel-opt'); await W(); await p.click('.modal [data-act=cfg-save]'); await W();
  const ch = await E(() => S.channels.find(c => c.name === 'Congress booth'));
  ok(ch && ch.sops.join() === 'SOP-08,SOP-03', 'new channel saves two validation checks');
  ok(await E(() => S.audit.some(e => e.objType === 'Channel' && e.action === 'Channel created')), 'channel change audited');
  // historical modules are not re-validated by the new links
  ok(await E(() => S.modules.filter(m => m.type === 'TY-IMAGE').every(m => !validate(m, 'Module').some(x => x.sop.id === 'SOP-08' && !(x.sop.scope.products || []).some(pp => m.products.includes(pp))))), 'existing image modules keep their earlier checks (no new SOP applied)');
  // creating a module: type + channel checks apply once each
  const res = await E(cid => { const D = { ...blankDraft(), type: 'TY-IMAGE', channels: [cid], products: [S.products[0].id] }; const pv = draftAsModule(D, null); return validate(pv, 'Module').map(x => x.sop.id); }, ch.id);
  ok(res.includes('SOP-08') && res.includes('SOP-03') && res.filter(x => x === 'SOP-08').length === 1, 'new module of that type in that channel runs type + channel checks, deduplicated: ' + res.join(','));
  await E(cid => { UI.draft = null; go('module-new'); }); await W(); await E(() => { UI.draft.type = 'TY-IMAGE'; render(); }); await W();
  ok(await E(() => /Product B — annual review/.test(document.querySelector('form[data-form=module] aside').innerText)), 'module form shows the type’s checks once the type is chosen');
  const saved = await E(cid => { const m = S.modules[0]; const keep = latest(m).sopLinks.slice(); mtype(m.type).sops = [...(mtype(m.type).sops || []), 'SOP-04']; const after = latest(m).sopLinks.join(); mtype(m.type).sops = mtype(m.type).sops.filter(x => x !== 'SOP-04'); return keep.join() === after; });
  ok(saved, 'a saved version keeps the checks recorded when it was saved');
  await E(() => { UI.draft = null; go('home'); });

  // ---- Asset builder: no "Add new text"
  const aid = await E(() => { const a = S.assets.find(x => canEditObj(me(), x) && statusOf(x) === 'Draft'); return a && a.id; });
  await E(id => go('assemble', { id }), aid); await W(400);
  ok(await E(() => !/Add new text/.test(document.querySelector('#content').innerText) && !document.querySelector('[data-act="new-text"]')), 'asset builder no longer offers "Add new text"');
  ok(await E(() => document.querySelectorAll('.lib-item').length > 0), 'approved modules are still listed for selection');
  const nb = await E(id => assetById(id).blocks.length, aid);
  await E(() => { const x = document.querySelector('.lib-item:not([disabled])'); x && x.click(); }); await W();
  ok(await E(id => assetById(id).blocks.length, aid) === nb + 1, 'clicking an approved module still adds it to the asset');

  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(fails ? `FAILED ${fails} of ${n}` : `ALL PASSED ${n}`); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL Error ' + e.message); process.exit(1); });
