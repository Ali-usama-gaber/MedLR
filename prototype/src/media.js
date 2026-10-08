/* ---------- Media & document modules: previews ----------
   Images and videos preview natively. PDFs are rendered page by page with pdf.js (loaded on first use);
   if it cannot load, an embedded viewer and an Open link are shown instead. */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const PDFC = {};
let pdfLib = null;
function loadPdfJs() {
  if (pdfLib) return pdfLib;
  return (pdfLib = new Promise((res, rej) => { if (window.pdfjsLib) return res(window.pdfjsLib); const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); }; s.onerror = rej; document.head.appendChild(s); setTimeout(() => rej(new Error('timeout')), 15000); }));
}
async function pdfRender(fileId, url) {
  const lib = await loadPdfJs(); const doc = await lib.getDocument(url).promise; const thumbs = [];
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) { const pg = await doc.getPage(i); const vp = pg.getViewport({ scale: 1.2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; thumbs.push(c.toDataURL('image/jpeg', 0.82)); }
  return { pages: doc.numPages, thumbs };
}
// Called after every render: turns PDF placeholders into rendered pages.
function hydratePdfs() {
  document.querySelectorAll('[data-pdf]').forEach(el => { const id = el.dataset.pdf; if (PDFC[id]) return; PDFC[id] = { loading: true };
    pdfRender(id, el.dataset.url).then(r => { PDFC[id] = r; renderSoon(); }, () => { PDFC[id] = { failed: true }; renderSoon(); }); });
}
const mediaKindOf = md => !md || !md.mime ? '' : md.mime.startsWith('image/') ? 'image' : md.mime.startsWith('video/') ? 'video' : 'document';
function pdfView(md, url, mode) {
  const c = PDFC[md.fileId]; const open = `<a class="btn sm" href="${url}" target="_blank" rel="noopener" download="${esc(md.name)}">${icon('download', 'sm')}Open PDF</a>`;
  if (c && c.thumbs) return mode === 'thumb' ? `<img class="media-img thumb pdf-page" src="${c.thumbs[0]}" alt="First page of ${esc(md.name)}">` : `<div class="pdf-pages">${c.thumbs.map((t, i) => `<figure><img class="pdf-page" src="${t}" alt="Page ${i + 1} of ${esc(md.name)}"><figcaption>Page ${i + 1} of ${c.pages}</figcaption></figure>`).join('')}</div><div class="row" style="justify-content:center;margin-top:10px">${c.pages > 3 ? `<span class="muted" style="font-size:12px">${c.pages - 3} more page${c.pages - 3 > 1 ? 's' : ''} — open the PDF to read all</span>` : ''}${open}</div>`;
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
