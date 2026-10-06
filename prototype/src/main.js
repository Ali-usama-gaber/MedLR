/* ---------- Controller: routing, modals, actions ---------- */
const ROUTES = { home: viewHome, tasks: viewTasks, modules: viewModules, module: viewModule, 'module-new': viewModuleForm, 'module-edit': viewModuleForm, review: viewReview, library: viewLibrary, assets: viewAssets, assemble: viewAssemble, asset: viewAsset, 'asset-review': viewAssetReview, lifecycle: viewLifecycle, audit: viewAudit, reports: viewReports, users: viewUsers, user: viewUser, 'user-new': viewUserForm, 'user-edit': viewUserForm, teams: viewTeams, roles: viewRoles, products: viewProducts, markets: viewMarkets, materials: viewMaterials, workflows: viewWorkflows, workflow: viewWorkflow };
const ADMIN_ROUTES = ['users', 'user', 'user-new', 'user-edit', 'teams', 'roles', 'products', 'markets', 'materials', 'workflows', 'workflow'];
const app = document.getElementById('app');

function go(name, p = {}, replace) {
  if (name === 'login' || name === 'forgot') { UI.f.resetSent = null; UI.f.forgotErr = null; UI.f.loginErr = null; }
  if (name === 'module-new') UI.draft = null;
  if ((name === 'module-edit' || name === 'module-new') && UI.route.name !== name) UI.draft = null;
  if ((name === 'user-new' || name === 'user-edit')) UI.udraft = null;
  if (name !== 'workflow') UI.wfDraft = null;
  if (name === 'library') { const dm = S.demo.moduleId && modById(S.demo.moduleId); if (dm && live(dm)) S.demo.sawLibraryAfter = true; }
  if (name === 'lifecycle') S.demo.sawLifecycle = true;
  UI.route = { name, p }; UI.pop = null; UI.navOpen = false; UI.search = ''; UI.f.rvc = '';
  save(); render(); window.scrollTo(0, 0);
  const c = document.getElementById('content'); if (c) c.focus && c.setAttribute('tabindex', '-1');
}

function render() {
  const ae = document.activeElement; const fid = ae && ae.id; let s0 = null, s1 = null; try { s0 = ae.selectionStart; s1 = ae.selectionEnd; } catch (e) {}
  const r = UI.route.name;
  let html;
  if (!S.signedIn || r === 'login' || r === 'forgot') html = viewLogin();
  else {
    let inner;
    if (ADMIN_ROUTES.includes(r) && !isAdmin(me())) inner = `<div class="empty"><h4>Administration is limited to Administrators</h4><p>You are signed in as ${esc(roleLabel(me()))}.</p><br><button class="btn primary" data-act="persona" data-id="u-ali" data-then="${r}" data-target="${esc(UI.route.p.id || '')}">Switch to Ali Usama (Administrator)</button></div>`;
    else inner = (ROUTES[r] || viewHome)();
    html = viewShell(inner + '<p class="disclaimer">SAJA MedLR prototype · All products, studies, people and data are fictional and for demonstration only.</p>');
    html += UI.guide ? viewGuide() : '';
    html += `<button class="guide-fab" data-act="guide" aria-expanded="${UI.guide}" aria-label="${UI.guide ? 'Close guide' : 'Demo guide'}">${icon(UI.guide ? 'x' : 'play', 'sm')}<span class="lbl">${UI.guide ? 'Close guide' : 'Demo guide'}</span></button>`;
  }
  html += UI.modal ? viewModal() : '';
  app.innerHTML = html;
  app.querySelectorAll('table.tbl').forEach(t => { const hs = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim()); t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (hs[i]) td.setAttribute('data-label', hs[i]); })); });
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) {} } }
}

function toast(text) {
  const box = document.getElementById('toasts'); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = icon('check', 'sm') + '<span>' + esc(text) + '</span>'; box.appendChild(t); while (box.children.length > 2) box.firstChild.remove(); setTimeout(() => t.remove(), 3200);
}
function switchPersona(id, then, target, silent) {
  const u = user(id); if (!u || !u.id) return;
  S.personaId = id; save();
  if (!silent) toast('Now viewing as ' + u.name + ' · ' + roleLabel(u));
  if (then) go(then, target ? { id: target } : {}); else if (ADMIN_ROUTES.includes(UI.route.name) && !isAdmin(u)) go('home'); else { UI.pop = null; render(); }
}

/* ===== Modals ===== */
const modalShell = (icoName, tone, title, sub, body, foot, wide) => `<div class="scrim" data-act="modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="modal-head"><div class="m-ico ${tone}">${icon(icoName)}</div><div style="flex:1;min-width:0"><h2 id="m-title">${title}</h2>${sub ? `<p class="ink2" style="margin-top:4px">${sub}</p>` : ''}</div><button class="btn icon sm" data-act="modal-close" aria-label="Close">${icon('x', 'sm')}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div></div>`;
function wfVisual(wf) {
  const groups = []; wf.steps.forEach(s => { const g = groups[groups.length - 1]; if (g && g.fn === s.fn) g.steps.push(s); else groups.push({ fn: s.fn, steps: [s] }); });
  return `<div class="row" style="gap:8px;align-items:stretch">${groups.map((g, i) => `<div style="flex:1;min-width:140px;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2)"><b style="font-size:13px">${esc(g.fn)} review</b><div class="stack" style="gap:6px;margin-top:8px">${g.steps.map(s => `<div class="row nowrap" style="gap:6px;font-size:12.5px">${sen(s.seniority)}${s.req === 'approve' ? 'Final approval' : 'Review'}</div>`).join('')}</div></div>${i < groups.length - 1 ? `<span style="align-self:center;color:var(--ink-3)">${icon('arrow', 'sm')}</span>` : ''}`).join('')}</div>`;
}
function viewModal() {
  const M = UI.modal; const u = me();
  if (M.type === 'submit') {
    const m = modById(M.id); const l = latest(m); const junior = u.type === 'Content Owner' && u.seniority === 'Junior';
    if (junior) return modalShell('send', '', 'Send to Senior Content Owner', 'Junior Content Owners prepare drafts. A Senior Content Owner reviews and submits them for MLR review.', `<div class="ref"><span class="n">${typeIco(m.type)}</span><div><b>${esc(m.title)}</b><br><span class="mono muted">${m.id} · v${l.v}</span></div></div>`, `${btn('Cancel', 'modal-close')}${btn('Send to Senior', 'submit-confirm', 'primary', `data-id="${m.id}"`, 'send')}`);
    const wfs = S.workflows.filter(w => !w.system && !w.hidden && w.active); const chosen = M.wf || wfs[0].id;
    return modalShell('send', '', l.v > 1 && live(m) ? 'Submit version ' + l.v + ' for re-approval' : 'Submit for MLR review', 'The module follows this route. Each step is assigned to a team and a seniority level.',
      `<div class="ref"><span class="n">${typeIco(m.type)}</span><div style="flex:1"><b>${esc(m.title)}</b><br><span class="mono muted">${m.id} · v${l.v}</span></div>${chip(l.status)}</div>
       <div class="stack" style="gap:10px"><span class="label">Review route</span>${wfs.map(w => `<button type="button" class="type-card ${w.id === chosen ? 'on' : ''}" style="width:100%;flex-direction:column;gap:10px" data-act="submit-wf" data-id="${m.id}" data-v="${w.id}" aria-pressed="${w.id === chosen}"><span class="row" style="width:100%"><b style="font-size:14px">${esc(w.name)}</b><span class="chip plain" style="margin-left:auto">${w.steps.length} steps</span></span><span>${esc(w.desc)}</span>${w.id === chosen ? wfVisual(w) : ''}</button>`).join('')}</div>`,
      `${btn('Cancel', 'modal-close')}${btn('Confirm & submit', 'submit-confirm', 'primary', `data-id="${m.id}"`, 'send')}`, true);
  }
  if (M.type === 'decide') {
    const obj = M.kind === 'Asset' ? assetById(M.id) : modById(M.id); const st = curStep(obj); const wf = wfById(obj.review.wf); const nx = wf.steps[obj.review.step + 1];
    const cfg = { send: ['send', '', nextLabel(obj), nx ? `The item moves to ${esc(stepLabel(nx))}${assigneeFor(nx)[0] ? ' — ' + esc(assigneeFor(nx).map(x => x.name).join(', ')) : ''}. Your notes travel with it.` : '', 'Notes for the next reviewer (optional)', false, 'primary'],
      changes: ['undo', 'warn', 'Request changes', 'The module goes back to the content owner. The workflow restarts from the first step after resubmission.', 'What needs to change?', true, 'primary'],
      return: ['back', 'warn', 'Return to Junior reviewer', 'The item goes back to the Junior ' + esc(st.fn) + ' Reviewer with your notes.', 'What should the Junior reviewer look at?', true, 'primary'],
      reject: ['x', 'bad', 'Reject', 'Rejected content cannot continue in this workflow. The owner is notified.', 'Reason for rejection', true, 'danger'] }[M.d];
    return modalShell(cfg[0], cfg[1], cfg[2], cfg[3], `<div class="field"><label for="m-note">${cfg[4]}</label><textarea class="textarea ${M.err ? 'invalid' : ''}" id="m-note" placeholder="${M.d === 'send' ? 'e.g. Checked against reference 1 — no issues found.' : ''}">${esc(M.note || UI.f.rvc || '')}</textarea>${M.err ? '<span class="err">Add a note so the next person knows what to do.</span>' : ''}</div><div class="row muted" style="font-size:12.5px">${avatar(u, 'sm')}${esc(u.name)} · ${esc(roleLabel(u))}</div>`,
      `${btn('Cancel', 'modal-close')}${btn(cfg[2], 'decide-confirm', cfg[6], `data-req="${cfg[5] ? 1 : 0}"`)}`);
  }
  if (M.type === 'sign') {
    const obj = M.kind === 'Asset' ? assetById(M.id) : modById(M.id); const st = curStep(obj); const wf = wfById(obj.review.wf); const last = obj.review.step === wf.steps.length - 1;
    const meaning = { Medical: 'I confirm the content is medically accurate and consistent with the cited evidence.', Legal: 'I confirm the content meets legal and promotional code requirements.', Regulatory: 'I confirm the content complies with the regulations of the selected markets.' }[st.fn];
    return modalShell('key', '', 'Final ' + esc(st.fn) + ' approval', `Signing as <b>${esc(u.name)}</b> · ${esc(roleLabel(u))}`,
      `<div class="ref"><span class="n">${M.kind === 'Asset' ? typeIco('Reference') : typeIco(obj.type)}</span><div style="flex:1"><b>${esc(obj.title || obj.name)}</b><br><span class="mono muted">${obj.id}${M.kind === 'Module' ? ' · v' + latest(obj).v : ''}</span></div></div>
      <div class="banner ok">${icon('shieldcheck')}<div class="txt"><b>Signature meaning</b><p>${meaning}</p></div></div>
      <label class="choice ${M.att ? 'on' : ''}" style="width:100%;cursor:pointer"><input type="checkbox" id="m-att" data-act-change="sign-att" ${M.att ? 'checked' : ''} style="position:absolute;opacity:0"><span class="box">${M.att ? icon('check', 'sm') : ''}</span>I have reviewed the content, the references and the Junior review.</label>
      <div class="field"><label for="m-pass">Re-enter your password to sign</label><input class="input ${M.err ? 'invalid' : ''}" id="m-pass" type="password" autocomplete="current-password" placeholder="Password">${M.err ? `<span class="err">${esc(M.err)}</span>` : '<span class="hint">Any password works in the prototype.</span>'}</div>
      <p class="muted" style="font-size:12.5px">${last ? 'This is the final step — the ' + (M.kind === 'Module' ? 'module will be approved and published to the Approved Library.' : 'asset will be approved for use.') : 'After signing, the item moves to ' + esc(stepLabel(wf.steps[obj.review.step + 1])) + '.'} The signature is recorded in the audit trail with a timestamp.</p>`,
      `${btn('Cancel', 'modal-close')}${btn('Sign & approve', 'sign-confirm', 'primary', '', 'key')}`);
  }
  if (M.type === 'success') {
    const m = modById(M.id); const lv = live(m); const sup = m.versions.find(v => v.status === 'Superseded' && v.v === lv.v - 1); const imp = impactedAssets(m);
    return `<div class="scrim" data-act="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="success"><div class="big">${icon('check')}</div><span class="chip ok">Approved · v${lv.v}</span><h2 id="m-title">Module approved</h2><p class="ink2" style="max-width:46ch">${esc(m.title)} is approved for ${esc(marketsTxt(m.markets))} and is now in the Approved Content Library.</p>${wfInline(wfById('WF-STD'), 99, true).replace('wf-inline', 'wf-inline" style="justify-content:center')}
    ${sup ? `<div class="banner warn" style="text-align:left;width:100%">${icon('alert')}<div class="txt"><b>v${sup.v} is now superseded</b><p>${imp.length} asset${imp.length === 1 ? ' uses' : 's use'} the previous version and should be updated.</p></div></div>` : ''}</div>
    <div class="modal-foot" style="justify-content:center;border-top:0">${btn('Open module', 'success-go', '', `data-to="module" data-id="${m.id}"`)}${sup && imp.length ? btn('Review impacted assets', 'success-go', 'primary', `data-to="impact" data-id="${m.id}"`) : btn('View in library', 'success-go', 'primary', `data-to="library" data-id="${m.id}"`, 'book')}</div></div></div>`;
  }
  if (M.type === 'asset-success') {
    const a = assetById(M.id);
    return `<div class="scrim" data-act="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="success"><div class="big">${icon('check')}</div><h2 id="m-title">Asset approved</h2><p class="ink2" style="max-width:46ch">${esc(a.name)} is approved for ${esc(market(a.market).name)} · ${esc(a.channel)}. New content in this asset is now approved as part of it.</p></div><div class="modal-foot" style="justify-content:center;border-top:0">${btn('Open asset', 'success-go', 'primary', `data-to="asset" data-id="${a.id}"`)}</div></div></div>`;
  }
  if (M.type === 'asset-new') {
    const D = M.d; const types = S.materialTypes;
    return modalShell('layers', '', 'Create asset', 'Choose the asset type and where it will be used. Only modules eligible for this market and channel can be added.',
      `<div class="fgrid"><div class="field"><label for="an-type">Asset type</label><select class="select" id="an-type" data-an="type">${types.map(t => opt(t.name, D.type)).join('')}</select></div>
      <div class="field"><label for="an-name">Asset name</label><input class="input ${M.err ? 'invalid' : ''}" id="an-name" data-an="name" value="${esc(D.name)}">${M.err ? '<span class="err">Give the asset a name.</span>' : ''}</div>
      <div class="field"><label for="an-prod">Product</label><select class="select" id="an-prod" data-an="product">${S.products.filter(p => p.status === 'Active').map(p => opt(p.id, D.product, p.name)).join('')}</select></div>
      <div class="field"><label for="an-mkt">Market</label><select class="select" id="an-mkt" data-an="market">${S.markets.filter(x => x.active).map(x => opt(x.id, D.market, x.name)).join('')}</select></div>
      <div class="field"><label for="an-ch">Channel</label><select class="select" id="an-ch" data-an="channel">${S.channels.map(c => opt(c, D.channel)).join('')}</select></div>
      <div class="field"><label for="an-aud">Audience</label><select class="select" id="an-aud" data-an="audience">${S.audiences.map(c => opt(c, D.audience)).join('')}</select></div></div>
      ${M.module ? `<div class="banner info">${icon('layers')}<div class="txt"><b>${esc(modById(M.module).title)}</b><p>Will be added to the asset if it is eligible for the selected market and channel.</p></div></div>` : ''}`,
      `${btn('Cancel', 'modal-close')}${btn('Create & open assembly', 'asset-create', 'primary', '', 'arrow')}`);
  }
  if (M.type === 'new-text') {
    return modalShell('edit', 'warn', 'Add new text', 'Text that is not an approved module is flagged as new content and sends the asset to full MLR review.',
      `<div class="field"><label for="nt-label">Block</label><select class="select" id="nt-label">${['Headline', 'Body copy', 'Call to action', 'Other'].map(x => opt(x, M.label || 'Body copy')).join('')}</select></div><div class="field"><label for="nt-text">Text</label><textarea class="textarea ${M.err ? 'invalid' : ''}" id="nt-text" placeholder="e.g. Join our webinar on heart-failure care on 12 November.">${esc(M.text || '')}</textarea>${M.err ? '<span class="err">Write the text to add.</span>' : ''}</div>`,
      `${btn('Cancel', 'modal-close')}${btn('Add to asset', 'new-text-confirm', 'primary', `data-id="${M.id}"`, 'plus')}`);
  }
  if (M.type === 'asset-submit') {
    const a = assetById(M.id); const V = assetValidation(a); const wf = wfById(assetWorkflow(a)); const junior = u.type === 'Marketing User' && u.seniority === 'Junior';
    if (junior) return modalShell('send', '', 'Send to Senior Marketing User', 'Junior Marketing Users assemble assets. A Senior Marketing User submits them for review.', `<div class="ref"><span class="n">${typeIco('Reference')}</span><div><b>${esc(a.name)}</b><br><span class="muted">${V.mods.length} approved modules${V.nNew ? ' · ' + V.nNew + ' new content' : ''}</span></div></div>`, `${btn('Cancel', 'modal-close')}${btn('Send to Senior', 'asset-submit-confirm', 'primary', `data-id="${a.id}"`, 'send')}`);
    return V.nNew
      ? modalShell('alert', 'warn', 'New content detected', 'This asset contains content that is not based on an approved module and requires additional MLR review.',
        `<div class="stack" style="gap:8px">${a.blocks.filter(b => b.kind === 'new').map(b => `<div class="block new" style="margin:0"><div class="meta">${icon('edit', 'sm')}New content · ${esc(b.label || 'Text')}</div><div class="txt">${esc(b.text)}</div></div>`).join('')}</div><div class="row"><span class="chip warn">Review required</span><span class="muted" style="font-size:12.5px">Route: ${esc(wf.name)}</span></div>${wfVisual(wf)}<p class="muted" style="font-size:12.5px">${V.mods.length} approved module${V.mods.length === 1 ? ' stays' : 's stay'} locked and are not reviewed again.</p>`,
        `${btn('Keep editing', 'modal-close')}${btn('Submit for review', 'asset-submit-confirm', 'primary', `data-id="${a.id}"`, 'send')}`, true)
      : modalShell('shieldcheck', '', 'Ready for streamlined review', 'Every block is an approved module that is eligible for this market and channel.',
        `<div class="stack" style="gap:6px">${['Module approved', 'Market eligible', 'Channel eligible', 'Not expired'].map(x => `<div class="check-row"><span class="ok">${icon('check', 'sm')}</span>${x} — all ${V.mods.length} modules</div>`).join('')}</div>${wfVisual(wf)}`,
        `${btn('Keep editing', 'modal-close')}${btn('Submit for review', 'asset-submit-confirm', 'primary', `data-id="${a.id}"`, 'send')}`);
  }
  if (M.type === 'simple') {
    return modalShell(M.ico || 'plus', '', M.title, M.sub || '', M.fields.map(f => `<div class="field"><label for="sf-${f[0]}">${f[1]}</label>${f[2] === 'select' ? `<select class="select" id="sf-${f[0]}">${f[3].map(o => Array.isArray(o) ? opt(o[0], '', o[1]) : opt(o, '')).join('')}</select>` : `<input class="input ${M.err && M.err === f[0] ? 'invalid' : ''}" id="sf-${f[0]}" placeholder="${esc(f[3] || '')}">`}</div>`).join('') + (M.err ? '<span class="err">Fill in the required fields.</span>' : ''), `${btn('Cancel', 'modal-close')}${btn(M.cta || 'Add', 'simple-confirm', 'primary', '', 'check')}`);
  }
  return '';
}

/* ===== Actions ===== */
function nextModuleId(prod) { const pre = 'MOD-' + (prod === 'P-B' ? 'B' : 'A') + '-'; const n = Math.max(0, ...S.modules.filter(m => m.id.startsWith(pre)).map(m => +m.id.slice(pre.length))) + 1; return pre + String(n).padStart(3, '0'); }
function nextAssetId() { return 'AST-' + (Math.max(100, ...S.assets.map(a => +a.id.slice(4))) + 1); }
function curAsset() { return assetById(UI.route.p.id); }

const ACT = {
  pop: el => { UI.pop = UI.pop === el.dataset.pop ? null : el.dataset.pop; if (UI.pop === 'bell') S.notifSeen = Date.now(); render(); },
  persona: el => switchPersona(el.dataset.id, el.dataset.then, el.dataset.target),
  reset: () => { UI.modal = null; UI.guide = true; resetDemo(); ensureAssetWorkflows(); save(); render(); },
  logout: () => { S.signedIn = false; save(); UI.modal = null; UI.guide = false; go('login'); },
  'login-as': el => { const x = user(el.dataset.id); S.personaId = x.id; S.signedIn = true; save(); go('home'); toast('Signed in as ' + x.name + ' · ' + roleLabel(x)); },
  guide: () => { UI.guide = !UI.guide; render(); },
  'modal-close': () => { UI.modal = null; render(); },
  'modal-bg': (el, ev) => { if (ev.target === el) { UI.modal = null; render(); } },
  'set-f': el => { UI.f[el.dataset.k] = el.dataset.v; render(); },
  'clear-filters': el => { el.dataset.keys.split(',').forEach(k => { UI.f[k] = k === 'lstat' ? 'usable' : ''; }); render(); },

  /* module form */
  'd-type': el => { UI.draft.type = el.dataset.v; render(); },
  'd-toggle': el => { const arr = UI.draft[el.dataset.k]; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v); render(); },
  'd-unref': el => { UI.draft.refs = UI.draft.refs.filter(r => r !== el.dataset.v); render(); },
  'd-newref': () => { const t = (UI.draft.newRefTitle || '').trim(); if (!t) { toast('Type a reference title first'); return; } const pfx = UI.draft.product === 'P-B' ? 'B' : 'A'; const id = 'REF-' + pfx + '-' + String(S.references.length + 1).padStart(2, '0'); S.references.push({ id, title: t, source: 'Added by ' + me().name + ', ' + fmtD(Date.now()) }); UI.draft.refs.push(id); UI.draft.newRefTitle = ''; save(); render(); },

  'submit-open': el => { const m = modById(el.dataset.id); const l = latest(m); UI.modal = { type: 'submit', id: m.id, wf: l.v > 1 && live(m) ? 'WF-LOW' : 'WF-STD' }; render(); },
  'submit-wf': el => { UI.modal.wf = el.dataset.v; render(); },
  'submit-confirm': el => {
    const m = modById(el.dataset.id); const r = submitModule(m);
    if (r === 'in-review') { m.review.wf = UI.modal.wf || 'WF-STD'; save(); const st = curStep(m); UI.modal = null; render(); toast('Submitted · now with ' + st.seniority + ' ' + REVIEWER_OF[st.fn] + ' (' + assigneeFor(st).map(x => x.name).join(', ') + ')'); }
    else { UI.modal = null; render(); toast('Sent to Senior Content Owner for submission'); }
  },
  'new-version': el => { UI.draft = null; go('module-edit', { id: el.dataset.id, newVersion: true }); },

  /* review */
  decide: el => { UI.modal = { type: 'decide', kind: el.dataset.kind, id: el.dataset.id, d: el.dataset.d }; render(); setTimeout(() => { const t = document.getElementById('m-note'); t && t.focus(); }, 30); },
  'decide-confirm': el => {
    const M = UI.modal; const note = (document.getElementById('m-note').value || '').trim();
    if (el.dataset.req === '1' && !note) { M.err = true; M.note = ''; render(); return; }
    const obj = M.kind === 'Asset' ? assetById(M.id) : modById(M.id); const r = decide(obj, M.kind, M.d, note);
    UI.modal = null; UI.f.rvc = ''; go('tasks'); toast(r.msg);
  },
  sign: el => { UI.modal = { type: 'sign', kind: el.dataset.kind, id: el.dataset.id, att: false }; render(); },
  'sign-confirm': () => {
    const M = UI.modal; const pass = document.getElementById('m-pass').value;
    if (!M.att) { M.err = 'Confirm that you have reviewed the content.'; render(); return; }
    if (!pass) { M.err = 'Enter your password to sign.'; render(); return; }
    const obj = M.kind === 'Asset' ? assetById(M.id) : modById(M.id);
    if (UI.f.rvc) { obj.review.comments.push({ by: S.personaId, at: Date.now(), text: UI.f.rvc, decision: 'Comment', step: obj.review.step, fn: curStep(obj).fn, seniority: curStep(obj).seniority }); UI.f.rvc = ''; }
    const r = decide(obj, M.kind, 'approve', '');
    if (r.done) { UI.modal = { type: M.kind === 'Asset' ? 'asset-success' : 'success', id: obj.id }; go(M.kind === 'Asset' ? 'asset' : 'module', { id: obj.id }); }
    else { UI.modal = null; go('tasks'); toast(r.msg); }
  },
  comment: el => {
    const t = (document.getElementById('rv-comment').value || '').trim(); if (!t) { toast('Write a comment first'); return; }
    const obj = el.dataset.kind === 'Asset' ? assetById(el.dataset.id) : modById(el.dataset.id); const st = curStep(obj);
    obj.review.comments.push({ by: S.personaId, at: Date.now(), text: t, decision: 'Comment', step: obj.review.step, fn: st.fn, seniority: st.seniority });
    log('Commented', el.dataset.kind, obj.id, el.dataset.kind === 'Module' ? latest(obj).v : 1, t); UI.f.rvc = ''; save(); render(); toast('Comment added');
  },
  'success-go': el => { const to = el.dataset.to; UI.modal = null; if (to === 'impact') { if (!canCreateAsset(me())) { const m = modById(el.dataset.id); S.personaId = m.owner; toast('Now viewing as ' + user(m.owner).name + ' · ' + roleLabel(user(m.owner)) + ' (asset updates)'); } go('module', { id: el.dataset.id, tab: 'lifecycle' }); } else if (to === 'library') go('library'); else go(to, { id: el.dataset.id }); },

  /* assets */
  'asset-new': el => {
    const u = me(); const mod = el.dataset.module ? modById(el.dataset.module) : null; const t = S.materialTypes[0];
    UI.modal = { type: 'asset-new', module: mod ? mod.id : null, d: { type: t.name, name: t.name + ' — ' + (mod ? mod.title.split('—')[0].trim() : 'Heart failure update'), product: mod ? mod.product : 'P-A', market: mod ? mod.markets[0] : 'SA', channel: t.channel, audience: mod ? mod.audience : 'HCP – Cardiologists' } };
    UI.pop = null; if (!canCreateAsset(u)) { UI.modal = null; toast('Only Marketing Users and Content Owners create assets'); return; } render();
  },
  'asset-create': () => {
    const D = UI.modal.d; if (!D.name.trim()) { UI.modal.err = true; render(); return; }
    const a = { id: nextAssetId(), name: D.name.trim(), type: D.type, product: D.product, market: D.market, channel: D.channel, audience: D.audience, status: 'Draft', owner: S.personaId, createdAt: Date.now(), approvedAt: null, review: null, blocks: [] };
    if (UI.modal.module) { const m = modById(UI.modal.module); if (eligibility(m, a).ok) a.blocks.push({ id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); }
    S.assets.push(a); if (me().type === 'Marketing User') S.demo.assetId = a.id; log('Created asset', 'Asset', a.id, 1); UI.modal = null; save(); go('assemble', { id: a.id }); toast('Asset created — add approved modules from the left');
  },
  'blk-add': el => { const a = assetById(el.dataset.id); const m = modById(el.dataset.module); a.blocks.push({ id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); save(); render(); toast('Added ' + m.type + ' · ' + m.id + ' v' + live(m).v); },
  'blk-move': el => { const a = curAsset(); const i = +el.dataset.i, j = i + +el.dataset.dir; if (j < 0 || j >= a.blocks.length) return; [a.blocks[i], a.blocks[j]] = [a.blocks[j], a.blocks[i]]; save(); render(); },
  'blk-del': el => { const a = curAsset(); a.blocks.splice(+el.dataset.i, 1); save(); render(); },
  'new-text': el => { UI.modal = { type: 'new-text', id: el.dataset.id }; render(); setTimeout(() => { const t = document.getElementById('nt-text'); t && t.focus(); }, 30); },
  'new-text-confirm': el => { const t = document.getElementById('nt-text').value.trim(); const lbl = document.getElementById('nt-label').value; if (!t) { UI.modal.err = true; UI.modal.label = lbl; render(); return; } const a = assetById(el.dataset.id); a.blocks.push({ id: uid('b'), kind: 'new', text: t, label: lbl }); UI.modal = null; save(); render(); toast('New content added — the asset now needs full MLR review'); },
  'asset-save': el => { const a = assetById(el.dataset.id); log('Saved asset draft', 'Asset', a.id, 1); save(); toast('Draft saved'); },
  'asset-submit': el => { const a = assetById(el.dataset.id); const V = assetValidation(a); if (V.empty) { toast('Add at least one module before submitting'); return; } if (V.bad.length) { toast(V.bad.length + ' module(s) are not eligible — remove them or change the market/channel'); return; } UI.modal = { type: 'asset-submit', id: a.id }; render(); },
  'asset-submit-confirm': el => {
    const a = assetById(el.dataset.id); const u = me();
    if (u.type === 'Marketing User' && u.seniority === 'Junior') { a.status = 'Awaiting Senior submit'; log('Sent to Senior Marketing User', 'Asset', a.id, 1); UI.modal = null; save(); go('asset', { id: a.id }); toast('Sent to Senior Marketing User'); return; }
    a.review = { wf: assetWorkflow(a), step: 0, submittedAt: Date.now(), comments: [] }; a.status = 'In Review'; a.changes = null;
    log(a.blocks.some(b => b.kind === 'new') ? 'Submitted asset — new content, full review' : 'Submitted asset — streamlined review', 'Asset', a.id, 1);
    UI.modal = null; save(); go('asset', { id: a.id }); const st = curStep(a); toast('Submitted · now with ' + st.seniority + ' ' + REVIEWER_OF[st.fn]);
  },
  'replace-version': el => { const a = assetById(el.dataset.asset); const m = modById(el.dataset.module); const b = a.blocks.find(x => x.moduleId === m.id); const from = b.v; b.v = live(m).v; log('Replaced module version', 'Asset', a.id, 1, m.id + ' v' + from + ' → v' + b.v); save(); render(); toast(a.name + ' now uses ' + m.id + ' v' + b.v); },

  /* users */
  'u-type': el => { const D = UI.udraft; D.type = el.dataset.v; const fnOf = { 'Content Owner': 'Content', 'Medical Reviewer': 'Medical', 'Legal Reviewer': 'Legal', 'Regulatory Reviewer': 'Regulatory', 'Marketing User': 'Marketing', 'Administrator': 'Administration' }; const t = S.teams.find(x => x.id === D.team); if (!t || t.fn !== fnOf[D.type]) { const first = S.teams.find(x => x.fn === fnOf[D.type]); D.team = first ? first.id : ''; } render(); },
  'u-sen': el => { UI.udraft.seniority = el.dataset.v; render(); },
  'u-status': el => { UI.udraft.status = el.dataset.v; render(); },
  'user-status': el => { const x = S.users.find(u => u.id === el.dataset.id); if (x.id === S.personaId) { toast('You cannot deactivate the user you are viewing as'); return; } x.status = x.status === 'Active' ? 'Inactive' : 'Active'; log(x.status === 'Active' ? 'Activated user' : 'Deactivated user', 'User', x.id, 1); save(); render(); toast(x.name + ' is now ' + x.status.toLowerCase()); },
  'team-new': () => { UI.modal = { type: 'simple', kind: 'team', title: 'Add team', fields: [['name', 'Team name', 'text', 'e.g. Medical Affairs — Respiratory'], ['fn', 'Function', 'select', ['Content', 'Medical', 'Legal', 'Regulatory', 'Marketing']]] }; render(); },
  'product-new': () => { UI.modal = { type: 'simple', kind: 'product', title: 'Add product', fields: [['name', 'Product name', 'text', 'e.g. Product C'], ['area', 'Therapy area', 'text', 'e.g. Diabetes'], ['ind', 'Indications (comma separated)', 'text', 'e.g. Type 2 diabetes']] }; render(); },
  'market-new': () => { UI.modal = { type: 'simple', kind: 'market', title: 'Add market', fields: [['name', 'Country', 'text', 'e.g. Kuwait'], ['code', 'Code', 'text', 'e.g. KW'], ['auth', 'Health authority', 'text', 'e.g. MOH Kuwait']] }; render(); },
  'material-new': () => { UI.modal = { type: 'simple', kind: 'material', title: 'Add material type', fields: [['name', 'Material type', 'text', 'e.g. Congress poster'], ['channel', 'Channel', 'select', S.channels], ['wf', 'Workflow', 'select', S.workflows.filter(w => !w.hidden).map(w => [w.id, w.name])]] }; render(); },
  'wf-new': () => { UI.modal = { type: 'simple', kind: 'workflow', title: 'New workflow', ico: 'workflow', cta: 'Create', fields: [['name', 'Workflow name', 'text', 'e.g. Medical education — Senior only'], ['desc', 'When is it used?', 'text', 'e.g. Non-promotional medical education']] }; render(); },
  'simple-confirm': () => {
    const M = UI.modal; const v = k => { const e = document.getElementById('sf-' + k); return e ? e.value.trim() : ''; };
    const req = M.fields.filter(f => f[2] !== 'select').map(f => f[0]); const miss = req.find(k => !v(k)); if (miss) { M.err = miss; render(); return; }
    if (M.kind === 'team') { S.teams.push({ id: uid('T'), name: v('name'), fn: v('fn') }); toast('Team added'); }
    if (M.kind === 'product') { S.products.push({ id: uid('P'), name: v('name'), area: v('area'), indications: v('ind').split(',').map(x => x.trim()).filter(Boolean), status: 'Active' }); toast('Product added'); }
    if (M.kind === 'market') { S.markets.push({ id: v('code').toUpperCase().slice(0, 3), name: v('name'), authority: v('auth'), lang: '—', active: true }); toast('Market added'); }
    if (M.kind === 'material') { S.materialTypes.push({ id: uid('MT'), name: v('name'), channel: v('channel'), workflow: v('wf') }); toast('Material type added'); }
    if (M.kind === 'workflow') { const w = { id: uid('WF'), name: v('name'), desc: v('desc'), active: true, steps: [{ id: uid('s'), fn: 'Medical', seniority: 'Junior', req: 'review' }, { id: uid('s'), fn: 'Medical', seniority: 'Senior', req: 'approve' }] }; S.workflows.push(w); log('Created workflow', 'Workflow', w.id, 1); UI.modal = null; save(); go('workflow', { id: w.id }); toast('Workflow created — configure its steps'); return; }
    UI.modal = null; save(); render();
  },
  'toggle-prod': el => { const p = S.products.find(x => x.id === el.dataset.id); p.status = p.status === 'Active' ? 'Inactive' : 'Active'; save(); render(); toast(p.name + ' ' + p.status.toLowerCase()); },
  'toggle-mkt': el => { const m = S.markets.find(x => x.id === el.dataset.id); m.active = !m.active; save(); render(); toast(m.name + (m.active ? ' activated' : ' deactivated')); },

  /* workflow builder */
  'wf-sel': el => { UI.wfSel = +el.dataset.i; render(); },
  'wf-set': el => { const s = UI.wfDraft.steps[UI.wfSel]; s[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'req' && el.dataset.v === 'approve') s.seniority = 'Senior'; render(); },
  'wf-add': el => { const i = +el.dataset.i; const ref = UI.wfDraft.steps[i - 1] || UI.wfDraft.steps[i]; UI.wfDraft.steps.splice(i, 0, { id: uid('s'), fn: ref ? ref.fn : 'Medical', seniority: 'Junior', req: 'review' }); UI.wfSel = i; render(); toast('Step added — configure it on the right'); },
  'wf-del': () => { if (UI.wfDraft.steps.length <= 1) return; UI.wfDraft.steps.splice(UI.wfSel, 1); UI.wfSel = Math.max(0, UI.wfSel - 1); render(); },
  'wf-move': el => { const i = UI.wfSel, j = i + +el.dataset.dir; const st = UI.wfDraft.steps; if (j < 0 || j >= st.length) return; [st[i], st[j]] = [st[j], st[i]]; UI.wfSel = j; render(); },
  'wf-discard': () => { UI.wfDraft = null; render(); },
  'wf-save': () => {
    const D = UI.wfDraft; const w = wfById(D.id); if (wfIssues(D).some(x => x[0] === 'bad')) return;
    const inflight = [...S.modules, ...S.assets].filter(o => o.review && o.review.wf === w.id);
    if (inflight.length) { const n = S.workflows.filter(x => x.id.startsWith(w.id + '@')).length + 1; const old = JSON.parse(JSON.stringify(w)); old.id = w.id + '@' + n; old.hidden = true; S.workflows.push(old); inflight.forEach(o => { o.review.wf = old.id; }); }
    w.steps = JSON.parse(JSON.stringify(D.steps)); w.name = D.name; log('Updated workflow', 'Workflow', w.id, 1, w.steps.map(stepLabel).join(' → ')); save(); UI.wfDraft = null; render(); toast('Workflow saved — applies to new submissions');
  },

  /* demo guide */
  'guide-go': el => {
    UI.guide = false; const i = +el.dataset.i; const s = guideSteps()[i]; const a = s[3]; const dm = S.demo.moduleId && modById(S.demo.moduleId); const da = S.demo.assetId && assetById(S.demo.assetId);
    const openReview = (obj, kind) => { const st = curStep(obj); const p = assigneeFor(st)[0]; if (p) { S.personaId = p.id; save(); go(kind === 'Asset' ? 'asset-review' : 'review', { id: obj.id }); toast('Now viewing as ' + p.name + ' · ' + roleLabel(p)); } };
    if (a.review != null) { if (!dm) { switchPersona('u-omar', 'module-new', null, true); toast('Create and submit a module first'); return; } if (dm.review) return openReview(dm, 'Module'); if (live(dm)) return switchPersona('u-omar', 'module', dm.id); return switchPersona('u-omar', 'module', dm.id); }
    if (a.newAsset) { switchPersona('u-karim', 'assets'); setTimeout(() => ACT['asset-new']({ dataset: {} }), 0); return; }
    if (a.assetReview) { if (!da) { toast('Create and submit an asset first (step 9)'); return; } if (da.review) return openReview(da, 'Asset'); return switchPersona('u-karim', da.status === 'Approved' ? 'asset' : 'assemble', da.id); }
    if (a.version) { const m = modById('MOD-A-014'); if (m.review) return openReview(m, 'Module'); if (impactedAssets(m).length && latest(m).status === 'Approved') { S.personaId = 'u-omar'; save(); go('module', { id: m.id, tab: 'lifecycle' }); return; } return switchPersona('u-omar', 'module', m.id); }
    if (a.flag === 'sawLibraryAfter' && (!dm || !live(dm))) toast('Tip: the new module appears here once Senior Regulatory approves it');
    switchPersona(a.persona, a.route, a.id);
  }
};

/* ===== Event wiring ===== */
document.addEventListener('click', ev => {
  const actEl = ev.target.closest('[data-act]'); const goEl = ev.target.closest('[data-go]');
  if (UI.pop && !ev.target.closest('.pop') && !ev.target.closest('[data-pop]') && !ev.target.closest('.search')) { UI.pop = null; if (!actEl && !goEl) { render(); return; } }
  if (UI.search && !ev.target.closest('.search')) { UI.search = ''; if (!actEl && !goEl) { render(); return; } }
  if (actEl && (!goEl || actEl.contains(goEl) === false || actEl === goEl || goEl.contains(actEl))) {
    const fn = ACT[actEl.dataset.act]; if (fn) { if (actEl.dataset.act !== 'modal-bg') ev.preventDefault(); fn(actEl, ev); return; }
  }
  if (goEl) { ev.preventDefault(); const p = {}; if (goEl.dataset.id) p.id = goEl.dataset.id; if (goEl.dataset.tab) p.tab = goEl.dataset.tab; if (goEl.dataset.status) { UI.f.mstat = goEl.dataset.status === 'Approved' ? '' : goEl.dataset.status; } go(goEl.dataset.go, p); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { if (UI.modal) { UI.modal = null; render(); } else if (UI.pop || UI.search) { UI.pop = null; UI.search = ''; render(); } else if (UI.guide) { UI.guide = false; render(); } }
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('tr.click')) ev.target.click();
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'global-search') { UI.search = t.value; render(); return; }
  if (t.id === 'rv-comment') { UI.f.rvc = t.value; return; }
  if (t.dataset.filter && t.tagName === 'INPUT') { UI.f[t.dataset.filter] = t.value; render(); return; }
  if (t.dataset.d && t.tagName !== 'SELECT') { UI.draft[t.dataset.d] = t.value; if (t.dataset.d === 'body' || t.dataset.d === 'title') renderSoon(); return; }
  if (t.dataset.u && t.tagName !== 'SELECT') { UI.udraft[t.dataset.u] = t.value; return; }
  if (t.dataset.an && t.tagName !== 'SELECT') { UI.modal.d[t.dataset.an] = t.value; return; }
  if (t.dataset.assetProp && t.tagName === 'INPUT') { const a = assetById(t.dataset.id); a[t.dataset.assetProp] = t.value; save(); return; }
});
let rsT = null; function renderSoon() { clearTimeout(rsT); rsT = setTimeout(render, 250); }
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.filter && t.tagName === 'SELECT') { UI.f[t.dataset.filter] = t.value; render(); return; }
  const textual = (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'date' && t.type !== 'checkbox'));
  if (textual && (t.dataset.d || t.dataset.u || t.dataset.an || t.dataset.assetProp)) return;
  if (t.dataset.d) { UI.draft[t.dataset.d] = t.value; if (t.dataset.d === 'product') { UI.draft.indication = ''; UI.draft.refs = UI.draft.refs.filter(r => r.includes('-' + t.value.slice(-1) + '-')); } render(); return; }
  if (t.dataset.actChange === 'd-addref' && t.value) { UI.draft.refs.push(t.value); render(); return; }
  if (t.dataset.actChange === 'sign-att') { UI.modal.att = t.checked; UI.modal.err = null; render(); return; }
  if (t.dataset.u) { UI.udraft[t.dataset.u] = t.value; render(); return; }
  if (t.dataset.an) { const D = UI.modal.d; D[t.dataset.an] = t.value; if (t.dataset.an === 'type') { const mt = S.materialTypes.find(x => x.name === t.value); D.channel = mt.channel; D.name = t.value + ' — ' + (D.name.split('—')[1] || '').trim(); } if (t.dataset.an === 'product') D.audience = t.value === 'P-B' ? 'HCP – Pulmonologists' : 'HCP – Cardiologists'; render(); return; }
  if (t.dataset.assetProp) { const a = assetById(t.dataset.id); a[t.dataset.assetProp] = t.value; save(); render(); return; }
  if (t.dataset.wf) { UI.wfDraft.steps[UI.wfSel][t.dataset.wf] = t.value; render(); return; }
});
document.addEventListener('submit', ev => {
  ev.preventDefault(); const f = ev.target.dataset.form;
  if (f === 'login') {
    const email = ev.target.email.value.trim().toLowerCase(); UI.f.loginEmail = email; const x = S.users.find(u => u.email.toLowerCase() === email);
    if (!email || !ev.target.password.value) { UI.f.loginErr = 'Enter your email and password.'; render(); return; }
    if (!x) { UI.f.loginErr = 'No account uses that email. Try one of the demo accounts below.'; render(); return; }
    if (x.status !== 'Active') { UI.f.loginErr = 'This account is inactive. Ask an administrator to reactivate it.'; render(); return; }
    S.personaId = x.id; S.signedIn = true; UI.f.loginErr = null; save(); go('home'); toast('Signed in as ' + x.name + ' · ' + roleLabel(x));
  }
  if (f === 'forgot') { const e = ev.target.email.value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { UI.f.forgotErr = 'Enter a valid email address.'; render(); return; } UI.f.forgotErr = null; UI.f.resetSent = e; render(); }
  if (f === 'module') saveModuleForm();
  if (f === 'user') saveUserForm();
});

function saveModuleForm() {
  const D = UI.draft; D.tried = true; const E = validateDraft(D);
  if (Object.keys(E).length) { render(); const first = document.querySelector('.invalid, .err'); first && first.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  const p = UI.route.p; const base = { title: D.title.trim(), type: D.type, product: D.product, indication: D.indication, audience: D.audience, markets: [...D.markets], channels: [...D.channels], reviewDate: fromISO(D.reviewDate), expiry: fromISO(D.expiry), updatedAt: Date.now() };
  if (p.id && p.newVersion) {
    const m = modById(p.id); Object.assign(m, base); const nv = Math.max(...m.versions.map(v => v.v)) + 1; m.versions.push({ v: nv, body: D.body.trim(), refs: [...D.refs], status: 'Draft' }); m.cur = nv;
    log('Created version ' + nv, 'Module', m.id, nv); save(); UI.draft = null; go('module', { id: m.id }); toast('Version ' + nv + ' created — v' + live(m).v + ' stays live until v' + nv + ' is approved'); return;
  }
  if (p.id) { const m = modById(p.id); Object.assign(m, base); const l = latest(m); l.body = D.body.trim(); l.refs = [...D.refs]; if (l.status === 'Rejected') l.status = 'Draft'; log('Edited module', 'Module', m.id, l.v); save(); UI.draft = null; go('module', { id: m.id }); toast('Changes saved'); return; }
  const id = nextModuleId(D.product);
  const m = { id, ...base, owner: S.personaId, versions: [{ v: 1, body: D.body.trim(), refs: [...D.refs], status: 'Draft' }], cur: 1, createdAt: Date.now(), review: null, changes: null };
  S.modules.push(m); S.demo.moduleId = id; log('Created module (draft)', 'Module', id, 1); save(); UI.draft = null; go('module', { id }); toast('Draft saved — ' + id);
}
function saveUserForm() {
  const D = UI.udraft; const editId = UI.route.p.id; D.tried = true; if (Object.keys(validateUser(D, editId)).length) { render(); return; }
  const data = { name: D.name.trim(), email: D.email.trim(), type: D.type, seniority: D.type === 'Administrator' ? null : D.seniority, team: D.team, status: D.status };
  if (editId) { const x = S.users.find(u => u.id === editId); Object.assign(x, data); log('Updated user', 'User', x.id, 1, roleLabel(x)); save(); UI.udraft = null; go('user', { id: x.id }); toast('User updated'); return; }
  const x = { id: uid('u'), ...data }; S.users.push(x); log('Created user', 'User', x.id, 1, roleLabel(x)); save(); UI.udraft = null; go('user', { id: x.id }); toast('Invitation sent to ' + x.email);
}

render();

/* ---------- Drag and drop: modules → asset canvas, block reorder, workflow step reorder ---------- */
const DND = { src: null, idx: null };
function dndZone(ev) {
  if (!DND.src) return null;
  if (!ev.target.closest) return null;
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
      const m = modById(src.module); if (!m || !live(m) || a.blocks.some(b => b.moduleId === m.id)) return;
      a.blocks.splice(to, 0, { id: uid('b'), kind: 'module', moduleId: m.id, v: live(m).v }); toast('Added ' + m.type + ' · ' + m.id + ' v' + live(m).v);
    } else { const [x] = a.blocks.splice(src.i, 1); if (src.i < to) to--; a.blocks.splice(to, 0, x); }
    save();
  }
  render();
});
document.addEventListener('dragend', () => { DND.src = null; DND.idx = null; dndClear(); document.body.classList.remove('is-dragging', 'drag-mod', 'drag-blk', 'drag-step'); document.querySelectorAll('.dragging').forEach(e => e.classList.remove('dragging')); });
