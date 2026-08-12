self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const tab = event.notification.data && event.notification.data.tab
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'gwae-notification-nav', tab })
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/grosof4/')
      }
      return undefined
    }),
  )
})
