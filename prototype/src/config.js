/* ---------- Configuration: one source of truth for every configurable list ----------
   Each entry describes a collection in S, its fields, where it is used and who manages it.
   Lists, detail pages, the editor, activation, deletion and audit entries are generated from it,
   so every dropdown, filter and form in the product reads the same records. */
const asWorkflows = kind => S.workflows.filter(w => !w.hidden && w.appliesTo === kind).map(w => [w.id, w.name + (w.active === false ? ' (inactive)' : '')]);
const useRow = (route, id, label, extra, k) => ({ route, id, label, extra: extra || '', k });
const CONFIG = {
  products: { label: 'Product', plural: 'Products', icon: 'pill', perm: 'manage_settings', coll: () => S.products, prefix: 'P',
    sub: 'Products and their indications. Modules, assets and Validation SOPs reference products by id, so a rename shows everywhere.',
    fields: [['name', 'Product name', 'text', { req: true, ph: 'e.g. Product D' }], ['area', 'Therapy area', 'text', { req: true, ph: 'e.g. Oncology' }], ['indications', 'Indications', 'list', { req: true, hint: 'Comma separated. Offered when a module selects this product.' }]],
    cols: [['Therapy area', x => esc(x.area)], ['Indications', x => x.indications.map(i => `<span class="tag">${esc(i)}</span>`).join(' ')]],
    usage: x => [['Modules', S.modules.filter(m => m.products.includes(x.id) || m.versions.some(v => v.meta && v.meta.products.includes(x.id))).map(m => useRow('module', m.id, m.title, m.id))], ['Assets', S.assets.filter(a => a.products.includes(x.id)).map(a => useRow('asset', a.id, a.name, a.id))], ['Validation SOPs', S.sops.filter(s => s.scope.products.includes(x.id)).map(s => useRow('sops', null, s.name, s.id))]] },
  markets: { label: 'Country', plural: 'Countries', icon: 'globe', perm: 'manage_settings', coll: () => S.markets, codeId: true,
    sub: 'Countries content can be approved for. Asset eligibility checks every asset country against each module’s approved countries.',
    fields: [['name', 'Country', 'text', { req: true, ph: 'e.g. Qatar' }], ['id', 'Country code', 'code', { req: true, ph: 'e.g. QA', createOnly: true, hint: 'Two or three letters. Used as the short label everywhere and cannot change later.' }], ['authority', 'Health authority', 'text', { ph: 'e.g. MOPH Qatar' }], ['lang', 'Languages', 'text', { ph: 'e.g. Arabic, English' }]],
    cols: [['Code', x => `<span class="tag">${esc(x.id)}</span>`], ['Health authority', x => esc(x.authority || '—')], ['Languages', x => esc(x.lang || '—')]],
    usage: x => [['Modules', S.modules.filter(m => m.markets.includes(x.id)).map(m => useRow('module', m.id, m.title, m.id))], ['Assets', S.assets.filter(a => a.markets.includes(x.id)).map(a => useRow('asset', a.id, a.name, a.id))], ['Validation SOPs', S.sops.filter(s => s.scope.markets.includes(x.id)).map(s => useRow('sops', null, s.name, s.id))]] },
  moduletypes: { label: 'Module type', plural: 'Module Types', icon: 'type', perm: 'manage_settings', coll: () => S.moduleTypes, prefix: 'TY',
    sub: 'The kinds of module content owners can create. A type flagged as a safety statement satisfies the “Safety statement included” SOP in assets.',
    fields: [['name', 'Name', 'text', { req: true, ph: 'e.g. Dosing Statement' }], ['desc', 'Description', 'text', { req: true, ph: 'Shown when choosing the type' }], ['icon', 'Icon', 'select', { options: () => TYPE_ICONS.map(i => [i, i]) }], ['tone', 'Colour', 'select', { options: () => TONES }], ['safety', 'Counts as a safety statement', 'bool', { hint: 'Used by the safety-statement Validation SOP for assets.' }]],
    cols: [['Type', x => `<div class="row nowrap" style="gap:8px">${typeIco(x.id)}<span>${esc(x.desc)}</span></div>`], ['Safety statement', x => x.safety ? '<span class="chip ok">Yes</span>' : '<span class="muted">—</span>']],
    usage: x => [['Modules', S.modules.filter(m => m.type === x.id).map(m => useRow('module', m.id, m.title, m.id))], ['Validation SOPs', S.sops.filter(s => s.scope.types.includes(x.id)).map(s => useRow('sops', null, s.name, s.id))]] },
  materials: { label: 'Material type', plural: 'Material Types', icon: 'file', perm: 'manage_settings', coll: () => S.materialTypes, prefix: 'MT',
    sub: 'Asset types, their default channel and the workflow used when an asset contains new text.',
    fields: [['name', 'Material type', 'text', { req: true, ph: 'e.g. Congress poster' }], ['channel', 'Default channel', 'select', { req: true, options: () => activeOf(S.channels).map(c => [c.id, c.name]) }], ['workflow', 'Workflow for new content', 'select', { req: true, options: () => asWorkflows('Asset'), hint: 'Assets made only of approved modules use the streamlined workflow set in Settings.' }]],
    cols: [['Default channel', x => esc(chan(x.channel).name)], ['Workflow (new content)', x => esc((wfById(x.workflow) || {}).name || '—')]],
    usage: x => [['Assets', S.assets.filter(a => a.type === x.id).map(a => useRow('asset', a.id, a.name, a.id))], ['Validation SOPs', S.sops.filter(s => s.scope.types.includes(x.id)).map(s => useRow('sops', null, s.name, s.id))]] },
  channels: { label: 'Channel', plural: 'Channels', icon: 'send', perm: 'manage_settings', coll: () => S.channels, prefix: 'CH',
    sub: 'Where content is used. A module can be used in an asset only if it is approved for the asset’s channel.',
    fields: [['name', 'Channel name', 'text', { req: true, ph: 'e.g. Congress' }]],
    cols: [],
    usage: x => [['Modules', S.modules.filter(m => m.channels.includes(x.id)).map(m => useRow('module', m.id, m.title, m.id))], ['Assets', S.assets.filter(a => a.channel === x.id).map(a => useRow('asset', a.id, a.name, a.id))], ['Material types', S.materialTypes.filter(t => t.channel === x.id).map(t => useRow('item', t.id, t.name, '', 'materials'))]] },
  audiences: { label: 'Audience', plural: 'Audiences', icon: 'users', perm: 'manage_settings', coll: () => S.audiences, prefix: 'AU',
    sub: 'The audiences modules and assets are written for.',
    fields: [['name', 'Audience', 'text', { req: true, ph: 'e.g. HCP – Oncologists' }]],
    cols: [],
    usage: x => [['Modules', S.modules.filter(m => m.audience === x.id).map(m => useRow('module', m.id, m.title, m.id))], ['Assets', S.assets.filter(a => a.audience === x.id).map(a => useRow('asset', a.id, a.name, a.id))]] },
  references: { label: 'Reference', plural: 'References', icon: 'quote', perm: 'manage_library', viewPerm: 'view', coll: () => S.references, prefix: 'REF', nameKey: 'title',
    sub: 'The reference library. Modules cite these records; the evidence SOP counts clinical studies, registries and publications.',
    fields: [['title', 'Title', 'text', { req: true, ph: 'e.g. ALPHA-HF study — 36-month extension' }], ['source', 'Source', 'text', { req: true, ph: 'e.g. Clinical study report CSR-ALPHA-03, 2026' }], ['kind', 'Kind', 'select', { req: true, options: () => REF_KINDS }]],
    cols: [['Source', x => esc(x.source)], ['Kind', x => `<span class="tag">${esc(refKind(x.kind))}</span>`]],
    usage: x => [['Modules', S.modules.filter(m => m.versions.some(v => v.refs.includes(x.id))).map(m => useRow('module', m.id, m.title, m.versions.filter(v => v.refs.includes(x.id)).map(v => 'v' + v.v).join(', ')))]] },
  teams: { label: 'Team', plural: 'Teams', icon: 'team', perm: 'manage_users', coll: () => S.teams, prefix: 'T',
    sub: 'Teams group people by function. A workflow step can be limited to one team; otherwise any team of that function can act.',
    fields: [['name', 'Team name', 'text', { req: true, ph: 'e.g. Medical Affairs — Respiratory' }], ['fn', 'Function', 'select', { req: true, options: () => [...funcIds().map(f => [f, f]), ['Administrator', 'Administrator']] }]],
    cols: [['Function', x => `<div class="row nowrap" style="gap:6px">${fnBadge(x.fn === 'Administrator' ? 'Admin' : x.fn, 'sm')}${esc(x.fn)}</div>`], ['Members', x => { const mem = S.users.filter(u => u.team === x.id && u.status === 'Active'); return `${mem.filter(u => u.level === 'Lead').length} Lead · ${mem.filter(u => u.level === 'Member').length} Member${isAdmin({ fn: x.fn }) ? ' · ' + mem.length + ' admin' : ''}`; }]],
    usage: x => [['Users', S.users.filter(u => u.team === x.id).map(u => useRow('user', u.id, u.name, roleLabel(u) + (u.status !== 'Active' ? ' · inactive' : '')))], ['Workflow steps', S.workflows.filter(w => !w.hidden && w.steps.some(s => s.team === x.id)).map(w => useRow('workflow', w.id, w.name))]],
    blockDeactivate: x => S.users.some(u => u.team === x.id && u.status === 'Active') ? 'Move its active members to another team first.' : '' },
  functions: { label: 'Function', plural: 'Functions', icon: 'shieldcheck', perm: 'manage_users', coll: () => S.functions, codeId: true, nameKey: 'id',
    sub: 'Functions are the departments people work in. Each function has a Team Member and a Team Lead role in Roles & Permissions. Review functions can be used as workflow steps.',
    fields: [['id', 'Function name', 'code', { req: true, ph: 'e.g. Pharmacovigilance', createOnly: true, hint: 'The name is the function key and cannot change later.' }], ['desc', 'Description', 'text', { req: true, ph: 'e.g. Safety review of promotional content' }], ['reviews', 'Takes part in MLR review', 'bool', { hint: 'Review functions appear as workflow steps and in approval reports.' }]],
    cols: [['Description', x => esc(x.desc)], ['Review function', x => x.reviews ? '<span class="chip ok">Yes</span>' : '<span class="muted">—</span>'], ['People', x => S.users.filter(u => u.fn === x.id && u.status === 'Active').length]],
    usage: x => [['Users', S.users.filter(u => u.fn === x.id).map(u => useRow('user', u.id, u.name, roleLabel(u)))], ['Teams', S.teams.filter(t => t.fn === x.id).map(t => useRow('item', t.id, t.name, '', 'teams'))], ['Workflows', S.workflows.filter(w => !w.hidden && w.steps.some(s => s.fn === x.id)).map(w => useRow('workflow', w.id, w.name))]],
    blockDeactivate: x => S.users.some(u => u.fn === x.id && u.status === 'Active') ? 'Change the role of its active users first.' : S.workflows.some(w => !w.hidden && w.active !== false && w.steps.some(s => s.fn === x.id)) ? 'Remove it from active workflows first.' : '' }
};
const cfgName = (k, x) => x[CONFIG[k].nameKey || 'name'];
const cfgUsage = (k, x) => CONFIG[k].usage(x);
const cfgUseCount = (k, x) => cfgUsage(k, x).reduce((n, g) => n + g[1].length, 0);
const canManageCfg = k => can(me(), CONFIG[k].perm);

function viewConfig(k) {
  const C = CONFIG[k]; const q = F('cq-' + k).toLowerCase(); const st = F('cs-' + k); const manage = canManageCfg(k);
  const rows = C.coll().filter(x => (!q || JSON.stringify(x).toLowerCase().includes(q)) && (!st || (st === 'Active') === !!x.active));
  return pageHead(C.plural, C.sub, manage ? btn('Add ' + C.label.toLowerCase(), 'cfg-new', 'primary', `data-k="${k}"`, 'plus') : '') +
  `<div class="toolbar">${searchBox('cq-' + k, F('cq-' + k), 'Search ' + C.plural.toLowerCase())}${sel('cs-' + k, st, ['Active', 'Inactive'], 'Any status')}<span class="muted" style="margin-left:auto">${rows.length} of ${C.coll().length}</span></div>
  <section class="panel table-wrap">${rows.length ? `<table class="tbl list-tbl"><thead><tr><th>${esc(C.label)}</th>${C.cols.map(c => `<th>${c[0]}</th>`).join('')}<th>Used by</th><th>Status</th>${manage ? '<th style="text-align:right">Actions</th>' : ''}</tr></thead><tbody>${rows.map(x => { const n = cfgUseCount(k, x);
    return `<tr class="click" ${goAttr('item', x.id, ` data-k="${k}"`)} tabindex="0"><td><div class="title">${esc(cfgName(k, x))}</div>${C.codeId && k !== 'functions' ? '' : `<span class="mono muted">${esc(x.id)}</span>`}</td>${C.cols.map(c => `<td>${c[1](x)}</td>`).join('')}<td class="num">${n ? n + ' item' + (n > 1 ? 's' : '') : '<span class="muted">Not used</span>'}</td><td>${chip(x.active ? 'Active' : 'Inactive')}</td>${manage ? `<td style="text-align:right"><div class="row nowrap" style="justify-content:flex-end;gap:6px"><button class="btn sm ghost" data-act="cfg-edit" data-k="${k}" data-id="${esc(x.id)}">${icon('edit', 'sm')}Edit</button><button class="btn sm" data-act="cfg-toggle" data-k="${k}" data-id="${esc(x.id)}">${x.active ? 'Deactivate' : 'Activate'}</button></div></td>` : ''}</tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>No ${C.plural.toLowerCase()} match</h4><p>${manage ? 'Add one with the button above.' : 'Clear the search.'}</p></div>`}</section>`;
}
function cfgFieldVal(k, f, x) {
  const v = x[f[0]];
  if (f[2] === 'list') return (v || []).map(i => `<span class="tag">${esc(i)}</span>`).join(' ') || '—';
  if (f[2] === 'bool') return v ? 'Yes' : 'No';
  if (f[2] === 'select') { const o = (f[3].options() || []).find(o => o[0] === v); if (k === 'materials' && f[0] === 'channel') return esc(chan(v).name); if (k === 'materials' && f[0] === 'workflow') return esc((wfById(v) || {}).name || v); if (f[0] === 'icon') return typeIco(x.id) + ' ' + esc(v); return esc(o ? o[1] : v); }
  return esc(v || '—');
}
function viewConfigItem() {
  const k = UI.route.p.k; const C = CONFIG[k]; if (!C) return viewMissing('Item');
  const x = C.coll().find(i => i.id === UI.route.p.id); if (!x) return viewMissing(C.label);
  const manage = canManageCfg(k); const use = cfgUsage(k, x); const n = use.reduce((s, g) => s + g[1].length, 0);
  const hist = S.audit.filter(e => e.objType === C.label && e.objId === x.id);
  return pageHead(esc(cfgName(k, x)), `<span class="row" style="gap:8px">${chip(x.active ? 'Active' : 'Inactive')}<span class="mono">${esc(x.id)}</span><span class="muted">·</span>${esc(C.label)}</span>`, manage ? `${btn('Edit', 'cfg-edit', '', `data-k="${k}" data-id="${esc(x.id)}"`, 'edit')}${btn(x.active ? 'Deactivate' : 'Activate', 'cfg-toggle', x.active ? '' : 'primary', `data-k="${k}" data-id="${esc(x.id)}"`)}${n ? '' : btn('Delete', 'cfg-delete', 'danger', `data-k="${k}" data-id="${esc(x.id)}"`, 'trash')}` : '', [[C.plural, k], [cfgName(k, x)]]) +
  (!x.active ? `<div class="banner" style="margin-bottom:16px">${icon('lock')}<div class="txt"><b>Inactive</b><p>Not offered when creating or editing content. The ${n} existing item${n === 1 ? '' : 's'} that use it keep it.</p></div></div>` : '') +
  `<div class="grid cols-main"><div class="stack"><section class="panel"><div class="panel-head"><h3>Details</h3></div><div class="panel-body"><dl class="kv">${C.fields.map(f => `<dt>${esc(f[1])}</dt><dd>${cfgFieldVal(k, f, x)}</dd>`).join('')}</dl></div></section>
  ${use.map(([title, list]) => `<section class="panel"><div class="panel-head"><h3>${esc(title)}</h3><span class="chip plain">${list.length}</span></div>${list.length ? list.slice(0, 50).map(r => `<button class="task" ${r.route === 'item' ? goAttr('item', r.id, ` data-k="${r.k}"`) : goAttr(r.route, r.id)}><span class="body"><b>${esc(r.label)}</b>${r.extra ? `<span>${esc(r.extra)}</span>` : ''}</span>${icon('chevron', 'sm')}</button>`).join('') : '<div class="empty" style="padding:18px"><p>Not used yet.</p></div>'}</section>`).join('')}</div>
  <section class="panel"><div class="panel-head"><h3>Change history</h3></div><div class="panel-body">${hist.length ? `<div class="timeline">${[...hist].reverse().map(e => `<div class="tl-item"><div class="tl-ico">${icon('edit', 'sm')}</div><div style="min-width:0"><div style="font-size:13px"><b>${esc(e.action)}</b>${e.note ? ' · ' + esc(e.note) : ''}</div>${e.prev || e.next ? `<div class="muted" style="font-size:12px">${esc(e.prev || '—')} → ${esc(e.next || '—')}</div>` : ''}<span class="muted" style="font-size:11.5px">${esc(user(e.user).name)} · ${fmtDT(e.ts)}</span></div></div>`).join('')}</div>` : '<p class="muted">No changes recorded since the workspace was set up.</p>'}</div></section></div>`;
}
function cfgModal(M) {
  const C = CONFIG[M.k]; const D = M.d; const E = M.errs || {};
  return modalShell(C.icon, '', (M.id ? 'Edit ' : 'Add ') + C.label.toLowerCase(), M.id ? `<span class="mono">${esc(M.id)}</span> · changes apply everywhere this ${C.label.toLowerCase()} is used.` : 'It becomes available in every form, filter and report that uses ' + C.plural.toLowerCase() + '.',
    C.fields.filter(f => !(f[3].createOnly && M.id)).map(f => { const id = 'cf-' + f[0]; const o = f[3]; const er = E[f[0]] ? `<span class="err">${esc(E[f[0]])}</span>` : ''; const hint = o.hint ? `<span class="hint">${esc(o.hint)}</span>` : '';
      if (f[2] === 'bool') return `<div class="set-row"><div><b>${esc(f[1])}</b>${o.hint ? `<span class="muted">${esc(o.hint)}</span>` : ''}</div>${toggleBtn(!!D[f[0]], 'cfg-bool', `data-f="${f[0]}"`, f[1])}</div>`;
      if (f[2] === 'select') return `<div class="field"><label for="${id}">${esc(f[1])}</label><select class="select ${E[f[0]] ? 'invalid' : ''}" id="${id}" data-cfg="${f[0]}">${o.req ? '' : opt('', D[f[0]], '—')}${o.options().map(x => opt(x[0], D[f[0]], x[1])).join('')}</select>${hint}${er}</div>`;
      return `<div class="field"><label for="${id}">${esc(f[1])}</label><input class="input ${E[f[0]] ? 'invalid' : ''}" id="${id}" data-cfg="${f[0]}" value="${esc(f[2] === 'list' ? (D[f[0]] || []).join(', ') : D[f[0]] || '')}" placeholder="${esc(o.ph || '')}">${hint}${er}</div>`; }).join(''),
    `${btn('Cancel', 'modal-close')}${btn(M.id ? 'Save changes' : 'Add ' + C.label.toLowerCase(), 'cfg-save', 'primary', '', 'check')}`);
}
function cfgSave() {
  const M = UI.modal; const C = CONFIG[M.k]; const D = M.d; const list = C.coll(); const errs = {};
  document.querySelectorAll('[data-cfg]').forEach(el => { D[el.dataset.cfg] = el.value; });
  C.fields.forEach(f => { if (f[2] === 'list' && typeof D[f[0]] === 'string') D[f[0]] = D[f[0]].split(',').map(x => x.trim()).filter(Boolean); if (typeof D[f[0]] === 'string') D[f[0]] = D[f[0]].trim(); });
  C.fields.forEach(f => { if (f[3].createOnly && M.id) return; const v = D[f[0]]; if (f[3].req && (Array.isArray(v) ? !v.length : !v)) errs[f[0]] = 'Required.'; });
  const nk = C.nameKey || 'name';
  if (D[nk] && list.some(x => x.id !== M.id && String(cfgName(M.k, x)).toLowerCase() === String(D[nk]).toLowerCase())) errs[nk] = 'Another ' + C.label.toLowerCase() + ' already uses this name.';
  if (C.codeId && !M.id) { if (M.k === 'markets') D.id = String(D.id || '').toUpperCase(); if (M.k === 'markets' && D.id && !/^[A-Z]{2,3}$/.test(D.id)) errs.id = 'Use two or three letters.'; if (list.some(x => x.id.toLowerCase() === String(D.id).toLowerCase())) errs.id = 'This code is already used.'; }
  if (Object.keys(errs).length) { M.errs = errs; render(); return; }
  const show = (f, v) => f[2] === 'list' ? (v || []).join(', ') : f[2] === 'bool' ? (v ? 'Yes' : 'No') : f[2] === 'select' ? cfgFieldVal(M.k, f, { [f[0]]: v, id: '' }).replace(/<[^>]+>/g, '').trim() : String(v == null ? '' : v);
  if (M.id) {
    const x = list.find(i => i.id === M.id); let n = 0;
    C.fields.forEach(f => { if (f[3].createOnly) return; const a = show(f, x[f[0]]), b = show(f, D[f[0]]); if (a !== b) { log(C.label + ' updated', C.label, { id: x.id }, 1, { note: f[1], prev: a, next: b }); n++; } x[f[0]] = Array.isArray(D[f[0]]) ? [...D[f[0]]] : D[f[0]]; });
    UI.modal = null; save(); render(); toast(n ? C.label + ' updated — shown everywhere it is used' : 'No changes');
  } else {
    const x = { active: true }; C.fields.forEach(f => { x[f[0]] = Array.isArray(D[f[0]]) ? [...D[f[0]]] : f[2] === 'bool' ? !!D[f[0]] : D[f[0]]; });
    if (!C.codeId) { const short = M.k === 'products' ? String(x.name).replace(/^product\s+/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) : ''; x.id = short && !list.some(i => i.id === C.prefix + '-' + short) ? C.prefix + '-' + short : C.prefix + '-' + Date.now().toString(36).slice(-5).toUpperCase(); }
    list.push(x);
    if (M.k === 'functions') LEVELS.forEach(l => { S.roles[x.id + '-' + l] = x.reviews ? ['view', 'review', 'request_amend', ...(l === 'Lead' ? ['approve', 'final_approve', 'reject'] : [])] : ['view']; });
    log(C.label + ' created', C.label, { id: x.id }, 1, { next: cfgName(M.k, x) });
    UI.modal = null; save();
    if (M.then) { M.then(x); return; }
    render(); toast(C.label + ' added');
  }
}
function cfgToggle(k, id) {
  const C = CONFIG[k]; const x = C.coll().find(i => i.id === id);
  if (x.active && C.blockDeactivate) { const why = C.blockDeactivate(x); if (why) { toast('Cannot deactivate: ' + why); return; } }
  x.active = !x.active; log(C.label + (x.active ? ' activated' : ' deactivated'), C.label, { id: x.id }, 1, { note: cfgName(k, x), prev: x.active ? 'Inactive' : 'Active', next: x.active ? 'Active' : 'Inactive' });
  save(); render(); toast(cfgName(k, x) + (x.active ? ' activated' : ' deactivated'));
}
function cfgDelete(k, id) {
  const C = CONFIG[k]; const list = C.coll(); const i = list.findIndex(x => x.id === id); const x = list[i];
  if (cfgUseCount(k, x)) { toast('It is in use — deactivate it instead'); return; }
  list.splice(i, 1); if (k === 'functions') LEVELS.forEach(l => delete S.roles[x.id + '-' + l]);
  log(C.label + ' deleted', C.label, { id }, 1, { prev: cfgName(k, x) }); save(); go(k); toast(C.label + ' deleted');
}
