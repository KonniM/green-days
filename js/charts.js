/* Green Days — kleine SVG-Charts (Linie mit Zielband, Balken mit Plan-Marke). Eine Achse, dünne Marken,
   Tooltip per Tippen/Ziehen. Farben kommen aus CSS-Variablen. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nice = (max) => { if (max <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(max))); const f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };

  function tip(host) {
    let t = host.querySelector('.chart-tip');
    if (!t) { t = document.createElement('div'); t.className = 'chart-tip'; t.hidden = true; host.appendChild(t); }
    return t;
  }
  function showTip(host, t, html, xPx) {
    t.innerHTML = html; t.hidden = false;
    const w = host.clientWidth, tw = t.offsetWidth;
    t.style.left = Math.max(0, Math.min(w - tw, xPx - tw / 2)) + 'px';
  }

  /* Linie: opts { points:[{x:label, y:number|null, tip?}], yMin, yMax, band:[lo,hi], bandLabel, refs:[{y,label}], fmt, height, dots } */
  function line(host, o) {
    const W = 340, H = o.height || 170, L = 30, R = 10, T = 12, B = 22;
    const pts = o.points, n = pts.length;
    const ys = pts.map(p => p.y).filter(v => v != null);
    const fmt = o.fmt || (v => String(Math.round(v * 100) / 100));
    if (!ys.length) { host.innerHTML = '<p class="empty">Noch keine Daten.</p>'; return; }
    const yMin = o.yMin != null ? o.yMin : Math.min.apply(null, ys);
    let yMax = o.yMax != null ? Math.max(o.yMax, Math.max.apply(null, ys)) : nice(Math.max.apply(null, ys));
    if (yMax === yMin) yMax = yMin + 1;
    const X = i => L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1));
    const Y = v => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.label || 'Diagramm')}">`;
    if (o.band) s += `<rect x="${L}" y="${Y(o.band[1])}" width="${W - L - R}" height="${Y(o.band[0]) - Y(o.band[1])}" class="c-band"/>` +
      (o.bandLabel ? `<text x="${W - R - 4}" y="${Y(o.band[1]) + 11}" text-anchor="end" class="c-bandlabel">${esc(o.bandLabel)}</text>` : '');
    const ticks = o.ticks || [yMin, (yMin + yMax) / 2, yMax];
    ticks.forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="c-grid"/><text x="${L - 5}" y="${Y(v) + 3.5}" text-anchor="end" class="c-axis">${esc(fmt(v))}</text>`; });
    (o.refs || []).forEach(r => { s += `<line x1="${L}" x2="${W - R}" y1="${Y(r.y)}" y2="${Y(r.y)}" class="c-ref"/>`; });
    // Linie (Lücken bei null)
    let d = '', pen = false;
    pts.forEach((p, i) => { if (p.y == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1) + ' '; pen = true; });
    s += `<path d="${d}" class="c-line"/>`;
    if (o.dots) pts.forEach((p, i) => { if (p.y != null) s += `<circle cx="${X(i)}" cy="${Y(p.y)}" r="4" class="c-dot"/>`; });
    const lastI = pts.map(p => p.y != null).lastIndexOf(true);
    if (lastI >= 0 && !o.dots) s += `<circle cx="${X(lastI)}" cy="${Y(pts[lastI].y)}" r="4.5" class="c-dot"/>`;
    // x-Achse: erste, mittlere, letzte Beschriftung
    [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).forEach(i => {
      s += `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" class="c-axis">${esc(pts[i].x)}</text>`;
    });
    s += `<line x1="0" x2="0" y1="${T}" y2="${H - B}" class="c-cross" visibility="hidden"/><circle r="5" class="c-dot c-hover" visibility="hidden"/></svg>`;
    host.innerHTML = s; host.classList.add('chart-host');
    const svg = host.querySelector('svg'), cross = svg.querySelector('.c-cross'), hov = svg.querySelector('.c-hover'), t = tip(host);
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width * W;
      let best = -1, bd = 1e9;
      pts.forEach((p, i) => { if (p.y == null) return; const dd = Math.abs(X(i) - x); if (dd < bd) { bd = dd; best = i; } });
      if (best < 0) return;
      cross.setAttribute('x1', X(best)); cross.setAttribute('x2', X(best)); cross.setAttribute('visibility', 'visible');
      hov.setAttribute('cx', X(best)); hov.setAttribute('cy', Y(pts[best].y)); hov.setAttribute('visibility', 'visible');
      showTip(host, t, `<b>${esc(fmt(pts[best].y))}</b> · ${esc(pts[best].tip || pts[best].x)}`, X(best) / W * r.width);
    };
    svg.addEventListener('pointerdown', move); svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); hov.setAttribute('visibility', 'hidden'); t.hidden = true; });
  }

  /* Balken: opts { items:[{x, y, target?, tip?, cur?, future?}], fmt, height, targetLabel } */
  function bars(host, o) {
    const W = 340, H = o.height || 160, L = 34, R = 6, T = 12, B = 22;
    const it = o.items, n = it.length;
    const fmt = o.fmt || (v => String(Math.round(v)));
    const max = nice(Math.max.apply(null, it.map(i => Math.max(i.y || 0, i.target || 0)).concat([o.minMax || 1])));
    const slot = (W - L - R) / n, bw = Math.min(24, slot - 4);
    const Y = v => T + (1 - v / max) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.label || 'Diagramm')}">`;
    [0, max / 2, max].forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="c-grid"/><text x="${L - 5}" y="${Y(v) + 3.5}" text-anchor="end" class="c-axis">${esc(fmt(v))}</text>`; });
    it.forEach((d, i) => {
      const cx = L + slot * i + slot / 2, h = Math.max(0, (H - B) - Y(d.y || 0));
      if (d.y > 0) {
        const r = Math.min(4, h, bw / 2), x = cx - bw / 2, y = Y(d.y), b = H - B;
        s += `<path d="M${x} ${b}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${b}Z" class="c-bar${d.cur ? ' is-cur' : ''}"/>`;
      }
      if (d.target != null && d.target > 0) s += `<line x1="${cx - bw / 2 - 3}" x2="${cx + bw / 2 + 3}" y1="${Y(d.target)}" y2="${Y(d.target)}" class="c-target"/>`;
      if (n <= 12 || i % 2 === 0) s += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="c-axis${d.cur ? ' is-cur' : ''}">${esc(d.x)}</text>`;
      s += `<rect x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent" data-i="${i}"/>`;
    });
    s += '</svg>';
    host.innerHTML = s + (o.legend ? `<div class="chart-legend">${o.legend}</div>` : ''); host.classList.add('chart-host');
    const svg = host.querySelector('svg'), t = tip(host);
    const hit = (ev) => {
      const el = ev.target.closest('[data-i]'); if (!el) return;
      const i = +el.dataset.i, d = it[i], r = svg.getBoundingClientRect();
      svg.querySelectorAll('.c-bar').forEach(b => b.classList.remove('is-hover'));
      showTip(host, t, d.tip || `<b>${esc(fmt(d.y || 0))}</b> · ${esc(d.x)}`, (L + slot * i + slot / 2) / W * r.width);
    };
    svg.addEventListener('pointerdown', hit); svg.addEventListener('pointermove', hit);
    svg.addEventListener('pointerleave', () => { t.hidden = true; });
  }

  /* Netzdiagramm: opts { axes:[{label, v:number|null, prev?, tip?, est?}], min, max, rings:[..], fmt, goal:{v,label}, ref:{v,label} }
     Ein Maßstab für alle Achsen. Ringe = Level, gestrichelter Ring = Ziel, Fläche = heute, dünne Linie = vorher. */
  function radar(host, o) {
    const W = 340, H = 320, cx = W / 2, cy = 158, R = 104, ax = o.axes, n = ax.length;
    const fmt = o.fmt || (v => String(Math.round(v)));
    const rad = (v) => R * Math.max(0, Math.min(1, (v - o.min) / (o.max - o.min)));
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
    const poly = (r) => ax.map((_, i) => pt(i, r).map(x => x.toFixed(1)).join(',')).join(' ');
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart radar" role="img" aria-label="${esc(o.label || 'Profil')}">`;
    (o.rings || []).forEach(v => { s += `<polygon points="${poly(rad(v))}" class="r-ring"/><text x="${cx + 4}" y="${cy - rad(v) + 3.5}" class="c-axis r-ringlabel">${esc(fmt(v))}</text>`; });
    ax.forEach((_, i) => { const p = pt(i, R); s += `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" class="r-spoke"/>`; });
    if (o.ref && o.ref.v != null) s += `<polygon points="${poly(rad(o.ref.v))}" class="r-ref"/>`;
    if (o.goal) s += `<polygon points="${poly(rad(o.goal.v))}" class="r-goal"/>`;
    const shape = (key, cls) => {
      const have = ax.map((a, i) => a[key] != null ? i : -1).filter(i => i >= 0);
      if (have.length < 3) return '';
      return `<polygon points="${ax.map((a, i) => pt(i, a[key] != null ? rad(a[key]) : 0).map(x => x.toFixed(1)).join(',')).join(' ')}" class="${cls}"/>`;
    };
    s += shape('prev', 'r-prev') + shape('v', 'r-area');
    ax.forEach((a, i) => {
      if (a.v != null) { const p = pt(i, rad(a.v)); s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" class="c-dot r-dot" data-i="${i}"/>`; }
      const lp = pt(i, R + 16), c = Math.cos(ang(i));
      const anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
      const up = Math.sin(ang(i)) < -0.5 ? -9 : Math.sin(ang(i)) > 0.5 ? 4 : -2;
      s += `<text x="${lp[0].toFixed(1)}" y="${(lp[1] + up).toFixed(1)}" text-anchor="${anchor}" class="r-label">${esc(a.label)}</text><text x="${lp[0].toFixed(1)}" y="${(lp[1] + up + 13).toFixed(1)}" text-anchor="${anchor}" class="r-val">${a.v != null ? (a.est ? '≈ ' : '') + esc(fmt(a.v)) : '–'}</text>`;
      const hp = pt(i, R * 0.62); s += `<circle cx="${hp[0].toFixed(1)}" cy="${hp[1].toFixed(1)}" r="${Math.min(46, R * Math.sin(Math.PI / n) * 0.95).toFixed(0)}" fill="transparent" data-i="${i}"/>`;
    });
    s += '</svg>';
    host.innerHTML = s + (o.legend ? `<div class="chart-legend">${o.legend}</div>` : ''); host.classList.add('chart-host');
    const svg = host.querySelector('svg'), t = tip(host);
    const hit = (ev) => {
      const el = ev.target.closest('[data-i]'); if (!el) { t.hidden = true; return; }
      const a = ax[+el.dataset.i], r = svg.getBoundingClientRect(), p = pt(+el.dataset.i, R * 0.7);
      showTip(host, t, a.tip || `<b>${a.v != null ? esc(fmt(a.v)) : '–'}</b> · ${esc(a.label)}`, p[0] / W * r.width);
      t.style.top = Math.max(0, p[1] / H * r.height - 34) + 'px';
    };
    svg.addEventListener('pointerdown', hit); svg.addEventListener('pointermove', hit);
    svg.addEventListener('pointerleave', () => { t.hidden = true; });
  }

  window.Charts = { line, bars, radar, esc };
})();
