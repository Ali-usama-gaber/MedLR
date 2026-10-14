// Removes selectors that (1) never matched in the css-usage crawl AND (2) use a class name that appears nowhere
// in the JavaScript, not even as a dynamic prefix. Rules left with no selector are deleted; others keep the
// live selectors. Run css-usage.js first. Writes src/styles.css in place and prints what it removed.
const fs = require('fs'); const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
const js = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const unmatched = new Set(require('./.css-unused.json'));
// class names composed at runtime from these prefixes (e.g. `fn-${x}`, 'cq-' + n) are always kept
const DYN = ['mk-', 's-', 't-', 'p-', 'f-', 'fn-', 'an-', 'cq-', 'rv-', 'cs-', 'st-', 'drag-', 'k-', 'mat-', 'tone-', 'is-', 'lv-', 'ann-', 'sh-', 'c-'];
// Conservative: a class is kept when its name appears anywhere in the JS as a whole word (hyphens count as part
// of the word, so "hz-hello" does not keep "hello"). Classes added in ternaries or string concatenation stay.
const inJs = c => DYN.some(p => c.startsWith(p)) || new RegExp('(^|[^\\w-])' + c.replace(/-/g, '\\-') + '($|[^\\w-])').test(js);
const dead = s => unmatched.has(s) && [...s.matchAll(/\.([a-zA-Z][\w-]*)/g)].some(m => !inJs(m[1]));
let removedSel = 0, removedRules = 0; const log = [];
// Walk the stylesheet text: comments, @-blocks (recurse into @media/@supports), and plain rules.
function prune(text) {
  let out = '', i = 0;
  while (i < text.length) {
    if (text.startsWith('/*', i)) { const e = text.indexOf('*/', i + 2) + 2; out += text.slice(i, e); i = e; continue; }
    const brace = text.indexOf('{', i), close = text.indexOf('}', i);
    if (brace < 0 || (close >= 0 && close < brace)) { out += text.slice(i); break; }
    const head = text.slice(i, brace); const sel = head.trim();
    // find the matching closing brace
    let depth = 1, j = brace + 1; while (j < text.length && depth) { if (text.startsWith('/*', j)) { j = text.indexOf('*/', j + 2) + 2; continue; } if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
    const body = text.slice(brace + 1, j - 1);
    if (sel.startsWith('@')) {
      if (/^@(media|supports|layer|container)/.test(sel)) { const inner = prune(body); out += inner.trim() ? head + '{' + inner + '}' : head.replace(/[^\n]/g, '').slice(0, 0); }
      else out += text.slice(i, j); // @keyframes, @font-face… untouched
    } else {
      const parts = sel.split(/,(?![^(]*\))/).map(s => s.trim()); const keep = parts.filter(s => !dead(s));
      if (keep.length === parts.length) out += text.slice(i, j);
      else { removedSel += parts.length - keep.length; parts.filter(dead).forEach(s => log.push(s));
        if (keep.length) out += head.match(/^\s*/)[0] + keep.join(', ') + ' {' + body + '}'; else { removedRules++; out += head.match(/^\s*/)[0].replace(/\n[ \t]*$/, '\n').replace(/^\n+/, '\n'); } }
    }
    i = j;
  }
  return out;
}
const next = prune(css).replace(/\n{3,}/g, '\n\n');
fs.writeFileSync(path.join(SRC, 'styles.css'), next);
console.log(`removed ${removedSel} dead selectors (${removedRules} whole rules); styles.css ${css.length} → ${next.length} bytes, ${css.split('\n').length} → ${next.split('\n').length} lines`);
fs.writeFileSync(path.join(__dirname, '.css-pruned.txt'), log.join('\n'));
