/* Green Days — Jahresplan in Zyklen: Malta Capacity → Max Strength (Ravensburg) → Power →
   Frühjahrs-Performance → Strength II → Power/PE → Spezifität → Taper & Perform (Oktober 2027).
   Aufbau nach Paradigm (eine Hauptanpassung pro Phase/Session, Green Days, ACWR) und Lattice
   (Capacity vor Intensität, Erhaltungsdosen, Deloads). */
(function () {
  'use strict';

  // Verknüpfungen in die Bibliothek (IDs aus js/library.js)
  const EX = {
    maxHang: 'max-hangs', openHang: 'grip-rotation-open-hand', warmHang: 'finger-warmup-ladder', pull: 'weighted-pull-ups',
    limit: 'limit-bouldering', sublimit: 'sub-limit-bouldering', campus: 'campus-ladders', explosive: 'explosive-pull-ups',
    arc: 'arc-continuity', submax: 'aerobic-capacity-intervals', longEasy: 'arc-continuity', long: 'linked-boulders',
    triples: 'boulder-triples', flash: 'flash-level-volume', core: 'front-lever-progression',
    antagonist: 'push-ups', board: 'board-session-structure', blockLift: 'pinch-block-lifts', bench: 'board-benchmarks-three-tries'
  };
  const RT = { warmup: 'warmup-board-session', cooldown: 'post-session-cooldown', hips: 'hip-mobility-rest-day', shoulders: 'shoulder-thoracic-15', full: 'full-body-flexibility-30', forearm: 'forearm-finger-care', heel: 'heel-hook-posterior-chain' };

  const ROUTINE_GOALS = {}; ROUTINE_GOALS[RT.hips] = ['pancake', 'middle-split']; ROUTINE_GOALS[RT.full] = ['pancake', 'middle-split']; ROUTINE_GOALS[RT.shoulders] = ['handstand'];
  const KINDS = {
    submax: { label: 'Submax Circuits', fam: 'cap' }, arc: { label: 'ARC + Technik', fam: 'cap' },
    long: { label: 'Board + Long Circuits', fam: 'cap' }, pe: { label: 'Lange Boulder / Linkups', fam: 'cap' },
    strength: { label: 'Fingerkraft + Zugkraft', fam: 'str' }, limit: { label: 'Limit Boulder', fam: 'str' },
    power: { label: 'Power', fam: 'str' }, sim: { label: 'Simulation', fam: 'str' },
    skill: { label: 'Skill Day', fam: 'skill' }, mobility: { label: 'Mobility', fam: 'skill' },
    primer: { label: 'Primer', fam: 'perf' }, perf: { label: 'Performance', fam: 'perf' },
    outdoor: { label: 'Fels', fam: 'perf' }, gym: { label: 'Bouldern (Halle)', fam: 'perf' }, test: { label: 'Test', fam: 'perf' }, other: { label: 'Sonstiges', fam: 'perf' }
  };

  const STOP = {
    cap: ['Pump steigt über den Zielbereich', 'Bewegungsqualität lässt nach oder du fällst fast ab', 'Finger melden sich lokal (PIP, Druckschmerz)'],
    str: ['Qualität fällt: du wirst pro Versuch schlechter statt besser', 'Griffkraft oder Koordination lassen spürbar nach', 'Du denkst „nur noch ein harter Versuch …“ – das ist die Linie'],
    skill: ['Konzentration ist weg, du kletterst nur noch ab', 'Es wird zum Kraft-Workout statt zur Technik-Übung'],
    perf: ['Haut oder Finger geben Warnsignale', 'Zwei Versuche hintereinander schlechter als der davor', 'Du denkst „nur noch ein harter Versuch …“']
  };

  // ---------- Block-Bausteine ----------
  // Zählbare Blöcke tragen `count` (was du im Log einträgst) und `re(f)` (derselbe Block mit Umfang × f),
  // damit die App Sessions an dein tatsächliches Training anpassen kann.
  const rng = (v) => Array.isArray(v) ? v[0] + '–' + v[1] : String(v);
  const lo = (v) => Array.isArray(v) ? v[0] : v;
  const mid = (v) => Array.isArray(v) ? (v[0] + v[1]) / 2 : v;
  const scaleN = (v, f) => { if (Array.isArray(v)) { const a = Math.max(1, Math.round(v[0] * f)), b = Math.max(a, Math.round(v[1] * f)); return a === b ? a : [a, b]; } return Math.max(1, Math.round(v * f)); };
  const fill = (tpl, n) => tpl.map(l => l.replace('{n}', rng(n)));
  const warm = (min, extra) => ({ t: 'warmup', title: 'Aufwärmen', min, routine: RT.warmup, ex: extra && /Leiter|Aufwärmhänge/.test(extra.join(' ')) ? EX.warmHang : undefined, lines: ['Puls hoch, Schultern/Hüfte mobilisieren, leichte Boulder V0–V2 mit steigender Schwierigkeit.'].concat(extra || []) });
  const hangs = (sets, o) => {
    o = o || {};
    const secs = o.secs || 7, rest = o.rest || 240;
    return {
      t: 'hang', title: o.title || 'Max Hangs', min: Math.round((sets * (secs + rest)) / 60) + 6, ex: o.ex || EX.maxHang, log: 'hang',
      hang: { sets, secs, grip: o.grip || 'Half Crimp', edge: o.edge || 20 },
      lines: [`${sets} × ${secs} s · ${o.grip || 'Half Crimp'} · ${o.edge || 20} mm · ${Math.round(rest / 60)} min Pause`].concat(o.lines || []),
      timer: { label: o.title || 'Max Hangs', prep: 10, work: secs, rest, reps: sets, repName: 'Hang', workName: 'Hängen', repLabel: 'Hangs' },
      // Hangs werden nie hochskaliert – nur bei Warnsignalen reduziert.
      re: (f) => f <= 0.65 ? hangs(1, Object.assign({}, o, { lines: ['Heute nur ein Erhaltungssatz mit der Last der Vorwoche – oder ganz weglassen.'] })) : f <= 0.85 && sets > 1 ? hangs(sets - 1, o) : hangs(sets, o)
    };
  };
  const circuits = (rounds, o) => {
    const tpl = ['{n} Runden × 40 s Klettern / 45 s Pause', '8–15 Züge pro Circuit, große bis mittlere Griffe · RPE 4–6', 'Orientierung: V2–V3 bei 40°, sonst leichter oder flacher.'].concat((o && o.lines) || []);
    return {
      t: 'cap', title: 'Submax Boulder Circuits', min: Math.round(lo(rounds) * 85 / 60) + 3, ex: EX.submax, log: 'cap',
      count: { n: rounds, unit: 'Runden', sec: 40 }, lines: fill(tpl, rounds),
      timer: { label: 'Submax Circuits', prep: 15, work: 40, rest: 45, reps: lo(rounds), repName: 'Runde', workName: 'Klettern', repLabel: 'Runden', note: `Plan: ${rng(rounds)} Runden. Reduziere, sobald die Bewegungsqualität nachlässt.` },
      re: (f) => circuits(scaleN(rounds, f), o)
    };
  };
  const arc = (n, mins, o) => ({
    t: 'cap', title: 'ARC – sehr leichtes Dauerklettern', min: n * lo(mins) + (n - 1) * 4 + 2, ex: EX.arc, log: 'cap',
    count: { n, unit: 'Sätze', sec: lo(mins) * 60 },
    lines: [`${n} × ${rng(mins)} min fast durchgängig klettern, 4 min Satzpause`, 'Pump 0–2/10, RPE 2–3, keine schweren Einzelzüge', 'Board flach (20–25°), Traverse oder Wand mit großen Griffen.'].concat((o && o.lines) || []),
    timer: { label: 'ARC', prep: 15, work: lo(mins) * 60, rest: 240, reps: n, repName: 'Satz', workName: 'Klettern', repLabel: 'Sätze', note: `Plan: ${n} × ${rng(mins)} min.` },
    re: (f) => arc(n, scaleN(mins, f), o)
  });
  const longC = (n, mins) => ({
    t: 'cap', title: 'Long Circuits', min: n * lo(mins) + (n - 1) * 3 + 2, ex: EX.longEasy, log: 'cap',
    count: { n, unit: 'Sätze', sec: lo(mins) * 60 },
    lines: [`${n} × ${rng(mins)} min leichte, zusammenhängende Sequenzen, 3 min Satzpause`, 'Pump 2–4/10, gleichmäßiges Tempo', 'Letzter Satz in gleicher Qualität wie der erste.'],
    timer: { label: 'Long Circuits', prep: 15, work: lo(mins) * 60, rest: 180, reps: n, repName: 'Satz', workName: 'Klettern', repLabel: 'Sätze', note: `Plan: ${n} × ${rng(mins)} min.` },
    re: (f) => longC(n, scaleN(mins, f))
  });
  // o.n = geplante Anzahl (Zahl oder [von, bis]); '{n}' in den Zeilen wird damit gefüllt.
  const board = (title, min, lines, o) => {
    o = o || {};
    const b = Object.assign({ t: 'board', title, min, lines: o.n != null ? fill(lines, o.n) : lines, ex: EX.limit, rest: [120, 180, 240, 300] }, o);
    if (o.n != null) {
      b.count = { n: o.n, unit: o.unit || 'Boulder' };
      b.re = (f) => { const n2 = scaleN(o.n, f); return board(title, Math.max(8, Math.round(min * mid(n2) / mid(o.n))), lines, Object.assign({}, o, { n: n2 })); };
    }
    delete b.n; delete b.unit;
    return b;
  };
  const tech = (min, lines) => ({ t: 'tech', title: 'Technik-Fokus der Woche', min, count: { n: Math.max(3, Math.round(min / 4)), unit: 'Boulder' },
    lines: lines || ['2–3 Grade unter deinem Maximum, damit Kopf und Körper Kapazität für die Bewegung haben.', 'Ein Prozessziel wählen, ein paar Versuche filmen, nach jedem Go: Was hat sich verändert?'],
    re: (f) => tech(Math.max(10, Math.round(min * f)), lines) });
  const str = (title, min, lines, ex) => ({ t: 'str', title, min, lines, ex });
  const anta = (min) => ({ t: 'acc', title: 'Antagonisten & Schulter', min: min || 10, ex: EX.antagonist, lines: ['2–3 Sätze Push-ups oder Dips, Außenrotation, I-Y-T, Handgelenkstrecker.', 'Locker, 2–3 Wiederholungen in Reserve.'] });
  const cool = (min) => ({ t: 'mob', title: 'Cooldown & Mobility', min: min || 8, routine: RT.cooldown, lines: ['Kurz runterfahren, Unterarme lockern, 2–3 Positionen aus der Mobility-Routine.'] });
  const info = (title, lines, min) => ({ t: 'info', title, min: min || 0, lines });
  // Ziel-Blöcke: Inhalt (aktuelle Stufe, Dosis) kommt zur Laufzeit aus deinem Fortschritt.
  const GOAL_TITLES = { 'one-arm-pull-up': 'One-Arm-Pull-up', 'front-lever': 'Front Lever', pancake: 'Pancake', 'middle-split': 'Mittelspagat', handstand: 'Handstand' };
  const GOAL_EX = { 'one-arm-pull-up': 'one-arm-pull-up-progression', 'front-lever': 'front-lever-progression' };
  const goalB = (id, min, note) => ({ t: 'goal', goal: id, title: GOAL_TITLES[id], min, ex: GOAL_EX[id], lines: note ? [note] : [],
    re: (f) => f <= 0.65 ? goalB(id, Math.max(4, Math.round(min * 0.6)), 'Heute reduziert: nur 2 saubere Sätze der aktuellen Stufe.') : goalB(id, min, note) });
  const oap = (min, note) => goalB('one-arm-pull-up', min, note), fl = (min, note) => goalB('front-lever', min, note);
  const hs = (min) => goalB('handstand', min || 5, 'Kurz und frisch: 5 min Balance-Übung direkt nach dem Aufwärmen. Handgelenke vorher mobilisieren.');

  const S = (dow, key, kind, title, focus, rpe, blocks, o) => Object.assign({
    dow, key, kind, title, focus, rpe, blocks, core: true,
    min: blocks.reduce((a, b) => a + (b.min || 0), 0),
    stop: STOP[KINDS[kind].fam] || STOP.str
  }, o || {});
  const mob = (dow, key, routine, title, min) => S(dow, key, 'mobility', title, 'Beweglichkeit – locker, ohne Zeitdruck', [2, 3],
    [{ t: 'mob', title, min, routine, goals: ROUTINE_GOALS[routine], lines: ['Ruhetag-Routine. Zählt nicht als harter Reiz – Finger bleiben in Ruhe.'].concat(ROUTINE_GOALS[routine] ? ['Danach 8–10 min an deinen Zielen: ' + ROUTINE_GOALS[routine].map(g => GOAL_TITLES[g]).join(' und ') + ' (aktuelle Stufe).'] : []) }], { core: false, optional: true });
  const restDays = (hasSat) => [mob(1, 'di', RT.hips, 'Hüft-Mobility + Pancake', 28), mob(3, 'do', RT.shoulders, 'Schulter & BWS + Handstand', 23)].concat(hasSat ? [] : [mob(5, 'sa', RT.full, 'Full-Body Flexibility + Spagat', 38)]);

  // Muster für Aufbau/Deload/Test: jede 4. Woche Deload, letzte Woche Test bzw. Taper
  function pattern(n) {
    const out = []; let step = 0;
    for (let i = 0; i < n; i++) {
      if (i === n - 1 && n >= 4) out.push({ test: true, step });
      else if ((i + 1) % 4 === 0) out.push({ deload: true, step });
      else out.push({ step: step++ });
    }
    return out;
  }
  const pick = (arr, i) => arr[Math.min(i, arr.length - 1)];

  // =====================================================================
  // PHASE 1 — Malta Capacity / Base (8 Wochen, exakt nach deinem Plan)
  // =====================================================================
  const MALTA = [
    { mo: 15, mi: 10, fr: [3, 6], label: 'Referenz etablieren' },
    { mo: [16, 18], mi: [11, 12], fr: [3, 6], label: 'Nur steigern, wenn die Erholung gut ist' },
    { mo: [18, 20], mi: 12, fr: [3, 7], label: 'Moderate Aufbauwoche' },
    { mo: [10, 12], mi: [6, 8], fr: [2, [5, 6]], label: 'Deload', deload: true },
    { mo: [17, 18], mi: [12, 13], fr: [3, 7], label: 'Wiederaufbau' },
    { mo: [19, 20], mi: [13, 14], fr: [3, [7, 8]], label: 'Progression nach Log' },
    { mo: [20, 22], mi: [14, 15], fr: [3, 8], label: 'Höchstes Volumen, nicht höchste Intensität' },
    { mo: [12, 15], mi: [8, 10], fr: [2, [5, 6]], label: 'Taper und Benchmark', test: true }
  ];
  function maltaWeek(i) {
    const w = MALTA[Math.min(i, MALTA.length - 1)];
    const light = w.deload || w.test;
    const mo = S(0, 'mo', 'submax', 'Max Hangs + Submax Circuits', 'Wiederholbare submaximale Arbeit – Maxkraft nur erhalten', [4, 6], [
      warm(18, ['Vor den Max Hangs einige progressive, kontrollierte Aufwärmhänge.']),
      hangs(light ? 1 : 2, { lines: ['Start +30 kg nur bei RPE 7–8 und sauberer Technik, sonst reduzieren.', 'Kein Muskelversagen, kein erzwungenes +2,5 kg pro Woche.'].concat(light ? ['Deload/Test: nur 1 Satz bzw. Last halten.'] : []) }),
      oap(light ? 6 : 8, light ? 'Deload: 2 Sätze pro Seite, locker.' : 'Hauptreiz der Woche für dieses Ziel. Technisch sauber, RPE höchstens 7–8 – in dieser Phase kein Maximalversuch.'),
      circuits(w.mo, w.test ? { lines: ['Benchmark: derselbe Circuit wie in Woche 1 – gleicher Winkel, gleiche Griffe, gleiches Tempo. Runden, Pump nach Runde 5/10 und Erholung nach 5 min notieren.'] } : null),
      info('Technik-Cues in den Circuits', ['Fußkraft in die passende Richtung · Hüfte vor der Greifhand vorbereiten', 'Zugrichtung der Haltehand nutzen · unnötige Griffspannung abbauen']),
      cool()
    ], { low: 'Hangs weglassen oder nur 1 Satz, Circuits auf 8–10 Runden kürzen und einen Grad leichter klettern.', bench: !!w.test });
    const mi = S(2, 'mi', 'arc', 'ARC + Movement Quality', 'Aerobe Basis und Bewegungsökonomie', [2, 4], [
      warm(15, ['Sehr leichtes Bouldern, allmählich längere Bewegungsfolgen.']),
      hs(),
      arc(2, w.mi),
      tech(18, ['15–20 min leichte Comp- und Slab-Technik – keine maximalen Dynos, keine harten Fingerzüge.', 'Achte auf Hüftposition, Momentum, Fußdruck, präzise Lastverteilung.']),
      fl(light ? 5 : 7, light ? 'Deload: 2 Sätze.' : 'Hauptreiz der Woche für dieses Ziel.'),
      cool()
    ], { low: '1 × ARC statt 2, danach nur 10 min lockere Technik.' });
    const frN = w.fr[0], frMin = w.fr[1];
    const fr = S(4, 'fr', 'long', 'Moderates TB2 + Long Circuits', 'Boardbewegung erhalten, längere Capacity', [5, 7], [
      warm(18),
      light ? null : oap(6, 'Zweiter, kurzer Reiz: 2 Sätze pro Seite, bevor du ans Board gehst.'),
      board('Moderates Board-Bouldern', light ? 10 : 15, [light ? '{n} Boulder V3 bei 40°, RPE max. 6.' : '{n} Boulder V3–V4 bei 40°, RPE max. 6–7.', '2–3 min Pause, keine V6-Limit-Projekte, kein wiederholtes Abfallen.', 'Zweck: boardtypische Bewegung und etwas höhere Griffbelastung erhalten.'], { ex: EX.flash, rest: [120, 150, 180], n: light ? [2, 3] : [3, 5] }),
      longC(frN, frMin),
      light ? null : fl(5, 'Zweiter, kurzer Reiz: 2–3 Sätze.'),
      cool()
    ].filter(Boolean), { low: 'Board-Teil auf 2 leichte Boulder kürzen, Long Circuits 2 × 5 min.' });
    return { label: w.label, deload: !!w.deload, test: !!w.test, sessions: [mo, mi, fr].concat(restDays(false)) };
  }

  // =====================================================================
  // PHASE 2 + 5 — Max Strength & Recruitment
  // =====================================================================
  // Stufentabellen: Umfang und Ziel-RPE steigen so, dass die Wochenlast beim Phasenwechsel
  // höchstens ~10–15 % wächst und der geplante ACWR im Bereich 0,8–1,3 bleibt.
  const ST1 = { sets: [3, 3, 4, 4, 4, 5, 4], secs: [7, 7, 7, 7, 7, 10, 10], pull: ['3 × 5', '3 × 5', '4 × 4', '4 × 3', '4 × 3', '5 × 3', '4 × 2'], pullRpe: [7, 7, 7, 8, 8, 8, 8],
    moRpe: [[5, 7], [5, 7], [6, 7], [6, 7], [6, 7], [6, 8], [6, 8]], second: [0, 1, 1, 1, 1, 1, 1], core: [0, 0, 0, 0, 1, 1, 1],
    lim: [0, 3, 3, 4, 4, 4, 4], limMin: [35, 38, 45, 46, 48, 50, 50], frRpe: [[6, 7], [6, 8], [6, 8], [7, 8], [7, 8], [7, 9], [8, 9]] };
  const ST2 = { sets: [4, 4, 5, 5, 5], secs: [7, 10, 10, 10, 10], pull: ['4 × 3', '4 × 3', '5 × 3', '5 × 2', '4 × 2'], pullRpe: [8, 8, 8, 8, 8],
    moRpe: [[6, 7], [6, 7], [6, 8], [6, 8], [6, 8]], second: [1, 1, 1, 1, 1], core: [1, 1, 1, 1, 1],
    lim: [4, 4, 5, 5, 5], limMin: [44, 47, 50, 50, 50], frRpe: [[7, 9], [8, 9], [8, 9], [8, 9], [8, 9]] };
  function strengthWeek(i, n, o) {
    const p = pattern(n)[i], st = p.step, two = !!o.second, T = two ? ST2 : ST1;
    const sets = pick(T.sets, st), secs = pick(T.secs, st), lim = pick(T.lim, st), late = two || st >= 3;
    let mo, mi, fr;
    if (p.test) {
      mo = S(0, 'mo', 'test', 'Test: Max Hang + Zugkraft', 'Standortbestimmung – frisch, wenige Versuche', [7, 8], [
        warm(22, ['Aufwärm-Leiter an der Leiste: 3–4 Hänge mit steigender Last.']),
        hangs(3, { title: 'Max-Hang-Test', lines: ['In 3 Versuchen zu einem sauberen 7-s-Hang bei RPE 9–9,5 hocharbeiten. Kein Abrutschen, kein Versagen.', 'Beste Last notieren – das ist dein neuer Referenzwert.'] }),
        str('Weighted Pull-up Test', 15, ['Zu einer schweren 3er-Serie hocharbeiten (RPE 9). 3–4 min Pause.'], EX.pull),
        cool()
      ], { low: 'Test um eine Woche verschieben – ein Test ist nur frisch etwas wert.', hi: 3 });
      fr = S(4, 'fr', 'test', o.board + ' Benchmark-Session', 'Boulder aus den ersten Wochen wiederholen und vergleichen', [7, 8], [
        warm(22),
        board('Benchmark-Vergleich', 40, ['2–3 Boulder aus Woche 1–3 wiederholen: weniger Versuche? Kontrollierter?', 'Danach 2 neue Boulder am Flash-Level. Kein Limit-Projektieren.'], { rest: [180, 240, 300], ex: EX.bench, n: 5 }),
        anta(), cool()
      ], { hi: 8 });
    } else if (p.deload) {
      mo = S(0, 'mo', 'strength', 'Fingerkraft + Zugkraft (Deload)', 'Reiz halten, Umfang runter', [5, 6], [
        warm(20, ['Aufwärm-Leiter an der Leiste: 3–4 Hänge mit steigender Last.']),
        hangs(2, { lines: ['Deload: Last der Vorwoche halten, nur 2 Sätze.'] }),
        str('Weighted Pull-ups', 12, ['2 × 3 mit der Last der Vorwoche.'], EX.pull),
        anta(8)
      ], { low: 'Nur Aufwärmen + 2 Hangs.', hi: 2 });
      fr = S(4, 'fr', 'limit', o.board + ' moderat (Deload)', 'Bewegung am Board erhalten – kein Projektieren', [5, 6], [
        warm(22),
        board('Moderates Board-Bouldern', 25, ['{n} Boulder am Flash-Level, RPE 6. Kein Projektieren.'], { ex: EX.flash, rest: [120, 180], n: [5, 6] }),
        anta(8), cool(6)
      ], { low: '3 leichte Boulder, dann Mobility.', hi: 0 });
    } else {
      mo = S(0, 'mo', 'strength', 'Fingerkraft + Zugkraft', 'Maximalkraft und Rekrutierung – wenig Volumen, volle Qualität', pick(T.moRpe, st), [
        warm(20, ['Aufwärm-Leiter an der Leiste: 3–4 Hänge mit steigender Last (ca. 50 / 70 / 85 %).']),
        hangs(sets, { secs, lines: ['Last nur erhöhen (+1,25–2,5 kg), wenn letzte Woche alle Sätze ≤ RPE 7,5 waren und die Finger am Folgetag ruhig blieben.', 'Jeder Satz endet 1–2 s vor dem Versagen.'].concat(!two && st === 0 ? ['Woche 1: mit der Malta-Last starten – neu ist nur der dritte Satz.'] : []) }),
        pick(T.second, st) ? hangs(2, { title: two ? o.gripTitle : 'Open Hand / 3-Finger-Drag', ex: two ? EX.blockLift : EX.openHang, grip: two ? o.grip : '3-Finger-Drag', secs: 7, rest: 180, lines: ['Grip-Rotation: anderer Gelenkwinkel, damit nicht immer dieselbe Struktur (PIP, A2) die Last trägt.', 'RPE 7 – das ist Ergänzung, kein zweiter Maxreiz.'] }) : null,
        str('Weighted Pull-ups', late ? 15 : 12, [`${pick(T.pull, st)} · RPE ${pick(T.pullRpe, st)} · 3 min Pause`, 'Volle Bewegungsamplitude, explosiv hoch, kontrolliert runter.', 'Das ist auch die Kraftbasis für den One-Arm-Pull-up.'], EX.pull),
        pick(T.core, st) ? fl(8, '3 Sätze der aktuellen Stufe.') : null,
        anta(8)
      ].filter(Boolean), { low: 'Nur Hangs (2 Sätze) + Pull-ups (2 Sätze), Rest streichen. Bei Fingersignal: statt Hangs Block-Lifts mit 70 %.', hi: sets + (pick(T.second, st) ? 2 : 0) });
      fr = S(4, 'fr', 'limit', o.board + ' Limit Boulder', 'Maximalkraft an der Wand – kurze, harte Boulder mit langen Pausen', pick(T.frRpe, st), [
        warm(two || st >= 4 ? 24 : 22, ['3–4 Boulder am Board mit steigender Schwierigkeit, letzte 2 mit vollem Einsatz aber sicher machbar.']),
        lim === 0
          ? board('Einstieg: Board kennenlernen', pick(T.limMin, st), ['{n} Boulder zwei Grade unter dem Limit, RPE 7, je max. 3 Versuche.', 'Griffe, Tritte und Stil des Boards lesen lernen – noch kein Limit.'], { rest: [180, 240], n: [4, 5] })
          : board('Limit Bouldern', pick(T.limMin, st), [`{n} Boulder mit 3–6 Zügen (oder Einzelzüge härterer Boulder), je 3–5 Versuche, RPE ${pick(T.frRpe, st)[1] >= 9 ? '8–10' : '8–9'}.`, 'Pause mindestens 1 min pro gekletterten Zug (3–5 min).', 'Grifftypen mischen: 1 Leisten-, 1 Pinch-, 1 Sloper-/Weitzug-Boulder' + (two ? ' + 1 Anti-Style-Boulder.' : '.'), 'Aufhören, solange du dich noch scharf fühlst.'], { n: lim }),
        anta(late ? 10 : 8), cool(6)
      ], { low: 'Statt Limit: 5 Boulder am Flash-Level mit vollem Fokus auf saubere Ausführung, dann Schluss.', hi: Math.max(6, lim * 4) });
    }
    const lightMi = p.deload || p.test;
    mi = S(2, 'mi', 'skill', 'Skill Day + Capacity erhalten', 'Technik frisch üben, aerobe Basis mit kleiner Dosis halten', [3, 5], [
      warm(15),
      hs(),
      oap(lightMi ? 5 : 8, lightMi ? '2 lockere Sätze pro Seite.' : 'Frisch am Anfang: der Hauptreiz der Woche für dieses Ziel.'),
      tech(lightMi ? 25 : late ? 35 : 30),
      fl(lightMi ? 5 : 6, lightMi ? '2 Sätze.' : '3 Sätze der aktuellen Stufe.'),
      (i % 2 === 0) ? circuits(lightMi ? 6 : [8, 10], { lines: ['Erhaltungsdosis: etwa ein Drittel bis die Hälfte des Malta-Volumens genügt.'] }) : arc(2, lightMi ? 6 : 8, { lines: ['Erhaltungsdosis der aeroben Basis.'] }),
      cool(late && !lightMi ? 12 : 10)
    ], { low: 'Nur 30 min lockere Technik, Capacity-Teil streichen.' });
    return {
      label: p.test ? 'Test & Taper' : p.deload ? 'Deload' : (st === 0 && !two ? 'Übergang: Intensität schrittweise rauf' : 'Aufbau ' + (st + 1)),
      deload: !!p.deload, test: !!p.test, sessions: [mo, mi, fr].concat(restDays(false))
    };
  }

  // =====================================================================
  // PHASE 3 + 6 — Power (& Power Endurance)
  // =====================================================================
  function powerWeek(i, n, o) {
    const p = pattern(n)[i], st = p.step, pe = !!o.pe, light = !!p.deload, test = !!p.test;
    const campusOk = st >= (pe ? 0 : 2);
    const mo = S(0, 'mo', 'power', 'Power + Kraft erhalten', 'Kraft in schnelle Bewegung umsetzen – wenige, explosive Versuche', light ? [5, 6] : test ? [6, 8] : [7, 9], [
      warm(22, ['Aufwärm-Leiter an der Leiste, dann 2–3 dynamische Züge an guten Griffen.']),
      hangs(2, { lines: ['Erhaltungsdosis mit aktueller Last – dient hier auch als Aktivierung.'] }),
      test
        ? str('Power-Check', 20, ['3 Benchmark-Züge oder -Boulder aus Woche 1 wiederholen: höher, kontrollierter, weniger Versuche?', 'Maximal 8 Versuche insgesamt, volle Pausen.'], EX.explosive)
        : light
        ? board('Lockere dynamische Boulder', 20, ['{n} dynamische Boulder am Flash-Level, RPE 6. Schnell, aber entspannt.'], { ex: EX.flash, rest: [120, 180], n: [4, 5] })
        : campusOk
          ? str('Campus / explosive Züge', 25, [`${pick([4, 5, 6, 6], st - (pe ? 0 : 2))} Sätze Ladders (z. B. 1-3-5) an großen Sprossen, 2–3 min Pause.`, 'Nur wenn Finger am Morgen 0–1/10 und kein PIP-Signal in der Vorwoche – sonst dynamische Board-Boulder.', 'Jeder Satz maximal schnell. Sobald die Geschwindigkeit fällt: Ende.'], EX.campus)
          : str('Explosive Pull-ups + dynamische Boulder', 25, ['4 × 3 explosive Pull-ups (so hoch wie möglich), 2 min Pause.', '6–8 Versuche an weiten, dynamischen Board-Zügen mit guten Griffen. Volle Pause.'], EX.explosive),
      fl(8, '3 Sätze der aktuellen Stufe.'),
      anta(8)
    ], { low: 'Hangs 2 Sätze + 4 dynamische Boulder am Flash-Level, kein Campus.', hi: light ? 2 : 8 });
    const mi = S(2, 'mi', 'skill', 'Skill Day: Dynamik & Timing', 'Koordination und Momentum frisch üben', [3, 5], [
      warm(15),
      hs(),
      oap(light || test ? 5 : 8, light || test ? '2 lockere Sätze pro Seite.' : 'Frisch am Anfang. In dieser Phase 1× pro Woche – die explosiven Züge am Montag zählen mit.'),
      tech(light || test ? 25 : 35, ['Dynamische und koordinative Bewegungen an leichten Bouldern: Timing, Hüftimpuls, Deadpoint.', 'Ein Prozessziel wählen, filmen, nach jedem Go eine Sache anpassen.']),
      fl(5, '2–3 Sätze.'),
      (i % 2 === 0) ? circuits(light || test ? 6 : 8, { lines: ['Erhaltungsdosis der aeroben Basis.'] }) : info('Kein Capacity-Teil', ['Diese Woche bleibt der Mittwoch reine Technik.']),
      cool(12)
    ], { low: '30 min lockere Technik.' });
    const fr = test
      ? S(4, 'fr', 'test', 'Benchmark-Session', 'Boulder aus Woche 1 wiederholen und vergleichen', [7, 8], [
        warm(24),
        board('Benchmark-Vergleich', 40, ['2–3 Boulder aus den ersten Wochen wiederholen: weniger Versuche? Kontrollierter?', 'Danach 2 neue Boulder am Flash-Level. Kein Limit-Projektieren.'], { rest: [180, 240, 300], ex: EX.bench, n: 5 }),
        anta(), cool(6)
      ], { hi: 8 })
      : pe
      ? S(4, 'fr', 'pe', 'Lange Boulder & Linkups', 'Kraft wiederholt abrufen – Qualität bleibt der Maßstab', light ? [5, 6] : [7, 9], [
        warm(22),
        light
          ? board('Moderate längere Boulder', 25, ['{n} Boulder mit 8–12 Zügen am Flash-Level.'], { ex: EX.flash, rest: [180], n: 4 })
          : st < 2
            ? board('Lange Boulder', 45, ['{n} Boulder mit 6–12 Zügen bei RPE 8, je 2–3 Versuche, 4–5 min Pause.', 'Oder Linkups: Boulder A direkt in Boulder B.'], { ex: EX.long, rest: [240, 300], n: [4, 5] })
            : board('Boulder Triples', 45, ['{n} Sätze: denselben fordernden Boulder 3 × klettern, 90 s zwischen den Gos, 6–8 min Satzpause.', 'Pump bis 6–7/10 ist hier okay – aber kein Versuch mit schlechter Technik.'], { ex: EX.triples, rest: [90, 360, 480], n: pick([3, 3, 4, 4], st - 2), unit: 'Sätze' }),
        anta(), cool(6)
      ], { low: '3 längere Boulder am Flash-Level, lange Pausen.', hi: light ? 0 : 10 })
      : S(4, 'fr', 'limit', 'Limit Boulder: weite Züge & Kontaktkraft', 'Harte Einzelzüge mit vollem Einsatz', light ? [5, 6] : [8, 9], [
        warm(24),
        light
          ? board('Moderates Board-Bouldern', 25, ['{n} Boulder am Flash-Level, RPE 6.'], { ex: EX.flash, rest: [120, 180], n: 5 })
          : board('Limit Bouldern', 50, ['{n} Boulder mit 3–6 Zügen, je 3–5 Versuche, RPE 8–10.', 'Schwerpunkt: weite, schnelle Züge und Griffe, die du im Flug treffen musst.', 'Zusätzlich 1 Boulder als echter Flash-Versuch: lesen, visualisieren, ein Go.', 'Pause mindestens 1 min pro gekletterten Zug.'], { n: pick([3, 4, 4, 4], st) }),
        anta(), cool(6)
      ], { low: '5 Boulder am Flash-Level, sauber und schnell.', hi: light ? 0 : 14 });
    return { label: p.test ? 'Power-Check & Taper' : p.deload ? 'Deload' : 'Aufbau ' + (st + 1), deload: !!p.deload, test: !!p.test, sessions: [mo, mi, fr].concat(restDays(false)) };
  }

  // =====================================================================
  // PHASE 4 / 7 / 8 — Performance, Spezifität, Taper
  // =====================================================================
  const primer = (title) => S(0, 'mo', 'primer', title || 'Primer', 'Kurz, scharf, frisch rausgehen', [5, 6], [
    warm(20),
    hangs(2, { lines: ['Aktuelle Last, sauber. Kein Zusatzsatz.'] }),
    board('Wenige harte, bekannte Züge', 20, ['{n} harte, aber bekannte Boulder, je 1–2 Versuche.', 'Nach 45–60 min ist Schluss – du sollst dich danach besser fühlen als davor.'], { rest: [180, 240], n: [3, 4] }),
    cool(8)
  ], { low: 'Nur Aufwärmen + 2 Hangs + 2 Boulder.', hi: 6 });
  const perfDay = (title, lines, kind, rpe, focus) => S(5, 'sa', kind || 'perf', title, focus || 'Leistung abrufen – wenige Versuche mit voller Absicht', rpe || [8, 9], [
    info('Vorher festlegen', ['1–2 Prozessziele (z. B. „ruhig durch die Crux atmen“).', 'Versuchs-Limit und Endpunkt: Was beendet die Session?']),
    warm(30, ['Am Fels: Schultern, Hüfte, Finger progressiv – erst große Griffe, dann Einzelzüge des Projekts.']),
    board('Versuche', 90, lines, { rest: [300, 480, 600], n: [5, 8], unit: 'Versuche' }),
    info('Nachher (5 min)', ['Was hat sich verbessert? Was habe ich gelernt? Warum ist das wichtig?', 'Fehler als Daten: Technik – was löste sich zuerst? Physis – was ermüdete zuerst? Kopf – wo zögerte ich?'])
  ], { low: 'Tag in einen Erkundungstag verwandeln: Züge ausbouldern, Beta filmen, keine Durchstiegsversuche.', hi: 12, movable: true });

  function springWeek(i, n) {
    if (i === n - 1) {
      const easy = (dow, key) => S(dow, key, 'skill', 'Lockeres Bewegen', 'Erholen und auswerten', [4, 5], [warm(12), tech(45, ['Klettern, was Spaß macht – 3+ Grade unter dem Limit.', 'Mobility-Tests wiederholen und eintragen.']), cool(12)], { low: 'Spaziergang und Mobility.' });
      return { label: 'Übergang & Auswertung', deload: true, sessions: [easy(0, 'mo'), easy(2, 'mi'), easy(4, 'fr')].concat(restDays(false)), note: 'Was hat dich am Fels wirklich limitiert? Das legt den Schwerpunkt für Strength II fest.' };
    }
    return {
      label: 'Performance-Fenster ' + (i + 1), sessions: [
        primer(),
        S(2, 'mi', 'skill', 'Skill & Mobility leicht', 'Beweglich und scharf bleiben', [3, 4], [warm(12), tech(30), oap(6, 'Erhalt: 2 Sätze pro Seite.'), fl(5, 'Erhalt: 2 Sätze.'), cool(15)], { core: false, optional: true, low: 'Nur Mobility.' }),
        perfDay('Performance Day (Fels oder Halle)', ['1–2 Projekte auswählen. 5–8 Qualitätsversuche insgesamt, 5–10 min Pause dazwischen.', 'Kein Fels in Reichweite? Send-Session an neu geschraubten Bouldern in der Halle.'])
      ].concat(restDays(true))
    };
  }
  function specWeek(i, n) {
    const last = i === n - 1;
    return {
      label: last ? 'Spezifität – Volumen sinkt' : 'Spezifität ' + (i + 1), sessions: [
        S(0, 'mo', 'sim', 'Kraft erhalten + Simulation', 'Projektanforderungen nachbauen', [7, 8], [
          warm(22),
          hangs(last ? 2 : 3, { lines: ['Erhaltungsdosis. Grifftyp des Projekts bevorzugen.'] }),
          board('Projekt-Simulatoren', 40, ['{n} Nachbauten der Schlüsselstellen (Winkel, Grifftyp, Zugweite) an Spraywall oder Board.', 'Je 3–5 Versuche, volle Pause. Dann 1–2 Links unter leichter Vorermüdung.'], { rest: [240, 300], n: [2, 3] }),
          anta(8)
        ], { low: '2 Hangs + 1 Simulator, 3 Versuche.', hi: 12 }),
        S(2, 'mi', 'skill', 'Fels-Technik & Mobility', 'Kleine Tritte, Körperposition, Visualisierung', [3, 4], [warm(12), tech(30, ['Präzision auf kleinen Tritten, Körperspannung bei weiten Zügen.', 'Projekt-Beta im Kopf durchgehen – Zug für Zug, inklusive Atmung.']), oap(6, 'Erhalt: 2 Sätze pro Seite.'), fl(5, 'Erhalt: 2 Sätze.'), cool(15)], { core: false, optional: true, low: 'Nur Mobility + 5 min Visualisierung.' }),
        perfDay('Fels: Projekt ausbouldern', ['Alle Einzelzüge lösen, Beta filmen, Links von oben nach unten aufbauen.', 'Bedingungen, Haut und Pad-Positionen notieren. Kein Fels? Simulationstag in der Halle.'], 'outdoor', i === 0 ? [7, 8] : [8, 9], i === 0 ? 'Erkunden statt durchsteigen – Züge lösen, Beta sammeln' : 'Züge verbinden, Links aufbauen')
      ].concat(restDays(true))
    };
  }
  function taperWeek(i) {
    return {
      label: i === 0 ? 'Taper: Volumen −40–50 %' : 'Performance-Fenster ' + i, deload: i === 0, sessions: [
        primer(i === 0 ? 'Primer (Taper)' : 'Primer'),
        S(2, 'mi', 'mobility', 'Mobility + Visualisierung', 'Frisch bleiben, Haut pflegen', [2, 3], [{ t: 'mob', title: 'Mobility', min: 20, routine: RT.full, lines: ['Locker. Danach 5–10 min das Projekt visualisieren.'] }], { core: false, optional: true }),
        i === 0
          ? S(5, 'sa', 'outdoor', 'Leichter Felstag', 'Bewegen, Haut schonen, das Projekt nur anfassen', [6, 7], [warm(30), board('Lockere Züge am Fels', 60, ['Leichte Boulder und 2–3 Einzelzüge des Projekts – keine Durchstiegsversuche.', 'Früh aufhören. Die Form kommt durch die Ruhe, nicht durch diesen Tag.'], { rest: [300], n: [4, 6] })], { low: 'Ruhetag.', hi: 4, movable: true })
          : perfDay('Projekt-Tag: 8A', ['Aufwärmprotokoll wie geübt. 5–8 Qualitätsversuche, 8–10 min Pause.', 'Haut und Bedingungen entscheiden mit – ein abgebrochener Tag ist ein gewonnener nächster Tag.'], 'perf')
      ].concat([mob(1, 'di', RT.hips, 'Hüft-Mobility', 15), mob(3, 'do', RT.forearm, 'Unterarm- & Fingerpflege', 8)])
    };
  }

  // ---------- Phasen ----------
  const PHASES = [
    { id: 'malta', name: 'Malta Capacity / Base', short: 'Capacity', type: 'cap', weeks: 8, where: 'Malta · Tension Board 2',
      goal: 'Aerobe Unterarmkapazität und wiederholbare submaximale Belastung aufbauen, Maxkraft nur erhalten.',
      points: ['3 Einheiten pro Woche: Mo Submax Circuits, Mi ARC + Technik, Fr Board + Long Circuits', 'Erst Umfang steigern, nicht gleichzeitig Schwierigkeit und Spitzenlast', 'Woche 4 Deload, Woche 8 Taper + Benchmark gegen Woche 1', 'Nebenziele in kleinen Dosen: One-Arm-Pull-up (Mo, Fr), Front Lever (Mi, Fr), Handstand (Mi, Do), Pancake und Spagat an den Ruhetagen'],
      not: ['Keine 7:3-Repeaters, keine Density Hangs', 'Keine maximalen Weighted Pull-ups – die One-Arm-Stufen bleiben bei RPE 7–8 und wenigen Sätzen', 'Keine regelmäßigen Limit-Sessions, kein Campus, kein Pump 8–9/10'],
      themes: ['foundations', 'slab', 'tension'], week: maltaWeek },
    { id: 'strength1', name: 'Max Strength & Recruitment', short: 'Maxkraft', type: 'str', weeks: 10, where: 'Ravensburg · MoonBoard, Hangboard + Gewichte',
      goal: 'Finger- und Zugkraft kontrolliert aufbauen. Aerobes Volumen sinkt auf Erhaltungsdosis, schwere Fingerlast steigt schrittweise.',
      points: ['Mo Hangboard + Weighted Pull-ups (kontrollierte Last), Fr MoonBoard Limit, Mi Skill Day', 'Zwei harte Fingertage mit 3–4 Tagen Abstand – eine Hauptanpassung pro Session', 'Grip-Rotation: Half Crimp + Open Hand, am Board Leiste/Pinch/Sloper mischen', 'Woche 4 und 8 Deload, Woche 10 Test', 'Nebenziele: One-Arm-Pull-up und Front Lever am Mittwoch frisch, Handstand Mi/Do, Pancake und Spagat an den Ruhetagen'],
      not: ['Keine Pump-Circuits nach Max Hangs', 'Kein Campus in dieser Phase', 'Keine Laststeigerung in zwei Wochen hintereinander, wenn die Finger reagieren'],
      themes: ['tension', 'tactics', 'foundations'], week: (i, n) => strengthWeek(i, n, { board: 'MoonBoard' }) },
    { id: 'power1', name: 'Power & Contact Strength', short: 'Power', type: 'pow', weeks: 6, flex: true, where: 'Ort offen · Board, Campusboard',
      goal: 'Kraft in schnelle, weite Züge umsetzen. Eine Max-Hang-Erhaltungsdosis pro Woche bleibt.',
      points: ['Mo Power (explosive Züge, ab Woche 3 Campus nur bei ruhigen Fingern)', 'Fr Limit Boulder mit weiten Zügen und Flash-Versuch', 'Mi Skill Day: Dynamik, Timing, Koordination'],
      not: ['Kein Campus bei Fingersignalen', 'Keine Marathon-Sessions – Power braucht Frische'],
      themes: ['dynamic', 'mental', 'tension'], week: (i, n) => powerWeek(i, n, {}) },
    { id: 'spring', name: 'Frühjahrs-Performance', short: 'Fels I', type: 'perf', weeks: 4, flex: true, where: 'Ort offen · Fels oder Halle',
      goal: 'Erster Leistungstest des Jahres: Kraft an echten Projekten abrufen und herausfinden, was am Fels limitiert.',
      points: ['Mo kurzer Primer, Sa Performance Day (verschiebbar)', 'Wenige Versuche mit voller Absicht, klare Endpunkte', 'Letzte Woche: Übergang, Mobility-Tests, Auswertung'],
      not: ['Kein zusätzliches Training „weil es gut läuft“', 'Kein Projektieren bis die Haut durch ist'],
      themes: ['tactics', 'outdoor', 'mental'], week: springWeek },
    { id: 'strength2', name: 'Strength II', short: 'Maxkraft II', type: 'str', weeks: 6, flex: true, where: 'Ort offen · Board, Hangboard + Gewichte',
      goal: 'Zweiter Kraftblock auf höherem Niveau – gezielt an den Schwächen, die das Frühjahr gezeigt hat.',
      points: ['Max Hangs 4–5 Sätze, 7–10 s, plus zweiter Grifftyp (Pinch-Block)', 'Weighted Pull-ups schwerer und kürzer', 'Fr Limit Boulder mit einem Anti-Style-Boulder pro Session'],
      not: ['Kein Campus', 'Keine Pump-Einheiten'],
      themes: ['tension', 'foundations', 'slab'], week: (i, n) => strengthWeek(i, n, { board: 'Board', second: true, grip: 'Pinch', gripTitle: 'Pinch-Block Lifts' }) },
    { id: 'power2', name: 'Power & Power Endurance', short: 'Power / PE', type: 'pow', weeks: 6, flex: true, where: 'Ort offen · Board, Campusboard',
      goal: 'Kraft wiederholt und über längere Boulder abrufen. Rhythmus, Snap und Flow entstehen hier.',
      points: ['Mo Power (Campus / explosive Züge) + Hang-Erhalt', 'Fr lange Boulder (6–12 Züge), Linkups, später Boulder Triples', 'Mi Skill Day: Taktik, Pacing, Flash-Strategie'],
      not: ['Kein Versuch mit schlechter Technik – Qualität bleibt der Maßstab'],
      themes: ['dynamic', 'tactics', 'mental'], week: (i, n) => powerWeek(i, n, { pe: true }) },
    { id: 'spec', name: 'Spezifität & Simulation', short: 'Spezifisch', type: 'perf', weeks: 4, flex: true, where: 'Ort offen · Projektgebiet',
      goal: 'Rohe Kraft in Projekt-Flow übersetzen: Anforderungen des 8A-Projekts nachbauen und am Fels ausbouldern.',
      points: ['Mo Kraft erhalten + Projekt-Simulatoren', 'Sa Felstag: Züge lösen, Beta filmen, Links aufbauen', 'Du jagst keine Anpassungen mehr – du übst Performance'],
      not: ['Keine neuen Trainingsreize', 'Kein hohes Volumen'],
      themes: ['outdoor', 'tactics', 'mental'], week: specWeek },
    { id: 'taper', name: 'Taper & Perform', short: '8A', type: 'perf', weeks: 5, flex: true, where: 'Projektgebiet',
      goal: 'Frisch und gefährlich auftauchen. Weniger Einheiten, mehr Ruhe, beste Felsqualität.',
      points: ['Mo kurzer Primer, Mi Mobility + Visualisierung', 'Sa Projekt-Tag mit festem Versuchsplan', 'Haut, Schlaf und Bedingungen haben Priorität'],
      not: ['Nichts Neues ausprobieren', 'Kein „Tank leeren“'],
      themes: ['mental', 'outdoor', 'tactics'], week: taperWeek }
  ];

  // ---------- Zeitliche Auflösung ----------
  let cache = null;
  function layout() {
    const ps = Store.s.profile.planStart, ov = Store.s.profile.phaseWeeks || {};
    const sig = ps + JSON.stringify(ov);
    if (cache && cache.sig === sig) return cache.list;
    let start = D.monday(ps);
    const list = PHASES.map((p, idx) => {
      const weeks = Math.max(2, Math.min(16, ov[p.id] || p.weeks));
      const o = Object.assign({}, p, { idx, weeks, start, end: D.add(start, weeks * 7 - 1) });
      start = D.add(start, weeks * 7);
      return o;
    });
    cache = { sig, list };
    weekCache = {};
    return list;
  }
  let weekCache = {};
  function weekAt(date) {
    const list = layout();
    const mon = D.monday(date);
    if (weekCache[mon] !== undefined) return weekCache[mon];
    const ph = list.find(p => mon >= p.start && mon <= p.end);
    let res = null;
    if (ph) {
      const i = Math.round(D.diff(mon, ph.start) / 7);
      const w = ph.week(i, ph.weeks);
      w.sessions.forEach(s => {
        s.planId = ph.id + '-w' + (i + 1) + '-' + s.key;
        s.baseDate = D.add(mon, s.dow);
        s.phaseId = ph.id;
      });
      res = { phase: ph, i, n: i + 1, monday: mon, week: w };
    }
    weekCache[mon] = res;
    return res;
  }
  const dateOf = (s) => Store.s.moves[s.planId] || s.baseDate;
  // Geplante Einheiten an einem Datum (inkl. verschobener)
  function plannedOn(date) {
    const out = [];
    [-7, 0, 7].forEach(off => {
      const w = weekAt(D.add(date, off));
      if (w) w.week.sessions.forEach(s => { if (dateOf(s) === date) out.push(s); });
    });
    return out;
  }
  function findPlan(planId) {
    const list = layout();
    const ph = list.find(p => planId.indexOf(p.id + '-w') === 0); if (!ph) return null;
    const m = planId.slice(ph.id.length).match(/^-w(\d+)-(.+)$/); if (!m) return null;
    const w = weekAt(D.add(ph.start, (+m[1] - 1) * 7));
    return w ? w.week.sessions.find(s => s.planId === planId) : null;
  }
  const plannedLoad = (s) => (s.kind === 'mobility' && !Store.s.settings.mobilityCounts) ? 0 : Math.round(s.min * (s.rpe[0] + s.rpe[1]) / 2);
  function plannedWeekLoad(monday) {
    const w = weekAt(monday); if (!w) return 0;
    return w.week.sessions.filter(s => !s.optional && !Store.s.skips[s.planId]).reduce((a, s) => a + plannedLoad(s), 0);
  }
  const end = () => { const l = layout(); return l[l.length - 1].end; };

  // Session mit Umfang × f (0,5–1,15). Blockreihenfolge und Indizes bleiben gleich.
  function scale(s, f) {
    if (!s || !f || Math.abs(f - 1) < 0.01) return s;
    const blocks = s.blocks.map(b => b.re ? b.re(f) : b);
    return Object.assign({}, s, { blocks, min: blocks.reduce((a, b) => a + (b.min || 0), 0), hi: s.hi ? Math.round(s.hi * Math.min(1, f)) : s.hi, factor: f, base: s });
  }
  // Zählbare Blöcke einer Session: was im Log abgefragt wird.
  const counts = (s) => s.blocks.map((b, i) => b.count ? { i, title: b.title, unit: b.count.unit, plan: Math.round(mid(b.count.n)), range: rng(b.count.n), sec: b.count.sec || 0, t: b.t } : null).filter(Boolean);

  window.Plan = { PHASES, KINDS, EX, RT, ROUTINE_GOALS, GOAL_TITLES, scale, counts, layout, weekAt, plannedOn, findPlan, dateOf, plannedLoad, plannedWeekLoad, end, reset() { cache = null; weekCache = {}; } };
})();
