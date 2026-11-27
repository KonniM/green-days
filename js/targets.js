/* Green Days — konkrete Ziele: Grad-Leiter und Gewichte.
   Grades: Dein aktuelles Limit am Board ist der Startpunkt, V11 / 8A steht in der letzten Planwoche. Dazwischen steigt
           das Limit-Ziel linear; Flash-, Moderat-, Circuit- und Aufwärm-Grade hängen daran. Loggst du einen härteren
           Boulder als die Leiter vorsieht, rückt die Leiter nach.
   Loads:  Für jede Kraftübung die konkrete Last: heute aus deinem letzten Eintrag (RPE gegen Ziel-RPE), für spätere
           Wochen eine Leiter zum Richtwert für V11 (Power-Company-Mittelwerte, braucht dein Körpergewicht). */
(function () {
  'use strict';
  const S = () => Store.s;
  const FONT = ['4', '5', '5+', '6A–6A+', '6B–6B+', '6C–6C+', '7A', '7A+', '7B–7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C'];
  const GOAL = 11, R = Math.round;
  const cl = (v) => Math.max(0, Math.min(15, v));
  const fLo = (v) => FONT[v].split('–')[0], fHi = (v) => FONT[v].split('–').pop();
  function fmt(a, b) { a = cl(R(a)); b = cl(R(b == null ? a : b)); if (b < a) b = a; return a === b ? `V${a} / ${FONT[a]}` : `V${a}–V${b} / ${fLo(a)}–${fHi(b)}`; }
  const half = (x) => R(x * 2) / 2;
  const fmtLevel = (x) => { x = half(x); return Number.isInteger(x) ? fmt(x, x) : fmt(Math.floor(x), Math.ceil(x)); };

  // ---------- Grad-Leiter ----------
  const lay = () => Plan.layout();
  const absWeek = (date) => Math.floor(D.diff(D.monday(date), lay()[0].start) / 7);
  const lastWeek = () => lay().reduce((a, p) => a + p.weeks, 0) - 1;
  const ref = () => S().profile.grade || { level: 6.5, week: 0 };   // Start: Flash V4, V5 in drei Versuchen müde → Limit etwa V6–V7
  function level(date) {
    const g = ref(), k = absWeek(date || D.today()), T = lastWeek(), a = Math.max(8, g.week || 0); // Limit-Bouldern beginnt in Woche 9
    if (g.level >= GOAL) return g.level;
    if (k <= a || T <= a) return k >= T ? GOAL : g.level;
    return half(g.level + (GOAL - g.level) * Math.min(1, (k - a) / (T - a)));
  }
  function set(lv, date) { S().profile.grade = { level: lv, week: Math.max(0, absWeek(date || D.today())), date: date || D.today() }; Store.save(); }
  const TOK = {
    limit: (L) => fmtLevel(L), near: (L) => fmtLevel(L - 1), flash: (L) => fmtLevel(L - 2),
    mod: (L) => fmt(R(L - 3.5), R(L - 2.5)), tech: (L) => fmt(R(L - 3), R(L - 2)), circ: (L) => fmt(R(L - 4.5), R(L - 3.5)),
    warm: (L) => fmt(0, Math.max(1, R(L - 4.5))), easy: (L) => fmt(0, Math.max(0, R(L - 5.5)))
  };
  const fill = (line, date) => String(line).indexOf('{g:') < 0 ? line : String(line).replace(/\{g:(\w+)\}/g, (m, k) => TOK[k] ? TOK[k](level(date)) : m);
  // Harte Fingerbelastungen aus dem Grad-Log: Durchstiege ab einem Grad unter dem Limit zählen voll, zwei Grade darunter halb,
  // jeder harte Versuch ohne Durchstieg zählt voll.
  function hiOf(grades, tries, date) {
    const L = level(date); let n = tries || 0;
    Object.keys(grades || {}).forEach(g => { const c = grades[g] || 0; if (+g >= L - 1) n += c; else if (+g >= L - 2) n += c * 0.5; });
    return R(n);
  }
  const has = (grades, tries) => !!((grades && Object.keys(grades).length) || tries);
  function learn(grades, date) {
    const tops = Object.keys(grades || {}).filter(g => grades[g] > 0).map(Number); if (!tops.length) return false;
    const best = Math.max.apply(null, tops);
    if (best > level(date)) { set(best, date); return true; }
    return false;
  }
  const summary = (grades) => Object.keys(grades || {}).map(Number).sort((a, b) => a - b).filter(g => grades[g] > 0).map(g => `V${g}×${grades[g]}`).join(' · ');
  function collect(f) {
    const grades = {}; let n = 0;
    Object.keys(f).forEach(k => { if (k.indexOf('gr_') === 0 && f[k] > 0) { grades[k.slice(3)] = f[k]; n += f[k]; } });
    return { grades, tries: f.tries || 0, n: n + (f.tries || 0) };
  }
  function formHTML(v, date, open) {
    v = v || {}; const L = level(date), g0 = v.grades || {}, keys = Object.keys(g0).map(Number);
    const lo = cl(Math.min.apply(null, [Math.floor(L) - 4].concat(keys))), hi = cl(Math.max.apply(null, [Math.ceil(L) + 1].concat(keys)));
    let cells = '';
    for (let g = lo; g <= hi; g++) {
      const n = g0[g] || 0;
      cells += `<div class="gcell${n ? ' on' : ''}"><button type="button" class="gnum" data-act="g-inc" aria-label="V${g} plus eins"><b>V${g}</b><em>${FONT[g]}</em><i>${n}</i></button><button type="button" class="gdec" data-act="g-dec" aria-label="V${g} minus eins">−</button><input type="hidden" name="gr_${g}" data-num value="${n}"></div>`;
    }
    return `<details class="more"${open ? ' open' : ''}><summary>Welche Grade hast du geklettert?</summary><p class="hint">Pro geschafftem Boulder einmal auf den Grad tippen. Aufwärm-Boulder weglassen. Die App zählt daraus deine harten Fingerbelastungen und zieht die Grad-Leiter nach.</p>
      <div class="ggrid">${cells}</div>${UI.field('Harte Versuche ohne Durchstieg', UI.stepper('tries', v.tries || 0, 'Versuche'), 'Versuche nahe an deinem Limit, die nicht geklappt haben.')}</details>`;
  }
  const bump = (el, d) => { const c = el.closest('.gcell'), inp = c.querySelector('input'), n = Math.max(0, (+inp.value || 0) + d); inp.value = n; c.querySelector('i').textContent = n; c.classList.toggle('on', n > 0); inp.dispatchEvent(new Event('change', { bubbles: true })); };
  UI.actions['g-inc'] = (el) => bump(el, 1);
  UI.actions['g-dec'] = (el) => bump(el, -1);

  // ---------- Gewichte ----------
  const START = { 'Half Crimp': { kg: 30, rpe: 6 }, 'Weighted Pull-up': { kg: 27.5, rpe: 7, reps: 3 } };   // aus deinen Angaben
  const kgs = (v) => String(v).replace('.', ',');
  const snap = (kg, step) => R(kg / step) * step;
  const lastLog = (grip) => S().sessions.slice().sort((x, y) => x.date < y.date ? 1 : -1).map(s => (s.hangs || []).find(h => h.grip === grip)).find(Boolean) || null;
  const bw = () => S().profile.bodyweight || null;
  function estimate(h, date) {   // Griffe ohne eigenen Eintrag: Startwert aus der Half-Crimp-Last ableiten
    const hc = next({ grip: 'Half Crimp', target: 8, step: 1.25 }, date), w = bw();
    if (h.grip === '3-Finger-Drag') return { kg: snap(hc.kg - 10, 1.25), text: 'Startwert geschätzt: etwa 10 kg unter deiner Half-Crimp-Last. Ab dem ersten Eintrag rechnet die App mit deinem Wert.' };
    if (w && /volle Leiste/.test(h.grip)) return { kg: snap((w + hc.kg) / 2 * 0.65, 2.5), text: 'Startwert geschätzt: 65 % deiner Half-Crimp-Last pro Hand.' };
    if (w && h.grip === 'Blockzug halbe Leiste') return { kg: snap((w + hc.kg) / 2 * 0.7, 2.5), text: 'Startwert geschätzt: 70 % deiner Half-Crimp-Last pro Hand – lieber etwas leichter beginnen.' };
    if (w && /loch/i.test(h.grip)) return { kg: snap((w + hc.kg) / 2 * 0.45, 2.5), text: 'Startwert geschätzt: 45 % deiner Half-Crimp-Last pro Hand.' };
    return null;
  }
  function next(h, date) {
    let prev = lastLog(h.grip), fromLog = !!prev, sug;
    if (!prev) { prev = (S().profile.startKg || {})[h.grip] || START[h.grip]; if (!prev) return estimate(h, date); }
    sug = !fromLog ? { kg: prev.kg, text: 'Startwert aus deiner Angabe.' } : h.hold ? { kg: prev.kg, text: 'Diese Woche die Last halten, nicht steigern.' } : Adapt.hangSuggest(prev, date, h);
    if (h.reps && prev.reps && prev.reps !== h.reps) sug = { kg: sug.kg + 2.5 * (prev.reps - h.reps), text: sug.text + ` Umgerechnet von ${prev.reps} auf ${h.reps} Wiederholungen.` };
    return Object.assign({ prev: fromLog ? prev : null }, sug);
  }
  // Richtwert für V11 aus den Power-Company-Mittelwerten (Trendgerade), in kg Zusatzlast
  function goalKg(h) {
    const key = h.grip === 'Half Crimp' ? 'finger' : h.grip === 'Weighted Pull-up' ? 'pull' : null, w = bw(), b = key && (LIB.bench || {})[key];
    if (!w || !b || !(b.pts || []).length) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = b.pts.length;
    b.pts.forEach(p => { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), c = (sy - m * sx) / n;
    let total = (m * GOAL + c) / 100 * w;
    if (key === 'pull' && h.reps) total *= 1 - 0.03 * (h.reps - 1);   // Tabelle = 1 Wiederholung; pro Wiederholung mehr ca. 3 % weniger
    return snap(total - w, h.step || 1.25);
  }
  function line(b, date) {
    const h = b.hang; if (!h || !window.Adapt) return null;
    const today = D.today(); date = date || today; if (date < today) return null;
    const now = next(h, today); if (!now) return null;
    if (h.test) return now.prev ? `Test: Deine letzte Trainingslast war ${(now.prev.kg >= 0 ? '+' : '') + kgs(now.prev.kg)} kg bei RPE ${now.prev.rpe}. Arbeite dich in drei Versuchen darüber hinaus.` : null;
    const plus = !h.label || /Zusatz/.test(h.label), sign = (v) => (plus && v >= 0 ? '+' : '') + kgs(v);
    if (D.diff(date, today) <= 6) return `Ziel heute: ${sign(now.kg)} kg – ${now.text}`;
    const goal = goalKg(h), kNow = absWeek(today), k = absWeek(date), p2 = lay().find(p => p.id === 'power2');
    const end = p2 ? absWeek(p2.start) - 1 : lastWeek();   // bis zum Test am Ende des zweiten Kraftblocks
    if (goal != null && goal > now.kg && end > kNow) {
      const kg = snap(now.kg + (goal - now.kg) * Math.min(1, (k - kNow) / (end - kNow)), h.step || 1.25);
      return `Geplant: ca. ${sign(kg)} kg – Leiter von heute ${sign(now.kg)} kg zum Richtwert für V11 / 8A (${sign(goal)} kg). Der genaue Wert kommt aus deinem letzten Eintrag.`;
    }
    let build = 0; for (let i = kNow + 1; i <= k; i++) { const w = Plan.weekAt(D.add(lay()[0].start, i * 7)); if (w && !w.week.deload && !w.week.test) build++; }
    const kg = snap(now.kg + (h.step || 1.25) * 0.5 * build, h.step || 1.25);
    return `Geplant: ca. ${sign(kg)} kg, wenn es wie bisher läuft (heute ${sign(now.kg)} kg). Der genaue Wert kommt aus deinem letzten Eintrag.${goal == null && (h.grip === 'Half Crimp' || h.grip === 'Weighted Pull-up') && !bw() ? ' Trag dein Körpergewicht in den Einstellungen ein, dann rechnet die App die Leiter bis zum Richtwert für 8A.' : ''}`;
  }
  const hiFromHangs = (hangs) => R((hangs || []).reduce((a, x) => a + (x.grip !== 'Weighted Pull-up' && x.rpe >= 7 ? (x.sets || 1) : 0), 0));

  window.Grades = { FONT, GOAL, fmt, fmtLevel, level, set, ref, fill, hiOf, has, learn, summary, collect, formHTML };
  window.Loads = { next, line, goalKg, hiFromHangs };
})();
