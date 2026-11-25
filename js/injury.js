/* Green Days — Verletzungs-Helfer: Beschwerde eingrenzen, Reha in Phasen (entlasten → beweglich → kräftigen → zurück
   an die Wand), Kletterregeln je Phase, Schmerzverlauf. Inhalte aus LIB.injury (The Climbing Doctor, Schöffl u. a.).
   Orientierung, keine Diagnose. */
(function () {
  'use strict';
  const { e, $, $$, S, LIB, field, readForm, toast, sheet, closeSheet, scale, clipHTML } = UI;
  const A = UI.actions;
  const DB = LIB.injury || { conditions: [], red_flags: [], finger_locations: [], self_check: [], pain_rules_de: [] };
  const HANDS = { L: 'links', R: 'rechts' };
  const FINGERS = { index: 'Zeigefinger', middle: 'Mittelfinger', ring: 'Ringfinger', pinky: 'kleiner Finger', thumb: 'Daumen' };
  const REGIONS = { finger: 'Finger', elbow: 'Ellbogen', shoulder: 'Schulter' };
  const cond = (id) => DB.conditions.find(c => c.id === id);
  const list = () => S().injuries || (S().injuries = []);
  const active = () => list().filter(i => !i.closed);
  const where = (i) => i.region === 'finger' ? `${FINGERS[i.finger] || 'Finger'} ${HANDS[i.hand] || ''}`.trim() : `${REGIONS[i.region] || ''} ${HANDS[i.hand] || ''}`.trim();
  const phaseOf = (i) => { const c = cond(i.cond); if (!c || !c.phases || !c.phases.length) return null; return c.phases[Math.max(0, Math.min(c.phases.length - 1, (i.phase || 1) - 1))]; };
  // Kurzfassung langer Regeltexte für die Session: die ersten Sätze bis ca. 260 Zeichen
  const brief = (t) => { if (t.length <= 260) return t; const parts = t.split(/(?<=[.!?])\s+/); let out = ''; for (const p of parts) { if (out && (out + ' ' + p).length > 260) break; out = out ? out + ' ' + p : p; } return out + ' …'; };
  const lastPain = (i) => i.pains && i.pains.length ? i.pains[i.pains.length - 1] : null;
  const doneToday = (i, exId) => !!((i.done || {})[D.today()] || {})[exId];

  // Hinweis aus dem Schmerzverlauf: zurück, halten oder bereit für die nächste Phase?
  function trend(i) {
    const p = i.pains || [], n = p.length; if (n < 2) return null;
    const cur = p[n - 1].v, prev = p[n - 2].v, days = D.diff(D.today(), i.phaseSince || i.since || D.today());
    if (cur >= 5 || cur - prev >= 2) return { tone: 'orange', text: 'Der Schmerz ist gestiegen. Dosis halbieren, heute nichts Neues – wenn es morgen nicht besser ist, eine Phase zurück.' };
    const c = cond(i.cond);
    if (n >= 3 && p.slice(-3).every(x => x.v <= 2) && days >= 5 && c && (i.phase || 1) < c.phases.length) return { tone: 'green', text: 'Drei ruhige Einträge in Folge. Prüf die Kriterien unten – du könntest bereit für die nächste Phase sein.' };
    return null;
  }

  // ---------- Karten ----------
  function exRow(i, x, live) {
    const d = doneToday(i, x.id);
    return `<div class="rx${d ? ' is-done' : ''}"><button class="check" data-act="inj-check" data-inj="${i.id}" data-ex="${e(x.id)}" aria-pressed="${d}" aria-label="Heute gemacht">${d ? '✓' : ''}</button>
      <button class="rx-main" data-act="inj-ex" data-inj="${i.id}" data-ex="${e(x.id)}"><b>${e(x.name_de)}</b><em>${e(x.dose_de || '')}${x.frequency_de ? ' · ' + e(x.frequency_de) : ''}</em></button>
      ${x.timer && x.timer.work ? `<button class="chip chip-btn" data-act="inj-timer" data-inj="${i.id}" data-ex="${e(x.id)}" aria-label="Timer">⏱</button>` : ''}</div>`;
  }
  function card(today) {
    if (!S().profile.onboarded) return '';
    const act = active();
    if (!act.length) {
      // wiederholte Fingersignale → Helfer anbieten
      const m = S().mornings, hot = [0, 1, 2, 3].filter(k => (m[D.add(today, -k)] || {}).pain >= 3).length >= 2;
      return hot ? `<article class="card"><span class="eyebrow">Deine Finger melden sich wiederholt</span><h3>Gezielt etwas dagegen tun?</h3><p class="hint">Im Physio-Tab kannst du eingrenzen, was es sein könnte, und dir passende Übungen ansehen. Dein Plan ändert sich dadurch nicht.</p><button class="btn btn-primary btn-block" data-act="nav" data-view="physio">Physio öffnen</button></article>` : '';
    }
    return act.map(i => {
      const c = cond(i.cond), ph = phaseOf(i), lp = lastPain(i), tr = trend(i), asked = lp && lp.date === today;
      if (!c || !ph) return '';
      return `<article class="card inj"><header class="card-head"><span class="eyebrow">Reha · ${e(where(i))}</span><span class="meta">Phase ${i.phase || 1}/${c.phases.length}</span></header>
        <h3>${e(c.name_de)}</h3><p class="focus">${e(ph.name_de)} – ${e(ph.goal_de || '')}</p>
        ${i.needsCheck ? '<p class="banner tone-red">Du hast ein Warnzeichen angegeben. Lass es untersuchen, bevor du die Belastung steigerst.</p>' : ''}
        ${asked ? '' : `<div class="form inj-pain">${field('Schmerz heute an dieser Stelle', scale('injpain_' + i.id, 0, 10, null, { ends: ['nichts', 'stark'] }))}<button class="btn btn-ghost btn-block" data-act="inj-pain" data-inj="${i.id}">Eintragen</button></div>`}
        ${tr ? `<p class="banner tone-${tr.tone}">${e(tr.text)}</p>` : ''}
        <span class="eyebrow">Heute</span>${(ph.exercises || []).map(x => exRow(i, x)).join('')}
        <div class="actions"><button class="btn btn-ghost" data-act="inj-open" data-inj="${i.id}">Plan, Kletterregeln & Verlauf</button></div></article>`;
    }).join('');
  }
  // Im Session-Modus: Regeln für heute + Reha-Block
  function sessionCard() {
    return active().map(i => { const c = cond(i.cond), ph = phaseOf(i); if (!c || !ph) return '';
      return `<article class="block bt-inj"><header><span class="num">+</span><h4>Reha: ${e(c.name_de)} · ${e(where(i))}</h4><span class="meta">Phase ${i.phase || 1}</span></header>
        <ul><li><b>Klettern heute:</b> ${e(brief(ph.climbing_de || ''))}</li></ul>${(ph.exercises || []).map(x => exRow(i, x)).join('')}
        <button class="link-row" data-act="inj-open" data-inj="${i.id}"><span>Alle Details</span><span>›</span></button></article>`; }).join('');
  }
  const linkButton = () => ''; // der Zugang ist jetzt der Physio-Tab

  // ---------- Neu anlegen ----------
  const chips = (name, cur, opts) => `<div class="chips pick"><input type="hidden" name="${name}" value="${cur == null ? '' : cur}">${opts.map(o => `<button type="button" class="chip chip-btn" data-act="inj-pick" data-v="${e(o[0])}" aria-pressed="${cur === o[0]}">${e(o[1])}</button>`).join('')}</div>`;
  const draft = { region: 'finger', hand: 'R', finger: 'ring', loc: '', cond: '', answers: {} };
  function suggest(d) { // einfache Punktwertung aus den Orientierungsfragen
    d = d || draft; const pts = {};
    (DB.self_check || []).forEach((q, qi) => { const a = d.answers[qi]; if (a == null) return; ((q.options[a] || {}).points_to || []).forEach(id => pts[id] = (pts[id] || 0) + 1); });
    if (d.loc) DB.conditions.forEach(c => { if ((c.locations || []).indexOf(d.loc) >= 0) pts[c.id] = (pts[c.id] || 0) + 1; });
    return Object.keys(pts).filter(id => { const c = cond(id); return c && c.region === d.region; }).sort((a, b) => pts[b] - pts[a]).slice(0, 2);
  }
  function newHTML() {
    const regs = Object.keys(REGIONS).filter(r => DB.conditions.some(c => c.region === r)).map(r => [r, REGIONS[r]]);
    const conds = DB.conditions.filter(c => c.region === draft.region), sug = suggest();
    const qs = (DB.self_check || []).map((q, qi) => ({ q, qi })).filter(x => x.q.options.some(o => (o.points_to || []).some(id => (cond(id) || {}).region === draft.region)));
    return `<div class="form" id="inj-new"><p class="hint">${e(DB.disclaimer_de || 'Orientierung, keine Diagnose. Bei Unsicherheit untersuchen lassen.')}</p>
      ${field('Wo?', chips('region', draft.region, regs))}
      ${field('Seite', chips('hand', draft.hand, [['L', 'links'], ['R', 'rechts']]))}
      ${draft.region === 'finger' ? field('Welcher Finger?', chips('finger', draft.finger, Object.keys(FINGERS).map(k => [k, FINGERS[k]]))) : ''}
      ${draft.region === 'finger' && (DB.finger_locations || []).length ? field('Wo genau?', `<select name="loc"><option value="">–</option>${DB.finger_locations.map(l => `<option value="${e(l.id)}"${draft.loc === l.id ? ' selected' : ''}>${e(l.name_de)}</option>`).join('')}</select>`, (DB.finger_locations.find(l => l.id === draft.loc) || {}).hint_de || 'Tippe die Stelle mit einem Finger der anderen Hand ab.') : ''}
      ${qs.length ? `<details class="more"${draft.cond && !Object.keys(draft.answers).length ? '' : ' open'}><summary>Nicht sicher, was es ist? Kurze Fragen</summary>${qs.map(x => field(x.q.question_de, `<select name="q_${x.qi}" data-num><option value="">–</option>${x.q.options.map((o, oi) => `<option value="${oi}"${draft.answers[x.qi] === oi ? ' selected' : ''}>${e(o.label_de)}</option>`).join('')}</select>`)).join('')}
        ${sug.length ? `<p class="banner tone-yellow"><b>Am ehesten passt:</b> ${sug.map(id => e(cond(id).name_de)).join(' oder ')}. Das ist eine Orientierung aus deinen Antworten, keine Diagnose.</p>` : ''}</details>` : ''}
      ${field('Was ist es?', `<select name="cond"><option value="">– wählen –</option>${conds.map(c => `<option value="${e(c.id)}"${(draft.cond || sug[0]) === c.id ? ' selected' : ''}>${e(c.name_de)}</option>`).join('')}</select>`)}
      ${field('Schmerz im Moment', scale('pain', 0, 10, draft.pain == null ? null : draft.pain, { ends: ['nichts', 'stark'] }))}
      ${field('Seit wann?', `<input type="date" name="since" value="${draft.since || D.today()}" max="${D.today()}">`)}
      <span class="eyebrow">Trifft etwas davon zu?</span>
      ${(DB.red_flags || []).map((r, ri) => `<label class="toggle"><input type="checkbox" name="rf_${ri}" ${draft['rf_' + ri] ? 'checked' : ''}><span>${e(r.sign_de)}</span></label>`).join('')}
      <label class="toggle plan-switch"><input type="checkbox" name="plan" ${draft.plan ? 'checked' : ''}><span>Trainingsplan an die Verletzung anpassen</span></label>
      <p class="hint">Aus (Standard): Dein Plan bleibt genau wie er ist, du bekommst nur Verlauf und Reha-Übungen. An: Sessions werden gekürzt, bei Fingerverletzungen fallen Max Hangs weg.</p>
      <button class="btn btn-primary btn-block" data-act="inj-save">Verfolgen starten</button></div>`;
  }
  const readDraft = (w) => { const f = readForm(w); ['region', 'hand', 'finger', 'loc', 'cond', 'pain', 'since', 'plan'].forEach(k => { if (f[k] !== undefined) draft[k] = f[k]; }); Object.keys(f).forEach(k => { if (k.indexOf('q_') === 0) draft.answers[k.slice(2)] = f[k]; if (k.indexOf('rf_') === 0) draft[k] = f[k]; }); };
  const repaint = (w) => { const b = $('.sheet-body', w), top = b.scrollTop; b.innerHTML = newHTML(); b.scrollTop = top; };
  A['inj-new'] = (el) => { const ds = (el && el.dataset) || {}, from = el && el.closest ? el.closest('.sheet-wrap') : null; if (from) closeSheet(from);
    Object.assign(draft, { cond: ds.c || '', loc: ds.loc || '', answers: {}, pain: null, since: null, plan: false }); if (ds.region) draft.region = ds.region; Object.keys(draft).forEach(k => { if (k.indexOf('rf_') === 0) delete draft[k]; }); sheet('Reha verfolgen', newHTML(), { tall: true, mount: (w) => w.addEventListener('change', () => { const before = draft.region; readDraft(w); if (draft.region !== before) draft.cond = ''; repaint(w); }) }); };
  A['inj-pick'] = (el) => { const box = el.parentNode, w = el.closest('.sheet-wrap'); $('input', box).value = el.dataset.v; readDraft(w); if ($('input', box).name === 'region') { draft.cond = ''; draft.answers = {}; } repaint(w); };
  A['inj-save'] = (el) => {
    const w = el.closest('.sheet-wrap'); readDraft(w);
    if (!draft.cond) { toast('Bitte wählen, was es ist – oder die kurzen Fragen beantworten.'); return; }
    const flags = (DB.red_flags || []).filter((r, ri) => draft['rf_' + ri]);
    const inj = { id: Store.uid(), cond: draft.cond, region: draft.region, hand: draft.hand, finger: draft.region === 'finger' ? draft.finger : null, loc: draft.loc || null, since: draft.since || D.today(), created: D.today(), phase: 1, phaseSince: D.today(),
      pains: draft.pain != null ? [{ date: D.today(), v: draft.pain }] : [], done: {}, plan: !!draft.plan, needsCheck: flags.length > 0, flags: flags.map(r => r.sign_de), closed: null };
    list().push(inj); Store.save(); closeSheet(w); UI.render();
    setTimeout(() => A['inj-open']({ dataset: { inj: inj.id } }), 210);
  };

  // ---------- Detail ----------
  const byId = (id) => list().find(i => i.id === id);
  const ul = (title, arr, cls) => arr && arr.length ? `<h4 class="sec-h">${e(title)}</h4><ul class="${cls || 'points'}">${arr.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : '';
  // Hintergrundwissen zu einer Beschwerde (Detail und Physio-Tab)
  const more = (c) => `${(c.grades || []).length ? `<details class="more"><summary>Schweregrade</summary>${c.grades.map(g => `<div class="drill"><b>${e(g.name_de || g.id)}</b><p>${e(g.signs_de || '')}</p><p>${e(g.management_de || '')}</p><span class="meta">${e(g.timeline_de || '')}</span></div>`).join('')}</details>` : ''}
      <details class="more"><summary>Typische Zeichen – und was dagegen spricht</summary>${ul('Typisch', c.typical_signs_de)}${ul('Eher etwas anderes, wenn', c.not_this_if_de, 'points not')}<p class="meta">${e(c.mechanism_de || '')}</p></details>
      <details class="more"><summary>Wann untersuchen lassen</summary>${ul('', c.see_professional_de)}${ul('Allgemeine Warnzeichen', (DB.red_flags || []).map(r => r.sign_de + ' → ' + r.action_de))}</details>
      <details class="more"><summary>Damit es nicht wiederkommt</summary>${ul('', c.prevention_de)}</details>
      <details class="more"><summary>Wie belastbar ist das?</summary><p>${e(c.evidence_de || '')}</p><p class="src">Quellen: ${(c.sources || []).map(u => `<a href="${e(u)}" target="_blank" rel="noopener">${e(String(u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(' · ')}</p></details>`;
  A['inj-open'] = (el) => {
    const i = byId(el.dataset.inj); if (!i) return; const c = cond(i.cond), ph = phaseOf(i); if (!c || !ph) { toast('Zu dieser Beschwerde fehlen die Daten.'); return; }
    const tr = trend(i), n = i.phase || 1, days = D.diff(D.today(), i.phaseSince || i.since);
    const flags = (i.flags || []).map(s => (DB.red_flags || []).find(r => r.sign_de === s)).filter(Boolean);
    sheet(c.name_de, `<p class="meta">${e(where(i))} · seit ${e(D.fmt(i.since, { day: 'numeric', month: 'short' }))}</p>
      ${i.needsCheck ? `<div class="banner tone-red"><b>Bitte untersuchen lassen.</b> ${flags.map(r => e(r.sign_de) + ': ' + e(r.action_de)).join(' ')}</div>` : ''}
      <p class="lead">${e(c.what_de || '')}</p>
      <article class="card"><header class="card-head"><h3>Schmerzverlauf</h3><span class="meta">0–10</span></header><div id="ch-inj"></div>
        <div class="form inj-pain">${field('Schmerz heute', scale('injpain_' + i.id, 0, 10, (lastPain(i) && lastPain(i).date === D.today()) ? lastPain(i).v : null, { ends: ['nichts', 'stark'] }))}<button class="btn btn-ghost btn-block" data-act="inj-pain" data-inj="${i.id}">Eintragen</button></div>
        ${tr ? `<p class="banner tone-${tr.tone}">${e(tr.text)}</p>` : ''}</article>
      <div class="phase-steps">${c.phases.map((p, k) => `<span class="${k + 1 < n ? 'past' : k + 1 === n ? 'now' : ''}"><i>${k + 1}</i>${e(p.name_de)}</span>`).join('')}</div>
      <article class="card goal-now"><span class="eyebrow">Phase ${n} von ${c.phases.length} · Tag ${Math.max(1, days + 1)}</span><h3>${e(ph.name_de)}</h3><p>${e(ph.goal_de || '')}</p>
        ${ph.duration_de ? `<p class="meta">Üblich: ${e(ph.duration_de)}</p>` : ''}
        <h4 class="sec-h">Klettern in dieser Phase</h4><p>${e(ph.climbing_de || '')}</p>
        <h4 class="sec-h">Übungen</h4>${(ph.exercises || []).map(x => exRow(i, x)).join('')}
        <h4 class="sec-h">Weiter, wenn</h4><p>${e(ph.exit_de || '')}</p>
        <div class="actions">${n < c.phases.length ? `<button class="btn btn-primary" data-act="inj-phase" data-inj="${i.id}" data-d="1">Kriterien erfüllt – nächste Phase</button>` : `<button class="btn btn-primary" data-act="inj-close" data-inj="${i.id}">Ausgeheilt – abschließen</button>`}
          ${n > 1 ? `<button class="btn btn-ghost" data-act="inj-phase" data-inj="${i.id}" data-d="-1">Phase zurück</button>` : ''}</div></article>
      <article class="card"><span class="eyebrow">Trainingsplan</span><h3>${i.plan ? 'Plan wird angepasst' : 'Plan bleibt unverändert'}</h3>
        <p class="hint">${i.plan ? 'Sessions werden wegen dieser Verletzung gekürzt' + (i.region === 'finger' ? ', Max Hangs fallen in den frühen Phasen weg.' : '.') : 'Dieser Eintrag ändert nichts an deinen Sessions. Du siehst nur den Reha-Block und den Verlauf.'}</p>
        <button class="btn btn-ghost btn-block" data-act="inj-plan" data-inj="${i.id}">${i.plan ? 'Plan nicht mehr anpassen' : 'Plan an die Verletzung anpassen'}</button></article>
      ${ul('Grundregeln für die Belastung', DB.pain_rules_de)}
      ${more(c)}
      ${i.needsCheck ? `<p class="banner tone-red">Du hast ein Warnzeichen angegeben – siehe „Wann untersuchen lassen“.</p>` : ''}
      <p class="hint">${e(DB.disclaimer_de || '')}</p>
      <button class="btn btn-danger btn-block" data-act="inj-del" data-inj="${i.id}">Eintrag löschen</button>`, {
      tall: true, mount: (w) => {
        const pts = (i.pains || []).slice(-30).map(p => ({ x: D.fmt(p.date), y: p.v }));
        if (pts.length >= 2) Charts.line($('#ch-inj', w), { points: pts, yMin: 0, yMax: 10, ticks: [0, 3, 10], refs: [{ y: 3 }], dots: true, height: 130, fmt: v => String(Math.round(v)), label: 'Schmerzverlauf' });
        else $('#ch-inj', w).innerHTML = '<p class="empty">Trag den Schmerz täglich kurz ein – ab zwei Einträgen siehst du hier den Verlauf.</p>';
      }
    });
  };
  const refresh = (el, id) => { const w = el.closest('.sheet-wrap'); UI.render(); if (S().draft && !$('#session').hidden) UI.renderSession(); if (w) { closeSheet(w); if (id) setTimeout(() => A['inj-open']({ dataset: { inj: id } }), 210); } };
  A['inj-pain'] = (el) => {
    const i = byId(el.dataset.inj), box = el.closest('.inj-pain'), v = readForm(box)['injpain_' + i.id];
    if (v == null) { toast('Wert wählen.'); return; }
    const lp = lastPain(i); if (lp && lp.date === D.today()) lp.v = v; else (i.pains = i.pains || []).push({ date: D.today(), v });
    Store.save(); toast(v >= 5 ? 'Notiert. Heute nur Phase-1-Übungen, kein hartes Greifen.' : 'Notiert.'); refresh(el, el.closest('.sheet-wrap') ? i.id : null);
  };
  A['inj-check'] = (el) => { const i = byId(el.dataset.inj), t = D.today(); i.done = i.done || {}; i.done[t] = i.done[t] || {}; i.done[t][el.dataset.ex] = !i.done[t][el.dataset.ex]; Store.save(); const on = i.done[t][el.dataset.ex]; el.setAttribute('aria-pressed', String(on)); el.textContent = on ? '✓' : ''; el.parentNode.classList.toggle('is-done', on); };
  const findEx = (i, exId) => { const c = cond(i.cond); let x = null; (c.phases || []).forEach(p => (p.exercises || []).forEach(y => { if (y.id === exId && (!x || p.n === (i.phase || 1))) x = y; })); return x; };
  // timerAttrs: data-Attribute für den Timer-Knopf (mit Eintrag: inj-timer, nur ansehen: phy-timer)
  function exSheet(x, timerAttrs) {
    sheet(x.name_de, `${clipHTML(x)}<p><b>Dosis:</b> ${e(x.dose_de || '')}${x.frequency_de ? ' · ' + e(x.frequency_de) : ''}</p>
      ${x.pain_limit_de ? `<p class="banner tone-yellow"><b>Schmerzgrenze:</b> ${e(x.pain_limit_de)}</p>` : ''}
      <h4 class="sec-h">So geht’s</h4><ul class="steps">${(Array.isArray(x.how_de) ? x.how_de : [x.how_de]).filter(Boolean).map(s => `<li>${e(s)}</li>`).join('')}</ul>
      ${x.timer && x.timer.work ? `<button class="btn btn-primary btn-block" ${timerAttrs}>⏱ Timer starten</button>` : ''}
      ${x.video && x.video.url ? `<a class="video-link" href="${e(x.video.url)}" target="_blank" rel="noopener">Ganzes Video: ${e(x.video.title || 'YouTube')} ↗</a>` : ''}`);
  }
  function runTimer(x, onDone) { const t0 = x.timer, flat = (t0.reps || 1) === 1 && (t0.sets || 1) > 1, t = flat ? { work: t0.work, rest: t0.rest, reps: t0.sets, sets: 1 } : t0; /* 3 × 45 s = drei Durchgänge mit der angegebenen Pause */
    Timer.open({ label: x.name_de, prep: 5, work: t.work, rest: t.rest || 0, reps: t.reps || 1, sets: t.sets || 1, setRest: t.setRest || 60, showSets: (t.sets || 1) > 1, workName: 'Halten', repName: 'Wdh.' }, { onDone: onDone || (() => {}) }); }
  A['inj-ex'] = (el) => { const i = byId(el.dataset.inj), x = i && findEx(i, el.dataset.ex); if (!x) return; exSheet(x, `data-act="inj-timer" data-inj="${i.id}" data-ex="${e(x.id)}"`); };
  A['inj-timer'] = (el) => { const i = byId(el.dataset.inj), x = i && findEx(i, el.dataset.ex); if (!x || !x.timer) return; runTimer(x, (res) => { if (res.finished) { const d = D.today(); i.done = i.done || {}; i.done[d] = i.done[d] || {}; i.done[d][x.id] = true; Store.save(); UI.render(); } }); };
  A['inj-plan'] = (el) => { const i = byId(el.dataset.inj); if (!i) return; i.plan = !i.plan; Store.save(); toast(i.plan ? 'Der Plan wird ab jetzt an die Verletzung angepasst.' : 'Der Plan bleibt unverändert.'); refresh(el, i.id); };
  A['inj-phase'] = (el) => { const i = byId(el.dataset.inj), c = cond(i.cond); i.phase = Math.max(1, Math.min(c.phases.length, (i.phase || 1) + (+el.dataset.d))); i.phaseSince = D.today(); Store.save(); toast(+el.dataset.d > 0 ? 'Nächste Phase. Steigere nur eine Sache auf einmal.' : 'Eine Phase zurück – das ist kein Rückschritt, sondern Steuerung.'); refresh(el, i.id); };
  A['inj-close'] = (el) => { const i = byId(el.dataset.inj); i.closed = D.today(); Store.save(); toast('Abgeschlossen. Die Vorbeuge-Punkte bleiben wichtig.'); refresh(el, null); };
  A['inj-del'] = (el) => { if (!el.dataset.sure) { el.dataset.sure = '1'; el.textContent = 'Wirklich löschen?'; return; } S().injuries = list().filter(i => i.id !== el.dataset.inj); Store.save(); refresh(el, null); };

  // Signal für die Session-Anpassung
  function signal(date) {
    let out = null;
    active().forEach(i => {
      if (!i.plan) return; // Standard: Einträge beeinflussen den Plan nicht
      const c = cond(i.cond), lp = lastPain(i); if (!c) return;
      const pain = lp && D.diff(date, lp.date) <= 2 ? lp.v : 0, phase = i.phase || 1;
      const s = { region: i.region, phase, pain, name: c.name_de, where: where(i), phases: c.phases.length };
      if (!out || s.phase < out.phase || s.pain > out.pain) out = s;
    });
    return out;
  }

  // ---------- Physio-Tab: Übungen ansehen, ohne etwas anzulegen ----------
  const pv = { region: 'finger', loc: '', answers: {}, ask: false, phase: {} };
  const regions = () => Object.keys(REGIONS).filter(r => DB.conditions.some(c => c.region === r)).map(r => [r, REGIONS[r]]);
  const pchips = (k, cur, opts) => `<div class="chips pick">${opts.map(o => `<button type="button" class="chip chip-btn" data-act="phy-pick" data-k="${k}" data-v="${e(o[0])}" aria-pressed="${cur === o[0]}">${e(o[1])}</button>`).join('')}</div>`;
  UI.views.physio = () => {
    const sug = suggest(pv), hit = (c) => sug.indexOf(c.id) >= 0 || (pv.loc && (c.locations || []).indexOf(pv.loc) >= 0);
    const conds = DB.conditions.filter(c => c.region === pv.region).sort((a, b) => (sug.indexOf(a.id) < 0 ? 9 : sug.indexOf(a.id)) - (sug.indexOf(b.id) < 0 ? 9 : sug.indexOf(b.id)) || hit(b) - hit(a));
    const qs = (DB.self_check || []).map((q, qi) => ({ q, qi })).filter(x => x.q.options.some(o => (o.points_to || []).some(id => (cond(id) || {}).region === pv.region)));
    const loc = (DB.finger_locations || []).find(l => l.id === pv.loc), mine = active();
    return `<div class="date-head"><h1>Physio</h1></div>
      <p class="hint">Übungen und Reha-Wissen zum Nachschauen. Hier auswählen ändert nichts an deinem Plan und speichert nichts.</p>
      ${mine.length ? `<span class="eyebrow">Was ich verfolge</span>${card(D.today())}` : ''}
      <article class="card"><span class="eyebrow">Wo tut es weh?</span>${pchips('region', pv.region, regions())}
        ${pv.region === 'finger' && (DB.finger_locations || []).length ? `<span class="eyebrow">Wo genau am Finger?</span>${pchips('loc', pv.loc, DB.finger_locations.map(l => [l.id, l.name_de]))}${loc && loc.hint_de ? `<p class="hint">${e(loc.hint_de)}</p>` : ''}` : ''}
        ${qs.length ? `<details class="more" id="phy-ask"${pv.ask ? ' open' : ''}><summary>Nicht sicher, was es ist? Kurze Fragen</summary><div class="form">${qs.map(x => field(x.q.question_de, `<select name="pq_${x.qi}"><option value="">–</option>${x.q.options.map((o, oi) => `<option value="${oi}"${pv.answers[x.qi] === oi ? ' selected' : ''}>${e(o.label_de)}</option>`).join('')}</select>`)).join('')}</div></details>` : ''}
        ${sug.length ? `<p class="banner tone-yellow"><b>Am ehesten passt:</b> ${sug.map(id => e(cond(id).name_de)).join(' oder ')}. Orientierung, keine Diagnose.</p>` : ''}</article>
      <span class="eyebrow">Übungen ansehen für</span>
      <div class="phy-list">${conds.map(c => `<button class="lib-card${hit(c) ? ' is-hit' : ''}" data-act="phy-open" data-c="${e(c.id)}"><span><b>${e(c.name_de)}</b><em>${hit(c) ? 'passt zu deiner Auswahl · ' : ''}${c.phases.length} Phasen · ${c.phases.reduce((n, p) => n + (p.exercises || []).length, 0)} Übungen</em></span><span class="meta">›</span></button>`).join('')}</div>
      <p class="hint">${e(DB.disclaimer_de || 'Orientierung, keine Diagnose. Bei Unsicherheit untersuchen lassen.')}</p>`;
  };
  A['phy-pick'] = (el) => { const k = el.dataset.k, v = el.dataset.v; if (k === 'region') { if (pv.region !== v) { pv.loc = ''; pv.answers = {}; } pv.region = v; } else pv[k] = pv[k] === v ? '' : v; pv.ask = !!(($('#phy-ask') || {}).open); UI.render(); };
  $('#view').addEventListener('change', (ev) => { const n = ev.target && ev.target.name; if (!n || n.indexOf('pq_') !== 0) return; const k = n.slice(3); if (ev.target.value === '') delete pv.answers[k]; else pv.answers[k] = Number(ev.target.value); pv.ask = true; UI.render(); });
  const vRow = (c, n, x) => `<div class="rx rx-view"><button class="rx-main" data-act="phy-ex" data-c="${e(c.id)}" data-p="${n}" data-ex="${e(x.id)}"><b>${e(x.name_de)}</b><em>${e(x.dose_de || '')}${x.frequency_de ? ' · ' + e(x.frequency_de) : ''}</em></button>
      ${x.timer && x.timer.work ? `<button class="chip chip-btn" data-act="phy-timer" data-c="${e(c.id)}" data-p="${n}" data-ex="${e(x.id)}" aria-label="Timer">⏱</button>` : ''}</div>`;
  function viewHTML(c) {
    const n = Math.max(1, Math.min(c.phases.length, pv.phase[c.id] || 1)), ph = c.phases[n - 1], tracked = active().some(i => i.cond === c.id);
    return `<p class="lead">${e(c.what_de || '')}</p>
      <div class="seg" role="tablist">${c.phases.map((p, k) => `<button role="tab" aria-selected="${k + 1 === n}" data-act="phy-phase" data-c="${e(c.id)}" data-p="${k + 1}">Phase ${k + 1}</button>`).join('')}</div>
      <article class="card goal-now"><span class="eyebrow">Phase ${n} von ${c.phases.length}</span><h3>${e(ph.name_de)}</h3><p>${e(ph.goal_de || '')}</p>
        ${ph.duration_de ? `<p class="meta">Üblich: ${e(ph.duration_de)}</p>` : ''}
        <h4 class="sec-h">Übungen</h4>${(ph.exercises || []).length ? ph.exercises.map(x => vRow(c, n, x)).join('') : '<p class="empty">In dieser Phase gibt es keine eigenen Übungen.</p>'}
        <h4 class="sec-h">Klettern in dieser Phase</h4><p>${e(ph.climbing_de || '')}</p>
        ${ph.enter_de ? `<h4 class="sec-h">Passt, wenn</h4><p>${e(ph.enter_de)}</p>` : ''}
        <h4 class="sec-h">Weiter, wenn</h4><p>${e(ph.exit_de || '')}</p></article>
      ${ul('Grundregeln für die Belastung', DB.pain_rules_de)}
      ${more(c)}
      <p class="hint">Nur ansehen: Nichts hiervon ändert deinen Plan. ${tracked ? 'Du verfolgst diese Beschwerde bereits – siehe oben im Physio-Tab.' : 'Wenn du den Schmerzverlauf festhalten und die Übungen als Reha-Block in deinen Sessions sehen willst, kannst du die Beschwerde verfolgen.'}</p>
      ${tracked ? '' : `<button class="btn btn-ghost btn-block" data-act="inj-new" data-c="${e(c.id)}" data-region="${e(c.region)}" data-loc="${e(pv.loc && (c.locations || []).indexOf(pv.loc) >= 0 ? pv.loc : '')}">Diese Beschwerde verfolgen</button>`}`;
  }
  A['phy-open'] = (el) => { const c = cond(el.dataset.c); if (c) sheet(c.name_de, viewHTML(c), { tall: true }); };
  A['phy-phase'] = (el) => { const c = cond(el.dataset.c), b = el.closest('.sheet-body'); if (!c || !b) return; pv.phase[c.id] = +el.dataset.p; b.innerHTML = viewHTML(c); b.scrollTop = 0; };
  const viewEx = (el) => { const c = cond(el.dataset.c), ph = c && c.phases[(+el.dataset.p || 1) - 1]; return ph ? (ph.exercises || []).find(x => x.id === el.dataset.ex) : null; };
  A['phy-ex'] = (el) => { const x = viewEx(el); if (x) exSheet(x, `data-act="phy-timer" data-c="${e(el.dataset.c)}" data-p="${e(el.dataset.p)}" data-ex="${e(x.id)}"`); };
  A['phy-timer'] = (el) => { const x = viewEx(el); if (x && x.timer) runTimer(x); };

  window.Injury = { card, sessionCard, linkButton, signal, active };
})();
