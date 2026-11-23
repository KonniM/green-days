/* Green Days — Intervall-Timer (Hangs, Circuits, ARC, Mobility-Holds).
   Zeitstempel-basiert, damit er auch nach kurzem Hintergrund-Wechsel stimmt. */
(function () {
  'use strict';
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const mmss = (sec) => { sec = Math.max(0, Math.ceil(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + String(s).padStart(2, '0'); };
  const dur = (sec) => sec >= 60 ? (sec % 60 ? mmss(sec) + ' min' : (sec / 60) + ' min') : sec + ' s';

  // ---------- Audio ----------
  let ctx = null;
  function unlockAudio() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iOS: Ton auch bei Stummschalter
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* ohne Ton weiter */ }
  }
  function beep(freq, ms, when, vol) {
    if (!ctx || !Store.s.settings.sound) return;
    try {
      const t0 = ctx.currentTime + (when || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + ms / 1000 + 0.02);
    } catch (e) { /* ignore */ }
  }
  const cue = {
    tick: () => beep(660, 110),
    work: () => beep(990, 420, 0, 0.6),
    rest: () => { beep(520, 180); beep(390, 300, 0.2); },
    done: () => { beep(660, 160); beep(880, 160, 0.2); beep(1100, 420, 0.4, 0.6); }
  };

  // ---------- Wake Lock ----------
  let wake = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch (e) { /* ignore */ }
  }
  function releaseWake() { try { wake && wake.release(); } catch (e) { /* ignore */ } wake = null; }

  // ---------- Sequenz ----------
  function build(c) {
    const seg = [];
    if (c.prep) seg.push({ k: 'prep', d: c.prep, set: 1, rep: 0 });
    for (let s = 1; s <= (c.sets || 1); s++) {
      for (let r = 1; r <= (c.reps || 1); r++) {
        seg.push({ k: 'work', d: c.work, set: s, rep: r });
        if (r < (c.reps || 1) && c.rest) seg.push({ k: 'rest', d: c.rest, set: s, rep: r });
      }
      if (s < (c.sets || 1) && c.setRest) seg.push({ k: 'setrest', d: c.setRest, set: s, rep: c.reps || 1 });
    }
    return seg;
  }
  const total = (c) => build(c).reduce((a, s) => a + s.d, 0);

  let el = null, run = null;

  function open(config, opts) {
    opts = opts || {};
    close(true);
    const c = Object.assign({ prep: 10, work: 7, rest: 0, reps: 1, sets: 1, setRest: 0, label: 'Timer' }, config);
    el = $(`<div class="timer" role="dialog" aria-label="Timer">
      <div class="timer-top">
        <button class="icon-btn" data-a="close" aria-label="Schließen">✕</button>
        <div class="timer-title"></div>
        <button class="icon-btn" data-a="sound" aria-label="Ton"></button>
      </div>
      <div class="timer-body"></div>
    </div>`);
    document.body.appendChild(el);
    el.querySelector('.timer-title').textContent = c.label;
    const soundBtn = el.querySelector('[data-a=sound]');
    const paintSound = () => { soundBtn.textContent = Store.s.settings.sound ? '🔔' : '🔕'; };
    paintSound();
    soundBtn.onclick = () => { Store.s.settings.sound = !Store.s.settings.sound; Store.save(); paintSound(); };
    el.querySelector('[data-a=close]').onclick = () => {
      if (run && !run.finished && run.idx > 0 && !confirm('Timer wirklich abbrechen?')) return;
      const res = run ? result() : null;
      close();
      if (res && res.reps > 0 && opts.onDone) opts.onDone(res, c);
    };
    setup(c, opts);
  }

  function setup(c, opts) {
    const body = el.querySelector('.timer-body');
    const fields = [
      ['reps', c.repLabel || 'Wiederholungen', 1, 1, 60],
      ['work', c.workLabel || 'Belastung', c.work >= 120 ? 30 : (c.work >= 20 ? 5 : 1), 1, 3600],
      ['rest', 'Pause', c.rest >= 120 ? 30 : 5, 0, 1800],
      ['sets', 'Sätze', 1, 1, 12],
      ['setRest', 'Satzpause', 30, 0, 1800],
      ['prep', 'Vorlauf', 5, 0, 60]
    ].filter(f => !(f[0] === 'setRest' && c.sets <= 1 && !c.showSets) && !(f[0] === 'sets' && c.sets <= 1 && !c.showSets));
    body.innerHTML = `<div class="timer-setup">
      ${c.note ? `<p class="timer-note">${c.note}</p>` : ''}
      <div class="steppers">${fields.map(f => `
        <div class="stepper" data-k="${f[0]}" data-step="${f[2]}" data-min="${f[3]}" data-max="${f[4]}">
          <span class="stepper-l">${f[1]}</span>
          <button type="button" data-d="-1" aria-label="${f[1]} weniger">−</button>
          <output></output>
          <button type="button" data-d="1" aria-label="${f[1]} mehr">+</button>
        </div>`).join('')}
      </div>
      <div class="timer-sum"></div>
      <button class="btn btn-primary btn-xl" data-a="start">Start</button>
    </div>`;
    const paint = () => {
      body.querySelectorAll('.stepper').forEach(st => {
        const k = st.dataset.k, v = c[k];
        st.querySelector('output').textContent = (k === 'reps' || k === 'sets') ? v + ' ×' : dur(v);
      });
      const work = c.work * c.reps * c.sets;
      body.querySelector('.timer-sum').textContent = `Gesamt ${mmss(total(c))} · davon ${mmss(work)} Belastung`;
    };
    body.querySelectorAll('.stepper button').forEach(b => b.onclick = () => {
      const st = b.closest('.stepper'), k = st.dataset.k;
      c[k] = Math.max(+st.dataset.min, Math.min(+st.dataset.max, c[k] + (+b.dataset.d) * (+st.dataset.step)));
      paint();
    });
    paint();
    body.querySelector('[data-a=start]').onclick = () => { unlockAudio(); start(c, opts); };
  }

  function result() {
    if (!run) return null;
    let reps = 0, work = 0;
    run.seg.forEach((s, i) => {
      if (s.k !== 'work') return;
      if (i < run.idx || run.finished) { reps++; work += s.d; }
    });
    return { reps, workSec: work, finished: !!run.finished };
  }

  function start(c, opts) {
    const seg = build(c);
    const body = el.querySelector('.timer-body');
    const R = 132, C = 2 * Math.PI * R;
    body.innerHTML = `<div class="timer-run" data-k="prep">
      <div class="timer-phase"></div>
      <div class="timer-ring">
        <svg viewBox="0 0 300 300" aria-hidden="true">
          <circle cx="150" cy="150" r="${R}" class="ring-bg"/>
          <circle cx="150" cy="150" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 150 150)"/>
        </svg>
        <div class="timer-time" aria-live="off"></div>
      </div>
      <div class="timer-count"></div>
      <div class="timer-next"></div>
      <div class="timer-ctrl">
        <button class="btn btn-ghost" data-a="back" aria-label="Zurück">⏮</button>
        <button class="btn btn-primary btn-xl" data-a="pause">Pause</button>
        <button class="btn btn-ghost" data-a="skip" aria-label="Überspringen">⏭</button>
      </div>
    </div>`;
    const q = (s) => body.querySelector(s);
    const names = { prep: 'Bereit machen', work: c.workName || 'Belastung', rest: 'Pause', setrest: 'Satzpause' };
    run = { seg, idx: -1, end: 0, paused: false, left: 0, finished: false, lastTick: null, raf: 0 };
    keepAwake();

    function enter(i, silent) {
      run.idx = i;
      if (i >= seg.length) return finish();
      const s = seg[i];
      run.end = performance.now() + s.d * 1000;
      run.lastTick = null;
      const root = q('.timer-run');
      root.dataset.k = (s.k === 'work' && c.tone === 'rest') ? 'rest' : s.k;
      q('.timer-phase').textContent = names[s.k];
      const reps = c.reps || 1, sets = c.sets || 1;
      const repTxt = s.k === 'prep' ? `${reps} × ${dur(c.work)}` : `${c.repName || 'Runde'} ${s.rep} / ${reps}`;
      q('.timer-count').textContent = sets > 1 && s.k !== 'prep' ? `${repTxt} · Satz ${s.set} / ${sets}` : repTxt;
      const n = seg[i + 1];
      q('.timer-next').textContent = n ? `Danach: ${names[n.k]} ${dur(n.d)}` : 'Letzter Abschnitt';
      if (!silent) (s.k === 'work' ? cue.work : s.k === 'prep' ? cue.tick : cue.rest)();
    }
    function finish() {
      run.finished = true;
      cancelAnimationFrame(run.raf); clearInterval(run.iv);
      releaseWake(); cue.done();
      const res = result();
      body.innerHTML = `<div class="timer-done">
        <div class="timer-done-mark">✓</div>
        <h2>Geschafft</h2>
        <p>${res.reps} × ${dur(c.work)} · ${mmss(res.workSec)} Belastungszeit</p>
        <button class="btn btn-primary btn-xl" data-a="ok">Fertig</button>
      </div>`;
      body.querySelector('[data-a=ok]').onclick = () => { close(); if (opts.onDone) opts.onDone(res, c); };
    }
    function frame() {
      if (!run || run.finished) return;
      if (!run.paused) {
        let left = (run.end - performance.now()) / 1000;
        // Nach Hintergrund-Pause mehrere Abschnitte aufholen
        while (left <= 0 && !run.finished) {
          const carry = left;
          enter(run.idx + 1, carry < -1.5);
          if (run.finished) return;
          run.end += carry * 1000;
          left = (run.end - performance.now()) / 1000;
        }
        const s = seg[run.idx];
        const sec = Math.ceil(left);
        if (sec !== run.lastTick) {
          if (run.lastTick !== null && sec <= 3 && sec >= 1) cue.tick();
          run.lastTick = sec;
          q('.timer-time').textContent = s.d >= 60 ? mmss(left) : String(sec);
        }
        q('.ring-fg').setAttribute('stroke-dashoffset', String(C * (1 - Math.max(0, left) / s.d)));
      }
    }
    const loop = () => { frame(); if (run && !run.finished) run.raf = requestAnimationFrame(loop); };
    run.iv = setInterval(frame, 250); // Fallback, falls rAF gedrosselt wird
    q('[data-a=pause]').onclick = (e) => {
      if (!run.paused) { run.paused = true; run.left = run.end - performance.now(); e.currentTarget.textContent = 'Weiter'; q('.timer-run').classList.add('is-paused'); }
      else { run.paused = false; run.end = performance.now() + run.left; e.currentTarget.textContent = 'Pause'; q('.timer-run').classList.remove('is-paused'); unlockAudio(); }
    };
    const jump = (i) => {
      const wasPaused = run.paused;
      enter(Math.max(0, i));
      if (run.finished) return;
      if (wasPaused) run.left = seg[run.idx].d * 1000;
      const s = seg[run.idx];
      q('.timer-time').textContent = s.d >= 60 ? mmss(s.d) : String(s.d);
    };
    q('[data-a=skip]').onclick = () => jump(run.idx + 1);
    q('[data-a=back]').onclick = () => jump(run.idx - 1);
    enter(0);
    loop();
  }

  function close(silent) {
    if (run) { cancelAnimationFrame(run.raf); clearInterval(run.iv); }
    run = null; releaseWake();
    if (el) { el.remove(); el = null; }
  }
  document.addEventListener('visibilitychange', () => { if (run && !run.finished && document.visibilityState === 'visible') keepAwake(); });

  window.Timer = { open, close, mmss, dur, total };
})();
