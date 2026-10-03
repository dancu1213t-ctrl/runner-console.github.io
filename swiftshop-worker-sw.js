/* Host beside SwiftShop-driver.html over HTTPS. Handles runner and driver push. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function notificationURL(value) {
  const fallback = new URL('./SwiftShop-driver.html#rides', self.registration.scope);
  try {
    const url = new URL(value || fallback.href, self.registration.scope);
    return url.origin === self.location.origin ? url.href : fallback.href;
  } catch { return fallback.href; }
}

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data?.text() || 'Open your portal to view the request.' }; }
  payload = payload && typeof payload === 'object' ? payload : {};
  event.waitUntil(self.registration.showNotification(payload.title || 'SwiftShop · New request', {
    body: payload.body || 'Open your portal to view the request.',
    tag: payload.tag || 'swiftshop-request',
    icon: new URL('./logo.png', self.registration.scope).href,
    data: { url: notificationURL(payload.url) }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = notificationURL(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).pathname === new URL(url).pathname) {
        await client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
