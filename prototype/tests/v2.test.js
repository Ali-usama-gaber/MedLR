const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const open = async vp => { const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('file:///home/user/MedLR/prototype/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); return [p, errs]; };
  const login = async (p, email) => { await p.evaluate(() => ACT.logout()); await p.waitForTimeout(150); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(300); };
  let [p, errs] = await open({ width: 1440, height: 900 }); const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 200); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W(300));
  await login(p, 'ali.usama@saja.com');
  // greeting
  const h1 = (await p.textContent('.hz-hello h1')).trim(); ok(h1 === 'Welcome, Ali', 'Home greeting is "Welcome, Ali" (' + h1 + ')');
  ok(!/Good (morning|afternoon|evening)/.test(await p.textContent('#content')), 'no time-of-day wording');
  // navigation
  const admin = await E(() => { const items = [...document.querySelectorAll('.side > *')]; const i = items.findIndex(e => e.textContent.trim() === 'ADMINISTRATION'); return items.slice(i + 1).filter(e => e.classList.contains('nav-item')).map(e => e.title); });
  ok(JSON.stringify(admin) === JSON.stringify(['Roles & Permissions', 'People & Teams', 'Settings']), 'Administration = Roles & Permissions, People & Teams, Settings (' + admin.join(', ') + ')');
  // People & Teams
  await p.click('.side .nav-item[title="People & Teams"]'); await W(300);
  const tabs = await E(() => [...document.querySelectorAll('.set-tab span:first-of-type')].map(s => s.textContent));
  ok(['Overview', 'Users', 'Teams', 'Functions'].every(t => tabs.includes(t)), 'People & Teams has Users, Teams, Functions (' + tabs.join(', ') + ')');
  ok(await E(() => +document.querySelector('.hub-tbl tbody tr td:nth-child(2) b').textContent === S.users.length), 'Users count from records');
  await p.click('.set-tab:has-text("Users")'); await W(300);
  ok(await E(() => UI.route.name === 'users' && document.querySelectorAll('.set-main table tbody tr').length === S.users.length && document.querySelector('.side .nav-item.active').title === 'People & Teams'), 'Users list inside People & Teams; sidebar highlights it');
  await p.click('.set-main table tbody tr'); await W(300);
  ok(await E(() => UI.route.name === 'user' && [...document.querySelectorAll('.crumbs button')].map(x => x.textContent).join('>') === 'People & Teams>Users'), 'user detail breadcrumbs: People & Teams › Users');
  await G('user-edit', { id: 'u-hana' }); ok(await E(() => UI.route.name === 'user-edit' && !!document.querySelector('form')), 'user edit form opens');
  await G('users'); ok(await E(() => document.querySelector('.side .nav-item.active').title === 'People & Teams'), 'old Users link lands in People & Teams');
  // info popover on Users: hidden by default, opens on click, closes on Escape
  ok(!(await p.$('.itip-pop')), 'information hidden by default');
  await p.click('.page-head .itip-btn'); await W(); ok(await p.isVisible('.itip-pop') && (await p.textContent('.itip-pop')).includes('Role'), 'ⓘ opens a popover with the explanation');
  await p.keyboard.press('Escape'); await W(); ok(!(await p.$('.itip-pop')), 'Escape closes the popover');
  // Roles & Permissions
  await G('roles'); const rt = await p.textContent('#content');
  ok(!rt.includes('How your active workflows use it') && !(await p.$('.hier-wf')), '“How your active workflows use it” removed');
  ok(!(await p.$('.how-list')) && !(await p.$('.hier-pats')), 'explanations are not expanded on the page');
  ok(await E(() => !S.workflows.filter(w => !w.hidden).some(w => document.querySelector('#content').textContent.includes(w.name))), 'no workflow names listed on the page');
  await p.click('[data-act=rp-info][data-v=perm]'); await W(); ok((await p.textContent('.modal #m-title')) === 'How permissions work' && await p.isVisible('.modal .how-list'), '“How permissions work” opens its popup');
  await p.click('.modal [data-act=modal-close]'); await W(); ok(!(await p.$('.modal')), 'popup closes');
  await p.click('[data-act=rp-info][data-v=hier]'); await W(); ok((await p.textContent('.modal #m-title')) === 'Review hierarchy' && await p.isVisible('.modal .hier-flow'), '“Review hierarchy” opens its popup');
  await p.keyboard.press('Escape'); await W();
  // role editing still works and is enforced
  await p.click('[data-act=role-edit][data-role="Content-Member"]'); await W(); ok(await E(() => UI.modal && UI.modal.type === 'role'), 'role edit dialog opens');
  const had = await E(() => S.roles['Content-Member'].includes('view_reports'));
  await p.click('[data-act=perm-toggle][data-role="Content-Member"][data-perm="view_reports"]'); await W();
  await p.click('.modal [data-act=role-save]').catch(() => {}); await W(300);
  const now = await E(() => S.roles['Content-Member'].includes('view_reports')); ok(had !== now, 'permission change saved (' + had + '→' + now + ')');
  await login(p, 'hana.zaki@saja.com'); const navs = await E(() => [...document.querySelectorAll('.side .nav-item')].map(x => x.title));
  ok(navs.includes('Reports') === now, 'enforced: Reports in Hana’s navigation = ' + now);
  await G('roles'); ok((await p.textContent('#content')).includes('do not have access') || !(await p.$('[data-act=role-edit]')), 'content member cannot manage roles');
  ok(!errs.length, 'no page errors ' + errs.join('|')); await p.close();
  // popup scroll containment at three sizes
  for (const vp of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 700 }]) {
    [p, errs] = await open(vp); await login(p, 'ali.usama@saja.com');
    const cases = [['roles', 'ACT["role-compare"]()'], ['products', 'document.querySelector("[data-act=cfg-new]").click()'], ['modules', 'document.querySelector("[data-act=flt-open]").click()'], ['roles', 'ACT["rp-info"]({dataset:{v:"hier"}})'], ['module', 'document.querySelector("[data-act=file-open]").click()', { id: 'MOD-C-010' }]];
    for (const [r, js, o] of cases) {
      await p.evaluate(([r, o]) => { UI.modal = null; go(r, o || {}); }, [r, o]); await p.waitForTimeout(300); await p.evaluate(js); await p.waitForTimeout(400);
      const m = await p.evaluate(() => { const md = document.querySelector('.modal'); if (!md) return null; const R = md.getBoundingClientRect(); const body = md.querySelector('.modal-body'); const head = md.querySelector('.modal-head'), foot = md.querySelector('.modal-foot');
        const inBox = el => { if (!el) return true; const q = el.getBoundingClientRect(); return q.top >= R.top - 1 && q.bottom <= R.bottom + 1 && q.left >= R.left - 1 && q.right <= R.right + 1; };
        return { modalScrolls: md.scrollHeight > md.clientHeight + 1, bodyOverflowX: body ? body.scrollWidth > body.clientWidth + 1 : false, fits: R.top >= -1 && R.bottom <= innerHeight + 1 && R.left >= -1 && R.right <= innerWidth + 1, head: inBox(head), foot: inBox(foot), bodyY: body ? getComputedStyle(body).overflowY : '' }; });
      ok(m && !m.modalScrolls && m.bodyY === 'auto' && m.head && m.foot && m.fits && !m.bodyOverflowX, `${vp.width}px ${r}: only the body scrolls, header/footer inside, no overflow ${JSON.stringify(m)}`);
    }
    // long body really scrolls inside
    await p.evaluate(() => { UI.modal = null; go('roles'); }); await p.waitForTimeout(200); await p.evaluate(() => ACT['role-compare']()); await p.waitForTimeout(300);
    const sc = await p.evaluate(() => { const b = document.querySelector('.modal-body'); const f = document.querySelector('.modal-foot').getBoundingClientRect().top; b.scrollTop = 99999; return { moved: b.scrollTop > 0 || b.scrollHeight <= b.clientHeight, footSame: Math.abs(document.querySelector('.modal-foot').getBoundingClientRect().top - f) < 1 }; });
    ok(sc.moved && sc.footSame, `${vp.width}px: scrolling the body leaves the footer in place`);
    ok(!errs.length, vp.width + 'px no page errors ' + errs.join('|')); await p.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
