const CACHE = 'swiftshop-runner-v4';
const APP = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Offline caching is helpful, but one unavailable file must never stop
    // the worker that receives background notifications from activating.
    await Promise.all(APP.map((url) => cache.add(url).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch {
      // A malformed payload must never prevent the runner from seeing an alert.
      data = { body: event.data ? event.data.text() : '' };
    }

    const orderId = data.orderId || Date.now();
    await self.registration.showNotification(data.title || 'SwiftShop: new run available', {
      body: data.body || 'Open your runner console to view and accept the offer.',
      // A separate tag prevents one new order from replacing another order's alert.
      tag: `swiftshop-run-${orderId}`,
      renotify: true,
      requireInteraction: true,
      data: { url: './index.html' }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const appUrl = new URL(event.notification.data?.url || './index.html', self.location.origin).href;
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) return existing.focus();
    return clients.openWindow(appUrl);
  })());
});
