/* Green Days — Jahresplan in Zyklen: Malta Capacity → Max Strength (Ravensburg) → Power →
   Test-Woche → Strength II → Power/PE → Spezifität → Taper & Perform (November 2027).
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
  const warm = (min, extra) => ({ t: 'warmup', title: 'Aufwärmen', min, routine: RT.warmup, ex: extra && /Leiter|Aufwärmhänge/.test(extra.join(' ')) ? EX.warmHang : undefined, lines: ['Puls hoch, Schultern/Hüfte mobilisieren, leichte Boulder {g:warm} mit steigender Schwierigkeit.'].concat(extra || []) });
  const hangs = (sets, o) => {
    o = o || {};
    const secs = o.secs || 7, rest = o.rest || 240;
    return {
      t: 'hang', title: o.title || 'Max Hangs', min: Math.round((sets * (secs + rest)) / 60) + 6, ex: o.ex === null ? undefined : (o.ex || EX.maxHang), phy: o.phy, log: 'hang',
      hang: { sets, secs, grip: o.grip || 'Half Crimp', edge: o.edge || 20, target: o.target || 8, step: o.step || 1.25, label: o.label, hold: o.hold, test: o.test },
      lines: [`${sets} × ${secs} s · ${o.grip || 'Half Crimp'} · ${o.edge || 20} mm · ${Math.round(rest / 60)} min Pause`].concat(o.lines || []),
      timer: { label: o.title || 'Max Hangs', prep: 10, work: secs, rest, reps: sets, repName: 'Hang', workName: 'Hängen', repLabel: 'Hangs' },
      // Hangs werden nie hochskaliert – nur bei Warnsignalen reduziert.
      re: (f) => f <= 0.65 ? hangs(1, Object.assign({}, o, { lines: ['Heute nur ein Erhaltungssatz mit der Last der Vorwoche – oder ganz weglassen.'] })) : f <= 0.85 && sets > 1 ? hangs(sets - 1, o) : hangs(sets, o)
    };
  };
  const circuits = (rounds, o) => {
    const tpl = ['{n} Runden × 40 s Klettern / 45 s Pause', '8–15 Züge pro Circuit, große bis mittlere Griffe · RPE 4–6', 'Grad: {g:circ} bei 40°, sonst leichter oder flacher.'].concat((o && o.lines) || []);
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
    lines: [`${n} × ${rng(mins)} min fast durchgängig klettern, 4 min Satzpause`, 'Pump 0–2/10, RPE 2–3, keine schweren Einzelzüge', 'Board flach (20–25°), Traverse oder Wand mit großen Griffen. Grad höchstens {g:easy}.'].concat((o && o.lines) || []),
    timer: { label: 'ARC', prep: 15, work: lo(mins) * 60, rest: 240, reps: n, repName: 'Satz', workName: 'Klettern', repLabel: 'Sätze', note: `Plan: ${n} × ${rng(mins)} min.` },
    re: (f) => arc(n, scaleN(mins, f), o)
  });
  const longC = (n, mins) => ({
    t: 'cap', title: 'Long Circuits', min: n * lo(mins) + (n - 1) * 3 + 2, ex: EX.longEasy, log: 'cap',
    count: { n, unit: 'Sätze', sec: lo(mins) * 60 },
    lines: [`${n} × ${rng(mins)} min leichte, zusammenhängende Sequenzen, 3 min Satzpause`, 'Grad: {g:circ} · Pump 2–4/10, gleichmäßiges Tempo', 'Letzter Satz in gleicher Qualität wie der erste.'],
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
    lines: lines || ['Grad: {g:tech} – zwei bis drei Grade unter deinem Limit, damit Kopf und Körper Kapazität für die Bewegung haben.', 'Ein Prozessziel wählen, ein paar Versuche filmen, nach jedem Go: Was hat sich verändert?'],
    re: (f) => tech(Math.max(10, Math.round(min * f)), lines) });
  const str = (title, min, lines, ex) => ({ t: 'str', title, min, lines, ex });
  // Kraftübung mit Gewichts-Log und Steigerungsvorschlag (gleiche Mechanik wie bei den Hängern)
  const lift = (title, min, lines, ex, name, target, step, reps, hold) => Object.assign(str(title, min, lines.concat(['Gewicht und RPE eintragen – die App schlägt daraus die Last für nächstes Mal vor.']), ex), { log: 'hang', hang: { grip: name, lift: true, target: target || 8, step: step || 2.5, label: 'Zusatzgewicht in kg', reps, hold } });
  const anta = (min) => ({ t: 'acc', title: 'Antagonisten & Schulter', min: min || 10, ex: EX.antagonist, lines: ['2–3 Sätze Push-ups oder Dips, Außenrotation, I-Y-T, Handgelenkstrecker.', 'Locker, 2–3 Wiederholungen in Reserve.'] });
  const cool = (min) => ({ t: 'mob', title: 'Cooldown & Mobility', min: min || 8, routine: RT.cooldown, lines: ['Kurz runterfahren, Unterarme lockern, 2–3 Positionen aus der Mobility-Routine.'] });
  const info = (title, lines, min) => ({ t: 'info', title, min: min || 0, lines });
  // Explosive Fingerbelastung stufenweise zurückholen: schnelle Züge am Griffblock (Hooper's Beta, Ringband Phase 4).
  // Fällt weg, sobald die App die Session wegen eines Fingersignals kürzt.
  const fast = (sets, rpe, note, hold) => ({ t: 'str', title: 'Schnelle Block-Züge (Finger)', min: sets * 2, phy: ['pulley-injury', 4, 'rapid-mobile-board-rows', 'Schnelle Ruderzüge am Griffblock'],
    log: 'hang', hang: { grip: 'Schnelle Block-Züge', sets, target: parseInt(String(rpe).split('–').pop(), 10) || 6, step: 2.5, label: 'Gewicht am Block in kg', hold: !!hold },
    lines: [`${sets} × 8 Züge · 90 s Pause · RPE ${rpe}`,
      'Griffblock (20 mm) an Band oder Kabelzug als Ruderzug – ohne Band: mit leichtem Gewicht zügig vom Boden heben.',
      'Erst 2–3 langsame Züge, dann das Tempo steigern. Die Hälfte der Sätze offen (3 Finger), die Hälfte in halber Leiste – nie voll aufstellen.',
      'Schmerz höchstens 2/10 und am nächsten Morgen ruhig. Sonst leichter, auch wenn es langsam problemlos ginge.',
      'Gewicht und Anstrengung eintragen – die App schlägt daraus den nächsten Schritt vor. Mit Band statt Gewicht: stärkeres Band oder mehr Vordehnung nehmen, sobald es unter der Ziel-Anstrengung liegt.'].concat(note ? [note] : []),
    re: (f) => f <= 0.85 ? info('Schnelle Block-Züge – heute gestrichen', ['Die Finger melden sich oder die Session ist gekürzt: heute keine schnellen Züge.']) : fast(sets, rpe, note, hold) });
  // Lange, ruhige Halte mit offener Hand (Aufbau nach Synovitis: The Climbing Doctor / Vagy)
  const longHold = (sets, secs, note, hold) => ({ t: 'str', title: 'Lange Halte (offene Hand + halbe Leiste)', log: 'hang', hang: { grip: 'Lange Halte', sets, secs, target: 5, step: 2.5, label: 'Gewicht am Block in kg (am Hangboard: negativ = entlastet)', hold: !!hold }, min: Math.round((sets * secs + (sets - 1) * 120) / 60) + 1, phy: ['pip-synovitis', 3, 'open-hand-long-hangs', 'Lange Hänger mit offener Hand'],
    lines: [`${sets} × ${secs} s · 20–30 mm · 2 min Pause · abwechselnd ein Satz offene Hand (schont das Mittelgelenk), ein Satz halbe Leiste (belastet das Ringband kontrolliert)`,
      'Hangboard mit Füßen am Boden oder Block mit Gewicht vom Boden heben. RPE 4–5 – du könntest deutlich länger halten.',
      'Zweck: Sehnen und Ringbänder mit langer, ruhiger Last versorgen, ohne das Mittelgelenk zu reizen.',
      'Kein zunehmender Schmerz, keine Schwellung oder Steifigkeit am nächsten Morgen. Sonst weniger Last.'].concat(note ? [note] : []),
    timer: { label: 'Lange Halte', prep: 10, work: secs, rest: 120, reps: sets, repName: 'Halt', workName: 'Halten', repLabel: 'Halte' },
    re: (f) => f <= 0.65 ? info('Lange Halte – heute gestrichen', ['Die Session ist stark gekürzt: heute keine zusätzliche Fingerlast.']) : longHold(sets, secs, note, hold) });
  const care = () => ({ t: 'mob', title: 'Finger-Pflege', min: 8, routine: RT.forearm, lines: ['8 min: Sehnengleiten, Mittelgelenke mobilisieren, Fingerstrecker mit Band, Unterarme lockern.', 'An jedem Ruhetag. Hält gereizte Gelenke beweglich – kein Kraftreiz.'] });
  // Zweiter Griff im Kraftblock: Positionen dosiert trainieren, die Ringbänder und Lumbrikales am stärksten fordern
  const GRIP_GATE = 'Nur wenn die schnellen Block-Züge schmerzfrei sind und der Finger am Folgetag ruhig bleibt – sonst diese Woche offene Hand.';
  const fullCrimp = () => hangs(2, { title: 'Volle Leiste – Block-Züge', ex: null, phy: ['pulley-injury', 4, 'block-pulls', 'Blockzüge (No-Hang) mit Gewicht'], grip: 'volle Leiste (Daumen drauf)', secs: 7, rest: 180, target: 7, label: 'Gewicht am Block in kg',
    lines: ['Block mit Gewicht vom Boden heben, nicht hängen. RPE 6–7: mit etwa 60–70 % deiner Half-Crimp-Last starten, pro Woche höchstens +2,5 kg.', 'Zweck: Ringbänder an die Position gewöhnen, die sie am stärksten belastet – kontrolliert statt erst am Limit-Boulder.', GRIP_GATE] });
  const pockets = () => hangs(2, { title: 'Loch-Haltezüge', ex: null, phy: ['lumbrical-strain', 4, 'farmer-pockets', 'Loch-Haltezüge mit Gewicht'], grip: 'Dreifingerloch', secs: 10, rest: 120, target: 7, label: 'Gewicht am Block in kg',
    lines: ['Block oder Ring mit Gewicht vom Boden heben. RPE 6–7. Erst drei Finger (ohne kleinen Finger); nach zwei schmerzfreien Einheiten Zweifinger (Mittel + Ring).', 'Grundglieder parallel halten, freie Finger nicht maximal einrollen – das schont die Lumbrikales.', 'Zweck: Löcher dosiert trainieren, bevor du sie am Projekt brauchst.', 'Zieht es in der Handfläche oder schmerzt ein Finger über 2/10: Gewicht runter.'] });
  // Technik-Prinzip der Woche: lenkt die Aufmerksamkeit im Aufwärmen, kostet keine Extra-Zeit
  const prin = () => ({ t: 'prin', title: 'Technik-Prinzip der Woche', min: 0, lines: ['Wende es auf zwei deiner Aufwärm-Boulder an: erst bewusst langsam, dann im normalen Tempo.', 'Kostet keine Extra-Zeit – es lenkt nur, worauf du beim Aufwärmen achtest. Wenn du magst: einen Versuch filmen.'] });
  // Reha im Capacity-Block: deckt Ringbandreizung, Ringbandverdickung, Sehnenscheide und Mittelgelenk gemeinsam ab
  const fprep = () => ({ t: 'str', title: 'Finger vorbereiten (Reha)', min: 5,
    phyList: [['pulley-thickening', 1, 'finger-rom-three-rows', 'Beweglichkeit in drei Positionen'], ['flexor-tenosynovitis', 1, 'tendon-glides', 'Sehnengleiten'], ['flexor-tenosynovitis', 1, 'wrist-tenodesis', 'Handgelenk-Tenodese'], ['pip-synovitis', 2, 'pip-joint-traction', 'Mittelgelenk mobilisieren'], ['pip-synovitis', 2, 'passive-finger-flexion', 'Passive Beugung mit Nachdruck'], ['pulley-thickening', 4, 'h-tape', 'H-Tape anlegen (freiwillig)']],
    lines: ['Beweglichkeit in drei Positionen: Fingerkuppen zur unteren, mittleren und oberen Handfläche, dazwischen ganz strecken – 5 Wiederholungen je Position.', 'Sehnengleiten: gestreckt → Hakenfaust → volle Faust → flache Faust – 10 Durchgänge, langsam.', 'Handgelenk-Tenodese: Handgelenk beugen und strecken, die Finger gehen locker mit – 15 Wiederholungen.', 'Mittelgelenk am rechten Ringfinger: sanfter Längszug mit kleinen Schwingungen – 45 s, danach 3 × 8 s passiv ans Ende der Beugung führen.', 'Tape am Mittelfinger ist freiwillig: einmal testen, ob es beim Klettern Schmerz nimmt oder durch den Druck verstärkt.', 'Deckt alle Möglichkeiten ab: Ringband, Ringbandverdickung, Sehnenscheide und Gelenk. Nichts davon soll wehtun.'] });
  const recruit = (sets, rpe, note) => ({ t: 'str', title: 'Rekrutierungszüge (Reha)', min: Math.round(sets * 1.4) + 1, phy: ['pulley-thickening', 3, 'recruitment-pulls', 'Rekrutierungszüge'],
    lines: [`${sets} Sätze × 3 Züge à 5–8 s · 2 min Satzpause · Anstrengung ${rpe} von 10`, 'Kante 20–25 mm, halbe Leiste, Füße am Boden oder Block an einem festen Punkt. Kraft über 3 s aufbauen, dann halten.', 'Der Unterschied zu den Hängern: Du rollst die Finger aktiv in die Kante, statt nur das Aufgehen zu verhindern.', 'Schmerz höchstens 2/10 während und danach – sonst weniger hart ziehen.'].concat(note ? [note] : []),
    timer: { label: 'Rekrutierungszüge', prep: 10, work: 7, rest: 3, reps: 3, sets, setRest: 120, showSets: true, repName: 'Zug', workName: 'Ziehen', repLabel: 'Züge' },
    re: (f) => f <= 0.65 ? info('Rekrutierungszüge – heute gestrichen', ['Die Session ist stark gekürzt: heute keine zusätzliche Fingerlast.']) : recruit(sets, rpe, note) });
  const fpost = () => ({ t: 'acc', title: 'Finger nachbereiten (Reha)', min: 3,
    phyList: [['pulley-thickening', 1, 'finger-self-massage', 'Selbstmassage am Finger'], ['flexor-tenosynovitis', 1, 'compression-wrap', 'Leichte Kompression']],
    lines: ['3 min Selbstmassage um die schmerzhafte Stelle am Mittelfinger, mit leichtem Druck (höchstens 2/10).', 'Schmerz-Check jetzt und morgen früh: Liegt er über 2/10, war es zu viel – die App kürzt dann die nächste Einheit.', 'Ist ein Finger abends dick oder steif: über Nacht eine leichte Kompression anlegen.', 'Drückt die Klimmzugstange auf die Stelle am Mittelfinger: dickere Stange, Ringe oder Schlaufen nehmen.'] });
  const FINGER_RULE = 'Finger-Regel: statisch und kontrolliert greifen – kein Springen, kein Nachschnappen, nicht voll aufstellen. Schmerzt ein Zug über 2/10: anderen Boulder nehmen.';
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
    [{ t: 'mob', title, min, routine, goals: ROUTINE_GOALS[routine], lines: ['Ruhetag-Routine. Zählt nicht als harter Reiz – Finger bleiben in Ruhe.'].concat(ROUTINE_GOALS[routine] ? ['Danach 8–10 min an deinen Zielen: ' + ROUTINE_GOALS[routine].map(g => GOAL_TITLES[g]).join(' und ') + ' (aktuelle Stufe).'] : []) }].concat(routine === RT.forearm ? [] : [care()]), { core: false, optional: true });
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
    { mo: [19, 21], mi: [12, 13], fr: [3, 7], label: 'Weiter aufbauen – kein fester Deload' },
    { mo: [20, 22], mi: [13, 14], fr: [3, [7, 8]], label: 'Progression nach Log' },
    { mo: [21, 23], mi: [14, 15], fr: [3, 8], label: 'Progression nach Log' },
    { mo: [22, 24], mi: 15, fr: [3, [8, 9]], label: 'Höchstes Volumen, nicht höchste Intensität' },
    { mo: [12, 15], mi: [8, 10], fr: [2, [5, 6]], label: 'Taper und Benchmark', test: true }
  ];
  // Schnelle Block-Züge: [Sätze Mo, RPE, Sätze Fr] je Woche – Tempo und Last steigen nur, wenn der Finger ruhig bleibt.
  const FAST = [[3, '4–5', 0], [3, '5–6', 0], [4, '5–6', 0], [4, '5–6', 2], [4, '6–7', 2], [4, '6–7', 2], [5, '6–7', 2], [2, '6–7', 0]];
  const FAST_NOTE = ['Einstieg: leichter Widerstand. Es geht um Tempo ohne Schmerz, nicht um Last.', 'Neu diese Woche: etwas mehr Tempo und Widerstand, gleiche Satzzahl.', 'Neu diese Woche: ein Satz mehr, sonst alles gleich.', 'Neu diese Woche: die kurze zweite Dosis am Freitag. Montag bleibt gleich.', 'Neu diese Woche: etwas mehr Widerstand, gleiche Satzzahl.', 'Wie letzte Woche – festigen.', 'Neu diese Woche: ein Satz mehr, Widerstand bleibt gleich.'];
  const LONG = [[3, 30], [3, 30], [3, 40], [3, 40], [3, 45], [3, 45], [4, 45], [2, 30]]; // lange Halte: [Sätze, Sekunden] je Woche
  // Rekrutierungszüge: [Sätze Mi, Anstrengung, Sätze Fr] je Woche – wieder nur eine Änderung pro Woche
  const REC = [[4, '6–7', 0], [4, '6–7', 3], [4, '7', 3], [4, '7', 3], [4, '7–8', 3], [4, '7–8', 3], [4, '8', 3], [2, '7', 0]];
  const REC_NOTE = ['Einstieg: lieber zu leicht als zu hart.', 'Neu diese Woche: eine kurze zweite Dosis am Freitag.', 'Neu diese Woche: etwas härter ziehen.', 'Wie letzte Woche – festigen.', 'Neu diese Woche: etwas härter ziehen.', 'Wie letzte Woche – festigen.', 'Neu diese Woche: härter ziehen, nahe an das, was schmerzfrei geht.', 'Test-Woche: wenige, leichte Sätze.'];
  // Wochen, in denen bei der Übung der Umfang steigt (Sätze, Sekunden, zweiter Tag) oder Test ist: Last halten. Sonst darf die Last steigen.
  const FAST_HOLD = [0, 0, 1, 1, 0, 0, 1, 1], LONG_HOLD = [0, 0, 1, 0, 1, 0, 1, 1];
  function maltaWeek(i) {
    const w = MALTA[Math.min(i, MALTA.length - 1)], fq = FAST[Math.min(i, FAST.length - 1)], rq = REC[Math.min(i, REC.length - 1)], rn = REC_NOTE[Math.min(i, REC_NOTE.length - 1)];
    const light = w.deload || w.test;
    const mo = S(0, 'mo', 'submax', 'Max Hangs + Submax Circuits', 'Wiederholbare submaximale Arbeit – Maxkraft nur erhalten', [4, 6], [
      warm(18, ['Vor den Max Hangs einige progressive, kontrollierte Aufwärmhänge.']),
      fprep(),
      hangs(light ? 1 : 2, { target: 7, hold: light, lines: ['Ziel RPE 7, nie über 8. Liegst du darunter (z. B. +30 kg bei RPE 5–6), nimm jede Woche +1,25 bis +2,5 kg – die App schlägt den Schritt aus deinem letzten Eintrag vor.', 'Finger-Regel: Die Hänger bleiben nur drin, solange sie währenddessen und am nächsten Morgen schmerzfrei sind (höchstens 1–2/10). Halbe Leiste, nicht voll aufstellen.', 'Kein Muskelversagen, kein erzwungenes +2,5 kg pro Woche.'].concat(light ? ['Deload/Test: nur 1 Satz bzw. Last halten.'] : []) }),
      fast(fq[0], fq[1], w.test ? 'Check: Wie hoch ist der Schmerz bei schnellen Zügen in halber Leiste? 0–1/10 heißt: bereit für dynamische Züge am Board im nächsten Block.' : w.deload ? 'Deload: leicht und locker.' : FAST_NOTE[Math.min(i, FAST_NOTE.length - 1)] + (i > 0 ? ' Nur weitergehen, wenn die letzte Woche bei höchstens 2/10 lag – sonst die Vorwoche wiederholen.' : ''), !!FAST_HOLD[Math.min(i, 7)]),
      oap(light ? 6 : 8, light ? 'Deload: 2 Sätze pro Seite, locker.' : 'Hauptreiz der Woche für dieses Ziel. Technisch sauber, RPE höchstens 7–8 – in dieser Phase kein Maximalversuch.'),
      circuits(w.mo, w.test ? { lines: ['Benchmark: derselbe Circuit wie in Woche 1 – gleicher Winkel, gleiche Griffe, gleiches Tempo. Runden, Pump nach Runde 5/10 und Erholung nach 5 min notieren.'] } : null),
      info('Technik-Cues in den Circuits', ['Fußkraft in die passende Richtung · Hüfte vor der Greifhand vorbereiten', 'Zugrichtung der Haltehand nutzen · unnötige Griffspannung abbauen']),
      cool(), fpost()
    ], { low: 'Hangs weglassen oder nur 1 Satz, Circuits auf 8–10 Runden kürzen und einen Grad leichter klettern.', bench: !!w.test });
    const mi = S(2, 'mi', 'arc', 'ARC + Movement Quality', 'Aerobe Basis und Bewegungsökonomie', [2, 4], [
      warm(15, ['Sehr leichtes Bouldern, allmählich längere Bewegungsfolgen.']),
      fprep(),
      hs(),
      recruit(rq[0], rq[1], rn),
      longHold(LONG[Math.min(i, LONG.length - 1)][0], LONG[Math.min(i, LONG.length - 1)][1], light ? 'Test-Woche: kürzer, Last wie zuletzt.' : LONG_HOLD[Math.min(i, 7)] ? 'Diese Woche steigt die Haltezeit oder die Satzzahl – die Last bleibt gleich.' : i === 0 ? 'Einstieg: Last so wählen, dass es sich nach 4–5 von 10 anfühlt, und eintragen.' : 'Zeit wie letzte Woche – heute darf die Last einen Schritt steigen, wenn es zuletzt leicht und schmerzfrei war.', !!LONG_HOLD[Math.min(i, 7)]),
      arc(2, w.mi),
      tech(18, ['15–20 min leichte Comp- und Slab-Technik – keine maximalen Dynos, keine harten Fingerzüge.', 'Achte auf Hüftposition, Momentum, Fußdruck, präzise Lastverteilung.', 'Dynamik nur an großen Griffen und aus den Beinen – die Finger fangen nichts ab.']),
      fl(light ? 5 : 7, light ? 'Deload: 2 Sätze.' : 'Hauptreiz der Woche für dieses Ziel.'),
      cool(), fpost()
    ], { low: '1 × ARC statt 2, danach nur 10 min lockere Technik.' });
    const frN = w.fr[0], frMin = w.fr[1];
    const fr = S(4, 'fr', 'long', 'Moderates TB2 + Long Circuits', 'Boardbewegung erhalten, längere Capacity', [5, 7], [
      warm(18),
      fprep(),
      light ? null : oap(6, 'Zweiter, kurzer Reiz: 2 Sätze pro Seite, bevor du ans Board gehst.'),
      rq[2] ? recruit(rq[2], rq[1], 'Kurze zweite Dosis vor dem Board.') : null,
      fq[2] ? fast(fq[2], fq[1], 'Kurze zweite Dosis als Aktivierung vor dem Board – gleiche Last wie am Montag.', true) : null,
      board('Moderates Board-Bouldern', light ? 10 : 15, [light ? '{n} Boulder {g:mod} bei 40°, eher der leichtere Grad, RPE max. 6.' : '{n} Boulder {g:mod} bei 40°, RPE max. 6–7.', '2–3 min Pause, nichts ab {g:limit}, kein wiederholtes Abfallen.', 'Zweck: boardtypische Bewegung und etwas höhere Griffbelastung erhalten.', FINGER_RULE].concat(i >= 4 && !light ? ['Neu ab Woche 5: 2–3 kontrollierte Deadpoints an große Griffe – nur wenn die schnellen Block-Züge bei höchstens 1/10 liegen.'] : []), { ex: EX.flash, rest: [120, 150, 180], n: light ? [2, 3] : [3, 5] }),
      longC(frN, frMin),
      light ? null : fl(5, 'Zweiter, kurzer Reiz: 2–3 Sätze.'),
      cool(), fpost()
    ].filter(Boolean), { low: 'Board-Teil auf 2 leichte Boulder kürzen, Long Circuits 2 × 5 min.' });
    return { label: w.label, deload: !!w.deload, test: !!w.test, sessions: [mo, mi, fr].concat(restDays(false)) };
  }

  // =====================================================================
  // PHASE 2 + 5 — Max Strength & Recruitment
  // =====================================================================
  // Stufentabellen: Umfang und Ziel-RPE steigen so, dass die Wochenlast beim Phasenwechsel
  // höchstens ~10–15 % wächst und der geplante ACWR im Bereich 0,8–1,3 bleibt.
  const ST1 = { sets: [3, 3, 4, 4, 4, 5, 5, 5, 4], secs: [7, 7, 7, 7, 7, 7, 10, 10, 10], pull: ['3 × 5', '3 × 5', '4 × 5', '4 × 4', '4 × 4', '5 × 4', '5 × 3', '5 × 3', '4 × 2'], pullRpe: [7, 7, 7, 8, 8, 8, 8, 8, 8],
    moRpe: [[5, 7], [5, 7], [6, 7], [6, 7], [6, 7], [6, 8], [6, 8], [6, 8], [6, 8]], second: [0, 1, 1, 1, 1, 1, 1, 1, 1], core: [0, 0, 0, 0, 1, 1, 1, 1, 1],
    lim: [0, 3, 3, 3, 4, 4, 4, 4, 4], limMin: [35, 38, 40, 42, 48, 50, 50, 50, 50], frRpe: [[6, 7], [6, 8], [7, 8], [7, 8], [7, 8], [7, 9], [7, 9], [8, 9], [8, 9]] };
  const ST2 = { sets: [4, 4, 4, 4, 5, 5, 5, 5], secs: [7, 7, 10, 10, 10, 10, 10, 10], pull: ['4 × 3', '4 × 3', '5 × 3', '5 × 3', '5 × 2', '5 × 2', '4 × 2', '4 × 2'], pullRpe: [8, 8, 8, 8, 8, 8, 8, 8],
    moRpe: [[6, 7], [6, 7], [6, 7], [6, 8], [6, 8], [6, 8], [6, 8], [6, 8]], second: [1, 1, 1, 1, 1, 1, 1, 1], core: [1, 1, 1, 1, 1, 1, 1, 1],
    lim: [4, 4, 4, 4, 4, 5, 5, 5], limMin: [44, 46, 47, 48, 48, 50, 50, 50], frRpe: [[7, 9], [8, 9], [8, 9], [8, 9], [8, 9], [8, 9], [8, 9], [8, 9]] };
  // Zweiter Griff: Kraftblock I ab Stufe 4 (Woche 5) im Wechsel volle Leiste / offene Hand / Loch, Kraftblock II Pinch / volle Leiste / Loch
  function secondGrip(st, two, o) {
    const base = hangs(2, { target: 7, title: two ? o.gripTitle : 'Open Hand / 3-Finger-Drag', ex: two ? EX.blockLift : EX.openHang, grip: two ? o.grip : '3-Finger-Drag', secs: 7, rest: 180, lines: ['Grip-Rotation: anderer Gelenkwinkel, damit nicht immer dieselbe Struktur (PIP, A2) die Last trägt.', 'RPE 7 – das ist Ergänzung, kein zweiter Maxreiz.'] });
    if (two) return [base, fullCrimp(), pockets()][st % 3];
    return st < 3 ? base : [fullCrimp(), base, pockets()][(st - 3) % 3];
  }
  function strengthWeek(i, n, o) {
    const p = pattern(n)[i], st = p.step, two = !!o.second, T = two ? ST2 : ST1;
    const sets = pick(T.sets, st), secs = pick(T.secs, st), lim = pick(T.lim, st), late = two || st >= 3;
    // Pro Übung nur eine Größe pro Woche: steigt der Umfang (Sätze, Sekunden) oder ändert sich das Schema, bleibt die Last
    const secUp = st > 0 && secs > pick(T.secs, st - 1), volUp = st === 0 || secUp || sets > pick(T.sets, st - 1);
    const pp = (k) => pick(T.pull, k).split('×').map(x => parseInt(x, 10)), pc = pp(st), pv = st > 0 ? pp(st - 1) : pc, pullHold = st > 0 && (pc[0] > pv[0] || pc[1] < pv[1]);
    let mo, mi, fr;
    if (p.test) {
      mo = S(0, 'mo', 'test', 'Test: Max Hang + Zugkraft', 'Standortbestimmung – frisch, wenige Versuche', [7, 8], [
        warm(22, ['Aufwärm-Leiter an der Leiste: 3–4 Hänge mit steigender Last.']),
        hangs(3, { title: 'Max-Hang-Test', test: true, lines: ['In 3 Versuchen zu einem sauberen 7-s-Hang bei RPE 9–9,5 hocharbeiten. Kein Abrutschen, kein Versagen.', 'Beste Last notieren – das ist dein neuer Referenzwert.'] }),
        lift('Weighted Pull-up Test', 15, ['Zu einer schweren 3er-Serie hocharbeiten (RPE 9). 3–4 min Pause.'], EX.pull, 'Weighted Pull-up', 9, 2.5, 3),
        cool()
      ], { low: 'Test um eine Woche verschieben – ein Test ist nur frisch etwas wert.', hi: 3 });
      fr = S(4, 'fr', 'test', o.board + ' Benchmark-Session', 'Boulder aus den ersten Wochen wiederholen und vergleichen', [7, 8], [
        warm(22),
        board('Benchmark-Vergleich', 40, ['2–3 Boulder aus Woche 1–3 wiederholen: weniger Versuche? Kontrollierter?', 'Danach 2 neue Boulder am Flash-Level ({g:flash}). Kein Limit-Projektieren.'], { rest: [180, 240, 300], ex: EX.bench, n: 5 }),
        anta(), cool()
      ], { hi: 8 });
    } else if (p.deload) {
      mo = S(0, 'mo', 'strength', 'Fingerkraft + Zugkraft (Deload)', 'Reiz halten, Umfang runter', [5, 6], [
        warm(20, ['Aufwärm-Leiter an der Leiste: 3–4 Hänge mit steigender Last.']),
        hangs(2, { hold: true, lines: ['Deload: Last der Vorwoche halten, nur 2 Sätze.'] }),
        lift('Weighted Pull-ups', 12, ['2 × 3 mit der Last der Vorwoche.'], EX.pull, 'Weighted Pull-up', 8, 2.5, 3, true),
        anta(8)
      ], { low: 'Nur Aufwärmen + 2 Hangs.', hi: 2 });
      fr = S(4, 'fr', 'limit', o.board + ' moderat (Deload)', 'Bewegung am Board erhalten – kein Projektieren', [5, 6], [
        warm(22),
        board('Moderates Board-Bouldern', 25, ['{n} Boulder am Flash-Level ({g:flash}), RPE 6. Kein Projektieren.'], { ex: EX.flash, rest: [120, 180], n: [5, 6] }),
        anta(8), cool(6)
      ], { low: '3 leichte Boulder, dann Mobility.', hi: 0 });
    } else {
      mo = S(0, 'mo', 'strength', 'Fingerkraft + Zugkraft', 'Maximalkraft und Rekrutierung – wenig Volumen, volle Qualität', pick(T.moRpe, st), [
        warm(20, ['Aufwärm-Leiter an der Leiste: 3–4 Hänge mit steigender Last (ca. 50 / 70 / 85 %).']),
        hangs(sets, { secs, hold: volUp, lines: [volUp ? 'Diese Woche steigt der Umfang (mehr Sätze oder längere Hänger) – die Last bleibt deshalb gleich.' + (secUp ? ' Fühlen sich die längeren Hänger deutlich schwerer an: 2,5 kg runter.' : '') : 'Umfang wie letzte Woche – steigern darfst du heute nur die Last. Ziel RPE 8: Lag die letzte Einheit darunter und blieben die Finger am Folgetag ruhig, +1,25 kg, bei RPE 6 oder weniger +2,5 kg.', 'Jeder Satz endet 1–2 s vor dem Versagen.'].concat(!two && st === 0 ? ['Woche 1: mit der Malta-Last starten – neu ist nur der dritte Satz.'] : []) }),
        pick(T.second, st) ? secondGrip(st, two, o) : null,
        lift('Weighted Pull-ups', late ? 15 : 12, [`${pick(T.pull, st)} · RPE ${pick(T.pullRpe, st)} · 3 min Pause`, pullHold ? 'Diese Woche ändert sich das Schema – das Gewicht wird nur auf die neue Wiederholungszahl umgerechnet, nicht zusätzlich gesteigert.' : 'Schema wie letzte Woche – steigern darfst du heute nur das Gewicht.', 'Volle Bewegungsamplitude, explosiv hoch, kontrolliert runter.', 'Das ist auch die Kraftbasis für den One-Arm-Pull-up.'], EX.pull, 'Weighted Pull-up', pick(T.pullRpe, st) + 1, 2.5, pc[1], pullHold),
        pick(T.core, st) ? fl(8, '3 Sätze der aktuellen Stufe.') : null,
        anta(8)
      ].filter(Boolean), { low: 'Nur Hangs (2 Sätze) + Pull-ups (2 Sätze), Rest streichen. Bei Fingersignal: statt Hangs Block-Lifts mit 70 %.', hi: sets + (pick(T.second, st) ? 2 : 0) });
      fr = S(4, 'fr', 'limit', o.board + ' Limit Boulder', 'Maximalkraft an der Wand – kurze, harte Boulder mit langen Pausen', pick(T.frRpe, st), [
        warm(two || st >= 4 ? 24 : 22, ['3–4 Boulder am Board mit steigender Schwierigkeit, letzte 2 mit vollem Einsatz aber sicher machbar.']),
        !two && st <= 3 ? fast(2, '6–7', 'Aktivierung und Finger-Check: Liegt der Schmerz hier über 1/10, heute nur statische Boulder – keine dynamischen Züge an Leisten.') : null,
        lim === 0
          ? board('Einstieg: Board kennenlernen', pick(T.limMin, st), ['{n} Boulder {g:flash} (zwei Grade unter dem Limit), RPE 7, je max. 3 Versuche.', 'Griffe, Tritte und Stil des Boards lesen lernen – noch kein Limit.'], { rest: [180, 240], n: [4, 5] })
          : board('Limit Bouldern', pick(T.limMin, st), [`{n} Boulder mit 3–6 Zügen (oder Einzelzüge härterer Boulder), je 3–5 Versuche, RPE ${pick(T.frRpe, st)[1] >= 9 ? '8–10' : '8–9'}.`, 'Zielgrad: {g:limit}. Einzelzüge dürfen einen Grad härter sein.', 'Pro Woche steigt nur eine Sache: entweder der Zielgrad oder die Anzahl Boulder – nie beides.', 'Pause mindestens 1 min pro gekletterten Zug (3–5 min).', 'Grifftypen mischen: 1 Leisten-, 1 Pinch-, 1 Sloper-/Weitzug-Boulder' + (two ? ' + 1 Anti-Style-Boulder.' : '.'), 'Aufhören, solange du dich noch scharf fühlst.'].concat(!two && st <= 3 ? ['Finger: Dynamische Züge und volle Leiste einzeln und nur schmerzfrei dazunehmen. Reagiert ein Finger am nächsten Morgen, eine Woche zurück zu statischen Bouldern.'] : []), { n: lim }),
        anta(late ? 10 : 8), cool(6)
      ].filter(Boolean), { low: 'Statt Limit: 5 Boulder am Flash-Level ({g:flash}) mit vollem Fokus auf saubere Ausführung, dann Schluss.', hi: Math.max(6, lim * 4) });
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
    // Langer zweiter Block (ab 7 Wochen): erste Hälfte Kontaktkraft und Limit-Züge, nach dem Deload Power Endurance
    const split = pe && n >= 7, peFri = pe && (!split || st >= 3), ps = split ? st - 3 : st;
    const campusOk = st >= (pe ? 0 : 2);
    const mo = S(0, 'mo', 'power', 'Power + Kraft erhalten', 'Kraft in schnelle Bewegung umsetzen – wenige, explosive Versuche', light ? [5, 6] : test ? [6, 8] : [7, 9], [
      warm(22, ['Aufwärm-Leiter an der Leiste, dann 2–3 dynamische Züge an guten Griffen.']),
      hangs(2, { hold: true, lines: ['Erhaltungsdosis mit aktueller Last – dient hier auch als Aktivierung.'] }),
      test
        ? str('Power-Check', 20, ['3 Benchmark-Züge oder -Boulder aus Woche 1 wiederholen: höher, kontrollierter, weniger Versuche?', 'Maximal 8 Versuche insgesamt, volle Pausen.'], EX.explosive)
        : light
        ? board('Lockere dynamische Boulder', 20, ['{n} dynamische Boulder am Flash-Level ({g:flash}), RPE 6. Schnell, aber entspannt.'], { ex: EX.flash, rest: [120, 180], n: [4, 5] })
        : campusOk
          ? str('Campus / explosive Züge', 25, [`${pick([4, 5, 6, 6], st - (pe ? 0 : 2))} Sätze Ladders (z. B. 1-3-5) an großen Sprossen, 2–3 min Pause.`, 'Nur wenn Finger am Morgen 0–1/10, kein PIP-Signal in der Vorwoche und dynamische Züge an Leisten schmerzfrei sind – sonst dynamische Board-Boulder an guten Griffen.', 'Jeder Satz maximal schnell. Sobald die Geschwindigkeit fällt: Ende.'], EX.campus)
          : str('Explosive Pull-ups + dynamische Boulder', 25, ['4 × 3 explosive Pull-ups (so hoch wie möglich), 2 min Pause.', '6–8 Versuche an weiten, dynamischen Board-Zügen mit guten Griffen. Volle Pause.'], EX.explosive),
      fl(8, '3 Sätze der aktuellen Stufe.'),
      anta(8)
    ], { low: 'Hangs 2 Sätze + 4 dynamische Boulder am Flash-Level ({g:flash}), kein Campus.', hi: light ? 2 : 8 });
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
        board('Benchmark-Vergleich', 40, ['2–3 Boulder aus den ersten Wochen wiederholen: weniger Versuche? Kontrollierter?', 'Danach 2 neue Boulder am Flash-Level ({g:flash}). Kein Limit-Projektieren.'], { rest: [180, 240, 300], ex: EX.bench, n: 5 }),
        anta(), cool(6)
      ], { hi: 8 })
      : peFri
      ? S(4, 'fr', 'pe', 'Lange Boulder & Linkups', 'Kraft wiederholt abrufen – Qualität bleibt der Maßstab', light ? [5, 6] : [7, 9], [
        warm(22),
        light
          ? board('Moderate längere Boulder', 25, ['{n} Boulder mit 8–12 Zügen am Flash-Level ({g:flash}).'], { ex: EX.flash, rest: [180], n: 4 })
          : ps < 2
            ? board('Lange Boulder', 45, ['{n} Boulder mit 6–12 Zügen ({g:near}) bei RPE 8, je 2–3 Versuche, 4–5 min Pause.', 'Oder Linkups: Boulder A direkt in Boulder B.'], { ex: EX.long, rest: [240, 300], n: [4, 5] })
            : board('Boulder Triples', 45, ['{n} Sätze: denselben fordernden Boulder ({g:flash} bis {g:near}) 3 × klettern, 90 s zwischen den Gos, 6–8 min Satzpause.', 'Pump bis 6–7/10 ist hier okay – aber kein Versuch mit schlechter Technik.'], { ex: EX.triples, rest: [90, 360, 480], n: pick([3, 3, 4, 4], ps - 2), unit: 'Sätze' }),
        anta(), cool(6)
      ], { low: '3 längere Boulder am Flash-Level ({g:flash}), lange Pausen.', hi: light ? 0 : 10 })
      : S(4, 'fr', 'limit', 'Limit Boulder: weite Züge & Kontaktkraft', 'Harte Einzelzüge mit vollem Einsatz', light ? [5, 6] : [8, 9], [
        warm(24),
        light
          ? board('Moderates Board-Bouldern', 25, ['{n} Boulder am Flash-Level ({g:flash}), RPE 6.'], { ex: EX.flash, rest: [120, 180], n: 5 })
          : board('Limit Bouldern', 50, ['{n} Boulder mit 3–6 Zügen, je 3–5 Versuche, RPE 8–10.', 'Zielgrad: {g:limit}.', 'Schwerpunkt: weite, schnelle Züge und Griffe, die du im Flug treffen musst.', 'Zusätzlich 1 Boulder als echter Flash-Versuch: lesen, visualisieren, ein Go.', 'Pause mindestens 1 min pro gekletterten Zug.'], { n: pick([3, 3, 4, 4], st) }),
        anta(), cool(6)
      ], { low: '5 Boulder am Flash-Level ({g:flash}), sauber und schnell.', hi: light ? 0 : 14 });
    return { label: p.test ? 'Power-Check & Taper' : p.deload ? 'Deload' : 'Aufbau ' + (st + 1), deload: !!p.deload, test: !!p.test, sessions: [mo, mi, fr].concat(restDays(false)) };
  }

  // =====================================================================
  // PHASE 4 / 7 / 8 — Performance, Spezifität, Taper
  // =====================================================================
  const primer = (title) => S(0, 'mo', 'primer', title || 'Primer', 'Kurz, scharf, frisch rausgehen', [5, 6], [
    warm(20),
    hangs(2, { hold: true, lines: ['Aktuelle Last, sauber. Kein Zusatzsatz.'] }),
    board('Wenige harte, bekannte Züge', 20, ['{n} harte, aber bekannte Boulder ({g:near}), je 1–2 Versuche.', 'Nach 45–60 min ist Schluss – du sollst dich danach besser fühlen als davor.'], { rest: [180, 240], n: [3, 4] }),
    cool(8)
  ], { low: 'Nur Aufwärmen + 2 Hangs + 2 Boulder.', hi: 6 });
  const perfDay = (title, lines, kind, rpe, focus) => S(5, 'sa', kind || 'perf', title, focus || 'Leistung abrufen – wenige Versuche mit voller Absicht', rpe || [8, 9], [
    info('Vorher festlegen', ['1–2 Prozessziele (z. B. „ruhig durch die Crux atmen“).', 'Versuchs-Limit und Endpunkt: Was beendet die Session?']),
    warm(30, ['Am Fels: Schultern, Hüfte, Finger progressiv – erst große Griffe, dann Einzelzüge des Projekts.']),
    board('Versuche', 90, lines.concat(['Zielgrad: {g:limit}.']), { rest: [300, 480, 600], n: [5, 8], unit: 'Versuche' }),
    info('Nachher (5 min)', ['Was hat sich verbessert? Was habe ich gelernt? Warum ist das wichtig?', 'Fehler als Daten: Technik – was löste sich zuerst? Physis – was ermüdete zuerst? Kopf – wo zögerte ich?'])
  ], { low: 'Tag in einen Erkundungstag verwandeln: Züge ausbouldern, Beta filmen, keine Durchstiegsversuche.', hi: 12, movable: true });

  function springWeek(i, n) {
    if (n === 1) {   // nur eine Woche: Standort testen, dann direkt weiter trainieren
      return {
        label: 'Test-Woche', test: true, note: 'Was hat dich begrenzt – Finger, Zugkraft, Technik oder Kopf? Das legt den Schwerpunkt für den zweiten Kraftblock fest.', sessions: [
          primer(),
          S(2, 'mi', 'skill', 'Skill & Mobility leicht', 'Beweglich und scharf bleiben', [3, 4], [warm(12), tech(30), oap(6, 'Erhalt: 2 Sätze pro Seite.'), fl(5, 'Erhalt: 2 Sätze.'), cool(15)], { core: false, optional: true, low: 'Nur Mobility.' }),
          perfDay('Test-Tag (Fels oder Halle)', ['2–3 Boulder am oder knapp über deinem Limit auswählen. 5–8 Qualitätsversuche insgesamt, 5–10 min Pause dazwischen.', 'Kein Fels in Reichweite? Send-Session am Board oder an neu geschraubten Bouldern in der Halle – der Test funktioniert dort genauso.', 'Danach auswerten und die Standortbestimmung im Fortschritt-Tab eintragen.'])
        ].concat(restDays(true))
      };
    }
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
          hangs(last ? 2 : 3, { hold: true, lines: ['Erhaltungsdosis. Grifftyp des Projekts bevorzugen.'] }),
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
      points: ['3 Einheiten pro Woche: Mo Submax Circuits, Mi ARC + Technik, Fr Board + Long Circuits', 'Erst Umfang steigern, nicht gleichzeitig Schwierigkeit und Spitzenlast', 'Finger: Max Hangs bleiben, solange sie schmerzfrei sind. Explosive Belastung kommt stufenweise zurück – schnelle Block-Züge Mo und ab Woche 4 auch Fr, Schmerz höchstens 2/10', 'Pro Übung steigt pro Woche nur eine Größe: bei den Hängern die Last (Sätze bleiben), bei Circuits und ARC der Umfang (Grad bleibt)', 'Die Reha-Lasten steigen messbar: Max Hangs, schnelle Block-Züge und lange Halte haben ein Gewichts-Log mit Steigerungsvorschlag, die Rekrutierungszüge steigen über die Anstrengung (6–7 → 8)', 'Reha in jeder Einheit: Finger vorbereiten (5 min), Rekrutierungszüge Mi und ab Woche 2 auch Fr, Finger nachbereiten (3 min). Zusammen mit Hängern, schnellen Block-Zügen und langen Halten deckt das Ringbandreizung, Ringbandverdickung, Sehnenscheide und Mittelgelenk ab', 'Robuste Finger: Mi lange Halte mit offener Hand, an jedem Ruhetag 8 min Finger-Pflege', 'Kein fester Deload: Die Last liegt unter deinem gewohnten Pensum, und die App kürzt bei Warnsignalen von selbst. Woche 8 Taper + Benchmark gegen Woche 1', 'Nebenziele in kleinen Dosen: One-Arm-Pull-up (Mo, Fr), Front Lever (Mi, Fr), Handstand (Mi, Do), Pancake und Spagat an den Ruhetagen'],
      not: ['Kein Springen, kein Nachschnappen und kein voller Aufsteller an kleinen Griffen, solange Mittel- oder Ringfinger dabei schmerzen', 'Keine 7:3-Repeaters, keine Density Hangs', 'Keine maximalen Weighted Pull-ups – die One-Arm-Stufen bleiben bei RPE 7–8 und wenigen Sätzen', 'Keine regelmäßigen Limit-Sessions, kein Campus, kein Pump 8–9/10'],
      themes: ['foundations', 'slab', 'tension'], week: maltaWeek },
    { id: 'strength1', name: 'Max Strength & Recruitment', short: 'Maxkraft', type: 'str', weeks: 12, where: 'Ravensburg · MoonBoard, Hangboard + Gewichte',
      goal: 'Finger- und Zugkraft kontrolliert aufbauen. Aerobes Volumen sinkt auf Erhaltungsdosis, schwere Fingerlast steigt schrittweise.',
      points: ['Mo Hangboard + Weighted Pull-ups (kontrollierte Last), Fr MoonBoard Limit, Mi Skill Day', 'Zwei harte Fingertage mit 3–4 Tagen Abstand – eine Hauptanpassung pro Session', 'Pro Übung steigt pro Woche nur eine Größe: Last oder Umfang. In Wochen mit mehr Sätzen, längeren Hängern oder neuem Schema bleibt die Last gleich', 'Grip-Rotation: Half Crimp + Open Hand, ab Woche 5 im Wechsel auch volle Leiste und Löcher (dosiert, nur schmerzfrei); am Board Leiste/Pinch/Sloper mischen', 'Woche 4 und 8 Deload, Woche 12 Test', 'Zwölf Wochen, weil Sehnen und Ringbänder langsamer nachziehen als die Kraft', 'Nebenziele: One-Arm-Pull-up und Front Lever am Mittwoch frisch, Handstand Mi/Do, Pancake und Spagat an den Ruhetagen'],
      not: ['Keine Pump-Circuits nach Max Hangs', 'Kein Campus in dieser Phase', 'Keine Laststeigerung in zwei Wochen hintereinander, wenn die Finger reagieren'],
      themes: ['tension', 'tactics', 'foundations'], week: (i, n) => strengthWeek(i, n, { board: 'MoonBoard' }) },
    { id: 'power1', name: 'Power & Contact Strength', short: 'Power', type: 'pow', weeks: 4, flex: true, where: 'Ort offen · Board, Campusboard',
      goal: 'Kraft in schnelle, weite Züge umsetzen. Eine Max-Hang-Erhaltungsdosis pro Woche bleibt.',
      points: ['Vier Wochen: Power baut sich schnell auf und belastet die Finger am stärksten', 'Mo Power (explosive Züge, in Woche 3 Campus nur bei ruhigen Fingern)', 'Fr Limit Boulder mit weiten Zügen und Flash-Versuch', 'Mi Skill Day: Dynamik, Timing, Koordination'],
      not: ['Kein Campus bei Fingersignalen', 'Keine Marathon-Sessions – Power braucht Frische'],
      themes: ['dynamic', 'mental', 'tension'], week: (i, n) => powerWeek(i, n, {}) },
    { id: 'spring', name: 'Test-Woche', short: 'Test', type: 'perf', weeks: 1, flex: true, where: 'Ort offen · Fels oder Halle',
      goal: 'Eine Woche Standortbestimmung nach dem ersten Kraft- und Power-Block: Kraft an harten Bouldern abrufen und sehen, was begrenzt. Danach geht es direkt mit Training weiter.',
      points: ['Mo kurzer Primer, Sa Test-Tag (verschiebbar) – am Fels, wenn es passt, sonst am Board oder in der Halle', 'Wenige Versuche mit voller Absicht, klare Endpunkte', 'Danach Standortbestimmung eintragen: Sie zeigt, woran der zweite Kraftblock arbeiten soll'],
      not: ['Kein zusätzliches Training „weil es gut läuft“', 'Kein Projektieren bis die Haut durch ist'],
      themes: ['tactics', 'outdoor', 'mental'], week: springWeek },
    { id: 'strength2', name: 'Strength II', short: 'Maxkraft II', type: 'str', weeks: 11, flex: true, where: 'Ort offen · Board, Hangboard + Gewichte',
      goal: 'Zweiter Kraftblock auf höherem Niveau – gezielt an den Schwächen, die die Test-Woche gezeigt hat.',
      points: ['Elf Wochen mit acht Aufbauwochen: Die Zeit des gekürzten Frühjahrsblocks steckt hier, weil Fingerkraft dein Engpass ist', 'Max Hangs 4–5 Sätze, 7–10 s, plus zweiter Grifftyp im Wechsel: Pinch-Block, volle Leiste, Löcher', 'Pro Übung steigt pro Woche nur eine Größe: In Wochen mit mehr Sätzen, längeren Hängern oder neuem Schema bleibt die Last gleich', 'Weighted Pull-ups schwerer und kürzer', 'Fr Limit Boulder mit einem Anti-Style-Boulder pro Session'],
      not: ['Kein Campus', 'Keine Pump-Einheiten'],
      themes: ['tension', 'foundations', 'slab'], week: (i, n) => strengthWeek(i, n, { board: 'Board', second: true, grip: 'Pinch', gripTitle: 'Pinch-Block Lifts' }) },
    { id: 'power2', name: 'Power & Power Endurance', short: 'Power / PE', type: 'pow', weeks: 8, flex: true, where: 'Ort offen · Board, Campusboard',
      goal: 'Die aufgebaute Kraft in schnelle, harte Züge umsetzen und sie dann wiederholt über längere Boulder abrufen. Rhythmus, Snap und Flow entstehen hier.',
      points: ['Acht Wochen in zwei Hälften, dazwischen ein Deload', 'Woche 1–3 Kontaktkraft: Mo Power (Campus / explosive Züge) + Hang-Erhalt, Fr Limit Boulder mit weiten, schnellen Zügen', 'Woche 5–7 Power Endurance: Mo Power bleibt, Fr lange Boulder (6–12 Züge), Linkups, dann Boulder Triples', 'Mi Skill Day: Taktik, Pacing, Flash-Strategie', 'Woche 8 Power-Check – danach beginnt die Projekt-Vorbereitung'],
      not: ['Kein Versuch mit schlechter Technik – Qualität bleibt der Maßstab'],
      themes: ['dynamic', 'tactics', 'mental'], week: (i, n) => powerWeek(i, n, { pe: true }) },
    { id: 'spec', name: 'Spezifität & Simulation', short: 'Spezifisch', type: 'perf', weeks: 4, flex: true, where: 'Ort offen · Projektgebiet',
      goal: 'Rohe Kraft in Projekt-Flow übersetzen: Anforderungen des 8A-Projekts nachbauen und am Fels ausbouldern.',
      points: ['Mo Kraft erhalten + Projekt-Simulatoren', 'Sa Felstag: Züge lösen, Beta filmen, Links aufbauen', 'Du jagst keine Anpassungen mehr – du übst Performance'],
      not: ['Keine neuen Trainingsreize', 'Kein hohes Volumen'],
      themes: ['outdoor', 'tactics', 'mental'], week: specWeek },
    { id: 'taper', name: 'Taper & Perform', short: '8A', type: 'perf', weeks: 5, flex: true, where: 'Projektgebiet',
      goal: 'Frisch und gefährlich auftauchen. Weniger Einheiten, mehr Ruhe, beste Felsqualität. Das Performance-Fenster liegt im November.',
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
      const weeks = Math.max(p.id === 'spring' ? 1 : 2, Math.min(16, ov[p.id] || p.weeks));
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
        if ((s.key === 'mo' || s.key === 'fr') && s.kind !== 'mobility' && s.kind !== 'test' && !s.blocks.some(b => b.t === 'prin')) {
          const k = s.blocks.findIndex(b => b.t === 'warmup'); if (k >= 0) s.blocks.splice(k + 1, 0, prin());
        }
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
  function scale(s, f, o) {
    const noHang = !!(o && o.noHang), same = !f || Math.abs(f - 1) < 0.01;
    if (!s || (same && !noHang)) return s;
    // noHang: Hang-Blöcke fallen ganz aus (aktive Fingerverletzung) – als Hinweis-Block, damit die Reihenfolge gleich bleibt
    const blocks = s.blocks.map(b => noHang && b.t === 'hang'
      ? { t: 'info', title: b.title + ' – heute gestrichen', min: 0, lines: ['Wegen der aktiven Fingerverletzung fällt dieser Block aus. Mach stattdessen den Reha-Block oben.'] }
      : (b.re && !same ? b.re(f) : b));
    return Object.assign({}, s, { blocks, min: blocks.reduce((a, b) => a + (b.min || 0), 0), hi: s.hi ? Math.round(s.hi * Math.min(1, f || 1) * (noHang ? 0.5 : 1)) : s.hi, factor: f || 1, base: s });
  }
  // Zählbare Blöcke einer Session: was im Log abgefragt wird.
  const counts = (s) => s.blocks.map((b, i) => b.count ? { i, title: b.title, unit: b.count.unit, plan: Math.round(mid(b.count.n)), range: rng(b.count.n), sec: b.count.sec || 0, t: b.t } : null).filter(Boolean);

  window.Plan = { PHASES, KINDS, EX, RT, ROUTINE_GOALS, GOAL_TITLES, scale, counts, layout, weekAt, plannedOn, findPlan, dateOf, plannedLoad, plannedWeekLoad, end, reset() { cache = null; weekCache = {}; } };
})();
