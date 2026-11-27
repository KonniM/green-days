/* Green Days — Ansichten: Plan (Zyklen + Kalender), Timer, Statistik, Wissen, Einstellungen. */
(function () {
  'use strict';
  const { e, $, $$, S, LIB, GD, LEVELS, THEMES, find, kindChip, gdBadge, field, readForm, toast, sheet, closeSheet, sessionCard, clipHTML, firstSentence, skillRate, logLine } = UI;
  const A = UI.actions;
  const ui = { planTab: 'cycles', month: null, lib: 'ex', libGroup: 'all', libLevel: 'all', openPhase: null };
  const fmtRange = (a, b) => D.fmt(a, { day: 'numeric', month: 'short' }) + ' – ' + D.fmt(b, { day: 'numeric', month: 'short', year: '2-digit' });
  const seg = (name, cur, opts) => `<div class="seg" role="tablist">${opts.map(o => `<button role="tab" aria-selected="${cur === o[0]}" data-act="seg" data-name="${name}" data-v="${o[0]}">${e(o[1])}</button>`).join('')}</div>`;
  A.seg = (el) => { ui[el.dataset.name] = el.dataset.v; if (el.dataset.name === 'lib') { ui.libGroup = 'all'; } UI.render(); };

  // =============================== PLAN ===============================
  function weekRow(ph, i) {
    const mon = D.add(ph.start, i * 7), w = Plan.weekAt(mon), today = D.today();
    const core = w.week.sessions.filter(s => !s.optional);
    const done = core.filter(s => Store.sessionForPlan(s.planId)).length;
    const cur = D.monday(today) === mon;
    return `<button class="week-row${cur ? ' is-cur' : ''}${w.week.deload ? ' is-deload' : ''}" data-act="week-open" data-mon="${mon}">
      <span class="wk">W${i + 1}</span><span class="wk-main"><b>${e(w.week.label)}</b><em>${e(fmtRange(mon, D.add(mon, 6)))}</em></span>
      <span class="wk-dots">${core.map(s => `<i class="${Store.sessionForPlan(s.planId) ? 'on' : S().skips[s.planId] ? 'skip' : ''}"></i>`).join('')}</span>
      <span class="wk-load">${Plan.plannedWeekLoad(mon)}</span></button>`;
  }
  function viewPlan() {
    const list = Plan.layout(), today = D.today(), total = list.reduce((a, p) => a + p.weeks, 0);
    const cur = Plan.weekAt(today);
    const daysLeft = D.diff(Plan.end(), today);
    let h = `<div class="date-head"><h1>Plan</h1><span>${daysLeft > 0 ? `noch ${Math.ceil(daysLeft / 7)} Wochen bis zum Ziel` : ''}</span></div>
      <div class="goal-card card"><span class="eyebrow">Ziel</span><h3>Outdoor 8A bis Oktober 2027</h3>
      ${window.Grades ? `<p class="meta">Grad-Leiter: Limit jetzt <b>${e(Grades.fmtLevel(Grades.level(today)))}</b> → letzte Woche <b>${e(Grades.fmt(Grades.GOAL))}</b>. Alle Grade im Plan hängen daran.</p>` : ''}
      <div class="macro" aria-label="Jahresplan">${list.map(p => `<button class="macro-seg ph-${p.type}${cur && cur.phase.id === p.id ? ' is-cur' : ''}" style="flex:${p.weeks}" data-act="phase-open" data-id="${p.id}" aria-label="${e(p.name)}"><span>${p.idx + 1}</span></button>`).join('')}</div>
      <div class="macro-axis"><span>${e(D.fmt(list[0].start, { month: 'short', year: 'numeric' }))}</span><span>${e(D.fmt(Plan.end(), { month: 'short', year: 'numeric' }))}</span></div>
      <p class="hint">Aufbauen → in Power umsetzen → am Fels anwenden → zurücknehmen und performen. Eine Hauptanpassung pro Phase.</p></div>
      ${seg('planTab', ui.planTab, [['cycles', 'Zyklen'], ['cal', 'Kalender']])}`;
    if (ui.planTab === 'cal') return h + calendar();
    const open = ui.openPhase || (cur ? cur.phase.id : list[0].id);
    h += list.map(p => {
      const isOpen = open === p.id;
      return `<article class="card phase ph-${p.type}${isOpen ? ' is-open' : ''}">
        <button class="phase-top" data-act="phase-toggle" data-id="${p.id}" aria-expanded="${isOpen}">
          <span class="ph-num">${p.idx + 1}</span><span class="ph-title"><b>${e(p.name)}</b><em>${e(fmtRange(p.start, p.end))} · ${p.weeks} Wochen</em></span><span class="chev">${isOpen ? '−' : '+'}</span></button>
        ${isOpen ? `<div class="phase-body"><p class="meta">${e(p.where)}</p><p>${e(p.goal)}</p>
          ${window.Grades ? `<p class="meta">Grade am Ende dieser Phase: Limit <b>${e(Grades.fmtLevel(Grades.level(p.end)))}</b> · Flash <b>${e(Grades.fmtLevel(Grades.level(p.end) - 2))}</b></p>` : ''}
          <ul class="points">${p.points.map(x => `<li>${e(x)}</li>`).join('')}</ul>
          <details><summary>Bewusst nicht Teil dieser Phase</summary><ul class="points not">${p.not.map(x => `<li>${e(x)}</li>`).join('')}</ul></details>
          ${p.flex ? `<div class="flex-weeks"><span>Dauer anpassen</span><button class="chip chip-btn" data-act="phase-weeks" data-id="${p.id}" data-d="-1" aria-label="Eine Woche kürzer">−</button><b>${p.weeks} Wo.</b><button class="chip chip-btn" data-act="phase-weeks" data-id="${p.id}" data-d="1" aria-label="Eine Woche länger">+</button></div>` : ''}
          <div class="weeks"><div class="weeks-h"><span></span><span>Woche</span><span>Einheiten</span><span>Plan-Load</span></div>${Array.from({ length: p.weeks }, (_, i) => weekRow(p, i)).join('')}</div></div>` : ''}
      </article>`;
    }).join('');
    return h;
  }
  A['phase-toggle'] = (el) => { const cur = Plan.weekAt(D.today()); const open = ui.openPhase || (cur ? cur.phase.id : Plan.layout()[0].id); ui.openPhase = open === el.dataset.id ? 'none' : el.dataset.id; UI.render(); };
  A['phase-open'] = (el) => { ui.openPhase = el.dataset.id; ui.planTab = 'cycles'; UI.nav('plan'); const t = $(`.phase.is-open`); if (t) t.scrollIntoView({ block: 'start' }); };
  A['phase-weeks'] = (el) => {
    const p = S().profile, ph = Plan.layout().find(x => x.id === el.dataset.id);
    p.phaseWeeks = p.phaseWeeks || {}; p.phaseWeeks[ph.id] = Math.max(ph.id === 'spring' ? 1 : 2, Math.min(16, ph.weeks + (+el.dataset.d)));
    Plan.reset(); Store.save(); UI.render();
  };
  // Geplanter ACWR einer Woche: Plan-Last / Schnitt der 4 Wochen davor (vergangene Wochen mit echter Last)
  function planAcwr(mon) {
    const cur = D.monday(D.today()); let c = 0;
    for (let k = 1; k <= 4; k++) { const m = D.add(mon, -7 * k); c += m < cur ? Store.weekLoad(m) : (Plan.plannedWeekLoad(m) || Store.baselineDaily() * 7); }
    return c > 0 ? Plan.plannedWeekLoad(mon) / (c / 4) : null;
  }
  A['week-open'] = (el) => {
    const w = Plan.weekAt(el.dataset.mon), mon = w.monday, pa = planAcwr(mon);
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => D.add(mon, i));
    const sk = UI.skillOfWeek(w);
    sheet(`${w.phase.short} · Woche ${w.n}`, `<p class="meta">${e(fmtRange(mon, D.add(mon, 6)))} · ${e(w.week.label)}</p>
      <p class="meta">Plan-Load ${Plan.plannedWeekLoad(mon)}${pa ? ` · geplanter ACWR ${pa.toFixed(2).replace('.', ',')}` : ''}</p>
      ${sk ? `<button class="link-row" data-act="lib-open" data-id="${e(sk.id)}"><span>Technik-Fokus: <b>${e(sk.name_de)}</b></span><span>›</span></button>` : ''}
      ${days.map(d => { const ps = Plan.plannedOn(d); return `<h3 class="list-h">${e(D.fmt(d, { weekday: 'long', day: 'numeric', month: 'short' }))}</h3>${ps.length ? ps.map(s => sessionCard(s, d)).join('') : '<p class="hint">Ruhetag</p>'}`; }).join('')}`, { tall: true });
  };

  function calendar() {
    const today = D.today();
    if (!ui.month) ui.month = today.slice(0, 7);
    const [y, m] = ui.month.split('-').map(Number);
    const first = `${ui.month}-01`, start = D.monday(first);
    const title = D.parse(first).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    let h = `<div class="cal-head"><button class="icon-btn" data-act="cal-nav" data-d="-1" aria-label="Voriger Monat">‹</button><h3>${e(title)}</h3><button class="icon-btn" data-act="cal-nav" data-d="1" aria-label="Nächster Monat">›</button></div>
      <div class="cal"><div class="cal-dow">${D.DAYS.map(d => `<span>${d}</span>`).join('')}</div><div class="cal-grid">`;
    for (let i = 0; i < 42; i++) {
      const d = D.add(start, i), inM = d.slice(0, 7) === ui.month;
      if (i >= 35 && d.slice(0, 7) !== ui.month && D.dow(d) === 0) break;
      const logs = Store.sessionsOn(d);
      const plans = Plan.plannedOn(d).filter(s => !S().skips[s.planId] && !Store.sessionForPlan(s.planId));
      const w = Plan.weekAt(d);
      const marks = logs.map(s => `<i class="mk done gd-${s.color || 'none'}"></i>`).join('') +
        plans.map(s => `<i class="mk plan fam-${Plan.KINDS[s.kind].fam}${s.optional ? ' opt' : ''}"></i>`).join('');
      h += `<button class="cal-day${inM ? '' : ' out'}${d === today ? ' today' : ''}${w && w.week.deload ? ' deload' : ''}${S().mornings[d] && S().mornings[d].pain >= 3 ? ' pain' : ''}" data-act="day-open" data-d="${d}" aria-label="${e(D.long(d))}">
        <span>${D.parse(d).getDate()}</span><span class="marks">${marks}</span></button>`;
    }
    h += `</div></div><div class="legend">
      <span><i class="mk plan fam-str"></i>Kraft / Power</span><span><i class="mk plan fam-cap"></i>Capacity</span><span><i class="mk plan fam-skill"></i>Skill / Mobility</span><span><i class="mk plan fam-perf"></i>Performance</span>
      ${GD.map(g => `<span><i class="mk done gd-${g.k}"></i>${g.label}</span>`).join('')}<span><i class="mk done gd-none"></i>geloggt, Farbe offen</span></div>`;
    return h;
  }
  A['cal-nav'] = (el) => { const [y, m] = ui.month.split('-').map(Number); const d = new Date(y, m - 1 + (+el.dataset.d), 1, 12); ui.month = D.iso(d).slice(0, 7); UI.render(); };
  A['day-open'] = (el) => {
    const d = el.dataset.d, w = Plan.weekAt(d), ps = Plan.plannedOn(d), mo = S().mornings[d];
    const free = Store.sessionsOn(d).filter(s => !s.planId);
    sheet(D.long(d), `${w ? `<p class="meta">${e(w.phase.name)} · Woche ${w.n} · ${e(w.week.label)}</p>` : ''}
      ${mo ? `<p class="meta">Finger am Morgen: ${mo.pain}/10${mo.stiff ? ' · steif' : ''}${mo.swell ? ' · geschwollen' : ''}</p>` : ''}
      ${ps.map(s => sessionCard(s, d)).join('') || (free.length ? '' : '<p class="hint">Ruhetag – nichts geplant.</p>')}
      ${free.map(s => `<article class="card session is-logged"><header class="card-head">${kindChip(s.kind)}</header><h3>${e(s.title)}</h3><div class="logline">${gdBadge(s.color)}<span>${logLine(s)}</span></div><div class="actions"><button class="btn btn-ghost" data-act="log-edit" data-id="${s.id}">Bearbeiten</button></div></article>`).join('')}
      ${d <= D.today() ? `<button class="btn btn-ghost btn-block" data-act="free-log" data-d="${d}">＋ Extra-Session an diesem Tag</button>` : ''}`, { tall: true });
  };

  // =============================== TIMER ===============================
  function presets() {
    const w = Plan.weekAt(D.today());
    const fromPlan = [];
    if (w) w.week.sessions.forEach(s => s.blocks.forEach(b => { if (b.timer && !fromPlan.some(x => x.t.label === b.timer.label && x.t.reps === b.timer.reps)) fromPlan.push({ t: b.timer, sub: `${D.DAYS[s.dow]} · ${s.title}` }); }));
    const std = [
      { t: { label: 'Max Hangs', prep: 10, work: 7, rest: 240, reps: 2, repName: 'Hang', workName: 'Hängen', repLabel: 'Hangs' }, sub: '2 × 7 s · 4 min Pause' },
      { t: { label: 'Aufwärm-Hangs', prep: 5, work: 7, rest: 60, reps: 4, repName: 'Hang', workName: 'Hängen', repLabel: 'Hangs' }, sub: '4 × 7 s · 1 min Pause, Last steigern' },
      { t: { label: 'Repeaters 7:3', prep: 10, work: 7, rest: 3, reps: 6, sets: 4, setRest: 180, showSets: true, repName: 'Hang', workName: 'Hängen' }, sub: '6 × 7/3 s · 4 Sätze – nicht im Malta-Block' },
      { t: { label: 'Mobility-Hold', prep: 5, work: 60, rest: 10, reps: 2, sets: 2, setRest: 15, showSets: true, repName: 'Seite', workName: 'Halten' }, sub: '2 × 60 s pro Seite' },
      { t: { label: 'Boulder Triples', prep: 10, work: 45, rest: 90, reps: 3, sets: 3, setRest: 420, showSets: true, repName: 'Go', workName: 'Klettern' }, sub: '3 Gos · 90 s · 7 min Satzpause' },
      { t: { label: 'Eigener Timer', prep: 10, work: 30, rest: 30, reps: 8, sets: 1, setRest: 120, showSets: true }, sub: 'Frei einstellbar' }
    ];
    return { fromPlan, std };
  }
  let presetCache = [];
  function viewTimer() {
    const p = presets(); presetCache = p.fromPlan.concat(p.std);
    const row = (x, i) => `<button class="preset" data-act="preset" data-i="${i}"><span class="preset-ic">⏱</span><span class="preset-main"><b>${e(x.t.label)}${x.t.reps > 1 ? ` · ${x.t.reps} × ${Timer.dur(x.t.work)}` : ''}</b><em>${e(x.sub)}</em></span><span class="preset-t">${Timer.mmss(Timer.total(x.t))}</span></button>`;
    return `<div class="date-head"><h1>Timer</h1><span>Ton an, Bildschirm bleibt wach</span></div>
      ${p.fromPlan.length ? `<h3 class="list-h">Aus dieser Woche</h3>${p.fromPlan.map((x, i) => row(x, i)).join('')}` : ''}
      <h3 class="list-h">Pause zwischen Versuchen</h3>
      <div class="rest-grid">${[60, 120, 180, 240, 300, 480].map(s => `<button class="rest-btn" data-act="rest-timer" data-sec="${s}"><b>${s / 60}</b><span>min</span></button>`).join('')}</div>
      <p class="hint">Faustregel für Limit-Boulder: mindestens 1 Minute Pause pro gekletterten Zug.</p>
      <h3 class="list-h">Standards</h3>${p.std.map((x, i) => row(x, i + p.fromPlan.length)).join('')}`;
  }
  A.preset = (el) => Timer.open(Object.assign({}, presetCache[+el.dataset.i].t));

  // =============================== STATS ===============================
  function weeks(n) { const mon = D.monday(D.today()); return Array.from({ length: n }, (_, i) => D.add(mon, (i - n + 1) * 7)); }
  const inWeek = (mon) => S().sessions.filter(s => s.date >= mon && s.date <= D.add(mon, 6));
  function viewStats() {
    const today = D.today(), ss = S().sessions.filter(s => s.kind !== 'mobility');
    const rated = ss.filter(s => s.color);
    const counts = GD.map(g => ({ g, n: rated.filter(s => s.color === g.k).length }));
    let streak = 0; ss.slice().sort((a, b) => a.date < b.date ? 1 : -1).filter(s => s.color).some(s => { if (s.color === 'green') { streak++; return false; } return true; });
    const strip = ss.slice().sort((a, b) => a.date < b.date ? -1 : 1).slice(-28);
    const wk = weeks(8), cur = wk[wk.length - 2], prev = wk[wk.length - 3];
    const lc = Store.weekLoad(cur), lp = Store.weekLoad(prev);
    const tracking = S().profile.trackingStart;
    const realPrev = tracking && prev >= D.monday(tracking);
    const kg = (v) => String(v).replace('.', ',');
    const hangPts = [];
    S().sessions.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => { const hc = (s.hangs || []).filter(h => h.grip === 'Half Crimp'); if (hc.length) hangPts.push({ x: D.fmt(s.date), y: Math.max.apply(null, hc.map(h => h.kg)), tip: D.fmt(s.date) + ' · RPE ' + hc[0].rpe }); });
    const bw = S().profile.bodyweight, lastHang = hangPts[hangPts.length - 1];
    return `<div class="date-head"><h1>Statistik</h1><button class="btn btn-ghost btn-sm" data-act="log-list">Alle Einheiten</button></div>
      ${UI.acwrCard(today, true)}
      <article class="card"><header class="card-head"><h3>ACWR-Verlauf</h3><span class="meta">8 Wochen</span></header><div id="ch-acwr"></div>
        <p class="hint">Grünes Band: Orientierungsbereich 0,8–1,3 (Paradigm). Der ACWR ist ein Belastungstrend, keine individuelle Verletzungsprognose – der Fingerstatus am Morgen zählt genauso.</p></article>
      <article class="card"><header class="card-head"><h3>Wochenlast</h3><span class="meta">${realPrev && lp > 0 ? `letzte Woche ${lc >= lp ? '+' : ''}${Math.round((lc - lp) / lp * 100)} %` : 'Minuten × RPE'}</span></header><div id="ch-load"></div>
        <p class="hint">Beim Wiederaufbau maximal 10–15 % pro Woche steigern.</p></article>
      <article class="card"><header class="card-head"><h3>Green Days</h3><span class="meta">${streak ? streak + ' in Folge' : rated.length + ' bewertet'}</span></header>
        ${strip.length ? `<div class="gd-strip">${strip.map(s => `<i class="gd-${s.color || 'none'}" title="${e(D.fmt(s.date) + ' · ' + s.title)}"></i>`).join('')}</div>` : '<p class="empty">Nach deiner zweiten Session bewertest du die erste – so entsteht die Reihe.</p>'}
        <div class="gd-counts">${counts.map(c => `<span class="gd gd-${c.g.k}"><i></i>${c.g.label} <b>${c.n}</b></span>`).join('')}</div>
        <p class="hint">Fortschritt entsteht durch viele Green Days hintereinander – nicht durch einzelne Heldensessions.</p></article>
      <article class="card"><header class="card-head"><h3>Finger am Morgen danach</h3><span class="meta">Schmerz 0–10</span></header><div id="ch-finger"></div></article>
      <article class="card"><header class="card-head"><h3>Harte Fingerbelastungen</h3><span class="meta">pro Woche</span></header><div id="ch-hi"></div>
        <p class="hint">Schwere Hang-Sätze und harte Boardversuche – mechanisch etwas anderes als ARC, deshalb getrennt gezählt.</p></article>
      <article class="card"><header class="card-head"><h3>Capacity-Kletterzeit</h3><span class="meta">Minuten pro Woche</span></header><div id="ch-cap"></div></article>
      <article class="card"><header class="card-head"><h3>Max Hang · Half Crimp</h3><span class="meta">${lastHang ? `+${kg(lastHang.y)} kg${bw ? ` · ${Math.round((bw + lastHang.y) / bw * 100)} % KG` : ''}` : 'Zusatzlast kg'}</span></header><div id="ch-hang"></div></article>
      <article class="card"><header class="card-head"><h3>Benchmarks</h3><button class="btn btn-ghost btn-sm" data-act="bench-add">＋ Eintragen</button></header>
        ${S().benchmarks.length ? `<table class="tbl"><thead><tr><th>Datum</th><th>Test</th><th>Runden</th><th>Pump</th><th>RPE</th></tr></thead><tbody>${S().benchmarks.map(b => `<tr><td>${e(D.fmt(b.date))}</td><td>${e(b.label)}</td><td>${b.rounds == null ? '–' : b.rounds}</td><td>${b.pump == null ? '–' : b.pump}</td><td>${b.rpe == null ? '–' : b.rpe}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">Woche 1 gegen Woche 8: derselbe 40-s-Circuit bei gleichem Winkel, gleichen Griffen, gleichem Tempo.</p>'}</article>`;
  }
  UI.afterRender.stats = (m) => {
    const today = D.today(), tr = S().profile.trackingStart;
    const pts = []; for (let i = 55; i >= 0; i--) { const d = D.add(today, -i); const a = Store.acwr(d); pts.push({ x: D.fmt(d), y: tr && d >= tr ? a.ratio : null }); }
    if (!pts.some(p => p.y != null)) pts[pts.length - 1].y = Store.acwr(today).ratio;
    Charts.line($('#ch-acwr', m), { points: pts, yMin: 0, yMax: 2, ticks: [0, 0.8, 1.3, 2], band: [0.8, 1.3], refs: [{ y: 1.5 }], fmt: v => v.toFixed(2).replace('.', ','), label: 'ACWR-Verlauf' });
    const wk = weeks(8).concat([D.add(D.monday(today), 7)]), curMon = D.monday(today);
    Charts.bars($('#ch-load', m), { label: 'Wochenlast', items: wk.map(mon => {
      const y = mon > curMon ? 0 : (tr && D.add(mon, 6) < tr ? Math.round(Store.baselineDaily() * 7) : Math.round(inWeek(mon).reduce((a, s) => a + Store.sessionLoad(s), 0)));
      const target = Plan.plannedWeekLoad(mon);
      return { x: D.fmt(mon, { day: 'numeric', month: 'numeric' }), y, target, cur: mon === curMon, tip: `<b>${y}</b> Load · Plan ${target || '–'} · Woche ab ${e(D.fmt(mon))}${tr && D.add(mon, 6) < tr ? ' (Baseline geschätzt)' : ''}` };
    }), legend: '<span><i class="lg-bar"></i>Ist</span><span><i class="lg-target"></i>Plan</span>' });
    const mornings = Object.keys(S().mornings).sort().slice(-30).map(d => ({ x: D.fmt(d), y: S().mornings[d].pain }));
    Charts.line($('#ch-finger', m), { points: mornings, yMin: 0, yMax: 10, ticks: [0, 3, 10], refs: [{ y: 3 }], dots: true, height: 140, fmt: v => String(Math.round(v)), label: 'Fingerschmerz am Morgen' });
    const wk8 = weeks(8);
    const sumBars = (id, key, label) => {
      const items = wk8.map(mon => ({ x: D.fmt(mon, { day: 'numeric', month: 'numeric' }), y: inWeek(mon).reduce((a, s) => a + (s[key] || 0), 0), cur: mon === curMon }));
      if (!items.some(i => i.y > 0)) { $(id, m).innerHTML = '<p class="empty">Noch keine Daten.</p>'; return; }
      Charts.bars($(id, m), { items, height: 130, label });
    };
    sumBars('#ch-hi', 'hi', 'Harte Fingerbelastungen pro Woche'); sumBars('#ch-cap', 'capMin', 'Capacity-Minuten pro Woche');
    const hp = [];
    S().sessions.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => { const hc = (s.hangs || []).filter(h => h.grip === 'Half Crimp'); if (hc.length) hp.push({ x: D.fmt(s.date), y: Math.max.apply(null, hc.map(h => h.kg)), tip: D.fmt(s.date) + ' · RPE ' + hc[0].rpe }); });
    Charts.line($('#ch-hang', m), { points: hp, dots: true, height: 140, yMin: hp.length ? Math.floor(Math.min.apply(null, hp.map(p => p.y)) - 2.5) : 0, yMax: hp.length ? Math.ceil(Math.max.apply(null, hp.map(p => p.y)) + 2.5) : 1, fmt: v => String(Math.round(v * 100) / 100).replace('.', ',') + ' kg', label: 'Max-Hang-Zusatzlast' });
  };
  A['log-list'] = () => {
    const list = S().sessions.slice().sort((a, b) => a.date < b.date ? 1 : -1);
    sheet('Alle Einheiten', list.length ? `<table class="tbl tbl-log"><thead><tr><th>Datum</th><th>Einheit</th><th>min</th><th>RPE</th><th>Load</th><th></th></tr></thead><tbody>${list.map(s => `<tr data-act="log-edit" data-id="${s.id}"><td>${e(D.fmt(s.date))}</td><td>${e(s.title)}${s.climbs ? ` <span class="meta">· ${s.climbs} Climbs</span>` : ''}</td><td>${s.minutes}</td><td>${s.rpe}</td><td>${Store.sessionLoad(s)}</td><td><i class="mk done gd-${s.color || 'none'}"></i></td></tr>`).join('')}</tbody></table>` : '<p class="empty">Noch keine Einheiten geloggt.</p>', { tall: true });
  };
  A['bench-add'] = () => sheet('Benchmark eintragen', `<div class="form">${field('Test', `<input type="text" name="label" value="40-s-Circuit · TB2 40°" >`)}
    <div class="grid3">${field('Runden', `<input type="number" name="rounds" inputmode="numeric">`)}${field('Pump nach R10', `<input type="number" name="pump" min="0" max="10" inputmode="numeric">`)}${field('Session-RPE', `<input type="number" name="rpe" min="1" max="10" inputmode="numeric">`)}</div>
    ${field('Erholung nach 5 min / Notiz', `<input type="text" name="note">`)}<button class="btn btn-primary btn-block" data-act="bench-save">Speichern</button></div>`);
  A['bench-save'] = (el) => { const w = el.closest('.sheet-wrap'), f = readForm(w); S().benchmarks.push(Object.assign({ date: D.today() }, f)); Store.save(); closeSheet(w); UI.render(); };

  // =============================== WISSEN ===============================
  const GROUPS = {
    ex: { finger: 'Finger', pull: 'Zugkraft', board: 'Board', capacity: 'Capacity', core: 'Körperspannung', antagonist: 'Antagonisten' },
    mob: { hips: 'Hüfte', hamstrings: 'Beinrückseite', shoulders: 'Schultern & BWS', wrists_fingers: 'Handgelenk & Finger', ankles: 'Sprunggelenk', warmup: 'Warm-up', recovery: 'Erholung' },
    skill: THEMES
  };
  const ytId = (u) => { const m = /(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/.exec(u || ''); return m ? m[1] : null; };
  function libCard(x) {
    const sub = x.one_de || x.purpose_de || x.concept_de || '';
    return `<button class="lib-card" data-act="lib-open" data-id="${e(x.id)}"><span class="lib-main"><b>${e(x.name_de)}</b><em>${e(sub)}</em></span>
      <span class="lib-side">${x.clip ? `<span class="vid">▶ ${UI.clipLen(x.clip)}</span>` : x.video ? '<span class="vid">▶</span>' : ''}<span class="lv">${(x.levels || []).map(l => `<i class="lv-${l}" title="${LEVELS[l]}"></i>`).join('')}</span></span></button>`;
  }
  function viewLib() {
    let h = `<div class="date-head"><h1>Wissen</h1><span>Übungen, Skills, Mobility</span></div>${seg('lib', ui.lib, [['ex', 'Kraft'], ['skill', 'Technik'], ['mob', 'Mobility'], ['pr', 'Prinzipien']])}`;
    if (ui.lib === 'pr') {
      return h + LIB.principles.map((p, i) => `<article class="card principle"><span class="eyebrow">${e(p.tag || '')}</span><h3>${e(p.title_de)}</h3>${(p.paras || [p.text_de]).map(t => `<p>${e(t)}</p>`).join('')}
        ${p.list ? `<ul class="points">${p.list.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}${p.source ? `<p class="src">Quelle: ${p.source.indexOf('http') === 0 ? `<a href="${e(p.source)}" target="_blank" rel="noopener">${e(p.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>` : e(p.source)}</p>` : ''}</article>`).join('');
    }
    const list = ui.lib === 'ex' ? LIB.exercises : ui.lib === 'skill' ? LIB.skills : LIB.mobility;
    const key = ui.lib === 'skill' ? 'theme' : 'group', groups = GROUPS[ui.lib];
    h += `<div class="chips" role="group" aria-label="Filter">${[['all', 'Alle']].concat(Object.keys(groups).filter(g => list.some(x => x[key] === g)).map(g => [g, groups[g]])).map(g => `<button class="chip chip-btn" aria-pressed="${ui.libGroup === g[0]}" data-act="lib-group" data-v="${g[0]}">${e(g[1])}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="Level">${[['all', 'Alle Level']].concat(Object.keys(LEVELS).map(l => [l, LEVELS[l]])).map(g => `<button class="chip chip-btn chip-lv" aria-pressed="${ui.libLevel === g[0]}" data-act="lib-level" data-v="${g[0]}">${g[0] !== 'all' ? `<i class="lv-${g[0]}"></i>` : ''}${e(g[1])}</button>`).join('')}</div>`;
    if (ui.lib === 'mob' && ui.libGroup === 'all') {
      h += `<h3 class="list-h">Routinen</h3>${LIB.routines.map(r => `<button class="lib-card" data-act="routine-open" data-id="${e(r.id)}"><span class="lib-main"><b>${e(r.name_de)}</b><em>${e(r.when_de || '')} · ${r.duration_min} min</em></span><span class="lib-side"><span class="vid">≡</span></span></button>`).join('')}`;
      if (LIB.assessments.length) h += `<h3 class="list-h">Beweglichkeits-Tests</h3>${LIB.assessments.map(a => { const last = S().assessments.filter(x => x.id === a.id).slice(-1)[0]; return `<button class="lib-card" data-act="assess-open" data-id="${e(a.id)}"><span class="lib-main"><b>${e(a.name_de)}</b><em>${last ? `Zuletzt ${last.value} · ${e(D.fmt(last.date))}` : e(a.measure_de || '')}</em></span><span class="lib-side"><span class="vid">↗</span></span></button>`; }).join('')}`;
      h += '<h3 class="list-h">Übungen</h3>';
    }
    const f = list.filter(x => (ui.libGroup === 'all' || x[key] === ui.libGroup) && (ui.libLevel === 'all' || (x.levels || []).indexOf(ui.libLevel) >= 0));
    return h + (ui.lib === 'skill' && ui.libGroup === 'all' && ui.libLevel === 'all' && window.Tech ? Tech.listHTML() : '') + (f.length ? f.map(libCard).join('') : '<p class="empty">Nichts gefunden für diese Filter.</p>');
  }
  A['lib-group'] = (el) => { ui.libGroup = el.dataset.v; UI.render(); };
  A['lib-level'] = (el) => { ui.libLevel = el.dataset.v; UI.render(); };
  function videoHTML(v) {
    if (!v || !v.url) return '';
    const id = ytId(v.url), st = v.start_s ? Math.round(v.start_s) : 0;
    return `<div class="video">${id ? `<button class="video-play" data-act="video" data-yt="${id}" data-start="${st}" aria-label="Video laden"><span class="play">▶</span><span class="video-meta"><b>${e(v.title || 'Video')}</b><em>${e(v.channel || 'YouTube')}</em></span></button>` : ''}
      <a class="video-link" href="${e(v.url)}" target="_blank" rel="noopener">In YouTube öffnen ↗</a></div>`;
  }
  A.video = (el) => { el.outerHTML = `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${el.dataset.yt}?playsinline=1&autoplay=1&rel=0${+el.dataset.start ? '&start=' + el.dataset.start : ''}" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`; };
  const ul = (title, arr, cls) => arr && arr.length ? `<h4 class="sec-h">${e(title)}</h4><ul class="${cls || 'points'}">${arr.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : '';
  const srcs = (arr) => arr && arr.length ? `<p class="src">Quellen: ${arr.map(u => `<a href="${e(u)}" target="_blank" rel="noopener">${e(String(u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(' · ')}</p>` : '';
  function doseHTML(dose, area) {
    if (!dose) return '';
    const mine = S().profile.levels[area];
    const keys = Object.keys(LEVELS).filter(l => dose[l]);
    if (!keys.length) return '';
    return `<h4 class="sec-h">Dosierung</h4><dl class="dose">${keys.map(l => `<div class="${l === mine ? 'is-mine' : ''}"><dt><i class="lv-${l}"></i>${LEVELS[l]}${l === mine ? ' · du' : ''}</dt><dd>${e(dose[l])}</dd></div>`).join('')}</dl>`;
  }
  A['lib-open'] = (el) => {
    const f = find(el.dataset.id); if (!f) { toast('Eintrag nicht gefunden.'); return; }
    const x = f.item;
    let h = `<div class="lv-row">${(x.levels || []).map(l => `<span class="chip"><i class="lv-${l}"></i>${LEVELS[l]}</span>`).join('')}</div>`;
    if (f.type === 'skill') {
      // Minimal: ein Satz, ein Clip – alles Weitere zum Aufklappen
      h += `<p class="one one-lg">${e(x.one_de || firstSentence(x.concept_de))}</p>${x.what_de ? `<p class="lead">${e(x.what_de)}</p>` : ''}${clipHTML(x)}
        ${x.watch_de ? `<h4 class="sec-h">Worauf genau achten – in dieser Reihenfolge</h4><ul class="steps">${x.watch_de.map(c => `<li>${e(c)}</li>`).join('')}</ul>` : ''}
        ${x.right_de ? ul('Daran merkst du, dass es stimmt', x.right_de) : ''}
        ${x.elite_de ? `<details class="more" open><summary>Feinheiten für Fortgeschrittene</summary><ul class="cues">${x.elite_de.map(c => `<li>${e(c)}</li>`).join('')}</ul></details>` : ''}
        ${x.when_de ? `<p class="meta"><b>Wann einsetzen:</b> ${e(x.when_de)}</p>` : ''}
        ${window.Tech ? Tech.skillLinks(x.id) : ''}
        <details class="more" ${x.clip || x.watch_de ? '' : 'open'}><summary>Hintergrund</summary><p>${e(x.concept_de || '')}</p></details>
        <details class="more"${x.watch_de ? '' : ' open'}><summary>Kurz-Cues für die Wand</summary><ul class="cues">${(x.cues_de || []).map(c => `<li>${e(c)}</li>`).join('')}</ul></details>
        ${(x.drills || []).length ? `<details class="more"><summary>Drills (${x.drills.length})</summary>${x.drills.map(d => `<div class="drill"><b>${e(d.name_de)}</b><p>${e(d.how_de)}</p><span class="meta">${e(d.dose_de || '')}</span></div>`).join('')}</details>` : ''}
        ${(x.goal_examples_de || []).length ? `<details class="more"><summary>Mögliche Session-Ziele</summary><ul class="points">${x.goal_examples_de.map(c => `<li>${e(c)}</li>`).join('')}</ul></details>` : ''}
        ${(x.mistakes_de || []).length ? `<details class="more"><summary>Typische Fehler</summary><ul class="points not">${x.mistakes_de.map(c => `<li>${e(c)}</li>`).join('')}</ul></details>` : ''}
        <h4 class="sec-h">Wie gut sitzt es?</h4>${skillRate(x)}${skillTrend(x.id)}
        <h4 class="sec-h">Ganzes Video</h4>${videoHTML(x.video)}`;
    } else {
      h += `<p class="lead">${e(x.purpose_de || '')}</p>${clipHTML(x)}${x.clip ? '' : videoHTML(x.video)}`;
      h += ul('So geht’s', x.how_de, 'steps') + doseHTML(x.dose, f.type === 'mob' ? 'mobility' : 'strength') + ul('Cues', x.cues_de, 'cues') + ul('Fehler & Sicherheit', x.mistakes_de, 'points not');
      if (x.timer && x.timer.work) h += `<button class="btn btn-primary btn-block" data-act="lib-timer" data-id="${e(x.id)}">⏱ Timer für diese Übung</button>`;
      if (x.equipment && x.equipment.length) h += `<p class="meta">Material: ${e(x.equipment.join(', '))}</p>`;
      if (x.clip) h += `<h4 class="sec-h">Ganzes Video</h4>${videoHTML(x.video)}`;
    }
    sheet(x.name_de, h + srcs(x.sources), { tall: true });
  };
  function skillTrend(id) {
    const hist = S().skillHist.filter(x => x.id === id); if (hist.length < 2) return '';
    const names = ['', 'neu', 'bewusst', 'sicher', 'automatisch'];
    return `<p class="meta">Verlauf: ${hist.slice(-4).map(x => `${names[x.v]} (${e(D.fmt(x.date))})`).join(' → ')}</p>`;
  }
  A['skill-lv'] = (el) => {
    const id = el.dataset.id, v = +el.dataset.v, old = S().skillLevels[id] || 0, hist = S().skillHist, last = hist.filter(x => x.id === id).slice(-1)[0];
    S().skillLevels[id] = v;
    if (last && last.date === D.today()) last.v = v; else hist.push({ id, date: D.today(), v });
    Store.save(); $$('button', el.parentNode).forEach(b => b.setAttribute('aria-checked', String(b === el)));
    if (v > old && old) toast('Eine Stufe besser – notiert.');
  };
  A['lib-timer'] = (el) => { const x = find(el.dataset.id).item, t = x.timer; Timer.open({ label: x.name_de, prep: t.prep == null ? 10 : t.prep, work: t.work, rest: t.rest || 0, reps: t.reps || 1, sets: t.sets || 1, setRest: t.setRest || 0, showSets: (t.sets || 1) > 1 }); };
  A['routine-open'] = (el) => {
    const f = find('routine:' + el.dataset.id); if (!f) { toast('Routine nicht gefunden.'); return; }
    const r = f.item, planAttr = el.dataset.plan ? ` data-plan="${e(el.dataset.plan)}"` : '';
    const goals = (Plan.ROUTINE_GOALS[r.id] || []).map(id => window.Goals && Goals.cur(id)).filter(Boolean);
    sheet(r.name_de, `<p class="meta">${e(r.when_de || '')} · ca. ${r.duration_min} min${goals.length ? ' + 8–10 min Ziele' : ''}</p><p class="lead">${e(r.purpose_de || '')}</p>
      <h4 class="sec-h">Ablauf</h4>
      ${r.items.map((it, i) => { const x = find(it.exercise_id); return `<div class="rt-item"><button class="lib-card" ${x ? `data-act="lib-open" data-id="${e(it.exercise_id)}"` : ''}><span class="num">${i + 1}</span><span class="lib-main"><b>${e(x ? x.item.name_de : it.exercise_id)}</b><em>${e(it.dose_de || '')}</em></span><span class="lib-side"><span class="vid">›</span></span></button>${x ? clipHTML(x.item, 'clip-sm') : ''}</div>`; }).join('')}
      ${goals.length ? `<h4 class="sec-h">Danach: deine Ziele</h4>${goals.map(c => `<div class="rt-item"><button class="lib-card" data-act="goal-open" data-id="${e(c.goal.id)}"><span class="num">★</span><span class="lib-main"><b>${e(c.goal.name_de)} · Stufe ${c.n}/${c.total}</b><em>${e(c.step.name_de)} – ${e(c.step.dose_de || '')}</em></span><span class="lib-side"><span class="vid">›</span></span></button>${clipHTML(c.step, 'clip-sm')}</div>`).join('')}` : ''}
      ${r.follow_along_video ? `<details class="more"><summary>Video zum Mitmachen (ähnliche Session)</summary>${videoHTML(r.follow_along_video)}</details>` : ''}
      <button class="btn btn-ghost btn-block" data-act="rest-timer" data-sec="60">⏱ 60-s-Timer</button>
      <button class="btn btn-primary btn-block" data-act="mob-log" data-id="${e(r.id)}"${planAttr}>Als erledigt eintragen</button>`, { tall: true });
  };
  A['mob-log'] = (el) => {
    const r = find('routine:' + el.dataset.id).item, now = D.today(), pl = el.dataset.plan ? Plan.findPlan(el.dataset.plan) : null;
    const today = pl && Plan.dateOf(pl) < now ? Plan.dateOf(pl) : now;   // vergangene Mobility-Einheit: mit ihrem Datum eintragen
    const plan = el.dataset.plan ? Plan.findPlan(el.dataset.plan) : Plan.plannedOn(today).find(s => s.kind === 'mobility' && s.blocks[0].routine === r.id && !Store.sessionForPlan(s.planId));
    Store.addSession({ date: today, planId: plan && !Store.sessionForPlan(plan.planId) ? plan.planId : null, title: r.name_de, kind: 'mobility', minutes: r.duration_min + (Plan.ROUTINE_GOALS[r.id] ? 8 : 0), minSrc: 'e', rpe: 2, hi: 0, capMin: 0, hangs: [], color: null });
    $$('.sheet-wrap').forEach(closeSheet); UI.render(); toast('Mobility eingetragen.');
  };
  A['assess-open'] = (el) => {
    const a = LIB.assessments.find(x => x.id === el.dataset.id), hist = S().assessments.filter(x => x.id === a.id);
    const how = Array.isArray(a.how_de) ? a.how_de : [a.how_de];
    sheet(a.name_de, `${videoHTML(a.video)}${ul('Durchführung', how, 'steps')}<p class="meta">${e(a.measure_de || '')}</p>
      <div class="form"><div class="grid2">${field('Messwert', `<input type="number" name="value" step="0.5" inputmode="decimal">`)}<div class="field"><label>&nbsp;</label><button class="btn btn-primary" data-act="assess-save" data-id="${e(a.id)}">Eintragen</button></div></div></div>
      ${hist.length ? `<table class="tbl"><thead><tr><th>Datum</th><th>Wert</th><th>Δ</th></tr></thead><tbody>${hist.map((x, i) => `<tr><td>${e(D.fmt(x.date, { day: 'numeric', month: 'short', year: '2-digit' }))}</td><td>${x.value}</td><td>${i ? (x.value - hist[i - 1].value > 0 ? '+' : '') + (Math.round((x.value - hist[i - 1].value) * 10) / 10) : '–'}</td></tr>`).join('')}</tbody></table>` : ''}${srcs(a.sources)}`, { tall: true });
  };
  A['assess-save'] = (el) => { const w = el.closest('.sheet-wrap'), f = readForm(w); if (f.value == null) return; S().assessments.push({ id: el.dataset.id, date: D.today(), value: f.value }); Store.save(); closeSheet(w); UI.render(); toast('Messwert gespeichert.'); };

  // =============================== EINSTELLUNGEN ===============================
  A.settings = () => {
    const p = S().profile, lv = (name, cur) => `<select name="${name}">${Object.keys(LEVELS).map(l => `<option value="${l}"${cur === l ? ' selected' : ''}>${LEVELS[l]}</option>`).join('')}</select>`;
    sheet('Einstellungen', `<div class="form" id="settings">
      <span class="eyebrow">Plan</span>
      <div class="grid2">${field('Planstart (Montag)', `<input type="date" name="planStart" value="${p.planStart}">`)}${field('Körpergewicht kg', `<input type="number" name="bodyweight" step="0.5" value="${p.bodyweight || ''}" inputmode="decimal">`)}</div>
      ${window.Grades ? field('Aktuelles Limit am Board', `<select name="gradeLevel" data-num><option value="">unverändert (${e(Grades.fmtLevel(Grades.ref().level))})</option>${[4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11].map(v => `<option value="${v}">${e(Grades.fmtLevel(v))}</option>`).join('')}</select>`, 'Der härteste Boulder, den du in einer Session schaffst. Startpunkt der Grad-Leiter bis 8A – die App zieht ihn nach, wenn du härtere Boulder einträgst.') : ''}
      <span class="eyebrow">Baseline vor dem Start (für den ACWR)</span>
      <div class="grid3">${field('Einheiten / Wo.', `<input type="number" name="perWeek" step="0.5" value="${p.baseline.perWeek}" inputmode="decimal">`)}${field('Ø Minuten', `<input type="number" name="minutes" value="${p.baseline.minutes}" inputmode="numeric">`)}${field('Ø RPE', `<input type="number" name="rpe" step="0.5" value="${p.baseline.rpe}" inputmode="decimal">`)}</div>
      <span class="eyebrow">Mein Level (hebt die passende Dosierung hervor)</span>
      <div class="grid3">${field('Kraft', lv('strength', p.levels.strength))}${field('Technik', lv('technique', p.levels.technique))}${field('Mobility', lv('mobility', p.levels.mobility))}</div>
      <label class="toggle"><input type="checkbox" name="sound" ${S().settings.sound ? 'checked' : ''}><span>Timer-Töne</span></label>
      <label class="toggle"><input type="checkbox" name="mobilityCounts" ${S().settings.mobilityCounts ? 'checked' : ''}><span>Mobility in die Trainingslast einrechnen</span></label>
      <button class="btn btn-primary btn-block" data-act="settings-save">Speichern</button>
      <span class="eyebrow">Was die App über dich gelernt hat</span>
      <p class="hint">${learnedText()}</p>
      <span class="eyebrow">Datensicherung</span>
      <p class="hint">Alle Daten liegen nur auf diesem Gerät. Sichere sie regelmäßig als Datei.</p>
      <button class="btn btn-ghost btn-block" data-act="export">Sicherung exportieren</button>
      <label class="btn btn-ghost btn-block file-btn">Sicherung importieren<input type="file" accept="application/json,.json" id="import-file" hidden></label>
      <button class="btn btn-danger btn-block" data-act="reset">Alle Daten löschen</button>
      <p class="src">Green Days · Trainingsprinzipien nach Paradigm Climbing (Charlie Schreiber) und Lattice Training. Kein Ersatz für medizinische Abklärung bei anhaltenden Beschwerden.</p></div>`, {
      tall: true, mount: (w) => {
        $('#import-file', w).addEventListener('change', (ev) => {
          const file = ev.target.files[0]; if (!file) return;
          if (!confirm('Import ersetzt alle aktuellen Daten auf diesem Gerät. Fortfahren?')) return;
          file.text().then(t => { try { Store.importJSON(t); Plan.reset(); closeSheet(w); UI.render(); toast('Sicherung importiert.'); } catch (err) { toast('Import fehlgeschlagen: ' + err.message); } });
        });
      }
    });
  };
  function learnedText() {
    const L = S().learn, out = [];
    Object.keys(L.pace || {}).forEach(k => out.push(`${Plan.KINDS[k] ? Plan.KINDS[k].label : k}: dauert bei dir ${Math.round(L.pace[k].v * 100)} % der Planzeit (${L.pace[k].n} gemessen)`));
    Object.keys(L.ratio || {}).forEach(k => out.push(`${Plan.KINDS[k] ? Plan.KINDS[k].label : k}: du schaffst im Schnitt ${Math.round(L.ratio[k].v * 100)} % des Umfangs (${L.ratio[k].n} Einheiten)`));
    Object.keys(L.perClimb || {}).forEach(k => out.push(`${Plan.KINDS[k] ? Plan.KINDS[k].label : k}: ca. ${String(Math.round(L.perClimb[k].v * 10) / 10).replace('.', ',')} min pro Climb`));
    return out.length ? e(out.join(' · ')) : 'Noch nichts – mit jeder geloggten Session werden Dauer- und Last-Schätzung genauer. Am genauesten: Session in der App starten und am Ende dort beenden, dann wird die Dauer gemessen.';
  }
  A['settings-save'] = (el) => {
    const w = el.closest('.sheet-wrap'), f = readForm(w), p = S().profile;
    if (f.planStart) p.planStart = D.monday(f.planStart);
    if (f.gradeLevel && window.Grades) Grades.set(f.gradeLevel, D.today());
    p.bodyweight = f.bodyweight || null;
    p.baseline = { perWeek: f.perWeek || 0, minutes: f.minutes || 0, rpe: f.rpe || 0 };
    p.levels = { strength: f.strength, technique: f.technique, mobility: f.mobility };
    S().settings.sound = f.sound; S().settings.mobilityCounts = f.mobilityCounts;
    Plan.reset(); Store.invalidate(); Store.save(); closeSheet(w); UI.render(); toast('Gespeichert.');
  };
  A.export = () => {
    const name = `green-days-${D.today()}.json`, blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Green Days Sicherung' }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  A.reset = () => { if (!confirm('Wirklich alle Trainingsdaten auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.')) return; Store.reset(); Plan.reset(); $$('.sheet-wrap').forEach(closeSheet); UI.nav('today'); };

  Object.assign(UI.views, { plan: viewPlan, timer: viewTimer, stats: viewStats, lib: viewLib });
})();
