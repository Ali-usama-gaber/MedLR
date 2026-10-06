/* SAJA MedLR prototype — demo data. All products, studies, people and figures are fictional. */
const DAY = 86400000;
const NOW0 = Date.now();
const d = (offsetDays, h = 10, m = 0) => { const t = new Date(NOW0 + offsetDays * DAY); t.setHours(h, m, 0, 0); return t.getTime(); };

const USER_TYPES = ['Content Owner', 'Medical Reviewer', 'Legal Reviewer', 'Regulatory Reviewer', 'Marketing User', 'Administrator'];
const FUNCTION_OF = { 'Medical Reviewer': 'Medical', 'Legal Reviewer': 'Legal', 'Regulatory Reviewer': 'Regulatory' };
const REVIEWER_OF = { Medical: 'Medical Reviewer', Legal: 'Legal Reviewer', Regulatory: 'Regulatory Reviewer' };

const SEED = () => ({
  version: 3,
  personaId: 'u-omar',
  signedIn: false,
  products: [
    { id: 'P-A', name: 'Product A', area: 'Cardiology', indications: ['Chronic heart failure', 'Post-MI care'], status: 'Active' },
    { id: 'P-B', name: 'Product B', area: 'Respiratory', indications: ['Persistent asthma', 'COPD maintenance'], status: 'Active' }
  ],
  markets: [
    { id: 'SA', name: 'Saudi Arabia', authority: 'SFDA', lang: 'Arabic, English', active: true },
    { id: 'AE', name: 'UAE', authority: 'MOHAP', lang: 'Arabic, English', active: true },
    { id: 'EG', name: 'Egypt', authority: 'EDA', lang: 'Arabic', active: true }
  ],
  materialTypes: [
    { id: 'MT-1', name: 'HCP Email', channel: 'Email', workflow: 'WF-STD' },
    { id: 'MT-2', name: 'Detail Aid', channel: 'Detail aid', workflow: 'WF-STD' },
    { id: 'MT-3', name: 'Leave-behind', channel: 'Print', workflow: 'WF-STD' },
    { id: 'MT-4', name: 'Web Banner', channel: 'Web', workflow: 'WF-STD' },
    { id: 'MT-5', name: 'Social Post', channel: 'Social', workflow: 'WF-STD' }
  ],
  audiences: ['HCP – Cardiologists', 'HCP – General practitioners', 'HCP – Pulmonologists', 'Pharmacists'],
  channels: ['Email', 'Detail aid', 'Print', 'Web', 'Social'],
  moduleTypes: ['Clinical Claim', 'Safety Statement', 'Headline', 'Supporting Evidence', 'CTA', 'Reference'],
  teams: [
    { id: 'T-CON', name: 'Content — Cardiology', fn: 'Content' },
    { id: 'T-CON2', name: 'Content — Respiratory', fn: 'Content' },
    { id: 'T-MED', name: 'Medical Affairs', fn: 'Medical' },
    { id: 'T-LEG', name: 'Legal', fn: 'Legal' },
    { id: 'T-REG', name: 'Regulatory Affairs', fn: 'Regulatory' },
    { id: 'T-MKT', name: 'Marketing', fn: 'Marketing' },
    { id: 'T-ADM', name: 'Platform', fn: 'Administration' }
  ],
  users: [
    { id: 'u-omar', name: 'Omar Khalil', email: 'omar.khalil@saja-demo.com', type: 'Content Owner', seniority: 'Senior', team: 'T-CON', status: 'Active' },
    { id: 'u-hana', name: 'Hana Zaki', email: 'hana.zaki@saja-demo.com', type: 'Content Owner', seniority: 'Junior', team: 'T-CON2', status: 'Active' },
    { id: 'u-ahmed', name: 'Ahmed Ali', email: 'ahmed.ali@saja-demo.com', type: 'Medical Reviewer', seniority: 'Junior', team: 'T-MED', status: 'Active' },
    { id: 'u-sara', name: 'Sara Ahmed', email: 'sara.ahmed@saja-demo.com', type: 'Medical Reviewer', seniority: 'Senior', team: 'T-MED', status: 'Active' },
    { id: 'u-mona', name: 'Mona Adel', email: 'mona.adel@saja-demo.com', type: 'Legal Reviewer', seniority: 'Junior', team: 'T-LEG', status: 'Active' },
    { id: 'u-rania', name: 'Rania Haddad', email: 'rania.haddad@saja-demo.com', type: 'Legal Reviewer', seniority: 'Senior', team: 'T-LEG', status: 'Active' },
    { id: 'u-tarek', name: 'Tarek Samir', email: 'tarek.samir@saja-demo.com', type: 'Regulatory Reviewer', seniority: 'Junior', team: 'T-REG', status: 'Active' },
    { id: 'u-layla', name: 'Layla Nasser', email: 'layla.nasser@saja-demo.com', type: 'Regulatory Reviewer', seniority: 'Senior', team: 'T-REG', status: 'Active' },
    { id: 'u-karim', name: 'Karim Fawzi', email: 'karim.fawzi@saja-demo.com', type: 'Marketing User', seniority: 'Senior', team: 'T-MKT', status: 'Active' },
    { id: 'u-youssef', name: 'Youssef Amin', email: 'youssef.amin@saja-demo.com', type: 'Marketing User', seniority: 'Junior', team: 'T-MKT', status: 'Active' },
    { id: 'u-ali', name: 'Ali Usama', email: 'ali.usama@saja-demo.com', type: 'Administrator', seniority: null, team: 'T-ADM', status: 'Active' },
    { id: 'u-dina', name: 'Dina Mostafa', email: 'dina.mostafa@saja-demo.com', type: 'Regulatory Reviewer', seniority: 'Junior', team: 'T-REG', status: 'Inactive' }
  ],
  workflows: [
    { id: 'WF-STD', name: 'Promotional content — Standard', desc: 'Used for all promotional modules and assets.', active: true, steps: [
      { id: 's1', fn: 'Medical', seniority: 'Junior', req: 'review' },
      { id: 's2', fn: 'Medical', seniority: 'Senior', req: 'approve' },
      { id: 's3', fn: 'Legal', seniority: 'Junior', req: 'review' },
      { id: 's4', fn: 'Legal', seniority: 'Senior', req: 'approve' },
      { id: 's5', fn: 'Regulatory', seniority: 'Junior', req: 'review' },
      { id: 's6', fn: 'Regulatory', seniority: 'Senior', req: 'approve' }
    ] },
    { id: 'WF-LOW', name: 'Low-risk updates — Senior only', desc: 'Reference and formatting updates with no new claims.', active: true, steps: [
      { id: 'l1', fn: 'Medical', seniority: 'Senior', req: 'approve' },
      { id: 'l2', fn: 'Regulatory', seniority: 'Senior', req: 'approve' },
      { id: 'l3', kind: 'notify', fn: 'Email', recipients: ['u-karim', 'u-omar'], emails: '', subject: 'New version approved — check impacted assets', message: 'A new module version has been approved. Replace it in any asset that still uses the previous version.' }
    ] }
  ],
  references: [
    { id: 'REF-A-01', title: 'ALPHA-HF study — primary results (fictional)', source: 'Demo Journal of Cardiology 2025;12:101–112' },
    { id: 'REF-A-02', title: 'ALPHA-HF study — 24-month extension (fictional)', source: 'Demo Journal of Cardiology 2026;13:44–58' },
    { id: 'REF-A-03', title: 'Product A — Summary of Product Characteristics (demo)', source: 'SAJA Pharma, 2026' },
    { id: 'REF-A-04', title: 'HEART-QOL registry (fictional)', source: 'Demo Heart Outcomes 2025;8:9–20' },
    { id: 'REF-B-01', title: 'BREATHE-2 study (fictional)', source: 'Demo Respiratory Review 2025;30:210–222' },
    { id: 'REF-B-02', title: 'Product B — Summary of Product Characteristics (demo)', source: 'SAJA Pharma, 2026' }
  ],
  modules: [
    mod('MOD-A-014', 'Clinical Claim A — Hospitalisation reduction', 'Clinical Claim', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA', 'AE'], ['Email', 'Detail aid', 'Print', 'Web'], 'u-omar',
      [ { v: 1, body: 'In the ALPHA-HF study, Product A reduced heart-failure hospitalisation versus standard care.¹', refs: ['REF-A-01'], status: 'Superseded', approvedAt: d(-420), by: 'u-sara' },
        { v: 2, body: 'In the ALPHA-HF study, Product A reduced heart-failure hospitalisation by 21% versus standard care at 12 months.¹', refs: ['REF-A-01'], status: 'Approved', approvedAt: d(-112), by: 'u-layla' } ],
      { expiry: d(253), reviewDate: d(193) }),
    mod('MOD-A-021', 'Headline — A steadier course in heart failure', 'Headline', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA', 'AE', 'EG'], ['Email', 'Detail aid', 'Print', 'Web', 'Social'], 'u-omar',
      [ { v: 1, body: 'A steadier course for patients living with heart failure', refs: [], status: 'Approved', approvedAt: d(-140), by: 'u-layla' } ], { expiry: d(225) }),
    mod('MOD-A-030', 'Safety Statement A — Renal monitoring', 'Safety Statement', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA', 'AE', 'EG'], ['Email', 'Detail aid', 'Print', 'Web', 'Social'], 'u-omar',
      [ { v: 3, body: 'Product A is not recommended in severe renal impairment. Monitor renal function and serum potassium before and during treatment. Refer to the full prescribing information before prescribing.³', refs: ['REF-A-03'], status: 'Approved', approvedAt: d(-90), by: 'u-layla' } ], { expiry: d(275) }),
    mod('MOD-A-033', 'Supporting Evidence — Quality-of-life data', 'Supporting Evidence', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA', 'AE'], ['Email', 'Detail aid'], 'u-omar',
      [ { v: 1, body: 'Patients in the HEART-QOL registry reported improved daily activity scores after 6 months of treatment with Product A.⁴', refs: ['REF-A-04'], status: 'Approved', approvedAt: d(-338), by: 'u-layla' } ], { expiry: d(24) }),
    mod('MOD-A-040', 'CTA — Request a representative visit', 'CTA', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA', 'AE', 'EG'], ['Email', 'Web'], 'u-omar',
      [ { v: 1, body: 'Request a visit from your Product A representative', refs: [], status: 'Approved', approvedAt: d(-140), by: 'u-layla' } ], { expiry: d(225) }),
    mod('MOD-A-002', 'Reference — ALPHA-HF primary publication', 'Reference', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA', 'AE', 'EG'], ['Email', 'Detail aid', 'Print', 'Web'], 'u-omar',
      [ { v: 1, body: '1. ALPHA-HF study — primary results (fictional). Demo Journal of Cardiology 2025;12:101–112.', refs: ['REF-A-01'], status: 'Approved', approvedAt: d(-150), by: 'u-layla' } ], { expiry: d(580) }),
    mod('MOD-A-025', 'Supporting Evidence — Real-world registry', 'Supporting Evidence', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA'], ['Detail aid', 'Print'], 'u-omar',
      [ { v: 1, body: 'Real-world registry data show consistent outcomes with Product A across age groups.⁴', refs: ['REF-A-04'], status: 'Approved', approvedAt: d(-371), by: 'u-layla' } ], { expiry: d(-6) }),
    mod('MOD-A-009', 'Clinical Claim A — Early symptom relief', 'Clinical Claim', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA'], ['Detail aid'], 'u-omar',
      [ { v: 1, body: 'Product A improved breathlessness scores within 4 weeks.¹', refs: ['REF-A-01'], status: 'Archived', approvedAt: d(-600), by: 'u-layla' } ], { expiry: d(-210), archived: true }),
    mod('MOD-A-018', 'Clinical Claim B — Once-daily dosing', 'Clinical Claim', 'P-A', 'Chronic heart failure', 'HCP – Cardiologists', ['SA', 'AE'], ['Email', 'Detail aid'], 'u-omar',
      [ { v: 1, body: 'Product A is taken once daily, with or without food.³', refs: ['REF-A-03'], status: 'In Review' } ], { expiry: d(365), review: { wf: 'WF-STD', step: 1, submittedAt: d(-2, 9, 30) } }),
    mod('MOD-B-007', 'Clinical Claim — Exacerbation reduction', 'Clinical Claim', 'P-B', 'Persistent asthma', 'HCP – Pulmonologists', ['SA', 'AE'], ['Email', 'Detail aid'], 'u-omar',
      [ { v: 1, body: 'In the BREATHE-2 study, Product B reduced the annual rate of moderate exacerbations versus placebo.¹', refs: ['REF-B-01'], status: 'In Review' } ], { expiry: d(365), review: { wf: 'WF-STD', step: 0, submittedAt: d(-1, 14, 5) } }),
    mod('MOD-B-011', 'Safety Statement B — Inhaler technique', 'Safety Statement', 'P-B', 'Persistent asthma', 'HCP – Pulmonologists', ['SA', 'AE', 'EG'], ['Email', 'Print'], 'u-omar',
      [ { v: 1, body: 'Rinse the mouth after each inhalation. Review inhaler technique at every visit.²', refs: ['REF-B-02'], status: 'Changes Requested' } ], { expiry: d(365), changes: 'Add the oral candidiasis warning from section 4.4 of the SmPC.' }),
    mod('MOD-B-015', 'Headline — Breathe on your terms', 'Headline', 'P-B', 'Persistent asthma', 'HCP – Pulmonologists', ['AE'], ['Social', 'Web'], 'u-hana',
      [ { v: 1, body: 'Breathe on your terms', refs: [], status: 'Draft' } ], { expiry: d(365) })
  ],
  assets: [
    asset('AST-101', 'HCP Email — Heart failure launch', 'HCP Email', 'P-A', 'SA', 'Email', 'HCP – Cardiologists', 'Approved', 'u-karim', [['MOD-A-021', 1], ['MOD-A-014', 2], ['MOD-A-033', 1], ['MOD-A-030', 3], ['MOD-A-040', 1]], d(-60)),
    asset('AST-102', 'Detail Aid — ALPHA-HF results', 'Detail Aid', 'P-A', 'SA', 'Detail aid', 'HCP – Cardiologists', 'Approved', 'u-karim', [['MOD-A-021', 1], ['MOD-A-014', 2], ['MOD-A-030', 3]], d(-80)),
    asset('AST-103', 'Leave-behind — Cardiology congress', 'Leave-behind', 'P-A', 'AE', 'Print', 'HCP – Cardiologists', 'Approved', 'u-youssef', [['MOD-A-014', 2], ['MOD-A-030', 3], ['MOD-A-002', 1]], d(-45)),
    asset('AST-104', 'Web Banner — Hospitalisation data', 'Web Banner', 'P-A', 'AE', 'Web', 'HCP – Cardiologists', 'Approved', 'u-karim', [['MOD-A-021', 1], ['MOD-A-014', 2], ['MOD-A-040', 1]], d(-30)),
    asset('AST-105', 'HCP Email — Asthma control', 'HCP Email', 'P-B', 'AE', 'Email', 'HCP – Pulmonologists', 'Draft', 'u-youssef', [], null)
  ],
  audit: [
    au(d(-420, 11), 'u-sara', 'Final Medical approval', 'Module', 'MOD-A-014', 1),
    au(d(-115, 9, 12), 'u-omar', 'Submitted for review', 'Module', 'MOD-A-014', 2),
    au(d(-114, 15, 40), 'u-ahmed', 'Requested changes', 'Module', 'MOD-A-014', 2, 'State the time point (12 months) next to the 21% figure.'),
    au(d(-114, 17, 5), 'u-omar', 'Resubmitted after changes', 'Module', 'MOD-A-014', 2),
    au(d(-113, 10, 20), 'u-ahmed', 'Sent to Senior', 'Module', 'MOD-A-014', 2, 'Time point added. Recommend approval.'),
    au(d(-113, 14, 2), 'u-sara', 'Final Medical approval', 'Module', 'MOD-A-014', 2),
    au(d(-112, 11, 30), 'u-rania', 'Final Legal approval', 'Module', 'MOD-A-014', 2),
    au(d(-112, 16, 45), 'u-layla', 'Final Regulatory approval', 'Module', 'MOD-A-014', 2),
    au(d(-60, 12), 'u-layla', 'Approved asset', 'Asset', 'AST-101', 1),
    au(d(-2, 9, 30), 'u-omar', 'Submitted for review', 'Module', 'MOD-A-018', 1),
    au(d(-2, 16, 10), 'u-ahmed', 'Sent to Senior', 'Module', 'MOD-A-018', 1, 'Matches SmPC section 4.2. No issues found.'),
    au(d(-1, 14, 5), 'u-omar', 'Submitted for review', 'Module', 'MOD-B-007', 1),
    au(d(-1, 16, 30), 'u-ahmed', 'Requested changes', 'Module', 'MOD-B-011', 1, 'Add the oral candidiasis warning from section 4.4 of the SmPC.')
  ],
  notifSeen: 0,
  demo: { moduleId: null, assetId: null }
});

function mod(id, title, type, product, indication, audience, markets, channels, owner, versions, o = {}) {
  const cur = versions[versions.length - 1];
  const m = { id, title, type, product, indication, audience, markets, channels, owner, versions, cur: cur.v,
    expiry: o.expiry || null, reviewDate: o.reviewDate || (o.expiry ? o.expiry - 60 * DAY : null), createdAt: d(-200), updatedAt: d(-3),
    review: o.review ? { wf: o.review.wf, step: o.review.step, submittedAt: o.review.submittedAt, comments: [] } : null,
    changes: o.changes || null };
  if (o.review && o.review.step > 0) m.review.comments.push({ by: 'u-ahmed', at: d(-2, 16, 10), text: 'Matches SmPC section 4.2. No issues found.', decision: 'Sent to Senior' });
  return m;
}
function asset(id, name, type, product, market, channel, audience, status, owner, blocks, approvedAt) {
  return { id, name, type, product, market, channel, audience, status, owner, approvedAt, createdAt: approvedAt || d(-1), review: null,
    blocks: blocks.map(([mid, v], i) => ({ id: id + '-b' + i, kind: 'module', moduleId: mid, v })) };
}
function au(ts, user, action, objType, objId, version, note) { return { id: 'a' + ts + user, ts, user, action, objType, objId, version, note: note || '' }; }
