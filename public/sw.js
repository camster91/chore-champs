// ChoreChamps Service Worker for PWA
// v2: never cache authenticated HTML (privacy / session-switch risk)
const CACHE_NAME = 'chorechamps-v2'
const OFFLINE_URL = '/offline'

// Only public shell assets — never authenticated app routes
const urlsToCache = ['/offline', '/manifest.webmanifest', '/icons/icon-192.png']

function isCacheableRequest(request, url) {
  if (request.method !== 'GET') return false
  if (url.pathname.startsWith('/api/')) return false
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) {
    return false
  }
  // Authenticated app surfaces — network only
  const privatePrefixes = [
    '/dashboard',
    '/chores',
    '/rewards',
    '/habits',
    '/profile',
    '/settings',
    '/avatar-shop',
    '/invite',
  ]
  if (privatePrefixes.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) {
    return false
  }
  return true
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          urlsToCache.map((url) =>
            cache.add(url).catch(() => {
              /* ignore missing optional assets */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return
  }

  // Private navigations: network-only, fall back to offline page
  if (!isCacheableRequest(event.request, url)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
        }
        return new Response('Offline', { status: 503 })
      })
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cacheControl = response.headers.get('cache-control') || ''
        if (
          response.status === 200 &&
          response.type === 'basic' &&
          !cacheControl.includes('no-store')
        ) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {})
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) return response
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL).then((r) => r || new Response('Offline', { status: 503 }))
          }
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'ChoreChamps', body: event.data.text() }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(data.title || 'ChoreChamps', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data
  const url = data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
