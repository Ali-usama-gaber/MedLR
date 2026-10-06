/* ---------- Views ---------- */
const LOGO = '__LOGO__';
const goAttr = (name, id, extra = '') => `data-go="${name}"${id ? ` data-id="${esc(id)}"` : ''}${extra}`;
const crumbs = list => `<nav class="crumbs" aria-label="Breadcrumb">${list.map((c, i) => i === list.length - 1 ? `<span class="cur">${esc(c[0])}</span>` : `<button ${goAttr(c[1], c[2])}>${esc(c[0])}</button>${icon('chevron', 'sm')}`).join('')}</nav>`;
const pageHead = (title, sub, actions = '', cr = null) => `<header class="page-head"><div class="titles">${cr ? crumbs(cr) : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</header>`;
const btn = (label, act, cls = '', attrs = '', ic = '') => `<button class="btn ${cls}" data-act="${act}" ${attrs}>${ic ? icon(ic, 'sm') : ''}${esc(label)}</button>`;
const goBtn = (label, name, id, cls = '', ic = '', extra = '') => `<button class="btn ${cls}" ${goAttr(name, id, extra)}>${ic ? icon(ic, 'sm') : ''}${esc(label)}</button>`;
const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(label == null ? v : label)}</option>`;
const sel = (key, cur, options, allLabel) => `<select aria-label="${esc(allLabel)}" data-filter="${key}">${opt('', cur, allLabel)}${options.map(o => Array.isArray(o) ? opt(o[0], cur, o[1]) : opt(o, cur)).join('')}</select>`;
const searchBox = (key, cur, ph) => `<div class="field-inline">${icon('search', 'sm')}<input type="search" id="f-${key}" data-filter="${key}" value="${esc(cur || '')}" placeholder="${esc(ph)}" aria-label="${esc(ph)}"></div>`;
const F = (k, def = '') => UI.f[k] == null ? def : UI.f[k];
const marketsTxt = ids => ids.map(i => market(i).name).join(', ');
// Clickable status strip shown above a list: [label, count, tone, sub, filterKey, filterValue]
function statStrip(items) {
  return `<div class="kpis strip">${items.map(it => { const on = it[4] && F(it[4]) === it[5]; return `<button class="kpi ${on ? 'on' : ''}" ${it[4] ? `data-act="toggle-f" data-k="${it[4]}" data-v="${esc(it[5])}" aria-pressed="${on}"` : ''}><span class="k-label">${it[2] ? `<span class="k-dot ${it[2]}"></span>` : ''}${it[0]}</span><b>${it[1]}</b>${it[3] ? `<span class="k-sub">${it[3]}</span>` : ''}</button>`; }).join('')}</div>`;
}
const userCell = id => { const u = user(id); return `<div class="row nowrap user-cell">${avatar(u, 'sm')}<span>${esc(u.name)}</span></div>`; };
const vtag = v => `<span class="tag">v${v}</span>`;

/* ===== Shell ===== */
const NAV = [
  ['WORKSPACE'], ['home', 'Home', 'home'], ['tasks', 'My Tasks', 'inbox', 'tasks'], ['modules', 'Modules', 'grid'], ['library', 'Approved Library', 'book'], ['assets', 'Assets', 'layers'],
  ['GOVERNANCE'], ['lifecycle', 'Lifecycle', 'clock'], ['audit', 'Audit Trail', 'history'], ['reports', 'Reports', 'chart'],
  ['ADMINISTRATION', 'admin'], ['users', 'Users', 'users', null, 'admin'], ['teams', 'Teams', 'team', null, 'admin'], ['roles', 'Roles', 'key', null, 'admin'], ['products', 'Products', 'pill', null, 'admin'], ['markets', 'Countries & Markets', 'globe', null, 'admin'], ['materials', 'Material Types', 'file', null, 'admin'], ['workflows', 'Workflows', 'workflow', null, 'admin']
];
const NAV_OF = { module: 'modules', 'module-new': 'modules', 'module-edit': 'modules', review: 'tasks', 'asset-review': 'tasks', assemble: 'assets', asset: 'assets', user: 'users', 'user-new': 'users', 'user-edit': 'users', workflow: 'workflows', 'workflow-new': 'workflows' };

function viewShell(inner) {
  const u = me(); const active = NAV_OF[UI.route.name] || UI.route.name; const nTasks = tasksFor(u).length;
  const nav = NAV.map(n => {
    if (n.length <= 2) { if (n[1] === 'admin' && !isAdmin(u)) return ''; return `<div class="nav-label">${n[0]}</div>`; }
    if (n[4] === 'admin' && !isAdmin(u)) return '';
    return `<button class="nav-item ${active === n[0] ? 'active' : ''}" title="${n[1]}" ${goAttr(n[0])} ${active === n[0] ? 'aria-current="page"' : ''}>${icon(n[2])}<span>${n[1]}</span>${n[3] && nTasks ? `<span class="count">${nTasks}</span>` : ''}</button>`;
  }).join('');
  return `<div class="shell">
  <aside class="side" aria-label="Main navigation">
    <button class="brand" ${goAttr('home')} aria-label="SAJA MedLR home"><img src="${LOGO}" alt="SAJA"></button>
    ${nav}
    <div class="spacer"></div>
    <div class="side-user">${avatar(u)}<div style="min-width:0"><b style="font-size:13px;display:block">${esc(u.name)}</b><span class="muted" style="font-size:11.5px">${esc(roleLabel(u))}</span></div></div>
  </aside>
  <div class="main">
    ${viewTopbar(u)}
    <main class="content" id="content">${inner}</main>
  </div>
  </div>`;
}

function viewTopbar(u) {
  const notifs = notificationsFor(u); const unread = notifs.some(n => n.ts > (S.notifSeen || 0));
  return `<header class="topbar">
    <div class="search" id="gsearch">${icon('search', 'sm')}<input id="global-search" type="search" placeholder="Search modules, assets, people…" value="${esc(UI.search)}" aria-label="Search" autocomplete="off">${UI.search ? viewSearchPop() : ''}</div>
    <div class="grow"></div>
    <div class="rel"><button class="btn icon" data-act="pop" data-pop="bell" aria-label="Notifications">${icon('bell')}${unread ? '<span class="bell-dot"></span>' : ''}</button>${UI.pop === 'bell' ? viewNotifPop(notifs) : ''}</div>
    <div class="rel"><button class="userbtn" data-act="pop" data-pop="user" aria-label="Switch demo user">${avatar(u)}<span class="meta"><b>${esc(u.name)}</b><span>${esc(roleLabel(u))}</span></span>${icon('down', 'sm')}</button>${UI.pop === 'user' ? viewUserPop(u) : ''}</div>
  </header>`;
}
function viewUserPop(u) {
  const groups = USER_TYPES.map(t => [t, S.users.filter(x => x.type === t && x.status === 'Active')]);
  return `<div class="pop" role="menu" style="width:330px"><div class="grp">Demo users — view the product as</div>${groups.map(([t, list]) => list.map(x => `<button class="pop-item ${x.id === u.id ? 'on' : ''}" data-act="persona" data-id="${x.id}" role="menuitem">${avatar(x, 'sm')}<span style="flex:1;min-width:0"><b style="font-size:13px;display:block">${esc(x.name)}</b><span class="muted" style="font-size:11.5px">${esc(x.type)}</span></span>${sen(x.seniority)}</button>`).join('')).join('')}
  <div class="grp">Session</div><button class="pop-item" data-act="reset" role="menuitem">${icon('refresh', 'sm')}Reset demo data</button><button class="pop-item" data-act="logout" role="menuitem">${icon('logout', 'sm')}Sign out</button></div>`;
}
function notificationsFor(u) {
  const mine = new Set();
  S.modules.forEach(m => { if (m.owner === u.id || (m.review && canActOn(u, m))) mine.add(m.id); });
  S.assets.forEach(a => { if (a.owner === u.id || (a.review && canActOn(u, a))) mine.add(a.id); });
  return S.audit.filter(e => ((e.toIds || []).includes(u.id)) || (mine.has(e.objId) && e.user !== u.id && !e.auto)).sort((a, b) => b.ts - a.ts).slice(0, 8);
}
function viewNotifPop(list) {
  return `<div class="pop" role="menu"><div class="grp">Notifications</div>${list.length ? list.map(e => { const x = user(e.user); return `<button class="pop-item" ${goAttr(e.objType === 'Asset' ? 'asset' : 'module', e.objId)} role="menuitem">${avatar(x, 'sm')}<span style="flex:1;min-width:0;font-size:12.5px"><b>${esc(x.name)}</b> ${sen(x.seniority)}<br>${esc(e.action)} · ${esc(e.objId)}<br><span class="muted">${ago(e.ts)}</span></span></button>`; }).join('') : '<div class="empty" style="padding:20px">No notifications yet.</div>'}</div>`;
}
function viewSearchPop() {
  const q = UI.search.toLowerCase();
  const mods = S.modules.filter(m => (m.title + ' ' + m.id + ' ' + latest(m).body).toLowerCase().includes(q)).slice(0, 6);
  const as = S.assets.filter(a => (a.name + ' ' + a.id).toLowerCase().includes(q)).slice(0, 4);
  const us = S.users.filter(x => (x.name + ' ' + x.type).toLowerCase().includes(q)).slice(0, 4);
  if (!mods.length && !as.length && !us.length) return `<div class="search-pop"><div class="empty" style="padding:18px">No results for “${esc(UI.search)}”.</div></div>`;
  return `<div class="search-pop">${mods.length ? `<div class="grp">Modules</div>${mods.map(m => `<button ${goAttr('module', m.id)}>${typeIco(m.type)}<span style="flex:1;min-width:0"><b style="font-size:13px">${esc(m.title)}</b><br><span class="mono muted">${m.id} · v${latest(m).v}</span></span>${chip(lifeStatus(m))}</button>`).join('')}` : ''}
  ${as.length ? `<div class="grp">Assets</div>${as.map(a => `<button ${goAttr('asset', a.id)}>${typeIco('Reference')}<span style="flex:1"><b style="font-size:13px">${esc(a.name)}</b><br><span class="mono muted">${a.id}</span></span>${chip(a.status)}</button>`).join('')}` : ''}
  ${us.length ? `<div class="grp">People</div>${us.map(x => `<button ${isAdmin(me()) ? goAttr('user', x.id) : `data-act="persona" data-id="${x.id}"`}>${avatar(x, 'sm')}<span style="flex:1"><b style="font-size:13px">${esc(x.name)}</b><br><span class="muted" style="font-size:12px">${esc(x.type)}</span></span>${sen(x.seniority)}</button>`).join('')}` : ''}</div>`;
}

/* ===== Auth ===== */
function viewLogin() {
  const err = UI.f.loginErr;
  const steps = [['Medical', 'Junior', 'Ahmed Ali'], ['Medical', 'Senior', 'Sara Ahmed'], ['Legal', 'Senior', 'Rania Haddad'], ['Regulatory', 'Senior', 'Layla Nasser']];
  return `<div class="login-page"><div class="login">
  <section class="login-brand">
    <img class="login-logo" src="${LOGO}" alt="SAJA">
    <div class="login-hero"><span class="eyebrow">MedLR · Medical, Legal &amp; Regulatory review</span><h1>Create once.<br><em>Approve once.</em><br>Reuse safely.</h1>
    <p class="lede">Each claim is reviewed once by Medical, Legal and Regulatory, then reused in every asset where it is approved for the market and channel.</p></div>
    <figure class="doc" aria-hidden="true">
      <div class="doc-sheet">
        <div class="doc-top"><span class="mono">MOD-A-014 · v2</span><span class="doc-tag">Clinical claim · HCP</span></div>
        <p class="doc-claim">Product A reduced heart-failure hospitalisation by 21% versus standard care.<sup>1</sup></p>
        <p class="doc-ref"><sup>1</sup> ALPHA-HF study, primary results. Demo J Cardiol 2025;12:101–112.</p>
        <ul class="doc-sign">${[['Medical', 'Sara Ahmed', '12 Jun'], ['Legal', 'Rania Haddad', '14 Jun'], ['Regulatory', 'Layla Nasser', '16 Jun']].map((x, i) => `<li style="--d:${0.55 + i * 0.28}s"><span class="tick">${icon('check', 'sm')}</span>${fnBadge(x[0], 'sm')}<b>${x[0]}</b><span>${x[1]} · ${x[2]}</span></li>`).join('')}</ul>
      </div>
      <div class="stamp"><span class="s-top">Approved</span><b>MLR</b><span class="s-bot mono">EXP 06/2027</span></div>
    </figure>
  </section>
  <section class="login-form">
    ${UI.route.name === 'forgot' ? viewForgot() : `<form class="login-card" data-form="login" novalidate>
      <div class="login-title"><h2>Sign in</h2><p class="ink2">Welcome back. Use your SAJA work email.</p></div>
      ${err ? `<div class="banner bad" role="alert">${icon('alert')}<div class="txt"><b>${esc(err)}</b></div></div>` : ''}
      <div class="field"><label for="login-email">Work email</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" value="${esc(F('loginEmail', 'omar.khalil@saja-demo.com'))}" required></div>
      <div class="field"><div class="row between"><label for="login-pass">Password</label><button type="button" class="btn ghost sm" ${goAttr('forgot')}>Forgot password?</button></div><input class="input" id="login-pass" name="password" type="password" autocomplete="current-password" value="demo-password" required></div>
      <button class="btn primary" type="submit" style="height:46px">Sign in</button>
      <div class="login-div"><span>or try a demo account</span></div>
      <div class="demo-accts">${['u-omar', 'u-ahmed', 'u-sara', 'u-karim', 'u-ali'].map(id => { const x = user(id); return `<button type="button" data-act="login-as" data-id="${id}">${avatar(x, 'sm')}<span class="da-txt"><b>${esc(x.name)}</b><span>${esc(x.type)}</span></span>${sen(x.seniority)}${icon('chevron', 'sm')}</button>`; }).join('')}</div>
      <p class="muted" style="font-size:12px">Any password works in the prototype. Switch user any time from the top-right menu.</p>
    </form>`}
  </section></div><p class="login-legal">© SAJA Pharma · MedLR prototype for client review · Fictional data</p></div>`;
}
function viewForgot() {
  if (UI.f.resetSent) return `<div class="login-card"><div class="m-ico">${icon('mail')}</div><h2>Check your email</h2><p class="ink2">If an account exists for <b>${esc(UI.f.resetSent)}</b>, we have sent a link to reset your password. The link expires in 30 minutes.</p><button class="btn primary" ${goAttr('login')} style="height:44px">Back to sign in</button></div>`;
  return `<form class="login-card" data-form="forgot" novalidate><button type="button" class="btn ghost sm" ${goAttr('login')} style="justify-self:start">${icon('back', 'sm')}Back to sign in</button><div class="stack" style="gap:6px"><h2>Reset your password</h2><p class="ink2">Enter your work email and we will send you a reset link.</p></div>
  ${UI.f.forgotErr ? `<div class="field"><span class="err">${esc(UI.f.forgotErr)}</span></div>` : ''}
  <div class="field"><label for="forgot-email">Work email</label><input class="input" id="forgot-email" name="email" type="email" placeholder="name@saja-demo.com" required></div><button class="btn primary" type="submit" style="height:44px">Send reset link</button></form>`;
}

/* ===== Home ===== */
function viewHome() {
  const u = me(); const tasks = tasksFor(u); const a = authority(u.type, u.seniority); const first = u.name.split(' ')[0];
  let quick = [];
  if (u.type === 'Content Owner') quick = [['Create a module', 'One claim, safety statement or headline', 'plus', 'module-new'], ['My tasks', tasks.length + ' waiting on you', 'inbox', 'tasks'], ['Approved library', 'Reuse approved modules', 'book', 'library'], ['Lifecycle', 'Expiring content and versions', 'clock', 'lifecycle']];
  else if (FUNCTION_OF[u.type]) quick = [[tasks.length ? 'Open next review' : 'My tasks', tasks.length ? esc(tasks[0].title) : 'Nothing waiting on you', 'shieldcheck', tasks.length ? (tasks[0].type === 'Asset' ? 'asset-review' : 'review') : 'tasks', tasks.length ? tasks[0].id : null], ['My tasks', tasks.length + ' assigned to you', 'inbox', 'tasks'], ['Approved library', 'Search approved modules', 'book', 'library'], ['Audit trail', 'Every decision, with seniority', 'history', 'audit']];
  else if (u.type === 'Marketing User') quick = [['Create an asset', 'Assemble from approved modules', 'plus', 'asset-new'], ['Approved library', 'Find eligible modules', 'book', 'library'], ['Assets', S.assets.length + ' assets', 'layers', 'assets'], ['My tasks', tasks.length + ' waiting on you', 'inbox', 'tasks']];
  else quick = [['Create a user', 'Type, seniority and team', 'plus', 'user-new'], ['Workflows', 'Configure review steps', 'workflow', 'workflows'], ['Users', S.users.length + ' people', 'users', 'users'], ['Audit trail', 'Every action, every object', 'history', 'audit']];
  const counts = st => S.modules.filter(m => st.includes(lifeStatus(m))).length;
  const pipe = [['Draft', ['Draft', 'Awaiting Senior submit']], ['In review', ['In Review']], ['Changes requested', ['Changes Requested']], ['Approved & active', ['Approved', 'Active']], ['Expiring / review', ['Expiring', 'Review Required']]];
  const recent = [...S.audit].sort((x, y) => y.ts - x.ts).slice(0, 6);
  const nWait = tasks.length, nRev = counts(['In Review']), nOk = counts(['Approved', 'Active']), nBad = counts(['Expiring', 'Review Required']);
  const kpis = [['Waiting on you', nWait, nWait ? 'warn' : 'ok', nWait ? 'Oldest ' + ago(Math.min(...tasks.map(t => t.since))) : 'Nothing pending', goAttr('tasks')], ['In review', nRev, 'warn', 'Across Medical, Legal, Regulatory', goAttr('modules', null, ' data-status="In Review"')], ['Approved & active', nOk, 'ok', 'Ready to reuse in assets', goAttr('library')], ['Expiring or overdue', nBad, nBad ? 'bad' : 'ok', 'Need re-approval', goAttr('lifecycle')]];
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const nPend = counts(['In Review', 'Changes Requested', 'Awaiting Senior submit']);
  const segs = [['Approved & active', nOk, 'ok', 'Approved', 'check'], ['Pending review', nPend, 'warn', 'In Review', 'clock'], ['Expiring or overdue', nBad, 'bad', 'Expiring', 'x'], ['Draft', counts(['Draft']), 'dim', 'Draft', 'edit']];
  const segTotal = segs.reduce((s, x) => s + x[1], 0) || 1;
  return `<div class="home">
  <header class="home-head">
    <div class="hh-text"><span class="eyebrow">${esc(today)}</span><h1>Welcome, ${esc(first)}</h1><div class="row ink2" style="gap:8px">${esc(u.type)} ${sen(u.seniority)} <span class="muted">·</span> ${icon(a.final ? 'key' : 'eye', 'sm')} ${esc(a.short)}</div></div>
    <div class="row">${quick.slice(0, 2).reverse().map((q, i) => `<button class="btn ${i ? 'primary' : ''}" ${q[3] === 'asset-new' ? 'data-act="asset-new"' : goAttr(q[3], q[4])}>${icon(q[2], 'sm')}${q[0]}</button>`).join('')}</div>
  </header>
  <div class="kpis">${kpis.map(k => `<button class="kpi" ${k[4]}><span class="k-label"><span class="k-dot ${k[2]}"></span>${k[0]}</span><b>${k[1]}</b><span class="k-sub">${esc(k[3])}</span></button>`).join('')}</div>
  <div class="home-grid">
    <div class="home-main">
    <section class="panel"><div class="panel-head"><h3>Needs your action</h3><span class="chip plain">${tasks.length}</span><span class="grow"></span><button class="btn ghost sm" ${goAttr('tasks')}>All tasks</button></div>
      ${tasks.length ? tasks.slice(0, 5).map(viewTaskRow).join('') : `<div class="empty"><h4>You are all caught up</h4><p>New review tasks appear here as soon as they are assigned to ${esc(roleLabel(u))}s.</p></div>`}
    </section>
      <section class="side-block pipe-block"><div class="sb-head"><h3>Content pipeline</h3><span class="muted mono">${S.modules.length} modules</span></div>
        <div class="pbar" role="img" aria-label="Modules by status: ${segs.map(s => s[0] + ' ' + s[1]).join(', ')}">${segs.filter(s => s[1]).map(s => `<span class="${s[2]}" style="flex:${s[1]}" data-tip="${s[0]} · ${s[1]} (${Math.round(s[1] / segTotal * 100)}%)"></span>`).join('')}</div>
        <div class="plegend">${segs.map(s => `<button ${goAttr('modules', null, ` data-status="${s[3]}"`)}><span class="lg-key ${s[2]}">${icon(s[4], 'sm')}</span><span>${s[0]}</span><b>${s[1]}</b><span class="pct mono">${Math.round(s[1] / segTotal * 100)}%</span></button>`).join('')}</div>
      </div>
    <aside class="home-side">
      <section class="side-block"><div class="sb-head"><h3>Recent activity</h3><button class="btn ghost sm" ${goAttr('audit')}>Audit trail</button></div>${viewTimeline(recent.slice(0, 4), true)}</section>
    </aside>
  </div></div>`;
}
function taskMeta(t) {
  if (t.kind === 'review') return `${esc(t.step.fn)} · ${t.step.seniority === 'Senior' ? 'Senior approval' : 'Junior review'}`;
  if (t.kind === 'revise') return 'Changes requested — revise and resubmit';
  if (t.kind === 'submit') return 'Junior draft — submit for review';
  if (t.kind === 'draft') return 'Draft — not yet submitted';
  if (t.kind === 'expiry') return daysTo(t.obj.expiry) < 0 ? 'Expired ' + (-daysTo(t.obj.expiry)) + ' days ago — review required' : 'Expires in ' + daysTo(t.obj.expiry) + ' days';
  return '';
}
function viewTaskRow(t) {
  const target = t.kind === 'review' ? (t.type === 'Asset' ? 'asset-review' : 'review') : (t.type === 'Asset' ? (t.kind === 'revise' ? 'assemble' : 'asset') : 'module');
  const tone = t.kind === 'review' ? (t.step.seniority === 'Senior' ? sen('Senior') : sen('Junior')) : t.kind === 'revise' ? chip('Changes Requested') : t.kind === 'expiry' ? chip(lifeStatus(t.obj)) : chip(t.kind === 'submit' ? 'Awaiting Senior submit' : 'Draft');
  return `<button class="task" ${goAttr(target, t.id)}>${typeIco(t.type === 'Asset' ? 'Reference' : t.obj.type)}<span class="body"><b>${esc(t.title)}</b><span><span class="mono">${t.id}</span> · ${taskMeta(t)} · ${ago(t.since)}</span></span>${tone}${icon('chevron', 'sm')}</button>`;
}
function viewTimeline(list, compact) {
  if (!list.length) return '<p class="muted">No activity yet.</p>';
  return `<div class="timeline">${list.map(e => { const x = user(e.user); const tone = /approv/i.test(e.action) ? 'ok' : /reject/i.test(e.action) ? 'bad' : /change|return|supersed/i.test(e.action) ? 'warn' : '';
    return `<div class="tl-item"><div class="tl-ico ${tone}">${icon(tone === 'ok' ? 'check' : tone === 'bad' ? 'x' : tone === 'warn' ? 'undo' : 'file', 'sm')}</div><div style="min-width:0"><div class="row" style="gap:6px"><b style="font-size:13px">${esc(x.name)}</b>${sen(x.seniority)}<span class="muted" style="font-size:12px">${esc(x.type)}</span></div><div style="font-size:13px"><b>${esc(e.action)}</b> · <button class="btn ghost sm" style="height:auto;padding:0 2px" ${goAttr(e.objType === 'Asset' ? 'asset' : 'module', e.objId)}>${esc(e.objId)}</button>${e.objType === 'Module' ? ' · v' + e.version : ''}</div>${e.note && !compact ? `<p class="ink2" style="font-size:12.5px;margin-top:2px">“${esc(e.note)}”</p>` : ''}<span class="muted" style="font-size:11.5px">${fmtDT(e.ts)}</span></div></div>`; }).join('')}</div>`;
}

/* ===== Modules ===== */
function viewModules() {
  const u = me(); const q = F('mq').toLowerCase();
  let rows = S.modules.filter(m => (!q || (m.title + m.id + latest(m).body).toLowerCase().includes(q)) && (!F('mprod') || m.product === F('mprod')) && (!F('mtype') || m.type === F('mtype')) && (!F('mmkt') || m.markets.includes(F('mmkt'))) && (!F('mstat') || lifeStatus(m) === F('mstat') || (F('mstat') === 'live' && ['Approved', 'Active'].includes(lifeStatus(m))) || (F('mstat') === 'Draft' && lifeStatus(m) === 'Awaiting Senior submit')));
  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  const statuses = ['Draft', 'In Review', 'Changes Requested', 'Approved', 'Active', 'Expiring', 'Review Required', 'Rejected', 'Archived'];
  return pageHead('Modules', 'Every reusable piece of content — drafts, in review and approved. Approved modules appear in the Approved Library.', canCreateModule(u) ? goBtn('Create module', 'module-new', null, 'primary', 'plus') : '') +
  statStrip([['Approved & active', S.modules.filter(m => ['Approved', 'Active'].includes(lifeStatus(m))).length, 'ok', 'Reusable now', 'mstat', 'live'], ['In review', S.modules.filter(m => lifeStatus(m) === 'In Review').length, 'warn', 'With MLR reviewers', 'mstat', 'In Review'], ['Changes requested', S.modules.filter(m => lifeStatus(m) === 'Changes Requested').length, 'warn', 'Back with the owner', 'mstat', 'Changes Requested'], ['Expiring', S.modules.filter(m => lifeStatus(m) === 'Expiring').length, 'warn', 'Within 45 days', 'mstat', 'Expiring'], ['Review required', S.modules.filter(m => lifeStatus(m) === 'Review Required').length, 'bad', 'Expired', 'mstat', 'Review Required'], ['Draft', S.modules.filter(m => ['Draft', 'Awaiting Senior submit'].includes(lifeStatus(m))).length, 'dim', 'Not submitted', 'mstat', 'Draft']]) +
  `<div class="toolbar">${searchBox('mq', F('mq'), 'Search title, ID or text')}${sel('mprod', F('mprod'), S.products.map(p => [p.id, p.name]), 'All products')}${sel('mtype', F('mtype'), S.moduleTypes, 'All types')}${sel('mmkt', F('mmkt'), S.markets.map(m => [m.id, m.name]), 'All markets')}${sel('mstat', F('mstat'), statuses, 'All statuses')}${(q || F('mprod') || F('mtype') || F('mmkt') || F('mstat')) ? btn('Clear filters', 'clear-filters', 'ghost sm', 'data-keys="mq,mprod,mtype,mmkt,mstat"') : ''}<span class="muted" style="margin-left:auto">${rows.length} of ${S.modules.length}</span></div>
  <section class="panel table-wrap">${rows.length ? `<table class="tbl list-tbl"><thead><tr><th>Module</th><th>Product</th><th>Markets</th><th>Version</th><th>Status</th><th>Owner</th><th>Updated</th></tr></thead><tbody>
  ${rows.map(m => { const l = latest(m), lv = live(m); return `<tr class="click" ${goAttr('module', m.id)} tabindex="0"><td><div class="cell-title">${typeIco(m.type)}<div><div class="title">${esc(m.title)}</div><span class="mono muted">${m.id} · ${esc(m.type)}</span></div></div></td><td class="nw">${esc(product(m.product).name)}</td><td><span class="tags">${m.markets.map(x => `<span class="tag">${x}</span>`).join('')}</span></td><td>${vtag(l.v)}${lv && lv.v !== l.v ? ` <span class="muted" style="font-size:11.5px">v${lv.v} live</span>` : ''}</td><td>${chip(lifeStatus(m))}</td><td>${userCell(m.owner)}</td><td class="muted num nw">${ago(m.updatedAt)}</td></tr>`; }).join('')}
  </tbody></table>` : `<div class="empty"><h4>No modules match these filters</h4><p>Try clearing a filter or searching for a different term.</p></div>`}</section>`;
}

function blankDraft() { return { type: '', title: '', body: '', product: '', indication: '', audience: '', markets: [], channels: [], refs: [], reviewDate: toISO(Date.now() + 300 * DAY), expiry: toISO(Date.now() + 365 * DAY), errors: {}, tried: false, newRefTitle: '', newRefSource: '' }; }

/* ===== Step-by-step forms ===== */
const MSTEPS = [['Module type', ['type'], 'What kind of content is this?'], ['Content', ['title', 'body'], 'Name the module and write the exact text reviewers will approve.'], ['Product & markets', ['product', 'indication', 'audience', 'markets', 'channels'], 'Where and for whom this module can be used.'], ['References & dates', ['refs', 'expiry'], 'Evidence, periodic review and expiry.'], ['Review & save', [], 'Check everything before saving the draft.']];
const USTEPS = [['Personal details', ['name', 'email'], 'Who is this person?'], ['Type & seniority', ['type'], 'What they review and how much authority they hold.'], ['Team & status', ['team'], 'Which team they belong to.'], ['Review & create', [], 'Check the details before sending the invitation.']];
function wizErrors(D, steps, all) { const E = {}; Object.keys(all).forEach(k => { const si = steps.findIndex(s => s[1].includes(k)); if (D.tried || (D.triedSteps || []).includes(si)) E[k] = all[k]; }); return E; }
function wizBar(form, steps, D) {
  const cur = D.step || 0, max = D.maxStep || 0;
  return `<nav class="wiz" aria-label="Form steps"><ol>${steps.map((s, i) => `<li class="${i < cur ? 'done' : ''} ${i === cur ? 'cur' : ''}"><button type="button" data-act="wiz-go" data-form="${form}" data-i="${i}" ${i > max ? 'disabled' : ''} ${i === cur ? 'aria-current="step"' : ''}><span class="n">${i < cur ? icon('check', 'sm') : i + 1}</span><span class="l">${s[0]}</span></button></li>`).join('')}</ol>
  <div class="wiz-meter"><span style="width:${Math.round(cur / (steps.length - 1) * 100)}%"></span></div></nav>`;
}
function wizHead(steps, D) { const s = steps[D.step || 0]; return `<div class="wiz-head"><span class="eyebrow">Step ${(D.step || 0) + 1} of ${steps.length}</span><h2>${s[0]}</h2><p class="ink2">${s[2]}</p></div>`; }
function wizFoot(form, steps, D, cancelAttr, finalLabel) {
  const cur = D.step || 0, last = cur === steps.length - 1;
  return `<div class="wiz-foot">${cur === 0 ? `<button class="btn" type="button" ${cancelAttr}>Cancel</button>` : `<button class="btn" type="button" data-act="wiz-back" data-form="${form}">${icon('back', 'sm')}Back</button>`}<span class="grow"></span>${!last && (D.maxStep || 0) === steps.length - 1 ? `<button class="btn" type="button" data-act="wiz-save" data-form="${form}">${icon('check', 'sm')}${finalLabel}</button>` : ''}<button class="btn primary" type="submit">${last ? icon('check', 'sm') + finalLabel : 'Next' + icon('chevron', 'sm')}</button></div>`;
}
function sumRow(label, val) { return `<dt>${label}</dt><dd>${val || '<span class="muted">—</span>'}</dd>`; }
function sumGroup(form, i, title, rows) { return `<section class="panel sum"><div class="panel-head"><h3>${title}</h3><span class="grow"></span><button type="button" class="btn ghost sm" data-act="wiz-go" data-form="${form}" data-i="${i}">${icon('edit', 'sm')}Edit</button></div><div class="panel-body"><dl class="kv" style="grid-template-columns:130px 1fr">${rows}</dl></div></section>`; }

function viewModuleForm() {
  const editId = UI.route.p.id; const m = editId ? modById(editId) : null;
  if (!UI.draft || UI.draft._for !== (editId || 'new')) {
    if (m) { const l = latest(m); UI.draft = { _for: editId, type: m.type, title: m.title, body: l.body, product: m.product, indication: m.indication, audience: m.audience, markets: [...m.markets], channels: [...m.channels], refs: [...l.refs], reviewDate: toISO(m.reviewDate || Date.now()), expiry: toISO(m.expiry || Date.now()), errors: {}, newRefTitle: '', newRefSource: '' }; }
    else { UI.draft = { _for: 'new', ...blankDraft() }; }
    UI.draft.step = m ? 1 : 0; UI.draft.maxStep = m ? MSTEPS.length - 1 : 0; UI.draft.triedSteps = [];
  }
  const D = UI.draft; const E = wizErrors(D, MSTEPS, validateDraft(D)); const st = D.step || 0; const hid = i => i === st ? '' : ' hidden';
  const types = [['Clinical Claim', 'A single efficacy or outcome claim with a reference'], ['Safety Statement', 'Fair-balance or safety information'], ['Headline', 'Short promotional headline'], ['Supporting Evidence', 'Data that supports a claim'], ['CTA', 'Call to action'], ['Reference', 'Citation block']];
  const p = S.products.find(x => x.id === D.product);
  const isNewVer = m && latest(m).v > 1 && live(m) && latest(m).status === 'Draft';
  const err = k => E[k] ? `<span class="err">${E[k]}</span>` : '';
  const title = m ? (isNewVer ? 'Edit version ' + latest(m).v : 'Edit module') : 'Create module';
  return pageHead(title, m ? `<span class="mono">${m.id}</span> · ${esc(m.title)}` : 'One idea per module. It is reviewed once and reused in every asset where it is eligible.', '', m ? [['Modules', 'modules'], [m.id, 'module', m.id], [title]] : [['Modules', 'modules'], ['Create module']]) +
  (isNewVer ? `<div class="banner info" style="margin-bottom:16px">${icon('layers')}<div class="txt"><b>You are editing version ${latest(m).v}</b><p>Version ${live(m).v} stays approved and live in the library until version ${latest(m).v} is approved.</p></div></div>` : '') +
  wizBar('module', MSTEPS, D) +
  `<form class="grid cols-main ${D.anim ? (D.anim = false, 'wiz-anim') : ''}" data-form="module" novalidate>
  <div class="stack">${wizHead(MSTEPS, D)}
    <section class="panel"${hid(0)}><div class="panel-head"><h3>Module type</h3></div><div class="panel-body"><div class="type-cards" role="radiogroup" aria-label="Module type">${types.map(t => `<button type="button" class="type-card ${D.type === t[0] ? 'on' : ''}" data-act="d-type" data-v="${t[0]}" role="radio" aria-checked="${D.type === t[0]}">${typeIco(t[0])}<span><b>${t[0]}</b><span>${t[1]}</span></span></button>`).join('')}</div>${err('type')}</div></section>
    <section class="panel"${hid(1)}><div class="panel-head"><h3>Content</h3></div><div class="panel-body form">
      <div class="field"><label for="d-title">Module name</label><input class="input ${E.title ? 'invalid' : ''}" id="d-title" data-d="title" value="${esc(D.title)}" placeholder="e.g. Clinical Claim — Hospitalisation reduction">${err('title')}</div>
      <div class="field"><label for="d-body">Module content</label><textarea class="textarea ${E.body ? 'invalid' : ''}" id="d-body" data-d="body" placeholder="Write one self-contained statement. Use a superscript number to cite a reference.">${esc(D.body)}</textarea><span class="hint">This exact text is what reviewers approve and what assets reuse.</span>${err('body')}</div>
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Product, indication & audience</h3></div><div class="panel-body fgrid">
      <div class="field"><label for="d-product">Product</label><select class="select ${E.product ? 'invalid' : ''}" id="d-product" data-d="product" data-rerender="1">${opt('', D.product, 'Select product')}${S.products.filter(x => x.status === 'Active').map(x => opt(x.id, D.product, x.name + ' — ' + x.area)).join('')}</select>${err('product')}</div>
      <div class="field"><label for="d-ind">Indication</label><select class="select ${E.indication ? 'invalid' : ''}" id="d-ind" data-d="indication" ${p ? '' : 'disabled'}>${opt('', D.indication, p ? 'Select indication' : 'Select a product first')}${p ? p.indications.map(i => opt(i, D.indication)).join('') : ''}</select>${err('indication')}</div>
      <div class="field" style="grid-column:1/-1"><label for="d-aud">Audience</label><select class="select ${E.audience ? 'invalid' : ''}" id="d-aud" data-d="audience">${opt('', D.audience, 'Select audience')}${S.audiences.map(a => opt(a, D.audience)).join('')}</select>${err('audience')}</div>
    </div></section>
    <section class="panel"${hid(2)}><div class="panel-head"><h3>Markets & channels</h3></div><div class="panel-body form">
      <div class="field"><span class="label">Markets</span><div class="choices">${S.markets.filter(x => x.active).map(x => `<button type="button" class="choice ${D.markets.includes(x.id) ? 'on' : ''}" data-act="d-toggle" data-k="markets" data-v="${x.id}" aria-pressed="${D.markets.includes(x.id)}"><span class="box">${D.markets.includes(x.id) ? icon('check', 'sm') : ''}</span>${esc(x.name)}</button>`).join('')}</div>${err('markets')}</div>
      <div class="field"><span class="label">Channels</span><div class="choices">${S.channels.map(c => `<button type="button" class="choice ${D.channels.includes(c) ? 'on' : ''}" data-act="d-toggle" data-k="channels" data-v="${c}" aria-pressed="${D.channels.includes(c)}"><span class="box">${D.channels.includes(c) ? icon('check', 'sm') : ''}</span>${esc(c)}</button>`).join('')}</div>${err('channels')}</div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>References</h3></div><div class="panel-body form">
      ${D.refs.length ? `<div class="stack" style="gap:8px">${D.refs.map((r, i) => { const R = refById(r); return `<div class="ref"><span class="n">${i + 1}</span><div style="flex:1"><b>${esc(R.title)}</b><br><span class="muted">${esc(R.source)}</span></div><button type="button" class="btn icon sm" data-act="d-unref" data-v="${r}" aria-label="Remove reference">${icon('x', 'sm')}</button></div>`; }).join('')}</div>` : `<p class="muted">No references yet.${D.type === 'Clinical Claim' || D.type === 'Supporting Evidence' ? ' A reference is required for this module type.' : ''}</p>`}
      ${err('refs')}
      <div class="fgrid"><div class="field"><label for="d-addref">Add from reference library</label><select class="select" id="d-addref" data-act-change="d-addref">${opt('', '', 'Select a reference')}${S.references.filter(r => !D.refs.includes(r.id) && (!D.product || r.id.includes('-' + D.product.slice(-1) + '-'))).map(r => opt(r.id, '', r.title)).join('')}</select></div>
      <div class="field"><label for="d-newref">Or add a new reference</label><div class="row nowrap"><input class="input" id="d-newref" data-d="newRefTitle" value="${esc(D.newRefTitle)}" placeholder="Title and source"><button type="button" class="btn" data-act="d-newref">Add</button></div></div></div>
    </div></section>
    <section class="panel"${hid(3)}><div class="panel-head"><h3>Review & expiry</h3></div><div class="panel-body fgrid">
      <div class="field"><label for="d-rev">Periodic review date</label><input class="input" type="date" id="d-rev" data-d="reviewDate" value="${esc(D.reviewDate)}"><span class="hint">You will be reminded to re-check the evidence on this date.</span></div>
      <div class="field"><label for="d-exp">Expiry date</label><input class="input ${E.expiry ? 'invalid' : ''}" type="date" id="d-exp" data-d="expiry" value="${esc(D.expiry)}"><span class="hint">After this date the module cannot be used in new assets.</span>${err('expiry')}</div>
    </div></section>
    ${st === MSTEPS.length - 1 ? `${D.tried && Object.keys(E).length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${Object.keys(E).length} field${Object.keys(E).length > 1 ? 's need' : ' needs'} attention</b><p>Use Edit to go back to that step.</p></div></div>` : ''}
    ${sumGroup('module', 0, 'Module type', sumRow('Type', esc(D.type)))}
    ${sumGroup('module', 1, 'Content', sumRow('Name', esc(D.title)) + sumRow('Text', esc(D.body)))}
    ${sumGroup('module', 2, 'Product & markets', sumRow('Product', p ? esc(p.name) : '') + sumRow('Indication', esc(D.indication)) + sumRow('Audience', esc(D.audience)) + sumRow('Markets', esc(marketsTxt(D.markets))) + sumRow('Channels', esc(D.channels.join(', '))))}
    ${sumGroup('module', 3, 'References & dates', sumRow('References', D.refs.map(r => esc(refById(r).title)).join('<br>')) + sumRow('Review date', esc(D.reviewDate)) + sumRow('Expiry', esc(D.expiry)))}
    <p class="muted" style="font-size:12px">Saving keeps the module as a draft. You submit it for MLR review from the module page.</p>` : ''}
    ${wizFoot('module', MSTEPS, D, m ? goAttr('module', m.id) : goAttr('modules'), m ? (isNewVer ? 'Save version ' + latest(m).v : 'Save changes') : 'Save draft')}
  </div>
  <aside class="stack" style="position:sticky;top:84px">
    <section class="panel"><div class="panel-head"><h3>Preview</h3>${D.type ? `<span class="tag">${esc(D.type)}</span>` : ''}</div><div class="panel-body stack">${D.body ? `<p class="${D.type === 'Headline' ? 'claim' : ''}" style="${D.type === 'Headline' ? 'font-size:22px;font-weight:800' : 'font-size:15px;line-height:1.6'}">${esc(D.body)}</p>` : '<p class="muted">Your content appears here as reviewers will see it.</p>'}
      <dl class="kv" style="grid-template-columns:96px 1fr;font-size:12.5px"><dt>Product</dt><dd>${p ? esc(p.name) : '—'}</dd><dt>Indication</dt><dd>${esc(D.indication || '—')}</dd><dt>Audience</dt><dd>${esc(D.audience || '—')}</dd><dt>Markets</dt><dd>${D.markets.length ? esc(marketsTxt(D.markets)) : '—'}</dd><dt>Channels</dt><dd>${D.channels.length ? esc(D.channels.join(', ')) : '—'}</dd><dt>References</dt><dd>${D.refs.length}</dd></dl></div></section>
  </aside></form>`;
}
function validateDraft(D) {
  const e = {};
  if (!D.type) e.type = 'Choose a module type.';
  if (!D.title.trim()) e.title = 'Give the module a name.';
  if (D.body.trim().length < 8) e.body = 'Write the module content (at least a short sentence).';
  if (!D.product) e.product = 'Select a product.';
  if (!D.indication) e.indication = 'Select an indication.';
  if (!D.audience) e.audience = 'Select an audience.';
  if (!D.markets.length) e.markets = 'Select at least one market.';
  if (!D.channels.length) e.channels = 'Select at least one channel.';
  if ((D.type === 'Clinical Claim' || D.type === 'Supporting Evidence') && !D.refs.length) e.refs = 'Clinical claims and evidence need at least one reference.';
  if (!D.expiry || fromISO(D.expiry) < Date.now()) e.expiry = 'Set an expiry date in the future.';
  return e;
}

function viewModule() {
  const m = modById(UI.route.p.id); if (!m) return viewMissing('Module');
  const u = me(); const l = latest(m); const lv = live(m); const ls = lifeStatus(m); const tab = UI.route.p.tab || 'overview';
  const owner = u.type === 'Content Owner'; const imp = impactedAssets(m);
  let actions = '';
  if (owner && ['Draft', 'Changes Requested', 'Rejected'].includes(l.status)) actions += goBtn('Edit', 'module-edit', m.id, '', 'edit') + btn(u.seniority === 'Junior' ? 'Send to Senior Content Owner' : (l.status === 'Draft' ? 'Submit for review' : 'Resubmit for review'), 'submit-open', 'primary', `data-id="${m.id}"`, 'send');
  if (owner && u.seniority === 'Senior' && l.status === 'Awaiting Senior submit') actions += goBtn('Edit', 'module-edit', m.id, '', 'edit') + btn('Submit for review', 'submit-open', 'primary', `data-id="${m.id}"`, 'send');
  if (m.review && canActOn(u, m)) actions += goBtn('Open review', 'review', m.id, 'primary', 'shieldcheck');
  if (owner && lv && l.status === 'Approved' && !m.archived) actions += btn('Create new version', 'new-version', '', `data-id="${m.id}"`, 'copy');
  if (canCreateAsset(u) && lv && ['Approved', 'Active', 'Expiring'].includes(ls)) actions += btn('Use in asset', 'asset-new', '', `data-module="${m.id}"`, 'layers');
  const st = curStep(m);
  let banners = '';
  if (l.status === 'Changes Requested') { const lr = (l.lastReview || []).slice(-1)[0]; banners += `<div class="banner warn">${icon('undo')}<div class="txt"><b>Changes requested${lr ? ' by ' + esc(user(lr.by).name) + ' (' + esc(lr.seniority + ' ' + lr.fn) + ' Reviewer)' : ''}</b><p>“${esc(m.changes || '')}”</p></div>${owner ? goBtn('Revise', 'module-edit', m.id, 'sm') : ''}</div>`; }
  if (l.status === 'Rejected') banners += `<div class="banner bad">${icon('x')}<div class="txt"><b>Rejected</b><p>“${esc(m.changes || '')}”</p></div></div>`;
  if (l.status === 'Awaiting Senior submit') banners += `<div class="banner info">${icon('inbox')}<div class="txt"><b>Waiting for a Senior Content Owner to submit</b><p>Junior Content Owners prepare drafts; a Senior Content Owner submits them for MLR review.</p></div></div>`;
  if (m.review) { const as = assigneeFor(st); banners += `<div class="banner pending">${icon('shieldcheck')}<div class="txt"><b>In review · ${esc(stepLabel(st))}</b><p>Assigned to ${as.map(x => esc(x.name)).join(', ') || 'the ' + esc(st.fn) + ' team'} (${esc(st.seniority)} ${esc(REVIEWER_OF[st.fn])}). Step ${m.review.step + 1} of ${wfById(m.review.wf).steps.length}.</p></div>${canActOn(u, m) ? goBtn('Open review', 'review', m.id, 'sm primary') : ''}</div>`; }
  if (lv && lv !== l && l.status !== 'Approved') banners += `<div class="banner">${icon('layers')}<div class="txt"><b>Version ${l.v} is ${esc(l.status.toLowerCase())} · version ${lv.v} is still live</b><p>Assets keep using v${lv.v} until v${l.v} is approved.</p></div></div>`;
  if (imp.length) banners += `<div class="banner warn">${icon('alert')}<div class="txt"><b>${imp.length} asset${imp.length > 1 ? 's are' : ' is'} using a previous version of this module</b><p>Version ${lv.v} is approved. Update each asset to the new version.</p></div><button class="btn sm" ${goAttr('module', m.id, ' data-tab="lifecycle"')}>Review impacted assets</button></div>`;
  if (ls === 'Expiring') banners += `<div class="banner warn">${icon('clock')}<div class="txt"><b>Expires in ${daysTo(m.expiry)} days (${fmtD(m.expiry)})</b><p>Create a new version or confirm the content is still valid before it expires.</p></div></div>`;
  if (ls === 'Review Required') banners += `<div class="banner bad">${icon('clock')}<div class="txt"><b>Expired on ${fmtD(m.expiry)} — review required</b><p>This module can no longer be added to new assets.</p></div></div>`;
  const tabs = [['overview', 'Overview'], ['workflow', 'Workflow'], ['versions', 'Versions', m.versions.length], ['lifecycle', 'Lifecycle & impact', imp.length || null], ['audit', 'Audit']];
  return pageHead(`${esc(m.title)}`, `<span class="row" style="gap:8px">${chip(ls)}${vtag(l.v)}<span class="mono">${m.id}</span><span class="muted">·</span>${esc(m.type)}<span class="muted">·</span>${esc(product(m.product).name)}<span class="muted">·</span>Owner ${esc(user(m.owner).name)}</span>`, actions, [['Modules', 'modules'], [m.id]]) +
  (banners ? `<div class="stack" style="margin-bottom:16px">${banners}</div>` : '') +
  `<div class="tabs" role="tablist" style="margin-bottom:16px">${tabs.map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" role="tab" aria-selected="${tab === t[0]}" ${goAttr('module', m.id, ` data-tab="${t[0]}"`)}>${t[1]}${t[2] ? `<span class="n">${t[2]}</span>` : ''}</button>`).join('')}</div>` +
  (tab === 'overview' ? viewModuleOverview(m) : tab === 'workflow' ? viewModuleWorkflow(m) : tab === 'versions' ? viewModuleVersions(m) : tab === 'lifecycle' ? viewModuleLifecycle(m) : `<section class="panel"><div class="panel-body">${viewTimeline(S.audit.filter(e => e.objId === m.id).sort((a, b) => b.ts - a.ts))}</div></section>`);
}
function refsList(ids) { return ids.length ? `<div class="stack" style="gap:8px">${ids.map((r, i) => { const R = refById(r); return `<div class="ref"><span class="n">${i + 1}</span><div><b>${esc(R.title)}</b><br><span class="muted">${esc(R.source)}</span></div></div>`; }).join('')}</div>` : '<p class="muted">No references.</p>'; }
function metaKV(m, v) {
  return `<dl class="kv"><dt>Type</dt><dd>${esc(m.type)}</dd><dt>Product</dt><dd>${esc(product(m.product).name)}</dd><dt>Indication</dt><dd>${esc(m.indication)}</dd><dt>Audience</dt><dd>${esc(m.audience)}</dd><dt>Markets</dt><dd>${esc(marketsTxt(m.markets))}</dd><dt>Channels</dt><dd>${esc(m.channels.join(', '))}</dd><dt>Version</dt><dd>v${v.v} · ${esc(v.status)}</dd><dt>Review date</dt><dd>${fmtD(m.reviewDate)}</dd><dt>Expiry</dt><dd>${fmtD(m.expiry)}</dd><dt>Owner</dt><dd>${esc(user(m.owner).name)}</dd>${v.approvedAt ? `<dt>Approved</dt><dd>${fmtD(v.approvedAt)} · ${esc(user(v.by).name)}</dd>` : ''}</dl>`;
}
function viewModuleOverview(m) {
  const l = latest(m);
  return `<div class="grid cols-main"><div class="stack"><section class="panel sheet-card"><div class="sheet-strip"><span class="mono">${m.id} · v${l.v}</span><span>${esc(m.type)}</span><span>${esc(m.audience)}</span><span class="grow"></span>${chip(l.status === 'Approved' ? lifeStatus(m) : l.status)}</div>
    <div class="sheet-body"><p class="claim ${m.type === 'Headline' ? 'is-headline' : ''}">${esc(l.body)}</p>
    <div class="footnotes"><span class="fn-title">References</span>${l.refs.length ? `<ol>${l.refs.map(r => { const R = refById(r); return `<li><b>${esc(R.title)}</b> <span>${esc(R.source)}</span></li>`; }).join('')}</ol>` : '<p class="muted">No references attached.</p>'}</div></div></section></div>
  <section class="panel"><div class="panel-head"><h3>Details</h3></div><div class="panel-body">${metaKV(m, l)}</div></section></div>`;
}
function wfProgress(obj, isMod) {
  const wfId = obj.review ? obj.review.wf : (isMod ? 'WF-STD' : assetWorkflow(obj)); const wf = wfById(wfId);
  const cur = obj.review ? obj.review.step : -1;
  const hist = obj.review ? obj.review.comments : (isMod ? (latest(obj).history || latest(obj).lastReview || []) : (obj.history || obj.lastReview || []));
  const approved = isMod ? latest(obj).status === 'Approved' : obj.status === 'Approved';
  return `<div class="wf">${wf.steps.map((s, i) => { const done = approved || (cur > i); const now = cur === i; const by = [...hist].reverse().find(c => c.step === i && /Send|Final|Complete/.test(c.decision));
    if (isNotify(s)) { const sentC = [...hist].reverse().find(c => c.step === i && c.decision === 'Email sent'); return `<div class="wf-step notify ${done ? 'done' : ''}"><div class="wf-dot">${icon('mail', 'sm')}</div><div><div class="t">${fnBadge('Email', 'sm')}Email notification</div><div class="s">${done ? 'Sent to ' + esc((sentC && sentC.to ? sentC.to : notifyTo(s)).join(', ') || 'no one') : 'Sends to ' + esc(notifyTo(s).join(', ') || 'no one yet') + ' when the step before is approved'}</div></div></div>`; }
    return `<div class="wf-step ${done ? 'done' : ''} ${now ? 'current' : ''}"><div class="wf-dot">${done ? icon('check', 'sm') : reviewPos(wf, i)}</div><div><div class="t">${fnBadge(s.fn, 'sm')}${esc(s.fn)} <span class="muted">·</span> ${s.req === 'approve' ? 'Final approval' : 'Review'} ${sen(s.seniority)}</div><div class="s">${done && by ? esc(user(by.by).name) + ' · ' + fmtDT(by.at) : now ? 'In progress — ' + assigneeFor(s).map(x => esc(x.name)).join(', ') : done ? 'Completed' : 'Pending'}</div></div></div>`; }).join('')}</div>`;
}
function wfInline(wf, cur, approved) { return `<div class="wf-inline">${wf.steps.map((s, i) => `<span class="wf-pill ${approved || cur > i ? 'done' : cur === i ? 'current' : ''}">${fnBadge(s.fn)}${isNotify(s) ? 'Email' : esc(s.fn) + ' ' + (s.seniority === 'Senior' ? 'S' : 'J')}</span>${i < wf.steps.length - 1 ? '<span class="wf-sep"></span>' : ''}`).join('')}</div>`; }
function commentsList(list, highlightFn) {
  if (!list || !list.length) return '<p class="muted">No review comments yet.</p>';
  return `<div class="stack" style="gap:10px">${list.map(c => { const x = user(c.by); return `<div class="comment ${c.seniority === 'Junior' ? 'junior' : ''}"><div class="who">${avatar(x, 'sm')}<b>${esc(x.name)}</b>${sen(c.seniority || x.seniority)}<span class="muted" style="font-size:12px">${esc((c.fn || FUNCTION_OF[x.type] || '') + ' · ' + fmtDT(c.at))}</span></div>${c.decision ? `<div style="margin-bottom:4px">${chip(c.decision === 'Comment' ? 'Comment' : c.decision, '')}</div>` : ''}${c.text ? `<p style="font-size:13.5px">${esc(c.text)}</p>` : ''}</div>`; }).join('')}</div>`;
}
function viewModuleWorkflow(m) {
  const l = latest(m); const hist = m.review ? m.review.comments : (l.history || l.lastReview || []);
  return `<div class="grid cols-2"><section class="panel"><div class="panel-head"><h3>Approval workflow</h3><span class="muted" style="font-size:12.5px">${esc(wfById(m.review ? m.review.wf : 'WF-STD').name)}</span></div><div class="panel-body">${l.status === 'Draft' || l.status === 'Awaiting Senior submit' ? '<p class="muted" style="margin-bottom:14px">Not submitted yet. This is the route the module will take.</p>' : ''}${wfProgress(m, true)}</div></section>
  <section class="panel"><div class="panel-head"><h3>Review history · v${l.v}</h3></div><div class="panel-body">${commentsList(hist)}</div></section></div>`;
}
function viewModuleVersions(m) {
  return `<section class="panel table-wrap"><table class="tbl"><thead><tr><th>Version</th><th>Status</th><th>Content</th><th>References</th><th>Approved</th></tr></thead><tbody>${[...m.versions].reverse().map(v => `<tr><td>${vtag(v.v)}</td><td>${chip(v.status)}</td><td style="max-width:520px">${esc(v.body)}</td><td>${v.refs.map(r => `<span class="tag" title="${esc(refById(r).title)}">${r}</span>`).join(' ') || '—'}</td><td class="num">${v.approvedAt ? fmtD(v.approvedAt) + '<br><span class="muted">' + esc(user(v.by).name) + '</span>' : '—'}</td></tr>`).join('')}</tbody></table></section>`;
}
const LIFE = ['Draft', 'In Review', 'Approved', 'Active', 'Expiring', 'Review Required', 'Superseded', 'Archived'];
function viewModuleLifecycle(m) {
  const ls = lifeStatus(m); const li = LIFE.indexOf(ls === 'Changes Requested' || ls === 'Awaiting Senior submit' || ls === 'Rejected' ? 'Draft' : ls); const lv = live(m); const imp = impactedAssets(m);
  const users = S.assets.filter(a => a.blocks.some(b => b.moduleId === m.id));
  return `<div class="stack"><section class="panel"><div class="panel-head"><h3>Lifecycle</h3></div><div class="panel-body stack"><div class="life">${LIFE.map((s, i) => `<span class="life-st ${i === li ? 'on' : i < li ? 'past' : ''}">${i < li ? icon('check', 'sm') : ''}${s}</span>${i < LIFE.length - 1 ? `<span class="life-arrow">${icon('chevron', 'sm')}</span>` : ''}`).join('')}</div>
  <dl class="kv"><dt>Current version</dt><dd>v${latest(m).v} · ${esc(latest(m).status)}</dd><dt>Live version</dt><dd>${lv ? 'v' + lv.v + ' · approved ' + fmtD(lv.approvedAt) : 'None yet'}</dd><dt>Previous versions</dt><dd>${m.versions.filter(v => v !== latest(m)).map(v => 'v' + v.v + ' (' + v.status + ')').join(', ') || '—'}</dd><dt>Review date</dt><dd>${fmtD(m.reviewDate)}</dd><dt>Expiry</dt><dd>${fmtD(m.expiry)}${m.expiry ? ' · ' + (daysTo(m.expiry) >= 0 ? daysTo(m.expiry) + ' days left' : 'expired') : ''}</dd><dt>References</dt><dd>${latest(m).refs.map(r => esc(refById(r).title)).join('; ') || '—'}</dd></dl></div></section>
  <section class="panel"><div class="panel-head"><h3>Assets using this module</h3><span class="chip plain">${users.length}</span>${imp.length ? `<span class="chip warn">${imp.length} on a previous version</span>` : ''}</div>${users.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Market</th><th>Channel</th><th>Uses version</th><th>Asset status</th><th></th></tr></thead><tbody>${users.map(a => { const b = a.blocks.find(x => x.moduleId === m.id); const old = lv && b.v < lv.v; return `<tr class="click" ${goAttr('asset', a.id)}><td><div class="title">${esc(a.name)}</div><span class="mono muted">${a.id}</span></td><td>${esc(market(a.market).name)}</td><td>${esc(a.channel)}</td><td>${vtag(b.v)} ${old ? '<span class="chip warn">Outdated</span>' : '<span class="chip ok">Current</span>'}</td><td>${chip(a.status)}</td><td>${old && canCreateAsset(me()) ? `<button class="btn sm" data-act="replace-version" data-asset="${a.id}" data-module="${m.id}">Update to v${lv.v}</button>` : `<button class="btn sm ghost" ${goAttr('asset', a.id)}>Open</button>`}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><p>Not used in any asset yet.</p></div>'}</section></div>`;
}
function viewMissing(what) { return `<div class="empty"><h4>${what} not found</h4><p>It may have been removed when the demo was reset.</p><br>${goBtn('Go home', 'home', null, 'primary')}</div>`; }

/* ===== Review workspace (modules) ===== */
function decisionButtons(obj, kind) {
  const st = curStep(obj); const u = me(); if (!st || !canActOn(u, obj)) return '';
  const isSenior = st.seniority === 'Senior'; const hasJunior = juniorStepIndex(obj) >= 0;
  let h = btn('Reject', 'decide', 'danger', `data-kind="${kind}" data-id="${obj.id}" data-d="reject"`, 'x') + btn('Request changes', 'decide', '', `data-kind="${kind}" data-id="${obj.id}" data-d="changes"`, 'undo');
  if (isSenior && hasJunior) h += btn('Return to Junior', 'decide', '', `data-kind="${kind}" data-id="${obj.id}" data-d="return"`, 'back');
  h += st.req === 'approve' ? btn('Final ' + st.fn + ' approval', 'sign', 'primary', `data-kind="${kind}" data-id="${obj.id}"`, 'key') : btn(nextLabel(obj), 'decide', 'primary', `data-kind="${kind}" data-id="${obj.id}" data-d="send"`, 'send');
  return h;
}
function authorityBanner(obj) {
  const st = curStep(obj); const u = me(); const mine = canActOn(u, obj); const as = mine ? [u] : assigneeFor(st); const wf = wfById(obj.review.wf); const nx = wf.steps[obj.review.step + 1];
  const who = as[0] || { name: '—', seniority: st.seniority };
  return `<div class="authority"><div><div class="lbl">${esc(st.fn)} review</div><div class="v">${icon('shieldcheck', 'sm')}Step ${reviewPos(wf, obj.review.step)} of ${reviewSteps(wf).length}</div></div>
  <div><div class="lbl">Current reviewer</div><div class="v">${avatar(who, 'sm')}${esc(who.name)} ${sen(st.seniority)}</div></div>
  <div><div class="lbl">${st.req === 'approve' ? 'Authority' : 'Status'}</div><div class="v">${icon(st.req === 'approve' ? 'key' : 'eye', 'sm')}${st.req === 'approve' ? 'Final ' + esc(st.fn) + ' approval' : 'Initial review'}</div></div>
  <div><div class="lbl">Next</div><div class="v">${icon('arrow', 'sm')}${nx ? esc(stepLabel(nx)) : 'Approved → Library'}</div></div></div>`;
}
function viewReview() {
  const m = modById(UI.route.p.id); if (!m) return viewMissing('Module');
  const u = me(); const l = latest(m);
  if (!m.review) return pageHead(esc(m.title), 'This module is not in review.', goBtn('Open module', 'module', m.id, 'primary'), [['My Tasks', 'tasks'], [m.id]]) + `<div class="banner">${icon('inbox')}<div class="txt"><b>Current status: ${esc(lifeStatus(m))}</b><p>The review task has been completed or moved on.</p></div></div>`;
  const mine = canActOn(u, m); const st = curStep(m);
  const juniorNotes = m.review.comments.filter(c => c.fn === st.fn && c.seniority === 'Junior');
  const hist = m.review.comments;
  const lastRound = l.lastReview || [];
  return pageHead(esc(m.title), `<span class="row" style="gap:8px">${chip('In Review')}${vtag(l.v)}<span class="mono">${m.id}</span></span>`, mine ? decisionButtons(m, 'Module') : '', [['My Tasks', 'tasks'], [m.id, 'module', m.id], ['Review']]) +
  (!mine ? `<div class="banner info" style="margin-bottom:14px">${icon('eye')}<div class="txt"><b>View only — this step is assigned to the ${esc(st.seniority)} ${esc(REVIEWER_OF[st.fn])}</b><p>You are signed in as ${esc(roleLabel(u))}. Switch user from the top-right menu to act on this step.</p></div><button class="btn sm" data-act="persona" data-id="${(assigneeFor(st)[0] || {}).id}" data-then="review" data-target="${m.id}">Switch to ${esc((assigneeFor(st)[0] || {}).name || '')}</button></div>` : '') +
  `<div class="stack" style="margin-bottom:16px">${authorityBanner(m)}</div>
  <div class="grid cols-main"><div class="stack">
    <section class="panel"><div class="panel-head"><h3>Module content</h3><span class="tag">${esc(m.type)}</span></div><div class="panel-body stack" style="gap:18px"><p class="claim">${esc(l.body)}</p>
      <div class="fgrid meta-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['Product', product(m.product).name], ['Indication', m.indication], ['Audience', m.audience], ['Market', marketsTxt(m.markets)], ['Channel', m.channels.join(', ')], ['Version', 'v' + l.v + (live(m) && live(m) !== l ? ' (replaces v' + live(m).v + ')' : '')]].map(([k, v]) => `<div><div class="section-title" style="font-size:10.5px">${k}</div><div style="font-weight:700;margin-top:2px">${esc(v)}</div></div>`).join('')}</div></div></section>
    <section class="panel"><div class="panel-head"><h3>References & evidence</h3><span class="chip plain">${l.refs.length}</span></div><div class="panel-body">${refsList(l.refs)}</div></section>
    ${live(m) && live(m) !== l ? `<section class="panel"><div class="panel-head"><h3>What changed from v${live(m).v}</h3></div><div class="panel-body stack"><div class="comment junior"><div class="who"><span class="tag">v${live(m).v} · approved</span></div><p style="text-decoration:line-through;color:var(--ink-3)">${esc(live(m).body)}</p></div><div class="comment"><div class="who"><span class="tag">v${l.v} · in review</span></div><p>${esc(l.body)}</p></div></div></section>` : ''}
    ${mine ? `<section class="panel"><div class="panel-head"><h3>Add a comment</h3></div><div class="panel-body stack"><textarea class="textarea" id="rv-comment" placeholder="Comments are visible to the next reviewer and to the content owner." style="min-height:90px">${esc(UI.f.rvc || '')}</textarea><div class="row"><button class="btn" data-act="comment" data-kind="Module" data-id="${m.id}">${icon('send', 'sm')}Add comment</button></div></div></section>` : ''}
  </div>
  <div class="stack">
    ${st.seniority === 'Senior' ? `<section class="panel"><div class="panel-head"><h3>Junior ${esc(st.fn)} review</h3></div><div class="panel-body">${juniorNotes.length ? commentsList(juniorNotes) : `<p class="muted">No Junior review in this workflow step — Senior approves directly.</p>`}</div></section>` : ''}
    <section class="panel"><div class="panel-head"><h3>Workflow progress</h3></div><div class="panel-body">${wfProgress(m, true)}</div></section>
    <section class="panel"><div class="panel-head"><h3>Review history</h3></div><div class="panel-body">${commentsList(hist)}${lastRound.length ? `<div class="section-title" style="margin:16px 0 8px">Previous round</div>${commentsList(lastRound)}` : ''}</div></section>
  </div></div>`;
}

/* ===== Tasks ===== */
function viewTasks() {
  const u = me(); const all = tasksFor(u); const tab = F('ttab', 'all');
  const list = tab === 'reviews' ? all.filter(t => t.kind === 'review') : tab === 'content' ? all.filter(t => t.kind !== 'review') : all;
  const a = authority(u.type, u.seniority);
  return pageHead('My Tasks', `Signed in as <b>${esc(u.name)}</b> · ${esc(u.type)} ${sen(u.seniority)} · ${esc(a.short)}`) +
  `<div class="row between" style="margin-bottom:14px"><div class="tabs" role="tablist">${[['all', 'All', all.length], ['reviews', 'Reviews', all.filter(t => t.kind === 'review').length], ['content', 'My content', all.filter(t => t.kind !== 'review').length]].map(t => `<button class="tab ${tab === t[0] ? 'active' : ''}" role="tab" aria-selected="${tab === t[0]}" data-act="set-f" data-k="ttab" data-v="${t[0]}">${t[1]}<span class="n">${t[2]}</span></button>`).join('')}</div></div>
  <section class="panel">${list.length ? list.map(viewTaskRow).join('') : `<div class="empty"><h4>No tasks here</h4><p>${FUNCTION_OF[u.type] ? 'Review tasks appear when content reaches the ' + esc(u.seniority) + ' ' + esc(FUNCTION_OF[u.type]) + ' step.' : 'Tasks appear when your content needs action.'} Use the user menu (top right) to view the product as another person.</p></div>`}</section>`;
}

/* ===== Library ===== */
function viewLibrary() {
  S.demo.sawLibrary = true;
  const q = F('lq').toLowerCase(); const exp = F('lexp'); const stF = F('lstat', 'usable');
  let rows = S.modules.filter(m => live(m) && !m.archived);
  rows = rows.filter(m => { const ls = lifeStatus(m); const lv = live(m); const stOk = stF === 'usable' ? ['Approved', 'Active', 'Expiring'].includes(ls) || (['In Review', 'Draft', 'Changes Requested', 'Awaiting Senior submit'].includes(ls) && lv) : stF === '' ? true : ls === stF;
    const dt = daysTo(m.expiry || 9e15); const expOk = !exp || (exp === '30' ? dt <= 30 && dt >= 0 : exp === '90' ? dt <= 90 && dt >= 0 : exp === 'later' ? dt > 90 : dt < 0);
    return stOk && expOk && (!q || (m.title + m.id + lv.body).toLowerCase().includes(q)) && (!F('lprod') || m.product === F('lprod')) && (!F('lmkt') || m.markets.includes(F('lmkt'))) && (!F('laud') || m.audience === F('laud')) && (!F('lch') || m.channels.includes(F('lch'))) && (!F('ltype') || m.type === F('ltype')); });
  rows.sort((a, b) => (live(b).approvedAt || 0) - (live(a).approvedAt || 0));
  const any = q || exp || stF !== 'usable' || F('lprod') || F('lmkt') || F('laud') || F('lch') || F('ltype');
  return pageHead('Approved Content Library', 'Approved modules you can reuse. Only the approved version is shown; drafts of newer versions stay out of the library until they are approved.') +
  `<div class="toolbar">${searchBox('lq', F('lq'), 'Search approved content')}${sel('lprod', F('lprod'), S.products.map(p => [p.id, p.name]), 'All products')}${sel('lmkt', F('lmkt'), S.markets.map(m => [m.id, m.name]), 'All markets')}${sel('laud', F('laud'), S.audiences, 'All audiences')}${sel('lch', F('lch'), S.channels, 'All channels')}${sel('ltype', F('ltype'), S.moduleTypes, 'All module types')}
  <select aria-label="Status" data-filter="lstat">${opt('usable', stF, 'Status: usable')}${opt('', stF, 'All statuses')}${['Approved', 'Active', 'Expiring', 'Review Required'].map(s => opt(s, stF)).join('')}</select>
  <select aria-label="Expiry" data-filter="lexp">${opt('', exp, 'Any expiry')}${opt('30', exp, 'Expires within 30 days')}${opt('90', exp, 'Expires within 90 days')}${opt('later', exp, 'Expires after 90 days')}${opt('expired', exp, 'Expired')}</select>
  ${any ? btn('Clear', 'clear-filters', 'ghost sm', 'data-keys="lq,lprod,lmkt,laud,lch,ltype,lexp,lstat"') : ''}<span class="muted" style="margin-left:auto">${rows.length} modules</span></div>
  <section class="panel table-wrap">${rows.length ? `<table class="tbl lib-tbl"><thead><tr><th>Module</th><th>Product</th><th>Approved for</th><th>Version</th><th>Status</th><th>Valid until</th></tr></thead><tbody>${rows.map(m => { const lv = live(m); const ls = lifeStatus(m); const shown = ['In Review', 'Draft', 'Changes Requested', 'Awaiting Senior submit'].includes(ls) ? (daysTo(m.expiry) <= 45 ? 'Expiring' : (usedInApproved(m.id) ? 'Active' : 'Approved')) : ls; const dl = daysTo(m.expiry);
    return `<tr class="click" ${goAttr('module', m.id)} tabindex="0"><td><div class="cell-title">${typeIco(m.type)}<div><div class="title">${esc(m.title)}</div><span class="mono muted">${m.id} · ${esc(m.type)}</span></div></div></td><td>${esc(product(m.product).name)}</td><td><div class="usable"><span>${m.markets.map(x => `<span class="tag" title="${esc(market(x).name)}">${x}</span>`).join('')}</span><span class="muted">${esc(m.audience)} · ${esc(m.channels.join(', '))}</span></div></td><td>${vtag(lv.v)}</td><td>${chip(shown)}</td><td><div class="valid"><b class="num">${fmtD(m.expiry)}</b><span class="${dl < 0 ? 'late' : dl <= 45 ? 'soon' : 'muted'}">${dl < 0 ? Math.abs(dl) + ' days overdue' : dl > 60 ? Math.round(dl / 30) + ' months left' : dl + ' days left'}</span></div></td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>No approved modules match</h4><p>Adjust the filters, or approve more content through the MLR workflow.</p></div>`}</section>`;
}

/* ===== Assets ===== */
function viewAssets() {
  const q = F('aq').toLowerCase();
  const isOut = a => a.blocks.some(b => { const mm = modById(b.moduleId); return mm && live(mm) && b.v < live(mm).v; });
  const rows = S.assets.filter(a => (!q || (a.name + a.id).toLowerCase().includes(q)) && (!F('astat') || a.status === F('astat') || (F('astat') === 'outdated' && isOut(a)))).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const nA = s => S.assets.filter(a => a.status === s).length;
  return pageHead('Assets', 'Materials assembled from approved modules. Anything that is not an approved module is flagged as new content and needs review.', canCreateAsset(me()) ? btn('Create asset', 'asset-new', 'primary', '', 'plus') : '') +
  statStrip([['Approved', nA('Approved'), 'ok', 'Ready to use', 'astat', 'Approved'], ['In review', nA('In Review'), 'warn', 'With MLR reviewers', 'astat', 'In Review'], ['Changes requested', nA('Changes Requested'), 'warn', 'Back with marketing', 'astat', 'Changes Requested'], ['Needs update', S.assets.filter(isOut).length, 'bad', 'Uses an older module version', 'astat', 'outdated'], ['Draft', nA('Draft') + nA('Awaiting Senior submit'), 'dim', 'Being assembled', 'astat', 'Draft']]) +
  `<div class="toolbar">${searchBox('aq', F('aq'), 'Search assets')}${sel('astat', F('astat'), ['Draft', 'Awaiting Senior submit', 'In Review', 'Changes Requested', 'Approved', 'Rejected'], 'All statuses')}<span class="muted" style="margin-left:auto">${rows.length} assets</span></div>
  <section class="panel table-wrap">${rows.length ? `<table class="tbl list-tbl"><thead><tr><th>Asset</th><th>Product</th><th>Market · channel</th><th>Content</th><th>Status</th><th>Owner</th></tr></thead><tbody>${rows.map(a => { const nNew = a.blocks.filter(b => b.kind === 'new').length; const outdated = a.blocks.some(b => { const mm = modById(b.moduleId); return mm && live(mm) && b.v < live(mm).v; });
    return `<tr class="click" ${goAttr(assetTarget(a), a.id)} tabindex="0"><td><div class="cell-title"><span class="type-ico">${icon('layers', 'sm')}</span><div><div class="title">${esc(a.name)}</div><span class="mono muted">${a.id} · ${esc(a.type)}</span></div></div></td><td class="nw">${esc(product(a.product).name)}</td><td class="nw">${esc(market(a.market).name)}<br><span class="muted" style="font-size:12px">${esc(a.channel)}</span></td><td><div class="content-mix"><span><span class="k-dot ok"></span>${a.blocks.length - nNew} approved</span>${nNew ? `<span><span class="k-dot warn"></span>${nNew} new text</span>` : ''}${outdated ? `<span><span class="k-dot bad"></span>Older version</span>` : ''}</div></td><td>${chip(a.status)}</td><td>${userCell(a.owner)}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty"><h4>No assets</h4></div>'}</section>`;
}
const assetTarget = a => (['Draft', 'Changes Requested'].includes(a.status) && canCreateAsset(me())) ? 'assemble' : (a.review && canActOn(me(), a) ? 'asset-review' : 'asset');

function blockHTML(a, b, i, editable, reviewMode) {
  if (b.kind === 'new') return `<div class="block new" ${editable ? `draggable="true" data-drag="blk" data-i="${i}"` : ''}><div class="meta">${editable ? `<span class="grip" aria-hidden="true">${icon('grip', 'sm')}</span>` : ''}${icon('edit', 'sm')}${b.approved ? 'Content approved in this asset' : 'New content · not an approved module'}${editable ? blockTools(i, a) : ''}</div><div class="txt">${esc(b.text)}</div>${reviewMode ? `<div class="checks"><span class="x">${icon('alert', 'sm')} Requires your review</span></div>` : ''}</div>`;
  const m = modById(b.moduleId); const v = ver(m, b.v) || latest(m); const el = eligibility(m, a); const lv = live(m); const outdated = lv && b.v < lv.v;
  const k = { 'Headline': 'k-headline', 'CTA': 'k-cta', 'Safety Statement': 'k-safety' }[m.type] || '';
  return `<div class="block approved ${k}" ${editable ? `draggable="true" data-drag="blk" data-i="${i}"` : ''}><div class="meta">${editable ? `<span class="grip" aria-hidden="true">${icon('grip', 'sm')}</span>` : ''}${icon('lock', 'sm')}${reviewMode ? 'Approved content · locked' : esc(m.type)} · <span class="mono" style="text-transform:none">${m.id} v${b.v}</span>${outdated ? `<span class="chip warn">v${lv.v} available</span>` : ''}${editable ? blockTools(i, a) : ''}</div><div class="txt">${esc(v.body)}</div>
  <div class="checks">${el.checks.map(c => `<span class="${c[1] ? '' : 'x'}">${icon(c[1] ? 'check' : 'x', 'sm')} ${esc(c[0])}</span>`).join('')}${outdated && canCreateAsset(me()) && !reviewMode ? `<button class="btn sm" data-act="replace-version" data-asset="${a.id}" data-module="${m.id}">Replace with v${lv.v}</button>` : ''}</div></div>`;
}
function blockTools(i, a) { return `<span class="tools"><button data-act="blk-move" data-i="${i}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up', 'sm')}</button><button data-act="blk-move" data-i="${i}" data-dir="1" aria-label="Move down" ${i === a.blocks.length - 1 ? 'disabled' : ''}>${icon('down', 'sm')}</button><button data-act="blk-del" data-i="${i}" aria-label="Remove">${icon('trash', 'sm')}</button></span>`; }
function sheet(a, editable, reviewMode) {
  return `<div class="sheet" ${editable ? `data-drop="sheet" data-id="${a.id}"` : ''}><div class="sheet-head"><img src="${LOGO}" alt="SAJA"><span class="muted" style="font-size:12px;font-weight:700">${esc(a.type)} · ${esc(market(a.market).name)} · ${esc(a.channel)}</span></div>
  ${a.blocks.length ? a.blocks.map((b, i) => blockHTML(a, b, i, editable, reviewMode)).join('') : `<div class="drop-hint">${icon('layers')}<b>${editable ? 'Drag approved modules here' : 'No content yet'}</b>${editable ? '<span>or click a module on the left to add it</span>' : ''}</div>`}
  <div style="padding:10px 18px 16px;font-size:11px;color:var(--ink-3)">For healthcare professionals in ${esc(market(a.market).name)}. Fictional demo content.</div></div>`;
}
function assetValidation(a) {
  const mods = a.blocks.filter(b => b.kind === 'module').map(b => ({ b, m: modById(b.moduleId) }));
  const bad = mods.filter(x => !eligibility(x.m, a).ok); const nNew = a.blocks.filter(b => b.kind === 'new').length;
  return { mods, bad, nNew, empty: !a.blocks.length, okAll: !bad.length && a.blocks.length > 0 };
}
function viewAssemble() {
  const a = assetById(UI.route.p.id); if (!a) return viewMissing('Asset');
  const u = me(); const V = assetValidation(a); const q = F('asq').toLowerCase(); const tf = F('astf');
  const avail = S.modules.filter(m => live(m) && !m.archived && m.product === a.product && (!q || (m.title + live(m).body).toLowerCase().includes(q)) && (!tf || m.type === tf));
  const inAsset = id => a.blocks.some(b => b.moduleId === id);
  const wf = wfById(assetWorkflow(a));
  return pageHead(esc(a.name), `<span class="row" style="gap:8px">${chip(a.status)}<span class="mono">${a.id}</span><span class="muted">·</span>${esc(a.type)}<span class="muted">·</span>${esc(product(a.product).name)}</span>`, `${goBtn('Preview', 'asset', a.id, '', 'eye')}${btn('Save draft', 'asset-save', '', `data-id="${a.id}"`, 'check')}${btn(u.type === 'Marketing User' && u.seniority === 'Junior' ? 'Send to Senior Marketing' : 'Submit for review', 'asset-submit', 'primary', `data-id="${a.id}"`, 'send')}`, [['Assets', 'assets'], [a.id, 'asset', a.id], ['Assembly']]) +
  (a.status === 'Changes Requested' ? `<div class="banner warn" style="margin-bottom:14px">${icon('undo')}<div class="txt"><b>Changes requested</b><p>“${esc(a.changes || '')}”</p></div></div>` : '') +
  `<div class="assembly">
   <section class="panel"><div class="panel-head"><h3>Approved modules</h3><span class="chip plain">${avail.length}</span></div>
    <div style="padding:12px 12px 0" class="stack"><div class="toolbar" style="margin:0">${searchBox('asq', F('asq'), 'Search modules')}</div><select class="select" style="height:36px" data-filter="astf" aria-label="Module type">${opt('', tf, 'All module types')}${S.moduleTypes.map(t => opt(t, tf)).join('')}</select>
    <button class="btn" data-act="new-text" data-id="${a.id}">${icon('plus', 'sm')}Add new text</button></div>
    <div class="lib-list">${avail.map(m => { const el = eligibility(m, a); const added = inAsset(m.id); return `<button class="lib-item" data-act="blk-add" data-id="${a.id}" data-module="${m.id}" ${!el.ok || added ? 'disabled' : `draggable="true" data-drag="mod" title="Drag onto the asset, or click to add"`}><div class="row nowrap" style="gap:8px"><span class="tag">${esc(m.type)}</span><span class="mono muted">v${live(m).v}</span>${added ? '<span class="chip ok plain" style="margin-left:auto">Added</span>' : el.ok ? `<span style="margin-left:auto;color:var(--accent)">${icon('plus', 'sm')}</span>` : ''}</div><b style="font-size:13px">${esc(m.title)}</b><span class="muted" style="font-size:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(live(m).body)}</span>${!el.ok ? `<span class="why">${icon('x', 'sm')} Not eligible: ${esc(el.reason)}</span>` : ''}</button>`; }).join('') || '<p class="muted" style="padding:8px">No modules match.</p>'}</div></section>
   <div class="canvas">${sheet(a, true, false)}</div>
   <section class="panel props"><div class="panel-head"><h3>Asset properties</h3></div><div class="panel-body form">
     <div class="field"><label for="ap-name">Asset name</label><input class="input" id="ap-name" data-asset-prop="name" data-id="${a.id}" value="${esc(a.name)}"></div>
     <div class="field"><label for="ap-type">Asset type</label><select class="select" id="ap-type" data-asset-prop="type" data-id="${a.id}">${S.materialTypes.map(t => opt(t.name, a.type)).join('')}</select></div>
     <div class="field"><label for="ap-mkt">Market</label><select class="select" id="ap-mkt" data-asset-prop="market" data-id="${a.id}">${S.markets.map(x => opt(x.id, a.market, x.name)).join('')}</select></div>
     <div class="field"><label for="ap-ch">Channel</label><select class="select" id="ap-ch" data-asset-prop="channel" data-id="${a.id}">${S.channels.map(c => opt(c, a.channel)).join('')}</select></div>
     <div class="field"><label for="ap-aud">Audience</label><select class="select" id="ap-aud" data-asset-prop="audience" data-id="${a.id}">${S.audiences.map(c => opt(c, a.audience)).join('')}</select></div>
     <div class="stack" style="gap:8px"><span class="section-title">Validation</span>
       <div class="check-row">${V.empty ? `<span class="no">${icon('x', 'sm')}</span>No content yet` : `<span class="ok">${icon('check', 'sm')}</span>${V.mods.length} approved module${V.mods.length === 1 ? '' : 's'}`}</div>
       ${['Approved', 'Market eligible', 'Channel eligible', 'Not expired'].map((lbl, k) => { const fails = V.mods.filter(x => !eligibility(x.m, a).checks[k][1]); return `<div class="check-row">${fails.length ? `<span class="no">${icon('x', 'sm')}</span>${esc(lbl)} — ${fails.length} module${fails.length > 1 ? 's' : ''} fail` : `<span class="ok">${icon('check', 'sm')}</span>${esc(lbl)}`}</div>`; }).join('')}
     </div>
     ${V.nNew ? `<div class="banner warn">${icon('alert')}<div class="txt"><b>New content detected</b><p>${V.nNew} block${V.nNew > 1 ? 's are' : ' is'} not based on an approved module and require${V.nNew > 1 ? '' : 's'} additional MLR review.</p></div></div>` : ''}
     <div class="stack" style="gap:6px"><span class="section-title">Review route</span><b>${esc(wf.name)}</b><div class="wf-inline">${wf.steps.map((s, i) => `<span class="wf-pill">${fnBadge(s.fn)}${isNotify(s) ? 'Email' : esc(s.fn) + ' ' + sen(s.seniority)}</span>${i < wf.steps.length - 1 ? '<span class="wf-sep"></span>' : ''}`).join('')}</div></div>
   </div></section></div>`;
}
function viewAsset() {
  const a = assetById(UI.route.p.id); if (!a) return viewMissing('Asset');
  const u = me(); const V = assetValidation(a); const outdated = a.blocks.filter(b => { const m = modById(b.moduleId); return m && live(m) && b.v < live(m).v; });
  let actions = '';
  if (a.review && canActOn(u, a)) actions += goBtn('Open review', 'asset-review', a.id, 'primary', 'shieldcheck');
  if (canCreateAsset(u) && ['Draft', 'Changes Requested'].includes(a.status)) actions += goBtn('Edit in assembly', 'assemble', a.id, 'primary', 'edit');
  if (u.type === 'Marketing User' && u.seniority === 'Senior' && a.status === 'Awaiting Senior submit') actions += goBtn('Edit in assembly', 'assemble', a.id, '', 'edit') + btn('Submit for review', 'asset-submit', 'primary', `data-id="${a.id}"`, 'send');
  const wf = a.review ? wfById(a.review.wf) : wfById(assetWorkflow(a));
  return pageHead(esc(a.name), `<span class="row" style="gap:8px">${chip(a.status)}<span class="mono">${a.id}</span><span class="muted">·</span>${esc(a.type)}<span class="muted">·</span>${esc(market(a.market).name)}<span class="muted">·</span>${esc(a.channel)}</span>`, actions, [['Assets', 'assets'], [a.id]]) +
  (outdated.length ? `<div class="banner warn" style="margin-bottom:14px">${icon('alert')}<div class="txt"><b>${outdated.length} module${outdated.length > 1 ? 's have' : ' has'} a newer approved version</b><p>Replace the outdated version below. Swapping in a newer approved version of the same module does not need a new review.</p></div></div>` : '') +
  (a.review ? `<div class="banner pending" style="margin-bottom:14px">${icon('shieldcheck')}<div class="txt"><b>In review · ${esc(stepLabel(curStep(a)))}</b><p>Assigned to ${assigneeFor(curStep(a)).map(x => esc(x.name)).join(', ')}.</p></div>${!canActOn(u, a) && assigneeFor(curStep(a))[0] ? `<button class="btn sm" data-act="persona" data-id="${assigneeFor(curStep(a))[0].id}" data-then="asset-review" data-target="${a.id}">Switch to ${esc(assigneeFor(curStep(a))[0].name)}</button>` : ''}</div>` : '') +
  `<div class="grid cols-main"><div class="canvas">${sheet(a, false, false)}</div><div class="stack">
  <section class="panel"><div class="panel-head"><h3>Summary</h3></div><div class="panel-body"><dl class="kv" style="grid-template-columns:110px 1fr"><dt>Product</dt><dd>${esc(product(a.product).name)}</dd><dt>Market</dt><dd>${esc(market(a.market).name)}</dd><dt>Channel</dt><dd>${esc(a.channel)}</dd><dt>Audience</dt><dd>${esc(a.audience)}</dd><dt>Content</dt><dd>${V.mods.length} approved modules${V.nNew ? ', ' + V.nNew + ' new' : ''}</dd><dt>Owner</dt><dd>${esc(user(a.owner).name)}</dd>${a.approvedAt ? `<dt>Approved</dt><dd>${fmtD(a.approvedAt)}</dd>` : ''}</dl></div></section>
  <section class="panel"><div class="panel-head"><h3>Review route</h3><span class="muted" style="font-size:12px">${esc(wf.name)}</span></div><div class="panel-body">${wfProgress(a, false)}</div></section>
  <section class="panel"><div class="panel-head"><h3>History</h3></div><div class="panel-body">${viewTimeline(S.audit.filter(e => e.objId === a.id).sort((x, y) => y.ts - x.ts))}</div></section></div></div>`;
}
function viewAssetReview() {
  const a = assetById(UI.route.p.id); if (!a) return viewMissing('Asset');
  if (!a.review) return pageHead(esc(a.name), 'This asset is not in review.', goBtn('Open asset', 'asset', a.id, 'primary'), [['My Tasks', 'tasks'], [a.id]]);
  const u = me(); const mine = canActOn(u, a); const V = assetValidation(a); const st = curStep(a);
  return pageHead(esc(a.name), `<span class="row" style="gap:8px">${chip('In Review')}<span class="mono">${a.id}</span></span>`, mine ? decisionButtons(a, 'Asset') : '', [['My Tasks', 'tasks'], [a.id, 'asset', a.id], ['Review']]) +
  (!mine ? `<div class="banner info" style="margin-bottom:14px">${icon('eye')}<div class="txt"><b>View only — assigned to the ${esc(st.seniority)} ${esc(REVIEWER_OF[st.fn])}</b></div><button class="btn sm" data-act="persona" data-id="${(assigneeFor(st)[0] || {}).id}" data-then="asset-review" data-target="${a.id}">Switch to ${esc((assigneeFor(st)[0] || {}).name || '')}</button></div>` : '') +
  `<div class="stack" style="margin-bottom:16px">${authorityBanner(a)}<div class="row"><span class="chip ok">${V.mods.length} approved module${V.mods.length === 1 ? '' : 's'} · locked</span>${V.nNew ? `<span class="chip warn">${V.nNew} new content block${V.nNew > 1 ? 's' : ''} · review required</span>` : '<span class="chip plain">No new content</span>'}</div></div>
  <div class="grid cols-main"><div class="canvas">${sheet(a, false, true)}</div><div class="stack">
  <section class="panel"><div class="panel-head"><h3>What you are approving</h3></div><div class="panel-body stack" style="gap:10px"><div class="check-row"><span class="ok">${icon('check', 'sm')}</span>Approved modules are already MLR-approved and locked — their wording cannot change.</div><div class="check-row"><span class="no">${icon('alert', 'sm')}</span>${V.nNew ? 'Review the new content blocks highlighted in amber.' : 'No new content — check placement and context only.'}</div><div class="check-row"><span class="ok">${icon('check', 'sm')}</span>All modules eligible for ${esc(market(a.market).name)} · ${esc(a.channel)}</div></div></section>
  <section class="panel"><div class="panel-head"><h3>Workflow progress</h3></div><div class="panel-body">${wfProgress(a, false)}</div></section>
  <section class="panel"><div class="panel-head"><h3>Review history</h3></div><div class="panel-body">${commentsList(a.review.comments)}</div></section></div></div>`;
}

/* ===== Lifecycle ===== */
function viewLifecycle() {
  const stage = F('life', 'Expiring');
  const count = s => s === 'Superseded' ? S.modules.filter(m => m.versions.some(v => v.status === 'Superseded')).length : S.modules.filter(m => { const ls = lifeStatus(m); return s === 'Draft' ? ['Draft', 'Awaiting Senior submit', 'Changes Requested', 'Rejected'].includes(ls) : ls === s; }).length;
  const rows = stage === 'Superseded' ? S.modules.filter(m => m.versions.some(v => v.status === 'Superseded')) : S.modules.filter(m => { const ls = lifeStatus(m); return stage === 'Draft' ? ['Draft', 'Awaiting Senior submit', 'Changes Requested', 'Rejected'].includes(ls) : ls === stage; });
  const upcoming = S.modules.filter(m => m.expiry && !m.archived && live(m) && daysTo(m.expiry) <= 120).sort((a, b) => a.expiry - b.expiry);
  const impactedAll = S.modules.map(m => [m, impactedAssets(m)]).filter(x => x[1].length);
  return pageHead('Lifecycle', 'Where every module is in its life — from draft to archive — and what needs attention next.') +
  `<section class="panel" style="margin-bottom:18px"><div class="panel-body"><div class="life" role="tablist" aria-label="Lifecycle stages">${LIFE.map((s, i) => `<button class="life-st ${stage === s ? 'on' : ''}" role="tab" aria-selected="${stage === s}" data-act="set-f" data-k="life" data-v="${s}"><span class="k-dot ${toneOf(s) || 'dim'}"></span>${s} <b class="num">${count(s)}</b></button>${i < LIFE.length - 1 ? `<span class="life-arrow">${icon('chevron', 'sm')}</span>` : ''}`).join('')}</div></div></section>
  ${impactedAll.length ? `<div class="stack" style="margin-bottom:18px">${impactedAll.map(([m, list]) => `<div class="banner warn">${icon('alert')}<div class="txt"><b>${list.length} asset${list.length > 1 ? 's are' : ' is'} using a previous version of ${esc(m.title)}</b><p>v${live(m).v} is approved. ${list.map(a => esc(a.name)).join(' · ')}</p></div>${goBtn('Review impact', 'module', m.id, 'sm', '', ' data-tab="lifecycle"')}</div>`).join('')}</div>` : ''}
  <div class="grid cols-main"><section class="panel table-wrap"><div class="panel-head"><h3>${esc(stage)}</h3><span class="chip plain">${rows.length}</span></div>${rows.length ? `<table class="tbl"><thead><tr><th>Module</th><th>Version</th><th>Status</th><th>Expiry</th><th>Assets</th></tr></thead><tbody>${rows.map(m => `<tr class="click" ${goAttr('module', m.id, ' data-tab="lifecycle"')}><td><div class="cell-title">${typeIco(m.type)}<div><div class="title">${esc(m.title)}</div><span class="mono muted">${m.id}</span></div></div></td><td>${stage === 'Superseded' ? m.versions.filter(v => v.status === 'Superseded').map(v => vtag(v.v)).join(' ') + ' → ' + (live(m) ? vtag(live(m).v) : '') : vtag(latest(m).v)}</td><td>${chip(stage === 'Superseded' ? 'Superseded' : lifeStatus(m))}</td><td class="num">${fmtD(m.expiry)}</td><td class="num">${S.assets.filter(a => a.blocks.some(b => b.moduleId === m.id)).length}</td></tr>`).join('')}</tbody></table>` : `<div class="empty"><p>No modules in this stage.</p></div>`}</section>
  <section class="panel"><div class="panel-head"><h3>Upcoming expiries</h3></div>${upcoming.length ? upcoming.map(m => `<button class="task" ${goAttr('module', m.id, ' data-tab="lifecycle"')}><span class="body"><b>${esc(m.title)}</b><span>${fmtD(m.expiry)} · ${daysTo(m.expiry) < 0 ? 'expired' : daysTo(m.expiry) + ' days'}</span></span>${chip(lifeStatus(m))}</button>`).join('') : '<div class="empty"><p>Nothing expires in the next 120 days.</p></div>'}</section></div>`;
}

/* ===== Audit ===== */
function viewAudit() {
  S.demo.sawAudit = true;
  const q = F('uq').toLowerCase();
  const rows = [...S.audit].sort((a, b) => b.ts - a.ts).filter(e => { const x = user(e.user); return (!q || (x.name + e.action + e.objId + e.note + (modById(e.objId) || assetById(e.objId) || {}).title).toLowerCase().includes(q)) && (!F('utype') || x.type === F('utype')) && (!F('usen') || (F('usen') === 'None' ? !x.seniority : x.seniority === F('usen'))) && (!F('uobj') || e.objType === F('uobj')); });
  const name = e => { const o = e.objType === 'Asset' ? assetById(e.objId) : modById(e.objId); return o ? (o.title || o.name) : e.objId; };
  return pageHead('Audit Trail', 'Every action, with the person’s role and seniority at the time. Entries cannot be edited or deleted.') +
  `<div class="toolbar">${searchBox('uq', F('uq'), 'Search people, actions or objects')}${sel('utype', F('utype'), USER_TYPES, 'All user types')}${sel('usen', F('usen'), ['Junior', 'Senior', 'None'], 'Any seniority')}${sel('uobj', F('uobj'), ['Module', 'Asset', 'User', 'Workflow'], 'All objects')}<span class="muted" style="margin-left:auto">${rows.length} events</span></div>
  <section class="panel table-wrap"><table class="tbl list-tbl"><thead><tr><th>When</th><th>Person</th><th>Action</th><th>Object</th><th>Version</th></tr></thead><tbody>${rows.map(e => { const x = user(e.user); const link = e.objType === 'Module' ? 'module' : e.objType === 'Asset' ? 'asset' : e.objType === 'User' ? 'user' : e.objType === 'Workflow' ? 'workflow' : null;
    return `<tr ${link && (link !== 'user' && link !== 'workflow' || isAdmin(me())) ? `class="click" ${goAttr(link, e.objId)}` : ''}><td class="nw"><b class="num">${fmtD(e.ts)}</b><br><span class="muted num" style="font-size:12px">${fmtT(e.ts)}</span></td><td><div class="row nowrap user-cell">${avatar(x, 'sm')}<div><div style="font-weight:700">${esc(x.name)}</div><span class="muted" style="font-size:12px">${esc(x.type)}</span> ${x.seniority ? sen(x.seniority) : ''}</div></div></td><td><span class="act-line">${toneOf(e.action) ? `<span class="k-dot ${toneOf(e.action)}"></span>` : ''}<b>${esc(e.action)}</b></span>${e.note ? `<span class="muted note">“${esc(e.note)}”</span>` : ''}</td><td><div style="font-weight:600">${esc(name(e))}</div><span class="mono muted">${esc(e.objId)}</span></td><td>${e.objType === 'Module' ? vtag(e.version) : '—'}</td></tr>`; }).join('')}</tbody></table></section>`;
}

/* ===== Reports ===== */
function chartCard(key, title, sub, chart, rows, cols, legend) {
  const mode = F('rv-' + key) || 'chart';
  return `<section class="panel chart-card"><div class="panel-head"><div class="ch-title"><h3>${title}</h3>${sub ? `<span class="muted">${sub}</span>` : ''}</div><span class="grow"></span><div class="seg sm" role="tablist" aria-label="${esc(title)} view">${['chart', 'table'].map(m => `<button type="button" class="${mode === m ? 'on' : ''}" data-act="rv-mode" data-k="${key}" data-v="${m}" role="tab" aria-selected="${mode === m}">${m === 'chart' ? 'Chart' : 'Table'}</button>`).join('')}</div></div>
  <div class="panel-body">${mode === 'chart' ? (legend || '') + chart : `<div class="table-wrap"><table class="tbl compact"><thead><tr>${cols.map((c, i) => `<th${i ? ' style="text-align:right"' : ''}>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((v, i) => `<td${i ? ' class="num" style="text-align:right"' : ''}>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}</div></section>`;
}
function hbars(rows, max, cls) { return `<div class="hb">${rows.map(r => `<div class="hb-row"><span class="hb-l">${r[0]}</span><span class="hb-track"><span class="hb-bar ${r[2] || cls || ''}" style="width:${max ? Math.max(r[1] ? 1.5 : 0, 100 * r[1] / max) : 0}%" data-tip="${esc(String(r[0]).replace(/<[^>]+>/g, ''))}: ${r[1]}"></span></span><b class="hb-v">${r[1]}</b></div>`).join('')}</div>`; }
function viewReports() {
  const approvedVers = S.modules.flatMap(m => m.versions.filter(v => v.approvedAt && v.approvedAt > Date.now() - 180 * DAY));
  const finals = S.audit.filter(e => /^Final/.test(e.action)).length, changes = S.audit.filter(e => e.action === 'Requested changes').length, rejects = S.audit.filter(e => e.action === 'Rejected').length;
  const outTotal = finals + changes + rejects || 1;
  const reuse = {}; S.assets.forEach(a => a.blocks.forEach(b => { if (b.moduleId) reuse[b.moduleId] = (reuse[b.moduleId] || 0) + 1; }));
  const topReuse = Object.entries(reuse).sort((a, b) => b[1] - a[1]).slice(0, 6); const maxR = topReuse.length ? topReuse[0][1] : 1;
  const stages = LIFE.map(s => [s, s === 'Superseded' ? S.modules.filter(m => m.versions.some(v => v.status === 'Superseded')).length : S.modules.filter(m => { const ls = lifeStatus(m); return s === 'Draft' ? ['Draft', 'Awaiting Senior submit', 'Changes Requested', 'Rejected'].includes(ls) : ls === s; }).length]); const maxS = Math.max(1, ...stages.map(x => x[1]));
  const byRole = ['Medical', 'Legal', 'Regulatory'].map(fn => [fn, ['Junior', 'Senior'].map(sn => S.audit.filter(e => { const x = user(e.user); return x.type === REVIEWER_OF[fn] && x.seniority === sn; }).length)]); const maxB = Math.max(1, ...byRole.flatMap(x => x[1]));
  const blocks = S.assets.reduce((n, a) => n + a.blocks.filter(b => b.kind === 'module').length, 0);
  const inRev = S.modules.filter(m => m.review).length + S.assets.filter(a => a.review).length;
  const outcomes = [['Approved', finals, 'ok', 'check'], ['Changes requested', changes, 'warn', 'clock'], ['Rejected', rejects, 'bad', 'x']];
  const kpi = (v, l, s, tone) => `<div class="kpi static"><span class="k-label">${tone ? `<span class="k-dot ${tone}"></span>` : ''}${l}</span><b>${v}</b><span class="k-sub">${s}</span></div>`;
  return pageHead('Reports', 'How content moves through review and how much of it is reused. Figures update as you use the prototype.') +
  `<div class="kpis" style="margin-bottom:18px">${kpi(approvedVers.length, 'Versions approved', 'Last 180 days', 'ok')}${kpi(Math.round(100 * finals / outTotal) + '%', 'Approval rate', finals + ' of ' + (finals + changes + rejects) + ' final decisions', '')}${kpi(blocks, 'Module reuses', 'Approved modules placed in assets', '')}${kpi(inRev, 'In review now', 'Modules and assets', 'warn')}</div>
  <div class="reports-grid">
  ${chartCard('outcome', 'Review outcomes', 'Final decisions across all reviews', `<div class="sbar" role="img" aria-label="${outcomes.map(o => o[0] + ' ' + o[1]).join(', ')}">${outcomes.filter(o => o[1]).map(o => `<span class="${o[2]}" style="flex:${o[1]}" data-tip="${o[0]} · ${o[1]} (${Math.round(100 * o[1] / outTotal)}%)"></span>`).join('')}</div>
    <div class="sb-legend">${outcomes.map(o => `<div><span class="lg-key ${o[2]}">${icon(o[3], 'sm')}</span><span>${o[0]}</span><b>${o[1]}</b><span class="pct mono">${Math.round(100 * o[1] / outTotal)}%</span></div>`).join('')}</div>`, outcomes.map(o => [o[0], o[1], Math.round(100 * o[1] / outTotal) + '%']), ['Outcome', 'Decisions', 'Share'])}
  ${chartCard('stage', 'Modules by lifecycle stage', 'Current stage of every module', hbars(stages, maxS, 's1'), stages.map(s => [s[0], s[1]]), ['Stage', 'Modules'])}
  ${chartCard('role', 'Review actions by function', 'Junior and Senior reviewers', `<div class="hb grouped">${byRole.map(([fn, v]) => `<div class="hb-group"><span class="hb-gl">${fnBadge(fn, 'sm')}${fn}</span>${hbars([['Junior', v[0], 'o1'], ['Senior', v[1], 'o2']], maxB)}</div>`).join('')}</div>`, byRole.map(([fn, v]) => [fn, v[0], v[1]]), ['Function', 'Junior', 'Senior'], `<div class="legend"><span><i class="o1"></i>Junior</span><span><i class="o2"></i>Senior</span></div>`)}
  ${chartCard('reuse', 'Most reused modules', 'Times placed in an asset', hbars(topReuse.map(([id, n]) => { const m = modById(id); return [`<button class="linklike" ${goAttr('module', id)}>${esc(m ? m.title : id)}</button>`, n]; }), maxR, 's1'), topReuse.map(([id, n]) => { const m = modById(id); return [esc(m ? m.title : id), n]; }), ['Module', 'Reuses'])}
  </div>`;
}

/* ===== Administration ===== */
function viewUsers() {
  const q = F('usq').toLowerCase();
  const rows = S.users.filter(x => (!q || (x.name + x.email).toLowerCase().includes(q)) && (!F('ust') || x.type === F('ust')) && (!F('uss') || (F('uss') === 'None' ? !x.seniority : x.seniority === F('uss'))) && (!F('usst') || x.status === F('usst')));
  const nT = t => S.users.filter(x => x.type === t && x.status === 'Active').length;
  return pageHead('Users', 'People, their user type and seniority. Seniority sets approval authority; workflows decide where each level takes part.', goBtn('Create user', 'user-new', null, 'primary', 'plus')) +
  statStrip([['Content owners', nT('Content Owner'), '', 'Active', 'ust', 'Content Owner'], ['Medical', nT('Medical Reviewer'), '', 'Reviewers', 'ust', 'Medical Reviewer'], ['Legal', nT('Legal Reviewer'), '', 'Reviewers', 'ust', 'Legal Reviewer'], ['Regulatory', nT('Regulatory Reviewer'), '', 'Reviewers', 'ust', 'Regulatory Reviewer'], ['Marketing', nT('Marketing User'), '', 'Active', 'ust', 'Marketing User'], ['Inactive', S.users.filter(x => x.status !== 'Active').length, 'dim', 'Cannot sign in', 'usst', 'Inactive']]) +
  `<div class="toolbar">${searchBox('usq', F('usq'), 'Search name or email')}${sel('ust', F('ust'), USER_TYPES, 'All user types')}${sel('uss', F('uss'), ['Junior', 'Senior', 'None'], 'Any seniority')}${sel('usst', F('usst'), ['Active', 'Inactive'], 'Any status')}<span class="muted" style="margin-left:auto">${rows.length} of ${S.users.length}</span></div>
  <section class="panel table-wrap"><table class="tbl list-tbl"><thead><tr><th>Name</th><th>User type</th><th>Team</th><th>Approval authority</th><th>Status</th></tr></thead><tbody>${rows.map(x => { const a = authority(x.type, x.seniority);
    return `<tr class="click" ${goAttr('user', x.id)} tabindex="0"><td><div class="row nowrap">${avatar(x)}<div><div class="title">${esc(x.name)}</div><span class="muted email">${esc(x.email)}</span></div></div></td><td><div class="row nowrap" style="gap:6px">${esc(x.type)} ${x.seniority ? sen(x.seniority) : ''}</div></td><td class="nw">${esc(team(x.team).name)}</td><td style="font-size:12.5px"><span class="row nowrap" style="gap:6px">${icon(a.final ? 'key' : 'eye', 'sm')}${esc(a.short)}</span></td><td>${chip(x.status === 'Active' ? 'Active' : 'Inactive')}</td></tr>`; }).join('')}</tbody></table></section>`;
}
function viewUser() {
  const x = S.users.find(u => u.id === UI.route.p.id); if (!x) return viewMissing('User');
  const a = authority(x.type, x.seniority); const tasks = tasksFor(x); const acts = S.audit.filter(e => e.user === x.id).sort((p, q) => q.ts - p.ts).slice(0, 6);
  return pageHead(esc(x.name), esc(x.email), `${btn('View as this user', 'persona', '', `data-id="${x.id}" data-then="home"`, 'eye')}${goBtn('Edit', 'user-edit', x.id, '', 'edit')}${btn(x.status === 'Active' ? 'Deactivate' : 'Activate', 'user-status', x.status === 'Active' ? 'danger' : 'primary', `data-id="${x.id}"`)}`, [['Users', 'users'], [x.name]]) +
  `<div class="grid cols-main"><div class="stack"><section class="panel"><div class="panel-body row" style="gap:16px;align-items:flex-start">${avatar(x, 'lg')}<div class="stack" style="gap:8px;flex:1"><div class="row"><b style="font-size:18px">${esc(x.type)}</b>${sen(x.seniority)}${chip(x.status === 'Active' ? 'Active' : 'Archived').replace('Archived', 'Inactive')}</div>
    <div class="banner ${a.final ? 'ok' : ''}" style="${a.final ? '' : 'background:var(--surface-2)'}">${icon(a.final ? 'key' : 'eye')}<div class="txt"><b>${esc(a.short)}${a.final && FUNCTION_OF[x.type] ? ' authority' : ''}</b><p>${esc(a.long)}</p></div></div></div></div></section>
    <section class="panel"><div class="panel-head"><h3>Responsibilities</h3><span class="muted" style="font-size:12px">Derived from user type + seniority</span></div><div class="panel-body stack" style="gap:8px">${responsibilities(x.type, x.seniority).map(([t, on]) => `<div class="check-row"><span class="${on ? 'ok' : 'no'}">${icon(on ? 'check' : 'x', 'sm')}</span><span class="${on ? '' : 'muted'}">${esc(t)}</span></div>`).join('')}</div></section>
    <section class="panel"><div class="panel-head"><h3>Assigned tasks</h3><span class="chip plain">${tasks.length}</span></div>${tasks.length ? tasks.map(t => viewTaskRow(t)).join('') : '<div class="empty"><p>No open tasks.</p></div>'}</section></div>
  <div class="stack"><section class="panel"><div class="panel-head"><h3>Details</h3></div><div class="panel-body"><dl class="kv" style="grid-template-columns:110px 1fr"><dt>User type</dt><dd>${esc(x.type)}</dd><dt>Seniority</dt><dd>${esc(x.seniority || 'Not applicable')}</dd><dt>Team</dt><dd>${esc(team(x.team).name)}</dd><dt>Role</dt><dd>${esc(roleLabel(x))}</dd><dt>Status</dt><dd>${esc(x.status)}</dd></dl></div></section>
  <section class="panel"><div class="panel-head"><h3>Recent activity</h3></div><div class="panel-body">${viewTimeline(acts, true)}</div></section></div></div>`;
}
function viewUserForm() {
  const editId = UI.route.p.id; const x = editId ? S.users.find(u => u.id === editId) : null;
  if (!UI.udraft || UI.udraft._for !== (editId || 'new')) UI.udraft = x ? { _for: editId, name: x.name, email: x.email, type: x.type, seniority: x.seniority || 'Junior', team: x.team, status: x.status } : { _for: 'new', name: '', email: '', type: '', seniority: 'Junior', team: '', status: 'Active' };
  if (UI.udraft.step == null) { UI.udraft.step = 0; UI.udraft.maxStep = x ? USTEPS.length - 1 : 0; UI.udraft.triedSteps = []; }
  const D = UI.udraft; const E = wizErrors(D, USTEPS, validateUser(D, editId)); const err = k => E[k] ? `<span class="err">${E[k]}</span>` : ''; const st = D.step; const hid = i => i === st ? '' : ' hidden';
  const isAdm = D.type === 'Administrator'; const a = D.type ? authority(D.type, isAdm ? null : D.seniority) : null;
  const fnOf = { 'Content Owner': 'Content', 'Medical Reviewer': 'Medical', 'Legal Reviewer': 'Legal', 'Regulatory Reviewer': 'Regulatory', 'Marketing User': 'Marketing', 'Administrator': 'Administration' };
  const teams = S.teams.filter(t => !D.type || t.fn === fnOf[D.type]);
  const title = x ? 'Edit user' : 'Create user';
  return pageHead(title, 'User type and seniority define what this person can review and approve.', '', x ? [['Users', 'users'], [x.name, 'user', x.id], ['Edit']] : [['Users', 'users'], ['Create user']]) +
  wizBar('user', USTEPS, D) + `<form class="grid cols-main ${D.anim ? (D.anim = false, 'wiz-anim') : ''}" data-form="user" novalidate><div class="stack">${wizHead(USTEPS, D)}
  <section class="panel"${hid(0)}><div class="panel-head"><h3>Personal information</h3></div><div class="panel-body fgrid">
    <div class="field"><label for="u-name">Full name</label><input class="input ${E.name ? 'invalid' : ''}" id="u-name" data-u="name" value="${esc(D.name)}" placeholder="e.g. Ahmed Youssef">${err('name')}</div>
    <div class="field"><label for="u-email">Email</label><input class="input ${E.email ? 'invalid' : ''}" id="u-email" type="email" data-u="email" value="${esc(D.email)}" placeholder="name@saja-demo.com">${err('email')}</div>
    <div class="field" style="grid-column:1/-1"><span class="hint">${icon('mail', 'sm')} The person receives an invitation email and sets their own password on first sign-in.</span></div>
  </div></section>
  <section class="panel"${hid(1)}><div class="panel-head"><h3>User type</h3></div><div class="panel-body"><div class="type-cards" role="radiogroup" aria-label="User type">${USER_TYPES.map(t => `<button type="button" class="type-card ${D.type === t ? 'on' : ''}" data-act="u-type" data-v="${t}" role="radio" aria-checked="${D.type === t}"><span class="type-ico">${icon({ 'Content Owner': 'file', 'Medical Reviewer': 'shieldcheck', 'Legal Reviewer': 'book', 'Regulatory Reviewer': 'globe', 'Marketing User': 'layers', 'Administrator': 'key' }[t], 'sm')}</span><span><b>${t}</b><span>${t === 'Administrator' ? 'System configuration' : FUNCTION_OF[t] ? FUNCTION_OF[t] + ' review' : t === 'Content Owner' ? 'Creates modules' : 'Builds assets'}</span></span></button>`).join('')}</div>${err('type')}</div></section>
  ${isAdm ? `<section class="panel"${hid(1)}><div class="panel-body"><div class="banner">${icon('key')}<div class="txt"><b>Administrators have no seniority</b><p>They configure the system and do not take part in content review.</p></div></div></div></section>` : `<section class="panel"${hid(1)}><div class="panel-head"><h3>Seniority</h3></div><div class="panel-body stack"><div class="seg" role="radiogroup" aria-label="Seniority">${['Junior', 'Senior'].map(s => `<button type="button" class="${D.seniority === s ? 'on' : ''}" data-act="u-sen" data-v="${s}" role="radio" aria-checked="${D.seniority === s}">${s}</button>`).join('')}</div><p class="muted" style="font-size:12.5px">${D.type ? (D.seniority === 'Senior' ? 'Senior users hold final approval authority for their function.' : 'Junior users perform the initial review and send items to a Senior.') : 'Choose a user type first.'}</p></div></section>`}
  <section class="panel"${hid(2)}><div class="panel-head"><h3>Team, role & status</h3></div><div class="panel-body fgrid">
    <div class="field"><label for="u-team">Team</label><select class="select ${E.team ? 'invalid' : ''}" id="u-team" data-u="team">${opt('', D.team, 'Select team')}${teams.map(t => opt(t.id, D.team, t.name)).join('')}</select>${err('team')}</div>
    <div class="field"><span class="label">Role</span><div class="input" style="display:flex;align-items:center;background:var(--surface-2)">${D.type ? esc(isAdm ? 'Administrator' : D.seniority + ' ' + D.type) : '<span class="muted">Set by user type and seniority</span>'}</div></div>
    <div class="field"><span class="label">Status</span><div class="seg">${['Active', 'Inactive'].map(s => `<button type="button" class="${D.status === s ? 'on' : ''}" data-act="u-status" data-v="${s}">${s}</button>`).join('')}</div></div>
  </div></section>
  ${st === USTEPS.length - 1 ? `${D.tried && Object.keys(E).length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${Object.keys(E).length} field${Object.keys(E).length > 1 ? 's need' : ' needs'} attention</b><p>Use Edit to go back to that step.</p></div></div>` : ''}
  ${sumGroup('user', 0, 'Personal details', sumRow('Name', esc(D.name)) + sumRow('Email', esc(D.email)))}
  ${sumGroup('user', 1, 'Type & seniority', sumRow('User type', esc(D.type)) + sumRow('Seniority', isAdm ? 'Not applicable' : D.type ? sen(D.seniority) : ''))}
  ${sumGroup('user', 2, 'Team & status', sumRow('Team', D.team ? esc((S.teams.find(t => t.id === D.team) || {}).name) : '') + sumRow('Status', esc(D.status)))}` : ''}
  ${wizFoot('user', USTEPS, D, x ? goAttr('user', x.id) : goAttr('users'), x ? 'Save changes' : 'Create user & send invite')}</div>
  <aside class="stack" style="position:sticky;top:84px"><section class="panel"><div class="panel-head"><h3>Authority preview</h3></div><div class="panel-body stack">${a ? `<div class="row"><b>${esc(D.type)}</b>${isAdm ? '' : sen(D.seniority)}</div><div class="banner ${a.final ? 'ok' : ''}" style="${a.final ? '' : 'background:var(--surface-2)'}">${icon(a.final ? 'key' : 'eye')}<div class="txt"><b>${esc(a.short)}</b><p>${esc(a.long)}</p></div></div><div class="stack" style="gap:6px">${responsibilities(D.type, isAdm ? null : D.seniority).map(([t, on]) => `<div class="check-row"><span class="${on ? 'ok' : 'no'}">${icon(on ? 'check' : 'x', 'sm')}</span><span class="${on ? '' : 'muted'}">${esc(t)}</span></div>`).join('')}</div>` : '<p class="muted">Choose a user type to see what this person will be able to do.</p>'}</div></section>
</aside></form>`;
}
function validateUser(D, editId) {
  const e = {};
  if (!D.name.trim()) e.name = 'Enter the full name.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(D.email)) e.email = 'Enter a valid email address.';
  else if (S.users.some(u => u.email.toLowerCase() === D.email.toLowerCase() && u.id !== editId)) e.email = 'A user with this email already exists.';
  if (!D.type) e.type = 'Choose a user type.';
  if (!D.team) e.team = 'Select a team.';
  return e;
}
function viewTeams() {
  return pageHead('Teams', 'Teams group people by function. Workflow steps are assigned to a team and a seniority level.', btn('Add team', 'team-new', 'primary', '', 'plus')) +
  `<section class="panel table-wrap"><table class="tbl"><thead><tr><th>Team</th><th>Function</th><th>Members</th><th>Seniority mix</th></tr></thead><tbody>${S.teams.map(t => { const mem = S.users.filter(x => x.team === t.id); return `<tr><td class="title">${esc(t.name)}</td><td>${esc(t.fn)}</td><td><div class="row" style="gap:4px">${mem.map(x => isAdmin(me()) ? `<button class="btn ghost sm" style="padding:0 6px" ${goAttr('user', x.id)}>${avatar(x, 'sm')}${esc(x.name.split(' ')[0])}</button>` : '').join('') || '<span class="muted">No members</span>'}</div></td><td>${mem.filter(x => x.seniority === 'Senior').length} Senior · ${mem.filter(x => x.seniority === 'Junior').length} Junior</td></tr>`; }).join('')}</tbody></table></section>`;
}
function viewRoles() {
  return pageHead('Roles', 'A role is a user type plus a seniority level. Authority comes from the role; workflows decide where each role takes part.') +
  `<div class="grid cols-2">${USER_TYPES.map(t => { const lvls = t === 'Administrator' ? [null] : ['Junior', 'Senior'];
    return `<section class="panel"><div class="panel-head"><h3>${esc(t)}</h3><span class="chip plain">${S.users.filter(x => x.type === t).length} people</span></div><div class="panel-body grid" style="grid-template-columns:repeat(${lvls.length},minmax(0,1fr));gap:12px">${lvls.map(l => { const a = authority(t, l); return `<div class="stack" style="gap:8px;padding:12px;border-radius:12px;border:1px solid var(--line);background:${l === 'Senior' ? 'var(--surface-2)' : 'var(--surface)'}"><div class="row">${l ? sen(l) : '<span class="tag">No seniority</span>'}</div><b style="font-size:13px">${esc(a.short)}</b>${responsibilities(t, l).map(([x, on]) => `<div class="check-row" style="font-size:12.5px"><span class="${on ? 'ok' : 'no'}">${icon(on ? 'check' : 'x', 'sm')}</span><span class="${on ? '' : 'muted'}">${esc(x)}</span></div>`).join('')}</div>`; }).join('')}</div></section>`; }).join('')}</div>`;
}
function simpleTable(title, sub, addAct, cols, rows) { return pageHead(title, sub, addAct ? btn('Add', addAct, 'primary', '', 'plus') : '') + `<section class="panel table-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></section>`; }
function viewProducts() { return simpleTable('Products', 'Products and their indications. Modules are always linked to one product.', 'product-new', ['Product', 'Therapy area', 'Indications', 'Modules', 'Status', ''], S.products.map(p => `<tr><td class="title">${esc(p.name)}</td><td>${esc(p.area)}</td><td>${p.indications.map(i => `<span class="tag">${esc(i)}</span>`).join(' ')}</td><td class="num">${S.modules.filter(m => m.product === p.id).length}</td><td>${chip(p.status === 'Active' ? 'Active' : 'Archived').replace('Archived', 'Inactive')}</td><td><button class="btn sm" data-act="toggle-prod" data-id="${p.id}">${p.status === 'Active' ? 'Deactivate' : 'Activate'}</button></td></tr>`)); }
function viewMarkets() { return simpleTable('Countries & Markets', 'Markets a module can be approved for. Asset eligibility checks the asset market against each module.', 'market-new', ['Market', 'Code', 'Health authority', 'Languages', 'Approved modules', 'Status', ''], S.markets.map(m => `<tr><td class="title">${esc(m.name)}</td><td><span class="tag">${m.id}</span></td><td>${esc(m.authority)}</td><td>${esc(m.lang)}</td><td class="num">${S.modules.filter(x => live(x) && x.markets.includes(m.id)).length}</td><td>${chip(m.active ? 'Active' : 'Archived').replace('Archived', 'Inactive')}</td><td><button class="btn sm" data-act="toggle-mkt" data-id="${m.id}">${m.active ? 'Deactivate' : 'Activate'}</button></td></tr>`)); }
function viewMaterials() { return simpleTable('Material Types', 'Asset types, their channel and the workflow they follow.', 'material-new', ['Material type', 'Channel', 'Workflow', 'Assets'], S.materialTypes.map(t => `<tr><td class="title">${esc(t.name)}</td><td>${esc(t.channel)}</td><td>${isAdmin(me()) ? `<button class="btn ghost sm" ${goAttr('workflow', t.workflow)}>${esc((wfById(t.workflow) || {}).name || t.workflow)}</button>` : esc((wfById(t.workflow) || {}).name)}</td><td class="num">${S.assets.filter(a => a.type === t.name).length}</td></tr>`)); }

/* ===== Workflows ===== */
function viewWorkflows() {
  const list = S.workflows.filter(w => !w.hidden);
  const inflight = w => S.modules.filter(m => m.review && m.review.wf === w.id).length + S.assets.filter(a => a.review && a.review.wf === w.id).length;
  return pageHead('Workflows', 'Review routes. Each step names a function, a seniority level and whether it is a review or the final approval.', btn('New workflow', 'wf-new', 'primary', '', 'plus')) +
  `<section class="panel table-wrap"><table class="tbl"><thead><tr><th>Workflow</th><th>Applies to</th><th>Review flow</th><th>Steps</th><th>In flight</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>
  ${list.map(w => { const n = inflight(w); return `<tr class="click" ${goAttr('workflow', w.id)} tabindex="0">
    <td><div class="row nowrap" style="gap:12px"><span class="type-ico">${icon('workflow', 'sm')}</span><div style="min-width:0"><div class="title">${esc(w.name)}</div><div class="muted" style="font-size:12px;max-width:42ch">${esc(w.desc)}</div></div></div></td>
    <td>${w.system ? '<span class="tag">Assets</span>' : '<span class="tag">Modules</span>'}</td>
    <td><div class="fn-strip">${w.steps.map(s => fnBadge(s.fn, s.req === 'approve' ? 'final' : isNotify(s) ? 'mailstep' : '')).join('')}</div></td>
    <td><b>${reviewSteps(w).length}</b>${w.steps.some(isNotify) ? ` <span class="chip plain" title="Email steps">${icon('mail', 'sm')}${w.steps.filter(isNotify).length}</span>` : ''} <span class="muted" style="font-size:12px">· ${w.steps.filter(s => s.req === 'approve').length} approval${w.steps.filter(s => s.req === 'approve').length === 1 ? '' : 's'}</span></td>
    <td>${n ? `<span class="chip info">${n} in flight</span>` : '<span class="muted">—</span>'}</td>
    <td>${w.active === false ? chip('Inactive') : '<span class="chip ok">Active</span>'}</td>
    <td style="text-align:right"><div class="row nowrap" style="justify-content:flex-end;gap:6px"><button class="btn icon sm" data-act="wf-view" data-id="${w.id}" aria-label="View review flow for ${esc(w.name)}" title="View review flow">${icon('eye', 'sm')}</button><button class="btn icon sm" ${goAttr('workflow', w.id)} aria-label="Edit ${esc(w.name)}" title="Edit in builder">${icon('edit', 'sm')}</button></div></td>
  </tr>`; }).join('')}</tbody></table></section>`;
}
function viewWorkflow() {
  const w = wfById(UI.route.p.id); if (!w) return viewMissing('Workflow');
  if (!UI.wfDraft || UI.wfDraft.id !== w.id) { UI.wfDraft = JSON.parse(JSON.stringify(w)); UI.wfSel = 0; }
  const D = UI.wfDraft; const selI = UI.wfSel; const s = D.steps[selI];
  const issues = wfIssues(D); const dirty = JSON.stringify(D) !== JSON.stringify(w);
  const teamFor = fn => S.teams.find(t => t.fn === fn);
  const node = (st, i) => isNotify(st) ? `<button class="flow-node notify ${i === selI ? 'sel' : ''}" data-act="wf-sel" data-i="${i}" draggable="true" data-drag="step" title="Drag to reorder"><span class="grip" aria-hidden="true">${icon('grip', 'sm')}</span><span class="idx">${icon('mail', 'sm')}</span>${fnBadge('Email', 'lg')}<span class="body"><b>Email notification</b><span class="muted" style="font-size:12px">${notifyTo(st).length ? 'To ' + esc(notifyTo(st).join(', ')) : 'No recipients yet'}</span><span class="muted" style="font-size:11.5px">Sends when the step before is approved</span></span></button>` : `<button class="flow-node ${i === selI ? 'sel' : ''}" data-act="wf-sel" data-i="${i}" draggable="true" data-drag="step" title="Drag to reorder"><span class="grip" aria-hidden="true">${icon('grip', 'sm')}</span><span class="idx">${i + 1}</span>${fnBadge(st.fn, 'lg')}<span class="body"><b>${esc(st.fn)} · ${st.req === 'approve' ? 'Final approval' : 'Review'}</b><span class="muted" style="font-size:12px">${esc((teamFor(st.fn) || {}).name || '')} · ${esc(st.seniority)} ${esc(REVIEWER_OF[st.fn])}</span></span>${sen(st.seniority)}${st.req === 'approve' ? icon('key', 'sm') : ''}</button>`;
  const addBtn = i => `<span class="flow-adds"><button class="flow-add" data-act="wf-add" data-i="${i}" aria-label="Add review step here" title="Add review step">${icon('plus', 'sm')}</button><button class="flow-add mail" data-act="wf-add-mail" data-i="${i}" aria-label="Add email step here" title="Add email step">${icon('mail', 'sm')}</button></span>`;
  return pageHead(esc(D.name), esc(D.desc), `${dirty ? btn('Discard changes', 'wf-discard', 'ghost') : ''}${btn('Save workflow', 'wf-save', 'primary', issues.some(x => x[0] === 'bad') ? 'disabled' : '', 'check')}`, [['Workflows', 'workflows'], [D.name]]) +
  `${dirty ? `<div class="banner info" style="margin-bottom:14px">${icon('edit')}<div class="txt"><b>Unsaved changes</b><p>Saving applies to new submissions. Items already in review keep the route they started with.</p></div></div>` : ''}
  <div class="builder"><div class="flow" data-drop="flow"><span class="flow-term">${icon('send', 'sm')}Submitted by ${D.system ? 'Marketing User' : 'Content Owner'}</span><span class="flow-link"></span>${addBtn(0)}<span class="flow-link"></span>
  ${D.steps.map((st, i) => node(st, i) + `<span class="flow-link"></span>${addBtn(i + 1)}<span class="flow-link"></span>`).join('')}
  <span class="flow-term">${icon('check', 'sm')}Approved → ${D.system ? 'Asset ready' : 'Approved Library'}</span></div>
  <div class="stack" style="position:sticky;top:84px">
   ${s && isNotify(s) ? `<section class="panel"><div class="panel-head">${fnBadge('Email')}<h3>Email step</h3></div><div class="panel-body form">
    <div class="field"><span class="label">Step type</span><div class="seg">${[['review', 'Review step'], ['notify', 'Email notification']].map(x => `<button type="button" class="${(x[0] === 'notify') ? 'on' : ''}" data-act="wf-kind" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><span class="hint">Sends automatically as soon as the step before it is approved, then the review moves on.</span></div>
    ${notifyFields(s, 'wf')}
    <div class="row">${btn('Move up', 'wf-move', 'sm', `data-dir="-1" ${selI === 0 ? 'disabled' : ''}`, 'up')}${btn('Move down', 'wf-move', 'sm', `data-dir="1" ${selI === D.steps.length - 1 ? 'disabled' : ''}`, 'down')}${btn('Delete step', 'wf-del', 'sm danger', '', 'trash')}</div>
   </div></section>` : ''}
   ${s && !isNotify(s) ? `<section class="panel"><div class="panel-head"><span class="idx" style="width:26px;height:26px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;font-weight:800;font-size:12px">${selI + 1}</span><h3>Configure step</h3></div><div class="panel-body form">
    <div class="field"><span class="label">Step type</span><div class="seg">${[['review', 'Review step'], ['notify', 'Email notification']].map(x => `<button type="button" class="${x[0] === 'review' ? 'on' : ''}" data-act="wf-kind" data-v="${x[0]}">${x[1]}</button>`).join('')}</div></div>
    <div class="field"><label for="wf-team">Team</label><select class="select" id="wf-team" data-wf="fn">${['Medical', 'Legal', 'Regulatory'].map(fn => opt(fn, s.fn, teamFor(fn).name)).join('')}</select></div>
    <div class="field"><span class="label">Reviewer type</span><div class="input" style="display:flex;align-items:center;background:var(--surface-2)">${esc(REVIEWER_OF[s.fn])}</div></div>
    <div class="field"><span class="label">Seniority</span><div class="seg">${['Junior', 'Senior'].map(x => `<button type="button" class="${s.seniority === x ? 'on' : ''}" data-act="wf-set" data-k="seniority" data-v="${x}">${x}</button>`).join('')}</div></div>
    <div class="field"><span class="label">Approval requirement</span><div class="seg">${[['review', 'Review & pass on'], ['approve', 'Final approval']].map(x => `<button type="button" class="${s.req === x[0] ? 'on' : ''}" data-act="wf-set" data-k="req" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><span class="hint">${s.req === 'approve' ? 'Requires an e-signature. Only Senior reviewers can hold final approval.' : 'Reviewer can comment, request changes or pass the item on.'}</span></div>
    <div class="row">${btn('Move up', 'wf-move', 'sm', `data-dir="-1" ${selI === 0 ? 'disabled' : ''}`, 'up')}${btn('Move down', 'wf-move', 'sm', `data-dir="1" ${selI === D.steps.length - 1 ? 'disabled' : ''}`, 'down')}${btn('Delete step', 'wf-del', 'sm danger', D.steps.length <= 1 ? 'disabled' : '', 'trash')}</div>
   </div></section>` : ''}
   <section class="panel"><div class="panel-head"><h3>Checks</h3></div><div class="panel-body stack" style="gap:8px">${issues.length ? issues.map(([t, msg]) => `<div class="check-row"><span class="${t === 'bad' ? 'no' : 'ok'}" style="${t === 'warn' ? 'color:var(--warn)' : ''}">${icon(t === 'bad' ? 'x' : 'alert', 'sm')}</span>${esc(msg)}</div>`).join('') : `<div class="check-row"><span class="ok">${icon('check', 'sm')}</span>Workflow is valid</div>`}
   <div class="check-row"><span class="ok">${icon('check', 'sm')}</span>${reviewSteps(D).length} review steps · ${D.steps.filter(x => x.req === 'approve').length} final approvals${D.steps.some(isNotify) ? ' · ' + D.steps.filter(isNotify).length + ' email' : ''}</div></div></section>
  </div></div>`;
}

/* ===== New workflow (step form) ===== */
const WSTEPS = [['Details', ['name'], 'Name the review route and say when it is used.'], ['Review flow', ['steps'], 'Add the review steps in order. Each step is a team, a seniority level and a decision type.'], ['Review & create', [], 'Check the route before creating it.']];
const WF_USES = [['Promotional modules', 'file', 'Claims, headlines and safety statements'], ['Medical education', 'stethoscope', 'Non-promotional scientific content'], ['Low-risk updates', 'filecheck', 'Minor edits and re-approvals']];
function validateWf(D) {
  const e = {};
  if (!D.name.trim()) e.name = 'Give the workflow a name.';
  else if (S.workflows.some(w => w.name.toLowerCase() === D.name.trim().toLowerCase())) e.name = 'A workflow with this name already exists.';
  if (!D.steps.length) e.steps = 'Add at least one review step.';
  else { const bad = wfIssues(D).filter(x => x[0] === 'bad'); if (bad.length) e.steps = bad.map(x => x[1]).join(' '); }
  return e;
}
function notifyFields(s, scope, i) {
  const at = scope === 'wf' ? '' : ` data-i="${i}"`; const act = scope === 'wf' ? 'wf-rcpt' : 'nwf-rcpt'; const inp = scope === 'wf' ? 'data-wfn' : 'data-nwfn';
  const people = S.users.filter(u => u.status === 'Active');
  return `<div class="field"><span class="label">Send to</span><div class="rcpts">${people.map(u => { const on = (s.recipients || []).includes(u.id); return `<button type="button" class="rcpt ${on ? 'on' : ''}" data-act="${act}"${at} data-v="${u.id}" aria-pressed="${on}">${avatar(u, 'sm')}<span><b>${esc(u.name)}</b><span>${esc(roleLabel(u))}</span></span>${on ? icon('check', 'sm') : ''}</button>`; }).join('')}</div></div>
    <div class="field"><label>Other email addresses <span class="muted" style="font-weight:500">(optional, comma separated)</span></label><input class="input" ${inp}="emails"${at} id="${scope}-emails-${i == null ? 0 : i}" value="${esc(s.emails || '')}" placeholder="e.g. brand.team@saja-demo.com"></div>
    <div class="field"><label>Subject</label><input class="input" ${inp}="subject"${at} id="${scope}-subject-${i == null ? 0 : i}" value="${esc(s.subject || '')}"></div>
    <div class="field"><label>Message</label><textarea class="textarea" ${inp}="message"${at} id="${scope}-message-${i == null ? 0 : i}" rows="3">${esc(s.message || '')}</textarea></div>
    <div class="mail-preview"><div class="mp-head">${icon('mail', 'sm')}<b>${esc(s.subject || 'No subject')}</b></div><div class="mp-to">To: ${esc(notifyTo(s).join(', ') || '—')}</div><p>${esc(s.message || '')}</p><div class="mp-btn">Open in SAJA MedLR</div></div>`;
}
function flowPreview(steps, start, end) {
  return `<div class="flowx">${start ? `<div class="fx-term">${icon('send', 'sm')}<span>${start}</span></div><span class="fx-arrow">${icon('chevron', 'sm')}</span>` : ''}${steps.map((s, i) => `${isNotify(s) ? `<div class="fx-node notify">${fnBadge('Email', 'lg')}<b>Email</b><span>To ${notifyTo(s).length || 0} ${notifyTo(s).length === 1 ? 'person' : 'people'}</span></div>` : `<div class="fx-node ${s.req === 'approve' ? 'final' : ''}">${fnBadge(s.fn, 'lg')}<b>${esc(s.fn)}</b><span>${s.req === 'approve' ? 'Final approval' : 'Review'}</span>${sen(s.seniority)}</div>`}${i < steps.length - 1 || end ? `<span class="fx-arrow">${icon('chevron', 'sm')}</span>` : ''}`).join('')}${end ? `<div class="fx-term ok">${icon('check', 'sm')}<span>${end}</span></div>` : ''}</div>`;
}
function viewWorkflowNew() {
  if (!UI.nwf) UI.nwf = { step: 0, maxStep: 0, triedSteps: [], name: '', desc: '', use: 'Promotional modules', steps: [] };
  const D = UI.nwf; const E = wizErrors(D, WSTEPS, validateWf(D)); const st = D.step; const hid = i => i === st ? '' : ' hidden';
  const err = k => E[k] ? `<span class="err">${esc(E[k])}</span>` : '';
  const issues = D.steps.length ? wfIssues(D) : [];
  const row = (s, i) => isNotify(s) ? `<div class="nwf-step notify"><span class="idx">${icon('mail', 'sm')}</span>${fnBadge('Email', 'lg')}<div class="nwf-fields" style="flex-direction:column;align-items:stretch"><b>Email notification <span class="muted" style="font-weight:500">· sends when the step before is approved</span></b>${notifyFields(s, 'nwf', i)}</div><div class="nwf-tools" style="align-self:flex-start"><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up', 'sm')}</button><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="1" aria-label="Move down" ${i === D.steps.length - 1 ? 'disabled' : ''}>${icon('down', 'sm')}</button><button type="button" class="btn icon sm danger" data-act="nwf-del" data-i="${i}" aria-label="Remove step">${icon('trash', 'sm')}</button></div></div>` : `<div class="nwf-step">
    <span class="idx">${i + 1}</span>${fnBadge(s.fn, 'lg')}
    <div class="nwf-fields">
      <select class="select" data-nwf="fn" data-i="${i}" aria-label="Team for step ${i + 1}">${['Medical', 'Legal', 'Regulatory'].map(fn => opt(fn, s.fn, fn + ' — ' + REVIEWER_OF[fn])).join('')}</select>
      <div class="seg" aria-label="Seniority">${['Junior', 'Senior'].map(x => `<button type="button" class="${s.seniority === x ? 'on' : ''}" data-act="nwf-set" data-i="${i}" data-k="seniority" data-v="${x}">${x}</button>`).join('')}</div>
      <div class="seg" aria-label="Decision">${[['review', 'Review'], ['approve', 'Final approval']].map(x => `<button type="button" class="${s.req === x[0] ? 'on' : ''}" data-act="nwf-set" data-i="${i}" data-k="req" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
    </div>
    <div class="nwf-tools"><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up', 'sm')}</button><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="1" aria-label="Move down" ${i === D.steps.length - 1 ? 'disabled' : ''}>${icon('down', 'sm')}</button><button type="button" class="btn icon sm danger" data-act="nwf-del" data-i="${i}" aria-label="Remove step">${icon('trash', 'sm')}</button></div>
  </div>`;
  return pageHead('New workflow', 'Build a review route step by step. Seniority and decision type are set per step.', '', [['Workflows', 'workflows'], ['New workflow']]) +
  wizBar('workflow', WSTEPS, D) +
  `<form class="grid cols-main ${D.anim ? (D.anim = false, 'wiz-anim') : ''}" data-form="workflow" novalidate><div class="stack">${wizHead(WSTEPS, D)}
  <section class="panel"${hid(0)}><div class="panel-head"><h3>Workflow details</h3></div><div class="panel-body form">
    <div class="field"><label for="w-name">Workflow name</label><input class="input ${E.name ? 'invalid' : ''}" id="w-name" data-w="name" value="${esc(D.name)}" placeholder="e.g. Medical education — Senior only">${err('name')}</div>
    <div class="field"><label for="w-desc">When is it used? <span class="muted" style="font-weight:500">(optional)</span></label><textarea class="textarea" id="w-desc" data-w="desc" placeholder="e.g. Non-promotional scientific content for congresses">${esc(D.desc)}</textarea></div>
    <div class="field"><span class="label">Content type</span><div class="type-cards" role="radiogroup" aria-label="Content type">${WF_USES.map(u => `<button type="button" class="type-card ${D.use === u[0] ? 'on' : ''}" data-act="nwf-use" data-v="${u[0]}" role="radio" aria-checked="${D.use === u[0]}"><span class="type-ico">${icon(u[1])}</span><span><b>${u[0]}</b><span>${u[2]}</span></span></button>`).join('')}</div></div>
  </div></section>
  <section class="panel"${hid(1)}><div class="panel-head"><h3>Review flow</h3><span class="chip plain">${D.steps.length} step${D.steps.length === 1 ? '' : 's'}</span></div><div class="panel-body stack">
    <div class="row"><span class="label" style="margin:0">Start from</span>${[['std', 'Standard — Junior then Senior'], ['senior', 'Senior only'], ['blank', 'Blank']].map(t => `<button type="button" class="btn sm" data-act="nwf-tpl" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
    ${D.steps.length ? `<div class="nwf-list">${D.steps.map(row).join('<span class="nwf-link"></span>')}</div>` : `<div class="empty" style="padding:26px"><p>No steps yet. Pick a template above or add a step below.</p></div>`}
    <div class="nwf-add">${['Medical', 'Legal', 'Regulatory'].map(fn => `<button type="button" class="btn" data-act="nwf-add" data-v="${fn}">${fnBadge(fn)}Add ${fn}</button>`).join('')}<button type="button" class="btn" data-act="nwf-add" data-v="Email">${fnBadge('Email')}Add email step</button></div>
    ${err('steps')}
  </div></section>
  ${st === WSTEPS.length - 1 ? `${D.tried && Object.keys(E).length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${Object.keys(E).length} item${Object.keys(E).length > 1 ? 's need' : ' needs'} attention</b><p>Use Edit to go back to that step.</p></div></div>` : ''}
  ${sumGroup('workflow', 0, 'Details', sumRow('Name', esc(D.name)) + sumRow('Used for', esc(D.use)) + sumRow('Description', esc(D.desc)))}
  <section class="panel sum"><div class="panel-head"><h3>Review flow</h3><span class="grow"></span><button type="button" class="btn ghost sm" data-act="wiz-go" data-form="workflow" data-i="1">${icon('edit', 'sm')}Edit</button></div><div class="panel-body">${flowPreview(D.steps, 'Submitted', 'Approved')}</div></section>` : ''}
  ${wizFoot('workflow', WSTEPS, D, goAttr('workflows'), 'Create workflow')}</div>
  <aside class="stack" style="position:sticky;top:84px">
    <section class="panel"><div class="panel-head"><h3>Review flow preview</h3></div><div class="panel-body">${D.steps.length ? `<div class="wf">${D.steps.map((s, i) => isNotify(s) ? `<div class="wf-step notify"><div class="wf-dot">${icon('mail', 'sm')}</div><div><div class="t">${fnBadge('Email', 'sm')}Email notification</div><div class="s">To ${esc(notifyTo(s).join(', ') || 'no one yet')}</div></div></div>` : `<div class="wf-step"><div class="wf-dot">${reviewPos(D, i)}</div><div><div class="t">${fnBadge(s.fn, 'sm')}${esc(s.fn)} <span class="muted">·</span> ${s.req === 'approve' ? 'Final approval' : 'Review'} ${sen(s.seniority)}</div><div class="s">${esc(s.seniority)} ${esc(REVIEWER_OF[s.fn])}</div></div></div>`).join('')}</div>` : '<p class="muted">Steps appear here as you add them.</p>'}</div></section>
    <section class="panel"><div class="panel-head"><h3>Checks</h3></div><div class="panel-body stack" style="gap:8px">${!D.steps.length ? `<div class="check-row"><span class="no">${icon('x', 'sm')}</span>Add at least one step</div>` : issues.length ? issues.map(([t, msg]) => `<div class="check-row"><span class="${t === 'bad' ? 'no' : 'ok'}" style="${t === 'warn' ? 'color:var(--warn)' : ''}">${icon(t === 'bad' ? 'x' : 'alert', 'sm')}</span>${esc(msg)}</div>`).join('') : `<div class="check-row"><span class="ok">${icon('check', 'sm')}</span>Route is valid</div>`}</div></section>
  </aside></form>`;
}

function wfIssues(D) {
  const out = [];
  if (!D.steps.length) out.push(['bad', 'Add at least one step.']);
  D.steps.forEach((s, i) => { if (isNotify(s) && !notifyTo(s).length) out.push(['bad', 'Step ' + (i + 1) + ': choose who receives the email.']); });
  D.steps.forEach((s, i) => { if (s.req === 'approve' && s.seniority === 'Junior') out.push(['bad', 'Step ' + (i + 1) + ': final approval must be held by a Senior reviewer.']); });
  const rv = D.steps.filter(s => !isNotify(s)); const last = rv[rv.length - 1]; if (!rv.length) out.push(['bad', 'Add at least one review step.']); if (last && last.req !== 'approve') out.push(['bad', 'The last step must be a final approval.']);
  ['Medical', 'Legal', 'Regulatory'].forEach(fn => { const st = D.steps.filter(s => s.fn === fn); if (st.length && !st.some(s => s.req === 'approve')) out.push(['warn', fn + ' has a review step but no Senior approval.']); });
  return out;
}

/* ===== Demo guide ===== */
function guideSteps() {
  const dm = S.demo.moduleId ? modById(S.demo.moduleId) : null; const da = S.demo.assetId ? assetById(S.demo.assetId) : null;
  const stepOf = dm && dm.review ? dm.review.step : (dm && live(dm) ? 99 : -1);
  const m14 = modById('MOD-A-014');
  const steps = [
    ['Sign in', 'Omar Khalil · Senior Content Owner', S.signedIn, { persona: 'u-omar', route: 'home' }],
    ['Create a module', 'Modules → Create module → Save draft', !!dm, { persona: 'u-omar', route: dm ? 'module' : 'module-new', id: dm && dm.id }],
    ['Submit for review', 'Module page → Submit for review', !!dm && (!!dm.review || !!live(dm)), { persona: 'u-omar', route: 'module', id: dm && dm.id }],
    ['Junior Medical review', 'Ahmed Ali → Send to Senior', stepOf > 0, { review: 0 }],
    ['Senior Medical approval', 'Sara Ahmed → Final Medical approval', stepOf > 1, { review: 1 }],
    ['Legal review', 'Mona Adel (Junior) → Rania Haddad (Senior)', stepOf > 3, { review: stepOf === 2 ? 2 : 3 }],
    ['Regulatory review', 'Tarek Samir (Junior) → Layla Nasser (Senior)', stepOf > 5, { review: stepOf === 4 ? 4 : 5 }],
    ['Approved Library', 'The new module appears, ready to reuse', !!S.demo.sawLibraryAfter, { persona: 'u-omar', route: 'library', flag: 'sawLibraryAfter' }],
    ['Assemble an asset', 'Karim Fawzi · HCP Email with new text', !!da && da.status !== 'Draft', { persona: 'u-karim', route: da ? 'assemble' : 'assets', id: da && da.id, newAsset: !da }],
    ['Asset review', 'Approved vs new content → approve', !!da && da.status === 'Approved', { assetReview: true }],
    ['Version update & impact', 'MOD-A-014 v3 → re-approval → update assets', !!m14 && latest(m14).v >= 3 && latest(m14).status === 'Approved' && !impactedAssets(m14).length, { version: true }],
    ['Lifecycle', 'Stages, expiries and superseded versions', !!S.demo.sawLifecycle, { persona: 'u-omar', route: 'lifecycle', flag: 'sawLifecycle' }],
    ['Audit trail', 'Every decision with role and seniority', !!S.demo.sawAudit, { persona: 'u-ali', route: 'audit' }]
  ];
  return steps;
}
function viewGuide() {
  const steps = guideSteps(); const next = steps.findIndex(s => !s[2]);
  return `<aside class="guide" aria-label="Demo guide"><div class="guide-head"><div style="flex:1"><b style="font-size:15px">Client demo journey</b><p class="muted" style="font-size:12px">Each step switches to the right person and opens the right page.</p></div><button class="btn icon sm" data-act="guide" aria-label="Close guide">${icon('x', 'sm')}</button></div>
  ${steps.map((s, i) => `<div class="guide-step ${s[2] ? 'done' : ''} ${i === next ? 'next' : ''}"><span class="gd">${s[2] ? icon('check', 'sm') : i + 1}</span><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div><button class="btn sm ${i === next ? 'primary' : ''}" data-act="guide-go" data-i="${i}">${s[2] ? 'Show' : 'Go'}</button></div>`).join('')}
  <div class="guide-step"><span></span><div><span>Want to start again?</span></div><button class="btn sm ghost" data-act="reset">Reset demo</button></div></aside>`;
}
