importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBCHgS3WNcSslllZP3tNhTVnn5zNCrvsEQ",
    authDomain: "pvb-stock-alert.firebaseapp.com",
    projectId: "pvb-stock-alert",
    storageBucket: "pvb-stock-alert.firebasestorage.app",
    messagingSenderId: "175426651869",
    appId: "1:175426651869:web:5293d6a67b206bd2dafd34",
    measurementId: "G-SPM843E395",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("📦 Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
