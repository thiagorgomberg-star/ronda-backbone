const V = 'ronda-backbone-v16';
const SHELL = ['./', 'index.html', 'admin.html', 'manifest.webmanifest', 'firebase-config.js', 'logo.png', 'logo-pdf.jpg', 'icon-192.png', 'icon-512.png',
  'leaflet.js', 'leaflet.css', 'jspdf.umd.min.js', 'jspdf.plugin.autotable.min.js'];
const SEM_CACHE = ['nominatim.openstreetmap.org', 'firestore.googleapis.com', 'firebasestorage.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'www.googleapis.com', 'firebaseinstallations.googleapis.com'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'tiles').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const redeDepoisCache = req => fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); } return r; }).catch(() => caches.match(req));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (SEM_CACHE.includes(u.hostname) || u.hostname.endsWith('.firebaseio.com') || u.hostname.endsWith('.firebaseapp.com')) return;
  if (u.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open('tiles').then(async c => { const hit = await c.match(e.request); if (hit) return hit; try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; } catch (err) { return hit || Response.error(); } }));
    return;
  }
  if (u.origin === location.origin && (e.request.mode === 'navigate' || u.pathname.endsWith('index.html') || u.pathname.endsWith('firebase-config.js'))) {
    e.respondWith(e.request.mode === 'navigate' ? fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')) : redeDepoisCache(e.request));
    return;
  }
  const cacheavel = u.origin === location.origin || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'www.gstatic.com';
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok && cacheavel) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })));
});
