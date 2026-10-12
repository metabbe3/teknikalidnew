// TeknikalID service worker kill-switch.
// Situs ini TIDAK menggunakan service worker. File ini ada agar request /sw.js
// selalu mendapat JavaScript valid (bukan HTML 404) — browser yang entah dari mana
// memegang registrasi SW lama akan meng-update ke file ini dan membersihkan dirinya.
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // hapus SEMUA cache storage milik origin ini
      if (self.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // unregister SW ini sendiri + semua SW lain di origin
      await self.registration.unregister();
      await self.clients.claim();
    })()
  );
});
// passthrough fetch: jangan intercept apapun
self.addEventListener("fetch", () => {});
