/* ---------- Views: workspace ---------- */
const LOGO = '__LOGO__';
const goAttr = (name, id, extra = '') => `data-go="${name}"${id ? ` data-id="${esc(id)}"` : ''}${extra}`;
const crumbs = list => `<nav class="crumbs" aria-label="Breadcrumb">${list.map((c, i) => i === list.length - 1 ? `<span class="cur">${esc(c[0])}</span>` : `<button ${goAttr(c[1], c[2], c[3] || '')}>${esc(c[0])}</button>${icon('chevron', 'sm')}`).join('')}</nav>`;
const pageHead = (title, sub, actions = '', cr = null) => `<header class="page-head"><div class="titles">${cr ? crumbs(cr) : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</header>`;
const btn = (label, act, cls = '', attrs = '', ic = '') => `<button class="btn ${cls}" data-act="${act}" ${attrs}>${ic ? icon(ic, 'sm') : ''}${esc(label)}</button>`;
const goBtn = (label, name, id, cls = '', ic = '', extra = '') => `<button class="btn ${cls}" ${goAttr(name, id, extra)}>${ic ? icon(ic, 'sm') : ''}${esc(label)}</button>`;
const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(label == null ? v : label)}</option>`;
const sel = (key, cur, options, allLabel) => `<select aria-label="${esc(allLabel)}" data-filter="${key}">${opt('', cur, allLabel)}${options.map(o => Array.isArray(o) ? opt(o[0], cur, o[1]) : opt(o, cur)).join('')}</select>`;
const searchBox = (key, cur, ph) => `<div class="field-inline">${icon('search', 'sm')}<input type="search" id="f-${key}" data-filter="${key}" value="${esc(cur || '')}" placeholder="${esc(ph)}" aria-label="${esc(ph)}"></div>`;
const F = (k, def = '') => UI.f[k] == null ? def : UI.f[k];
const vtag = v => `<span class="tag">v${v}</span>`;
const userCell = id => { const u = user(id); return `<div class="row nowrap user-cell">${avatar(u, 'sm')}<span>${esc(u.name)}</span></div>`; };
/* Filter popup: a page lists its filters with fsearch / fsel / fdate; filterBar shows one Filter button,
   the active filters as removable chips and the result count. The popup edits a draft and applies it at once. */
const FMARK = x => '\u0001' + JSON.stringify(x) + '\u0002';
const fsearch = (k, cur, ph) => FMARK({ t: 'q', k, label: 'Search', ph });
const FLABEL = { 'All products': 'Product', 'All countries': 'Country', 'All material types': 'Material type', 'All statuses': 'Status', 'All actions': 'Action', 'All objects': 'Object', 'All users': 'User', 'All functions': 'Function', 'Any level': 'Level', 'Any status': 'Status', 'All categories': 'Category', 'All module types': 'Module type', 'All audiences': 'Audience', 'All channels': 'Channel', 'Any approval date': 'Approval date', 'Any version': 'Version', 'Any expiry / review': 'Expiry / review date', 'All valid statuses': 'Status', 'Modules and assets': 'Item type', 'All owners': 'Owner', 'All workflows': 'Workflow', 'Any time': 'Updated', 'All review steps': 'Review step', 'Any priority': 'Priority' };
const fsel = (k, cur, options, all, label, def) => FMARK({ t: 's', k, all, def: def || '', label: label || FLABEL[all] || String(all || '').replace(/^(All|Any) /, '').replace(/^./, c => c.toUpperCase()), o: options.map(o => Array.isArray(o) ? [String(o[0]), String(o[1])] : [String(o), String(o)]) });
const fdate = (k, label) => FMARK({ t: 'd', k, label });
const FILTERS = {};
const fActive = d => F(d.k) && F(d.k) !== d.def;
function fShow(d) { const v = F(d.k); if (d.t === 's') { const o = d.o.find(x => x[0] === v); return o ? o[1] : v; } if (d.t === 'd') return fmtD(fromISO(v)); return '“' + v + '”'; }
function filterBar(id, spec, count) {
  const defs = String(spec).split('\u0001').slice(1).map(x => JSON.parse(x.split('\u0002')[0])); FILTERS[id] = defs;
  const act = defs.filter(fActive);
  return `<div class="toolbar fbar"><button type="button" class="btn sm fbtn ${act.length ? 'on' : ''}" data-act="flt-open" data-id="${id}" aria-haspopup="dialog">${icon('filter', 'sm')}Filter${act.length ? `<span class="fb-n">· ${act.length} active</span>` : ''}</button>${act.map(d => `<span class="fchip"><span class="muted">${esc(d.label)}:</span> ${esc(fShow(d))}<button type="button" data-act="flt-rm" data-k="${esc(d.k)}" data-def="${esc(d.def)}" aria-label="Remove ${esc(d.label)} filter">${icon('x', 'sm')}</button></span>`).join('')}${act.length > 1 ? `<button type="button" class="btn ghost sm" data-act="flt-clear" data-id="${id}">Clear all</button>` : ''}<span class="muted fcount">${count || ''}</span></div>`;
}
function filterModal(M) {
  const defs = FILTERS[M.id] || []; const D = M.d;
  const field = d => { const id = 'fd-' + d.k;
    if (d.t === 'q') return `<div class="field span2"><label for="${id}">Search</label><div class="field-inline">${icon('search', 'sm')}<input type="search" id="${id}" data-fd="${esc(d.k)}" value="${esc(D[d.k] || '')}" placeholder="${esc(d.ph || 'Search')}"></div></div>`;
    if (d.t === 'd') return `<div class="field"><label for="${id}">${esc(d.label)}</label><input class="input" type="date" id="${id}" data-fd="${esc(d.k)}" value="${esc(D[d.k] || '')}"></div>`;
    return `<div class="field"><label for="${id}">${esc(d.label)}</label><select class="select" id="${id}" data-fd="${esc(d.k)}">${d.all ? opt('', D[d.k], d.all) : ''}${d.o.map(o => opt(o[0], D[d.k] || d.def, o[1])).join('')}</select></div>`; };
  const n = defs.filter(d => D[d.k] && D[d.k] !== d.def).length;
  return modalShell('filter', '', 'Filter', n ? n + ' filter' + (n > 1 ? 's' : '') + ' selected' : 'Narrow the list. Nothing changes until you apply.', `<div class="fgrid flt-grid">${defs.map(field).join('')}</div>`,
    `<button class="btn ghost" data-act="flt-reset">Clear all</button><span class="grow"></span>${btn('Cancel', 'modal-close')}${btn('Apply filters', 'flt-apply', 'primary', '', 'check')}`);
}
const clearBtn = keys => keys.some(k => F(k)) ? btn('Clear filters', 'clear-filters', 'ghost sm', `data-keys="${keys.join(',')}"`) : '';
// Clickable status strip above a list: [label, count, tone, sub, filterKey, filterValue]
function statStrip(items) {
  return `<div class="kpis strip">${items.map(it => { const on = it[4] && F(it[4]) === it[5]; return `<button class="kpi ${on ? 'on' : ''}" ${it[4] === 'go' ? goAttr(it[5]) : it[4] ? `data-act="toggle-f" data-k="${it[4]}" data-v="${esc(it[5])}" aria-pressed="${on}"` : ''}><span class="k-label">${it[2] ? `<span class="k-dot ${it[2]}"></span>` : ''}${it[0]}</span><b>${it[1]}</b>${it[3] ? `<span class="k-sub">${it[3]}</span>` : ''}</button>`; }).join('')}</div>`;
}
// Multi-select as toggle chips. act = data-act handler, k = draft key.
function multi(act, k, options, selected, extra = '') {
  return `<div class="choices">${options.map(([v, label]) => { const on = selected.includes(v); return `<button type="button" class="choice ${on ? 'on' : ''}" data-act="${act}" data-k="${k}" data-v="${esc(v)}" aria-pressed="${on}" ${extra}><span class="box">${on ? icon('check', 'sm') : ''}</span>${esc(label)}</button>`; }).join('')}</div>`;
}
// Searchable multi-select with chips: [ Product A × ] [ Product B × ] [ + Select ].
// options come from the managed collections; act/k/extra are the toggle handler used by the owning form.
function chipSelect(id, act, k, options, selected, opts = {}) {
  const open = UI.msel === id; const q = open ? (UI.mselq || '').toLowerCase() : ''; const label = o => (options.find(x => x[0] === o) || [o, o])[1]; const ex = opts.extra || '';
  const list = options.filter(o => !q || o[1].toLowerCase().includes(q));
  return `<div class="msel ${open ? 'open' : ''} ${opts.invalid ? 'invalid' : ''}" data-msel="${id}"><div class="msel-box">${selected.map(v => `<span class="mchip">${esc(label(v))}<button type="button" data-act="${act}" data-k="${k}" data-v="${esc(v)}" ${ex} aria-label="Remove ${esc(label(v))}">${icon('x', 'sm')}</button></span>`).join('')}<button type="button" class="msel-add" data-act="msel-open" data-id="${id}" aria-expanded="${open}">${icon('plus', 'sm')}${selected.length ? 'Select' : esc(opts.ph || 'Select')}</button></div>
  ${open ? `<div class="msel-pop" role="listbox" aria-multiselectable="true"><div class="field-inline msel-search">${icon('search', 'sm')}<input type="search" id="mselq-${id}" data-mselq="1" value="${esc(UI.mselq || '')}" placeholder="Search ${esc(opts.noun || '')}" aria-label="Search ${esc(opts.noun || '')}" autocomplete="off"></div><div class="msel-list">${list.map(([v, l, sub]) => { const on = selected.includes(v); return `<button type="button" class="msel-opt ${on ? 'on' : ''}" role="option" aria-selected="${on}" data-act="${act}" data-k="${k}" data-v="${esc(v)}" ${ex}><span class="box">${on ? icon('check', 'sm') : ''}</span><span class="ml">${esc(l)}</span>${sub ? `<span class="muted">${esc(sub)}</span>` : ''}</button>`; }).join('') || '<div class="muted" style="padding:10px 12px;font-size:12.5px">No matches</div>'}</div><div class="msel-foot"><span class="muted">${selected.length} selected</span>${opts.manage && can(me(), 'manage_settings') ? `<button type="button" class="linklike" ${goAttr(opts.manage)}>Manage ${esc(opts.noun || '')}</button>` : ''}<button type="button" class="btn sm" data-act="msel-close">Done</button></div></div>` : ''}</div>`;
}
function validationPanel(obj, kind, title = 'Validation check') {
  const res = validate(obj, kind); const bad = res.filter(x => !x.ok);
  return `<section class="panel"><div class="panel-head"><h3>${title}</h3><span class="grow"></span>${res.length ? (bad.length ? `<span class="chip bad has-ico">${icon('x', 'sm')}${bad.length} issue${bad.length > 1 ? 's' : ''}</span>` : `<span class="chip ok has-ico">${icon('check', 'sm')}Passed</span>`) : ''}</div><div class="panel-body stack" style="gap:8px">
    ${res.length ? res.map(x => `<div class="sop-row ${x.ok ? 'ok' : 'bad'}"><span class="sop-ico">${icon(x.ok ? 'check' : 'alert', 'sm')}</span><div><b>${esc(x.label)}</b>${x.ok ? '' : `<span>${esc(x.issue)} ${esc(x.sop.guidance || '')}</span>`}</div></div>`).join('') : '<p class="muted">No Validation SOP applies.</p>'}
    <p class="muted" style="font-size:11.5px">Checked against the active Validation SOPs.${isAdmin(me()) ? ` <button class="linklike" ${goAttr('sops')}>Manage SOPs</button>` : ''}</p></div></section>`;
}

const modText = m => { const l = latest(m); const md = l.media; return (m.title + ' ' + m.id + ' ' + l.body + ' ' + mtype(m.type).name + (md ? ' ' + md.name + ' ' + (md.source || '') + ' ' + (md.usage || '') : '')).toLowerCase(); };

/* ===== Shell ===== */
// Navigation: [route, label, icon, counter, permission, class]. A group label shows when any item in it is visible.
const ADMIN_VIEW = 'page_admin';
const NAV = [
  ['WORKSPACE'], ['home', 'Home', 'home'], ['modules', 'Modules', 'grid', 'mods', 'page_modules', 'primary'], ['tasks', 'My Tasks', 'inbox', 'tasks', 'page_tasks'], ['assets', 'Assets', 'layers', null, 'page_assets'], ['library', 'Approved Library', 'book', null, 'page_library'],
  ['INSIGHTS'], ['reports', 'Reports', 'chart', null, 'view_reports'],
  ['GOVERNANCE'], ['lifecycle', 'Lifecycle', 'clock', null, 'view_audit'], ['audit', 'Audit Trail', 'history', null, 'view_audit'], ['sops', 'Validation SOPs', 'clipboard', null, ['manage_sops', ADMIN_VIEW]], ['workflows', 'Workflows', 'workflow', null, ['manage_workflows', ADMIN_VIEW]], ['references', 'References', 'quote', null, 'view_audit'],
  ['ADMINISTRATION'], ['users', 'Users', 'users', null, ['manage_users', ADMIN_VIEW]], ['roles', 'Roles & Permissions', 'key', null, ['manage_users', ADMIN_VIEW]], ['functions', 'Functions', 'shieldcheck', null, ['manage_users', ADMIN_VIEW]], ['teams', 'Teams', 'team', null, ['manage_users', ADMIN_VIEW]],
  ['CONFIGURATION'], ['products', 'Products', 'pill', null, ['manage_settings', ADMIN_VIEW]], ['markets', 'Countries', 'globe', null, ['manage_settings', ADMIN_VIEW]], ['moduletypes', 'Module Types', 'type', null, ['manage_settings', ADMIN_VIEW]], ['materials', 'Material Types', 'file', null, ['manage_settings', ADMIN_VIEW]], ['channels', 'Channels', 'send', null, ['manage_settings', ADMIN_VIEW]], ['audiences', 'Audiences', 'users', null, ['manage_settings', ADMIN_VIEW]], ['settings', 'Settings', 'settings', null, 'manage_settings']
];
const NAV_OF = { module: 'modules', 'module-new': 'modules', 'module-edit': 'modules', review: 'tasks', 'asset-review': 'tasks', approvals: 'tasks', assemble: 'assets', asset: 'assets', user: 'users', 'user-new': 'users', 'user-edit': 'users', workflow: 'workflows', 'workflow-new': 'workflows', cover: 'library' };
const ROUTE_PERM = { modules: 'page_modules', module: 'view', 'module-new': 'create', 'module-edit': 'edit', review: 'view', tasks: 'page_tasks', approvals: 'page_tasks', assets: 'page_assets', asset: 'view', assemble: 'edit', 'asset-review': 'view', library: 'page_library', cover: 'view', references: 'view_audit', reports: 'view_reports', lifecycle: 'view_audit', audit: 'view_audit', sops: ['manage_sops', ADMIN_VIEW], workflows: ['manage_workflows', ADMIN_VIEW], workflow: ['manage_workflows', ADMIN_VIEW], 'workflow-new': 'manage_workflows', users: ['manage_users', ADMIN_VIEW], user: ['manage_users', ADMIN_VIEW], 'user-new': 'manage_users', 'user-edit': 'manage_users', roles: ['manage_users', ADMIN_VIEW], functions: ['manage_users', ADMIN_VIEW], teams: ['manage_users', ADMIN_VIEW], products: ['manage_settings', ADMIN_VIEW], markets: ['manage_settings', ADMIN_VIEW], moduletypes: ['manage_settings', ADMIN_VIEW], materials: ['manage_settings', ADMIN_VIEW], channels: ['manage_settings', ADMIN_VIEW], audiences: ['manage_settings', ADMIN_VIEW], settings: 'manage_settings' };

function viewShell(inner) {
  const u = me(); const active = UI.route.name === 'item' ? UI.route.p.k : NAV_OF[UI.route.name] || UI.route.name; const nTasks = tasksFor(u).length;
  const nav = NAV.map((n, i) => {
    if (n.length === 1) { const items = []; for (let j = i + 1; j < NAV.length && NAV[j].length > 1; j++) items.push(NAV[j]); return items.some(x => !x[4] || can(u, x[4])) ? `<div class="nav-label">${n[0]}</div>` : ''; }
    if (n[4] && !can(u, n[4])) return '';
    const count = n[3] === 'tasks' && nTasks ? nTasks : n[3] === 'mods' ? S.modules.filter(m => !m.archived).length : 0;
    return `<button class="nav-item ${active === n[0] ? 'active' : ''} ${n[5] || ''}" title="${n[1]}" ${goAttr(n[0])} ${active === n[0] ? 'aria-current="page"' : ''}>${icon(n[2])}<span>${n[1] === 'Approved Library' ? '<span class="lbl-full">Approved </span>Library' : n[1]}</span>${count ? `<span class="count">${count}</span>` : ''}</button>`;
  }).join('');
  return `<div class="shell">
  <aside class="side" aria-label="Main navigation">
    <button class="brand" ${goAttr('home')} aria-label="SAJA MedLR home"><img src="${LOGO}" alt="SAJA"></button>
    ${nav}
    <div class="spacer"></div>
    <div class="side-user">${avatar(u)}<div style="min-width:0"><b style="font-size:13px;display:block">${esc(u.name)}</b><span class="muted" style="font-size:11.5px">${esc(roleLabel(u))}</span></div></div>
  </aside>
  <div class="main">${viewTopbar(u)}<main class="content" id="content">${inner}</main></div>
  </div>`;
}
function viewTopbar(u) {
  const notifs = notificationsFor(u); const unread = notifs.some(n => n.ts > (S.notifSeen || 0));
  return `<header class="topbar">
    <div class="search" id="gsearch">${icon('search', 'sm')}<input id="global-search" type="search" placeholder="Search modules, assets, people…" value="${esc(UI.search)}" aria-label="Search" autocomplete="off">${UI.search ? viewSearchPop() : ''}</div>
    <div class="grow"></div>
    <div class="rel"><button class="btn icon" data-act="pop" data-pop="bell" aria-label="Notifications">${icon('bell')}${unread ? '<span class="bell-dot"></span>' : ''}</button>${UI.pop === 'bell' ? viewNotifPop(notifs) : ''}</div>
    <div class="rel"><button class="userbtn" data-act="pop" data-pop="user" aria-label="Account menu">${avatar(u)}<span class="meta"><b>${esc(u.name)}</b><span>${esc(roleLabel(u))}</span></span>${icon('down', 'sm')}</button>${UI.pop === 'user' ? `<div class="pop" role="menu" style="width:260px"><div class="pop-id">${avatar(u)}<span><b>${esc(u.name)}</b><span>${esc(u.email)}</span></span></div>${can(u, 'manage_users') ? `<button class="pop-item" role="menuitem" ${goAttr('user', u.id)}>${icon('users', 'sm')}My profile</button>` : ''}${can(u, 'manage_settings') ? `<button class="pop-item" role="menuitem" ${goAttr('settings')}>${icon('settings', 'sm')}Settings</button>` : ''}<button class="pop-item" data-act="logout" role="menuitem">${icon('logout', 'sm')}Sign out</button></div>` : ''}</div>
  </header>`;
}
function notificationsFor(u) {
  const admin = isAdmin(u); const mine = new Set();
  [...S.modules, ...S.assets].forEach(o => { if (o.owner === u.id || (o.review && canActOn(u, o))) mine.add(o.id); });
  return S.audit.filter(e => e.user !== u.id && ((e.toIds || []).includes(u.id) || (admin ? /approv|amend|reject|submitted|resubmitted/i.test(e.action) && !e.auto : mine.has(e.objId) && !e.auto))).sort((a, b) => b.ts - a.ts).slice(0, 8);
}
function viewNotifPop(list) {
  return `<div class="pop" role="menu"><div class="grp">Notifications</div>${list.length ? list.map(e => { const x = user(e.user); return `<button class="pop-item" ${goAttr(e.objType === 'Asset' ? 'asset' : e.objType === 'Module' ? 'module' : 'audit', e.objType === 'Asset' || e.objType === 'Module' ? e.objId : null)} role="menuitem">${avatar(x, 'sm')}<span style="flex:1;min-width:0;font-size:12.5px"><b>${esc(x.name)}</b> <span class="muted">${esc(e.role || '')}</span><br>${esc(e.action)} · ${esc(e.objId)}<br><span class="muted">${ago(e.ts)}</span></span></button>`; }).join('') : '<div class="empty" style="padding:20px">No notifications yet.</div>'}</div>`;
}
function viewSearchPop() {
  const q = UI.search.toLowerCase(); const cv = can(me(), 'view');
  const mods = !cv ? [] : S.modules.filter(m => modText(m).includes(q)).slice(0, 6);
  const as = S.assets.filter(a => (a.name + ' ' + a.id).toLowerCase().includes(q)).slice(0, 4);
  const us = S.users.filter(x => (x.name + ' ' + roleLabel(x)).toLowerCase().includes(q)).slice(0, 4);
  if (!mods.length && !as.length && !us.length) return `<div class="search-pop"><div class="empty" style="padding:18px">No results for “${esc(UI.search)}”.</div></div>`;
  return `<div class="search-pop">${mods.length ? `<div class="grp">Modules</div>${mods.map(m => `<button ${goAttr('module', m.id)}>${modThumb(m)}<span style="flex:1;min-width:0"><b style="font-size:13px">${esc(m.title)}</b><br><span class="mono muted">${m.id} · v${latest(m).v}</span></span>${chip(lifeStatus(m))}</button>`).join('')}` : ''}
  ${as.length ? `<div class="grp">Assets</div>${as.map(a => `<button ${goAttr('asset', a.id)}><span class="type-ico">${icon('layers', 'sm')}</span><span style="flex:1"><b style="font-size:13px">${esc(a.name)}</b><br><span class="mono muted">${a.id}</span></span>${chip(statusOf(a))}</button>`).join('')}` : ''}
  ${us.length && can(me(), 'manage_users') ? `<div class="grp">People</div>${us.map(x => `<button ${goAttr('user', x.id)}>${avatar(x, 'sm')}<span style="flex:1"><b style="font-size:13px">${esc(x.name)}</b><br><span class="muted" style="font-size:12px">${esc(roleLabel(x))}</span></span></button>`).join('')}` : ''}</div>`;
}

/* ===== Sign in ===== */
function viewLogin() {
  const err = UI.f.loginErr;
  return `<div class="login-page"><div class="login">
  <section class="login-brand">
    <img class="login-logo" src="${LOGO}" alt="SAJA">
    <div class="login-hero"><span class="eyebrow">MedLR · Medical, Legal &amp; Regulatory review</span><h1>Create once.<br><em>Approve once.</em><br>Reuse safely.</h1>
    <p class="lede">Every module is reviewed by Medical, Legal and Regulatory, approved once, and reused in every material where it is approved for the product, country and channel.</p></div>
    <figure class="doc" aria-hidden="true">
      <div class="doc-sheet">
        <div class="doc-top"><span class="mono">Module · v2</span><span class="doc-tag">Approved content</span></div>
        <p class="doc-claim">One approved statement, reused in every eligible material.<sup>1</sup></p>
        <p class="doc-ref"><sup>1</sup> Reference attached and evidence verified.</p>
        <ul class="doc-sign">${reviewFuncs().map((x, i) => `<li style="--d:${0.55 + i * 0.28}s"><span class="tick">${icon('check', 'sm')}</span>${fnBadge(x, 'sm')}<b>${x}</b><span>Lead approval</span></li>`).join('')}</ul>
      </div>
      <div class="stamp"><span class="s-top">Approved</span><b>MLR</b><span class="s-bot mono">e-signed</span></div>
    </figure>
  </section>
  <section class="login-form">
    ${UI.route.name === 'forgot' ? viewForgot() : `<form class="login-card" data-form="login" novalidate>
      <div class="login-title"><h2>Sign in</h2><p class="ink2">Use your SAJA work email.</p></div>
      ${err ? `<div class="banner bad" role="alert">${icon('alert')}<div class="txt"><b>${esc(err)}</b></div></div>` : ''}
      <div class="field"><label for="login-email">Work email</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" value="${esc(F('loginEmail', 'ali.usama@saja.com'))}" required></div>
      <div class="field"><div class="row between"><label for="login-pass">Password</label><button type="button" class="btn ghost sm" ${goAttr('forgot')}>Forgot password?</button></div><input class="input" id="login-pass" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn primary" type="submit" style="height:46px">Sign in</button>
      <p class="muted" style="font-size:12px;text-align:center">Access is managed by your SAJA MedLR administrator.</p>
    </form>`}
  </section></div><p class="login-legal">© ${new Date().getFullYear()} ${esc(S.settings.orgName)} · SAJA MedLR</p></div>`;
}
function viewForgot() {
  if (UI.f.resetSent) return `<div class="login-card"><div class="m-ico">${icon('mail')}</div><h2>Check your email</h2><p class="ink2">If an account exists for <b>${esc(UI.f.resetSent)}</b>, we have sent a link to reset your password. The link expires in 30 minutes.</p><button class="btn primary" ${goAttr('login')} style="height:44px">Back to sign in</button></div>`;
  return `<form class="login-card" data-form="forgot" novalidate><button type="button" class="btn ghost sm" ${goAttr('login')} style="justify-self:start">${icon('back', 'sm')}Back to sign in</button><div class="stack" style="gap:6px"><h2>Reset your password</h2><p class="ink2">Enter your work email and we will send you a reset link.</p></div>
  ${UI.f.forgotErr ? `<div class="field"><span class="err">${esc(UI.f.forgotErr)}</span></div>` : ''}
  <div class="field"><label for="forgot-email">Work email</label><input class="input" id="forgot-email" name="email" type="email" placeholder="name@saja.com" required></div><button class="btn primary" type="submit" style="height:44px">Send reset link</button></form>`;
}

/* ===== Home — a personal workspace that adapts to the role ===== */
function avgStepDays(filterFn, sinceDays = 90) { const t = stepTimes(allCycles().filter(c => (c.end || Date.now()) > Date.now() - sinceDays * DAY)).filter(filterFn); return t.length ? avg(t.map(x => x.ms)) : 0; }
function moduleRow(m) { return `<button class="task" ${goAttr('module', m.id)}>${typeIco(m.type)}<span class="body"><b>${esc(m.title)}</b><span><span class="mono">${m.id} · v${latest(m).v}</span> · ${esc(productsTxt(m.products))} · ${esc(m.markets.join(', '))} · ${ago(m.updatedAt)}</span></span>${chip(lifeStatus(m))}${icon('chevron', 'sm')}</button>`; }
function homeList(title, items, empty, more) { return `<section class="panel"><div class="panel-head"><h3>${title}</h3><span class="chip plain">${items.length}</span><span class="grow"></span>${more || ''}</div>${items.length ? items.slice(0, 5).join('') : `<div class="empty"><p>${empty}</p></div>`}</section>`; }
/* Home: a personal workspace. Every figure is computed from the current workspace and links to where it comes from.
   Admin sees system-wide numbers; reviewers see all content they review; content owners see their team's content. */
const TASK_GROUPS = [['review', 'Pending review', 'Waiting for a reviewer at the current step'], ['amend', 'Amendment requested', 'Back with the owner; resumes at the same step'], ['submit', 'Awaiting submission', 'Prepared, not yet in a cycle'], ['rejected', 'Rejected', 'Needs a new version (full cycle)']];
const taskGroup = t => t.kind === 'draft' ? 'submit' : t.kind;
function taskTarget(t) { const isA = t.type === 'Asset'; return t.kind === 'review' ? (isA ? 'asset-review' : 'review') : (isA ? (t.kind === 'amend' || t.kind === 'draft' ? 'assemble' : 'asset') : 'module'); }
// Everything a task row shows, from the item, its workflow and the settings.
function taskInfo(t) {
  const o = t.obj; const wait = Date.now() - t.since; const sla = (S.settings.reviewSlaDays || 3) * DAY;
  const priority = t.kind === 'review' ? (wait > sla ? 'High' : wait > sla / 2 ? 'Medium' : 'Normal') : t.kind === 'rejected' || t.kind === 'amend' ? (wait > sla ? 'High' : 'Medium') : 'Normal';
  let step, responsible, action;
  if (t.kind === 'watch') { step = stepLabel(t.step); responsible = assigneeFor(t.step).map(x => x.name).join(', ') || 'No active ' + stepWho(t.step); action = 'With reviewer'; }
  else if (t.kind === 'review') { step = stepLabel(t.step); responsible = assigneeFor(t.step).map(x => x.name).join(', ') || 'No active ' + stepWho(t.step); action = t.step.req === 'approve' ? (isFinalStep(wfById(o.review.wf), o.review.step) ? 'Final approval' : 'Approve') : 'Review'; }
  else if (t.kind === 'amend') { step = 'Amendment · resumes at ' + (o.resume ? o.resume.fn + ' ' + levelName(o.resume.level) : 'the same step'); responsible = user(o.owner).name; action = 'Amend & resubmit'; }
  else if (t.kind === 'submit') { step = 'Awaiting Lead submission'; responsible = user(o.owner).name; action = 'Submit for review'; }
  else if (t.kind === 'rejected') { step = 'Rejected · cycle closed'; responsible = user(o.owner).name; action = 'Create new version'; }
  else { step = 'Draft · not submitted'; responsible = user(o.owner).name; action = 'Complete & submit'; }
  return { step, responsible, action, priority, wait, typeName: t.type === 'Asset' ? mat(o.type).name : mtype(o.type).name };
}
const PRIO_TONE = { High: 'bad', Medium: 'warn', Normal: 'dim' };
function homeScope(u) {
  if (isAdmin(u)) return { label: 'System-wide', f: () => true };
  if (fnInfo(u.fn).reviews) return { label: 'All content in MLR review', f: () => true };
  return { label: 'Your team’s content', f: o => sameTeam(u, o) || (!!o.blocks && o.blocks.some(b => b.moduleId && sameTeam(u, modById(b.moduleId)))) };
}
function viewHome() {
  const u = me(); const tasks = tasksFor(u); const a = authority(u.fn, u.level); const first = u.name.split(' ')[0]; const admin = isAdmin(u);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sc = homeScope(u); const mods = S.modules.filter(sc.f); const assets = can(u, 'page_assets') ? S.assets.filter(sc.f) : []; const seeAssets = can(u, 'page_assets');
  const ls = m => lifeStatus(m); const libOk = m => ['Approved', 'Active', 'Expiring'].includes(libraryStatus(m) || '');
  const mIn = mods.filter(m => m.review), mDraft = mods.filter(m => ['Draft', 'Awaiting Lead submission'].includes(statusOf(m))), mAmend = mods.filter(m => statusOf(m) === 'Amendment Requested');
  const aAmend = assets.filter(x => statusOf(x) === 'Amendment Requested'); const mLive = mods.filter(libOk); const mExp = mods.filter(m => libraryStatus(m) === 'Expiring');
  // metric strip
  const M = (label, val, tone, sub, go) => `<button class="hm-m" ${go || 'disabled'}><span class="hm-l">${tone ? `<span class="k-dot ${tone}"></span>` : ''}${label}</span><b>${val}</b><span class="hm-s">${esc(sub)}</span></button>`;
  const metrics = [
    M('Total modules', mods.length, '', mods.filter(m => isMediaType(m.type)).length + ' media & documents', goAttr('modules', null, ' data-mstat=""')),
    M('Modules in review', mIn.length, mIn.length ? 'warn' : 'ok', mIn.length ? 'Oldest ' + ago(Math.min(...mIn.map(m => m.review.stepStartedAt))) : 'None waiting', goAttr('modules', null, ' data-mstat="In Review"')),
    can(u, 'page_tasks') && M('My tasks', tasks.length, tasks.length ? 'warn' : 'ok', tasks.filter(t => taskInfo(t).priority === 'High').length + ' high priority', goAttr('tasks')),
    M('Approved modules', mLive.length, 'ok', 'Live in the library', goAttr('modules', null, ' data-mstat="live"')),
    M('Draft modules', mDraft.length, 'dim', 'Not yet submitted', goAttr('modules', null, ' data-mstat="open"')),
    M('Amendment requests', mAmend.length + aAmend.length, mAmend.length + aAmend.length ? 'warn' : 'ok', mAmend.length + ' modules · ' + aAmend.length + ' assets', goAttr('modules', null, ' data-mstat="Amendment Requested"')),
    seeAssets && M('Assets in review', assets.filter(x => x.review).length, assets.some(x => x.review) ? 'warn' : 'ok', assets.length + ' assets in total', goAttr('assets', null, ' data-setf="astat=In Review"')),
    seeAssets && M('Approved assets', assets.filter(x => live(x)).length, 'ok', 'Have a live version', goAttr('assets', null, ' data-setf="astat=Approved"')),
    M('Expiring soon', mExp.length, mExp.length ? 'warn' : 'ok', 'Within ' + S.settings.expiryWarnDays + ' days', goAttr('modules', null, ' data-mstat="Expiring"')),
    (admin || can(u, ['manage_workflows', 'page_admin'])) && M('Active workflows', S.workflows.filter(w => !w.hidden && w.active !== false).length, '', S.workflows.filter(w => !w.hidden && w.active !== false && w.appliesTo === 'Module').length + ' module · ' + S.workflows.filter(w => !w.hidden && w.active !== false && w.appliesTo === 'Asset').length + ' asset', goAttr('workflows')),
    (admin || can(u, ['manage_users', 'page_admin'])) && M('Active users', S.users.filter(x => x.status === 'Active').length, '', S.functions.filter(f => f.active).length + ' functions', goAttr('users'))
  ].filter(Boolean);
  // My Tasks
  const byG = TASK_GROUPS.map(g => [g[0], g[1], tasks.filter(t => taskGroup(t) === g[0])]);
  // Nothing to act on: follow your own items that are with reviewers instead.
  const watching = tasks.length < 4 && !admin ? [...mods, ...assets].filter(o => o.review && !tasks.some(t => t.obj === o) && (fnInfo(u.fn).reviews ? curStep(o).fn === u.fn : sameTeam(u, o))).map(o => ({ kind: 'watch', obj: o, type: kindOf(o), title: nameOf(o), id: o.id, step: curStep(o), since: o.review.stepStartedAt })) : [];
  const tq = [...tasks].sort((x, y) => ({ High: 0, Medium: 1, Normal: 2 })[taskInfo(x).priority] - ({ High: 0, Medium: 1, Normal: 2 })[taskInfo(y).priority] || x.since - y.since).slice(0, 7).concat(watching.slice(0, 5 - Math.min(tasks.length, 4)));
  const taskBox = `<section class="panel hp span8 hm-tasks"><div class="panel-head"><h3>${icon('inbox', 'sm')} My Tasks</h3><span class="chip plain">${tasks.length}</span><span class="grow"></span>${can(u, 'page_tasks') ? goBtn('View all My Tasks', 'tasks', null, 'sm', 'chevron') : ''}</div>
    <div class="hm-tg">${byG.map(g => `<button class="hm-tgi ${g[2].length ? '' : 'zero'}" ${goAttr('tasks', null, ` data-tab="${g[0]}"`)}><b>${g[2].length}</b><span>${esc(g[1])}</span></button>`).join('')}</div>
    ${!tasks.length && watching.length ? `<div class="hm-note">${icon('check', 'sm')}Nothing needs your action right now.</div>` : ''}${tq.length ? `<table class="tbl compact no-pg hp-tbl hm-ttbl"><thead><tr><th>Item</th><th>Current step</th><th>Responsible</th><th style="text-align:right">Waiting</th><th>Required action</th></tr></thead><tbody>${tq.map(t => { const o = t.obj; const I = taskInfo(t);
      return `<tr class="click" ${goAttr(t.kind === 'watch' ? (t.type === 'Asset' ? 'asset' : 'module') : taskTarget(t), o.id)} tabindex="0"><td><div class="cell-title">${t.type === 'Asset' ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : modThumb(o, latest(o))}<div><div class="title">${esc(t.title)}</div><span class="muted hm-sub">${esc(t.type)} · ${esc(I.typeName)} · v${latest(o).v}</span></div></div></td><td><span class="hm-step">${t.step ? fnBadge(t.step.fn, 'sm') : ''}${esc(I.step)}</span></td><td class="hm-resp">${esc(I.responsible)}</td><td class="num nw" style="text-align:right"><span class="k-dot ${PRIO_TONE[I.priority]}" title="${I.priority} priority"></span> ${fmtDur(I.wait)}</td><td><span class="hm-act ${t.kind}">${esc(I.action)}</span></td></tr>`; }).map((r, i) => tq[i].kind === 'watch' && (i === 0 || tq[i - 1].kind !== 'watch') ? `<tr class="hm-div"><td colspan="5">${fnInfo(u.fn).reviews ? 'Also in ' + esc(u.fn) + ' review' : 'Your team’s items with reviewers'}</td></tr>` + r : r).join('')}</tbody></table>` : `<div class="empty" style="padding:22px"><p>Nothing needs your action. ${can(u, 'page_library') ? 'Browse the Approved Library for reusable content.' : ''}</p></div>`}</section>`;
  // Pipeline: Draft → In Review → Amendment → Approved → Expiring
  const stages = [['Draft', mDraft.length, 'dim', 'open', 'file'], ['In Review', mIn.length, 'warn', 'In Review', 'shieldcheck'], ['Amend&shy;ment', mAmend.length, 'warn', 'Amendment Requested', 'undo'], ['Approved', mLive.length, 'ok', 'live', 'check'], ['Expiring', mExp.length, mExp.length ? 'bad' : 'dim', 'Expiring', 'clock']];
  const inFn = reviewFuncs().map(fn => [fn, mIn.filter(m => curStep(m).fn === fn).length]);
  const pipe = `<section class="panel hp span4"><div class="panel-head"><h3>Approval pipeline</h3><span class="grow"></span><span class="muted" style="font-size:12px">Modules · ${esc(sc.label)}</span></div><div class="panel-body">
    <div class="pipe5">${stages.map(s => `<button class="p5 ${s[2]}" ${goAttr('modules', null, ` data-mstat="${s[3]}"`)} aria-label="${s[0].replace('&shy;', '')}: ${s[1]}"><span class="p5-i">${icon(s[4], 'sm')}</span><b>${s[1]}</b><span>${s[0]}</span></button>`).join('')}</div>
    <div class="hp-sub"><span class="section-title">In review now, by step</span>${hbars(inFn.map(([fn, n]) => [`${fnBadge(fn, 'sm')}${esc(fn)}`, n]), Math.max(1, ...inFn.map(x => x[1])), 's1')}</div></div></section>`;
  // Approval performance (last 90 days)
  const P = approvalStats(allCycles().filter(c => (c.end || Date.now()) > Date.now() - 90 * DAY && sc.f(c.obj)));
  const slowFn = [...P.fnAvg].sort((x, y) => y.avg - x.avg)[0];
  const outcome = [['Approved', P.done.length, 'ok'], ['Rejected', P.rej.length, 'bad'], ['In progress', P.n - P.closed, 'warn']];
  const perf = `<section class="panel hp span8"><div class="panel-head"><h3>Approval performance</h3><span class="grow"></span><span class="muted" style="font-size:12px">Last 90 days · ${P.n} cycles</span>${can(u, 'view_reports') ? goBtn('Reports', 'reports', null, 'ghost sm') : ''}</div><div class="panel-body hm-perf">
    <div class="hm-rates"><div><span>Average approval time</span><b>${durDays(P.avgApproval)}<small>days</small></b></div><div><span>Approval rate</span><b>${Math.round(100 * P.approvalRate)}<small>%</small></b></div><div><span>Amendment rate</span><b>${Math.round(100 * P.amendmentRate)}<small>%</small></b></div><div><span>Rejection rate</span><b>${Math.round(100 * P.rejectionRate)}<small>%</small></b></div>
      <div class="hm-out"><div class="sbar" role="img" aria-label="${outcome.map(o => o[0] + ' ' + o[1]).join(', ')}">${outcome.filter(o => o[1]).map(o => `<span class="${o[2]}" style="flex:${o[1]}" data-tip="${o[0]} · ${o[1]}"></span>`).join('')}</div><div class="hm-leg">${outcome.map(o => `<span><i class="k-dot ${o[2]}"></i>${o[0]} <b>${o[1]}</b></span>`).join('')}</div></div></div>
    <div class="hm-fn"><span class="section-title">Average review time per step · days</span>${hbars(P.fnAvg.map(x => [`${fnBadge(x.fn, 'sm')}${esc(x.fn)}`, x.avg, slowFn && x.fn === slowFn.fn ? 'o2' : 'o1']), Math.max(1, ...P.fnAvg.map(x => x.avg)), '', ms => durDays(ms) + 'd')}
      ${P.slow ? `<div class="hm-slow">${icon('alert', 'sm')}<span>Slowest step: <b>${esc(P.slow.fn)} ${esc(levelName(P.slow.level))} ${P.slow.level === 'Lead' ? 'approval' : 'review'}</b> · ${durDays(P.slow.avg)} days on average</span></div>` : ''}</div></div></section>`;
  // Recent activity
  const ACT_RX = /submitted|approv|review|comment|reply|amend|reject|created|version|resolved|uploaded|replaced|withdraw|reinstat/i;
  const acts = [...S.audit].filter(e => !e.auto && ['Module', 'Asset'].includes(e.objType) && ACT_RX.test(e.action) && (sc.f(objById(e.objType, e.objId) || {}) || e.user === u.id)).sort((x, y) => y.ts - x.ts).slice(0, 6);
  const actBox = `<section class="panel hp span4"><div class="panel-head"><h3>Recent activity</h3><span class="grow"></span>${can(u, 'view_audit') ? goBtn('Audit trail', 'audit', null, 'ghost sm') : ''}</div><div class="hp-acts">${acts.length ? acts.map(e => { const x = user(e.user); const o = objById(e.objType, e.objId); return `<button class="hp-act hm-ev" ${goAttr(e.objType === 'Asset' ? 'asset' : 'module', e.objId)}>${avatar(x, 'sm')}<span class="body"><span><b>${esc(x.name)}</b> <span class="ink2">${esc(e.action.toLowerCase())}</span></span><span class="hm-evo">${esc(o ? nameOf(o) : e.objId)} <span class="mono muted">v${e.version}</span></span><span class="muted">${fmtDT(e.ts)}</span></span><span class="k-dot ${toneOf(e.action) || 'dim'}"></span></button>`; }).join('') : '<p class="muted" style="padding:16px">No activity yet.</p>'}</div></section>`;
  // Recently approved (modules and assets) — opens the approved version
  const recent = [...mods.filter(m => live(m) && !m.archived).map(m => ['Module', m]), ...assets.filter(x => live(x)).map(x => ['Asset', x])].sort((x, y) => live(y[1]).approvedAt - live(x[1]).approvedAt).slice(0, 6);
  const recentBox = `<section class="panel hp span8"><div class="panel-head"><h3>Recently approved</h3><span class="grow"></span>${can(u, 'page_library') ? goBtn('Approved Library', 'library', null, 'ghost sm') : ''}</div>${recent.length ? `<table class="tbl compact no-pg hp-tbl"><thead><tr><th>Name</th><th>Type</th><th>Product</th><th>Country</th><th>Version</th><th style="text-align:right">Approved</th></tr></thead><tbody>${recent.map(([k, o]) => { const lv = live(o); const mt = k === 'Module' ? metaOf(o, lv) : o;
    return `<tr class="click" ${goAttr(k === 'Asset' ? 'asset' : 'module', o.id, ` data-v="${lv.v}"`)} tabindex="0"><td><div class="cell-title">${k === 'Asset' ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : modThumb(o, lv)}<div><div class="title">${esc(k === 'Module' ? mt.title || o.title : o.name)}</div><span class="mono muted">${o.id}</span></div></div></td><td style="font-size:12.5px">${esc(k === 'Module' ? mtype(mt.type || o.type).name : mat(o.type).name)}<br><span class="muted">${k}</span></td><td>${tagList(mt.products || o.products, 'p')}</td><td>${tagList(mt.markets || o.markets)}</td><td>${vtag(lv.v)}</td><td class="num nw" style="text-align:right">${fmtD(lv.approvedAt)}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty"><p>Nothing approved yet.</p></div>'}</section>`;
  // Expiry / review watch — most urgent first
  const watch = []; mods.filter(m => live(m) && !m.archived).forEach(m => { const mt = liveMeta(m); const de = mt.expiry ? daysTo(mt.expiry) : null, dr = mt.reviewDate ? daysTo(mt.reviewDate) : null;
    if (de != null && de < 0) watch.push([m, 'Expired', de, mt.expiry, 'bad']); else if (de != null && de <= 90) watch.push([m, 'Expiring', de, mt.expiry, de <= S.settings.expiryWarnDays ? 'warn' : '']);
    if (dr != null && dr <= 60 && !(de != null && de < 0)) watch.push([m, 'Review due', dr, mt.reviewDate, dr < 0 ? 'bad' : dr <= 30 ? 'warn' : '']); });
  watch.sort((x, y) => x[2] - y[2]);
  const wc = k => watch.filter(w => w[1] === k).length;
  const dueBox = `<section class="panel hp span4"><div class="panel-head"><h3>Expiry & review watch</h3><span class="grow"></span>${can(u, 'view_audit') ? goBtn('Lifecycle', 'lifecycle', null, 'ghost sm') : ''}</div><div class="hm-wc"><span class="bad"><b>${wc('Expired')}</b>Expired</span><span class="warn"><b>${wc('Expiring')}</b>Expiring ≤ 90d</span><span><b>${wc('Review due')}</b>Review ≤ 60d</span></div>${watch.length ? watch.slice(0, 6).map(([m, k, d, at, tone]) => `<button class="hp-row" ${goAttr('module', m.id, ' data-tab="lifecycle"')}><span class="hp-date ${tone}"><b>${Math.abs(d)}</b>${d < 0 ? 'days late' : 'days'}</span><span class="body"><b>${esc(liveMeta(m).title || m.title)}</b><span>${k} · ${fmtD(at)} · v${live(m).v}</span></span><span class="chip ${tone || 'plain'}">${k}</span></button>`).join('') : '<div class="empty" style="padding:22px"><p>Nothing expiring or due for review in the next 90 days.</p></div>'}</section>`;
  // Content overview
  const ov = (title, body) => `<div class="hm-ov"><span class="section-title">${title}</span>${body}</div>`;
  const tRows = S.moduleTypes.map(t => [esc(t.name), mods.filter(m => m.type === t.id).length, isMediaType(t.id) ? 'o2' : 's1']).filter(r => r[1]);
  const sRows = [['Draft', mDraft.length, 'dim'], ['In Review', mIn.length, 'warn'], ['Amendment', mAmend.length, 'warn'], ['Rejected', mods.filter(m => statusOf(m) === 'Rejected').length, 'bad'], ['Approved', mLive.length, 'ok'], ['Review required', mods.filter(m => libraryStatus(m) === 'Review Required').length, 'bad']];
  const pair = (rows) => { const mx = Math.max(1, ...rows.flatMap(r => [r[1], r[2]])); return `<div class="hm-pair">${rows.map(r => `<div class="hm-pr"><span class="hb-l">${esc(r[0])}</span><span class="hm-pb"><span class="hb-track"><span class="hb-bar o1" style="width:${100 * r[1] / mx}%" data-tip="${esc(r[0])} · ${r[1]} modules"></span></span>${seeAssets ? `<span class="hb-track"><span class="hb-bar o2" style="width:${100 * r[2] / mx}%" data-tip="${esc(r[0])} · ${r[2]} assets"></span></span>` : ''}</span><b class="hb-v">${r[1]}${seeAssets ? `<span class="muted"> · ${r[2]}</span>` : ''}</b></div>`).join('')}</div>`; };
  const legend = seeAssets ? `<div class="legend sm"><span><i class="o1"></i>Modules</span><span><i class="o2"></i>Assets</span></div>` : '';
  const reuse = {}; assets.forEach(x => uniq(x.blocks.filter(b => b.kind === 'module').map(b => b.moduleId)).forEach(id => { reuse[id] = (reuse[id] || 0) + 1; }));
  const top = Object.entries(reuse).filter(([id]) => modById(id)).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const statusBar = `<div class="sbar" role="img" aria-label="${sRows.map(s => s[0] + ' ' + s[1]).join(', ')}">${sRows.filter(s => s[1]).map(s => `<span class="${s[2]}" style="flex:${s[1]}" data-tip="${s[0]} · ${s[1]}"></span>`).join('')}</div>${hbars(sRows, Math.max(1, ...sRows.map(s => s[1])), '')}`;
  const overview = `<section class="panel hp span12"><div class="panel-head"><h3>Content overview</h3><span class="grow"></span><span class="muted" style="font-size:12px">${esc(sc.label)} · ${mods.length} modules${seeAssets ? ' · ' + assets.length + ' assets' : ''}</span></div><div class="hm-ovg">
    ${ov('Modules by type', hbars(tRows, Math.max(1, ...tRows.map(r => r[1])), ''))}
    ${ov('Modules by status', statusBar)}
    ${ov('Content by product' + legend, pair(S.products.filter(p => p.active).map(p => [p.name, mods.filter(m => m.products.includes(p.id)).length, assets.filter(x => x.products.includes(p.id)).length])))}
    ${ov('Content by country' + legend, pair(S.markets.filter(x => x.active).map(x => [x.name, mods.filter(m => m.markets.includes(x.id)).length, assets.filter(y => y.markets.includes(x.id)).length]).filter(r => r[1] || r[2])))}
    ${seeAssets ? ov('Assets by type', hbars(S.materialTypes.map(t => [esc(t.name), assets.filter(x => x.type === t.id).length, 'o2']).filter(r => r[1]), Math.max(1, ...S.materialTypes.map(t => assets.filter(x => x.type === t.id).length)), '')) : ''}
    ${seeAssets ? ov('Most reused modules · assets using each', top.length ? hbars(top.map(([id, n]) => [`<button class="linklike" ${goAttr('module', id)}>${esc(modById(id).title)}</button>`, n, 's1']), Math.max(1, ...top.map(x => x[1])), '') : '<p class="muted">No modules are used in assets yet.</p>') : ''}
  </div></section>`;
  const qa = [canCreateModule(u) && can(u, 'page_modules') && goBtn('Create module', 'module-new', null, 'primary', 'plus'), canCreateAsset(u) && seeAssets && btn('Create asset', 'asset-new', '', '', 'layers'), can(u, 'page_library') && goBtn('Approved Library', 'library', null, '', 'book')].filter(Boolean).join('');
  return `<div class="home hp-home hm">
  <header class="hp-head"><div><span class="eyebrow">${esc(today)}</span><h1>Welcome, ${esc(first)}</h1><div class="row ink2" style="gap:8px;font-size:13.5px">${esc(roleLabel(u))} <span class="muted">·</span> ${icon(a.final ? 'key' : 'eye', 'sm')} ${esc(a.short)} <span class="muted">·</span> <span class="muted">${esc(sc.label)}</span></div></div><div class="row hp-qa">${qa}</div></header>
  <div class="hm-strip" style="--n:${metrics.length}">${metrics.join('')}</div>
  <div class="hp-grid">${taskBox}${pipe}${perf}${dueBox}${recentBox}${actBox}${overview}</div></div>`;
}
function taskMeta(t) {
  if (t.kind === 'review') return esc(stepLabel(t.step)) + ' · waiting ' + fmtDur(Date.now() - t.since);
  if (t.kind === 'amend') return 'Amendment requested — resumes at ' + esc(t.obj.resume ? t.obj.resume.fn + ' ' + levelName(t.obj.resume.level) : 'the same step');
  if (t.kind === 'submit') return 'Prepared by a Member — ready to submit';
  if (t.kind === 'rejected') return 'Rejected — a new version restarts the full cycle';
  if (t.kind === 'draft') return 'Draft — not yet submitted';
  return '';
}
function viewTaskRow(t) {
  const isA = t.type === 'Asset';
  const target = t.kind === 'review' ? (isA ? 'asset-review' : 'review') : (isA ? (t.kind === 'amend' || t.kind === 'draft' ? 'assemble' : 'asset') : 'module');
  const tag = t.kind === 'review' ? lvl(t.step.level) : chip(statusOf(t.obj));
  return `<button class="task" ${goAttr(target, t.id)}>${isA ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : typeIco(t.obj.type)}<span class="body"><b>${esc(t.title)}</b><span><span class="mono">${t.id} · v${latest(t.obj).v}</span> · ${taskMeta(t)}</span></span>${tag}${icon('chevron', 'sm')}</button>`;
}
function viewTimeline(list, compact) {
  if (!list.length) return '<p class="muted">No activity yet.</p>';
  return `<div class="timeline">${list.map(e => { const x = user(e.user); const tone = toneOf(e.action); const link = e.objType === 'Asset' ? 'asset' : e.objType === 'Module' ? 'module' : null;
    return `<div class="tl-item"><div class="tl-ico ${tone === 'dim' ? '' : tone}">${icon(tone === 'ok' ? 'check' : tone === 'bad' ? 'x' : tone === 'warn' ? 'undo' : 'file', 'sm')}</div><div style="min-width:0"><div class="row" style="gap:6px"><b style="font-size:13px">${esc(x.name)}</b><span class="muted" style="font-size:12px">${esc(e.role || roleLabel(x))}</span></div><div style="font-size:13px"><b>${esc(e.action)}</b> · ${link ? `<button class="btn ghost sm" style="height:auto;padding:0 2px" ${goAttr(link, e.objId)}>${esc(e.objId)}</button>` : esc(e.objId)}${e.objType === 'Module' || e.objType === 'Asset' ? ' · v' + e.version : ''}</div>${e.note && !compact ? `<p class="ink2" style="font-size:12.5px;margin-top:2px">${esc(e.note)}</p>` : ''}<span class="muted" style="font-size:11.5px">${fmtDT(e.ts)}</span></div></div>`; }).join('')}</div>`;
}

/* ===== Modules ===== */
// Statuses are states of the approval engine, not configurable data.
const MOD_STATUSES = ['Draft', 'Awaiting Lead submission', 'In Review', 'Amendment Requested', 'Rejected', 'Approved', 'Active', 'Expiring', 'Review Required', 'Archived'];
function viewModules() {
  const u = me(); const q = F('mq').toLowerCase(); const ls = m => lifeStatus(m);
  const rows = S.modules.filter(m => (!q || modText(m).includes(q)) && (!F('mcat') || (F('mcat') === 'media') === isMediaType(m.type)) && (!F('mprod') || m.products.includes(F('mprod'))) && (!F('mtype') || m.type === F('mtype')) && (!F('mmkt') || m.markets.includes(F('mmkt'))) && (!F('mstat') || ls(m) === F('mstat') || (F('mstat') === 'live' && ['Approved', 'Active'].includes(ls(m))) || (F('mstat') === 'open' && ['Draft', 'Awaiting Lead submission'].includes(ls(m))) || (F('mstat') === 'issues' && ['Draft', 'Awaiting Lead submission', 'Amendment Requested', 'In Review'].includes(ls(m)) && validationIssues(m, 'Module').length)) && (!F('maud') || m.audience === F('maud')) && (!F('mch') || m.channels.includes(F('mch'))) && (!F('mown') || m.owner === F('mown')) && (!F('mwf') || (lastWf(m) || {}).id === F('mwf')) && (!F('mupd') || m.updatedAt > Date.now() - +F('mupd') * DAY) && (!F('mexp') || (F('mexp') === 'rev90' ? m.reviewDate && daysTo(m.reviewDate) <= 90 : F('mexp') === 'past' ? m.expiry && m.expiry < Date.now() : m.expiry && daysTo(m.expiry) >= 0 && daysTo(m.expiry) <= +F('mexp')))).sort((a, b) => b.updatedAt - a.updatedAt);
  const n = f => S.modules.filter(f).length;
  return pageHead('Modules', 'The reusable content units of SAJA MedLR. Each module is approved once through MLR review and then reused in every eligible material.', canCreateModule(u) ? goBtn('Create module', 'module-new', null, 'primary', 'plus') : '') +
  statStrip([['In the Approved Library', n(m => ['Approved', 'Active'].includes(ls(m))), 'ok', 'Open the library →', 'go', 'library'], ['In review', n(m => ls(m) === 'In Review'), 'warn', 'With MLR reviewers', 'mstat', 'In Review'], ['Amendment requested', n(m => ls(m) === 'Amendment Requested'), 'warn', 'Resume after update', 'mstat', 'Amendment Requested'], ['Rejected', n(m => ls(m) === 'Rejected'), 'bad', 'New version needed', 'mstat', 'Rejected'], ['Expiring', n(m => ls(m) === 'Expiring'), 'warn', 'Within ' + S.settings.expiryWarnDays + ' days', 'mstat', 'Expiring'], ['Draft', n(m => ['Draft', 'Awaiting Lead submission'].includes(ls(m))), 'dim', 'Not submitted', 'mstat', 'open']]) +
  `${filterBar('modules', `${fsearch('mq', F('mq'), 'Search title, ID or text')}${fsel('mprod', F('mprod'), S.products.map(p => [p.id, p.name]), 'All products')}${fsel('mmkt', F('mmkt'), S.markets.map(m => [m.id, m.name]), 'All countries')}${fsel('mcat', F('mcat'), [['content', 'Content modules'], ['media', 'Media & document modules']], 'All categories')}${fsel('mtype', F('mtype'), S.moduleTypes.map(t => [t.id, t.name]), 'All module types')}${fsel('mstat', F('mstat'), [...MOD_STATUSES, ['live', 'Approved & active'], ['open', 'Not submitted'], ['issues', 'Failing validation']], 'All statuses')}${fsel('maud', F('maud'), S.audiences.map(a => [a.id, a.name]), 'All audiences')}${fsel('mch', F('mch'), S.channels.map(c => [c.id, c.name]), 'All channels')}${fsel('mown', F('mown'), uniq(S.modules.map(m => m.owner)).map(id => [id, user(id).name]), 'All owners')}${fsel('mwf', F('mwf'), S.workflows.filter(w => !w.hidden && w.appliesTo === 'Module').map(w => [w.id, w.name]), 'All workflows')}${fsel('mupd', F('mupd'), [['7', 'Updated in last 7 days'], ['30', 'Updated in last 30 days'], ['90', 'Updated in last 90 days']], 'Any time')}${fsel('mexp', F('mexp'), [['30', 'Expires within 30 days'], ['90', 'Expires within 90 days'], ['rev90', 'Review due within 90 days'], ['past', 'Expired']], 'Any expiry / review')}`, `${rows.length} of ${S.modules.length}`)}
  <section class="panel table-wrap">${rows.length ? `<table class="tbl list-tbl"><thead><tr><th>Module</th><th>Products</th><th>Countries</th><th>Version</th><th>Status</th><th>Owner</th><th>Updated</th></tr></thead><tbody>
  ${rows.map(m => { const l = latest(m), lv = live(m); return `<tr class="click" ${goAttr('module', m.id)} tabindex="0"><td><div class="cell-title">${modThumb(m, latest(m))}<div><div class="title">${esc(m.title)}</div><span class="mono muted">${m.id} · ${esc(mtype(m.type).name)}</span></div></div></td><td>${tagList(m.products, 'p')}</td><td>${tagList(m.markets)}</td><td class="nw">${vtag(l.v)}${lv && lv.v !== l.v ? ` <span class="muted" style="font-size:11.5px">v${lv.v} live</span>` : ''}</td><td>${chip(lifeStatus(m))}</td><td>${userCell(m.owner)}</td><td class="muted num nw">${ago(m.updatedAt)}</td></tr>`; }).join('')}
  </tbody></table>` : `<div class="empty"><h4>No modules match these filters</h4><p>Clear a filter or search for a different term.</p></div>`}</section>`;
}

/* ===== Module form (step by step) ===== */
// The form follows the kind of the selected module type: content modules capture approved text,
// media & document modules capture an approved file with its source and usage rules.
function msteps(D) {
  const k = D && D.type ? kindOfType(D.type) : 'content'; const media = k !== 'content';
  return [['Module type', ['type'], 'What kind of module is this?'],
    media ? [kindLabel(k) + ' & details', ['file', 'title', 'body', 'source', 'usage', 'format', 'reason', 'owner'], 'Upload the exact file reviewers will approve, with its source and usage rules.'] : ['Content', ['title', 'body', 'reason', 'owner'], 'Name the module and write the exact text reviewers will approve.'],
    ['Products & countries', ['products', 'indications', 'audience', 'markets', 'channels'], 'Every product and country where this module can be used.'],
    ['References & dates', ['refs', 'expiry', 'reviewDate'], media ? 'Optional references (for example the study behind a chart), periodic review and expiry.' : 'Evidence, periodic review and expiry.'],
    ['Review & save', [], 'Check everything, including the Validation SOPs, before saving.']];
}
const ownerOptions = keep => S.users.filter(u => (u.status === 'Active' && can(u, 'create')) || u.id === keep);
function blankDraft() { return { type: '', title: '', body: '', media: null, reason: '', owner: me().id, products: [], indications: [], audience: '', markets: [], channels: [], refs: [], reviewDate: toISO(Date.now() + 300 * DAY), expiry: toISO(Date.now() + S.settings.defaultValidityMonths * 30.5 * DAY), newRefTitle: '', newRefSource: '', newRefKind: 'study' }; }
function draftAsModule(D, m) { return { id: m ? m.id : 'NEW', type: D.type, title: D.title, owner: D.owner, products: D.products, markets: D.markets, audience: D.audience, channels: D.channels, reviewDate: fromISO(D.reviewDate), expiry: fromISO(D.expiry), versions: [{ v: 1, body: D.body, refs: D.refs, media: D.media, status: 'Draft', cycles: [] }] }; }
function viewModuleForm() {
  const editId = UI.route.p.id; const m = editId ? modById(editId) : null; const isNewVer = !!(m && UI.route.p.newVersion);
  if (!m && editId) return viewMissing('Module');
  if (!UI.draft || UI.draft._for !== (editId || 'new') + (isNewVer ? ':nv' : '')) {
    if (m) { const l = latest(m); UI.draft = { ...blankDraft(), _for: editId + (isNewVer ? ':nv' : ''), type: m.type, title: m.title, body: l.body, reason: isNewVer ? '' : (statusOf(m) === 'Amendment Requested' ? m.amendNote || '' : l.reason), owner: m.owner, products: [...m.products], indications: [...m.indications], audience: m.audience, markets: [...m.markets], channels: [...m.channels], refs: [...l.refs], media: l.media ? { ...l.media } : null, reviewDate: toISO(m.reviewDate || Date.now()), expiry: toISO(m.expiry || Date.now()) }; }
    else UI.draft = { _for: 'new', ...blankDraft() };
    UI.draft.newVersion = isNewVer; UI.draft.step = m ? 1 : 0; UI.draft.maxStep = m ? 4 : 0; UI.draft.triedSteps = [];
  }
  const D = UI.draft; const MSTEPS = msteps(D); const E = wizErrors(D, MSTEPS, validateDraft(D)); const st = D.step || 0; const hid = i => i === st ? '' : ' hidden';
  const err = k => E[k] ? `<span class="err">${E[k]}</span>` : '';
  const amending = m && statusOf(m) === 'Amendment Requested' && !isNewVer;
  const title = m ? (isNewVer ? 'New version of ' + m.id : amending ? 'Amend module' : 'Edit module') : 'Create module';
  const inds = uniq(D.products.flatMap(pid => productInds(pid, true).filter(i => i.active || D.indications.includes(i.id)).map(i => i.id)));
  const preview = draftAsModule(D, m); const T = mtype(D.type); const KIND = D.type ? kindOfType(D.type) : 'content'; const MEDIA_K = KIND !== 'content'; const md = D.media;
  const canOwner = isAdmin(me()) || can(me(), 'manage_users');
  return pageHead(title, m ? `<span class="mono">${m.id}</span> · ${esc(m.title)}` : 'One idea per module. It is approved once and reused in every material where it is eligible.', '', m ? [['Modules', 'modules'], [m.id, 'module', m.id], [title]] : [['Modules', 'modules'], ['Create module']]) +
  (isNewVer ? `<div class="banner info" style="margin-bottom:16px">${icon('layers')}<div class="txt"><b>You are creating version ${latest(m).v + 1}</b><p>${live(m) ? 'Version ' + live(m).v + ' stays approved and live in the library, with its approved products and countries, until the new version is approved.' : 'The new version starts a full approval cycle when you submit it.'}</p></div></div>` : '') +
  (amending ? `<div class="banner warn" style="margin-bottom:16px">${icon('undo')}<div class="txt"><b>Amendment requested by ${esc(user(m.resume.by).name)} (${esc(m.resume.fn + ' ' + levelName(m.resume.level))})</b><p>“${esc(m.resume.note)}” After you resubmit, approval resumes at the ${esc(m.resume.fn)} ${esc(levelName(m.resume.level))} step.</p></div></div>` : '') +
  wizBar('module', MSTEPS, D) +
  `<form class="grid cols-main ${D.anim ? (D.anim = false, 'wiz-anim') : ''}" data-form="module" novalidate>
  <div class="stack">${wizHead(MSTEPS, D)}
    <section class="panel"${hid(0)}><div class="panel-head"><h3>Module type</h3>${can(me(), 'manage_settings') ? `<span class="grow"></span><button type="button" class="btn ghost sm" ${goAttr('moduletypes')}>Manage module types</button>` : ''}</div><div class="panel-body stack">${[['Content modules', t => (t.kind || 'content') === 'content'], ['Media & document modules', t => (t.kind || 'content') !== 'content']].map(([g, f]) => { const ts = activeOf(S.moduleTypes, D.type).filter(f); return ts.length ? `<div><span class="section-title">${g}</span><div class="type-cards" role="radiogroup" aria-label="${g}" style="margin-top:8px">${ts.map(t => `<button type="button" class="type-card ${D.type === t.id ? 'on' : ''}" data-act="d-type" data-v="${t.id}" role="radio" aria-checked="${D.type === t.id}">${typeIco(t.id)}<span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></span></button>`).join('')}</div></div>` : ''; }).join('')}${err('type')}${m && D.type !== m.type && isMediaType(D.type) !== isMediaType(m.type) ? '<span class="err">A content module cannot become a media module (or the reverse). Create a new module instead.</span>' : ''}</div></section>
    ${MEDIA_K ? `<section class="panel"${hid(1)}><div class="panel-head"><h3>${esc(kindLabel(KIND))} file</h3>${md && md.fileId ? '<span class="grow"></span><span class="chip ok has-ico">' + icon('check', 'sm') + 'Uploaded</span>' : ''}</div><div class="panel-body form">
      ${md && md.fileId ? `${fileCard(md, `<span class="chip ok has-ico">${icon('check', 'sm')}Uploaded</span><span class="muted mono" style="font-size:11px">${esc(md.algo)} ${esc(String(md.checksum).slice(0, 12))}…</span>`)}<div class="media-stage">${mediaView(md)}</div>` : ''}
      <label class="upload ${E.file ? 'invalid' : ''}" for="d-file">${icon('upload')}<b>${D.mediaBusy ? 'Processing file…' : md && md.fileId ? 'Replace file' : 'Choose a file to upload'}</b><span>${esc(MEDIA_ACCEPT[KIND].map(x => x.split('/')[1].replace('svg+xml', 'svg').replace('quicktime', 'mov').toUpperCase()).join(', '))} · up to ${MEDIA_MAX_MB} MB</span><input type="file" id="d-file" accept="${MEDIA_ACCEPT[KIND].join(',')}" data-act-change="d-file" class="sr-only"></label>${err('file')}
      ${KIND === 'video' && md && md.fileId ? `<div class="fgrid"><div class="field"><span class="label">Duration</span><div class="input ro">${fmtSecs(md.duration)} <span class="muted">read from the file</span></div></div><div class="field"><label for="d-format">Format</label><input class="input" id="d-format" data-dm="format" value="${esc(md.format || '')}"></div></div>` : ''}
    </div></section>` : ''}
    <section class="panel"${hid(1)}><div class="panel-head"><h3>${MEDIA_K ? 'Details' : 'Content'}</h3></div><div class="panel-body form">
      <div class="field"><label for="d-title">Module name</label><input class="input ${E.title ? 'invalid' : ''}" id="d-title" data-d="title" value="${esc(D.title)}" placeholder="e.g. Clinical Claim — Hospitalisation reduction">${err('title')}</div>
      ${MEDIA_K ? `<div class="field"><label for="d-body">Description / alt text</label><textarea class="textarea ${E.body ? 'invalid' : ''}" id="d-body" data-d="body" rows="3" placeholder="Describe what the ${esc(kindLabel(KIND).toLowerCase())} shows. Used for accessibility and search.">${esc(D.body)}</textarea>${err('body')}</div>
      <div class="field"><label for="d-source">Source</label><input class="input" id="d-source" data-dm="source" value="${esc(md && md.source || '')}" placeholder="e.g. SAJA Medical Affairs — chart from CSR-ALPHA-01, or stock licence number"><span class="hint">Who owns the file or where it comes from.</span></div>
      <div class="field"><label for="d-usage">Usage rules</label><textarea class="textarea" id="d-usage" data-dm="usage" rows="2" placeholder="e.g. Use only with the hospitalisation claim and its reference. Do not crop.">${esc(md && md.usage || '')}</textarea><span class="hint">Shown to everyone who places this module in a material.</span></div>` : `<div class="field"><label for="d-body">Module content</label><textarea class="textarea ${E.body ? 'invalid' : ''}" id="d-body" data-d="body" placeholder="Write one self-contained statement. Use a superscript number to cite a reference.">${esc(D.body)}</textarea><span class="hint">This exact text is what reviewers approve and what materials reuse.</span>${err('body')}</div>`}
      ${isNewVer || amending ? `<div class="field"><label for="d-reason">${amending ? 'What did you change?' : 'Reason for change'}</label><textarea class="textarea ${E.reason ? 'invalid' : ''}" id="d-reason" data-d="reason" rows="2" placeholder="${amending ? 'e.g. Added the warning requested by Regulatory.' : 'e.g. Updated with the 24-month extension data.'}">${esc(D.reason)}</textarea>${err('reason')}</div>` : ''}
      <div class="field"><label for="d-owner">Material Owner</label>${canOwner ? `<select class="select ${E.owner ? 'invalid' : ''}" id="d-owner" data-d="owner">${ownerOptions(D.owner).map(u => opt(u.id, D.owner, u.name + ' · ' + roleLabel(u))).join('')}</select><span class="hint">The owner receives amendment requests and rejections. Listed: active users with the Create permission.</span>` : `<div class="input" style="display:flex;align-items:center;background:var(--surface-2)">${esc(user(D.owner).name)}</div>`}${err('owner')}</div>
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Products & audience</h3><span class="muted" style="font-size:12px">Select one or more products</span></div><div class="panel-body form">
      <div class="field"><span class="label">Products</span>${chipSelect('d-products', 'd-toggle', 'products', activeOf(S.products, D.products).map(p => [p.id, p.name, p.area + (p.active ? '' : ' · inactive')]), D.products, { ph: 'Select products', noun: 'products', manage: 'products', invalid: E.products })}${err('products')}</div>
      <div class="field"><span class="label">Indication</span>${inds.length ? `<div class="tags ro-tags">${inds.map(i => `<span class="tag">${esc(indName(i))} <span class="muted">· ${esc(product(indication(i).product).name)}</span></span>`).join('')}</div><span class="hint">Taken from each selected product (Products → Indication).</span>` : '<p class="muted">Select a product first. Each product carries its indication.</p>'}${err('indications')}</div>
      <div class="field"><label for="d-aud">Audience</label><select class="select ${E.audience ? 'invalid' : ''}" id="d-aud" data-d="audience">${opt('', D.audience, 'Select audience')}${activeOf(S.audiences, D.audience).map(a => opt(a.id, D.audience, a.name)).join('')}</select>${err('audience')}</div>
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Countries & channels</h3></div><div class="panel-body form">
      <div class="field"><span class="label">Countries</span>${chipSelect('d-markets', 'd-toggle', 'markets', activeOf(S.markets, D.markets).map(x => [x.id, x.name, x.id + (x.authority ? ' · ' + x.authority : '') + (x.active ? '' : ' · inactive')]), D.markets, { ph: 'Select countries', noun: 'countries', manage: 'markets', invalid: E.markets })}${err('markets')}</div>
      <div class="field"><span class="label">Channels</span>${multi('d-toggle', 'channels', activeOf(S.channels, D.channels).map(c => [c.id, c.name]), D.channels)}${err('channels')}</div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>References</h3><span class="grow"></span><button type="button" class="btn ghost sm" ${goAttr('references')}>Reference library</button></div><div class="panel-body form">
      ${D.refs.length ? `<div class="stack" style="gap:8px">${D.refs.map((r, i) => { const R = refById(r); return `<div class="ref"><span class="n">${i + 1}</span><div style="flex:1"><b>${esc(R.title)}</b><br><span class="muted">${esc(R.source)} · ${esc(refKind(R.kind))}</span></div><button type="button" class="btn icon sm" data-act="d-unref" data-v="${r}" aria-label="Remove reference">${icon('x', 'sm')}</button></div>`; }).join('')}</div>` : `<p class="muted">No references yet.</p>`}
      ${err('refs')}
      <div class="field"><label for="d-addref">Add from the reference library</label><select class="select" id="d-addref" data-act-change="d-addref">${opt('', '', 'Select a reference')}${S.references.filter(r => r.active && !D.refs.includes(r.id)).map(r => opt(r.id, '', r.title + ' (' + refKind(r.kind) + ')')).join('')}</select></div>
      <div class="field"><span class="label">Or register a new reference in the library</span><div class="fgrid"><input class="input" id="d-newref" data-d="newRefTitle" value="${esc(D.newRefTitle)}" placeholder="Title" aria-label="New reference title"><input class="input" id="d-newsrc" data-d="newRefSource" value="${esc(D.newRefSource)}" placeholder="Source, e.g. CSR-ALPHA-03, 2026" aria-label="New reference source"></div><div class="row nowrap"><select class="select" id="d-newkind" data-d="newRefKind" aria-label="Reference kind">${REF_KINDS.map(k => opt(k[0], D.newRefKind, k[1])).join('')}</select><button type="button" class="btn" data-act="d-newref">${icon('plus', 'sm')}Add reference</button></div></div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>Review & expiry</h3></div><div class="panel-body fgrid">
      <div class="field"><label for="d-rev">Periodic review date</label><input class="input ${E.reviewDate ? 'invalid' : ''}" type="date" id="d-rev" data-d="reviewDate" value="${esc(D.reviewDate)}"><span class="hint">The owner is reminded ${S.settings.reviewReminderDays} days before this date.</span>${err('reviewDate')}</div>
      <div class="field"><label for="d-exp">Expiry date</label><input class="input ${E.expiry ? 'invalid' : ''}" type="date" id="d-exp" data-d="expiry" value="${esc(D.expiry)}"><span class="hint">After this date the module cannot be used in new materials.</span>${err('expiry')}</div>
    </div></section>
    ${st === MSTEPS.length - 1 ? `${D.tried && Object.keys(E).length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${Object.keys(E).length} field${Object.keys(E).length > 1 ? 's need' : ' needs'} attention</b><p>Use Edit to go back to that step.</p></div></div>` : ''}
    ${sumGroup('module', 0, 'Module type', sumRow('Type', esc(T.name)))}
    ${sumGroup('module', 1, MEDIA_K ? kindLabel(KIND) + ' & details' : 'Content', sumRow('Name', esc(D.title)) + (MEDIA_K ? sumRow('File', md && md.fileId ? esc(md.name + ' · ' + (md.format || md.mime) + ' · ' + fmtSize(md.size)) : '') + sumRow('Description', esc(D.body)) + sumRow('Source', esc(md && md.source)) + sumRow('Usage rules', esc(md && md.usage)) : sumRow('Text', esc(D.body))) + (isNewVer || amending ? sumRow(amending ? 'Changes' : 'Reason', esc(D.reason)) : '') + sumRow('Owner', esc(user(D.owner).name)))}
    ${sumGroup('module', 2, 'Products & countries', sumRow('Products', esc(productsTxt(D.products))) + sumRow('Indication', esc(indsTxt(D.indications))) + sumRow('Audience', esc(D.audience ? aud(D.audience).name : '')) + sumRow('Countries', esc(marketsTxt(D.markets))) + sumRow('Channels', esc(channelsTxt(D.channels))))}
    ${sumGroup('module', 3, 'References & dates', sumRow('References', D.refs.map(r => esc(refById(r).title)).join('<br>')) + sumRow('Review date', esc(D.reviewDate)) + sumRow('Expiry', esc(D.expiry)))}
    <p class="muted" style="font-size:12px">${amending ? 'Saving keeps your changes. Resubmit from the module page to resume approval.' : 'Saving keeps the module as a draft. You submit it for MLR review from the module page.'}</p>` : ''}
    ${wizFoot('module', MSTEPS, D, m ? goAttr('module', m.id) : goAttr('modules'), m ? (isNewVer ? 'Create version ' + (latest(m).v + 1) : 'Save changes') : 'Save draft')}
  </div>
  <aside class="stack" style="position:sticky;top:84px">
    <section class="panel"><div class="panel-head"><h3>Preview</h3>${D.type ? `<span class="tag">${esc(T.name)}</span>` : ''}</div><div class="panel-body stack">${MEDIA_K ? `<div class="media-stage sm">${mediaView(md, md && md.fileId ? 'full' : 'thumb')}</div>${D.body ? `<p class="muted" style="font-size:12.5px">${esc(D.body)}</p>` : ''}` : D.body ? `<p class="claim" style="font-size:${T.tone === 'headline' ? 22 : 15}px;line-height:1.5">${esc(D.body)}</p>` : '<p class="muted">Your content appears here as reviewers will see it.</p>'}
      <dl class="kv" style="grid-template-columns:96px 1fr;font-size:12.5px"><dt>Products</dt><dd>${esc(productsTxt(D.products)) || '—'}</dd><dt>Countries</dt><dd>${esc(marketsTxt(D.markets)) || '—'}</dd><dt>Audience</dt><dd>${esc(D.audience ? aud(D.audience).name : '—')}</dd><dt>Channels</dt><dd>${esc(channelsTxt(D.channels) || '—')}</dd><dt>References</dt><dd>${D.refs.length}</dd><dt>Owner</dt><dd>${esc(user(D.owner).name)}</dd></dl></div></section>
    ${D.type ? validationPanel(preview, 'Module', 'Validation check') : ''}
  </aside></form>`;
}
function validateDraft(D) {
  const e = {};
  if (!D.type) e.type = 'Choose a module type.';
  if (!D.title.trim()) e.title = 'Give the module a name.';
  const media = D.type && isMediaType(D.type);
  if (media && !(D.media && D.media.fileId)) e.file = 'Upload the ' + kindLabel(kindOfType(D.type)).toLowerCase() + ' file.';
  if (D.body.trim().length < 8) e.body = media ? 'Describe the file (used as alt text and for search).' : 'Write the module content (at least a short sentence).';
  if (D.newVersion && D.reason.trim().length < 5) e.reason = 'Explain why this version is needed.';
  if (!D.owner || user(D.owner).status !== 'Active') e.owner = 'Choose an active Material Owner.';
  if (!D.products.length) e.products = 'Select at least one product.';
  if (!D.indications.length) e.indications = 'The selected product has no active indication. Add it in Products.';
  if (!D.audience) e.audience = 'Select an audience.';
  if (!D.markets.length) e.markets = 'Select at least one country.';
  if (!D.channels.length) e.channels = 'Select at least one channel.';
  if (!D.expiry || fromISO(D.expiry) < Date.now()) e.expiry = 'Set an expiry date in the future.';
  if (D.reviewDate && D.expiry && fromISO(D.reviewDate) > fromISO(D.expiry)) e.reviewDate = 'The review date must be before expiry.';
  return e;
}

/* ===== Module detail ===== */
function viewModule() {
  const m = modById(UI.route.p.id); if (!m) return viewMissing('Module');
  const u = me(); const l = latest(m); const lv = live(m); const ls = lifeStatus(m); const tab = UI.route.p.tab || 'overview'; const st = statusOf(m);
  const owns = canEditObj(u, m); const imp = impactedAssets(m); const issues = validationIssues(m, 'Module');
  let actions = '';
  if (owns && !m.archived && ['Draft', 'Awaiting Lead submission'].includes(st)) actions += goBtn('Edit', 'module-edit', m.id, '', 'edit') + (can(u, 'submit') || can(u, 'edit') ? btn(canSubmit(u) ? 'Submit for review' : 'Send to Lead', 'submit-open', 'primary', `data-id="${m.id}"`, 'send') : '');
  if (canAmendObj(u, m) && st === 'Amendment Requested') actions += goBtn('Amend', 'module-edit', m.id, '', 'edit') + btn('Resubmit — resume at ' + m.resume.fn + ' ' + levelName(m.resume.level), 'resubmit-open', 'primary', `data-kind="Module" data-id="${m.id}"`, 'send');
  if (owns && can(u, 'create_version') && !m.archived && st === 'Rejected') actions += btn('Create new version', 'new-version', 'primary', `data-id="${m.id}"`, 'copy');
  if (m.review && canActOn(u, m)) actions += goBtn('Open review', 'review', m.id, 'primary', 'shieldcheck');
  if (owns && can(u, 'create_version') && st === 'Approved' && !m.archived) actions += btn('Create new version', 'new-version', '', `data-id="${m.id}"`, 'copy');
  if (lv) actions += goBtn('Cover letter', 'cover', m.id, '', 'award', ` data-k="Module" data-v="${lv.v}"`);
  if (canCreateAsset(u) && lv && ['Approved', 'Active', 'Expiring'].includes(libraryStatus(m) || '')) actions += btn('Use in asset', 'asset-new', '', `data-module="${m.id}"`, 'layers');
  if (lv) actions += m.archived ? (can(u, 'restore') ? btn('Reinstate', 'mod-archive', '', `data-id="${m.id}"`, 'refresh') : '') : (can(u, 'withdraw') ? btn('Withdraw from library', 'mod-archive', 'ghost', `data-id="${m.id}"`, 'archive') : '');
  let banners = '';
  if (m.archived) banners += `<div class="banner">${icon('archive')}<div class="txt"><b>Withdrawn from the Approved Library</b><p>Archived ${m.archivedAt ? fmtD(m.archivedAt) + ' by ' + esc(user(m.archivedBy).name) : ''}. It cannot be added to new materials. Existing materials keep their approved version.</p></div></div>`;
  if (st === 'Amendment Requested') banners += `<div class="banner warn">${icon('undo')}<div class="txt"><b>Amendment requested by ${esc(user(m.resume.by).name)} · ${esc(m.resume.fn + ' ' + levelName(m.resume.level))}</b><p>“${esc(m.resume.note)}” After the owner amends and resubmits, approval <b>resumes at the ${esc(m.resume.fn)} ${esc(levelName(m.resume.level))} step</b>. Earlier approvals in this cycle are kept.</p></div>${owns ? goBtn('Amend', 'module-edit', m.id, 'sm') : ''}</div>`;
  if (st === 'Rejected') { const r = latest(m).cycles.slice(-1)[0].decisions.slice(-1)[0]; banners += `<div class="banner bad">${icon('x')}<div class="txt"><b>Rejected by ${esc(user(r.by).name)} · ${esc(r.fn + ' ' + levelName(r.level))}</b><p>“${esc(r.note)}” Create a new version to resubmit. The new version <b>restarts the full approval cycle</b> from the first step.</p></div>${owns ? btn('Create new version', 'new-version', 'sm', `data-id="${m.id}"`) : ''}</div>`; }
  if (st === 'Awaiting Lead submission') banners += `<div class="banner info">${icon('inbox')}<div class="txt"><b>Waiting for a Content Lead to submit</b><p>Content Members prepare drafts; a Content Lead submits them for MLR review.</p></div></div>`;
  if (m.review) { const cs = curStep(m); const as = assigneeFor(cs); banners += `<div class="banner pending">${icon('shieldcheck')}<div class="txt"><b>In review · ${esc(stepLabel(cs))}</b><p>Assigned to ${as.map(x => esc(x.name)).join(', ') || 'the ' + esc(cs.fn) + ' team'}. Step ${reviewPos(wfById(m.review.wf), m.review.step)} of ${reviewSteps(wfById(m.review.wf)).length} · cycle ${m.review.cycle} · waiting ${fmtDur(Date.now() - m.review.stepStartedAt)}.</p></div>${canActOn(u, m) ? goBtn('Open review', 'review', m.id, 'sm primary') : ''}</div>`; }
  if (lv && lv !== l && st !== 'Approved') banners += `<div class="banner">${icon('layers')}<div class="txt"><b>Version ${l.v} is ${esc(st.toLowerCase())} · version ${lv.v} is still live</b><p>Materials keep using v${lv.v} until v${l.v} is approved.</p></div></div>`;
  if (issues.length && ['Draft', 'Amendment Requested', 'Awaiting Lead submission'].includes(st)) banners += `<div class="banner bad">${icon('alert')}<div class="txt"><b>Validation issue${issues.length > 1 ? 's' : ''} detected</b><p>${issues.map(x => esc(x.issue)).join(' ')} Fix ${issues.length > 1 ? 'these' : 'this'} before submission.</p></div>${owns ? goBtn('Fix', 'module-edit', m.id, 'sm') : ''}</div>`;
  if (imp.length) banners += `<div class="banner warn">${icon('alert')}<div class="txt"><b>${imp.length} asset${imp.length > 1 ? 's use' : ' uses'} a previous version of this module</b><p>Version ${lv.v} is approved. Update each asset to the new version.</p></div><button class="btn sm" ${goAttr('module', m.id, ' data-tab="lifecycle"')}>Review impacted assets</button></div>`;
  if (lv && lv !== l && JSON.stringify([lv.meta && lv.meta.products, lv.meta && lv.meta.markets, lv.meta && lv.meta.channels]) !== JSON.stringify([m.products, m.markets, m.channels])) banners += `<div class="banner info">${icon('globe')}<div class="txt"><b>Version ${l.v} changes the scope</b><p>Approved v${lv.v}: ${esc(productsTxt(lv.meta.products))} · ${esc(lv.meta.markets.join(', '))} · ${esc(channelsTxt(lv.meta.channels))}. Proposed v${l.v}: ${esc(productsTxt(m.products))} · ${esc(m.markets.join(', '))} · ${esc(channelsTxt(m.channels))}. The library and materials use the approved scope until v${l.v} is approved.</p></div></div>`;
  if (ls === 'Expiring') banners += `<div class="banner warn">${icon('clock')}<div class="txt"><b>Expires in ${daysTo(m.expiry)} days (${fmtD(m.expiry)})</b><p>Create a new version or confirm the content is still valid before it expires.</p></div></div>`;
  if (ls === 'Review Required') banners += `<div class="banner bad">${icon('clock')}<div class="txt"><b>Expired on ${fmtD(m.expiry)} — review required</b><p>This module can no longer be added to new materials.</p></div></div>`;
  const nAnn = annsFor(m, l.v).filter(a => a.status === 'open').length;
  const tabs = [['overview', 'Overview'], ['comments', 'Comments', nAnn || null], ['approval', 'Approval'], ['versions', 'Version history', m.versions.length], ['lifecycle', 'Lifecycle & impact', imp.length || null], ['audit', 'Audit trail']];
  return pageHead(esc(m.title), `<span class="row" style="gap:8px">${chip(ls)}${vtag(l.v)}<span class="mono">${m.id}</span><span class="muted">·</span>${esc(mtype(m.type).name)}<span class="muted">·</span>Owner ${esc(user(m.owner).name)}</span>`, actions, [['Modules', 'modules'], [m.id]]) +
  approvalTimeline(m) +
  (banners ? `<div class="stack" style="margin-bottom:16px">${banners}</div>` : '') +
  `<div class="tabs" role="tablist" style="margin-bottom:16px">${tabs.map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" role="tab" aria-selected="${tab === t[0]}" ${goAttr('module', m.id, ` data-tab="${t[0]}"`)}>${t[1]}${t[2] ? `<span class="n">${t[2]}</span>` : ''}</button>`).join('')}</div>` +
  (tab === 'overview' ? viewModuleOverview(m) : tab === 'comments' ? commentsTab(m) : tab === 'approval' ? viewApprovalTab(m, 'Module') : tab === 'versions' ? viewVersions(m, 'Module') : tab === 'lifecycle' ? viewModuleLifecycle(m) : auditTable(S.audit.filter(e => e.objId === m.id), true));
}
function refsList(ids) { return ids.length ? `<div class="stack" style="gap:8px">${ids.map((r, i) => { const R = refById(r); return `<div class="ref"><span class="n">${i + 1}</span><div><b>${esc(R.title)}</b><br><span class="muted">${esc(R.source)} · ${esc(refKind(R.kind))}</span></div></div>`; }).join('')}</div>` : '<p class="muted">No references.</p>'; }
const lastWf = o => { const c = o.review || o.resume ? curCycle(o) : latest(o).cycles.slice(-1)[0]; return c ? wfById(c.wf) : null; };
function metaKV(m, v) {
  const lv = live(m); const wf = lastWf(m);
  return `<dl class="kv"><dt>Type</dt><dd>${esc(mtype(m.type).name)} <span class="muted" style="font-size:12px">· ${esc(modCategory(m.type))}</span></dd><dt>Products</dt><dd>${tagList(m.products, 'p')}</dd><dt>Indication</dt><dd>${esc(indsTxt(m.indications))}</dd><dt>Countries</dt><dd>${tagList(m.markets)} <span class="muted" style="font-size:12px">${esc(marketsTxt(m.markets))}</span></dd><dt>Audience</dt><dd>${esc(aud(m.audience).name)}</dd><dt>Channels</dt><dd>${esc(channelsTxt(m.channels))}</dd><dt>Version</dt><dd>v${v.v} · ${esc(v.status)}</dd><dt>Workflow</dt><dd>${wf ? esc(wf.name) : '<span class="muted">Chosen at submission</span>'}</dd><dt>Review date</dt><dd>${fmtD(m.reviewDate)}</dd><dt>Expiry</dt><dd>${fmtD(m.expiry)}</dd><dt>Owner</dt><dd>${esc(user(m.owner).name)} <span class="muted" style="font-size:12px">${esc(roleLabel(user(m.owner)))}</span></dd><dt>References</dt><dd>${v.refs.length}</dd>${lv ? `<dt>Approved</dt><dd>v${lv.v} · ${fmtD(lv.approvedAt)} · ${esc(user(lv.approvedBy).name)}</dd>` : ''}</dl>`;
}
function viewModuleOverview(m) {
  const pv = UI.route.p.v ? verOf(m, +UI.route.p.v) : null; const l = pv || latest(m); const other = pv && pv !== latest(m);
  return (other ? `<div class="banner info" style="margin-bottom:14px">${icon('book')}<div class="txt"><b>Viewing the approved version v${l.v}</b><p>Approved ${fmtD(l.approvedAt)} by ${esc(user(l.approvedBy).name)}. The latest version is v${latest(m).v} (${esc(statusOf(m))}).</p></div>${goBtn('Open latest v' + latest(m).v, 'module', m.id, 'sm')}</div>` : '') + `<div class="grid cols-main"><div class="stack"><section class="panel sheet-card"><div class="sheet-strip"><span class="mono">${m.id} · v${l.v}</span><span>${esc(mtype(m.type).name)}</span><span>${esc(productsTxt(m.products))}</span><span class="grow"></span>${chip(lifeStatus(m))}</div>
    <div class="sheet-body">${isMediaType(m.type) ? `<div class="media-stage">${mediaView(l.media)}</div><p class="media-desc">${esc(l.body)}</p>${mediaRules(l.media)}` : `<p class="claim ${mtype(m.type).tone === 'headline' ? 'is-headline' : ''}">${esc(l.body)}</p>`}
    <div class="footnotes"><span class="fn-title">References</span>${l.refs.length ? `<ol>${l.refs.map(r => { const R = refById(r); return `<li><b>${esc(R.title)}</b> <span>${esc(R.source)} · ${esc(refKind(R.kind))}</span></li>`; }).join('')}</ol>` : '<p class="muted">No references attached.</p>'}</div></div></section>
    ${validationPanel(m, 'Module')}</div>
  <div class="stack"><section class="panel"><div class="panel-head"><h3>Details</h3></div><div class="panel-body">${metaKV(m, l)}</div></section>${isMediaType(m.type) && l.media ? `<section class="panel"><div class="panel-head"><h3>File</h3><span class="grow"></span>${mediaUrl(l.media.fileId) && mediaUrl(l.media.fileId) !== 'missing' ? `<a class="btn ghost sm" href="${mediaUrl(l.media.fileId)}" download="${esc(l.media.name)}" target="_blank" rel="noopener">${icon('download', 'sm')}Download</a>` : ''}</div><div class="panel-body stack" style="gap:12px">${fileCard(l.media, vtag(l.v) + chip(statusOf(m)))}${mediaFactsKV(l.media)}</div></section>` : ''}</div></div>`;
}
/* Approval progress for the current (or last) cycle */
function wfProgress(obj) {
  const v = latest(obj); const cyc = obj.review || obj.resume ? curCycle(obj) : v.cycles.slice(-1)[0];
  const wfId = cyc ? cyc.wf : (kindOf(obj) === 'Module' ? S.settings.defaultModuleWorkflow : assetWorkflow(obj)); const wf = wfById(wfId);
  const cur = obj.review ? obj.review.step : obj.resume ? obj.resume.step : -1; const approved = v.status === 'Approved';
  const decs = cyc ? cyc.decisions : [];
  return `<div class="wf">${wf.steps.map((s, i) => {
    const last = [...decs].reverse().find(c => c.step === i && c.fn !== 'Owner');
    const done = approved || cur > i || (last && ['Reviewed', 'Approved', 'Email sent'].includes(last.decision) && cur !== i);
    const now = cur === i; const paused = now && obj.resume; const rejected = last && last.decision === 'Rejected';
    if (isNotify(s)) return `<div class="wf-step notify ${done ? 'done' : ''}"><div class="wf-dot">${icon('mail', 'sm')}</div><div><div class="t">${fnBadge('Email', 'sm')}Email notification</div><div class="s">${done ? 'Sent to ' + esc(notifyTo(s).join(', ') || 'no one') : 'Sends to ' + esc(notifyTo(s).join(', ') || 'no one yet') + ' when the step before is approved'}</div></div></div>`;
    return `<div class="wf-step ${done && !rejected ? 'done' : ''} ${now ? 'current' : ''} ${rejected ? 'rejected' : ''}"><div class="wf-dot">${rejected ? icon('x', 'sm') : done ? icon('check', 'sm') : reviewPos(wf, i)}</div><div><div class="t">${fnBadge(s.fn, 'sm')}${esc(s.fn)} <span class="muted">·</span> ${s.req === 'approve' ? 'Approval' : 'Review'} ${lvl(s.level)}</div><div class="s">${rejected ? 'Rejected by ' + esc(user(last.by).name) + ' · ' + fmtDT(last.at) : paused ? 'Amendment requested — resumes here after resubmission' : done && last ? esc(user(last.by).name) + ' · ' + fmtDT(last.at) + ' · ' + fmtDur(last.at - (last.startedAt || last.at)) : now ? 'In progress — ' + assigneeFor(s).map(x => esc(x.name)).join(', ') : done ? 'Completed' : 'Pending'}</div></div></div>`; }).join('')}</div>`;
}
/* Approval timeline: the actual workflow of the current (or last) cycle, read from the cycle's decisions.
   Answers where the item is, who holds it, what is approved and what is still pending. */
const stepTag = st => st.fn + ' ' + st.level + ' ' + (st.req === 'approve' ? 'approval' : 'review');
function timelineModel(obj) {
  const v = latest(obj); const kind = kindOf(obj);
  const cyc = obj.review || obj.resume ? curCycle(obj) : v.cycles.slice(-1)[0];
  const wfId = cyc ? cyc.wf : kind === 'Module' ? (mtype(obj.type).workflow && wfById(mtype(obj.type).workflow) ? mtype(obj.type).workflow : S.settings.defaultModuleWorkflow) : assetWorkflow(obj);
  const wf = wfById(wfId); const decs = cyc ? cyc.decisions : []; const cur = obj.review ? obj.review.step : -1;
  const approved = !!cyc && cyc.outcome === 'Approved';
  const steps = wf.steps.map((s, i) => ({ s, i })).filter(x => !isNotify(x.s)).map(({ s, i }) => {
    const last = [...decs].reverse().find(c => c.step === i && !['Owner', 'Email'].includes(c.fn));
    const passed = decs.filter(c => c.step === i && ['Reviewed', 'Approved'].includes(c.decision));
    let status = 'Pending', who = assigneeFor(s), when = null;
    if (obj.resume && obj.resume.cycle === (cyc && cyc.n) && obj.resume.step === i) { status = 'Amendment Requested'; who = [user(obj.resume.by)]; when = obj.resume.at; }
    else if (cyc && cyc.outcome === 'Rejected' && last && last.decision === 'Rejected') { status = 'Rejected'; who = [user(last.by)]; when = last.at; }
    else if (cur === i) { status = 'Current'; when = obj.review.stepStartedAt; }
    else if (passed.length && (approved || cur > i || (obj.resume && obj.resume.step > i))) { const p = passed[passed.length - 1]; status = 'Completed'; who = [user(p.by)]; when = p.at; }
    return { s, i, status, who, when, dec: last };
  });
  return { wf, cyc, v, kind, steps, approved, cur };
}
const TL_ICON = { Completed: 'check', Current: 'clock', Pending: '', 'Amendment Requested': 'undo', Rejected: 'x' };
const TL_TONE = { Completed: 'ok', Current: 'cur', Pending: 'pend', 'Amendment Requested': 'warn', Rejected: 'bad' };
function approvalTimeline(obj) {
  const T = timelineModel(obj); const { wf, cyc, v, steps } = T; const kind = T.kind;
  const nowStep = steps.find(x => x.status === 'Current') || steps.find(x => ['Amendment Requested', 'Rejected'].includes(x.status));
  const doneN = steps.filter(x => x.status === 'Completed').length; const lv = live(obj);
  let head;
  if (!cyc) head = `<b>Not submitted</b><span>Route when submitted: ${esc(wf.name)} · ${steps.length} step${steps.length === 1 ? '' : 's'}</span>`;
  else if (T.approved) head = `<b>Approved · v${v.v}</b><span>${fmtDT(v.approvedAt || cyc.end)} · final sign-off ${esc(user(v.approvedBy).name)} · ${fmtDur(cyc.end - cyc.start)} from submission</span>`;
  else if (nowStep && nowStep.status === 'Current') head = `<b>Now at ${esc(nowStep.s.fn)} · ${esc(levelName(nowStep.s.level))} ${nowStep.s.req === 'approve' ? 'approval' : 'review'}</b><span>With ${esc(nowStep.who.map(x => x.name).join(', ') || 'no active ' + stepWho(nowStep.s))} · waiting ${fmtDur(Date.now() - nowStep.when)} · ${doneN} of ${steps.length} done</span>`;
  else if (nowStep && nowStep.status === 'Amendment Requested') head = `<b>Amendment requested at ${esc(nowStep.s.fn)} · ${esc(levelName(nowStep.s.level))}</b><span>With the owner ${esc(user(obj.owner).name)} · resumes at this step after resubmission</span>`;
  else if (nowStep) head = `<b>Rejected at ${esc(nowStep.s.fn)} · ${esc(levelName(nowStep.s.level))}</b><span>A new version restarts the full cycle · owner ${esc(user(obj.owner).name)}</span>`;
  else head = `<b>${esc(statusOf(obj))}</b><span>${esc(wf.name)}</span>`;
  const cell = x => { const tone = TL_TONE[x.status]; const clickable = x.status !== 'Pending' && x.status !== 'Current' || (x.status === 'Current' && cyc);
    const who = x.who.length ? (x.who.length > 2 ? esc(x.who[0].name) + ' +' + (x.who.length - 1) : x.who.map(u => esc(u.name)).join(', ')) : '<span class="muted">No active ' + esc(stepWho(x.s)) + '</span>';
    return `<button type="button" class="atl-step ${tone}" ${clickable ? `data-act="tl-step" data-kind="${kind}" data-id="${esc(obj.id)}" data-v="${v.v}" data-c="${cyc ? cyc.n : 0}" data-i="${x.i}"` : 'disabled'} aria-label="${esc(x.s.fn + ' ' + x.status)}">
      <span class="atl-dot">${TL_ICON[x.status] ? icon(TL_ICON[x.status], 'sm') : reviewPos(wf, x.i)}</span>
      <span class="atl-body"><span class="atl-name">${fnBadge(x.s.fn, 'sm')}${esc(x.s.fn)}</span><span class="atl-sub">${esc(levelName(x.s.level))} ${x.s.req === 'approve' ? 'approval' : 'review'}</span>
      <span class="atl-st">${esc(x.status)}</span><span class="atl-who">${who}</span><span class="atl-when">${x.when ? (x.status === 'Current' ? 'since ' : '') + fmtDT(x.when) : x.status === 'Pending' ? 'Not started' : ''}</span></span></button>`; };
  const final = `<div class="atl-step final ${T.approved ? 'ok' : 'pend'}"><span class="atl-dot">${icon(T.approved ? 'award' : 'flag', 'sm')}</span><span class="atl-body"><span class="atl-name">Approved</span><span class="atl-st">${T.approved ? 'v' + v.v + ' live' : lv ? 'v' + lv.v + ' still live' : 'Not yet'}</span><span class="atl-who">${T.approved ? esc(user(v.approvedBy).name) : ''}</span><span class="atl-when">${T.approved ? fmtDT(v.approvedAt) : ''}</span></span></div>`;
  return `<section class="panel atl" aria-label="Approval timeline"><div class="atl-head"><span class="atl-ico">${icon('workflow', 'sm')}</span><div class="atl-sum">${head}</div><span class="grow"></span><span class="atl-meta">${esc(wf.name)}${cyc ? ' · v' + v.v + ' · cycle ' + cyc.n + (cyc.amendments ? ' · ' + cyc.amendments + ' amendment' + (cyc.amendments > 1 ? 's' : '') : '') : ''}</span></div>
  <div class="atl-track">${steps.map(cell).join('<span class="atl-line" aria-hidden="true"></span>')}<span class="atl-line" aria-hidden="true"></span>${final}</div></section>`;
}
// Review details for one step of one cycle: decisions, comments/annotations, time at step.
function stepDetailModal(M) {
  const obj = objById(M.kind, M.id); const ver = verOf(obj, +M.v); const cyc = ver.cycles.find(c => c.n === +M.c); const wf = wfById(cyc.wf); const st = wf.steps[+M.i];
  const decs = cyc.decisions.filter(c => c.step === +M.i);
  const anns = S.annotations.filter(a => a.objId === obj.id && a.version === ver.v && a.cycle === cyc.n && (a.stepIdx === +M.i || a.step === stepTag(st)));
  const annList = anns.length ? anns.map(a => `<div class="comment"><div class="who">${avatar(user(a.author), 'sm')}<b>${esc(user(a.author).name)}</b><span class="muted" style="font-size:12px">${esc(a.role)} · ${fmtDT(a.ts)}</span><span class="grow"></span>${chip(a.status === 'resolved' ? 'Resolved' : 'Open')}</div><div class="muted" style="font-size:12px;margin-bottom:4px">${esc(annWhere(a))}</div><p style="font-size:13.5px">${esc(a.text)}</p>${a.replies.map(r => `<div class="reply"><b>${esc(user(r.author).name)}</b> <span class="muted" style="font-size:11.5px">${fmtDT(r.ts)}</span><p>${esc(r.text)}</p></div>`).join('')}</div>`).join('') : '<p class="muted">No comments or annotations at this step.</p>';
  return modalShell('shieldcheck', '', esc(st.fn) + ' · ' + esc(levelName(st.level)) + (st.req === 'approve' ? ' approval' : ' review'), `${esc(nameOf(obj))} · v${ver.v} · cycle ${cyc.n} · ${esc(wf.name)}`,
    `<div class="section-title" style="margin-bottom:8px">Decision</div>${decisionsList(decs)}<div class="section-title" style="margin:18px 0 8px">Comments & annotations <span class="chip plain">${anns.length}</span></div><div class="stack" style="gap:10px">${annList}</div>`,
    `${btn('Close', 'modal-close')}${obj.review ? goBtn('Open current review', M.kind === 'Asset' ? 'asset-review' : 'review', obj.id, 'primary') : ''}`);
}
function decisionsList(decs) {
  if (!decs || !decs.length) return '<p class="muted">No decisions recorded yet.</p>';
  return `<div class="stack" style="gap:10px">${decs.map(c => { const x = user(c.by); const who = c.fn === 'Owner' || c.req === 'owner' ? 'Material Owner' : c.fn === 'Email' ? 'Email notification' : c.fn + ' ' + levelName(c.level);
    const actual = c.role || roleLabel(x); return `<div class="comment"><div class="who">${avatar(x, 'sm')}<b>${esc(x.name)}</b><span class="muted" style="font-size:12px">${esc(who)}${actual !== who && c.fn !== 'Email' ? ' · ' + esc(actual) : ''} · ${fmtDT(c.at)}${c.startedAt ? ' · ' + fmtDur(c.at - c.startedAt) + ' at step' : ''}</span></div><div style="margin-bottom:4px">${chip(c.decision)}${c.admin ? ' <span class="tag">Recorded by Administrator</span>' : ''}</div>${c.note ? `<p style="font-size:13.5px">${esc(c.note)}</p>` : ''}</div>`; }).join('')}</div>`;
}
function viewApprovalTab(obj, kind) {
  const v = latest(obj); const cyc = obj.review || obj.resume ? curCycle(obj) : v.cycles.slice(-1)[0];
  return `<div class="grid cols-2"><section class="panel"><div class="panel-head"><h3>Approval workflow</h3><span class="muted" style="font-size:12.5px">${cyc ? esc(wfById(cyc.wf).name) + ' · cycle ' + cyc.n : 'Not submitted'}</span></div><div class="panel-body">${!cyc ? '<p class="muted" style="margin-bottom:14px">Not submitted yet. This is the route it will take.</p>' : ''}${wfProgress(obj)}</div></section>
  <section class="panel"><div class="panel-head"><h3>Decisions · v${v.v}</h3>${cyc && cyc.amendments ? `<span class="chip warn plain">${cyc.amendments} amendment${cyc.amendments > 1 ? 's' : ''}</span>` : ''}</div><div class="panel-body">${decisionsList(cyc ? cyc.decisions : [])}</div></section></div>`;
}
/* Version history */
function viewVersions(obj, kind) {
  return `<section class="panel table-wrap"><table class="tbl list-tbl"><thead><tr><th>Version</th><th>Created</th><th>Reason for change</th><th>Status</th><th>Cycles</th><th>Approvers</th><th>Approved</th><th>Review date</th><th style="text-align:right">Actions</th></tr></thead><tbody>${[...obj.versions].reverse().map(v => { const apr = uniq(v.cycles.flatMap(c => c.decisions.filter(x => x.decision === 'Approved').map(x => user(x.by).name))); const am = v.cycles.reduce((n, c) => n + (c.amendments || 0), 0), rj = v.cycles.filter(c => c.outcome === 'Rejected').length; const mt = metaOf(obj, v);
    return `<tr class="click" data-act="version-open" data-kind="${kind}" data-id="${obj.id}" data-v="${v.v}" tabindex="0"><td>${vtag(v.v)}</td><td class="nw">${fmtD(v.createdAt)}<br><span class="muted" style="font-size:12px">${esc(user(v.createdBy).name)}</span></td><td style="max-width:280px;font-size:12.5px">${esc(v.reason || '—')}${v.media ? `<br><span class="muted">${icon('file', 'sm')} ${esc(v.media.name)} · ${esc(String(v.media.checksum || '').slice(0, 8))}</span>` : ''}</td><td>${chip(v.status)}</td><td class="num nw">${v.cycles.length}${am ? `<br><span class="muted" style="font-size:11.5px">${am} amendment${am > 1 ? 's' : ''}</span>` : ''}${rj ? `<br><span class="muted" style="font-size:11.5px">${rj} rejected</span>` : ''}</td><td style="font-size:12.5px">${esc(apr.join(', ') || '—')}</td><td class="nw">${v.approvedAt ? fmtD(v.approvedAt) : '—'}</td><td class="nw">${kind === 'Module' && mt.reviewDate ? fmtD(mt.reviewDate) : '—'}</td><td style="text-align:right"><div class="row nowrap" style="justify-content:flex-end;gap:6px"><button class="btn icon sm" data-act="version-open" data-kind="${kind}" data-id="${obj.id}" data-v="${v.v}" title="Approval history" aria-label="Approval history of v${v.v}">${icon('history', 'sm')}</button>${v.approvedAt ? `<button class="btn icon sm" ${goAttr('cover', obj.id, ` data-k="${kind}" data-v="${v.v}"`)} title="Cover letter" aria-label="Cover letter for v${v.v}">${icon('award', 'sm')}</button>` : ''}</div></td></tr>`; }).join('')}</tbody></table></section>`;
}
function versionModalBody(obj, kind, v) {
  const mt = metaOf(obj, v);
  return `<dl class="kv" style="grid-template-columns:120px 1fr;margin-bottom:12px"><dt>Created</dt><dd>${fmtDT(v.createdAt)} · ${esc(user(v.createdBy).name)}</dd><dt>Reason</dt><dd>${esc(v.reason || '—')}</dd><dt>Status</dt><dd>${chip(v.status)}</dd>${v.approvedAt ? `<dt>Approved</dt><dd>${fmtDT(v.approvedAt)} · ${esc(user(v.approvedBy).name)}</dd>` : ''}<dt>Products</dt><dd>${esc(productsTxt(mt.products))}</dd><dt>Countries</dt><dd>${esc(marketsTxt(mt.markets))}</dd>${kind === 'Module' ? `<dt>Channels</dt><dd>${esc(channelsTxt(mt.channels))}</dd>` : `<dt>Channel</dt><dd>${esc(chan(mt.channel).name)}</dd>`}<dt>Audience</dt><dd>${esc(aud(mt.audience).name)}</dd></dl>
  ${kind === 'Module' && v.media ? `<div class="media-stage sm" style="margin-bottom:10px">${mediaView(v.media)}</div>${mediaFactsKV(v.media)}${mediaRules(v.media)}` : ''}
  ${kind === 'Module' ? `<div class="comment" style="margin-bottom:12px"><p style="font-size:13.5px">${esc(v.body)}</p>${v.refs.length ? `<p class="muted" style="font-size:12px;margin-top:6px">References: ${v.refs.map(r => esc(refById(r).title)).join(' · ')}</p>` : ''}</div>` : ''}
  ${v.cycles.length ? v.cycles.map(c => `<div class="cycle"><div class="row" style="gap:8px;margin-bottom:8px"><b>Cycle ${c.n}</b>${chip(c.outcome)}<span class="muted" style="font-size:12px">${esc((wfById(c.wf) || {}).name || c.wf)} · ${fmtD(c.start)}${c.end ? ' → ' + fmtD(c.end) + ' · ' + fmtDur(c.end - c.start) : ''}${c.amendments ? ' · ' + c.amendments + ' amendment' + (c.amendments > 1 ? 's' : '') : ''}</span></div>${decisionsList(c.decisions)}</div>`).join('') : '<p class="muted">Not submitted for review.</p>'}`;
}
const LIFE = ['Draft', 'In Review', 'Approved', 'Active', 'Expiring', 'Review Required', 'Superseded', 'Archived'];
function viewModuleLifecycle(m) {
  const ls = lifeStatus(m); const li = LIFE.indexOf(['Amendment Requested', 'Awaiting Lead submission', 'Rejected'].includes(ls) ? (ls === 'Amendment Requested' ? 'In Review' : 'Draft') : ls); const lv = live(m); const imp = impactedAssets(m);
  const users = S.assets.filter(a => a.blocks.some(b => b.moduleId === m.id));
  return `<div class="stack"><section class="panel"><div class="panel-head"><h3>Lifecycle</h3></div><div class="panel-body stack"><div class="life">${LIFE.map((s, i) => `<span class="life-st ${i === li ? 'on' : i < li ? 'past' : ''}">${i < li ? icon('check', 'sm') : ''}${s}</span>${i < LIFE.length - 1 ? `<span class="life-arrow">${icon('chevron', 'sm')}</span>` : ''}`).join('')}</div>
  <dl class="kv"><dt>Current version</dt><dd>v${latest(m).v} · ${esc(statusOf(m))}</dd><dt>Live version</dt><dd>${lv ? 'v' + lv.v + ' · approved ' + fmtD(lv.approvedAt) : 'None yet'}</dd><dt>Previous versions</dt><dd>${m.versions.filter(v => v !== latest(m)).map(v => 'v' + v.v + ' (' + v.status + ')').join(', ') || '—'}</dd><dt>Review date</dt><dd>${fmtD(m.reviewDate)}</dd><dt>Expiry</dt><dd>${fmtD(m.expiry)}${m.expiry ? ' · ' + (daysTo(m.expiry) >= 0 ? daysTo(m.expiry) + ' days left' : 'expired') : ''}</dd></dl></div></section>
  <section class="panel"><div class="panel-head"><h3>Assets using this module</h3><span class="chip plain">${users.length}</span>${imp.length ? `<span class="chip warn">${imp.length} on a previous version</span>` : ''}</div>${users.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Countries</th><th>Channel</th><th>Uses version</th><th>Asset status</th><th></th></tr></thead><tbody>${users.map(a => { const b = a.blocks.find(x => x.moduleId === m.id); const old = lv && b.v < lv.v; return `<tr class="click" ${goAttr('asset', a.id)}><td><div class="title">${esc(a.name)}</div><span class="mono muted">${a.id}</span></td><td>${tagList(a.markets)}</td><td>${esc(chan(a.channel).name)}</td><td>${vtag(b.v)} ${old ? '<span class="chip warn">Outdated</span>' : '<span class="chip ok">Current</span>'}</td><td>${chip(statusOf(a))}</td><td>${old && canEditObj(me(), a) ? `<button class="btn sm" data-act="replace-version" data-asset="${a.id}" data-module="${m.id}">Update to v${lv.v}</button>` : `<button class="btn sm ghost" ${goAttr('asset', a.id)}>Open</button>`}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><p>Not used in any material yet.</p></div>'}</section></div>`;
}
function viewMissing(what) { return `<div class="empty"><h4>${what} not found</h4><p>It may have been removed or the link is out of date.</p><br>${goBtn('Go home', 'home', null, 'primary')}</div>`; }

/* ===== Approval Cover Letter ===== */
// Every value on the letter is read from the approved version, its approval cycle and the decision records.
function viewCover() {
  const p = UI.route.p; const kind = p.k || 'Module'; const obj = objById(kind, p.id); if (!obj) return viewMissing(kind);
  const v = verOf(obj, +p.v) || live(obj) || latest(obj); const isM = kind === 'Module'; const r1 = isM ? 'module' : 'asset';
  const crumb = [[isM ? 'Modules' : 'Assets', isM ? 'modules' : 'assets'], [obj.id, r1, obj.id]];
  if (!v.approvedAt) return pageHead('Approval Cover Letter', 'This version is not approved yet.', goBtn('Back', r1, obj.id, ''), [...crumb, ['Cover letter']]);
  const mt = metaOf(obj, v); const cyc = v.cycles.filter(c => c.outcome === 'Approved').slice(-1)[0]; const wf = wfById(cyc.wf) || { name: cyc.wf };
  const steps = cyc.decisions.filter(x => ['Reviewed', 'Approved'].includes(x.decision));
  const amendments = cyc.decisions.filter(x => x.decision === 'Amendment requested');
  const ref = 'MLR-' + obj.id + '-V' + v.v; const bl = v.blocks || obj.blocks;
  return pageHead('Approval Cover Letter', `${esc(isM ? mt.title : mt.name)} · v${v.v}`, `<button class="btn" data-act="print">${icon('printer', 'sm')}Print</button>` + goBtn(isM ? 'Open module' : 'Open asset', r1, obj.id, '', 'arrow') + goBtn('Version history', r1, obj.id, '', 'history', ' data-tab="versions"'), [...crumb, ['Cover letter v' + v.v]]) +
  `<article class="letter" aria-label="Approval cover letter">
    <header class="letter-head"><img src="${LOGO}" alt="SAJA"><div><span class="eyebrow">${esc(S.settings.orgName)} · Medical, Legal &amp; Regulatory</span><h2>Approval Cover Letter</h2></div><div class="letter-ref"><span class="mono">${ref}</span>${v.status === 'Superseded' ? '<span class="chip dim">Superseded</span>' : '<span class="chip ok has-ico">' + icon('check', 'sm') + 'Approved</span>'}</div></header>
    <section class="letter-grid">
      ${[['Material name', esc(isM ? mt.title : mt.name)], ['Material ID', `<span class="mono">${obj.id}</span>`], ['Version', 'v' + v.v + (v.status === 'Superseded' ? ' · superseded' : '')], [isM ? 'Module type' : 'Material type', esc(isM ? mtype(mt.type).name : mat(mt.type).name)], ['Product(s)', esc(productsTxt(mt.products))], ['Country / countries', esc(marketsTxt(mt.markets))], ['Audience', esc(aud(mt.audience).name)], [isM ? 'Channels' : 'Channel', esc(isM ? channelsTxt(mt.channels) : chan(mt.channel).name)], ['Material Owner', esc(user(obj.owner).name)], ['Approval workflow', esc(wf.name)], ['Approval date', fmtDT(v.approvedAt)], ['Approval cycle', 'Cycle ' + cyc.n + ' of ' + v.cycles.length + ' · ' + fmtDur(cyc.end - cyc.start) + (amendments.length ? ' · ' + amendments.length + ' amendment' + (amendments.length > 1 ? 's' : '') : ' · no amendments')], ['Validity', isM ? 'Review by ' + fmtD(mt.reviewDate) + ' · expires ' + fmtD(mt.expiry) : 'Valid while all included modules remain approved'], ['Reason for this version', esc(v.reason || 'Initial version')]].map(([k, val]) => `<div><span>${k}</span><b>${val}</b></div>`).join('')}
    </section>
    ${isM && v.media ? `<section class="letter-content media-letter"><span class="eyebrow">Approved ${esc(kindLabel(kindOfType(mt.type)).toLowerCase())}</span><div class="letter-media"><div class="media-stage sm">${mediaView(v.media, 'thumb')}</div><div>${mediaFactsKV(v.media)}<p style="font-size:12.5px;margin-top:6px">${esc(v.body)}</p></div></div>${mediaRules(v.media)}<p class="muted" style="font-size:11.5px;margin-top:8px">Approval applies to the file with checksum ${esc(v.media.algo || '')} ${esc(v.media.checksum || '')}.</p></section>` : ''}
    ${isM && !v.media ? `<section class="letter-content"><span class="eyebrow">Approved content</span><p>${esc(v.body)}</p>${v.refs.length ? `<ol>${v.refs.map(r => `<li>${esc(refById(r).title)} — ${esc(refById(r).source)}</li>`).join('')}</ol>` : ''}</section>` : ''}${isM ? '' : `<section class="letter-content"><span class="eyebrow">Content</span><p>${bl.length} blocks · ${bl.filter(b => b.kind === 'module').length} approved modules (${esc(uniq(bl.filter(b => b.kind === 'module').map(b => b.moduleId + ' v' + b.v)).join(', '))})${bl.some(b => b.kind === 'new') ? ' · ' + bl.filter(b => b.kind === 'new').length + ' new text block(s) approved in this material' : ''}</p>${mt.disclaimer ? `<p style="font-size:12.5px;color:var(--ink-2)">Disclaimer: ${esc(mt.disclaimer)}</p>` : ''}</section>`}
    <section><span class="eyebrow">Approvers and decisions</span>
      <div class="table-wrap"><table class="tbl compact letter-tbl no-pg"><thead><tr><th>Step</th><th>Approver</th><th>Role</th><th>Decision</th><th>Date</th></tr></thead><tbody>${steps.map((x, i) => `<tr><td>${i + 1}. ${esc(x.fn)} ${x.req === 'approve' ? 'approval' : 'review'} · ${esc(levelName(x.level))}</td><td><b>${esc(user(x.by).name)}</b></td><td>${esc(x.role || roleLabel(user(x.by)))}${x.admin ? ' (on behalf of ' + esc(x.fn + ' ' + levelName(x.level)) + ')' : ''}</td><td>${chip(x.decision === 'Approved' ? 'Approved · e-signed' : 'Reviewed')}</td><td class="nw">${fmtDT(x.at)}</td></tr>`).join('')}</tbody></table></div>
      ${amendments.length ? `<p class="muted" style="font-size:12.5px;margin-top:8px">Amendments in this cycle: ${amendments.map(x => esc(x.fn + ' ' + levelName(x.level)) + ' on ' + fmtD(x.at) + ' — “' + esc(x.note) + '”').join('; ')}. Approval resumed at the requesting step after each resubmission.</p>` : ''}
    </section>
    <footer class="letter-foot"><span>Generated by SAJA MedLR on ${fmtDT(Date.now())} from the approval record</span><span class="mono">${ref}</span></footer>
  </article>`;
}

/* ===== Review workspace ===== */
function decisionButtons(obj, kind) {
  const st = curStep(obj); const u = me(); if (!st || !canActOn(u, obj)) return '';
  const isLead = st.level === 'Lead'; const hasMember = memberStepIndex(obj) >= 0; const issues = validationIssues(obj, kind);
  const a = (d, label, cls, ic) => btn(label, 'decide', cls, `data-kind="${kind}" data-id="${obj.id}" data-d="${d}"`, ic);
  let h = '';
  if (can(u, 'reject')) h += a('reject', 'Reject', 'danger', 'x');
  if (can(u, 'request_amend')) h += a('amend', 'Request amendment', '', 'undo');
  if (isLead && hasMember) h += a('return', 'Return to Member', '', 'back');
  const nx = nextStepOf(obj); const openN = S.settings.blockOnOpenComments ? blockingAnns(obj).length : 0;
  if (openN) return h + `<button class="btn primary" disabled title="Resolve the open reviewer comments first">${icon('lock', 'sm')}${openN} open comment${openN > 1 ? 's' : ''} — resolve to ${st.req === 'approve' ? 'approve' : 'complete'}</button>`;
  if (st.req === 'approve') h += issues.length ? `<button class="btn primary" disabled title="Resolve validation issues first">${icon('key', 'sm')}${esc(st.fn)} approval</button>` : btn(st.fn + ' approval' + (nx ? '' : ' (final)'), 'sign', 'primary', `data-kind="${kind}" data-id="${obj.id}"`, 'key');
  else h += a('pass', nx ? 'Complete review — send to ' + stepWho(nx) : 'Complete review', 'primary', 'send');
  return h;
}
function authorityBanner(obj) {
  const st = curStep(obj); const u = me(); const wf = wfById(obj.review.wf); const nx = nextStepOf(obj); const as = assigneeFor(st);
  const who = canActOn(u, obj) && !isAdmin(u) ? u : as[0] || { name: '—' };
  return `<div class="authority"><div><div class="lbl">${esc(st.fn)} ${st.req === 'approve' ? 'approval' : 'review'}</div><div class="v">${icon('shieldcheck', 'sm')}Step ${reviewPos(wf, obj.review.step)} of ${reviewSteps(wf).length} · cycle ${obj.review.cycle}</div></div>
  <div><div class="lbl">Assigned to</div><div class="v">${avatar(who, 'sm')}${esc(who.name)} ${lvl(st.level)}</div></div>
  <div><div class="lbl">Waiting</div><div class="v">${icon('clock', 'sm')}${fmtDur(Date.now() - obj.review.stepStartedAt)}</div></div>
  <div><div class="lbl">Next</div><div class="v">${icon('arrow', 'sm')}${nx ? esc(stepLabel(nx)) : 'Approved → ' + (kindOf(obj) === 'Module' ? 'Library' : 'ready to use')}</div></div></div>`;
}
function adminNote(obj) { const u = me(); const st = curStep(obj); return isAdmin(u) && st ? `<div class="banner info" style="margin-bottom:14px">${icon('key')}<div class="txt"><b>You are acting as Administrator</b><p>This step is assigned to the ${esc(stepWho(st))}${assigneeFor(st).length ? ' (' + esc(assigneeFor(st).map(x => x.name).join(', ')) + ')' : ''}. Decisions you record are marked “Recorded by Administrator” in the audit trail and cover letter.</p></div></div>` : ''; }
function viewReview() {
  const m = modById(UI.route.p.id); if (!m) return viewMissing('Module');
  const u = me(); const l = latest(m);
  if (!m.review) return pageHead(esc(m.title), 'This module is not in review.', goBtn('Open module', 'module', m.id, 'primary'), [['My Tasks', 'tasks'], [m.id]]) + `<div class="banner">${icon('inbox')}<div class="txt"><b>Current status: ${esc(lifeStatus(m))}</b><p>The review has been completed or moved on.</p></div></div>`;
  const mine = canActOn(u, m); const st = curStep(m); const cyc = curCycle(m);
  if (mine && !(m.review.startedBy)) { m.review.startedBy = u.id; log('Review started', 'Module', m, l.v, { note: stepLabel(st) }); save(); }
  const memberNotes = cyc.decisions.filter(c => c.fn === st.fn && c.level === 'Member');
  return pageHead(esc(m.title), `<span class="row" style="gap:8px">${chip('In Review')}${vtag(l.v)}<span class="mono">${m.id}</span></span>`, mine ? decisionButtons(m, 'Module') : '', [['My Tasks', 'tasks'], [m.id, 'module', m.id], ['Review']]) +
  (mine ? adminNote(m) : `<div class="banner info" style="margin-bottom:14px">${icon('eye')}<div class="txt"><b>View only — this step is assigned to the ${esc(stepWho(st))}</b><p>You are signed in as ${esc(roleLabel(u))}.</p></div></div>`) +
  approvalTimeline(m) + `<div class="stack" style="margin-bottom:16px">${authorityBanner(m)}</div>
  <div class="grid cols-main"><div class="stack">
    <section class="panel"><div class="panel-head"><h3>Module content</h3><span class="tag">${esc(mtype(m.type).name)}</span><span class="grow"></span><span class="muted" style="font-size:12px">v${l.v} · cycle ${m.review.cycle}</span></div><div class="panel-body stack" style="gap:18px">${reviewCanvas(m, canAnnotate(m))}${isMediaType(m.type) ? mediaRules(l.media) + (l.media ? mediaFactsKV(l.media) : '') : ''}
      <div class="fgrid meta-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['Products', productsTxt(m.products)], ['Indication', indsTxt(m.indications)], ['Audience', aud(m.audience).name], ['Countries', marketsTxt(m.markets)], ['Channels', channelsTxt(m.channels)], ['Version', 'v' + l.v + (live(m) && live(m) !== l ? ' (replaces v' + live(m).v + ')' : '')]].map(([k, v]) => `<div><div class="section-title" style="font-size:10.5px">${k}</div><div style="font-weight:700;margin-top:2px">${esc(v)}</div></div>`).join('')}</div></div></section>
    <section class="panel"><div class="panel-head"><h3>References & evidence</h3><span class="chip plain">${l.refs.length}</span></div><div class="panel-body">${refsList(l.refs)}</div></section>
    ${live(m) && live(m) !== l ? `<section class="panel"><div class="panel-head"><h3>What changed from v${live(m).v}</h3></div><div class="panel-body stack"><p class="muted" style="font-size:12.5px">Reason: ${esc(l.reason || '—')}</p>${isMediaType(m.type) ? `<div class="grid cols-2"><div><span class="tag">v${live(m).v} · approved</span><div class="media-stage sm">${mediaView(live(m).media, 'thumb')}</div><p class="muted" style="font-size:12px">${esc(live(m).media ? live(m).media.name : '—')}</p></div><div><span class="tag">v${l.v} · in review</span><div class="media-stage sm">${mediaView(l.media, 'thumb')}</div><p class="muted" style="font-size:12px">${esc(l.media ? l.media.name : '—')}${live(m).media && l.media && live(m).media.checksum === l.media.checksum ? ' · same file' : ' · new file'}</p></div></div>` : ''}<div class="comment prev-ver"><div class="who"><span class="tag">v${live(m).v} · approved</span></div><p style="text-decoration:line-through;color:var(--ink-3)">${esc(live(m).body)}</p></div><div class="comment"><div class="who"><span class="tag">v${l.v} · in review</span></div><p>${esc(l.body)}</p></div></div></section>` : ''}
  </div>
  <div class="stack rv-side">
    ${commentsPanel(m, canAnnotate(m))}
    ${validationPanel(m, 'Module')}
    ${st.level === 'Lead' && memberNotes.length ? `<section class="panel"><div class="panel-head"><h3>${esc(st.fn)} Member review</h3></div><div class="panel-body">${decisionsList(memberNotes)}</div></section>` : ''}
    <section class="panel"><div class="panel-head"><h3>Decisions in this cycle</h3></div><div class="panel-body">${decisionsList(cyc.decisions)}</div></section>
  </div></div>`;
}

/* ===== My Tasks: the personal action queue — what requires an action from me.
   Admin sees every actionable item; other users see only what their function, level, team, workflow step and permissions let them act on. ===== */
const MYTASK_TABS = [['review', 'Pending review', 'Waiting for your review or approval at the current workflow step'], ['amend', 'Amendment requested', 'Back with the owner; approval resumes at the same step'], ['submit', 'Awaiting submission', 'Prepared, ready to be submitted for review'], ['rejected', 'Rejected · new version', 'The cycle was closed; a new version restarts the full cycle']];
function viewApprovals() {
  const u = me(); const all = tasksFor(u); const admin = isAdmin(u);
  const groups = MYTASK_TABS.map(g => [g[0], g[1], all.filter(t => taskGroup(t) === g[0]), g[2]]);
  const tab = UI.route.p.tab || F('atab') || (groups.find(g => g[2].length) || groups[0])[0];
  const list = (groups.find(g => g[0] === tab) || groups[0])[2];
  const q = F('apq').toLowerCase();
  const fl = list.filter(t => { const I = taskInfo(t); return (!q || (t.title + t.id).toLowerCase().includes(q)) && (!F('apk') || t.type === F('apk')) && (!F('apfn') || (t.step && t.step.fn === F('apfn'))) && (!F('apdec') || (t.step && t.step.req === F('apdec'))) && (!F('appr') || I.priority === F('appr')) && (!F('approd') || t.obj.products.includes(F('approd'))) && (!F('apmkt') || t.obj.markets.includes(F('apmkt'))) && (!F('apwf') || (t.obj.review || t.obj.resume || {}).wf === F('apwf')); })
    .sort((x, y) => ({ High: 0, Medium: 1, Normal: 2 })[taskInfo(x).priority] - ({ High: 0, Medium: 1, Normal: 2 })[taskInfo(y).priority] || x.since - y.since);
  const sla = S.settings.reviewSlaDays || 3;
  const submitted = o => { const c = curCycle(o) || latest(o).cycles.slice(-1)[0]; return c ? c.start : null; };
  const row = t => { const o = t.obj; const I = taskInfo(t); const isA = t.type === 'Asset'; const sub = submitted(o);
    return `<tr class="click" ${goAttr(taskTarget(t), o.id)} tabindex="0">
    <td><div class="cell-title">${isA ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : modThumb(o, latest(o))}<div><div class="title">${esc(t.title)}</div><span class="muted mt-sub"><span class="kind-tag ${isA ? 'asset' : 'module'}">${t.type}</span> ${esc(I.typeName)} · v${latest(o).v}</span></div></div></td>
    <td><span class="hm-step">${t.step ? fnBadge(t.step.fn, 'sm') : ''}<span>${esc(I.step)}${t.kind === 'review' ? `<br><span class="muted" style="font-size:11.5px">Step ${reviewPos(wfById(o.review.wf), o.review.step)} of ${reviewSteps(wfById(o.review.wf)).length} · cycle ${o.review.cycle}</span>` : ''}</span></span></td>
    <td class="mt-resp">${esc(I.responsible)}${t.kind === 'review' ? '<br>' + lvl(t.step.level) : ''}</td>
    <td class="nw muted">${sub ? fmtD(sub) : '—'}</td>
    <td class="nw num">${fmtDur(I.wait)}</td>
    <td><span class="prio ${PRIO_TONE[I.priority]}">${I.priority}</span></td>
    <td><span class="hm-act ${t.kind}">${esc(I.action)}</span></td>
    <td class="nw" style="text-align:right">${goBtn(t.kind === 'review' ? 'Review' : 'Open', taskTarget(t), o.id, t.kind === 'review' ? 'sm primary nw' : 'sm nw')}</td></tr>`; };
  const filters = filterBar('tasks', `${fsearch('apq', F('apq'), 'Search title or ID')}${fsel('apk', F('apk'), ['Module', 'Asset'], 'Modules and assets')}${fsel('appr', F('appr'), ['High', 'Medium', 'Normal'], 'Any priority')}${fsel('approd', F('approd'), S.products.map(p => [p.id, p.name]), 'All products')}${fsel('apmkt', F('apmkt'), S.markets.map(m => [m.id, m.name]), 'All countries')}${fsel('apwf', F('apwf'), S.workflows.filter(w => !w.hidden).map(w => [w.id, w.name]), 'All workflows')}${tab === 'review' ? fsel('apfn', F('apfn'), reviewFuncs(true), 'All review steps') + fsel('apdec', F('apdec'), [['review', 'Member review steps'], ['approve', 'Lead approval steps']], 'Review and approval steps') : ''}`, `${fl.length} of ${list.length}`);
  const high = all.filter(t => taskInfo(t).priority === 'High').length;
  return pageHead('My Tasks', admin ? 'Every item that needs an action in the approval workflow, across all users. Priority follows the review SLA of ' + sla + ' days in Settings.' : 'What requires an action from you — only items your role, level, team, workflow step and permissions let you act on. Priority follows the review SLA of ' + sla + ' days.', `${high ? `<span class="chip bad">${high} high priority</span>` : ''}${can(u, 'page_library') ? goBtn('Approved Library', 'library', null, 'ghost', 'book') : ''}`) +
  `<div class="tabs" role="tablist" style="margin-bottom:12px">${groups.map(g => `<button class="tab ${tab === g[0] ? 'active' : ''}" role="tab" aria-selected="${tab === g[0]}" title="${esc(g[3])}" ${goAttr('tasks', null, ` data-tab="${g[0]}"`)}>${g[1]}<span class="n">${g[2].length}</span></button>`).join('')}</div>
  ${filters}
  <section class="panel table-wrap">${fl.length ? `<table class="tbl list-tbl mt-tbl"><thead><tr><th>Item</th><th>Current step</th><th>${tab === 'review' ? 'Assigned reviewer' : 'Responsible'}</th><th>Submitted</th><th>Waiting</th><th>Priority</th><th>Required action</th><th></th></tr></thead><tbody>${fl.map(row).join('')}</tbody></table>` : `<div class="empty"><h4>${list.length ? 'No tasks match these filters' : 'Nothing here'}</h4><p>${list.length ? 'Clear a filter to see all ' + list.length + '.' : tab === 'review' ? 'No items are waiting for your review.' : 'No items in this state need your action.'}</p></div>`}</section>`;
}

/* ===== Approved Library ===== */
// The library is a view over approved versions: it reads each module's live version and the scope it was approved for.
function viewLibrary() {
  const tab = UI.route.p.tab || F('ltab', 'modules'); const q = F('lq').toLowerCase();
  const apOk = t => !F('lapp') || (t && t > Date.now() - +F('lapp') * DAY);
  const expOk = (exp, rev) => { const f = F('lexp'); if (!f) return true; const de = exp ? daysTo(exp) : 9999, dr = rev ? daysTo(rev) : 9999; return f === '30' ? de <= 30 : f === '90' ? de <= 90 : f === 'rev90' ? dr <= 90 : de > 90; };
  const verOk = v => !F('lver') || (F('lver') === '1' ? v === 1 : v >= 2);
  const showExp = S.settings.libraryShowExpiring;
  let body = '', count = 0;
  if (tab === 'modules') {
    const rows = S.modules.filter(m => { const ls = libraryStatus(m); if (!ls || ls === 'Review Required' || (!showExp && ls === 'Expiring')) return false; const lv = live(m); const lm = liveMeta(m);
      return (!q || (lm.title + m.id + lv.body + (lv.media ? lv.media.name + lv.media.source : '')).toLowerCase().includes(q)) && (!F('lcat') || (F('lcat') === 'media') === isMediaType(lm.type)) && (!F('lprod') || lm.products.includes(F('lprod'))) && (!F('lmkt') || lm.markets.includes(F('lmkt'))) && (!F('ltype') || lm.type === F('ltype')) && (!F('laud') || lm.audience === F('laud')) && (!F('lch') || lm.channels.includes(F('lch'))) && (!F('lstat') || ls === F('lstat')) && apOk(lv.approvedAt) && expOk(lm.expiry, lm.reviewDate) && verOk(lv.v); }).sort((a, b) => live(b).approvedAt - live(a).approvedAt);
    count = rows.length;
    body = rows.length ? `<table class="tbl lib-tbl"><thead><tr><th>Module</th><th>Products</th><th>Approved for</th><th>Version</th><th>Status</th><th>Approved</th><th>Valid until</th><th style="text-align:right"></th></tr></thead><tbody>${rows.map(m => { const lv = live(m); const lm = liveMeta(m); const ls = libraryStatus(m); const dl = daysTo(lm.expiry);
      return `<tr class="click" ${goAttr('module', m.id, ` data-v="${lv.v}"`)} tabindex="0"><td><div class="cell-title">${modThumb(m, lv)}<div><div class="title">${esc(lm.title)}</div><span class="mono muted">${m.id} · ${esc(mtype(lm.type).name)}</span></div></div></td><td>${tagList(lm.products, 'p')}</td><td><div class="usable"><span>${tagList(lm.markets)}</span><span class="muted">${esc(aud(lm.audience).name)} · ${esc(channelsTxt(lm.channels))}</span></div></td><td>${vtag(lv.v)}${latest(m) !== lv ? ` <span class="muted" style="font-size:11.5px">v${latest(m).v} ${esc(statusOf(m).toLowerCase())}</span>` : ''}</td><td>${chip(ls)}</td><td class="nw">${fmtD(lv.approvedAt)}</td><td><div class="valid"><b class="num">${fmtD(lm.expiry)}</b><span class="${dl <= S.settings.expiryWarnDays ? 'soon' : 'muted'}">${dl > 60 ? Math.round(dl / 30) + ' months left' : dl + ' days left'}</span></div></td><td style="text-align:right"><button class="btn icon sm" ${goAttr('cover', m.id, ` data-k="Module" data-v="${lv.v}"`)} title="Cover letter" aria-label="Cover letter for ${esc(m.id)}">${icon('award', 'sm')}</button></td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>No approved modules match</h4><p>Adjust the filters, or approve more content through the MLR workflow.</p></div>`;
  } else {
    const rows = S.assets.filter(a => { const lv = live(a); if (!lv || a.archived) return false; const lm = liveMeta(a); const okMods = (lv.blocks || a.blocks).every(b => b.kind === 'new' || (modById(b.moduleId) && !modById(b.moduleId).archived && !(liveMeta(modById(b.moduleId)).expiry < Date.now())));
      return okMods && (!q || (lm.name + a.id).toLowerCase().includes(q)) && (!F('lprod') || lm.products.includes(F('lprod'))) && (!F('lmkt') || lm.markets.includes(F('lmkt'))) && (!F('lmat') || lm.type === F('lmat')) && (!F('laud') || lm.audience === F('laud')) && (!F('lch') || lm.channel === F('lch')) && apOk(lv.approvedAt) && verOk(lv.v); }).sort((a, b) => live(b).approvedAt - live(a).approvedAt);
    count = rows.length;
    body = rows.length ? `<table class="tbl lib-tbl"><thead><tr><th>Material</th><th>Products</th><th>Countries</th><th>Channel</th><th>Version</th><th>Approved</th><th style="text-align:right"></th></tr></thead><tbody>${rows.map(a => { const lv = live(a); const lm = liveMeta(a); return `<tr class="click" ${goAttr('asset', a.id, ` data-v="${lv.v}"`)} tabindex="0"><td><div class="cell-title"><span class="type-ico">${icon('layers', 'sm')}</span><div><div class="title">${esc(lm.name)}</div><span class="mono muted">${a.id} · ${esc(mat(lm.type).name)}</span></div></div></td><td>${tagList(lm.products, 'p')}</td><td>${tagList(lm.markets)}</td><td>${esc(chan(lm.channel).name)}<br><span class="muted" style="font-size:12px">${esc(aud(lm.audience).name)}</span></td><td>${vtag(lv.v)}</td><td class="nw">${fmtD(lv.approvedAt)}</td><td style="text-align:right"><button class="btn icon sm" ${goAttr('cover', a.id, ` data-k="Asset" data-v="${lv.v}"`)} title="Cover letter" aria-label="Cover letter for ${esc(a.id)}">${icon('award', 'sm')}</button></td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>No approved materials match</h4><p>Adjust the filters.</p></div>`;
  }
  const keys = ['lq', 'lprod', 'lmkt', 'lcat', 'ltype', 'lmat', 'laud', 'lch', 'lapp', 'lver', 'lexp', 'lstat'];
  return pageHead('Approved Library', 'The repository: approved, currently valid content that every authorised SAJA user can find and reuse. Work in progress is in Modules and My Tasks; drafts, withdrawn and expired content are never shown here.', goBtn('My Tasks', 'tasks', null, '', 'inbox')) +
  `<div class="tabs" role="tablist" style="margin-bottom:14px">${[['modules', 'Modules'], ['materials', 'Assets']].map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" role="tab" aria-selected="${tab === t[0]}" ${goAttr('library', null, ` data-tab="${t[0]}"`)}>${t[1]}</button>`).join('')}</div>
  ${filterBar('library', `${fsearch('lq', F('lq'), tab === 'modules' ? 'Search approved modules' : 'Search approved assets')}${fsel('lprod', F('lprod'), S.products.map(p => [p.id, p.name]), 'All products')}${fsel('lmkt', F('lmkt'), S.markets.map(m => [m.id, m.name]), 'All countries')}${tab === 'modules' ? fsel('lcat', F('lcat'), [['content', 'Content modules'], ['media', 'Media & document modules']], 'All categories') + fsel('ltype', F('ltype'), S.moduleTypes.map(t => [t.id, t.name]), 'All module types') : fsel('lmat', F('lmat'), S.materialTypes.map(t => [t.id, t.name]), 'All material types')}${fsel('laud', F('laud'), S.audiences.map(a => [a.id, a.name]), 'All audiences')}${fsel('lch', F('lch'), S.channels.map(c => [c.id, c.name]), 'All channels')}${fsel('lapp', F('lapp'), [['30', 'Approved in last 30 days'], ['90', 'Approved in last 90 days'], ['365', 'Approved in last 12 months']], 'Any approval date')}${fsel('lver', F('lver'), [['1', 'v1 only'], ['2', 'v2 and later']], 'Any version')}${tab === 'modules' ? fsel('lexp', F('lexp'), [['30', 'Expires within 30 days'], ['90', 'Expires within 90 days'], ['rev90', 'Review due within 90 days'], ['later', 'Valid for over 90 days']], 'Any expiry / review') + fsel('lstat', F('lstat'), ['Approved', 'Active', 'Expiring'], 'All valid statuses') : ''}`, `${count} ${tab === 'modules' ? 'modules' : 'assets'}`)}
  <section class="panel table-wrap">${body}</section>`;
}
