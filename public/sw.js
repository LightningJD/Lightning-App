// Lightning Social — Service Worker for Push Notifications

// Cache version (bump to invalidate old caches)
const CACHE_VERSION = 'lightning-v1';

// Install event — activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event — claim all clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Push event — show notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Lightning',
    body: 'You have a new notification',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'lightning-notification',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: { url: payload.url || '/' }
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (url !== '/') {
            client.navigate(url);
          }
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});

// Notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed');
});
