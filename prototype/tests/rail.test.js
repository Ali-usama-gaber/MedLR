const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, label] of [[1440, 900, 'desktop'], [960, 600, 'desktop at 150% browser zoom'], [820, 1180, 'tablet'], [390, 844, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.fill('#login-email', 'ali.usama@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(300);
    for (const [route, id] of [['review', 'MOD-B-007'], ['asset-review', await p.evaluate(() => (S.assets.find(a => a.review) || {}).id)], ['review', 'MOD-B-020']]) {
      if (!id) continue;
      await p.evaluate(([r, id]) => go(r, { id }), [route, id]); await p.waitForTimeout(500);
      const tb = await p.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().bottom);
      const rail = await p.$('.an-rail'); if (!rail) { ok(false, label + ' ' + id + ' rail present'); continue; }
      const pick = await p.$('.an-rail [data-act=an-tool][aria-pressed=false]');
      const tool = pick ? await pick.getAttribute('data-v') : null; if (pick) { await pick.click(); await p.waitForTimeout(150); }
      const sc = await p.evaluate(() => { const els = [document.scrollingElement, document.getElementById('content'), ...document.querySelectorAll('.main')]; let best = null; els.forEach(e => { if (e && e.scrollHeight > e.clientHeight + 50 && (!best || e.scrollHeight > best.scrollHeight)) best = e; }); if (!best) return 0; const rl = document.querySelector('.an-rail'); const pr = rl.parentElement.getBoundingClientRect(); const tb = document.querySelector('.topbar').getBoundingClientRect().bottom; const room = pr.height - rl.offsetHeight - 30; if (room < 40) return 0; best.scrollTop = best.scrollTop + pr.top - tb + room * 0.7; return best.scrollTop; });
      await p.waitForTimeout(250);
      const r = await p.evaluate(() => document.querySelector('.an-rail').getBoundingClientRect().toJSON());
      ok(sc === 0 || (r.top >= tb - 1 && r.top < tb + 40 && r.bottom > 0), `${label} ${id}: rail stays under the top bar after scrolling ${sc}px (top ${Math.round(r.top)}, bar ${Math.round(tb)})`);
      if (tool) ok(await p.evaluate(t => !!document.querySelector(`.an-rail [data-act=an-tool][data-v="${t}"][aria-pressed=true]`), tool), `${label} ${id}: selected tool ${tool} preserved while scrolling`);
      const side = await p.$('.rv-side'); if (side && w > 1000) { const s = await side.boundingBox(); ok(s.x >= r.right - 1 || s.y >= r.bottom - 1 || r.x >= s.x + s.width - 1, `${label}: rail does not cover the comments panel`); }
    }
    ok(errs.length === 0, label + ' no page errors ' + errs.join('|')); await p.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
