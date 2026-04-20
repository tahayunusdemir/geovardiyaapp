// GeoVardiyaApp Service Worker — Arka plan konum kontrolü

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Periodic Background Sync — OS tarafından uyandırılır (Android Chrome)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-location') {
    event.waitUntil(checkLocationInBackground())
  }
})

// Push bildirim geldiğinde göster
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'GeoVardiyaApp', {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      tag: 'geo-status', // aynı tag → yeni bildirim eskisinin üzerine yazar
      renotify: true,
    })
  )
})

// Bildirime tıklanınca uygulamayı aç
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow('/dashboard/employee')
    })
  )
})

async function checkLocationInBackground() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

  // Aktif sekme varsa ona mesaj gönder, gerçek konumu o göndersin
  if (clients.length > 0) {
    clients[0].postMessage({ type: 'CHECK_LOCATION' })
    return
  }

  // Ekran kapalı — cache'deki son konumla API'yi çağır
  try {
    const cache = await caches.open('geo-cache')
    const response = await cache.match('last-location')
    if (!response) return

    const { lat, lng, savedAt } = await response.json()

    // 6 saatten eski konum verisi kullanma
    if (Date.now() - savedAt > 6 * 60 * 60 * 1000) return

    await fetch('/api/location/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
      credentials: 'same-origin',
    })
  } catch (err) {
    console.error('[SW] Arka plan konum kontrolü başarısız:', err)
  }
}

// Sayfadan gelen mesajları işle
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'SAVE_LOCATION') {
    const cache = await caches.open('geo-cache')
    await cache.put(
      'last-location',
      new Response(JSON.stringify({ ...event.data.payload, savedAt: Date.now() }))
    )
  }

  // İnternet kesildiğinde sunucuya gidemeyiz — SW yerel bildirim gösterir
  if (event.data?.type === 'NOTIFY_OFFLINE') {
    self.registration.showNotification('GeoVardiyaApp', {
      body: 'İnternet bağlantısı kesildi.',
      icon: '/icon-192x192.png',
      badge: '/badge.png',
      tag: 'connection-status',
      renotify: true,
    })
  }
})
