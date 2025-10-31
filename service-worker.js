// 🌾 PVB Stock Alert - Enhanced Service Worker (v3)
// Adds: Push Notifications + Alarm Sound + Vibration + APK readiness

const CACHE_NAME = "pvb-stock-cache-v3";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
  "https://cdn-icons-png.flaticon.com/512/4151/4151022.png"
];

// 🧩 INSTALL: Pre-cache core files
self.addEventListener("install", (event) => {
  console.log("📦 Installing Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// ⚡ ACTIVATE: Clean old caches
self.addEventListener("activate", (event) => {
  console.log("✅ Activating Service Worker...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// 🌐 FETCH: Cache-first strategy
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// 🔔 Local trigger from app (script.js)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const data = event.data.payload || {};
    self.registration.showNotification("🚨 Rare Item Found!", {
      body: data.message,
      icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
      badge: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
      vibrate: [300, 200, 300],
      requireInteraction: true
    });
  }
});


// 📢 Push event (for future Firebase Cloud Messaging integration)
self.addEventListener("push", (event) => {
  console.log("📬 Push received!");
  const data = event.data ? event.data.json() : {};
  showPvbNotification(data.title, data.body);
});

// 🪄 Notification click: open or focus app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes("index.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow("./index.html");
    })
  );
});

// 🔊 Helper: Show alarm + vibration
function showPvbNotification(title, body) {
  const icon = "https://cdn-icons-png.flaticon.com/512/4151/4151022.png";
  const alarmUrl = "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg";

  // Play alarm (only when app is active via postMessage)
  self.clients.matchAll({ includeUncontrolled: true }).then((clientsArr) => {
    for (const client of clientsArr) {
      client.postMessage({ type: "PLAY_ALARM", sound: alarmUrl });
    }
  });

  // Show the visual notification
  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    vibrate: [400, 200, 400, 200, 600],
    requireInteraction: true,
    tag: "pvb-alert",
    actions: [
      { action: "open", title: "Open App" },
      { action: "dismiss", title: "Dismiss" }
    ]
  });
}
