/* ---------- Controller: routing, modals, actions ---------- */
const ROUTES = { home: viewHome, approvals: viewApprovals, modules: viewModules, module: viewModule, 'module-new': viewModuleForm, 'module-edit': viewModuleForm, review: viewReview, library: viewLibrary, assets: viewAssets, assemble: viewAssemble, asset: viewAsset, 'asset-review': viewAssetReview, cover: viewCover, lifecycle: viewLifecycle, audit: viewAudit, reports: viewReports, users: viewUsers, user: viewUser, 'user-new': viewUserForm, 'user-edit': viewUserForm, teams: viewTeams, roles: viewRoles, products: viewProducts, markets: viewMarkets, materials: viewMaterials, sops: viewSops, settings: viewSettings, workflows: viewWorkflows, workflow: viewWorkflow, 'workflow-new': viewWorkflowNew };
const app = document.getElementById('app');

function go(name, p = {}) {
  if (name === 'login' || name === 'forgot') { UI.f.resetSent = null; UI.f.forgotErr = null; UI.f.loginErr = null; }
  if ((name === 'module-edit' || name === 'module-new') && (UI.route.name !== name || UI.route.p.id !== p.id)) UI.draft = null;
  if (name === 'user-new' || name === 'user-edit') UI.udraft = null;
  if (name !== 'workflow') UI.wfDraft = null;
  if (name === 'workflow-new' && UI.route.name !== 'workflow-new') UI.nwf = null;
  if (name !== 'settings') UI.setDraft = null;
  UI.route = { name, p }; UI.pop = null; UI.search = ''; UI.f.rvc = '';
  save(); render(); window.scrollTo(0, 0);
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
    const u = me(); const perm = ROUTE_PERM[r];
    const inner = perm && !can(u, perm) ? `<div class="empty"><h4>You do not have access to this page</h4><p>Your role (${esc(roleLabel(u))}) does not include the “${esc((PERMS.find(p => p[0] === perm) || [perm, perm])[1])}” permission. Ask an administrator if you need it.</p><br>${goBtn('Go home', 'home', null, 'primary')}</div>` : (ROUTES[r] || viewHome)();
    html = viewShell(inner);
  }
  html += UI.modal ? viewModal() : '';
  app.innerHTML = html;
  paginateTables();
  const rk = UI.route.name + JSON.stringify(UI.route.p || {}) + (S.signedIn ? 1 : 0);
  if (rk !== UI._rk) { UI._rk = rk; const c = document.getElementById('content'); if (c) { c.classList.add('enter'); countUp(c); } }
  app.querySelectorAll('table.tbl').forEach(t => { const hs = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim()); t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (hs[i]) td.setAttribute('data-label', hs[i]); })); });
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) {} } }
}

function countUp(root) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.kpi b, .sb-legend b').forEach(el => {
    const m = /^(\d+)(%?)$/.exec(el.textContent.trim()); if (!m) return; const to = +m[1]; if (to < 2) return;
    const t0 = performance.now(), dur = 650; const tick = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + m[2]; if (k < 1) requestAnimationFrame(tick); };
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
function toast(text) {
  const box = document.getElementById('toasts'); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = icon('check', 'sm') + '<span>' + esc(text) + '</span>'; box.appendChild(t); while (box.children.length > 2) box.firstChild.remove(); setTimeout(() => t.remove(), 3600);
}

/* ===== Modals ===== */
const modalShell = (icoName, tone, title, sub, body, foot, wide) => `<div class="scrim" data-act="modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="modal-head"><div class="m-ico ${tone}">${icon(icoName)}</div><div style="flex:1;min-width:0"><h2 id="m-title">${title}</h2>${sub ? `<p class="ink2" style="margin-top:4px">${sub}</p>` : ''}</div><button class="btn icon sm" data-act="modal-close" aria-label="Close">${icon('x', 'sm')}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div></div>`;
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
    return modalShell('workflow', '', esc(w.name), esc(w.desc), `${flowPreview(w.steps, w.system ? 'Asset submitted' : 'Submitted', w.system ? 'Asset approved' : 'Approved')}
      <div class="wf" style="margin-top:6px">${w.steps.map((s, i) => { if (isNotify(s)) return `<div class="wf-step notify"><div class="wf-dot">${icon('mail', 'sm')}</div><div><div class="t">${fnBadge('Email', 'sm')}Email notification</div><div class="s">To ${esc(notifyTo(s).join(', ') || 'no one')} · “${esc(s.subject || '')}”</div></div></div>`; const who = assigneeFor(s); return `<div class="wf-step"><div class="wf-dot">${reviewPos(w, i)}</div><div><div class="t">${fnBadge(s.fn, 'sm')}${esc(s.fn)} <span class="muted">·</span> ${s.req === 'approve' ? 'Approval' : 'Review'} ${lvl(s.level)}</div><div class="s">${esc((team(s.fn) || {}).name || s.fn)} · ${who.length ? esc(who.map(x => x.name).join(', ')) : 'No active ' + esc(stepWho(s))}</div></div></div>`; }).join('')}</div>`,
      `${btn('Close', 'modal-close')}${can(u, 'manage_workflows') ? `<button class="btn primary" data-act="wf-open" data-id="${w.id}">${icon('edit', 'sm')}Open in builder</button>` : ''}`, true);
  }
  if (M.type === 'version') {
    const obj = objById(M.kind, M.id); const v = verOf(obj, +M.v);
    return modalShell('history', '', `Version ${v.v} · approval history`, `${esc(nameOf(obj))} · <span class="mono">${obj.id}</span>`, versionModalBody(obj, M.kind, v), `${v.approvedAt ? goBtn('Cover letter', 'cover', obj.id, '', 'award', ` data-k="${M.kind}" data-v="${v.v}"`) : ''}${btn('Close', 'modal-close', 'primary')}`, true);
  }
  if (M.type === 'submit') {
    const m = modById(M.id); const l = latest(m); const issues = validationIssues(m, 'Module');
    if (!canSubmit(u)) return modalShell('send', '', 'Send to Content Team Lead', 'Content Team Members prepare drafts. A Content Team Lead checks and submits them for MLR review.', objCard(m, 'Module') + (issues.length ? issuesBlock(issues) : ''), `${btn('Cancel', 'modal-close')}${btn('Send to Team Lead', 'submit-confirm', 'primary', `data-id="${m.id}" ${issues.length ? 'disabled' : ''}`, 'send')}`);
    const wfs = S.workflows.filter(w => !w.system && !w.hidden && w.active !== false); const chosen = M.wf || wfs[0].id; const reapp = l.v > 1 && !!live(m);
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
      return: ['back', 'warn', 'Return to Team Member', `The item goes back to the ${esc(st.fn)} Team Member step${j >= 0 && assigneeFor(wfById(obj.review.wf).steps[j]).length ? ' (' + esc(assigneeFor(wfById(obj.review.wf).steps[j]).map(x => x.name).join(', ')) + ')' : ''}. It stays inside the review — the Material Owner is not involved.`, 'What should the Team Member look at?', true, 'primary', ''],
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
      `<div class="fgrid"><div class="field"><label for="an-type">Material type</label><select class="select" id="an-type" data-an="type">${S.materialTypes.map(t => opt(t.name, D.type)).join('')}</select></div>
      <div class="field"><label for="an-name">Asset name</label><input class="input ${M.err === 'name' ? 'invalid' : ''}" id="an-name" data-an="name" value="${esc(D.name)}">${M.err === 'name' ? '<span class="err">Give the asset a name.</span>' : ''}</div></div>
      <div class="field"><span class="label">Products</span>${multi('an-toggle', 'products', S.products.filter(p => p.status === 'Active').map(p => [p.id, p.name + ' · ' + p.area]), D.products)}${M.err === 'products' ? '<span class="err">Select at least one product.</span>' : ''}</div>
      <div class="field"><span class="label">Countries</span>${multi('an-toggle', 'markets', S.markets.filter(x => x.active).map(x => [x.id, x.name]), D.markets)}${M.err === 'markets' ? '<span class="err">Select at least one country.</span>' : ''}</div>
      <div class="fgrid"><div class="field"><label for="an-ch">Channel</label><select class="select" id="an-ch" data-an="channel">${S.channels.map(c => opt(c, D.channel)).join('')}</select></div>
      <div class="field"><label for="an-aud">Audience</label><select class="select" id="an-aud" data-an="audience">${S.audiences.map(c => opt(c, D.audience)).join('')}</select></div></div>
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
    if (!canSubmit(u)) return modalShell('send', '', 'Send to Marketing Team Lead', 'Marketing Team Members assemble assets. A Marketing Team Lead submits them for review.', objCard(a, 'Asset') + problems, `${btn('Cancel', 'modal-close')}${btn('Send to Team Lead', 'asset-submit-confirm', 'primary', `data-id="${a.id}" ${blocked ? 'disabled' : ''}`, 'send')}`);
    return modalShell(blocked ? 'alert' : V.nNew ? 'alert' : 'shieldcheck', blocked ? 'bad' : V.nNew ? 'warn' : '', blocked ? 'Fix before submitting' : V.nNew ? 'New content detected' : 'Ready for streamlined review', blocked ? 'The asset fails one or more checks.' : V.nNew ? 'This asset contains text that is not an approved module and requires full MLR review.' : 'Every block is an approved module eligible for these countries and this channel.',
      objCard(a, 'Asset') + (blocked ? problems : `${V.nNew ? `<div class="stack" style="gap:8px">${a.blocks.filter(b => b.kind === 'new').map(b => `<div class="block new" style="margin:0"><div class="meta">${icon('edit', 'sm')}New content · ${esc(b.label || 'Text')}</div><div class="txt">${esc(b.text)}</div></div>`).join('')}</div>` : ''}<div class="banner ok">${icon('check')}<div class="txt"><b>All checks pass</b><p>${V.mods.length} eligible approved module${V.mods.length === 1 ? '' : 's'} · ${validate(a, 'Asset').length} Validation SOPs passed</p></div></div><div class="row"><span class="label" style="margin:0">Route</span><b>${esc(wf.name)}</b></div>${wfVisual(wf)}`),
      `${btn(blocked ? 'Back to assembly' : 'Keep editing', 'modal-close')}${btn('Submit for review', 'asset-submit-confirm', 'primary', `data-id="${a.id}" ${blocked ? 'disabled' : ''}`, 'send')}`, true);
  }
  if (M.type === 'simple') {
    return modalShell(M.ico || 'plus', '', M.title, M.sub || '', M.fields.map(f => `<div class="field"><label for="sf-${f[0]}">${f[1]}</label>${f[2] === 'select' ? `<select class="select" id="sf-${f[0]}">${f[3].map(o => Array.isArray(o) ? opt(o[0], f[4] || '', o[1]) : opt(o, f[4] || '')).join('')}</select>` : `<input class="input ${M.err === f[0] ? 'invalid' : ''}" id="sf-${f[0]}" placeholder="${esc(f[3] || '')}" value="${esc(f[4] || '')}">`}</div>`).join('') + (M.err ? '<span class="err">Fill in the required fields (codes must be unique).</span>' : ''), `${btn('Cancel', 'modal-close')}${btn(M.cta || 'Add', 'simple-confirm', 'primary', '', 'check')}`);
  }
  if (M.type === 'sop') {
    const D = M.d;
    return modalShell('clipboard', '', M.id ? 'Edit Validation SOP' : 'New Validation SOP', 'Checked before submission and before approval for every item in scope.',
      `<div class="field"><label for="sop-name">Name</label><input class="input ${M.err ? 'invalid' : ''}" id="sop-name" data-sop="name" value="${esc(D.name)}" placeholder="e.g. Local disclaimer — Saudi Arabia">${M.err ? '<span class="err">Give the SOP a name.</span>' : ''}</div>
      <div class="fgrid"><div class="field"><label for="sop-rule">Requirement</label><select class="select" id="sop-rule" data-sop="rule">${Object.entries(SOP_RULES).map(([k, l]) => opt(k, D.rule, l)).join('')}</select></div>
      <div class="field"><label for="sop-app">Applies to</label><select class="select" id="sop-app" data-sop="appliesTo">${[['Both', 'Modules & assets'], ['Module', 'Modules'], ['Asset', 'Assets']].map(o => opt(o[0], D.appliesTo, o[1])).join('')}</select></div></div>
      ${D.rule === 'review_window' ? `<div class="field"><label for="sop-m">Maximum months to review date</label><input class="input" id="sop-m" type="number" min="1" data-sop="months" value="${esc(D.months || 12)}"></div>` : ''}
      <div class="field"><span class="label">Content types <span class="muted">(none = all)</span></span>${multi('sop-toggle', 'types', [...S.moduleTypes, ...S.materialTypes.map(t => t.name)].map(t => [t, t]), D.types)}</div>
      <div class="field"><span class="label">Products <span class="muted">(none = all)</span></span>${multi('sop-toggle', 'products', S.products.map(p => [p.id, p.name]), D.products)}</div>
      <div class="field"><span class="label">Countries <span class="muted">(none = all)</span></span>${multi('sop-toggle', 'markets', S.markets.map(m => [m.id, m.name]), D.markets)}</div>
      <div class="field"><label for="sop-g">Guidance shown when it fails</label><textarea class="textarea" id="sop-g" rows="2" data-sop="guidance">${esc(D.guidance)}</textarea></div>`,
      `${btn('Cancel', 'modal-close')}${btn(M.id ? 'Save SOP' : 'Create SOP', 'sop-save', 'primary', '', 'check')}`, true);
  }
  if (M.type === 'confirm-reset') {
    return modalShell('alert', 'bad', 'Restore the initial workspace?', 'All modules, assets, users, workflows, SOPs, settings and the audit trail return to their initial state. This cannot be undone.', `<div class="field"><label for="m-confirm">Type RESTORE to confirm</label><input class="input ${M.err ? 'invalid' : ''}" id="m-confirm" autocomplete="off">${M.err ? '<span class="err">Type RESTORE in capitals.</span>' : ''}</div>`, `${btn('Cancel', 'modal-close')}${btn('Restore workspace', 'reset-confirm', 'danger', '', 'undo')}`);
  }
  return '';
}

/* ===== Helpers for actions ===== */
function nextModuleId(products) { const L = products.length > 1 ? 'X' : (products[0] || 'P-A').slice(-1); const pre = 'MOD-' + L + '-'; const n = Math.max(0, ...S.modules.filter(m => m.id.startsWith(pre)).map(m => +m.id.slice(pre.length))) + 1; return pre + String(n).padStart(3, '0'); }
function nextAssetId() { return 'AST-' + (Math.max(100, ...S.assets.map(a => +a.id.slice(4))) + 1); }
const curAsset = () => assetById(UI.route.p.id);
const trunc = (s, n = 90) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
function logAdmin(action, objType, id, extra) { log(action, objType, { id }, 1, extra); }
function afterDecision(obj, kind, r) {
  UI.modal = null; UI.f.rvc = '';
  if (r.done) { UI.modal = { type: 'success', kind, id: obj.id }; go(kind === 'Asset' ? 'asset' : 'module', { id: obj.id }); return; }
  go('approvals'); toast(r.msg);
}
function newVersion(obj, kind, reason) {
  const l = latest(obj); const nv = l.v + 1;
  if (kind === 'Asset') l.blocks = JSON.parse(JSON.stringify(obj.blocks));
  obj.versions.push({ v: nv, body: kind === 'Asset' ? '' : l.body, refs: kind === 'Asset' ? [] : [...l.refs], createdAt: Date.now(), createdBy: me().id, reason, status: 'Draft', cycles: [], approvedAt: null, approvedBy: null });
  obj.resume = null; obj.review = null; obj.updatedAt = Date.now();
  log('Version created', kind, obj, nv, { prev: 'v' + l.v + ' ' + l.status, next: 'v' + nv + ' Draft', note: reason });
  return nv;
}

const ACT = {
  pop: el => { UI.pop = UI.pop === el.dataset.pop ? null : el.dataset.pop; if (UI.pop === 'bell') S.notifSeen = Date.now(); render(); },
  logout: () => { log('Signed out', 'User', me(), 1); S.signedIn = false; save(); UI.modal = null; go('login'); },
  'modal-close': () => { UI.modal = null; render(); },
  'modal-bg': (el, ev) => { if (ev.target === el) { UI.modal = null; render(); } },
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
  'd-type': el => { UI.draft.type = el.dataset.v; render(); },
  'd-toggle': el => { const D = UI.draft; const arr = D[el.dataset.k]; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v);
    if (el.dataset.k === 'products') { const ok = uniq(S.products.filter(p => D.products.includes(p.id)).flatMap(p => p.indications)); D.indications = D.indications.filter(x => ok.includes(x)); }
    render(); },
  'd-unref': el => { UI.draft.refs = UI.draft.refs.filter(r => r !== el.dataset.v); render(); },
  'd-newref': () => { const t = (UI.draft.newRefTitle || '').trim(); if (!t) { toast('Type a reference title first'); return; } const pfx = UI.draft.products.length === 1 ? UI.draft.products[0].slice(-1) : 'X'; const id = 'REF-' + pfx + '-' + String(S.references.length + 1).padStart(2, '0'); S.references.push({ id, kind: 'study', title: t, source: 'Added by ' + me().name + ', ' + fmtD(Date.now()) }); UI.draft.refs.push(id); UI.draft.newRefTitle = ''; save(); render(); },

  /* submission */
  'submit-open': el => { const m = modById(el.dataset.id); const l = latest(m); UI.modal = { type: 'submit', id: m.id, wf: l.v > 1 && live(m) ? S.settings.newVersionWorkflow : S.settings.defaultModuleWorkflow }; render(); },
  'submit-wf': el => { UI.modal.wf = el.dataset.v; render(); },
  'submit-confirm': el => {
    const m = modById(el.dataset.id); const u = me(); if (validationIssues(m, 'Module').length) return;
    if (!canSubmit(u)) { setStatus(m, 'Awaiting Lead submission'); m.updatedAt = Date.now(); log('Sent to Content Team Lead', 'Module', m, null, { prev: 'Draft', next: 'Awaiting Lead submission' }); UI.modal = null; save(); render(); toast('Sent to the Content Team Lead for submission'); return; }
    const mailed = startCycle(m, 'Module', UI.modal.wf || S.settings.defaultModuleWorkflow); save(); const st = curStep(m); UI.modal = null; render();
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
    const mod = el.dataset.module ? modById(el.dataset.module) : null; const t = S.materialTypes[0];
    UI.modal = { type: 'asset-new', module: mod ? mod.id : null, d: { type: t.name, name: t.name + ' — ' + (mod ? mod.title.split('—')[0].trim() : 'New material'), products: mod ? [...mod.products] : ['P-A'], markets: mod ? [mod.markets[0]] : ['SA'], channel: t.channel, audience: mod ? mod.audience : S.audiences[0] } };
    UI.pop = null; render();
  },
  'an-toggle': el => { const arr = UI.modal.d[el.dataset.k]; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v); render(); },
  'asset-create': () => {
    const M = UI.modal; const D = M.d; const nm = document.getElementById('an-name'); if (nm) D.name = nm.value;
    if (!D.name.trim()) { M.err = 'name'; render(); return; } if (!D.products.length) { M.err = 'products'; render(); return; } if (!D.markets.length) { M.err = 'markets'; render(); return; }
    const now = Date.now();
    const a = { id: nextAssetId(), name: D.name.trim(), type: D.type, products: [...D.products], markets: [...D.markets], channel: D.channel, audience: D.audience, owner: me().id, disclaimer: '', blocks: [], versions: [{ v: 1, body: '', refs: [], createdAt: now, createdBy: me().id, reason: 'Initial version', status: 'Draft', cycles: [], approvedAt: null, approvedBy: null }], createdAt: now, updatedAt: now, review: null, resume: null };
    log('Asset created', 'Asset', a, 1, { next: 'Draft', note: D.type });
    if (M.module) { const m = modById(M.module); if (eligibility(m, a).ok) { a.blocks.push({ id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); log('Module reused', 'Asset', a, 1, { note: m.id + ' v' + live(m).v + ' added' }); } }
    S.assets.push(a); UI.modal = null; save(); go('assemble', { id: a.id }); toast('Asset created — add approved modules from the left');
  },
  'a-toggle': el => { const a = assetById(el.dataset.id); const k = el.dataset.k; const prev = [...a[k]]; const i = a[k].indexOf(el.dataset.v); i >= 0 ? a[k].splice(i, 1) : a[k].push(el.dataset.v);
    log(k === 'products' ? 'Product changed' : 'Country changed', 'Asset', a, null, { prev: k === 'products' ? productsTxt(prev) : prev.join(', '), next: k === 'products' ? productsTxt(a[k]) : a[k].join(', ') }); a.updatedAt = Date.now(); save(); render(); },
  'blk-add': el => { const a = assetById(el.dataset.id); const m = modById(el.dataset.module); if (a.blocks.some(b => b.moduleId === m.id)) return; a.blocks.push({ id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); log('Module reused', 'Asset', a, null, { note: m.id + ' v' + live(m).v + ' added' }); a.updatedAt = Date.now(); save(); render(); toast('Added ' + m.type + ' · ' + m.id + ' v' + live(m).v); },
  'blk-move': el => { const a = curAsset(); const i = +el.dataset.i, j = i + +el.dataset.dir; if (j < 0 || j >= a.blocks.length) return; [a.blocks[i], a.blocks[j]] = [a.blocks[j], a.blocks[i]]; save(); render(); },
  'blk-del': el => { const a = curAsset(); const [b] = a.blocks.splice(+el.dataset.i, 1); log('Asset updated', 'Asset', a, null, { note: 'Removed ' + (b.kind === 'module' ? b.moduleId + ' v' + b.v : 'new text block'), prev: b.kind === 'module' ? b.moduleId : trunc(b.text, 40) }); a.updatedAt = Date.now(); save(); render(); },
  'new-text': el => { UI.modal = { type: 'new-text', id: el.dataset.id }; render(); setTimeout(() => { const t = document.getElementById('nt-text'); t && t.focus(); }, 30); },
  'new-text-confirm': el => { const t = document.getElementById('nt-text').value.trim(); const lbl = document.getElementById('nt-label').value; if (!t) { UI.modal.err = true; UI.modal.label = lbl; render(); return; } const a = assetById(el.dataset.id); a.blocks.push({ id: uid('b'), kind: 'new', text: t, label: lbl }); log('Asset updated', 'Asset', a, null, { note: 'New content added (' + lbl + ')', next: trunc(t, 60) }); UI.modal = null; save(); render(); toast('New content added — the asset now needs full MLR review'); },
  'asset-save': el => { const a = assetById(el.dataset.id); a.updatedAt = Date.now(); log('Asset updated', 'Asset', a, null, { note: 'Draft saved' }); save(); toast('Draft saved'); },
  'asset-submit': el => { UI.modal = { type: 'asset-submit', id: el.dataset.id }; render(); },
  'asset-submit-confirm': el => {
    const a = assetById(el.dataset.id); const u = me(); const V = assetValidation(a); if (V.empty || V.bad.length || V.sops.length) return;
    if (!canSubmit(u)) { setStatus(a, 'Awaiting Lead submission'); log('Sent to Marketing Team Lead', 'Asset', a, null, { prev: 'Draft', next: 'Awaiting Lead submission' }); UI.modal = null; save(); go('asset', { id: a.id }); toast('Sent to the Marketing Team Lead'); return; }
    startCycle(a, 'Asset', assetWorkflow(a)); UI.modal = null; save(); go('asset', { id: a.id }); const st = curStep(a); toast('Submitted · now with ' + stepWho(st));
  },
  'asset-version': el => { UI.modal = { type: 'asset-version', id: el.dataset.id }; render(); setTimeout(() => { const t = document.getElementById('m-note'); t && t.focus(); }, 30); },
  'asset-version-confirm': () => { const M = UI.modal; const note = document.getElementById('m-note').value.trim(); if (note.length < 5) { M.err = true; M.note = note; render(); return; } const a = assetById(M.id); const nv = newVersion(a, 'Asset', note); a.blocks.forEach(b => { if (b.kind === 'new') b.approved = false; }); UI.modal = null; save(); go('assemble', { id: a.id }); toast('Version ' + nv + ' created'); },
  'replace-version': el => { const a = assetById(el.dataset.asset); const m = modById(el.dataset.module); const b = a.blocks.find(x => x.moduleId === m.id); const from = b.v; b.v = live(m).v; log('Asset updated', 'Asset', a, null, { note: 'Module version replaced · ' + m.id, prev: m.id + ' v' + from, next: m.id + ' v' + b.v }); save(); render(); toast(a.name + ' now uses ' + m.id + ' v' + b.v); },

  /* audit */
  'audit-user': el => { Object.assign(UI.f, { uuser: el.dataset.id, uq: '', ucat: '', uobj: '' }); go('audit'); },
  'audit-export': () => {
    const rows = auditRows().sort((a, b) => b.ts - a.ts); const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = [['Date', 'Time', 'User', 'Role', 'Action', 'Object type', 'Object ID', 'Object', 'Version', 'Products', 'Countries', 'Previous value', 'New value', 'Note'].map(q).join(','), ...rows.map(e => [fmtD(e.ts), fmtT(e.ts), user(e.user).name, e.role, e.action, e.objType, e.objId, objName(e), e.version, productsTxt(e.products), (e.markets || []).join(' '), e.prev, e.next, e.note].map(q).join(','))].join('\n');
    const filename = 'saja-medlr-audit-' + toISO(Date.now()) + '.csv';
    // Inside the claude.ai viewer, files go through the downloads capability; elsewhere a normal browser download.
    if (window.claude && typeof window.claude.use === 'function') {
      window.claude.use('downloads').then(dl => {
        if (!dl) { toast('Export is not available in this view'); return; }
        dl.save({ filename, data: csv }).then(() => toast('Exported ' + rows.length + ' audit events'), e => { if (e && e.code !== 'declined') toast('Export is not available in this view'); });
      });
      return;
    }
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); toast('Exported ' + rows.length + ' audit events'); } catch (e) { toast('Export is not available in this browser'); }
  },

  /* users and roles */
  'u-fn': el => { const D = UI.udraft; D.fn = el.dataset.v; const t = S.teams.find(x => x.id === D.team); if (!t || t.fn !== D.fn) { const first = S.teams.find(x => x.fn === D.fn); D.team = first ? first.id : ''; } render(); },
  'u-level': el => { UI.udraft.level = el.dataset.v; render(); },
  'u-status': el => { UI.udraft.status = el.dataset.v; render(); },
  'user-status': el => { const x = S.users.find(u => u.id === el.dataset.id); if (x.id === me().id) { toast('You cannot deactivate your own account'); return; } const prev = x.status; x.status = x.status === 'Active' ? 'Inactive' : 'Active'; logAdmin(x.status === 'Active' ? 'User activated' : 'User deactivated', 'User', x.id, { prev, next: x.status, note: x.name }); save(); render(); toast(x.name + ' is now ' + x.status.toLowerCase()); },
  'perm-toggle': el => { const r = el.dataset.role, p = el.dataset.perm; const list = S.roles[r] || (S.roles[r] = []); const i = list.indexOf(p); const label = PERMS.find(x => x[0] === p)[1]; i >= 0 ? list.splice(i, 1) : list.push(p); logAdmin(i >= 0 ? 'Permission revoked' : 'Permission granted', 'Role', r, { note: roleName(r) + ' · ' + label, prev: i >= 0 ? 'Granted' : 'Not granted', next: i >= 0 ? 'Not granted' : 'Granted' }); save(); render(); toast(label + (i >= 0 ? ' removed from ' : ' granted to ') + roleName(r)); },
  'roles-reset': () => { S.roles = DEFAULT_ROLES(); logAdmin('Permissions restored to defaults', 'Role', 'All roles', {}); save(); render(); toast('Role permissions restored to defaults'); },
  'team-new': () => { UI.modal = { type: 'simple', kind: 'team', title: 'Add team', fields: [['name', 'Team name', 'text', 'e.g. Medical Affairs — Respiratory'], ['fn', 'Function', 'select', [...FUNCS, 'Administrator']]] }; render(); },
  'team-edit': el => { const t = S.teams.find(x => x.id === el.dataset.id); UI.modal = { type: 'simple', kind: 'team-edit', id: t.id, title: 'Rename team', cta: 'Save', ico: 'edit', fields: [['name', 'Team name', 'text', '', t.name]] }; render(); },
  'product-new': () => { UI.modal = { type: 'simple', kind: 'product', title: 'Add product', fields: [['name', 'Product name', 'text', 'e.g. Product D'], ['area', 'Therapy area', 'text', 'e.g. Oncology'], ['ind', 'Indications (comma separated)', 'text', 'e.g. Breast cancer']] }; render(); },
  'market-new': () => { UI.modal = { type: 'simple', kind: 'market', title: 'Add country', fields: [['name', 'Country', 'text', 'e.g. Qatar'], ['code', 'Code', 'text', 'e.g. QA'], ['auth', 'Health authority', 'text', 'e.g. MOPH Qatar'], ['lang', 'Languages', 'text', 'e.g. Arabic, English']] }; render(); },
  'material-new': () => { UI.modal = { type: 'simple', kind: 'material', title: 'Add material type', fields: [['name', 'Material type', 'text', 'e.g. Congress poster'], ['channel', 'Channel', 'select', S.channels], ['wf', 'Workflow', 'select', S.workflows.filter(w => !w.hidden).map(w => [w.id, w.name])]] }; render(); },
  'simple-confirm': () => {
    const M = UI.modal; const v = k => { const e = document.getElementById('sf-' + k); return e ? e.value.trim() : ''; };
    const miss = M.fields.filter(f => f[2] !== 'select').map(f => f[0]).find(k => !v(k)); if (miss) { M.err = miss; render(); return; }
    if (M.kind === 'team') { const t = { id: uid('T'), name: v('name'), fn: v('fn') }; S.teams.push(t); logAdmin('Team created', 'Team', t.id, { next: t.name, note: t.fn }); toast('Team added'); }
    if (M.kind === 'team-edit') { const t = S.teams.find(x => x.id === M.id); logAdmin('Team renamed', 'Team', t.id, { prev: t.name, next: v('name') }); t.name = v('name'); toast('Team renamed'); }
    if (M.kind === 'product') { const id = 'P-' + v('name').replace(/^product\s*/i, '').slice(0, 3).toUpperCase(); const p = { id: S.products.some(x => x.id === id) ? uid('P') : id, name: v('name'), area: v('area'), indications: v('ind').split(',').map(x => x.trim()).filter(Boolean), status: 'Active' }; S.products.push(p); logAdmin('Product created', 'Product', p.id, { next: p.name, note: p.area }); toast('Product added'); }
    if (M.kind === 'market') { const code = v('code').toUpperCase().slice(0, 3); if (S.markets.some(x => x.id === code)) { M.err = 'code'; render(); return; } S.markets.push({ id: code, name: v('name'), authority: v('auth'), lang: v('lang'), active: true }); logAdmin('Country created', 'Country', code, { next: v('name') }); toast('Country added'); }
    if (M.kind === 'material') { const t = { id: uid('MT'), name: v('name'), channel: v('channel'), workflow: v('wf') }; S.materialTypes.push(t); logAdmin('Material type created', 'Material type', t.id, { next: t.name }); toast('Material type added'); }
    UI.modal = null; save(); render();
  },
  'toggle-prod': el => { const p = S.products.find(x => x.id === el.dataset.id); const prev = p.status; p.status = p.status === 'Active' ? 'Inactive' : 'Active'; logAdmin('Product status changed', 'Product', p.id, { prev, next: p.status, note: p.name }); save(); render(); toast(p.name + ' ' + p.status.toLowerCase()); },
  'toggle-mkt': el => { const m = S.markets.find(x => x.id === el.dataset.id); m.active = !m.active; logAdmin('Country status changed', 'Country', m.id, { prev: m.active ? 'Inactive' : 'Active', next: m.active ? 'Active' : 'Inactive', note: m.name }); save(); render(); toast(m.name + (m.active ? ' activated' : ' deactivated')); },

  /* Validation SOPs */
  'sop-new': () => { UI.modal = { type: 'sop', d: { name: '', rule: 'reference', appliesTo: 'Module', types: [], products: [], markets: [], guidance: '', months: 12 } }; render(); },
  'sop-edit': el => { const s = S.sops.find(x => x.id === el.dataset.id); UI.modal = { type: 'sop', id: s.id, d: { name: s.name, rule: s.rule, appliesTo: s.appliesTo, types: [...(s.scope.types || [])], products: [...(s.scope.products || [])], markets: [...(s.scope.markets || [])], guidance: s.guidance, months: s.months || 12 } }; render(); },
  'sop-toggle': el => { const arr = UI.modal.d[el.dataset.k]; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v); render(); },
  'sop-save': () => {
    const M = UI.modal; const D = M.d; ['name', 'guidance'].forEach(k => { const e = document.querySelector(`[data-sop="${k}"]`); if (e) D[k] = e.value; });
    if (!D.name.trim()) { M.err = true; render(); return; }
    const data = { name: D.name.trim(), rule: D.rule, appliesTo: D.appliesTo, scope: { types: [...D.types], products: [...D.products], markets: [...D.markets] }, guidance: D.guidance.trim(), months: +D.months || 12 };
    if (M.id) { const s = S.sops.find(x => x.id === M.id); const prev = s.name + ' · ' + SOP_RULES[s.rule] + ' · ' + sopScopeTxt(s); Object.assign(s, data); logAdmin('SOP updated', 'SOP', s.id, { prev, next: s.name + ' · ' + SOP_RULES[s.rule] + ' · ' + sopScopeTxt(s) }); toast('SOP updated'); }
    else { const n = Math.max(0, ...S.sops.map(s => +s.id.slice(4))) + 1; const s = { id: 'SOP-' + String(n).padStart(2, '0'), ...data, active: true }; S.sops.push(s); logAdmin('SOP created', 'SOP', s.id, { next: s.name + ' · ' + SOP_RULES[s.rule] + ' · ' + sopScopeTxt(s) }); toast('SOP created — it now applies to new submissions and approvals'); }
    UI.modal = null; save(); render();
  },
  'sop-active': el => { const s = S.sops.find(x => x.id === el.dataset.id); s.active = !s.active; logAdmin(s.active ? 'SOP activated' : 'SOP deactivated', 'SOP', s.id, { prev: s.active ? 'Inactive' : 'Active', next: s.active ? 'Active' : 'Inactive', note: s.name }); save(); render(); },

  /* settings */
  'set-bool': el => { UI.setDraft[el.dataset.k] = !UI.setDraft[el.dataset.k]; render(); },
  'set-discard': () => { UI.setDraft = null; render(); },
  'set-save': () => {
    const D = UI.setDraft; let n = 0;
    SETTINGS.forEach(([, fields]) => fields.forEach(([k, label, type]) => { let val = D[k]; if (type === 'number') val = Math.max(1, Math.round(+val || 1)); if (String(val) !== String(S.settings[k])) { const show = x => type === 'bool' ? (x ? 'On' : 'Off') : type === 'wf' ? (wfById(x) || {}).name : String(x); logAdmin('Setting changed', 'Settings', 'settings', { note: label, prev: show(S.settings[k]), next: show(val) }); S.settings[k] = val; n++; } }));
    UI.setDraft = null; save(); render(); toast(n ? n + ' setting' + (n > 1 ? 's' : '') + ' saved' : 'No changes');
  },
  'reset-open': () => { UI.modal = { type: 'confirm-reset' }; render(); },
  'reset-confirm': () => { const v = document.getElementById('m-confirm').value.trim(); if (v !== 'RESTORE') { UI.modal.err = true; render(); return; } const pid = S.personaId; S = SEED(); S.signedIn = true; S.personaId = pid; UI.modal = null; UI.f = {}; UI.pg = {}; log('Workspace restored', 'Settings', { id: 'settings' }, 1, { note: 'Initial workspace restored' }); save(); go('home'); toast('Initial workspace restored'); },

  /* workflows */
  'wf-new': () => go('workflow-new'),
  'wf-view': el => { UI.modal = { type: 'wf-view', id: el.dataset.id }; render(); },
  'wf-open': el => { UI.modal = null; go('workflow', { id: el.dataset.id }); },
  'wf-add-mail': el => { const i = +el.dataset.i; UI.wfDraft.steps.splice(i, 0, notifyStep()); UI.wfSel = i; render(); toast('Email step added — choose who receives it'); },
  'wf-kind': el => { const st = UI.wfDraft.steps; const cur = st[UI.wfSel]; if (el.dataset.v === 'notify' && !isNotify(cur)) st[UI.wfSel] = notifyStep(); if (el.dataset.v === 'review' && isNotify(cur)) st[UI.wfSel] = { id: uid('s'), fn: 'Medical', level: 'Member', req: 'review' }; render(); },
  'wf-rcpt': el => { const s = UI.wfDraft.steps[UI.wfSel]; const r = s.recipients || (s.recipients = []); const k = r.indexOf(el.dataset.v); k < 0 ? r.push(el.dataset.v) : r.splice(k, 1); render(); },
  'nwf-rcpt': el => { const s = UI.nwf.steps[+el.dataset.i]; const r = s.recipients || (s.recipients = []); const k = r.indexOf(el.dataset.v); k < 0 ? r.push(el.dataset.v) : r.splice(k, 1); render(); },
  'nwf-use': el => { UI.nwf.use = el.dataset.v; render(); },
  'nwf-tpl': el => { const v = el.dataset.v, mk = (fn, level, req) => ({ id: uid('s'), fn, level, req }); UI.nwf.steps = v === 'std' ? REVIEW_FUNCS.flatMap(fn => [mk(fn, 'Member', 'review'), mk(fn, 'Lead', 'approve')]) : v === 'senior' ? REVIEW_FUNCS.map(fn => mk(fn, 'Lead', 'approve')) : []; render(); },
  'nwf-add': el => { UI.nwf.steps.push(el.dataset.v === 'Email' ? notifyStep() : { id: uid('s'), fn: el.dataset.v, level: 'Lead', req: 'approve' }); render(); toast(el.dataset.v === 'Email' ? 'Email step added — choose who receives it' : el.dataset.v + ' step added'); },
  'nwf-set': el => { const s = UI.nwf.steps[+el.dataset.i]; s[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'req' && el.dataset.v === 'approve') s.level = 'Lead'; if (el.dataset.k === 'level' && el.dataset.v === 'Member') s.req = 'review'; render(); },
  'nwf-move': el => { const st = UI.nwf.steps, i = +el.dataset.i, j = i + +el.dataset.dir; if (j < 0 || j >= st.length) return; [st[i], st[j]] = [st[j], st[i]]; render(); },
  'nwf-del': el => { UI.nwf.steps.splice(+el.dataset.i, 1); render(); },
  'wf-sel': el => { UI.wfSel = +el.dataset.i; render(); if (window.innerWidth < 1180) { const c = document.querySelector('.builder > .stack'); c && c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
  'wf-set': el => { const s = UI.wfDraft.steps[UI.wfSel]; s[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'req' && el.dataset.v === 'approve') s.level = 'Lead'; if (el.dataset.k === 'level' && el.dataset.v === 'Member') s.req = 'review'; render(); },
  'wf-add': el => { const i = +el.dataset.i; const ref = UI.wfDraft.steps[i - 1] || UI.wfDraft.steps[i]; UI.wfDraft.steps.splice(i, 0, { id: uid('s'), fn: ref && !isNotify(ref) ? ref.fn : 'Medical', level: 'Member', req: 'review' }); UI.wfSel = i; render(); toast('Step added — configure it on the right'); },
  'wf-del': () => { if (UI.wfDraft.steps.length <= 1) return; UI.wfDraft.steps.splice(UI.wfSel, 1); UI.wfSel = Math.max(0, UI.wfSel - 1); render(); },
  'wf-move': el => { const i = UI.wfSel, j = i + +el.dataset.dir; const st = UI.wfDraft.steps; if (j < 0 || j >= st.length) return; [st[i], st[j]] = [st[j], st[i]]; UI.wfSel = j; render(); },
  'wf-discard': () => { UI.wfDraft = null; render(); },
  'wf-save': () => {
    const D = UI.wfDraft; const w = wfById(D.id); if (wfIssues(D).some(x => x[0] === 'bad')) return;
    const inflight = [...S.modules, ...S.assets].filter(o => (o.review && o.review.wf === w.id) || (o.resume && o.resume.wf === w.id));
    if (inflight.length) { const n = S.workflows.filter(x => x.id.startsWith(w.id + '@')).length + 1; const old = JSON.parse(JSON.stringify(w)); old.id = w.id + '@' + n; old.hidden = true; S.workflows.push(old); inflight.forEach(o => { const c = curCycle(o); if (o.review && o.review.wf === w.id) o.review.wf = old.id; if (o.resume && o.resume.wf === w.id) o.resume.wf = old.id; if (c) c.wf = old.id; }); }
    const prev = w.steps.filter(s => !isNotify(s)).map(stepLabel).join(' → ');
    w.steps = JSON.parse(JSON.stringify(D.steps)); w.name = D.name; logAdmin('Workflow updated', 'Workflow', w.id, { prev, next: w.steps.filter(s => !isNotify(s)).map(stepLabel).join(' → '), note: inflight.length ? inflight.length + ' in-flight item(s) keep the previous route' : '' }); save(); UI.wfDraft = null; render(); toast('Workflow saved — applies to new submissions');
  }
};

/* ===== Event wiring ===== */
document.addEventListener('click', ev => {
  const actEl = ev.target.closest('[data-act]'); const goEl = ev.target.closest('[data-go]');
  if (UI.pop && !ev.target.closest('.pop') && !ev.target.closest('[data-pop]') && !ev.target.closest('.search')) { UI.pop = null; if (!actEl && !goEl) { render(); return; } }
  if (UI.search && !ev.target.closest('.search')) { UI.search = ''; if (!actEl && !goEl) { render(); return; } }
  if (actEl && (!goEl || actEl === goEl || goEl.contains(actEl))) {
    if (actEl.disabled) return;
    const fn = ACT[actEl.dataset.act]; if (fn) { if (actEl.dataset.act !== 'modal-bg') ev.preventDefault(); fn(actEl, ev); return; }
  }
  if (goEl) { ev.preventDefault(); const p = {}; ['id', 'tab', 'k', 'v'].forEach(k => { if (goEl.dataset[k]) p[k] = goEl.dataset[k]; }); if (goEl.dataset.go !== 'cover') { delete p.k; delete p.v; } UI.modal = null; go(goEl.dataset.go, p); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { if (UI.modal) { UI.modal = null; render(); } else if (UI.pop || UI.search) { UI.pop = null; UI.search = ''; render(); } }
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('tr.click')) ev.target.click();
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'global-search') { UI.search = t.value; render(); return; }
  if (t.id === 'rv-comment') { UI.f.rvc = t.value; return; }
  if (t.dataset.filter && t.tagName === 'INPUT') { UI.f[t.dataset.filter] = t.value; if (t.type === 'date') return; render(); return; }
  if (t.dataset.d && t.tagName !== 'SELECT') { UI.draft[t.dataset.d] = t.value; if (t.dataset.d === 'body' || t.dataset.d === 'title') renderSoon(); return; }
  if (t.dataset.u && t.tagName !== 'SELECT') { UI.udraft[t.dataset.u] = t.value; return; }
  if (t.dataset.w) { UI.nwf[t.dataset.w] = t.value; return; }
  if (t.dataset.wfn) { UI.wfDraft.steps[UI.wfSel][t.dataset.wfn] = t.value; renderSoon(); return; }
  if (t.dataset.nwfn) { UI.nwf.steps[+t.dataset.i][t.dataset.nwfn] = t.value; renderSoon(); return; }
  if (t.dataset.an && t.tagName !== 'SELECT') { UI.modal.d[t.dataset.an] = t.value; return; }
  if (t.dataset.sop && t.tagName !== 'SELECT') { UI.modal.d[t.dataset.sop] = t.value; return; }
  if (t.dataset.set && t.tagName === 'INPUT') { UI.setDraft[t.dataset.set] = t.value; renderSoon(); return; }
});
let rsT = null; function renderSoon() { clearTimeout(rsT); rsT = setTimeout(render, 300); }
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.filter) { UI.f[t.dataset.filter] = t.value; render(); return; }
  if (t.dataset.assetProp) {
    const a = assetById(t.dataset.id); const k = t.dataset.assetProp; const prev = a[k] || ''; if (prev === t.value) return; a[k] = t.value; a.updatedAt = Date.now();
    if (k === 'type') { const mt = S.materialTypes.find(x => x.name === t.value); if (mt && !a.blocks.length) a.channel = mt.channel; }
    log('Asset updated', 'Asset', a, null, { note: ({ name: 'Name', type: 'Material type', channel: 'Channel', audience: 'Audience', disclaimer: 'Local disclaimer' })[k] + ' changed', prev: trunc(prev, 60), next: trunc(t.value, 60) }); save(); render(); return;
  }
  const textual = (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'date' && t.type !== 'checkbox'));
  if (textual && (t.dataset.d || t.dataset.u || t.dataset.an || t.dataset.sop || t.dataset.set)) return;
  if (t.dataset.d) { UI.draft[t.dataset.d] = t.value; render(); return; }
  if (t.dataset.actChange === 'd-addref' && t.value) { UI.draft.refs.push(t.value); render(); return; }
  if (t.dataset.actChange === 'sign-att') { UI.modal.att = t.checked; UI.modal.err = null; render(); return; }
  if (t.dataset.u) { UI.udraft[t.dataset.u] = t.value; render(); return; }
  if (t.dataset.an) { const D = UI.modal.d; D[t.dataset.an] = t.value; if (t.dataset.an === 'type') { const mt = S.materialTypes.find(x => x.name === t.value); D.channel = mt.channel; D.name = t.value + ' — ' + (D.name.split('—')[1] || '').trim(); } render(); return; }
  if (t.dataset.sop) { UI.modal.d[t.dataset.sop] = t.value; render(); return; }
  if (t.dataset.set) { UI.setDraft[t.dataset.set] = t.value; render(); return; }
  if (t.dataset.mtWf) { const mt = S.materialTypes.find(x => x.id === t.dataset.mtWf); const prev = (wfById(mt.workflow) || {}).name; mt.workflow = t.value; logAdmin('Material type updated', 'Material type', mt.id, { note: mt.name + ' workflow', prev, next: wfById(t.value).name }); save(); render(); toast(mt.name + ' now uses ' + wfById(t.value).name); return; }
  if (t.dataset.w || t.dataset.wfn || t.dataset.nwfn) return;
  if (t.dataset.nwf) { UI.nwf.steps[+t.dataset.i][t.dataset.nwf] = t.value; render(); return; }
  if (t.dataset.wf) { UI.wfDraft.steps[UI.wfSel][t.dataset.wf] = t.value; render(); return; }
});
document.addEventListener('submit', ev => {
  ev.preventDefault(); const f = ev.target.dataset.form;
  if (f === 'login') {
    const email = ev.target.email.value.trim().toLowerCase(); UI.f.loginEmail = email; const x = S.users.find(u => u.email.toLowerCase() === email);
    if (!email || !ev.target.password.value) { UI.f.loginErr = 'Enter your email and password.'; render(); return; }
    if (!x) { UI.f.loginErr = 'No account uses that email address.'; render(); return; }
    if (x.status !== 'Active') { UI.f.loginErr = 'This account is inactive. Ask an administrator to reactivate it.'; render(); return; }
    S.personaId = x.id; S.signedIn = true; UI.f.loginErr = null; log('Signed in', 'User', x, 1); save(); go('home');
  }
  if (f === 'forgot') { const e = ev.target.email.value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { UI.f.forgotErr = 'Enter a valid email address.'; render(); return; } UI.f.forgotErr = null; UI.f.resetSent = e; render(); }
  if (f === 'module') saveModuleForm();
  if (f === 'user') saveUserForm();
  if (f === 'workflow') saveWorkflowForm();
});

function wizDraft(form) { return form === 'user' ? UI.udraft : form === 'workflow' ? UI.nwf : UI.draft; }
function wizSteps(form) { return form === 'user' ? USTEPS : form === 'workflow' ? WSTEPS : MSTEPS; }
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
  const add = D.refs.filter(r => !before.refs.includes(r)), rem = before.refs.filter(r => !D.refs.includes(r));
  if (!sameSet(before.products, D.products)) log('Product changed', 'Module', m, v, { prev: productsTxt(before.products), next: productsTxt(D.products) });
  if (!sameSet(before.markets, D.markets)) log('Country changed', 'Module', m, v, { prev: marketsTxt(before.markets), next: marketsTxt(D.markets) });
  add.forEach(r => log('Reference added', 'Module', m, v, { next: refById(r).title }));
  rem.forEach(r => log('Reference removed', 'Module', m, v, { prev: refById(r).title }));
  if (before.body !== D.body.trim()) log('Content edited', 'Module', m, v, { prev: trunc(before.body), next: trunc(D.body.trim()) });
  const meta = [['title', 'Name'], ['type', 'Type'], ['audience', 'Audience']].filter(([k]) => before[k] !== (k === 'title' ? D.title.trim() : D[k]));
  if (!sameSet(before.channels, D.channels)) meta.push(['channels', 'Channels']);
  if (!sameSet(before.indications, D.indications)) meta.push(['indications', 'Indications']);
  if (toISO(before.expiry || 0) !== D.expiry) meta.push(['expiry', 'Expiry']);
  if (toISO(before.reviewDate || 0) !== D.reviewDate) meta.push(['reviewDate', 'Review date']);
  if (meta.length) log('Module edited', 'Module', m, v, { note: meta.map(x => x[1]).join(', ') + ' changed', prev: meta.length === 1 && meta[0][0] === 'title' ? before.title : '', next: meta.length === 1 && meta[0][0] === 'title' ? D.title.trim() : '' });
}
function saveModuleForm() {
  if (!wizAdvance('module')) return;
  const D = UI.draft; const p = UI.route.p; const now = Date.now();
  const base = { title: D.title.trim(), type: D.type, products: [...D.products], indications: [...D.indications], audience: D.audience, markets: [...D.markets], channels: [...D.channels], reviewDate: fromISO(D.reviewDate), expiry: fromISO(D.expiry), updatedAt: now };
  if (p.id) {
    const m = modById(p.id); const l = latest(m); const before = { ...m, body: l.body, refs: [...l.refs] };
    if (p.newVersion) {
      const nv = newVersion(m, 'Module', D.reason.trim()); Object.assign(m, base); const v = latest(m); v.body = D.body.trim(); v.refs = [...D.refs];
      logModuleDiff(m, before, D, nv); save(); UI.draft = null; go('module', { id: m.id });
      toast('Version ' + nv + ' created' + (live(m) ? ' — v' + live(m).v + ' stays live until v' + nv + ' is approved' : ' — submitting it restarts the full approval cycle')); return;
    }
    Object.assign(m, base); l.body = D.body.trim(); l.refs = [...D.refs];
    logModuleDiff(m, before, D, l.v);
    if (statusOf(m) === 'Amendment Requested') { m.amendNote = D.reason.trim(); log('Amended', 'Module', m, l.v, { note: D.reason.trim() }); }
    save(); UI.draft = null; go('module', { id: m.id }); toast(statusOf(m) === 'Amendment Requested' ? 'Changes saved — resubmit to resume approval' : 'Changes saved'); return;
  }
  const id = nextModuleId(D.products);
  const m = { id, ...base, owner: me().id, versions: [{ v: 1, body: D.body.trim(), refs: [...D.refs], createdAt: now, createdBy: me().id, reason: 'Initial version', status: 'Draft', cycles: [], approvedAt: null, approvedBy: null }], createdAt: now, review: null, resume: null, archived: false };
  S.modules.push(m); log('Module created', 'Module', m, 1, { next: 'Draft', note: m.type + ' · ' + productsTxt(m.products) + ' · ' + m.markets.join(', ') }); save(); UI.draft = null; go('module', { id }); toast('Draft saved — ' + id);
}
function saveWorkflowForm() {
  if (!wizAdvance('workflow')) return;
  const D = UI.nwf; const w = { id: uid('WF'), name: D.name.trim(), desc: D.desc.trim() || D.use, active: true, steps: D.steps.map(s => ({ ...s })) };
  S.workflows.push(w); logAdmin('Workflow created', 'Workflow', w.id, { next: w.steps.filter(s => !isNotify(s)).map(stepLabel).join(' → '), note: w.name }); save(); UI.nwf = null; go('workflow', { id: w.id }); toast('Workflow created · ' + reviewSteps(w).length + ' steps');
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
    const a = assetById(zone.dataset.id); if (!a) return;
    if (src.kind === 'mod') {
      const m = modById(src.module); if (!m || !live(m) || a.blocks.some(b => b.moduleId === m.id) || !eligibility(m, a).ok) return;
      a.blocks.splice(to, 0, { id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); log('Module reused', 'Asset', a, null, { note: m.id + ' v' + live(m).v + ' added' }); toast('Added ' + m.type + ' · ' + m.id + ' v' + live(m).v);
    } else { const [x] = a.blocks.splice(src.i, 1); if (src.i < to) to--; a.blocks.splice(to, 0, x); }
    save();
  }
  render();
});
document.addEventListener('dragend', () => { DND.src = null; DND.idx = null; dndClear(); document.body.classList.remove('is-dragging', 'drag-mod', 'drag-blk', 'drag-step'); document.querySelectorAll('.dragging').forEach(e => e.classList.remove('dragging')); });
