// Minimal service worker: no offline caching, just enough for the browser to
// consider the site installable as a PWA. Activates immediately and takes
// control of open pages so the install prompt criteria are met right away.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
