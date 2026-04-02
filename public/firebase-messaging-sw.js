importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCGmT2THXqv6PQgBU-Sja15heG8oP21ti8",
  authDomain: "leadentry-5bb69.firebaseapp.com",
  projectId: "leadentry-5bb69",
  storageBucket: "leadentry-5bb69.firebasestorage.app",
  messagingSenderId: "331369272423",
  appId: "1:331369272423:web:0728183a3d544a4533f0c2",
  measurementId: "G-PKKPVHX135"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'LeadFlow Notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/vite.svg', // Update with actual icon
    data: payload.data,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200], // distinct vibration for alert
    priority: 2 // High priority for some older browsers
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click notification event
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
