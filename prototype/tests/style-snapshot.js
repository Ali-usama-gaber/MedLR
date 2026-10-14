// Visual-regression guard for CSS refactors: records the computed style of every element on many pages
// (several roles, viewports, open dialogs) and compares with a saved baseline.
//   node tests/style-snapshot.js save      → writes tests/.style-baseline.json
//   node tests/style-snapshot.js compare   → lists every element whose rendered style changed
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const URL = require('url').pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
const FILE = path.join(__dirname, '.style-baseline.json'); const mode = process.argv[2] || 'compare';
const PAGES = [['home'], ['modules'], ['module', { id: 'MOD-A-014' }], ['module', { id: 'MOD-A-014', tab: 'approval' }], ['module', { id: 'MOD-A-014', tab: 'versions' }], ['module', { id: 'MOD-B-011' }], ['module', { id: 'MOD-A-009' }], ['review', { id: 'MOD-B-007' }], ['review', { id: 'MOD-A-018' }], ['tasks'], ['assets'], ['asset', { id: 'AST-101' }], ['assemble', { id: 'AST-105' }], ['asset-review', { id: 'AST-106' }], ['library'], ['library', { tab: 'materials' }], ['cover', { id: 'MOD-A-014', k: 'Module', v: '1' }], ['lifecycle'], ['audit'], ['reports'], ['reports', { tab: 'workflow' }], ['users'], ['user', { id: 'u-sara' }], ['user-new'], ['roles'], ['teams'], ['products'], ['item', { k: 'products', id: 'P-A' }], ['refdata'], ['org'], ['sops'], ['settings'], ['workflows'], ['workflow', { id: 'WF-STD' }], ['workflow-new'], ['module-new'], ['module-edit', { id: 'MOD-B-011' }]];
const MODALS = [['roles', "UI.modal = { type: 'compare', tab: 'overview', d: JSON.parse(JSON.stringify(S.roles)) }"], ['products', "ACT['cfg-new']({ dataset: { k: 'products' } })"], ['sops', "ACT['sop-new']()"], ['modules', "ACT['flt-open']({ dataset: { id: 'modules' } })"], ['home', "UI.pop = 'user'"], ['home', "UI.pop = 'bell'"], ['settings', "UI.modal = { type: 'confirm-reset' }"]];
const PROPS = ['display', 'position', 'width', 'height', 'margin', 'padding', 'color', 'background-color', 'background-image', 'border', 'border-radius', 'box-shadow', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'opacity', 'transform', 'gap', 'grid-template-columns', 'flex-direction', 'justify-content', 'align-items', 'overflow', 'z-index', 'top', 'left', 'visibility', 'outline', 'white-space', 'text-overflow', 'filter', 'backdrop-filter', 'cursor'];
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const [vw, vh] of [[1440, 900], [820, 1180], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    // Same clock on every run, so dates and "x min ago" labels (and therefore text widths) are identical.
    await p.clock.setFixedTime(new Date('2026-10-14T10:00:00'));
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.evaluate(() => document.fonts.ready);
    await p.fill('#login-email', 'ali.usama@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(300);
    const grab = async key => {
      await p.waitForTimeout(60); await p.evaluate(() => document.fonts.ready);
      out[key] = await p.evaluate(PROPS => { const res = []; document.querySelectorAll('#app *, #toasts *').forEach((el, i) => { if (el.closest('svg') && el.tagName !== 'svg') return; const cs = getComputedStyle(el); res.push(el.tagName + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(c => c !== 'enter').slice(0, 3).join('.') : '') + '|' + PROPS.map(k => cs.getPropertyValue(k)).join('|')); }); return res; }, PROPS);
    };
    for (const [r, o] of PAGES) { await p.evaluate(([r, o]) => { UI.modal = null; UI.pop = null; go(r, o || {}); }, [r, o]); await grab(vw + ' ' + r + JSON.stringify(o || {})); }
    for (const [r, js] of MODALS) { await p.evaluate(([r, js]) => { UI.modal = null; UI.pop = null; go(r); eval(js); render(); }, [r, js]); await grab(vw + ' ' + r + ' + ' + js.slice(0, 30)); }
    await p.evaluate(() => { UI.modal = null; ACT.logout(); }); await grab(vw + ' login');
    await ctx.close();
  }
  await b.close();
  if (mode === 'save') { fs.writeFileSync(FILE, JSON.stringify(out)); console.log('baseline saved:', Object.keys(out).length, 'states,', Object.values(out).reduce((s, x) => s + x.length, 0), 'elements'); return; }
  const base = JSON.parse(fs.readFileSync(FILE, 'utf8')); let diffs = 0, states = 0;
  for (const k of Object.keys(base)) {
    const a = base[k], c = out[k] || []; const lines = [];
    if (a.length !== c.length) lines.push(`  element count ${a.length} → ${c.length}`);
    for (let i = 0; i < Math.min(a.length, c.length); i++) if (a[i] !== c[i]) { const x = a[i].split('|'), y = c[i].split('|'); const ch = PROPS.map((pr, j) => x[j + 1] !== y[j + 1] ? `${pr}: ${x[j + 1]} → ${y[j + 1]}` : null).filter(Boolean); lines.push(`  ${y[0]}  ${ch.join('; ')}`.slice(0, 400)); }
    if (lines.length) { states++; diffs += lines.length; console.log('DIFF ' + k + ' (' + lines.length + ')'); lines.slice(0, 6).forEach(l => console.log(l)); }
  }
  console.log(diffs ? `${diffs} differences in ${states} states` : 'IDENTICAL: ' + Object.keys(base).length + ' states, no rendered style changed'); process.exit(diffs ? 1 : 0);
})();
