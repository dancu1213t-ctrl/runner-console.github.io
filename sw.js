const CACHE = 'swiftshop-runner-v5';
const APP = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(APP.map((url) => cache.add(url).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('swiftshop-runner-') && key !== CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAppShell =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html');

  if (isAppShell) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(async (response) => {
          const cache = await caches.open(CACHE);
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {};

    try {
      data = event.data ? event.data.json() : {};
    } catch {
      data = { body: event.data ? event.data.text() : '' };
    }

    const orderId = data.orderId || Date.now();

    await self.registration.showNotification(
      data.title || 'SwiftShop: new run available',
      {
        body: data.body || 'Open your runner console to view and accept the offer.',
        tag: `swiftshop-run-${orderId}`,
        renotify: true,
        requireInteraction: true,
        data: { url: './index.html' }
      }
    );
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil((async () => {
    const appUrl = new URL(
      event.notification.data?.url || './index.html',
      self.location.origin
    ).href;

    const windows = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    const existing = windows.find((client) =>
      client.url.startsWith(self.location.origin)
    );

    if (existing) return existing.focus();
    return clients.openWindow(appUrl);
  })());
});
