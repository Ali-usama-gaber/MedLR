/* ---------- Charts: one visual system for Home and Reports ----------
   Line charts for trends over time, donuts for parts of a whole, columns and horizontal bars for comparisons.
   Every value passed in is computed by the caller from live records; nothing here holds data. */
// series: [[name, tone, values[]]]; tones map to the --mk-* chart colours.
const CH_TONE = { s1: 'var(--mk-s1)', ok: 'var(--mk-ok)', bad: 'var(--mk-bad)', warn: 'var(--mk-warn)', o1: 'var(--mk-o1)', o2: 'var(--mk-o2)', dim: 'var(--mk-dim)' };
function niceMax(v) { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function lineChart(labels, series, opts = {}) {
  const W = 600, H = 220, L = 34, R = 12, T = 14, B = 26; const iw = W - L - R, ih = H - T - B;
  const mx = niceMax(Math.max(1, ...series.flatMap(s => s[2]))); const ticks = [0, .25, .5, .75, 1].map(f => f * mx);
  const x = i => L + (labels.length < 2 ? iw / 2 : iw * i / (labels.length - 1)); const y = v => T + ih - ih * v / mx;
  const grid = ticks.map(t => `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="ch-ax" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${opts.fmt ? opts.fmt(t) : Math.round(t * 10) / 10}</text>`).join('');
  const xl = labels.map((l, i) => `<text class="ch-ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`).join('');
  const lines = series.map(s => `<polyline class="ch-line" style="stroke:${CH_TONE[s[1]]}" points="${s[2].map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>${opts.area && series.length === 1 ? `<polygon class="ch-area" style="fill:${CH_TONE[s[1]]}" points="${x(0)},${y(0)} ${s[2].map((v, i) => x(i) + ',' + y(v)).join(' ')} ${x(labels.length - 1)},${y(0)}"/>` : ''}${s[2].map((v, i) => `<circle class="ch-dot" cx="${x(i)}" cy="${y(v)}" r="4" style="stroke:${CH_TONE[s[1]]}"/>`).join('')}`).join('');
  const hit = labels.map((l, i) => { const w = labels.length < 2 ? iw : iw / (labels.length - 1); return `<rect class="ch-hit" x="${x(i) - w / 2}" y="${T}" width="${w}" height="${ih}" data-tip="${esc(l + '\n' + series.map(s => s[0] + ': ' + (opts.fmt ? opts.fmt(s[2][i]) : s[2][i])).join('\n'))}"/><line class="ch-cross" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${T + ih}"/>`; }).join('');
  return `<figure class="ch ch-line-fig" role="img" aria-label="${esc((opts.label || 'Trend') + ': ' + series.map(s => s[0] + ' ' + s[2].join(', ')).join('; '))}">${series.length > 1 ? chartLegendRow(series) : ''}<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${xl}${lines}<g class="ch-hits">${hit}</g></svg></figure>`;
}
function donut(parts, opts = {}) {
  const tot = parts.reduce((s, p) => s + p[1], 0); const r = 42, C = 2 * Math.PI * r; let off = 0; const gap = parts.filter(p => p[1]).length > 1 ? 1.6 : 0;
  const segs = parts.filter(p => p[1]).map(p => { const len = C * p[1] / tot; const seg = `<circle class="ch-seg" r="${r}" cx="60" cy="60" style="stroke:${CH_TONE[p[2]]}" stroke-dasharray="${Math.max(0.1, len - gap)} ${C}" stroke-dashoffset="${-off}" data-tip="${esc(p[0] + ': ' + p[1] + ' (' + Math.round(100 * p[1] / tot) + '%)')}"/>`; off += len; return seg; }).join('');
  return `<figure class="ch ch-donut" role="img" aria-label="${esc(parts.map(p => p[0] + ' ' + p[1]).join(', '))}"><svg viewBox="0 0 120 120"><circle class="ch-track" r="${r}" cx="60" cy="60"/>${tot ? `<g transform="rotate(-90 60 60)">${segs}</g>` : ''}<text class="ch-center" x="60" y="58" text-anchor="middle">${tot}</text><text class="ch-center-l" x="60" y="74" text-anchor="middle">${esc(opts.unit || 'total')}</text></svg>
    <figcaption class="ch-dleg">${parts.map(p => `<div><i style="background:${CH_TONE[p[2]]}"></i><span>${esc(p[0])}</span><b>${p[1]}</b><em>${tot ? Math.round(100 * p[1] / tot) : 0}%</em></div>`).join('')}</figcaption></figure>`;
}
const chartLegendRow = series => `<div class="legend ch-legend">${series.map(x => `<span><i class="${x[1]}"></i>${esc(x[0])}</span>`).join('')}</div>`;
// One floating tooltip for every element with data-tip (works for HTML and SVG marks).
(() => {
  let tip = null;
  document.addEventListener('mousemove', ev => {
    const el = ev.target.closest && ev.target.closest('[data-tip]');
    if (!el) { if (tip) tip.classList.remove('on'); return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'ch-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    if (tip.dataset.for !== el.dataset.tip) { tip.textContent = el.dataset.tip; tip.dataset.for = el.dataset.tip; }
    const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, ev.clientX - w / 2)) + 'px'; tip.style.top = Math.max(8, ev.clientY - h - 14) + 'px'; tip.classList.add('on');
  });
  document.addEventListener('scroll', () => { if (tip) tip.classList.remove('on'); }, true);
})();
