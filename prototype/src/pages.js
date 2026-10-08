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
const clearBtn = keys => keys.some(k => F(k)) ? btn('Clear filters', 'clear-filters', 'ghost sm', `data-keys="${keys.join(',')}"`) : '';
// Clickable status strip above a list: [label, count, tone, sub, filterKey, filterValue]
function statStrip(items) {
  return `<div class="kpis strip">${items.map(it => { const on = it[4] && F(it[4]) === it[5]; return `<button class="kpi ${on ? 'on' : ''}" ${it[4] ? `data-act="toggle-f" data-k="${it[4]}" data-v="${esc(it[5])}" aria-pressed="${on}"` : ''}><span class="k-label">${it[2] ? `<span class="k-dot ${it[2]}"></span>` : ''}${it[0]}</span><b>${it[1]}</b>${it[3] ? `<span class="k-sub">${it[3]}</span>` : ''}</button>`; }).join('')}</div>`;
}
// Multi-select as toggle chips. act = data-act handler, k = draft key.
function multi(act, k, options, selected, extra = '') {
  return `<div class="choices">${options.map(([v, label]) => { const on = selected.includes(v); return `<button type="button" class="choice ${on ? 'on' : ''}" data-act="${act}" data-k="${k}" data-v="${esc(v)}" aria-pressed="${on}" ${extra}><span class="box">${on ? icon('check', 'sm') : ''}</span>${esc(label)}</button>`; }).join('')}</div>`;
}
function validationPanel(obj, kind, title = 'Validation check') {
  const res = validate(obj, kind); const bad = res.filter(x => !x.ok);
  return `<section class="panel"><div class="panel-head"><h3>${title}</h3><span class="grow"></span>${res.length ? (bad.length ? `<span class="chip bad has-ico">${icon('x', 'sm')}${bad.length} issue${bad.length > 1 ? 's' : ''}</span>` : `<span class="chip ok has-ico">${icon('check', 'sm')}Passed</span>`) : ''}</div><div class="panel-body stack" style="gap:8px">
    ${res.length ? res.map(x => `<div class="sop-row ${x.ok ? 'ok' : 'bad'}"><span class="sop-ico">${icon(x.ok ? 'check' : 'alert', 'sm')}</span><div><b>${esc(x.label)}</b>${x.ok ? '' : `<span>${esc(x.issue)} ${esc(x.sop.guidance || '')}</span>`}</div></div>`).join('') : '<p class="muted">No Validation SOP applies.</p>'}
    <p class="muted" style="font-size:11.5px">Checked against the active Validation SOPs.${isAdmin(me()) ? ` <button class="linklike" ${goAttr('sops')}>Manage SOPs</button>` : ''}</p></div></section>`;
}

/* ===== Shell ===== */
const NAV = [
  ['WORKSPACE'], ['home', 'Home', 'home'], ['modules', 'Modules', 'grid', 'mods', null, 'primary'], ['approvals', 'Approvals', 'inbox', 'tasks'], ['assets', 'Assets', 'layers'], ['library', 'Approved Library', 'book'],
  ['INSIGHTS', 'view_reports'], ['reports', 'Reports', 'chart', null, 'view_reports'],
  ['GOVERNANCE', 'view_audit'], ['lifecycle', 'Lifecycle', 'clock', null, 'view_audit'], ['audit', 'Audit Trail', 'history', null, 'view_audit'], ['sops', 'Validation SOPs', 'clipboard', null, 'manage_sops'], ['workflows', 'Workflows', 'workflow', null, 'manage_workflows'],
  ['ADMINISTRATION', 'manage_users'], ['users', 'Users', 'users', null, 'manage_users'], ['roles', 'Roles & Permissions', 'key', null, 'manage_users'], ['teams', 'Teams', 'team', null, 'manage_users'], ['products', 'Products', 'pill', null, 'manage_settings'], ['markets', 'Countries', 'globe', null, 'manage_settings'], ['materials', 'Material Types', 'file', null, 'manage_settings'], ['settings', 'Settings', 'settings', null, 'manage_settings']
];
const NAV_OF = { module: 'modules', 'module-new': 'modules', 'module-edit': 'modules', review: 'approvals', 'asset-review': 'approvals', assemble: 'assets', asset: 'assets', user: 'users', 'user-new': 'users', 'user-edit': 'users', workflow: 'workflows', 'workflow-new': 'workflows', cover: 'library' };
const ROUTE_PERM = { reports: 'view_reports', lifecycle: 'view_audit', audit: 'view_audit', sops: 'manage_sops', workflows: 'manage_workflows', workflow: 'manage_workflows', 'workflow-new': 'manage_workflows', users: 'manage_users', user: 'manage_users', 'user-new': 'manage_users', 'user-edit': 'manage_users', roles: 'manage_users', teams: 'manage_users', products: 'manage_settings', markets: 'manage_settings', materials: 'manage_settings', settings: 'manage_settings' };

function viewShell(inner) {
  const u = me(); const active = NAV_OF[UI.route.name] || UI.route.name; const nTasks = tasksFor(u).length;
  const nav = NAV.map(n => {
    if (n.length <= 2) return (!n[1] || can(u, n[1])) ? `<div class="nav-label">${n[0]}</div>` : '';
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
  const q = UI.search.toLowerCase();
  const mods = S.modules.filter(m => (m.title + ' ' + m.id + ' ' + latest(m).body).toLowerCase().includes(q)).slice(0, 6);
  const as = S.assets.filter(a => (a.name + ' ' + a.id).toLowerCase().includes(q)).slice(0, 4);
  const us = S.users.filter(x => (x.name + ' ' + roleLabel(x)).toLowerCase().includes(q)).slice(0, 4);
  if (!mods.length && !as.length && !us.length) return `<div class="search-pop"><div class="empty" style="padding:18px">No results for “${esc(UI.search)}”.</div></div>`;
  return `<div class="search-pop">${mods.length ? `<div class="grp">Modules</div>${mods.map(m => `<button ${goAttr('module', m.id)}>${typeIco(m.type)}<span style="flex:1;min-width:0"><b style="font-size:13px">${esc(m.title)}</b><br><span class="mono muted">${m.id} · v${latest(m).v}</span></span>${chip(lifeStatus(m))}</button>`).join('')}` : ''}
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
        <div class="doc-top"><span class="mono">MOD-A-014 · v2</span><span class="doc-tag">Clinical claim · HCP</span></div>
        <p class="doc-claim">Product A reduced heart-failure hospitalisation by 21% versus standard care.<sup>1</sup></p>
        <p class="doc-ref"><sup>1</sup> ALPHA-HF study, primary results. CSR-ALPHA-01, 2025.</p>
        <ul class="doc-sign">${[['Medical', 'Sara Ahmed'], ['Legal', 'Rania Haddad'], ['Regulatory', 'Layla Nasser']].map((x, i) => `<li style="--d:${0.55 + i * 0.28}s"><span class="tick">${icon('check', 'sm')}</span>${fnBadge(x[0], 'sm')}<b>${x[0]}</b><span>${x[1]} · Team Lead</span></li>`).join('')}</ul>
      </div>
      <div class="stamp"><span class="s-top">Approved</span><b>MLR</b><span class="s-bot mono">SA · AE · KW</span></div>
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
function viewHome() {
  const u = me(); const tasks = tasksFor(u); const a = authority(u.fn, u.level); const first = u.name.split(' ')[0]; const admin = isAdmin(u);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const recentApproved = [...S.modules].filter(m => live(m)).sort((x, y) => live(y).approvedAt - live(x).approvedAt);
  const dueSoon = S.modules.filter(m => live(m) && !m.archived && ((m.expiry && daysTo(m.expiry) <= 90) || (m.reviewDate && daysTo(m.reviewDate) <= 60))).sort((x, y) => Math.min(x.expiry || 9e15, x.reviewDate || 9e15) - Math.min(y.expiry || 9e15, y.reviewDate || 9e15));
  const dueRow = m => { const de = daysTo(m.expiry), dr = m.reviewDate ? daysTo(m.reviewDate) : 9999; const isRev = dr < de; const dd = isRev ? dr : de; return `<button class="task" ${goAttr('module', m.id, ' data-tab="lifecycle"')}>${typeIco(m.type)}<span class="body"><b>${esc(m.title)}</b><span>${isRev ? 'Review date' : 'Expiry'} ${fmtD(isRev ? m.reviewDate : m.expiry)} · ${dd < 0 ? Math.abs(dd) + ' days overdue' : dd + ' days'}</span></span>${chip(dd < 0 ? 'Review Required' : 'Expiring')}${icon('chevron', 'sm')}</button>`; };
  const k = (label, val, tone, sub, go) => `<button class="kpi" ${go}><span class="k-label">${tone ? `<span class="k-dot ${tone}"></span>` : ''}${label}</span><b>${val}</b><span class="k-sub">${esc(sub)}</span></button>`;
  const stepBars = () => { const rows = REVIEW_FUNCS.map(fn => [fn, avgStepDays(x => x.fn === fn)]); const mx = Math.max(...rows.map(r => r[1]), 1); return `<section class="side-block"><div class="sb-head"><h3>Average time per step</h3><span class="muted mono">90 days</span></div><div class="hb">${rows.map(r => `<div class="hb-row"><span class="hb-l">${fnBadge(r[0], 'sm')}${r[0]}</span><span class="hb-track"><span class="hb-bar s1" style="width:${100 * r[1] / mx}%" data-tip="${r[0]}: ${fmtDur(r[1])}"></span></span><b class="hb-v">${durDays(r[1])}d</b></div>`).join('')}</div>${can(u, 'view_reports') ? `<button class="btn ghost sm" style="align-self:flex-start" ${goAttr('reports')}>Approval performance</button>` : ''}</section>`; };
  let kpis = '', main = '', side = '', actions = '';
  if (admin) {
    const inRev = [...S.modules, ...S.assets].filter(o => o.review); const amend = [...S.modules, ...S.assets].filter(o => statusOf(o) === 'Amendment Requested');
    const open = [...S.modules, ...S.assets].filter(o => ['Draft', 'Amendment Requested', 'In Review', 'Awaiting Lead submission'].includes(statusOf(o)));
    const withIssues = open.filter(o => validationIssues(o).length);
    const cyc90 = allCycles().filter(c => c.outcome === 'Approved' && c.end > Date.now() - 90 * DAY);
    kpis = k('Awaiting approval', inRev.length, inRev.length ? 'warn' : 'ok', inRev.length ? 'Oldest ' + ago(Math.min(...inRev.map(o => o.review.stepStartedAt))) : 'Nothing waiting', goAttr('approvals')) + k('Amendments requested', amend.length, amend.length ? 'warn' : 'ok', 'Back with owners', goAttr('approvals', null, ' data-tab="amend"')) + k('Average approval time', durDays(avg(cyc90.map(c => c.end - c.start))) + 'd', '', 'Submission to approval · 90 days', goAttr('reports')) + k('Validation issues', withIssues.length, withIssues.length ? 'bad' : 'ok', 'Open items failing an SOP', goAttr('modules'));
    actions = goBtn('Approvals', 'approvals', null, '', 'inbox') + goBtn('Create module', 'module-new', null, 'primary', 'plus');
    main = homeList('Modules in progress', S.modules.filter(m => ['Draft', 'In Review', 'Amendment Requested', 'Rejected', 'Awaiting Lead submission'].includes(statusOf(m))).sort((x, y) => y.updatedAt - x.updatedAt).map(moduleRow), 'No modules in progress.', goBtn('All modules', 'modules', null, 'ghost sm')) + homeList('Approval queue', tasks.filter(t => t.kind === 'review').map(viewTaskRow), 'Nothing is waiting for approval.', goBtn('All approvals', 'approvals', null, 'ghost sm'));
    side = stepBars() + homeList('Recently approved', recentApproved.slice(0, 5).map(moduleRow), 'Nothing approved yet.') + homeList('Upcoming expiry & review', dueSoon.map(dueRow), 'Nothing due in the next 90 days.', goBtn('Lifecycle', 'lifecycle', null, 'ghost sm'));
  } else if (REVIEW_FUNCS.includes(u.fn)) {
    const mine = stepTimes(allCycles()).filter(x => x.by === u.id);
    const pend = tasks.filter(t => t.kind === 'review');
    kpis = k('Awaiting my action', pend.length, pend.length ? 'warn' : 'ok', pend.length ? 'Oldest ' + ago(pend[0].since) : 'All caught up', goAttr('approvals')) + k('Completed reviews', mine.length, 'ok', 'All time', goAttr('audit')) + k('My average review time', durDays(avg(mine.map(x => x.ms))) + 'd', '', 'From step start to decision', goAttr('reports')) + k('Recently approved', recentApproved.filter(m => live(m).approvedAt > Date.now() - 30 * DAY).length, 'ok', 'Last 30 days', goAttr('library'));
    main = homeList('Pending ' + u.fn + ' reviews', pend.map(viewTaskRow), 'Nothing is waiting for you.', goBtn('All approvals', 'approvals', null, 'ghost sm'));
    side = homeList('Recently approved', recentApproved.slice(0, 5).map(moduleRow), 'Nothing approved yet.');
  } else {
    const owned = S.modules.filter(m => m.owner === u.id); const by = s => owned.filter(m => statusOf(m) === s);
    kpis = k('My modules', owned.length, '', 'Owned by you', goAttr('modules')) + k('In review', by('In Review').length, 'warn', 'With MLR reviewers', goAttr('modules')) + k('Amendments requested', by('Amendment Requested').length, by('Amendment Requested').length ? 'warn' : 'ok', 'Need your update', goAttr('approvals')) + k('Approved', owned.filter(m => live(m)).length, 'ok', 'In the library', goAttr('library'));
    actions = canCreateModule(u) ? goBtn('Create module', 'module-new', null, 'primary', 'plus') : '';
    main = homeList('Items awaiting my action', tasks.map(viewTaskRow), 'Nothing needs your action.') + homeList('My modules', owned.sort((x, y) => y.updatedAt - x.updatedAt).map(moduleRow), 'You have no modules yet.', goBtn('All modules', 'modules', null, 'ghost sm'));
    side = homeList('Upcoming expiry & review', dueSoon.filter(m => m.owner === u.id).map(dueRow), 'Nothing due in the next 90 days.');
  }
  const recent = [...S.audit].filter(e => admin || e.user === u.id).sort((x, y) => y.ts - x.ts).slice(0, 4);
  return `<div class="home">
  <header class="home-head"><div class="hh-text"><span class="eyebrow">${esc(today)}</span><h1>Welcome, ${esc(first)}</h1><div class="row ink2" style="gap:8px">${esc(roleLabel(u))} <span class="muted">·</span> ${icon(a.final ? 'key' : 'eye', 'sm')} ${esc(a.short)}</div></div><div class="row">${actions}</div></header>
  <div class="kpis">${kpis}</div>
  <div class="home-grid"><div class="home-main">${main}</div>
  <aside class="home-side">${side}<section class="side-block"><div class="sb-head"><h3>${admin ? 'Recent activity' : 'My recent activity'}</h3>${can(u, 'view_audit') ? `<button class="btn ghost sm" ${goAttr('audit')}>Audit trail</button>` : ''}</div>${viewTimeline(recent, true)}</section></aside></div></div>`;
}
function taskMeta(t) {
  if (t.kind === 'review') return esc(stepLabel(t.step)) + ' · waiting ' + fmtDur(Date.now() - t.since);
  if (t.kind === 'amend') return 'Amendment requested — resumes at ' + esc(t.obj.resume ? t.obj.resume.fn + ' ' + levelName(t.obj.resume.level) : 'the same step');
  if (t.kind === 'submit') return 'Prepared by a Team Member — ready to submit';
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
const MOD_STATUSES = ['Draft', 'Awaiting Lead submission', 'In Review', 'Amendment Requested', 'Rejected', 'Approved', 'Active', 'Expiring', 'Review Required', 'Archived'];
function viewModules() {
  const u = me(); const q = F('mq').toLowerCase(); const ls = m => lifeStatus(m);
  const rows = S.modules.filter(m => (!q || (m.title + m.id + latest(m).body).toLowerCase().includes(q)) && (!F('mprod') || m.products.includes(F('mprod'))) && (!F('mtype') || m.type === F('mtype')) && (!F('mmkt') || m.markets.includes(F('mmkt'))) && (!F('mstat') || ls(m) === F('mstat') || (F('mstat') === 'live' && ['Approved', 'Active'].includes(ls(m))) || (F('mstat') === 'open' && ['Draft', 'Awaiting Lead submission'].includes(ls(m))))).sort((a, b) => b.updatedAt - a.updatedAt);
  const n = f => S.modules.filter(f).length;
  return pageHead('Modules', 'The reusable content units of SAJA MedLR. Each module is approved once through MLR review and then reused in every eligible material.', canCreateModule(u) ? goBtn('Create module', 'module-new', null, 'primary', 'plus') : '') +
  statStrip([['Approved & active', n(m => ['Approved', 'Active'].includes(ls(m))), 'ok', 'Reusable now', 'mstat', 'live'], ['In review', n(m => ls(m) === 'In Review'), 'warn', 'With MLR reviewers', 'mstat', 'In Review'], ['Amendment requested', n(m => ls(m) === 'Amendment Requested'), 'warn', 'Resume after update', 'mstat', 'Amendment Requested'], ['Rejected', n(m => ls(m) === 'Rejected'), 'bad', 'New version needed', 'mstat', 'Rejected'], ['Expiring', n(m => ls(m) === 'Expiring'), 'warn', 'Within ' + S.settings.expiryWarnDays + ' days', 'mstat', 'Expiring'], ['Draft', n(m => ['Draft', 'Awaiting Lead submission'].includes(ls(m))), 'dim', 'Not submitted', 'mstat', 'open']]) +
  `<div class="toolbar">${searchBox('mq', F('mq'), 'Search title, ID or text')}${sel('mprod', F('mprod'), S.products.map(p => [p.id, p.name]), 'All products')}${sel('mmkt', F('mmkt'), S.markets.map(m => [m.id, m.name]), 'All countries')}${sel('mtype', F('mtype'), S.moduleTypes, 'All module types')}${sel('mstat', F('mstat'), MOD_STATUSES, 'All statuses')}${clearBtn(['mq', 'mprod', 'mtype', 'mmkt', 'mstat'])}<span class="muted" style="margin-left:auto">${rows.length} of ${S.modules.length}</span></div>
  <section class="panel table-wrap">${rows.length ? `<table class="tbl list-tbl"><thead><tr><th>Module</th><th>Products</th><th>Countries</th><th>Version</th><th>Status</th><th>Owner</th><th>Updated</th></tr></thead><tbody>
  ${rows.map(m => { const l = latest(m), lv = live(m); return `<tr class="click" ${goAttr('module', m.id)} tabindex="0"><td><div class="cell-title">${typeIco(m.type)}<div><div class="title">${esc(m.title)}</div><span class="mono muted">${m.id} · ${esc(m.type)}</span></div></div></td><td>${tagList(m.products, 'p')}</td><td>${tagList(m.markets)}</td><td class="nw">${vtag(l.v)}${lv && lv.v !== l.v ? ` <span class="muted" style="font-size:11.5px">v${lv.v} live</span>` : ''}</td><td>${chip(lifeStatus(m))}</td><td>${userCell(m.owner)}</td><td class="muted num nw">${ago(m.updatedAt)}</td></tr>`; }).join('')}
  </tbody></table>` : `<div class="empty"><h4>No modules match these filters</h4><p>Clear a filter or search for a different term.</p></div>`}</section>`;
}

/* ===== Module form (step by step) ===== */
const MODULE_TYPES = [['Clinical Claim', 'A single efficacy or outcome claim with a reference'], ['Safety Statement', 'Fair-balance or safety information'], ['Headline', 'Short promotional headline'], ['Supporting Evidence', 'Data that supports a claim'], ['CTA', 'Call to action'], ['Reference', 'Citation block']];
const MSTEPS = [['Module type', ['type'], 'What kind of content is this?'], ['Content', ['title', 'body', 'reason'], 'Name the module and write the exact text reviewers will approve.'], ['Products & countries', ['products', 'indications', 'audience', 'markets', 'channels'], 'Every product and country where this module can be used.'], ['References & dates', ['refs', 'expiry', 'reviewDate'], 'Evidence, periodic review and expiry.'], ['Review & save', [], 'Check everything, including the Validation SOPs, before saving.']];
function blankDraft() { return { type: '', title: '', body: '', reason: '', products: [], indications: [], audience: '', markets: [], channels: [], refs: [], reviewDate: toISO(Date.now() + 300 * DAY), expiry: toISO(Date.now() + S.settings.defaultValidityMonths * 30.5 * DAY), newRefTitle: '' }; }
function draftAsModule(D, m) { return { id: m ? m.id : 'NEW', type: D.type, title: D.title, products: D.products, markets: D.markets, audience: D.audience, channels: D.channels, reviewDate: fromISO(D.reviewDate), expiry: fromISO(D.expiry), versions: [{ v: 1, body: D.body, refs: D.refs, status: 'Draft', cycles: [] }] }; }
function viewModuleForm() {
  const editId = UI.route.p.id; const m = editId ? modById(editId) : null; const isNewVer = !!(m && UI.route.p.newVersion);
  if (!UI.draft || UI.draft._for !== (editId || 'new') + (isNewVer ? ':nv' : '')) {
    if (m) { const l = latest(m); UI.draft = { _for: editId + (isNewVer ? ':nv' : ''), type: m.type, title: m.title, body: l.body, reason: isNewVer ? '' : l.reason, products: [...m.products], indications: [...m.indications], audience: m.audience, markets: [...m.markets], channels: [...m.channels], refs: [...l.refs], reviewDate: toISO(m.reviewDate || Date.now()), expiry: toISO(m.expiry || Date.now()), newRefTitle: '' }; }
    else UI.draft = { _for: 'new', ...blankDraft() };
    UI.draft.newVersion = isNewVer; UI.draft.step = m ? 1 : 0; UI.draft.maxStep = m ? MSTEPS.length - 1 : 0; UI.draft.triedSteps = [];
  }
  const D = UI.draft; const E = wizErrors(D, MSTEPS, validateDraft(D)); const st = D.step || 0; const hid = i => i === st ? '' : ' hidden';
  const err = k => E[k] ? `<span class="err">${E[k]}</span>` : '';
  const amending = m && statusOf(m) === 'Amendment Requested' && !isNewVer;
  const title = m ? (isNewVer ? 'New version of ' + m.id : amending ? 'Amend module' : 'Edit module') : 'Create module';
  const inds = uniq(S.products.filter(p => D.products.includes(p.id)).flatMap(p => p.indications));
  const preview = draftAsModule(D, m);
  return pageHead(title, m ? `<span class="mono">${m.id}</span> · ${esc(m.title)}` : 'One idea per module. It is approved once and reused in every material where it is eligible.', '', m ? [['Modules', 'modules'], [m.id, 'module', m.id], [title]] : [['Modules', 'modules'], ['Create module']]) +
  (isNewVer ? `<div class="banner info" style="margin-bottom:16px">${icon('layers')}<div class="txt"><b>You are creating version ${latest(m).v + 1}</b><p>${live(m) ? 'Version ' + live(m).v + ' stays approved and live in the library until the new version is approved.' : 'The new version starts a full approval cycle when you submit it.'}</p></div></div>` : '') +
  (amending ? `<div class="banner warn" style="margin-bottom:16px">${icon('undo')}<div class="txt"><b>Amendment requested by ${esc(user(m.resume.by).name)} (${esc(m.resume.fn + ' ' + levelName(m.resume.level))})</b><p>“${esc(m.resume.note)}” After you resubmit, approval resumes at the ${esc(m.resume.fn)} ${esc(levelName(m.resume.level))} step.</p></div></div>` : '') +
  wizBar('module', MSTEPS, D) +
  `<form class="grid cols-main ${D.anim ? (D.anim = false, 'wiz-anim') : ''}" data-form="module" novalidate>
  <div class="stack">${wizHead(MSTEPS, D)}
    <section class="panel"${hid(0)}><div class="panel-head"><h3>Module type</h3></div><div class="panel-body"><div class="type-cards" role="radiogroup" aria-label="Module type">${MODULE_TYPES.map(t => `<button type="button" class="type-card ${D.type === t[0] ? 'on' : ''}" data-act="d-type" data-v="${t[0]}" role="radio" aria-checked="${D.type === t[0]}">${typeIco(t[0])}<span><b>${t[0]}</b><span>${t[1]}</span></span></button>`).join('')}</div>${err('type')}</div></section>
    <section class="panel"${hid(1)}><div class="panel-head"><h3>Content</h3></div><div class="panel-body form">
      <div class="field"><label for="d-title">Module name</label><input class="input ${E.title ? 'invalid' : ''}" id="d-title" data-d="title" value="${esc(D.title)}" placeholder="e.g. Clinical Claim — Hospitalisation reduction">${err('title')}</div>
      <div class="field"><label for="d-body">Module content</label><textarea class="textarea ${E.body ? 'invalid' : ''}" id="d-body" data-d="body" placeholder="Write one self-contained statement. Use a superscript number to cite a reference.">${esc(D.body)}</textarea><span class="hint">This exact text is what reviewers approve and what materials reuse.</span>${err('body')}</div>
      ${isNewVer || amending ? `<div class="field"><label for="d-reason">${amending ? 'What did you change?' : 'Reason for change'}</label><textarea class="textarea ${E.reason ? 'invalid' : ''}" id="d-reason" data-d="reason" rows="2" placeholder="${amending ? 'e.g. Added the warning requested by Regulatory.' : 'e.g. Updated with the 24-month extension data.'}">${esc(D.reason)}</textarea>${err('reason')}</div>` : ''}
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Products</h3><span class="muted" style="font-size:12px">Select one or more</span></div><div class="panel-body form">
      ${multi('d-toggle', 'products', S.products.filter(p => p.status === 'Active' || D.products.includes(p.id)).map(p => [p.id, p.name + ' · ' + p.area]), D.products)}${err('products')}
      <div class="field"><span class="label">Indications</span>${inds.length ? multi('d-toggle', 'indications', inds.map(i => [i, i]), D.indications) : '<p class="muted">Select a product first.</p>'}${err('indications')}</div>
      <div class="field"><label for="d-aud">Audience</label><select class="select ${E.audience ? 'invalid' : ''}" id="d-aud" data-d="audience">${opt('', D.audience, 'Select audience')}${S.audiences.map(a => opt(a, D.audience)).join('')}</select>${err('audience')}</div>
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Countries & channels</h3></div><div class="panel-body form">
      <div class="field"><span class="label">Countries</span>${multi('d-toggle', 'markets', S.markets.filter(x => x.active || D.markets.includes(x.id)).map(x => [x.id, x.name]), D.markets)}${err('markets')}</div>
      <div class="field"><span class="label">Channels</span>${multi('d-toggle', 'channels', S.channels.map(c => [c, c]), D.channels)}${err('channels')}</div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>References</h3></div><div class="panel-body form">
      ${D.refs.length ? `<div class="stack" style="gap:8px">${D.refs.map((r, i) => { const R = refById(r); return `<div class="ref"><span class="n">${i + 1}</span><div style="flex:1"><b>${esc(R.title)}</b><br><span class="muted">${esc(R.source)}${R.kind ? ' · ' + esc(R.kind) : ''}</span></div><button type="button" class="btn icon sm" data-act="d-unref" data-v="${r}" aria-label="Remove reference">${icon('x', 'sm')}</button></div>`; }).join('')}</div>` : `<p class="muted">No references yet.</p>`}
      ${err('refs')}
      <div class="fgrid"><div class="field"><label for="d-addref">Add from reference library</label><select class="select" id="d-addref" data-act-change="d-addref">${opt('', '', 'Select a reference')}${S.references.filter(r => !D.refs.includes(r.id)).map(r => opt(r.id, '', r.title + ' (' + r.kind + ')')).join('')}</select></div>
      <div class="field"><label for="d-newref">Or add a new reference</label><div class="row nowrap"><input class="input" id="d-newref" data-d="newRefTitle" value="${esc(D.newRefTitle)}" placeholder="Title and source"><button type="button" class="btn" data-act="d-newref">Add</button></div></div></div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>Review & expiry</h3></div><div class="panel-body fgrid">
      <div class="field"><label for="d-rev">Periodic review date</label><input class="input ${E.reviewDate ? 'invalid' : ''}" type="date" id="d-rev" data-d="reviewDate" value="${esc(D.reviewDate)}"><span class="hint">The owner is reminded to re-check the evidence on this date.</span>${err('reviewDate')}</div>
      <div class="field"><label for="d-exp">Expiry date</label><input class="input ${E.expiry ? 'invalid' : ''}" type="date" id="d-exp" data-d="expiry" value="${esc(D.expiry)}"><span class="hint">After this date the module cannot be used in new materials.</span>${err('expiry')}</div>
    </div></section>
    ${st === MSTEPS.length - 1 ? `${D.tried && Object.keys(E).length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${Object.keys(E).length} field${Object.keys(E).length > 1 ? 's need' : ' needs'} attention</b><p>Use Edit to go back to that step.</p></div></div>` : ''}
    ${sumGroup('module', 0, 'Module type', sumRow('Type', esc(D.type)))}
    ${sumGroup('module', 1, 'Content', sumRow('Name', esc(D.title)) + sumRow('Text', esc(D.body)) + (isNewVer || amending ? sumRow(amending ? 'Changes' : 'Reason', esc(D.reason)) : ''))}
    ${sumGroup('module', 2, 'Products & countries', sumRow('Products', esc(productsTxt(D.products))) + sumRow('Indications', esc(D.indications.join(', '))) + sumRow('Audience', esc(D.audience)) + sumRow('Countries', esc(marketsTxt(D.markets))) + sumRow('Channels', esc(D.channels.join(', '))))}
    ${sumGroup('module', 3, 'References & dates', sumRow('References', D.refs.map(r => esc(refById(r).title)).join('<br>')) + sumRow('Review date', esc(D.reviewDate)) + sumRow('Expiry', esc(D.expiry)))}
    <p class="muted" style="font-size:12px">${amending ? 'Saving keeps your changes. Resubmit from the module page to resume approval.' : 'Saving keeps the module as a draft. You submit it for MLR review from the module page.'}</p>` : ''}
    ${wizFoot('module', MSTEPS, D, m ? goAttr('module', m.id) : goAttr('modules'), m ? (isNewVer ? 'Create version ' + (latest(m).v + 1) : 'Save changes') : 'Save draft')}
  </div>
  <aside class="stack" style="position:sticky;top:84px">
    <section class="panel"><div class="panel-head"><h3>Preview</h3>${D.type ? `<span class="tag">${esc(D.type)}</span>` : ''}</div><div class="panel-body stack">${D.body ? `<p class="claim" style="font-size:${D.type === 'Headline' ? 22 : 15}px;line-height:1.5">${esc(D.body)}</p>` : '<p class="muted">Your content appears here as reviewers will see it.</p>'}
      <dl class="kv" style="grid-template-columns:96px 1fr;font-size:12.5px"><dt>Products</dt><dd>${esc(productsTxt(D.products)) || '—'}</dd><dt>Countries</dt><dd>${esc(marketsTxt(D.markets)) || '—'}</dd><dt>Audience</dt><dd>${esc(D.audience || '—')}</dd><dt>Channels</dt><dd>${esc(D.channels.join(', ') || '—')}</dd><dt>References</dt><dd>${D.refs.length}</dd></dl></div></section>
    ${D.type ? validationPanel(preview, 'Module', 'Validation check') : ''}
  </aside></form>`;
}
function validateDraft(D) {
  const e = {};
  if (!D.type) e.type = 'Choose a module type.';
  if (!D.title.trim()) e.title = 'Give the module a name.';
  if (D.body.trim().length < 8) e.body = 'Write the module content (at least a short sentence).';
  if (D.newVersion && D.reason.trim().length < 5) e.reason = 'Explain why this version is needed.';
  if (!D.products.length) e.products = 'Select at least one product.';
  if (!D.indications.length) e.indications = 'Select at least one indication.';
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
  const owns = isAdmin(u) || m.owner === u.id || (u.fn === 'Content' && can(u, 'edit')); const imp = impactedAssets(m); const issues = validationIssues(m, 'Module');
  let actions = '';
  if (owns && ['Draft', 'Awaiting Lead submission'].includes(st)) actions += goBtn('Edit', 'module-edit', m.id, '', 'edit') + btn(canSubmit(u) ? 'Submit for review' : 'Send to Content Team Lead', 'submit-open', 'primary', `data-id="${m.id}"`, 'send');
  if (owns && st === 'Amendment Requested') actions += goBtn('Amend', 'module-edit', m.id, '', 'edit') + btn('Resubmit — resume at ' + m.resume.fn + ' ' + levelName(m.resume.level), 'resubmit-open', 'primary', `data-kind="Module" data-id="${m.id}"`, 'send');
  if (owns && st === 'Rejected') actions += btn('Create new version', 'new-version', 'primary', `data-id="${m.id}"`, 'copy');
  if (m.review && canActOn(u, m)) actions += goBtn('Open review', 'review', m.id, 'primary', 'shieldcheck');
  if (owns && st === 'Approved' && !m.archived) actions += btn('Create new version', 'new-version', '', `data-id="${m.id}"`, 'copy');
  if (lv) actions += goBtn('Cover letter', 'cover', m.id, '', 'award', ` data-k="Module" data-v="${lv.v}"`);
  if (canCreateAsset(u) && lv && ['Approved', 'Active', 'Expiring'].includes(libraryStatus(m) || '')) actions += btn('Use in asset', 'asset-new', '', `data-module="${m.id}"`, 'layers');
  let banners = '';
  if (st === 'Amendment Requested') banners += `<div class="banner warn">${icon('undo')}<div class="txt"><b>Amendment requested by ${esc(user(m.resume.by).name)} · ${esc(m.resume.fn + ' ' + levelName(m.resume.level))}</b><p>“${esc(m.resume.note)}” After the owner amends and resubmits, approval <b>resumes at the ${esc(m.resume.fn)} ${esc(levelName(m.resume.level))} step</b>. Earlier approvals in this cycle are kept.</p></div>${owns ? goBtn('Amend', 'module-edit', m.id, 'sm') : ''}</div>`;
  if (st === 'Rejected') { const r = latest(m).cycles.slice(-1)[0].decisions.slice(-1)[0]; banners += `<div class="banner bad">${icon('x')}<div class="txt"><b>Rejected by ${esc(user(r.by).name)} · ${esc(r.fn + ' ' + levelName(r.level))}</b><p>“${esc(r.note)}” Create a new version to resubmit. The new version <b>restarts the full approval cycle</b> from the first step.</p></div>${owns ? btn('Create new version', 'new-version', 'sm', `data-id="${m.id}"`) : ''}</div>`; }
  if (st === 'Awaiting Lead submission') banners += `<div class="banner info">${icon('inbox')}<div class="txt"><b>Waiting for a Content Team Lead to submit</b><p>Content Team Members prepare drafts; a Content Team Lead submits them for MLR review.</p></div></div>`;
  if (m.review) { const cs = curStep(m); const as = assigneeFor(cs); banners += `<div class="banner pending">${icon('shieldcheck')}<div class="txt"><b>In review · ${esc(stepLabel(cs))}</b><p>Assigned to ${as.map(x => esc(x.name)).join(', ') || 'the ' + esc(cs.fn) + ' team'}. Step ${reviewPos(wfById(m.review.wf), m.review.step)} of ${reviewSteps(wfById(m.review.wf)).length} · cycle ${m.review.cycle} · waiting ${fmtDur(Date.now() - m.review.stepStartedAt)}.</p></div>${canActOn(u, m) ? goBtn('Open review', 'review', m.id, 'sm primary') : ''}</div>`; }
  if (lv && lv !== l && st !== 'Approved') banners += `<div class="banner">${icon('layers')}<div class="txt"><b>Version ${l.v} is ${esc(st.toLowerCase())} · version ${lv.v} is still live</b><p>Materials keep using v${lv.v} until v${l.v} is approved.</p></div></div>`;
  if (issues.length && ['Draft', 'Amendment Requested', 'Awaiting Lead submission'].includes(st)) banners += `<div class="banner bad">${icon('alert')}<div class="txt"><b>Validation issue${issues.length > 1 ? 's' : ''} detected</b><p>${issues.map(x => esc(x.issue)).join(' ')} Fix ${issues.length > 1 ? 'these' : 'this'} before submission.</p></div>${owns ? goBtn('Fix', 'module-edit', m.id, 'sm') : ''}</div>`;
  if (imp.length) banners += `<div class="banner warn">${icon('alert')}<div class="txt"><b>${imp.length} asset${imp.length > 1 ? 's use' : ' uses'} a previous version of this module</b><p>Version ${lv.v} is approved. Update each asset to the new version.</p></div><button class="btn sm" ${goAttr('module', m.id, ' data-tab="lifecycle"')}>Review impacted assets</button></div>`;
  if (ls === 'Expiring') banners += `<div class="banner warn">${icon('clock')}<div class="txt"><b>Expires in ${daysTo(m.expiry)} days (${fmtD(m.expiry)})</b><p>Create a new version or confirm the content is still valid before it expires.</p></div></div>`;
  if (ls === 'Review Required') banners += `<div class="banner bad">${icon('clock')}<div class="txt"><b>Expired on ${fmtD(m.expiry)} — review required</b><p>This module can no longer be added to new materials.</p></div></div>`;
  const tabs = [['overview', 'Overview'], ['approval', 'Approval'], ['versions', 'Version history', m.versions.length], ['lifecycle', 'Lifecycle & impact', imp.length || null], ['audit', 'Audit trail']];
  return pageHead(esc(m.title), `<span class="row" style="gap:8px">${chip(ls)}${vtag(l.v)}<span class="mono">${m.id}</span><span class="muted">·</span>${esc(m.type)}<span class="muted">·</span>Owner ${esc(user(m.owner).name)}</span>`, actions, [['Modules', 'modules'], [m.id]]) +
  (banners ? `<div class="stack" style="margin-bottom:16px">${banners}</div>` : '') +
  `<div class="tabs" role="tablist" style="margin-bottom:16px">${tabs.map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" role="tab" aria-selected="${tab === t[0]}" ${goAttr('module', m.id, ` data-tab="${t[0]}"`)}>${t[1]}${t[2] ? `<span class="n">${t[2]}</span>` : ''}</button>`).join('')}</div>` +
  (tab === 'overview' ? viewModuleOverview(m) : tab === 'approval' ? viewApprovalTab(m, 'Module') : tab === 'versions' ? viewVersions(m, 'Module') : tab === 'lifecycle' ? viewModuleLifecycle(m) : auditTable(S.audit.filter(e => e.objId === m.id), true));
}
function refsList(ids) { return ids.length ? `<div class="stack" style="gap:8px">${ids.map((r, i) => { const R = refById(r); return `<div class="ref"><span class="n">${i + 1}</span><div><b>${esc(R.title)}</b><br><span class="muted">${esc(R.source)}</span></div></div>`; }).join('')}</div>` : '<p class="muted">No references.</p>'; }
function metaKV(m, v) {
  return `<dl class="kv"><dt>Type</dt><dd>${esc(m.type)}</dd><dt>Products</dt><dd>${tagList(m.products, 'p')}</dd><dt>Indications</dt><dd>${esc(m.indications.join(', '))}</dd><dt>Countries</dt><dd>${tagList(m.markets)} <span class="muted" style="font-size:12px">${esc(marketsTxt(m.markets))}</span></dd><dt>Audience</dt><dd>${esc(m.audience)}</dd><dt>Channels</dt><dd>${esc(m.channels.join(', '))}</dd><dt>Version</dt><dd>v${v.v} · ${esc(v.status)}</dd><dt>Review date</dt><dd>${fmtD(m.reviewDate)}</dd><dt>Expiry</dt><dd>${fmtD(m.expiry)}</dd><dt>Owner</dt><dd>${esc(user(m.owner).name)}</dd>${live(m) ? `<dt>Approved</dt><dd>v${live(m).v} · ${fmtD(live(m).approvedAt)} · ${esc(user(live(m).approvedBy).name)}</dd>` : ''}</dl>`;
}
function viewModuleOverview(m) {
  const l = latest(m);
  return `<div class="grid cols-main"><div class="stack"><section class="panel sheet-card"><div class="sheet-strip"><span class="mono">${m.id} · v${l.v}</span><span>${esc(m.type)}</span><span>${esc(productsTxt(m.products))}</span><span class="grow"></span>${chip(lifeStatus(m))}</div>
    <div class="sheet-body"><p class="claim ${m.type === 'Headline' ? 'is-headline' : ''}">${esc(l.body)}</p>
    <div class="footnotes"><span class="fn-title">References</span>${l.refs.length ? `<ol>${l.refs.map(r => { const R = refById(r); return `<li><b>${esc(R.title)}</b> <span>${esc(R.source)}</span></li>`; }).join('')}</ol>` : '<p class="muted">No references attached.</p>'}</div></div></section>
    ${validationPanel(m, 'Module')}</div>
  <section class="panel"><div class="panel-head"><h3>Details</h3></div><div class="panel-body">${metaKV(m, l)}</div></section></div>`;
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
function decisionsList(decs) {
  if (!decs || !decs.length) return '<p class="muted">No decisions recorded yet.</p>';
  return `<div class="stack" style="gap:10px">${decs.map(c => { const x = user(c.by); const who = c.fn === 'Owner' || c.req === 'owner' ? 'Material Owner' : c.fn === 'Email' ? 'Email notification' : c.fn + ' ' + levelName(c.level);
    return `<div class="comment"><div class="who">${avatar(x, 'sm')}<b>${esc(x.name)}</b><span class="muted" style="font-size:12px">${esc(who)} · ${fmtDT(c.at)}${c.startedAt ? ' · ' + fmtDur(c.at - c.startedAt) + ' at step' : ''}</span></div><div style="margin-bottom:4px">${chip(c.decision)}${c.admin ? ' <span class="tag">Recorded by Administrator</span>' : ''}</div>${c.note ? `<p style="font-size:13.5px">${esc(c.note)}</p>` : ''}</div>`; }).join('')}</div>`;
}
function viewApprovalTab(obj, kind) {
  const v = latest(obj); const cyc = obj.review || obj.resume ? curCycle(obj) : v.cycles.slice(-1)[0];
  return `<div class="grid cols-2"><section class="panel"><div class="panel-head"><h3>Approval workflow</h3><span class="muted" style="font-size:12.5px">${cyc ? esc(wfById(cyc.wf).name) + ' · cycle ' + cyc.n : 'Not submitted'}</span></div><div class="panel-body">${!cyc ? '<p class="muted" style="margin-bottom:14px">Not submitted yet. This is the route it will take.</p>' : ''}${wfProgress(obj)}</div></section>
  <section class="panel"><div class="panel-head"><h3>Decisions · v${v.v}</h3>${cyc && cyc.amendments ? `<span class="chip warn plain">${cyc.amendments} amendment${cyc.amendments > 1 ? 's' : ''}</span>` : ''}</div><div class="panel-body">${decisionsList(cyc ? cyc.decisions : [])}</div></section></div>`;
}
/* Version history */
function viewVersions(obj, kind) {
  return `<section class="panel table-wrap"><table class="tbl list-tbl"><thead><tr><th>Version</th><th>Created</th><th>Reason for change</th><th>Status</th><th>Cycles</th><th>Approvers</th><th>Approved</th><th>Review date</th><th style="text-align:right">Actions</th></tr></thead><tbody>${[...obj.versions].reverse().map(v => { const apr = uniq(v.cycles.flatMap(c => c.decisions.filter(x => x.decision === 'Approved').map(x => user(x.by).name)));
    return `<tr class="click" data-act="version-open" data-kind="${kind}" data-id="${obj.id}" data-v="${v.v}" tabindex="0"><td>${vtag(v.v)}</td><td class="nw">${fmtD(v.createdAt)}<br><span class="muted" style="font-size:12px">${esc(user(v.createdBy).name)}</span></td><td style="max-width:280px;font-size:12.5px">${esc(v.reason || '—')}</td><td>${chip(v.status)}</td><td class="num">${v.cycles.length}${v.cycles.some(c => c.amendments) ? ` <span class="muted" style="font-size:11.5px">· ${v.cycles.reduce((s, c) => s + (c.amendments || 0), 0)} amend.</span>` : ''}</td><td style="font-size:12.5px">${esc(apr.join(', ') || '—')}</td><td class="nw">${v.approvedAt ? fmtD(v.approvedAt) : '—'}</td><td class="nw">${kind === 'Module' && v === latest(obj) ? fmtD(obj.reviewDate) : '—'}</td><td style="text-align:right"><div class="row nowrap" style="justify-content:flex-end;gap:6px"><button class="btn icon sm" data-act="version-open" data-kind="${kind}" data-id="${obj.id}" data-v="${v.v}" title="Approval history" aria-label="Approval history of v${v.v}">${icon('history', 'sm')}</button>${v.approvedAt ? `<button class="btn icon sm" ${goAttr('cover', obj.id, ` data-k="${kind}" data-v="${v.v}"`)} title="Cover letter" aria-label="Cover letter for v${v.v}">${icon('award', 'sm')}</button>` : ''}</div></td></tr>`; }).join('')}</tbody></table></section>`;
}
function versionModalBody(obj, kind, v) {
  return `<dl class="kv" style="grid-template-columns:120px 1fr;margin-bottom:12px"><dt>Created</dt><dd>${fmtDT(v.createdAt)} · ${esc(user(v.createdBy).name)}</dd><dt>Reason</dt><dd>${esc(v.reason || '—')}</dd><dt>Status</dt><dd>${chip(v.status)}</dd>${v.approvedAt ? `<dt>Approved</dt><dd>${fmtDT(v.approvedAt)} · ${esc(user(v.approvedBy).name)}</dd>` : ''}</dl>
  ${kind === 'Module' ? `<div class="comment" style="margin-bottom:12px"><p style="font-size:13.5px">${esc(v.body)}</p></div>` : ''}
  ${v.cycles.length ? v.cycles.map(c => `<div class="cycle"><div class="row" style="gap:8px;margin-bottom:8px"><b>Cycle ${c.n}</b>${chip(c.outcome)}<span class="muted" style="font-size:12px">${esc((wfById(c.wf) || {}).name || c.wf)} · ${fmtD(c.start)}${c.end ? ' → ' + fmtD(c.end) + ' · ' + fmtDur(c.end - c.start) : ''}${c.amendments ? ' · ' + c.amendments + ' amendment' + (c.amendments > 1 ? 's' : '') : ''}</span></div>${decisionsList(c.decisions)}</div>`).join('') : '<p class="muted">Not submitted for review.</p>'}`;
}
const LIFE = ['Draft', 'In Review', 'Approved', 'Active', 'Expiring', 'Review Required', 'Superseded', 'Archived'];
function viewModuleLifecycle(m) {
  const ls = lifeStatus(m); const li = LIFE.indexOf(['Amendment Requested', 'Awaiting Lead submission', 'Rejected'].includes(ls) ? (ls === 'Amendment Requested' ? 'In Review' : 'Draft') : ls); const lv = live(m); const imp = impactedAssets(m);
  const users = S.assets.filter(a => a.blocks.some(b => b.moduleId === m.id));
  return `<div class="stack"><section class="panel"><div class="panel-head"><h3>Lifecycle</h3></div><div class="panel-body stack"><div class="life">${LIFE.map((s, i) => `<span class="life-st ${i === li ? 'on' : i < li ? 'past' : ''}">${i < li ? icon('check', 'sm') : ''}${s}</span>${i < LIFE.length - 1 ? `<span class="life-arrow">${icon('chevron', 'sm')}</span>` : ''}`).join('')}</div>
  <dl class="kv"><dt>Current version</dt><dd>v${latest(m).v} · ${esc(statusOf(m))}</dd><dt>Live version</dt><dd>${lv ? 'v' + lv.v + ' · approved ' + fmtD(lv.approvedAt) : 'None yet'}</dd><dt>Previous versions</dt><dd>${m.versions.filter(v => v !== latest(m)).map(v => 'v' + v.v + ' (' + v.status + ')').join(', ') || '—'}</dd><dt>Review date</dt><dd>${fmtD(m.reviewDate)}</dd><dt>Expiry</dt><dd>${fmtD(m.expiry)}${m.expiry ? ' · ' + (daysTo(m.expiry) >= 0 ? daysTo(m.expiry) + ' days left' : 'expired') : ''}</dd></dl></div></section>
  <section class="panel"><div class="panel-head"><h3>Materials using this module</h3><span class="chip plain">${users.length}</span>${imp.length ? `<span class="chip warn">${imp.length} on a previous version</span>` : ''}</div>${users.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Countries</th><th>Channel</th><th>Uses version</th><th>Asset status</th><th></th></tr></thead><tbody>${users.map(a => { const b = a.blocks.find(x => x.moduleId === m.id); const old = lv && b.v < lv.v; return `<tr class="click" ${goAttr('asset', a.id)}><td><div class="title">${esc(a.name)}</div><span class="mono muted">${a.id}</span></td><td>${tagList(a.markets)}</td><td>${esc(a.channel)}</td><td>${vtag(b.v)} ${old ? '<span class="chip warn">Outdated</span>' : '<span class="chip ok">Current</span>'}</td><td>${chip(statusOf(a))}</td><td>${old && canCreateAsset(me()) ? `<button class="btn sm" data-act="replace-version" data-asset="${a.id}" data-module="${m.id}">Update to v${lv.v}</button>` : `<button class="btn sm ghost" ${goAttr('asset', a.id)}>Open</button>`}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><p>Not used in any material yet.</p></div>'}</section></div>`;
}
function viewMissing(what) { return `<div class="empty"><h4>${what} not found</h4><p>It may have been removed or the link is out of date.</p><br>${goBtn('Go home', 'home', null, 'primary')}</div>`; }

/* ===== Approval Cover Letter ===== */
function viewCover() {
  const p = UI.route.p; const kind = p.k || 'Module'; const obj = objById(kind, p.id); if (!obj) return viewMissing(kind);
  const v = verOf(obj, +p.v) || live(obj) || latest(obj);
  if (!v.approvedAt) return pageHead('Approval Cover Letter', 'This version is not approved yet.', goBtn('Back', kind === 'Module' ? 'module' : 'asset', obj.id, ''), [[kind === 'Module' ? 'Modules' : 'Assets', kind === 'Module' ? 'modules' : 'assets'], [obj.id, kind === 'Module' ? 'module' : 'asset', obj.id], ['Cover letter']]);
  const cyc = v.cycles.filter(c => c.outcome === 'Approved').slice(-1)[0]; const wf = wfById(cyc.wf) || { name: cyc.wf };
  const steps = cyc.decisions.filter(x => ['Reviewed', 'Approved'].includes(x.decision));
  const amendments = cyc.decisions.filter(x => x.decision === 'Amendment requested');
  const ref = 'MLR-' + obj.id + '-V' + v.v;
  return pageHead('Approval Cover Letter', `${esc(nameOf(obj))} · v${v.v}`, goBtn(kind === 'Module' ? 'Open module' : 'Open asset', kind === 'Module' ? 'module' : 'asset', obj.id, '', 'arrow') + (kind === 'Module' ? goBtn('Version history', 'module', obj.id, '', 'history', ' data-tab="versions"') : ''), [[kind === 'Module' ? 'Modules' : 'Assets', kind === 'Module' ? 'modules' : 'assets'], [obj.id, kind === 'Module' ? 'module' : 'asset', obj.id], ['Cover letter v' + v.v]]) +
  `<article class="letter" aria-label="Approval cover letter">
    <header class="letter-head"><img src="${LOGO}" alt="SAJA"><div><span class="eyebrow">${esc(S.settings.orgName)} · Medical, Legal &amp; Regulatory</span><h2>Approval Cover Letter</h2></div><div class="letter-ref"><span class="mono">${ref}</span><span class="chip ok has-ico">${icon('check', 'sm')}Approved</span></div></header>
    <section class="letter-grid">
      ${[['Material name', esc(nameOf(obj))], ['Material ID', `<span class="mono">${obj.id}</span>`], ['Version', 'v' + v.v + (v.status === 'Superseded' ? ' <span class="chip dim">Superseded</span>' : '')], [kind === 'Module' ? 'Module type' : 'Material type', esc(obj.type)], ['Product(s)', esc(productsTxt(obj.products))], ['Country / countries', esc(marketsTxt(obj.markets))], ['Owner', esc(user(obj.owner).name)], ['Approval workflow', esc(wf.name)], ['Approval date', fmtDT(v.approvedAt)], ['Approval cycle', 'Cycle ' + cyc.n + ' of ' + v.cycles.length + ' · ' + fmtDur(cyc.end - cyc.start) + (amendments.length ? ' · ' + amendments.length + ' amendment' + (amendments.length > 1 ? 's' : '') : ' · no amendments')], ['Validity', kind === 'Module' ? 'Review by ' + fmtD(obj.reviewDate) + ' · expires ' + fmtD(obj.expiry) : 'Valid while all included modules remain approved'], ['Reason for this version', esc(v.reason || 'Initial version')]].map(([k, val]) => `<div><span>${k}</span><b>${val}</b></div>`).join('')}
    </section>
    ${kind === 'Module' ? `<section class="letter-content"><span class="eyebrow">Approved content</span><p>${esc(v.body)}</p>${v.refs.length ? `<ol>${v.refs.map(r => `<li>${esc(refById(r).title)} — ${esc(refById(r).source)}</li>`).join('')}</ol>` : ''}</section>` : `<section class="letter-content"><span class="eyebrow">Content</span>${(bl => `<p>${bl.length} blocks · ${bl.filter(b => b.kind === 'module').length} approved modules (${esc(uniq(bl.filter(b => b.kind === 'module').map(b => b.moduleId + ' v' + b.v)).join(', '))})${bl.some(b => b.kind === 'new') ? ' · ' + bl.filter(b => b.kind === 'new').length + ' new text block(s) approved in this material' : ''}</p>`)(v.blocks || obj.blocks)}</section>`}
    <section><span class="eyebrow">Approvers and decisions</span>
      <div class="table-wrap"><table class="tbl compact letter-tbl"><thead><tr><th>Step</th><th>Approver</th><th>Role</th><th>Decision</th><th>Date</th></tr></thead><tbody>${steps.map((x, i) => `<tr><td>${i + 1}. ${esc(x.fn)} ${x.req === 'approve' ? 'approval' : 'review'}</td><td><b>${esc(user(x.by).name)}</b></td><td>${esc(x.fn + ' ' + levelName(x.level))}${x.admin ? ' (Administrator)' : ''}</td><td>${chip(x.decision === 'Approved' ? 'Approved · e-signed' : 'Reviewed')}</td><td class="nw">${fmtDT(x.at)}</td></tr>`).join('')}</tbody></table></div>
      ${amendments.length ? `<p class="muted" style="font-size:12.5px;margin-top:8px">Amendments in this cycle: ${amendments.map(x => esc(x.fn + ' ' + levelName(x.level)) + ' on ' + fmtD(x.at) + ' — “' + esc(x.note) + '”').join('; ')}. Approval resumed at the requesting step after each resubmission.</p>` : ''}
    </section>
    <footer class="letter-foot"><span>Generated by SAJA MedLR on ${fmtDT(Date.now())}</span><span class="mono">${ref}</span></footer>
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
  if (isLead && hasMember) h += a('return', 'Return to Team Member', '', 'back');
  const nx = nextStepOf(obj);
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
  if (!m.review) return pageHead(esc(m.title), 'This module is not in review.', goBtn('Open module', 'module', m.id, 'primary'), [['Approvals', 'approvals'], [m.id]]) + `<div class="banner">${icon('inbox')}<div class="txt"><b>Current status: ${esc(lifeStatus(m))}</b><p>The review has been completed or moved on.</p></div></div>`;
  const mine = canActOn(u, m); const st = curStep(m); const cyc = curCycle(m);
  if (mine && !(m.review.startedBy)) { m.review.startedBy = u.id; log('Review started', 'Module', m, l.v, { note: stepLabel(st) }); save(); }
  const memberNotes = cyc.decisions.filter(c => c.fn === st.fn && c.level === 'Member');
  return pageHead(esc(m.title), `<span class="row" style="gap:8px">${chip('In Review')}${vtag(l.v)}<span class="mono">${m.id}</span></span>`, mine ? decisionButtons(m, 'Module') : '', [['Approvals', 'approvals'], [m.id, 'module', m.id], ['Review']]) +
  (mine ? adminNote(m) : `<div class="banner info" style="margin-bottom:14px">${icon('eye')}<div class="txt"><b>View only — this step is assigned to the ${esc(stepWho(st))}</b><p>You are signed in as ${esc(roleLabel(u))}.</p></div></div>`) +
  `<div class="stack" style="margin-bottom:16px">${authorityBanner(m)}</div>
  <div class="grid cols-main"><div class="stack">
    <section class="panel"><div class="panel-head"><h3>Module content</h3><span class="tag">${esc(m.type)}</span></div><div class="panel-body stack" style="gap:18px"><p class="claim">${esc(l.body)}</p>
      <div class="fgrid meta-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['Products', productsTxt(m.products)], ['Indications', m.indications.join(', ')], ['Audience', m.audience], ['Countries', marketsTxt(m.markets)], ['Channels', m.channels.join(', ')], ['Version', 'v' + l.v + (live(m) && live(m) !== l ? ' (replaces v' + live(m).v + ')' : '')]].map(([k, v]) => `<div><div class="section-title" style="font-size:10.5px">${k}</div><div style="font-weight:700;margin-top:2px">${esc(v)}</div></div>`).join('')}</div></div></section>
    <section class="panel"><div class="panel-head"><h3>References & evidence</h3><span class="chip plain">${l.refs.length}</span></div><div class="panel-body">${refsList(l.refs)}</div></section>
    ${live(m) && live(m) !== l ? `<section class="panel"><div class="panel-head"><h3>What changed from v${live(m).v}</h3></div><div class="panel-body stack"><p class="muted" style="font-size:12.5px">Reason: ${esc(l.reason || '—')}</p><div class="comment prev-ver"><div class="who"><span class="tag">v${live(m).v} · approved</span></div><p style="text-decoration:line-through;color:var(--ink-3)">${esc(live(m).body)}</p></div><div class="comment"><div class="who"><span class="tag">v${l.v} · in review</span></div><p>${esc(l.body)}</p></div></div></section>` : ''}
    ${mine ? `<section class="panel"><div class="panel-head"><h3>Add a comment</h3></div><div class="panel-body stack"><textarea class="textarea" id="rv-comment" placeholder="Comments are visible to the next reviewer and to the Material Owner." style="min-height:90px">${esc(UI.f.rvc || '')}</textarea><div class="row"><button class="btn" data-act="comment" data-kind="Module" data-id="${m.id}">${icon('send', 'sm')}Add comment</button></div></div></section>` : ''}
  </div>
  <div class="stack">
    ${validationPanel(m, 'Module')}
    ${st.level === 'Lead' && memberNotes.length ? `<section class="panel"><div class="panel-head"><h3>${esc(st.fn)} Team Member review</h3></div><div class="panel-body">${decisionsList(memberNotes)}</div></section>` : ''}
    <section class="panel"><div class="panel-head"><h3>Workflow progress</h3></div><div class="panel-body">${wfProgress(m)}</div></section>
    <section class="panel"><div class="panel-head"><h3>Decisions in this cycle</h3></div><div class="panel-body">${decisionsList(cyc.decisions)}</div></section>
  </div></div>`;
}

/* ===== Approvals ===== */
function viewApprovals() {
  const u = me(); const all = tasksFor(u); const tab = UI.route.p.tab || F('atab', 'review');
  const groups = [['review', 'Awaiting review', all.filter(t => t.kind === 'review')], ['amend', 'Amendments requested', all.filter(t => t.kind === 'amend')], ['submit', 'Awaiting submission', all.filter(t => t.kind === 'submit' || t.kind === 'draft')], ['rejected', 'Rejected', all.filter(t => t.kind === 'rejected')]];
  const list = (groups.find(g => g[0] === tab) || groups[0])[2];
  const q = F('apq').toLowerCase(); const fl = list.filter(t => (!q || (t.title + t.id).toLowerCase().includes(q)) && (!F('apfn') || (t.step && t.step.fn === F('apfn'))) && (!F('apk') || t.type === F('apk')));
  return pageHead('Approvals', isAdmin(u) ? 'Every item in the MLR process across the organisation. As Administrator you can act on any step.' : `Items that need action from you as ${esc(roleLabel(u))}.`) +
  `<div class="tabs" role="tablist" style="margin-bottom:14px">${groups.map(g => `<button class="tab ${tab === g[0] ? 'active' : ''}" role="tab" aria-selected="${tab === g[0]}" ${goAttr('approvals', null, ` data-tab="${g[0]}"`)}>${g[1]}<span class="n">${g[2].length}</span></button>`).join('')}</div>
  <div class="toolbar">${searchBox('apq', F('apq'), 'Search title or ID')}${sel('apk', F('apk'), ['Module', 'Asset'], 'Modules and assets')}${tab === 'review' ? sel('apfn', F('apfn'), REVIEW_FUNCS, 'All review steps') : ''}<span class="muted" style="margin-left:auto">${fl.length} items</span></div>
  ${tab === 'amend' ? `<div class="banner warn" style="margin-bottom:14px">${icon('undo')}<div class="txt"><b>Amend & resubmit</b><p>Return to Material Owner and resume approval from the current review step after changes are completed. Earlier approvals in the cycle are kept.</p></div></div>` : tab === 'rejected' ? `<div class="banner bad" style="margin-bottom:14px">${icon('x')}<div class="txt"><b>Rejected</b><p>Returned to the Material Owner. A new version restarts the full approval cycle from the first step.</p></div></div>` : ''}
  <section class="panel table-wrap">${fl.length ? `<table class="tbl list-tbl"><thead><tr><th>Item</th><th>Products</th><th>Countries</th><th>${tab === 'review' ? 'Current step' : 'Status'}</th><th>${tab === 'review' ? 'Waiting' : 'Since'}</th><th>Owner</th></tr></thead><tbody>${fl.map(t => { const o = t.obj; const target = t.kind === 'review' ? (t.type === 'Asset' ? 'asset-review' : 'review') : (t.type === 'Asset' ? 'asset' : 'module');
    return `<tr class="click" ${goAttr(target, o.id)} tabindex="0"><td><div class="cell-title">${t.type === 'Asset' ? `<span class="type-ico">${icon('layers', 'sm')}</span>` : typeIco(o.type)}<div><div class="title">${esc(t.title)}</div><span class="mono muted">${o.id} · v${latest(o).v} · ${t.type}</span></div></div></td><td>${tagList(o.products, 'p')}</td><td>${tagList(o.markets)}</td><td>${t.kind === 'review' ? `<div class="row nowrap" style="gap:6px">${fnBadge(t.step.fn, 'sm')}${esc(t.step.fn)} ${lvl(t.step.level)}</div>` : t.kind === 'amend' ? `<span style="font-size:12.5px">${chip('Amendment Requested')}<br><span class="muted">Resumes at ${esc(o.resume.fn + ' ' + levelName(o.resume.level))}</span></span>` : chip(statusOf(o))}</td><td class="nw ${t.kind === 'review' && Date.now() - t.since > 3 * DAY ? 'late' : ''}">${fmtDur(Date.now() - t.since)}</td><td>${userCell(o.owner)}</td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>Nothing here</h4><p>${tab === 'review' ? 'No items are waiting for review.' : 'No items in this state.'}</p></div>`}</section>`;
}

/* ===== Approved Library ===== */
function viewLibrary() {
  const tab = UI.route.p.tab || F('ltab', 'modules'); const q = F('lq').toLowerCase();
  const apOk = t => !F('lapp') || (t && t > Date.now() - +F('lapp') * DAY);
  const expOk = (exp, rev) => { const f = F('lexp'); if (!f) return true; const de = exp ? daysTo(exp) : 9999, dr = rev ? daysTo(rev) : 9999; return f === '30' ? de <= 30 : f === '90' ? de <= 90 : f === 'rev90' ? dr <= 90 : de > 90; };
  const verOk = v => !F('lver') || (F('lver') === '1' ? v === 1 : v >= 2);
  const showExp = S.settings.libraryShowExpiring;
  let body = '', count = 0;
  if (tab === 'modules') {
    const rows = S.modules.filter(m => { const ls = libraryStatus(m); if (!ls || ls === 'Review Required' || (!showExp && ls === 'Expiring')) return false; const lv = live(m);
      return (!q || (m.title + m.id + lv.body).toLowerCase().includes(q)) && (!F('lprod') || m.products.includes(F('lprod'))) && (!F('lmkt') || m.markets.includes(F('lmkt'))) && (!F('ltype') || m.type === F('ltype')) && (!F('laud') || m.audience === F('laud')) && (!F('lch') || m.channels.includes(F('lch'))) && (!F('lstat') || ls === F('lstat')) && apOk(lv.approvedAt) && expOk(m.expiry, m.reviewDate) && verOk(lv.v); }).sort((a, b) => live(b).approvedAt - live(a).approvedAt);
    count = rows.length;
    body = rows.length ? `<table class="tbl lib-tbl"><thead><tr><th>Module</th><th>Products</th><th>Approved for</th><th>Version</th><th>Status</th><th>Approved</th><th>Valid until</th><th style="text-align:right"></th></tr></thead><tbody>${rows.map(m => { const lv = live(m); const ls = libraryStatus(m); const dl = daysTo(m.expiry);
      return `<tr class="click" ${goAttr('module', m.id)} tabindex="0"><td><div class="cell-title">${typeIco(m.type)}<div><div class="title">${esc(m.title)}</div><span class="mono muted">${m.id} · ${esc(m.type)}</span></div></div></td><td>${tagList(m.products, 'p')}</td><td><div class="usable"><span>${tagList(m.markets)}</span><span class="muted">${esc(m.audience)} · ${esc(m.channels.join(', '))}</span></div></td><td>${vtag(lv.v)}</td><td>${chip(ls)}</td><td class="nw">${fmtD(lv.approvedAt)}</td><td><div class="valid"><b class="num">${fmtD(m.expiry)}</b><span class="${dl <= S.settings.expiryWarnDays ? 'soon' : 'muted'}">${dl > 60 ? Math.round(dl / 30) + ' months left' : dl + ' days left'}</span></div></td><td style="text-align:right"><button class="btn icon sm" ${goAttr('cover', m.id, ` data-k="Module" data-v="${lv.v}"`)} title="Cover letter" aria-label="Cover letter for ${esc(m.id)}">${icon('award', 'sm')}</button></td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>No approved modules match</h4><p>Adjust the filters, or approve more content through the MLR workflow.</p></div>`;
  } else {
    const rows = S.assets.filter(a => { const lv = live(a); if (!lv) return false; const okMods = a.blocks.every(b => b.kind === 'new' || (modById(b.moduleId) && !(modById(b.moduleId).expiry < Date.now())));
      return okMods && (!q || (a.name + a.id).toLowerCase().includes(q)) && (!F('lprod') || a.products.includes(F('lprod'))) && (!F('lmkt') || a.markets.includes(F('lmkt'))) && (!F('lmat') || a.type === F('lmat')) && (!F('laud') || a.audience === F('laud')) && (!F('lch') || a.channel === F('lch')) && apOk(lv.approvedAt) && verOk(lv.v); }).sort((a, b) => live(b).approvedAt - live(a).approvedAt);
    count = rows.length;
    body = rows.length ? `<table class="tbl lib-tbl"><thead><tr><th>Material</th><th>Products</th><th>Countries</th><th>Channel</th><th>Version</th><th>Approved</th><th style="text-align:right"></th></tr></thead><tbody>${rows.map(a => { const lv = live(a); return `<tr class="click" ${goAttr('asset', a.id)} tabindex="0"><td><div class="cell-title"><span class="type-ico">${icon('layers', 'sm')}</span><div><div class="title">${esc(a.name)}</div><span class="mono muted">${a.id} · ${esc(a.type)}</span></div></div></td><td>${tagList(a.products, 'p')}</td><td>${tagList(a.markets)}</td><td>${esc(a.channel)}<br><span class="muted" style="font-size:12px">${esc(a.audience)}</span></td><td>${vtag(lv.v)}</td><td class="nw">${fmtD(lv.approvedAt)}</td><td style="text-align:right"><button class="btn icon sm" ${goAttr('cover', a.id, ` data-k="Asset" data-v="${lv.v}"`)} title="Cover letter" aria-label="Cover letter for ${esc(a.id)}">${icon('award', 'sm')}</button></td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>No approved materials match</h4><p>Adjust the filters.</p></div>`;
  }
  const keys = ['lq', 'lprod', 'lmkt', 'ltype', 'lmat', 'laud', 'lch', 'lapp', 'lver', 'lexp', 'lstat'];
  return pageHead('Approved Library', 'Approved, currently valid content that every authorised SAJA user can find and reuse. Drafts, content in review and expired content are not shown here.') +
  `<div class="tabs" role="tablist" style="margin-bottom:14px">${[['modules', 'Modules'], ['materials', 'Materials']].map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" role="tab" aria-selected="${tab === t[0]}" ${goAttr('library', null, ` data-tab="${t[0]}"`)}>${t[1]}</button>`).join('')}</div>
  <div class="toolbar">${searchBox('lq', F('lq'), tab === 'modules' ? 'Search approved modules' : 'Search approved materials')}${sel('lprod', F('lprod'), S.products.map(p => [p.id, p.name]), 'All products')}${sel('lmkt', F('lmkt'), S.markets.map(m => [m.id, m.name]), 'All countries')}${tab === 'modules' ? sel('ltype', F('ltype'), S.moduleTypes, 'All module types') : sel('lmat', F('lmat'), S.materialTypes.map(t => t.name), 'All material types')}${sel('laud', F('laud'), S.audiences, 'All audiences')}${sel('lch', F('lch'), S.channels, 'All channels')}${sel('lapp', F('lapp'), [['30', 'Approved in last 30 days'], ['90', 'Approved in last 90 days'], ['365', 'Approved in last 12 months']], 'Any approval date')}${sel('lver', F('lver'), [['1', 'v1 only'], ['2', 'v2 and later']], 'Any version')}${tab === 'modules' ? sel('lexp', F('lexp'), [['30', 'Expires within 30 days'], ['90', 'Expires within 90 days'], ['rev90', 'Review due within 90 days'], ['later', 'Valid for over 90 days']], 'Any expiry / review') + sel('lstat', F('lstat'), ['Approved', 'Active', 'Expiring'], 'All valid statuses') : ''}${clearBtn(keys)}<span class="muted" style="margin-left:auto">${count} ${tab === 'modules' ? 'modules' : 'materials'}</span></div>
  <section class="panel table-wrap">${body}</section>`;
}
