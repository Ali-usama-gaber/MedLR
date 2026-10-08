/* ---------- Core: state, permissions, validation, approval engine ---------- */
const STORE_KEY = 'saja-medlr-v7';
let S = load();
const UI = { route: { name: S.signedIn ? 'home' : 'login', p: {} }, modal: null, pop: null, search: '', f: {}, draft: null, sel: {}, wfSel: null };

function load() { try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.version === 7) return s; } } catch (e) {} return SEED(); }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }

/* helpers */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtD = t => { if (!t) return '—'; const x = new Date(t); return x.getDate() + ' ' + MON[x.getMonth()] + ' ' + x.getFullYear(); };
const fmtT = t => { const x = new Date(t); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
const fmtDT = t => fmtD(t) + ' · ' + fmtT(t);
const ago = t => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; const dd = Math.floor(s / 86400); return dd === 1 ? 'yesterday' : dd + ' days ago'; };
const daysTo = t => Math.ceil((t - Date.now()) / DAY);
const durDays = ms => Math.round(ms / DAY * 10) / 10;
const fmtDur = ms => { const dd = ms / DAY; return dd < 1 ? Math.max(1, Math.round(ms / HOUR)) + ' h' : (Math.round(dd * 10) / 10) + ' days'; };
const initials = n => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
const uid = p => p + '-' + Math.random().toString(36).slice(2, 7);
const toISO = t => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const fromISO = s => { if (!s) return null; const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd, 12).getTime(); };
const uniq = a => [...new Set(a)];
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

const me = () => S.users.find(u => u.id === S.personaId) || S.users.find(u => u.fn === 'Administrator');
const user = id => S.users.find(u => u.id === id) || { id, name: 'Unknown', fn: '', level: null };
// Every configurable value is stored by id and resolved here, so a rename shows everywhere.
const product = id => S.products.find(p => p.id === id) || { id, name: id };
const market = id => S.markets.find(m => m.id === id) || { id, name: id };
const mtype = id => S.moduleTypes.find(t => t.id === id) || S.moduleTypes.find(t => t.name === id) || { id, name: id || '—', icon: 'file', tone: 'ref' };
const mat = id => S.materialTypes.find(t => t.id === id) || { id, name: id || '—' };
const chan = id => S.channels.find(c => c.id === id) || { id, name: id || '—' };
const aud = id => S.audiences.find(a => a.id === id) || { id, name: id || '—' };
const fnInfo = id => S.functions.find(f => f.id === id) || { id, desc: '', reviews: false };
const funcIds = (all) => S.functions.filter(f => all || f.active).map(f => f.id);
const reviewFuncs = (all) => S.functions.filter(f => f.reviews && (all || f.active)).map(f => f.id);
const channelsTxt = ids => (ids || []).map(i => chan(i).name).join(', ');
const activeOf = (list, keep = []) => list.filter(x => x.active || [].concat(keep).includes(x.id));
const team = id => S.teams.find(t => t.id === id) || { name: '—' };
const modById = id => S.modules.find(m => m.id === id);
const assetById = id => S.assets.find(a => a.id === id);
const objById = (kind, id) => kind === 'Asset' ? assetById(id) : modById(id);
const kindOf = o => o.blocks ? 'Asset' : 'Module';
const nameOf = o => o.title || o.name;
const wfById = id => S.workflows.find(w => w.id === id);
const refById = id => S.references.find(r => r.id === id) || { id, title: id, source: '', kind: 'other' };
const refKind = k => (REF_KINDS.find(x => x[0] === k) || [k, k])[1];
const productsTxt = ids => (ids || []).map(i => product(i).name).join(', ');
const marketsTxt = ids => (ids || []).map(i => market(i).name).join(', ');

/* ---------- people, roles, permissions ---------- */
const levelName = l => l === 'Lead' ? 'Team Lead' : l === 'Member' ? 'Team Member' : '';
const isAdmin = u => !!u && u.fn === 'Administrator';
const roleId = u => isAdmin(u) ? 'Administrator' : u.fn + '-' + u.level;
const roleLabel = u => isAdmin(u) ? 'Administrator' : u.fn + ' ' + levelName(u.level);
const roleName = id => id === 'Administrator' ? 'Administrator' : id.replace(/-(Member|Lead)$/, ' Team $1');
const stepWho = s => s.fn + ' ' + levelName(s.level);
const can = (u, perm) => isAdmin(u) || ((S.roles[roleId(u)] || []).includes(perm));
const canCreateModule = u => can(u, 'create');
const canCreateAsset = u => can(u, 'create');
// Edit rights: the owner or the owner's team, with the Edit permission. Administrators always.
const sameTeam = (u, o) => !!o && (o.owner === u.id || user(o.owner).team === u.team);
const canEditObj = (u, o) => isAdmin(u) || (can(u, 'edit') && sameTeam(u, o));
const canAmendObj = (u, o) => isAdmin(u) || (can(u, 'amend') && sameTeam(u, o));
const canSubmit = u => can(u, 'submit');
const roleIds = () => [...funcIds(true).flatMap(f => LEVELS.map(l => f + '-' + l)), 'Administrator'];

function authority(fn, level) {
  if (fn === 'Administrator') return { short: 'Full system control', long: 'Manages users, roles, permissions, workflows, SOPs and all configuration, sees every report and the full audit trail, and can act on any approval step.', final: true };
  const rid = fn + '-' + level; const has = p => (S.roles[rid] || []).includes(p);
  if (fnInfo(fn).reviews) return level === 'Lead'
    ? { short: (has('final_approve') ? 'Final ' : '') + fn + ' approval', long: 'Reviews the Team Member review, can return items to the Team Member and gives the ' + fn + ' approval with e-signature.', final: has('final_approve') }
    : { short: 'Initial ' + fn + ' review', long: 'Reviews content, comments, requests amendments and passes the item to the ' + fn + ' Team Lead.', final: false };
  return has('submit') ? { short: 'Creates and submits content', long: fnInfo(fn).desc + '. Can submit content for MLR review.', final: true } : { short: 'Prepares content', long: fnInfo(fn).desc + '. Submission is done by a Team Lead of the same team.', final: false };
}

/* ---------- versions and status ---------- */
const latest = o => o.versions[o.versions.length - 1];
const live = o => [...o.versions].reverse().find(v => v.status === 'Approved') || null;
const verOf = (o, v) => o.versions.find(x => x.v === v);
const statusOf = o => latest(o).status;
// The scope a version was approved for. The module/asset fields are the working copy of the latest version.
// A version still being worked on reads the live fields; approved and superseded versions read their snapshot.
const metaOf = (o, v) => (!v || (v === latest(o) && !['Approved', 'Superseded', 'Archived'].includes(v.status))) ? o : (v.meta || o);
const liveMeta = o => { const lv = live(o); return lv ? metaOf(o, lv) : o; };
const usedInApproved = id => S.assets.some(a => live(a) && (live(a).blocks || a.blocks).some(b => b.moduleId === id));
function lifeStatus(m) {
  if (m.archived) return 'Archived';
  const st = statusOf(m);
  if (st !== 'Approved') return st;
  if (m.expiry && m.expiry < Date.now()) return 'Review Required';
  if (m.expiry && daysTo(m.expiry) <= S.settings.expiryWarnDays) return 'Expiring';
  return usedInApproved(m.id) ? 'Active' : 'Approved';
}
// Library status of the approved version, even while a newer version is being worked on.
function libraryStatus(m) {
  if (m.archived || !live(m)) return null; const exp = liveMeta(m).expiry;
  if (exp && exp < Date.now()) return 'Review Required';
  if (exp && daysTo(exp) <= S.settings.expiryWarnDays) return 'Expiring';
  return usedInApproved(m.id) ? 'Active' : 'Approved';
}
const STATUS_TONE = { 'Draft': 'dim', 'In Review': 'warn', 'Awaiting Lead submission': 'warn', 'Amendment Requested': 'warn', 'Approved': 'ok', 'Active': 'ok', 'Expiring': 'warn', 'Review Required': 'bad', 'Superseded': 'dim', 'Archived': 'dim', 'Rejected': 'bad', 'Inactive': 'dim', 'In progress': 'warn' };
function toneOf(s) {
  if (STATUS_TONE[s]) return STATUS_TONE[s];
  if (/reject|fail|issue/i.test(s)) return 'bad';
  if (/approv|complete|pass|resolved/i.test(s)) return 'ok';
  if (/email|created|edited|changed|added|removed|reused|assigned|signed in/i.test(s)) return 'dim';
  if (/amend|request|return|submit|review|await|started/i.test(s)) return 'warn';
  return '';
}
const TONE_ICON = { ok: 'check', warn: 'clock', bad: 'x' };
const chip = (s, extra = '') => { const t = toneOf(s); const ic = TONE_ICON[t]; return `<span class="chip ${t}${ic ? ' has-ico' : ''}">${ic ? icon(ic, 'sm') : ''}${esc(s)}${extra}</span>`; };
const lvl = l => l ? `<span class="sen ${l === 'Lead' ? 'senior' : 'junior'}">${l === 'Lead' ? icon('shield', 'sm') : ''}${levelName(l)}</span>` : '';
const avatar = (u, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(u.name))}</span>`;
const tagList = (ids, kind) => `<span class="tags">${(ids || []).map(x => `<span class="tag" title="${esc(kind === 'p' ? product(x).name : market(x).name)}">${esc(kind === 'p' ? product(x).name : x)}</span>`).join('')}</span>`;

function impactedAssets(m) { const lv = live(m); if (!lv) return []; return S.assets.filter(a => a.blocks.some(b => b.moduleId === m.id && b.v < lv.v)); }
// Eligibility always uses the approved (live) version's scope, never an unapproved draft's.
function eligibility(m, a) {
  const lv = live(m); const lm = liveMeta(m);
  const missingMk = (a.markets || []).filter(x => !lm.markets.includes(x));
  const checks = [
    ['Approved', !!lv && !m.archived],
    [missingMk.length ? 'Not approved for ' + missingMk.join(', ') : 'Countries covered', !missingMk.length],
    [chan(a.channel).name + ' channel', lm.channels.includes(a.channel)],
    ['Not expired', !(lm.expiry && lm.expiry < Date.now())]
  ];
  const prodOk = lm.products.some(p => (a.products || []).includes(p));
  return { ok: prodOk && checks.every(c => c[1]), checks, prodOk, reason: !prodOk ? 'Different product' : (checks.find(c => !c[1]) || [''])[0] };
}

/* ---------- Validation SOPs ---------- */
function sopApplies(sop, obj, kind) {
  if (!sop.active) return false;
  if (sop.appliesTo !== 'Both' && sop.appliesTo !== kind) return false;
  const sc = sop.scope || {};
  if (sc.types && sc.types.length && !sc.types.includes(obj.type)) return false;
  if (sc.products && sc.products.length && !(obj.products || []).some(p => sc.products.includes(p))) return false;
  if (sc.markets && sc.markets.length && !(obj.markets || []).some(p => sc.markets.includes(p))) return false;
  return true;
}
function sopCheck(sop, obj, kind) {
  const isM = kind === 'Module'; const v = isM ? latest(obj) : null;
  switch (sop.rule) {
    case 'product': return (obj.products || []).length > 0 ? null : 'No product selected.';
    case 'country': return (obj.markets || []).length > 0 ? null : 'No country selected.';
    case 'reference': return isM && !v.refs.length ? 'Attach at least one reference.' : null;
    case 'evidence': return isM && !v.refs.some(r => EVIDENCE_KINDS.includes(refById(r).kind)) ? 'Cite a clinical study, registry or publication.' : null;
    case 'safety': {
      if (isM) return null;
      const covered = uniq(obj.blocks.filter(b => b.kind === 'module').map(b => { const m = modById(b.moduleId); return m && metaOf(m, verOf(m, b.v)); }).filter(x => x && mtype(x.type).safety).flatMap(x => x.products));
      const miss = (obj.products || []).filter(p => !covered.includes(p));
      return miss.length ? 'Add an approved safety statement module (' + S.moduleTypes.filter(t => t.safety).map(t => t.name).join(' / ') + ') for ' + productsTxt(miss) + '.' : null;
    }
    case 'disclaimer': { if (isM) return null; const mk = (sop.scope.markets || []).filter(x => obj.markets.includes(x)); return (obj.disclaimer || '').trim().length < 10 ? 'Add the local disclaimer required for ' + marketsTxt(mk) + '.' : null; }
    case 'metadata': {
      const miss = isM ? [!obj.audience && 'audience', !obj.channels.length && 'channels', !obj.reviewDate && 'review date', !obj.expiry && 'expiry date'].filter(Boolean) : [!obj.audience && 'audience', !obj.channel && 'channel', !obj.type && 'material type'].filter(Boolean);
      return miss.length ? 'Complete: ' + miss.join(', ') + '.' : null;
    }
    case 'review_window': { const months = sop.months || 12; return isM && (!obj.reviewDate || obj.reviewDate > Date.now() + months * 30.5 * DAY) ? 'Set the review date within ' + months + ' months.' : null; }
  }
  return null;
}
function validate(obj, kind) {
  kind = kind || kindOf(obj);
  return S.sops.filter(s => sopApplies(s, obj, kind)).map(s => { const issue = sopCheck(s, obj, kind); return { sop: s, ok: !issue, issue, label: s.name }; });
}
const validationIssues = (obj, kind) => validate(obj, kind).filter(x => !x.ok);

/* ---------- workflow engine ---------- */
const isNotify = s => !!s && s.kind === 'notify';
function notifyTo(s) { const names = (s.recipients || []).map(id => S.users.find(u => u.id === id)).filter(Boolean).map(u => u.name); const ext = String(s.emails || '').split(/[,;\s]+/).filter(Boolean); return [...names, ...ext]; }
function notifyStep(extra) { return { id: uid('s'), kind: 'notify', fn: 'Email', recipients: [], emails: '', subject: 'Step approved — next action', message: 'The previous review step has been approved. No action is needed unless you are the next reviewer.', ...(extra || {}) }; }
const reviewSteps = wf => wf.steps.filter(s => !isNotify(s));
const reviewPos = (wf, i) => wf.steps.slice(0, i + 1).filter(s => !isNotify(s)).length;
function stepLabel(st) { if (!st) return ''; if (isNotify(st)) return 'Email notification'; return st.fn + ' · ' + levelName(st.level) + (st.req === 'approve' ? ' approval' : ' review'); }
function curStep(obj) { if (!obj.review) return null; const wf = wfById(obj.review.wf); return wf.steps[obj.review.step] || null; }
function curCycle(obj) { const r = obj.review || obj.resume; if (!r) return null; return latest(obj).cycles.find(c => c.n === r.cycle) || null; }
// Reviewers are the active users holding the step's role (and team, when the step names one).
function assigneeFor(st) { return S.users.filter(u => u.status === 'Active' && u.fn === st.fn && u.level === st.level && (!st.team || u.team === st.team)); }
const isFinalStep = (wf, i) => !wf.steps.slice(i + 1).some(s => !isNotify(s));
// The permission a step needs: review → Review, approval → Approve, last approval → Final approval.
function stepPerm(wf, i) { const s = wf.steps[i]; return s.req === 'approve' ? (isFinalStep(wf, i) ? 'final_approve' : 'approve') : 'review'; }
function canActOn(u, obj) {
  const st = curStep(obj); if (!st || isNotify(st)) return false;
  if (isAdmin(u)) return S.settings.adminActsOnAnyStep !== false;
  return u.status === 'Active' && u.fn === st.fn && u.level === st.level && (!st.team || u.team === st.team) && can(u, stepPerm(wfById(obj.review.wf), obj.review.step));
}
function nextStepOf(obj) { const wf = wfById(obj.review.wf); return wf.steps.slice(obj.review.step + 1).find(s => !isNotify(s)) || null; }
function memberStepIndex(obj) { const wf = wfById(obj.review.wf); const st = curStep(obj); for (let i = obj.review.step - 1; i >= 0; i--) if (wf.steps[i].fn === st.fn && wf.steps[i].level === 'Member') return i; return -1; }
const stepTeamTxt = s => s.team ? team(s.team).name : 'Any ' + s.fn + ' team';

/* audit */
function log(action, kind, obj, version, extra = {}) {
  const u = me();
  S.audit.push({ id: uid('a'), ts: Date.now(), user: u.id, role: roleLabel(u), action, objType: kind, objId: obj ? obj.id : '', version: version || (obj && obj.versions ? latest(obj).v : 1), products: obj && obj.products ? [...obj.products] : [], markets: obj && obj.markets ? [...obj.markets] : [], note: '', prev: '', next: '', ...extra });
}
function logAssigned(obj, kind) {
  const st = curStep(obj); if (!st || isNotify(st)) return;
  const who = assigneeFor(st);
  log('User assigned', kind, obj, null, { note: stepWho(st) + (st.req === 'approve' ? ' approval' : ' review'), next: who.map(x => x.name).join(', ') || 'No active ' + stepWho(st) });
}
// Email steps fire when the review reaches them (the step before was approved), then the review moves on.
function runNotifies(obj, kind) {
  const wf = wfById(obj.review.wf); let sent = 0; const cyc = curCycle(obj);
  while (isNotify(wf.steps[obj.review.step])) {
    const s = wf.steps[obj.review.step]; const to = notifyTo(s);
    S.outbox.push({ id: uid('e'), ts: Date.now(), to, toIds: [...(s.recipients || [])], subject: s.subject, objType: kind, objId: obj.id });
    log('Email sent', kind, obj, null, { note: s.subject || '', next: to.join(', ') || 'No recipients', toIds: [...(s.recipients || [])], auto: true });
    cyc.decisions.push({ step: obj.review.step, fn: 'Email', level: null, req: 'notify', by: me().id, at: Date.now(), decision: 'Email sent', note: to.join(', ') });
    obj.review.step++; sent += to.length;
  }
  obj.review.stepStartedAt = Date.now();
  return sent;
}

function setStatus(obj, s) { latest(obj).status = s; }
// Start a full approval cycle from the first step.
function startCycle(obj, kind, wfId) {
  const v = latest(obj); const n = v.cycles.length + 1;
  v.cycles.push({ n, wf: wfId, start: Date.now(), end: null, outcome: 'In progress', amendments: 0, decisions: [] });
  obj.review = { wf: wfId, step: 0, cycle: n, stepStartedAt: Date.now() }; obj.resume = null;
  setStatus(obj, 'In Review'); obj.updatedAt = Date.now();
  log(v.v > 1 && kind === 'Module' && obj.versions.some(x => ['Approved', 'Superseded'].includes(x.status)) ? 'Submitted for re-approval' : 'Submitted for review', kind, obj, v.v, { note: wfById(wfId).name + ' · cycle ' + n, prev: 'Draft', next: 'In Review' });
  const mailed = runNotifies(obj, kind); logAssigned(obj, kind);
  return mailed;
}
// Amend & resubmit: resume the same cycle at the step that asked for the amendment.
function resumeAmended(obj, kind, note) {
  const r = obj.resume; const cyc = latest(obj).cycles.find(c => c.n === r.cycle);
  cyc.decisions.push({ step: r.step, fn: 'Owner', level: null, req: 'owner', by: me().id, role: roleLabel(me()), at: Date.now(), decision: 'Amended & resubmitted', note: note || '' });
  obj.review = { wf: r.wf, step: r.step, cycle: r.cycle, stepStartedAt: Date.now() }; obj.resume = null;
  setStatus(obj, 'In Review'); obj.updatedAt = Date.now();
  const st = curStep(obj);
  log('Amended & resubmitted', kind, obj, null, { note: (note ? note + ' · ' : '') + 'Approval resumed at ' + stepLabel(st), prev: 'Amendment Requested', next: 'In Review' });
  logAssigned(obj, kind);
  return st;
}
function finalise(obj, kind) {
  const v = latest(obj); const cyc = curCycle(obj); const now = Date.now();
  cyc.end = now; cyc.outcome = 'Approved';
  const prev = live(obj);
  v.status = 'Approved'; v.approvedAt = now; v.approvedBy = me().id; v.meta = metaSnap(obj); obj.review = null; obj.updatedAt = now;
  if (kind === 'Module') {
    if (prev && prev !== v) { prev.status = 'Superseded'; log('Module superseded', 'Module', obj, prev.v, { prev: 'v' + prev.v + ' Approved', next: 'v' + v.v + ' Approved', note: 'Replaced by v' + v.v }); }
    log('Module approved', 'Module', obj, v.v, { prev: 'In Review', next: 'Approved', note: 'Available in the Approved Library' });
  } else {
    if (prev && prev !== v) prev.status = 'Superseded';
    obj.blocks.forEach(b => { if (b.kind === 'new') b.approved = true; });
    log('Asset approved', 'Asset', obj, v.v, { prev: 'In Review', next: 'Approved' });
  }
}
/* Reviewer decisions.
   pass    — review step completed, item moves to the next step
   approve — approval step signed (final when it is the last step)
   return  — Team Lead returns the item to the Team Member step
   amend   — Request amendment: back to the owner; resubmission resumes at THIS step
   reject  — Reject: back to the owner; a new version restarts the FULL cycle */
function decide(obj, kind, decision, note) {
  const st = curStep(obj); const cyc = curCycle(obj); const v = latest(obj).v; const u = me(); const now = Date.now();
  const rec = { step: obj.review.step, fn: st.fn, level: st.level, req: st.req, by: u.id, role: roleLabel(u), startedAt: obj.review.stepStartedAt, at: now, note: note || '', admin: isAdmin(u) };
  const onBehalf = isAdmin(u) ? ' (recorded by Administrator)' : '';
  if (decision === 'pass' || decision === 'approve') {
    rec.decision = decision === 'approve' ? 'Approved' : 'Reviewed'; cyc.decisions.push(rec);
    log(decision === 'approve' ? st.fn + ' approval' : 'Workflow step completed', kind, obj, v, { note: stepLabel(st) + (decision === 'approve' ? ' signed' : ' completed') + onBehalf + (note ? ' · ' + note : '') });
    obj.review.step++;
    const wf = wfById(obj.review.wf);
    const mailed = obj.review.step < wf.steps.length ? runNotifies(obj, kind) : 0;
    if (obj.review.step >= wf.steps.length) { finalise(obj, kind); save(); return { done: true }; }
    logAssigned(obj, kind); save();
    return { done: false, msg: stepLabel(st) + ' done — now with ' + stepLabel(curStep(obj)) + (mailed ? ' · email sent to ' + mailed : '') };
  }
  if (decision === 'return') {
    const j = memberStepIndex(obj); rec.decision = 'Returned to Team Member'; cyc.decisions.push(rec);
    log('Returned to Team Member', kind, obj, v, { note, prev: stepLabel(st), next: stepLabel(wfById(obj.review.wf).steps[j]) });
    obj.review.step = j; obj.review.stepStartedAt = now; logAssigned(obj, kind); save();
    return { done: false, msg: 'Returned to the ' + st.fn + ' Team Member' };
  }
  if (decision === 'amend') {
    rec.decision = 'Amendment requested'; cyc.decisions.push(rec); cyc.amendments = (cyc.amendments || 0) + 1;
    obj.resume = { wf: obj.review.wf, step: obj.review.step, cycle: obj.review.cycle, by: u.id, at: now, note, fn: st.fn, level: st.level };
    obj.review = null; setStatus(obj, 'Amendment Requested'); obj.updatedAt = now;
    log('Amendment requested', kind, obj, v, { note: note + onBehalf, prev: 'In Review', next: 'Amendment Requested' });
    save(); return { done: false, msg: 'Amendment requested — after resubmission the review resumes at ' + stepLabel(st) };
  }
  if (decision === 'reject') {
    rec.decision = 'Rejected'; cyc.decisions.push(rec); cyc.end = now; cyc.outcome = 'Rejected';
    obj.review = null; obj.resume = null; setStatus(obj, 'Rejected'); obj.updatedAt = now;
    log('Rejected', kind, obj, v, { note: note + onBehalf, prev: 'In Review', next: 'Rejected' });
    save(); return { done: false, msg: 'Rejected — a new version will restart the full approval cycle' };
  }
}

/* Items that need someone's action. For an Administrator this is the whole system queue. */
function tasksFor(u) {
  const out = []; const admin = isAdmin(u);
  const all = [...S.modules.map(m => ['Module', m]), ...S.assets.map(a => ['Asset', a])];
  all.forEach(([kind, o]) => {
    const st = statusOf(o); const title = nameOf(o);
    if (o.review && canActOn(u, o)) out.push({ kind: 'review', obj: o, type: kind, title, id: o.id, step: curStep(o), since: o.review.stepStartedAt });
    if (st === 'Amendment Requested' && canAmendObj(u, o)) out.push({ kind: 'amend', obj: o, type: kind, title, id: o.id, since: o.resume ? o.resume.at : o.updatedAt });
    if (st === 'Awaiting Lead submission' && (admin || (canSubmit(u) && sameTeam(u, o)))) out.push({ kind: 'submit', obj: o, type: kind, title, id: o.id, since: o.updatedAt });
    if (st === 'Rejected' && canEditObj(u, o)) out.push({ kind: 'rejected', obj: o, type: kind, title, id: o.id, since: o.updatedAt });
    if (st === 'Draft' && !admin && o.owner === u.id) out.push({ kind: 'draft', obj: o, type: kind, title, id: o.id, since: o.updatedAt || o.createdAt });
  });
  return out.sort((a, b) => a.since - b.since);
}

/* asset workflow routing */
// New text routes through the Material Type's workflow; approved-modules-only assets use the streamlined workflow from Settings.
function assetWorkflow(a) { const wf = a.blocks.some(b => b.kind === 'new') ? mat(a.type).workflow : S.settings.assetStreamWorkflow; return wfById(wf) ? wf : (S.workflows.find(w => w.appliesTo === 'Asset' && w.active !== false && !w.hidden) || S.workflows[0]).id; }

/* ---------- approval cycles for reporting ---------- */
function allCycles() {
  const out = [];
  S.modules.forEach(m => m.versions.forEach(v => v.cycles.forEach(c => out.push({ kind: 'Module', obj: m, id: m.id, title: m.title, v: v.v, type: m.type, products: m.products, markets: m.markets, ...c }))));
  S.assets.forEach(a => a.versions.forEach(v => v.cycles.forEach(c => out.push({ kind: 'Asset', obj: a, id: a.id, title: a.name, v: v.v, type: a.type, products: a.products, markets: a.markets, ...c }))));
  return out;
}
// Time spent at each completed step (owner time during an amendment is excluded).
function stepTimes(cycles) {
  const out = [];
  cycles.forEach(c => c.decisions.forEach(x => { if (x.startedAt && x.at && ['Reviewed', 'Approved', 'Amendment requested', 'Rejected', 'Returned to Team Member'].includes(x.decision)) out.push({ fn: x.fn, level: x.level, req: x.req, ms: x.at - x.startedAt, cycle: c, by: x.by, at: x.at, decision: x.decision }); }));
  return out;
}
