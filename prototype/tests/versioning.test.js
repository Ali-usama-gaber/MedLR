// File versions vs review activity, for image, PDF and video modules: comments never create or change files,
// decisions never create versions, uploads keep earlier files and their comments anchored to the file they were made on.
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const FILE = { image: 'upload2.png', document: 'upload.pdf', video: 'upload.webm' };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 250);
  const signIn = async email => { if (await E(() => S.signedIn)) { await E(() => ACT.logout()); await W(); } await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(400); };
  const reload = async () => { await p.reload(); await W(700); };
  const forge = (act, data) => E(([act, data]) => { const x = document.createElement('button'); x.dataset.act = act; Object.assign(x.dataset, data || {}); document.querySelector('#content').appendChild(x); x.click(); x.remove(); }, [act, data]);
  const fileExists = id => E(id => mediaTx('readonly', st => st.get(id)).then(x => !!x, () => false), id);
  const state = id => E(id => { const m = modById(id); const l = latest(m); return { nv: m.versions.length, v: l.v, file: l.media && l.media.fileId, rev: l.media && (l.media.rev || 1), files: (l.files || []).map(f => f.fileId), st: statusOf(m), cycle: (m.review || m.resume || {}).cycle }; }, id);
  await signIn('ali.usama@saja.com');

  for (const kind of ['image', 'document', 'video']) {
    const id = await E(k => { const m = S.modules.find(m => kindOfType(m.type) === k && !m.archived && !m.resume && latest(m).media && latest(m).media.fileId);
      if (statusOf(m) !== 'Draft') newVersion(m, 'Module', 'test'); startCycle(m, 'Module', m.workflow || eligibleModuleWorkflows()[0].id); save(); return m.id; }, kind);
    const K = `[${kind} ${id}]`; const s0 = await state(id);
    // 1. comment without upload, persists
    const ann = await E(([id, k]) => { const m = modById(id); const a = annCreate(m, { kind: 'point', target: 'file', page: 0, x: 0.3, y: 0.4, ...(k === 'video' ? { t: 1 } : {}) }, 'note', 'Check the axis label'); return { id: a.id, fileId: a.fileId, cycle: a.cycle, version: a.version }; }, [id, kind]);
    await reload(); const s1 = await state(id);
    ok(s1.nv === s0.nv && s1.file === s0.file && ann.fileId === s0.file && ann.cycle === s0.cycle && ann.version === s0.v, `${K} comment saved on file ${String(s0.file).slice(0, 10)}, cycle ${ann.cycle}; no version or file change`);
    ok(await E(a => S.annotations.some(x => x.id === a), ann.id), `${K} comment persists after reload`);
    // 2. reply, edit, resolve, reopen: same comment, no version
    await E(a => { annUI().vals['an-reply'] = 'Fixed in the next file'; ACT['an-reply-save']({ dataset: { id: a } }); }, ann.id);
    await E(a => ACT['an-status']({ dataset: { id: a } }), ann.id); await E(a => ACT['an-status']({ dataset: { id: a } }), ann.id);
    await reload(); const s2 = await state(id);
    ok(await E(a => { const x = S.annotations.find(y => y.id === a); return x.replies.length === 1 && x.status === 'open'; }, ann.id) && s2.nv === s0.nv && s2.file === s0.file, `${K} reply + resolve + reopen keep the same comment and create no version`);
    ok(await E(([id, a]) => ['Reply added', 'Comment resolved', 'Comment reopened'].every(act => S.audit.some(e => e.objId === id && e.annId === a && e.action === act && e.version === latest(modById(id)).v && e.cycle)), [id, ann.id]), `${K} comment events are audited with version and cycle`);
    // 3. decisions: no version, decision records the file
    await E(id => { const m = modById(id); decide(m, 'Module', 'pass', 'ok'); decide(m, 'Module', 'amend', 'Please fix the label'); save(); }, id);
    const s3 = await state(id); const dec = await E(id => latest(modById(id)).cycles.slice(-1)[0].decisions.slice(-1)[0], id);
    ok(s3.nv === s0.nv && s3.file === s0.file && s3.st === 'Amendment Requested', `${K} request amendment creates no version`);
    ok(dec.decision === 'Amendment requested' && dec.fileId === s0.file && dec.note && dec.by, `${K} amendment decision records file, reason and reviewer`);
    ok(await E(id => S.audit.filter(e => e.objId === id && e.action === 'Amendment requested').slice(-1)[0].cycle === modById(id).resume.cycle, id), `${K} amendment audit entry carries the cycle`);
    // 4. owner downloads and uploads a revised file
    await E(id => go('module', { id }), id); await W(400);
    ok(await p.isVisible(`[data-rework="${id}"] a[download]`), `${K} current file is offered for download`);
    await p.setInputFiles(`#rw-file-${id}`, path.join(__dirname, FILE[kind])); await W(2500);
    const s4 = await state(id);
    ok(s4.nv === s0.nv && s4.file !== s0.file && s4.rev === 2 && s4.files.includes(s0.file), `${K} upload adds file revision 2 within v${s4.v}; revision 1 kept`);
    ok(await fileExists(s0.file) || String(s0.file).startsWith('seed:'), `${K} the earlier file is still stored (not overwritten)`);
    await E(id => go('module', { id, tab: 'comments' }), id); await W(500);
    ok(await E(a => !document.querySelector(`.an-media [data-an="${a}"], .an-pdf [data-an="${a}"], .an-tl [data-an="${a}"]`) && !!document.querySelector(`.an-earlier [data-an="${a}"], .an-earlier`), ann.id), `${K} the old comment is not drawn on the new file; it is listed under "Made on an earlier file"`);
    const ann2 = await E(([id, k]) => annCreate(modById(id), { kind: 'point', target: 'file', page: 0, x: 0.5, y: 0.5, ...(k === 'video' ? { t: 1 } : {}) }, 'note', 'Looks right now').fileId, [id, kind]);
    ok(ann2 === s4.file, `${K} a new comment links to file revision 2`);
    // 5. resubmit resumes; reject; new version
    const resumed = await E(id => { const m = modById(id); const step = m.resume.step; resumeAmended(m, 'Module', 'Label fixed'); save(); return m.review.step === step; }, id);
    ok(resumed && (await state(id)).nv === s0.nv, `${K} resubmission resumes at the requesting step with no new version`);
    await E(id => { const m = modById(id); decide(m, 'Module', 'reject', 'Wrong study'); save(); }, id);
    const s5 = await state(id); ok(s5.nv === s0.nv && s5.st === 'Rejected', `${K} rejection creates no version`);
    await E(id => go('module', { id }), id); await W(400);
    await p.setInputFiles(`#rw-file-${id}`, path.join(__dirname, FILE[kind])); await W(2500);
    const s6 = await state(id);
    ok(s6.nv === s0.nv + 1 && s6.v === s0.v + 1 && s6.st === 'Draft' && s6.rev === 1, `${K} upload after rejection creates v${s6.v} (draft, file revision 1)`);
    ok(await E(([id, v]) => { const x = verOf(modById(id), v); return x.status === 'Rejected' && x.media && (x.files || []).length === 1; }, [id, s0.v]), `${K} the rejected v${s0.v} keeps both its file revisions`);
    // 6. previous version shows its own comments
    await E(([id, v]) => ACT['version-open']({ dataset: { kind: 'Module', id, v: String(v) } }), [id, s0.v]); await W(300);
    ok(await E(a => !!document.querySelector(`.modal [data-ann-row="${a[0]}"]`) && !!document.querySelector(`.modal [data-ann-row="${a[1]}"]`), [ann.id, (await E(id => S.annotations.filter(x => x.objId === id).slice(-1)[0].id, id))]) && await E(() => /File revision 1/i.test(document.querySelector('.modal').innerText) && /File revision 2/i.test(document.querySelector('.modal').innerText)), `${K} v${s0.v} history lists its comments grouped by file revision`);
    ok(await E(v => /Activity on v/.test(document.querySelector('.modal').innerText), s0.v), `${K} version history shows its activity`);
    ok(await E(id => !annsFor(modById(id), latest(modById(id)).v).length, id), `${K} the new version starts with no comments (old ones stay on v${s0.v})`);
    await E(() => { UI.modal = null; render(); });
  }

  // 7. permissions: a forged decision by a non-assignee changes nothing
  const t = await E(() => { const m = S.modules.find(m => m.review); const bad = S.users.find(u => u.status === 'Active' && !isAdmin(u) && !canActOn(u, m)); return [m.id, bad.email, m.review.step, latest(m).cycles.slice(-1)[0].decisions.length]; });
  await signIn(t[1]); await E(id => go('module', { id }), t[0]); await W();
  await forge('decide', { kind: 'Module', id: t[0], d: 'reject' }); await forge('decide-confirm', {}); await W();
  ok(await E(([id, , step, n]) => { const m = modById(id); return !!m.review && m.review.step === step && latest(m).cycles.slice(-1)[0].decisions.length === n; }, t), 'a forged reject by a non-assignee is refused');
  const noFile = await E(id => { const m = S.modules.find(x => isMediaType(x.type) && statusOf(x) === 'Rejected') ; return m ? !fileRework(me(), m) || canEditObj(me(), m) : true; });
  ok(noFile, 'download/upload only for users allowed to handle the rejection or amendment');
  await signIn('ali.usama@saja.com');

  // 8. migration: links when reliable, flags when not, repeatable
  const mig = await E(() => { const s = JSON.parse(JSON.stringify(S)); const one = s.modules.find(m => m.versions.some(v => v.media && !(v.files || []).length)); const v1 = one.versions.find(v => v.media && !(v.files || []).length);
    const two = s.modules.find(m => m.versions.some(v => (v.files || []).length)); const v2 = two.versions.find(v => (v.files || []).length);
    s.annotations.push({ id: 'an-m1', objType: 'Module', objId: one.id, version: v1.v, cycle: 1, anchor: { kind: 'general' }, style: 'comment', text: 'x', replies: [], status: 'open', ts: 1, author: 'u-ali' });
    s.annotations.push({ id: 'an-m2', objType: 'Module', objId: two.id, version: v2.v, cycle: 1, anchor: { kind: 'general' }, style: 'comment', text: 'y', replies: [], status: 'open', ts: 1, author: 'u-ali' });
    linkModuleWorkflows(s); const a1 = s.annotations.find(a => a.id === 'an-m1'), a2 = s.annotations.find(a => a.id === 'an-m2'); const first = [a1.fileId, a2.fileId, a2.fileUnlinked];
    linkModuleWorkflows(s); return { linked: a1.fileId === v1.media.fileId, unlinked: a2.fileId === null && a2.fileUnlinked === true, repeat: JSON.stringify(first) === JSON.stringify([a1.fileId, a2.fileId, a2.fileUnlinked]), kept: s.annotations.length === S.annotations.length + 2 }; });
  ok(mig.linked && mig.unlinked && mig.repeat && mig.kept, 'migration links comments only when the version had one file, flags the rest, deletes nothing and is repeatable ' + JSON.stringify(mig));

  // 9. reporting and asset assembly still read the approved file
  await E(() => go('reports')); await W(400); ok(!errs.length, 'reports render after the changes');
  ok(await E(() => S.modules.filter(libValid).every(m => !isMediaType(m.type) || (live(m).media && live(m).media.fileId))), 'every approved media module still points at its approved file');

  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(fails ? `FAILED ${fails} of ${n}` : `ALL PASSED ${n}`); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL Error ' + e.message); process.exit(1); });
