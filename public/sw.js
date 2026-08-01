self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'New medicine order', body: event.data.text() };
  }
  const options = {
    badge: data.badge || '/badge-96.png',
    body: data.body || 'Open the order desk for details.',
    data: data.data || { url: '/' },
    icon: data.icon || '/icon-192.png',
    renotify: true,
    tag: data.tag || 'new-order',
    vibrate: [180, 80, 180, 80, 240],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'New medicine order', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requested = new URL(event.notification.data?.url || '/', self.location.origin);
  const target = requested.origin === self.location.origin
    ? requested.href
    : new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(async (windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
