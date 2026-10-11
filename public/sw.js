// Service worker G LUXE.
// Per ora serve solo a rendere l'app installabile: non salva pagine in memoria,
// così gli incaricati vedono sempre dati aggiornati (ordini, provvigioni).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
