// 🌱 PVB Stock Alert - Service Worker

const CACHE_NAME = "pvb-stock-cache-v1";
const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "https://cdn-icons-png.flaticon.com/512/4151/4151022.png"
];

// Cache files on install
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

// Serve cached files
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});

// Keep active
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
        )
    );
    self.clients.claim();
});
