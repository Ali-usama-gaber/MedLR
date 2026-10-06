/* ---------- Core: state, helpers, workflow engine ---------- */
const STORE_KEY = 'saja-medlr-demo-v5';
let S = load();
const UI = { route: { name: S.signedIn ? 'home' : 'login', p: {} }, history: [], modal: null, pop: null, navOpen: false, guide: false, search: '', toasts: [], f: {}, draft: null, sel: {}, wfSel: null };

function load() { try { const raw = sessionStorage.getItem(STORE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.version === 3) return s; } } catch (e) {} return SEED(); }
function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }
function resetDemo() { S = SEED(); S.signedIn = true; save(); UI.history = []; UI.f = {}; go('home', {}, true); toast('Demo data reset'); }

/* helpers */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtD = t => { if (!t) return '—'; const x = new Date(t); return x.getDate() + ' ' + MON[x.getMonth()] + ' ' + x.getFullYear(); };
const fmtT = t => { const x = new Date(t); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
const fmtDT = t => fmtD(t) + ' · ' + fmtT(t);
const ago = t => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; const dd = Math.floor(s / 86400); return dd === 1 ? 'yesterday' : dd + ' days ago'; };
const daysTo = t => Math.ceil((t - Date.now()) / DAY);
const initials = n => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
const uid = p => p + '-' + Math.random().toString(36).slice(2, 7);
const toISO = t => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const fromISO = s => { if (!s) return null; const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd, 12).getTime(); };

const me = () => S.users.find(u => u.id === S.personaId);
const user = id => S.users.find(u => u.id === id) || { id, name: 'Unknown', type: '', seniority: null };
const product = id => S.products.find(p => p.id === id) || { name: id };
const market = id => S.markets.find(m => m.id === id) || { name: id };
const team = id => S.teams.find(t => t.id === id) || { name: '—' };
const modById = id => S.modules.find(m => m.id === id);
const assetById = id => S.assets.find(a => a.id === id);
const wfById = id => S.workflows.find(w => w.id === id);
const refById = id => S.references.find(r => r.id === id) || { title: id, source: '' };
const roleLabel = u => u.type === 'Administrator' ? 'Administrator' : (u.seniority ? u.seniority + ' ' : '') + u.type;
const isAdmin = u => u.type === 'Administrator';
const canCreateModule = u => u.type === 'Content Owner';
const canCreateAsset = u => u.type === 'Marketing User' || u.type === 'Content Owner';

function authority(type, sen) {
  const fn = FUNCTION_OF[type];
  if (type === 'Administrator') return { short: 'System configuration', long: 'Configures users, teams, roles, products, markets, material types and workflows. No review authority.', final: false };
  if (fn) return sen === 'Senior'
    ? { short: 'Final ' + fn + ' approval', long: 'Reviews the Junior review, can return items to the Junior reviewer and gives the final ' + fn + ' approval with e-signature.', final: true }
    : { short: 'Initial ' + fn + ' review', long: 'Reviews content, comments, requests changes and sends the item to the Senior ' + fn + ' Reviewer.', final: false };
  if (type === 'Content Owner') return sen === 'Senior'
    ? { short: 'Submits for review', long: 'Creates modules, submits them for MLR review and submits drafts prepared by Junior Content Owners.', final: true }
    : { short: 'Drafts content', long: 'Creates and edits drafts. Submission for review is done by a Senior Content Owner.', final: false };
  if (type === 'Marketing User') return sen === 'Senior'
    ? { short: 'Submits assets', long: 'Assembles assets from approved modules and submits them for review.', final: true }
    : { short: 'Assembles assets', long: 'Assembles assets from approved modules. Submission is done by a Senior Marketing User.', final: false };
  return { short: '—', long: '', final: false };
}
function responsibilities(type, sen) {
  const fn = FUNCTION_OF[type];
  if (fn) return sen === 'Senior'
    ? [['Review and comment', 1], ['Request changes', 1], ['Return to Junior reviewer', 1], ['Final ' + fn + ' approval with e-signature', 1], ['Reject content', 1], ['Approve own content', 0]]
    : [['Review and comment', 1], ['Request changes', 1], ['Send to Senior reviewer', 1], ['Reject content', 1], ['Final ' + fn + ' approval', 0]];
  if (type === 'Content Owner') return sen === 'Senior'
    ? [['Create and edit modules', 1], ['Submit for MLR review', 1], ['Submit Junior drafts', 1], ['Create new versions', 1], ['Approve content', 0]]
    : [['Create and edit modules', 1], ['Send drafts to Senior Content Owner', 1], ['Submit for MLR review', 0], ['Approve content', 0]];
  if (type === 'Marketing User') return sen === 'Senior'
    ? [['Assemble assets', 1], ['Add new content (triggers review)', 1], ['Submit assets for review', 1], ['Approve content', 0]]
    : [['Assemble assets', 1], ['Send assets to Senior Marketing User', 1], ['Submit assets for review', 0]];
  return [['Manage users, teams and roles', 1], ['Manage products, markets and material types', 1], ['Configure workflows', 1], ['Review or approve content', 0]];
}

/* module helpers */
const latest = m => m.versions[m.versions.length - 1];
const live = m => [...m.versions].reverse().find(v => v.status === 'Approved') || null;
const ver = (m, v) => m.versions.find(x => x.v === v);
function lifeStatus(m) {
  if (m.archived) return 'Archived';
  const l = latest(m);
  if (l.status !== 'Approved') return l.status;
  if (m.expiry && m.expiry < Date.now()) return 'Review Required';
  if (m.expiry && daysTo(m.expiry) <= 45) return 'Expiring';
  return usedInApproved(m.id) ? 'Active' : 'Approved';
}
const usedInApproved = id => S.assets.some(a => a.status === 'Approved' && a.blocks.some(b => b.moduleId === id));
// Status colours: approved = green, pending / waiting = yellow, rejected / blocked = red, inactive = grey.
const STATUS_TONE = { 'Draft': 'dim', 'In Review': 'warn', 'Awaiting Senior submit': 'warn', 'Pending': 'warn', 'Changes Requested': 'warn', 'Approved': 'ok', 'Active': 'ok', 'Expiring': 'warn', 'Review Required': 'bad', 'Superseded': 'dim', 'Archived': 'dim', 'Rejected': 'bad', 'Re-approval required': 'warn', 'Inactive': 'dim' };
function toneOf(s) {
  if (STATUS_TONE[s]) return STATUS_TONE[s];
  if (/reject/i.test(s)) return 'bad';
  if (/approv|complete/i.test(s)) return 'ok';
  if (/email/i.test(s)) return 'dim';
  if (/request|return|send|sent|pending|review|await/i.test(s)) return 'warn';
  return '';
}
const TONE_ICON = { ok: 'check', warn: 'clock', bad: 'x' };
const chip = (s, extra = '') => { const t = toneOf(s); const ic = TONE_ICON[t]; return `<span class="chip ${t}${ic ? ' has-ico' : ''}">${ic ? icon(ic, 'sm') : ''}${esc(s)}${extra}</span>`; };
const sen = s => s ? `<span class="sen ${s === 'Senior' ? 'senior' : 'junior'}">${s === 'Senior' ? icon('shield', 'sm') : ''}${s}</span>` : '';
const avatar = (u, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(u.name))}</span>`;

function impactedAssets(m) {
  const lv = live(m); if (!lv) return [];
  return S.assets.filter(a => a.blocks.some(b => b.moduleId === m.id && b.v < lv.v));
}
function eligibility(m, a) {
  const lv = live(m);
  const checks = [
    ['Approved', !!lv && !m.archived],
    [market(a.market).name + ' eligible', m.markets.includes(a.market)],
    [a.channel + ' channel', m.channels.includes(a.channel)],
    ['Not expired', !(m.expiry && m.expiry < Date.now())]
  ];
  const prodOk = m.product === a.product;
  return { ok: prodOk && checks.every(c => c[1]), checks, prodOk, reason: !prodOk ? 'Different product' : (checks.find(c => !c[1]) || [''])[0] };
}

/* workflow engine */
const isNotify = s => !!s && s.kind === 'notify';
function notifyTo(s) { const names = (s.recipients || []).map(id => S.users.find(u => u.id === id)).filter(Boolean).map(u => u.name); const ext = String(s.emails || '').split(/[,;\s]+/).filter(Boolean); return [...names, ...ext]; }
function notifyStep(extra) { return { id: uid('s'), kind: 'notify', fn: 'Email', recipients: [], emails: '', subject: 'Step approved — next action', message: 'The previous review step has been approved. No action is needed unless you are the next reviewer.', ...(extra || {}) }; }
function stepTitle(s) { return isNotify(s) ? 'Email notification' : s.fn + ' · ' + (s.req === 'approve' ? 'Final approval' : 'Review'); }
function reviewSteps(wf) { return wf.steps.filter(s => !isNotify(s)); }
function reviewPos(wf, i) { return wf.steps.slice(0, i + 1).filter(s => !isNotify(s)).length; }
// Email steps fire as soon as the review reaches them (i.e. the step before was approved) and then pass straight on.
function runNotifies(obj, kind, v) {
  const wf = wfById(obj.review.wf); let sent = 0;
  while (isNotify(wf.steps[obj.review.step])) {
    const s = wf.steps[obj.review.step]; const to = notifyTo(s);
    S.outbox = S.outbox || []; S.outbox.push({ id: uid('e'), ts: Date.now(), to, toIds: [...(s.recipients || [])], subject: s.subject, objType: kind, objId: obj.id });
    S.audit.push({ id: uid('a'), ts: Date.now(), user: S.personaId, action: 'Email sent', objType: kind, objId: obj.id, version: v, note: (to.length ? 'To ' + to.join(', ') : 'No recipients') + ' · ' + (s.subject || ''), toIds: [...(s.recipients || [])], auto: true });
    obj.review.comments.push({ by: S.personaId, at: Date.now(), text: s.subject || '', decision: 'Email sent', step: obj.review.step, fn: 'Email', to });
    obj.review.step++; sent += to.length;
  }
  return sent;
}
function stepLabel(st) { if (isNotify(st)) return 'Email notification'; return st.fn + ' · ' + (st.req === 'approve' ? (st.seniority + ' approval') : (st.seniority + ' review')); }
function curStep(obj) { if (!obj.review) return null; const wf = wfById(obj.review.wf); return wf.steps[obj.review.step] || null; }
function assigneeFor(st) { return S.users.filter(u => u.status === 'Active' && u.type === REVIEWER_OF[st.fn] && u.seniority === st.seniority); }
function canActOn(u, obj) { const st = curStep(obj); return !!st && u.type === REVIEWER_OF[st.fn] && u.seniority === st.seniority; }
function nextLabel(obj) {
  const wf = wfById(obj.review.wf); const st = wf.steps[obj.review.step]; const nx = wf.steps.slice(obj.review.step + 1).find(s => !isNotify(s));
  if (!nx) return 'Complete review';
  if (nx.fn === st.fn && nx.seniority === 'Senior') return 'Send to Senior';
  return 'Send to ' + nx.fn;
}
function juniorStepIndex(obj) { const wf = wfById(obj.review.wf); const st = curStep(obj); for (let i = obj.review.step - 1; i >= 0; i--) if (wf.steps[i].fn === st.fn && wf.steps[i].seniority === 'Junior') return i; return -1; }

function log(action, objType, objId, version, note) { S.audit.push({ id: uid('a'), ts: Date.now(), user: S.personaId, action, objType, objId, version, note: note || '' }); }

function submitModule(m) {
  const u = me(); const l = latest(m);
  if (u.type === 'Content Owner' && u.seniority === 'Junior') {
    l.status = 'Awaiting Senior submit'; log('Sent to Senior Content Owner for submission', 'Module', m.id, l.v); save();
    return 'sent-senior';
  }
  m.review = { wf: 'WF-STD', step: 0, submittedAt: Date.now(), comments: [] };
  l.status = 'In Review'; m.changes = null; m.updatedAt = Date.now();
  log(l.v > 1 && m.versions.some(v => v.status === 'Approved' || v.status === 'Superseded') ? 'Submitted for re-approval' : 'Submitted for review', 'Module', m.id, l.v);
  save(); return 'in-review';
}
function decide(obj, kind, decision, note) {
  const isMod = kind === 'Module';
  const wf = wfById(obj.review.wf); const st = curStep(obj);
  const v = isMod ? latest(obj).v : 1;
  const push = d => obj.review.comments.push({ by: S.personaId, at: Date.now(), text: note || '', decision: d, step: obj.review.step, fn: st.fn, seniority: st.seniority });
  if (decision === 'send') {
    const lbl = nextLabel(obj); push(lbl); log(lbl, kind, obj.id, v, note);
    obj.review.step++; const mailed = runNotifies(obj, kind, v); save(); return { done: false, msg: (lbl === 'Send to Senior' ? 'Sent to Senior ' + st.fn + ' Reviewer' : 'Review completed — moved to ' + (wf.steps[obj.review.step] ? stepLabel(wf.steps[obj.review.step]) : 'approval')) + (mailed ? ' · email sent to ' + mailed : '') };
  }
  if (decision === 'approve') {
    push('Final ' + st.fn + ' approval'); log('Final ' + st.fn + ' approval', kind, obj.id, v, note);
    obj.review.step++; const mailed = runNotifies(obj, kind, v);
    if (obj.review.step >= wf.steps.length) {
      if (isMod) {
        const l = latest(obj); const prev = live(obj);
        if (prev && prev !== l) { prev.status = 'Superseded'; log('Version superseded', 'Module', obj.id, prev.v, 'Replaced by v' + l.v); }
        l.status = 'Approved'; l.approvedAt = Date.now(); l.by = S.personaId; l.history = obj.review.comments; obj.review = null; obj.updatedAt = Date.now();
        log('Module approved', 'Module', obj.id, l.v, 'Available in the Approved Content Library');
      } else {
        obj.status = 'Approved'; obj.approvedAt = Date.now(); obj.history = obj.review.comments; obj.review = null;
        obj.blocks.forEach(b => { if (b.kind === 'new') b.approved = true; });
        log('Asset approved', 'Asset', obj.id, 1);
      }
      save(); return { done: true };
    }
    save(); return { done: false, msg: 'Final ' + st.fn + ' approval recorded — moved to ' + stepLabel(wf.steps[obj.review.step]) + (mailed ? ' · email sent to ' + mailed : '') };
  }
  if (decision === 'return') {
    const j = juniorStepIndex(obj); push('Returned to Junior'); log('Returned to Junior', kind, obj.id, v, note);
    obj.review.step = j; save(); return { done: false, msg: 'Returned to Junior ' + st.fn + ' Reviewer' };
  }
  if (decision === 'changes' || decision === 'reject') {
    const lbl = decision === 'changes' ? 'Requested changes' : 'Rejected';
    push(lbl); log(lbl, kind, obj.id, v, note);
    if (isMod) { const l = latest(obj); l.status = decision === 'changes' ? 'Changes Requested' : 'Rejected'; l.lastReview = obj.review.comments; obj.changes = note; obj.review = null; }
    else { obj.status = decision === 'changes' ? 'Changes Requested' : 'Rejected'; obj.lastReview = obj.review.comments; obj.changes = note; obj.review = null; }
    save(); return { done: false, msg: decision === 'changes' ? 'Changes requested — sent back to the owner' : 'Rejected' };
  }
}

/* tasks for a persona */
function tasksFor(u) {
  const out = [];
  S.modules.forEach(m => {
    if (m.review && canActOn(u, m)) { const st = curStep(m); out.push({ kind: 'review', obj: m, type: 'Module', title: m.title, id: m.id, step: st, since: m.review.comments.length ? m.review.comments[m.review.comments.length - 1].at : m.review.submittedAt }); }
    const l = latest(m);
    if (u.type === 'Content Owner') {
      if (l.status === 'Changes Requested' && m.owner === u.id) out.push({ kind: 'revise', obj: m, type: 'Module', title: m.title, id: m.id, since: m.updatedAt });
      if (l.status === 'Awaiting Senior submit' && u.seniority === 'Senior') out.push({ kind: 'submit', obj: m, type: 'Module', title: m.title, id: m.id, since: m.updatedAt });
      if (l.status === 'Draft' && m.owner === u.id) out.push({ kind: 'draft', obj: m, type: 'Module', title: m.title, id: m.id, since: m.updatedAt });
    }
  });
  S.assets.forEach(a => {
    if (a.review && canActOn(u, a)) { const st = curStep(a); out.push({ kind: 'review', obj: a, type: 'Asset', title: a.name, id: a.id, step: st, since: a.review.submittedAt }); }
    if (u.type === 'Marketing User' || u.type === 'Content Owner') {
      if (a.status === 'Changes Requested' && a.owner === u.id) out.push({ kind: 'revise', obj: a, type: 'Asset', title: a.name, id: a.id, since: a.createdAt });
      if (a.status === 'Awaiting Senior submit' && u.type === 'Marketing User' && u.seniority === 'Senior') out.push({ kind: 'submit', obj: a, type: 'Asset', title: a.name, id: a.id, since: a.createdAt });
    }
  });
  if (u.type === 'Content Owner' && u.seniority === 'Senior') S.modules.forEach(m => { if (lifeStatus(m) === 'Expiring' || lifeStatus(m) === 'Review Required') out.push({ kind: 'expiry', obj: m, type: 'Module', title: m.title, id: m.id, since: m.expiry }); });
  return out;
}

/* asset review steps (new content requires full functional review) */
function assetWorkflow(a) {
  const hasNew = a.blocks.some(b => b.kind === 'new');
  return hasNew ? 'WF-ASSET-FULL' : 'WF-ASSET-STREAM';
}
function ensureAssetWorkflows() {
  if (!wfById('WF-ASSET-FULL')) S.workflows.push({ id: 'WF-ASSET-FULL', name: 'Asset — new content', desc: 'Assets containing content that is not an approved module.', active: true, system: true, steps: [ { id: 'af1', fn: 'Medical', seniority: 'Senior', req: 'approve' }, { id: 'af2', fn: 'Regulatory', seniority: 'Senior', req: 'approve' } ] });
  if (!wfById('WF-ASSET-STREAM')) S.workflows.push({ id: 'WF-ASSET-STREAM', name: 'Asset — approved modules only', desc: 'Streamlined: every block is an approved, eligible module.', active: true, system: true, steps: [ { id: 'as1', fn: 'Regulatory', seniority: 'Senior', req: 'approve' } ] });
}
ensureAssetWorkflows();

/* icons (Lucide-style line icons) */
const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  team: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  workflow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  stethoscope: '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  filecheck: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  shieldcheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  evidence: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  pointer: '<path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  sparkle: '<path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="m5.6 5.6 2.1 2.1"/><path d="m16.3 16.3 2.1 2.1"/><path d="m5.6 18.4 2.1-2.1"/><path d="m16.3 7.7 2.1-2.1"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>'
};
const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
const FN_ICON = { Medical: 'stethoscope', Legal: 'scale', Regulatory: 'filecheck', Email: 'mail' };
function fnBadge(fn, cls = '') { return `<span class="fn-badge fn-${String(fn).toLowerCase()} ${cls}" title="${fn}">${icon(FN_ICON[fn] || 'shieldcheck', 'sm')}</span>`; }
const TYPE_ICON = { 'Clinical Claim': 'quote', 'Safety Statement': 'alert', 'Headline': 'type', 'Supporting Evidence': 'evidence', 'CTA': 'pointer', 'Reference': 'book', 'new': 'edit' };
const typeIco = t => `<span class="type-ico" aria-hidden="true">${icon(TYPE_ICON[t] || 'file', 'sm')}</span>`;
