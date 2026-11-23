/* Green Days — UI-Kern: Shell, Sheets, Heute-Ansicht, Session-Modus (Green-Day-Filter → Blöcke → Log). */
(function () {
  'use strict';
  const e = Charts.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const S = () => Store.s;
  const LIB = window.LIB || { exercises: [], skills: [], mobility: [], routines: [], assessments: [], principles: [] };

  const GD = [
    { k: 'green', label: 'Green', sub: 'Du bist besser geworden' },
    { k: 'yellow', label: 'Yellow', sub: 'Niveau gehalten' },
    { k: 'orange', label: 'Orange', sub: 'Zu müde trainiert' },
    { k: 'red', label: 'Red', sub: 'Erholungsloch' },
    { k: 'black', label: 'Black', sub: 'Zwangspause' }
  ];
  const gd = (k) => GD.find(g => g.k === k);
  const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' };
  const THEMES = { foundations: 'Grundlagen', tension: 'Spannung & Steilwand', dynamic: 'Dynamik & Koordination', slab: 'Slab & Balance', tactics: 'Taktik', mental: 'Kopf', outdoor: 'Fels' };

  // ---------- Bibliothek-Lookup ----------
  const idx = {};
  LIB.exercises.forEach(x => idx[x.id] = { type: 'ex', item: x });
  LIB.mobility.forEach(x => idx[x.id] = { type: 'mob', item: x });
  LIB.skills.forEach(x => idx[x.id] = { type: 'skill', item: x });
  LIB.routines.forEach(x => idx['routine:' + x.id] = { type: 'routine', item: x });
  const find = (id) => idx[id] || null;

  // ---------- kleine Bausteine ----------
  const chip = (t, cls) => `<span class="chip ${cls || ''}">${e(t)}</span>`;
  const kindChip = (kind) => { const k = Plan.KINDS[kind] || Plan.KINDS.other; return `<span class="kind fam-${k.fam}">${e(k.label)}</span>`; };
  const gdBadge = (k) => { const g = gd(k); return g ? `<span class="gd gd-${g.k}"><i></i>${e(g.label)}</span>` : `<span class="gd gd-none"><i></i>Offen</span>`; };
  function scale(name, min, max, val, o) {
    o = o || {};
    let h = `<div class="scale${o.wide ? ' scale-wide' : ''}" role="radiogroup" aria-label="${e(o.label || name)}"><input type="hidden" name="${name}" value="${val == null ? '' : val}">`;
    for (let i = min; i <= max; i++) h += `<button type="button" role="radio" aria-checked="${val === i}" data-v="${i}">${i}</button>`;
    return h + '</div>' + (o.ends ? `<div class="scale-ends"><span>${e(o.ends[0])}</span><span>${e(o.ends[1])}</span></div>` : '');
  }
  const field = (label, inner, hint) => `<div class="field"><label>${e(label)}</label>${inner}${hint ? `<p class="hint">${e(hint)}</p>` : ''}</div>`;
  function readForm(root) {
    const o = {};
    $$('[name]', root).forEach(i => {
      if (i.type === 'checkbox') o[i.name] = i.checked;
      else if (i.type === 'number' || i.dataset.num != null || (i.type === 'hidden' && i.closest('.scale'))) o[i.name] = i.value === '' ? null : Number(i.value);
      else o[i.name] = i.value.trim();
    });
    return o;
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.hidden = true, 250); }, 2200);
  }

  // ---------- Sheet ----------
  function sheet(title, html, o) {
    o = o || {};
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    el.innerHTML = `<div class="sheet-back" data-act="sheet-close"></div><section class="sheet${o.tall ? ' sheet-tall' : ''}" role="dialog" aria-label="${e(title)}">
      <header class="sheet-head"><h2>${e(title)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Schließen">✕</button></header>
      <div class="sheet-body">${html}</div></section>`;
    $('#sheets').appendChild(el);
    requestAnimationFrame(() => el.classList.add('open'));
    if (o.mount) o.mount(el);
    return el;
  }
  function closeSheet(el) {
    el = el || $('#sheets').lastElementChild; if (!el) return;
    el.classList.remove('open'); setTimeout(() => el.remove(), 200);
  }

  // ---------- Wochen-Skill ----------
  function skillPool(w) {
    const lvl = S().profile.levels.technique;
    const per = w.phase.themes.map(t => LIB.skills.filter(s => s.theme === t).sort((a, b) => (b.levels.indexOf(lvl) >= 0) - (a.levels.indexOf(lvl) >= 0)));
    const out = []; let i = 0, added = true;
    while (added) { added = false; per.forEach(l => { if (l[i]) { out.push(l[i]); added = true; } }); i++; }
    return out;
  }
  function skillOfWeek(w) {
    if (!w) return null;
    const ov = S().skillOverride[w.monday];
    if (ov && find(ov)) return find(ov).item;
    const pool = skillPool(w);
    return pool.length ? pool[w.i % pool.length] : null;
  }

  // ---------- Block-Darstellung ----------
  function blockHTML(b, i, live, draft) {
    const done = live && draft.checks && draft.checks[i];
    const ex = b.ex && find(b.ex), rt = b.routine && find('routine:' + b.routine);
    let extra = '';
    if (b.t === 'tech' && live) {
      const sk = skillOfWeek(Plan.weekAt(draft.date));
      if (sk) extra += `<button class="link-row" data-act="lib-open" data-id="${e(sk.id)}"><span>Fokus: <b>${e(sk.name_de)}</b></span><span>Cues & Video ›</span></button>`;
    }
    if (ex) extra += `<button class="link-row" data-act="lib-open" data-id="${e(b.ex)}"><span>${e(ex.item.name_de)}</span><span>Cues & Video ›</span></button>`;
    if (rt) extra += `<button class="link-row" data-act="routine-open" data-id="${e(b.routine)}"><span>${e(rt.item.name_de)}</span><span>Routine ›</span></button>`;
    let ctrl = '';
    if (live) {
      if (b.timer) ctrl += `<button class="btn btn-primary" data-act="block-timer" data-i="${i}">⏱ Timer starten</button>`;
      if (b.rest) ctrl += `<div class="rest-row"><span>Pause</span>${b.rest.map(r => `<button class="chip chip-btn" data-act="rest-timer" data-sec="${r}">${Timer.mmss(r)}</button>`).join('')}</div>`;
      if (b.log === 'hang') {
        const hs = (draft.hangs || []).filter(h => h.block === i);
        if (hs.length) ctrl += `<p class="logged">${hs.map(h => `${h.sets} × ${h.secs} s · ${h.kg >= 0 ? '+' : ''}${h.kg} kg · RPE ${h.rpe}`).join('<br>')}</p>`;
        ctrl += `<button class="btn btn-ghost" data-act="hang-log" data-i="${i}">Last eintragen</button>`;
      }
    }
    return `<article class="block${done ? ' is-done' : ''} bt-${b.t}">
      <header>${b.t === 'info' ? '<span class="num">i</span>' : live ? `<button class="check" data-act="block-check" data-i="${i}" aria-pressed="${!!done}" aria-label="Erledigt">${done ? '✓' : ''}</button>` : `<span class="num">${i + 1}</span>`}
        <h4>${e(b.title)}</h4>${b.min ? `<span class="meta">${b.min} min</span>` : ''}</header>
      <ul>${(b.lines || []).map(l => `<li>${e(l)}</li>`).join('')}</ul>${extra}${ctrl ? `<div class="block-ctrl">${ctrl}</div>` : ''}
    </article>`;
  }

  function sessionCard(s, date) {
    const log = Store.sessionForPlan(s.planId), skipped = S().skips[s.planId];
    const moved = S().moves[s.planId] && S().moves[s.planId] !== s.baseDate;
    const head = `<header class="card-head">${kindChip(s.kind)}<span class="meta">${s.optional ? 'optional · ' : ''}ca. ${s.min} min · RPE ${s.rpe[0]}–${s.rpe[1]}</span></header>
      <h3>${e(s.title)}</h3><p class="focus">${e(s.focus)}</p>`;
    if (log) return `<article class="card session is-logged">${head}
      <div class="logline">${gdBadge(log.color)}<span>${log.minutes} min · RPE ${log.rpe} · Load ${Store.sessionLoad(log)}</span></div>
      <div class="actions"><button class="btn btn-ghost" data-act="log-edit" data-id="${log.id}">Bearbeiten</button><button class="btn btn-ghost" data-act="plan-detail" data-plan="${s.planId}">Plan ansehen</button></div></article>`;
    if (skipped) return `<article class="card session is-skipped">${head}<p class="hint">Ausgelassen.</p><div class="actions"><button class="btn btn-ghost" data-act="unskip" data-plan="${s.planId}">Wieder einplanen</button></div></article>`;
    return `<article class="card session">${head}
      <ol class="mini">${s.blocks.filter(b => b.t !== 'info').map(b => `<li><span>${e(b.title)}</span>${b.min ? `<span>${b.min}′</span>` : ''}</li>`).join('')}</ol>
      ${moved ? `<p class="hint">Verschoben von ${D.fmt(s.baseDate, { weekday: 'short', day: 'numeric', month: 'short' })}.</p>` : ''}
      <div class="actions">${s.kind === 'mobility' && s.blocks[0].routine && find('routine:' + s.blocks[0].routine)
        ? `<button class="btn btn-primary" data-act="routine-open" data-id="${e(s.blocks[0].routine)}" data-plan="${s.planId}">Routine öffnen</button>`
        : `<button class="btn btn-primary" data-act="start" data-plan="${s.planId}">Session starten</button>`}
      <button class="btn btn-ghost" data-act="plan-detail" data-plan="${s.planId}">Details</button>
      <button class="btn btn-ghost" data-act="more" data-plan="${s.planId}" aria-label="Verschieben oder auslassen">⋯</button></div></article>`;
  }

  // ---------- Heute ----------
  function acwrProjection(today) {
    const sun = D.add(D.monday(today), 6), extra = {};
    for (let d = today; d <= sun; d = D.add(d, 1)) {
      Plan.plannedOn(d).forEach(s => { if (!s.optional && !S().skips[s.planId] && !Store.sessionForPlan(s.planId)) extra[d] = (extra[d] || 0) + Plan.plannedLoad(s); });
    }
    return Store.acwr(sun, extra);
  }
  function acwrCard(today, big) {
    const a = Store.acwr(today), z = Store.acwrZone(a.ratio), p = acwrProjection(today), pz = Store.acwrZone(p.ratio);
    const r = (v) => v == null ? '–' : v.toFixed(2).replace('.', ',');
    return `<article class="card acwr tone-${z.tone}" ${big ? '' : 'data-act="nav" data-view="stats"'}>
      <div class="acwr-main"><div><span class="eyebrow">ACWR · Belastungstrend</span><div class="hero">${r(a.ratio)}</div></div>
      <span class="status tone-${z.tone}"><i></i>${e(z.label)}</span></div>
      <p class="meta">Letzte 7 Tage ${a.acute} · Wochenschnitt der 4 Wochen davor ${a.chronic}</p>
      ${big ? `<p class="hint">${e(z.hint || '')}</p>` : ''}
      <p class="meta">Mit dem Rest der geplanten Woche: <b>${r(p.ratio)}</b> (${e(pz.label)})${a.baselineShare > 0 ? ` · Basis zu ${Math.round(a.baselineShare * 100)} % geschätzt` : ''}</p>
    </article>`;
  }
  function morningCard(today) {
    if (S().mornings[today]) return '';
    const y = Store.sessionsOn(D.add(today, -1)).filter(s => s.kind !== 'mobility');
    if (!y.length) return '';
    return `<article class="card form" id="morning"><span class="eyebrow">Finger-Check am Morgen danach</span>
      <h3>Wie fühlen sich die Finger heute an?</h3>
      ${field('Schmerz / Reizung (PIP, Ringbänder)', scale('pain', 0, 10, 0, { ends: ['nichts', 'stark'] }))}
      <div class="row"><label class="toggle"><input type="checkbox" name="stiff"><span>Steifigkeit</span></label><label class="toggle"><input type="checkbox" name="swell"><span>Schwellung</span></label></div>
      <button class="btn btn-primary" data-act="morning-save">Speichern</button></article>`;
  }
  function retroCard(today) {
    const last = Store.lastSession(today);
    if (!last || last.color) return '';
    return `<article class="card form" id="retro"><span class="eyebrow">Rückblick · ${e(D.fmt(last.date, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>
      <h3>War „${e(last.title)}“ ein Green Day?</h3>
      <p class="hint">Der Maßstab ist heute: Fühlst du dich stärker, schärfer, koordinierter – oder schlechter?</p>
      <div class="gd-pick">${GD.map(g => `<button class="gd-btn gd-${g.k}" data-act="retro" data-id="${last.id}" data-k="${g.k}"><i></i><b>${g.label}</b><span>${e(g.sub)}</span></button>`).join('')}</div></article>`;
  }
  function onboarding() {
    const p = S().profile;
    return `<article class="card form" id="onb"><span class="eyebrow">Einmalig einrichten</span><h3>Deine Ausgangslast</h3>
      <p class="hint">Damit der ACWR vom ersten Tag an stimmt, schätze dein Training der letzten 4 Wochen.</p>
      <div class="grid3">
      ${field('Einheiten / Wo.', `<input type="number" name="perWeek" step="0.5" min="0" max="10" value="${p.baseline.perWeek}" inputmode="decimal">`)}
      ${field('Ø Minuten', `<input type="number" name="minutes" min="0" max="300" value="${p.baseline.minutes}" inputmode="numeric">`)}
      ${field('Ø RPE', `<input type="number" name="rpe" step="0.5" min="1" max="10" value="${p.baseline.rpe}" inputmode="decimal">`)}
      </div>
      <div class="grid2">${field('Planstart (Montag)', `<input type="date" name="planStart" value="${p.planStart}">`)}
      ${field('Gewicht kg (optional)', `<input type="number" name="bodyweight" step="0.5" value="${p.bodyweight || ''}" inputmode="decimal">`)}</div>
      <button class="btn btn-primary" data-act="onb-save">Los geht’s</button></article>`;
  }
  function skillCard(w) {
    const sk = skillOfWeek(w); if (!sk) return '';
    return `<article class="card skill"><header class="card-head"><span class="eyebrow">Technik-Fokus der Woche</span><span class="meta">${e(THEMES[sk.theme] || sk.theme)}</span></header>
      <h3>${e(sk.name_de)}</h3><p>${e(sk.concept_de)}</p>
      <ul class="cues">${(sk.cues_de || []).slice(0, 3).map(c => `<li>${e(c)}</li>`).join('')}</ul>
      <div class="actions"><button class="btn btn-ghost" data-act="lib-open" data-id="${e(sk.id)}">Drills & Video</button><button class="btn btn-ghost" data-act="skill-swap" data-mon="${w.monday}">Anderen Fokus wählen</button></div></article>`;
  }
  function phaseHead(w, today) {
    if (!w) {
      const l = Plan.layout();
      return today < l[0].start ? `<div class="phase-head"><span class="eyebrow">Plan startet am ${e(D.long(l[0].start))}</span></div>` : `<div class="phase-head"><span class="eyebrow">Plan abgeschlossen</span></div>`;
    }
    return `<button class="phase-head ph-${w.phase.type}" data-act="phase-open" data-id="${w.phase.id}">
      <span class="eyebrow">${e(w.phase.name)}</span>
      <span class="phase-week">Woche ${w.n} / ${w.phase.weeks}<em>${e(w.week.label)}</em></span>
      <span class="phase-bar">${Array.from({ length: w.phase.weeks }, (_, i) => `<i class="${i < w.i ? 'past' : i === w.i ? 'now' : ''}"></i>`).join('')}</span></button>`;
  }
  function viewToday() {
    const today = D.today(), w = Plan.weekAt(today);
    let h = `<div class="date-head"><h1>${e(D.parse(today).toLocaleDateString('de-DE', { weekday: 'long' }))}</h1><span>${e(D.fmt(today, { day: 'numeric', month: 'long' }))}</span></div>`;
    h += phaseHead(w, today);
    if (!S().profile.onboarded) return h + onboarding();
    if (S().draft) h += `<article class="card resume"><h3>Laufende Session: ${e(S().draft.title)}</h3><div class="actions"><button class="btn btn-primary" data-act="resume">Weiter</button><button class="btn btn-ghost" data-act="draft-discard">Verwerfen</button></div></article>`;
    h += morningCard(today) + retroCard(today);
    const planned = Plan.plannedOn(today);
    const main = planned.filter(s => s.kind !== 'mobility' || !s.optional), opt = planned.filter(s => s.kind === 'mobility' && s.optional);
    if (main.length) h += main.map(s => sessionCard(s, today)).join('');
    else if (w) {
      let next = null;
      for (let d = D.add(today, 1), i = 0; i < 10 && !next; i++, d = D.add(d, 1)) next = Plan.plannedOn(d).find(s => !s.optional && !S().skips[s.planId]) && { d, s: Plan.plannedOn(d).find(s => !s.optional && !S().skips[s.planId]) };
      h += `<article class="card rest"><span class="eyebrow">Ruhetag</span><h3>Heute passiert die Anpassung.</h3>
        <p>Schlaf, Essen und Trinken machen aus der letzten Session den nächsten Green Day.</p>
        ${next ? `<p class="meta">Nächste Einheit: ${e(D.fmt(next.d, { weekday: 'long' }))} · ${e(next.s.title)}</p>` : ''}</article>`;
    }
    h += opt.map(s => sessionCard(s, today)).join('');
    Store.sessionsOn(today).filter(s => !s.planId).forEach(s => {
      h += `<article class="card session is-logged"><header class="card-head">${kindChip(s.kind)}</header><h3>${e(s.title)}</h3><div class="logline">${gdBadge(s.color)}<span>${s.minutes} min · RPE ${s.rpe} · Load ${Store.sessionLoad(s)}</span></div><div class="actions"><button class="btn btn-ghost" data-act="log-edit" data-id="${s.id}">Bearbeiten</button></div></article>`;
    });
    h += acwrCard(today) + skillCard(w);
    if (w && w.week.note) h += `<article class="card"><span class="eyebrow">Notiz zur Woche</span><p>${e(w.week.note)}</p></article>`;
    h += `<button class="btn btn-ghost btn-block" data-act="free-log">＋ Freie Einheit eintragen</button>`;
    return h;
  }

  // ---------- Session-Modus ----------
  function startSession(planId) {
    const s = Plan.findPlan(planId); if (!s) return;
    const w = Plan.weekAt(D.today()), sk = skillOfWeek(w);
    S().draft = { planId, date: D.today(), title: s.title, kind: s.kind, startedAt: Date.now(), stage: 'pre', checks: {}, hangs: [], capSec: 0, pre: {}, goal: sk && sk.goal_examples_de ? sk.goal_examples_de[0] : '' };
    Store.save(); renderSession();
  }
  function renderSession() {
    const root = $('#session'), d = S().draft;
    if (!d) { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('in-session'); return; }
    const s = Plan.findPlan(d.planId);
    document.body.classList.add('in-session');
    root.hidden = false;
    let body = '';
    if (d.stage === 'pre') {
      body = `<div class="card form" id="pre"><span class="eyebrow">Green-Day-Filter · vor der Session</span>
        <h3>Bin ich erholt genug, um mit Absicht zu trainieren?</h3>
        ${field('Erholung', scale('recovery', 1, 5, d.pre.recovery || null, { wide: true, ends: ['platt', 'frisch'] }))}
        ${field('Energie & Fokus', scale('energy', 1, 5, d.pre.energy || null, { wide: true, ends: ['niedrig', 'hoch'] }))}
        ${field('Finger gerade', scale('finger', 0, 10, d.pre.finger == null ? 0 : d.pre.finger, { ends: ['ruhig', 'schmerzhaft'] }))}
        ${field('Ein klares Ziel für heute', `<textarea name="goal" rows="2" placeholder="z. B. Hüfte vor jedem Zug vorbereiten">${e(d.goal || '')}</textarea>`, 'Ein Prozessziel, kein Ergebnisziel.')}
        <div id="pre-advice"></div>
        <button class="btn btn-primary btn-block" data-act="pre-go">Session beginnen</button></div>
        <article class="card"><span class="eyebrow">Hauptreiz heute</span><h3>${e(s.focus)}</h3>
        <p class="meta">Ziel-RPE ${s.rpe[0]}–${s.rpe[1]} · ca. ${s.min} min</p>
        ${s.low ? `<p class="hint"><b>Low-Energy-Version:</b> ${e(s.low)}</p>` : ''}</article>`;
    } else if (d.stage === 'run') {
      const mins = Math.round((Date.now() - d.startedAt) / 60000);
      body = `<div class="run-meta"><span>${mins} min</span>${d.goal ? `<span class="goal">Ziel: ${e(d.goal)}</span>` : ''}</div>
        ${d.advice ? `<p class="banner tone-orange">${e(d.advice)}</p>` : ''}
        ${s.blocks.map((b, i) => blockHTML(b, i, true, d)).join('')}
        <article class="card stop"><span class="eyebrow">Session beenden, wenn …</span><ul>${s.stop.map(x => `<li>${e(x)}</li>`).join('')}</ul></article>
        <button class="btn btn-primary btn-block btn-xl" data-act="to-post">Session beenden & loggen</button>`;
    } else {
      body = postForm({ minutes: Math.max(10, Math.min(300, Math.round((Date.now() - d.startedAt) / 60000))), hi: s.hi || d.hangs.reduce((a, h) => a + (h.rpe >= 7 ? h.sets : 0), 0), capMin: Math.round(d.capSec / 60) || null }, { planned: s });
    }
    root.innerHTML = `<header class="session-head"><button class="icon-btn" data-act="session-min" aria-label="Minimieren">⌄</button>
      <div><span class="eyebrow">${e(Plan.KINDS[s.kind].label)}</span><h2>${e(s.title)}</h2></div>
      <span class="stage">${d.stage === 'pre' ? '1/3' : d.stage === 'run' ? '2/3' : '3/3'}</span></header>
      <div class="session-body">${body}</div>`;
    if (d.stage === 'pre') updateAdvice();
  }
  function updateAdvice() {
    const f = readForm($('#pre')), s = Plan.findPlan(S().draft.planId), box = $('#pre-advice');
    let msg = '';
    if (f.finger >= 3) msg = 'Finger ≥ 3/10: heute keine harten Fingerreize. ' + (s.low || 'Leichter klettern, Umfang kürzen.');
    else if (f.recovery != null && f.recovery <= 2) msg = 'Wenig erholt: Nimm die Low-Energy-Version. ' + (s.low || '');
    else if (f.energy != null && f.energy <= 2) msg = 'Wenig Energie: Wenn es sich nach dem Aufwärmen 1–2 Stufen härter anfühlt als erwartet, kürze den Umfang.';
    S().draft.advice = msg;
    box.innerHTML = msg ? `<p class="banner tone-orange">${e(msg)}</p>` : '';
  }
  function postForm(v, o) {
    o = o || {};
    const kinds = ['outdoor', 'limit', 'strength', 'power', 'submax', 'arc', 'skill', 'mobility', 'other'];
    return `<div class="card form" id="post"><span class="eyebrow">${o.edit ? 'Einheit bearbeiten' : 'Nach der Session'}</span>
      ${o.free ? `${field('Titel', `<input type="text" name="title" value="${e(v.title || '')}" placeholder="z. B. Fels: Projekt ausbouldern">`)}
        <div class="grid2">${field('Datum', `<input type="date" name="date" value="${v.date || D.today()}" max="${D.today()}">`)}
        ${field('Art', `<select name="kind">${kinds.map(k => `<option value="${k}"${v.kind === k ? ' selected' : ''}>${e(Plan.KINDS[k].label)}</option>`).join('')}</select>`)}</div>` : ''}
      ${field('Dauer in Minuten', `<input type="number" name="minutes" min="5" max="600" value="${v.minutes || ''}" inputmode="numeric">`)}
      ${field('Session-RPE', scale('rpe', 1, 10, v.rpe || null, { ends: ['sehr leicht', 'maximal'] }), 'Wie anstrengend war die Einheit insgesamt?')}
      <p class="load-preview" id="load-preview"></p>
      ${field('Maximaler Pump', scale('pump', 0, 10, v.pump == null ? null : v.pump))}
      ${field('Finger am Ende', scale('fingerEnd', 0, 10, v.fingerEnd == null ? 0 : v.fingerEnd, { ends: ['ruhig', 'schmerzhaft'] }))}
      <div class="grid2">${field('Harte Fingerbelastungen', `<input type="number" name="hi" min="0" max="99" value="${v.hi == null ? '' : v.hi}" inputmode="numeric">`, 'Schwere Hang-Sätze + harte Boardversuche')}
      ${field('Capacity-Kletterminuten', `<input type="number" name="capMin" min="0" max="240" value="${v.capMin == null ? '' : v.capMin}" inputmode="numeric">`, 'Tatsächliche Zeit an der Wand')}</div>
      <label class="toggle"><input type="checkbox" name="sharp" ${v.sharp ? 'checked' : ''}><span>Aufgehört, solange es sich noch gut anfühlte</span></label>
      ${field('Board, Winkel, Grade, Circuits', `<input type="text" name="board" value="${e(v.board || '')}" placeholder="z. B. TB2 40°, V2–V3">`)}
      <span class="eyebrow">Journal · 5 Minuten</span>
      ${field('Eine Sache, die besser wurde', `<textarea name="improved" rows="2">${e(v.improved || '')}</textarea>`)}
      ${field('Eine Sache, die ich gelernt habe', `<textarea name="learned" rows="2">${e(v.learned || '')}</textarea>`)}
      ${field('Warum das wichtig ist', `<textarea name="why" rows="2">${e(v.why || '')}</textarea>`)}
      ${o.edit ? field('Green-Day-Farbe', `<select name="color"><option value="">Offen</option>${GD.map(g => `<option value="${g.k}"${v.color === g.k ? ' selected' : ''}>${g.label} – ${e(g.sub)}</option>`).join('')}</select>`) : ''}
      <button class="btn btn-primary btn-block" data-act="${o.act || 'post-save'}" ${o.id ? `data-id="${o.id}"` : ''}>Speichern</button>
      ${o.edit ? `<button class="btn btn-danger btn-block" data-act="log-delete" data-id="${o.id}">Einheit löschen</button>` : ''}
      ${!o.edit && !o.free ? `<button class="btn btn-ghost btn-block" data-act="back-run">Zurück zu den Blöcken</button>` : ''}</div>`;
  }
  function paintLoad(root) {
    const f = readForm(root), p = $('#load-preview', root); if (!p) return;
    p.textContent = f.minutes && f.rpe ? `Session Load = ${f.minutes} min × RPE ${f.rpe} = ${Math.round(f.minutes * f.rpe)}` : '';
  }
  function collectPost(root) {
    const f = readForm(root);
    if (!f.minutes || !f.rpe) { toast('Dauer und Session-RPE fehlen noch.'); return null; }
    return f;
  }

  // ---------- Render ----------
  let view = 'today';
  const views = { today: viewToday };
  function render() {
    const m = $('#view');
    m.innerHTML = (views[view] || viewToday)();
    m.dataset.view = view;
    $$('.tabbar button').forEach(b => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
    if (UI.afterRender[view]) UI.afterRender[view](m);
    $('#save-warn').hidden = !Store.saveFailed;
  }
  function nav(v) { view = v; render(); $('#view').scrollTop = 0; window.scrollTo(0, 0); }

  // ---------- Aktionen ----------
  const A = {
    nav: (el) => nav(el.dataset.view),
    'sheet-close': (el) => closeSheet(el.closest('.sheet-wrap')),
    'onb-save': () => {
      const f = readForm($('#onb')), p = S().profile;
      p.baseline = { perWeek: f.perWeek || 0, minutes: f.minutes || 0, rpe: f.rpe || 0 };
      if (f.planStart) p.planStart = D.monday(f.planStart);
      p.bodyweight = f.bodyweight || null; p.onboarded = true; p.trackingStart = D.today();
      Plan.reset(); Store.invalidate(); Store.save(); render();
    },
    'morning-save': () => { const f = readForm($('#morning')); S().mornings[D.today()] = { pain: f.pain || 0, stiff: f.stiff, swell: f.swell }; Store.save(); toast(f.pain >= 3 ? 'Notiert. Heute und morgen nicht steigern.' : 'Notiert.'); render(); },
    retro: (el) => { Store.updateSession(el.dataset.id, { color: el.dataset.k }); toast(el.dataset.k === 'green' ? 'Green Day gestapelt.' : 'Notiert – das ist Information, kein Urteil.'); render(); },
    start: (el) => { if (S().draft && !confirm('Es läuft bereits eine Session. Verwerfen und neu starten?')) return; startSession(el.dataset.plan); },
    resume: () => renderSession(),
    'draft-discard': () => { if (confirm('Laufende Session verwerfen?')) { S().draft = null; Store.save(); renderSession(); render(); } },
    'session-min': () => { $('#session').hidden = true; document.body.classList.remove('in-session'); render(); },
    'pre-go': () => { const f = readForm($('#pre')), d = S().draft; d.pre = { recovery: f.recovery, energy: f.energy, finger: f.finger }; d.goal = f.goal; d.stage = 'run'; d.startedAt = Date.now(); Store.save(); renderSession(); $('.session-body').scrollTop = 0; },
    'to-post': () => { S().draft.stage = 'post'; Store.save(); renderSession(); paintLoad($('#post')); $('.session-body').scrollTop = 0; },
    'back-run': () => { S().draft.stage = 'run'; Store.save(); renderSession(); },
    'block-check': (el) => { const d = S().draft; d.checks[el.dataset.i] = !d.checks[el.dataset.i]; Store.save(); renderSession(); },
    'block-timer': (el) => {
      const d = S().draft, i = +el.dataset.i, b = Plan.findPlan(d.planId).blocks[i];
      Timer.open(b.timer, { onDone: (res) => {
        if (b.log === 'cap') { d.capSec += res.workSec; d.checks[i] = true; Store.save(); renderSession(); toast(`${Timer.mmss(res.workSec)} Kletterzeit notiert.`); }
        else if (b.log === 'hang') hangSheet(i, res.reps);
        else { d.checks[i] = true; Store.save(); renderSession(); }
      } });
    },
    'rest-timer': (el) => Timer.open({ label: 'Pause', prep: 0, work: +el.dataset.sec, reps: 1, workName: 'Pause', tone: 'rest', repName: 'Pause' }),
    'hang-log': (el) => hangSheet(+el.dataset.i),
    'hang-save': (el) => {
      const w = el.closest('.sheet-wrap'), f = readForm(w), d = S().draft, i = +el.dataset.i, b = Plan.findPlan(d.planId).blocks[i];
      if (f.kg == null || !f.rpe) { toast('Last und RPE eintragen.'); return; }
      d.hangs.push({ block: i, title: b.title, grip: b.hang.grip, edge: b.hang.edge, secs: b.hang.secs, sets: f.sets || b.hang.sets, kg: f.kg, rpe: f.rpe });
      d.checks[i] = true; Store.save(); closeSheet(w); renderSession();
      if (f.rpe >= 9) toast('RPE 9+: nächste Woche Last halten oder senken.');
    },
    'post-save': () => {
      const f = collectPost($('#post')); if (!f) return;
      const d = S().draft;
      Store.addSession({ date: d.date, planId: d.planId, title: d.title, kind: d.kind, minutes: f.minutes, rpe: f.rpe, pump: f.pump, fingerEnd: f.fingerEnd, hi: f.hi || 0, capMin: f.capMin || 0, sharp: f.sharp, board: f.board, improved: f.improved, learned: f.learned, why: f.why, pre: d.pre, goal: d.goal, hangs: d.hangs, color: null });
      S().draft = null; Store.save(); renderSession(); nav('today');
      toast('Gespeichert. Ob es ein Green Day war, zeigt die nächste Session.');
    },
    'free-log': () => sheet('Freie Einheit', postForm({ date: D.today(), kind: 'outdoor' }, { free: true, act: 'free-save' }), { tall: true }),
    'free-save': (el) => {
      const w = el.closest('.sheet-wrap'), f = collectPost(w); if (!f) return;
      Store.addSession({ date: f.date || D.today(), planId: null, title: f.title || Plan.KINDS[f.kind].label, kind: f.kind, minutes: f.minutes, rpe: f.rpe, pump: f.pump, fingerEnd: f.fingerEnd, hi: f.hi || 0, capMin: f.capMin || 0, sharp: f.sharp, board: f.board, improved: f.improved, learned: f.learned, why: f.why, hangs: [], color: null });
      closeSheet(w); render(); toast('Einheit gespeichert.');
    },
    'log-edit': (el) => {
      const s = S().sessions.find(x => x.id === el.dataset.id); if (!s) return;
      sheet(s.title, postForm(s, { edit: true, free: !s.planId, act: 'log-update', id: s.id }), { tall: true, mount: (w) => paintLoad(w) });
    },
    'log-update': (el) => {
      const w = el.closest('.sheet-wrap'), f = collectPost(w); if (!f) return;
      const patch = { minutes: f.minutes, rpe: f.rpe, pump: f.pump, fingerEnd: f.fingerEnd, hi: f.hi || 0, capMin: f.capMin || 0, sharp: f.sharp, board: f.board, improved: f.improved, learned: f.learned, why: f.why, color: f.color || null };
      if (f.title != null) { patch.title = f.title; patch.kind = f.kind; patch.date = f.date; }
      Store.updateSession(el.dataset.id, patch); $$('.sheet-wrap').forEach(closeSheet); render(); toast('Aktualisiert.');
    },
    'log-delete': (el) => { if (!confirm('Diese Einheit endgültig löschen?')) return; Store.removeSession(el.dataset.id); $$('.sheet-wrap').forEach(closeSheet); render(); },
    more: (el) => {
      const s = Plan.findPlan(el.dataset.plan);
      sheet(s.title, `<div class="form">${field('Auf anderen Tag verschieben', `<input type="date" name="to" value="${Plan.dateOf(s)}" min="${D.add(s.baseDate, -6)}" max="${D.add(s.baseDate, 6)}">`, 'Harte Fingertage brauchen mindestens 48 h Abstand.')}
        <button class="btn btn-primary btn-block" data-act="move-save" data-plan="${s.planId}">Verschieben</button>
        <button class="btn btn-ghost btn-block" data-act="skip" data-plan="${s.planId}">Diese Einheit auslassen</button>
        ${s.low ? `<p class="hint"><b>Statt auslassen – Low-Energy-Version:</b> ${e(s.low)}</p>` : ''}</div>`);
    },
    'move-save': (el) => { const w = el.closest('.sheet-wrap'), f = readForm(w); if (f.to) { S().moves[el.dataset.plan] = f.to; Store.save(); } closeSheet(w); render(); },
    skip: (el) => { S().skips[el.dataset.plan] = true; Store.save(); $$('.sheet-wrap').forEach(closeSheet); render(); },
    unskip: (el) => { delete S().skips[el.dataset.plan]; Store.save(); render(); },
    'plan-detail': (el) => {
      const s = Plan.findPlan(el.dataset.plan); if (!s) return;
      sheet(s.title, `<p class="focus">${e(s.focus)}</p><p class="meta">${e(D.long(Plan.dateOf(s)))} · ca. ${s.min} min · Ziel-RPE ${s.rpe[0]}–${s.rpe[1]}</p>
        ${s.blocks.map((b, i) => blockHTML(b, i, false)).join('')}
        ${s.low ? `<article class="card"><span class="eyebrow">Low-Energy-Version</span><p>${e(s.low)}</p></article>` : ''}
        <article class="card stop"><span class="eyebrow">Session beenden, wenn …</span><ul>${s.stop.map(x => `<li>${e(x)}</li>`).join('')}</ul></article>
        ${Store.sessionForPlan(s.planId) ? '' : `<button class="btn btn-primary btn-block" data-act="start" data-plan="${s.planId}">Session starten</button>`}`, { tall: true });
    },
    'skill-swap': (el) => {
      const w = Plan.weekAt(el.dataset.mon), cur = skillOfWeek(w);
      sheet('Technik-Fokus wählen', Object.keys(THEMES).map(t => { const l = LIB.skills.filter(s => s.theme === t); return l.length ? `<h3 class="list-h">${e(THEMES[t])}</h3>` + l.map(s => `<button class="link-row${cur && cur.id === s.id ? ' is-cur' : ''}" data-act="skill-set" data-mon="${w.monday}" data-id="${e(s.id)}"><span>${e(s.name_de)}</span><span>${s.levels.map(x => LEVELS[x][0]).join(' ')}</span></button>`).join('') : ''; }).join(''), { tall: true });
    }
  };
  A['skill-set'] = (el) => { S().skillOverride[el.dataset.mon] = el.dataset.id; Store.save(); closeSheet(el.closest('.sheet-wrap')); render(); };

  function hangSheet(i, reps) {
    const d = S().draft, b = Plan.findPlan(d.planId).blocks[i];
    const prev = S().sessions.slice().reverse().map(s => (s.hangs || []).find(h => h.grip === b.hang.grip && h.title === b.title)).find(Boolean);
    sheet(b.title + ' eintragen', `<div class="form"><p class="meta">${e(b.hang.grip)} · ${b.hang.edge} mm · ${b.hang.secs} s${prev ? ` · zuletzt ${prev.kg >= 0 ? '+' : ''}${prev.kg} kg bei RPE ${prev.rpe}` : ''}</p>
      <div class="grid2">${field('Zusatzlast in kg', `<input type="number" name="kg" step="0.25" value="${prev ? prev.kg : 30}" inputmode="decimal">`, 'Negativ = entlastet')}
      ${field('Sätze', `<input type="number" name="sets" min="1" max="10" value="${reps || b.hang.sets}" inputmode="numeric">`)}</div>
      ${field('RPE der Sätze', scale('rpe', 5, 10, null, { wide: true }), 'Ziel 7–8. Bei 9+ war die Last zu hoch.')}
      <button class="btn btn-primary btn-block" data-act="hang-save" data-i="${i}">Speichern</button></div>`);
  }

  document.addEventListener('click', (ev) => {
    const sb = ev.target.closest('.scale button:not([data-act])');
    if (sb) {
      const sc = sb.closest('.scale'), inp = $('input', sc);
      const same = inp.value === sb.dataset.v;
      $$('button', sc).forEach(b => b.setAttribute('aria-checked', 'false'));
      if (!same) { sb.setAttribute('aria-checked', 'true'); inp.value = sb.dataset.v; } else inp.value = '';
      if (sc.closest('#pre')) updateAdvice();
      const post = sc.closest('#post'); if (post) paintLoad(post.closest('.sheet-wrap') || post);
      return;
    }
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const fn = A[el.dataset.act] || UI.actions[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });
  document.addEventListener('input', (ev) => { const post = ev.target.closest('#post'); if (post && ev.target.name === 'minutes') paintLoad(post); });

  window.UI = { e, $, $$, S, LIB, GD, gd, LEVELS, THEMES, find, chip, kindChip, gdBadge, scale, field, readForm, toast, sheet, closeSheet, skillOfWeek, blockHTML, sessionCard, acwrCard, acwrProjection, postForm, render, nav, views, actions: {}, afterRender: {}, renderSession };
  document.addEventListener('DOMContentLoaded', () => { render(); if (S().draft) renderSession(); });
})();
