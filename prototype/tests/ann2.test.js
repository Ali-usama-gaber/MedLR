const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W(300));
  const login = async email => { await E(() => ACT.logout()); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  const sel = (s, quote, collapsed) => E(([s, quote, collapsed]) => { const box = document.querySelector(s); const tx = box.textContent; const st = tx.indexOf(quote); let pos = 0, sn, so, en, eo; const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let n; const end = collapsed ? st : st + quote.length; while ((n = w.nextNode())) { const L = n.textContent.length; if (sn == null && st <= pos + L) { sn = n; so = st - pos; } if (end <= pos + L) { en = n; eo = end - pos; break; } pos += L; } const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, eo); const S_ = getSelection(); S_.removeAllRanges(); S_.addRange(r); box.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, detail: 1 })); return st; }, [s, quote, !!collapsed]);
  const last = () => E(() => S.annotations[S.annotations.length - 1]);
  const save = async (text) => { if (text != null) await p.fill('#an-text', text); await p.click('[data-act=an-save]'); await W(200); };
  const drag = async (sel_, a, b2, steps) => { await p.locator(sel_).first().scrollIntoViewIfNeeded(); await W(100); const r = await p.locator(sel_).first().boundingBox(); await p.mouse.move(r.x + r.width * a[0], r.y + r.height * a[1]); await p.mouse.down(); await p.mouse.move(r.x + r.width * b2[0], r.y + r.height * b2[1], { steps: steps || 6 }); await p.mouse.up(); await W(200); };
  await login('ali.usama@saja.com');
  // ---- text: insert, strike, underline, sticky note, toolbar content, cancel
  await G('review', { id: 'MOD-B-007' }); const body = await E(() => latest(modById('MOD-B-007')).body); const w2 = body.split(' ')[3];
  await sel('.an-text[data-an-target=body]', w2, true); await W();
  const pointTools = await E(() => [...document.querySelectorAll('.an-tb [data-s]')].map(b => b.dataset.s).join(','));
  ok(pointTools === 'insert,note,comment', 'clicking between words offers Insert text, Sticky note, Comment (' + pointTools + ')');
  await p.click('.an-tb [data-act=an-cancel]'); await W(); ok(!(await p.$('.an-tb')) && await E(() => !annUI().sel), 'Cancel dismisses the toolbar without creating anything');
  await sel('.an-text[data-an-target=body]', w2, true); await W(); await p.click('.an-tb [data-s=insert]'); await W();
  await p.click('[data-act=an-save]'); await W(); ok((await p.textContent('.an-comp')).includes('text to insert'), 'Insert text requires the text');
  await p.fill('#an-rep', 'significantly '); await save('');
  let A = await last(); ok(A.style === 'insert' && A.anchor.start === A.anchor.end && A.replacement === 'significantly ', 'insert saved at an exact position');
  ok(await p.isVisible(`mark.an-pt.an-insert[data-an="${A.id}"]`), 'insertion caret rendered in the text');
  const selTools = await (async () => { await sel('.an-text[data-an-target=body]', body.split(' ').slice(6, 8).join(' ')); await W(); return E(() => [...document.querySelectorAll('.an-tb [data-s]')].map(b => b.dataset.s).join(',')); })();
  ok(selTools === 'comment,highlight,underline,strike,insert,replace,note', 'text selection toolbar has all text tools (' + selTools + ')');
  await p.click('.an-tb [data-s=strike]'); await save(''); A = await last(); ok(A.style === 'strike' && await p.isVisible(`mark.an-strike[data-an="${A.id}"]`), 'strikethrough marks the selected text');
  await sel('.an-text[data-an-target=body]', body.split(' ').slice(-2).join(' ')); await W(); await p.click('.an-tb [data-s=underline]'); await save('');
  A = await last(); ok(A.style === 'underline', 'underline saved');
  await sel('.an-text[data-an-target=body]', body.split(' ')[1], true); await W(); await p.click('.an-tb [data-s=note]'); await W();
  await p.click('[data-act=an-save]'); await W(); ok((await p.textContent('.an-comp')).includes('Write the comment'), 'sticky note needs a comment');
  // ---- @mention inside the sticky note
  await p.click('#an-text'); await p.keyboard.type('Please confirm @sar', { delay: 20 }); await W(200);
  ok(await p.isVisible('.men-pop') && (await p.textContent('.men-pop')).includes('Sara Ahmed'), 'typing @ opens a searchable people list');
  await p.click('.men-pop [data-v="u-sara"]'); await W();
  ok((await p.inputValue('#an-text')).includes('@Sara Ahmed'), 'selected person inserted as @Sara Ahmed');
  await p.keyboard.type('and @sar', { delay: 20 }); await W(200);
  ok(!(await p.$('.men-pop [data-v="u-sara"]')), 'an already-mentioned person is not offered twice');
  await p.keyboard.press('Escape'); await W();
  await save(null); A = await last();
  ok(A.style === 'note' && A.anchor.start === A.anchor.end && JSON.stringify(A.mentions) === '["u-sara"]', 'sticky note saved with its anchor and one mention');
  ok(await E(id => S.audit.some(e => e.action === 'User mentioned' && e.annId === id && (e.toIds || []).includes('u-sara')), A.id), 'audit: User mentioned, addressed to the mentioned user');
  ok(await E(() => mentionable().every(u => u.status === 'Active' && can(u, 'view'))), 'mention list only contains active users who can open content');
  const noteId = A.id;
  // reply with mention
  await p.click(`[data-an-card="${noteId}"] [data-act=an-reply]`); await W(); await p.click('#an-reply'); await p.keyboard.type('@mon', { delay: 20 }); await W(200); await p.keyboard.press('Enter'); await W(); await p.keyboard.type('can you check too?'); await p.click('[data-act=an-reply-save]'); await W(200);
  ok(await E(id => { const r = S.annotations.find(a => a.id === id).replies.slice(-1)[0]; return r && (r.mentions || []).includes('u-mona') && r.text.includes('@Mona Adel'); }, noteId), 'reply mentions selected with the keyboard');
  // ---- panel: search, type filter, mention filter, sort
  await p.fill('#an-q', 'confirm'); await W(200); ok((await p.locator('.an-card').count()) === 1, 'search filters the comments');
  await p.fill('#an-q', ''); await W(200);
  await p.selectOption('[data-anf=ft]', 'strike'); await W(); ok(await E(() => [...document.querySelectorAll('.an-card .an-n')].every(n => n.classList.contains('s-strike'))), 'filter by annotation type');
  await p.click('[data-act=an-fclear]'); await W();
  await p.selectOption('[data-anf=fm]', 'u-sara'); await W(); ok((await p.locator('.an-card').count()) === 1, 'filter by mentioned person'); await p.click('[data-act=an-fclear]'); await W();
  await p.selectOption('[data-anf=sort]', 'date'); await W(); ok(await E(() => { const ids = [...document.querySelectorAll('.an-card')].map(c => c.dataset.anCard); const ts = ids.map(id => S.annotations.find(a => a.id === id).ts); return ts.every((t, i) => !i || ts[i - 1] >= t); }), 'sort by newest');
  await p.selectOption('[data-anf=sort]', 'loc'); await W();
  // ---- undo / redo
  const n0 = await E(() => S.annotations.length);
  await sel('.an-text[data-an-target=body]', body.split(' ').slice(9, 11).join(' ')); await W(); await p.click('.an-tb [data-s=highlight]'); await save(''); const H = await last();
  await p.click('.page-head'); await p.keyboard.press('Control+z'); await W(200);
  ok(await E(([id, n]) => !S.annotations.some(a => a.id === id) && S.annotations.length === n, [H.id, n0]), 'Ctrl+Z undoes the new highlight');
  ok(await E(id => S.audit.some(e => e.action === 'Annotation deleted' && e.annId === id && e.next === 'Undo'), H.id), 'undo is audited');
  await p.keyboard.press('Control+Shift+z'); await W(200); ok(await E(id => S.annotations.some(a => a.id === id), H.id), 'Ctrl+Shift+Z redoes it');
  // ---- reference citation
  const ref = await E(() => { const r = refById(latest(modById('MOD-B-007')).refs[0]); return r.title.split(' ').slice(0, 2).join(' '); });
  await sel('.an-refs .an-text', ref); await W(); await p.click('.an-tb [data-s=comment]'); await save('Is this the latest publication?');
  A = await last(); ok(A.anchor.target.startsWith('ref:') && A.anchor.quote === ref, 'comment anchored to a specific citation');
  // ---- image: shapes, freehand, sticky note
  await E(() => { latest(modById('MOD-A-050')).status = 'Draft'; save(); }); await G('module', { id: 'MOD-A-050', tab: 'comments' }); await W(400);
  for (const [t, a, b2] of [['rect', [0.1, 0.1], [0.3, 0.3]], ['ellipse', [0.4, 0.2], [0.6, 0.4]], ['arrow', [0.7, 0.7], [0.85, 0.5]], ['ink', [0.2, 0.6], [0.4, 0.8]]]) {
    await p.click(`[data-act=an-tool][data-v=${t}]`); await W(); await drag('.an-frame .an-layer', a, b2, 8); await save(''); A = await last();
    ok(A.style === t && A.anchor.kind === 'shape' && A.anchor.shape === t && (t !== 'ink' || A.anchor.pts.length > 2), t + ' markup saved with its geometry');
  }
  ok((await p.locator('.an-frame .an-shape').count()) >= 4, 'shapes drawn over the image');
  await p.click('[data-act=an-tool][data-v=note]'); await W(); await p.locator('.an-frame .an-layer').scrollIntoViewIfNeeded(); const fr = await p.locator('.an-frame .an-layer').boundingBox(); await p.mouse.click(fr.x + fr.width * 0.5, fr.y + fr.height * 0.5); await W(200);
  await save('Logo clearance'); A = await last(); ok(A.anchor.kind === 'point' && Math.abs(A.anchor.x - 0.5) < 0.02, 'sticky note at the clicked point');
  await p.click('[data-act=an-tool][data-v=region]'); await W(); await drag('.an-frame .an-layer', [0.55, 0.05], [0.7, 0.2]); await p.click('[data-act=an-cancel]'); await W();
  ok(await E(() => !annUI().comp), 'Cancel after drawing discards the pending area');
  // ---- video frame markup at a timestamp
  await G('review', { id: 'MOD-B-020' }); await W(600);
  await p.click('[data-act=an-tool][data-v=rect]'); await W(); await E(() => { const v = document.querySelector('.an-scope video'); v.currentTime = 1.5; }); await W(400);
  await drag('.an-vlayer .an-layer', [0.2, 0.2], [0.5, 0.5]); await save('Text overlaps the logo'); A = await last();
  ok(A.anchor.kind === 'shape' && typeof A.anchor.t === 'number', 'video frame markup stores a timestamp (' + A.anchor.t + 's) and shape');
  ok(await p.isVisible(`.an-tl-m[data-an-tl="${A.id}"]`), 'timeline marker for the frame markup');
  // ---- PDF: insert at a text position, replace text, freehand on a page
  await E(() => { latest(modById('MOD-C-010')).status = 'Draft'; save(); }); await G('module', { id: 'MOD-C-010', tab: 'comments' });
  try { await p.waitForSelector('.pdf-tl span', { timeout: 90000 }); await W(300);
    const word = await E(() => [...document.querySelectorAll('.pdf-tl[data-page="1"] span')].map(s => s.textContent).find(t => t.trim().length > 8).trim());
    await sel('.pdf-tl[data-page="1"]', word.slice(0, 6)); await W(); await p.click('.an-tb [data-s=replace]'); await W(); await p.fill('#an-rep', 'Product C'); await save('Use the brand name'); A = await last();
    ok(A.anchor.kind === 'ptext' && A.style === 'replace' && A.anchor.rects.length > 0, 'PDF replace text anchored to the selected words');
    await sel('.pdf-tl[data-page="1"]', word.slice(0, 3), true); await W(); const pt = await E(() => [...document.querySelectorAll('.an-tb [data-s]')].map(b => b.dataset.s).join(','));
    ok(pt.startsWith('insert'), 'clicking in PDF text offers Insert text'); await p.click('.an-tb [data-s=insert]'); await p.fill('#an-rep', '(adults)'); await save(''); A = await last();
    ok(A.anchor.kind === 'ptext' && A.anchor.quote === '' && A.style === 'insert', 'PDF insertion point saved');
    await p.click('[data-act=an-tool][data-v=ink]'); await W(); await E(() => document.querySelector('.pdfr-page[data-page="1"]').scrollIntoView({ block: 'start' })); await W(200);
    await drag('.pdfr-page[data-page="1"] .an-layer', [0.6, 0.15], [0.8, 0.25], 10); await save(''); A = await last(); ok(A.anchor.kind === 'shape' && A.anchor.shape === 'ink' && A.anchor.page === 1, 'freehand on a PDF page');
    await p.click('[data-act=an-page][data-page="1"]'); await save('General note for page 1'); A = await last(); ok(A.anchor.kind === 'page', 'page-level comment without selecting text');
  } catch (e) { ok(false, 'PDF tools: ' + e.message.slice(0, 400)); }
  // ---- persistence after reload
  const before = await E(() => S.annotations.length); await p.reload(); await W(500); ok(await E(n => S.annotations.length === n, before), 'all annotations persist after reload (' + before + ')');
  // ---- comments survive the item moving to another step
  await G('review', { id: 'MOD-B-007' }); const cnt = await E(() => annsFor(modById('MOD-B-007'), 1).length);
  await E(() => { S.annotations.filter(a => a.objId === 'MOD-B-007').forEach(a => { a.status = 'resolved'; }); save(); render(); }); await W();
  await p.click('[data-act=decide][data-d=pass]'); await W(); await p.click('[data-act=decide-confirm]'); await W(300);
  ok(await E(n => annsFor(modById('MOD-B-007'), 1).length === n && modById('MOD-B-007').review.step === 1, cnt), 'comments kept when the module moves to the next step');
  // ---- notification for the mentioned user
  await login('sara.ahmed@saja.com'); ok(await E(() => notificationsFor(me()).some(e => e.action === 'User mentioned')), 'Sara is notified of the mention');
  await G('module', { id: 'MOD-B-007', tab: 'comments' }); await p.selectOption('[data-anf=fm]', 'me'); await W(); ok((await p.locator('.an-card').count()) >= 1, '“Mentions me” filter shows her mention');
  ok(!(await p.$(`[data-an-card="${noteId}"] [data-act=an-edit]`)), 'she cannot edit the administrator’s comment');
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
