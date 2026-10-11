/* ---------- Media & document modules: previews ----------
   Images and videos preview natively. PDFs are rendered page by page with pdf.js (loaded on first use);
   if it cannot load, an embedded viewer and an Open link are shown instead. */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const PDFC = {};
let pdfLib = null;
function loadPdfJs() {
  if (pdfLib) return pdfLib;
  // A failed or slow load is not cached, so the next preview tries again.
  // The bundled copy runs its worker from the inlined source; the CDN copy is only a fallback.
  const wk = document.getElementById('pdfjs-worker');
  if (window.pdfjsLib && wk && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([wk.textContent], { type: 'text/javascript' }));
  pdfLib = new Promise((res, rej) => { if (window.pdfjsLib) return res(window.pdfjsLib); const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); }; s.onerror = () => { s.remove(); rej(new Error('pdf.js could not load')); }; document.head.appendChild(s); setTimeout(() => rej(new Error('timeout')), 20000); });
  pdfLib.catch(() => { if (!window.pdfjsLib) pdfLib = null; });
  return pdfLib;
}
async function pdfRender(fileId, url) {
  const lib = await loadPdfJs(); const doc = await lib.getDocument(url).promise; const thumbs = [];
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) { const pg = await doc.getPage(i); const vp = pg.getViewport({ scale: 1.2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; thumbs.push(c.toDataURL('image/jpeg', 0.82)); }
  return { pages: doc.numPages, thumbs };
}
// Called after every render: turns PDF placeholders into rendered pages.
function hydratePdfs() {
  document.querySelectorAll('[data-pdf]').forEach(el => { const id = el.dataset.pdf; if (PDFC[id]) return; PDFC[id] = { loading: true };
    const url = el.dataset.url; const attempt = n => pdfRender(id, url).then(r => { PDFC[id] = r; renderSoon(); }, () => n < 3 ? setTimeout(() => attempt(n + 1), 1500 * n) : (PDFC[id] = { failed: true }, renderSoon())); attempt(1); });
}
const mediaKindOf = md => !md || !md.mime ? '' : md.mime.startsWith('image/') ? 'image' : md.mime.startsWith('video/') ? 'video' : 'document';
function pdfView(md, url, mode) {
  const c = PDFC[md.fileId]; const open = fileActions(md);
  if (c && c.thumbs) return mode === 'thumb' ? `<img class="media-img thumb pdf-page" src="${c.thumbs[0]}" alt="First page of ${esc(md.name)}">` : `<div class="pdf-pages">${c.thumbs.map((t, i) => `<figure><img class="pdf-page" src="${t}" alt="Page ${i + 1} of ${esc(md.name)}"><figcaption>Page ${i + 1} of ${c.pages}</figcaption></figure>`).join('')}</div><div class="row" style="justify-content:center;margin-top:10px">${c.pages > 3 ? `<span class="muted" style="font-size:12px">${c.pages - 3} more page${c.pages - 3 > 1 ? 's' : ''} — preview to read all</span>` : ''}${open}</div>`;
  if (c && c.failed) return mode === 'thumb' ? `<div class="media-empty thumb">${icon('file')}</div>` : `<object class="pdf-embed" data="${url}" type="application/pdf" aria-label="${esc(md.name)}"><div class="media-empty">${icon('file')}<span>Preview not available in this browser.</span>${open}</div></object><div class="row" style="justify-content:center;margin-top:8px">${open}</div>`;
  return `<div class="media-empty ${mode === 'thumb' ? 'thumb' : ''}" data-pdf="${md.fileId}" data-url="${url}">${icon('file')}${mode === 'thumb' ? '' : '<span>Rendering PDF preview…</span>'}</div>`;
}
// The preview of an approved (or draft) file. mode: 'full' | 'thumb'.
function mediaView(md, mode = 'full') {
  if (!md || !md.fileId) return `<div class="media-empty ${mode === 'thumb' ? 'thumb' : ''}">${icon('upload')}${mode === 'thumb' ? '' : '<span>No file uploaded yet</span>'}</div>`;
  const url = mediaUrl(md.fileId);
  if (url === null) return `<div class="media-empty ${mode === 'thumb' ? 'thumb' : ''}">${mode === 'thumb' ? icon('clock') : '<span>Loading file…</span>'}</div>`;
  if (url === 'missing') return `<div class="media-empty ${mode === 'thumb' ? 'thumb' : ''}">${icon('alert')}${mode === 'thumb' ? '' : '<span>This file is not stored in this browser.</span>'}</div>`;
  const k = mediaKindOf(md);
  if (k === 'image') return `<img class="media-img ${mode}" src="${url}" alt="${esc(md.alt || md.name)}">`;
  if (k === 'video') return mode === 'thumb' ? `<span class="media-vthumb"><video class="media-vid thumb" muted preload="metadata" playsinline aria-hidden="true">${videoSources(md, url, '#t=0.5')}</video><span class="vplay">${icon('play', 'sm')}</span></span>` : `<video class="media-vid full" controls preload="metadata" playsinline aria-label="${esc(md.name)}">${videoSources(md, url)}</video>`;
  return pdfView(md, url, mode);
}
// Bundled sample videos also carry a WebM copy for browsers without H.264.
const videoSources = (md, url, frag = '') => { const sd = md.fileId.startsWith('seed:') && SEED_MEDIA[md.fileId.slice(5)]; return `<source src="${url}${frag}" type="${md.mime}">${sd && sd.alt ? `<source src="${sd.alt}${frag}" type="video/webm">` : ''}`; };
const mediaFactsKV = md => `<dl class="kv media-kv">${mediaFacts(md).map(([k, v]) => `<dt>${k}</dt><dd>${k === 'Checksum' ? `<span class="mono" title="${esc((md.algo || '') + ' ' + md.checksum)}">${esc(v)}</span>` : esc(v)}</dd>`).join('')}</dl>`;
const mediaRules = md => `<div class="media-rules"><div><span>Source</span><p>${esc(md && md.source || '—')}</p></div><div><span>Usage rules</span><p>${esc(md && md.usage || '—')}</p></div></div>`;
// Thumbnail for lists: the file for media modules, the type icon for content modules.
function modThumb(m, v) { const md = isMediaType(m.type) ? mediaOf(m, v || live(m) || latest(m)) : null; return md ? `<span class="mthumb">${mediaView(md, 'thumb')}</span>` : typeIco(m.type); }
// Compact card that makes an uploaded file obvious: thumbnail, name, type, size, and version/status when given.
function fileCard(md, extra = '') {
  if (!md || !md.fileId) return '';
  const k = mediaKindOf(md); const label = { image: 'Image', video: 'Video', document: 'PDF' }[k] || 'File';
  const info = [label + (md.format ? ' · ' + md.format.replace(/^[A-Z0-9]+ · /, '') : ''), fmtSize(md.size), md.duration != null ? fmtSecs(md.duration) : ''].filter(Boolean).join(' · ');
  return `<div class="file-card k-${k}"><span class="fc-thumb">${mediaView(md, 'thumb')}${k === 'document' ? '<span class="fc-badge">PDF</span>' : ''}</span><span class="fc-body"><b title="${esc(md.name)}">${esc(md.name)}</b><span>${esc(info)}</span>${extra ? `<span class="fc-extra">${extra}</span>` : ''}</span></div>`;
}

/* ---------- File viewer: Preview opens the file inside the app, Download saves the original ----------
   Every place that shows an uploaded file offers these two explicit actions. */
const FILES = {};
// ctx: what the file belongs to, e.g. "MOD-A-050 · v1 · Approved" (shown in the viewer header).
function fileActions(md, ctx = '', cls = '') {
  if (!md || !md.fileId) return ''; FILES[md.fileId] = { md, ctx };
  const url = mediaUrl(md.fileId); const ok = url && url !== 'missing';
  return `<span class="file-acts ${cls}"><button type="button" class="btn sm" data-act="file-open" data-file="${esc(md.fileId)}">${icon('eye', 'sm')}Preview</button>${ok ? `<a class="btn sm ghost" href="${url}" download="${esc(md.name)}" data-file-dl="${esc(md.fileId)}">${icon('download', 'sm')}Download</a>` : ''}</span>`;
}
const fileKindLabel = md => ({ image: 'Image', video: 'Video', document: 'PDF document' })[mediaKindOf(md)] || 'File';
function fileViewerModal(M) {
  const F_ = FILES[M.id]; if (!F_) return modalShell('file', '', 'File not available', '', '<p class="muted">The file is no longer listed on this page.</p>', btn('Close', 'modal-close'));
  const md = F_.md; const url = mediaUrl(md.fileId); const k = mediaKindOf(md); const z = M.z || 1; let body;
  const dl = url && url !== 'missing' ? `<a class="btn" href="${url}" download="${esc(md.name)}" data-file-dl="${esc(md.fileId)}">${icon('download', 'sm')}Download original</a>` : '';
  const zoomBar = `<div class="fv-zoom" role="toolbar" aria-label="Zoom"><button type="button" class="btn icon sm" data-act="fv-zoom" data-v="-1" aria-label="Zoom out">−</button><span class="mono">${Math.round(z * 100)}%</span><button type="button" class="btn icon sm" data-act="fv-zoom" data-v="1" aria-label="Zoom in">+</button><button type="button" class="btn ghost sm" data-act="fv-zoom" data-v="0">Fit</button></div>`;
  if (!url) body = `<div class="media-empty">${icon('clock')}<span>Loading file…</span></div>`;
  else if (url === 'missing') body = `<div class="media-empty">${icon('alert')}<span>This file is not stored in this browser.</span></div>`;
  else if (k === 'image') body = `${zoomBar}<div class="fv-canvas"><img src="${url}" alt="${esc(md.alt || md.name)}" style="width:${z * 100}%" draggable="false"></div>`;
  else if (k === 'video') body = `<div class="fv-video"><video controls preload="metadata" playsinline aria-label="${esc(md.name)}">${videoSources(md, url)}</video></div>`;
  else if (k === 'document') { const R = PDFR[md.fileId];
    body = !R ? `<div class="media-empty" data-pdfr="${md.fileId}" data-url="${url}">${icon('file')}<span>Opening document…</span></div>` : R.loading ? `<div class="media-empty">${icon('clock')}<span>Opening document…</span></div>`
      : R.failed ? `<iframe class="fv-frame" src="${url}" title="${esc(md.name)}"></iframe><p class="muted" style="font-size:12px">${icon('alert', 'sm')} The page renderer could not load, so the browser’s own viewer is used.</p>`
      : `${zoomBar}<div class="fv-canvas fv-pages">${R.pages.map((p, i) => `<figure style="width:${z * 100}%"><img src="${p.img}" alt="Page ${i + 1} of ${esc(md.name)}" draggable="false"><figcaption>Page ${i + 1} of ${R.n}</figcaption></figure>`).join('')}${R.n > R.pages.length ? `<p class="muted" style="text-align:center">Pages ${R.pages.length + 1}–${R.n} are not rendered here; download the original to read them.</p>` : ''}</div>`; }
  else body = `<div class="media-empty">${icon('file')}<span>No in-app preview for this file type.</span></div>`;
  return modalShell(k === 'image' ? 'image' : k === 'video' ? 'video' : 'file', '', esc(md.name), `${esc(fileKindLabel(md))} · ${esc(fmtSize(md.size))}${F_.ctx ? ' · ' + esc(F_.ctx) : ''}`,
    `<div class="fv">${body}</div><details class="fv-info"><summary>File information</summary>${mediaFactsKV(md)}</details>`, `${dl}${btn('Close', 'modal-close', 'primary')}`, true);
}
