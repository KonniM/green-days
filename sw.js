/* Green Days — Offline-Cache. Version erhöhen, wenn sich Dateien ändern. */
const VERSION = 'gd-v2';
const FILES = ['./', 'index.html', 'css/app.css', 'js/store.js', 'js/library.js', 'js/plan.js', 'js/adapt.js', 'js/timer.js', 'js/charts.js', 'js/ui.js', 'js/views.js', 'js/progress.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// Netz zuerst (damit Updates ankommen), bei Offline aus dem Cache.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
