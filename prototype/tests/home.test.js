const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const open = async (vp) => { const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); return [p, errs]; };
  const login = async (p, email) => { await p.evaluate(() => ACT.logout()); await p.waitForTimeout(150); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(300); };
  const SECS = ['hx-t-tasks', 'hx-t-pipe', 'hx-t-perf', 'hx-t-act', 'hx-t-rec', 'hx-t-due', 'hx-t-ov'];
  let [p, errs] = await open({ width: 1440, height: 900 });
  await login(p, 'ali.usama@saja.com');
  ok(await p.isVisible('.hx-kpis'), 'metrics strip present');
  for (const s of SECS) ok(await p.isVisible('#' + s), 'section ' + s + ' present');
  // metrics are computed from data
  const k = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.hx-k')].map(b => [b.dataset.k, b.querySelector('.hx-kv').firstChild.textContent])));
  const real = await p.evaluate(() => ({ tasks: tasksFor(me()).length, inreview: S.modules.filter(m => m.review).length }));
  ok(+k.tasks === real.tasks && +k.inreview === real.inreview, 'KPI values match records ' + JSON.stringify(k));
  // row heights: panels in the same grid row end at the same y
  const rows = await p.evaluate(() => { const ps = [...document.querySelectorAll('.hx-grid > .hx-p')].map(e => e.getBoundingClientRect()); const by = {}; ps.forEach(r => { const k = Math.round(r.top); (by[k] = by[k] || []).push(Math.round(r.bottom)); }); return Object.values(by).filter(a => a.length > 1).every(a => Math.max(...a) - Math.min(...a) <= 1); });
  ok(rows, 'panels in each row share the same height');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow at 1440');
  // every clickable on Home goes somewhere without errors
  const n = await p.evaluate(() => document.querySelectorAll('.hx [data-go], .hx [data-act]').length);
  let clicked = 0, bad = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate(() => go('home')); await p.waitForTimeout(120);
    const info = await p.evaluate(i => { const el = document.querySelectorAll('.hx [data-go], .hx [data-act]')[i]; if (!el) return null; el.scrollIntoView({ block: 'center' }); return { go: el.dataset.go, act: el.dataset.act, txt: el.textContent.trim().slice(0, 30) }; }, i);
    if (!info) continue;
    await p.locator('.hx [data-go], .hx [data-act]').nth(i).click({ timeout: 3000 }).catch(e => bad.push('click ' + info.txt));
    await p.waitForTimeout(150);
    const st = await p.evaluate(() => ({ r: UI.route.name, m: !!UI.modal }));
    if (info.go && st.r !== info.go) bad.push(info.txt + ' → ' + st.r + ' (wanted ' + info.go + ')');
    if (info.act === 'asset-new' && !st.m && st.r === 'home') bad.push('Create asset did nothing');
    await p.evaluate(() => { UI.modal = null; }); clicked++;
  }
  ok(clicked > 40 && !bad.length, `all ${clicked} Home controls navigate correctly ${bad.join(' | ')}`);
  ok(!errs.length, 'no page errors (admin) ' + errs.join('|'));
  // long labels: very long module title stays on one line with full text in the tooltip
  await p.evaluate(() => { const m = S.modules.find(m => m.review); m.title = 'An exceptionally long module title that keeps going to check truncation in every Home list and table row'; latest(m).title = m.title; go('home'); }); await p.waitForTimeout(200);
  const lo = await p.evaluate(() => [...document.querySelectorAll('.hx b[title^="An exceptionally"]')].map(e => [e.scrollWidth > e.clientWidth, e.getBoundingClientRect().height < 22]));
  ok(lo.length && lo.every(x => x[1]), 'long title truncated to one line (' + lo.length + ' places)');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'long labels cause no overflow');
  // error isolation: one failing section does not break the page
  await p.evaluate(() => { window._as = approvalStats; approvalStats = () => { throw new Error('boom'); }; go('home'); }); await p.waitForTimeout(200);
  ok(await p.isVisible('.hx-err [data-act=home-retry]') && await p.isVisible('#hx-t-tasks'), 'a failing section shows an inline error with retry; others render');
  await p.evaluate(() => { approvalStats = window._as; }); await p.click('.hx-err [data-act=home-retry]').catch(() => {}); await p.waitForTimeout(200);
  ok(!(await p.$('.hx-err')), 'Try again recovers the section once the error is gone');
  errs.length = 0;
  // empty workspace: no modules/assets/audit
  await p.evaluate(() => { S.modules = []; S.assets = []; S.audit = []; go('home'); }); await p.waitForTimeout(200);
  const empt = await p.evaluate(() => document.querySelectorAll('.hx .hx-empty, .hx .hx-muted').length);
  ok(empt >= 4 && !errs.length, 'empty workspace renders empty states (' + empt + ') without errors ' + errs.join('|'));
  await p.close();
  // role adaptive: content member and reviewer, desktop and phone
  for (const [email, vp] of [['hana.zaki@saja.com', { width: 1440, height: 900 }], ['sara.ahmed@saja.com', { width: 390, height: 844 }], ['ali.usama@saja.com', { width: 390, height: 844 }], ['ali.usama@saja.com', { width: 820, height: 1180 }]]) {
    [p, errs] = await open(vp); await login(p, email);
    const r = await p.evaluate(() => ({ scope: homeScope(me()).label, kpis: document.querySelectorAll('.hx-k').length, sec: [...document.querySelectorAll('.hx-sec button')].map(b => b.textContent), ovf: document.documentElement.scrollWidth - window.innerWidth }));
    ok(r.ovf <= 0 && !errs.length, `${email} @${vp.width}px: renders without overflow/errors (${r.scope}, ${r.kpis} KPIs) ${errs.join('|')}`);
    if (email.startsWith('hana')) ok(!r.sec.some(t => /active users|active workflows/.test(t)), 'content member does not see admin figures');
    await p.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
