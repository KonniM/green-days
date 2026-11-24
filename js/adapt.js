/* Green Days — Anpassung an dein tatsächliches Training.
   1) Last schätzen: aus der Zahl deiner Climbs statt aus Minuten; gemessene Sessions kalibrieren die Schätzung.
   2) Sessions anpassen: Fingerstatus, ACWR, Extra-Sessions, Green-Day-Verlauf und dein übliches Pensum
      ergeben einen Faktor (0,5–1,15) für den Umfang der heutigen Einheit. Nie mehr als +10–15 %. */
(function () {
  'use strict';
  const S = () => Store.s;
  const mid = (v) => Array.isArray(v) ? (v[0] + v[1]) / 2 : v;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HARD = { strength: 1, limit: 1, power: 1, sim: 1, perf: 1, outdoor: 1, test: 1, pe: 1, primer: 1 };
  // Startwerte, bis eigene Daten da sind: Minuten pro Climb inkl. Pausen
  const PER_CLIMB = { outdoor: 9, gym: 5, limit: 7, power: 6, strength: 6, submax: 1.5, arc: 3, skill: 4, other: 5 };
  const BASE_MIN = 20; // Aufwärmen bei freien Einheiten

  // ---------- Last schätzen ----------
  // s = (ggf. skalierte) Plan-Session, cnt = { blockIndex: erledigte Anzahl }
  function est(s, cnt) {
    let min = 0, climbs = 0, capSec = 0, rs = 0, rn = 0, plan = 0;
    s.blocks.forEach((b, i) => {
      let r = 1;
      if (b.count) {
        const p = Math.round(mid(b.count.n)), done = cnt && cnt[i] != null ? cnt[i] : p;
        r = p ? done / p : 1; rs += r; rn++;
        if (Store.CLIMB_UNITS[b.count.unit]) { climbs += done; plan += p; }
        if (b.t === 'cap') capSec += done * (b.count.sec || 0);
      }
      min += (b.min || 0) * (b.count ? 0.15 + 0.85 * Math.min(2, r) : 1);
    });
    const pace = Store.learned('pace', s.kind);
    return { raw: Math.round(min), minutes: Math.round(min * (pace ? pace.v : 1)), climbs, planClimbs: plan, capMin: Math.round(capSec / 60), ratio: rn ? rs / rn : 1, calibrated: pace ? pace.n : 0 };
  }
  // Dauer: gemessen, wenn die Session live in der App lief und plausibel ist – sonst geschätzt.
  function duration(s, cnt, startedAt, endedAt) {
    const e = est(s, cnt);
    const el = startedAt && endedAt ? (endedAt - startedAt) / 60000 : 0;
    if (el >= Math.max(15, e.raw * 0.5) && el <= e.raw * 1.7) return Object.assign(e, { minutes: Math.round(el), src: 'm' });
    return Object.assign(e, { src: 'e' });
  }
  function freeMinutes(kind, climbs) {
    const l = Store.learned('perClimb', kind);
    return Math.round(BASE_MIN + (climbs || 0) * (l ? l.v : (PER_CLIMB[kind] || 5)));
  }
  // Nach dem Speichern: Kalibrierung aktualisieren
  function learnFrom(log, e) {
    if (log.kind === 'mobility') return;
    if (e && e.src === 'm' && e.raw > 0) Store.learn('pace', log.kind, clamp(log.minutes / e.raw, 0.6, 1.6));
    if (e && e.planClimbs > 0 && log.adaptF != null && !log.adaptT) Store.learn('ratio', log.kind, clamp((e.ratio || 1) * (log.adaptF || 1), 0.4, 1.5));
    if (!log.planId && log.minSrc === 'u' && log.climbs > 0 && log.minutes > BASE_MIN) Store.learn('perClimb', log.kind, clamp((log.minutes - BASE_MIN) / log.climbs, 0.5, 20));
  }

  // ---------- Signale ----------
  function finger(date) {
    const m = S().mornings[date];
    if (m) return { v: m.pain || 0, src: 'Finger heute Morgen' };
    let v = 0, src = '';
    const y = S().mornings[D.add(date, -1)];
    if (y && y.pain > v) { v = y.pain; src = 'Finger gestern Morgen'; }
    S().sessions.forEach(s => { const d = D.diff(date, s.date); if (s.kind !== 'mobility' && d >= 0 && d <= 2 && s.fingerEnd > v) { v = s.fingerEnd; src = 'Finger nach der letzten Session'; } });
    const inj = window.Injury ? Injury.signal(date) : null;
    if (inj && inj.region === 'finger' && inj.pain > v) { v = inj.pain; src = 'Schmerz an der verletzten Stelle'; }
    return { v, src };
  }
  const real = () => S().sessions.filter(s => s.kind !== 'mobility');
  function weekExtra(date) {
    const mon = D.monday(date); let extra = 0;
    real().forEach(s => {
      if (s.date < mon || s.date > date) return;
      const load = Store.sessionLoad(s);
      if (!s.planId) extra += load;
      else { const p = Plan.findPlan(s.planId); if (p) extra += Math.max(0, load - Plan.plannedLoad(p) * 1.1); }
    });
    return Math.round(extra);
  }
  function remainingPlanned(date) {
    const sun = D.add(D.monday(date), 6); let sum = 0;
    for (let d = date; d <= sun; d = D.add(d, 1)) Plan.plannedOn(d).forEach(s => { if (!s.optional && !S().skips[s.planId] && !Store.sessionForPlan(s.planId)) sum += Plan.plannedLoad(s); });
    return sum;
  }

  // ---------- Faktor für eine geplante Session ----------
  const num = (v, d) => v.toFixed(d == null ? 2 : d).replace('.', ',');
  function factor(s, date, pre) {
    const out = { f: 1, reasons: [], noHard: false };
    if (!s || s.kind === 'mobility') return out;
    const why = (tone, text, transient) => { out.reasons.push({ tone, text }); if (transient !== false && tone === 'down') out.transient = true; };
    const w = Plan.weekAt(s.baseDate), easyWeek = w && (w.week.deload || w.week.test);
    let f = 1;

    // 1) Dein übliches Pensum bei dieser Art Session
    const pr = Store.learned('ratio', s.kind, 2);
    if (pr && Math.abs(pr.v - 1) >= 0.07) {
      const k = clamp(1 + 0.6 * (pr.v - 1), 0.8, 1.1);
      f *= k; why(k < 1 ? 'down' : 'up', `Du schaffst bei dieser Einheit im Schnitt ${Math.round(pr.v * 100)} % des Plans – das Ziel ist daran angepasst.`, false);
    }
    // 2) Bereit für mehr? Zwei Green Days in Folge bei dieser Art, RPE im Rahmen
    let fg = finger(date);
    if (pre && pre.finger != null && pre.finger >= fg.v) fg = { v: pre.finger, src: 'Finger vor der Session' };
    const same = real().filter(x => x.kind === s.kind && x.planId && x.date < date).sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 2);
    const a0 = Store.acwr(date, { [date]: Plan.plannedLoad(s) });
    if (!easyWeek && same.length === 2 && same.every(x => x.color === 'green' && x.rpePlan && x.rpe <= x.rpePlan[1]) && fg.v <= 1 && (a0.ratio == null || a0.ratio <= 1.2)) {
      const easy = same.every(x => x.rpe <= (x.rpePlan[0] + x.rpePlan[1]) / 2);
      f *= easy ? 1.1 : 1.05; why('up', `Zwei Green Days in Folge bei dieser Einheit${easy ? ' und RPE unter dem Ziel' : ''} – ${easy ? '+10' : '+5'} % Umfang.`);
    }
    // 3) Finger
    if (fg.v >= 5) { f = Math.min(f, 0.6); out.noHard = true; why('down', `${fg.src}: ${fg.v}/10 – keine harten Fingerreize heute, Umfang deutlich runter.`); }
    else if (fg.v >= 3) { f = Math.min(f, 0.8); out.noHard = !!HARD[s.kind]; why('down', `${fg.src}: ${fg.v}/10 – Umfang −20 %, nichts steigern.`); }
    if (pre && pre.recovery != null && pre.recovery <= 2) { f = Math.min(f, 0.8); why('down', 'Wenig erholt – Umfang −20 %, Qualität vor Menge.'); }
    else if (pre && pre.energy != null && pre.energy <= 2) { f = Math.min(f, 0.9); why('down', 'Wenig Energie – Umfang −10 %. Wird es nach dem Aufwärmen nicht besser, weiter kürzen.'); }
    // 3b) Aktive Verletzung aus dem Verletzungs-Helfer
    const inj = window.Injury ? Injury.signal(date) : null;
    if (inj) {
      const fingerInj = inj.region === 'finger';
      if (inj.phase <= 1) { f = Math.min(f, 0.7); out.noHard = true; out.noHang = fingerInj; why('down', `Reha Phase 1 (${inj.name}, ${inj.where}): ${fingerInj ? 'keine Max Hangs, keine harten Fingerreize' : 'kein hartes Ziehen'}, Umfang −30 %. Die Kletterregeln stehen im Reha-Block.`); }
      else if (inj.phase < inj.phases) { f = Math.min(f, 0.85); if (HARD[s.kind]) out.noHard = true; out.noHang = fingerInj && inj.pain >= 3; why('down', `Reha Phase ${inj.phase} (${inj.name}): Umfang −15 %, harte Züge nur schmerzfrei.`); }
    }
    // 4) Green-Day-Verlauf
    const rated = real().filter(x => x.color && x.date < date).sort((a, b) => a.date < b.date ? 1 : -1);
    if (rated[0] && D.diff(date, rated[0].date) <= 7) {
      const c = rated[0].color;
      if (c === 'red' || c === 'black') { f = Math.min(f, 0.6); why('down', 'Letzte Einheit war Red/Black – erst raus aus dem Erholungsloch, dann wieder aufbauen.'); }
      else if (c === 'orange') { const two = rated[1] && rated[1].color === 'orange'; f = Math.min(f, two ? 0.7 : 0.85); why('down', two ? 'Zwei Orange Days in Folge – du trainierst müde. Umfang −30 %.' : 'Letzte Einheit war Orange (zu müde trainiert) – Umfang −15 %.'); }
    }
    // 5) Wiedereinstieg nach Pause
    const last = real().filter(x => x.date < date).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    if (last && S().profile.trackingStart) {
      const gap = D.diff(date, last.date);
      if (gap >= 21) { f = Math.min(f, 0.6); why('down', `${gap} Tage Pause – Wiedereinstieg mit 60 %, dann 10–15 % pro Woche steigern.`); }
      else if (gap >= 10) { f = Math.min(f, 0.75); why('down', `${gap} Tage Pause – Wiedereinstieg mit 75 %.`); }
    }
    // 6) Harte Extra-Session gestern
    const yest = real().filter(x => x.date === D.add(date, -1) && x.rpe >= 7 && HARD[x.kind]);
    if (yest.length && HARD[s.kind]) { f = Math.min(f, 0.8); out.noHard = true; why('down', `Gestern „${yest[0].title}“ mit RPE ${yest[0].rpe} – harte Fingertage brauchen 48 h Abstand. Heute kürzer und ohne Maximalreiz, oder die Einheit um einen Tag verschieben.`); }
    // 7) Extra-Last in dieser Woche
    const extra = weekExtra(date), rem = remainingPlanned(date);
    if (extra >= 150 && rem > 0) {
      const k = clamp(1 - 0.7 * extra / rem, 0.6, 1);
      if (k < 0.97) { f = Math.min(f, f * k); why('down', `Diese Woche schon ${extra} Load zusätzlich zum Plan – der Rest der Woche wird ${k < 0.8 ? 'deutlich' : 'etwas'} kürzer.`); }
    }
    // 8) ACWR mit dieser Session
    const pl = Plan.plannedLoad(s);
    if (pl > 0) {
      const a = Store.acwr(date, { [date]: pl * f });
      if (a.ratio != null && a.ratio > 1.3 && a.chronic > 0) {
        const allowed = 1.3 * a.chronic - (a.acute - pl * f);
        const k = clamp(allowed / pl, 0.6, f);
        if (k < f - 0.02) { why('down', `Mit der vollen Einheit läge dein ACWR bei ${num(a.ratio)} – gekürzt, damit du nahe 1,3 bleibst.`); f = k; }
      }
    }
    out.f = clamp(Math.round(f * 20) / 20, 0.5, 1.15);
    if (easyWeek && out.f > 1) out.f = 1;
    return out;
  }

  // Die Session, wie sie heute gemacht wird (angepasst, außer du hast „Original“ gewählt)
  function today(planId, date) {
    const s = Plan.findPlan(planId); if (!s) return null;
    const d = S().draft;
    if (d && d.planId === planId && d.f != null) return Object.assign({ adapt: d.adapt || { f: d.f, reasons: [] } }, Plan.scale(s, d.f, { noHang: !!(d.adapt && d.adapt.noHang) }));
    date = date || D.today();
    if (Plan.dateOf(s) !== date && !(d && d.planId === planId)) return s;       // nur für heute anpassen
    if (S().adaptOff[planId] || Store.sessionForPlan(planId)) return s;
    const a = factor(s, date);
    return Object.assign({ adapt: a }, Plan.scale(s, a.f, { noHang: !!a.noHang }));
  }

  // Vorschlag für die Hang-Last aus der letzten Einheit
  function hangSuggest(prev, date) {
    if (!prev) return null;
    const fg = finger(date).v;
    if (fg >= 3) return { kg: prev.kg, text: `Finger ${fg}/10: Last halten oder 2,5–5 kg runter.` };
    if (prev.rpe >= 9) return { kg: prev.kg - 2.5, text: 'Letztes Mal RPE 9+: 2,5 kg weniger.' };
    if (prev.rpe <= 7) return { kg: prev.kg + 1.25, text: 'Letztes Mal RPE ≤ 7 und Finger ruhig: +1,25 kg möglich.' };
    return { kg: prev.kg, text: 'Letztes Mal RPE 8: Last halten.' };
  }

  window.Adapt = { est, duration, freeMinutes, learnFrom, finger, factor, today, hangSuggest, weekExtra, PER_CLIMB };
})();
