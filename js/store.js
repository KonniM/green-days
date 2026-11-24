/* Green Days — Datenhaltung, Datums-Helfer, Load/ACWR-Berechnung.
   Alles bleibt lokal auf dem Gerät (localStorage). */
(function () {
  'use strict';
  const KEY = 'greendays.v1';

  // ---------- Datum ----------
  const pad = n => String(n).padStart(2, '0');
  const D = {
    iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); },
    today() { return D.iso(new Date()); },
    add(s, days) { const d = D.parse(s); d.setDate(d.getDate() + days); return D.iso(d); },
    diff(a, b) { return Math.round((D.parse(a) - D.parse(b)) / 86400000); },
    dow(s) { return (D.parse(s).getDay() + 6) % 7; }, // 0 = Montag
    monday(s) { return D.add(s, -D.dow(s)); },
    fmt(s, opts) { return D.parse(s).toLocaleDateString('de-DE', opts || { day: 'numeric', month: 'short' }); },
    long(s) { return D.parse(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }); },
    DAYS: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  };

  // ---------- State ----------
  const defaults = () => ({
    v: 1,
    profile: {
      onboarded: false,
      trackingStart: null,            // ab hier zählen echte Logs; davor gilt die Baseline
      planStart: '2026-11-23',
      bodyweight: null,
      baseline: { perWeek: 2.5, minutes: 90, rpe: 6 },
      levels: { strength: 'advanced', technique: 'intermediate', mobility: 'beginner' }
    },
    sessions: [],        // geloggte Einheiten
    mornings: {},        // 'YYYY-MM-DD' -> { pain, stiff, swell }
    moves: {},           // planId -> neues Datum
    skips: {},           // planId -> true
    skillOverride: {},   // Wochen-Montag -> skillId
    skillLevels: {},     // skillId -> 0..4 Selbsteinschätzung
    assessments: [],     // { id, date, value }
    benchmarks: [],      // { date, label, rounds, pump, rpe, recovery, note }
    draft: null,         // laufende Session
    adaptOff: {},        // planId -> true: Original-Plan statt angepasster Version
    learn: { pace: {}, ratio: {}, perClimb: {} }, // gelernte Werte: Tempo je Session-Art, Ist/Plan-Umfang, Minuten je Climb
    goals: {},           // goalId -> { step, logs: [{ date, step, value }] }
    tests: [],           // Standortbestimmungen: { date, bw, values: { finger, pull, core, board, cap, mob, tech, max } }
    skillHist: [],       // { id, date, v } – Verlauf der Technik-Selbsteinschätzung
    settings: { sound: true, mobilityCounts: false }
  });

  let state = defaults();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const d = defaults();
        state = Object.assign(d, s);
        state.profile = Object.assign(defaults().profile, s.profile || {});
        state.profile.baseline = Object.assign(defaults().profile.baseline, (s.profile || {}).baseline || {});
        state.profile.levels = Object.assign(defaults().profile.levels, (s.profile || {}).levels || {});
        state.settings = Object.assign(defaults().settings, s.settings || {});
        state.learn = Object.assign(defaults().learn, s.learn || {});
      }
    } catch (e) { console.warn('State konnte nicht geladen werden', e); }
  }
  let saveFailed = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveFailed = false; }
    catch (e) { saveFailed = true; console.warn('Speichern fehlgeschlagen', e); }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- Load ----------
  // Session Load = Minuten × Session-RPE (sRPE-Methode, wie im Paradigm-eBook beschrieben).
  function sessionLoad(s) {
    if (!s || !s.minutes || !s.rpe) return 0;
    if (s.kind === 'mobility' && !state.settings.mobilityCounts) return 0;
    return Math.round(s.minutes * s.rpe);
  }
  function baselineDaily() {
    const b = state.profile.baseline;
    return (b.perWeek * b.minutes * b.rpe) / 7;
  }
  let loadCache = null;
  function loadsByDate() {
    if (loadCache) return loadCache;
    const m = {};
    state.sessions.forEach(s => { m[s.date] = (m[s.date] || 0) + sessionLoad(s); });
    loadCache = m;
    return m;
  }
  function invalidate() { loadCache = null; }
  function dayLoad(date) {
    const ts = state.profile.trackingStart;
    if (ts && date < ts) return baselineDaily();
    if (!ts) return baselineDaily();
    return loadsByDate()[date] || 0;
  }
  function rangeLoad(from, days, extra) {
    let sum = 0;
    for (let i = 0; i < days; i++) {
      const d = D.add(from, i);
      sum += dayLoad(d) + ((extra && extra[d]) || 0);
    }
    return sum;
  }
  // ACWR (entkoppelt): Load der letzten 7 Tage / (Load der vorangegangenen 28 Tage ÷ 4)
  function acwr(date, extra) {
    const acute = rangeLoad(D.add(date, -6), 7, extra);
    const chronic = rangeLoad(D.add(date, -34), 28, extra) / 4;
    const ts = state.profile.trackingStart;
    const realDays = ts ? Math.max(0, D.diff(date, ts) + 1) : 0;
    return {
      acute: Math.round(acute), chronic: Math.round(chronic),
      ratio: chronic > 0 ? acute / chronic : null,
      baselineShare: Math.max(0, Math.min(1, 1 - (realDays - 7) / 28)) // Anteil geschätzter Daten in der chronischen Last
    };
  }
  function acwrZone(r) {
    if (r == null) return { key: 'na', label: 'Keine Daten', tone: 'muted' };
    if (r < 0.8) return { key: 'low', label: 'Unter dem Sweet Spot', tone: 'yellow', hint: 'Wenig Reiz im Vergleich zu den letzten Wochen. In Deload- oder Taperwochen ist das gewollt.' };
    if (r <= 1.3) return { key: 'ok', label: 'Sweet Spot', tone: 'green', hint: 'Genug Reiz, um besser zu werden, und Zeit für das Gewebe, sich anzupassen.' };
    if (r <= 1.5) return { key: 'high', label: 'Erhöht', tone: 'orange', hint: 'Du steigerst schneller als gewohnt. Keine Extra-Einheit, Qualität vor Umfang.' };
    return { key: 'spike', label: 'Spike', tone: 'red', hint: 'Step-down: Umfang und Intensität für ein paar Tage um 30–50 % senken, in Bewegung bleiben, mehr schlafen. Danach maximal 10–15 % pro Woche steigern.' };
  }
  function weekLoad(monday) { return Math.round(rangeLoad(monday, 7)); }

  // ---------- Abfragen ----------
  const sessionsOn = date => state.sessions.filter(s => s.date === date);
  const sessionForPlan = planId => state.sessions.find(s => s.planId === planId);
  function lastSession(beforeDate) {
    const list = state.sessions.filter(s => s.kind !== 'mobility' && (!beforeDate || s.date < beforeDate))
      .sort((a, b) => a.date < b.date ? 1 : -1);
    return list[0] || null;
  }
  function addSession(s) { s.id = s.id || uid(); s.load = 0; state.sessions.push(s); invalidate(); s.load = sessionLoad(s); save(); return s; }
  function updateSession(id, patch) {
    const s = state.sessions.find(x => x.id === id); if (!s) return;
    Object.assign(s, patch); invalidate(); s.load = sessionLoad(s); save(); return s;
  }
  function removeSession(id) { state.sessions = state.sessions.filter(x => x.id !== id); invalidate(); save(); }

  // ---------- Lernen aus den eigenen Daten ----------
  // Gleitender Mittelwert: neue Beobachtungen zählen 30 %, die ersten beiden mehr.
  function learn(bucket, key, value) {
    if (!isFinite(value) || value <= 0) return;
    const b = state.learn[bucket] || (state.learn[bucket] = {});
    const cur = b[key];
    if (!cur) b[key] = { v: value, n: 1 };
    else { const a = cur.n < 2 ? 0.5 : 0.3; cur.v = cur.v + a * (value - cur.v); cur.n++; }
  }
  const learned = (bucket, key, min) => { const c = (state.learn[bucket] || {})[key]; return c && c.n >= (min || 1) ? c : null; };
  const CLIMB_UNITS = { Runden: 1, Boulder: 1, Versuche: 1 };
  function totalClimbs(from) { return state.sessions.reduce((a, s) => a + ((!from || s.date >= from) ? (s.climbs || 0) : 0), 0); }

  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(text) {
    const s = JSON.parse(text);
    if (!s || typeof s !== 'object' || !Array.isArray(s.sessions) || !s.profile) throw new Error('Keine gültige Green-Days-Sicherung');
    localStorage.setItem(KEY, JSON.stringify(s)); load(); invalidate();
  }
  function reset() { localStorage.removeItem(KEY); state = defaults(); invalidate(); }

  load();
  window.D = D;
  window.Store = {
    get s() { return state; }, save, uid, invalidate,
    get saveFailed() { return saveFailed; },
    sessionLoad, dayLoad, rangeLoad, acwr, acwrZone, weekLoad, baselineDaily,
    sessionsOn, sessionForPlan, lastSession, addSession, updateSession, removeSession,
    learn, learned, totalClimbs, CLIMB_UNITS,
    exportJSON, importJSON, reset
  };
})();
