/* Green Days — Fortschritt: Standortbestimmung (Netzdiagramm in V-Leveln), Ziele mit Stufen
   (One-Arm-Pull-up, Front Lever, Pancake, Mittelspagat), Technik-Stand, Meilensteine. */
(function () {
  'use strict';
  const { e, $, $$, S, LIB, THEMES, field, readForm, toast, sheet, closeSheet, clipHTML } = UI;
  const A = UI.actions;
  const ui = { tab: 'over' };
  const num = (v, d) => (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toString().replace('.', ',');
  const FONT = ['4', '5', '5+', '6A', '6B', '6C', '7A', '7A+', '7B', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C'];
  const vLabel = (v) => 'V' + num(Math.max(0, v), Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1);
  const gradeSelect = (name, cur, from, to) => `<select name="${name}" data-num><option value="">–</option>${Array.from({ length: to - from + 1 }, (_, i) => from + i).map(v => `<option value="${v}"${cur === v ? ' selected' : ''}>V${v} · ${FONT[v]}</option>`).join('')}</select>`;
  const stageSelect = (name, cur, list) => `<select name="${name}" data-num><option value="">–</option>${list.map((t, i) => `<option value="${i}"${cur === i ? ' selected' : ''}>${e(t)}</option>`).join('')}</select>`;

  // =============================== ZIELE ===============================
  const GOALS = LIB.goals || [];
  const LOWER = { kg_assist: 1, cm: 1 };          // kleiner = besser
  const UNIT = { seconds: 's', reps: 'Wdh.', kg_assist: 'kg Hilfe', kg_added: 'kg Zusatz', cm: 'cm', level: 'Stufe' };
  function cur(id) {
    const g = GOALS.find(x => x.id === id); if (!g || !g.steps || !g.steps.length) return null;
    const st = S().goals[id] || { step: 1, logs: [] };
    const n = Math.max(1, Math.min(g.steps.length, st.step || 1));
    return { goal: g, step: g.steps[n - 1], n, total: g.steps.length, logs: st.logs || [], done: !!st.done, started: !!S().goals[id] };
  }
  // Zielwert einer Stufe; „kg Zusatz“ mit Prozentangabe wird über dein Körpergewicht in kg umgerechnet
  function tgt(st) {
    if (st.target == null) return null;
    if (st.metric === 'kg_added' && /%/.test(st.criterion_de || '')) { const bw = S().profile.bodyweight; return bw ? Math.round(bw * st.target / 100 * 2) / 2 : null; }
    return st.target;
  }
  function stepFrac(c) {
    const t = tgt(c.step), logs = c.logs.filter(l => l.step === c.n && l.value != null);
    if (c.done) return 1; if (!logs.length || t == null) return 0;
    const lower = LOWER[c.step.metric];
    const best = lower ? Math.min.apply(null, logs.map(l => l.value)) : Math.max.apply(null, logs.map(l => l.value));
    if (lower) return best <= t ? 1 : Math.max(0, Math.min(0.95, t > 0 ? t / best : 1 - best / (logs[0].value * 1.5 || 1)));
    return Math.max(0, Math.min(1, t > 0 ? best / t : 0));
  }
  const goalPct = (c) => c.done ? 100 : Math.round(((c.n - 1) + stepFrac(c) * 0.9) / c.total * 100);
  function goalCard(id) {
    const c = cur(id); if (!c) return '';
    const pct = goalPct(c);
    return `<button class="goal-row" data-act="goal-open" data-id="${e(id)}"><span class="goal-main"><b>${e(c.goal.name_de)}</b><em>${c.done ? 'Geschafft' : `Stufe ${c.n}/${c.total} · ${e(c.step.name_de)}`}</em>
      <span class="pbar"><i style="width:${pct}%"></i></span></span><span class="goal-pct">${pct}<small>%</small></span></button>`;
  }
  A['goal-open'] = (el) => {
    const c = cur(el.dataset.id); if (!c) { toast('Ziel nicht gefunden.'); return; }
    const g = c.goal, st = c.step, unit = UNIT[st.metric] || '';
    const hist = c.logs.slice(-6).reverse();
    const ladder = g.steps.map((x, i) => { const n = i + 1, state = c.done || n < c.n ? 'done' : n === c.n ? 'now' : 'next';
      return `<li class="rung is-${state}"><span class="rung-dot">${state === 'done' ? '✓' : n}</span><span class="rung-main"><b>${e(x.name_de)}</b><em>${e(x.criterion_de || '')}</em></span>${state !== 'now' ? `<button class="chip chip-btn" data-act="goal-set" data-id="${e(g.id)}" data-n="${n}">${state === 'done' ? 'zurück' : 'hier bin ich'}</button>` : ''}</li>`; }).join('');
    sheet(g.name_de, `<p class="lead">${e(g.why_de || '')}</p>
      <article class="card goal-now"><span class="eyebrow">Stufe ${c.n} von ${c.total}${c.done ? ' · Ziel erreicht' : ''}</span><h3>${e(st.name_de)}</h3>
        ${clipHTML(st)}
        <p><b>Dosis:</b> ${e(st.dose_de || '')}</p><p><b>Weiter, wenn:</b> ${e(st.criterion_de || '')}</p>
        ${(st.cues_de || []).length ? `<ul class="cues">${st.cues_de.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}
        ${(st.mistakes_de || []).length ? `<ul class="points not">${st.mistakes_de.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}
        <div class="form goal-log"><div class="grid2">${field(`Heute${unit ? ' (' + unit + ')' : ''}`, `<input type="number" name="value" step="0.5" inputmode="decimal" placeholder="${tgt(st) != null ? 'Ziel ' + num(tgt(st), 1) : ''}">`)}
          <div class="field"><label>&nbsp;</label><button class="btn btn-primary" data-act="goal-log" data-id="${e(g.id)}">Eintragen</button></div></div>
          ${c.done ? '' : `<button class="btn btn-ghost btn-block" data-act="goal-up" data-id="${e(g.id)}">Kriterium erfüllt – nächste Stufe ✓</button>`}</div>
        ${hist.length ? `<p class="meta">Zuletzt: ${hist.map(l => `${num(l.value, 1)} ${e(UNIT[(g.steps[l.step - 1] || st).metric] || '')} (${e(D.fmt(l.date))})`).join(' · ')}</p>` : ''}
      </article>
      <h4 class="sec-h">Alle Stufen</h4><ol class="ladder">${ladder}</ol>
      ${g.measure_de ? `<details class="more"><summary>So misst du</summary><p>${e(g.measure_de)}</p></details>` : ''}
      ${g.integration_de ? `<details class="more"><summary>Wie es in deine Woche passt</summary><p>${e(g.integration_de)}</p></details>` : ''}
      ${(g.sources || []).length ? `<p class="src">Quellen: ${g.sources.map(u => `<a href="${e(u)}" target="_blank" rel="noopener">${e(String(u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(' · ')}</p>` : ''}`, { tall: true });
  };
  const gstate = (id) => S().goals[id] || (S().goals[id] = { step: 1, logs: [] });
  const reopen = (el, id) => { closeSheet(el.closest('.sheet-wrap')); UI.render(); if (S().draft && !$('#session').hidden) UI.renderSession(); setTimeout(() => A['goal-open']({ dataset: { id } }), 210); };
  A['goal-log'] = (el) => {
    const id = el.dataset.id, f = readForm(el.closest('.goal-log')), c = cur(id); if (f.value == null) { toast('Wert eintragen.'); return; }
    gstate(id).logs.push({ date: D.today(), step: c.n, value: f.value }); Store.save();
    const t = tgt(c.step), hit = t != null && (LOWER[c.step.metric] ? f.value <= t : f.value >= t);
    toast(hit ? 'Zielwert erreicht. Wenn das Kriterium komplett steht: nächste Stufe.' : 'Eingetragen.'); reopen(el, id);
  };
  A['goal-up'] = (el) => {
    const id = el.dataset.id, c = cur(id), g = gstate(id);
    if (c.n >= c.total) { g.done = true; toast(c.goal.name_de + ' geschafft. Stark.'); } else { g.step = c.n + 1; toast(`Stufe ${c.n} geschafft – weiter mit Stufe ${c.n + 1}.`); }
    g.ups = (g.ups || []).concat([{ date: D.today(), step: c.n }]); Store.save(); reopen(el, id);
  };
  A['goal-set'] = (el) => { const g = gstate(el.dataset.id); g.step = +el.dataset.n; g.done = false; Store.save(); reopen(el, el.dataset.id); };

  // =============================== STANDORT ===============================
  const B = LIB.bench || {};
  function trend(key) { // Trendlinie durch die veröffentlichten Gruppenmittel: Wert = a + b·V
    const pts = ((B[key] || {}).pts || []).filter(p => p[1] != null); if (pts.length < 3) return null;
    const n = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0), sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
    return { a, b, vOf: (val) => (val - a) / b, valOf: (v) => a + b * v, maxV: Math.max.apply(null, pts.map(p => p[0])) };
  }
  const CORE = [['Tuck Front Lever 10 s', 4], ['Advanced Tuck 10 s', 6], ['One-Leg 8 s', 8], ['Straddle 5 s', 9.5], ['Full Front Lever 3 s', 11], ['Full Front Lever 10 s', 12.5]];
  const PANCAKE = ['Sitzen in der Grätsche fällt schwer', 'Hände weit vor mir am Boden', 'Ellbogen am Boden', 'Kopf am Boden', 'Brust am Boden'];
  const SPLIT = ['Grätsche etwa 90°', 'etwa 120°', 'etwa 150°', 'fast flach (Faust unter der Hüfte)', 'flach'];
  const FOLD = ['Hände erreichen die Schienbeine', 'Fingerspitzen am Boden', 'Fäuste am Boden', 'Handflächen am Boden', 'Handflächen hinter den Fersen'];
  const AXES = [
    { k: 'finger', label: 'Finger', name: 'Fingerkraft', tipp: 'Max Hangs sind dein wichtigster Hebel – Phase 2 (Maxkraft) setzt genau hier an. Geduldig steigern, Finger am Morgen beobachten.' },
    { k: 'pull', label: 'Zug', name: 'Zugkraft', tipp: 'Weighted Pull-ups plus die One-Arm-Stufen, 1–2× pro Woche.' },
    { k: 'core', label: 'Core', name: 'Körperspannung', est: 1, tipp: 'Front-Lever-Stufen 2× pro Woche, dazu bewusst Fußspannung im Steilen.' },
    { k: 'board', label: 'Board', name: 'Board-Limit', tipp: 'Limit-Bouldern am Board (ab Phase 2): Kraft in harte Einzelzüge umsetzen.' },
    { k: 'cap', label: 'Kapazität', name: 'Kapazität', est: 1, tipp: 'Submax Circuits und Long Circuits – genau dafür ist der Malta-Block da.' },
    { k: 'mob', label: 'Mobility', name: 'Beweglichkeit', est: 1, tipp: 'Pancake- und Spagat-Stufen an den Ruhetagen, 3× pro Woche. Kurz und regelmäßig schlägt lang und selten.' },
    { k: 'tech', label: 'Technik', name: 'Technik', est: 1, tipp: 'Den Wochen-Fokus an leichten Bouldern üben und danach ehrlich einschätzen.' }
  ];
  function techShare() {
    const lv = S().skillLevels, ids = LIB.skills.map(s => s.id), rated = ids.filter(id => lv[id]);
    return { rated: rated.length, total: ids.length, avg: rated.length ? rated.reduce((a, id) => a + lv[id], 0) / rated.length : 0 };
  }
  function compute(inp) {
    const v = {}, raw = {}, bw = inp.bw;
    const tf = trend('finger'), tp = trend('pull');
    if (bw && inp.hangKg != null && tf) { raw.finger = (bw + inp.hangKg) / bw * 100; v.finger = tf.vOf(raw.finger); }
    if (bw && inp.pullKg != null && tp) { const reps = Math.max(1, inp.pullReps || 1); raw.pull = (bw + inp.pullKg) * (1 + (reps - 1) / 30) / bw * 100; v.pull = tp.vOf(raw.pull); }
    if (inp.core != null) v.core = CORE[inp.core][1];
    if (inp.board != null) v.board = inp.board;
    if (inp.cap != null) v.cap = Math.min(14, inp.cap + 3);
    const mob = [[inp.pancake, PANCAKE], [inp.split, SPLIT], [inp.fold, FOLD]].filter(x => x[0] != null).map(x => x[0] / (x[1].length - 1));
    if (mob.length) v.mob = 2 + 10 * mob.reduce((a, b) => a + b, 0) / mob.length;
    const ts = techShare(); if (ts.rated >= 8) v.tech = 2 + 10 * (ts.avg - 1) / 3;   // Ø deiner eingeschätzten Skills: neu = V2 … automatisch = V12
    Object.keys(v).forEach(k => { v[k] = Math.max(0, Math.min(14, Math.round(v[k] * 10) / 10)); });
    return { v, raw };
  }
  const lastTest = () => S().tests[S().tests.length - 1] || null;
  function profile() { // aktuelles Profil: letzter Test, Technik immer live
    const t = lastTest(); if (!t) return null;
    const c = compute(t.inp), prev = S().tests.length > 1 ? S().tests[S().tests.length - 2] : null;
    return { t, v: c.v, raw: c.raw, prev: prev ? prev.v : null };
  }
  function radarCard() {
    const p = profile();
    if (!p) return `<article class="card"><header class="card-head"><h3>Dein Profil</h3></header>
      <p>Eine Standortbestimmung zeigt, wo du in Fingerkraft, Zugkraft, Körperspannung, Board-Level, Kapazität, Beweglichkeit und Technik stehst – als V-Level in einem Netzdiagramm. Daran siehst du deinen Engpass und später deinen Fortschritt.</p>
      <button class="btn btn-primary btn-block" data-act="test-open">Standort bestimmen (ca. 5 min Eingabe)</button></article>`;
    const have = AXES.filter(a => p.v[a.k] != null), ref = p.t.inp.max;
    const weak = have.slice().sort((a, b) => p.v[a.k] - p.v[b.k]).slice(0, 2).filter(a => ref == null || p.v[a.k] < ref + 0.5);
    const days = D.diff(D.today(), p.t.date);
    return `<article class="card"><header class="card-head"><h3>Dein Profil</h3><span class="meta">${e(D.fmt(p.t.date, { day: 'numeric', month: 'short', year: '2-digit' }))}</span></header>
      <div id="ch-radar"></div>
      <table class="tbl tbl-prof"><tbody>${AXES.map(a => { const v = p.v[a.k], pv = p.prev && p.prev[a.k]; const d = v != null && pv != null ? v - pv : null;
        return `<tr><td>${e(a.name)}</td><td>${v != null ? (a.est ? '≈ ' : '') + vLabel(v) : '–'}</td><td class="${d > 0.05 ? 'up' : ''}">${d == null || Math.abs(d) < 0.05 ? '' : (d > 0 ? '▲ +' : '▼ −') + num(Math.abs(d), 1)}</td><td>${p.raw[a.k] ? num(p.raw[a.k]) + ' % KG' : ''}</td></tr>`; }).join('')}</tbody></table>
      ${weak.length ? `<div class="banner tone-yellow"><b>Dein Engpass: ${weak.map(a => e(a.name)).join(' und ')}.</b> ${e(weak[0].tipp)}</div>` : ''}
      <details class="more"><summary>Wie die Level entstehen</summary><p>Finger- und Zugkraft: Trendlinie durch veröffentlichte Mittelwerte je Bouldergrad (Power Company Climbing, Männer, kleine Gruppen je Grad). Die Streuung ist groß – derselbe Wert kommt bei V5 und bei V10 vor. Über V10 ist die Linie verlängert, nicht gemessen.</p><p>Board: dein eigener Grad. Körperspannung, Kapazität, Beweglichkeit und Technik (≈): Stufen dieser App. Dafür gibt es keine veröffentlichten Richtwerte pro Grad – sie zeigen deine Entwicklung, nicht deinen Rang.</p></details>
      <button class="btn btn-ghost btn-block" data-act="test-open">${days >= 42 ? 'Standort neu bestimmen (zuletzt vor ' + Math.round(days / 7) + ' Wochen)' : 'Werte aktualisieren'}</button></article>`;
  }
  function paintRadar(m) {
    const host = $('#ch-radar', m), p = profile(); if (!host || !p) return;
    const tf = trend('finger'), tp = trend('pull');
    Charts.radar(host, { label: 'Dein Profil in V-Leveln', min: 2, max: 13, rings: [4, 6, 8, 10, 12], fmt: vLabel, goal: { v: 11 }, ref: p.t.inp.max != null ? { v: p.t.inp.max } : null,
      axes: AXES.map(a => { const v = p.v[a.k]; return { label: a.label, v: v == null ? null : v, prev: p.prev ? p.prev[a.k] : null, est: !!a.est,
        tip: `<b>${v == null ? 'nicht eingetragen' : (a.est ? '≈ ' : '') + vLabel(v)}</b> · ${e(a.name)}${p.raw[a.k] ? ' · ' + num(p.raw[a.k]) + ' % KG' : ''}${a.k === 'finger' && tf ? ' · Ø V11 ≈ ' + num(tf.valOf(11)) + ' %' : ''}${a.k === 'pull' && tp ? ' · Ø V11 ≈ ' + num(tp.valOf(11)) + ' %' : ''}` }; }),
      legend: `<span><i class="lg-area"></i>heute</span>${p.prev ? '<span><i class="lg-prev"></i>vorher</span>' : ''}<span><i class="lg-goal"></i>Ziel 8A (V11)</span>${p.t.inp.max != null ? `<span><i class="lg-ref"></i>dein Grad ${vLabel(p.t.inp.max)}</span>` : ''}` });
  }
  A['test-open'] = () => {
    const last = lastTest(), i = last ? last.inp : {}, bw = i.bw || S().profile.bodyweight || '';
    let bestHang = null; S().sessions.forEach(s => (s.hangs || []).forEach(h => { if (h.grip === 'Half Crimp' && (bestHang == null || h.kg > bestHang)) bestHang = h.kg; }));
    const ts = techShare(), n = (v) => v == null ? '' : v;
    sheet('Standortbestimmung', `<div class="form" id="test"><p class="hint">Trag ein, was du sicher weißt – Lücken bleiben leer. Max Hang und Klimmzug nur frisch und gut aufgewärmt testen, nie mit gereizten Fingern. Alle 6–8 Wochen wiederholen, am besten in einer Deload- oder Testwoche.</p>
      <div class="grid2">${field('Körpergewicht kg', `<input type="number" name="bw" step="0.5" value="${n(bw)}" inputmode="decimal">`)}${field('Härtester Boulder (letzte 3 Monate)', gradeSelect('max', i.max, 2, 14))}</div>
      <span class="eyebrow">Fingerkraft</span>
      ${field('Max Hang · 20 mm · beidarmig · 10 s: Zusatzlast kg', `<input type="number" name="hangKg" step="0.25" value="${n(i.hangKg != null ? i.hangKg : bestHang)}" inputmode="decimal">`, 'Half Crimp, sauber gehalten. Negativ = entlastet.' + (i.hangKg == null && bestHang != null ? ' Vorausgefüllt mit deinem besten geloggten Hang.' : ''))}
      <span class="eyebrow">Zugkraft</span>
      <div class="grid2">${field('Klimmzug: Zusatzlast kg', `<input type="number" name="pullKg" step="0.5" value="${n(i.pullKg)}" inputmode="decimal">`)}${field('Wiederholungen damit', `<input type="number" name="pullReps" min="1" max="6" value="${n(i.pullReps || 1)}" inputmode="numeric">`)}</div>
      <span class="eyebrow">Körperspannung</span>
      ${field('Front Lever: was hältst du sauber?', stageSelect('core', i.core, CORE.map(c => c[0])))}
      <span class="eyebrow">An der Wand</span>
      <div class="grid2">${field('Härtester Board-Boulder (4 Wochen)', gradeSelect('board', i.board, 1, 14))}${field('Grad, den du 4× in Folge schaffst', gradeSelect('cap', i.cap, 0, 11))}</div>
      <p class="hint">4× in Folge: derselbe Boulder, je 1 min Pause dazwischen.</p>
      <span class="eyebrow">Beweglichkeit</span>
      ${field('Pancake (Grätsche, Vorbeuge)', stageSelect('pancake', i.pancake, PANCAKE))}${field('Mittelspagat', stageSelect('split', i.split, SPLIT))}${field('Vorbeuge im Stehen, Knie gestreckt', stageSelect('fold', i.fold, FOLD))}
      <span class="eyebrow">Technik</span><p class="hint">Kommt automatisch aus deinen Einschätzungen im Wissen-Tab: ${ts.rated} von ${ts.total} Skills bewertet${ts.rated < 8 ? ' – ab 8 erscheint die Achse' : ''}.</p>
      <button class="btn btn-primary btn-block" data-act="test-save">Speichern</button></div>`, { tall: true });
  };
  A['test-save'] = (el) => {
    const w = el.closest('.sheet-wrap'), f = readForm(w);
    const inp = { bw: f.bw || null, max: f.max, hangKg: f.hangKg, pullKg: f.pullKg, pullReps: f.pullReps, core: f.core, board: f.board, cap: f.cap, pancake: f.pancake, split: f.split, fold: f.fold };
    const c = compute(inp);
    if (!Object.keys(c.v).length) { toast('Mindestens einen Wert eintragen.'); return; }
    const last = lastTest(), rec = { date: D.today(), inp, v: c.v };
    if (last && last.date === rec.date) S().tests[S().tests.length - 1] = rec; else S().tests.push(rec);
    if (inp.bw) S().profile.bodyweight = inp.bw;
    Store.save(); closeSheet(w); ui.tab = 'over'; UI.nav('stats'); toast('Standort gespeichert.');
  };

  // =============================== MEILENSTEINE ===============================
  function facts() {
    const ss = S().sessions.filter(s => s.kind !== 'mobility');
    const rated = ss.filter(s => s.color).sort((a, b) => a.date < b.date ? 1 : -1);
    let streak = 0; rated.some(s => { if (s.color === 'green') { streak++; return false; } return true; });
    let best = 0, run = 0; rated.slice().reverse().forEach(s => { run = s.color === 'green' ? run + 1 : 0; best = Math.max(best, run); });
    const greens = rated.filter(s => s.color === 'green').length;
    // Wochen im Sweet Spot und Plan-Treue (abgeschlossene Wochen seit Start)
    const ts = S().profile.trackingStart; let sweet = 0, planned = 0, done = 0, weeks = 0;
    if (ts) for (let mon = D.monday(ts); D.add(mon, 6) < D.today(); mon = D.add(mon, 7)) {
      weeks++; const a = Store.acwr(D.add(mon, 6)); if (a.ratio != null && a.ratio >= 0.8 && a.ratio <= 1.3) sweet++;
      const w = Plan.weekAt(mon); if (w) w.week.sessions.filter(s => !s.optional).forEach(s => { planned++; if (Store.sessionForPlan(s.planId)) done++; });
    }
    const cw = Plan.weekAt(D.today()); let weekDone = 0, weekPlan = 0;
    if (cw) cw.week.sessions.filter(s => !s.optional).forEach(s => { weekPlan++; if (Store.sessionForPlan(s.planId)) weekDone++; });
    return { sessions: ss.length, mob: S().sessions.length - ss.length, greens, streak, best, climbs: Store.totalClimbs(), sweet, weeks, planned, done, weekDone, weekPlan };
  }
  function milestones(f) {
    const m = [], add = (label, have, need, unit) => m.push({ label, have: Math.min(have, need), need, ok: have >= need, unit: unit || '' });
    add('Erste Session geloggt', f.sessions, 1);
    [5, 10, 25, 50, 100].forEach(n => add(n + ' Green Days', f.greens, n));
    [3, 5, 10].forEach(n => add(n + ' Green Days in Folge', f.best, n));
    [100, 500, 1000, 2500].forEach(n => add(n + ' Climbs', f.climbs, n));
    [4, 8, 16].forEach(n => add(n + ' Wochen im ACWR-Sweet-Spot', f.sweet, n));
    add('Standort bestimmt', S().tests.length, 1); add('Standort zum zweiten Mal bestimmt', S().tests.length, 2);
    GOALS.forEach(g => { const c = cur(g.id); if (c) add(g.name_de, c.done ? c.total : c.n - 1, c.total, 'Stufen'); });
    const ts = techShare(); add('10 Skills eingeschätzt', ts.rated, 10); add('10 Skills sitzen sicher', LIB.skills.filter(s => (S().skillLevels[s.id] || 0) >= 3).length, 10);
    [10, 30].forEach(n => add(n + ' Mobility-Einheiten', f.mob, n));
    return m;
  }

  // =============================== ÜBERSICHT ===============================
  function overview() {
    const today = D.today(), list = Plan.layout(), total = list.reduce((a, p) => a + p.weeks, 0), w = Plan.weekAt(today), f = facts();
    const wk = today < list[0].start ? 0 : Math.min(total, Math.floor(D.diff(today, list[0].start) / 7) + 1);
    const ms = milestones(f), got = ms.filter(x => x.ok), open = ms.filter(x => !x.ok).sort((a, b) => b.have / b.need - a.have / a.need).slice(0, 4);
    const ts = techShare();
    const themes = Object.keys(THEMES).map(t => { const l = LIB.skills.filter(s => s.theme === t); return { t, n: l.length, rated: l.filter(s => S().skillLevels[s.id]).length, avg: l.length ? l.reduce((a, s) => a + (S().skillLevels[s.id] || 0), 0) / l.length : 0 }; }).filter(x => x.n);
    const tile = (big, label, sub) => `<div class="tile"><b>${big}</b><span>${e(label)}</span>${sub ? `<em>${e(sub)}</em>` : ''}</div>`;
    return `<article class="card hero-goal"><span class="eyebrow">Auf dem Weg zu 8A · November 2027</span>
        <h3>${wk ? `Woche ${wk} von ${total}` : 'Der Plan startet am ' + e(D.long(list[0].start))}${w ? ` · ${e(w.phase.short)}` : ''}</h3>
        <div class="macro">${list.map(p => `<span class="macro-seg ph-${p.type}${w && w.phase.id === p.id ? ' is-cur' : ''}" style="flex:${p.weeks}"></span>`).join('')}</div>
        <span class="pbar pbar-lg"><i style="width:${Math.round(wk / total * 100)}%"></i></span></article>
      <div class="tiles">
        ${tile(f.streak, 'Green Days in Folge', f.best > f.streak ? 'Rekord ' + f.best : f.greens + ' insgesamt')}
        ${tile(f.weekPlan ? f.weekDone + '<small>/' + f.weekPlan + '</small>' : '–', 'Einheiten diese Woche', f.planned ? Math.round(f.done / f.planned * 100) + ' % Plan-Treue bisher' : 'geplante Kern-Einheiten')}
        ${tile(f.climbs, 'Climbs gesamt', f.sessions + ' Sessions')}
        ${tile(f.weeks ? f.sweet + '<small>/' + f.weeks + '</small>' : '–', 'Wochen im Sweet Spot', 'ACWR 0,8–1,3')}
      </div>
      ${radarCard()}
      ${GOALS.length ? `<article class="card"><header class="card-head"><h3>Deine Ziele</h3><span class="meta">Stufe für Stufe</span></header>${GOALS.map(g => goalCard(g.id)).join('')}
        <p class="hint">Die aktuelle Stufe steht automatisch in deinen Sessions und Mobility-Tagen.</p></article>` : ''}
      <article class="card"><header class="card-head"><h3>Technik</h3><span class="meta">${ts.rated} von ${ts.total} eingeschätzt</span></header>
        ${themes.map(x => `<div class="th-row"><span>${e(THEMES[x.t])}</span><span class="pbar"><i style="width:${Math.round(x.avg / 4 * 100)}%"></i></span><em>${x.rated}/${x.n}</em></div>`).join('')}
        <p class="hint">Balken: wie sicher die Skills eines Themas sitzen (neu → bewusst → sicher → automatisch). Zahl: eingeschätzte Skills. Schätze einen Skill ein, nachdem du ihn geübt hast.</p></article>
      <article class="card"><header class="card-head"><h3>Meilensteine</h3><span class="meta">${got.length} erreicht</span></header>
        ${open.length ? `<span class="eyebrow">Als Nächstes</span>${open.map(x => `<div class="ms"><span>${e(x.label)}</span><span class="pbar"><i style="width:${Math.round(x.have / x.need * 100)}%"></i></span><em>${x.have}/${x.need}</em></div>`).join('')}` : ''}
        ${got.length ? `<div class="badges">${got.map(x => `<span class="badge">✓ ${e(x.label)}</span>`).join('')}</div>` : '<p class="empty">Dein erster Meilenstein kommt mit der ersten geloggten Session.</p>'}</article>`;
  }

  // Statistik-Tab → „Fortschritt“ mit zwei Unteransichten
  const oldStats = UI.views.stats, oldAfter = UI.afterRender.stats;
  const seg = () => `<div class="seg" role="tablist">${[['over', 'Überblick'], ['load', 'Belastung']].map(o => `<button role="tab" aria-selected="${ui.tab === o[0]}" data-act="prog-tab" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
  A['prog-tab'] = (el) => { ui.tab = el.dataset.v; UI.render(); };
  UI.views.stats = () => {
    if (ui.tab === 'load') return oldStats().replace(/<div class="date-head">[\s\S]*?<\/div>/, `<div class="date-head"><h1>Fortschritt</h1><button class="btn btn-ghost btn-sm" data-act="log-list">Alle Einheiten</button></div>${seg()}`);
    return `<div class="date-head"><h1>Fortschritt</h1><button class="btn btn-ghost btn-sm" data-act="log-list">Alle Einheiten</button></div>${seg()}${overview()}`;
  };
  UI.afterRender.stats = (m) => { if (ui.tab === 'load') oldAfter(m); else paintRadar(m); };

  // Karte auf „Heute“: Standort fällig?
  function todayCards(h, today, w) {
    if (!S().profile.onboarded) return h;
    const t = lastTest(), due = !t || D.diff(today, t.date) >= 56, test = w && w.week.test;
    if (!due && !(test && D.diff(today, t.date) >= 21)) return h;
    return h + `<article class="card"><span class="eyebrow">${t ? 'Zeit für einen Vergleich' : 'Bestandsaufnahme'}</span><h3>${t ? 'Standort neu bestimmen' : 'Wo stehst du gerade?'}</h3>
      <p class="hint">${t ? 'Die letzte Standortbestimmung ist ' + Math.round(D.diff(today, t.date) / 7) + ' Wochen her.' : 'Fünf Minuten Eingabe – dann siehst du dein Profil als Netzdiagramm und deinen Engpass.'}</p>
      <button class="btn btn-ghost btn-block" data-act="test-open">Standort bestimmen</button></article>`;
  }

  window.Goals = { cur, list: GOALS, pct: (id) => { const c = cur(id); return c ? goalPct(c) : 0; }, card: goalCard };
  window.Progress = { todayCards, facts, profile };
})();
