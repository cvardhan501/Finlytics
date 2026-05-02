const CACHE_NAME = "finlytics-cache-v1";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/expense-tracker.css",
  "/expense-tracker.js",
  "/assets/finlytics-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
