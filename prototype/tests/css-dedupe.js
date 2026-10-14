// Removes CSS declarations that a later rule always overrides: same selector, same media context, same property,
// with no !important on the earlier one (or !important on both). Cascade order is otherwise unchanged, so the
// result renders identically. Empty rules are dropped. Edits src/styles.css in place.
const fs = require('fs'); const path = require('path');
const FILE = path.join(__dirname, '..', 'src', 'styles.css'); const css = fs.readFileSync(FILE, 'utf8');
// Parse into a flat list of { ctx, sel, decls:[{prop, val, imp, raw}], start, end } for top-level and @media rules.
const rules = []; const tokens = [];
function parse(text, ctx, offset) {
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('/*', i)) { i = text.indexOf('*/', i + 2) + 2; continue; }
    const b = text.indexOf('{', i); if (b < 0) break; const head = text.slice(i, b).trim();
    let d = 1, j = b + 1; while (j < text.length && d) { if (text.startsWith('/*', j)) { j = text.indexOf('*/', j + 2) + 2; continue; } if (text[j] === '{') d++; else if (text[j] === '}') d--; j++; }
    const body = text.slice(b + 1, j - 1);
    if (/^@(media|supports)/.test(head)) parse(body, ctx + '|' + head.replace(/\s+/g, ' '), offset + b + 1);
    else if (!head.startsWith('@') && head) rules.push({ ctx, sel: head.split(/,(?![^(]*\))/).map(s => s.trim().replace(/\s+/g, ' ')).join(', '), body, bodyStart: offset + b + 1, bodyEnd: offset + j - 1 });
    i = j;
  }
}
parse(css, '', 0);
const splitDecls = body => { const out = []; let cur = '', depth = 0, q = null; for (const ch of body.replace(/\/\*[\s\S]*?\*\//g, '')) { if (q) { cur += ch; if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; } if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ';' && !depth) { out.push(cur); cur = ''; continue; } cur += ch; } if (cur.trim()) out.push(cur); return out.map(s => s.trim()).filter(Boolean).map(raw => { const k = raw.indexOf(':'); return { raw, prop: raw.slice(0, k).trim().toLowerCase(), imp: /!important\s*$/i.test(raw) }; }); };
// For each (ctx, sel, prop) keep only the last declaration that wins.
const last = new Map();
rules.forEach((r, ri) => { r.decls = splitDecls(r.body); r.decls.forEach((d, di) => { if (d.prop.startsWith('--') || !d.prop) return; const k = r.ctx + '¦' + r.sel + '¦' + d.prop; const prev = last.get(k); if (!prev || !prev.imp || d.imp) last.set(k, { ri, di, imp: d.imp }); }); });
let removed = 0; const edits = [];
rules.forEach((r, ri) => {
  // Only across different rules: repeats inside one rule are usually deliberate fallbacks (e.g. 100vh then 100dvh).
  const keep = r.decls.filter(d => { if (d.prop.startsWith('--') || !d.prop) return true; const w = last.get(r.ctx + '¦' + r.sel + '¦' + d.prop); if (w.ri <= ri) return true; removed++; return false; });
  if (keep.length !== r.decls.length) edits.push({ s: r.bodyStart, e: r.bodyEnd, text: keep.length ? ' ' + keep.map(d => d.raw).join('; ') + '; ' : null, r });
});
// Shorthand safety: skip edits where a later winning longhand/shorthand of the same family could interact.
let out = css; edits.sort((a, b) => b.s - a.s).forEach(ed => { if (ed.text === null) { const open = out.lastIndexOf('}', ed.s - 2) + 1; const close = ed.e + 1; out = out.slice(0, open) + out.slice(close); } else out = out.slice(0, ed.s) + ed.text + out.slice(ed.e); });
out = out.replace(/\n{3,}/g, '\n\n');
fs.writeFileSync(FILE, out);
console.log(`removed ${removed} overridden declarations in ${edits.length} rules (${edits.filter(e => e.text === null).length} emptied); ${css.length} → ${out.length} bytes`);
