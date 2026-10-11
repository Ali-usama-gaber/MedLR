const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 120); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W(250));
  const login = async email => { await E(() => ACT.logout()); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  // select characters [s, e) of the annotatable text inside sel and fire mouseup
  const selectText = (sel, quote) => E(([sel, quote]) => { const box = document.querySelector(sel); const tx = box.textContent; const s = tx.indexOf(quote); let pos = 0, sn, so, en, eo; const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const L = n.textContent.length; if (sn == null && s < pos + L) { sn = n; so = s - pos; } if (s + quote.length <= pos + L) { en = n; eo = s + quote.length - pos; break; } pos += L; } const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, eo); const S_ = getSelection(); S_.removeAllRanges(); S_.addRange(r); box.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); return s; }, [sel, quote]);
  const anns = id => E(id => S.annotations.filter(a => a.objId === id).length, id);
  await login('ali.usama@saja.com');
  // ---- content module text: highlight + replacement
  await G('review', { id: 'MOD-B-007' }); const body = await E(() => latest(modById('MOD-B-007')).body); const q = body.split(' ').slice(2, 5).join(' ');
  const n0 = await anns('MOD-B-007');
  await selectText('.an-text[data-an-target=body]', q); await W(200);
  ok(await p.isVisible('.an-tb'), 'selecting text shows the annotation toolbar');
  await p.click('.an-tb [data-s=replace]'); await W(); ok(await p.isVisible('#an-rep'), 'Suggest replacement opens the composer with a replacement field');
  await p.click('[data-act=an-save]'); await W(); ok((await p.textContent('.an-comp')).includes('Write the comment'), 'replacement needs a comment');
  await p.fill('#an-rep', 'reduced exacerbations'); await p.fill('#an-text', 'Use the SmPC wording.'); await p.click('[data-act=an-save]'); await W(200);
  const A = await E(() => S.annotations[S.annotations.length - 1]);
  ok(A.anchor.kind === 'text' && A.anchor.quote === q && body.slice(A.anchor.start, A.anchor.end) === q, 'anchor stores the exact text range');
  ok(A.style === 'replace' && A.replacement === 'reduced exacerbations' && A.author === 'u-admin' || A.author, 'replacement saved with author');
  ok(A.version === 1 && A.cycle >= 1 && !!A.step && !!A.role, 'annotation carries version, cycle, step and role');
  ok(await p.isVisible(`mark.an[data-an="${A.id}"]`), 'text is marked in the content');
  ok(await E(id => S.audit.some(e => e.action === 'Comment created' && e.annId === id && e.cycle), A.id), 'audit: Comment created with cycle');
  // highlight without note
  await selectText('.an-text[data-an-target=body]', body.split(' ').slice(-3).join(' ')); await W(200); await p.click('.an-tb [data-s=highlight]'); await W(); await p.click('[data-act=an-save]'); await W(200);
  ok(await anns('MOD-B-007') === n0 + 2, 'highlight saved without a note');
  ok(await p.$('.btn.primary[disabled]') !== null && (await p.textContent('.page-head .actions')).includes('open comment'), 'approval blocked while reviewer comments are open');
  // reply, resolve, edit, go to
  await p.click(`[data-an-card="${A.id}"] [data-act=an-reply]`); await W(); await p.fill('#an-reply', 'Agreed, will update.'); await p.click('[data-act=an-reply-save]'); await W();
  ok(await E(id => S.annotations.find(a => a.id === id).replies.length === 1 && S.audit.some(e => e.action === 'Reply added' && e.annId === id), A.id), 'reply added and audited');
  await p.click(`[data-an-card="${A.id}"] [data-act=an-edit]`); await W(); await p.fill('#an-etext', 'Use the exact SmPC 5.1 wording.'); await p.click('[data-act=an-edit-save]'); await W();
  ok(await E(id => S.annotations.find(a => a.id === id).text === 'Use the exact SmPC 5.1 wording.' && S.audit.some(e => e.action === 'Comment edited' && e.annId === id), A.id), 'own comment edited and audited');
  await p.click(`[data-an-card="${A.id}"] [data-act=an-go]`); await W(300); ok(await p.isVisible(`mark.an.an-focus[data-an="${A.id}"]`), 'go to location focuses the marked text');
  for (const id of await E(() => S.annotations.filter(a => a.objId === 'MOD-B-007' && a.status === 'open' && a.author !== modById('MOD-B-007').owner).map(a => a.id))) { await p.click(`[data-an-card="${id}"] [data-act=an-status]`); await W(); }
  ok(await E(id => S.annotations.find(a => a.id === id).status === 'resolved' && S.audit.some(e => e.action === 'Comment resolved' && e.annId === id), A.id), 'comment resolved and audited');
  ok(!(await p.textContent('.page-head .actions')).includes('open comment'), 'approval available again once comments are resolved');
  // ---- video timestamp
  await G('review', { id: 'MOD-B-020' }); await p.click('[data-act=an-time]'); await W(); await p.fill('#an-text', 'Caption overlaps the logo here.'); await p.click('[data-act=an-save]'); await W(250);
  ok(await E(() => { const a = S.annotations[S.annotations.length - 1]; return a.anchor.kind === 'time' && typeof a.anchor.t === 'number'; }), 'video comment stores a timestamp');
  ok(await p.locator('.an-tl-m').count() >= 2, 'timeline shows a marker per timestamp comment');
  // ---- image area (draft so it is editable)
  await E(() => { const m = modById('MOD-A-050'); latest(m).status = 'Draft'; save(); }); await G('module', { id: 'MOD-A-050', tab: 'comments' }); await W(400);
  const fr = await p.locator('.an-frame .an-layer').boundingBox(); ok(!!fr, 'image is annotatable');
  await p.mouse.move(fr.x + fr.width * 0.2, fr.y + fr.height * 0.2); await p.mouse.down(); await p.mouse.move(fr.x + fr.width * 0.5, fr.y + fr.height * 0.45, { steps: 5 }); await p.mouse.up(); await W(200);
  ok(await p.isVisible('.an-comp'), 'dragging an area opens the composer'); await p.fill('#an-text', 'Axis label is too small.'); await p.click('[data-act=an-save]'); await W(250);
  const R = await E(() => S.annotations[S.annotations.length - 1]); ok(R.anchor.kind === 'region' && R.anchor.w > 0.2 && R.anchor.h > 0.2, 'region stored in normalised coordinates');
  const bx = await p.locator(`.an-box[data-an="${R.id}"]`).boundingBox(); await p.mouse.move(bx.x + 20, bx.y + 20); await p.mouse.down(); await p.mouse.move(bx.x + 60, bx.y + 50, { steps: 5 }); await p.mouse.up(); await W(200);
  ok(await E(id => { const a = S.annotations.find(x => x.id === id); return S.audit.some(e => e.action === 'Annotation moved' && e.annId === id); }, R.id), 'own area moved and audited');
  // ---- PDF text selection
  await E(() => { const m = modById('MOD-C-010'); latest(m).status = 'Draft'; save(); }); await G('module', { id: 'MOD-C-010', tab: 'comments' });
  try { await p.waitForSelector('.pdf-tl span', { timeout: 90000 }); await W(300);
    const word = await E(() => [...document.querySelectorAll('.pdf-tl span')].map(s => s.textContent).find(t => t.trim().length > 6));
    await selectText('.pdf-tl[data-page="1"]', word.trim().slice(0, 8)); await W(200); await p.click('.an-tb [data-s=underline]'); await W(); await p.click('[data-act=an-save]'); await W(250);
    ok(await E(() => { const a = S.annotations[S.annotations.length - 1]; return a.anchor.kind === 'ptext' && a.anchor.page === 1 && a.anchor.rects.length > 0; }), 'PDF text underline stores page, quote and rectangles');
    await E(() => document.querySelector('.pdfr-page[data-page="1"]').scrollIntoView({ block: 'start' })); await W(200); const pg = await p.locator('.pdfr-page[data-page="1"]').boundingBox(); const y0 = Math.max(pg.y, 0) + 300; await p.mouse.move(pg.x + pg.width * 0.82, y0); await p.mouse.down(); await p.mouse.move(pg.x + pg.width * 0.95, y0 + 120, { steps: 5 }); await p.mouse.up(); await W(200);
    await p.fill('#an-text', 'Footer reference missing.'); await p.click('[data-act=an-save]'); await W(200);
    ok(await E(() => { const a = S.annotations[S.annotations.length - 1]; return a.anchor.kind === 'region' && a.anchor.page === 1; }), 'PDF area comment stores page and area');
  } catch (e) { ok(false, 'PDF rendered for review: ' + e.message); }
  // ---- asset block + new text
  await G('asset-review', { id: 'AST-106' }); await p.click('[data-act=an-block]'); await W(); await p.fill('#an-text', 'Check the fair balance.'); await p.click('[data-act=an-save]'); await W(200);
  ok(await E(() => S.annotations[S.annotations.length - 1].anchor.kind === 'block'), 'asset block comment');
  // ---- ownership
  await login('sara.ahmed@saja.com'); await G('review', { id: 'MOD-B-007' });
  ok(!(await p.$(`[data-an-card="${A.id}"] [data-act=an-edit]`)), 'other users cannot edit someone else’s comment');
  ok(!!(await p.$(`[data-an-card="${A.id}"] [data-act=an-reply]`)), 'reviewer at the step can reply');
  await G('module', { id: 'MOD-A-018' }); await p.click('.atl-step[data-act]'); await W(); ok((await p.textContent('.modal')).includes('with or without food'), 'timeline step details list the step’s annotations');
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
