// ============================================================================
// Service worker de LoyerFacile
// Garde une copie de l'application sur le téléphone : elle s'ouvre même avec
// une connexion faible ou coupée, et consomme moins de données.
// Les données (/api) ne sont JAMAIS mises en cache : elles doivent être à jour
// et ne doivent pas rester sur l'appareil.
// Changer VERSION force les téléphones à reprendre une copie neuve.
// ============================================================================
const VERSION = 'loyerfacile-v1';
const COQUILLE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(COQUILLE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Supprime les anciennes versions
  event.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API : toujours le réseau, jamais de cache
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // Pages : réseau d'abord, copie locale si pas de connexion
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(VERSION).then((cache) => cache.put('/index.html', copie));
          return rep;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Fichiers du site (JS, CSS, icônes) et polices Google : copie locale tout de suite,
  // mise à jour en arrière-plan
  const memeSite = url.origin === self.location.origin;
  const polices = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!memeSite && !polices) return;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const enCache = await cache.match(req);
      const reseau = fetch(req)
        .then((rep) => {
          if (rep.ok || rep.type === 'opaque') cache.put(req, rep.clone());
          return rep;
        })
        .catch(() => enCache);
      return enCache || reseau;
    }),
  );
});
