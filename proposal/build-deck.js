// Builds the SAJA MedLR proposal deck (Blue | InTelligancia → SAJA Pharma).
// Run: NODE_PATH=<dir with pptxgenjs> node proposal/build-deck.js
const path = require('path');
const pptxgen = require('pptxgenjs');

const SKILL = process.env.PPTX_SKILL;
const { applyTheme } = require(path.join(SKILL, 'scripts/apply_theme.js'));

const A = f => path.join(__dirname, 'assets', f);
const I = (n, v = '') => A(`icons/${n}${v}.png`);
const OUT = path.join(__dirname, 'SAJA-MedLR-Proposal.pptx');

// Evergreen dominates (the product), emerald for action, Blue's navy as the partner tone.
const THEME = {
  name: 'SAJA MedLR Proposal',
  headFontFace: 'Arial',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: '17201C', lt1: 'FFFFFF', dk2: '0D1F17', lt2: 'F2F5F3',
    accent1: '0F8A4B', accent2: '204289', accent3: 'C8961C', accent4: 'D23A42',
    accent5: '5FE0A0', accent6: '6DCFF6', hlink: '0F8A4B', folHlink: '204289'
  }
};
const HEX = { ink: '17201C', ever: '0D1F17', emerald: '0F8A4B', navy: '204289', mint: '5FE0A0', soft: 'F2F5F3', line: 'DDE5E0', muted: '5E6B65', amber: 'C8961C', red: 'D23A42' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 in
pres.author = 'Blue | InTelligancia';
pres.company = 'Blue | InTelligancia';
pres.title = 'SAJA MedLR proposal';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

const SAJA_AR = 704 / 171, CO_AR = 2344 / 336;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: C.background1 },
  margin: [0.5, 0.5, 0.6, 0.5],
  objects: [
    { image: { path: A('saja-logo.png'), x: 0.5, y: 5.14, h: 0.24, w: 0.24 * SAJA_AR } },
    { image: { path: A('company-logo.png'), x: 9.5 - 0.2 * CO_AR, y: 5.16, h: 0.2, w: 0.2 * CO_AR } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.32, w: 9, h: 0.62, fontSize: 26, bold: true, color: C.text2, valign: 'top', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'kicker', type: 'body', x: 0.5, y: 0.94, w: 9, h: 0.34, fontSize: 13, color: C.text1, valign: 'top', margin: 0 }, text: '' } }
  ],
  slideNumber: { x: 4.75, y: 5.16, w: 0.5, h: 0.22, fontSize: 9, color: C.text1, align: 'center' }
});
pres.defineSlideMaster({
  title: 'DARK',
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.32, w: 9, h: 0.62, fontSize: 26, bold: true, color: C.background1, valign: 'top', margin: 0 }, text: '' } }
  ]
});

const shadow = () => ({ type: 'outer', color: '0D1F17', blur: 12, offset: 3, angle: 90, opacity: 0.16 });
const card = (s, x, y, w, h, name, fill = C.background1) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: HEX.line, width: 0.75 }, shadow: shadow(), objectName: name });
const iconDot = (s, x, y, d, icon, fill, name) => {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' }, objectName: name + ' circle' });
  const p = d * 0.26; s.addImage({ path: icon, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, objectName: name + ' icon' });
};
const txt = (s, text, opts) => s.addText(text, { isTextBox: true, margin: 0, valign: 'top', ...opts });
const screen = (s, file, x, y, w, name) => {
  const h = w * 900 / 1440;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.08, fill: { color: HEX.ever }, line: { type: 'none' }, shadow: shadow(), objectName: name + ' frame' });
  s.addImage({ path: A(file), x, y, w, h, objectName: name });
};

// ---------- 1. Title ----------
pres.addSection({ title: 'Introduction' });
{
  const s = pres.addSlide({ sectionTitle: 'Introduction' });
  s.background = { color: HEX.ever };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.4, h: 5.625, fill: { color: C.background1 }, line: { type: 'none' }, objectName: 'Title panel' });
  s.addImage({ path: A('saja-logo.png'), x: 0.6, y: 0.55, h: 0.42, w: 0.42 * SAJA_AR, objectName: 'SAJA logo' });
  txt(s, 'PROPOSAL · OCTOBER 2026', { x: 0.6, y: 1.45, w: 4.4, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 3 });
  txt(s, 'SAJA MedLR', { x: 0.6, y: 1.8, w: 4.4, h: 0.75, fontSize: 40, bold: true, color: C.text2, fontFace: 'Arial' });
  txt(s, 'A modular content and MLR review platform for SAJA Pharma', { x: 0.6, y: 2.6, w: 4.4, h: 0.8, fontSize: 18, color: C.text1 });
  txt(s, [{ text: 'Create once. ', options: { color: C.text2 } }, { text: 'Approve once. ', options: { color: C.accent1 } }, { text: 'Reuse safely.', options: { color: C.text2 } }], { x: 0.6, y: 3.5, w: 4.4, h: 0.4, fontSize: 16, bold: true });
  txt(s, 'Prepared by', { x: 0.6, y: 4.5, w: 2, h: 0.22, fontSize: 10, color: C.text1 });
  s.addImage({ path: A('company-logo.png'), x: 0.6, y: 4.75, h: 0.3, w: 0.3 * CO_AR, objectName: 'Blue InTelligancia logo' });
  screen(s, 'shot-home.png', 5.85, 1.35, 3.75, 'Product screenshot');
  txt(s, 'Working prototype · ali-usama-gaber.github.io/MedLR', { x: 5.85, y: 3.85, w: 3.75, h: 0.3, fontSize: 10, color: 'B8CFC2' });
  s.addNotes('Introduce Blue | InTelligancia and the purpose of the meeting: a proposal to build SAJA MedLR, with a clickable prototype ready to walk through.');
}

// ---------- 2. Challenge ----------
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Introduction' });
  s.addText('Today every material is reviewed from scratch', { placeholder: 'title' });
  s.addText('The same claim is checked again in each email, detail aid and banner', { placeholder: 'kicker' });
  const items = [
    ['undo', 'Repeated reviews', 'Medical, Legal and Regulatory re-check the same approved claims in every new material.'],
    ['clock', 'Slow time to market', 'Each asset waits for a full review cycle, even when most of its content is already approved.'],
    ['alert', 'Hard to control change', 'When a claim or safety statement changes, nobody knows every material that still uses the old text.']
  ];
  items.forEach(([ic, h, b], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.6, 2.85, 3.1, 'Challenge ' + (i + 1));
    iconDot(s, x + 0.3, 1.9, 0.62, I(ic, '-w'), i === 2 ? HEX.red : HEX.amber, 'Challenge ' + (i + 1));
    txt(s, h, { x: x + 0.3, y: 2.7, w: 2.3, h: 0.65, fontSize: 17, bold: true, color: C.text2, valign: 'bottom' });
    txt(s, b, { x: x + 0.3, y: 3.45, w: 2.3, h: 1.15, fontSize: 14, color: C.text1 });
  });
  s.addNotes('Frame the problem from SAJA\'s side: duplicated review effort, slow launches, and risk when approved content changes.');
}

// ---------- 3. Solution ----------
pres.addSection({ title: 'The platform' });
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'The platform' });
  s.addText('Approve content once, reuse it everywhere', { placeholder: 'title' });
  const items = [
    ['grid', 'Modules', 'Small building blocks of content: one claim, one safety statement, one headline. Each is written once and approved once.'],
    ['book', 'Library', 'The Approved Library: the trusted collection of approved modules, searchable by product, market, audience and channel.'],
    ['layers', 'Assets', 'Finished materials built from library modules. Only new text goes back for review.']
  ];
  items.forEach(([ic, h, b], i) => {
    const x = 0.5 + i * 3.05;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.45, w: 2.85, h: 3.25, rectRadius: 0.12, fill: { color: '17352A' }, line: { color: '2C5442', width: 0.75 }, objectName: 'Pillar ' + (i + 1) });
    iconDot(s, x + 0.3, 1.75, 0.66, I(ic, '-w'), HEX.emerald, 'Pillar ' + (i + 1));
    txt(s, h, { x: x + 0.3, y: 2.55, w: 2.3, h: 0.35, fontSize: 20, bold: true, color: C.background1 });
    txt(s, b, { x: x + 0.3, y: 3.05, w: 2.3, h: 1.5, fontSize: 14, color: 'C9DCD1' });
  });
  s.addImage({ path: A('company-logo-white.png'), x: 9.5 - 0.2 * CO_AR, y: 5.12, h: 0.2, w: 0.2 * CO_AR, objectName: 'Blue InTelligancia logo' });
  s.addNotes('The three parts of the product. Modules are the unit of approval; the library is where approved modules live; assets are assembled from them.');
}

// ---------- 4. Flow ----------
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'The platform' });
  s.addText('How content moves through the system', { placeholder: 'title' });
  s.addText('Five steps, from a first draft to a tracked, reusable piece of content', { placeholder: 'kicker' });
  const steps = [
    ['edit', 'Create', 'Content Owner writes a module'],
    ['shieldcheck', 'Review', 'Medical, Legal and Regulatory check it'],
    ['check', 'Approve', 'Senior reviewers sign off'],
    ['layers', 'Build', 'Marketing assembles assets'],
    ['history', 'Track', 'Expiry, versions and audit trail']
  ];
  steps.forEach(([ic, h, b], i) => {
    const x = 0.5 + i * 1.86;
    card(s, x, 1.75, 1.66, 2.6, 'Step ' + (i + 1), i === 2 ? 'E3F3E9' : C.background1);
    txt(s, String(i + 1), { x: x + 0.2, y: 1.95, w: 0.4, h: 0.3, fontSize: 12, bold: true, color: C.accent1 });
    iconDot(s, x + 0.2, 2.3, 0.58, I(ic, '-w'), i === 2 ? HEX.emerald : HEX.ever, 'Step ' + (i + 1));
    txt(s, h, { x: x + 0.2, y: 3.02, w: 1.3, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
    txt(s, b, { x: x + 0.2, y: 3.4, w: 1.3, h: 0.85, fontSize: 12, color: C.text1 });
    if (i < steps.length - 1) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 1.68, y: 2.92, w: 0.16, h: 0.22, fill: { color: HEX.line }, line: { type: 'none' }, objectName: 'Arrow ' + (i + 1) });
  });
  txt(s, 'An approved module appears in the Approved Library straight away and can be reused in any eligible asset.', { x: 0.5, y: 4.6, w: 9, h: 0.35, fontSize: 13, italic: true, color: C.text1 });
  s.addNotes('Walk left to right. Stress that step 3 is where the module becomes reusable.');
}

// ---------- 5. MLR review ----------
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'The platform' });
  s.addText('MLR review with Junior and Senior reviewers', { placeholder: 'title' });
  s.addText('The review route is configured by an administrator, not fixed in code', { placeholder: 'kicker' });
  const fns = [['stethoscope', 'Medical'], ['scale', 'Legal'], ['filecheck', 'Regulatory']];
  fns.forEach(([ic, fn], i) => {
    const y = 1.6 + i * 1.02;
    iconDot(s, 0.5, y + 0.08, 0.6, I(ic, '-w'), HEX.navy, fn);
    txt(s, fn, { x: 1.25, y: y + 0.22, w: 1.3, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
    card(s, 2.5, y, 1.95, 0.76, fn + ' junior');
    txt(s, [{ text: 'Junior', options: { bold: true, breakLine: true } }, { text: 'Reviews, passes on' }], { x: 2.68, y: y + 0.13, w: 1.7, h: 0.55, fontSize: 13, color: C.text1 });
    s.addShape(pres.shapes.RIGHT_ARROW, { x: 4.55, y: y + 0.27, w: 0.22, h: 0.22, fill: { color: HEX.line }, line: { type: 'none' }, objectName: fn + ' arrow' });
    card(s, 4.87, y, 1.85, 0.76, fn + ' senior', 'E3F3E9');
    txt(s, [{ text: 'Senior', options: { bold: true, breakLine: true, color: C.accent1 } }, { text: 'Final approval' }], { x: 5.05, y: y + 0.13, w: 1.6, h: 0.55, fontSize: 13, color: C.text1 });
  });
  card(s, 7.05, 1.6, 2.45, 2.8, 'Configurable route', HEX.soft);
  txt(s, 'Configurable', { x: 7.3, y: 1.8, w: 2, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
  txt(s, [
    { text: 'Add, remove or reorder steps by drag and drop', options: { bullet: true, breakLine: true } },
    { text: 'Senior-only routes for low-risk updates', options: { bullet: true, breakLine: true } },
    { text: 'Email steps notify chosen people when a step is approved', options: { bullet: true } }
  ], { x: 7.3, y: 2.2, w: 2.05, h: 2.1, fontSize: 12, color: C.text1, paraSpaceAfter: 6 });
  s.addNotes('Six user types: Content Owner, Medical, Legal, Regulatory, Marketing and Administrator. The first five have Junior and Senior levels; seniority decides authority.');
}

// ---------- 6. Prototype: review ----------
pres.addSection({ title: 'Prototype' });
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Prototype' });
  s.addText('Every reviewer sees exactly what they can decide', { placeholder: 'title' });
  s.addText('Review workspace from the working prototype', { placeholder: 'kicker' });
  screen(s, 'shot-review.png', 0.56, 1.5, 5.4, 'Review workspace screenshot');
  const pts = [['shieldcheck', 'Clear authority', 'Step, current reviewer and what they can approve.'], ['check', 'One-click decisions', 'Send to Senior, request changes, return or reject.'], ['history', 'Full history', 'Every comment kept with role and seniority.']];
  pts.forEach(([ic, h, b], i) => {
    const y = 1.55 + i * 1.12;
    iconDot(s, 6.35, y, 0.5, I(ic, '-w'), HEX.emerald, h);
    txt(s, h, { x: 7.0, y: y - 0.02, w: 2.5, h: 0.32, fontSize: 15, bold: true, color: C.text2 });
    txt(s, b, { x: 7.0, y: y + 0.32, w: 2.5, h: 0.6, fontSize: 12, color: C.text1 });
  });
}

// ---------- 7. Prototype: assets ----------
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Prototype' });
  s.addText('Assets built from approved modules', { placeholder: 'title' });
  s.addText('Approved content is locked; new text is flagged for review', { placeholder: 'kicker' });
  const pts = [['layers', 'Drag and drop', 'Pick modules from the library onto the asset.'], ['check', 'Automatic checks', 'Approved, market, channel and expiry are validated.'], ['alert', 'New content detected', 'Only new text goes through full MLR review.']];
  pts.forEach(([ic, h, b], i) => {
    const y = 1.55 + i * 1.12;
    iconDot(s, 0.5, y, 0.5, I(ic, '-w'), i === 2 ? HEX.amber : HEX.emerald, h);
    txt(s, h, { x: 1.15, y: y - 0.02, w: 2.6, h: 0.32, fontSize: 15, bold: true, color: C.text2 });
    txt(s, b, { x: 1.15, y: y + 0.32, w: 2.6, h: 0.6, fontSize: 12, color: C.text1 });
  });
  screen(s, 'shot-asset.png', 4.04, 1.5, 5.4, 'Asset screenshot');
}

// ---------- 8. Lifecycle ----------
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Prototype' });
  s.addText('Change is controlled, end to end', { placeholder: 'title' });
  s.addText('A new version never breaks content that is already live', { placeholder: 'kicker' });
  const vers = [['v1', 'Superseded', 'B8C2BD'], ['v2', 'Live', HEX.emerald], ['v3', 'In review', HEX.amber]];
  vers.forEach(([v, st, col], i) => {
    const x = 0.5 + i * 1.6;
    card(s, x, 1.65, 1.4, 1.2, 'Version ' + v);
    txt(s, v, { x: x + 0.2, y: 1.8, w: 1, h: 0.45, fontSize: 24, bold: true, color: C.text2 });
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 2.4, w: 0.14, h: 0.14, fill: { color: col }, line: { type: 'none' }, objectName: 'Status ' + v });
    txt(s, st, { x: x + 0.42, y: 2.34, w: 0.95, h: 0.3, fontSize: 11, color: C.text1 });
  });
  txt(s, 'When v3 is approved, v2 is superseded and every asset still using v2 is listed, with a one-click replace.', { x: 0.5, y: 3.1, w: 4.6, h: 0.75, fontSize: 14, color: C.text1 });
  const pts = [['clock', 'Expiry alerts', 'Modules close to expiry are flagged before they lapse.'], ['history', 'Audit trail', 'Every action with person, role, seniority and time.'], ['mail', 'Notifications', 'The right people are told when content changes.']];
  pts.forEach(([ic, h, b], i) => {
    const y = 1.65 + i * 1.05;
    card(s, 5.5, y, 4, 0.88, h);
    iconDot(s, 5.7, y + 0.19, 0.5, I(ic, '-w'), HEX.ever, h);
    txt(s, h, { x: 6.35, y: y + 0.13, w: 3, h: 0.3, fontSize: 14, bold: true, color: C.text2 });
    txt(s, b, { x: 6.35, y: y + 0.44, w: 3, h: 0.35, fontSize: 12, color: C.text1 });
  });
}

// ---------- 9. Value ----------
pres.addSection({ title: 'Value and delivery' });
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Value and delivery' });
  s.addText('What SAJA gains', { placeholder: 'title' });
  s.addText('Faster launches with less review effort and full control', { placeholder: 'kicker' });
  const stats = [['1×', 'review per module', 'Approved once, reused in every eligible asset'], ['100%', 'traceable decisions', 'Who approved what, when, and at what seniority'], ['3', 'markets at launch', 'Saudi Arabia, UAE and Egypt, with room to grow']];
  stats.forEach(([n, l, d], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.6, 2.85, 2.9, 'Value ' + (i + 1), i === 0 ? 'E3F3E9' : C.background1);
    txt(s, n, { x: x + 0.3, y: 1.85, w: 2.3, h: 0.95, fontSize: 54, bold: true, color: i === 0 ? C.accent1 : C.text2 });
    txt(s, l, { x: x + 0.3, y: 2.85, w: 2.3, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
    txt(s, d, { x: x + 0.3, y: 3.25, w: 2.3, h: 0.9, fontSize: 13, color: C.text1 });
  });
}

// ---------- 10. Delivery ----------
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Value and delivery' });
  s.addText('Proposed delivery approach', { placeholder: 'title' });
  s.addText('Indicative phases, to be confirmed together during discovery', { placeholder: 'kicker' });
  const ph = [['Discovery', '2 weeks', 'Workflows, roles, markets and integrations confirmed'], ['Design', '3 weeks', 'Final UX built on the approved prototype'], ['Build', '10 weeks', 'Platform, review engine, library and assets'], ['Testing', '3 weeks', 'User acceptance with SAJA reviewers'], ['Launch', '2 weeks', 'Go-live, training and handover']];
  s.addShape(pres.shapes.LINE, { x: 0.8, y: 2.05, w: 8.4, h: 0, line: { color: HEX.line, width: 2 }, objectName: 'Timeline' });
  ph.forEach(([h, d, b], i) => {
    const x = 0.5 + i * 1.86;
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: 1.86, w: 0.38, h: 0.38, fill: { color: i === 4 ? HEX.emerald : HEX.ever }, line: { color: 'FFFFFF', width: 2 }, objectName: 'Phase ' + (i + 1) + ' marker' });
    txt(s, String(i + 1), { x: x + 0.15, y: 1.92, w: 0.38, h: 0.26, fontSize: 12, bold: true, color: C.background1, align: 'center' });
    txt(s, h, { x: x + 0.15, y: 2.45, w: 1.6, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
    txt(s, d, { x: x + 0.15, y: 2.8, w: 1.6, h: 0.3, fontSize: 13, bold: true, color: C.accent1 });
    txt(s, b, { x: x + 0.15, y: 3.15, w: 1.6, h: 1.0, fontSize: 12, color: C.text1 });
  });
  card(s, 0.5, 4.3, 9, 0.6, 'Prototype note', HEX.soft);
  txt(s, 'Discovery starts from the working prototype, so SAJA reviews real screens from week one.', { x: 0.7, y: 4.46, w: 8.6, h: 0.3, fontSize: 13, color: C.text1 });
  s.addNotes('Durations are indicative (about 20 weeks in total) and will be confirmed in discovery.');
}

// ---------- 11. Next steps / close ----------
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Value and delivery' });
  s.addText('Next steps', { placeholder: 'title' });
  const ns = [['Review the prototype', 'Walk through the demo journey with SAJA Medical, Legal and Regulatory leads.'], ['Confirm scope', 'Agree workflows, user types, markets and integrations.'], ['Start discovery', 'Kick off the first phase and set the delivery plan.']];
  ns.forEach(([h, b], i) => {
    const y = 1.3 + i * 0.95;
    s.addShape(pres.shapes.OVAL, { x: 0.5, y, w: 0.5, h: 0.5, fill: { color: HEX.emerald }, line: { type: 'none' }, objectName: 'Next step ' + (i + 1) });
    txt(s, String(i + 1), { x: 0.5, y: y + 0.1, w: 0.5, h: 0.3, fontSize: 16, bold: true, color: C.background1, align: 'center' });
    txt(s, h, { x: 1.2, y: y - 0.02, w: 4.2, h: 0.35, fontSize: 17, bold: true, color: C.background1 });
    txt(s, b, { x: 1.2, y: y + 0.33, w: 4.2, h: 0.5, fontSize: 13, color: 'C9DCD1' });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.9, y: 1.3, w: 3.6, h: 2.0, rectRadius: 0.14, fill: { color: C.background1 }, line: { type: 'none' }, shadow: shadow(), objectName: 'Logo card' });
  s.addImage({ path: A('saja-logo.png'), x: 5.9 + (3.6 - 0.5 * SAJA_AR) / 2, y: 1.55, h: 0.5, w: 0.5 * SAJA_AR, objectName: 'SAJA logo' });
  txt(s, '×', { x: 5.9, y: 2.12, w: 3.6, h: 0.35, fontSize: 18, color: C.text1, align: 'center' });
  s.addImage({ path: A('company-logo.png'), x: 5.9 + (3.6 - 0.36 * CO_AR) / 2, y: 2.6, h: 0.36, w: 0.36 * CO_AR, objectName: 'Blue InTelligancia logo' });
  txt(s, 'Try the prototype: ali-usama-gaber.github.io/MedLR', { x: 0.5, y: 4.4, w: 9, h: 0.35, fontSize: 14, color: HEX.mint, bold: true });
  txt(s, 'All products, people and data in the prototype are fictional.', { x: 0.5, y: 4.85, w: 9, h: 0.3, fontSize: 10, color: '9DB5A8' });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('Wrote', OUT);
})();
