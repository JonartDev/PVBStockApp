self.addEventListener('push', (event) => {
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification("🚨 Rare Item Found!", {
            body: data.message,
            icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
            vibrate: [200, 100, 200],
            requireInteraction: true
        })
    );
});
