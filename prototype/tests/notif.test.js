const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  const posts = []; await p.route('https://mail.example.test/**', async r => { posts.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 200, body: '{}' }); });
  await p.route('https://fail.example.test/**', r => r.fulfill({ status: 503, body: '' }));
  await p.goto(require('url').pathToFileURL(require('path').join(__dirname, '..', 'dist', 'index.html')).href); await p.evaluate(() => localStorage.clear()); await p.reload();
  const E = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms || 150); const G = (r, o) => E(([r, o]) => go(r, o || {}), [r, o]).then(() => W(300));
  const login = async email => { await E(() => ACT.logout()); await W(); await p.fill('#login-email', email); await p.fill('#login-pass', 'pw'); await p.click('button[type=submit]'); await W(300); };
  const mention = async (text, uid) => { await p.click('#an-general'); await p.keyboard.type(text + ' @' + uid.slice(2, 5), { delay: 15 }); await W(200); await p.click(`.men-pop [data-v="${uid}"]`); await W(); await p.click('button[data-act=an-general]'); await W(250); };
  const general = async () => { await p.click('[data-act=an-genfocus]').catch(() => {}); await W(200); };
  await login('ali.usama@saja.com');
  // 1. In-app only (no endpoint): stored with real user id; email recorded as not configured
  await G('review', { id: 'MOD-B-007' }); await general();
  ok(await p.isVisible('#an-general'), 'general comment field reachable from the toolbar');
  await mention('Please check the claim', 'u-sara');
  let N = await E(() => S.notifications.slice());
  ok(N.length === 1 && N[0].to === 'u-sara' && N[0].objId === 'MOD-B-007' && N[0].annId, 'notification stored for real user id u-sara with object + annotation');
  ok(N[0].email.status === 'not configured', 'email status honestly "not configured" without an endpoint (' + N[0].email.status + ')');
  const aud = await E(() => S.audit.filter(e => e.action === 'User mentioned'));
  ok(aud.length === 1 && aud[0].toIds.includes('u-sara'), 'mention recorded in the audit trail');
  // 2. Edit the comment keeping the same mention -> no duplicate
  const annId = N[0].annId;
  await E(id => { const a = S.annotations.find(x => x.id === id); notifyMentions(annObj(a), a, a.mentions, 'Comment'); }, annId);
  ok((await E(() => S.notifications.length)) === 1, 'repeated mention on the same comment does not duplicate');
  // 3. Configure endpoint via Settings and mention again -> POSTed
  await G('settings', { tab: 'notifications' });
  await p.fill('#st-notifyEndpoint', 'http://insecure.test'); await W(400); await p.click('[data-act=set-save]'); await W();
  ok((await E(() => S.settings.notifyEndpoint)) === '', 'non-https endpoint rejected');
  await p.fill('#st-notifyEndpoint', 'https://mail.example.test/send'); await W(400); await p.click('[data-act=set-save]'); await W();
  ok((await E(() => S.settings.notifyEndpoint)) === 'https://mail.example.test/send', 'endpoint saved');
  await G('review', { id: 'MOD-B-007' }); await general(); await mention('Legal view please', 'u-rania'); await W(500);
  N = await E(() => S.notifications.find(n => n.to === 'u-rania'));
  ok(N && N.email.status === 'sent' && posts.length === 1 && posts[0].to === 'rania' + posts[0].to.slice(5) && posts[0].objId === 'MOD-B-007', 'email POSTed to endpoint and marked sent (' + (N && N.email.status) + ')');
  ok(await E(() => S.audit.some(e => e.action === 'Mention email sent')), 'email delivery recorded in audit');
  await E(() => { S.settings.notifyEndpoint = 'https://fail.example.test/x'; save(); });
  await general(); await mention('Reg check', 'u-layla'); await W(500);
  N = await E(() => S.notifications.find(n => n.to === 'u-layla'));
  ok(N && N.email.status === 'failed', 'failed delivery reported as failed, not sent');
  // 4. Recipient sees it, deep link opens object focused on the comment
  await login('sara.ahmed@saja.com');
  ok((await p.textContent('.bell-n').catch(() => '')).trim() !== '', 'recipient bell shows unread count');
  await p.click('[data-pop=bell]'); await W();
  ok(await p.isVisible(`[data-act=notif-open]`), 'mention notification listed');
  await p.click('[data-act=notif-open]'); await W(400);
  const r = await E(() => ({ name: UI.route.name, id: UI.route.p.id, focus: (annUI().focus || annUI().goto) }));
  ok((r.name === 'review' || r.name === 'module') && r.id === 'MOD-B-007' && r.focus === annId, 'deep link opens MOD-B-007 at the comment (' + JSON.stringify(r) + ')');
  ok(await E(() => S.notifications.find(n => n.to === 'u-sara').read), 'opened notification marked read');
  // 5. Permission: a user who cannot view the module is not notified, and an inactive user is skipped
  const perm = await E(() => { const a = S.annotations.find(x => x.objId === 'MOD-B-007' || (x.obj && x.obj === 'MOD-B-007')) || S.annotations[S.annotations.length - 1];
    const t = S.users.find(x => x.id === 'u-tarek'); const rid = roleId(t); const keep = S.roles[rid]; S.roles[rid] = keep.filter(p => !['view', 'page_modules', 'page_tasks', 'page_library'].includes(p));
    const n0 = S.notifications.length; notifyMentions(annObj(a), a, ['u-tarek'], 'Comment'); const blocked = S.notifications.length - n0; S.roles[rid] = keep;
    const m = S.users.find(x => x.id === 'u-mona'); m.status = 'Inactive'; const n1 = S.notifications.length; notifyMentions(annObj(a), a, ['u-mona'], 'Comment'); const inactive = S.notifications.length - n1; m.status = 'Active';
    const n2 = S.notifications.length; notifyMentions(annObj(a), a, ['u-tarek'], 'Comment'); const control = S.notifications.length - n2;
    return { blocked, inactive, control }; });
  ok(perm.control === 1, 'control: the same mention with permission restored is delivered');
  ok(perm.blocked === 0, 'recipient without permission to view the item is not notified');
  ok(perm.inactive === 0, 'inactive recipient is not notified');

  const blocked = await E(() => { const u = S.users.find(x => x.id === 'u-sara'); const o = modById('MOD-B-007'); const realCan = can; return canSeeObj(u, o); });
  ok(blocked === true, 'canSeeObj true for permitted user');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
