// Legacy FCM Service Worker - Cleanly Unregistered to prevent conflicts with OneSignal
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('[ServiceWorker] Legacy Firebase FCM service worker unregistered successfully.');
    }).catch((err) => {
      console.warn('[ServiceWorker] Error unregistering legacy FCM service worker:', err);
    })
  );
});
