#!/usr/bin/env node
/* Cross-platform runner for the browser regression suites (Windows, macOS, Linux).
   Usage:  node tests/run.js            run every suite
           node tests/run.js nav perms  run only the named suites
   Build first (python build.py). Playwright is resolved locally or from the global npm root. */
const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dir = __dirname;
const SUITES = ['e2e', 'perms', 'life', 'media.test', 'ann.test', 'ann2.test', 'fileview.test', 'forms.test', 'acceptance.test', 'smoke2', 'notif.test', 'rail.test', 'nav.test', 'home.test', 'formstate.test', 'v2.test', 'qa-perm.test', 'qa-popup.test', 'qa-crawl.test', 'qa-data.test', 'qa-forms.test', 'qa-adversary.test', 'rework.test', 'config.test', 'consistency.test'];
if (!fs.existsSync(path.join(dir, '..', 'dist', 'index.html'))) { console.error('dist/index.html is missing. Run: python build.py'); process.exit(2); }
let globalRoot = ''; try { globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch (e) {}
const env = { ...process.env, NODE_PATH: [process.env.NODE_PATH, globalRoot].filter(Boolean).join(path.delimiter) };
const args = process.argv.slice(2); const parallel = args.includes('--parallel');
const pick = args.filter(a => !a.startsWith('--')); const list = pick.length ? SUITES.filter(s => pick.some(p => s === p || s === p + '.test')) : SUITES;
function runOne(t) {
  const t0 = Date.now(); const r = spawnSync(process.execPath, [path.join(dir, t + '.js')], { env, encoding: 'utf8', cwd: dir, timeout: 15 * 60000 });
  const out = (r.stdout || '') + (r.stderr || ''); const lines = out.split(/\r?\n/);
  const pass = lines.filter(l => l.startsWith('PASS')).length; const fail = lines.filter(l => l.startsWith('FAIL')).length;
  const tail = lines.find(l => /ALL PASSED|FAILED|NO PAGE ERRORS|Error/.test(l)) || '';
  const okRun = r.status === 0 && !fail && !/FAILED|Error/.test(tail);
  return { t, okRun, pass, fail, tail: tail.trim(), secs: ((Date.now() - t0) / 1000).toFixed(0), out, status: r.status };
}
let bad = 0;
function printResult(r) {
  if (!r.okRun) bad++;
  console.log(`${r.okRun ? 'ok  ' : 'FAIL'} ${r.t.padEnd(18)} exit=${r.status} pass=${r.pass} fail=${r.fail} ${r.secs}s  ${r.tail}`);
  if (!r.okRun) r.out.split(/\r?\n/).filter(l => l.startsWith('FAIL') || /Error|PAGEERR|CHECK/.test(l)).slice(0, 12).forEach(l => console.log('       ' + l.slice(0, 400)));
}
if (parallel && list.length > 1) {
  const { spawn } = require('child_process');
  const maxW = Math.min(4, list.length);
  function runAsync(t) {
    return new Promise(resolve => {
      const t0 = Date.now();
      const child = spawn(process.execPath, [path.join(dir, t + '.js')], { env, cwd: dir });
      let out = '';
      child.stdout.on('data', d => out += d);
      child.stderr.on('data', d => out += d);
      child.on('close', code => {
        const lines = out.split(/\r?\n/);
        const pass = lines.filter(l => l.startsWith('PASS')).length;
        const fail = lines.filter(l => l.startsWith('FAIL')).length;
        const tail = lines.find(l => /ALL PASSED|FAILED|NO PAGE ERRORS|Error/.test(l)) || '';
        const okRun = code === 0 && !fail && !/FAILED|Error/.test(tail);
        resolve({ t, okRun, pass, fail, tail: tail.trim(), secs: ((Date.now() - t0) / 1000).toFixed(0), out, status: code });
      });
    });
  }
  (async () => {
    const queue = [...list];
    const results = [];
    async function worker() {
      while (queue.length) {
        const t = queue.shift();
        const r = await runAsync(t);
        results.push(r);
      }
    }
    await Promise.all(Array.from({ length: Math.min(maxW, list.length) }, () => worker()));
    for (const name of list) {
      const r = results.find(x => x.t === name);
      if (r) printResult(r);
    }
    console.log(bad ? `\n${bad} suite(s) failed` : '\nAll suites passed');
    process.exit(bad ? 1 : 0);
  })();
} else {
  for (const t of list) printResult(runOne(t));
  console.log(bad ? `\n${bad} suite(s) failed` : '\nAll suites passed');
  process.exit(bad ? 1 : 0);
}
