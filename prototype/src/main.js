/* ---------- Controller: routing, modals, actions ---------- */
const ROUTES = { home: viewHome, tasks: viewApprovals, approvals: viewApprovals, modules: viewModules, module: viewModule, 'module-new': viewModuleForm, 'module-edit': viewModuleForm, review: viewReview, library: viewLibrary, assets: viewAssets, assemble: viewAssemble, asset: viewAsset, 'asset-review': viewAssetReview, cover: viewCover, lifecycle: viewLifecycle, audit: viewAudit, reports: viewReports, users: () => viewHub('org', 'users'), user: viewUser, 'user-new': viewUserForm, 'user-edit': viewUserForm, roles: viewRoles, sops: viewSops, settings: () => viewSettings(), item: viewConfigItem, refdata: () => viewHub('refdata'), org: () => viewHub('org'), products: () => viewHub('refdata', 'products'), markets: () => viewHub('refdata', 'markets'), moduletypes: () => viewHub('refdata', 'moduletypes'), materials: () => viewHub('refdata', 'materials'), channels: () => viewHub('refdata', 'channels'), audiences: () => viewHub('refdata', 'audiences'), references: () => viewHub('refdata', 'references'), refkinds: () => viewHub('refdata', 'refkinds'), teams: () => viewHub('org', 'teams'), functions: () => viewHub('org', 'functions'), workflows: viewWorkflows, workflow: viewWorkflow, 'workflow-new': viewWorkflowNew };
const app = document.getElementById('app');

/* The current page lives in the URL hash (#/module?id=MOD-A-014&tab=versions), so browser Back/Forward,
   refresh, bookmarks and shared links open the same page. The app still navigates only through go(). */
function routeHash(name, p) {
  const q = Object.keys(p || {}).filter(k => p[k] != null && p[k] !== '' && typeof p[k] !== 'object' && typeof p[k] !== 'function').map(k => encodeURIComponent(k) + '=' + encodeURIComponent(p[k])).join('&');
  return '#/' + encodeURIComponent(name) + (q ? '?' + q : '');
}
function parseHash(h) {
  const m = /^#\/([^?]+)(?:\?(.*))?$/.exec(h || ''); if (!m) return null;
  let name; try { name = decodeURIComponent(m[1]); } catch (e) { return null; }
  if (!ROUTES[name]) return null;
  const p = {}; (m[2] || '').split('&').filter(Boolean).forEach(kv => { const i = kv.indexOf('='); try { const k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)); const v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1)); p[k] = v === 'true' ? true : v; } catch (e) {} });
  return { name, p };
}
function syncHash(replace) {
  const r = UI.route; let url;
  if (!S.signedIn || r.name === 'login' || r.name === 'forgot') { if (!location.hash) return; url = location.pathname + location.search; }
  else { url = routeHash(r.name, r.p); if (location.hash === url) return; }
  try { history[replace ? 'replaceState' : 'pushState'](null, '', url); } catch (e) {}
}
function go(name, p = {}, fromHistory) {
  if (name === 'settings' && p.tab && typeof hubOf === 'function' && hubOf(p.tab)) { name = p.tab; p = {}; } // old Settings links to moved lists
  if (name === 'login' || name === 'forgot') { UI.modal = null; UI.f.resetSent = null; UI.f.forgotErr = null; UI.f.loginErr = null; }
  if ((name === 'module-edit' || name === 'module-new') && (UI.route.name !== name || UI.route.p.id !== p.id)) UI.draft = null;
  if (name === 'user-new' || name === 'user-edit') UI.udraft = null;
  if (name !== 'workflow') UI.wfDraft = null;
  if (name === 'workflow-new' && UI.route.name !== 'workflow-new') UI.nwf = null;
  if (name !== 'settings') UI.setDraft = null;
  if (UI.an && (UI.route.name !== name || UI.route.p.id !== p.id)) Object.assign(UI.an, { tool: null, sel: null, comp: null, men: null, edit: null, reply: null, seek: null });
  UI.route = { name, p }; UI.pop = null; UI.msel = null; UI.search = ''; UI.f.rvc = '';
  save(); syncHash(!!fromHistory); render(); window.scrollTo(0, 0);
}
// Browser Back / Forward: open the page in the URL; an open dialog closes first, like Escape.
window.addEventListener('popstate', () => {
  if (!S.signedIn) { const t = parseHash(location.hash); if (t && t.name !== 'login' && t.name !== 'forgot') UI.after = t; return; } // opens after sign-in
  const t = parseHash(location.hash) || { name: 'home', p: {} };
  UI.modal = null; go(t.name, t.p, true);
});

/* In-place DOM patching. Re-rendering used to replace the whole app with innerHTML, which destroyed and rebuilt every
   element on each interaction (images and PDF pages redrawn, videos restarted, panel scroll reset) — it looked like a reload.
   patchDOM keeps every node that is still the same and only changes what differs. */
function patchDOM(root, html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  try { patchChildren(root, tpl.content); } catch (e) { root.innerHTML = html; }
}
const sameNode = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.nodeType !== 1 || ((a.id || '') === (b.id || '') && (a.getAttribute('data-key') || '') === (b.getAttribute('data-key') || '') && !(a.nodeName === 'INPUT' && a.type !== b.getAttribute('type') && (b.getAttribute('type') || 'text') !== a.type)));
function patchChildren(from, to) {
  // Text layers and other containers filled after render keep their content while the new markup leaves them empty.
  if (from.nodeType === 1 && from.dataset && from.dataset.done && !to.firstChild) return;
  const a = [...from.childNodes], b = [...to.childNodes];
  for (let i = 0; i < b.length; i++) {
    const nb = b[i], na = from.childNodes[i];
    if (!na) { from.appendChild(nb.cloneNode(true)); continue; }
    if (!sameNode(na, nb)) { from.replaceChild(nb.cloneNode(true), na); continue; }
    if (na.nodeType === 3 || na.nodeType === 8) { if (na.nodeValue !== nb.nodeValue) na.nodeValue = nb.nodeValue; continue; }
    patchEl(na, nb);
  }
  while (from.childNodes.length > b.length) from.removeChild(from.lastChild);
}
// Popovers and dropdowns stay on screen: shifted sideways when they would cross an edge, and opened
// upwards when there is no room below but room above.
function fitPops() {
  document.querySelectorAll('.pop, .msel-pop').forEach(el => {
    if (getComputedStyle(el).position === 'fixed') return;
    el.style.transform = ''; el.style.maxHeight = ''; el.classList.remove('up');
    let r = el.getBoundingClientRect(); const vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 8;
    const anchor = el.parentElement.getBoundingClientRect(); const below = vh - m - r.top, above = anchor.top - 8 - m;
    if (r.bottom > vh - m) {
      if (above > below && above > 160) { el.classList.add('up'); if (r.height > above) el.style.maxHeight = above + 'px'; }
      else el.style.maxHeight = Math.max(160, below) + 'px';
      if (el.style.maxHeight) el.style.overflowY = 'auto';
      r = el.getBoundingClientRect();
    }
    let dx = 0; if (r.right > vw - m) dx = vw - m - r.right; if (r.left + dx < m) dx = m - r.left;
    if (dx) { const base = getComputedStyle(el).transform; el.style.transform = (base && base !== 'none' ? base + ' ' : '') + `translateX(${Math.round(dx)}px)`; }
  });
}
window.addEventListener('resize', () => fitPops());
function patchEl(a, b) {
  // media keeps playing or showing when its source is unchanged
  if ((a.nodeName === 'VIDEO' || a.nodeName === 'IFRAME' || a.nodeName === 'OBJECT') && a.outerHTML !== b.outerHTML && a.innerHTML !== b.innerHTML) { a.replaceWith(b.cloneNode(true)); return; }
  // A field keeps what the person typed unless the app itself now renders a different value for it,
  // so a background re-render (toast, timer, notification) never wipes unsaved input.
  const prevV = a.nodeName === 'INPUT' ? a.getAttribute('value') || '' : a.nodeName === 'TEXTAREA' ? a.defaultValue : null;
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  if (a.nodeName === 'INPUT') { const v = b.getAttribute('value') || ''; if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.hasAttribute('checked'); else if (a.type !== 'file' && v !== prevV && a.value !== v) a.value = v; return; }
  if (a.nodeName === 'TEXTAREA') { const v = b.textContent; if (v !== prevV) { a.defaultValue = v; if (a.value !== v) a.value = v; } return; }
  if (a.nodeName === 'VIDEO') return;
  patchChildren(a, b);
  if (a.nodeName === 'SELECT') { const o = [...b.options].findIndex(x => x.hasAttribute('selected')); a.selectedIndex = o >= 0 ? o : 0; }
}
// A field that commits on blur can fire 'change' while the page is being replaced; defer that nested render.
let rendering = false;
function render() {
  if (rendering) { setTimeout(render, 0); return; }
  rendering = true;
  try { renderNow(); } finally { rendering = false; }
}
function renderNow() {
  const ae = document.activeElement; const fid = ae && ae.id; let s0 = null, s1 = null; try { s0 = ae.selectionStart; s1 = ae.selectionEnd; } catch (e) {}
  const r = UI.route.name; let html;
  if (!S.signedIn || r === 'login' || r === 'forgot') html = viewLogin();
  else {
    const u = me(); const C0 = CONFIG[(UI.route.p || {}).k] || {}; const perm = r === 'item' ? C0.viewPerm || [C0.perm, ADMIN_VIEW] : ROUTE_PERM[r];
    const inner = perm && !can(u, perm) ? `<div class="empty"><h4>You do not have access to this page</h4><p>Your role (${esc(roleLabel(u))}) does not include the “${esc((PERMS.find(p => p[0] === [].concat(perm)[0]) || [perm, perm])[1])}” permission. Ask an administrator if you need it.</p><br>${goBtn('Go home', 'home', null, 'primary')}</div>` : (ROUTES[r] || viewHome)();
    html = viewShell(inner);
  }
  html += UI.modal ? viewModal() : '';
  patchDOM(app, html);
  // While a dialog or side panel is open the page behind it does not scroll.
  document.documentElement.classList.toggle('ov-open', !!UI.modal);
  paginateTables(); hydratePdfs(); hydrateReview(); fitPops();
  const rk = UI.route.name + JSON.stringify(UI.route.p || {}) + (S.signedIn ? 1 : 0);
  if (rk !== UI._rk) { UI._rk = rk; const c = document.getElementById('content'); if (c) { c.classList.add('enter'); countUp(c); } }
  app.querySelectorAll('table.tbl').forEach(t => { const hs = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim()); t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (hs[i]) td.setAttribute('data-label', hs[i]); })); });
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) {} } }
}

function countUp(root) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.kpi b, .sb-legend b').forEach(el => {
    const m = /^(\d+)(%?)$/.exec(el.textContent.trim()); if (!m) return; const to = +m[1]; if (to < 2) return;
    const t0 = performance.now(), dur = 650; const tick = now => { const k = Math.max(0, Math.min(1, (now - t0) / dur)); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + m[2]; if (k < 1) requestAnimationFrame(tick); };
    el.textContent = '0' + m[2]; requestAnimationFrame(tick);
  });
}
const PAGE_SIZE = 10;
function paginateTables() {
  UI.pg = UI.pg || {}; const base = UI.route.name + ':' + JSON.stringify(UI.route.p || {});
  app.querySelectorAll('table.tbl').forEach((t, ti) => {
    if (t.classList.contains('no-pg') || t.closest('.modal')) return;
    const body = t.tBodies[0]; if (!body) return; const rows = [...body.rows]; const k = base + '#' + ti;
    const st = UI.pg[k] || (UI.pg[k] = { p: 0, n: rows.length }); if (st.n !== rows.length) { st.p = 0; st.n = rows.length; }
    if (rows.length <= PAGE_SIZE) return;
    const pages = Math.ceil(rows.length / PAGE_SIZE); st.p = Math.max(0, Math.min(st.p, pages - 1));
    rows.forEach((r, i) => { if (i < st.p * PAGE_SIZE || i >= (st.p + 1) * PAGE_SIZE) r.hidden = true; });
    const from = st.p * PAGE_SIZE + 1, to = Math.min(rows.length, (st.p + 1) * PAGE_SIZE), K = encodeURIComponent(k);
    const b = (pg, label, extra = '') => `<button type="button" data-act="pg" data-k="${K}" data-ti="${ti}" data-p="${pg}" ${extra}>${label}</button>`;
    let nums = ''; for (let i = 0; i < pages; i++) { if (pages > 7 && i > 0 && i < pages - 1 && Math.abs(i - st.p) > 1) { if (!nums.endsWith('…</span>')) nums += '<span class="gap">…</span>'; continue; } nums += b(i, i + 1, i === st.p ? 'class="on" aria-current="page"' : `aria-label="Page ${i + 1}"`); }
    const el = document.createElement('div'); el.className = 'pager';
    el.innerHTML = `<span class="info">Showing <b>${from}–${to}</b> of <b>${rows.length}</b></span><nav class="pg" aria-label="Pagination">${b(st.p - 1, icon('back', 'sm') + '<span>Previous</span>', st.p === 0 ? 'disabled class="nav"' : 'class="nav"')}${nums}${b(st.p + 1, '<span>Next</span>' + icon('chevron', 'sm'), st.p === pages - 1 ? 'disabled class="nav"' : 'class="nav"')}</nav>`;
    t.after(el);
  });
}
// Saves a file: through the claude.ai downloads capability when hosted there, otherwise a normal browser download.
function saveFile(filename, data, type, done) {
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then(dl => { if (!dl) { toast('Export is not available in this view'); return; } dl.save({ filename, data }).then(() => toast(done, 'ok'), e => { if (e && e.code !== 'declined') toast('Export is not available in this view'); }); });
    return;
  }
  try { const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([data], { type })); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); toast(done, 'ok'); }
  catch (e) { toast('Export is not available in this browser'); }
}
// Refusals and failures read differently from confirmations: alert icon, warning colour, announced assertively, shown longer.
const TOAST_ERR = /^(you |your role|cannot|could not|changes could not|it is in use|only |give |enter |write |add an active|this (workflow|module|file|[a-z]+ module accepts)|the file is larger|an active|export is not|content and media)/i;
function toast(text, kind) {
  const box = document.getElementById('toasts'); const t = document.createElement('div'); const err = kind === 'err' || (kind !== 'ok' && TOAST_ERR.test(String(text)));
  t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', err ? 'alert' : 'status');
  t.innerHTML = icon(err ? 'alert' : 'check', 'sm') + '<span>' + esc(text) + '</span>'; box.appendChild(t); while (box.children.length > 2) box.firstChild.remove(); setTimeout(() => t.remove(), err ? 6000 : 3600);
}

/* ===== Modals ===== */
const modalShell = (icoName, tone, title, sub, body, foot, wide) => `<div class="scrim" data-act="modal-bg"><div class="modal ${wide ? (wide === 'xl' ? 'wide xl' : 'wide') : ''}" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="modal-head"><div class="m-ico ${tone}">${icon(icoName)}</div><div style="flex:1;min-width:0"><h2 id="m-title">${title}</h2>${sub ? `<p class="ink2" style="margin-top:4px">${sub}</p>` : ''}</div><button class="btn icon sm" data-act="modal-close" aria-label="Close">${icon('x', 'sm')}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div></div>`;
function wfVisual(wf) {
  const groups = []; wf.steps.forEach(s => { const g = groups[groups.length - 1]; if (g && g.fn === s.fn && !isNotify(s)) g.steps.push(s); else groups.push({ fn: s.fn, steps: [s] }); });
  return `<div class="wf-groups">${groups.map((g, i) => `<div class="wf-group"><b>${isNotify(g.steps[0]) ? icon('mail', 'sm') + ' Email' : fnBadge(g.fn, 'sm') + ' ' + esc(g.fn)}</b><div class="stack" style="gap:6px;margin-top:8px">${g.steps.map(s => `<div class="row nowrap" style="gap:6px;font-size:12.5px">${isNotify(s) ? 'To ' + esc(notifyTo(s).length + ' ' + (notifyTo(s).length === 1 ? 'person' : 'people')) : lvl(s.level) + (s.req === 'approve' ? 'Approval' : 'Review')}</div>`).join('')}</div></div>${i < groups.length - 1 ? `<span class="wf-g-arrow">${icon('arrow', 'sm')}</span>` : ''}`).join('')}</div>`;
}
const objCard = (obj, kind) => `<div class="ref obj-card">${kind === 'Asset' ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : typeIco(obj.type)}<div style="flex:1;min-width:0"><b>${esc(nameOf(obj))}</b><br><span class="mono muted">${obj.id} · v${latest(obj).v} · ${esc(productsTxt(obj.products))} · ${esc(obj.markets.join(', '))}</span></div>${chip(statusOf(obj))}</div>`;
function issuesBlock(issues) {
  return `<div class="banner bad">${icon('alert')}<div class="txt"><b>${issues.length} Validation SOP${issues.length > 1 ? 's' : ''} failing — fix before submitting</b><ul class="issue-list">${issues.map(x => `<li><b>${esc(x.label)}:</b> ${esc(x.issue)}</li>`).join('')}</ul></div></div>`;
}
// The path diagrams that make Reject and Amend & Resubmit impossible to confuse.
function pathDiagram(kind, st, obj) {
  const wf = wfById(obj.review.wf); const first = reviewSteps(wf)[0];
  const node = (ic, t, s, cls = '') => `<div class="pd-node ${cls}"><span class="pd-ico">${icon(ic, 'sm')}</span><b>${t}</b><span>${s}</span></div>`;
  const arrow = `<span class="pd-arrow">${icon('arrow', 'sm')}</span>`;
  if (kind === 'amend') return `<div class="pathd amend">${node('undo', 'Material Owner', 'Makes the requested changes', 'owner')}${arrow}${node('send', 'Resubmit', 'Same version, same cycle')}${arrow}${node('shieldcheck', 'Resumes here', esc(stepLabel(st)), 'here')}</div><p class="pd-note">${icon('check', 'sm')} Steps already completed in this cycle stay approved.</p>`;
  return `<div class="pathd reject">${node('x', 'Rejected', 'This cycle ends now', 'stop')}${arrow}${node('copy', 'Material Owner', 'Creates a new version', 'owner')}${arrow}${node('refresh', 'Full cycle restarts', 'From step 1 · ' + esc(stepLabel(first)), 'restart')}</div><p class="pd-note">${icon('alert', 'sm')} All approvals in this cycle are discarded. The new version goes through every step again.</p>`;
}
function viewModal() {
  const M = UI.modal; const u = me();
  if (M.type === 'wf-view') {
    const w = wfById(M.id); const team = fn => S.teams.find(t => t.fn === fn);
    return modalShell('workflow', '', esc(w.name), esc(w.desc), `${flowPreview(w.steps, w.appliesTo === 'Asset' ? 'Asset submitted' : 'Submitted', w.appliesTo === 'Asset' ? 'Asset approved' : 'Approved')}
      <div class="wf" style="margin-top:6px">${w.steps.map((s, i) => { if (isNotify(s)) return `<div class="wf-step notify"><div class="wf-dot">${icon('mail', 'sm')}</div><div><div class="t">${fnBadge('Email', 'sm')}Email notification</div><div class="s">To ${esc(notifyTo(s).join(', ') || 'no one')} · “${esc(s.subject || '')}”</div></div></div>`; const who = assigneeFor(s); return `<div class="wf-step"><div class="wf-dot">${reviewPos(w, i)}</div><div><div class="t">${fnBadge(s.fn, 'sm')}${esc(s.fn)} <span class="muted">·</span> ${s.req === 'approve' ? 'Approval' : 'Review'} ${lvl(s.level)}</div><div class="s">${esc((team(s.fn) || {}).name || s.fn)} · ${who.length ? esc(who.map(x => x.name).join(', ')) : 'No active ' + esc(stepWho(s))}</div></div></div>`; }).join('')}</div>`,
      `${btn('Close', 'modal-close')}${can(u, 'manage_workflows') ? `<button class="btn primary" data-act="wf-open" data-id="${w.id}">${icon('edit', 'sm')}Open in builder</button>` : ''}`, true);
  }
  if (M.type === 'cfg') return cfgModal(M);
  if (M.type === 'step') return stepDetailModal(M);
  if (M.type === 'filters') return filterModal(M);
  if (M.type === 'role') return roleModal(M);
  if (M.type === 'compare') return roleCompareModal(M);
  if (M.type === 'rp-info') return rolesInfoModal(M);
  if (M.type === 'file') return fileViewerModal(M);
  if (M.type === 'wf-panel') return `<div class="scrim drawer-scrim" data-act="modal-bg"><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title"><header class="drawer-head"><div><span class="eyebrow">Create Module · ${esc((UI.draft && UI.draft.title) || 'new module')}</span><h2 id="dr-title">New workflow</h2><p class="muted">Your module entries stay as they are. The workflow is selected when you create it.</p></div><button type="button" class="btn icon" data-act="modal-close" aria-label="Close">${icon('x')}</button></header><div class="drawer-body">${viewWorkflowNew(true)}</div></aside></div>`;
  if (M.type === 'version') {
    const obj = objById(M.kind, M.id); const v = verOf(obj, +M.v);
    return modalShell('history', '', `Version ${v.v} · approval history`, `${esc(nameOf(obj))} · <span class="mono">${obj.id}</span>`, versionModalBody(obj, M.kind, v), `${v.approvedAt ? goBtn('Cover letter', 'cover', obj.id, '', 'award', ` data-k="${M.kind}" data-v="${v.v}"`) : ''}${btn('Close', 'modal-close', 'primary')}`, true);
  }
  if (M.type === 'submit') {
    const m = modById(M.id); const l = latest(m); const issues = validationIssues(m, 'Module');
    if (!canSubmit(u)) return modalShell('send', '', 'Send to Content Lead', 'Content Members prepare drafts. A Content Lead checks and submits them for MLR review.', objCard(m, 'Module') + (issues.length ? issuesBlock(issues) : ''), `${btn('Cancel', 'modal-close')}${btn('Send to Lead', 'submit-confirm', 'primary', `data-id="${m.id}" ${issues.length ? 'disabled' : ''}`, 'send')}`);
    const wfs = S.workflows.filter(w => w.appliesTo === 'Module' && !w.hidden && w.active !== false); const chosen = wfs.some(w => w.id === M.wf) ? M.wf : (wfs[0] || {}).id;
    if (!wfs.length) return modalShell('alert', 'bad', 'No active module workflow', 'An administrator needs to activate or create a workflow that applies to modules.', '', btn('Close', 'modal-close')); const reapp = l.v > 1 && !!live(m);
    return modalShell('send', '', reapp ? 'Submit version ' + l.v + ' for re-approval' : 'Submit for MLR review', 'A new approval cycle starts at the first step of the chosen workflow.',
      objCard(m, 'Module') + (issues.length ? issuesBlock(issues) + `<div>${goBtn('Fix in the module form', 'module-edit', m.id, '', 'edit')}</div>` : `<div class="banner ok">${icon('check')}<div class="txt"><b>All Validation SOPs pass</b><p>${validate(m, 'Module').map(x => esc(x.label)).join(' · ') || 'No SOP applies.'}</p></div></div>
       <div class="stack" style="gap:10px"><span class="label">Approval workflow</span>${wfs.map(w => `<button type="button" class="type-card ${w.id === chosen ? 'on' : ''}" style="width:100%;flex-direction:column;align-items:stretch;gap:10px" data-act="submit-wf" data-v="${w.id}" aria-pressed="${w.id === chosen}"><span class="row" style="width:100%"><b style="font-size:14px">${esc(w.name)}</b><span class="chip plain" style="margin-left:auto">${reviewSteps(w).length} steps</span></span><span>${esc(w.desc)}</span>${w.id === chosen ? wfVisual(w) : ''}</button>`).join('')}</div>`),
      `${btn('Cancel', 'modal-close')}${btn('Confirm & submit', 'submit-confirm', 'primary', `data-id="${m.id}" ${issues.length ? 'disabled' : ''}`, 'send')}`, true);
  }
  if (M.type === 'resubmit') {
    const obj = objById(M.kind, M.id); const r = obj.resume; const wf = wfById(r.wf); const st = wf.steps[r.step]; const issues = validationIssues(obj, M.kind);
    const doneSteps = (latest(obj).cycles.find(c => c.n === r.cycle) || { decisions: [] }).decisions.filter(x => ['Reviewed', 'Approved'].includes(x.decision) && x.step < r.step);
    return modalShell('undo', 'warn', 'Amend & resubmit', `Approval resumes at the <b>${esc(stepLabel(st))}</b> step that requested the amendment.`,
      objCard(obj, M.kind) + `<div class="comment"><div class="who">${avatar(user(r.by), 'sm')}<b>${esc(user(r.by).name)}</b><span class="muted" style="font-size:12px">${esc(r.fn + ' ' + levelName(r.level))} · requested ${fmtDT(r.at)}</span></div><p style="font-size:13.5px">“${esc(r.note)}”</p></div>
      <div class="resume-path">${wf.steps.filter(s => !isNotify(s)).map(s => { const i = wf.steps.indexOf(s); const kept = i < r.step; const here = i === r.step; return `<span class="rp ${kept ? 'kept' : ''} ${here ? 'here' : ''}">${kept ? icon('check', 'sm') : here ? icon('arrow', 'sm') : ''}${esc(s.fn)} ${esc(levelName(s.level))}</span>`; }).join('')}</div>
      <p class="muted" style="font-size:12.5px">${doneSteps.length ? doneSteps.length + ' completed step' + (doneSteps.length > 1 ? 's stay' : ' stays') + ' approved. ' : ''}Same version (v${latest(obj).v}), same cycle (${r.cycle}).</p>
      ${issues.length ? issuesBlock(issues) : ''}
      <div class="field"><label for="m-note">What did you change? <span class="muted">(shared with the reviewer)</span></label><textarea class="textarea" id="m-note" placeholder="e.g. Added the oral candidiasis warning from section 4.4.">${esc(obj.amendNote || '')}</textarea></div>`,
      `${btn('Cancel', 'modal-close')}${btn('Resubmit — resume at ' + st.fn + ' ' + levelName(st.level), 'resubmit-confirm', 'primary', issues.length ? 'disabled' : '', 'send')}`, true);
  }
  if (M.type === 'decide') {
    const obj = objById(M.kind, M.id); const st = curStep(obj); const nx = nextStepOf(obj); const j = memberStepIndex(obj);
    const cfg = {
      pass: ['send', '', nx ? 'Complete review — send to ' + stepWho(nx) : 'Complete review', nx ? `The item moves to ${esc(stepLabel(nx))}${assigneeFor(nx).length ? ' — ' + esc(assigneeFor(nx).map(x => x.name).join(', ')) : ''}. Your notes travel with it.` : 'This completes the workflow.', 'Notes for the next reviewer (optional)', false, 'primary', ''],
      return: ['back', 'warn', 'Return to Member', `The item goes back to the ${esc(st.fn)} Member step${j >= 0 && assigneeFor(wfById(obj.review.wf).steps[j]).length ? ' (' + esc(assigneeFor(wfById(obj.review.wf).steps[j]).map(x => x.name).join(', ')) + ')' : ''}. It stays inside the review — the Material Owner is not involved.`, 'What should the Member look at?', true, 'primary', ''],
      amend: ['undo', 'warn', 'Request amendment', '<b>Return to Material Owner and resume approval from the current review step after changes are completed.</b>', 'What needs to change?', true, 'primary', pathDiagram('amend', st, obj)],
      reject: ['x', 'bad', 'Reject', '<b>Return to Material Owner and restart the approval cycle.</b>', 'Reason for rejection', true, 'danger', pathDiagram('reject', st, obj)]
    }[M.d];
    const compare = M.d === 'amend' || M.d === 'reject' ? `<div class="ar-compare"><div class="${M.d === 'amend' ? 'on' : ''}"><b>${icon('undo', 'sm')} Request amendment</b><span>Fixable issue. Same version, same cycle. Resumes at this step.</span></div><div class="${M.d === 'reject' ? 'on' : ''}"><b>${icon('x', 'sm')} Reject</b><span>Fundamental issue. New version. Full cycle restarts from step 1.</span></div></div>` : '';
    return modalShell(cfg[0], cfg[1], cfg[2], cfg[3], `${objCard(obj, M.kind)}${cfg[7]}${compare}<div class="field"><label for="m-note">${cfg[4]}</label><textarea class="textarea ${M.err ? 'invalid' : ''}" id="m-note" placeholder="${M.d === 'pass' ? 'e.g. Checked against reference 1 — no issues found.' : ''}">${esc(M.note || UI.f.rvc || '')}</textarea>${M.err ? '<span class="err">Add a note so the Material Owner knows what to do.</span>' : ''}</div><div class="row muted" style="font-size:12.5px">${avatar(u, 'sm')}${esc(u.name)} · ${esc(roleLabel(u))}${isAdmin(u) ? ' · recorded by Administrator for the ' + esc(stepWho(st)) + ' step' : ''}</div>`,
      `${btn('Cancel', 'modal-close')}${btn(cfg[2], 'decide-confirm', cfg[6], `data-req="${cfg[5] ? 1 : 0}"`)}`, M.d === 'amend' || M.d === 'reject');
  }
  if (M.type === 'sign') {
    const obj = objById(M.kind, M.id); const st = curStep(obj); const nx = nextStepOf(obj); const sig = S.settings.requireSignature !== false;
    const meaning = { Medical: 'I confirm the content is medically accurate and consistent with the cited evidence.', Legal: 'I confirm the content meets legal and promotional code requirements.', Regulatory: 'I confirm the content complies with the regulations of the selected countries.' }[st.fn] || 'I confirm the content is approved.';
    return modalShell('key', '', esc(st.fn) + ' approval' + (nx ? '' : ' — final'), `Signing as <b>${esc(u.name)}</b> · ${esc(roleLabel(u))}${isAdmin(u) ? ' for the ' + esc(stepWho(st)) + ' step' : ''}`,
      `${objCard(obj, M.kind)}<div class="banner ok">${icon('shieldcheck')}<div class="txt"><b>Signature meaning</b><p>${meaning}</p></div></div>
      <label class="choice ${M.att ? 'on' : ''}" style="width:100%;cursor:pointer"><input type="checkbox" id="m-att" data-act-change="sign-att" ${M.att ? 'checked' : ''} style="position:absolute;opacity:0"><span class="box">${M.att ? icon('check', 'sm') : ''}</span>I have reviewed the content, the references and the earlier review.</label>
      ${sig ? `<div class="field"><label for="m-pass">Re-enter your password to sign</label><input class="input ${M.err ? 'invalid' : ''}" id="m-pass" type="password" autocomplete="current-password" placeholder="Password"></div>` : ''}${M.err ? `<span class="err">${esc(M.err)}</span>` : ''}
      <p class="muted" style="font-size:12.5px">${nx ? 'After signing, the item moves to ' + esc(stepLabel(nx)) + '.' : 'This is the final step — the ' + (M.kind === 'Module' ? 'module will be approved and published to the Approved Library.' : 'asset will be approved for use.')} The signature is recorded in the audit trail.</p>`,
      `${btn('Cancel', 'modal-close')}${btn('Sign & approve', 'sign-confirm', 'primary', '', 'key')}`);
  }
  if (M.type === 'success') {
    const obj = objById(M.kind, M.id); const lv = live(obj); const sup = obj.versions.find(v => v.status === 'Superseded' && v.v === lv.v - 1); const imp = M.kind === 'Module' ? impactedAssets(obj) : [];
    return `<div class="scrim" data-act="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="success"><div class="big">${icon('check')}</div><span class="chip ok">Approved · v${lv.v}</span><h2 id="m-title">${M.kind} approved</h2><p class="ink2" style="max-width:46ch">${esc(nameOf(obj))} is approved for ${esc(productsTxt(obj.products))} in ${esc(marketsTxt(obj.markets))}${M.kind === 'Module' ? ' and is now in the Approved Library' : ''}.</p>
    ${sup ? `<div class="banner warn" style="text-align:left;width:100%">${icon('alert')}<div class="txt"><b>v${sup.v} is now superseded</b><p>${imp.length} asset${imp.length === 1 ? ' uses' : 's use'} the previous version${imp.length ? ' and should be updated' : ''}.</p></div></div>` : ''}</div>
    <div class="modal-foot" style="justify-content:center;border-top:0">${btn('Cover letter', 'success-go', '', `data-to="cover" data-kind="${M.kind}" data-id="${obj.id}" data-v="${lv.v}"`, 'award')}${sup && imp.length ? btn('Review impacted assets', 'success-go', 'primary', `data-to="impact" data-id="${obj.id}"`) : btn(M.kind === 'Module' ? 'View in library' : 'Open asset', 'success-go', 'primary', `data-to="${M.kind === 'Module' ? 'library' : 'asset'}" data-id="${obj.id}"`, M.kind === 'Module' ? 'book' : 'arrow')}</div></div></div>`;
  }
  if (M.type === 'asset-new') {
    const D = M.d;
    return modalShell('layers', '', 'Create asset', 'Choose the material type, products and countries. Only approved modules eligible for every selected country and the channel can be added.',
      `<div class="fgrid"><div class="field">${labelRow('Material type', addNew('materials', 'modal:type'), 'an-type')}<select class="select" id="an-type" data-an="type">${activeOf(S.materialTypes, D.type).map(t => opt(t.id, D.type, t.name)).join('')}</select></div>
      <div class="field"><label for="an-name">Asset name</label><input class="input ${M.err === 'name' ? 'invalid' : ''}" id="an-name" data-an="name" value="${esc(D.name)}">${M.err === 'name' ? '<span class="err">Give the asset a name.</span>' : ''}</div></div>
      <div class="field">${labelRow('Products', addNew('products', 'modal:products'))}${chipSelect('an-products', 'an-toggle', 'products', activeOf(S.products, D.products).map(p => [p.id, p.name, p.area]), D.products, { ph: 'Select products', noun: 'products' })}${M.err === 'products' ? '<span class="err">Select at least one product.</span>' : ''}</div>
      <div class="field">${labelRow('Countries', addNew('markets', 'modal:markets', 'country'))}${chipSelect('an-markets', 'an-toggle', 'markets', activeOf(S.markets, D.markets).map(x => [x.id, x.name, x.id]), D.markets, { ph: 'Select countries', noun: 'countries' })}${M.err === 'markets' ? '<span class="err">Select at least one country.</span>' : ''}</div>
      <div class="fgrid"><div class="field">${labelRow('Channel', addNew('channels', 'modal:channel'), 'an-ch')}<select class="select" id="an-ch" data-an="channel">${activeOf(S.channels, D.channel).map(c => opt(c.id, D.channel, c.name)).join('')}</select></div>
      <div class="field">${labelRow('Audience', addNew('audiences', 'modal:audience'), 'an-aud')}<select class="select" id="an-aud" data-an="audience">${activeOf(S.audiences, D.audience).map(c => opt(c.id, D.audience, c.name)).join('')}</select></div></div>
      ${M.module ? `<div class="banner info">${icon('layers')}<div class="txt"><b>${esc(modById(M.module).title)}</b><p>Added to the asset if it is eligible for the selected products, countries and channel.</p></div></div>` : ''}`,
      `${btn('Cancel', 'modal-close')}${btn('Create & open assembly', 'asset-create', 'primary', '', 'arrow')}`, true);
  }
  if (M.type === 'asset-version') {
    const a = assetById(M.id); const l = latest(a);
    return modalShell('copy', '', 'Create version ' + (l.v + 1), l.status === 'Rejected' ? 'Version ' + l.v + ' was rejected. The new version restarts the full approval cycle from the first step.' : 'Version ' + l.v + ' stays approved and in use until version ' + (l.v + 1) + ' is approved.',
      `${objCard(a, 'Asset')}<div class="field"><label for="m-note">Reason for change</label><textarea class="textarea ${M.err ? 'invalid' : ''}" id="m-note" placeholder="e.g. Updated to the new safety statement.">${esc(M.note || '')}</textarea>${M.err ? '<span class="err">Explain why this version is needed.</span>' : ''}</div>`,
      `${btn('Cancel', 'modal-close')}${btn('Create version ' + (l.v + 1), 'asset-version-confirm', 'primary', '', 'copy')}`);
  }
  if (M.type === 'new-text') {
    return modalShell('edit', 'warn', 'Add new text', 'Text that is not an approved module is flagged as new content and sends the asset to full MLR review.',
      `<div class="field"><label for="nt-label">Block</label><select class="select" id="nt-label">${['Headline', 'Body copy', 'Call to action', 'Other'].map(x => opt(x, M.label || 'Body copy')).join('')}</select></div><div class="field"><label for="nt-text">Text</label><textarea class="textarea ${M.err ? 'invalid' : ''}" id="nt-text" placeholder="e.g. Join our webinar on heart-failure care on 12 November.">${esc(M.text || '')}</textarea>${M.err ? '<span class="err">Write the text to add.</span>' : ''}</div>`,
      `${btn('Cancel', 'modal-close')}${btn('Add to asset', 'new-text-confirm', 'primary', `data-id="${M.id}"`, 'plus')}`);
  }
  if (M.type === 'asset-submit') {
    const a = assetById(M.id); const V = assetValidation(a); const wf = wfById(assetWorkflow(a)); const blocked = V.empty || V.bad.length || V.sops.length;
    const problems = `${V.empty ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>The asset has no content</b><p>Add at least one approved module.</p></div></div>` : ''}${V.bad.length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${V.bad.length} module${V.bad.length > 1 ? 's are' : ' is'} not eligible</b><ul class="issue-list">${V.bad.map(x => `<li><b>${esc(x.m.id)}:</b> ${esc(eligibility(x.m, a).reason)}</li>`).join('')}</ul></div></div>` : ''}${V.sops.length ? issuesBlock(V.sops) : ''}`;
    if (!canSubmit(u)) return modalShell('send', '', 'Send to Marketing Lead', 'Marketing Members assemble assets. A Marketing Lead submits them for review.', objCard(a, 'Asset') + problems, `${btn('Cancel', 'modal-close')}${btn('Send to Lead', 'asset-submit-confirm', 'primary', `data-id="${a.id}" ${blocked ? 'disabled' : ''}`, 'send')}`);
    return modalShell(blocked ? 'alert' : V.nNew ? 'alert' : 'shieldcheck', blocked ? 'bad' : V.nNew ? 'warn' : '', blocked ? 'Fix before submitting' : V.nNew ? 'New content detected' : 'Ready for streamlined review', blocked ? 'The asset fails one or more checks.' : V.nNew ? 'This asset contains text that is not an approved module and requires full MLR review.' : 'Every block is an approved module eligible for these countries and this channel.',
      objCard(a, 'Asset') + (blocked ? problems : `${V.nNew ? `<div class="stack" style="gap:8px">${a.blocks.filter(b => b.kind === 'new').map(b => `<div class="block new" style="margin:0"><div class="meta">${icon('edit', 'sm')}New content · ${esc(b.label || 'Text')}</div><div class="txt">${esc(b.text)}</div></div>`).join('')}</div>` : ''}<div class="banner ok">${icon('check')}<div class="txt"><b>All checks pass</b><p>${V.mods.length} eligible approved module${V.mods.length === 1 ? '' : 's'} · ${validate(a, 'Asset').length} Validation SOPs passed</p></div></div><div class="row"><span class="label" style="margin:0">Route</span><b>${esc(wf.name)}</b></div>${wfVisual(wf)}`),
      `${btn(blocked ? 'Back to assembly' : 'Keep editing', 'modal-close')}${btn('Submit for review', 'asset-submit-confirm', 'primary', `data-id="${a.id}" ${blocked ? 'disabled' : ''}`, 'send')}`, true);
  }
  if (M.type === 'sop') {
    const D = M.d;
    return modalShell('clipboard', '', M.id ? 'Edit Validation SOP' : 'New Validation SOP', 'Checked before submission and before approval for every item in scope.',
      `<div class="field"><label for="sop-name">Name</label><input class="input ${M.err ? 'invalid' : ''}" id="sop-name" data-sop="name" value="${esc(D.name)}" placeholder="e.g. Local disclaimer — Saudi Arabia">${M.err ? '<span class="err">Give the SOP a name.</span>' : ''}</div>
      <div class="fgrid"><div class="field"><label for="sop-rule">Requirement</label><select class="select" id="sop-rule" data-sop="rule">${Object.entries(SOP_RULES).map(([k, l]) => opt(k, D.rule, l)).join('')}</select></div>
      <div class="field"><label for="sop-app">Applies to</label><select class="select" id="sop-app" data-sop="appliesTo">${[['Both', 'Modules & assets'], ['Module', 'Modules'], ['Asset', 'Assets']].map(o => opt(o[0], D.appliesTo, o[1])).join('')}</select></div></div>
      ${D.rule === 'review_window' ? `<div class="field"><label for="sop-m">Maximum months to review date</label><input class="input" id="sop-m" type="number" min="1" data-sop="months" value="${esc(D.months || 12)}"></div>` : ''}
      <p class="hint sop-scope-hint">${icon('info', 'sm')} Leave a list empty to apply the SOP to <b>all</b> values in that category, including ones added later. Selecting values limits the SOP to them.</p>
      <div class="field">${labelRow('Content types <span class="muted">(none = all)</span>', addNew('moduletypes', 'modal:types', 'module type') + addNew('materials', 'modal:types', 'material type'))}${chipSelect('sop-types', 'sop-toggle', 'types', [...S.moduleTypes.map(t => [t.id, t.name, 'Module type' + (t.active ? '' : ' · inactive')]), ...S.materialTypes.map(t => [t.id, t.name, 'Material type' + (t.active ? '' : ' · inactive')])], D.types, { ph: 'All content types', noun: 'content types', below: true, bulk: 'sop-bulk', empty: 'All content types (none selected)' })}</div>
      <div class="field">${labelRow('Products <span class="muted">(none = all)</span>', addNew('products', 'modal:products'))}${chipSelect('sop-products', 'sop-toggle', 'products', S.products.map(p => [p.id, p.name, p.area + (p.active ? '' : ' · inactive')]), D.products, { ph: 'All products', noun: 'products', below: true, bulk: 'sop-bulk', empty: 'All products (none selected)' })}</div>
      <div class="field">${labelRow('Countries <span class="muted">(none = all)</span>', addNew('markets', 'modal:markets', 'country'))}${chipSelect('sop-markets', 'sop-toggle', 'markets', S.markets.map(m => [m.id, m.name, m.id + (m.active ? '' : ' · inactive')]), D.markets, { ph: 'All countries', noun: 'countries', below: true, bulk: 'sop-bulk', empty: 'All countries (none selected)' })}</div>
      <div class="field"><label for="sop-g">Guidance shown when it fails</label><textarea class="textarea" id="sop-g" rows="2" data-sop="guidance">${esc(D.guidance)}</textarea></div>`,
      `${btn('Cancel', 'modal-close')}${btn(M.id ? 'Save SOP' : 'Create SOP', 'sop-save', 'primary', '', 'check')}`, true);
  }
  if (M.type === 'confirm-import') {
    const c = M.backup.counts || {}; const when = M.backup.exportedAt ? fmtDT(Date.parse(M.backup.exportedAt)) : 'unknown date';
    return modalShell('alert', 'bad', 'Replace this workspace with the backup?', 'Everything in this browser is replaced. Download a backup of the current workspace first if you may need it.',
      `<dl class="kv"><dt>Backup of</dt><dd>${esc(M.backup.org || '—')}</dd><dt>Made</dt><dd>${esc(when)}</dd><dt>Contains</dt><dd>${c.modules || 0} modules · ${c.assets || 0} assets · ${c.users || 0} users · ${c.audit || 0} audit events · ${c.files || 0} files</dd></dl>
      <div class="field"><label for="m-confirm">Type RESTORE to confirm</label><input class="input ${M.err ? 'invalid' : ''}" id="m-confirm" autocomplete="off">${M.err ? '<span class="err">Type RESTORE in capitals.</span>' : ''}</div>`,
      `${btn('Cancel', 'modal-close')}${btn(M.busy ? 'Restoring…' : 'Replace workspace', 'ws-import-confirm', 'danger', M.busy ? 'disabled' : '', 'upload')}`);
  }
  if (M.type === 'confirm-reset') {
    return modalShell('alert', 'bad', 'Restore the initial workspace?', 'All modules, assets, users, workflows, SOPs, settings and the audit trail return to their initial state. This cannot be undone.', `<div class="field"><label for="m-confirm">Type RESTORE to confirm</label><input class="input ${M.err ? 'invalid' : ''}" id="m-confirm" autocomplete="off">${M.err ? '<span class="err">Type RESTORE in capitals.</span>' : ''}</div>`, `${btn('Cancel', 'modal-close')}${btn('Restore workspace', 'reset-confirm', 'danger', '', 'undo')}`);
  }
  return '';
}

/* ===== Helpers for actions ===== */
function nextModuleId(products) { const L = products.length > 1 ? 'X' : (products[0] || 'P-A').replace(/^P-/, ''); const pre = 'MOD-' + L + '-'; const n = Math.max(0, ...S.modules.filter(m => m.id.startsWith(pre)).map(m => +m.id.slice(pre.length))) + 1; return pre + String(n).padStart(3, '0'); }
function nextAssetId() { return 'AST-' + (Math.max(100, ...S.assets.map(a => +a.id.slice(4))) + 1); }
const curAsset = () => assetById(UI.route.p.id);
const trunc = (s, n = 90) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
function logAdmin(action, objType, id, extra) { log(action, objType, { id }, 1, extra); }
function afterDecision(obj, kind, r) {
  UI.modal = null; UI.f.rvc = '';
  if (r.done) { UI.modal = { type: 'success', kind, id: obj.id }; go(kind === 'Asset' ? 'asset' : 'module', { id: obj.id }); return; }
  go('tasks'); toast(r.msg);
}
function newVersion(obj, kind, reason) {
  const l = latest(obj); const nv = l.v + 1;
  if (kind === 'Asset') l.blocks = JSON.parse(JSON.stringify(obj.blocks));
  obj.versions.push({ v: nv, ...(kind === 'Module' ? { sopLinks: configuredSops(obj, 'Module') } : {}), body: kind === 'Asset' ? '' : l.body, refs: kind === 'Asset' ? [] : [...l.refs], media: l.media ? { ...l.media } : undefined, createdAt: Date.now(), createdBy: me().id, reason, status: 'Draft', cycles: [], approvedAt: null, approvedBy: null });
  obj.resume = null; obj.review = null; obj.updatedAt = Date.now();
  log('Version created', kind, obj, nv, { prev: 'v' + l.v + ' ' + l.status, next: 'v' + nv + ' Draft', note: reason });
  return nv;
}

const ACT = {
  'sop-bulk': el => { const D = UI.modal.d; const k = el.dataset.k; D[k] = el.dataset.v === 'all' ? (k === 'types' ? [...S.moduleTypes, ...S.materialTypes] : k === 'products' ? S.products : S.markets).map(x => x.id) : []; render(); },
  'cfg-quick': el => { const k = el.dataset.k; UI.modal = { type: 'cfg', k, d: cfgBlank(k), quick: el.dataset.field, back: UI.modal || null }; UI.msel = null; render(); setTimeout(() => { const f = document.querySelector('.modal [data-cfg]'); f && f.focus(); }, 30); },
  'd-wf': el => { UI.draft.workflow = el.dataset.v; UI.msel = null; UI.mselq = ''; render(); },
  // Create a workflow in a side panel over the module form: the form is never left, so every entry and upload stays as it is.
  'wf-addnew': () => { if (!UI.nwf || !UI.nwf._panel) UI.nwf = { step: 0, maxStep: 0, triedSteps: [], name: '', desc: '', appliesTo: 'Module', steps: [], _panel: true }; UI.modal = { type: 'wf-panel', field: 'draft:workflow', back: UI.modal || null }; UI.msel = null; render(); setTimeout(() => { const f = document.getElementById('w-name'); f && f.focus(); }, 30); },
  'file-open': el => { UI.modal = { type: 'file', id: el.dataset.file, z: 1, back: UI.modal && UI.modal.type !== 'file' ? UI.modal : null }; render(); },
  'fv-zoom': el => { const M = UI.modal; const d = +el.dataset.v; M.z = d === 0 ? 1 : Math.max(0.25, Math.min(4, Math.round((M.z + d * 0.25) * 100) / 100)); render(); },
  'role-edit': el => { UI.modal = { type: 'role', id: el.dataset.role }; render(); },
  'rp-info': el => { UI.modal = { type: 'rp-info', v: el.dataset.v }; render(); },
  'pop-close': () => { UI.pop = null; render(); },
  'role-compare': () => { UI.modal = { type: 'compare', tab: 'overview', d: JSON.parse(JSON.stringify(S.roles)) }; render(); },
  'cmp-tab': el => { UI.modal.tab = el.dataset.v; render(); },
  'cmp-diff': () => { UI.modal.diff = !UI.modal.diff; render(); },
  'cmp-toggle': el => { const D = UI.modal.d; const r = el.dataset.role, k = el.dataset.perm; const L = D[r] || (D[r] = []); const i = L.indexOf(k); i >= 0 ? L.splice(i, 1) : L.push(k); render(); },
  'cmp-cancel': () => { const n = cmpChanges(UI.modal.d).length; if (n && !confirm('Discard ' + n + ' unsaved permission change' + (n > 1 ? 's' : '') + '?')) return; UI.modal = null; render(); },
  'cmp-save': () => { const ch = cmpChanges(UI.modal.d); ch.forEach(([r, k, on]) => { const L = S.roles[r] || (S.roles[r] = []); const label = PERMS.find(x => x[0] === k)[1]; if (on) L.push(k); else L.splice(L.indexOf(k), 1);
      logAdmin(on ? 'Permission granted' : 'Permission revoked', 'Role', r, { note: roleName(r) + ' · ' + label + ' · from Compare all roles', prev: on ? 'Not granted' : 'Granted', next: on ? 'Granted' : 'Not granted' }); });
    UI.modal = null; save(); render(); toast(ch.length + ' permission change' + (ch.length > 1 ? 's' : '') + ' saved — authorisation updated'); },
  ...ANN_ACT,
  'flt-open': el => { const id = el.dataset.id; const d = {}; (FILTERS[id] || []).forEach(x => { d[x.k] = F(x.k); }); UI.modal = { type: 'filters', id, d }; render(); setTimeout(() => { const f = document.querySelector('.flt-grid input, .flt-grid select'); if (f) f.focus(); }, 30); },
  'flt-reset': () => { (FILTERS[UI.modal.id] || []).forEach(x => { UI.modal.d[x.k] = x.def || ''; }); render(); },
  'flt-apply': () => { const M = UI.modal; document.querySelectorAll('[data-fd]').forEach(el => { M.d[el.dataset.fd] = el.value; }); (FILTERS[M.id] || []).forEach(x => { UI.f[x.k] = M.d[x.k] || x.def || ''; }); UI.modal = null; render(); },
  'flt-rm': el => { UI.f[el.dataset.k] = el.dataset.def || ''; render(); },
  'flt-clear': el => { (FILTERS[el.dataset.id] || []).forEach(x => { UI.f[x.k] = x.def || ''; }); render(); },
  'tl-step': el => { UI.modal = { type: 'step', kind: el.dataset.kind, id: el.dataset.id, v: el.dataset.v, c: el.dataset.c, i: el.dataset.i }; render(); },
  pop: el => { UI.pop = UI.pop === el.dataset.pop ? null : el.dataset.pop; if (UI.pop === 'bell') { S.notifSeenBy = { ...(S.notifSeenBy || {}), [me().id]: Date.now() }; save(); } render(); },
  // Open a mention: mark it read and go straight to the comment (review screen when the user acts on the step).
  'notif-open': el => { const n = (S.notifications || []).find(x => x.id === el.dataset.id); if (!n) return; n.read = true; n.readAt = Date.now(); save(); UI.pop = null;
    const o = objById(n.objType, n.objId); const asset = n.objType === 'Asset'; if (!o || !canSeeObj(me(), o)) { toast('You no longer have access to this item'); render(); return; }
    if (o.review && canActOn(me(), o)) go(asset ? 'asset-review' : 'review', { id: o.id }); else go(asset ? 'asset' : 'module', { id: o.id, tab: 'comments' });
    const U = annUI(); U.focus = n.annId; U.goto = n.annId; render(); },
  'notif-rem': el => { const u = me(); S.remindersRead = S.remindersRead || {}; S.remindersRead[u.id] = uniq([...(S.remindersRead[u.id] || []), el.dataset.id]); save(); UI.pop = null; go('module', { id: el.dataset.obj, tab: 'lifecycle' }); },
  'notif-readall': () => { S.remindersRead = S.remindersRead || {}; S.remindersRead[me().id] = uniq([...(S.remindersRead[me().id] || []), ...dueReminders(me()).map(r => r.id)]); (S.notifications || []).forEach(n => { if (n.to === me().id && !n.read) { n.read = true; n.readAt = Date.now(); } }); S.notifSeenBy = { ...(S.notifSeenBy || {}), [me().id]: Date.now() }; save(); render(); },
  logout: () => { log('Signed out', 'User', me(), 1); S.signedIn = false; save(); UI.modal = null; go('login'); },
  'modal-close': () => { UI.modal = (UI.modal && UI.modal.back) || null; UI.msel = null; render(); },
  'msel-open': el => { UI.msel = UI.msel === el.dataset.id ? null : el.dataset.id; UI.mselq = ''; render(); setTimeout(() => { const i = document.getElementById('mselq-' + el.dataset.id); i && i.focus(); }, 20); },
  'ap-stage': el => { UI.f.apfn = UI.f.apfn === el.dataset.v && (UI.route.p.tab || 'review') === 'review' ? '' : el.dataset.v; go('tasks', { tab: 'review' }); },
  'msel-close': () => { UI.msel = null; UI.mselq = ''; render(); },
  'modal-bg': (el, ev) => { if (ev.target !== el) return; if (UI.modal && UI.modal.type === 'compare') { ACT['cmp-cancel'](); return; } UI.modal = UI.modal && UI.modal.back || null; render(); },
  'toggle-f': el => { const k = el.dataset.k; UI.f[k] = UI.f[k] === el.dataset.v ? '' : el.dataset.v; render(); },
  'set-f': el => { UI.f[el.dataset.k] = el.dataset.v; render(); },
  'clear-filters': el => { el.dataset.keys.split(',').forEach(k => { UI.f[k] = ''; }); render(); },
  'rv-mode': el => { UI.f['rv-' + el.dataset.k] = el.dataset.v; render(); },
  pg: el => { const st = UI.pg[decodeURIComponent(el.dataset.k)]; if (!st) return; st.p = +el.dataset.p; render(); const t = document.querySelectorAll('table.tbl')[+el.dataset.ti]; if (t && t.getBoundingClientRect().top < 70) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
  'version-open': el => { UI.modal = { type: 'version', kind: el.dataset.kind, id: el.dataset.id, v: el.dataset.v }; render(); },

  /* module form */
  'wiz-go': el => { const D = wizDraft(el.dataset.form); const i = +el.dataset.i; if (i <= (D.maxStep || 0)) wizShow(D, i); },
  'wiz-save': el => { const f = el.dataset.form; wizDraft(f).step = wizSteps(f).length - 1; (f === 'user' ? saveUserForm : f === 'workflow' ? saveWorkflowForm : saveModuleForm)(); },
  'wiz-back': el => { const D = wizDraft(el.dataset.form); wizShow(D, Math.max(0, (D.step || 0) - 1)); },
  'd-type': el => {
    const D = UI.draft; const m = UI.route.p.id && modById(UI.route.p.id); const v = el.dataset.v;
    if (m && isMediaType(v) !== isMediaType(m.type)) { toast('Content and media modules cannot be converted — create a new module'); return; }
    if (D.type && isMediaType(D.type) && kindOfType(D.type) !== kindOfType(v) && D.media && D.media.fileId) D.media = { source: D.media.source || '', usage: D.media.usage || '' };
    D.type = v; render(); },
  'd-toggle': el => { const D = UI.draft; const arr = D[el.dataset.k]; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v);
    if (el.dataset.k === 'products') D.indications = uniq(D.products.flatMap(pid => productInds(pid).map(i => i.id)));
    render(); },
  'd-unref': el => { UI.draft.refs = UI.draft.refs.filter(r => r !== el.dataset.v); render(); },
  'd-newref': () => {
    const D = UI.draft; const t = (D.newRefTitle || '').trim(), src = (D.newRefSource || '').trim(); if (!t || !src) { toast('Enter the reference title and source'); return; }
    const dup = S.references.find(r => r.title.toLowerCase() === t.toLowerCase()); if (dup) { if (!D.refs.includes(dup.id)) D.refs.push(dup.id); D.newRefTitle = ''; D.newRefSource = ''; render(); toast('Already in the library — attached'); return; }
    const r = { id: 'REF-' + Date.now().toString(36).slice(-5).toUpperCase(), kind: D.newRefKind || 'study', title: t, source: src, active: true }; S.references.push(r);
    log('Reference created', 'Reference', { id: r.id }, 1, { next: r.title, note: refKind(r.kind) }); D.refs.push(r.id); D.newRefTitle = ''; D.newRefSource = ''; save(); render(); toast('Reference added to the library and attached'); },

  /* submission */
  'submit-open': el => { const m = modById(el.dataset.id); const l = latest(m); const own = m.workflow && eligibleModuleWorkflows().some(w => w.id === m.workflow) ? m.workflow : null; UI.modal = { type: 'submit', id: m.id, wf: own || (l.v > 1 && live(m) ? S.settings.newVersionWorkflow : suggestedWorkflow(m.type) || S.settings.defaultModuleWorkflow) }; render(); },
  'submit-wf': el => { UI.modal.wf = el.dataset.v; render(); },
  'submit-confirm': el => {
    const m = modById(el.dataset.id); const u = me(); if (validationIssues(m, 'Module').length) return;
    if (!canSubmit(u)) { setStatus(m, 'Awaiting Lead submission'); m.updatedAt = Date.now(); log('Sent to Content Lead', 'Module', m, null, { prev: 'Draft', next: 'Awaiting Lead submission' }); UI.modal = null; save(); render(); toast('Sent to the Content Lead for submission'); return; }
    const wfId = UI.modal.wf || m.workflow || S.settings.defaultModuleWorkflow; if (m.workflow !== wfId) { log('Workflow changed', 'Module', m, null, { prev: m.workflow ? (wfById(m.workflow) || {}).name || m.workflow : '—', next: wfById(wfId).name }); m.workflow = wfId; }
    const mailed = startCycle(m, 'Module', wfId); save(); const st = curStep(m); UI.modal = null; render();
    toast('Submitted · cycle ' + m.review.cycle + ' · now with ' + stepWho(st) + (assigneeFor(st).length ? ' (' + assigneeFor(st).map(x => x.name).join(', ') + ')' : '') + (mailed ? ' · email sent' : ''));
  },
  'resubmit-open': el => { UI.modal = { type: 'resubmit', kind: el.dataset.kind, id: el.dataset.id }; render(); },
  'resubmit-confirm': () => {
    const M = UI.modal; const obj = objById(M.kind, M.id); if (validationIssues(obj, M.kind).length) return;
    const note = (document.getElementById('m-note').value || '').trim(); const st = resumeAmended(obj, M.kind, note); obj.amendNote = ''; save(); UI.modal = null; render();
    toast('Resubmitted — approval resumed at ' + stepLabel(st));
  },
  'new-version': el => { UI.draft = null; go('module-edit', { id: el.dataset.id, newVersion: true }); },

  /* review */
  decide: el => { UI.modal = { type: 'decide', kind: el.dataset.kind, id: el.dataset.id, d: el.dataset.d }; render(); setTimeout(() => { const t = document.getElementById('m-note'); t && t.focus(); }, 30); },
  'decide-confirm': el => {
    const M = UI.modal; const note = (document.getElementById('m-note').value || '').trim();
    if (el.dataset.req === '1' && !note) { M.err = true; M.note = ''; render(); return; }
    const obj = objById(M.kind, M.id); afterDecision(obj, M.kind, decide(obj, M.kind, M.d, note));
  },
  sign: el => { UI.modal = { type: 'sign', kind: el.dataset.kind, id: el.dataset.id, att: false }; render(); },
  'sign-confirm': () => {
    const M = UI.modal; const pw = document.getElementById('m-pass');
    if (!M.att) { M.err = 'Confirm that you have reviewed the content.'; render(); return; }
    if (pw && !pw.value) { M.err = 'Enter your password to sign.'; render(); return; }
    const obj = objById(M.kind, M.id); if (validationIssues(obj, M.kind).length) { M.err = 'Validation SOPs are failing — request an amendment instead.'; render(); return; }
    afterDecision(obj, M.kind, decide(obj, M.kind, 'approve', UI.f.rvc || ''));
  },
  comment: el => {
    const t = (document.getElementById('rv-comment').value || '').trim(); if (!t) { toast('Write a comment first'); return; }
    const obj = objById(el.dataset.kind, el.dataset.id); const st = curStep(obj);
    curCycle(obj).decisions.push({ step: obj.review.step, fn: st.fn, level: st.level, req: 'comment', by: me().id, at: Date.now(), decision: 'Comment', note: t, admin: isAdmin(me()) });
    log('Comment added', el.dataset.kind, obj, null, { note: t }); UI.f.rvc = ''; save(); render(); toast('Comment added');
  },
  'success-go': el => { const to = el.dataset.to; UI.modal = null; if (to === 'impact') go('module', { id: el.dataset.id, tab: 'lifecycle' }); else if (to === 'library') go('library'); else if (to === 'cover') go('cover', { id: el.dataset.id, k: el.dataset.kind, v: el.dataset.v }); else go(to, { id: el.dataset.id }); },

  /* assets */
  'asset-new': el => {
    if (!canCreateAsset(me())) { toast('Your role cannot create assets'); return; }
    const mod = el.dataset.module ? modById(el.dataset.module) : null; const lm = mod ? liveMeta(mod) : null; const t = activeOf(S.materialTypes)[0];
    if (!t) { toast('Add an active Material Type first'); return; }
    UI.modal = { type: 'asset-new', module: mod ? mod.id : null, d: { type: t.id, name: t.name + ' — ' + (lm ? lm.title.split('—')[0].trim() : 'New material'), products: lm ? [...lm.products] : [], markets: lm ? [lm.markets[0]] : [], channel: lm && lm.channels.includes(t.channel) ? t.channel : (lm ? lm.channels[0] : t.channel), audience: lm ? lm.audience : (activeOf(S.audiences)[0] || {}).id } };
    UI.pop = null; render();
  },
  'an-toggle': el => { const arr = UI.modal.d[el.dataset.k]; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v); render(); },
  'asset-create': () => {
    const M = UI.modal; const D = M.d; const nm = document.getElementById('an-name'); if (nm) D.name = nm.value;
    if (blank(D.name)) { M.err = 'name'; render(); return; } if (!D.products.length) { M.err = 'products'; render(); return; } if (!D.markets.length) { M.err = 'markets'; render(); return; }
    const now = Date.now();
    const a = { id: nextAssetId(), name: clean(D.name), type: D.type, products: [...D.products], markets: [...D.markets], channel: D.channel, audience: D.audience, owner: me().id, disclaimer: '', blocks: [], versions: [{ v: 1, body: '', refs: [], createdAt: now, createdBy: me().id, reason: 'Initial version', status: 'Draft', cycles: [], approvedAt: null, approvedBy: null }], createdAt: now, updatedAt: now, review: null, resume: null };
    log('Asset created', 'Asset', a, 1, { next: 'Draft', note: D.type });
    if (M.module) { const m = modById(M.module); if (eligibility(m, a).ok) { a.blocks.push({ id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); log('Module reused', 'Asset', a, 1, { note: m.id + ' v' + live(m).v + ' added' }); } }
    S.assets.push(a); UI.modal = null; save(); go('assemble', { id: a.id }); toast('Asset created — add approved modules from the left');
  },
  'a-toggle': el => { const a = assetById(el.dataset.id); const k = el.dataset.k; const prev = [...a[k]]; const i = a[k].indexOf(el.dataset.v); i >= 0 ? a[k].splice(i, 1) : a[k].push(el.dataset.v);
    log(k === 'products' ? 'Product changed' : 'Country changed', 'Asset', a, null, { prev: k === 'products' ? productsTxt(prev) : prev.join(', '), next: k === 'products' ? productsTxt(a[k]) : a[k].join(', ') }); a.updatedAt = Date.now(); save(); render(); },
  'blk-add': el => { const a = assetById(el.dataset.id); const m = modById(el.dataset.module); if (!a || !m || !live(m) || a.blocks.some(b => b.moduleId === m.id)) return; if (!eligibility(m, a).ok) { toast('This module cannot be used in this asset'); return; } a.blocks.push({ id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); log('Module reused', 'Asset', a, null, { note: m.id + ' v' + live(m).v + ' added' }); a.updatedAt = Date.now(); save(); render(); toast('Added ' + m.type + ' · ' + m.id + ' v' + live(m).v); },
  'blk-move': el => { const a = curAsset(); const i = +el.dataset.i, j = i + +el.dataset.dir; if (j < 0 || j >= a.blocks.length) return; [a.blocks[i], a.blocks[j]] = [a.blocks[j], a.blocks[i]]; save(); render(); },
  'blk-del': el => { const a = curAsset(); const [b] = a.blocks.splice(+el.dataset.i, 1); log('Asset updated', 'Asset', a, null, { note: 'Removed ' + (b.kind === 'module' ? b.moduleId + ' v' + b.v : 'new text block'), prev: b.kind === 'module' ? b.moduleId : trunc(b.text, 40) }); a.updatedAt = Date.now(); save(); render(); },
  'new-text': el => { UI.modal = { type: 'new-text', id: el.dataset.id }; render(); setTimeout(() => { const t = document.getElementById('nt-text'); t && t.focus(); }, 30); },
  'new-text-confirm': el => { const t = document.getElementById('nt-text').value.trim(); const lbl = document.getElementById('nt-label').value; if (!t) { UI.modal.err = true; UI.modal.label = lbl; render(); return; } const a = assetById(el.dataset.id); a.blocks.push({ id: uid('b'), kind: 'new', text: t, label: lbl }); log('Asset updated', 'Asset', a, null, { note: 'New content added (' + lbl + ')', next: trunc(t, 60) }); UI.modal = null; save(); render(); toast('New content added — the asset now needs full MLR review'); },
  'asset-save': el => { const a = assetById(el.dataset.id); a.updatedAt = Date.now(); log('Asset updated', 'Asset', a, null, { note: 'Draft saved' }); save(); toast('Draft saved'); },
  'asset-submit': el => { UI.modal = { type: 'asset-submit', id: el.dataset.id }; render(); },
  'asset-submit-confirm': el => {
    const a = assetById(el.dataset.id); const u = me(); const V = assetValidation(a); if (V.empty || V.bad.length || V.sops.length) return;
    if (!canSubmit(u)) { setStatus(a, 'Awaiting Lead submission'); log('Sent to Marketing Lead', 'Asset', a, null, { prev: 'Draft', next: 'Awaiting Lead submission' }); UI.modal = null; save(); go('asset', { id: a.id }); toast('Sent to the Marketing Lead'); return; }
    startCycle(a, 'Asset', assetWorkflow(a)); UI.modal = null; save(); go('asset', { id: a.id }); const st = curStep(a); toast('Submitted · now with ' + stepWho(st));
  },
  'asset-version': el => { UI.modal = { type: 'asset-version', id: el.dataset.id }; render(); setTimeout(() => { const t = document.getElementById('m-note'); t && t.focus(); }, 30); },
  'asset-version-confirm': () => { const M = UI.modal; const note = document.getElementById('m-note').value.trim(); if (note.length < 5) { M.err = true; M.note = note; render(); return; } const a = assetById(M.id); const nv = newVersion(a, 'Asset', note); a.blocks.forEach(b => { if (b.kind === 'new') b.approved = false; }); UI.modal = null; save(); go('assemble', { id: a.id }); toast('Version ' + nv + ' created'); },
  'replace-version': el => { const a = assetById(el.dataset.asset); const m = modById(el.dataset.module); const b = a.blocks.find(x => x.moduleId === m.id); const from = b.v; b.v = live(m).v; log('Asset updated', 'Asset', a, null, { note: 'Module version replaced · ' + m.id, prev: m.id + ' v' + from, next: m.id + ' v' + b.v }); save(); render(); toast(a.name + ' now uses ' + m.id + ' v' + b.v, 'ok'); },

  /* audit */
  'audit-user': el => { Object.assign(UI.f, { uuser: el.dataset.id, uq: '', ucat: '', uobj: '' }); go('audit'); },
  'audit-export': () => { if (!can(me(), 'export')) { toast('Your role cannot export'); return; }
    const rows = auditRows().sort((a, b) => b.ts - a.ts); const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = [['Date', 'Time', 'User', 'Role', 'Action', 'Object type', 'Object ID', 'Object', 'Version', 'Products', 'Countries', 'Previous value', 'New value', 'Note'].map(q).join(','), ...rows.map(e => [fmtD(e.ts), fmtT(e.ts), user(e.user).name, e.role, e.action, e.objType, e.objId, objName(e), e.version, productsTxt(e.products), (e.markets || []).join(' '), e.prev, e.next, e.note].map(q).join(','))].join('\n');
    saveFile('saja-medlr-audit-' + toISO(Date.now()) + '.csv', csv, 'text/csv', 'Exported ' + rows.length + ' audit events');
  },
  /* workspace backup */
  'ws-export': async el => {
    if (el) el.disabled = true; toast('Preparing the backup…', 'ok');
    try { const b = await workspaceBackup(); saveFile('saja-medlr-backup-' + toISO(Date.now()) + '.json', JSON.stringify(b), 'application/json', 'Backup downloaded · ' + b.counts.modules + ' modules, ' + b.counts.assets + ' assets, ' + b.counts.files + ' files');
      logAdmin('Workspace backed up', 'Settings', 'settings', { note: b.counts.modules + ' modules · ' + b.counts.assets + ' assets · ' + b.counts.audit + ' audit events · ' + b.counts.files + ' files' }); save(); }
    catch (e) { toast('Could not create the backup: ' + (e && e.message || e), 'err'); }
    if (el) el.disabled = false;
  },
  'ws-import-confirm': async () => {
    const M = UI.modal; const v = document.getElementById('m-confirm').value.trim(); if (v !== 'RESTORE') { M.err = true; render(); return; }
    const pid = S.personaId; M.busy = true; render();
    try {
      const next = await workspaceRestore(M.backup);
      // The person restoring stays signed in when they exist (and are active) in the backup; otherwise its administrator.
      const keep = next.users.find(u => u.id === pid && u.status === 'Active' && u.email === me().email) || next.users.find(u => u.fn === 'Administrator' && u.status === 'Active');
      S = next; S.signedIn = true; S.personaId = keep.id; UI.modal = null; UI.f = {}; UI.pg = {}; UI.draft = null;
      log('Workspace restored', 'Settings', { id: 'settings' }, 1, { note: 'From backup of ' + (M.backup.exportedAt || '').slice(0, 10) + ' · ' + M.backup.counts.modules + ' modules · ' + M.backup.counts.files + ' files' });
      save(); go('home'); toast('Workspace restored from the backup');
    } catch (e) { M.busy = false; render(); toast('Could not restore the backup: ' + (e && e.message || e), 'err'); }
  },

  /* users and roles */
  'u-fn': el => { const D = UI.udraft; D.fn = el.dataset.v; const t = S.teams.find(x => x.id === D.team); if (!t || t.fn !== D.fn) { const first = S.teams.find(x => x.fn === D.fn); D.team = first ? first.id : ''; } render(); },
  'u-level': el => { UI.udraft.level = el.dataset.v; render(); },
  'u-status': el => { UI.udraft.status = el.dataset.v; render(); },
  'user-status': el => { const x = S.users.find(u => u.id === el.dataset.id); if (x.id === me().id) { toast('You cannot deactivate your own account'); return; } const prev = x.status; x.status = x.status === 'Active' ? 'Inactive' : 'Active'; logAdmin(x.status === 'Active' ? 'User activated' : 'User deactivated', 'User', x.id, { prev, next: x.status, note: x.name }); save(); render(); toast(x.name + ' is now ' + x.status.toLowerCase(), 'ok'); },
  'perm-toggle': el => { const r = el.dataset.role, p = el.dataset.perm; const list = S.roles[r] || (S.roles[r] = []); const i = list.indexOf(p); const label = PERMS.find(x => x[0] === p)[1]; i >= 0 ? list.splice(i, 1) : list.push(p); logAdmin(i >= 0 ? 'Permission revoked' : 'Permission granted', 'Role', r, { note: roleName(r) + ' · ' + label, prev: i >= 0 ? 'Granted' : 'Not granted', next: i >= 0 ? 'Not granted' : 'Granted' }); save(); render(); toast(label + (i >= 0 ? ' removed from ' : ' granted to ') + roleName(r), 'ok'); },
  'roles-reset': () => { const def = DEFAULT_ROLES(); Object.keys(S.roles).forEach(k => { if (!def[k]) def[k] = ['view']; }); S.roles = def; logAdmin('Permissions restored to defaults', 'Role', 'All roles', {}); save(); render(); toast('Role permissions restored to defaults'); },

  /* configuration (config.js) */
  'cfg-new': el => { const k = el.dataset.k; const d = cfgBlank(k); const back = UI.modal && UI.modal.type !== 'cfg' ? null : null; UI.modal = { type: 'cfg', k, d }; if (UI.route.name === 'user-new' || UI.route.name === 'user-edit') UI.modal.then = x => { UI.udraft.team = x.id; render(); toast('Team created'); }; render(); },
  'cfg-edit': el => { const k = el.dataset.k; const x = CONFIG[k].coll().find(i => i.id === el.dataset.id); const d = JSON.parse(JSON.stringify(x)); CONFIG[k].fields.forEach(f => { if (f[3].get) d[f[0]] = f[3].get(x); }); UI.modal = { type: 'cfg', k, id: x.id, d }; render(); },
  'cfg-multi': el => { document.querySelectorAll('[data-cfg]').forEach(i => { UI.modal.d[i.dataset.cfg] = i.value; }); const d = UI.modal.d; const k = el.dataset.k; const cur = Array.isArray(d[k]) ? d[k] : []; d[k] = cur.includes(el.dataset.v) ? cur.filter(x => x !== el.dataset.v) : [...cur, el.dataset.v]; render(); },
  'cfg-bool': el => { document.querySelectorAll('[data-cfg]').forEach(i => { UI.modal.d[i.dataset.cfg] = i.value; }); UI.modal.d[el.dataset.f] = !UI.modal.d[el.dataset.f]; render(); },
  'cfg-save': () => cfgSave(),
  'cfg-toggle': el => cfgToggle(el.dataset.k, el.dataset.id),
  'cfg-delete': el => cfgDelete(el.dataset.k, el.dataset.id),
  'mod-archive': el => { const m = modById(el.dataset.id); if (!can(me(), m.archived ? 'restore' : 'withdraw')) return; m.archived = !m.archived; m.archivedAt = m.archived ? Date.now() : null; m.archivedBy = m.archived ? me().id : null; log(m.archived ? 'Module archived' : 'Module reinstated', 'Module', m, live(m) ? live(m).v : null, { prev: m.archived ? 'In library' : 'Archived', next: m.archived ? 'Archived' : 'In library' }); save(); render(); toast(m.archived ? 'Withdrawn from the Approved Library' : 'Reinstated in the Approved Library'); },
  print: () => window.print(),
  'wf-active': () => { UI.wfDraft.active = UI.wfDraft.active === false; render(); },
  'wf-applies': el => { UI.wfDraft.appliesTo = el.dataset.v; render(); },

  /* Validation SOPs */
  'sop-new': () => { UI.modal = { type: 'sop', d: { name: '', rule: 'reference', appliesTo: 'Module', types: [], products: [], markets: [], guidance: '', months: 12 } }; render(); },
  'sop-edit': el => { const s = S.sops.find(x => x.id === el.dataset.id); UI.modal = { type: 'sop', id: s.id, d: { name: s.name, rule: s.rule, appliesTo: s.appliesTo, types: [...(s.scope.types || [])], products: [...(s.scope.products || [])], markets: [...(s.scope.markets || [])], guidance: s.guidance, months: s.months || 12 } }; render(); },
  'sop-toggle': el => { const arr = UI.modal.d[el.dataset.k]; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v); render(); },
  'sop-save': () => {
    const M = UI.modal; const D = M.d; ['name', 'guidance'].forEach(k => { const e = document.querySelector(`[data-sop="${k}"]`); if (e) D[k] = e.value; });
    if (blank(D.name)) { M.err = true; render(); return; }
    const data = { name: clean(D.name), rule: D.rule, appliesTo: D.appliesTo, scope: { types: [...D.types], products: [...D.products], markets: [...D.markets] }, guidance: D.guidance.trim(), months: +D.months || 12 };
    if (M.id) { const s = S.sops.find(x => x.id === M.id); const prev = s.name + ' · ' + SOP_RULES[s.rule] + ' · ' + sopScopeTxt(s); Object.assign(s, data); logAdmin('SOP updated', 'SOP', s.id, { prev, next: s.name + ' · ' + SOP_RULES[s.rule] + ' · ' + sopScopeTxt(s) }); toast('SOP updated'); }
    else { const n = Math.max(0, ...S.sops.map(s => +s.id.slice(4))) + 1; const s = { id: 'SOP-' + String(n).padStart(2, '0'), ...data, active: true }; S.sops.push(s); logAdmin('SOP created', 'SOP', s.id, { next: s.name + ' · ' + SOP_RULES[s.rule] + ' · ' + sopScopeTxt(s) }); toast('SOP created — it now applies to new submissions and approvals'); }
    UI.modal = null; save(); render();
  },
  'sop-active': el => { const s = S.sops.find(x => x.id === el.dataset.id); s.active = !s.active; logAdmin(s.active ? 'SOP activated' : 'SOP deactivated', 'SOP', s.id, { prev: s.active ? 'Inactive' : 'Active', next: s.active ? 'Active' : 'Inactive', note: s.name }); save(); render(); },

  /* settings */
  'set-bool': el => { UI.setDraft[el.dataset.k] = !UI.setDraft[el.dataset.k]; render(); },
  'set-discard': () => { UI.setDraft = null; render(); },
  'home-retry': () => render(),
  'home-tab': el => { UI.f.htab = el.dataset.v; render(); },
  'set-save': () => {
    const D = UI.setDraft; let n = 0;
    const ep = String(D.notifyEndpoint || '').trim(); if (ep && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(ep)) { toast('Email delivery endpoint must be a full https:// address', 'err'); return; } if ('notifyEndpoint' in D) D.notifyEndpoint = ep;
    SETTINGS.forEach(([, fields]) => fields.forEach(([k, label, type]) => { let val = D[k]; if (type === 'number') val = Math.max(1, Math.round(+val || 1)); if (type === 'number0') val = Math.max(0, Math.round(+val || 0)); if (String(val) !== String(S.settings[k])) { const show = x => type === 'bool' ? (x ? 'On' : 'Off') : type === 'wf' || type === 'wfa' ? (wfById(x) || {}).name : String(x); logAdmin('Setting changed', 'Settings', 'settings', { note: label, prev: show(S.settings[k]), next: show(val) }); S.settings[k] = val; n++; } }));
    UI.setDraft = null; save(); render(); toast(n ? n + ' setting' + (n > 1 ? 's' : '') + ' saved' : 'No changes');
  },
  'reset-open': () => { UI.modal = { type: 'confirm-reset' }; render(); },
  'reset-confirm': () => { const v = document.getElementById('m-confirm').value.trim(); if (v !== 'RESTORE') { UI.modal.err = true; render(); return; } mediaClear(); const pid = S.personaId; S = linkModuleWorkflows(SEED()); S.signedIn = true; S.personaId = pid; UI.modal = null; UI.f = {}; UI.pg = {}; log('Workspace restored', 'Settings', { id: 'settings' }, 1, { note: 'Initial workspace restored' }); save(); go('home'); toast('Initial workspace restored'); },

  /* workflows */
  'wf-new': () => go('workflow-new'),
  'wf-view': el => { UI.modal = { type: 'wf-view', id: el.dataset.id }; render(); },
  'wf-open': el => { UI.modal = null; go('workflow', { id: el.dataset.id }); },
  'wf-add-mail': el => { const i = +el.dataset.i; UI.wfDraft.steps.splice(i, 0, notifyStep()); UI.wfSel = i; render(); toast('Email step added — choose who receives it'); },
  'wf-kind': el => { const st = UI.wfDraft.steps; const cur = st[UI.wfSel]; if (el.dataset.v === 'notify' && !isNotify(cur)) st[UI.wfSel] = notifyStep(); if (el.dataset.v === 'review' && isNotify(cur)) st[UI.wfSel] = { id: uid('s'), fn: defaultReviewFn(), level: 'Member', req: 'review' }; render(); },
  'wf-rcpt': el => { const s = UI.wfDraft.steps[UI.wfSel]; const r = s.recipients || (s.recipients = []); const k = r.indexOf(el.dataset.v); k < 0 ? r.push(el.dataset.v) : r.splice(k, 1); render(); },
  'nwf-rcpt': el => { const s = UI.nwf.steps[+el.dataset.i]; const r = s.recipients || (s.recipients = []); const k = r.indexOf(el.dataset.v); k < 0 ? r.push(el.dataset.v) : r.splice(k, 1); render(); },
  'nwf-use': el => { UI.nwf.appliesTo = el.dataset.v; render(); },
  'nwf-tpl': el => { const v = el.dataset.v, mk = (fn, level, req) => ({ id: uid('s'), fn, level, req }); UI.nwf.steps = v === 'std' ? reviewFuncs().flatMap(fn => [mk(fn, 'Member', 'review'), mk(fn, 'Lead', 'approve')]) : v === 'senior' ? reviewFuncs().map(fn => mk(fn, 'Lead', 'approve')) : []; render(); },
  'nwf-add': el => { UI.nwf.steps.push(el.dataset.v === 'Email' ? notifyStep() : { id: uid('s'), fn: el.dataset.v, level: 'Lead', req: 'approve' }); render(); toast(el.dataset.v === 'Email' ? 'Email step added — choose who receives it' : el.dataset.v + ' step added'); },
  'nwf-set': el => { const s = UI.nwf.steps[+el.dataset.i]; s[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'req' && el.dataset.v === 'approve') s.level = 'Lead'; if (el.dataset.k === 'level' && el.dataset.v === 'Member') s.req = 'review'; render(); },
  'nwf-move': el => { const st = UI.nwf.steps, i = +el.dataset.i, j = i + +el.dataset.dir; if (j < 0 || j >= st.length) return; [st[i], st[j]] = [st[j], st[i]]; render(); },
  'nwf-del': el => { UI.nwf.steps.splice(+el.dataset.i, 1); render(); },
  'wf-sel': el => { UI.wfSel = +el.dataset.i; render(); if (window.innerWidth < 1180) { const c = document.querySelector('.builder > .stack'); c && c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
  'wf-set': el => { const s = UI.wfDraft.steps[UI.wfSel]; s[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'req' && el.dataset.v === 'approve') s.level = 'Lead'; if (el.dataset.k === 'level' && el.dataset.v === 'Member') s.req = 'review'; render(); },
  'wf-add': el => { const i = +el.dataset.i; const ref = UI.wfDraft.steps[i - 1] || UI.wfDraft.steps[i]; UI.wfDraft.steps.splice(i, 0, { id: uid('s'), fn: ref && !isNotify(ref) ? ref.fn : defaultReviewFn(), level: 'Member', req: 'review' }); UI.wfSel = i; render(); toast('Step added — configure it on the right'); },
  'wf-del': () => { if (UI.wfDraft.steps.length <= 1) return; UI.wfDraft.steps.splice(UI.wfSel, 1); UI.wfSel = Math.max(0, UI.wfSel - 1); render(); },
  'wf-move': el => { const i = UI.wfSel, j = i + +el.dataset.dir; const st = UI.wfDraft.steps; if (j < 0 || j >= st.length) return; [st[i], st[j]] = [st[j], st[i]]; UI.wfSel = j; render(); },
  'wf-discard': () => { UI.wfDraft = null; render(); },
  'wf-save': () => {
    const D = UI.wfDraft; const w = wfById(D.id); if (wfIssues(D).some(x => x[0] === 'bad')) return;
    D.name = clean(D.name); if (blank(D.name) || S.workflows.some(x => x.id !== w.id && !x.hidden && x.name.toLowerCase() === D.name.toLowerCase())) { toast('Give the workflow a unique name'); return; }
    if (D.active === false && w.active !== false && [...Object.values(S.settings)].includes(w.id)) { toast('This workflow is a default in Settings — choose another default first'); return; }
    if (D.active === false && S.materialTypes.some(t => t.active && t.workflow === w.id)) { toast('An active Material Type uses this workflow — change it first'); return; }
    [['name', 'Name'], ['desc', 'Description'], ['appliesTo', 'Applies to']].forEach(([k, l]) => { if ((w[k] || '') !== (D[k] || '')) logAdmin('Workflow updated', 'Workflow', w.id, { note: l, prev: w[k] || '', next: D[k] || '' }); });
    if ((w.active !== false) !== (D.active !== false)) logAdmin(D.active === false ? 'Workflow deactivated' : 'Workflow activated', 'Workflow', w.id, { prev: w.active !== false ? 'Active' : 'Inactive', next: D.active !== false ? 'Active' : 'Inactive' });
    Object.assign(w, { desc: D.desc, appliesTo: D.appliesTo, active: D.active !== false });
    const inflight = [...S.modules, ...S.assets].filter(o => (o.review && o.review.wf === w.id) || (o.resume && o.resume.wf === w.id));
    if (inflight.length) { const n = S.workflows.filter(x => x.id.startsWith(w.id + '@')).length + 1; const old = JSON.parse(JSON.stringify(w)); old.id = w.id + '@' + n; old.hidden = true; S.workflows.push(old); inflight.forEach(o => { const c = curCycle(o); if (o.review && o.review.wf === w.id) o.review.wf = old.id; if (o.resume && o.resume.wf === w.id) o.resume.wf = old.id; if (c) c.wf = old.id; }); }
    const prev = w.steps.filter(s => !isNotify(s)).map(stepLabel).join(' → ');
    w.steps = JSON.parse(JSON.stringify(D.steps)); w.name = D.name; logAdmin('Workflow updated', 'Workflow', w.id, { prev, next: w.steps.filter(s => !isNotify(s)).map(stepLabel).join(' → '), note: inflight.length ? inflight.length + ' in-flight item(s) keep the previous route' : '' }); save(); UI.wfDraft = null; render(); toast('Workflow saved — applies to new submissions');
  }
};

/* Write actions on admin pages need the matching manage permission; Administration view access alone is read-only. */
const ACT_PERM = { 'cmp-toggle': 'manage_users', 'cmp-save': 'manage_users', 'user-status': 'manage_users', 'perm-toggle': 'manage_users', 'role-save': 'manage_users', 'sop-new': 'manage_sops', 'sop-edit': 'manage_sops', 'sop-save': 'manage_sops', 'sop-active': 'manage_sops', 'wf-new': 'manage_workflows', 'wf-save': 'manage_workflows', 'wf-del': 'manage_workflows', 'wf-add': 'manage_workflows', 'wf-add-mail': 'manage_workflows', 'wf-active': 'manage_workflows', 'wf-open': 'manage_workflows', 'audit-export': 'export' };
const ACT_ADMIN = ['cfg-new', 'cfg-edit', 'cfg-toggle', 'cfg-delete', 'cfg-save', 'cfg-multi'];
/* Object-level rules for actions that change records. They mirror the conditions the pages use to show each
   button, so a hidden or forged control cannot do what the role or the workflow step does not allow. */
const actObj = el => { const M = UI.modal || {}; return objById(el.dataset.kind || M.kind || 'Module', el.dataset.id || M.id); };
const actAsset = el => assetById(el.dataset.asset || el.dataset.id || (UI.modal && UI.modal.id)) || curAsset();
const decideOk = (u, o, d) => { const st = o && curStep(o); if (!st || !canActOn(u, o)) return false; if (d === 'reject') return can(u, 'reject'); if (d === 'amend') return can(u, 'request_amend'); if (d === 'return') return st.level === 'Lead' && memberStepIndex(o) >= 0; return st.req !== 'approve'; };
const signOk = (u, o) => { const st = o && curStep(o); return !!st && st.req === 'approve' && canActOn(u, o); };
const editAsset = el => { const a = actAsset(el); return !!a && canEditObj(me(), a); };
const ACT_GUARD = {
  'roles-reset': () => can(me(), 'manage_users'),
  'reset-open': () => can(me(), 'manage_settings'), 'reset-confirm': () => can(me(), 'manage_settings'),
  'ws-export': () => can(me(), 'manage_settings'), 'ws-import-confirm': () => can(me(), 'manage_settings') && !!(UI.modal && UI.modal.backup),
  'set-save': () => can(me(), 'manage_settings'), 'set-bool': () => can(me(), 'manage_settings'),
  'sop-save': () => can(me(), 'manage_sops'),
  decide: el => decideOk(me(), actObj(el), el.dataset.d), 'decide-confirm': () => { const M = UI.modal || {}; return M.type === 'decide' && decideOk(me(), objById(M.kind, M.id), M.d); },
  sign: el => signOk(me(), actObj(el)), 'sign-confirm': () => { const M = UI.modal || {}; return M.type === 'sign' && signOk(me(), objById(M.kind, M.id)); },
  'submit-open': el => { const m = modById(el.dataset.id); return !!m && canEditObj(me(), m) && can(me(), ['submit', 'edit']); },
  'submit-confirm': () => { const m = modById((UI.modal || {}).id); return !!m && canEditObj(me(), m) && can(me(), ['submit', 'edit']); },
  'resubmit-open': el => { const o = actObj(el); return !!o && canAmendObj(me(), o); }, 'resubmit-confirm': () => { const M = UI.modal || {}; const o = objById(M.kind, M.id); return !!o && canAmendObj(me(), o); },
  'new-version': el => { const m = modById(el.dataset.id); return !!m && canEditObj(me(), m) && can(me(), 'create_version'); },
  'asset-new': () => canCreateAsset(me()), 'asset-create': () => canCreateAsset(me()),
  'asset-version': el => editAsset(el) && can(me(), 'create_version'), 'asset-version-confirm': el => editAsset(el) && can(me(), 'create_version'),
  'asset-save': editAsset, 'asset-submit': editAsset, 'asset-submit-confirm': editAsset, 'a-toggle': editAsset, 'blk-add': editAsset, 'blk-move': editAsset, 'blk-del': editAsset, 'new-text': editAsset, 'new-text-confirm': editAsset, 'replace-version': editAsset
};
function actAllowed(act, el) {
  if (ACT_GUARD[act] && !ACT_GUARD[act](el)) return false;
  if (ACT_PERM[act]) return can(me(), ACT_PERM[act]);
  if (ACT_ADMIN.includes(act)) { const k = el.dataset.k || (UI.modal && UI.modal.k); return !CONFIG[k] || can(me(), CONFIG[k].perm); }
  return true;
}
// A new record created from "+ Add new" is selected in the form that asked for it.
function applyQuick(field, x, back) {
  const [scope, key, id] = field.split(':'); const put = D => { if (Array.isArray(D[key])) { if (!D[key].includes(x.id)) D[key].push(x.id); } else D[key] = x.id; };
  if (scope === 'draft' && UI.draft) { put(UI.draft); if (key === 'products') UI.draft.indications = uniq(UI.draft.products.flatMap(pid => productInds(pid).map(i => i.id))); }
  else if (scope === 'modal' && back && back.d) put(back.d);
  else if (scope === 'asset') { const a = assetById(id); if (!a) return; if (Array.isArray(a[key])) { if (!a[key].includes(x.id)) ACT['a-toggle']({ dataset: { id, k: key, v: x.id } }); }
    else { const prev = a[key]; a[key] = x.id; a.updatedAt = Date.now(); log('Asset updated', 'Asset', a, null, { note: key, prev: prev || '—', next: cfgName(CFG_OF_KEY[key] || 'materials', x) }); } }
}
const CFG_OF_KEY = { type: 'materials', channel: 'channels', audience: 'audiences' };
/* ===== Event wiring ===== */
document.addEventListener('click', ev => {
  const actEl = ev.target.closest('[data-act]'); const goEl = ev.target.closest('[data-go]');
  if (UI.pop && !ev.target.closest('.pop') && !ev.target.closest('[data-pop]') && !ev.target.closest('.search')) { UI.pop = null; if (!actEl && !goEl) { render(); return; } }
  if (UI.msel && !ev.target.closest('.msel')) { UI.msel = null; UI.mselq = ''; if (!actEl && !goEl) { render(); return; } }
  if (UI.search && !ev.target.closest('.search')) { UI.search = ''; if (!actEl && !goEl) { render(); return; } }
  if (actEl && (!goEl || actEl === goEl || goEl.contains(actEl))) {
    if (actEl.disabled) return;
    const fn = ACT[actEl.dataset.act]; if (fn && !actAllowed(actEl.dataset.act, actEl)) { ev.preventDefault(); toast(ACT_GUARD[actEl.dataset.act] ? 'You are not allowed to do this' : 'Your role can view this page but not change it'); return; }
    if (fn) { if (actEl.dataset.act !== 'modal-bg') ev.preventDefault(); fn(actEl, ev); return; }
  }
  if (goEl) { ev.preventDefault(); const p = {}; ['id', 'tab', 'k', 'v'].forEach(k => { if (goEl.dataset[k]) p[k] = goEl.dataset[k]; }); if (!['cover', 'module', 'asset'].includes(goEl.dataset.go)) delete p.v; if (!['cover', 'item'].includes(goEl.dataset.go)) delete p.k; if (goEl.dataset.mstat != null) UI.f.mstat = goEl.dataset.mstat; if (goEl.dataset.setf) goEl.dataset.setf.split('&').forEach(kv => { const [k, v] = kv.split('='); UI.f[k] = v; }); UI.modal = null; go(goEl.dataset.go, p); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && UI.msel) { UI.msel = null; UI.mselq = ''; render(); return; }
  if (ev.key === 'Escape') { if (UI.modal) { UI.modal = UI.modal.back || null; render(); } else if (UI.pop || UI.search) { UI.pop = null; UI.search = ''; render(); } }
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('tr.click')) ev.target.click();
  if (ev.key === 'Enter' && UI.modal && UI.modal.type === 'filters' && ev.target.dataset && ev.target.dataset.fd) { ev.preventDefault(); ACT['flt-apply'](); }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'global-search') { UI.search = t.value; render(); return; }
  if (t.id === 'rv-comment') { UI.f.rvc = t.value; return; }
  if (t.dataset.fd && UI.modal && UI.modal.d) { UI.modal.d[t.dataset.fd] = t.value; return; }
  if (t.dataset.fq) { const q = t.value.toLowerCase(); const sel = document.getElementById(t.dataset.fq); if (sel) [...sel.options].forEach(o => { o.hidden = !!o.value && !o.text.toLowerCase().includes(q); }); return; }
  if (t.dataset.mselq) { UI.mselq = t.value; render(); return; }
  if (t.dataset.filter && t.tagName === 'INPUT') { UI.f[t.dataset.filter] = t.value; if (t.type === 'date') return; render(); return; }
  if (t.dataset.dm) { const D = UI.draft; D.media = D.media || {}; D.media[t.dataset.dm] = t.dataset.dm === 'duration' ? (+t.value || null) : t.value; renderSoon(); return; }
  if (t.dataset.d && t.tagName !== 'SELECT') { UI.draft[t.dataset.d] = t.value; if (t.dataset.d === 'body' || t.dataset.d === 'title') renderSoon(); return; }
  if (t.dataset.u && t.tagName !== 'SELECT') { UI.udraft[t.dataset.u] = t.value; return; }
  if (t.dataset.w) { UI.nwf[t.dataset.w] = t.value; return; }
  if (t.dataset.wfd) { UI.wfDraft[t.dataset.wfd] = t.value; return; }
  if (t.dataset.wfn) { UI.wfDraft.steps[UI.wfSel][t.dataset.wfn] = t.value; renderSoon(); return; }
  if (t.dataset.nwfn) { UI.nwf.steps[+t.dataset.i][t.dataset.nwfn] = t.value; renderSoon(); return; }
  if (t.dataset.an && t.tagName !== 'SELECT') { UI.modal.d[t.dataset.an] = t.value; return; }
  if (t.dataset.sop && t.tagName !== 'SELECT') { UI.modal.d[t.dataset.sop] = t.value; return; }
  if (t.dataset.set && t.tagName === 'INPUT') { UI.setDraft[t.dataset.set] = t.value; const sb = document.querySelector('[data-act=set-save]'); if (sb) sb.disabled = false; renderSoon(); return; }
});
let rsT = null; function renderSoon() { clearTimeout(rsT); rsT = setTimeout(render, 300); }
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.filter) { UI.f[t.dataset.filter] = t.value; render(); return; }
  if (t.dataset.fd && UI.modal && UI.modal.d) { UI.modal.d[t.dataset.fd] = t.value; if (t.tagName === 'SELECT') render(); return; }
  if (t.dataset.assetProp) {
    const a = assetById(t.dataset.id); if (!a || !canEditObj(me(), a)) { render(); return; } const k = t.dataset.assetProp; const prev = a[k] || ''; if (prev === t.value) return; a[k] = t.value; a.updatedAt = Date.now();
    if (k === 'type') { const mt = mat(t.value); if (mt && !a.blocks.length) a.channel = mt.channel; }
    const shown = v => k === 'type' ? mat(v).name : k === 'channel' ? chan(v).name : k === 'audience' ? aud(v).name : k === 'owner' ? user(v).name : v;
    log(k === 'owner' ? 'Owner changed' : 'Asset updated', 'Asset', a, null, { note: ({ name: 'Name', type: 'Material type', channel: 'Channel', audience: 'Audience', disclaimer: 'Local disclaimer', owner: 'Material Owner' })[k] + ' changed', prev: trunc(shown(prev), 60), next: trunc(shown(t.value), 60) }); save(); render(); return;
  }
  const textual = (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'date' && t.type !== 'checkbox'));
  if (textual && (t.dataset.dm || t.dataset.d || t.dataset.u || t.dataset.an || t.dataset.sop || t.dataset.set)) return;
  if (t.dataset.d) { UI.draft[t.dataset.d] = t.value; render(); return; }
  if (t.dataset.actChange === 'd-file') { uploadModuleFile(t.files && t.files[0]); return; }
  if (t.dataset.actChange === 'rework-file') { const f = t.files && t.files[0]; t.value = ''; reworkUpload(t.dataset.id, f); return; }
  if (t.dataset.actChange === 'ws-import') { const f = t.files && t.files[0]; t.value = ''; if (f && can(me(), 'manage_settings')) readBackupFile(f); return; }
  if (t.dataset.actChange === 'd-addref' && t.value) { UI.draft.refs.push(t.value); render(); return; }
  if (t.dataset.actChange === 'sign-att') { UI.modal.att = t.checked; UI.modal.err = null; render(); return; }
  if (t.dataset.u) { UI.udraft[t.dataset.u] = t.value; render(); return; }
  if (t.dataset.an) { const D = UI.modal.d; D[t.dataset.an] = t.value; if (t.dataset.an === 'type') { const mt = mat(t.value); D.channel = mt.channel; D.name = mt.name + ' — ' + (D.name.split('—')[1] || '').trim(); } render(); return; }
  if (t.dataset.sop) { UI.modal.d[t.dataset.sop] = t.value; render(); return; }
  if (t.dataset.set) { UI.setDraft[t.dataset.set] = t.value; render(); return; }
  if (t.dataset.w || t.dataset.wfn || t.dataset.nwfn) return;
  if (t.dataset.nwf) { const st = UI.nwf.steps[+t.dataset.i]; st[t.dataset.nwf] = t.value; if (t.dataset.nwf === 'fn') st.team = ''; if (st.team === '') delete st.team; render(); return; }
  if (t.dataset.wf) { const st = UI.wfDraft.steps[UI.wfSel]; st[t.dataset.wf] = t.value; if (t.dataset.wf === 'fn') st.team = ''; if (st.team === '') delete st.team; render(); return; }
  if (t.dataset.wfd) return;
});
document.addEventListener('submit', ev => {
  ev.preventDefault(); const f = ev.target.dataset.form;
  if (f === 'login') {
    const email = ev.target.email.value.trim().toLowerCase(); UI.f.loginEmail = email; const x = S.users.find(u => u.email.toLowerCase() === email);
    if (!email || !ev.target.password.value) { UI.f.loginErr = 'Enter your email and password.'; render(); return; }
    if (!x) { UI.f.loginErr = 'No account uses that email address.'; render(); return; }
    if (x.status !== 'Active') { UI.f.loginErr = 'This account is inactive. Ask an administrator to reactivate it.'; render(); return; }
    // A link opened while signed out (e.g. a shared module URL) opens after sign-in.
    const after = UI.after; UI.after = null;
    S.personaId = x.id; S.signedIn = true; UI.f.loginErr = null; log('Signed in', 'User', x, 1); save(); after ? go(after.name, after.p) : go('home');
  }
  if (f === 'forgot') { const e = ev.target.email.value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { UI.f.forgotErr = 'Enter a valid email address.'; render(); return; } UI.f.forgotErr = null; UI.f.resetSent = e; render(); }
  if (f === 'module') saveModuleForm();
  if (f === 'user') saveUserForm();
  if (f === 'workflow') saveWorkflowForm();
});

/* ===== Workspace backup file: read and check it, then ask for confirmation ===== */
async function readBackupFile(file) {
  let b; try { b = JSON.parse(await file.text()); } catch (e) { toast('This file is not a MedLR backup (it is not valid JSON)', 'err'); return; }
  const why = backupProblem(b); if (why) { toast(why, 'err'); return; }
  UI.modal = { type: 'confirm-import', backup: b }; render(); setTimeout(() => { const i = document.getElementById('m-confirm'); i && i.focus(); }, 30);
}

/* ===== File upload for media & document modules ===== */
async function fileChecksum(buf) {
  try { if (crypto && crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', buf); return { algo: 'SHA-256', hex: [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('') }; } } catch (e) {}
  let h1 = 0x811c9dc5, h2 = 0x01000193; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) { h1 = Math.imul(h1 ^ a[i], 16777619) >>> 0; h2 = Math.imul(h2 ^ a[i], 2246822507) >>> 0; }
  return { algo: 'FNV-1a', hex: h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') };
}
const withTimeout = (p, ms, fb) => Promise.race([p, new Promise(r => setTimeout(() => r(fb), ms))]);
// Reads what the file itself says: image size, video duration and size, PDF page count.
async function probeFile(file, kind, buf) {
  const url = URL.createObjectURL(file); const ext = (file.name.split('.').pop() || '').toUpperCase();
  try {
    if (kind === 'image') { const r = await withTimeout(new Promise(res => { const im = new Image(); im.onload = () => res({ width: im.naturalWidth, height: im.naturalHeight }); im.onerror = () => res({}); im.src = url; }), 8000, {}); return { ...r, format: ext + (r.width ? ' · ' + r.width + '×' + r.height : '') }; }
    if (kind === 'video') { const r = await withTimeout(new Promise(res => { const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.onloadedmetadata = () => res({ duration: isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : null, width: v.videoWidth || null, height: v.videoHeight || null }); v.onerror = () => res({}); v.src = url; }), 8000, {}); const cont = { 'video/mp4': 'MP4', 'video/webm': 'WebM', 'video/quicktime': 'MOV' }[file.type] || ext; return { duration: r.duration != null ? r.duration : null, width: r.width, height: r.height, format: cont + (r.width ? ' · ' + r.width + '×' + r.height : '') }; }
    let pages = null; try { const lib = await withTimeout(loadPdfJs(), 6000, null); if (lib) { const doc = await withTimeout(lib.getDocument({ data: buf.slice(0) }).promise, 8000, null); if (doc) pages = doc.numPages; } } catch (e) {}
    if (!pages) { const txt = new TextDecoder('latin1').decode(new Uint8Array(buf)); pages = (txt.match(/\/Type\s*\/Page(?![a-z])/g) || []).length || null; }
    return { pages, format: 'PDF' + (pages ? ' · ' + pages + ' page' + (pages > 1 ? 's' : '') : '') };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
// Checks and stores an uploaded file; returns { media, stored } or { error } with a message for the user.
function mediaFileProblem(file, kind) {
  if (!file) return 'No file was selected.';
  if (!MEDIA_ACCEPT[kind] || !MEDIA_ACCEPT[kind].includes(file.type)) return 'This ' + kindLabel(kind).toLowerCase() + ' module accepts ' + (MEDIA_ACCEPT[kind] || []).map(x => x.split('/')[1].replace('svg+xml', 'svg').replace('quicktime', 'mov').toUpperCase()).join(', ') + ' files. “' + file.name + '” is ' + (file.type || 'an unknown type') + '.';
  if (file.size > mediaMaxMb() * 1048576) return '“' + file.name + '” is ' + fmtSize(file.size) + '. The limit is ' + mediaMaxMb() + ' MB.';
  if (!file.size) return '“' + file.name + '” is empty.';
  return '';
}
async function ingestMediaFile(file, kind, prev) {
  const bad = mediaFileProblem(file, kind); if (bad) return { error: bad };
  try {
    const buf = await file.arrayBuffer(); const sum = await fileChecksum(buf); const meta = await probeFile(file, kind, buf);
    const id = 'f-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const stored = await mediaPut(id, file);
    prev = prev || {};
    const media = { fileId: id, name: file.name, mime: file.type, size: file.size, checksum: sum.hex, algo: sum.algo, width: null, height: null, duration: null, pages: null, ...meta, source: prev.source || '', usage: prev.usage || '', uploadedAt: Date.now(), uploadedBy: me().id };
    if (prev.fileId && prev.format && kind === 'video' && !meta.format) media.format = prev.format;
    return { media, stored };
  } catch (e) { return { error: 'Could not read “' + file.name + '”.' }; }
}
async function uploadModuleFile(file) {
  const D = UI.draft; if (!file || !D) return; const kind = kindOfType(D.type);
  const bad = mediaFileProblem(file, kind); if (bad) { toast(bad); return; }
  D.mediaBusy = true; render();
  const r = await ingestMediaFile(file, kind, D.media);
  if (r.error) toast(r.error); else { D.media = r.media; toast(r.stored ? file.name + ' uploaded' : file.name + ' kept for this session — the browser blocked file storage'); }
  D.mediaBusy = false; render();
}
/* Rework after a rejection or an amendment request: the responsible person downloads the current file,
   edits it outside the app and uploads the replacement here. The module keeps its id, metadata, comments and audit.
   Amendment — the file is replaced inside the current version (the old file stays in its file history) and
     resubmitting resumes approval at the step that asked for the change; earlier approvals are kept.
   Rejection — a new version is created with the new file; submitting it restarts the cycle from the first step. */
async function reworkUpload(id, file) {
  const m = modById(id); const mode = m && fileRework(me(), m); if (!mode) { toast('You cannot upload a new version of this module'); return; }
  const kind = kindOfType(m.type); const bad = mediaFileProblem(file, kind);
  UI.rework = { id, err: bad, busy: !bad }; render(); if (bad) return;
  const l = latest(m); const r = await ingestMediaFile(file, kind, l.media);
  if (r.error) { UI.rework = { id, err: r.error }; render(); return; }
  const old = l.media || {}; const facts = md => md.name + ' · ' + fmtSize(md.size) + ' · ' + String(md.checksum || '').slice(0, 12);
  if (mode === 'amend') {
    l.files = l.files || []; if (old.fileId) l.files.push({ ...old, replacedAt: Date.now(), replacedBy: me().id });
    r.media.rev = (old.rev || 1) + 1; l.media = r.media; m.updatedAt = Date.now();
    log('Media replaced', 'Module', m, l.v, { prev: old.name ? facts(old) : '', next: facts(r.media), note: 'File revision ' + r.media.rev + ' of v' + l.v + ' uploaded for the amendment' });
    UI.rework = null; save(); render(); toast('File revision ' + r.media.rev + ' uploaded — resubmit to resume at ' + m.resume.fn + ' ' + levelName(m.resume.level));
  } else {
    const nv = newVersion(m, 'Module', 'New file uploaded after rejection'); const v = latest(m); v.media = { ...r.media, source: old.source || '', usage: old.usage || '' };
    log('Media uploaded', 'Module', m, nv, { prev: old.name ? facts(old) : '', next: facts(v.media), note: (v.media.algo || '') + ' ' + v.media.checksum });
    UI.rework = null; save(); render(); toast('Version ' + nv + ' created — submit it to start a new approval cycle from the first step');
  }
}

function wizDraft(form) { return form === 'user' ? UI.udraft : form === 'workflow' ? UI.nwf : UI.draft; }
function wizSteps(form) { return form === 'user' ? USTEPS : form === 'workflow' ? WSTEPS : msteps(UI.draft); }
function wizErrs(form) { return form === 'user' ? validateUser(UI.udraft, UI.route.p.id) : form === 'workflow' ? validateWf(UI.nwf) : validateDraft(UI.draft); }
function wizShow(D, i) { D.anim = true; D.step = i; D.maxStep = Math.max(D.maxStep || 0, i); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); const h = document.querySelector('.wiz-head h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
// Returns true when the form is on its last step and fully valid (caller saves); otherwise moves the wizard.
function wizAdvance(form) {
  const D = wizDraft(form), steps = wizSteps(form), last = steps.length - 1, cur = D.step || 0, all = wizErrs(form);
  if (cur < last) {
    const bad = steps[cur][1].filter(k => all[k]);
    if (bad.length) { D.triedSteps = [...new Set([...(D.triedSteps || []), cur])]; render(); const first = document.querySelector('.invalid, .err'); first && first.scrollIntoView({ block: 'center', behavior: 'smooth' }); return false; }
    wizShow(D, cur + 1); return false;
  }
  if (Object.keys(all).length) { D.tried = true; const firstBad = steps.findIndex(s => s[1].some(k => all[k])); wizShow(D, firstBad < 0 ? last : firstBad); return false; }
  return true;
}
// Field-level audit entries for a module change.
function logModuleDiff(m, before, D, v) {
  if ((before.workflow || null) !== (D.workflow || null)) log('Workflow changed', 'Module', m, v, { prev: before.workflow ? (wfById(before.workflow) || {}).name || before.workflow : '—', next: D.workflow ? wfById(D.workflow).name : '—' });
  const add = D.refs.filter(r => !before.refs.includes(r)), rem = before.refs.filter(r => !D.refs.includes(r));
  if (!sameSet(before.products, D.products)) log('Product changed', 'Module', m, v, { prev: productsTxt(before.products), next: productsTxt(D.products) });
  if (!sameSet(before.markets, D.markets)) log('Country changed', 'Module', m, v, { prev: marketsTxt(before.markets), next: marketsTxt(D.markets) });
  add.forEach(r => log('Reference added', 'Module', m, v, { next: refById(r).title }));
  rem.forEach(r => log('Reference removed', 'Module', m, v, { prev: refById(r).title }));
  const bm = before.media || {}, dm = D.media || {};
  if (dm.fileId && bm.fileId !== dm.fileId) log(bm.fileId ? 'Media replaced' : 'Media uploaded', 'Module', m, v, { prev: bm.name ? bm.name + ' · ' + String(bm.checksum).slice(0, 12) : '', next: dm.name + ' · ' + String(dm.checksum).slice(0, 12), note: (dm.algo || '') + ' ' + dm.checksum });
  [['source', 'Source'], ['usage', 'Usage rules'], ['format', 'Format']].forEach(([k, lbl]) => { if (dm.fileId && (bm[k] || '') !== (dm[k] || '')) log('Module edited', 'Module', m, v, { note: lbl + ' changed', prev: trunc(bm[k] || ''), next: trunc(dm[k] || '') }); });
  if (before.owner !== D.owner) log('Owner changed', 'Module', m, v, { prev: user(before.owner).name, next: user(D.owner).name });
  if (before.body !== D.body.trim()) log('Content edited', 'Module', m, v, { prev: trunc(before.body), next: trunc(D.body.trim()) });
  const meta = [['title', 'Name'], ['type', 'Type'], ['audience', 'Audience']].filter(([k]) => before[k] !== (k === 'title' ? D.title.trim() : D[k]));
  if (!sameSet(before.channels, D.channels)) meta.push(['channels', 'Channels']);
  if (!sameSet(before.indications, D.indications)) meta.push(['indications', 'Indication']);
  if (toISO(before.expiry || 0) !== D.expiry) meta.push(['expiry', 'Expiry']);
  if (toISO(before.reviewDate || 0) !== D.reviewDate) meta.push(['reviewDate', 'Review date']);
  if (meta.length) log('Module edited', 'Module', m, v, { note: meta.map(x => x[1]).join(', ') + ' changed', prev: meta.length === 1 && meta[0][0] === 'title' ? before.title : '', next: meta.length === 1 && meta[0][0] === 'title' ? D.title.trim() : '' });
}
function saveModuleForm() {
  if (!wizAdvance('module')) return;
  const D = UI.draft; const p = UI.route.p; const now = Date.now();
  const base = { workflow: D.workflow || null, title: D.title.trim(), type: D.type, owner: D.owner, products: [...D.products], indications: [...D.indications], audience: D.audience, markets: [...D.markets], channels: [...D.channels], reviewDate: fromISO(D.reviewDate), expiry: fromISO(D.expiry), updatedAt: now };
  if (p.id) {
    const m = modById(p.id); const l = latest(m); const before = { ...m, body: l.body, refs: [...l.refs], media: l.media ? { ...l.media } : null };
    if (p.newVersion) {
      const nv = newVersion(m, 'Module', D.reason.trim()); Object.assign(m, base); const v = latest(m); v.sopLinks = configuredSops(m, 'Module'); v.body = D.body.trim(); v.refs = [...D.refs]; if (D.media) v.media = { ...D.media };
      logModuleDiff(m, before, D, nv); save(); UI.draft = null; go('module', { id: m.id });
      toast('Version ' + nv + ' created' + (live(m) ? ' — v' + live(m).v + ' stays live until v' + nv + ' is approved' : ' — submitting it restarts the full approval cycle')); return;
    }
    Object.assign(m, base); if (statusOf(m) !== 'Amendment Requested') l.sopLinks = configuredSops(m, 'Module'); l.body = D.body.trim(); l.refs = [...D.refs]; if (D.media) l.media = { ...D.media };
    logModuleDiff(m, before, D, l.v);
    if (statusOf(m) === 'Amendment Requested') { m.amendNote = D.reason.trim(); log('Amended', 'Module', m, l.v, { note: D.reason.trim() }); }
    save(); UI.draft = null; go('module', { id: m.id }); toast(statusOf(m) === 'Amendment Requested' ? 'Changes saved — resubmit to resume approval' : 'Changes saved'); return;
  }
  const id = nextModuleId(D.products);
  const m = { id, ...base, versions: [{ v: 1, body: D.body.trim(), refs: [...D.refs], media: D.media ? { ...D.media } : undefined, createdAt: now, createdBy: me().id, reason: 'Initial version', status: 'Draft', cycles: [], approvedAt: null, approvedBy: null }], createdAt: now, review: null, resume: null, archived: false };
  m.versions[0].sopLinks = configuredSops(m, 'Module'); S.modules.push(m); if (D.media && D.media.fileId) log('Media uploaded', 'Module', m, 1, { next: D.media.name + ' · ' + fmtSize(D.media.size), note: (D.media.algo || '') + ' ' + D.media.checksum });
  log('Module created', 'Module', m, 1, { next: 'Draft', note: mtype(m.type).name + ' · ' + productsTxt(m.products) + ' · ' + m.markets.join(', ') + ' · owner ' + user(m.owner).name }); save(); UI.draft = null; go('module', { id }); toast('Draft saved — ' + id);
}
function saveWorkflowForm() {
  if (!wizAdvance('workflow')) return;
  const D = UI.nwf; const w = { id: uid('WF'), name: D.name.trim(), desc: D.desc.trim(), appliesTo: D.appliesTo || 'Module', active: true, steps: D.steps.map(s => ({ ...s })) };
  S.workflows.push(w); logAdmin('Workflow created', 'Workflow', w.id, { next: w.steps.filter(s => !isNotify(s)).map(stepLabel).join(' → '), note: w.name }); save(); UI.nwf = null;
  if (UI.modal && UI.modal.type === 'wf-panel') { const M = UI.modal; const ok = w.appliesTo === 'Module' && UI.draft; if (ok) UI.draft.workflow = w.id; UI.modal = M.back || null; render(); toast(ok ? 'Workflow “' + w.name + '” created and selected — your module entries are unchanged' : 'Workflow created'); return; }
  go('workflow', { id: w.id }); toast('Workflow created · ' + reviewSteps(w).length + ' steps');
}
function saveUserForm() {
  if (!wizAdvance('user')) return;
  const D = UI.udraft; const editId = UI.route.p.id;
  const data = { name: D.name.trim(), email: D.email.trim(), fn: D.fn, level: D.fn === 'Administrator' ? null : D.level, team: D.team, status: D.status };
  if (editId) {
    const x = S.users.find(u => u.id === editId); if (x.id === me().id && data.fn !== 'Administrator') { toast('You cannot remove your own Administrator role'); return; }
    const prevRole = roleLabel(x), prevTeam = team(x.team).name, prevStatus = x.status, prevName = x.name + ' · ' + x.email;
    Object.assign(x, data);
    if (prevName !== x.name + ' · ' + x.email) logAdmin('User updated', 'User', x.id, { prev: prevName, next: x.name + ' · ' + x.email });
    if (prevRole !== roleLabel(x)) logAdmin('Role changed', 'User', x.id, { prev: prevRole, next: roleLabel(x), note: x.name });
    if (prevTeam !== team(x.team).name) logAdmin('Team changed', 'User', x.id, { prev: prevTeam, next: team(x.team).name, note: x.name });
    if (prevStatus !== x.status) logAdmin(x.status === 'Active' ? 'User activated' : 'User deactivated', 'User', x.id, { prev: prevStatus, next: x.status, note: x.name });
    save(); UI.udraft = null; go('user', { id: x.id }); toast('User updated'); return;
  }
  const x = { id: uid('u'), ...data }; S.users.push(x); logAdmin('User created', 'User', x.id, { next: roleLabel(x), note: x.name + ' · ' + x.email }); save(); UI.udraft = null; go('user', { id: x.id }); toast('Invitation sent to ' + x.email);
}

/* Several tabs share one workspace: when another tab saves, this tab takes its data (its own sign-in,
   open page and unsaved form entries stay), so a later save here never overwrites the other tab's work. */
window.addEventListener('storage', e => {
  if (e.key !== STORE_KEY || !e.newValue) return;
  let s; try { s = JSON.parse(e.newValue); } catch (err) { return; }
  if (!s || s.version !== 8) return;
  const pid = S.personaId, signed = S.signedIn;
  S = linkModuleWorkflows(s); S.personaId = pid; S.signedIn = signed;
  if (UI.modal && UI.modal.id && UI.modal.kind && !objById(UI.modal.kind, UI.modal.id)) UI.modal = null;
  render();
});

/* Automatic sign-out after inactivity (Settings › Approval settings; 21 CFR Part 11 §11.300 session control).
   Activity in any tab counts: the last activity time is shared through localStorage. One minute before sign-out
   a warning appears; any activity keeps the session. The sign-out is recorded in the audit trail. */
const IDLE_KEY = 'saja-medlr-active';
let idleLast = Date.now(), idleWarned = false, idleBeat = 0;
function idleTouch() {
  idleLast = Date.now(); if (idleWarned) { idleWarned = false; const w = document.getElementById('idle-warn'); if (w) w.remove(); }
  if (idleLast - idleBeat > 5000) { idleBeat = idleLast; try { localStorage.setItem(IDLE_KEY, String(idleLast)); } catch (e) {} }
}
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => document.addEventListener(t, idleTouch, { passive: true, capture: true }));
window.addEventListener('storage', e => { if (e.key === IDLE_KEY && +e.newValue > idleLast) { idleLast = +e.newValue; idleTouch(); } });
function idleCheck() {
  const min = +S.settings.idleSignOutMin || 0; if (!S.signedIn || !min) return;
  const shared = +(localStorage.getItem(IDLE_KEY) || 0); if (shared > idleLast) idleLast = shared;
  const left = idleLast + min * 60000 - Date.now();
  if (left <= 0) { const w = document.getElementById('idle-warn'); if (w) w.remove(); idleWarned = false; log('Signed out automatically', 'User', me(), 1, { note: 'No activity for ' + min + ' min' }); S.signedIn = false; save(); UI.modal = null; UI.draft = null; UI.udraft = null; UI.after = { name: UI.route.name, p: UI.route.p }; go('login'); UI.f.loginErr = 'You were signed out after ' + min + ' minutes without activity. Sign in to continue.'; render(); return; }
  if (left <= 60000 && !idleWarned) { idleWarned = true; const box = document.getElementById('toasts'); const t = document.createElement('div'); t.id = 'idle-warn'; t.className = 'toast err'; t.setAttribute('role', 'alert'); t.innerHTML = icon('clock', 'sm') + '<span>You will be signed out in 1 minute because of inactivity. Move the mouse or press a key to stay signed in.</span>'; box.appendChild(t); }
}
setInterval(idleCheck, 15000);

// Open the page named in the URL (deep link, bookmark or refresh); signed out, open it after sign-in.
(function initRoute() {
  const t = parseHash(location.hash);
  if (t && t.name !== 'login' && t.name !== 'forgot') { if (S.signedIn) UI.route = t; else UI.after = t; }
  syncHash(true);
})();
render();

/* ---------- Drag and drop: modules → asset canvas, block reorder, workflow step reorder ---------- */
const DND = { src: null, idx: null };
function dndZone(ev) {
  if (!DND.src || !ev.target.closest) return null;
  if (DND.src.kind === 'step') return ev.target.closest('[data-drop="flow"]');
  const c = ev.target.closest('.canvas'); return ev.target.closest('[data-drop="sheet"]') || (c && c.querySelector('[data-drop="sheet"]'));
}
function dndClear() { document.querySelectorAll('.drop-before, .drop-after, .drop-over').forEach(e => e.classList.remove('drop-before', 'drop-after', 'drop-over')); }
document.addEventListener('dragstart', ev => {
  const el = ev.target.closest && ev.target.closest('[data-drag]'); if (!el) return;
  DND.src = { kind: el.dataset.drag, i: +el.dataset.i, module: el.dataset.module }; DND.idx = null;
  try { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', el.dataset.module || String(el.dataset.i)); } catch (e) {}
  requestAnimationFrame(() => el.classList.add('dragging'));
  document.body.classList.add('is-dragging', 'drag-' + DND.src.kind);
});
document.addEventListener('dragover', ev => {
  const zone = dndZone(ev); if (!zone) return;
  ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch (e) {}
  const items = [...zone.querySelectorAll(DND.src.kind === 'step' ? '.flow-node' : '.block')];
  let idx = items.length; for (let k = 0; k < items.length; k++) { const r = items[k].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { idx = k; break; } }
  if (idx === DND.idx && zone.classList.contains('drop-over')) return;
  dndClear(); DND.idx = idx; zone.classList.add('drop-over');
  if (items.length) { if (idx < items.length) items[idx].classList.add('drop-before'); else items[items.length - 1].classList.add('drop-after'); }
});
document.addEventListener('dragleave', ev => { const zone = dndZone(ev); const box = zone && (zone.closest('.canvas') || zone); if (box && !box.contains(ev.relatedTarget)) { dndClear(); DND.idx = null; } });
document.addEventListener('drop', ev => {
  const zone = dndZone(ev); if (!zone || DND.idx == null) return; ev.preventDefault();
  const src = DND.src; let to = DND.idx; dndClear();
  if (src.kind === 'step') {
    const st = UI.wfDraft.steps; const [x] = st.splice(src.i, 1); if (src.i < to) to--; st.splice(to, 0, x); UI.wfSel = to;
    if (src.i !== to) toast('Step moved to position ' + (to + 1));
  } else {
    const a = assetById(zone.dataset.id); if (!a || !canEditObj(me(), a)) return;
    if (src.kind === 'mod') {
      const m = modById(src.module); if (!m || !live(m) || a.blocks.some(b => b.moduleId === m.id) || !eligibility(m, a).ok) return;
      a.blocks.splice(to, 0, { id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); log('Module reused', 'Asset', a, null, { note: m.id + ' v' + live(m).v + ' added' }); toast('Added ' + m.type + ' · ' + m.id + ' v' + live(m).v);
    } else { const [x] = a.blocks.splice(src.i, 1); if (src.i < to) to--; a.blocks.splice(to, 0, x); }
    save();
  }
  render();
});
document.addEventListener('dragend', () => { DND.src = null; DND.idx = null; dndClear(); document.body.classList.remove('is-dragging', 'drag-mod', 'drag-blk', 'drag-step'); document.querySelectorAll('.dragging').forEach(e => e.classList.remove('dragging')); });
