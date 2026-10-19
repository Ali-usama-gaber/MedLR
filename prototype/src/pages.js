/* ---------- Views: workspace ---------- */
const LOGO = '__LOGO__';
const goAttr = (name, id, extra = '') => `data-go="${name}"${id ? ` data-id="${esc(id)}"` : ''}${extra}`;
const crumbs = list => `<nav class="crumbs" aria-label="Breadcrumb">${list.map((c, i) => i === list.length - 1 ? `<span class="cur">${esc(c[0])}</span>` : `<button ${goAttr(c[1], c[2], c[3] || '')}>${esc(c[0])}</button>${icon('chevron', 'sm')}`).join('')}</nav>`;
// ⓘ: contextual explanation, hidden until clicked. body is trusted HTML built by the caller.
const infoTip = (id, title, body, align = '') => { const on = UI.pop === 'info:' + id; return `<span class="itip"><button type="button" class="itip-btn ${on ? 'on' : ''}" data-act="pop" data-pop="info:${esc(id)}" aria-label="About: ${esc(title)}" aria-expanded="${on}" aria-haspopup="dialog">${icon('info', 'sm')}</button>${on ? `<div class="pop itip-pop ${align}" role="dialog" aria-label="${esc(title)}"><div class="itip-h"><b>${esc(title)}</b><button type="button" class="itip-x" data-act="pop-close" aria-label="Close">${icon('x', 'sm')}</button></div><div class="itip-b">${body}</div></div>` : ''}</span>`; };
const pageHead = (title, sub, actions = '', cr = null, info = null) => `<header class="page-head"><div class="titles">${cr ? crumbs(cr) : ''}<h1>${title}${info ? infoTip(info[0], info[1], info[2]) : ''}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</header>`;
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
const ftext = (k, label, ph) => FMARK({ t: 't', k, label, ph });
// A select with a search box above it, for long lists such as people.
const fpick = (k, options, all, label, noun) => FMARK({ t: 'p', k, all, def: '', label, noun, o: options.map(o => [String(o[0]), String(o[1])]) });
const FLABEL = { 'All products': 'Product', 'All countries': 'Country', 'All material types': 'Material type', 'All statuses': 'Status', 'All actions': 'Action', 'All objects': 'Object', 'All users': 'User', 'All functions': 'Function', 'Any level': 'Level', 'Any status': 'Status', 'All categories': 'Category', 'All module types': 'Module type', 'All audiences': 'Audience', 'All channels': 'Channel', 'Any approval date': 'Approval date', 'Any version': 'Version', 'Any expiry / review': 'Expiry / review date', 'All valid statuses': 'Status', 'Modules and assets': 'Item type', 'All owners': 'Owner', 'All workflows': 'Workflow', 'Any time': 'Updated', 'All review steps': 'Review step', 'Any priority': 'Priority' };
const fsel = (k, cur, options, all, label, def) => FMARK({ t: 's', k, all, def: def || '', label: label || FLABEL[all] || String(all || '').replace(/^(All|Any) /, '').replace(/^./, c => c.toUpperCase()), o: options.map(o => Array.isArray(o) ? [String(o[0]), String(o[1])] : [String(o), String(o)]) });
const fdate = (k, label) => FMARK({ t: 'd', k, label });
const FILTERS = {};
const fActive = d => F(d.k) && F(d.k) !== d.def;
function fShow(d) { const v = F(d.k); if (d.t === 's') { const o = d.o.find(x => x[0] === v); return o ? o[1] : v; } if (d.t === 'p') { const o = d.o.find(x => x[0] === v); return o ? o[1].split(' · ')[0] : v; } if (d.t === 'd') return fmtD(fromISO(v)); return '“' + v + '”'; }
function filterBar(id, spec, count) {
  const defs = String(spec).split('\u0001').slice(1).map(x => JSON.parse(x.split('\u0002')[0])); FILTERS[id] = defs;
  const act = defs.filter(fActive);
  return `<div class="toolbar fbar"><button type="button" class="btn sm fbtn ${act.length ? 'on' : ''}" data-act="flt-open" data-id="${id}" aria-haspopup="dialog">${icon('filter', 'sm')}Filter${act.length ? `<span class="fb-n">· ${act.length} active</span>` : ''}</button>${act.map(d => `<span class="fchip"><span class="muted">${esc(d.label)}:</span> ${esc(fShow(d))}<button type="button" data-act="flt-rm" data-k="${esc(d.k)}" data-def="${esc(d.def)}" aria-label="Remove ${esc(d.label)} filter">${icon('x', 'sm')}</button></span>`).join('')}${act.length > 1 ? `<button type="button" class="btn ghost sm" data-act="flt-clear" data-id="${id}">Clear all</button>` : ''}<span class="muted fcount">${count || ''}</span></div>`;
}
function filterModal(M) {
  const defs = FILTERS[M.id] || []; const D = M.d;
  const field = d => { const id = 'fd-' + d.k;
    if (d.t === 'q') return `<div class="field span2"><label for="${id}">Search</label><div class="field-inline">${icon('search', 'sm')}<input type="search" id="${id}" data-fd="${esc(d.k)}" value="${esc(D[d.k] || '')}" placeholder="${esc(d.ph || 'Search')}"></div></div>`;
    if (d.t === 't') return `<div class="field"><label for="${id}">${esc(d.label)}</label><div class="field-inline">${icon('search', 'sm')}<input type="search" id="${id}" data-fd="${esc(d.k)}" value="${esc(D[d.k] || '')}" placeholder="${esc(d.ph || '')}"></div></div>`;
    if (d.t === 'p') return `<div class="field"><label for="${id}">${esc(d.label)}</label><div class="field-inline">${icon('search', 'sm')}<input type="search" id="${id}-q" data-fq="${id}" placeholder="Search ${esc(d.noun || 'people')}" aria-label="Search ${esc(d.noun || 'people')}" autocomplete="off"></div><select class="select" id="${id}" data-fd="${esc(d.k)}" style="margin-top:6px">${opt('', D[d.k], d.all)}${d.o.map(o => opt(o[0], D[d.k], o[1])).join('')}</select></div>`;
    if (d.t === 'd') return `<div class="field"><label for="${id}">${esc(d.label)}</label><input class="input" type="date" id="${id}" data-fd="${esc(d.k)}" value="${esc(D[d.k] || '')}"></div>`;
    return `<div class="field"><label for="${id}">${esc(d.label)}</label><select class="select" id="${id}" data-fd="${esc(d.k)}">${d.all ? opt('', D[d.k], d.all) : ''}${d.o.map(o => opt(o[0], D[d.k] || d.def, o[1])).join('')}</select></div>`; };
  const n = defs.filter(d => D[d.k] && D[d.k] !== d.def).length;
  return modalShell('filter', '', 'Filter', n ? n + ' filter' + (n > 1 ? 's' : '') + ' selected' : 'Narrow the list. Nothing changes until you apply.', `<div class="fgrid flt-grid">${defs.map(field).join('')}</div>`,
    `<button class="btn ghost" data-act="flt-reset">Clear all</button><span class="grow"></span>${btn('Cancel', 'modal-close')}${btn('Apply filters', 'flt-apply', 'primary', '', 'check')}`);
}
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
// "+ Add new" beside a selector: creates the missing configuration record in the same form used in Settings, then selects it.
// The form being filled in stays as it is (it is not left), so typed text and uploaded files are kept.
const permName = p => (PERMS.find(x => x[0] === p) || [p, p])[1];
function addNew(k, field, label) {
  const C = CONFIG[k]; const lab = label || C.label.toLowerCase();
  return can(me(), C.perm) ? `<button type="button" class="add-new" data-act="cfg-quick" data-k="${k}" data-field="${field}">${icon('plus', 'sm')}Add new ${esc(lab)}</button>`
    : `<span class="add-new disabled" aria-disabled="true" title="Adding a ${esc(lab)} needs the “${esc(permName(C.perm))}” permission">${icon('lock', 'sm')}Add new ${esc(lab)}</span>`;
}
const labelRow = (lbl, extra, forId) => `<div class="label-row">${forId ? `<label for="${forId}">${lbl}</label>` : `<span class="label">${lbl}</span>`}${extra}</div>`;
function chipSelect(id, act, k, options, selected, opts = {}) {
  const open = UI.msel === id; const q = open ? (UI.mselq || '').toLowerCase() : ''; const label = o => (options.find(x => x[0] === o) || [o, o])[1]; const ex = opts.extra || '';
  const list = options.filter(o => !q || o[1].toLowerCase().includes(q));
  const chips = selected.map(v => `<span class="mchip">${esc(label(v))}<button type="button" data-act="${act}" data-k="${k}" data-v="${esc(v)}" ${ex} aria-label="Remove ${esc(label(v))}">${icon('x', 'sm')}</button></span>`).join('');
  return `<div class="msel ${open ? 'open' : ''} ${opts.invalid ? 'invalid' : ''}" data-msel="${id}"><div class="msel-box">${opts.below ? '' : chips}<button type="button" class="msel-add" data-act="msel-open" data-id="${id}" aria-expanded="${open}">${icon(opts.below ? 'search' : 'plus', 'sm')}${opts.below ? (selected.length ? selected.length + ' selected' : esc(opts.ph || 'Select')) : selected.length ? 'Select' : esc(opts.ph || 'Select')}</button>${opts.below ? icon('down', 'sm') : ''}</div>
  ${open ? `<div class="msel-pop" role="listbox" aria-multiselectable="true"><div class="field-inline msel-search">${icon('search', 'sm')}<input type="search" id="mselq-${id}" data-mselq="1" value="${esc(UI.mselq || '')}" placeholder="Search ${esc(opts.noun || '')}" aria-label="Search ${esc(opts.noun || '')}" autocomplete="off"></div><div class="msel-list">${list.map(([v, l, sub]) => { const on = selected.includes(v); return `<button type="button" class="msel-opt ${on ? 'on' : ''}" role="option" aria-selected="${on}" data-act="${act}" data-k="${k}" data-v="${esc(v)}" ${ex}><span class="box">${on ? icon('check', 'sm') : ''}</span><span class="ml">${esc(l)}</span>${sub ? `<span class="muted">${esc(sub)}</span>` : ''}</button>`; }).join('') || '<div class="muted" style="padding:10px 12px;font-size:12.5px">No matches</div>'}</div><div class="msel-foot"><span class="muted">${selected.length} selected</span>${opts.bulk ? `<button type="button" class="linklike" data-act="${opts.bulk}" data-k="${k}" data-v="all">Select all</button><button type="button" class="linklike" data-act="${opts.bulk}" data-k="${k}" data-v="none">Clear all</button>` : ''}<button type="button" class="btn sm" data-act="msel-close">Done</button></div></div>` : ''}</div>${opts.below ? `<div class="msel-below">${chips || `<span class="muted">${esc(opts.empty || 'None selected')}</span>`}</div>` : ''}`;
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
  ['GOVERNANCE'], ['lifecycle', 'Lifecycle', 'clock', null, 'view_audit'], ['audit', 'Audit Trail', 'history', null, 'view_audit'], ['sops', 'Validation SOPs', 'clipboard', null, ['manage_sops', ADMIN_VIEW]], ['workflows', 'Workflows', 'workflow', null, ['manage_workflows', ADMIN_VIEW]], ['refdata', 'Reference Data', 'database', null, 'page_admin'],
  ['ADMINISTRATION'], ['roles', 'Roles & Permissions', 'key', null, ['manage_users', ADMIN_VIEW]], ['org', 'People & Teams', 'users', null, ['manage_users', ADMIN_VIEW]], ['settings', 'Settings', 'settings', null, ['manage_settings', 'manage_users', ADMIN_VIEW]]
];
const NAV_OF = { module: 'modules', 'module-new': 'modules', 'module-edit': 'modules', review: 'tasks', 'asset-review': 'tasks', approvals: 'tasks', assemble: 'assets', asset: 'assets', user: 'org', 'user-new': 'org', 'user-edit': 'org', users: 'org', workflow: 'workflows', 'workflow-new': 'workflows', cover: 'library' };
const ROUTE_PERM = { modules: 'page_modules', module: 'view', 'module-new': 'create', 'module-edit': 'edit', review: 'view', tasks: 'page_tasks', approvals: 'page_tasks', assets: 'page_assets', asset: 'view', assemble: 'edit', 'asset-review': 'view', library: 'page_library', cover: 'view', references: 'view_audit', reports: 'view_reports', lifecycle: 'view_audit', audit: 'view_audit', sops: ['manage_sops', ADMIN_VIEW], workflows: ['manage_workflows', ADMIN_VIEW], workflow: ['manage_workflows', ADMIN_VIEW], 'workflow-new': 'manage_workflows', users: ['manage_users', ADMIN_VIEW], user: ['manage_users', ADMIN_VIEW], 'user-new': 'manage_users', 'user-edit': 'manage_users', roles: ['manage_users', ADMIN_VIEW], functions: ['manage_users', ADMIN_VIEW], teams: ['manage_users', ADMIN_VIEW], products: ['manage_settings', ADMIN_VIEW], markets: ['manage_settings', ADMIN_VIEW], moduletypes: ['manage_settings', ADMIN_VIEW], materials: ['manage_settings', ADMIN_VIEW], channels: ['manage_settings', ADMIN_VIEW], audiences: ['manage_settings', ADMIN_VIEW], settings: ['manage_settings', 'manage_users', ADMIN_VIEW] };

function viewShell(inner) {
  const u = me(); const active = UI.route.name === 'item' ? NAV_OF[UI.route.p.k] || UI.route.p.k : NAV_OF[UI.route.name] || UI.route.name; const nTasks = tasksFor(u).length;
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
  const notifs = notificationsFor(u); const nUnread = notifUnread(u); const unread = nUnread > 0;
  return `<header class="topbar">
    <div class="search" id="gsearch">${icon('search', 'sm')}<input id="global-search" type="search" placeholder="Search modules, assets, people…" value="${esc(UI.search)}" aria-label="Search" autocomplete="off">${UI.search ? viewSearchPop() : ''}</div>
    <div class="grow"></div>
    <div class="rel"><button class="btn icon" data-act="pop" data-pop="bell" aria-label="Notifications">${icon('bell')}${unread ? `<span class="bell-dot bell-n" aria-label="${nUnread} unread">${nUnread > 9 ? '9+' : nUnread}</span>` : ''}</button>${UI.pop === 'bell' ? viewNotifPop(notifs) : ''}</div>
    <div class="rel"><button class="userbtn" data-act="pop" data-pop="user" aria-label="Account menu">${avatar(u)}<span class="meta"><b>${esc(u.name)}</b><span>${esc(roleLabel(u))}</span></span>${icon('down', 'sm')}</button>${UI.pop === 'user' ? `<div class="pop" role="menu" style="width:260px"><div class="pop-id">${avatar(u)}<span><b>${esc(u.name)}</b><span>${esc(u.email)}</span></span></div>${can(u, 'manage_users') ? `<button class="pop-item" role="menuitem" ${goAttr('user', u.id)}>${icon('users', 'sm')}My profile</button>` : ''}${can(u, 'manage_settings') ? `<button class="pop-item" role="menuitem" ${goAttr('settings')}>${icon('settings', 'sm')}Settings</button>` : ''}<button class="pop-item" data-act="logout" role="menuitem">${icon('logout', 'sm')}Sign out</button></div>` : ''}</div>
  </header>`;
}
// The bell: stored per-recipient notifications (mentions) plus activity on items the user owns or acts on.
const seenAt = u => (S.notifSeenBy || {})[u.id] || 0;
const canSeeObj = (u, o) => !!o && can(u, 'view') && can(u, kindOf(o) === 'Asset' ? ['page_assets', 'page_tasks'] : ['page_modules', 'page_tasks', 'page_library']);
function notificationsFor(u) {
  const admin = isAdmin(u); const mine = new Set();
  [...S.modules, ...S.assets].forEach(o => { if (o.owner === u.id || (o.review && canActOn(u, o))) mine.add(o.id); });
  const stored = (S.notifications || []).filter(n => n.to === u.id && canSeeObj(u, objById(n.objType, n.objId))).map(n => ({ ...n, stored: true }));
  const act = S.audit.filter(e => e.user !== u.id && e.action !== 'User mentioned' && ((e.toIds || []).includes(u.id) || (admin ? /approv|amend|reject|submitted|resubmitted/i.test(e.action) && !e.auto : mine.has(e.objId) && !e.auto)));
  return [...stored, ...dueReminders(u), ...act].sort((a, b) => b.ts - a.ts).slice(0, 12);
}
// Owners are reminded of periodic review (Settings → review reminder days) and expiry (expiry warning days) on their live modules.
function dueReminders(u) {
  const out = []; S.modules.filter(m => m.owner === u.id && !m.archived && live(m)).forEach(m => { const mt = liveMeta(m);
    [['review', mt.reviewDate, S.settings.reviewReminderDays, 'Periodic review due'], ['expiry', mt.expiry, S.settings.expiryWarnDays, 'Expires']].forEach(([k, at, days, label]) => { if (!at || daysTo(at) > days) return; const id = 'r-' + k + '-' + m.id + '-' + at;
      out.push({ id, reminder: true, kind: k, label, at, ts: Math.min(Date.now(), at - days * DAY), objType: 'Module', objId: m.id, read: ((S.remindersRead || {})[u.id] || []).includes(id) }); }); });
  return out;
}
const notifUnread = u => notificationsFor(u).filter(n => n.stored || n.reminder ? !n.read : n.ts > seenAt(u)).length;
function viewNotifPop(list) {
  const u = me(); const unread = notifUnread(u);
  return `<div class="pop notif-pop" role="menu"><div class="grp notif-head"><span>Notifications</span>${unread ? `<button type="button" class="linklike" data-act="notif-readall">Mark all read</button>` : ''}</div>${list.length ? list.map(e => { const x = user(e.stored ? e.by : e.user); const o = objById(e.objType, e.objId);
    if (e.reminder) return `<button class="pop-item notif ${e.read ? '' : 'unread'}" data-act="notif-rem" data-id="${esc(e.id)}" data-obj="${esc(e.objId)}" role="menuitem"><span class="type-ico">${icon('clock', 'sm')}</span><span class="notif-body"><b>${esc(e.label)}</b> ${daysTo(e.at) < 0 ? esc(-daysTo(e.at) + ' days ago') : 'in ' + esc(daysTo(e.at) + ' days')} · <span class="mono">${esc(e.objId)}</span><span class="muted">${esc(o ? nameOf(o) : '')} · ${fmtD(e.at)}</span></span></button>`;
    if (e.stored) return `<button class="pop-item notif ${e.read ? '' : 'unread'}" data-act="notif-open" data-id="${e.id}" role="menuitem">${avatar(x, 'sm')}<span class="notif-body"><b>${esc(x.name)}</b> mentioned you${e.replyId ? ' in a reply' : ''} · <span class="mono">${esc(e.objId)}</span><span class="notif-snip">“${esc(e.text.length > 90 ? e.text.slice(0, 87) + '…' : e.text)}”</span><span class="muted">${esc(o ? nameOf(o) : '')} · ${ago(e.ts)}${e.email ? ' · email ' + esc(e.email.status) : ''}</span></span>${e.read ? '' : '<span class="notif-dot" aria-label="Unread"></span>'}</button>`;
    return `<button class="pop-item notif" ${goAttr(e.objType === 'Asset' ? 'asset' : e.objType === 'Module' ? 'module' : 'audit', e.objType === 'Asset' || e.objType === 'Module' ? e.objId : null)} role="menuitem">${avatar(x, 'sm')}<span class="notif-body"><b>${esc(x.name)}</b> <span class="muted">${esc(e.role || '')}</span><br>${esc(e.action)} · ${esc(e.objId)}<span class="muted">${ago(e.ts)}</span></span></button>`; }).join('') : '<div class="empty" style="padding:20px">No notifications yet.</div>'}</div>`;
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
  return { label: 'Your team’s content', team: true, f: o => sameTeam(u, o) || (!!o.blocks && o.blocks.some(b => b.moduleId && sameTeam(u, modById(b.moduleId)))) };
}
/* Each Home section renders on its own: if one fails, it shows an inline error and the rest of the page still works. */
function homeSafe(name, cls, fn) { try { return fn(); } catch (e) { console.error('Home section failed:', name, e); return `<section class="hz-card ${cls} hx-err" role="alert"><header class="hz-h"><h3>${esc(name)}</h3></header><div class="hx-empty">${icon('alert', 'sm')}<span>This section could not be loaded. The rest of Home is unaffected.</span><button type="button" class="btn sm" data-act="home-retry">Try again</button></div></section>`; } }
// Approvals completed per week, oldest first (last n weeks) — from closed approval cycles.
function weeklyApprovals(cycles, n = 12) { const now = Date.now(); const out = Array.from({ length: n }, (_, i) => ({ start: now - (n - i) * 7 * DAY, n: 0, sub: 0 })); cycles.forEach(c => { const k = n - 1 - Math.floor((now - c.end) / (7 * DAY)); if (c.outcome === 'Approved' && c.end && k >= 0 && k < n) out[k].n++; const s = n - 1 - Math.floor((now - c.start) / (7 * DAY)); if (c.start && s >= 0 && s < n) out[s].sub++; }); return out; }
const hzDay = t => { const d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()]; };
// Sparkline from a weekly series (oldest → newest). Every point carries a tooltip.
function hzSpark(vals, labels, unit, kind = 'line') {
  const W = 112, H = 34, n = vals.length, mx = Math.max(1, ...vals), x = i => 2 + (W - 4) * i / Math.max(1, n - 1), y = v => H - 3 - (H - 8) * v / mx;
  const hit = vals.map((v, i) => `<rect class="ch-hit" x="${x(i) - (W / n) / 2}" y="0" width="${W / n}" height="${H}" data-tip="${esc(labels[i] + ' · ' + v + ' ' + unit)}"/>`).join('');
  if (kind === 'bars') { const bw = (W - 4) / n; return `<svg class="hz-spark bars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax meet" aria-hidden="true">${vals.map((v, i) => `<rect x="${2 + i * bw + bw * .18}" y="${y(v)}" width="${bw * .64}" height="${v ? Math.max(2, H - 3 - y(v)) : 1}" rx="1" class="${v ? '' : 'z'} ${i === n - 1 ? 'cur' : ''}"/>`).join('')}${hit}</svg>`; }
  const pts = vals.map((v, i) => x(i) + ',' + y(v)).join(' ');
  return `<svg class="hz-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax meet" aria-hidden="true"><polygon class="a" points="${x(0)},${H} ${pts} ${x(n - 1)},${H}"/><polyline points="${pts}"/><circle cx="${x(n - 1)}" cy="${y(vals[n - 1])}" r="2.6"/>${hit}</svg>`;
}
// Mini workflow stepper: done / current / upcoming steps of the item's approval workflow.
function hzStepper(o) {
  if (!o.review) return '';
  const wf = wfById(o.review.wf); if (!wf) return '';
  const steps = wf.steps.map((s, i) => [s, i]).filter(([s]) => !isNotify(s)); const cur = o.review.step;
  const k = steps.findIndex(([, i]) => i === cur) + 1;
  return `<span class="hz-stp" aria-label="Step ${k} of ${steps.length}">${steps.map(([s, i]) => `<i class="${i < cur ? 'done' : i === cur ? 'cur fn-' + String(s.fn).toLowerCase() : ''}" title="${esc(stepLabel(s))}"></i>`).join('')}<em>${k}/${steps.length}</em></span>`;
}
function viewHome() {
  const u = me(); const tasks = tasksFor(u); const a = authority(u.fn, u.level); const first = u.name.split(' ')[0]; const admin = isAdmin(u);
  const now = new Date(); const NOW = now.getTime(); const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sc = homeScope(u); const mGo = extra => goAttr('modules', null, extra + (sc.team ? ' data-setf="mscope=team"' : '')); const aGo = f => goAttr('assets', null, ` data-setf="${f}${sc.team ? '&ascope=team' : ''}"`); const mods = S.modules.filter(sc.f); const seeAssets = can(u, 'page_assets'); const assets = seeAssets ? S.assets.filter(sc.f) : [];
  const libOk = m => ['Approved', 'Active', 'Expiring'].includes(libraryStatus(m) || '');
  const mIn = mods.filter(m => m.review), mDraft = mods.filter(m => ['Draft', 'Awaiting Lead submission'].includes(statusOf(m))), mAmend = mods.filter(m => statusOf(m) === 'Amendment Requested');
  const aAmend = assets.filter(x => statusOf(x) === 'Amendment Requested'); const aIn = assets.filter(x => x.review); const mLive = mods.filter(libOk); const mExp = mods.filter(m => libraryStatus(m) === 'Expiring');
  const cycAll = allCycles().filter(c => sc.f(c.obj));
  const P = (() => { try { return approvalStats(cycAll.filter(c => (c.end || NOW) > NOW - 90 * DAY)); } catch (e) { console.error('Approval statistics failed', e); return null; } })();
  const Pprev = (() => { try { return approvalStats(cycAll.filter(c => c.end && c.end <= NOW - 90 * DAY && c.end > NOW - 180 * DAY)); } catch (e) { return null; } })();
  const TI = new Map(tasks.map(t => [t, taskInfo(t)])); const PR = { High: 0, Medium: 1, Normal: 2 };
  const high = tasks.filter(t => TI.get(t).priority === 'High').length, med = tasks.filter(t => TI.get(t).priority === 'Medium').length;
  const sorted = [...tasks].sort((x, y) => PR[TI.get(x).priority] - PR[TI.get(y).priority] || x.since - y.since);
  const expired = mods.filter(m => live(m) && !m.archived && liveMeta(m).expiry && daysTo(liveMeta(m).expiry) < 0).length;
  // 12 weekly points ending now, for trend lines
  const WK = 7 * DAY; const ends = Array.from({ length: 12 }, (_, i) => NOW - (11 - i) * WK); const wkLab = ends.map((t, i) => i === 11 ? 'This week' : 'Week of ' + hzDay(t - WK));
  const modCyc = cycAll.filter(c => c.kind === 'Module');
  const inRevS = ends.map((t, i) => i === 11 ? mIn.length : new Set(modCyc.filter(c => c.start <= t && (!c.end || c.end > t)).map(c => c.id)).size);
  const apprS = ends.map((t, i) => i === 11 ? mLive.length : mods.filter(m => !m.archived && m.versions.some(v => v.approvedAt && v.approvedAt <= t)).length);
  const amendS = ends.map(t => cycAll.reduce((n, c) => n + c.decisions.filter(x => x.decision === 'Amendment requested' && x.at > t - WK && x.at <= t).length, 0));

  /* ---- Command band: greeting, the next task, key metrics with trends ---- */
  const band = homeSafe('Overview', 'span12', () => {
    const nx = sorted[0]; const nI = nx && TI.get(nx);
    const next = nx ? `<button type="button" class="hz-next" ${goAttr(taskTarget(nx), nx.obj.id)}><span class="hz-eyebrow">${icon('flag', 'sm')}Next up · ${esc(nI.priority)} priority</span><b class="hz-next-t" title="${esc(nx.title)}">${esc(nx.title)}</b><span class="hz-next-m">${esc(nx.obj.id)} · ${esc(nI.typeName)} · v${latest(nx.obj).v}</span><span class="hz-next-s">${nx.step ? fnBadge(nx.step.fn, 'sm') : icon('clock', 'sm')}<span>${esc(nI.step)}</span></span><span class="hz-next-f"><span class="hz-next-w"><b>${fmtDur(nI.wait)}</b> waiting</span><span class="hz-next-cta">${esc(nI.action)}${icon('arrow', 'sm')}</span></span></button>`
      : `<div class="hz-next calm"><span class="hz-eyebrow">${icon('check', 'sm')}All clear</span><b class="hz-next-t">Nothing needs your action</b><span class="hz-next-m">${can(u, 'page_library') ? 'Approved content is ready to reuse in the library.' : 'New tasks appear here as soon as they reach you.'}</span></div>`;
    const K = (id, label, val, unit, ctx, viz, go, tone) => `<button type="button" class="hz-k" data-k="${id}" ${go || 'disabled'}><span class="hz-kl">${label}</span><span class="hz-kv">${val}${unit ? `<small>${unit}</small>` : ''}</span><span class="hz-kc ${tone || ''}">${ctx}</span><span class="hz-kz">${viz}</span></button>`;
    const prio = tasks.length ? `<span class="hz-prio" aria-hidden="true">${[['High', high, 'bad'], ['Medium', med, 'warn'], ['Normal', tasks.length - high - med, 'dim']].filter(x => x[1]).map(x => `<i class="${x[2]}" style="flex:${x[1]}" data-tip="${x[0]} priority · ${x[1]}"></i>`).join('')}</span>` : '<span class="hz-prio"><i class="none" style="flex:1"></i></span>';
    const buckets = [[0, 30], [31, 60], [61, 90]].map(([lo, hi]) => mods.filter(m => live(m) && !m.archived && liveMeta(m).expiry && daysTo(liveMeta(m).expiry) >= lo && daysTo(liveMeta(m).expiry) <= hi).length);
    const kp = [
      can(u, 'page_tasks') && K('tasks', 'My tasks', tasks.length, '', high ? `<b>${high}</b> high priority` : tasks.length ? 'None past SLA' : 'Nothing waiting', prio, goAttr('tasks'), high ? 'bad' : ''),
      K('inreview', 'Modules in review', mIn.length, '', mIn.length ? 'Oldest step ' + fmtDur(NOW - Math.min(...mIn.map(m => m.review.stepStartedAt))) : 'None waiting', hzSpark(inRevS, wkLab, 'in review (estimated from review dates)'), mGo(' data-mstat="In Review"')),
      K('amend', 'Amendment requests', mAmend.length + aAmend.length, '', mAmend.length + ' module' + (mAmend.length === 1 ? '' : 's') + (seeAssets ? ' · ' + aAmend.length + ' asset' + (aAmend.length === 1 ? '' : 's') : ''), hzSpark(amendS, wkLab, 'requested', 'bars'), mGo(' data-mstat="Amendment Requested"'), mAmend.length + aAmend.length ? 'warn' : ''),
      K('approved', 'Approved modules', mLive.length, '', (() => { const d = mLive.length - apprS[7]; return d > 0 ? `<b>+${d}</b> in 4 weeks` : 'Live in the library'; })(), hzSpark(apprS, wkLab, 'approved (estimated from approval dates)'), mGo(' data-mstat="live"')),
      K('expiring', 'Expiring soon', mExp.length, '', (expired ? `<b>${expired}</b> expired · ` : '') + '≤ ' + S.settings.expiryWarnDays + ' days', `<span class="hz-runw" aria-hidden="true">${buckets.map((n, i) => `<i data-tip="${['0–30', '31–60', '61–90'][i]} days · ${n} expiring" style="--h:${Math.min(100, 18 + n * 28)}%" class="${n ? 'on' : ''}"></i>`).join('')}<em>0–90 d</em></span>`, mGo(' data-mstat="Expiring"'), mExp.length || expired ? 'warn' : ''),
      !P ? K('avg', 'Avg. approval time', '—', '', 'Unavailable', '', '') : K('avg', 'Avg. approval time', P.done.length ? durDays(P.avgApproval) : '—', P.done.length ? 'days' : '', P.n ? Math.round(100 * P.approvalRate) + '% approval rate · 90 d' : 'No cycles in 90 days', hzSpark(weeklyApprovals(cycAll).map(w => w.n), wkLab, 'approvals', 'bars'), can(u, 'view_reports') ? goAttr('reports') : '')
    ].filter(Boolean);
    const qa = [canCreateModule(u) && can(u, 'page_modules') && `<button class="hz-btn pri" ${goAttr('module-new')}>${icon('plus', 'sm')}Create module</button>`, canCreateAsset(u) && seeAssets && `<button class="hz-btn" data-act="asset-new">${icon('layers', 'sm')}Create asset</button>`, can(u, 'page_library') && `<button class="hz-btn" ${goAttr('library')}>${icon('book', 'sm')}Approved Library</button>`].filter(Boolean).join('');
    return `<section class="hz-band" aria-label="Overview"><div class="hz-band-top"><div class="hz-hello"><span class="hz-date">${esc(today)}</span><h1>Welcome, ${esc(first)}</h1><p class="hz-who"><span>${esc(roleLabel(u))}</span><span>${icon(a.final ? 'key' : 'eye', 'sm')}${esc(a.short)}</span><span>${icon('globe', 'sm')}${esc(sc.label)}</span></p></div><div class="hz-qa">${qa}</div></div>
      <div class="hz-band-main">${next}<div class="hz-kpis" style="--n:${kp.length}" aria-label="Key metrics">${kp.join('')}</div></div></section>`; });

  /* Secondary inventory — every figure links to its list */
  const inv = homeSafe('Workspace', 'span12', () => { const sec = [
      ['grid', mods.length, 'modules', mods.filter(m => isMediaType(m.type)).length + ' media & docs', mGo(' data-mstat=""')],
      ['file', mDraft.length, mDraft.length === 1 ? 'draft' : 'drafts', '', mGo(' data-mstat="open"')],
      seeAssets && ['layers', aIn.length, aIn.length === 1 ? 'asset in review' : 'assets in review', 'of ' + assets.length, aGo('astat=In Review')],
      seeAssets && ['check', assets.filter(x => live(x)).length, 'approved assets', '', aGo('astat=Approved')],
      (admin || can(u, ['manage_workflows', 'page_admin'])) && ['workflow', S.workflows.filter(w => !w.hidden && w.active !== false).length, 'active workflows', '', goAttr('workflows')],
      (admin || can(u, ['manage_users', 'page_admin'])) && ['users', S.users.filter(x => x.status === 'Active').length, 'active users', S.functions.filter(f => f.active).length + ' functions', goAttr('users', null, ' data-setf="usst=Active"')]
    ].filter(Boolean);
    return `<nav class="hx-sec hz-inv" aria-label="Workspace figures">${sec.map(s => `<button type="button" ${s[4]}>${icon(s[0], 'sm')}<b>${s[1]} ${s[2]}</b>${s[3] ? `<span>${s[3]}</span>` : ''}</button>`).join('')}</nav>`; });

  /* ---- My Tasks workspace ---- */
  const taskBox = homeSafe('My Tasks', 'span8', () => {
    const watching = tasks.length < 4 && !admin ? [...mods, ...assets].filter(o => o.review && !tasks.some(t => t.obj === o) && (fnInfo(u.fn).reviews ? curStep(o).fn === u.fn : sameTeam(u, o))).map(o => ({ kind: 'watch', obj: o, type: kindOf(o), title: nameOf(o), id: o.id, step: curStep(o), since: o.review.stepStartedAt })) : [];
    const tab = UI.f.htab && TASK_GROUPS.some(g => g[0] === UI.f.htab) ? UI.f.htab : 'all';
    const byG = TASK_GROUPS.map(g => [g[0], g[1], tasks.filter(t => taskGroup(t) === g[0]).length]);
    const list = (tab === 'all' ? sorted : sorted.filter(t => taskGroup(t) === tab)); const shown = list.slice(0, 6); const sla = (S.settings.reviewSlaDays || 3) * DAY;
    const row = t => { const o = t.obj; const I = t.kind === 'watch' ? taskInfo(t) : TI.get(t); const who = t.kind === 'review' || t.kind === 'watch' ? assigneeFor(t.step) : [user(o.owner)];
      const pct = Math.min(100, 100 * I.wait / sla); const pri = t.kind === 'watch' ? 'watch' : I.priority.toLowerCase();
      return `<div class="hz-t p-${pri}" ${goAttr(t.kind === 'watch' ? (t.type === 'Asset' ? 'asset' : 'module') : taskTarget(t), o.id)} role="link" tabindex="0">
        <span class="hz-t-ic">${t.type === 'Asset' ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : modThumb(o, latest(o))}</span>
        <span class="hz-t-main"><b title="${esc(t.title)}">${esc(t.title)}</b><span class="hz-t-meta"><span class="mono">${esc(o.id)}</span><span>${esc(I.typeName)}</span><span>v${latest(o).v}</span></span></span>
        <span class="hz-t-step">${t.step ? `<span class="hz-t-sl" title="${esc(I.step)}">${fnBadge(t.step.fn, 'sm')}<span><b>${esc(levelName(t.step.level))}</b> ${t.step.req === 'approve' ? 'approval' : 'review'}</span></span>${hzStepper(o)}` : `<span class="hz-t-sl" title="${esc(I.step)}">${icon(t.kind === 'rejected' ? 'x' : t.kind === 'amend' ? 'undo' : 'edit', 'sm')}<span>${esc({ rejected: 'Rejected', amend: 'Amending', submit: 'Awaiting submission', draft: 'Draft' }[t.kind] || I.step)}</span></span><span class="hz-t-note">${esc(t.kind === 'rejected' ? 'Cycle closed' : t.kind === 'amend' && o.resume ? 'Then ' + o.resume.fn + ' ' + levelName(o.resume.level) : t.kind === 'submit' ? 'Prepared by a Member' : 'Not yet submitted')}</span>`}</span>
        <span class="hz-t-who" title="${esc('Responsible: ' + I.responsible)}"><span class="hz-av">${who.slice(0, 3).map(x => avatar(x, 'sm')).join('')}${who.length > 3 ? `<span class="avatar sm more">+${who.length - 3}</span>` : ''}</span></span>
        <span class="hz-t-wait" title="${esc(I.priority + ' priority · SLA ' + (S.settings.reviewSlaDays || 3) + ' days')}"><b>${fmtDur(I.wait)}</b><span class="hz-sla"><i style="width:${pct}%"></i></span></span>
        <span class="hz-t-act"><span class="hz-cta ${t.kind}">${esc(I.action)}</span></span></div>`; };
    const wrows = watching.slice(0, Math.max(0, 4 - tasks.length));
    return `<section class="hz-card span8" aria-labelledby="hx-t-tasks"><header class="hz-h"><h3 id="hx-t-tasks">My Tasks</h3><span class="hz-n">${tasks.length}</span><span class="grow"></span>${can(u, 'page_tasks') ? `<button class="hz-link" ${goAttr('tasks')}>Open My Tasks ${icon('chevron', 'sm')}</button>` : ''}</header>
      <div class="hz-tabs" role="tablist" aria-label="Filter tasks"><button type="button" role="tab" aria-selected="${tab === 'all'}" class="${tab === 'all' ? 'on' : ''}" data-act="home-tab" data-v="all">All<b>${tasks.length}</b></button>${byG.map(g => `<button type="button" role="tab" aria-selected="${tab === g[0]}" class="${tab === g[0] ? 'on' : ''} ${g[2] ? '' : 'zero'}" data-act="home-tab" data-v="${g[0]}">${esc(g[1])}<b>${g[2]}</b></button>`).join('')}</div>
      ${shown.length ? `<div class="hz-tl" role="list"><div class="hz-th" aria-hidden="true"><span></span><span>Item</span><span>Workflow position</span><span>Who</span><span>Waiting · SLA</span><span></span></div>${shown.map(row).join('')}</div>` : `<div class="hx-empty">${icon('check', 'sm')}<span>${tasks.length ? 'Nothing in this group.' : 'Nothing needs your action.' + (can(u, 'page_library') ? ' Browse the Approved Library for reusable content.' : '')}</span></div>`}
      ${tab === 'all' && wrows.length ? `<div class="hz-sub-h">${fnInfo(u.fn).reviews ? 'Also in ' + esc(u.fn) + ' review' : 'Your team’s items with reviewers'}</div><div class="hz-tl">${wrows.map(row).join('')}</div>` : ''}
      ${(() => { if (!tasks.length) return ''; const ws = tasks.map(t => TI.get(t).wait); const past = tasks.filter(t => TI.get(t).wait > sla).length;
        return `<div class="hz-qh"><span><b>${list.length > 6 ? list.length - 6 + ' more' : tasks.length + ' open'}</b>${list.length > 6 ? ` in <button class="hz-link" ${goAttr('tasks')}>My Tasks</button>` : ''}</span><span>Average wait <b>${fmtDur(ws.reduce((a, b) => a + b, 0) / ws.length)}</b></span><span><i class="ok"></i><b>${tasks.length - past}</b> within SLA</span><span><i class="${past ? 'bad' : ''}"></i><b>${past}</b> past the ${S.settings.reviewSlaDays || 3}-day SLA</span></div>`; })()}</section>`; });

  /* ---- Approval pipeline as a connected stage flow ---- */
  const pipe = homeSafe('Approval pipeline', 'span4', () => {
    const live2 = mLive.length - mExp.length;
    const st = [['Draft', mDraft.length, 'dim', 'open', 'edit', 'Being prepared'], ['In review', mIn.length, 's1', 'In Review', 'shieldcheck', 'With MLR reviewers'], ['Amendment', mAmend.length, 'warn', 'Amendment Requested', 'undo', 'Back with the owner'], ['Approved', live2, 'ok', 'live', 'check', 'Live in the library'], ['Approved · expiring', mExp.length, 'bad', 'Expiring', 'clock', 'Within ' + S.settings.expiryWarnDays + ' days of expiry']];
    const tot = st.reduce((s, x) => s + x[1], 0); const inFn = reviewFuncs().map(fn => [fn, mIn.filter(m => curStep(m).fn === fn).length]);
    return `<section class="hz-card span4" aria-labelledby="hx-t-pipe"><header class="hz-h"><h3 id="hx-t-pipe">Approval pipeline</h3><span class="grow"></span><span class="hz-ctx">${tot} modules</span></header>
      <ol class="hz-flow">${st.map(s => `<li><button type="button" ${mGo(` data-mstat="${s[3]}"`)} class="t-${s[2]}"><span class="hz-node">${icon(s[4], 'sm')}</span><span class="hz-fl"><span class="hz-fn"><b>${s[0]}</b><em>${s[5]}</em></span><span class="hz-ft"><i style="width:${tot ? 100 * s[1] / tot : 0}%" data-tip="${esc(s[0] + ' · ' + s[1] + ' of ' + tot + ' modules')}"></i></span></span><span class="hz-fv"><b>${s[1]}</b><em>${tot ? Math.round(100 * s[1] / tot) : 0}%</em></span></button></li>`).join('')}</ol>
      <div class="hz-chain"><span class="hz-cap">In review now · by step</span><div class="hz-chain-r">${inFn.length ? inFn.map(([fn, n], i) => `${i ? `<span class="hz-arrow" aria-hidden="true"></span>` : ''}<button type="button" class="hz-cn ${n ? 'on' : ''}" ${mGo(' data-mstat="In Review"')} data-tip="${esc(fn + ' · ' + n + ' module' + (n === 1 ? '' : 's') + ' at this step')}">${fnBadge(fn, 'sm')}<b>${n}</b><span>${esc(fn)}</span></button>`).join('') : '<p class="hx-muted">No review functions configured.</p>'}</div></div></section>`; });

  /* ---- Approval performance ---- */
  const perf = homeSafe('Approval performance', 'span8', () => { if (!P) throw new Error('Approval statistics unavailable');
    const inProg = P.n - P.closed; const wk = weeklyApprovals(cycAll); const slowFn = [...P.fnAvg].sort((x, y) => y.avg - x.avg)[0];
    const d = Pprev && Pprev.done.length && P.done.length ? durDays(P.avgApproval) - durDays(Pprev.avgApproval) : null;
    const delta = d == null ? '<span class="hz-delta">No earlier cycles to compare</span>' : `<span class="hz-delta ${d < 0 ? 'good' : d > 0 ? 'bad' : ''}">${icon(d <= 0 ? 'down' : 'up', 'sm')}${Math.abs(Math.round(d * 10) / 10)} days ${d < 0 ? 'faster' : d > 0 ? 'slower' : 'same'} than the previous 90 days</span>`;
    const rate = (l, v, sub, tone) => `<div class="hz-rate"><span>${l}</span><b>${v}<small>%</small></b><span class="hz-rt"><i class="mk-${tone}" style="width:${v}%"></i></span><em>${sub}</em></div>`;
    // columns: approvals per week, line: submissions per week — same unit (cycles), one axis
    const W = 520, H = 168, L = 26, B = 22, T = 10; const iw = W - L - 6, ih = H - T - B; const mx = Math.max(2, ...wk.map(w => Math.max(w.n, w.sub))); const tk = Math.ceil(mx / 2) * 2; const bw = iw / wk.length; const y = v => T + ih - ih * v / tk;
    const line = wk.map((w, i) => (L + i * bw + bw / 2) + ',' + y(w.sub)).join(' ');
    const chart = `<svg class="hz-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc('Per week, approvals and submissions: ' + wk.map(w => hzDay(w.start) + ' ' + w.n + '/' + w.sub).join(', '))}">
      ${[0, tk / 2, tk].map(v => `<line class="ch-grid" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="ch-ax" x="${L - 7}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
      ${wk.map((w, i) => `<rect class="hz-col${i === wk.length - 1 ? ' cur' : ''}" x="${L + i * bw + bw * .2}" y="${y(w.n)}" width="${bw * .6}" height="${Math.max(0, T + ih - y(w.n))}" rx="3"/>`).join('')}
      <polyline class="hz-ln" points="${line}"/>${wk.map((w, i) => `<circle class="hz-dot" cx="${L + i * bw + bw / 2}" cy="${y(w.sub)}" r="3"/>`).join('')}
      ${wk.map((w, i) => `<rect class="ch-hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${ih}" data-tip="${esc((i === wk.length - 1 ? 'This week' : 'Week of ' + hzDay(w.start)) + '\n' + w.n + ' approved · ' + w.sub + ' submitted')}"/>`).join('')}
      ${[0, 4, 8, 11].map(i => `<text class="ch-ax" x="${i === 11 ? W - 2 : L + i * bw + bw / 2}" y="${H - 4}" text-anchor="${i === 11 ? 'end' : 'middle'}">${i === 11 ? 'This week' : hzDay(wk[i].start)}</text>`).join('')}</svg>`;
    const mxf = Math.max(1, ...P.fnAvg.map(x => x.avg));
    return `<section class="hz-card hz-perf span8" aria-labelledby="hx-t-perf"><header class="hz-h"><h3 id="hx-t-perf">Approval performance</h3><span class="hz-ctx">Last 90 days · ${P.n} cycle${P.n === 1 ? '' : 's'}</span><span class="grow"></span>${can(u, 'view_reports') ? `<button class="hz-link" ${goAttr('reports')}>Reports ${icon('chevron', 'sm')}</button>` : ''}</header>
      <div class="hz-perf-g"><div class="hz-perf-l"><span class="hz-cap">Average approval time</span><div class="hz-big">${P.done.length ? durDays(P.avgApproval) : '—'}<small>${P.done.length ? 'days' : ''}</small></div>${delta}
        <div class="hz-rates">${rate('Approval rate', Math.round(100 * P.approvalRate), P.done.length + ' of ' + P.closed + ' closed', 'ok')}${rate('Amendment rate', Math.round(100 * P.amendmentRate), P.amendCycles + ' of ' + P.n + ' cycles', 'warn')}${rate('Rejection rate', Math.round(100 * P.rejectionRate), P.rej.length + ' rejected', 'bad')}</div>
        <div class="hz-out"><span class="hz-cap">Cycle outcomes</span><div class="hz-stack" role="img" aria-label="${esc(P.done.length + ' approved, ' + P.rej.length + ' rejected, ' + inProg + ' in progress')}">${P.n ? [['Approved', P.done.length, 'ok'], ['Rejected', P.rej.length, 'bad'], ['In progress', inProg, 'warn']].filter(x => x[1]).map(x => `<span class="mk-${x[2]}" style="flex:${x[1]}" data-tip="${x[0]} · ${x[1]}"></span>`).join('') : '<span class="mk-none" style="flex:1"></span>'}</div><div class="hx-leg"><span><i class="mk-ok"></i>Approved <b>${P.done.length}</b></span><span><i class="mk-bad"></i>Rejected <b>${P.rej.length}</b></span><span><i class="mk-warn"></i>In progress <b>${inProg}</b></span></div></div></div>
      <div class="hz-perf-r"><div class="hz-ch-h"><span class="hz-cap">Throughput · last 12 weeks</span><span class="hx-leg sm"><span><i class="hz-k-col"></i>Approved</span><span><i class="hz-k-ln"></i>Submitted</span></span></div>${chart}
        <div class="hz-steps"><span class="hz-cap">Average time at each review step</span>${P.fnAvg.length ? P.fnAvg.map(x => `<div class="hz-sr ${slowFn && x.fn === slowFn.fn && P.fnAvg.length > 1 ? 'slow' : ''}"><span class="hz-sl">${fnBadge(x.fn, 'sm')}${esc(x.fn)}</span><span class="hz-st"><i style="width:${100 * x.avg / mxf}%" data-tip="${esc(x.fn + ' · ' + durDays(x.avg) + ' days on average · ' + x.n + ' steps')}"></i></span><b>${durDays(x.avg)}<small>d</small></b></div>`).join('') : '<p class="hx-muted">No completed review steps in the last 90 days.</p>'}
        ${P.slow ? `<p class="hz-flag">${icon('alert', 'sm')}<span>Slowest step: <b>${esc(P.slow.fn)} ${esc(levelName(P.slow.level))} ${P.slow.level === 'Lead' ? 'approval' : 'review'}</b> · ${durDays(P.slow.avg)} days on average</span></p>` : ''}</div></div></div></section>`; });

  /* ---- Expiry & review watch: a runway from overdue to 90 days ahead ---- */
  const dueBox = homeSafe('Expiry & review watch', 'span4', () => {
    const watch = []; mods.filter(m => live(m) && !m.archived).forEach(m => { const mt = liveMeta(m); const de = mt.expiry ? daysTo(mt.expiry) : null, dr = mt.reviewDate ? daysTo(mt.reviewDate) : null;
      if (de != null && de < 0) watch.push([m, 'Expired', de, mt.expiry, 'bad']); else if (de != null && de <= 90) watch.push([m, 'Expiring', de, mt.expiry, de <= S.settings.expiryWarnDays ? 'warn' : '']);
      if (dr != null && dr <= Math.max(60, S.settings.reviewReminderDays) && !(de != null && de < 0)) watch.push([m, 'Review due', dr, mt.reviewDate, dr < 0 ? 'bad' : dr <= S.settings.reviewReminderDays ? 'warn' : '']); });
    watch.sort((x, y) => x[2] - y[2]); const wc = k => watch.filter(w => w[1] === k).length; const over = watch.filter(w => w[2] < 0).length;
    const X = d => 4 + 92 * (Math.max(-30, Math.min(90, d)) + 30) / 120; const lanes = []; const marks = watch.map(w => { const x = X(w[2]); let l = 0; while (lanes[l] != null && x - lanes[l] < 6) l++; lanes[l] = x; return [w, x, Math.min(l, 2)]; });
    const runway = `<div class="hz-rw" role="img" aria-label="${esc(watch.length + ' items between 30 days overdue and 90 days ahead')}"><span class="hz-rw-over" style="width:${X(0)}%"></span><span class="hz-rw-axis"></span><span class="hz-rw-now" style="left:${X(0)}%"><em>Today</em></span>${[30, 60, 90].map(d => `<span class="hz-rw-tk" style="left:${X(d)}%"><em>${d}d</em></span>`).join('')}${marks.map(([w, x, l]) => `<button type="button" class="hz-rw-m ${w[4] || 'n'} ${w[1] === 'Review due' ? 'rv' : ''}" style="left:${x}%;--l:${l}" ${goAttr('module', w[0].id, ' data-tab="lifecycle"')} data-tip="${esc((liveMeta(w[0]).title || w[0].title) + '\n' + w[1] + ' · ' + (w[2] < 0 ? Math.abs(w[2]) + ' days overdue' : 'in ' + w[2] + ' days'))}" aria-label="${esc(w[1] + ': ' + (liveMeta(w[0]).title || w[0].title))}"></button>`).join('')}<span class="hz-rw-lab l">Overdue</span><span class="hz-rw-lab r">90 days ahead</span></div>`;
    return `<section class="hz-card span4" aria-labelledby="hx-t-due"><header class="hz-h"><h3 id="hx-t-due">Expiry & review watch</h3><span class="grow"></span>${can(u, 'view_audit') ? `<button class="hz-link" ${goAttr('lifecycle')}>Lifecycle ${icon('chevron', 'sm')}</button>` : ''}</header>
      <div class="hz-wc"><div class="${wc('Expired') ? 'bad' : ''}"><b>${wc('Expired')}</b><span>Expired</span></div><div class="${wc('Expiring') ? 'warn' : ''}"><b>${wc('Expiring')}</b><span>Expiring ≤ 90d</span></div><div><b>${wc('Review due')}</b><span>Review ≤ 60d</span></div></div>
      ${runway}
      <div class="hz-due-l">${watch.length ? watch.slice(0, 5).map(([m, k, d, at, tone]) => { const nm = liveMeta(m).title || m.title; return `<button type="button" class="hz-due ${tone || 'n'}" ${goAttr('module', m.id, ' data-tab="lifecycle"')}><span class="hz-dd"><b>${Math.abs(d)}</b><em>${d < 0 ? 'days over' : 'days'}</em></span><span class="hz-due-b"><b title="${esc(nm)}">${esc(nm)}</b><span><i></i>${k} · ${fmtD(at)} · v${live(m).v}</span></span>${icon('chevron', 'sm')}</button>`; }).join('') : `<div class="hx-empty">${icon('check', 'sm')}<span>Nothing expiring or due for review in the next 90 days.</span></div>`}</div>
      ${watch.length > 5 ? `<div class="hx-more">${watch.length - 5} more${over ? ' · ' + over + ' overdue' : ''} in <button class="hz-link" ${goAttr('lifecycle')}>Lifecycle</button></div>` : ''}</section>`; });

  /* ---- Recently approved: an approval ledger ---- */
  const recentBox = homeSafe('Recently approved', 'span7', () => {
    const recent = [...mods.filter(m => live(m) && !m.archived).map(m => ['Module', m]), ...assets.filter(x => live(x)).map(x => ['Asset', x])].sort((x, y) => live(y[1]).approvedAt - live(x[1]).approvedAt).slice(0, 6);
    return `<section class="hz-card span7" aria-labelledby="hx-t-rec"><header class="hz-h"><h3 id="hx-t-rec">Recently approved</h3><span class="grow"></span>${can(u, 'page_library') ? `<button class="hz-link" ${goAttr('library')}>Approved Library ${icon('chevron', 'sm')}</button>` : ''}</header>${recent.length ? `<div class="hz-led">${recent.map(([k, o]) => { const lv = live(o); const mt = k === 'Module' ? metaOf(o, lv) : o; const nm = k === 'Module' ? mt.title || o.title : o.name; const d = new Date(lv.approvedAt); const prs = (mt.products || o.products || []).map(id => product(id).name); const cts = mt.markets || o.markets || [];
      return `<button type="button" class="hz-lr" ${goAttr(k === 'Asset' ? 'asset' : 'module', o.id, ` data-v="${lv.v}"`)}><span class="hz-stamp" title="${esc(fmtD(lv.approvedAt))}"><b>${d.getDate()}</b>${MON[d.getMonth()]}</span>${k === 'Asset' ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : modThumb(o, lv)}<span class="hz-lr-b"><b title="${esc(nm)}">${esc(nm)}</b><span><span class="mono">${o.id}</span> · ${esc(k === 'Module' ? mtype(mt.type || o.type).name : mat(o.type).name)} · v${lv.v}</span></span><span class="hz-lr-t">${prs.slice(0, 1).map(x => `<span class="hz-tg p">${esc(x)}</span>`).join('')}${prs.length > 1 ? `<span class="hz-tg">+${prs.length - 1}</span>` : ''}<span class="hz-tg c" title="${esc(cts.join(', '))}">${esc(cts.slice(0, 3).join(' · '))}${cts.length > 3 ? ' +' + (cts.length - 3) : ''}</span></span></button>`; }).join('')}</div>` : `<div class="hx-empty"><span>Nothing approved yet.</span></div>`}</section>`; });

  /* ---- Recent activity: a day-grouped timeline ---- */
  const actBox = homeSafe('Recent activity', 'span5', () => {
    const ACT_RX = /submitted|approv|review|comment|reply|amend|reject|created|version|resolved|uploaded|replaced|withdraw|reinstat/i;
    const acts = [...S.audit].filter(e => !e.auto && ['Module', 'Asset'].includes(e.objType) && ACT_RX.test(e.action) && (sc.f(objById(e.objType, e.objId) || {}) || e.user === u.id)).sort((x, y) => y.ts - x.ts).slice(0, 7);
    const dayOf = t => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); return t >= d0.getTime() ? 'Today' : t >= d0.getTime() - DAY ? 'Yesterday' : fmtD(t); };
    let lastDay = ''; const items = acts.map(e => { const x = user(e.user); const o = objById(e.objType, e.objId); const on = o ? nameOf(o) : e.objId; const dl = dayOf(e.ts); const head = dl !== lastDay ? `<div class="hz-day">${esc(dl)}</div>` : ''; lastDay = dl;
      return head + `<button type="button" class="hz-ev" ${goAttr(e.objType === 'Asset' ? 'asset' : 'module', e.objId)}><span class="hz-ev-n t-${toneOf(e.action) || 'dim'}">${avatar(x, 'sm')}</span><span class="hz-ev-b"><span><b>${esc(x.name)}</b> ${esc(e.action.toLowerCase())}</span><span class="hz-ev-o" title="${esc(on)}">${esc(on)} · v${e.version}</span></span><time datetime="${new Date(e.ts).toISOString()}" title="${esc(fmtDT(e.ts))}">${new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time></button>`; }).join('');
    return `<section class="hz-card span5" aria-labelledby="hx-t-act"><header class="hz-h"><h3 id="hx-t-act">Recent activity</h3><span class="grow"></span>${can(u, 'view_audit') ? `<button class="hz-link" ${goAttr('audit')}>Audit trail ${icon('chevron', 'sm')}</button>` : ''}</header><div class="hz-act">${acts.length ? items : `<div class="hx-empty"><span>No activity yet.</span></div>`}</div></section>`; });

  /* ---- Content portfolio: product × country coverage, status, type, reuse ---- */
  const overview = homeSafe('Content overview', 'span12', () => {
    const prods = S.products.filter(p => p.active), mks = S.markets.filter(x => x.active);
    const cell = (p, c) => mods.filter(m => m.products.includes(p.id) && m.markets.includes(c.id)).length; const acell = (p, c) => assets.filter(x => x.products.includes(p.id) && x.markets.includes(c.id)).length;
    const mxc = Math.max(1, ...prods.flatMap(p => mks.map(c => cell(p, c))));
    const heat = prods.length && mks.length ? `<div class="hz-hm-w"><table class="hz-hm"><thead><tr><th></th>${mks.map(c => `<th title="${esc(c.name)}">${esc(c.id)}</th>`).join('')}<th class="tot">Total</th></tr></thead><tbody>${prods.map(p => `<tr><th title="${esc(p.name)}">${esc(p.name)}</th>${mks.map(c => { const n = cell(p, c), na = acell(p, c); const k = n / mxc; return `<td><span class="hz-hc ${k > .55 ? 'dk' : ''}" style="--k:${n ? .12 + .88 * k : 0}" data-tip="${esc(p.name + ' · ' + c.name + '\n' + n + ' modules' + (seeAssets ? ' · ' + na + ' assets' : ''))}">${n || '·'}</span></td>`; }).join('')}<td class="tot"><b>${mods.filter(m => m.products.includes(p.id)).length}</b>${seeAssets ? `<em>${assets.filter(x => x.products.includes(p.id)).length}</em>` : ''}</td></tr>`).join('')}</tbody><tfoot><tr><th>Total</th>${mks.map(c => `<td><b>${mods.filter(m => m.markets.includes(c.id)).length}</b>${seeAssets ? `<em>${assets.filter(y => y.markets.includes(c.id)).length}</em>` : ''}</td>`).join('')}<td></td></tr></tfoot></table></div><p class="hz-note">Modules approved or in preparation for each product and country${seeAssets ? '. Totals show modules, then assets in grey' : ''}.</p>` : '<p class="hx-muted">No active products or countries.</p>';
    const sRows = [['Draft', mDraft.length, 'dim'], ['In review', mIn.length, 's1'], ['Amendment', mAmend.length, 'warn'], ['Rejected', mods.filter(m => statusOf(m) === 'Rejected').length, 'bad'], ['Approved', mLive.length, 'ok'], ['Review required', mods.filter(m => libraryStatus(m) === 'Review Required').length, 'bad']];
    const sTot = Math.max(1, mods.length);
    const bars = (rows, tone, unit) => { const mx = Math.max(1, ...rows.map(r => r[1])); return rows.length ? rows.map(r => `<div class="hx-bar"><span class="hx-bl" title="${esc(r[0])}">${r[3] || esc(r[0])}</span><span class="hx-tr"><span class="mk-${r[2] || tone}" style="width:${100 * r[1] / mx}%" data-tip="${esc(r[0] + ' · ' + r[1] + ' ' + unit)}"></span></span><b>${r[1]}</b></div>`).join('') : '<p class="hx-muted">No content yet.</p>'; };
    const reuse = {}; assets.forEach(x => uniq(x.blocks.filter(b => b.kind === 'module').map(b => b.moduleId)).forEach(id => { reuse[id] = (reuse[id] || 0) + 1; }));
    const top = Object.entries(reuse).filter(([id]) => modById(id)).sort((x, y) => y[1] - x[1]).slice(0, 5);
    const tRows = S.moduleTypes.map(t => [t.name, mods.filter(m => m.type === t.id).length]).filter(r => r[1]).sort((x, y) => y[1] - x[1]);
    return `<section class="hz-card hz-port span12" aria-labelledby="hx-t-ov"><header class="hz-h"><h3 id="hx-t-ov">Content portfolio</h3><span class="hz-ctx">${esc(sc.label)} · ${mods.length} modules${seeAssets ? ' · ' + assets.length + ' assets' : ''}</span><span class="grow"></span></header>
      <div class="hz-port-g"><div class="hz-pc hz-pc-hm"><span class="hz-cap">Coverage · product × country</span>${heat}</div>
      <div class="hz-pc"><span class="hz-cap">Modules by status</span><div class="hz-stack tall" role="img" aria-label="${esc(sRows.map(s => s[0] + ' ' + s[1]).join(', '))}">${sRows.filter(s => s[1]).map(s => `<span class="mk-${s[2]}" style="flex:${s[1]}" data-tip="${esc(s[0] + ' · ' + s[1] + ' (' + Math.round(100 * s[1] / sTot) + '%)')}"></span>`).join('') || '<span class="mk-none" style="flex:1"></span>'}</div><div class="hz-sl-g">${sRows.map(s => `<span><i class="mk-${s[2]}"></i>${s[0]}<b>${s[1]}</b></span>`).join('')}</div>
        <span class="hz-cap" style="margin-top:16px">Modules by type</span>${bars(tRows, 's1', 'modules')}</div>
      ${seeAssets ? `<div class="hz-pc"><span class="hz-cap">Assets by material type</span>${bars(S.materialTypes.map(t => [t.name, assets.filter(x => x.type === t.id).length]).filter(r => r[1]).sort((x, y) => y[1] - x[1]), 'o2', 'assets')}
        <span class="hz-cap" style="margin-top:16px">Most reused modules · assets using each</span>${top.length ? bars(top.map(([id, n]) => [modById(id).title, n, 's1', `<button type="button" class="linklike" ${goAttr('module', id)}>${esc(modById(id).title)}</button>`]), 's1', 'assets') : '<p class="hx-muted">No modules are used in assets yet.</p>'}</div>` : ''}</div></section>`; });

  return `<div class="home hz">${band}${inv}<div class="hz-grid">${taskBox}${pipe}${perf}${dueBox}${recentBox}${actBox}${overview}</div></div>`;
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
  const tq = F('mtitle').toLowerCase().trim(); const rows = S.modules.filter(m => (!q || modText(m).includes(q)) && (!tq || m.title.toLowerCase().includes(tq)) && (!F('mscope') || homeScope(me()).f(m)) && (!F('mcat') || (F('mcat') === 'media') === isMediaType(m.type)) && (!F('mprod') || m.products.includes(F('mprod'))) && (!F('mtype') || m.type === F('mtype')) && (!F('mmkt') || m.markets.includes(F('mmkt'))) && (!F('mstat') || ls(m) === F('mstat') || (F('mstat') === 'live' && ['Approved', 'Active', 'Expiring'].includes(libraryStatus(m) || '')) || (F('mstat') === 'open' && ['Draft', 'Awaiting Lead submission'].includes(ls(m))) || (F('mstat') === 'issues' && ['Draft', 'Awaiting Lead submission', 'Amendment Requested', 'In Review'].includes(ls(m)) && validationIssues(m, 'Module').length)) && (!F('maud') || m.audience === F('maud')) && (!F('mch') || m.channels.includes(F('mch'))) && (!F('mown') || m.owner === F('mown')) && (!F('mwf') || (lastWf(m) || {}).id === F('mwf')) && (!F('mupd') || m.updatedAt > Date.now() - +F('mupd') * DAY) && (!F('mexp') || (F('mexp') === 'rev90' ? m.reviewDate && daysTo(m.reviewDate) <= 90 : F('mexp') === 'past' ? m.expiry && m.expiry < Date.now() : m.expiry && daysTo(m.expiry) >= 0 && daysTo(m.expiry) <= +F('mexp')))).sort((a, b) => b.updatedAt - a.updatedAt);
  const n = f => S.modules.filter(f).length;
  return pageHead('Modules', 'Reusable content, approved once and reused in every eligible material.', canCreateModule(u) ? goBtn('Create module', 'module-new', null, 'primary', 'plus') : '') +
  statStrip([['In the Approved Library', n(m => ['Approved', 'Active', 'Expiring'].includes(libraryStatus(m) || '')), 'ok', 'Open the library →', 'go', 'library'], ['In review', n(m => ls(m) === 'In Review'), 'warn', 'With MLR reviewers', 'mstat', 'In Review'], ['Amendment requested', n(m => ls(m) === 'Amendment Requested'), 'warn', 'Resume after update', 'mstat', 'Amendment Requested'], ['Rejected', n(m => ls(m) === 'Rejected'), 'bad', 'New version needed', 'mstat', 'Rejected'], ['Expiring', n(m => ls(m) === 'Expiring'), 'warn', 'Within ' + S.settings.expiryWarnDays + ' days', 'mstat', 'Expiring'], ['Draft', n(m => ['Draft', 'Awaiting Lead submission'].includes(ls(m))), 'dim', 'Not submitted', 'mstat', 'open']]) +
  `${filterBar('modules', `${fsearch('mq', F('mq'), 'Search title, ID or text')}${fsel('mscope', F('mscope'), [['team', 'Your team’s content']], 'All content', 'Scope')}${fsel('mprod', F('mprod'), S.products.map(p => [p.id, p.name]), 'All products')}${fsel('mmkt', F('mmkt'), S.markets.map(m => [m.id, m.name]), 'All countries')}${fsel('mcat', F('mcat'), [['content', 'Content modules'], ['media', 'Media & document modules']], 'All categories')}${fsel('mtype', F('mtype'), S.moduleTypes.map(t => [t.id, t.name]), 'All module types')}${fsel('mstat', F('mstat'), [...MOD_STATUSES, ['live', 'In the Approved Library'], ['open', 'Not submitted'], ['issues', 'Failing validation']], 'All statuses')}${fsel('maud', F('maud'), S.audiences.map(a => [a.id, a.name]), 'All audiences')}${fsel('mch', F('mch'), S.channels.map(c => [c.id, c.name]), 'All channels')}${fpick('mown', S.users.filter(x => !isAdmin(x) || S.modules.some(m => m.owner === x.id)).sort((a, b) => a.name.localeCompare(b.name)).map(x => [x.id, x.name + ' · ' + roleLabel(x) + (x.status !== 'Active' ? ' · inactive' : '')]), 'Anyone', 'Person (Material Owner)', 'people')}${ftext('mtitle', 'Title', 'Words in the module title')}${fsel('mwf', F('mwf'), S.workflows.filter(w => !w.hidden && w.appliesTo === 'Module').map(w => [w.id, w.name]), 'All workflows')}${fsel('mupd', F('mupd'), [['7', 'Updated in last 7 days'], ['30', 'Updated in last 30 days'], ['90', 'Updated in last 90 days']], 'Any time')}${fsel('mexp', F('mexp'), [['30', 'Expires within 30 days'], ['90', 'Expires within 90 days'], ['rev90', 'Review due within 90 days'], ['past', 'Expired']], 'Any expiry / review')}`, `${rows.length} of ${S.modules.length}`)}
  <section class="panel table-wrap">${rows.length ? `<table class="tbl list-tbl"><thead><tr><th>Module</th><th>Products</th><th>Countries</th><th>Version</th><th>Status</th><th>Owner</th><th>Updated</th></tr></thead><tbody>
  ${rows.map(m => { const l = latest(m), lv = live(m); return `<tr class="click" ${goAttr('module', m.id)} tabindex="0"><td><div class="cell-title">${modThumb(m, latest(m))}<div><div class="title">${esc(m.title)}</div><span class="mono muted">${m.id} · ${esc(mtype(m.type).name)}</span></div></div></td><td>${tagList(m.products, 'p')}</td><td>${tagList(m.markets)}</td><td class="nw">${vtag(l.v)}${lv && lv.v !== l.v ? ` <span class="muted" style="font-size:11.5px">v${lv.v} live</span>` : ''}</td><td>${chip(lifeStatus(m))}</td><td>${userCell(m.owner)}</td><td class="muted num nw">${ago(m.updatedAt)}</td></tr>`; }).join('')}
  </tbody></table>` : `<div class="empty"><h4>No modules match these filters</h4></div>`}</section>`;
}

/* ===== Module form (step by step) ===== */
// The form follows the kind of the selected module type: content modules capture approved text,
// media & document modules capture an approved file with its source and usage rules.
function msteps(D) {
  const k = D && D.type ? kindOfType(D.type) : 'content'; const media = k !== 'content';
  return [['Module type', ['type'], 'What kind of module is this?'],
    media ? [kindLabel(k) + ' & details', ['file', 'title', 'body', 'source', 'usage', 'format', 'reason', 'owner'], 'Upload the exact file reviewers will approve, with its source and usage rules.'] : ['Content', ['title', 'body', 'reason', 'owner'], 'Name the module and write the exact text reviewers will approve.'],
    ['Products & countries', ['products', 'indications', 'audience', 'markets', 'channels'], 'Every product and country where this module can be used.'],
    ['References, dates & workflow', ['refs', 'expiry', 'reviewDate', 'workflow'], (media ? 'Optional references (for example the study behind a chart), periodic review, expiry' : 'Evidence, periodic review, expiry') + ' and the approval workflow.'],
    ['Review & save', [], 'Check everything, including the Validation SOPs, before saving.']];
}
const ownerOptions = keep => S.users.filter(u => (u.status === 'Active' && can(u, 'create')) || u.id === keep);
function blankDraft() { return { workflow: '', type: '', title: '', body: '', media: null, reason: '', owner: me().id, products: [], indications: [], audience: '', markets: [], channels: [], refs: [], reviewDate: toISO(Date.now() + 300 * DAY), expiry: toISO(Date.now() + S.settings.defaultValidityMonths * 30.5 * DAY), newRefTitle: '', newRefSource: '', newRefKind: (refKindOpts()[0] || [''])[0] }; }
function draftAsModule(D, m) { return { id: m ? m.id : 'NEW', type: D.type, title: D.title, owner: D.owner, products: D.products, markets: D.markets, audience: D.audience, channels: D.channels, reviewDate: fromISO(D.reviewDate), expiry: fromISO(D.expiry), versions: [{ v: 1, body: D.body, refs: D.refs, media: D.media, status: 'Draft', cycles: [], sopLinks: m && !D.newVersion && statusOf(m) === 'Amendment Requested' ? latest(m).sopLinks : undefined }] }; }
// Searchable single-choice list of every eligible workflow from Workflow Management, with its steps.
function wfPicker(D, err) {
  const list = eligibleModuleWorkflows(); const open = UI.msel === 'd-wf'; const q = open ? (UI.mselq || '').toLowerCase() : ''; const sug = suggestedWorkflow(D.type); const cur = D.workflow && wfById(D.workflow);
  const steps = w => `<span class="wfp-steps">${reviewSteps(w).map(st => `<span class="wfp-step">${fnBadge(st.fn, 'sm')}${esc(st.fn)} <b>${esc(levelName(st.level))}</b></span>`).join('<span class="wfp-arr">→</span>')}</span>`;
  const shown = list.filter(w => !q || (w.name + ' ' + (w.desc || '') + ' ' + wfSummary(w)).toLowerCase().includes(q));
  if (!list.length) return `<div class="banner warn">${icon('alert')}<div class="txt"><b>No eligible workflow</b><p>Module workflows must be active and apply to modules. ${can(me(), 'manage_workflows') ? 'Create one with “Add new workflow” — your entries here are kept.' : 'Ask an administrator to create or activate one in Workflow Management.'}</p></div></div>`;
  return `<div class="msel wfp ${open ? 'open' : ''} ${err ? 'invalid' : ''}" data-msel="d-wf"><button type="button" class="wfp-box" data-act="msel-open" data-id="d-wf" aria-expanded="${open}">${cur ? `<span class="wfp-cur"><b>${esc(cur.name)}</b>${steps(cur)}</span>` : `<span class="muted">Choose a workflow (${list.length} available)</span>`}${icon('down', 'sm')}</button>
    ${open ? `<div class="msel-pop" role="listbox"><div class="field-inline msel-search">${icon('search', 'sm')}<input type="search" id="mselq-d-wf" data-mselq="1" value="${esc(UI.mselq || '')}" placeholder="Search workflows or steps" aria-label="Search workflows" autocomplete="off"></div><div class="msel-list">${shown.map(w => `<button type="button" class="msel-opt wfp-opt ${D.workflow === w.id ? 'on' : ''}" role="option" aria-selected="${D.workflow === w.id}" data-act="d-wf" data-v="${w.id}"><span class="wfp-t"><b>${esc(w.name)}</b>${w.id === sug ? '<span class="chip ok">Suggested</span>' : ''}<span class="muted">${reviewSteps(w).length} steps</span></span>${w.desc ? `<span class="muted wfp-d">${esc(w.desc)}</span>` : ''}${steps(w)}</button>`).join('') || '<div class="muted" style="padding:10px 12px;font-size:12.5px">No workflow matches.</div>'}</div><div class="msel-foot"><span class="muted">${list.length} eligible · active module workflows</span><button type="button" class="btn sm" data-act="msel-close">Done</button></div></div>` : ''}</div>
  ${err ? `<span class="err">${esc(err)}</span>` : ''}${sug && sug !== D.workflow ? `<div class="wfp-sug">${icon('sparkle', 'sm')}<span>Suggested for ${esc(mtype(D.type).name)}: <b>${esc(wfById(sug).name)}</b></span><button type="button" class="btn ghost sm" data-act="d-wf" data-v="${sug}">Use suggestion</button></div>` : ''}<span class="hint">The workflow sets the approval route. It is used when you submit and drives the approval timeline.</span>`;
}
function addNewWorkflowBtn() { return can(me(), 'manage_workflows') ? `<button type="button" class="add-new" data-act="wf-addnew">${icon('plus', 'sm')}Add new workflow</button>` : `<span class="add-new disabled" title="Adding a workflow needs the Manage workflows permission" aria-disabled="true">${icon('lock', 'sm')}Add new workflow</span>`; }
function viewModuleForm() {
  const editId = UI.route.p.id; const m = editId ? modById(editId) : null; const isNewVer = !!(m && UI.route.p.newVersion);
  if (!m && editId) return viewMissing('Module');
  if (!UI.draft || UI.draft._for !== (editId || 'new') + (isNewVer ? ':nv' : '')) {
    if (m) { const l = latest(m); UI.draft = { ...blankDraft(), _for: editId + (isNewVer ? ':nv' : ''), workflow: m.workflow && eligibleModuleWorkflows().some(w => w.id === m.workflow) ? m.workflow : '', type: m.type, title: m.title, body: l.body, reason: isNewVer ? '' : (statusOf(m) === 'Amendment Requested' ? m.amendNote || '' : l.reason), owner: m.owner, products: [...m.products], indications: [...m.indications], audience: m.audience, markets: [...m.markets], channels: [...m.channels], refs: [...l.refs], media: l.media ? { ...l.media } : null, reviewDate: toISO(m.reviewDate || Date.now()), expiry: toISO(m.expiry || Date.now()) }; }
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
  return pageHead(title, m ? `<span class="mono">${m.id}</span> · ${esc(m.title)}` : 'One idea per module.', '', m ? [['Modules', 'modules'], [m.id, 'module', m.id], [title]] : [['Modules', 'modules'], ['Create module']]) +
  (isNewVer ? `<div class="banner info" style="margin-bottom:16px">${icon('layers')}<div class="txt"><b>You are creating version ${latest(m).v + 1}</b><p>${live(m) ? 'Version ' + live(m).v + ' stays approved and live in the library, with its approved products and countries, until the new version is approved.' : 'The new version starts a full approval cycle when you submit it.'}</p></div></div>` : '') +
  (amending ? `<div class="banner warn" style="margin-bottom:16px">${icon('undo')}<div class="txt"><b>Amendment requested by ${esc(user(m.resume.by).name)} (${esc(m.resume.fn + ' ' + levelName(m.resume.level))})</b><p>“${esc(m.resume.note)}” After you resubmit, approval resumes at the ${esc(m.resume.fn)} ${esc(levelName(m.resume.level))} step.</p></div></div>` : '') +
  wizBar('module', MSTEPS, D) +
  `<form class="grid cols-main ${D.anim ? (D.anim = false, 'wiz-anim') : ''}" data-form="module" novalidate>
  <div class="stack">${wizHead(MSTEPS, D)}
    <section class="panel"${hid(0)}><div class="panel-head"><h3>Module type</h3><span class="grow"></span>${addNew('moduletypes', 'draft:type', 'module type')}</div><div class="panel-body stack">${[['Content modules', t => (t.kind || 'content') === 'content'], ['Media & document modules', t => (t.kind || 'content') !== 'content']].map(([g, f]) => { const ts = activeOf(S.moduleTypes, D.type).filter(f); return ts.length ? `<div><span class="section-title">${g}</span><div class="type-cards" role="radiogroup" aria-label="${g}" style="margin-top:8px">${ts.map(t => `<button type="button" class="type-card ${D.type === t.id ? 'on' : ''}" data-act="d-type" data-v="${t.id}" role="radio" aria-checked="${D.type === t.id}">${typeIco(t.id)}<span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></span></button>`).join('')}</div></div>` : ''; }).join('')}${err('type')}${m && D.type !== m.type && isMediaType(D.type) !== isMediaType(m.type) ? '<span class="err">A content module cannot become a media module (or the reverse). Create a new module instead.</span>' : ''}</div></section>
    ${MEDIA_K ? `<section class="panel"${hid(1)}><div class="panel-head"><h3>${esc(kindLabel(KIND))} file</h3>${md && md.fileId ? '<span class="grow"></span><span class="chip ok has-ico">' + icon('check', 'sm') + 'Uploaded</span>' : ''}</div><div class="panel-body form">
      ${md && md.fileId ? `${fileCard(md, `<span class="chip ok has-ico">${icon('check', 'sm')}Uploaded</span><span class="muted mono" style="font-size:11px">${esc(md.algo)} ${esc(String(md.checksum).slice(0, 12))}…</span>`)}<div class="media-stage">${filePreview(md, 'Draft upload — not yet saved')}</div>` : ''}
      <label class="upload ${E.file ? 'invalid' : ''}" for="d-file">${icon('upload')}<b>${D.mediaBusy ? 'Processing file…' : md && md.fileId ? 'Replace file' : 'Choose a file to upload'}</b><span>${esc(MEDIA_ACCEPT[KIND].map(x => x.split('/')[1].replace('svg+xml', 'svg').replace('quicktime', 'mov').toUpperCase()).join(', '))} · up to ${mediaMaxMb()} MB</span><input type="file" id="d-file" accept="${MEDIA_ACCEPT[KIND].join(',')}" data-act-change="d-file" class="sr-only"></label>${err('file')}
      ${KIND === 'video' && md && md.fileId ? `<div class="fgrid"><div class="field"><span class="label">Duration</span><div class="input ro">${fmtSecs(md.duration)} <span class="muted">read from the file</span></div></div><div class="field"><label for="d-format">Format</label><input class="input" id="d-format" data-dm="format" value="${esc(md.format || '')}"></div></div>` : ''}
    </div></section>` : ''}
    <section class="panel"${hid(1)}><div class="panel-head"><h3>${MEDIA_K ? 'Details' : 'Content'}</h3></div><div class="panel-body form">
      <div class="field"><label for="d-title">Module name</label><input class="input ${E.title ? 'invalid' : ''}" id="d-title" data-d="title" value="${esc(D.title)}" placeholder="e.g. Clinical Claim — Hospitalisation reduction">${err('title')}</div>
      ${MEDIA_K ? `<div class="field"><label for="d-body">Description / alt text</label><textarea class="textarea ${E.body ? 'invalid' : ''}" id="d-body" data-d="body" rows="3" placeholder="Describe what the ${esc(kindLabel(KIND).toLowerCase())} shows. Used for accessibility and search.">${esc(D.body)}</textarea>${err('body')}</div>
      <div class="field"><label for="d-source">Source</label><input class="input" id="d-source" data-dm="source" value="${esc(md && md.source || '')}" placeholder="e.g. SAJA Medical Affairs — chart from CSR-ALPHA-01, or stock licence number"><span class="hint">Who owns the file or where it comes from.</span></div>
      <div class="field"><label for="d-usage">Usage rules</label><textarea class="textarea" id="d-usage" data-dm="usage" rows="2" placeholder="e.g. Use only with the hospitalisation claim and its reference. Do not crop.">${esc(md && md.usage || '')}</textarea><span class="hint">Shown to everyone who places this module in a material.</span></div>` : `<div class="field"><label for="d-body">Module content</label><textarea class="textarea ${E.body ? 'invalid' : ''}" id="d-body" data-d="body" placeholder="Write one self-contained statement. Use a superscript number to cite a reference.">${esc(D.body)}</textarea><span class="hint">This exact text is what reviewers approve and what materials reuse.</span>${err('body')}</div>`}
      ${isNewVer || amending ? `<div class="field"><label for="d-reason">${amending ? 'What did you change?' : 'Reason for change'}</label><textarea class="textarea ${E.reason ? 'invalid' : ''}" id="d-reason" data-d="reason" rows="2" placeholder="${amending ? 'e.g. Added the warning requested by Regulatory.' : 'e.g. Updated with the 24-month extension data.'}">${esc(D.reason)}</textarea>${err('reason')}</div>` : ''}
      <div class="field">${labelRow('Material Owner', infoTip('owner', 'Material Owner', '<p>The owner receives amendment requests and rejections for this module.</p><p>Only active users who are allowed to create modules can be chosen.</p>'), 'd-owner')}${canOwner ? `<select class="select ${E.owner ? 'invalid' : ''}" id="d-owner" data-d="owner">${ownerOptions(D.owner).map(u => opt(u.id, D.owner, u.name + ' · ' + roleLabel(u))).join('')}</select>` : `<div class="input" style="display:flex;align-items:center;background:var(--surface-2)">${esc(user(D.owner).name)}</div>`}${err('owner')}</div>
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Products & audience</h3><span class="muted" style="font-size:12px">Select one or more products</span></div><div class="panel-body form">
      <div class="field">${labelRow('Products', addNew('products', 'draft:products'))}${chipSelect('d-products', 'd-toggle', 'products', activeOf(S.products, D.products).map(p => [p.id, p.name, p.area + (p.active ? '' : ' · inactive')]), D.products, { ph: 'Select products', noun: 'products', invalid: E.products })}${err('products')}</div>
      <div class="field"><span class="label">Indication</span>${inds.length ? `<div class="tags ro-tags">${inds.map(i => `<span class="tag">${esc(indName(i))} <span class="muted">· ${esc(product(indication(i).product).name)}</span></span>`).join('')}</div><span class="hint">Taken from each selected product (Products → Indication).</span>` : '<p class="muted">Select a product first.</p>'}${err('indications')}</div>
      <div class="field">${labelRow('Audience', addNew('audiences', 'draft:audience'), 'd-aud')}<select class="select ${E.audience ? 'invalid' : ''}" id="d-aud" data-d="audience">${opt('', D.audience, 'Select audience')}${activeOf(S.audiences, D.audience).map(a => opt(a.id, D.audience, a.name)).join('')}</select>${err('audience')}</div>
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Countries & channels</h3></div><div class="panel-body form">
      <div class="field">${labelRow('Countries', addNew('markets', 'draft:markets', 'country'))}${chipSelect('d-markets', 'd-toggle', 'markets', activeOf(S.markets, D.markets).map(x => [x.id, x.name, x.id + (x.authority ? ' · ' + x.authority : '') + (x.active ? '' : ' · inactive')]), D.markets, { ph: 'Select countries', noun: 'countries', invalid: E.markets })}${err('markets')}</div>
      <div class="field">${labelRow('Channels', addNew('channels', 'draft:channels'))}${multi('d-toggle', 'channels', activeOf(S.channels, D.channels).map(c => [c.id, c.name]), D.channels)}${err('channels')}</div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>Approval workflow</h3><span class="grow"></span>${addNewWorkflowBtn()}</div><div class="panel-body form">${wfPicker(D, E.workflow)}</div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>References</h3><span class="grow"></span>${addNew('references', 'draft:refs', 'reference')}</div><div class="panel-body form">
      ${D.refs.length ? `<div class="stack" style="gap:8px">${D.refs.map((r, i) => { const R = refById(r); return `<div class="ref"><span class="n">${i + 1}</span><div style="flex:1"><b>${esc(R.title)}</b><br><span class="muted">${esc(R.source)} · ${esc(refKind(R.kind))}</span></div><button type="button" class="btn icon sm" data-act="d-unref" data-v="${r}" aria-label="Remove reference">${icon('x', 'sm')}</button></div>`; }).join('')}</div>` : `<p class="muted">No references yet.</p>`}
      ${err('refs')}
      <div class="field"><label for="d-addref">Add from the reference library</label><select class="select" id="d-addref" data-act-change="d-addref">${opt('', '', 'Select a reference')}${S.references.filter(r => r.active && !D.refs.includes(r.id)).map(r => opt(r.id, '', r.title + ' (' + refKind(r.kind) + ')')).join('')}</select></div>
      <div class="field"><span class="label">Or register a new reference in the library</span><div class="fgrid"><input class="input" id="d-newref" data-d="newRefTitle" value="${esc(D.newRefTitle)}" placeholder="Title" aria-label="New reference title"><input class="input" id="d-newsrc" data-d="newRefSource" value="${esc(D.newRefSource)}" placeholder="Source, e.g. CSR-ALPHA-03, 2026" aria-label="New reference source"></div><div class="row nowrap"><select class="select" id="d-newkind" data-d="newRefKind" aria-label="Reference kind">${refKindOpts(D.newRefKind).map(k => opt(k[0], D.newRefKind, k[1])).join('')}</select><button type="button" class="btn" data-act="d-newref">${icon('plus', 'sm')}Add reference</button></div></div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>Review & expiry</h3></div><div class="panel-body fgrid">
      <div class="field"><label for="d-rev">Periodic review date</label><input class="input ${E.reviewDate ? 'invalid' : ''}" type="date" id="d-rev" data-d="reviewDate" value="${esc(D.reviewDate)}"><span class="hint">The owner is reminded ${S.settings.reviewReminderDays} days before this date.</span>${err('reviewDate')}</div>
      <div class="field"><label for="d-exp">Expiry date</label><input class="input ${E.expiry ? 'invalid' : ''}" type="date" id="d-exp" data-d="expiry" value="${esc(D.expiry)}"><span class="hint">After this date the module cannot be used in new materials.</span>${err('expiry')}</div>
    </div></section>
    ${st === MSTEPS.length - 1 ? `${D.tried && Object.keys(E).length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${Object.keys(E).length} field${Object.keys(E).length > 1 ? 's need' : ' needs'} attention</b><p>Use Edit to go back to that step.</p></div></div>` : ''}
    ${sumGroup('module', 0, 'Module type', sumRow('Type', esc(T.name)))}
    ${sumGroup('module', 1, MEDIA_K ? kindLabel(KIND) + ' & details' : 'Content', sumRow('Name', esc(D.title)) + (MEDIA_K ? sumRow('File', md && md.fileId ? esc(md.name + ' · ' + (md.format || md.mime) + ' · ' + fmtSize(md.size)) : '') + sumRow('Description', esc(D.body)) + sumRow('Source', esc(md && md.source)) + sumRow('Usage rules', esc(md && md.usage)) : sumRow('Text', esc(D.body))) + (isNewVer || amending ? sumRow(amending ? 'Changes' : 'Reason', esc(D.reason)) : '') + sumRow('Owner', esc(user(D.owner).name)))}
    ${sumGroup('module', 2, 'Products & countries', sumRow('Products', esc(productsTxt(D.products))) + sumRow('Indication', esc(indsTxt(D.indications))) + sumRow('Audience', esc(D.audience ? aud(D.audience).name : '')) + sumRow('Countries', esc(marketsTxt(D.markets))) + sumRow('Channels', esc(channelsTxt(D.channels))))}
    ${sumGroup('module', 3, 'References, dates & workflow', sumRow('References', D.refs.map(r => esc(refById(r).title)).join('<br>')) + sumRow('Review date', esc(D.reviewDate)) + sumRow('Expiry', esc(D.expiry)) + sumRow('Workflow', D.workflow && wfById(D.workflow) ? esc(wfById(D.workflow).name) + '<br><span class="muted">' + esc(wfSummary(wfById(D.workflow))) + '</span>' : ''))}
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
  if (blank(D.title)) e.title = 'Give the module a name.';
  const media = D.type && isMediaType(D.type);
  if (media && !(D.media && D.media.fileId)) e.file = 'Upload the ' + kindLabel(kindOfType(D.type)).toLowerCase() + ' file.';
  if (D.body.trim().length < 8) e.body = media ? 'Describe the file (used as alt text and for search).' : 'Write the module content (at least a short sentence).';
  if (D.newVersion && D.reason.trim().length < 5) e.reason = 'Explain why this version is needed.';
  if (!D.owner || user(D.owner).status !== 'Active') e.owner = 'Choose an active Material Owner.';
  if (!D.products.length) e.products = 'Select at least one product.';
  if (!D.indications.length) e.indications = 'The selected product has no active indication. Add it in Products.';
  if (!D.audience) e.audience = 'Select an audience.';
  if (!D.workflow) e.workflow = eligibleModuleWorkflows().length ? 'Choose the approval workflow for this module.' : 'No active module workflow exists yet. Add one in Workflow Management.';
  else if (!eligibleModuleWorkflows().some(w => w.id === D.workflow)) e.workflow = 'This workflow is no longer active or does not apply to modules. Choose another.';
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
  const rw = fileRework(u, m);
  if (rw) { const md = l.media || {}; const url = md.fileId ? mediaUrl(md.fileId) : 'missing'; const R = UI.rework && UI.rework.id === m.id ? UI.rework : {}; const K = kindOfType(m.type);
    banners += `<div class="banner info rework" data-rework="${m.id}">${icon('upload')}<div class="txt"><b>Update the file</b><p>${rw === 'amend' ? 'Download the current file, edit it and upload the replacement. It becomes a new file revision of v' + l.v + '; then resubmit.' : 'Download the current file, edit it and upload the replacement. This creates version ' + (l.v + 1) + '; then submit it.'}</p>${R.err ? `<p class="err" role="alert">${icon('alert', 'sm')} ${esc(R.err)}</p>` : ''}</div><div class="row nowrap" style="gap:8px">${url && url !== 'missing' ? `<a class="btn sm" href="${url}" download="${esc(md.name || 'file')}" data-file-dl="${esc(md.fileId)}">${icon('download', 'sm')}Download current version</a>` : `<span class="btn sm disabled" aria-disabled="true">${icon('download', 'sm')}${url ? 'File not stored here' : 'Loading…'}</span>`}<label class="btn sm primary ${R.busy ? 'disabled' : ''}" for="rw-file-${m.id}">${icon('upload', 'sm')}${R.busy ? 'Uploading…' : 'Upload new version'}<input type="file" id="rw-file-${m.id}" class="sr-only" accept="${MEDIA_ACCEPT[K].join(',')}" data-act-change="rework-file" data-id="${m.id}" ${R.busy ? 'disabled' : ''}></label></div></div>`; }
  { const pv = m.versions.length > 1 ? m.versions[m.versions.length - 2] : null; if (st === 'Draft' && pv && pv.status === 'Rejected' && owns) banners += `<div class="banner info">${icon('send')}<div class="txt"><b>Next: submit version ${l.v}</b><p>Version ${pv.v} was rejected. Submitting v${l.v} starts a new approval cycle from the first step.</p></div></div>`; }
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
const lastWf = o => { const c = o.review || o.resume ? curCycle(o) : latest(o).cycles.slice(-1)[0]; return c ? wfById(c.wf) : o.workflow ? wfById(o.workflow) : null; };
function metaKV(m, v) {
  const lv = live(m); const wf = lastWf(m);
  return `<dl class="kv"><dt>Type</dt><dd>${esc(mtype(m.type).name)} <span class="muted" style="font-size:12px">· ${esc(modCategory(m.type))}</span></dd><dt>Products</dt><dd>${tagList(m.products, 'p')}</dd><dt>Indication</dt><dd>${esc(indsTxt(m.indications))}</dd><dt>Countries</dt><dd>${tagList(m.markets)} <span class="muted" style="font-size:12px">${esc(marketsTxt(m.markets))}</span></dd><dt>Audience</dt><dd>${esc(aud(m.audience).name)}</dd><dt>Channels</dt><dd>${esc(channelsTxt(m.channels))}</dd><dt>Version</dt><dd>v${v.v} · ${esc(v.status)}</dd><dt>Workflow</dt><dd>${wf ? esc(wf.name) + `<br><span class="muted" style="font-size:12px">${esc(wfSummary(wf))}</span>` : '<span class="muted">Not chosen yet</span>'}</dd><dt>Review date</dt><dd>${fmtD(m.reviewDate)}</dd><dt>Expiry</dt><dd>${fmtD(m.expiry)}</dd><dt>Owner</dt><dd>${esc(user(m.owner).name)} <span class="muted" style="font-size:12px">${esc(roleLabel(user(m.owner)))}</span></dd><dt>References</dt><dd>${v.refs.length}</dd>${lv ? `<dt>Approved</dt><dd>v${lv.v} · ${fmtD(lv.approvedAt)} · ${esc(user(lv.approvedBy).name)}</dd>` : ''}</dl>`;
}
function viewModuleOverview(m) {
  const pv = UI.route.p.v ? verOf(m, +UI.route.p.v) : null; const l = pv || latest(m); const other = pv && pv !== latest(m);
  return (other ? `<div class="banner info" style="margin-bottom:14px">${icon('book')}<div class="txt"><b>Viewing the approved version v${l.v}</b><p>Approved ${fmtD(l.approvedAt)} by ${esc(user(l.approvedBy).name)}. The latest version is v${latest(m).v} (${esc(statusOf(m))}).</p></div>${goBtn('Open latest v' + latest(m).v, 'module', m.id, 'sm')}</div>` : '') + `<div class="grid cols-main"><div class="stack"><section class="panel sheet-card"><div class="sheet-strip"><span class="mono">${m.id} · v${l.v}</span><span>${esc(mtype(m.type).name)}</span><span>${esc(productsTxt(m.products))}</span><span class="grow"></span>${chip(lifeStatus(m))}</div>
    <div class="sheet-body">${isMediaType(m.type) ? `<div class="media-stage">${filePreview(l.media, m.id + ' · v' + l.v + ' · ' + l.status)}</div><p class="media-desc">${esc(l.body)}</p>${mediaRules(l.media)}` : `<p class="claim ${mtype(m.type).tone === 'headline' ? 'is-headline' : ''}">${esc(l.body)}</p>`}
    <div class="footnotes"><span class="fn-title">References</span>${l.refs.length ? `<ol>${l.refs.map(r => { const R = refById(r); return `<li><b>${esc(R.title)}</b> <span>${esc(R.source)} · ${esc(refKind(R.kind))}</span></li>`; }).join('')}</ol>` : '<p class="muted">No references attached.</p>'}</div></div></section>
    ${validationPanel(m, 'Module')}</div>
  <div class="stack"><section class="panel"><div class="panel-head"><h3>Details</h3></div><div class="panel-body">${metaKV(m, l)}</div></section>${isMediaType(m.type) && l.media ? `<section class="panel"><div class="panel-head"><h3>File</h3><span class="grow"></span>${fileMenu(l.media, m.id + ' · v' + l.v + ' · ' + statusOf(m))}</div><div class="panel-body stack" style="gap:12px">${fileCard(l.media, vtag(l.v) + chip(statusOf(m)))}${mediaFactsKV(l.media)}</div></section>` : ''}</div></div>`;
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
  const wfId = cyc ? cyc.wf : kind === 'Module' ? (obj.workflow && wfById(obj.workflow) ? obj.workflow : suggestedWorkflow(obj.type) || S.settings.defaultModuleWorkflow) : assetWorkflow(obj);
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
  if (!cyc) head = `<b>Not submitted</b><span>${kind === 'Module' && !obj.workflow ? 'No workflow chosen yet — suggested route: ' : 'Route when submitted: '}${esc(wf.name)} · ${steps.length} step${steps.length === 1 ? '' : 's'}</span>`;
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
    return `<tr class="click" data-act="version-open" data-kind="${kind}" data-id="${obj.id}" data-v="${v.v}" tabindex="0"><td>${vtag(v.v)}</td><td class="nw">${fmtD(v.createdAt)}<br><span class="muted" style="font-size:12px">${esc(user(v.createdBy).name)}</span></td><td style="max-width:280px;font-size:12.5px">${esc(v.reason || '—')}${v.media ? `<br><span class="muted">${icon('file', 'sm')} ${esc(v.media.name)} · ${esc(String(v.media.checksum || '').slice(0, 8))}${v.files && v.files.length ? ' · file revision ' + (v.media.rev || v.files.length + 1) : ''}</span>` : ''}</td><td>${chip(v.status)}</td><td class="num nw">${v.cycles.length}${am ? `<br><span class="muted" style="font-size:11.5px">${am} amendment${am > 1 ? 's' : ''}</span>` : ''}${rj ? `<br><span class="muted" style="font-size:11.5px">${rj} rejected</span>` : ''}</td><td style="font-size:12.5px">${esc(apr.join(', ') || '—')}</td><td class="nw">${v.approvedAt ? fmtD(v.approvedAt) : '—'}</td><td class="nw">${kind === 'Module' && mt.reviewDate ? fmtD(mt.reviewDate) : '—'}</td><td style="text-align:right"><div class="row nowrap" style="justify-content:flex-end;gap:6px"><button class="btn icon sm" data-act="version-open" data-kind="${kind}" data-id="${obj.id}" data-v="${v.v}" title="Approval history" aria-label="Approval history of v${v.v}">${icon('history', 'sm')}</button>${v.approvedAt ? `<button class="btn icon sm" ${goAttr('cover', obj.id, ` data-k="${kind}" data-v="${v.v}"`)} title="Cover letter" aria-label="Cover letter for v${v.v}">${icon('award', 'sm')}</button>` : ''}</div></td></tr>`; }).join('')}</tbody></table></section>`;
}
function versionModalBody(obj, kind, v) {
  const mt = metaOf(obj, v);
  return `<dl class="kv" style="grid-template-columns:120px 1fr;margin-bottom:12px"><dt>Created</dt><dd>${fmtDT(v.createdAt)} · ${esc(user(v.createdBy).name)}</dd><dt>Reason</dt><dd>${esc(v.reason || '—')}</dd><dt>Status</dt><dd>${chip(v.status)}</dd>${v.approvedAt ? `<dt>Approved</dt><dd>${fmtDT(v.approvedAt)} · ${esc(user(v.approvedBy).name)}</dd>` : ''}<dt>Products</dt><dd>${esc(productsTxt(mt.products))}</dd><dt>Countries</dt><dd>${esc(marketsTxt(mt.markets))}</dd>${kind === 'Module' ? `<dt>Channels</dt><dd>${esc(channelsTxt(mt.channels))}</dd>` : `<dt>Channel</dt><dd>${esc(chan(mt.channel).name)}</dd>`}<dt>Audience</dt><dd>${esc(aud(mt.audience).name)}</dd></dl>
  ${kind === 'Module' && v.media ? `<div class="media-stage sm" style="margin-bottom:10px">${filePreview(v.media, obj.id + ' · v' + v.v + ' · ' + v.status)}</div>${mediaFactsKV(v.media)}${mediaRules(v.media)}` : ''}
  ${kind === 'Module' && v.files && v.files.length ? `<div class="field" style="margin-bottom:12px"><span class="label">Earlier files in v${v.v}</span>${[...v.files].reverse().map(f => `<div class="row nowrap" style="gap:8px;font-size:12.5px">${icon('file', 'sm')}<span>Revision ${f.rev || 1} · ${esc(f.name)} · ${esc(fmtSize(f.size))} · uploaded ${f.uploadedAt ? fmtD(f.uploadedAt) : '—'} by ${esc(user(f.uploadedBy || v.createdBy).name)} · replaced ${fmtD(f.replacedAt)}</span><span class="grow"></span>${fileMenu(f, obj.id + ' · v' + v.v + ' · revision ' + (f.rev || 1))}</div>`).join('')}</div>` : ''}
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
    ${isM && v.media ? `<section class="letter-content media-letter"><span class="eyebrow">Approved ${esc(kindLabel(kindOfType(mt.type)).toLowerCase())}</span><div class="letter-media"><div class="media-stage sm">${filePreview(v.media, obj.id + ' · v' + v.v, 'thumb')}</div><div>${mediaFactsKV(v.media)}<p style="font-size:12.5px;margin-top:6px">${esc(v.body)}</p></div></div>${mediaRules(v.media)}<p class="muted" style="font-size:11.5px;margin-top:8px">Approval applies to the file with checksum ${esc(v.media.algo || '')} ${esc(v.media.checksum || '')}.</p></section>` : ''}
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
  return pageHead('My Tasks', admin ? 'Every item waiting for an action, across all users.' : 'Items waiting for an action from you.', `${high ? `<span class="chip bad">${high} high priority</span>` : ''}${can(u, 'page_library') ? goBtn('Approved Library', 'library', null, 'ghost', 'book') : ''}`, null, ['tasks', 'Which tasks appear here', admin ? `<p>Administrators see every item that is waiting for an action, for all users.</p><p>Priority follows the ${sla}-day review SLA set in Settings: <b>High</b> once a task has waited longer than the SLA, <b>Medium</b> after half of it.</p>` : `<p>You only see items you are allowed to act on — this depends on your role, level and team, and on the workflow step the item is at.</p><p>Priority follows the ${sla}-day review SLA: <b>High</b> once a task has waited longer than the SLA, <b>Medium</b> after half of it.</p>`]) +
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
  return pageHead('Approved Library', 'Approved, currently valid content ready to reuse. Drafts, withdrawn and expired content are not shown.', goBtn('My Tasks', 'tasks', null, '', 'inbox')) +
  `<div class="tabs" role="tablist" style="margin-bottom:14px">${[['modules', 'Modules'], ['materials', 'Assets']].map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" role="tab" aria-selected="${tab === t[0]}" ${goAttr('library', null, ` data-tab="${t[0]}"`)}>${t[1]}</button>`).join('')}</div>
  ${filterBar('library', `${fsearch('lq', F('lq'), tab === 'modules' ? 'Search approved modules' : 'Search approved assets')}${fsel('lprod', F('lprod'), S.products.map(p => [p.id, p.name]), 'All products')}${fsel('lmkt', F('lmkt'), S.markets.map(m => [m.id, m.name]), 'All countries')}${tab === 'modules' ? fsel('lcat', F('lcat'), [['content', 'Content modules'], ['media', 'Media & document modules']], 'All categories') + fsel('ltype', F('ltype'), S.moduleTypes.map(t => [t.id, t.name]), 'All module types') : fsel('lmat', F('lmat'), S.materialTypes.map(t => [t.id, t.name]), 'All material types')}${fsel('laud', F('laud'), S.audiences.map(a => [a.id, a.name]), 'All audiences')}${fsel('lch', F('lch'), S.channels.map(c => [c.id, c.name]), 'All channels')}${fsel('lapp', F('lapp'), [['30', 'Approved in last 30 days'], ['90', 'Approved in last 90 days'], ['365', 'Approved in last 12 months']], 'Any approval date')}${fsel('lver', F('lver'), [['1', 'v1 only'], ['2', 'v2 and later']], 'Any version')}${tab === 'modules' ? fsel('lexp', F('lexp'), [['30', 'Expires within 30 days'], ['90', 'Expires within 90 days'], ['rev90', 'Review due within 90 days'], ['later', 'Valid for over 90 days']], 'Any expiry / review') + fsel('lstat', F('lstat'), ['Approved', 'Active', 'Expiring'], 'All valid statuses') : ''}`, `${count} ${tab === 'modules' ? 'modules' : 'assets'}`)}
  <section class="panel table-wrap">${body}</section>`;
}
