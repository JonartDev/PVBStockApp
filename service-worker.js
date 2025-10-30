/* =========================================================
   🌐 PVB STOCK ALERT SERVICE WORKER
   Supports notifications + offline caching
   ========================================================= */

const CACHE_NAME = "pvb-stock-cache-v1";
const APP_SHELL = [
  "/", 
  "/index.html",
  "/style.css",
  "/script.js",
  "/icon.png"
];

// 🪣 Install & Cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
  console.log("✅ Service Worker installed and cached");
});

// 🔁 Activate & Clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  console.log("🚀 Service Worker activated");
  self.clients.claim();
});

// 📦 Fetch cache-first fallback
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => 
      response || fetch(event.request).catch(() => caches.match("/index.html"))
    )
  );
});

// 🔔 Receive message from client (show notifications)
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { message } = event.data.payload;
    self.registration.showNotification("🌱 PVB Stock Alert!", {
      body: message,
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: "stop", title: "🛑 Stop Alarm" }
      ]
    });
  }
});

// 🎯 Handle notification actions
self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "stop") {
    // Optionally send message to all clients to stop sound
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: "STOP_ALARM" }));
    });
  } else {
    event.waitUntil(
      clients.openWindow("/")
    );
  }
});
