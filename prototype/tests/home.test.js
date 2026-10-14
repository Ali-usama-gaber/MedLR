const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const open = async (vp) => { const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href); await p.evaluate(() => localStorage.clear()); await p.reload(); return [p, errs]; };
  const login = async (p, email) => { await p.evaluate(() => ACT.logout()); await p.waitForTimeout(150); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(300); };
  const SECS = ['hx-t-tasks', 'hx-t-pipe', 'hx-t-perf', 'hx-t-act', 'hx-t-rec', 'hx-t-due', 'hx-t-ov'];
  let [p, errs] = await open({ width: 1440, height: 900 });
  await login(p, 'ali.usama@saja.com');
  ok(await p.isVisible('.hz-kpis'), 'metrics strip present');
  for (const s of SECS) ok(await p.isVisible('#' + s), 'section ' + s + ' present');
  // metrics are computed from data
  const k = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.hz-k')].map(b => [b.dataset.k, b.querySelector('.hz-kv').firstChild.textContent])));
  const real = await p.evaluate(() => ({ tasks: tasksFor(me()).length, inreview: S.modules.filter(m => m.review).length }));
  ok(+k.tasks === real.tasks && +k.inreview === real.inreview, 'KPI values match records ' + JSON.stringify(k));
  // row heights: panels in the same grid row end at the same y
  const rows = await p.evaluate(() => { const ps = [...document.querySelectorAll('.hz-grid > .hz-card')].map(e => e.getBoundingClientRect()); const by = {}; ps.forEach(r => { const k = Math.round(r.top); (by[k] = by[k] || []).push(Math.round(r.bottom)); }); return Object.values(by).filter(a => a.length > 1).every(a => Math.max(...a) - Math.min(...a) <= 1); });
  ok(rows, 'panels in each row share the same height');
  // task filter tabs work in place
  await p.click('.hz-tabs [data-v=review]'); await p.waitForTimeout(150);
  const tf = await p.evaluate(() => ({ r: UI.route.name, n: document.querySelectorAll('.hz-tl .hz-t').length, want: Math.min(6, tasksFor(me()).filter(t => taskGroup(t) === 'review').length) }));
  ok(tf.r === 'home' && tf.n === tf.want, 'task tabs filter in place (' + tf.n + ' pending review)');
  await p.click('.hz-tabs [data-v=all]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const t = tasksFor(me()).sort((x, y) => ({ High: 0, Medium: 1, Normal: 2 })[taskInfo(x).priority] - ({ High: 0, Medium: 1, Normal: 2 })[taskInfo(y).priority] || x.since - y.since)[0]; return document.querySelector('.hz-next').dataset.id === t.obj.id; }), 'Next up shows the highest-priority task');
  ok(await p.evaluate(() => [...document.querySelectorAll('.hz-hm tbody tr')].every(tr => { const p0 = S.products.find(x => x.name === tr.querySelector('th').textContent); return +tr.querySelector('td.tot b').textContent === S.modules.filter(m => m.products.includes(p0.id)).length; })), 'coverage heatmap totals match module records');
  ok(await p.evaluate(() => { const k = document.querySelector('.hz-k[data-k=inreview]'); const tips = [...k.querySelectorAll('.ch-hit')].map(r => r.dataset.tip); return tips.length === 12 && tips[11].startsWith('This week · ' + k.querySelector('.hz-kv').firstChild.textContent); }), 'trend line ends at the displayed KPI value');
  ok(await p.evaluate(() => { const v = [...document.querySelectorAll('.hz-flow .hz-fv b')].map(b => +b.textContent); return v.reduce((a, b) => a + b, 0) === +document.querySelector('#hx-t-pipe').parentElement.querySelector('.hz-ctx').textContent.split(' ')[0]; }), 'pipeline stages sum to the module total');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow at 1440');
  // every clickable on Home goes somewhere without errors
  const n = await p.evaluate(() => document.querySelectorAll('.hz [data-go], .hz [data-act]').length);
  let clicked = 0, bad = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate(() => go('home')); await p.waitForTimeout(120);
    const info = await p.evaluate(i => { const el = document.querySelectorAll('.hz [data-go], .hz [data-act]')[i]; if (!el) return null; el.scrollIntoView({ block: 'center' }); return { go: el.dataset.go, act: el.dataset.act, txt: el.textContent.trim().slice(0, 30) }; }, i);
    if (!info) continue;
    await p.locator('.hz [data-go], .hz [data-act]').nth(i).click({ timeout: 3000 }).catch(e => bad.push('click ' + info.txt));
    await p.waitForTimeout(150);
    const st = await p.evaluate(() => ({ r: UI.route.name, m: !!UI.modal }));
    if (info.go && st.r !== info.go) bad.push(info.txt + ' → ' + st.r + ' (wanted ' + info.go + ')');
    if (info.act === 'asset-new' && !st.m && st.r === 'home') bad.push('Create asset did nothing');
    await p.evaluate(() => { UI.modal = null; }); clicked++;
  }
  ok(clicked > 40 && !bad.length, `all ${clicked} Home controls navigate correctly ${bad.join(' | ')}`);
  ok(!errs.length, 'no page errors (admin) ' + errs.join('|'));
  // long labels: very long module title stays on one line with full text in the tooltip
  await p.evaluate(() => { const m = tasksFor(me()).map(t => t.obj).find(o => o.title !== undefined && S.modules.includes(o)); m.title = 'An exceptionally long module title that keeps going to check truncation in every Home list and table row'; latest(m).title = m.title; go('home'); }); await p.waitForTimeout(200);
  const lo = await p.evaluate(() => [...document.querySelectorAll('.hz-t-main b[title^="An exceptionally"], .hz-lr-b b[title^="An exceptionally"]')].map(e => [e.scrollWidth > e.clientWidth, e.getBoundingClientRect().height < 24]));
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
  const empt = await p.evaluate(() => document.querySelectorAll('.hz .hx-empty, .hz .hx-muted').length);
  ok(empt >= 4 && !errs.length, 'empty workspace renders empty states (' + empt + ') without errors ' + errs.join('|'));
  await p.close();
  // role adaptive: content member and reviewer, desktop and phone
  for (const [email, vp] of [['hana.zaki@saja.com', { width: 1440, height: 900 }], ['sara.ahmed@saja.com', { width: 390, height: 844 }], ['ali.usama@saja.com', { width: 390, height: 844 }], ['ali.usama@saja.com', { width: 820, height: 1180 }]]) {
    [p, errs] = await open(vp); await login(p, email);
    const r = await p.evaluate(() => ({ scope: homeScope(me()).label, kpis: document.querySelectorAll('.hz-k').length, sec: [...document.querySelectorAll('.hx-sec button')].map(b => b.textContent), ovf: document.documentElement.scrollWidth - window.innerWidth }));
    ok(r.ovf <= 0 && !errs.length, `${email} @${vp.width}px: renders without overflow/errors (${r.scope}, ${r.kpis} KPIs) ${errs.join('|')}`);
    if (email.startsWith('hana')) ok(!r.sec.some(t => /active users|active workflows/.test(t)), 'content member does not see admin figures');
    await p.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
