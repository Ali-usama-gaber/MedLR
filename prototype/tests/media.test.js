const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const D = __dirname;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true }); const p = await ctx.newPage();
  const submitBtn = async () => { if (await p.evaluate(() => /^module-(new|edit)$/.test(UI.route.name) && UI.draft && UI.draft.step === 3 && !UI.draft.workflow)) { await p.click('[data-act=msel-open][data-id=d-wf]'); await p.waitForTimeout(80); await p.click('.wfp-opt'); await p.waitForTimeout(80); } await p.click('button[type=submit]'); };
  const flt = async (k, v) => { await p.click('[data-act=flt-open]'); await p.waitForTimeout(60); const el = await p.$('#fd-' + k); if ((await el.evaluate(e => e.tagName)) === 'SELECT') await p.selectOption('#fd-' + k, v); else await p.fill('#fd-' + k, v); await p.click('[data-act=flt-apply]'); await p.waitForTimeout(80); };
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/MedLR/prototype/dist/index.html');
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 120); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W());
  const pick = async (id, vals) => { await p.click(`[data-msel=${id}] .msel-add`); await W(60); for (const v of vals) { await p.click(`[data-msel=${id}] .msel-opt[data-v="${v}"]`); await W(40); } await p.keyboard.press('Escape'); await W(80); };
  await p.fill('#login-pass', 'pw'); await submitBtn(); await W(300);
  // 9 module types, grouped
  await G('module-new'); const groups = await E(() => [...document.querySelectorAll('.section-title')].map(x => x.textContent));
  const types = await E(() => [...document.querySelectorAll('[data-act=d-type] b')].map(x => x.textContent));
  ok(groups.includes('Content modules') && groups.includes('Media & document modules'), 'type picker grouped: Content / Media & document');
  ok(['Clinical Claim', 'Safety Statement', 'Headline', 'Supporting Evidence', 'CTA', 'Reference', 'Image', 'Video', 'PDF / Document'].every(t => types.includes(t)), 'all 9 module types available: ' + types.length);
  ok(await E(() => mtype('TY-REF').desc === 'Citation block' && kindOfType('TY-REF') === 'content'), 'Reference stays a content Citation block');
  // ---- IMAGE
  await p.click('[data-act=d-type][data-v=TY-IMAGE]'); await submitBtn(); await W();
  ok((await p.textContent('.wiz-head h2')).includes('Image & details') && await p.isVisible('label.upload'), 'form switches to image upload step');
  await submitBtn(); await W(); ok((await p.textContent('#content')).includes('Upload the image file'), 'cannot continue without a file');
  await p.setInputFiles('#d-file', D + '/upload.png'); await p.waitForFunction(() => UI.draft.media && UI.draft.media.fileId && !UI.draft.mediaBusy); await W(200);
  const im = await E(() => UI.draft.media); ok(im.width === 400 && im.height === 250 && im.algo === 'SHA-256' && im.checksum.length === 64, 'image read: 400×250, SHA-256 ' + im.checksum.slice(0, 10));
  ok(await p.isVisible('.file-card img') && await p.isVisible('.media-stage img.media-img'), 'file card + image preview shown');
  await p.fill('#d-title', 'Image — Test visual'); await p.fill('#d-body', 'Green frame illustration used in the test.');
  await submitBtn(); await W();
  await pick('d-products', ['P-A']); await p.selectOption('#d-aud', 'AU-CARD');
  await pick('d-markets', ['SA', 'AE']); await p.click('[data-act=d-toggle][data-k=channels][data-v="CH-EMAIL"]'); await submitBtn(); await W(); await submitBtn(); await W(); await submitBtn(); await W(300);
  const IMG = await E(() => UI.route.p.id); ok(/^MOD-A-/.test(IMG), 'image module saved ' + IMG);
  ok(await E(id => S.audit.some(e => e.objId === id && e.action === 'Media uploaded'), IMG), 'audit: Media uploaded');
  await p.click('[data-act=submit-open]'); await W(); const sm = await p.textContent('.modal');
  ok(await p.isDisabled('[data-act=submit-confirm]') && sm.includes('Source and usage rules') && sm.includes('source and usage rules'), 'media SOP blocks submission: source and usage rules missing'); await p.click('[data-act=modal-close]');
  await G('module-edit', { id: IMG }); await p.fill('#d-source', 'SAJA Brand team — internal artwork'); await p.fill('#d-usage', 'Email only. Do not crop.'); await W(400); await p.click('[data-act=wiz-save]'); await W(300);
  ok(await E(id => !validationIssues(modById(id), 'Module').length, IMG), 'after adding source and usage rules validation passes');
  await p.click('[data-act=submit-open]'); await W(); await p.click('[data-act=submit-confirm]'); await W();
  const approveAll = async id => { for (let i = 0; i < 8 && await E(id => !!modById(id).review, id); i++) { await G('review', { id }); if (await p.$('[data-act=sign]')) { await p.click('[data-act=sign]'); await W(); await p.click('label.choice'); await W(); await p.fill('#m-pass', 'pw'); await p.click('[data-act=sign-confirm]'); } else { await p.click('[data-act=decide][data-d=pass]'); await W(); await p.click('[data-act=decide-confirm]'); } await W(200); await E(() => { UI.modal = null; render(); }); } };
  await G('review', { id: IMG }); ok(await p.isVisible('.an-scope img') && (await p.textContent('#content')).includes('Do not crop'), 'reviewer sees the image and its usage rules');
  await approveAll(IMG); ok(await E(id => statusOf(modById(id)) === 'Approved', IMG), 'image module approved through the workflow');
  // library + filters
  await E(() => { UI.f = {}; }); await G('library'); await flt('lcat', 'media'); await W();
  const lib = await p.textContent('.lib-tbl'); ok(lib.includes('Image — Test visual') && lib.includes('Video') === false && !lib.includes('Clinical Claim A'), 'library category filter shows approved media only');
  ok(await p.isVisible(`tr:has-text("Image — Test visual") .mthumb img`), 'library row shows the image thumbnail');
  await E(() => { UI.f = {}; }); await G('modules'); await flt('mq', 'upload.png'); await W(); ok((await p.textContent('#content')).includes('Image — Test visual'), 'module search finds the file name');
  // cover letter
  await G('cover', { id: IMG, k: 'Module', v: '1' }); const cv = await p.textContent('.letter'); ok(cv.includes('Approved image') && cv.includes(im.checksum) && cv.includes('Do not crop'), 'cover letter carries the approved file checksum and usage rules');
  // new version replaces the file
  await G('module', { id: IMG }); await p.click('[data-act=new-version]'); await W(); await p.fill('#d-reason', 'New artwork colour.');
  await p.setInputFiles('#d-file', D + '/upload2.png'); await p.waitForFunction(() => UI.draft.media && UI.draft.media.name === 'upload2.png' && !UI.draft.mediaBusy); await W(200); await p.click('[data-act=wiz-save]'); await W(300);
  ok(await E(id => { const m = modById(id); return m.versions[0].media.name === 'upload.png' && m.versions[1].media.name === 'upload2.png' && m.versions[0].media.checksum !== m.versions[1].media.checksum; }, IMG), 'v2 holds the new file, v1 keeps the approved file');
  ok(await E(id => S.audit.some(e => e.objId === id && e.action === 'Media replaced' && /upload\.png/.test(e.prev) && /upload2\.png/.test(e.next)), IMG), 'audit: Media replaced upload.png → upload2.png');
  await G('module', { id: IMG, tab: 'versions' }); const vh = await p.textContent('.list-tbl'); ok(vh.includes('upload.png') && vh.includes('upload2.png'), 'version history lists the file of each version');
  ok(await E(id => liveMeta(modById(id)) && live(modById(id)).media.name === 'upload.png', IMG), 'library keeps serving the approved v1 file while v2 is a draft');
  // ---- VIDEO
  await E(() => { UI.draft = null; }); await G('module-new'); await p.click('[data-act=d-type][data-v=TY-VIDEO]'); await submitBtn(); await W();
  await p.setInputFiles('#d-file', D + '/upload.webm'); await p.waitForFunction(() => UI.draft.media && !UI.draft.mediaBusy, null, { timeout: 15000 }); await W(300);
  const vd = await E(() => UI.draft.media); ok(vd.duration === 6 && vd.width === 640 && /WebM/.test(vd.format), 'video read: duration ' + vd.duration + ' s, ' + vd.format);
  ok(await p.isVisible('.media-stage video') && (await p.textContent('#content')).includes('0:06'), 'video preview and duration shown');
  await p.setInputFiles('#d-file', D + '/upload.png'); await W(300); ok(await E(() => UI.draft.media.name === 'upload.webm'), 'wrong file type rejected for a video module');
  // ---- PDF
  await E(() => { UI.draft = null; }); await G('module-new'); await p.click('[data-act=d-type][data-v=TY-DOC]'); await submitBtn(); await W();
  await p.setInputFiles('#d-file', D + '/upload.pdf'); await p.waitForFunction(() => UI.draft.media && !UI.draft.mediaBusy, null, { timeout: 20000 }); await W(300);
  const pd = await E(() => UI.draft.media); ok(pd.pages === 2 && pd.mime === 'application/pdf', 'PDF read: ' + pd.pages + ' pages');
  ok(await p.isVisible('.file-card .fc-badge'), 'PDF file card with PDF badge');
  // ---- asset assembly uses media modules
  await G('assemble', { id: 'AST-105' }); await E(() => { const a = assetById('AST-105'); a.products = ['P-A']; a.markets = ['SA']; render(); }); await W();
  await p.click('[data-act=blk-add][data-module="MOD-A-050"]'); await W();
  ok(await p.isVisible('.block-media img') && (await p.textContent('.sheet')).includes('Usage rules'), 'asset block shows the image and its usage rules');
  // ---- module types are managed configuration
  await G('moduletypes'); await p.click('[data-act=cfg-new][data-k=moduletypes]'); await W(); await p.fill('#cf-name', 'Infographic'); await p.selectOption('#cf-kind', 'image'); await p.fill('#cf-desc', 'Data visual'); await p.click('[data-act=cfg-save]'); await W();
  await G('module-new'); ok(await E(() => { const t = S.moduleTypes.find(x => x.name === 'Infographic'); return t && t.kind === 'image'; }) && await p.isVisible('[data-act=d-type] >> text=Infographic'), 'admin-created Infographic (image kind) appears in the create form');
  await G('moduletypes'); const tid = await E(() => S.moduleTypes.find(x => x.name === 'Infographic').id); await p.click(`[data-act=cfg-edit][data-id="${tid}"]`); await W(); ok(!(await p.$('#cf-kind')), 'kind is locked after creation'); await p.click('[data-act=modal-close]');
  // reports
  await G('reports', { tab: 'content' }); const rc = await p.textContent('#content'); ok(rc.includes('Media & document modules') && rc.includes('PDF / Document'), 'reports split modules by category');
  // seeded media
  await G('module', { id: 'MOD-B-020' }); ok(await p.isVisible('.media-stage video'), 'seeded video module previews');
  // persistence across reload (IndexedDB)
  await p.reload(); await W(800); await G('module', { id: IMG }); await W(800); ok(await E(() => { const i = document.querySelector('.media-stage img'); return !!i && i.src.startsWith('blob:'); }), 'uploaded file survives a page reload');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
