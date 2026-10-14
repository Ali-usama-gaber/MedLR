// Finds style rules whose selectors never match anything in a broad crawl of the app (every page × several
// roles × viewports, dialogs, popovers, toasts, wizard steps, empty states). Writes tests/.css-unused.json.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const URL = require('url').pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
const PAGES = require('./css-usage-pages.js');
(async () => {
  const b = await chromium.launch(); const used = new Set(); let all = null;
  const collect = p => p.evaluate(() => { const out = []; const walk = rules => { for (const r of rules) { if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; } if (!r.selectorText) continue; r.selectorText.split(/,(?![^(]*\))/).forEach(s => { s = s.trim(); const base = s.replace(/::?(before|after|placeholder|selection|marker|-webkit-[\w-]+|-moz-[\w-]+|file-selector-button|backdrop)\b(\([^)]*\))?/g, '').replace(/:(hover|focus|focus-visible|focus-within|active|visited|checked|disabled|enabled|invalid|valid|placeholder-shown|target|indeterminate|read-only|required)\b/g, '') || '*'; let hit = false; try { hit = !!document.querySelector(base); } catch (e) { hit = true; } out.push([s, hit]); }); } }; for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} } return out; });
  const mark = async p => { const r = await collect(p); if (!all) all = new Set(r.map(x => x[0])); r.forEach(([s, h]) => { if (h) used.add(s); }); };
  const USERS = ['ali.usama', 'hana.zaki', 'omar.khalil', 'ahmed.ali', 'sara.ahmed', 'karim.fawzi', 'youssef.amin'];
  for (const [vw, vh] of [[1440, 900], [1100, 800], [820, 1180], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: vw, height: vh } }); p.on('dialog', d => d.accept());
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await mark(p);
    await p.fill('#login-email', ''); await p.click('button[type=submit]'); await p.waitForTimeout(100); await mark(p);
    await p.evaluate(() => go('forgot')); await mark(p); await p.evaluate(() => { UI.f.resetSent = 'a@b.co'; render(); }); await mark(p);
    for (const u of (vw === 1440 ? USERS : ['ali.usama'])) {
      await p.evaluate(e => { S.signedIn = true; S.personaId = S.users.find(x => x.email === e + '@saja.com').id; save(); }, u);
      for (const [r, o] of PAGES.pages) {
        await p.evaluate(([r, o]) => { UI.modal = null; UI.pop = null; UI.search = ''; try { go(r, o || {}); } catch (e) {} }, [r, o]); await p.waitForTimeout(15); await mark(p);
        if (u === 'ali.usama' && vw === 1440) for (let s = 1; s < 5; s++) { const moved = await p.evaluate(s => { const D = UI.draft || UI.udraft || UI.nwf; if (!D || D.step === undefined) return false; D.step = s; D.maxStep = 5; D.tried = true; try { render(); } catch (e) {} return true; }, s); if (!moved) break; await mark(p); }
      }
      if (u === 'ali.usama') for (const js of PAGES.modals) { await p.evaluate(js => { UI.modal = null; UI.pop = null; go('home'); try { eval(js); render(); } catch (e) {} }, js); await p.waitForTimeout(40); await mark(p); }
    }
    await p.evaluate(() => { UI.modal = null; UI.pop = null; S.modules = []; S.assets = []; S.audit = []; S.annotations = []; S.notifications = []; });
    for (const r of ['home', 'modules', 'assets', 'library', 'tasks', 'reports', 'audit', 'lifecycle']) { const e = await p.evaluate(r => { try { go(r); return ''; } catch (e) { return e.message; } }, r); if (e) console.log('EMPTY-WORKSPACE ERROR on ' + r + ': ' + e); await mark(p); }
    await p.close();
  }
  await b.close();
  const unused = [...all].filter(s => !used.has(s));
  fs.writeFileSync(path.join(__dirname, '.css-unused.json'), JSON.stringify(unused, null, 1));
  console.log('selectors:', all.size, ' never matched:', unused.length);
})();
