/* ===== Review canvas: one annotation model for every module type and asset =====
   Every comment is an annotation record in S.annotations:
   { id, objType, objId, version, cycle, step, stepIdx, anchor, style, text, replacement, mentions[], author, role, ts, status, replies[] }
   style: highlight | underline | strike | comment | replace | insert | note | ink | rect | ellipse | arrow
   anchor.kind decides positioning:
     text    — { target: 'body' | 'ref:<id>' | 'block:<id>', start, end, quote, ctx }   exact characters (start = end for a point)
     ptext   — { target: 'pdf', page, quote, rects:[{x,y,w,h}] }      text selected on a PDF page (normalised 0–1 rects)
     region  — { target: 'file' | 'pdf', page?, t?, x, y, w, h }      area of an image, PDF page or paused video frame
     point   — { target: 'file' | 'pdf', page?, t?, x, y }            a sticky note at one spot
     shape   — { target, page?, t?, shape: rect|ellipse|arrow|ink, x, y, w, h, pts:[[x,y]…] }   drawn markup
     time    — { target: 'file', t }                                  video timestamp in seconds
     block   — { target: 'block:<id>', label }                        a whole asset block
     page    — { page }                                               a PDF page as a whole
     general — {}                                                     the item as a whole
   A contextual annotation always needs one of these anchors; only an explicit general comment has none. */
const ANN_STYLES = {
  comment: ['Comment', 'message'], highlight: ['Highlight', 'highlighter'], underline: ['Underline', 'underline'], strike: ['Strikethrough', 'strike'],
  insert: ['Insert text', 'insert'], replace: ['Replace text', 'replace'], note: ['Sticky note', 'sticky'],
  ink: ['Freehand', 'pen'], rect: ['Rectangle', 'square'], ellipse: ['Ellipse', 'circle'], arrow: ['Arrow', 'arrowne']
};
const SHAPES = ['ink', 'rect', 'ellipse', 'arrow'];
const TEXT_STYLES = ['comment', 'highlight', 'underline', 'strike', 'insert', 'replace', 'note'];
// Comment text is required for these; markup styles take an optional note.
const NEEDS_TEXT = ['comment', 'replace', 'note'];
const annUI = () => UI.an || (UI.an = { flt: 'all', q: '', fa: '', ft: '', fm: '', sort: 'loc', focus: null, sel: null, comp: null, edit: null, reply: null, tool: null, vals: {}, men: null, hist: { u: [], r: [] } });
const annsFor = (obj, v) => S.annotations.filter(a => a.objType === kindOf(obj) && a.objId === obj.id && a.version === v).sort((x, y) => x.ts - y.ts);
const annNo = (obj, a) => annsFor(obj, a.version).indexOf(a) + 1;
// Open findings raised by reviewers (owner notes never block an approval).
const blockingAnns = obj => annsFor(obj, latest(obj).v).filter(a => a.status === 'open' && a.author !== obj.owner);
const annIsMine = a => a.author === me().id;
const canManageAnn = a => annIsMine(a) || can(me(), 'manage_comments');
function canAnnotate(obj) { const u = me(); return isAdmin(u) || (obj.review && canActOn(u, obj)) || canEditObj(u, obj) || canAmendObj(u, obj); }
const canDiscuss = (obj, a) => canAnnotate(obj) || (a && (a.author === me().id || (a.mentions || []).includes(me().id))) || S.annotations.some(x => x.objId === obj.id && x.author === me().id);
// People who may be @mentioned: active users whose role can open module and asset details.
const mentionable = () => S.users.filter(u => u.status === 'Active' && can(u, 'view') && can(u, ['page_modules', 'page_tasks', 'page_assets']));
function annCtx(obj) {
  const c = curCycle(obj) || latest(obj).cycles.slice(-1)[0]; const st = curStep(obj);
  return { cycle: c ? c.n : 0, stepIdx: obj.review ? obj.review.step : null, step: st ? stepTag(st) : obj.resume ? 'Amendment' : statusOf(obj) };
}
const tgtLabel = t => !t ? '' : t.startsWith('ref:') ? 'Reference · ' : t.startsWith('block:') ? 'Block · ' : '';
function annLabel(a) {
  const x = a.anchor || {}; const pg = x.page ? 'Page ' + x.page + ' · ' : ''; const tm = x.t != null && x.kind !== 'time' ? 'At ' + fmtSecs(x.t) + ' · ' : '';
  const q = s => '“' + (s.length > 60 ? s.slice(0, 57) + '…' : s) + '”';
  if (x.kind === 'text') return tgtLabel(x.target) + (x.start === x.end ? 'Position after ' + q((x.ctx || '').slice(-24) || 'start') : q(x.quote));
  if (x.kind === 'ptext') return pg + (x.quote ? q(x.quote) : 'Text position');
  if (x.kind === 'time') return 'At ' + fmtSecs(x.t);
  if (x.kind === 'region') return tm + pg + 'Area ' + Math.round(x.w * 100) + '×' + Math.round(x.h * 100) + '%';
  if (x.kind === 'point') return tm + pg + 'Point ' + Math.round(x.x * 100) + '%, ' + Math.round(x.y * 100) + '%';
  if (x.kind === 'shape') return tm + pg + (ANN_STYLES[x.shape] || ['Shape'])[0];
  if (x.kind === 'block') return 'Block · ' + (x.label || '');
  if (x.kind === 'page') return 'Page ' + x.page;
  return 'General comment';
}
function annWhere(a) { return annLabel(a); }
// Sort key: page, then vertical position / text offset / time.
const annLocKey = a => { const x = a.anchor || {}; return [x.kind === 'general' ? 999 : x.page || 0, x.t != null ? x.t : x.start != null ? x.start : x.y != null ? x.y : x.rects ? x.rects[0].y : 0]; };
function annLog(action, obj, a, extra = {}) { log(action, kindOf(obj), obj, a.version, { cycle: a.cycle, annId: a.id, note: annLabel(a), ...extra }); }
const mentionNames = ids => (ids || []).map(id => user(id).name);
// Highlight @Name in comment text, only for people actually mentioned.
function annRich(text, ids) { let h = esc(text); mentionNames(ids).forEach(n => { h = h.split('@' + esc(n)).join(`<span class="mention">@${esc(n)}</span>`); }); return h; }

/* --- text with anchored marks --- */
function annText(obj, v, target, text, editable) {
  const U = annUI(); const all = annsFor(obj, v).filter(a => a.anchor.kind === 'text' && a.anchor.target === target);
  const list = all.filter(a => a.anchor.start < a.anchor.end && text.slice(a.anchor.start, a.anchor.end) === a.anchor.quote);
  const pts0 = all.filter(a => a.anchor.start === a.anchor.end && a.anchor.start <= text.length);
  const pend = [U.sel, U.comp].find(x => x && x.objId === obj.id && x.anchor.kind === 'text' && x.anchor.target === target); const pa = pend ? pend.anchor : null;
  const pts = new Set([0, text.length]); list.forEach(a => { pts.add(a.anchor.start); pts.add(a.anchor.end); }); pts0.forEach(a => pts.add(a.anchor.start)); if (pa) { pts.add(pa.start); pts.add(pa.end); }
  const marker = a => `<mark class="an an-pt an-${a.style}${a.status === 'resolved' ? ' res' : ''}${U.focus === a.id ? ' an-focus' : ''}" data-an="${a.id}" data-act="an-focus" data-id="${a.id}" data-n="${annNo(obj, a)}" ${a.style === 'insert' ? `data-ins="${esc(a.replacement)}"` : ''}></mark>`;
  const P = [...pts].sort((a, b) => a - b); let out = '';
  for (let i = 0; i < P.length; i++) {
    const s = P[i]; out += pts0.filter(a => a.anchor.start === s).map(marker).join('') + (pa && pa.start === pa.end && pa.start === s ? '<mark class="an an-pt an-pend"></mark>' : '');
    if (i === P.length - 1) break;
    const e = P[i + 1]; const seg = text.slice(s, e); const cov = list.filter(a => a.anchor.start <= s && a.anchor.end >= e); const isP = pa && pa.start < pa.end && pa.start <= s && pa.end >= e;
    if (!cov.length && !isP) { out += esc(seg); continue; }
    const top = cov.find(a => a.id === U.focus) || cov[cov.length - 1];
    const cls = [...new Set(cov.map(a => 'an-' + a.style + (a.status === 'resolved' ? '-res' : '')))].join(' ');
    const rep = cov.find(a => a.style === 'replace' && a.anchor.end === e && a.status !== 'resolved');
    const first = cov.filter(a => a.anchor.start === s);
    out += `<mark class="an ${cls} ${isP ? 'an-pend' : ''} ${cov.some(a => a.id === U.focus) ? 'an-focus' : ''}" ${top ? `data-an="${top.id}" data-act="an-focus" data-id="${top.id}"` : ''} ${first.length ? `data-n="${first.map(a => annNo(obj, a)).join(',')}"` : ''} ${rep ? `data-rep="${esc(rep.replacement)}"` : ''}>${esc(seg)}</mark>`;
  }
  return `<span class="an-text" data-an-target="${esc(target)}" ${editable ? 'data-an-sel="1"' : ''}>${out}</span>`;
}

/* --- marks over a visual surface (image, PDF page, video frame) --- */
const onSurface = (a, target, page) => ['region', 'ptext', 'point', 'shape'].includes(a.anchor.kind) && a.anchor.target === target && (a.anchor.page || 0) === (page || 0);
function shapeSVG(x, cls, attrs) {
  const sw = 'vector-effect="non-scaling-stroke"';
  if (x.shape === 'rect') return `<rect class="${cls}" x="${x.x * 100}" y="${x.y * 100}" width="${x.w * 100}" height="${x.h * 100}" rx="0.6" ${sw} ${attrs}/>`;
  if (x.shape === 'ellipse') return `<ellipse class="${cls}" cx="${(x.x + x.w / 2) * 100}" cy="${(x.y + x.h / 2) * 100}" rx="${x.w * 50}" ry="${x.h * 50}" ${sw} ${attrs}/>`;
  if (x.shape === 'arrow') { const [p, q] = x.pts; return `<line class="${cls}" x1="${p[0] * 100}" y1="${p[1] * 100}" x2="${q[0] * 100}" y2="${q[1] * 100}" marker-end="url(#an-arrowhead)" ${sw} ${attrs}/>`; }
  return `<polyline class="${cls}" points="${x.pts.map(p => p[0] * 100 + ',' + p[1] * 100).join(' ')}" ${sw} ${attrs}/>`;
}
function annRegions(obj, v, target, page, editable) {
  const U = annUI(); const list = annsFor(obj, v).filter(a => onSurface(a, target, page));
  const tAttr = a => a.anchor.t != null ? `data-an-t="${a.anchor.t}"` : '';
  const pin = (a, x, y) => `<i class="an-pin s-${a.style}${a.status === 'resolved' ? ' res' : ''}" style="left:${x * 100}%;top:${y * 100}%" data-an="${a.id}" data-act="an-focus" data-id="${a.id}" ${tAttr(a)}>${annNo(obj, a)}</i>`;
  const html = list.map(a => { const x = a.anchor; const f = U.focus === a.id ? ' an-focus' : ''; const r_ = a.status === 'resolved' ? ' res' : '';
    if (x.kind === 'point') return `<span class="an-note${r_}${f}" style="left:${x.x * 100}%;top:${x.y * 100}%" data-an="${a.id}" data-act="an-focus" data-id="${a.id}" ${tAttr(a)} ${editable && canManageAnn(a) ? 'data-an-move="1"' : ''} title="${esc(a.text)}">${icon('sticky', 'sm')}<b>${annNo(obj, a)}</b></span>`;
    if (x.kind === 'shape') return pin(a, x.x, x.y);
    return (x.rects || [x]).map((r, i) => `<span class="an-box ${x.kind === 'ptext' ? 'an-ptext an-' + a.style : ''}${r_}${f}" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%" data-an="${a.id}" data-act="an-focus" data-id="${a.id}" ${tAttr(a)} ${x.kind === 'region' && editable && canManageAnn(a) ? 'data-an-move="1"' : ''}>${i === 0 ? `<i class="an-pin s-${a.style}${r_}">${annNo(obj, a)}</i>` : ''}</span>`).join(''); }).join('');
  const shapes = list.filter(a => a.anchor.kind === 'shape');
  const pend = [U.comp, U.sel].find(x => x && x.objId === obj.id && onSurface({ anchor: x.anchor }, target, page)); const pa = pend ? pend.anchor : null;
  const pendHtml = !pa ? '' : pa.kind === 'shape' ? '' : pa.kind === 'point' ? `<span class="an-note pend" style="left:${pa.x * 100}%;top:${pa.y * 100}%">${icon('sticky', 'sm')}</span>` : (pa.rects || [pa]).map(r => `<span class="an-box pend" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%"></span>`).join('');
  const svg = `<svg class="an-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="an-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#d23a42"/></marker></defs>${shapes.map(a => shapeSVG(a.anchor, 'an-shape' + (a.status === 'resolved' ? ' res' : '') + (U.focus === a.id ? ' an-focus' : ''), `data-an="${a.id}" data-act="an-focus" data-id="${a.id}" ${tAttr(a)}`)).join('')}${pa && pa.kind === 'shape' ? shapeSVG(pa, 'an-shape pend', '') : ''}<g class="an-live"></g></svg>`;
  const tool = U.tool && U.tool !== 'text' && editable;
  return `<div class="an-layer ${editable ? 'draw' : ''} ${tool ? 'tool-on' : ''}" data-an-region="${target}" data-page="${page || 0}">${svg}${html}${pendHtml}</div>`;
}

/* --- tool rail for visual surfaces --- */
function toolRail(kind) {
  const U = annUI(); const def = kind === 'document' ? 'text' : kind === 'video' ? 'play' : 'region'; const cur = U.tool || def;
  const tools = [...(kind === 'document' ? [['text', 'Select text', 'cursor']] : kind === 'video' ? [['play', 'Play / pause', 'cursor']] : []), ['region', 'Area comment', 'square'], ['note', 'Sticky note', 'sticky'], ['ink', 'Freehand', 'pen'], ['rect', 'Rectangle', 'square'], ['ellipse', 'Ellipse', 'circle'], ['arrow', 'Arrow', 'arrowne']];
  const H = U.hist;
  return `<div class="an-rail" role="toolbar" aria-label="Annotation tools">${tools.map(t => `<button type="button" class="${cur === t[0] ? 'on' : ''} ${t[0] === 'region' ? 'dashed' : ''}" data-act="an-tool" data-v="${t[0]}" aria-pressed="${cur === t[0]}" title="${t[1]}">${icon(t[2], 'sm')}<span>${t[1]}</span></button>`).join('')}<span class="grow"></span><button type="button" data-act="an-undo" ${H.u.length ? '' : 'disabled'} title="Undo (Ctrl+Z)" aria-label="Undo">${icon('undo', 'sm')}</button><button type="button" data-act="an-redo" ${H.r.length ? '' : 'disabled'} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${icon('redo', 'sm')}</button></div>`;
}

/* --- PDF in review: every page with selectable text and markup --- */
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
  if (R.failed) return `${mediaView(md)}<p class="muted" style="font-size:12.5px;margin-top:8px">${icon('alert', 'sm')} The page renderer could not load in this browser, so text selection and drawing are unavailable. Page and general comments still work.</p>${editable ? `<div class="row" style="gap:6px;margin-top:8px">${Array.from({ length: md.pages || 1 }, (_, i) => `<button class="btn sm" data-act="an-page" data-page="${i + 1}">Comment on page ${i + 1}</button>`).join('')}</div>` : ''}`;
  if (R.loading) return `<div class="media-empty">${icon('clock')}<span>Rendering PDF for review…</span></div>`;
  return `<div class="pdfr">${R.pages.map((p, i) => `<figure class="pdfr-page" data-page="${i + 1}" style="aspect-ratio:${p.w}/${p.h}"><img src="${p.img}" alt="Page ${i + 1} of ${esc(md.name)}" draggable="false"><div class="textLayer pdf-tl" data-file="${md.fileId}" data-page="${i + 1}" data-an-target="pdf" ${editable ? 'data-an-sel="1"' : ''}></div>${annRegions(obj, v, 'pdf', i + 1, editable)}<figcaption>Page ${i + 1} of ${R.n}${editable ? ` · <button type="button" class="linklike" data-act="an-page" data-page="${i + 1}">Comment on this page</button>` : ''}</figcaption></figure>`).join('')}${R.n > R.pages.length ? `<p class="muted" style="text-align:center;font-size:12px">${R.n - R.pages.length} more pages — preview the file to read them all.</p>` : ''}</div>`;
}
function hydrateReview() {
  document.querySelectorAll('[data-pdfr]').forEach(el => { const id = el.dataset.pdfr; if (PDFR[id]) return; PDFR[id] = { loading: true };
    const url = el.dataset.url; const attempt = n => pdfReviewLoad(id, url).then(r => { PDFR[id] = r; renderSoon(); }, () => n < 3 ? setTimeout(() => attempt(n + 1), 1500 * n) : (PDFR[id] = { failed: true }, renderSoon())); attempt(1); });
  document.querySelectorAll('.pdf-tl').forEach(el => { if (el.dataset.done) return; const R = PDFR[el.dataset.file]; if (!R || !R.pages) return; const P = R.pages[+el.dataset.page - 1]; const w = el.parentElement.clientWidth; if (!w) return;
    const vp = P.pg.getViewport({ scale: w / P.w }); el.dataset.done = '1'; el.style.setProperty('--scale-factor', vp.scale); el.style.width = vp.width + 'px'; el.style.height = vp.height + 'px';
    try { window.pdfjsLib.renderTextLayer({ textContentSource: P.tc, container: el, viewport: vp, textDivs: [] }); } catch (e) { /* text selection unavailable; area comments still work */ } });
  // Video markup is shown around its timestamp (and always for the focused comment).
  const vd = document.querySelector('.an-scope video');
  if (vd && !vd.dataset.anBound) { vd.dataset.anBound = '1'; const sync = () => document.querySelectorAll('.an-vlayer [data-an-t]').forEach(e => { const near = Math.abs(+e.dataset.anT - vd.currentTime) < 1.2 || e.dataset.an === annUI().focus; e.classList.toggle('an-hide', !near); }); vd.addEventListener('timeupdate', sync); vd.addEventListener('seeked', sync); sync(); if (annUI().seek != null) { try { vd.currentTime = annUI().seek; } catch (e) { /* not seekable yet */ } } }
  const U = annUI();
  if (U.goto) { const id = U.goto; U.goto = null; const el = document.querySelector(`[data-an="${id}"]`); const a = S.annotations.find(x => x.id === id);
    if (a && a.anchor.t != null && vd) { U.seek = a.anchor.t; try { vd.pause(); vd.currentTime = a.anchor.t; } catch (e) { /* not seekable yet */ } }
    const tgt = el || document.querySelector(`[data-an-card="${id}"]`); if (tgt) { tgt.scrollIntoView({ block: 'center', behavior: 'smooth' }); document.querySelectorAll(`[data-an="${id}"]`).forEach(x => { x.classList.remove('an-hide'); x.classList.remove('an-flash'); void x.getBoundingClientRect(); x.classList.add('an-flash'); }); }
    const card = document.querySelector(`[data-an-card="${id}"]`); if (card && el) card.scrollIntoView({ block: 'nearest' }); }
}

/* --- the reviewable content of a module or asset --- */
function selToolbar(obj) {
  const U = annUI(); if (!U.sel || U.sel.objId !== obj.id) return '';
  const x = U.sel.anchor; const point = (x.kind === 'text' && x.start === x.end) || (x.kind === 'ptext' && !x.quote);
  const styles = point ? ['insert', 'note', 'comment'] : x.kind === 'region' ? ['comment', 'highlight'] : ['comment', 'highlight', 'underline', 'strike', 'insert', 'replace', 'note'];
  return `<div class="an-tb" style="left:${U.sel.x}px;top:${U.sel.y}px" role="toolbar" aria-label="Annotate selection">${styles.map(s => `<button type="button" data-act="an-style" data-s="${s}" title="${ANN_STYLES[s][0]}" aria-label="${ANN_STYLES[s][0]}">${icon(ANN_STYLES[s][1], 'sm')}<span>${ANN_STYLES[s][0].split(' ')[0]}</span></button>`).join('')}${x.kind === 'text' || x.kind === 'ptext' ? '' : ''}<button type="button" class="x" data-act="an-cancel" aria-label="Cancel" title="Cancel">${icon('x', 'sm')}<span>Cancel</span></button></div>`;
}
function reviewCanvas(obj, editable) {
  const kind = kindOf(obj); const v = latest(obj); const U = annUI(); let body, rail = '';
  if (kind === 'Asset') body = `<div class="sheet">${obj.blocks.map((b, i) => assetBlockReview(obj, v, b, i, editable)).join('')}<div class="sheet-foot">${obj.disclaimer ? esc(obj.disclaimer) : 'For healthcare professionals in ' + esc(marketsTxt(obj.markets)) + '.'}</div></div>`;
  else if (isMediaType(obj.type)) {
    const md = v.media; const k = mediaKindOf(md);
    if (editable && md && (k !== 'document' || (PDFR[md.fileId] && PDFR[md.fileId].pages))) rail = toolRail(k);
    if (k === 'image') body = `<div class="an-media"><div class="an-frame">${mediaView(md)}${annRegions(obj, v.v, 'file', 0, editable)}</div></div>`;
    else if (k === 'video') { const ts = annsFor(obj, v.v).filter(a => a.anchor.t != null); const dur = md.duration || Math.max(1, ...ts.map(a => a.anchor.t + 1));
      body = `<div class="an-media"><div class="an-vframe">${mediaView(md)}<div class="an-vlayer ${U.tool && U.tool !== 'play' ? 'tool-on' : ''}">${annRegions(obj, v.v, 'file', 0, editable && U.tool && U.tool !== 'play')}</div></div><div class="an-tl" aria-label="Comment timeline"><span class="an-tl-track">${ts.map(a => `<button type="button" class="an-tl-m s-${a.style} ${a.status === 'resolved' ? 'res' : ''} ${U.focus === a.id ? 'an-focus' : ''}" style="left:${Math.min(100, 100 * a.anchor.t / dur)}%" data-an-tl="${a.id}" data-act="an-go" data-id="${a.id}" title="${esc(fmtSecs(a.anchor.t) + ' — ' + a.text)}">${annNo(obj, a)}</button>`).join('')}</span><span class="an-tl-l"><span>0:00</span><span>${fmtSecs(dur)}</span></span></div>${editable ? `<div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" data-act="an-time">${icon('message', 'sm')}Comment at current time</button><span class="muted" style="font-size:12px">Pause where the comment applies; choose a drawing tool to mark the frame.</span></div>` : ''}</div>`; }
    else body = md ? pdfReview(obj, v.v, md, editable) : mediaView(md);
    body += `<div class="row file-row">${fileActions(md, obj.id + ' · v' + v.v + ' · ' + v.status)}</div><p class="media-desc">${esc(v.body)}</p>`;
  } else body = `<p class="claim ${mtype(obj.type).tone === 'headline' ? 'is-headline' : ''}">${annText(obj, v.v, 'body', v.body, editable)}</p>`;
  // Citations are reviewable too: each reference can be selected and commented on.
  const refs = kind === 'Module' && v.refs.length ? `<div class="an-refs"><span class="fn-title">References</span><ol>${v.refs.map(r => { const R = refById(r); return `<li>${annText(obj, v.v, 'ref:' + r, R.title + ' — ' + R.source, editable)}</li>`; }).join('')}</ol></div>` : '';
  const hint = editable ? `<p class="an-hint">${icon('pointer', 'sm')}${kind === 'Asset' ? 'Select text in new content to mark it up, or comment on any block.' : isMediaType(obj.type) ? { image: 'Drag an area to comment, or pick a drawing tool: sticky note, freehand, rectangle, ellipse or arrow.', video: 'Pause and comment at a timestamp; pick a drawing tool to mark the paused frame.', document: 'Select text to comment, highlight, underline, strike through, insert or replace. Drag on empty space for an area comment, or pick a drawing tool.' }[mediaKindOf(v.media)] || '' : 'Select text to comment, highlight, underline, strike through or replace it. Click between words to insert text or add a sticky note.'}</p>` : '';
  return `${rail}<div class="an-scope ${editable ? 'editable' : ''}">${body}${refs}${selToolbar(obj)}</div>${hint}`;
}
function assetBlockReview(a, v, b, i, editable) {
  const tgt = 'block:' + (b.id || i); const n = annsFor(a, v.v).filter(x => x.anchor.target === tgt).length;
  const btnC = editable ? `<button type="button" class="btn ghost sm an-bc" data-act="an-block" data-t="${esc(tgt)}" data-l="${esc(b.kind === 'new' ? b.label || 'New content' : (modById(b.moduleId) || {}).id || 'Module')}">${icon('message', 'sm')}Comment${n ? ' · ' + n : ''}</button>` : n ? `<span class="chip plain">${n} comment${n > 1 ? 's' : ''}</span>` : '';
  if (b.kind === 'new') return `<div class="block new" data-an="${esc(tgt)}"><div class="meta">${icon('edit', 'sm')}${b.approved ? 'Text approved in this asset' : 'New content · requires review'}<span class="grow"></span>${btnC}</div><div class="txt">${annText(a, v.v, tgt, b.text, editable)}</div></div>`;
  const m = modById(b.moduleId); if (!m) return ''; const mv = verOf(m, b.v) || latest(m);
  return `<div class="block approved" data-an="${esc(tgt)}"><div class="meta">${icon('lock', 'sm')}Approved module · locked · <span class="mono" style="text-transform:none">${m.id} v${b.v}</span><span class="grow"></span>${btnC}</div> ${mv.media ? `<div class="block-media">${mediaView(mv.media)}</div><div class="row file-row">${fileActions(mv.media, m.id + ' · v' + mv.v)}</div>` : `<div class="txt">${esc(mv.body)}</div>`}</div>`;
}

/* --- @mention-aware text field --- */
function menField(id, ph, rows) {
  const U = annUI(); const val = U.vals[id] || ''; const M = U.men && U.men.field === id ? U.men : null;
  const taken = new Set((U.vals[id + ':m'] || []));
  const list = M ? mentionable().filter(u => !taken.has(u.id) && (!M.q || (u.name + ' ' + u.email).toLowerCase().includes(M.q.toLowerCase()))).slice(0, 6) : [];
  return `<div class="men-wrap"><textarea class="textarea" id="${id}" data-men="${id}" rows="${rows || 3}" placeholder="${esc(ph)}">${esc(val)}</textarea>${M ? `<div class="men-pop" role="listbox" aria-label="Mention a person">${list.length ? list.map((u, i) => `<button type="button" class="men-opt ${i === (M.i || 0) ? 'on' : ''}" role="option" data-act="an-men" data-f="${id}" data-v="${u.id}">${avatar(u, 'sm')}<span><b>${esc(u.name)}</b><span class="muted">${esc(roleLabel(u))}</span></span></button>`).join('') : `<div class="muted" style="padding:8px 10px;font-size:12.5px">No one matches “${esc(M.q)}”.</div>`}</div>` : ''}${(U.vals[id + ':m'] || []).length ? `<div class="men-chips">${icon('at', 'sm')}${U.vals[id + ':m'].map(uid_ => `<span class="mchip">${esc(user(uid_).name)}<button type="button" data-act="an-men-x" data-f="${id}" data-v="${uid_}" aria-label="Remove mention">${icon('x', 'sm')}</button></span>`).join('')}</div>` : ''}</div>`;
}
// Mentioned ids still present in the text, without duplicates.
function menCollect(id) { const U = annUI(); const t = U.vals[id] || ''; return uniq((U.vals[id + ':m'] || []).filter(x => t.includes('@' + user(x).name))); }
function menReset(id) { const U = annUI(); delete U.vals[id]; delete U.vals[id + ':m']; if (U.men && U.men.field === id) U.men = null; }
function notifyMentions(obj, a, ids, where) {
  if (!ids.length) return; const k = kindOf(obj);
  log('User mentioned', k, obj, a.version, { cycle: a.cycle, annId: a.id, note: where + ' · ' + annLabel(a), next: mentionNames(ids).join(', '), toIds: [...ids] });
  S.outbox.push({ id: uid('e'), ts: Date.now(), to: mentionNames(ids), toIds: [...ids], subject: me().name + ' mentioned you on ' + obj.id, objType: k, objId: obj.id });
}

/* --- comments panel --- */
function commentsPanel(obj, editable) {
  const U = annUI(); const v = latest(obj).v; const all = annsFor(obj, v); const open = all.filter(a => a.status === 'open'); const meId = me().id;
  const q = (U.q || '').toLowerCase();
  let list = all.filter(a => (U.flt === 'all' || a.status === U.flt) && (!U.fa || a.author === U.fa) && (!U.ft || a.style === U.ft) && (!U.fm || (U.fm === 'me' ? (a.mentions || []).includes(meId) || a.replies.some(r => (r.mentions || []).includes(meId)) : U.fm === 'any' ? (a.mentions || []).length || a.replies.some(r => (r.mentions || []).length) : (a.mentions || []).includes(U.fm)))
    && (!q || [a.text, a.replacement, annLabel(a), user(a.author).name, ...a.replies.map(r => r.text)].join(' ').toLowerCase().includes(q)));
  const cmp = { loc: (x, y) => { const p = annLocKey(x), r = annLocKey(y); return p[0] - r[0] || p[1] - r[1]; }, author: (x, y) => user(x.author).name.localeCompare(user(y.author).name) || x.ts - y.ts, date: (x, y) => y.ts - x.ts }[U.sort || 'loc'];
  list = [...list].sort(cmp);
  const comp = U.comp && U.comp.objId === obj.id ? U.comp : null; const blocking = blockingAnns(obj).length;
  const composer = comp ? `<div class="an-comp" id="an-comp"><div class="an-comp-h">${icon(ANN_STYLES[comp.style][1], 'sm')}<b>${ANN_STYLES[comp.style][0]}</b><span class="muted">${esc(annLabel({ anchor: comp.anchor }))}</span></div>
    ${comp.style === 'replace' || comp.style === 'insert' ? `<input class="input" id="an-rep" placeholder="${comp.style === 'insert' ? 'Text to insert' : 'Replacement text'}" value="${esc(comp.replacement || '')}">` : ''}
    ${menField('an-text', (NEEDS_TEXT.includes(comp.style) ? 'Comment (required)' : 'Add a note (optional)') + ' — type @ to mention someone')}${comp.err ? `<span class="err">${esc(comp.err)}</span>` : ''}
    <div class="row" style="gap:8px;justify-content:flex-end">${btn('Cancel', 'an-cancel', 'ghost sm')}${btn('Save', 'an-save', 'primary sm', '', 'check')}</div></div>` : '';
  const card = a => { const x = user(a.author); const mine = canManageAnn(a); const disc = canDiscuss(obj, a);
    const reply = U.reply === a.id ? `<div class="an-reply-f">${menField('an-reply', 'Reply… type @ to mention', 2)}<div class="row" style="gap:6px;justify-content:flex-end">${btn('Cancel', 'an-reply-x', 'ghost sm')}${btn('Reply', 'an-reply-save', 'primary sm', `data-id="${a.id}"`)}</div></div>` : '';
    const body = U.edit === a.id ? `<div class="an-reply-f">${a.style === 'replace' || a.style === 'insert' ? `<input class="input" id="an-erep" value="${esc(a.replacement)}">` : ''}${menField('an-etext', 'Comment', 3)}<div class="row" style="gap:6px;justify-content:flex-end">${btn('Cancel', 'an-edit-x', 'ghost sm')}${btn('Save', 'an-edit-save', 'primary sm', `data-id="${a.id}"`)}</div></div>`
      : `${a.text ? `<p class="an-txt">${annRich(a.text, a.mentions)}</p>` : ''}${a.style === 'replace' ? `<p class="an-repl"><span class="muted">Replace with</span> <b>${esc(a.replacement)}</b></p>` : a.style === 'insert' ? `<p class="an-repl"><span class="muted">Insert</span> <b>${esc(a.replacement)}</b></p>` : ''}${(a.mentions || []).length ? `<p class="an-mentions">${icon('at', 'sm')}${mentionNames(a.mentions).map(esc).join(', ')}</p>` : ''}`;
    return `<article class="an-card ${a.status} ${U.focus === a.id ? 'focus' : ''}" data-an-card="${a.id}">
      <div class="an-h"><span class="an-n s-${a.style}">${annNo(obj, a)}</span>${avatar(x, 'sm')}<span class="an-who"><b>${esc(x.name)}</b><span>${esc(a.role)} · ${fmtDT(a.ts)}${a.editedAt ? ' · edited' : ''}</span></span><span class="grow"></span>${a.status === 'resolved' ? '<span class="chip ok">Resolved</span>' : '<span class="chip warn">Open</span>'}</div>
      <button type="button" class="an-loc" data-act="an-go" data-id="${a.id}" title="Go to location">${icon('pointer', 'sm')}<span>${esc(annLabel(a))}</span><span class="muted">· ${esc(ANN_STYLES[a.style][0])} · v${a.version} · cycle ${a.cycle || '—'}${a.step ? ' · ' + esc(a.step) : ''}</span></button>
      ${body}
      ${a.replies.map(r => `<div class="reply"><b>${esc(user(r.author).name)}</b> <span class="muted" style="font-size:11.5px">${esc(r.role || roleLabel(user(r.author)))} · ${fmtDT(r.ts)}</span><p>${annRich(r.text, r.mentions)}</p></div>`).join('')}
      ${reply}
      <div class="an-f">${disc ? `<button type="button" data-act="an-reply" data-id="${a.id}">${icon('undo', 'sm')}Reply</button><button type="button" data-act="an-status" data-id="${a.id}">${icon(a.status === 'open' ? 'check' : 'refresh', 'sm')}${a.status === 'open' ? 'Resolve' : 'Reopen'}</button>` : ''}${mine ? `<button type="button" data-act="an-edit" data-id="${a.id}">${icon('edit', 'sm')}Edit</button><button type="button" data-act="an-del" data-id="${a.id}">${icon('trash', 'sm')}Delete</button>` : ''}</div></article>`; };
  const authors = uniq(all.map(a => a.author)); const types = uniq(all.map(a => a.style)); const mentioned = uniq(all.flatMap(a => [...(a.mentions || []), ...a.replies.flatMap(r => r.mentions || [])]));
  const fsel_ = (k, label, opts) => `<select class="select sm" data-anf="${k}" aria-label="${label}">${opts.map(o => `<option value="${esc(o[0])}" ${String(U[k] || '') === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  const nAct = [U.fa, U.ft, U.fm, U.q].filter(Boolean).length + (U.flt !== 'all' ? 1 : 0);
  return `<section class="panel an-panel"><div class="panel-head"><h3>${icon('message', 'sm')} Comments</h3><span class="chip ${open.length ? 'warn' : 'plain'}">${open.length} open</span><span class="grow"></span><span class="muted" style="font-size:12px">${list.length} of ${all.length}</span><div class="seg sm">${[['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved']].map(f => `<button type="button" class="${U.flt === f[0] ? 'on' : ''}" data-act="an-flt" data-v="${f[0]}">${f[1]}</button>`).join('')}</div></div>
    <div class="an-tools"><div class="field-inline">${icon('search', 'sm')}<input type="search" id="an-q" data-anf="q" value="${esc(U.q || '')}" placeholder="Search comments" aria-label="Search comments"></div>
      <div class="an-fgrid">${fsel_('fa', 'Author', [['', 'All authors'], ...authors.map(id => [id, user(id).name])])}${fsel_('ft', 'Type', [['', 'All types'], ...types.map(t => [t, ANN_STYLES[t][0]])])}${fsel_('fm', 'Mentions', [['', 'Any mentions'], ['me', 'Mentions me'], ['any', 'Has a mention'], ...mentioned.map(id => [id, '@' + user(id).name])])}${fsel_('sort', 'Sort', [['loc', 'By location'], ['author', 'By author'], ['date', 'Newest first']])}</div>${nAct ? `<button type="button" class="linklike" data-act="an-fclear">Clear filters</button>` : ''}</div>
    ${blocking && S.settings.blockOnOpenComments && obj.review ? `<div class="an-block">${icon('lock', 'sm')}${blocking} open reviewer comment${blocking > 1 ? 's' : ''} — resolve before approving.</div>` : ''}
    <div class="an-body">${composer}${editable && !comp ? `<div class="an-gen">${menField('an-general', 'General comment on v' + v + ' (no anchor) — type @ to mention', 2)}<div class="row" style="justify-content:flex-end">${btn('Add general comment', 'an-general', 'sm', '', 'message')}</div></div>` : ''}
    ${list.length ? list.map(card).join('') : `<p class="muted an-empty">${all.length ? 'No comments match.' : editable ? 'No comments yet. Select text, drag an area, pick a drawing tool or add a general comment.' : 'No comments on this version.'}</p>`}</div></section>`;
}

/* --- creating, editing and tracking annotations (with undo / redo) --- */
const annObj = a => objById(a.objType, a.objId);
const annClone = a => JSON.parse(JSON.stringify(a));
function annCreate(obj, anchor, style, text, replacement, mentions) {
  const u = me(); const c = annCtx(obj);
  const a = { id: uid('an'), objType: kindOf(obj), objId: obj.id, version: latest(obj).v, cycle: c.cycle, step: c.step, stepIdx: c.stepIdx, anchor, style, text: text || '', replacement: replacement || '', mentions: mentions || [], author: u.id, role: roleLabel(u), ts: Date.now(), status: 'open', replies: [] };
  S.annotations.push(a); annLog('Comment created', obj, a, { next: (ANN_STYLES[style][0]) + (text ? ': ' + text : '') + (replacement ? ' → ' + replacement : '') });
  notifyMentions(obj, a, a.mentions, 'Comment');
  if (obj.review) obj.review.startedBy = obj.review.startedBy || u.id;
  annHist({ op: 'create', after: annClone(a) }); save(); return a;
}
function annHist(e) { const H = annUI().hist; H.u.push(e); if (H.u.length > 50) H.u.shift(); H.r = []; }
// Apply a history entry forwards (redo) or backwards (undo); every step is a real, audited change.
function annApply(e, back) {
  const find = id => S.annotations.find(x => x.id === id);
  const put = (snap, why) => { if (find(snap.id)) return; S.annotations.push(annClone(snap)); annLog('Comment created', annObj(snap), snap, { next: why }); };
  const drop = (id, why) => { const i = S.annotations.findIndex(x => x.id === id); if (i < 0) return; const a = S.annotations[i]; S.annotations.splice(i, 1); annLog('Annotation deleted', annObj(a), a, { prev: a.text || ANN_STYLES[a.style][0], next: why }); };
  const set = (snap, action, why) => { const a = find(snap.id); if (!a) return; const prev = a.status === snap.status ? a.text : a.status; Object.assign(a, annClone(snap)); annLog(action, annObj(a), a, { prev, next: why }); };
  if (e.op === 'create') back ? drop(e.after.id, 'Undo') : put(e.after, 'Redo');
  else if (e.op === 'delete') back ? put(e.before, 'Restored by undo') : drop(e.before.id, 'Redo');
  else { const snap = back ? e.before : e.after; const act = e.op === 'move' ? 'Annotation moved' : e.op === 'status' ? (snap.status === 'resolved' ? 'Comment resolved' : 'Comment reopened') : 'Comment edited'; set(snap, act, back ? 'Undo' : 'Redo'); }
}
function annUndo(redo) { const H = annUI().hist; const st = redo ? H.r : H.u; const e = st.pop(); if (!e) return; const id = (e.after || e.before).id; const a = S.annotations.find(x => x.id === id) || e.before || e.after;
  if (a && !canManageAnn(a) && e.op !== 'status') { toast('Only the author can undo this change'); st.push(e); return; }
  annApply(e, !redo); (redo ? H.u : H.r).push(e); save(); render(); toast(redo ? 'Redone' : 'Undone'); }
function annMutate(a, op, fn) { const before = annClone(a); fn(a); annHist({ op, before, after: annClone(a) }); }
const ANN_ACT = {
  'an-style': el => { const U = annUI(); if (!U.sel) return; U.comp = { objId: U.sel.objId, anchor: U.sel.anchor, style: el.dataset.s }; U.sel = null; menReset('an-text'); window.getSelection && window.getSelection().removeAllRanges(); render(); setTimeout(() => { const c = document.getElementById('an-comp'); c && c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); const t = document.getElementById(U.comp && (U.comp.style === 'replace' || U.comp.style === 'insert') ? 'an-rep' : 'an-text'); t && t.focus({ preventScroll: true }); }, 30); },
  'an-cancel': () => { const U = annUI(); U.sel = null; U.comp = null; U.men = null; render(); },
  'an-save': () => { const U = annUI(); const C = U.comp; if (!C) return; const obj = modById(C.objId) || assetById(C.objId); const text = (U.vals['an-text'] || '').trim(); const rp = document.getElementById('an-rep'); const rep = rp ? (C.style === 'insert' ? rp.value.replace(/^\s+/, '') : rp.value.trim()) : '';
    if (NEEDS_TEXT.includes(C.style) && !text) { C.err = 'Write the comment.'; C.replacement = rep; render(); return; }
    if ((C.style === 'replace' || C.style === 'insert') && !rep.trim()) { C.err = C.style === 'insert' ? 'Enter the text to insert.' : 'Enter the replacement text.'; render(); return; }
    const a = annCreate(obj, C.anchor, C.style, text, rep, menCollect('an-text')); menReset('an-text'); U.comp = null; U.focus = a.id; render(); toast('Comment ' + annNo(obj, a) + ' added' + (a.mentions.length ? ' · ' + a.mentions.length + ' notified' : '')); },
  'an-general': () => { const U = annUI(); const t = (U.vals['an-general'] || '').trim(); if (!t) { toast('Write a comment first'); return; } const obj = reviewObj(); const a = annCreate(obj, { kind: 'general' }, 'comment', t, '', menCollect('an-general')); menReset('an-general'); U.focus = a.id; render(); toast('Comment added'); },
  'an-block': el => { const obj = reviewObj(); annUI().comp = { objId: obj.id, anchor: { kind: 'block', target: el.dataset.t, label: el.dataset.l }, style: 'comment' }; menReset('an-text'); render(); setTimeout(() => { const t = document.getElementById('an-text'); t && t.focus(); }, 30); },
  'an-page': el => { const obj = reviewObj(); annUI().comp = { objId: obj.id, anchor: { kind: 'page', page: +el.dataset.page }, style: 'comment' }; menReset('an-text'); render(); setTimeout(() => { const t = document.getElementById('an-text'); t && t.focus(); }, 30); },
  'an-time': () => { const obj = reviewObj(); const vd = document.querySelector('.an-scope video'); const t = vd ? Math.round(vd.currentTime * 10) / 10 : 0; if (vd) vd.pause(); annUI().seek = t; annUI().comp = { objId: obj.id, anchor: { kind: 'time', target: 'file', t }, style: 'comment' }; menReset('an-text'); render(); setTimeout(() => { const x = document.getElementById('an-text'); x && x.focus(); }, 30); },
  'an-tool': el => { const U = annUI(); U.tool = el.dataset.v; U.sel = null; if (U.tool !== 'play') { const vd = document.querySelector('.an-scope video'); if (vd) { vd.pause(); U.seek = vd.currentTime; } } render(); },
  'an-undo': () => annUndo(false), 'an-redo': () => annUndo(true),
  'an-focus': el => { const U = annUI(); U.focus = el.dataset.id; render(); const c = document.querySelector(`[data-an-card="${el.dataset.id}"]`); c && c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
  'an-go': el => { const U = annUI(); U.focus = el.dataset.id; U.goto = el.dataset.id; render(); },
  'an-flt': el => { annUI().flt = el.dataset.v; render(); },
  'an-fclear': () => { Object.assign(annUI(), { q: '', fa: '', ft: '', fm: '', flt: 'all' }); render(); },
  'an-men': el => { const U = annUI(); const f = el.dataset.f; const ta = document.getElementById(f); const val = U.vals[f] || ''; const M = U.men; const u = user(el.dataset.v);
    const at = M ? M.start : val.length; const end = ta ? ta.selectionStart : val.length; U.vals[f] = val.slice(0, at) + '@' + u.name + ' ' + val.slice(Math.max(end, at + 1 + (M ? M.q.length : 0)));
    U.vals[f + ':m'] = uniq([...(U.vals[f + ':m'] || []), u.id]); U.men = null; render(); setTimeout(() => { const t = document.getElementById(f); if (t) { const p = at + u.name.length + 2; t.focus(); t.setSelectionRange(p, p); } }, 20); },
  'an-men-x': el => { const U = annUI(); const f = el.dataset.f; U.vals[f + ':m'] = (U.vals[f + ':m'] || []).filter(x => x !== el.dataset.v); U.vals[f] = (U.vals[f] || '').split('@' + user(el.dataset.v).name).join(user(el.dataset.v).name); render(); },
  'an-reply': el => { const U = annUI(); U.reply = el.dataset.id; menReset('an-reply'); render(); setTimeout(() => { const t = document.getElementById('an-reply'); t && t.focus(); }, 30); },
  'an-reply-x': () => { annUI().reply = null; render(); },
  'an-reply-save': el => { const U = annUI(); const a = S.annotations.find(x => x.id === el.dataset.id); const t = (U.vals['an-reply'] || '').trim(); if (!t) return; const u = me(); const ids = menCollect('an-reply');
    annMutate(a, 'edit', x => x.replies.push({ id: uid('r'), author: u.id, role: roleLabel(u), ts: Date.now(), text: t, mentions: ids }));
    annLog('Reply added', annObj(a), a, { next: t }); notifyMentions(annObj(a), a, ids, 'Reply'); menReset('an-reply'); U.reply = null; save(); render(); },
  'an-status': el => { const a = S.annotations.find(x => x.id === el.dataset.id); const to = a.status === 'open' ? 'resolved' : 'open';
    annMutate(a, 'status', x => { x.status = to; x.resolvedBy = to === 'resolved' ? me().id : null; x.resolvedAt = to === 'resolved' ? Date.now() : null; });
    annLog(to === 'resolved' ? 'Comment resolved' : 'Comment reopened', annObj(a), a, { prev: to === 'resolved' ? 'Open' : 'Resolved', next: to === 'resolved' ? 'Resolved' : 'Open' }); save(); render(); },
  'an-edit': el => { const U = annUI(); const a = S.annotations.find(x => x.id === el.dataset.id); U.edit = a.id; U.vals['an-etext'] = a.text; U.vals['an-etext:m'] = [...(a.mentions || [])]; render(); },
  'an-edit-x': () => { annUI().edit = null; menReset('an-etext'); render(); },
  'an-edit-save': el => { const U = annUI(); const a = S.annotations.find(x => x.id === el.dataset.id); if (!canManageAnn(a)) return; const t = (U.vals['an-etext'] || '').trim(); const r = document.getElementById('an-erep'); const prev = a.text + (a.replacement ? ' → ' + a.replacement : ''); const before = new Set(a.mentions || []); const ids = menCollect('an-etext');
    annMutate(a, 'edit', x => { x.text = t; if (r) x.replacement = r.value.trim(); x.mentions = ids; x.editedAt = Date.now(); });
    annLog('Comment edited', annObj(a), a, { prev, next: a.text + (a.replacement ? ' → ' + a.replacement : '') }); notifyMentions(annObj(a), a, ids.filter(x => !before.has(x)), 'Comment'); menReset('an-etext'); U.edit = null; save(); render(); },
  'an-del': el => { const i = S.annotations.findIndex(x => x.id === el.dataset.id); const a = S.annotations[i]; if (!canManageAnn(a)) { toast('You can delete only your own comments'); return; }
    if (!confirm('Delete this comment and its replies? The deletion is recorded in the audit trail and can be undone.')) return;
    annHist({ op: 'delete', before: annClone(a) }); S.annotations.splice(i, 1); annLog('Annotation deleted', annObj(a), a, { prev: a.text || ANN_STYLES[a.style][0] }); save(); render(); toast('Comment deleted'); }
};
// The item on the current review / detail page.
function reviewObj() { const r = UI.route; return r.name === 'asset-review' || r.name === 'asset' ? assetById(r.p.id) : modById(r.p.id); }

/* @mention detection, comment filters and keyboard shortcuts */
document.addEventListener('input', ev => {
  const t = ev.target; if (!t.dataset) return; const U = annUI();
  if (t.dataset.anf === 'q') { U.q = t.value; render(); return; }
  if (!t.dataset.men) return; const f = t.dataset.men; U.vals[f] = t.value;
  const before = t.value.slice(0, t.selectionStart); const m = before.match(/(^|\s)@([^\s@]{0,30})$/);
  const was = U.men && U.men.field === f; U.men = m ? { field: f, q: m[2], start: before.length - m[2].length - 1, i: 0 } : null;
  if (m || was) render();
}, true);
document.addEventListener('change', ev => { const t = ev.target; if (t.dataset && t.dataset.anf && t.dataset.anf !== 'q') { annUI()[t.dataset.anf] = t.value; render(); } });
document.addEventListener('keydown', ev => {
  const U = annUI(); const t = ev.target;
  if (U.men && t.dataset && t.dataset.men === U.men.field) { const opts = [...document.querySelectorAll('.men-opt')];
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); U.men.i = (U.men.i + (ev.key === 'ArrowDown' ? 1 : -1) + opts.length) % Math.max(1, opts.length); render(); return; }
    if ((ev.key === 'Enter' || ev.key === 'Tab') && opts.length) { ev.preventDefault(); ANN_ACT['an-men'](opts[U.men.i] || opts[0]); return; }
    if (ev.key === 'Escape') { ev.stopPropagation(); U.men = null; render(); return; } }
  if (ev.key === 'Escape' && (U.sel || U.comp) && !UI.modal) { U.sel = null; U.comp = null; render(); return; }
  const typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName || ''); if (typing || !document.querySelector('.an-scope')) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); annUndo(ev.shiftKey); }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); annUndo(true); }
}, true);

/* text selection (or a click between words) → floating toolbar */
document.addEventListener('mouseup', ev => {
  const box = ev.target.closest && ev.target.closest('[data-an-sel]'); if (!box || annDrag) return;
  const U = annUI(); if (box.classList.contains('pdf-tl') && U.tool && U.tool !== 'text') return;
  setTimeout(() => {
    const s = window.getSelection(); if (!s || !s.rangeCount) return; const r = s.getRangeAt(0); if (!box.contains(r.commonAncestorContainer)) return;
    const quote = r.toString(); const collapsed = s.isCollapsed || !quote.trim(); const scope = box.closest('.an-scope'); if (!scope) return;
    const sc = scope.getBoundingClientRect(); const obj = reviewObj(); let anchor, rc;
    if (box.classList.contains('pdf-tl')) { const pr = box.getBoundingClientRect(); const rects = [...r.getClientRects()].filter(x => collapsed || x.width > 1).map(x => ({ x: (x.left - pr.left) / pr.width, y: (x.top - pr.top) / pr.height, w: Math.max(x.width, 2) / pr.width, h: x.height / pr.height }));
      if (!rects.length) return; rc = r.getClientRects()[0] || r.getBoundingClientRect(); anchor = { kind: 'ptext', target: 'pdf', page: +box.dataset.page, quote: collapsed ? '' : quote.replace(/\s+/g, ' ').trim(), rects: collapsed ? [rects[0]] : rects }; }
    else { const pre = document.createRange(); pre.selectNodeContents(box); pre.setEnd(r.startContainer, r.startOffset); const start = pre.toString().length; const txt = box.textContent;
      rc = r.getBoundingClientRect(); if (collapsed && !rc.height) { const rr = r.getClientRects(); rc = rr[0] || ev.target.getBoundingClientRect(); }
      anchor = collapsed ? { kind: 'text', target: box.dataset.anTarget, start, end: start, quote: '', ctx: txt.slice(Math.max(0, start - 30), start) } : { kind: 'text', target: box.dataset.anTarget, start, end: start + quote.length, quote, ctx: txt.slice(Math.max(0, start - 30), start) }; }
    if (collapsed && (ev.detail !== 1 || ev.target.closest('mark.an'))) return;
    U.comp = null; U.sel = { objId: obj.id, anchor, x: Math.max(150, Math.min(sc.width - 150, rc.left - sc.left + rc.width / 2)), y: rc.top - sc.top - 8 }; render();
  }, 0);
});
/* drawing on a visual surface: area (default), sticky note, freehand, rectangle, ellipse, arrow; drag an existing area or note to move it */
let annDrag = null;
const toolOf = () => annUI().tool;
document.addEventListener('mousedown', ev => {
  if (ev.button !== 0 || !ev.target.closest) return; const mv = ev.target.closest('[data-an-move]'); let layer = ev.target.closest('.an-layer.draw');
  if (!layer) { const pg = ev.target.closest('.pdfr-page'); if (pg && !ev.target.closest('.textLayer span') && !ev.target.closest('.an-box')) layer = pg.querySelector('.an-layer.draw'); }
  if (!layer) return;
  const L = layer.getBoundingClientRect(); const p0 = { x: (ev.clientX - L.left) / L.width, y: (ev.clientY - L.top) / L.height };
  if (mv) { const a = S.annotations.find(x => x.id === mv.dataset.an); annDrag = { move: a, before: annClone(a), el: mv, L, p0, x0: a.anchor.x, y0: a.anchor.y, moved: false }; ev.preventDefault(); return; }
  if (ev.target.closest('.an-box, .an-note, .an-pin')) return;
  const tool = toolOf() || (layer.closest('.pdfr-page') ? 'region' : layer.closest('.an-vlayer') ? null : 'region'); if (!tool || tool === 'play' || tool === 'text' && !layer.closest('.pdfr-page')) return;
  const t = tool === 'text' ? 'region' : tool;
  if (t === 'note') { annDrag = { layer, L, p0, tool: 'note', r: { x: p0.x, y: p0.y } }; ev.preventDefault(); return; }
  const live = layer.querySelector('.an-live'); const el = t === 'region' ? Object.assign(document.createElement('span'), { className: 'an-box pend' }) : null; if (el) layer.appendChild(el);
  annDrag = { layer, el, live, L, p0, tool: t, pts: [[p0.x, p0.y]] }; ev.preventDefault();
});
document.addEventListener('mousemove', ev => {
  if (!annDrag) return; const D = annDrag; const { L, p0 } = D; const p = { x: Math.max(0, Math.min(1, (ev.clientX - L.left) / L.width)), y: Math.max(0, Math.min(1, (ev.clientY - L.top) / L.height)) };
  if (D.move) { const a = D.move; const w = a.anchor.w || 0, h = a.anchor.h || 0; const nx = Math.max(0, Math.min(1 - w, D.x0 + p.x - p0.x)), ny = Math.max(0, Math.min(1 - h, D.y0 + p.y - p0.y)); D.nx = nx; D.ny = ny; D.moved = D.moved || Math.abs(p.x - p0.x) + Math.abs(p.y - p0.y) > 0.01; D.el.style.left = nx * 100 + '%'; D.el.style.top = ny * 100 + '%'; return; }
  if (D.tool === 'note') return;
  const r = { x: Math.min(p.x, p0.x), y: Math.min(p.y, p0.y), w: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y) }; D.r = r; D.pts.push([p.x, p.y]); D.p1 = [p.x, p.y];
  if (D.el) Object.assign(D.el.style, { left: r.x * 100 + '%', top: r.y * 100 + '%', width: r.w * 100 + '%', height: r.h * 100 + '%' });
  else if (D.live) D.live.innerHTML = shapeSVG(D.tool === 'ink' ? { shape: 'ink', pts: D.pts } : D.tool === 'arrow' ? { shape: 'arrow', pts: [[p0.x, p0.y], D.p1] } : { shape: D.tool, ...r }, 'an-shape pend', '');
});
document.addEventListener('mouseup', ev => {
  if (!annDrag) return; const D = annDrag; annDrag = null;
  if (D.move) { if (!D.moved) return; const a = D.move; const prev = `${Math.round(a.anchor.x * 100)}%, ${Math.round(a.anchor.y * 100)}%`; a.anchor.x = D.nx; a.anchor.y = D.ny; annHist({ op: 'move', before: D.before, after: annClone(a) }); annLog('Annotation moved', annObj(a), a, { prev, next: `${Math.round(D.nx * 100)}%, ${Math.round(D.ny * 100)}%` }); save(); render(); return; }
  const r = D.r; const obj = reviewObj(); const page = +D.layer.dataset.page || undefined; const vd = D.layer.closest('.an-vframe') && document.querySelector('.an-scope video'); const t = vd ? Math.round(vd.currentTime * 10) / 10 : undefined;
  const base = { target: D.layer.dataset.anRegion, ...(page ? { page } : {}), ...(t != null ? { t } : {}) }; let anchor, style;
  if (D.tool === 'note') { anchor = { kind: 'point', ...base, x: r.x, y: r.y }; style = 'note'; }
  else if (!r || (D.tool === 'arrow' ? Math.hypot(r.w, r.h) < 0.03 : D.tool === 'ink' ? D.pts.length < 3 : r.w < 0.015 || r.h < 0.015)) { if (D.el) D.el.remove(); if (D.live) D.live.innerHTML = ''; return; }
  else if (D.tool === 'region') { anchor = { kind: 'region', ...base, x: r.x, y: r.y, w: r.w, h: r.h }; style = 'comment'; }
  else { const pts = D.tool === 'ink' ? D.pts.filter((_, i) => i % 2 === 0 || i === D.pts.length - 1).map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000]) : D.tool === 'arrow' ? [[D.p0.x, D.p0.y], D.p1] : undefined;
    anchor = { kind: 'shape', ...base, shape: D.tool, x: r.x, y: r.y, w: r.w, h: r.h, ...(pts ? { pts } : {}) }; style = D.tool; }
  const U = annUI(); U.sel = null; U.comp = { objId: obj.id, anchor, style }; if (t != null) U.seek = t; menReset('an-text'); render(); setTimeout(() => { const c = document.getElementById('an-comp'); c && c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); const x = document.getElementById('an-text'); x && x.focus({ preventScroll: true }); }, 30);
});

// Comments tab on module and asset detail: the same canvas, open to the people taking part in the review.
function commentsTab(obj) {
  const ed = canAnnotate(obj) && !['Approved', 'Superseded'].includes(statusOf(obj)) && !obj.archived;
  const others = obj.versions.filter(v => v.v !== latest(obj).v).map(v => [v.v, annsFor(obj, v.v).length]).filter(x => x[1]);
  return `<div class="grid cols-main rv-grid"><section class="panel"><div class="panel-head"><h3>v${latest(obj).v} · ${esc(statusOf(obj))}</h3><span class="grow"></span>${obj.review && canActOn(me(), obj) ? goBtn('Open review', kindOf(obj) === 'Asset' ? 'asset-review' : 'review', obj.id, 'sm primary', 'shieldcheck') : ''}</div><div class="panel-body">${reviewCanvas(obj, ed)}</div></section>
  <div class="stack rv-side">${commentsPanel(obj, ed)}${others.length ? `<section class="panel"><div class="panel-head"><h3>Earlier versions</h3></div><div class="panel-body stack" style="gap:6px">${others.map(([v, n]) => `<button class="btn ghost sm" data-act="version-open" data-kind="${kindOf(obj)}" data-id="${obj.id}" data-v="${v}">v${v} · ${n} comment${n > 1 ? 's' : ''}</button>`).join('')}</div></section>` : ''}</div></div>`;
}
