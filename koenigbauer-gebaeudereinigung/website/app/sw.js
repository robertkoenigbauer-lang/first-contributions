// Offline-Cache: App funktioniert auch ohne Netz (z. B. im Keller beim Kunden).
const C = 'kb-team-v1';
const DATEIEN = ['./', 'index.html', 'jspdf.min.js', 'manifest.json', 'icon-192.png', '../img/logo-rk.png', '../img/logo-rk-dunkel.png',
  '../fonts/archivo-latin-900-normal.woff2', '../fonts/manrope-latin-400-normal.woff2', '../fonts/manrope-latin-600-normal.woff2', '../fonts/manrope-latin-800-normal.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Netz zuerst (immer neueste Version), bei Funkloch aus dem Cache
  e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
});
