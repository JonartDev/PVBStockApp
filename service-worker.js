// 🌾 PVB Stock Alert - Service Worker

const CACHE_NAME = "pvb-stock-cache-v1";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn-icons-png.flaticon.com/512/4151/4151022.png"
];

// ⚙️ Cache static files on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// ⚡ Activate new worker immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// 🌍 Serve cached files first
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// 🔔 Listen for messages from script.js
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const data = event.data.payload;

    event.waitUntil(
      self.registration.showNotification("🚨 Rare Item Found!", {
        body: data.message,
        icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
        badge: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: "./index.html" }
      })
    );
  }
});

// 📲 Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("index.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow("./index.html");
    })
  );
});
