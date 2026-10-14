// Data integrity: every figure that links to a list equals the rows that list shows; counts agree across pages;
// stage totals add up; dates, versions, history and links between records are consistent.
const { chromium } = require('playwright');
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.emulateMedia({ reducedMotion: 'reduce' }); // read final figures, not the count-up animation
  await p.goto(require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a);
  const login = async email => { await E(() => ACT.logout()); await p.waitForSelector('#login-email'); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForFunction(e => S.signedIn && me().email === e, email); };
  // rows shown by the current list page (the "N of M" count, the library count, or table rows)
  const shown = () => E(() => { const t = document.querySelector('#content').innerText; let m = t.match(/(\d+) of (\d+)(?! cycles)/); if (UI.route.name === 'library') { const k = t.match(/(\d+) modules?/); if (k) return +k[1]; } if (m) return +m[1]; return document.querySelectorAll('#content table tbody tr').length; });
  for (const email of ['ali.usama@saja.com', 'hana.zaki@saja.com', 'sara.ahmed@saja.com', 'karim.fawzi@saja.com']) {
    await login(email); const mism = [];
    for (const [route, sel] of [['home', '.hz-k[data-go], .hz-inv button[data-go]'], ['modules', '.kpis.strip .kpi'], ['assets', '.kpis.strip .kpi'], ['users', '.kpis.strip .kpi'], ['audit', '.kpis.strip .kpi']]) {
      const cnt = await E(([r, sel]) => { UI.f = {}; go(r); return document.querySelectorAll(sel).length; }, [route, sel]);
      for (let i = 0; i < cnt; i++) {
        const k = await E(([r, sel, i]) => { UI.f = {}; go(r); const el = document.querySelectorAll(sel)[i]; if (!el || el.disabled) return null; const v = el.querySelector('.hz-kv, b'); return { label: (el.querySelector('.hz-kl, .k-label') || el).textContent.trim().slice(0, 40), value: v ? parseFloat(v.textContent.replace(/[^\d.]/g, '')) : NaN, go: el.dataset.go || null }; }, [route, sel, i]);
        if (!k || isNaN(k.value) || /approval time|rate/i.test(k.label)) continue;
        await E(([r, sel, i]) => { UI.f = {}; go(r); document.querySelectorAll(sel)[i].click(); }, [route, sel, i]); await p.waitForTimeout(60);
        const where = await E(() => UI.route.name); if (where === route && route !== 'home' && !(await E(() => Object.values(UI.f).some(Boolean)))) continue; // strip items that only toggle off
        let got = where === 'tasks' ? await E(() => tasksFor(me()).length) : await shown();
        if (where === 'tasks') { const tabs = await E(() => [...document.querySelectorAll('.tabs .tab .n')].reduce((s, x) => s + +x.textContent, 0)); if (tabs !== got) mism.push(`My Tasks tabs sum ${tabs} ≠ ${got}`); }
        if (got !== k.value) mism.push(`${route} "${k.label}" shows ${k.value} but ${where} lists ${got}`);
      }
    }
    ok(!mism.length, `${email.split('@')[0]}: every linked figure equals the rows of the list it opens${mism.length ? ' — ' + mism.join(' | ') : ''}`);
  }
  await login('ali.usama@saja.com');
  const c = await E(() => {
    const out = {}; const libOk = m => ['Approved', 'Active', 'Expiring'].includes(libraryStatus(m) || '');
    go('home'); const kv = id => +document.querySelector(`.hz-k[data-k=${id}] .hz-kv`).firstChild.textContent;
    out.homeApproved = kv('approved'); out.homeInReview = kv('inreview'); out.homeTasks = kv('tasks');
    go('library'); const t = document.querySelector('#content').innerText.match(/(\d+) modules?/); out.library = t ? +t[1] : -1;
    out.recordsLive = S.modules.filter(libOk).length; out.recordsInReview = S.modules.filter(m => m.review).length;
    go('modules'); out.modStrip = Object.fromEntries([...document.querySelectorAll('.kpis.strip .kpi')].map(k => [k.querySelector('.k-label').textContent.trim(), +k.querySelector('b').textContent]));
    go('tasks'); out.taskTabs = [...document.querySelectorAll('.tabs .tab .n')].reduce((s, x) => s + +x.textContent, 0);
    go('home'); out.pipe = [...document.querySelectorAll('.hz-flow .hz-fv b')].map(x => +x.textContent); out.pipeTotal = +document.querySelector('#hx-t-pipe').parentElement.querySelector('.hz-ctx').textContent.split(' ')[0]; out.pipePct = [...document.querySelectorAll('.hz-flow .hz-fv em')].map(x => +x.textContent.replace('%', ''));
    out.strip = [...document.querySelectorAll('.hz-flow .hz-ft i')].map(i => parseFloat(i.style.width));
    return out; });
  ok(c.homeApproved === c.library && c.library === c.recordsLive, `approved modules agree: Home ${c.homeApproved} = Library ${c.library} = records ${c.recordsLive}`);
  ok(c.modStrip['In the Approved Library'] === c.library, `Modules page "In the Approved Library" (${c.modStrip['In the Approved Library']}) = Library (${c.library})`);
  ok(c.homeInReview === c.recordsInReview && c.modStrip['In review'] === c.recordsInReview, `in review agrees: Home ${c.homeInReview}, Modules ${c.modStrip['In review']}, records ${c.recordsInReview}`);
  ok(c.homeTasks === c.taskTabs, `My Tasks agrees: Home ${c.homeTasks} = My Tasks tabs ${c.taskTabs}`);
  ok(c.pipe.reduce((a, b) => a + b, 0) === c.pipeTotal, `pipeline stages sum to the total (${c.pipe.join('+')} = ${c.pipeTotal})`);
  ok(Math.abs(c.pipePct.reduce((a, b) => a + b, 0) - 100) <= c.pipe.length, `pipeline percentages total 100% within rounding (${c.pipePct.join('+')})`);
  // records: ids unique, versions/cycles/dates coherent, links resolve
  const integ = await E(() => { const bad = []; const ids = [...S.modules, ...S.assets].map(o => o.id); if (new Set(ids).size !== ids.length) bad.push('duplicate content ids');
    if (new Set(S.users.map(u => u.id)).size !== S.users.length) bad.push('duplicate user ids'); if (new Set(S.users.map(u => u.email)).size !== S.users.length) bad.push('duplicate emails');
    [...S.modules.map(m => ['Module', m]), ...S.assets.map(a => ['Asset', a])].forEach(([k, o]) => {
      o.versions.forEach((v, i) => { if (v.v !== i + 1) bad.push(o.id + ' version numbering'); v.cycles.forEach(c => { if (c.end && c.end < c.start) bad.push(o.id + ' cycle ends before start'); if (c.outcome === 'Approved' && !v.approvedAt) bad.push(o.id + ' v' + v.v + ' approved cycle without approval date'); c.decisions.forEach(d => { if (!user(d.by) || user(d.by).name === undefined) bad.push(o.id + ' decision by unknown user'); if (d.at && d.at < c.start - 1) bad.push(o.id + ' decision before cycle start'); }); }); });
      if (v => 0) {} const lv = live(o); if (lv && !lv.approvedAt) bad.push(o.id + ' live version without approval date');
      if (o.review && !wfById(o.review.wf)) bad.push(o.id + ' review on unknown workflow');
      if (o.review && !curStep(o)) bad.push(o.id + ' review at a step that does not exist');
      if (k === 'Module') { o.products.forEach(id => { if (!S.products.some(p => p.id === id)) bad.push(o.id + ' unknown product ' + id); }); o.markets.forEach(id => { if (!S.markets.some(p => p.id === id)) bad.push(o.id + ' unknown country ' + id); }); if (!S.users.some(u => u.id === o.owner)) bad.push(o.id + ' unknown owner'); }
      if (k === 'Asset') o.blocks.forEach(bk => { if (bk.kind === 'module') { const m = modById(bk.moduleId); if (!m) bad.push(o.id + ' uses missing module ' + bk.moduleId); else if (!m.versions.some(v => v.v === bk.v)) bad.push(o.id + ' uses missing version ' + bk.moduleId + ' v' + bk.v); } });
      const meta = liveMeta(o); if (meta && meta.expiry && meta.reviewDate && meta.reviewDate > meta.expiry) bad.push(o.id + ' review date after expiry');
    });
    // nothing expired or unapproved is in the library
    go('library'); const listed = [...document.querySelectorAll('#content [data-go=module][data-id], #content tr[data-id]')].map(e => e.dataset.id); uniq(listed).forEach(id => { const m = modById(id); if (!m) return; const ls = libraryStatus(m); if (!['Approved', 'Active', 'Expiring'].includes(ls || '')) bad.push(id + ' in library with status ' + ls); if (liveMeta(m).expiry && liveMeta(m).expiry < Date.now()) bad.push(id + ' in library but expired'); });
    S.audit.forEach(e => { if (!e.ts || !e.action) bad.push('audit entry without time or action'); });
    return { bad: uniq(bad), audit: S.audit.length, mods: S.modules.length }; });
  ok(!integ.bad.length, `record integrity: ${integ.mods} modules, ${integ.audit} audit entries — ${integ.bad.join('; ') || 'no problems'}`);
  // an in-use product cannot be deleted; deleting through the UI is refused and nothing disappears
  const del = await E(() => { const pr = S.products.find(x => S.modules.some(m => m.products.includes(x.id))); const before = S.products.length; go('products'); const el = document.createElement('button'); el.dataset.act = 'cfg-delete'; el.dataset.k = 'products'; el.dataset.id = pr.id; document.getElementById('app').appendChild(el); el.click(); return [before, S.products.length, pr.id]; });
  ok(del[0] === del[1], `in-use product ${del[2]} cannot be deleted (${del[0]} → ${del[1]})`);
  // expiry is applied: push a live module's expiry into the past and it leaves the library and cannot be reused
  const exp = await E(() => { const m = S.modules.find(x => libraryStatus(x) === 'Approved' && S.assets.some(a => statusOf(a) === 'Draft')); const a = S.assets.find(x => statusOf(x) === 'Draft'); const mt = liveMeta(m); const old = mt.expiry; mt.expiry = Date.now() - 86400000; const st = libraryStatus(m); go('library'); const inLib = document.querySelector('#content').innerHTML.includes(m.id); const el = eligibility(m, a); mt.expiry = old; return [m.id, st, inLib, el.ok]; });
  ok(exp[1] !== 'Approved' && exp[1] !== 'Active' && !exp[2] && !exp[3], `expired ${exp[0]}: status ${exp[1]}, not in library, not reusable in assets`);
  // reconstructed trends are labelled as estimates; real event counts are not
  const tr = await E(() => { go('home'); const tip = q => [...document.querySelectorAll(`.hz-k[data-k=${q}] .ch-hit`)].map(r => r.dataset.tip); return { inrev: tip('inreview')[0], appr: tip('approved')[0], amend: tip('amend')[0] }; });
  ok(/estimate/i.test(tr.inrev) && /estimate/i.test(tr.appr) && !/estimate/i.test(tr.amend), `trend tooltips say which series are estimates (${tr.inrev} | ${tr.appr} | ${tr.amend})`);
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(`${n} checks`); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
