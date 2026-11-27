/* Green Days — Bewegungsprinzipien: die Ebene über den Einzeltechniken.
   Jedes Prinzip erklärt den Mechanismus, sagt, woran du es im eigenen Video erkennst, und führt von der Basis bis zu
   den Feinheiten. Inhalte aus LIB.moves (data/technique_principles.json). Ein Prinzip pro Woche rotiert durch den Plan. */
(function () {
  'use strict';
  const { e, LIB, sheet } = UI;
  const A = UI.actions;
  const P = LIB.moves || [];
  const byId = (id) => P.find(p => p.id === id);
  // Reihenfolge der Wochen-Prinzipien: Schwächen (steil/Board, Platte/Fußarbeit) zuerst, dann der Rest
  const ORDER = ['beine-treiben', 'reibung-und-druck', 'spannung-dosieren', 'schwerpunkt-und-stuetzflaeche', 'kraftrichtung', 'praezision-und-blick',
    'hueft-und-schulterachse', 'position-vor-bewegung', 'momentum-und-timing', 'rhythmus-und-tempo', 'beta-und-entscheidung'].filter(byId);
  const order = () => ORDER.length ? ORDER : P.map(p => p.id);
  function ofWeek(w) {
    const o = order(); if (!w || !o.length) return null;
    const k = Math.round(D.diff(w.monday, Plan.layout()[0].start) / 7);
    return byId(o[((k % o.length) + o.length) % o.length]);
  }
  const forSkill = (id) => P.filter(p => (p.skills || []).indexOf(id) >= 0);
  const list = (arr, cls) => arr && arr.length ? `<ul class="${cls || 'points'}">${arr.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : '';
  const sec = (title, arr, cls) => arr && arr.length ? `<h4 class="sec-h">${e(title)}</h4>${list(arr, cls)}` : '';
  const det = (title, body, open) => body ? `<details class="more"${open ? ' open' : ''}><summary>${e(title)}</summary>${body}</details>` : '';
  const host = (u) => String(u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

  // ---------- Liste im Wissen-Tab (Technik) ----------
  function listHTML() {
    if (!P.length) return '';
    const cur = ofWeek(Plan.weekAt(D.today()));
    return `<h3 class="list-h">Bewegungsprinzipien</h3><p class="hint">Die ${P.length} Prinzipien hinter allen Einzeltechniken. Wer sie versteht, findet Lösungen selbst – auch für Züge, die in keiner Liste stehen.</p>
      ${P.map(p => `<button class="lib-card${cur && cur.id === p.id ? ' is-week' : ''}" data-act="prin-open" data-id="${e(p.id)}"><span class="lib-main"><b>${e(p.name_de)}</b><em>${e(p.one_de || '')}</em></span><span class="lib-side"><span class="vid">${cur && cur.id === p.id ? 'diese Woche' : '›'}</span></span></button>`).join('')}
      <h3 class="list-h">Einzeltechniken</h3>`;
  }

  // ---------- Detail ----------
  function detail(p) {
    const skills = (p.skills || []).map(id => UI.find(id)).filter(Boolean);
    return `<p class="one one-lg">${e(p.one_de || '')}</p>
      <h4 class="sec-h">Warum das funktioniert</h4><p class="lead">${e(p.why_de || '')}</p>
      ${sec('Im eigenen Video prüfen', p.see_de, 'cues')}
      ${sec('So fühlt es sich an, wenn es stimmt', p.feel_de)}
      ${det('Am steilen Board', list(p.steep_de, 'cues'), true)}
      ${det('Auf Platte und kleinen Tritten', list(p.slab_de, 'cues'), true)}
      <h4 class="sec-h">Von der Basis zur Feinheit</h4>
      ${det('Stufe 1 – Basis', list(p.basis_de))}
      ${det('Stufe 2 – Fortgeschritten', list(p.fortgeschritten_de))}
      ${det('Stufe 3 – Feinheiten auf Elite-Niveau', list(p.elite_de, 'cues'), true)}
      ${det(`Wenn es schiefgeht (${(p.faults || []).length})`, (p.faults || []).map(f => `<div class="drill"><b>${e(f.sign_de)}</b><p><span class="tag">Ursache</span> ${e(f.cause_de)}</p><p><span class="tag">Ändern</span> ${e(f.fix_de)}</p></div>`).join(''))}
      ${det(`Übungen (${(p.drills || []).length})`, (p.drills || []).map(d => `<div class="drill"><b>${e(d.name_de)}</b><p>${e(d.how_de)}</p>${d.focus_de ? `<p><span class="tag">Fokus</span> ${e(d.focus_de)}</p>` : ''}<span class="meta">${e(d.dose_de || '')}</span></div>`).join(''))}
      ${skills.length ? `<h4 class="sec-h">Techniken, die darauf aufbauen</h4>${skills.map(s => `<button class="link-row" data-act="lib-open" data-id="${e(s.item.id)}"><span>${e(s.item.name_de)}</span><span>›</span></button>`).join('')}` : ''}
      ${det('Wie belastbar ist das?', `<p>${e(p.evidence_de || '')}</p>${(p.sources || []).length ? `<p class="src">Quellen: ${p.sources.map(u => `<a href="${e(u)}" target="_blank" rel="noopener">${e(host(u))}</a>`).join(' · ')}</p>` : ''}`)}`;
  }
  A['prin-open'] = (el) => { const p = byId(el.dataset.id); if (p) sheet(p.name_de, detail(p), { tall: true }); };

  // ---------- Einbindung in Heute, Session und Skill-Seiten ----------
  const row = (p, label) => p ? `<button class="link-row" data-act="prin-open" data-id="${e(p.id)}"><span>${label ? e(label) + ': ' : ''}<b>${e(p.name_de)}</b></span><span>Prinzip ›</span></button>` : '';
  const weekRow = (w) => row(ofWeek(w), 'Prinzip der Woche');
  // Im Session-Modus: das Prinzip mit den zwei wichtigsten Prüfpunkten und einer Übung
  function blockExtra(w) {
    const p = ofWeek(w); if (!p) return '';
    const d = (p.drills || [])[Math.round(D.diff(w.monday, Plan.layout()[0].start) / 7 / order().length) % Math.max(1, (p.drills || []).length)];
    return `<p class="one">${e(p.name_de)}: ${e(p.one_de || '')}</p>${list((p.see_de || []).slice(0, 2), 'cues')}
      ${d ? `<div class="drill"><b>${e(d.name_de)}</b><p>${e(d.how_de)}</p>${d.focus_de ? `<p><span class="tag">Fokus</span> ${e(d.focus_de)}</p>` : ''}</div>` : ''}${row(p)}`;
  }
  const skillLinks = (id) => { const ps = forSkill(id); return ps.length ? `<h4 class="sec-h">Dahinter steht</h4>${ps.map(p => row(p)).join('')}` : ''; };

  window.Tech = { list: P, ofWeek, forSkill, listHTML, weekRow, blockExtra, skillLinks };
})();
