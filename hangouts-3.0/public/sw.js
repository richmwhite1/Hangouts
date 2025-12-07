// Enhanced Service Worker for Hangouts 3.0 PWA
const CACHE_NAME = 'hangouts-3.0-v4'
const OFFLINE_CACHE = 'hangouts-offline-v1'

// Critical assets to cache on install
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline'
]

// Routes that exist and should be cached (but only after successful navigation)
const ROUTES_TO_CACHE = [
  '/discover',
  '/create',
  '/friends',
  '/messages',
  '/profile',
  '/signin',
  '/signup',
  '/events',
  '/notifications'
]

// API routes that should be cached
const API_CACHE_PATTERNS = [
  '/api/hangouts',
  '/api/friends',
  '/api/conversations',
  '/api/notifications',
  '/api/profile'
]

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching critical assets')
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log('Service Worker installed')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker install failed:', error)
        // Don't fail the installation if some assets can't be cached
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip service worker in development mode (localhost)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return // Let requests go through normally in dev
  }

  // Skip non-HTTP(S) schemes (chrome-extension:, file:, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return // Let non-HTTP requests pass through
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API routes: Network-first with cache fallback
    event.respondWith(networkFirstStrategy(request))
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    // Static assets: Cache-first
    event.respondWith(cacheFirstStrategy(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Next.js static files: Cache-first
    event.respondWith(cacheFirstStrategy(request))
  } else if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    // Navigation requests: Network-first with offline fallback
    event.respondWith(navigationStrategy(request))
  } else {
    // For other requests, try network first, then cache
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              try {
                cache.put(request, responseClone)
              } catch (err) {
                console.warn('Failed to cache response:', err)
              }
            })
          }
          return response
        })
        .catch(() => {
          // Fall back to cache
          return caches.match(request)
        })
    )
  }
})

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME)
      try {
        cache.put(request, networkResponse.clone())
      } catch (err) {
        console.warn('Failed to cache API response:', err)
      }
    }

    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', request.url)

    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return offline response for API calls
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are offline. Please check your connection.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  // Skip non-HTTP(S) schemes
  const url = new URL(request.url)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return fetch(request) // Let non-HTTP requests pass through
  }

  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      // Only cache HTTP(S) requests
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        cache.put(request, networkResponse.clone())
      }
    }

    return networkResponse
  } catch (error) {
    console.log('Failed to fetch:', request.url)
    return new Response('Offline', { status: 503 })
  }
}

// Navigation strategy for page requests
async function navigationStrategy(request) {
  const url = new URL(request.url)

  // Handle known problematic routes by redirecting to root
  if (url.pathname === '/dashboard' || url.pathname === '/home') {
    console.log('Redirecting problematic route to root:', url.pathname)
    return Response.redirect('/', 302)
  }

  // Always try to serve the root page for any navigation request that might fail
  // This prevents 404s when the PWA opens
  if (url.pathname !== '/' && !url.pathname.startsWith('/api/')) {
    // For non-root paths, first try the actual request
    try {
      const networkResponse = await fetch(request)

      // If successful and not a 404, cache and return it
      if (networkResponse.ok && networkResponse.status !== 404) {
        const cache = await caches.open(CACHE_NAME)
        cache.put(request, networkResponse.clone())
        return networkResponse
      }

      // If it's a 404, fall back to root page
      if (networkResponse.status === 404) {
        console.log('404 detected, serving root page instead:', request.url)
        return await fetch('/')
      }
    } catch (error) {
      console.log('Navigation failed, trying root page:', request.url)
      // Try to serve root page as fallback
      try {
        const rootResponse = await fetch('/')
        if (rootResponse.ok) {
          return rootResponse
        }
      } catch (e) {
        console.log('Failed to fetch root path')
      }
    }
  }

  // For root path or if above failed, try normal flow
  try {
    const networkResponse = await fetch(request)

    // If the response is successful, cache it for future use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('Navigation failed, trying cache:', request.url)

    // Check if we have a cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('Serving cached version:', request.url)
      return cachedResponse
    }

    // Try to serve root page as fallback
    try {
      const rootResponse = await fetch('/')
      if (rootResponse.ok) {
        return rootResponse
      }
    } catch (e) {
      console.log('Failed to fetch root path')
    }

    // Serve offline page as last resort
    const offlineResponse = await caches.match('/offline')
    if (offlineResponse) {
      return offlineResponse
    }

    // Final fallback
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hangouts 3.0</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 50px; }
            .error { color: #666; }
          </style>
        </head>
        <body>
          <h1>Hangouts 3.0</h1>
          <p class="error">Unable to load this page. Please check your connection.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
      </html>
    `, {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)

  if (!event.data) {
    console.log('Push event has no data')
    return
  }

  try {
    const data = event.data.json()
    console.log('Push data:', data)

    const notificationType = data.type || 'GENERAL'
    let actions = []
    let requireInteraction = false

    // Customize actions based on notification type
    switch (notificationType) {
      case 'HANGOUT_VOTE_NEEDED':
      case 'HANGOUT_POLL_CLOSING_SOON':
        actions = [
          { action: 'vote', title: 'Vote Now', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Later' }
        ]
        requireInteraction = true
        break

      case 'HANGOUT_RSVP_NEEDED':
        actions = [
          { action: 'rsvp_yes', title: 'Going', icon: '/icon-192x192.png' },
          { action: 'rsvp_maybe', title: 'Maybe', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Later' }
        ]
        requireInteraction = true
        break

      case 'HANGOUT_MANDATORY_RSVP':
        actions = [
          { action: 'rsvp_yes', title: 'Confirm Going', icon: '/icon-192x192.png' },
          { action: 'rsvp_no', title: 'Cannot Attend', icon: '/icon-192x192.png' }
        ]
        requireInteraction = true
        break

      case 'HANGOUT_STARTING_SOON':
      case 'EVENT_STARTING_SOON':
        actions = [
          { action: 'view', title: 'View Details', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'OK' }
        ]
        requireInteraction = true
        break

      case 'HANGOUT_NEW_MESSAGE':
      case 'MESSAGE_RECEIVED':
        actions = [
          { action: 'reply', title: 'Reply', icon: '/icon-192x192.png' },
          { action: 'view', title: 'View', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
        break

      case 'HANGOUT_NEW_PHOTO':
      case 'PHOTO_SHARED':
        actions = [
          { action: 'view', title: 'View Photo', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
        break

      case 'HANGOUT_NEW_COMMENT':
      case 'COMMENT':
        actions = [
          { action: 'reply', title: 'Reply', icon: '/icon-192x192.png' },
          { action: 'view', title: 'View', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
        break

      case 'FRIEND_REQUEST':
        actions = [
          { action: 'accept', title: 'Accept', icon: '/icon-192x192.png' },
          { action: 'view', title: 'View Profile', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Later' }
        ]
        break

      default:
        actions = [
          { action: 'open', title: 'Open', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
    }

    const options = {
      body: data.message || 'You have a new notification',
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || `${notificationType}-${Date.now()}`,
      data: data,
      actions: actions,
      requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : requireInteraction,
      silent: data.silent || false,
      vibrate: requireInteraction ? [200, 100, 200] : [100],
      timestamp: data.timestamp || Date.now()
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Hangouts 3.0', options)
    )
  } catch (error) {
    console.error('Error handling push event:', error)

    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Hangouts 3.0', {
        body: 'You have a new notification',
        icon: '/icon-192x192.png',
        tag: 'hangouts-fallback'
      })
    )
  }
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action
  let urlToOpen = '/dashboard'

  // Handle specific actions
  if (action === 'dismiss') {
    return
  }

  // Handle RSVP actions
  if (action === 'rsvp_yes' || action === 'rsvp_maybe' || action === 'rsvp_no') {
    if (data.hangoutId) {
      urlToOpen = `/hangout/${data.hangoutId}?action=rsvp&response=${action.replace('rsvp_', '')}`
    }
  }
  // Handle vote action
  else if (action === 'vote') {
    if (data.hangoutId) {
      urlToOpen = `/hangout/${data.hangoutId}?action=vote`
    }
  }
  // Handle reply action
  else if (action === 'reply') {
    if (data.hangoutId) {
      urlToOpen = `/hangout/${data.hangoutId}?action=reply`
    } else if (data.conversationId) {
      urlToOpen = `/messages/${data.conversationId}?action=reply`
    }
  }
  // Handle accept friend request
  else if (action === 'accept') {
    if (data.friendRequestId) {
      urlToOpen = `/friends?action=accept&requestId=${data.friendRequestId}`
    }
  }
  // Handle view action or default click
  else {
    // Navigate to specific page based on notification type and data
    if (data.hangoutId) {
      urlToOpen = `/hangout/${data.hangoutId}`
    } else if (data.eventId) {
      urlToOpen = `/event/${data.eventId}`
    } else if (data.conversationId) {
      urlToOpen = `/messages/${data.conversationId}`
    } else if (data.friendRequestId) {
      urlToOpen = '/friends'
    } else if (data.type === 'MESSAGE_RECEIVED' || data.type === 'HANGOUT_NEW_MESSAGE') {
      urlToOpen = '/messages'
    } else if (data.type && data.type.startsWith('HANGOUT_')) {
      urlToOpen = '/hangouts'
    } else if (data.type && data.type.startsWith('EVENT_')) {
      urlToOpen = '/events'
    } else if (data.type === 'FRIEND_REQUEST') {
      urlToOpen = '/friends'
    } else if (data.notificationId) {
      urlToOpen = '/notifications'
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            // Send message to client to navigate
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlToOpen,
              action: action,
              data: data
            })
            return
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag)

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Get failed requests from IndexedDB and retry them
    console.log('Performing background sync')
    // Implementation would depend on your offline storage strategy
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(event.data.urls))
    )
  }
})

console.log('Service Worker loaded')







































