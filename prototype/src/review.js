/* ===== Review canvas: one annotation model for every module type and asset =====
   Every comment is an annotation record in S.annotations:
   { id, objType, objId, version, cycle, step, stepIdx, anchor, style, text, replacement, author, role, ts, status, replies[] }
   anchor.kind decides positioning:
     text    — { target: 'body' | 'block:<id>', start, end, quote }      exact characters of the text
     ptext   — { target: 'pdf', page, quote, rects:[{x,y,w,h}] }           text selected on a PDF page (normalised rects)
     region  — { target: 'file' | 'pdf', page?, x, y, w, h }              area of an image or PDF page (0–1)
     time    — { target: 'file', t }                                      video timestamp in seconds
     block   — { target: 'block:<id>', label }                            a whole asset block
     general — {}                                                         the item as a whole */
const ANN_STYLES = { highlight: ['Highlight', 'highlighter'], underline: ['Underline', 'underline'], strike: ['Strikethrough', 'strike'], comment: ['Comment', 'message'], replace: ['Suggest replacement', 'replace'] };
const annUI = () => UI.an || (UI.an = { flt: 'all', focus: null, sel: null, comp: null, edit: null, reply: null });
const annsFor = (obj, v) => S.annotations.filter(a => a.objType === kindOf(obj) && a.objId === obj.id && a.version === v).sort((x, y) => x.ts - y.ts);
const annNo = (obj, a) => annsFor(obj, a.version).indexOf(a) + 1;
// Open findings raised by reviewers (owner notes never block an approval).
const blockingAnns = obj => annsFor(obj, latest(obj).v).filter(a => a.status === 'open' && a.author !== obj.owner);
const annIsMine = a => a.author === me().id;
const canManageAnn = a => annIsMine(a) || can(me(), 'manage_comments');
function canAnnotate(obj) { const u = me(); return isAdmin(u) || (obj.review && canActOn(u, obj)) || canEditObj(u, obj) || canAmendObj(u, obj); }
const canDiscuss = (obj, a) => canAnnotate(obj) || (a && a.author === me().id) || S.annotations.some(x => x.objId === obj.id && x.author === me().id);
function annCtx(obj) {
  const c = curCycle(obj) || latest(obj).cycles.slice(-1)[0]; const st = curStep(obj);
  return { cycle: c ? c.n : 0, stepIdx: obj.review ? obj.review.step : null, step: st ? stepTag(st) : obj.resume ? 'Amendment' : statusOf(obj) };
}
function annLabel(a) {
  const x = a.anchor || {};
  if (x.kind === 'text' || x.kind === 'ptext') return (x.page ? 'Page ' + x.page + ' · ' : '') + '“' + (x.quote.length > 60 ? x.quote.slice(0, 57) + '…' : x.quote) + '”';
  if (x.kind === 'time') return 'At ' + fmtSecs(x.t);
  if (x.kind === 'region') return (x.page ? 'Page ' + x.page + ' · ' : '') + 'Area ' + Math.round(x.w * 100) + '×' + Math.round(x.h * 100) + '%';
  if (x.kind === 'block') return 'Block · ' + (x.label || '');
  if (x.kind === 'page') return 'Page ' + x.page;
  return 'General comment';
}
function annWhere(a) { return annLabel(a); }
function annLog(action, obj, a, extra = {}) { log(action, kindOf(obj), obj, a.version, { cycle: a.cycle, annId: a.id, note: annLabel(a), ...extra }); }

/* --- text with anchored marks --- */
function annText(obj, v, target, text, editable) {
  const U = annUI(); const list = annsFor(obj, v).filter(a => a.anchor.kind === 'text' && a.anchor.target === target && text.slice(a.anchor.start, a.anchor.end) === a.anchor.quote);
  const pend = U.sel && U.sel.objId === obj.id && U.sel.anchor.kind === 'text' && U.sel.anchor.target === target ? U.sel.anchor : U.comp && U.comp.objId === obj.id && U.comp.anchor.kind === 'text' && U.comp.anchor.target === target ? U.comp.anchor : null;
  const pts = new Set([0, text.length]); list.forEach(a => { pts.add(a.anchor.start); pts.add(a.anchor.end); }); if (pend) { pts.add(pend.start); pts.add(pend.end); }
  const P = [...pts].sort((a, b) => a - b); let out = '';
  for (let i = 0; i < P.length - 1; i++) {
    const s = P[i], e = P[i + 1]; const seg = text.slice(s, e); const cov = list.filter(a => a.anchor.start <= s && a.anchor.end >= e); const isP = pend && pend.start <= s && pend.end >= e;
    if (!cov.length && !isP) { out += esc(seg); continue; }
    const top = cov.find(a => a.id === U.focus) || cov[cov.length - 1];
    const cls = [...new Set(cov.map(a => 'an-' + a.style + (a.status === 'resolved' ? '-res' : '')))].join(' ');
    const rep = cov.find(a => a.style === 'replace' && a.anchor.end === e && a.status !== 'resolved');
    const first = cov.filter(a => a.anchor.start === s);
    out += `<mark class="an ${cls} ${isP ? 'an-pend' : ''} ${cov.some(a => a.id === U.focus) ? 'an-focus' : ''}" ${top ? `data-an="${top.id}" data-act="an-focus" data-id="${top.id}"` : ''} ${first.length ? `data-n="${first.map(a => annNo(obj, a)).join(',')}"` : ''} ${rep ? `data-rep="${esc(rep.replacement)}"` : ''}>${esc(seg)}</mark>`;
  }
  return `<span class="an-text" data-an-target="${esc(target)}" ${editable ? 'data-an-sel="1"' : ''}>${out}</span>`;
}

/* --- region boxes over an image or a PDF page --- */
function annRegions(obj, v, target, page, editable) {
  const U = annUI(); const list = annsFor(obj, v).filter(a => (a.anchor.kind === 'region' || a.anchor.kind === 'ptext') && a.anchor.target === target && (a.anchor.page || 0) === (page || 0));
  const box = (a, r, i) => `<span class="an-box ${a.anchor.kind === 'ptext' ? 'an-ptext an-' + a.style : ''} ${a.status === 'resolved' ? 'res' : ''} ${U.focus === a.id ? 'an-focus' : ''}" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%" data-an="${a.id}" data-act="an-focus" data-id="${a.id}" ${a.anchor.kind === 'region' && editable && canManageAnn(a) ? 'data-an-move="1"' : ''}>${i === 0 ? `<i class="an-pin">${annNo(obj, a)}</i>` : ''}</span>`;
  const pend = U.comp && U.comp.objId === obj.id && ['region', 'ptext'].includes(U.comp.anchor.kind) && U.comp.anchor.target === target && (U.comp.anchor.page || 0) === (page || 0) ? U.comp.anchor : null;
  const pendRects = pend ? (pend.rects || [pend]) : [];
  return `<div class="an-layer ${editable ? 'draw' : ''}" data-an-region="${target}" data-page="${page || 0}">${list.map(a => (a.anchor.rects || [a.anchor]).map((r, i) => box(a, r, i)).join('')).join('')}${pendRects.map(r => `<span class="an-box pend" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%"></span>`).join('')}</div>`;
}

/* --- PDF in review: every page with selectable text and area comments --- */
const PDFR = {};
async function pdfReviewLoad(id, url) {
  const lib = await loadPdfJs(); const doc = await lib.getDocument(url).promise; const pages = [];
  for (let i = 1; i <= Math.min(doc.numPages, 12); i++) { const pg = await doc.getPage(i); const vp = pg.getViewport({ scale: 1.6 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; pages.push({ pg, img: c.toDataURL('image/jpeg', 0.86), w: vp.width / 1.6, h: vp.height / 1.6, tc: await pg.getTextContent() }); }
  return { n: doc.numPages, pages };
}
function pdfReview(obj, v, md, editable) {
  const url = mediaUrl(md.fileId); const R = PDFR[md.fileId];
  if (!url || url === 'missing') return mediaView(md);
  if (!R) return `<div class="media-empty" data-pdfr="${md.fileId}" data-url="${url}">${icon('file')}<span>Rendering PDF for review…</span></div>`;
  if (R.failed) return `${mediaView(md)}<p class="muted" style="font-size:12.5px;margin-top:8px">${icon('alert', 'sm')} The PDF could not be rendered for markup in this browser. Use page or general comments.</p>${editable ? `<div class="row" style="gap:6px;margin-top:8px">${Array.from({ length: md.pages || 1 }, (_, i) => `<button class="btn sm" data-act="an-page" data-page="${i + 1}">Comment on page ${i + 1}</button>`).join('')}</div>` : ''}`;
  if (R.loading) return `<div class="media-empty">${icon('clock')}<span>Rendering PDF for review…</span></div>`;
  return `<div class="pdfr">${R.pages.map((p, i) => `<figure class="pdfr-page" data-page="${i + 1}" style="aspect-ratio:${p.w}/${p.h}"><img src="${p.img}" alt="Page ${i + 1} of ${esc(md.name)}" draggable="false"><div class="textLayer pdf-tl" data-file="${md.fileId}" data-page="${i + 1}" data-an-target="pdf" ${editable ? 'data-an-sel="1"' : ''}></div>${annRegions(obj, v, 'pdf', i + 1, editable)}<figcaption>Page ${i + 1} of ${R.n}</figcaption></figure>`).join('')}${R.n > R.pages.length ? `<p class="muted" style="text-align:center;font-size:12px">${R.n - R.pages.length} more pages — open the PDF to read them all.</p>` : ''}</div>`;
}
function hydrateReview() {
  document.querySelectorAll('[data-pdfr]').forEach(el => { const id = el.dataset.pdfr; if (PDFR[id]) return; PDFR[id] = { loading: true };
    const url = el.dataset.url; const attempt = n => pdfReviewLoad(id, url).then(r => { PDFR[id] = r; renderSoon(); }, () => n < 3 ? setTimeout(() => attempt(n + 1), 1500 * n) : (PDFR[id] = { failed: true }, renderSoon())); attempt(1); });
  document.querySelectorAll('.pdf-tl').forEach(el => { if (el.dataset.done) return; const R = PDFR[el.dataset.file]; if (!R || !R.pages) return; const P = R.pages[+el.dataset.page - 1]; const w = el.parentElement.clientWidth; if (!w) return;
    const vp = P.pg.getViewport({ scale: w / P.w }); el.dataset.done = '1'; el.style.setProperty('--scale-factor', vp.scale); el.style.width = vp.width + 'px'; el.style.height = vp.height + 'px';
    try { window.pdfjsLib.renderTextLayer({ textContentSource: P.tc, container: el, viewport: vp, textDivs: [] }); } catch (e) { /* text selection unavailable; area comments still work */ } });
  const U = annUI();
  if (U.goto) { const id = U.goto; U.goto = null; const el = document.querySelector(`[data-an="${id}"]`); const a = S.annotations.find(x => x.id === id);
    if (a && a.anchor.kind === 'time') { const vd = document.querySelector('.an-scope video'); if (vd) { try { vd.currentTime = a.anchor.t; } catch (e) { /* not seekable yet */ } } }
    const tgt = el || document.querySelector(`[data-an-card="${id}"]`); if (tgt) { tgt.scrollIntoView({ block: 'center', behavior: 'smooth' }); document.querySelectorAll(`[data-an="${id}"]`).forEach(x => { x.classList.remove('an-flash'); void x.offsetWidth; x.classList.add('an-flash'); }); }
    const card = document.querySelector(`[data-an-card="${id}"]`); if (card && el) card.scrollIntoView({ block: 'nearest' }); }
}

/* --- the reviewable content of a module or asset --- */
function reviewCanvas(obj, editable) {
  const kind = kindOf(obj); const v = latest(obj); const U = annUI();
  const tb = U.sel && U.sel.objId === obj.id ? `<div class="an-tb" style="left:${U.sel.x}px;top:${U.sel.y}px" role="toolbar" aria-label="Annotate selection">${(U.sel.anchor.kind === 'region' ? ['comment'] : U.sel.anchor.kind === 'ptext' ? ['highlight', 'underline', 'strike', 'comment'] : Object.keys(ANN_STYLES)).map(s => `<button type="button" data-act="an-style" data-s="${s}" title="${ANN_STYLES[s][0]}" aria-label="${ANN_STYLES[s][0]}">${icon(ANN_STYLES[s][1], 'sm')}<span>${ANN_STYLES[s][0].split(' ')[0]}</span></button>`).join('')}<button type="button" class="x" data-act="an-cancel" aria-label="Cancel">${icon('x', 'sm')}</button></div>` : '';
  let body;
  if (kind === 'Asset') body = `<div class="sheet">${obj.blocks.map((b, i) => assetBlockReview(obj, v, b, i, editable)).join('')}<div class="sheet-foot">${obj.disclaimer ? esc(obj.disclaimer) : 'For healthcare professionals in ' + esc(marketsTxt(obj.markets)) + '.'}</div></div>`;
  else if (isMediaType(obj.type)) {
    const md = v.media; const k = mediaKindOf(md);
    if (k === 'image') body = `<div class="an-media"><div class="an-frame">${mediaView(md)}${annRegions(obj, v.v, 'file', 0, editable)}</div></div>`;
    else if (k === 'video') { const ts = annsFor(obj, v.v).filter(a => a.anchor.kind === 'time'); const dur = md.duration || Math.max(1, ...ts.map(a => a.anchor.t + 1));
      body = `<div class="an-media">${mediaView(md)}<div class="an-tl" aria-label="Comment timeline"><span class="an-tl-track">${ts.map(a => `<button type="button" class="an-tl-m ${a.status === 'resolved' ? 'res' : ''} ${U.focus === a.id ? 'an-focus' : ''}" style="left:${Math.min(100, 100 * a.anchor.t / dur)}%" data-an="${a.id}" data-act="an-go" data-id="${a.id}" title="${esc(fmtSecs(a.anchor.t) + ' — ' + a.text)}">${annNo(obj, a)}</button>`).join('')}</span><span class="an-tl-l"><span>0:00</span><span>${fmtSecs(dur)}</span></span></div>${editable ? `<div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" data-act="an-time">${icon('message', 'sm')}Comment at current time</button><span class="muted" style="font-size:12px">Pause the video where the comment applies.</span></div>` : ''}</div>`; }
    else body = md ? pdfReview(obj, v.v, md, editable) : mediaView(md);
    body += `<p class="media-desc">${esc(v.body)}</p>`;
  } else body = `<p class="claim ${mtype(obj.type).tone === 'headline' ? 'is-headline' : ''}">${annText(obj, v.v, 'body', v.body, editable)}</p>`;
  return `<div class="an-scope ${editable ? 'editable' : ''}">${body}${tb}</div>${editable ? `<p class="an-hint">${icon('pointer', 'sm')}${kind === 'Asset' ? 'Select text in new content to mark it up, or comment on any block.' : isMediaType(obj.type) ? (mediaKindOf(v.media) === 'video' ? 'Pause and comment at a timestamp, or add a general comment.' : 'Drag on the ' + (mediaKindOf(v.media) === 'image' ? 'image' : 'page') + ' to comment on an area' + (mediaKindOf(v.media) === 'image' ? '' : ', or select text to mark it up') + '.') : 'Select text to highlight, underline, strike through, comment or suggest a replacement.'}</p>` : ''}`;
}
function assetBlockReview(a, v, b, i, editable) {
  const tgt = 'block:' + (b.id || i); const n = annsFor(a, v.v).filter(x => x.anchor.target === tgt).length;
  const btnC = editable ? `<button type="button" class="btn ghost sm an-bc" data-act="an-block" data-t="${esc(tgt)}" data-l="${esc(b.kind === 'new' ? b.label || 'New content' : (modById(b.moduleId) || {}).id || 'Module')}">${icon('message', 'sm')}Comment${n ? ' · ' + n : ''}</button>` : n ? `<span class="chip plain">${n} comment${n > 1 ? 's' : ''}</span>` : '';
  if (b.kind === 'new') return `<div class="block new" data-an="${esc(tgt)}"><div class="meta">${icon('edit', 'sm')}${b.approved ? 'Text approved in this asset' : 'New content · requires review'}<span class="grow"></span>${btnC}</div><div class="txt">${annText(a, v.v, tgt, b.text, editable)}</div></div>`;
  const m = modById(b.moduleId); if (!m) return ''; const mv = verOf(m, b.v) || latest(m);
  return `<div class="block approved" data-an="${esc(tgt)}"><div class="meta">${icon('lock', 'sm')}Approved module · locked · <span class="mono" style="text-transform:none">${m.id} v${b.v}</span><span class="grow"></span>${btnC}</div>${mv.media ? `<div class="block-media">${mediaView(mv.media)}</div>` : `<div class="txt">${esc(mv.body)}</div>`}</div>`;
}

/* --- comments panel --- */
function commentsPanel(obj, editable) {
  const U = annUI(); const v = latest(obj).v; const all = annsFor(obj, v); const open = all.filter(a => a.status === 'open');
  const list = all.filter(a => U.flt === 'all' || a.status === U.flt);
  const comp = U.comp && U.comp.objId === obj.id ? U.comp : null; const blocking = blockingAnns(obj).length;
  const composer = comp ? `<div class="an-comp"><div class="an-comp-h">${icon(ANN_STYLES[comp.style][1], 'sm')}<b>${ANN_STYLES[comp.style][0]}</b><span class="muted">${esc(annLabel({ anchor: comp.anchor }))}</span></div>
    ${comp.style === 'replace' ? `<input class="input" id="an-rep" placeholder="Replacement text" value="${esc(comp.replacement || '')}">` : ''}
    <textarea class="textarea" id="an-text" placeholder="${comp.style === 'comment' || comp.style === 'replace' ? 'Comment (required)' : 'Add a note (optional)'}">${esc(comp.text || '')}</textarea>${comp.err ? `<span class="err">${esc(comp.err)}</span>` : ''}
    <div class="row" style="gap:8px;justify-content:flex-end">${btn('Cancel', 'an-cancel', 'ghost sm')}${btn('Save', 'an-save', 'primary sm', '', 'check')}</div></div>` : '';
  const card = a => { const x = user(a.author); const mine = canManageAnn(a); const disc = canDiscuss(obj, a);
    const reply = U.reply === a.id ? `<div class="an-reply-f"><textarea class="textarea" id="an-reply" placeholder="Reply…"></textarea><div class="row" style="gap:6px;justify-content:flex-end">${btn('Cancel', 'an-reply-x', 'ghost sm')}${btn('Reply', 'an-reply-save', 'primary sm', `data-id="${a.id}"`)}</div></div>` : '';
    const body = U.edit === a.id ? `<div class="an-reply-f">${a.style === 'replace' ? `<input class="input" id="an-erep" value="${esc(a.replacement)}">` : ''}<textarea class="textarea" id="an-etext">${esc(a.text)}</textarea><div class="row" style="gap:6px;justify-content:flex-end">${btn('Cancel', 'an-edit-x', 'ghost sm')}${btn('Save', 'an-edit-save', 'primary sm', `data-id="${a.id}"`)}</div></div>` : `${a.text ? `<p class="an-txt">${esc(a.text)}</p>` : ''}${a.style === 'replace' ? `<p class="an-repl"><span class="muted">Replace with</span> <b>${esc(a.replacement)}</b></p>` : ''}`;
    return `<article class="an-card ${a.status} ${U.focus === a.id ? 'focus' : ''}" data-an-card="${a.id}">
      <div class="an-h"><span class="an-n s-${a.style}">${annNo(obj, a)}</span>${avatar(x, 'sm')}<span class="an-who"><b>${esc(x.name)}</b><span>${esc(a.role)} · ${fmtDT(a.ts)}</span></span><span class="grow"></span>${a.status === 'resolved' ? '<span class="chip ok">Resolved</span>' : '<span class="chip warn">Open</span>'}</div>
      <button type="button" class="an-loc" data-act="an-go" data-id="${a.id}" title="Go to location">${icon('pointer', 'sm')}<span>${esc(annLabel(a))}</span><span class="muted">· ${esc(ANN_STYLES[a.style][0])} · v${a.version} · cycle ${a.cycle || '—'}${a.step ? ' · ' + esc(a.step) : ''}</span></button>
      ${body}
      ${a.replies.map(r => `<div class="reply"><b>${esc(user(r.author).name)}</b> <span class="muted" style="font-size:11.5px">${esc(r.role || roleLabel(user(r.author)))} · ${fmtDT(r.ts)}</span><p>${esc(r.text)}</p></div>`).join('')}
      ${reply}
      <div class="an-f">${disc ? `<button type="button" data-act="an-reply" data-id="${a.id}">${icon('undo', 'sm')}Reply</button><button type="button" data-act="an-status" data-id="${a.id}">${icon(a.status === 'open' ? 'check' : 'refresh', 'sm')}${a.status === 'open' ? 'Resolve' : 'Reopen'}</button>` : ''}${mine ? `<button type="button" data-act="an-edit" data-id="${a.id}">${icon('edit', 'sm')}Edit</button><button type="button" data-act="an-del" data-id="${a.id}">${icon('trash', 'sm')}Delete</button>` : ''}</div></article>`; };
  return `<section class="panel an-panel"><div class="panel-head"><h3>${icon('message', 'sm')} Comments</h3><span class="chip ${open.length ? 'warn' : 'plain'}">${open.length} open</span><span class="grow"></span><div class="seg sm">${[['all', 'All ' + all.length], ['open', 'Open'], ['resolved', 'Resolved']].map(f => `<button type="button" class="${U.flt === f[0] ? 'on' : ''}" data-act="an-flt" data-v="${f[0]}">${f[1]}</button>`).join('')}</div></div>
    ${blocking && S.settings.blockOnOpenComments && obj.review ? `<div class="an-block">${icon('lock', 'sm')}${blocking} open reviewer comment${blocking > 1 ? 's' : ''} — resolve before approving.</div>` : ''}
    <div class="an-body">${composer}${editable && !comp ? `<div class="an-gen"><textarea class="textarea" id="an-general" placeholder="Add a general comment on v${v}…"></textarea><div class="row" style="justify-content:flex-end">${btn('Comment', 'an-general', 'sm', '', 'message')}</div></div>` : ''}
    ${list.length ? list.map(card).join('') : `<p class="muted an-empty">${all.length ? 'No ' + U.flt + ' comments.' : editable ? 'No comments yet. Select text, drag an area or add a general comment.' : 'No comments on this version.'}</p>`}</div></section>`;
}

/* --- creating, editing and tracking annotations --- */
function annCreate(obj, anchor, style, text, replacement) {
  const u = me(); const c = annCtx(obj);
  const a = { id: uid('an'), objType: kindOf(obj), objId: obj.id, version: latest(obj).v, cycle: c.cycle, step: c.step, stepIdx: c.stepIdx, anchor, style, text: text || '', replacement: replacement || '', author: u.id, role: roleLabel(u), ts: Date.now(), status: 'open', replies: [] };
  S.annotations.push(a); annLog('Comment created', obj, a, { next: (ANN_STYLES[style][0]) + (text ? ': ' + text : '') + (replacement ? ' → ' + replacement : '') });
  if (obj.review) obj.review.startedBy = obj.review.startedBy || u.id;
  save(); return a;
}
const annObj = a => objById(a.objType, a.objId);
const ANN_ACT = {
  'an-style': el => { const U = annUI(); if (!U.sel) return; U.comp = { objId: U.sel.objId, anchor: U.sel.anchor, style: el.dataset.s }; U.sel = null; window.getSelection && window.getSelection().removeAllRanges(); render(); setTimeout(() => { const t = document.getElementById(U.comp && U.comp.style === 'replace' ? 'an-rep' : 'an-text'); t && t.focus(); }, 30); },
  'an-cancel': () => { const U = annUI(); U.sel = null; U.comp = null; render(); },
  'an-save': () => { const U = annUI(); const C = U.comp; const obj = modById(C.objId) || assetById(C.objId); const text = (document.getElementById('an-text').value || '').trim(); const rep = C.style === 'replace' ? (document.getElementById('an-rep').value || '').trim() : '';
    if ((C.style === 'comment' || C.style === 'replace') && !text) { C.err = 'Write the comment.'; C.replacement = rep; render(); return; }
    if (C.style === 'replace' && !rep) { C.err = 'Enter the replacement text.'; C.text = text; render(); return; }
    const a = annCreate(obj, C.anchor, C.style, text, rep); U.comp = null; U.focus = a.id; render(); toast('Comment ' + annNo(obj, a) + ' added'); },
  'an-general': () => { const t = (document.getElementById('an-general').value || '').trim(); if (!t) { toast('Write a comment first'); return; } const obj = reviewObj(); const a = annCreate(obj, { kind: 'general' }, 'comment', t); annUI().focus = a.id; render(); toast('Comment added'); },
  'an-block': el => { const obj = reviewObj(); annUI().comp = { objId: obj.id, anchor: { kind: 'block', target: el.dataset.t, label: el.dataset.l }, style: 'comment' }; render(); setTimeout(() => { const t = document.getElementById('an-text'); t && t.focus(); }, 30); },
  'an-page': el => { const obj = reviewObj(); annUI().comp = { objId: obj.id, anchor: { kind: 'page', page: +el.dataset.page }, style: 'comment' }; render(); },
  'an-time': () => { const obj = reviewObj(); const vd = document.querySelector('.an-scope video'); const t = vd ? Math.round(vd.currentTime * 10) / 10 : 0; if (vd) vd.pause(); annUI().comp = { objId: obj.id, anchor: { kind: 'time', target: 'file', t }, style: 'comment' }; render(); setTimeout(() => { const x = document.getElementById('an-text'); x && x.focus(); }, 30); },
  'an-focus': el => { const U = annUI(); U.focus = el.dataset.id; render(); const c = document.querySelector(`[data-an-card="${el.dataset.id}"]`); c && c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
  'an-go': el => { const U = annUI(); U.focus = el.dataset.id; U.goto = el.dataset.id; render(); },
  'an-flt': el => { annUI().flt = el.dataset.v; render(); },
  'an-reply': el => { annUI().reply = el.dataset.id; render(); setTimeout(() => { const t = document.getElementById('an-reply'); t && t.focus(); }, 30); },
  'an-reply-x': () => { annUI().reply = null; render(); },
  'an-reply-save': el => { const a = S.annotations.find(x => x.id === el.dataset.id); const t = (document.getElementById('an-reply').value || '').trim(); if (!t) return; const u = me();
    a.replies.push({ id: uid('r'), author: u.id, role: roleLabel(u), ts: Date.now(), text: t }); annLog('Reply added', annObj(a), a, { next: t }); annUI().reply = null; save(); render(); },
  'an-status': el => { const a = S.annotations.find(x => x.id === el.dataset.id); const to = a.status === 'open' ? 'resolved' : 'open'; a.status = to; a.resolvedBy = to === 'resolved' ? me().id : null; a.resolvedAt = to === 'resolved' ? Date.now() : null;
    annLog(to === 'resolved' ? 'Comment resolved' : 'Comment reopened', annObj(a), a, { prev: to === 'resolved' ? 'Open' : 'Resolved', next: to === 'resolved' ? 'Resolved' : 'Open' }); save(); render(); },
  'an-edit': el => { annUI().edit = el.dataset.id; render(); },
  'an-edit-x': () => { annUI().edit = null; render(); },
  'an-edit-save': el => { const a = S.annotations.find(x => x.id === el.dataset.id); if (!canManageAnn(a)) return; const t = (document.getElementById('an-etext').value || '').trim(); const r = document.getElementById('an-erep'); const prev = a.text + (a.replacement ? ' → ' + a.replacement : '');
    a.text = t; if (r) a.replacement = r.value.trim(); a.editedAt = Date.now(); annLog('Comment edited', annObj(a), a, { prev, next: a.text + (a.replacement ? ' → ' + a.replacement : '') }); annUI().edit = null; save(); render(); },
  'an-del': el => { const i = S.annotations.findIndex(x => x.id === el.dataset.id); const a = S.annotations[i]; if (!canManageAnn(a)) { toast('You can delete only your own comments'); return; }
    if (!confirm('Delete this comment and its replies? The deletion is recorded in the audit trail.')) return;
    S.annotations.splice(i, 1); annLog('Annotation deleted', annObj(a), a, { prev: a.text || ANN_STYLES[a.style][0] }); save(); render(); toast('Comment deleted'); }
};
// The item on the current review / detail page.
function reviewObj() { const r = UI.route; return r.name === 'asset-review' || r.name === 'asset' ? assetById(r.p.id) : modById(r.p.id); }

/* text selection → floating toolbar */
document.addEventListener('mouseup', ev => {
  const box = ev.target.closest && ev.target.closest('[data-an-sel]'); if (!box || annDrag) return;
  setTimeout(() => {
    const s = window.getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return; const r = s.getRangeAt(0); if (!box.contains(r.commonAncestorContainer)) return;
    const quote = r.toString(); if (!quote.trim()) return; const scope = box.closest('.an-scope'); if (!scope) return;
    const rc = r.getBoundingClientRect(), sc = scope.getBoundingClientRect(); const obj = reviewObj(); let anchor;
    if (box.classList.contains('pdf-tl')) { const pr = box.getBoundingClientRect(); const rects = [...r.getClientRects()].filter(x => x.width > 1).map(x => ({ x: (x.left - pr.left) / pr.width, y: (x.top - pr.top) / pr.height, w: x.width / pr.width, h: x.height / pr.height }));
      anchor = { kind: 'ptext', target: 'pdf', page: +box.dataset.page, quote: quote.replace(/\s+/g, ' ').trim(), rects }; }
    else { const pre = document.createRange(); pre.selectNodeContents(box); pre.setEnd(r.startContainer, r.startOffset); const start = pre.toString().length; anchor = { kind: 'text', target: box.dataset.anTarget, start, end: start + quote.length, quote }; }
    const U = annUI(); U.comp = null; U.sel = { objId: obj.id, anchor, x: Math.max(120, Math.min(sc.width - 120, rc.left - sc.left + rc.width / 2)), y: rc.top - sc.top - 8 }; render();
  }, 0);
});
/* drag an area on an image or PDF page; drag an existing area to move it */
let annDrag = null;
document.addEventListener('mousedown', ev => {
  if (ev.button !== 0 || !ev.target.closest) return; const mv = ev.target.closest('[data-an-move]'); let layer = ev.target.closest('.an-layer.draw');
  if (!layer) { const pg = ev.target.closest('.pdfr-page'); if (pg && !ev.target.closest('.textLayer span') && !ev.target.closest('.an-box')) layer = pg.querySelector('.an-layer.draw'); }
  if (!layer) return;
  const L = layer.getBoundingClientRect(); const p0 = { x: (ev.clientX - L.left) / L.width, y: (ev.clientY - L.top) / L.height };
  if (mv) { const a = S.annotations.find(x => x.id === mv.dataset.an); annDrag = { move: a, el: mv, L, p0, x0: a.anchor.x, y0: a.anchor.y, moved: false }; ev.preventDefault(); return; }
  if (ev.target.closest('.an-box')) return;
  const el = document.createElement('span'); el.className = 'an-box pend'; layer.appendChild(el); annDrag = { layer, el, L, p0 }; ev.preventDefault();
});
document.addEventListener('mousemove', ev => {
  if (!annDrag) return; const { L, p0 } = annDrag; const p = { x: Math.max(0, Math.min(1, (ev.clientX - L.left) / L.width)), y: Math.max(0, Math.min(1, (ev.clientY - L.top) / L.height)) };
  if (annDrag.move) { const a = annDrag.move; const nx = Math.max(0, Math.min(1 - a.anchor.w, annDrag.x0 + p.x - p0.x)), ny = Math.max(0, Math.min(1 - a.anchor.h, annDrag.y0 + p.y - p0.y)); annDrag.nx = nx; annDrag.ny = ny; annDrag.moved = annDrag.moved || Math.abs(p.x - p0.x) + Math.abs(p.y - p0.y) > 0.01; annDrag.el.style.left = nx * 100 + '%'; annDrag.el.style.top = ny * 100 + '%'; return; }
  const r = { x: Math.min(p.x, p0.x), y: Math.min(p.y, p0.y), w: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y) }; annDrag.r = r;
  Object.assign(annDrag.el.style, { left: r.x * 100 + '%', top: r.y * 100 + '%', width: r.w * 100 + '%', height: r.h * 100 + '%' });
});
document.addEventListener('mouseup', ev => {
  if (!annDrag) return; const D = annDrag; annDrag = null;
  if (D.move) { if (!D.moved) return; const a = D.move; const prev = `${Math.round(a.anchor.x * 100)}%, ${Math.round(a.anchor.y * 100)}%`; a.anchor.x = D.nx; a.anchor.y = D.ny; annLog('Annotation moved', annObj(a), a, { prev, next: `${Math.round(D.nx * 100)}%, ${Math.round(D.ny * 100)}%` }); save(); render(); return; }
  const r = D.r; if (!r || r.w < 0.015 || r.h < 0.015) { D.el.remove(); return; }
  const obj = reviewObj(); const page = +D.layer.dataset.page || undefined; const scope = D.layer.closest('.an-scope'); const sc = scope.getBoundingClientRect(); const lr = D.L;
  const U = annUI(); U.comp = null; U.sel = { objId: obj.id, anchor: { kind: 'region', target: D.layer.dataset.anRegion, ...(page ? { page } : {}), x: r.x, y: r.y, w: r.w, h: r.h }, x: Math.max(120, Math.min(sc.width - 120, lr.left - sc.left + (r.x + r.w / 2) * lr.width)), y: lr.top - sc.top + r.y * lr.height - 8 };
  ANN_ACT['an-style']({ dataset: { s: 'comment' } });
});

// Comments tab on module and asset detail: the same canvas, open to the people taking part in the review.
function commentsTab(obj) {
  const ed = canAnnotate(obj) && !['Approved', 'Superseded'].includes(statusOf(obj)) && !obj.archived;
  const others = obj.versions.filter(v => v.v !== latest(obj).v).map(v => [v.v, annsFor(obj, v.v).length]).filter(x => x[1]);
  return `<div class="grid cols-main rv-grid"><section class="panel"><div class="panel-head"><h3>v${latest(obj).v} · ${esc(statusOf(obj))}</h3><span class="grow"></span>${obj.review && canActOn(me(), obj) ? goBtn('Open review', kindOf(obj) === 'Asset' ? 'asset-review' : 'review', obj.id, 'sm primary', 'shieldcheck') : ''}</div><div class="panel-body">${reviewCanvas(obj, ed)}</div></section>
  <div class="stack rv-side">${commentsPanel(obj, ed)}${others.length ? `<section class="panel"><div class="panel-head"><h3>Earlier versions</h3></div><div class="panel-body stack" style="gap:6px">${others.map(([v, n]) => `<button class="btn ghost sm" data-act="version-open" data-kind="${kindOf(obj)}" data-id="${obj.id}" data-v="${v}">v${v} · ${n} comment${n > 1 ? 's' : ''}</button>`).join('')}</div></section>` : ''}</div></div>`;
}
