const V = 'ronda-backbone-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'logo.png', 'logo-pdf.jpg', 'icon-192.png', 'icon-512.png',
  'leaflet.js', 'leaflet.css', 'jspdf.umd.min.js', 'jspdf.plugin.autotable.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'tiles').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname === 'nominatim.openstreetmap.org') return;
  if (u.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open('tiles').then(async c => { const hit = await c.match(e.request); if (hit) return hit; try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; } catch (err) { return hit || Response.error(); } }));
    return;
  }
  if (u.origin === location.origin && (e.request.mode === 'navigate' || u.pathname.endsWith('index.html'))) {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok && (u.origin === location.origin || u.hostname.endsWith('gstatic.com') || u.hostname.endsWith('googleapis.com'))) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })));
});
