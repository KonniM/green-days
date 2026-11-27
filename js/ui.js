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
  const stepper = (name, val, unit, hint) => `<div class="stepper"><button type="button" data-act="step" data-d="-1" aria-label="weniger">−</button><input type="number" name="${name}" value="${val == null ? '' : val}" min="0" max="199" inputmode="numeric" aria-label="${e(unit)}"><button type="button" data-act="step" data-d="1" aria-label="mehr">+</button><span class="unit"><b>${e(unit)}</b>${hint ? `<em>${e(hint)}</em>` : ''}</span></div>`;
  const firstSentence = (t) => { const m = /^(.{20,170}?[.!?])(\s|$)/.exec(t || ''); return m ? m[1] : (t || ''); };
  // 10-Sekunden-Clip: Ausschnitt eines YouTube-Videos, stumm in Schleife (eingebettet, nichts wird kopiert).
  function clipHTML(x, cls) {
    const c = x && x.clip; if (!c || c.s == null) return '';
    return `<button class="clip ${cls || ''}" data-act="clip" data-v="${e(c.v)}" data-s="${c.s}" data-e="${c.e}" data-snd="${c.snd ? 1 : ''}" style="background-image:url(https://i.ytimg.com/vi/${e(c.v)}/mqdefault.jpg)" aria-label="Ausschnitt abspielen"><span class="clip-badge">▶ ${clipLen(c)}${c.snd ? ' · mit Erklärung' : ''}</span></button>`;
  }
  // Länge des Ausschnitts: so lang, wie der Abschnitt im Video wirklich ist
  function clipLen(c) { const d = Math.max(1, Math.round(c.e - c.s)); return d >= 60 ? Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0') + ' min' : d + ' s'; }
  const clipCmd = (rec, func, args) => { try { rec.fr.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: args || [] }), '*'); } catch (err) {} };
  const clips = [];
  function playClip(el) {
    const v = el.dataset.v, s0 = +el.dataset.s, e0 = +el.dataset.e, snd = el.dataset.snd === '1';
    const box = document.createElement('div'); box.className = el.className + ' is-playing';
    const origin = location.origin && location.origin !== 'null' ? '&origin=' + encodeURIComponent(location.origin) : '';
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v}?playsinline=1&autoplay=1&mute=1&controls=${snd ? 1 : 0}&rel=0&modestbranding=1&iv_load_policy=3&start=${s0}&enablejsapi=1${origin}" title="Ausschnitt" allow="autoplay; encrypted-media; picture-in-picture" loading="lazy"></iframe>${snd ? '<button class="clip-snd" data-act="clip-snd">Ton an</button>' : ''}<a class="clip-full" href="https://www.youtube.com/watch?v=${v}&t=${s0}s" target="_blank" rel="noopener">ganzes Video ↗</a>`;
    el.replaceWith(box);
    const fr = box.firstChild, rec = { fr, s: s0, e: e0 };
    clips.push(rec);
    // Der Player meldet seine Zeit erst, nachdem er „listening“ empfangen hat – so lange wiederholen, bis er antwortet.
    let tries = 0;
    const hello = () => { if (rec.ok || !document.contains(fr) || tries++ > 40) return clearInterval(rec.iv); try { fr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (err) {} };
    rec.iv = setInterval(hello, 700);
  }
  window.addEventListener('message', (ev) => {
    if (!/youtube(-nocookie)?\.com$/.test((ev.origin || '').replace(/^https?:\/\/(www\.)?/, ''))) return;
    const rec = clips.find(c => c.fr.contentWindow === ev.source); if (!rec || !document.contains(rec.fr)) return;
    let d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (err) { return; }
    rec.ok = true;
    const info = d && d.info; if (!info) return;
    const cmd = (func, args) => clipCmd(rec, func, args);
    const now = Date.now();
    // Ende des Ausschnitts erreicht → zurück an den Anfang (ohne YouTubes eigenen End-Stopp, der pausieren würde)
    if ((info.playerState === 0 || (typeof info.currentTime === 'number' && info.currentTime >= rec.e - 0.2)) && now - (rec.seekAt || 0) > 900) {
      rec.seekAt = now; cmd('seekTo', [rec.s, true]); cmd('playVideo');
    } else if (info.playerState === 2 && now - (rec.seekAt || 0) < 2500) cmd('playVideo'); // Pause direkt nach dem Sprung: weiterlaufen
  });
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
  const gfill = (t, date) => window.Grades && t ? Grades.fill(t, date) : t;
  // Harte Fingerbelastungen einer Einheit: aus Graden und Hängern, wenn eingetragen – sonst aus dem Plan geschätzt
  const hiFor = (s, r, hangs, date) => {
    const est = Math.round(((s && s.hi) || 0) * Math.min(1.5, r.e ? r.e.ratio : 1));
    if (!window.Grades || !Grades.has(r.grades, r.tries)) return est;
    const hs = hangs && hangs.length ? Loads.hiFromHangs(hangs) : (s ? s.blocks.filter(b => b.t === 'hang').reduce((a, b) => a + ((b.hang && b.hang.sets) || 0), 0) : 0);
    return Grades.hiOf(r.grades, r.tries, date) + hs;
  };
  const gradeForm = (cs, v, date) => window.Grades && (!cs || cs.some(c => /Boulder|Versuche/.test(c.unit))) ? Grades.formHTML(v, date, true) : '';
  function blockHTML(b, i, live, draft, date) {
    const dt = date || (draft && draft.date) || D.today();
    const done = live && draft.checks && draft.checks[i];
    const ex = b.ex && find(b.ex), rt = b.routine && find('routine:' + b.routine);
    let extra = '', lines = b.lines || [];
    if (b.t === 'goal' && window.Goals) {
      const g = Goals.cur(b.goal);
      if (g) {
        lines = [`Stufe ${g.n}/${g.total}: ${g.step.name_de}`, g.step.dose_de || '', g.step.criterion_de ? 'Weiter, wenn: ' + g.step.criterion_de : ''].filter(Boolean).concat(lines);
        extra += (live ? clipHTML(g.step, 'clip-sm') : '') + `<button class="link-row" data-act="goal-open" data-id="${e(b.goal)}"><span>${live ? 'Ergebnis eintragen · Cues' : 'Stufen & Cues'}</span><span>›</span></button>`;
      }
    }
    if (b.t === 'prin' && window.Tech) {
      const w = Plan.weekAt(live ? draft.date : D.today()), p = Tech.ofWeek(w);
      if (p && live) extra += Tech.blockExtra(w); else if (p) lines = [`Diese Woche: ${p.name_de} – ${p.one_de}`].concat(lines);
    }
    if (b.t === 'tech' && live && window.Tech) extra += Tech.weekRow(Plan.weekAt(draft.date));
    if (b.t === 'tech' && live) {
      const sk = skillOfWeek(Plan.weekAt(draft.date));
      if (sk) extra += `<p class="one">${e(sk.one_de || firstSentence(sk.concept_de))}</p>` + clipHTML(sk, 'clip-sm') + `<button class="link-row" data-act="lib-open" data-id="${e(sk.id)}"><span>Fokus: <b>${e(sk.name_de)}</b></span><span>Drills ›</span></button>`;
    }
    if (ex && !(b.t === 'goal' && window.Goals && Goals.cur(b.goal))) extra += `<button class="link-row" data-act="lib-open" data-id="${e(b.ex)}"><span>${e(ex.item.name_de)}</span><span>Cues & Video ›</span></button>`;
    if (b.phy) extra += `<button class="link-row" data-act="phy-ex" data-c="${e(b.phy[0])}" data-p="${b.phy[1]}" data-ex="${e(b.phy[2])}"><span>${e(b.phy[3] || 'So geht die Übung')}</span><span>Ablauf & Video ›</span></button>`;
    if (rt) extra += `<button class="link-row" data-act="routine-open" data-id="${e(b.routine)}"><span>${e(rt.item.name_de)}</span><span>Routine ›</span></button>`;
    if (b.log === 'hang' && window.Loads) { const wl = Loads.line(b, dt); if (wl) lines = [wl].concat(lines); }
    let ctrl = '';
    if (live) {
      if (b.timer) ctrl += `<button class="btn btn-primary" data-act="block-timer" data-i="${i}">⏱ Timer starten</button>`;
      if (b.rest) ctrl += `<div class="rest-row"><span>Pause</span>${b.rest.map(r => `<button class="chip chip-btn" data-act="rest-timer" data-sec="${r}">${Timer.mmss(r)}</button>`).join('')}</div>`;
      if (b.log === 'hang') {
        const hs = (draft.hangs || []).filter(h => h.block === i);
        if (hs.length) ctrl += `<p class="logged">${hs.map(h => `${h.secs ? `${h.sets} × ${h.secs} s · ` : ''}${h.kg >= 0 && !b.hang.label ? '+' : ''}${h.kg} kg · RPE ${h.rpe}`).join('<br>')}</p>`;
        ctrl += `<button class="btn btn-ghost" data-act="hang-log" data-i="${i}">Last eintragen</button>`;
      }
    }
    return `<article class="block${done ? ' is-done' : ''} bt-${b.t}">
      <header>${b.t === 'info' ? '<span class="num">i</span>' : live ? `<button class="check" data-act="block-check" data-i="${i}" aria-pressed="${!!done}" aria-label="Erledigt">${done ? '✓' : ''}</button>` : `<span class="num">${i + 1}</span>`}
        <h4>${e(b.title)}</h4>${b.min ? `<span class="meta">${b.min} min</span>` : ''}</header>
      <ul>${lines.map(l => `<li>${e(gfill(l, dt))}</li>`).join('')}</ul>${extra}${ctrl ? `<div class="block-ctrl">${ctrl}</div>` : ''}
    </article>`;
  }

  const cnt = (b) => b.count ? ` · ${Array.isArray(b.count.n) ? b.count.n[0] + '–' + b.count.n[1] : b.count.n} ${b.count.unit}` : '';
  const logLine = (log) => `${log.climbs ? log.climbs + ' Climbs · ' : ''}${log.minSrc === 'e' ? '≈ ' : ''}${log.minutes} min · RPE ${log.rpe} · Load ${Store.sessionLoad(log)}${window.Grades && log.grades && Grades.summary(log.grades) ? ' · ' + Grades.summary(log.grades) : ''}`;
  function adaptLine(s) {
    if (S().adaptOff[s.planId]) return `<button class="adapt tone-muted" data-act="adapt-toggle" data-plan="${s.planId}"><b>Original-Plan gewählt</b><span>Tippen, um die Anpassung wieder einzuschalten.</span></button>`;
    const a = s.adapt; if (!a || !a.reasons.length) return '';
    const pct = Math.round((a.f - 1) * 100);
    return `<button class="adapt tone-${pct < 0 ? 'orange' : pct > 0 ? 'green' : 'muted'}" data-act="adapt-info" data-plan="${s.planId}"><b>${pct < 0 ? '▼ An dich angepasst: −' + Math.abs(pct) + ' %' : pct > 0 ? '▲ An dich angepasst: +' + pct + ' %' : 'Hinweis für heute'}</b><span>${e(a.reasons[0].text)}</span></button>`;
  }
  function sessionCard(s0, date) {
    const s = Adapt.today(s0.planId, date) || s0;
    const log = Store.sessionForPlan(s.planId), skipped = S().skips[s.planId];
    const moved = S().moves[s.planId] && S().moves[s.planId] !== s.baseDate;
    const head = `<header class="card-head">${kindChip(s.kind)}<span class="meta">${s.optional ? 'optional · ' : ''}ca. ${s.min} min · RPE ${s.rpe[0]}–${s.rpe[1]}</span></header>
      <h3>${e(s.title)}</h3><p class="focus">${e(s.focus)}</p>`;
    if (log) return `<article class="card session is-logged">${head}
      <div class="logline">${gdBadge(log.color)}<span>${logLine(log)}</span></div>
      <div class="actions"><button class="btn btn-ghost" data-act="log-edit" data-id="${log.id}">Bearbeiten</button><button class="btn btn-ghost" data-act="plan-detail" data-plan="${s.planId}">Plan ansehen</button></div></article>`;
    if (skipped) return `<article class="card session is-skipped">${head}<p class="hint">Ausgelassen.</p><div class="actions"><button class="btn btn-ghost" data-act="unskip" data-plan="${s.planId}">Wieder einplanen</button></div></article>`;
    return `<article class="card session">${head}${adaptLine(s)}
      <ol class="mini">${s.blocks.filter(b => b.t !== 'info').map(b => `<li><span>${e(b.title)}${e(cnt(b))}</span>${b.min ? `<span>${b.min}′</span>` : ''}</li>`).join('')}</ol>
      ${moved ? `<p class="hint">Verschoben von ${D.fmt(s.baseDate, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\.$/, '')}.</p>` : ''}
      <div class="actions">${s.kind === 'mobility' && s.blocks[0].routine && find('routine:' + s.blocks[0].routine)
        ? `<button class="btn btn-primary" data-act="routine-open" data-id="${e(s.blocks[0].routine)}" data-plan="${s.planId}">Routine öffnen</button>`
        : Plan.dateOf(s) < D.today() ? `<button class="btn btn-primary" data-act="late-log" data-plan="${s.planId}">Nachtragen</button>`
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
  const SKILL_LV = ['neu', 'bewusst', 'sicher', 'automatisch'];
  const skillRate = (sk) => { const lvl = S().skillLevels[sk.id] || 0; return `<div class="scale scale-wide skill-lv"><input type="hidden" name="lv" value="${lvl}">${SKILL_LV.map((t, i) => `<button type="button" data-act="skill-lv" data-id="${e(sk.id)}" data-v="${i + 1}" aria-checked="${lvl === i + 1}">${t}</button>`).join('')}</div>`; };
  function skillCard(w) {
    const sk = skillOfWeek(w); if (!sk) return '';
    return `<article class="card skill"><header class="card-head"><span class="eyebrow">Technik-Fokus der Woche</span><span class="meta">${e(THEMES[sk.theme] || sk.theme)}</span></header>
      <h3>${e(sk.name_de)}</h3><p class="one">${e(sk.one_de || firstSentence(sk.concept_de))}</p>
      ${clipHTML(sk)}
      <details class="more"><summary>Was ist gemeint?</summary><p>${e(firstSentence(sk.concept_de))}</p></details>
      <details class="more"><summary>Worauf genau achten</summary><ul class="${sk.watch_de ? 'steps' : 'cues'}">${(sk.watch_de || (sk.cues_de || []).slice(0, 3)).map(c => `<li>${e(c)}</li>`).join('')}</ul></details>
      ${window.Tech ? Tech.weekRow(w) : ''}
      <span class="eyebrow">Wie gut sitzt es?</span>${skillRate(sk)}
      <div class="actions"><button class="btn btn-ghost" data-act="lib-open" data-id="${e(sk.id)}">Drills</button><button class="btn btn-ghost" data-act="skill-swap" data-mon="${w.monday}">Anderer Fokus</button></div></article>`;
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
    const dr = S().draft;
    if (dr) h += dr.date < today
      ? `<article class="card resume"><span class="eyebrow">Noch nicht abgeschlossen</span><h3>${e(dr.title)} · ${e(D.fmt(dr.date, { weekday: 'long' }))}</h3><p class="hint">Diese Session wurde gestartet, aber nie geloggt. Schließ sie ab – sie wird mit dem richtigen Datum eingetragen.</p><div class="actions"><button class="btn btn-primary" data-act="draft-finish">Abschließen & loggen</button><button class="btn btn-ghost" data-act="draft-discard">Verwerfen</button></div></article>`
      : `<article class="card resume"><h3>Laufende Session: ${e(dr.title)}</h3><div class="actions"><button class="btn btn-primary" data-act="resume">Weiter</button><button class="btn btn-ghost" data-act="draft-finish">Loggen</button><button class="btn btn-ghost" data-act="draft-discard">Verwerfen</button></div></article>`;
    // Einheiten der letzten Tage, die weder geloggt noch ausgelassen sind
    const open = [];
    for (let i = 1; i <= 4; i++) { const d = D.add(today, -i); Plan.plannedOn(d).forEach(s => { if (!s.optional && s.kind !== 'mobility' && !S().skips[s.planId] && !Store.sessionForPlan(s.planId) && !(dr && dr.planId === s.planId)) open.push({ d, s }); }); }
    if (open.length) h += `<article class="card"><span class="eyebrow">Noch nicht eingetragen</span>${open.map(o => `<div class="open-row"><span><b>${e(o.s.title)}</b><em>${e(D.fmt(o.d, { weekday: 'long', day: 'numeric', month: 'short' }))}</em></span><span class="actions"><button class="btn btn-primary btn-sm" data-act="late-log" data-plan="${o.s.planId}">Nachtragen</button><button class="btn btn-ghost btn-sm" data-act="skip" data-plan="${o.s.planId}">Ausgelassen</button></span></div>`).join('')}
      <p class="hint">Nachgetragene Einheiten zählen mit ihrem Datum in Last und ACWR.</p></article>`;
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
    if (window.Injury) h += Injury.card(today);
    Store.sessionsOn(today).filter(s => !s.planId).forEach(s => {
      h += `<article class="card session is-logged"><header class="card-head">${kindChip(s.kind)}</header><h3>${e(s.title)}</h3><div class="logline">${gdBadge(s.color)}<span>${logLine(s)}</span></div><div class="actions"><button class="btn btn-ghost" data-act="log-edit" data-id="${s.id}">Bearbeiten</button></div></article>`;
    });
    h += acwrCard(today) + skillCard(w);
    if (w && w.week.note) h += `<article class="card"><span class="eyebrow">Notiz zur Woche</span><p>${e(w.week.note)}</p></article>`;
    h += `<button class="btn btn-ghost btn-block" data-act="free-log">＋ Extra-Session eintragen (Fels, Halle …)</button>`;
    if (window.Injury) h += Injury.linkButton();
    if (window.Progress) h = Progress.todayCards(h, today, w);
    return h;
  }

  // ---------- Session-Modus ----------
  function startSession(planId) {
    const s = Plan.findPlan(planId); if (!s) return;
    const w = Plan.weekAt(D.today()), sk = skillOfWeek(w);
    const a = S().adaptOff[planId] ? { f: 1, reasons: [] } : Adapt.factor(s, D.today());
    S().draft = { planId, date: D.today(), title: s.title, kind: s.kind, startedAt: Date.now(), stage: 'pre', checks: {}, hangs: [], capSec: 0, done: {}, pre: {}, f: a.f, adapt: a, goal: sk && sk.goal_examples_de ? sk.goal_examples_de[0] : '' };
    Store.save(); renderSession();
  }
  const curS = () => Adapt.today(S().draft.planId);
  function renderSession() {
    const root = $('#session'), d = S().draft;
    if (!d) { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('in-session'); return; }
    const s = curS();
    document.body.classList.add('in-session');
    root.hidden = false;
    let body = '';
    if (d.stage === 'pre') {
      body = `<div class="card form" id="pre"><span class="eyebrow">Green-Day-Filter · vor der Session</span>
        <h3>Bin ich erholt genug, um mit Absicht zu trainieren?</h3>
        ${field('Erholung', scale('recovery', 1, 5, d.pre.recovery || null, { wide: true, ends: ['platt', 'frisch'] }))}
        ${field('Energie & Fokus', scale('energy', 1, 5, d.pre.energy || null, { wide: true, ends: ['niedrig', 'hoch'] }))}
        ${field('Finger gerade', scale('finger', 0, 10, d.pre.finger == null ? Math.min(10, Adapt.finger(d.date).v) : d.pre.finger, { ends: ['ruhig', 'schmerzhaft'] }))}
        ${field('Ein klares Ziel für heute', `<textarea name="goal" rows="2" placeholder="z. B. Hüfte vor jedem Zug vorbereiten">${e(d.goal || '')}</textarea>`, 'Ein Prozessziel, kein Ergebnisziel.')}
        <div id="pre-advice"></div>
        <button class="btn btn-primary btn-block" data-act="pre-go">Session beginnen</button>
        <button class="btn btn-ghost btn-block" data-act="pre-skip">Alles gut – direkt starten</button></div>
        <article class="card"><span class="eyebrow">Hauptreiz heute</span><h3>${e(s.focus)}</h3>
        <p class="meta">Ziel-RPE ${s.rpe[0]}–${s.rpe[1]} · ca. ${s.min} min</p>
        ${s.low ? `<p class="hint"><b>Low-Energy-Version:</b> ${e(gfill(s.low, Plan.dateOf(s)))}</p>` : ''}</article>`;
    } else if (d.stage === 'run') {
      const mins = Math.round((Date.now() - d.startedAt) / 60000);
      body = `<div class="run-meta"><span>${mins} min</span>${d.goal ? `<span class="goal">Ziel: ${e(d.goal)}</span>` : ''}</div>
        ${d.adapt && d.adapt.reasons.length ? `<p class="banner tone-${d.f < 1 ? 'orange' : 'green'}"><b>${d.f < 1 ? 'Heute −' + Math.abs(Math.round((d.f - 1) * 100)) + ' % Umfang' : d.f > 1 ? 'Heute +' + Math.round((d.f - 1) * 100) + ' % Umfang' : 'Hinweis'}:</b> ${e(d.adapt.reasons.map(r => r.text).join(' '))}${d.adapt.noHard && s.low ? ' ' + e(s.low) : ''}</p>` : ''}
        ${window.Injury ? Injury.sessionCard() : ''}
        ${s.blocks.map((b, i) => blockHTML(b, i, true, d)).join('')}
        <article class="card stop"><span class="eyebrow">Session beenden, wenn …</span><ul>${s.stop.map(x => `<li>${e(x)}</li>`).join('')}</ul></article>
        <button class="btn btn-primary btn-block btn-xl" data-act="to-post">Session beenden & loggen</button>`;
    } else {
      body = postPlanned(s, d);
    }
    root.innerHTML = `<header class="session-head"><button class="icon-btn" data-act="session-min" aria-label="Minimieren">⌄</button>
      <div><span class="eyebrow">${e(Plan.KINDS[s.kind].label)}</span><h2>${e(s.title)}</h2></div>
      <span class="stage">${d.stage === 'pre' ? '1/3' : d.stage === 'run' ? '2/3' : '3/3'}</span></header>
      <div class="session-body">${body}</div>`;
    if (d.stage === 'pre') updateAdvice();
    if (d.stage === 'post') paintLoad(root);
  }
  function updateAdvice() {
    const f = readForm($('#pre')), d = S().draft, base = Plan.findPlan(d.planId), box = $('#pre-advice');
    if (S().adaptOff[d.planId]) { box.innerHTML = ''; return; }
    const a = Adapt.factor(base, d.date, f), pct = Math.round((a.f - 1) * 100);
    box.innerHTML = a.reasons.length ? `<p class="banner tone-${pct < 0 ? 'orange' : 'green'}"><b>${pct ? (pct > 0 ? '+' : '−') + Math.abs(pct) + ' % Umfang heute' : 'Hinweis'}:</b> ${e(a.reasons.map(r => r.text).join(' '))}${a.noHard && base.low ? ' <b>Low-Energy-Version:</b> ' + e(base.low) : ''}</p>` : '';
  }
  // ---------- Log ----------
  const moreFields = (v, o) => `<details class="more"><summary>Mehr notieren (optional)</summary>
      ${o && o.noMin ? '' : field('Dauer in Minuten', `<input type="number" name="minutes" min="5" max="600" value="${v.minSrc === 'u' ? v.minutes : ''}" placeholder="automatisch" inputmode="numeric">`, 'Leer lassen: die App misst oder schätzt die Dauer.')}
      ${field('Maximaler Pump', scale('pump', 0, 10, v.pump == null ? null : v.pump))}
      ${field('Board, Winkel, Grade', `<input type="text" name="board" value="${e(v.board || '')}" placeholder="z. B. TB2 40°, V2–V3">`)}
      ${field('Eine Sache, die besser wurde', `<textarea name="improved" rows="2">${e(v.improved || '')}</textarea>`)}
      ${field('Eine Sache, die ich gelernt habe', `<textarea name="learned" rows="2">${e(v.learned || '')}</textarea>`)}
      ${field('Warum das wichtig ist', `<textarea name="why" rows="2">${e(v.why || '')}</textarea>`)}</details>`;
  const rpeField = (v) => field('Wie anstrengend war es insgesamt?', scale('rpe', 1, 10, v || null, { ends: ['sehr leicht', 'maximal'] }));
  const fingerField = (v) => field('Finger am Ende', scale('fingerEnd', 0, 10, v == null ? 0 : v, { ends: ['ruhig', 'schmerzhaft'] }));
  function postPlanned(s, d) {
    const cs = Plan.counts(s);
    return `<div class="card form" id="post" data-mode="plan"><span class="eyebrow">Nach der Session</span><h3>Was hast du geschafft?</h3>
      ${cs.length ? cs.map(c => field(c.title, stepper('cnt_' + c.i, d.done && d.done[c.i] != null ? d.done[c.i] : c.plan, c.unit, 'Plan ' + c.range))).join('') : '<p class="hint">Diese Einheit hat nichts zum Zählen – RPE genügt.</p>'}${gradeForm(cs, {}, d.date)}
      ${rpeField()}<p class="load-preview" id="load-preview"></p>${fingerField()}${moreFields({})}
      <button class="btn btn-primary btn-block" data-act="post-save">Speichern</button>
      <button class="btn btn-ghost btn-block" data-act="back-run">Zurück zu den Blöcken</button></div>`;
  }
  // Geplante Einheit ohne Session-Modus eintragen (z. B. gestern trainiert, App nicht benutzt)
  function postLate(s) {
    const cs = Plan.counts(s), date = Plan.dateOf(s) <= D.today() ? Plan.dateOf(s) : D.today();
    return `<div class="form" id="post" data-mode="late" data-plan="${s.planId}"><p class="hint">Trag ein, was du geschafft hast – die Dauer schätzt die App aus deinen Zahlen.</p>
      ${field('Datum', `<input type="date" name="date" value="${date}" max="${D.today()}">`)}
      ${cs.map(c => field(c.title, stepper('cnt_' + c.i, c.plan, c.unit, 'Plan ' + c.range))).join('')}${gradeForm(cs, {}, date)}
      ${rpeField()}<p class="load-preview" id="load-preview"></p>${fingerField()}${moreFields({})}
      <button class="btn btn-primary btn-block" data-act="late-save" data-plan="${s.planId}">Speichern</button></div>`;
  }
  const FREE_KINDS = [['outdoor', 'Fels'], ['gym', 'Bouldern Halle'], ['limit', 'Board / Limit'], ['strength', 'Kraft'], ['skill', 'Technik locker'], ['other', 'Sonstiges']];
  function postFree(v) {
    return `<div class="form" id="post" data-mode="free"><p class="hint">Alles außerhalb des Plans zählt mit: Die Last fließt in den ACWR, und die nächsten geplanten Einheiten passen sich an.</p>
      <div class="chips pick"><input type="hidden" name="kind" value="${v.kind}">${FREE_KINDS.map(k => `<button type="button" class="chip chip-btn" data-act="pick" data-v="${k[0]}" aria-pressed="${v.kind === k[0]}">${k[1]}</button>`).join('')}</div>
      ${field('Wie viele Climbs?', stepper('climbs', v.climbs == null ? 8 : v.climbs, 'Boulder / Versuche'), 'Grob reicht: alles, was dich angestrengt hat. Aufwärm-Boulder nicht mitzählen. Trägst du unten Grade ein, zählt die App daraus.')}${window.Grades ? Grades.formHTML({}, v.date || D.today(), false) : ''}
      ${rpeField()}<p class="load-preview" id="load-preview"></p>${fingerField()}
      <details class="more"><summary>Datum, Titel, Dauer (optional)</summary>
      <div class="grid2">${field('Datum', `<input type="date" name="date" value="${v.date || D.today()}" max="${D.today()}">`)}${field('Dauer in Minuten', `<input type="number" name="minutes" min="5" max="600" placeholder="automatisch" inputmode="numeric">`)}</div>
      ${field('Titel', `<input type="text" name="title" placeholder="z. B. Fels: Projekt ausbouldern">`)}</details>
      <button class="btn btn-primary btn-block" data-act="free-save">Speichern</button></div>`;
  }
  function postEdit(v) {
    return `<div class="form" id="post" data-mode="edit">
      ${v.planId ? '' : `${field('Titel', `<input type="text" name="title" value="${e(v.title || '')}">`)}${field('Datum', `<input type="date" name="date" value="${v.date}" max="${D.today()}">`)}`}
      <div class="grid2">${field('Climbs', `<input type="number" name="climbs" min="0" max="300" value="${v.climbs == null ? '' : v.climbs}" inputmode="numeric">`)}${field('Dauer in Minuten', `<input type="number" name="minutes" min="5" max="600" value="${v.minutes || ''}" inputmode="numeric">`)}</div>
      ${rpeField(v.rpe)}<p class="load-preview" id="load-preview"></p>${fingerField(v.fingerEnd)}
      ${field('Green-Day-Farbe', `<select name="color"><option value="">Offen</option>${GD.map(g => `<option value="${g.k}"${v.color === g.k ? ' selected' : ''}>${g.label} – ${e(g.sub)}</option>`).join('')}</select>`)}
      ${window.Grades ? Grades.formHTML(v, v.date, Grades.has(v.grades, v.tries)) : ''}
      ${moreFields(v, { noMin: true })}
      <button class="btn btn-primary btn-block" data-act="log-update" data-id="${v.id}">Speichern</button>
      <button class="btn btn-danger btn-block" data-act="log-delete" data-id="${v.id}">Einheit löschen</button></div>`;
  }
  // Liest das Log-Formular und rechnet Dauer + Last aus
  function calcPost(root) {
    const post = root.id === 'post' ? root : $('#post', root); if (!post) return null;
    const f = readForm(post), mode = post.dataset.mode, r = { f, mode };
    if (mode === 'plan') {
      const d = S().draft, s = curS(); r.cnt = {};
      Object.keys(f).forEach(k => { if (k.indexOf('cnt_') === 0 && f[k] != null) r.cnt[k.slice(4)] = f[k]; });
      r.e = Adapt.duration(s, r.cnt, d.startedAt, d.postAt);
      r.minutes = f.minutes || r.e.minutes; r.src = f.minutes ? 'u' : r.e.src; r.climbs = r.e.climbs;
    } else if (mode === 'late') {
      const s = Plan.findPlan(post.dataset.plan); r.cnt = {};
      Object.keys(f).forEach(k => { if (k.indexOf('cnt_') === 0 && f[k] != null) r.cnt[k.slice(4)] = f[k]; });
      r.e = Object.assign(Adapt.est(s, r.cnt), { src: 'e' });
      r.minutes = f.minutes || r.e.minutes; r.src = f.minutes ? 'u' : 'e'; r.climbs = r.e.climbs;
    } else if (mode === 'free') {
      r.minutes = f.minutes || Adapt.freeMinutes(f.kind, f.climbs); r.src = f.minutes ? 'u' : 'e'; r.climbs = f.climbs || 0;
    } else { r.minutes = f.minutes; r.src = null; r.climbs = f.climbs; }
    if (window.Grades) {
      const g = Grades.collect(f); r.grades = g.grades; r.tries = g.tries;
      if (mode === 'free' && g.n > 0) { r.climbs = g.n; if (!f.minutes) r.minutes = Adapt.freeMinutes(f.kind, g.n); }
    }
    return r;
  }
  function paintLoad(root) {
    const r = calcPost(root); if (!r) return;
    const p = $('#load-preview', root); if (!p) return;
    const how = r.src === 'u' ? 'von dir eingetragen' : r.src === 'm' ? 'in der App gemessen' : r.src === 'e' ? (r.mode === 'plan' || r.mode === 'late' ? 'geschätzt aus deinen Zahlen' + (r.e.calibrated ? ', kalibriert an ' + r.e.calibrated + ' gemessenen Sessions' : '') : 'geschätzt aus deinen Climbs') : '';
    p.innerHTML = r.minutes ? `${r.src === 'e' ? '≈ ' : ''}<b>${r.minutes} min</b>${how ? ' (' + how + ')' : ''}${r.f.rpe ? ` · Load <b>${Math.round(r.minutes * r.f.rpe)}</b>` : ' · RPE wählen für die Last'}` : '';
  }
  function collectPost(root) {
    const r = calcPost(root);
    if (!r || !r.f.rpe) { toast('Bitte noch die Anstrengung (RPE) wählen.'); return null; }
    if (!r.minutes) { toast('Dauer fehlt.'); return null; }
    return r;
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
  function nav(v) { view = v; render(); const m = $('#view'); m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter'); m.scrollTop = 0; window.scrollTo(0, 0); }

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
    start: (el) => {
      const d = S().draft, id = el.dataset.plan;
      $$('.sheet-wrap').forEach(closeSheet);
      if (!d) return startSession(id);
      if (d.planId === id) return renderSession();
      // Statt einer Sperre: klar anbieten, was mit der offenen Session passieren soll
      sheet('Es ist noch eine Session offen', `<p class="lead">„${e(d.title)}“ vom ${e(D.fmt(d.date, { weekday: 'long', day: 'numeric', month: 'short' }))} wurde gestartet, aber nicht geloggt.</p>
        <button class="btn btn-primary btn-block" data-act="draft-finish">Erst diese abschließen & loggen</button>
        <button class="btn btn-ghost btn-block" data-act="draft-replace" data-plan="${e(id)}">Verwerfen und die neue Session starten</button>
        <p class="hint">Verwerfen betrifft nur die offene, nicht geloggte Session – bereits gespeicherte Einheiten bleiben.</p>`);
    },
    resume: () => renderSession(),
    'draft-finish': () => {
      const d = S().draft; if (!d) return; $$('.sheet-wrap').forEach(closeSheet);
      // Alte, nie beendete Session: Dauer nicht aus der Uhr nehmen, sondern schätzen
      if (!d.postAt) d.postAt = d.date < D.today() || Date.now() - d.startedAt > 5 * 3600000 ? d.startedAt : Date.now();
      d.stage = 'post'; Store.save(); renderSession(); const b = $('.session-body'); if (b) b.scrollTop = 0;
    },
    'draft-replace': (el) => { S().draft = null; Store.save(); $$('.sheet-wrap').forEach(closeSheet); startSession(el.dataset.plan); },
    'draft-discard': (el) => {
      if (el && !el.dataset.sure) { el.dataset.sure = '1'; el.textContent = 'Wirklich verwerfen?'; setTimeout(() => { if (document.contains(el)) { el.dataset.sure = ''; el.textContent = 'Verwerfen'; } }, 4000); return; }
      S().draft = null; Store.save(); renderSession(); render(); toast('Offene Session verworfen.');
    },
    'late-log': (el) => {
      const id = el.dataset.plan, s = Plan.findPlan(id), d = S().draft; if (!s) return;
      if (Store.sessionForPlan(id)) { toast('Diese Einheit ist schon eingetragen.'); return; }
      $$('.sheet-wrap').forEach(closeSheet);
      if (d && d.planId === id) return A['draft-finish']();
      sheet(s.title + ' nachtragen', postLate(s), { tall: true, mount: (w) => paintLoad(w) });
    },
    'late-save': (el) => {
      const w = el.closest('.sheet-wrap'), r = collectPost(w); if (!r) return;
      const s = Plan.findPlan(el.dataset.plan), f = r.f;
      const log = Store.addSession({ date: f.date || Plan.dateOf(s), planId: s.planId, title: s.title, kind: s.kind, minutes: r.minutes, minSrc: r.src, rpe: f.rpe, rpePlan: s.rpe, climbs: r.climbs, counts: r.cnt, pump: f.pump, fingerEnd: f.fingerEnd,
        hi: hiFor(s, r, null, f.date || Plan.dateOf(s)), grades: r.grades, tries: r.tries, capMin: r.e.capMin, adaptF: 1, adaptT: false, late: true,
        board: f.board, improved: f.improved, learned: f.learned, why: f.why, hangs: [], color: null });
      Adapt.learnFrom(log, r.e); if (window.Grades) Grades.learn(r.grades, log.date); Store.save();
      closeSheet(w); render(); toast(`Nachgetragen für ${D.fmt(log.date, { weekday: 'long' })} · Load ${Store.sessionLoad(log)}.`);
    },
    'session-min': () => { $('#session').hidden = true; document.body.classList.remove('in-session'); render(); },
    'pre-go': () => {
      const f = readForm($('#pre')), d = S().draft; d.pre = { recovery: f.recovery, energy: f.energy, finger: f.finger }; d.goal = f.goal;
      if (!S().adaptOff[d.planId]) { const a = Adapt.factor(Plan.findPlan(d.planId), d.date, f); d.f = a.f; d.adapt = a; }
      d.stage = 'run'; d.startedAt = Date.now(); Store.save(); renderSession(); $('.session-body').scrollTop = 0;
    },
    'pre-skip': () => { const p = $('#pre'); [['recovery', 4], ['energy', 4]].forEach(x => { const i = $(`input[name=${x[0]}]`, p); if (!i.value) i.value = x[1]; }); A['pre-go'](); },
    'to-post': () => { const d = S().draft; d.stage = 'post'; d.postAt = d.postAt || Date.now(); Store.save(); renderSession(); $('.session-body').scrollTop = 0; },
    step: (el) => { const inp = $('input', el.parentNode); inp.value = Math.max(0, (Number(inp.value) || 0) + (+el.dataset.d)); const post = el.closest('#post'); if (post) paintLoad(post.closest('.sheet-wrap') || post); },
    pick: (el) => { const box = el.parentNode; $('input', box).value = el.dataset.v; $$('button', box).forEach(b => b.setAttribute('aria-pressed', String(b === el))); const post = el.closest('#post'); if (post) paintLoad(post); },
    clip: (el) => playClip(el),
    'clip-snd': (el) => { const fr = $('iframe', el.parentNode), rec = clips.find(c => c.fr === fr); if (rec) { clipCmd(rec, 'unMute'); clipCmd(rec, 'setVolume', [100]); clipCmd(rec, 'playVideo'); } el.remove(); },
    'adapt-info': (el) => {
      const s = Adapt.today(el.dataset.plan), base = Plan.findPlan(el.dataset.plan), a = s.adapt || { f: 1, reasons: [] };
      sheet('An dich angepasst', `<p class="lead">${a.f === 1 ? 'Umfang wie geplant.' : `Plan ${base.min} min → heute <b>${s.min} min</b> (${a.f > 1 ? '+' : '−'}${Math.abs(Math.round((a.f - 1) * 100))} % Umfang).`}</p>
        <ul class="points">${a.reasons.map(r => `<li>${e(r.text)}</li>`).join('')}</ul>
        ${a.noHard && base.low ? `<article class="card"><span class="eyebrow">Empfohlen: Low-Energy-Version</span><p>${e(gfill(base.low, D.today()))}</p></article>` : ''}
        <p class="hint">Die App rechnet mit deinem Fingerstatus, dem ACWR, Extra-Sessions, deinen Green Days und deinem üblichen Pensum. Sie steigert, sobald eine Einheit grün und im RPE-Rahmen war (+5 bis +15 %, insgesamt höchstens +20 % über Plan), und bremst bei Fingersignalen, zu vielen harten Fingerbelastungen oder einem Last-Spike über dem 1,5-Fachen.</p>
        <button class="btn btn-ghost btn-block" data-act="adapt-toggle" data-plan="${e(el.dataset.plan)}">Heute trotzdem den Original-Plan nehmen</button>`);
    },
    'adapt-toggle': (el) => { const id = el.dataset.plan; if (S().adaptOff[id]) delete S().adaptOff[id]; else S().adaptOff[id] = true; Store.save(); $$('.sheet-wrap').forEach(closeSheet); render(); },
    'back-run': () => { S().draft.stage = 'run'; Store.save(); renderSession(); },
    'block-check': (el) => { const d = S().draft; d.checks[el.dataset.i] = !d.checks[el.dataset.i]; Store.save(); renderSession(); },
    'block-timer': (el) => {
      const d = S().draft, i = +el.dataset.i, b = curS().blocks[i];
      Timer.open(b.timer, { onDone: (res) => {
        if (b.log === 'cap') { d.capSec += res.workSec; d.done = d.done || {}; d.done[i] = (d.done[i] || 0) + (res.reps || 0); d.checks[i] = true; Store.save(); renderSession(); toast(`${res.reps} ${b.count ? b.count.unit : ''} · ${Timer.mmss(res.workSec)} Kletterzeit notiert.`); }
        else if (b.log === 'hang') hangSheet(i, res.reps);
        else { d.checks[i] = true; Store.save(); renderSession(); }
      } });
    },
    'rest-timer': (el) => Timer.open({ label: 'Pause', prep: 0, work: +el.dataset.sec, reps: 1, workName: 'Pause', tone: 'rest', repName: 'Pause' }),
    'hang-log': (el) => hangSheet(+el.dataset.i),
    'hang-save': (el) => {
      const w = el.closest('.sheet-wrap'), f = readForm(w), d = S().draft, i = +el.dataset.i, b = curS().blocks[i];
      if (f.kg == null || !f.rpe) { toast('Last und RPE eintragen.'); return; }
      d.hangs.push({ block: i, title: b.title, grip: b.hang.grip, edge: b.hang.edge, secs: b.hang.secs, sets: f.sets || b.hang.sets, reps: b.hang.reps, kg: f.kg, rpe: f.rpe });
      d.checks[i] = true; Store.save(); closeSheet(w); renderSession();
      if (f.rpe >= 9 && (b.hang.target || 8) < 9) toast('RPE 9+: nächste Woche Last halten oder senken.');
    },
    'post-save': () => {
      const r = collectPost($('#post')); if (!r) return;
      const d = S().draft, s = curS(), f = r.f;
      const log = Store.addSession({ date: d.date, planId: d.planId, title: d.title, kind: d.kind, minutes: r.minutes, minSrc: r.src, rpe: f.rpe, rpePlan: s.rpe, climbs: r.climbs, counts: r.cnt, pump: f.pump, fingerEnd: f.fingerEnd,
        hi: hiFor(s, r, d.hangs, d.date), grades: r.grades, tries: r.tries, capMin: Math.max(r.e.capMin, Math.round((d.capSec || 0) / 60)), adaptF: d.f == null ? 1 : d.f, adaptT: !!(d.adapt && d.adapt.transient),
        board: f.board, improved: f.improved, learned: f.learned, why: f.why, pre: d.pre, goal: d.goal, hangs: d.hangs, color: null });
      Adapt.learnFrom(log, r.e); if (window.Grades) Grades.learn(r.grades, log.date);
      S().draft = null; Store.save(); renderSession(); nav('today');
      toast(`Gespeichert · Load ${Store.sessionLoad(log)}. Ob es ein Green Day war, zeigt die nächste Session.`);
    },
    'free-log': (el) => sheet('Extra-Session', postFree({ date: (el && el.dataset.d) || D.today(), kind: 'outdoor' }), { tall: true, mount: (w) => { if (el && el.dataset.d && el.dataset.d !== D.today()) $('details', w).open = true; paintLoad(w); } }),
    'free-save': (el) => {
      const w = el.closest('.sheet-wrap'), r = collectPost(w); if (!r) return; const f = r.f;
      const log = Store.addSession({ date: f.date || D.today(), planId: null, title: f.title || (FREE_KINDS.find(k => k[0] === f.kind) || [0, Plan.KINDS[f.kind].label])[1], kind: f.kind, minutes: r.minutes, minSrc: r.src, rpe: f.rpe, climbs: r.climbs, fingerEnd: f.fingerEnd,
        hi: window.Grades && Grades.has(r.grades, r.tries) ? Grades.hiOf(r.grades, r.tries, f.date || D.today()) : (f.kind === 'outdoor' || f.kind === 'limit' || f.kind === 'gym' ? Math.round((r.climbs || 0) * (f.rpe >= 7 ? 1 : 0.4)) : 0),
        grades: r.grades, tries: r.tries, capMin: 0, hangs: [], color: null });
      Adapt.learnFrom(log, null); if (window.Grades) Grades.learn(r.grades, log.date); Store.save();
      closeSheet(w); render(); toast(`Extra-Session gespeichert · Load ${Store.sessionLoad(log)}. Die nächsten Einheiten rechnen damit.`);
    },
    'log-edit': (el) => {
      const s = S().sessions.find(x => x.id === el.dataset.id); if (!s) return;
      sheet(s.title, postEdit(s), { tall: true, mount: (w) => paintLoad(w) });
    },
    'log-update': (el) => {
      const w = el.closest('.sheet-wrap'), r = collectPost(w); if (!r) return; const f = r.f;
      const old = S().sessions.find(x => x.id === el.dataset.id);
      const patch = { minutes: f.minutes, minSrc: old && old.minutes !== f.minutes ? 'u' : old && old.minSrc, climbs: f.climbs || 0, rpe: f.rpe, pump: f.pump, fingerEnd: f.fingerEnd, board: f.board, improved: f.improved, learned: f.learned, why: f.why, color: f.color || null };
      if (f.title != null) { patch.title = f.title || old.title; patch.date = f.date || old.date; }
      if (window.Grades && (Grades.has(r.grades, r.tries) || Grades.has(old.grades, old.tries))) { patch.grades = r.grades; patch.tries = r.tries; if (Grades.has(r.grades, r.tries)) { patch.hi = Grades.hiOf(r.grades, r.tries, patch.date || old.date) + Loads.hiFromHangs(old.hangs); Grades.learn(r.grades, patch.date || old.date); } }
      Store.updateSession(el.dataset.id, patch); $$('.sheet-wrap').forEach(closeSheet); render(); toast('Aktualisiert.');
    },
    'log-delete': (el) => { if (!confirm('Diese Einheit endgültig löschen?')) return; Store.removeSession(el.dataset.id); $$('.sheet-wrap').forEach(closeSheet); render(); },
    more: (el) => {
      const s = Plan.findPlan(el.dataset.plan);
      sheet(s.title, `<div class="form">${field('Auf anderen Tag verschieben', `<input type="date" name="to" value="${Plan.dateOf(s)}" min="${D.add(s.baseDate, -6)}" max="${D.add(s.baseDate, 6)}">`, 'Harte Fingertage brauchen mindestens 48 h Abstand.')}
        <button class="btn btn-primary btn-block" data-act="move-save" data-plan="${s.planId}">Verschieben</button>
        <button class="btn btn-ghost btn-block" data-act="late-log" data-plan="${s.planId}">Schon gemacht – ohne Timer eintragen</button>
        <button class="btn btn-ghost btn-block" data-act="skip" data-plan="${s.planId}">Diese Einheit auslassen</button>
        ${s.low ? `<p class="hint"><b>Statt auslassen – Low-Energy-Version:</b> ${e(gfill(s.low, Plan.dateOf(s)))}</p>` : ''}</div>`);
    },
    'move-save': (el) => { const w = el.closest('.sheet-wrap'), f = readForm(w); if (f.to) { S().moves[el.dataset.plan] = f.to; Store.save(); } closeSheet(w); render(); },
    skip: (el) => { S().skips[el.dataset.plan] = true; Store.save(); $$('.sheet-wrap').forEach(closeSheet); render(); },
    unskip: (el) => { delete S().skips[el.dataset.plan]; Store.save(); render(); },
    'plan-detail': (el) => {
      const s = Adapt.today(el.dataset.plan) || Plan.findPlan(el.dataset.plan); if (!s) return;
      sheet(s.title, `<p class="focus">${e(s.focus)}</p><p class="meta">${e(D.long(Plan.dateOf(s)))} · ca. ${s.min} min · Ziel-RPE ${s.rpe[0]}–${s.rpe[1]}${s.factor ? ' · angepasst' : ''}</p>
        ${s.blocks.map((b, i) => blockHTML(b, i, false, null, Plan.dateOf(s))).join('')}
        ${s.low ? `<article class="card"><span class="eyebrow">Low-Energy-Version</span><p>${e(gfill(s.low, Plan.dateOf(s)))}</p></article>` : ''}
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
    const d = S().draft, b = curS().blocks[i];
    const h = b.hang, sug = window.Loads ? Loads.next(h, d.date) : null, prev = sug ? sug.prev : null, tg = h.target || 8, plain = !!h.label && !/Zusatz/.test(h.label);
    const sign = (v) => (v >= 0 && !plain ? '+' : '') + String(v).replace('.', ',');
    sheet(b.title + ' eintragen', `<div class="form"><p class="meta">${e(h.grip)}${h.edge ? ` · ${h.edge} mm` : ''}${h.secs ? ` · ${h.secs} s` : ''}${prev ? ` · zuletzt ${sign(prev.kg)} kg bei RPE ${prev.rpe}` : ''}</p>
      ${sug ? `<p class="banner tone-green"><b>Vorschlag ${sign(sug.kg)} kg:</b> ${e(sug.text)}</p>` : ''}
      <div class="grid2">${field(h.label || 'Zusatzlast in kg', `<input type="number" name="kg" step="0.25" value="${sug ? sug.kg : (plain || h.lift ? '' : 30)}" inputmode="decimal">`, plain ? '' : 'Negativ = entlastet')}
      ${field('Sätze', `<input type="number" name="sets" min="1" max="10" value="${reps || h.sets || ''}" inputmode="numeric">`)}</div>
      ${field('RPE der Sätze', scale('rpe', 5, 10, null, { wide: true }), `Ziel ${tg - 1}–${tg}.${tg < 9 ? ' Bei 9+ war die Last zu hoch.' : ''}`)}
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
  document.addEventListener('input', (ev) => { const post = ev.target.closest('#post'); if (post && ev.target.type === 'number') paintLoad(post.closest('.sheet-wrap') || post); });

  window.UI = { e, $, $$, S, LIB, GD, gd, LEVELS, THEMES, find, chip, kindChip, gdBadge, scale, field, readForm, toast, sheet, closeSheet, skillOfWeek, blockHTML, sessionCard, acwrCard, acwrProjection, render, clipHTML, clipLen, firstSentence, stepper, skillRate, logLine, nav, views, actions: {}, afterRender: {}, renderSession };
  document.addEventListener('DOMContentLoaded', () => { render(); if (S().draft) renderSession(); });
})();
