const V = 'ronda-backbone-v90';
const SHELL = ['./', 'index.html', 'admin.html', 'acionamento.html', 'noc.html', 'parceiro.html', 'manifest.webmanifest', 'supabase-config.js', 'supabase.min.js', 'lpu.js', 'jsqr.min.js', 'qrcode.min.js', 'logo.png', 'logo-pdf.jpg', 'icon-192.png', 'icon-512.png', 'icone-app.png', 'marca.png', 'marca-escuro.png',
  'leaflet.js', 'leaflet-heat.js', 'leaflet.css', 'jspdf.umd.min.js', 'jspdf.plugin.autotable.min.js',
  // código do app em módulos (v54): o ?v= muda a cada versão, igual ao index.html
  ...['app.css', 'app-01-base.js', 'app-02-rotas-ronda.js', 'app-03-telas.js', 'app-04-pdf-kmz.js', 'app-05-despacho.js', 'app-06-nuvem.js', 'app-07-painel.js', 'app-08-almox.js', 'app-09-gestao.js', 'app-10-seguranca.js', 'app-11-fusao.js', 'app-12-projetos-inicio.js', 'app-13-conjunta.js'].map(f => f + '?v=' + V.split('-v')[1])];
const SEM_CACHE = ['nominatim.openstreetmap.org', 'firestore.googleapis.com', 'firebasestorage.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'www.googleapis.com', 'firebaseinstallations.googleapis.com'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'tiles').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const redeDepoisCache = req => fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); } return r; }).catch(() => caches.match(req));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (SEM_CACHE.includes(u.hostname) || u.hostname.endsWith('.supabase.co') || u.hostname.endsWith('.supabase.in')) return;
  if (u.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open('tiles').then(async c => { const hit = await c.match(e.request); if (hit) return hit; try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; } catch (err) { return hit || Response.error(); } }));
    return;
  }
  if (u.origin === location.origin && (e.request.mode === 'navigate' || u.pathname.endsWith('index.html') || u.pathname.endsWith('supabase-config.js'))) {
    e.respondWith(e.request.mode === 'navigate' ? fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')) : redeDepoisCache(e.request));
    return;
  }
  const cacheavel = u.origin === location.origin || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'www.gstatic.com';
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok && cacheavel) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })));
});

// Alertas com o app fechado (Web Push)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: 'Técnico Plus', corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Técnico Plus', { body: d.corpo || '', tag: d.tag || 'ronda', renotify: true, requireInteraction: true, vibrate: [600, 200, 600, 200, 600, 200, 600], icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { for (const c of l) if ('focus' in c && !c.url.includes('modo=admin')) return c.focus(); return self.clients.openWindow((e.notification.data && e.notification.data.url) || './'); }));
});
