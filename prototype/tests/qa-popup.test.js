// Every modal type, drawer, popover and dropdown, opened through its real control, at five viewports.
const { chromium } = require('playwright');
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const VPS = [['1920', { width: 1920, height: 1080 }], ['1440', { width: 1440, height: 900 }], ['1440@150%', { width: 960, height: 600 }], ['768', { width: 768, height: 1024 }], ['390', { width: 390, height: 844 }]];
// [label, user, route, params, opener (JS run in page; clicks the real control where one exists), kind]
const CASES = [
  ['Filter', 'ali', 'modules', {}, `document.querySelector('[data-act=flt-open]').click()`, 'modal'],
  ['Add product (long form)', 'ali', 'products', {}, `document.querySelector('[data-act=cfg-new]').click()`, 'modal'],
  ['Add new module type from the module form', 'ali', 'module-new', {}, `document.querySelector('[data-act=cfg-quick]').click()`, 'modal'],
  ['Compare all roles', 'ali', 'roles', {}, `document.querySelector('[data-act=role-compare]').click()`, 'modal'],
  ['Edit role', 'ali', 'roles', {}, `document.querySelector('[data-act=role-edit]').click()`, 'modal'],
  ['How permissions work', 'ali', 'roles', {}, `document.querySelector('[data-act=rp-info][data-v=perm]').click()`, 'modal'],
  ['Review hierarchy', 'ali', 'roles', {}, `document.querySelector('[data-act=rp-info][data-v=hier]').click()`, 'modal'],
  ['Document viewer', 'ali', 'module', { id: 'MOD-C-010' }, `document.querySelector('[data-act=file-open]').click()`, 'modal'],
  ['Version history', 'ali', 'module', { id: 'MOD-A-030' }, `ACT['version-open']({dataset:{kind:'Module',id:'MOD-A-030',v:'1'}})`, 'modal'],
  ['Timeline step details', 'ali', 'module', { id: 'MOD-A-018' }, `document.querySelector('[data-act=tl-step]:not([disabled])').click()`, 'modal'],
  ['Submit for review', 'ali', 'module', { id: 'MOD-B-015' }, `document.querySelector('[data-act=submit-open]').click()`, 'modal'],
  ['Resubmit after amendment', 'ali', 'module', { id: 'MOD-B-011' }, `document.querySelector('[data-act=resubmit-open]').click()`, 'modal'],
  ['Review decision', 'ahmed', 'review', { id: 'MOD-B-007' }, `document.querySelector('[data-act=decide]').click()`, 'modal'],
  ['E-signature', 'sara', 'review', { id: 'MOD-A-018' }, `document.querySelector('[data-act=sign]').click()`, 'modal'],
  ['Create asset', 'ali', 'assets', {}, `document.querySelector('[data-act=asset-new]').click()`, 'modal'],
  ['Asset submit', 'ali', 'asset', { id: 'AST-105' }, `document.querySelector('[data-act=asset-submit]').click()`, 'modal'],
  ['Asset new version', 'ali', 'asset', { id: 'AST-101' }, `document.querySelector('[data-act=asset-version]').click()`, 'modal'],
  ['Asset new text', 'ali', 'assemble', { id: 'AST-105' }, `document.querySelector('[data-act=new-text]').click()`, 'modal'],
  ['New SOP', 'ali', 'sops', {}, `document.querySelector('[data-act=sop-new]').click()`, 'modal'],
  ['Workflow preview', 'ali', 'workflows', {}, `document.querySelector('[data-act=wf-view]').click()`, 'modal'],
  ['Restore workspace confirm', 'ali', 'settings', { tab: 'data' }, `document.querySelector('[data-act=reset-open]').click()`, 'modal'],
  ['Approval success', 'ali', 'module', { id: 'MOD-C-001' }, `UI.modal={type:'success',kind:'Module',id:'MOD-C-001'};render()`, 'modal'],
  ['Add new workflow (side panel)', 'ali', 'module-new', {}, `UI.draft=UI.draft||{};ACT['wf-addnew']()`, 'drawer'],
  ['Notifications', 'ali', 'home', {}, `document.querySelector('[data-pop=bell]').click()`, 'pop'],
  ['Account menu', 'ali', 'home', {}, `document.querySelector('[data-pop=user]').click()`, 'pop'],
  ['Information popover', 'ali', 'tasks', {}, `document.querySelector('[data-pop^="info:"]').click()`, 'pop'],
  ['File actions menu', 'ali', 'module', { id: 'MOD-C-010' }, `document.querySelector('.fmenu-btn').click()`, 'pop'],
  ['Products multi-select dropdown', 'ali', 'module-new', {}, `ACT['d-type']({dataset:{v:'TY-CLAIM'}});UI.draft.step=2;render();document.querySelector('[data-msel=d-products] .msel-add').click()`, 'sel:.msel-pop'],
  ['Workflow picker', 'ali', 'module-new', {}, `ACT['d-type']({dataset:{v:'TY-CLAIM'}});UI.draft.step=3;render();document.querySelector('[data-act=msel-open][data-id=d-wf]').click()`, 'sel:.msel-pop'],
  ['@mention list', 'ahmed', 'review', { id: 'MOD-B-007' }, `(()=>{const t=document.getElementById('an-general');t.scrollIntoView({block:'center'});t.focus();t.value='@';t.dispatchEvent(new Event('input',{bubbles:true}))})()`, 'sel:.men-pop'],
  ['Global search', 'ali', 'home', {}, `(()=>{const i=document.getElementById('global-search');i.value='claim';i.dispatchEvent(new Event('input',{bubbles:true}))})()`, 'search'],
];
(async () => {
  const b = await chromium.launch();
  for (const [vl, vp] of VPS) {
    const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
    let who = null;
    for (const [label, u, route, params, opener, kind] of CASES) {
      if (who !== u) { await p.evaluate(() => ACT.logout()); await p.waitForTimeout(100); await p.fill('#login-email', ({ ali: 'ali.usama', ahmed: 'ahmed.ali', sara: 'sara.ahmed' })[u] + '@saja.com'); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(250); who = u; }
      await p.evaluate(([r, o]) => { UI.modal = null; UI.pop = null; UI.search = ''; go(r, o); window.scrollTo(0, 0); }, [route, params]); await p.waitForTimeout(250);
      let opened = true; try { await p.evaluate(opener.replace(/document\.querySelector\(([^)]*)\)\.click\(\)/, (m0, q) => `(el => { el.scrollIntoView({ block: 'center' }); el.click(); })(document.querySelector(${q}))`)); } catch (e) { opened = false; } await p.waitForTimeout(350);
      const m = await p.evaluate(kind => {
        const vw = innerWidth, vh = innerHeight; const inV = r => r.top >= -1 && r.left >= -1 && r.bottom <= vh + 1 && r.right <= vw + 1;
        const inside = (c, el) => { if (!el) return true; const R = c.getBoundingClientRect(), q = el.getBoundingClientRect(); return q.top >= R.top - 1 && q.bottom <= R.bottom + 1 && q.left >= R.left - 1 && q.right <= R.right + 1; };
        if (kind === 'modal') { const md = document.querySelector('.modal'); if (!md) return { open: false }; const body = md.querySelector('.modal-body') || md.querySelector('.success'); const head = md.querySelector('.modal-head'), foot = md.querySelector('.modal-foot');
          return { open: true, fits: inV(md.getBoundingClientRect()), shellScroll: md.scrollHeight > md.clientHeight + 1, bodyY: body ? getComputedStyle(body).overflowY : 'none', xOverflow: body ? body.scrollWidth > body.clientWidth + 1 : false, head: inside(md, head), foot: inside(md, foot), wide: [...md.querySelectorAll('*')].some(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > md.getBoundingClientRect().right + 2) && getComputedStyle(e).position !== 'fixed' && !(() => { for (let x = e.parentElement; x && x !== md; x = x.parentElement) { if (['auto', 'scroll', 'hidden'].includes(getComputedStyle(x).overflowX)) return true; } return false; })(); }) }; }
        if (kind === 'drawer') { const d = document.querySelector('.drawer'); if (!d) return { open: false }; const body = d.querySelector('.drawer-body'); return { open: true, fits: inV(d.getBoundingClientRect()), shellScroll: d.scrollHeight > d.clientHeight + 1, bodyY: getComputedStyle(body).overflowY, xOverflow: body.scrollWidth > body.clientWidth + 1, head: inside(d, d.querySelector('.drawer-head')), foot: true, wide: false }; }
        const el = document.querySelector(kind.startsWith('sel:') ? kind.slice(4) : kind === 'search' ? '.search-pop' : '.pop'); if (!el) return { open: false }; const r = el.getBoundingClientRect();
        return { open: true, fits: inV(r), shellScroll: false, bodyY: 'n/a', xOverflow: el.scrollWidth > el.clientWidth + 1, head: true, foot: true, wide: false };
      }, kind);
      const good = m.open && m.fits && !m.shellScroll && !m.xOverflow && m.head && m.foot && !m.wide && (kind === 'pop' || kind === 'search' || kind.startsWith('sel:') || m.bodyY === 'auto');
      ok(good, `${vl} · ${label}: ${good ? 'contained' : JSON.stringify(m)}`);
      if (m.open && (kind === 'modal' || kind === 'drawer')) {
        // background must not scroll while the overlay is open
        const bg = await p.evaluate(() => { const s0 = document.scrollingElement.scrollTop; window.scrollBy(0, 400); const moved = document.scrollingElement.scrollTop !== s0; window.scrollTo(0, s0); return { moved, lock: getComputedStyle(document.documentElement).overflow + '/' + getComputedStyle(document.body).overflow }; });
        const sc = await p.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 5);
        ok(!sc || !bg.moved, `${vl} · ${label}: page behind the overlay does not scroll (${bg.lock})`);
        await p.keyboard.press('Escape'); await p.waitForTimeout(150);
        ok(await p.evaluate(() => !document.querySelector('.modal, .drawer')), `${vl} · ${label}: Escape closes it`);
      }
    }
    ok(!errs.length, `${vl}: no page errors ${errs.join(' | ')}`); await p.close();
  }
  console.log(`${n} checks`); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
