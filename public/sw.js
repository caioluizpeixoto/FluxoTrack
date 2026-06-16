self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Network-only/no-cache to avoid breaking dynamic nextjs routes
  return;
});

// Recebe mensagens do app (NotificationListener) e exibe a notificação via SW
// Isso é necessário em mobile/PWA onde new Notification() não funciona
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon || '/icon-192.png',
        badge: icon || '/icon-192.png',
        tag: tag || 'fluxofy-notification',
        renotify: true,
        vibrate: [200, 100, 200],
      })
    );
  }
});

// Ao clicar na notificação, abre ou foca o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
