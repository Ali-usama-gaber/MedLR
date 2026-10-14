#!/usr/bin/env node
/* Cross-platform runner for the browser regression suites (Windows, macOS, Linux).
   Usage:  node tests/run.js            run every suite
           node tests/run.js nav perms  run only the named suites
   Build first (python build.py). Playwright is resolved locally or from the global npm root. */
const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dir = __dirname;
const SUITES = ['e2e', 'perms', 'life', 'media.test', 'ann.test', 'ann2.test', 'fileview.test', 'forms.test', 'acceptance.test', 'smoke2', 'notif.test', 'rail.test', 'nav.test', 'home.test', 'formstate.test', 'v2.test', 'qa-perm.test', 'qa-popup.test', 'qa-crawl.test', 'qa-data.test', 'qa-forms.test', 'qa-adversary.test'];
if (!fs.existsSync(path.join(dir, '..', 'dist', 'index.html'))) { console.error('dist/index.html is missing. Run: python build.py'); process.exit(2); }
let globalRoot = ''; try { globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch (e) {}
const env = { ...process.env, NODE_PATH: [process.env.NODE_PATH, globalRoot].filter(Boolean).join(path.delimiter) };
const pick = process.argv.slice(2); const list = pick.length ? SUITES.filter(s => pick.some(p => s === p || s === p + '.test')) : SUITES;
let bad = 0;
for (const t of list) {
  const t0 = Date.now(); const r = spawnSync(process.execPath, [path.join(dir, t + '.js')], { env, encoding: 'utf8', cwd: dir, timeout: 15 * 60000 });
  const out = (r.stdout || '') + (r.stderr || ''); const lines = out.split(/\r?\n/);
  const pass = lines.filter(l => l.startsWith('PASS')).length; const fail = lines.filter(l => l.startsWith('FAIL')).length;
  const tail = lines.find(l => /ALL PASSED|FAILED|NO PAGE ERRORS|Error/.test(l)) || '';
  const okRun = r.status === 0 && !fail && !/FAILED|Error/.test(tail);
  if (!okRun) bad++;
  console.log(`${okRun ? 'ok  ' : 'FAIL'} ${t.padEnd(18)} exit=${r.status} pass=${pass} fail=${fail} ${((Date.now() - t0) / 1000).toFixed(0)}s  ${tail.trim()}`);
  if (!okRun) lines.filter(l => l.startsWith('FAIL') || /Error|PAGEERR|CHECK/.test(l)).slice(0, 12).forEach(l => console.log('       ' + l.slice(0, 400)));
}
console.log(bad ? `\n${bad} suite(s) failed` : '\nAll suites passed');
process.exit(bad ? 1 : 0);
