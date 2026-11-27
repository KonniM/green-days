/* Green Days — Aktualisierung.
   1) Plan-Stand: Wurde der Plan neu aufgebaut, gelten die neuen Blocklängen – früher selbst verstellte Längen werden einmalig zurückgesetzt.
   2) Prüft beim Öffnen und beim Zurückkehren in die App, ob online eine neuere Version liegt, und bietet das Aktualisieren an.
   3) „Neueste Version laden“ leert nur den Programm-Cache. Deine Trainingsdaten (localStorage) bleiben unberührt. */
(function () {
  'use strict';
  const { $, S } = UI;
  const VER = self.GD_VERSION || '', REV = self.GD_PLAN_REV || 0;

  const p = S().profile;
  if ((p.planRev || 0) < REV) {
    const had = p.phaseWeeks && Object.keys(p.phaseWeeks).length > 0;
    if (had) { p.phaseWeeksBefore = p.phaseWeeks; delete p.phaseWeeks; }
    p.planRev = REV; Plan.reset(); Store.save();
    if (had) window.addEventListener('load', () => UI.toast('Plan aktualisiert: Die Blocklängen stehen auf dem neuen Stand.'));
  }

  async function check() {
    if (location.protocol !== 'https:' || !navigator.onLine || !VER) return;
    try {
      const t = await fetch('sw.js?c=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '');
      const m = /VERSION = '([^']+)'/.exec(t), b = $('#update-banner');
      if (b && m && m[1] !== VER) b.hidden = false;
    } catch (e) { /* offline – nichts zu tun */ }
  }
  check();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });

  UI.actions['app-update'] = async (el) => {
    if (el) { el.disabled = true; el.textContent = 'Lädt …'; }
    try {
      if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); }
      if (self.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
      const files = ['./', 'index.html'].concat(Array.from(document.scripts).map(s => s.getAttribute('src')).filter(Boolean), Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => l.getAttribute('href')));
      await Promise.all(files.map(f => fetch(f, { cache: 'reload' }).catch(() => null)));
    } catch (e) { /* trotzdem neu laden */ }
    location.reload();
  };
})();
