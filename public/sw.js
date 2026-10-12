// Service worker G LUXE.
// Rende l'app installabile e mostra una pagina di cortesia quando manca la connessione.
// Non salva in memoria pagine o dati: gli incaricati vedono sempre ordini e provvigioni aggiornati.
const CACHE = "gluxe-offline-v1";
const PAGINA_OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([PAGINA_OFFLINE, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(PAGINA_OFFLINE)));
});
