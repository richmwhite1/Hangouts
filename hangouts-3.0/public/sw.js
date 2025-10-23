// Enhanced Service Worker for Hangouts 3.0 PWA
const CACHE_NAME = 'hangouts-3.0-v3'
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
              cache.put(request, responseClone)
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
      cache.put(request, networkResponse.clone())
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
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
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
    
    const options = {
      body: data.message || 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || 'hangouts-notification',
      data: data,
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false
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
  
  if (event.action === 'dismiss') {
    return
  }
  
  const data = event.notification.data || {}
  let urlToOpen = '/dashboard'
  
  // Navigate to specific page based on notification data
  if (data.hangoutId) {
    urlToOpen = `/hangout/${data.hangoutId}`
  } else if (data.conversationId) {
    urlToOpen = `/messages/${data.conversationId}`
  } else if (data.friendRequestId) {
    urlToOpen = '/friends'
  } else if (data.type === 'MESSAGE_RECEIVED') {
    urlToOpen = '/messages'
  } else if (data.type === 'HANGOUT_INVITE') {
    urlToOpen = '/hangouts'
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(urlToOpen)
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







































