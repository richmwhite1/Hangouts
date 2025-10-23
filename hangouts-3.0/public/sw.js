// Enhanced Service Worker for Hangouts 3.0 PWA
const CACHE_NAME = 'hangouts-3.0-v2'
const OFFLINE_CACHE = 'hangouts-offline-v1'

// Critical assets to cache on install
const urlsToCache = [
  '/',
  '/dashboard',
  '/create',
  '/discover',
  '/friends',
  '/messages',
  '/profile',
  '/signin',
  '/signup',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline'
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
  } else {
    // Navigation requests: Network-first with offline fallback
    event.respondWith(navigationStrategy(request))
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
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('Navigation failed, serving offline page')
    
    // Check if we have a cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Serve offline page
    const offlineResponse = await caches.match('/offline')
    return offlineResponse || new Response('Offline', { status: 503 })
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







































