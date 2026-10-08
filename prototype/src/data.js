/* ---------- SAJA MedLR — reference data and initial workspace ---------- */
const DAY = 86400000, HOUR = 3600000;
const NOW0 = Date.now();
const d = (offsetDays, h = 10, m = 0) => { const t = new Date(NOW0 + offsetDays * DAY); t.setHours(h, m, 0, 0); return t.getTime(); };

// Organisation model: every person belongs to a function and holds a level within it.
const FUNCS = ['Content', 'Medical', 'Legal', 'Regulatory', 'Marketing'];
const REVIEW_FUNCS = ['Medical', 'Legal', 'Regulatory'];
const LEVELS = ['Member', 'Lead'];
const FUNC_DESC = { Content: 'Creates and owns modules', Medical: 'Medical review and approval', Legal: 'Legal review and approval', Regulatory: 'Regulatory review and approval', Marketing: 'Assembles assets', Administrator: 'Configures and governs the system' };

const PERMS = [
  ['view', 'View content', 'Content'], ['create', 'Create', 'Content'], ['edit', 'Edit', 'Content'], ['submit', 'Submit for review', 'Content'], ['amend', 'Amend & resubmit', 'Content'],
  ['review', 'Review', 'Approval'], ['request_amend', 'Request amendment', 'Approval'], ['approve', 'Approve step', 'Approval'], ['final_approve', 'Final approve', 'Approval'], ['reject', 'Reject', 'Approval'],
  ['manage_users', 'Manage users', 'Administration'], ['manage_workflows', 'Manage workflows', 'Administration'], ['manage_sops', 'Manage SOPs', 'Administration'], ['manage_library', 'Manage library', 'Administration'], ['manage_settings', 'Manage settings', 'Administration'],
  ['view_reports', 'View reports', 'Insight'], ['view_audit', 'View audit trail', 'Insight']
];
const DEFAULT_ROLES = () => ({
  'Content-Member': ['view', 'create', 'edit', 'amend'],
  'Content-Lead': ['view', 'create', 'edit', 'submit', 'amend', 'view_reports'],
  'Marketing-Member': ['view', 'create', 'edit', 'amend'],
  'Marketing-Lead': ['view', 'create', 'edit', 'submit', 'amend', 'view_reports'],
  'Medical-Member': ['view', 'review', 'request_amend', 'approve', 'reject', 'view_audit'],
  'Medical-Lead': ['view', 'review', 'request_amend', 'approve', 'final_approve', 'reject', 'view_audit', 'view_reports'],
  'Legal-Member': ['view', 'review', 'request_amend', 'approve', 'reject', 'view_audit'],
  'Legal-Lead': ['view', 'review', 'request_amend', 'approve', 'final_approve', 'reject', 'view_audit', 'view_reports'],
  'Regulatory-Member': ['view', 'review', 'request_amend', 'approve', 'reject', 'view_audit'],
  'Regulatory-Lead': ['view', 'review', 'request_amend', 'approve', 'final_approve', 'reject', 'view_audit', 'view_reports', 'manage_library'],
  'Administrator': PERMS.map(p => p[0])
});

const SOP_RULES = {
  product: 'At least one product selected',
  country: 'At least one country selected',
  reference: 'Reference attached',
  evidence: 'Medical evidence cited (study or registry)',
  safety: 'Safety statement included',
  disclaimer: 'Local disclaimer included',
  metadata: 'Mandatory metadata complete',
  review_window: 'Review date within the allowed period'
};

const PEOPLE = { 'Content-Lead': 'u-omar', 'Content-Member': 'u-hana', 'Medical-Member': 'u-ahmed', 'Medical-Lead': 'u-sara', 'Legal-Member': 'u-mona', 'Legal-Lead': 'u-rania', 'Regulatory-Member': 'u-tarek', 'Regulatory-Lead': 'u-layla', 'Marketing-Lead': 'u-karim', 'Marketing-Member': 'u-youssef' };
const WF_SEED = {
  'WF-STD': [['Medical', 'Member', 'review'], ['Medical', 'Lead', 'approve'], ['Legal', 'Member', 'review'], ['Legal', 'Lead', 'approve'], ['Regulatory', 'Member', 'review'], ['Regulatory', 'Lead', 'approve']],
  'WF-LOW': [['Medical', 'Lead', 'approve'], ['Regulatory', 'Lead', 'approve']],
  'WF-ASSET-FULL': [['Medical', 'Lead', 'approve'], ['Regulatory', 'Lead', 'approve']],
  'WF-ASSET-STREAM': [['Regulatory', 'Lead', 'approve']]
};

// Deterministic pseudo-random so the initial workspace is identical on every load.
let RS = 7; const rnd = () => (RS = (RS * 16807) % 2147483647) / 2147483647;
const hrs = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 10) / 10;

/* Simulate one approval cycle through a seed workflow.
   o.amendAt: step that asked for an amendment (later resumed at the same step)
   o.rejectAt / o.pendingAmendAt / o.stopAt: cycle ends there */
function sim(wfId, start, o = {}) {
  const steps = WF_SEED[wfId]; let t = start; const decisions = []; let amendments = 0; const owner = o.owner || 'u-omar';
  const slow = o.slow || {};
  for (let i = 0; i < steps.length; i++) {
    const [fn, level, req] = steps[i]; const by = PEOPLE[fn + '-' + level];
    const base = fn === 'Medical' ? [6, 40] : fn === 'Legal' ? [4, 30] : [10, 52];
    if (o.stopAt === i) return { start, end: null, outcome: 'In progress', amendments, decisions, step: i, stepStartedAt: t };
    const s0 = t; t += hrs(...(slow[fn] || base)) * HOUR;
    if (o.pendingAmendAt === i) { decisions.push({ step: i, fn, level, req, by, startedAt: s0, at: t, decision: 'Amendment requested', note: o.note || '' }); return { start, end: null, outcome: 'Amendment requested', amendments: 1, decisions, step: i }; }
    if (o.rejectAt === i) { decisions.push({ step: i, fn, level, req, by, startedAt: s0, at: t, decision: 'Rejected', note: o.note || '' }); return { start, end: t, outcome: 'Rejected', amendments, decisions }; }
    if (o.amendAt === i) {
      decisions.push({ step: i, fn, level, req, by, startedAt: s0, at: t, decision: 'Amendment requested', note: o.note || '' }); amendments++;
      t += hrs(8, 30) * HOUR; decisions.push({ step: i, fn: 'Content', level: 'Lead', req: 'owner', by: owner, at: t, decision: 'Amended & resubmitted', note: o.fix || 'Updated as requested.' });
      const s1 = t; t += hrs(2, 9) * HOUR; decisions.push({ step: i, fn, level, req, by, startedAt: s1, at: t, decision: req === 'approve' ? 'Approved' : 'Reviewed', note: '' });
      continue;
    }
    decisions.push({ step: i, fn, level, req, by, startedAt: s0, at: t, decision: req === 'approve' ? 'Approved' : 'Reviewed', note: o.notes && o.notes[i] || '' });
  }
  return { start, end: t, outcome: 'Approved', amendments, decisions };
}
function ver(v, body, refs, createdAt, createdBy, reason, cycles, status) {
  const done = cycles.filter(c => c.outcome === 'Approved').slice(-1)[0];
  return { v, body, refs, createdAt, createdBy, reason, status: status || (done ? 'Approved' : 'Draft'), cycles: cycles.map((c, i) => ({ n: i + 1, wf: c.wf, ...c })), approvedAt: done ? done.end : null, approvedBy: done ? done.decisions.slice(-1)[0].by : null };
}
const cy = (wf, start, o) => ({ wf, ...sim(wf, start, o) });

function mod(id, title, type, products, indications, audience, markets, channels, owner, versions, o = {}) {
  const m = { id, title, type, products, indications, audience, markets, channels, owner, versions, expiry: o.expiry || null, reviewDate: o.reviewDate || (o.expiry ? o.expiry - 90 * DAY : null), createdAt: versions[0].createdAt, updatedAt: o.updatedAt || versions[versions.length - 1].createdAt, review: null, resume: null, archived: !!o.archived };
  const l = versions[versions.length - 1]; const c = l.cycles[l.cycles.length - 1];
  if (c && c.outcome === 'In progress') { l.status = 'In Review'; m.review = { wf: c.wf, step: c.step, cycle: c.n, stepStartedAt: c.stepStartedAt }; }
  if (c && c.outcome === 'Amendment requested') { l.status = 'Amendment Requested'; const dd = c.decisions.slice(-1)[0]; m.resume = { wf: c.wf, step: c.step, cycle: c.n, by: dd.by, at: dd.at, note: dd.note, fn: dd.fn, level: dd.level }; }
  if (c && c.outcome === 'Rejected') l.status = 'Rejected';
  if (o.archived) l.status = 'Archived';
  versions.forEach((v, i) => { if (v.status === 'Approved' && versions.slice(i + 1).some(x => x.status === 'Approved' || x.status === 'Archived')) v.status = 'Superseded'; });
  return m;
}
function asset(id, name, type, products, markets, channel, audience, owner, blocks, versions, o = {}) {
  const a = { id, name, type, products, markets, channel, audience, owner, disclaimer: o.disclaimer || '', blocks: blocks.map(([mid, v], i) => mid === 'new' ? { id: id + '-b' + i, kind: 'new', text: v, label: 'Body copy' } : { id: id + '-b' + i, kind: 'module', moduleId: mid, v }), versions, createdAt: versions[0].createdAt, review: null, resume: null };
  const l = versions[versions.length - 1]; const c = l.cycles[l.cycles.length - 1];
  if (c && c.outcome === 'In progress') { l.status = 'In Review'; a.review = { wf: c.wf, step: c.step, cycle: c.n, stepStartedAt: c.stepStartedAt }; }
  if (l.status === 'Approved') a.blocks.forEach(b => { if (b.kind === 'new') b.approved = true; });
  return a;
}

const SEED = () => {
  RS = 7;
  const S = {
    version: 6,
    personaId: 'u-ali',
    signedIn: false,
    settings: { orgName: 'SAJA Pharma', expiryWarnDays: 45, reviewReminderDays: 30, defaultValidityMonths: 12, libraryShowExpiring: true, requireSignature: true, adminActsOnAnyStep: true, defaultModuleWorkflow: 'WF-STD', newVersionWorkflow: 'WF-LOW' },
    roles: DEFAULT_ROLES(),
    products: [
      { id: 'P-A', name: 'Product A', area: 'Cardiology', indications: ['Chronic heart failure', 'Post-MI care'], status: 'Active' },
      { id: 'P-B', name: 'Product B', area: 'Respiratory', indications: ['Persistent asthma', 'COPD maintenance'], status: 'Active' },
      { id: 'P-C', name: 'Product C', area: 'Diabetes', indications: ['Type 2 diabetes'], status: 'Active' }
    ],
    markets: [
      { id: 'SA', name: 'Saudi Arabia', authority: 'SFDA', lang: 'Arabic, English', active: true },
      { id: 'AE', name: 'UAE', authority: 'MOHAP', lang: 'Arabic, English', active: true },
      { id: 'KW', name: 'Kuwait', authority: 'MOH Kuwait', lang: 'Arabic, English', active: true },
      { id: 'EG', name: 'Egypt', authority: 'EDA', lang: 'Arabic', active: true }
    ],
    materialTypes: [
      { id: 'MT-1', name: 'HCP Email', channel: 'Email', workflow: 'WF-ASSET-FULL' },
      { id: 'MT-2', name: 'Detail Aid', channel: 'Detail aid', workflow: 'WF-ASSET-FULL' },
      { id: 'MT-3', name: 'Leave-behind', channel: 'Print', workflow: 'WF-ASSET-FULL' },
      { id: 'MT-4', name: 'Web Banner', channel: 'Web', workflow: 'WF-ASSET-FULL' },
      { id: 'MT-5', name: 'Social Post', channel: 'Social', workflow: 'WF-ASSET-FULL' }
    ],
    audiences: ['HCP – Cardiologists', 'HCP – General practitioners', 'HCP – Pulmonologists', 'HCP – Endocrinologists', 'Pharmacists'],
    channels: ['Email', 'Detail aid', 'Print', 'Web', 'Social'],
    moduleTypes: ['Clinical Claim', 'Safety Statement', 'Headline', 'Supporting Evidence', 'CTA', 'Reference'],
    teams: [
      { id: 'T-CON', name: 'Content — Cardiology', fn: 'Content' }, { id: 'T-CON2', name: 'Content — Respiratory & Diabetes', fn: 'Content' },
      { id: 'T-MED', name: 'Medical Affairs', fn: 'Medical' }, { id: 'T-LEG', name: 'Legal', fn: 'Legal' }, { id: 'T-REG', name: 'Regulatory Affairs', fn: 'Regulatory' },
      { id: 'T-MKT', name: 'Marketing', fn: 'Marketing' }, { id: 'T-ADM', name: 'Platform Administration', fn: 'Administrator' }
    ],
    users: [
      ['u-omar', 'Omar Khalil', 'Content', 'Lead', 'T-CON'], ['u-hana', 'Hana Zaki', 'Content', 'Member', 'T-CON2'],
      ['u-ahmed', 'Ahmed Ali', 'Medical', 'Member', 'T-MED'], ['u-sara', 'Sara Ahmed', 'Medical', 'Lead', 'T-MED'],
      ['u-mona', 'Mona Adel', 'Legal', 'Member', 'T-LEG'], ['u-rania', 'Rania Haddad', 'Legal', 'Lead', 'T-LEG'],
      ['u-tarek', 'Tarek Samir', 'Regulatory', 'Member', 'T-REG'], ['u-layla', 'Layla Nasser', 'Regulatory', 'Lead', 'T-REG'],
      ['u-karim', 'Karim Fawzi', 'Marketing', 'Lead', 'T-MKT'], ['u-youssef', 'Youssef Amin', 'Marketing', 'Member', 'T-MKT'],
      ['u-ali', 'Ali Usama', 'Administrator', null, 'T-ADM'], ['u-dina', 'Dina Mostafa', 'Regulatory', 'Member', 'T-REG', 'Inactive']
    ].map(([id, name, fn, level, team, status]) => ({ id, name, email: name.toLowerCase().replace(' ', '.') + '@saja.com', fn, level, team, status: status || 'Active' })),
    workflows: [
      { id: 'WF-STD', name: 'Promotional content — Standard', desc: 'Medical, Legal and Regulatory review with Team Member review and Team Lead approval.', active: true },
      { id: 'WF-LOW', name: 'Low-risk updates — Team Lead only', desc: 'Reference and formatting updates with no new claims.', active: true },
      { id: 'WF-ASSET-FULL', name: 'Assets — new content', desc: 'Assets that contain text that is not an approved module.', active: true, system: true },
      { id: 'WF-ASSET-STREAM', name: 'Assets — approved modules only', desc: 'Streamlined: every block is an approved, eligible module.', active: true, system: true }
    ].map(w => ({ ...w, steps: WF_SEED[w.id].map(([fn, level, req], i) => ({ id: w.id + '-s' + i, fn, level, req })) })),
    references: [
      { id: 'REF-A-01', kind: 'study', title: 'ALPHA-HF study — primary results', source: 'Clinical study report CSR-ALPHA-01, 2025' },
      { id: 'REF-A-02', kind: 'study', title: 'ALPHA-HF study — 24-month extension', source: 'Clinical study report CSR-ALPHA-02, 2026' },
      { id: 'REF-A-03', kind: 'label', title: 'Product A — Summary of Product Characteristics', source: 'SAJA Pharma, 2026' },
      { id: 'REF-A-04', kind: 'registry', title: 'HEART-QOL registry', source: 'Registry report HQ-2025' },
      { id: 'REF-B-01', kind: 'study', title: 'BREATHE-2 study', source: 'Clinical study report CSR-BR2, 2025' },
      { id: 'REF-B-02', kind: 'label', title: 'Product B — Summary of Product Characteristics', source: 'SAJA Pharma, 2026' },
      { id: 'REF-C-01', kind: 'study', title: 'GLUCO-ONE study', source: 'Clinical study report CSR-G1, 2026' },
      { id: 'REF-C-02', kind: 'label', title: 'Product C — Summary of Product Characteristics', source: 'SAJA Pharma, 2026' }
    ],
    sops: [
      { id: 'SOP-01', name: 'Product selected', rule: 'product', appliesTo: 'Both', scope: { types: [], products: [], markets: [] }, guidance: 'Select every product the content refers to.', active: true },
      { id: 'SOP-02', name: 'Country selected', rule: 'country', appliesTo: 'Both', scope: { types: [], products: [], markets: [] }, guidance: 'Select every country where the content will be used.', active: true },
      { id: 'SOP-03', name: 'Reference required for claims and evidence', rule: 'reference', appliesTo: 'Module', scope: { types: ['Clinical Claim', 'Supporting Evidence'], products: [], markets: [] }, guidance: 'Attach the reference that supports the statement.', active: true },
      { id: 'SOP-04', name: 'Medical evidence for clinical claims', rule: 'evidence', appliesTo: 'Module', scope: { types: ['Clinical Claim'], products: [], markets: [] }, guidance: 'Cite at least one study or registry, not only the product label.', active: true },
      { id: 'SOP-05', name: 'Safety statement in promotional materials', rule: 'safety', appliesTo: 'Asset', scope: { types: [], products: [], markets: [] }, guidance: 'Add an approved Safety Statement module for each product in the material.', active: true },
      { id: 'SOP-06', name: 'Local disclaimer — Kuwait and Egypt', rule: 'disclaimer', appliesTo: 'Asset', scope: { types: [], products: [], markets: ['KW', 'EG'] }, guidance: 'Add the local regulatory disclaimer in the material properties.', active: true },
      { id: 'SOP-07', name: 'Mandatory metadata', rule: 'metadata', appliesTo: 'Both', scope: { types: [], products: [], markets: [] }, guidance: 'Complete audience, channels, review date and expiry.', active: true },
      { id: 'SOP-08', name: 'Product B — annual review', rule: 'review_window', months: 12, appliesTo: 'Module', scope: { types: [], products: ['P-B'], markets: [] }, guidance: 'Set the periodic review date within 12 months.', active: true }
    ],
    notifSeen: 0,
    outbox: []
  };

  const P = (v, body, refs, created, by, reason, cycles, status) => ver(v, body, refs, created, by, reason, cycles, status);
  S.modules = [
    mod('MOD-A-014', 'Clinical Claim A — Hospitalisation reduction', 'Clinical Claim', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA', 'AE', 'KW'], ['Email', 'Detail aid', 'Print', 'Web'], 'u-omar', [
      P(1, 'In the ALPHA-HF study, Product A reduced heart-failure hospitalisation versus standard care.¹', ['REF-A-01'], d(-430), 'u-omar', 'Initial version', [cy('WF-STD', d(-428, 9))]),
      P(2, 'In the ALPHA-HF study, Product A reduced heart-failure hospitalisation by 21% versus standard care at 12 months.¹', ['REF-A-01'], d(-118), 'u-omar', 'Added the effect size and time point from the final study report.', [cy('WF-STD', d(-116, 9), { amendAt: 0, note: 'State the time point (12 months) next to the 21% figure.', fix: 'Time point added.' })])
    ], { expiry: d(253), reviewDate: d(163) }),
    mod('MOD-A-021', 'Headline — A steadier course in heart failure', 'Headline', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA', 'AE', 'KW', 'EG'], ['Email', 'Detail aid', 'Print', 'Web', 'Social'], 'u-omar', [
      P(1, 'A steadier course for patients living with heart failure', [], d(-150), 'u-omar', 'Initial version', [cy('WF-STD', d(-148, 9))])], { expiry: d(225) }),
    mod('MOD-A-030', 'Safety Statement A — Renal monitoring', 'Safety Statement', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA', 'AE', 'KW', 'EG'], ['Email', 'Detail aid', 'Print', 'Web', 'Social'], 'u-omar', [
      P(1, 'Product A is not recommended in severe renal impairment.³', ['REF-A-03'], d(-500), 'u-omar', 'Initial version', [cy('WF-STD', d(-498, 9))]),
      P(2, 'Product A is not recommended in severe renal impairment. Monitor renal function before treatment.³', ['REF-A-03'], d(-260), 'u-omar', 'Label update: renal monitoring added.', [cy('WF-LOW', d(-258, 9))]),
      P(3, 'Product A is not recommended in severe renal impairment. Monitor renal function and serum potassium before and during treatment. Refer to the full prescribing information before prescribing.³', ['REF-A-03'], d(-96), 'u-omar', 'Label update: potassium monitoring added.', [cy('WF-STD', d(-94, 9), { amendAt: 5, note: 'Add a pointer to the full prescribing information.', fix: 'Pointer added at the end of the statement.' })])
    ], { expiry: d(275) }),
    mod('MOD-A-033', 'Supporting Evidence — Quality-of-life data', 'Supporting Evidence', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA', 'AE'], ['Email', 'Detail aid'], 'u-omar', [
      P(1, 'Patients in the HEART-QOL registry reported improved daily activity scores after 6 months of treatment with Product A.⁴', ['REF-A-04'], d(-345), 'u-omar', 'Initial version', [cy('WF-STD', d(-343, 9), { slow: { Regulatory: [60, 110] } })])], { expiry: d(24) }),
    mod('MOD-A-040', 'CTA — Request a representative visit', 'CTA', ['P-A', 'P-B'], ['Chronic heart failure', 'Persistent asthma'], 'HCP – General practitioners', ['SA', 'AE', 'KW', 'EG'], ['Email', 'Web'], 'u-omar', [
      P(1, 'Request a visit from your SAJA representative', [], d(-150), 'u-omar', 'Initial version', [cy('WF-STD', d(-147, 9))])], { expiry: d(225) }),
    mod('MOD-A-002', 'Reference — ALPHA-HF primary publication', 'Reference', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA', 'AE', 'KW', 'EG'], ['Email', 'Detail aid', 'Print', 'Web'], 'u-omar', [
      P(1, '1. ALPHA-HF study — primary results. Clinical study report CSR-ALPHA-01, 2025.', ['REF-A-01'], d(-160), 'u-omar', 'Initial version', [cy('WF-LOW', d(-158, 9))])], { expiry: d(580) }),
    mod('MOD-A-025', 'Supporting Evidence — Real-world registry', 'Supporting Evidence', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA'], ['Detail aid', 'Print'], 'u-omar', [
      P(1, 'Registry data show consistent outcomes with Product A across age groups.⁴', ['REF-A-04'], d(-380), 'u-omar', 'Initial version', [cy('WF-STD', d(-378, 9))])], { expiry: d(-6) }),
    mod('MOD-A-009', 'Clinical Claim A — Early symptom relief', 'Clinical Claim', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA'], ['Detail aid'], 'u-omar', [
      P(1, 'Product A improved breathlessness scores within 4 weeks.¹', ['REF-A-01'], d(-610), 'u-omar', 'Initial version', [cy('WF-STD', d(-608, 9))])], { expiry: d(-210), archived: true }),
    mod('MOD-A-018', 'Clinical Claim — Once-daily dosing', 'Clinical Claim', ['P-A'], ['Chronic heart failure'], 'HCP – Cardiologists', ['SA', 'AE', 'KW'], ['Email', 'Detail aid'], 'u-omar', [
      P(1, 'Product A is taken once daily, with or without food.³', ['REF-A-03', 'REF-A-01'], d(-4), 'u-omar', 'Initial version', [cy('WF-STD', d(-3, 9, 30), { stopAt: 1 })])], { expiry: d(365) }),
    mod('MOD-B-007', 'Clinical Claim — Exacerbation reduction', 'Clinical Claim', ['P-B'], ['Persistent asthma'], 'HCP – Pulmonologists', ['SA', 'AE'], ['Email', 'Detail aid'], 'u-omar', [
      P(1, 'In the BREATHE-2 study, Product B reduced the annual rate of moderate exacerbations versus placebo.¹', ['REF-B-01'], d(-2), 'u-omar', 'Initial version', [cy('WF-STD', d(-1, 14, 5), { stopAt: 0 })])], { expiry: d(330), reviewDate: d(300) }),
    mod('MOD-B-011', 'Safety Statement B — Inhaler technique', 'Safety Statement', ['P-B'], ['Persistent asthma'], 'HCP – Pulmonologists', ['SA', 'AE', 'KW', 'EG'], ['Email', 'Print'], 'u-hana', [
      P(1, 'Rinse the mouth after each inhalation. Review inhaler technique at every visit.²', ['REF-B-02'], d(-12), 'u-hana', 'Initial version', [cy('WF-STD', d(-11, 9), { pendingAmendAt: 5, owner: 'u-hana', note: 'Add the oral candidiasis warning from section 4.4 of the SmPC.' })])], { expiry: d(350), reviewDate: d(320) }),
    mod('MOD-B-015', 'Headline — Breathe on your terms', 'Headline', ['P-B'], ['Persistent asthma'], 'HCP – Pulmonologists', ['AE', 'KW'], ['Social', 'Web'], 'u-hana', [
      P(1, 'Breathe on your terms', [], d(-1), 'u-hana', 'Initial version', [])], { expiry: d(365), reviewDate: d(330) }),
    mod('MOD-B-003', 'Headline — Control that fits the day', 'Headline', ['P-B'], ['Persistent asthma'], 'HCP – Pulmonologists', ['SA', 'AE', 'KW'], ['Email', 'Detail aid', 'Web'], 'u-hana', [
      P(1, 'Asthma control that fits the day', [], d(-210), 'u-hana', 'Initial version', [cy('WF-STD', d(-208, 9), { owner: 'u-hana', slow: { Legal: [20, 60] } })])], { expiry: d(150), reviewDate: d(120) }),
    mod('MOD-B-009', 'Supporting Evidence — Symptom-free days', 'Supporting Evidence', ['P-B'], ['Persistent asthma'], 'HCP – Pulmonologists', ['SA', 'AE'], ['Email', 'Detail aid'], 'u-hana', [
      P(1, 'In BREATHE-2, patients on Product B reported more symptom-free days than with placebo.¹', ['REF-B-01'], d(-180), 'u-hana', 'Initial version', [cy('WF-STD', d(-178, 9), { owner: 'u-hana', amendAt: 2, note: 'Use the wording agreed in the local label.', fix: 'Wording aligned with the label.' })])], { expiry: d(180), reviewDate: d(150) }),
    mod('MOD-C-001', 'Headline — Steady glucose, every day', 'Headline', ['P-C'], ['Type 2 diabetes'], 'HCP – Endocrinologists', ['SA', 'EG', 'KW'], ['Email', 'Detail aid', 'Print'], 'u-hana', [
      P(1, 'Steady glucose control, every day', [], d(-70), 'u-hana', 'Initial version', [cy('WF-STD', d(-68, 9), { owner: 'u-hana', slow: { Regulatory: [40, 90] } })])], { expiry: d(295) }),
    mod('MOD-C-002', 'Safety Statement C — Hypoglycaemia', 'Safety Statement', ['P-C'], ['Type 2 diabetes'], 'HCP – Endocrinologists', ['SA', 'EG', 'KW'], ['Email', 'Detail aid', 'Print'], 'u-hana', [
      P(1, 'Product C may increase the risk of hypoglycaemia when used with insulin or a sulfonylurea. Refer to the full prescribing information.²', ['REF-C-02'], d(-66), 'u-hana', 'Initial version', [cy('WF-STD', d(-64, 9), { owner: 'u-hana' })])], { expiry: d(299) }),
    mod('MOD-C-003', 'Clinical Claim C — HbA1c reduction', 'Clinical Claim', ['P-C'], ['Type 2 diabetes'], 'HCP – Endocrinologists', ['EG', 'KW'], ['Email', 'Detail aid'], 'u-hana', [
      P(1, 'Product C delivers the strongest HbA1c reduction in its class.¹', ['REF-C-01'], d(-20), 'u-hana', 'Initial version', [cy('WF-STD', d(-19, 9), { owner: 'u-hana', rejectAt: 3, note: 'Comparative superiority claim is not supported by a head-to-head study. Rewrite against the study endpoint.' })])], { expiry: d(345) }),
    mod('MOD-X-001', 'Safety Statement — Adverse event reporting', 'Safety Statement', ['P-A', 'P-B', 'P-C'], ['Chronic heart failure', 'Persistent asthma', 'Type 2 diabetes'], 'HCP – General practitioners', ['SA', 'AE', 'KW', 'EG'], ['Email', 'Detail aid', 'Print', 'Web', 'Social'], 'u-omar', [
      P(1, 'Report suspected adverse events to SAJA Pharmacovigilance and to your national reporting system.', [], d(-240), 'u-omar', 'Initial version', [cy('WF-LOW', d(-238, 9))])], { expiry: d(125) })
  ];
  S.modules.forEach(m => { m.updatedAt = Math.max(...m.versions.flatMap(v => [v.createdAt, ...v.cycles.flatMap(c => c.decisions.map(x => x.at))])); });

  const A = (v, created, by, reason, cycles, status) => ver(v, '', [], created, by, reason, cycles, status);
  S.assets = [
    asset('AST-101', 'HCP Email — Heart failure launch', 'HCP Email', ['P-A'], ['SA', 'KW'], 'Email', 'HCP – Cardiologists', 'u-karim', [['MOD-A-021', 1], ['MOD-A-014', 2], ['MOD-A-033', 1], ['MOD-A-030', 3], ['MOD-A-040', 1]], [A(1, d(-64), 'u-karim', 'Initial version', [cy('WF-ASSET-STREAM', d(-62, 9))])], { disclaimer: 'For healthcare professionals in Kuwait only. Approved by the Ministry of Health.' }),
    asset('AST-102', 'Detail Aid — ALPHA-HF results', 'Detail Aid', ['P-A'], ['SA'], 'Detail aid', 'HCP – Cardiologists', 'u-karim', [['MOD-A-021', 1], ['MOD-A-014', 2], ['MOD-A-030', 3]], [A(1, d(-84), 'u-karim', 'Initial version', [cy('WF-ASSET-STREAM', d(-82, 9))])]),
    asset('AST-103', 'Leave-behind — Cardiology congress', 'Leave-behind', ['P-A'], ['AE'], 'Print', 'HCP – Cardiologists', 'u-youssef', [['MOD-A-014', 1], ['MOD-A-030', 3], ['MOD-A-002', 1]], [A(1, d(-140), 'u-youssef', 'Initial version', [cy('WF-ASSET-STREAM', d(-138, 9))])]),
    asset('AST-104', 'Web Banner — Hospitalisation data', 'Web Banner', ['P-A'], ['AE'], 'Web', 'HCP – Cardiologists', 'u-karim', [['MOD-A-021', 1], ['MOD-A-014', 2], ['MOD-A-030', 3], ['MOD-A-040', 1]], [A(1, d(-34), 'u-karim', 'Initial version', [cy('WF-ASSET-FULL', d(-32, 9), { owner: 'u-karim' })])]),
    asset('AST-105', 'HCP Email — Asthma control', 'HCP Email', ['P-B'], ['AE', 'KW'], 'Email', 'HCP – Pulmonologists', 'u-youssef', [['MOD-B-003', 1]], [A(1, d(-1), 'u-youssef', 'Initial version', [], 'Draft')]),
    asset('AST-106', 'Detail Aid — Product C launch', 'Detail Aid', ['P-C'], ['EG', 'KW'], 'Detail aid', 'HCP – Endocrinologists', 'u-karim', [['MOD-C-001', 1], ['new', 'Meet the SAJA diabetes team at the regional congress in November.'], ['MOD-C-002', 1], ['MOD-X-001', 1]], [A(1, d(-3), 'u-karim', 'Initial version', [cy('WF-ASSET-FULL', d(-2, 11), { stopAt: 0, owner: 'u-karim' })])], { disclaimer: 'For healthcare professionals only. Local regulatory reference available on request.' })
  ];

  S.audit = seedAudit(S);
  return S;
};

/* Build the audit trail for the initial workspace from the recorded versions and cycles. */
function seedAudit(S) {
  const out = []; const roleOf = id => { const u = S.users.find(x => x.id === id); return u.fn === 'Administrator' ? 'Administrator' : u.fn + ' Team ' + u.level; };
  const push = (ts, user, action, objType, obj, version, extra = {}) => out.push({ id: 'a' + out.length, ts, user, role: roleOf(user), action, objType, objId: obj.id, version, products: [...(obj.products || [])], markets: [...(obj.markets || [])], note: '', prev: '', next: '', ...extra });
  const stepName = x => x.fn + ' Team ' + x.level;
  const cycleEvents = (obj, kind, v, c) => {
    push(c.start, obj.owner, v.v > 1 && kind === 'Module' ? 'Submitted for re-approval' : 'Submitted for review', kind, obj, v.v, { note: (S.workflows.find(w => w.id === c.wf) || {}).name });
    c.decisions.forEach(x => {
      if (x.decision === 'Amended & resubmitted') return push(x.at, x.by, 'Amended & resubmitted', kind, obj, v.v, { note: x.note + ' Resumed at ' + c.decisions.find(y => y.step === x.step && y.decision === 'Amendment requested').fn + ' review.' });
      if (x.decision === 'Amendment requested') return push(x.at, x.by, 'Amendment requested', kind, obj, v.v, { note: x.note });
      if (x.decision === 'Rejected') return push(x.at, x.by, 'Rejected', kind, obj, v.v, { note: x.note });
      push(x.at, x.by, x.req === 'approve' ? x.fn + ' approval' : 'Workflow step completed', kind, obj, v.v, { note: stepName(x) + (x.req === 'approve' ? ' approved with e-signature' : ' review completed') + (x.note ? ' · ' + x.note : '') });
    });
    if (c.outcome === 'Approved') push(c.end + 60000, c.decisions.slice(-1)[0].by, kind === 'Module' ? 'Module approved' : 'Asset approved', kind, obj, v.v, { prev: 'In Review', next: 'Approved' });
  };
  S.modules.forEach(m => m.versions.forEach((v, i) => {
    push(v.createdAt, v.createdBy, i === 0 ? 'Module created' : 'Version created', 'Module', m, v.v, i ? { note: v.reason, prev: 'v' + m.versions[i - 1].v, next: 'v' + v.v } : {});
    v.cycles.forEach(c => cycleEvents(m, 'Module', v, c));
    const nx = m.versions[i + 1]; if (v.status === 'Superseded' && nx && nx.approvedAt) push(nx.approvedAt + 120000, nx.approvedBy, 'Module superseded', 'Module', m, v.v, { prev: 'v' + v.v + ' Approved', next: 'v' + nx.v + ' Approved' });
  }));
  S.assets.forEach(a => {
    push(a.createdAt, a.owner, 'Asset created', 'Asset', a, 1);
    a.blocks.filter(b => b.kind === 'module').forEach((b, k) => push(a.createdAt + (k + 1) * 60000, a.owner, 'Module reused', 'Asset', a, 1, { note: b.moduleId + ' v' + b.v + ' added' }));
    a.versions.forEach(v => v.cycles.forEach(c => cycleEvents(a, 'Asset', v, c)));
  });
  return out.sort((x, y) => x.ts - y.ts);
}
