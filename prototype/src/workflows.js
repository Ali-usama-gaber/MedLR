/* ===== Workflows ===== */
function viewWorkflows() {
  const list = S.workflows.filter(w => !w.hidden);
  const inflight = w => S.modules.filter(m => m.review && m.review.wf === w.id).length + S.assets.filter(a => a.review && a.review.wf === w.id).length;
  return pageHead('Workflows', 'Review routes. Each step names a function, a level (Member or Lead) and whether it is a review or the final approval.', btn('New workflow', 'wf-new', 'primary', '', 'plus')) +
  `<section class="panel table-wrap"><table class="tbl"><thead><tr><th>Workflow</th><th>Applies to</th><th>Review flow</th><th>Steps</th><th>In flight</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>
  ${list.map(w => { const n = inflight(w); return `<tr class="click" ${goAttr('workflow', w.id)} tabindex="0">
    <td><div class="row nowrap" style="gap:12px"><span class="type-ico">${icon('workflow', 'sm')}</span><div style="min-width:0"><div class="title">${esc(w.name)}</div><div class="muted" style="font-size:12px;max-width:42ch">${esc(w.desc)}</div></div></div></td>
    <td><span class="tag">${w.appliesTo === 'Asset' ? 'Assets' : 'Modules'}</span></td>
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
  const who = st => { const a = assigneeFor(st); return a.length ? a.map(x => x.name).join(', ') : 'No active ' + stepWho(st); };
  const node = (st, i) => isNotify(st) ? `<button class="flow-node notify ${i === selI ? 'sel' : ''}" data-act="wf-sel" data-i="${i}" draggable="true" data-drag="step" title="Drag to reorder"><span class="grip" aria-hidden="true">${icon('grip', 'sm')}</span><span class="idx">${icon('mail', 'sm')}</span>${fnBadge('Email', 'lg')}<span class="body"><b>Email notification</b><span class="muted" style="font-size:12px">${notifyTo(st).length ? 'To ' + esc(notifyTo(st).join(', ')) : 'No recipients yet'}</span><span class="muted" style="font-size:11.5px">Sends when the step before is approved</span></span></button>` : `<button class="flow-node ${i === selI ? 'sel' : ''}" data-act="wf-sel" data-i="${i}" draggable="true" data-drag="step" title="Drag to reorder"><span class="grip" aria-hidden="true">${icon('grip', 'sm')}</span><span class="idx">${i + 1}</span>${fnBadge(st.fn, 'lg')}<span class="body"><b>${esc(st.fn)} · ${st.req === 'approve' ? (isFinalStep(D, i) ? 'Final approval' : 'Approval') : 'Review'}</b><span class="muted" style="font-size:12px">${esc(stepTeamTxt(st))} · ${esc(who(st))}</span></span>${lvl(st.level)}${st.req === 'approve' ? icon('key', 'sm') : ''}</button>`;
  const addBtn = i => `<span class="flow-adds"><button class="flow-add" data-act="wf-add" data-i="${i}" aria-label="Add review step here" title="Add review step">${icon('plus', 'sm')}</button><button class="flow-add mail" data-act="wf-add-mail" data-i="${i}" aria-label="Add email step here" title="Add email step">${icon('mail', 'sm')}</button></span>`;
  return pageHead(esc(D.name), esc(D.desc), `${dirty ? btn('Discard changes', 'wf-discard', 'ghost') : ''}${btn('Save workflow', 'wf-save', 'primary', issues.some(x => x[0] === 'bad') ? 'disabled' : '', 'check')}`, [['Workflows', 'workflows'], [D.name]]) +
  `${dirty ? `<div class="banner info" style="margin-bottom:14px">${icon('edit')}<div class="txt"><b>Unsaved changes</b><p>Saving applies to new submissions. Items already in review keep the route they started with.</p></div></div>` : ''}
  <div class="builder"><div class="flow" data-drop="flow"><span class="flow-term">${icon('send', 'sm')}${D.appliesTo === 'Asset' ? 'Asset' : 'Module'} submitted</span><span class="flow-link"></span>${addBtn(0)}<span class="flow-link"></span>
  ${D.steps.map((st, i) => node(st, i) + `<span class="flow-link"></span>${addBtn(i + 1)}<span class="flow-link"></span>`).join('')}
  <span class="flow-term">${icon('check', 'sm')}Approved → ${D.appliesTo === 'Asset' ? 'Asset ready' : 'Approved Library'}</span></div>
  <div class="stack" style="position:sticky;top:84px">
   <section class="panel"><div class="panel-head"><h3>Workflow details</h3><span class="grow"></span>${toggleBtn(D.active !== false, 'wf-active', '', 'Active')}<span class="muted" style="font-size:12px">${D.active !== false ? 'Active' : 'Inactive'}</span></div><div class="panel-body form">
    <div class="field"><label for="wfd-name">Name</label><input class="input" id="wfd-name" data-wfd="name" value="${esc(D.name)}"></div>
    <div class="field"><label for="wfd-desc">When is it used?</label><textarea class="textarea" id="wfd-desc" data-wfd="desc" rows="2">${esc(D.desc)}</textarea></div>
    <div class="field"><span class="label">Applies to</span><div class="seg">${[['Module', 'Modules'], ['Asset', 'Assets']].map(x => `<button type="button" class="${D.appliesTo === x[0] ? 'on' : ''}" data-act="wf-applies" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><span class="hint">${D.appliesTo === 'Asset' ? 'Offered to Material Types and the streamlined-asset setting.' : 'Offered when a module is submitted.'} Inactive workflows are not offered for new submissions.</span></div>
   </div></section>
   ${s && isNotify(s) ? `<section class="panel"><div class="panel-head">${fnBadge('Email')}<h3>Email step</h3></div><div class="panel-body form">
    <div class="field"><span class="label">Step type</span><div class="seg">${[['review', 'Review step'], ['notify', 'Email notification']].map(x => `<button type="button" class="${(x[0] === 'notify') ? 'on' : ''}" data-act="wf-kind" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><span class="hint">Sends automatically as soon as the step before it is approved, then the review moves on.</span></div>
    ${notifyFields(s, 'wf')}
    <div class="row">${btn('Move up', 'wf-move', 'sm', `data-dir="-1" ${selI === 0 ? 'disabled' : ''}`, 'up')}${btn('Move down', 'wf-move', 'sm', `data-dir="1" ${selI === D.steps.length - 1 ? 'disabled' : ''}`, 'down')}${btn('Delete step', 'wf-del', 'sm danger', '', 'trash')}</div>
   </div></section>` : ''}
   ${s && !isNotify(s) ? `<section class="panel"><div class="panel-head"><span class="idx" style="width:26px;height:26px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;font-weight:800;font-size:12px">${selI + 1}</span><h3>Configure step</h3></div><div class="panel-body form">
    <div class="field"><span class="label">Step type</span><div class="seg">${[['review', 'Review step'], ['notify', 'Email notification']].map(x => `<button type="button" class="${x[0] === 'review' ? 'on' : ''}" data-act="wf-kind" data-v="${x[0]}">${x[1]}</button>`).join('')}</div></div>
    <div class="field"><label for="wf-fn">Function</label><select class="select" id="wf-fn" data-wf="fn">${uniq([...reviewFuncs(), s.fn]).map(fn => opt(fn, s.fn, fn)).join('')}</select></div>
    <div class="field"><label for="wf-team">Team</label><select class="select" id="wf-team" data-wf="team">${opt('', s.team || '', 'Any ' + s.fn + ' team')}${S.teams.filter(t => t.fn === s.fn && (t.active || t.id === s.team)).map(t => opt(t.id, s.team || '', t.name)).join('')}</select></div>
    <div class="field"><span class="label">Assigned to</span><div class="input" style="display:flex;align-items:center;background:var(--surface-2);height:auto;min-height:40px;padding:8px 12px">${esc(stepWho(s))} — ${esc(who(s))}</div><span class="hint">Everyone active with this role${s.team ? ' in this team' : ''}. Manage people in Users.</span></div>
    <div class="field"><span class="label">Level</span><div class="seg">${['Member', 'Lead'].map(x => `<button type="button" class="${s.level === x ? 'on' : ''}" data-act="wf-set" data-k="level" data-v="${x}">${levelName(x)}</button>`).join('')}</div></div>
    <div class="field"><span class="label">Approval requirement</span><div class="seg">${[['review', 'Review & pass on'], ['approve', 'Approval with e-signature']].map(x => `<button type="button" class="${s.req === x[0] ? 'on' : ''}" data-act="wf-set" data-k="req" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><span class="hint">${s.req === 'approve' ? 'Requires an e-signature and the Approve permission (Final approval permission when it is the last step). Only a Lead can approve.' : 'Reviewer can comment, request changes or pass the item on.'}</span></div>
    <div class="row">${btn('Move up', 'wf-move', 'sm', `data-dir="-1" ${selI === 0 ? 'disabled' : ''}`, 'up')}${btn('Move down', 'wf-move', 'sm', `data-dir="1" ${selI === D.steps.length - 1 ? 'disabled' : ''}`, 'down')}${btn('Delete step', 'wf-del', 'sm danger', D.steps.length <= 1 ? 'disabled' : '', 'trash')}</div>
   </div></section>` : ''}
   <section class="panel"><div class="panel-head"><h3>Checks</h3></div><div class="panel-body stack" style="gap:8px">${issues.length ? issues.map(([t, msg]) => `<div class="check-row"><span class="${t === 'bad' ? 'no' : 'ok'}" style="${t === 'warn' ? 'color:var(--warn)' : ''}">${icon(t === 'bad' ? 'x' : 'alert', 'sm')}</span>${esc(msg)}</div>`).join('') : `<div class="check-row"><span class="ok">${icon('check', 'sm')}</span>Workflow is valid</div>`}
   <div class="check-row"><span class="ok">${icon('check', 'sm')}</span>${reviewSteps(D).length} review steps · ${D.steps.filter(x => x.req === 'approve').length} final approvals${D.steps.some(isNotify) ? ' · ' + D.steps.filter(isNotify).length + ' email' : ''}</div></div></section>
  </div></div>`;
}

/* ===== New workflow (step form) ===== */
const WSTEPS = [['Details', ['name'], 'Name the review route and say when it is used.'], ['Review flow', ['steps'], 'Add the review steps in order. Each step is a team, a level (Member or Lead) and a decision type.'], ['Review & create', [], 'Check the route before creating it.']];
const WF_APPLIES = [['Module', 'file', 'Modules', 'Offered when a module is submitted for MLR review'], ['Asset', 'layers', 'Assets', 'Used by Material Types and for assets made of approved modules']];
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
    <div class="field"><label>Other email addresses <span class="muted" style="font-weight:500">(optional, comma separated)</span></label><input class="input" ${inp}="emails"${at} id="${scope}-emails-${i == null ? 0 : i}" value="${esc(s.emails || '')}" placeholder="e.g. brand.team@saja.com"></div>
    <div class="field"><label>Subject</label><input class="input" ${inp}="subject"${at} id="${scope}-subject-${i == null ? 0 : i}" value="${esc(s.subject || '')}"></div>
    <div class="field"><label>Message</label><textarea class="textarea" ${inp}="message"${at} id="${scope}-message-${i == null ? 0 : i}" rows="3">${esc(s.message || '')}</textarea></div>
    <div class="mail-preview"><div class="mp-head">${icon('mail', 'sm')}<b>${esc(s.subject || 'No subject')}</b></div><div class="mp-to">To: ${esc(notifyTo(s).join(', ') || '—')}</div><p>${esc(s.message || '')}</p><div class="mp-btn">Open in SAJA MedLR</div></div>`;
}
function flowPreview(steps, start, end) {
  return `<div class="flowx">${start ? `<div class="fx-term">${icon('send', 'sm')}<span>${start}</span></div><span class="fx-arrow">${icon('chevron', 'sm')}</span>` : ''}${steps.map((s, i) => `${isNotify(s) ? `<div class="fx-node notify">${fnBadge('Email', 'lg')}<b>Email</b><span>To ${notifyTo(s).length || 0} ${notifyTo(s).length === 1 ? 'person' : 'people'}</span></div>` : `<div class="fx-node ${s.req === 'approve' ? 'final' : ''}">${fnBadge(s.fn, 'lg')}<b>${esc(s.fn)}</b><span>${s.req === 'approve' ? (isFinalStep({ steps }, i) ? 'Final approval' : 'Approval') : 'Review'}</span>${lvl(s.level)}</div>`}${i < steps.length - 1 || end ? `<span class="fx-arrow">${icon('chevron', 'sm')}</span>` : ''}`).join('')}${end ? `<div class="fx-term ok">${icon('check', 'sm')}<span>${end}</span></div>` : ''}</div>`;
}
function viewWorkflowNew() {
  if (!UI.nwf) UI.nwf = { step: 0, maxStep: 0, triedSteps: [], name: '', desc: '', appliesTo: 'Module', steps: [] };
  const D = UI.nwf; const E = wizErrors(D, WSTEPS, validateWf(D)); const who = st => { const a = assigneeFor(st); return a.length ? a.map(x => x.name).join(', ') : 'No active ' + stepWho(st); }; const st = D.step; const hid = i => i === st ? '' : ' hidden';
  const err = k => E[k] ? `<span class="err">${esc(E[k])}</span>` : '';
  const issues = D.steps.length ? wfIssues(D) : [];
  const row = (s, i) => isNotify(s) ? `<div class="nwf-step notify"><span class="idx">${icon('mail', 'sm')}</span>${fnBadge('Email', 'lg')}<div class="nwf-fields" style="flex-direction:column;align-items:stretch"><b>Email notification <span class="muted" style="font-weight:500">· sends when the step before is approved</span></b>${notifyFields(s, 'nwf', i)}</div><div class="nwf-tools" style="align-self:flex-start"><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up', 'sm')}</button><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="1" aria-label="Move down" ${i === D.steps.length - 1 ? 'disabled' : ''}>${icon('down', 'sm')}</button><button type="button" class="btn icon sm danger" data-act="nwf-del" data-i="${i}" aria-label="Remove step">${icon('trash', 'sm')}</button></div></div>` : `<div class="nwf-step">
    <span class="idx">${i + 1}</span>${fnBadge(s.fn, 'lg')}
    <div class="nwf-fields">
      <select class="select" data-nwf="fn" data-i="${i}" aria-label="Function for step ${i + 1}">${uniq([...reviewFuncs(), s.fn]).map(fn => opt(fn, s.fn, fn)).join('')}</select>
      <select class="select" data-nwf="team" data-i="${i}" aria-label="Team for step ${i + 1}">${opt('', s.team || '', 'Any ' + s.fn + ' team')}${S.teams.filter(t => t.fn === s.fn && t.active).map(t => opt(t.id, s.team || '', t.name)).join('')}</select>
      <div class="seg" aria-label="Level">${['Member', 'Lead'].map(x => `<button type="button" class="${s.level === x ? 'on' : ''}" data-act="nwf-set" data-i="${i}" data-k="level" data-v="${x}">${levelName(x)}</button>`).join('')}</div>
      <div class="seg" aria-label="Decision">${[['review', 'Review'], ['approve', 'Approval']].map(x => `<button type="button" class="${s.req === x[0] ? 'on' : ''}" data-act="nwf-set" data-i="${i}" data-k="req" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
    </div>
    <div class="nwf-tools"><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up', 'sm')}</button><button type="button" class="btn icon sm" data-act="nwf-move" data-i="${i}" data-dir="1" aria-label="Move down" ${i === D.steps.length - 1 ? 'disabled' : ''}>${icon('down', 'sm')}</button><button type="button" class="btn icon sm danger" data-act="nwf-del" data-i="${i}" aria-label="Remove step">${icon('trash', 'sm')}</button></div>
  </div>`;
  return pageHead('New workflow', 'Build a review route step by step. Level and decision type are set per step.', '', [['Workflows', 'workflows'], ['New workflow']]) +
  wizBar('workflow', WSTEPS, D) +
  `<form class="grid cols-main ${D.anim ? (D.anim = false, 'wiz-anim') : ''}" data-form="workflow" novalidate><div class="stack">${wizHead(WSTEPS, D)}
  <section class="panel"${hid(0)}><div class="panel-head"><h3>Workflow details</h3></div><div class="panel-body form">
    <div class="field"><label for="w-name">Workflow name</label><input class="input ${E.name ? 'invalid' : ''}" id="w-name" data-w="name" value="${esc(D.name)}" placeholder="e.g. Medical education — Lead only">${err('name')}</div>
    <div class="field"><label for="w-desc">When is it used? <span class="muted" style="font-weight:500">(optional)</span></label><textarea class="textarea" id="w-desc" data-w="desc" placeholder="e.g. Non-promotional scientific content for congresses">${esc(D.desc)}</textarea></div>
    <div class="field"><span class="label">Applies to</span><div class="type-cards" role="radiogroup" aria-label="Applies to">${WF_APPLIES.map(u => `<button type="button" class="type-card ${D.appliesTo === u[0] ? 'on' : ''}" data-act="nwf-use" data-v="${u[0]}" role="radio" aria-checked="${D.appliesTo === u[0]}"><span class="type-ico">${icon(u[1])}</span><span><b>${u[2]}</b><span>${u[3]}</span></span></button>`).join('')}</div></div>
  </div></section>
  <section class="panel"${hid(1)}><div class="panel-head"><h3>Review flow</h3><span class="chip plain">${D.steps.length} step${D.steps.length === 1 ? '' : 's'}</span></div><div class="panel-body stack">
    <div class="row"><span class="label" style="margin:0">Start from</span>${[['std', 'Standard — Member then Lead'], ['senior', 'Lead only'], ['blank', 'Blank']].map(t => `<button type="button" class="btn sm" data-act="nwf-tpl" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
    ${D.steps.length ? `<div class="nwf-list">${D.steps.map(row).join('<span class="nwf-link"></span>')}</div>` : `<div class="empty" style="padding:26px"><p>No steps yet. Pick a template above or add a step below.</p></div>`}
    <div class="nwf-add">${reviewFuncs().map(fn => `<button type="button" class="btn" data-act="nwf-add" data-v="${fn}">${fnBadge(fn)}Add ${fn}</button>`).join('')}<button type="button" class="btn" data-act="nwf-add" data-v="Email">${fnBadge('Email')}Add email step</button></div>
    ${err('steps')}
  </div></section>
  ${st === WSTEPS.length - 1 ? `${D.tried && Object.keys(E).length ? `<div class="banner bad">${icon('alert')}<div class="txt"><b>${Object.keys(E).length} item${Object.keys(E).length > 1 ? 's need' : ' needs'} attention</b><p>Use Edit to go back to that step.</p></div></div>` : ''}
  ${sumGroup('workflow', 0, 'Details', sumRow('Name', esc(D.name)) + sumRow('Applies to', D.appliesTo === 'Asset' ? 'Assets' : 'Modules') + sumRow('Description', esc(D.desc)))}
  <section class="panel sum"><div class="panel-head"><h3>Review flow</h3><span class="grow"></span><button type="button" class="btn ghost sm" data-act="wiz-go" data-form="workflow" data-i="1">${icon('edit', 'sm')}Edit</button></div><div class="panel-body">${flowPreview(D.steps, 'Submitted', 'Approved')}</div></section>` : ''}
  ${wizFoot('workflow', WSTEPS, D, goAttr('workflows'), 'Create workflow')}</div>
  <aside class="stack" style="position:sticky;top:84px">
    <section class="panel"><div class="panel-head"><h3>Review flow preview</h3></div><div class="panel-body">${D.steps.length ? `<div class="wf">${D.steps.map((s, i) => isNotify(s) ? `<div class="wf-step notify"><div class="wf-dot">${icon('mail', 'sm')}</div><div><div class="t">${fnBadge('Email', 'sm')}Email notification</div><div class="s">To ${esc(notifyTo(s).join(', ') || 'no one yet')}</div></div></div>` : `<div class="wf-step"><div class="wf-dot">${reviewPos(D, i)}</div><div><div class="t">${fnBadge(s.fn, 'sm')}${esc(s.fn)} <span class="muted">·</span> ${s.req === 'approve' ? (isFinalStep(D, i) ? 'Final approval' : 'Approval') : 'Review'} ${lvl(s.level)}</div><div class="s">${esc(stepTeamTxt(s))} · ${esc(who(s))}</div></div></div>`).join('')}</div>` : '<p class="muted">Steps appear here as you add them.</p>'}</div></section>
    <section class="panel"><div class="panel-head"><h3>Checks</h3></div><div class="panel-body stack" style="gap:8px">${!D.steps.length ? `<div class="check-row"><span class="no">${icon('x', 'sm')}</span>Add at least one step</div>` : issues.length ? issues.map(([t, msg]) => `<div class="check-row"><span class="${t === 'bad' ? 'no' : 'ok'}" style="${t === 'warn' ? 'color:var(--warn)' : ''}">${icon(t === 'bad' ? 'x' : 'alert', 'sm')}</span>${esc(msg)}</div>`).join('') : `<div class="check-row"><span class="ok">${icon('check', 'sm')}</span>Route is valid</div>`}</div></section>
  </aside></form>`;
}

function wfIssues(D) {
  const out = [];
  if (!D.steps.length) out.push(['bad', 'Add at least one step.']);
  D.steps.forEach((s, i) => { if (isNotify(s) && !notifyTo(s).length) out.push(['bad', 'Step ' + (i + 1) + ': choose who receives the email.']); });
  D.steps.forEach((s, i) => { if (s.req === 'approve' && s.level === 'Member') out.push(['bad', 'Step ' + (i + 1) + ': approval steps must be held by a Lead.']); });
  const rv = D.steps.filter(s => !isNotify(s)); const last = rv[rv.length - 1]; if (!rv.length) out.push(['bad', 'Add at least one review step.']); if (last && last.req !== 'approve') out.push(['bad', 'The last step must be a final approval.']);
  uniq(D.steps.filter(s => !isNotify(s)).map(s => s.fn)).forEach(fn => { const st = D.steps.filter(s => s.fn === fn); if (!st.some(s => s.req === 'approve')) out.push(['warn', fn + ' has a review step but no Lead approval.']); if (!fnInfo(fn).active || !fnInfo(fn).reviews) out.push(['bad', fn + ' is not an active review function.']); });
  D.steps.forEach((s, i) => { if (!isNotify(s) && !assigneeFor(s).length) out.push(['warn', 'Step ' + (i + 1) + ': no active ' + stepWho(s) + (s.team ? ' in ' + team(s.team).name : '') + ' — nobody can act on it.']); });
  return out;
}

