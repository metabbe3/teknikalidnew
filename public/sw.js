// TeknikalID service worker KILL-SWITCH v2 (hard reset).
// Situs ini TIDAK memakai service worker. File ini ada supaya request /sw.js selalu
// mengembalikan JS valid. Device dengan SW lama akan auto-update ke file ini pada
// max 24 jam (browser check update saat navigate), lalu SW lama menyingkir sendiri.
const VERSION = "kill-switch-v2-20261012";
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.all(clients.map((c) => c.navigate(c.url)));
      await self.registration.unregister();
    })()
  );
});
self.addEventListener("fetch", () => {});
