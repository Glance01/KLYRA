// firebase-messaging-sw.js
// Standard Web Push Service Worker for Senda (Firebase Cloud Messaging & WebRTC Incoming Calls)

self.addEventListener('push', function(event) {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        notification: {
          title: 'SENDA E2EE',
          body: event.data.text()
        }
      };
    }
  }

  const isCall = payload.data?.type === 'call' || payload.type === 'call';
  const notificationTitle = payload.notification?.title || payload.title || (isCall ? 'Chamada Recebida' : 'SENDA');
  
  const notificationOptions = {
    body: payload.notification?.body || payload.body || (isCall ? 'Chamada de voz/vídeo em tempo real' : 'Nova mensagem privada segura recebida.'),
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: isCall ? 'senda-incoming-call' : 'senda-message-notification',
    renotify: true,
    requireInteraction: isCall,
    data: payload.data || {},
    vibrate: isCall ? [500, 250, 500, 250, 500] : [200, 100, 200],
    actions: isCall ? [
      { action: 'accept', title: 'Atender' },
      { action: 'reject', title: 'Recusar' }
    ] : [
      { action: 'open', title: 'Abrir Chat' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // If a window is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url && 'focus' in client) {
          if (event.action) {
            client.postMessage({
              action: event.action,
              callData: event.notification.data
            });
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

