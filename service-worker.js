// 🌾 PVB Stock Alert - Optimized Service Worker (v2)
// Works on GitHub Pages + Median APK (offline + notifications)

const CACHE_NAME = "pvb-stock-cache-v2";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
  "https://cdn-icons-png.flaticon.com/512/4151/4151022.png"
];

// 🧩 INSTALL: Pre-cache important files
self.addEventListener("install", (event) => {
  console.log("📦 Installing Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// ⚡ ACTIVATE: Clean up old caches
self.addEventListener("activate", (event) => {
  console.log("✅ Activating Service Worker...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 🌐 FETCH: Serve from cache, then update from network
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic")
            return response;
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// 🔔 RECEIVE Notification requests from app (script.js)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const data = event.data.payload || {};
    console.log("📢 Showing Notification:", data.message);
    self.registration.showNotification("🚨 Rare Item Found!", {
      body: data.message,
      icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
      badge: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
      vibrate: [300, 200, 300],
      requireInteraction: true,
      actions: [
        { action: "open", title: "Open App" },
        { action: "dismiss", title: "Dismiss" }
      ]
    });
  }
});

// 🪄 Handle notification click (to reopen app)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./index.html");
    })
  );
});
