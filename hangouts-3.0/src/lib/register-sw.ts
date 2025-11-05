// Service Worker Registration Utility
// Registers the service worker and handles lifecycle events

export interface ServiceWorkerRegistrationOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

export async function registerServiceWorker(options: ServiceWorkerRegistrationOptions = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported')
    return null
  }

  // Skip service worker registration in development mode
  if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Service worker disabled in development mode')
    // Unregister any existing service workers
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(registration => registration.unregister()))
    } catch (error) {
      // Ignore errors
    }
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available, notify user
            options.onUpdate?.(registration)
          } else {
            // Content is cached for the first time
            options.onSuccess?.(registration)
          }
        }
      })
    })

    // Handle controller change (page refresh after update)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

    console.log('Service Worker registered successfully')
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    options.onError?.(error as Error)
    return null
  }
}

// Check if app is running as PWA
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

// Check if install prompt is available
export function canInstall(): boolean {
  if (typeof window === 'undefined') return false
  
  return 'BeforeInstallPromptEvent' in window
}

// Request install prompt
let deferredPrompt: any = null

export function setupInstallPrompt() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault()
    // Stash the event so it can be triggered later
    deferredPrompt = e
  })

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed')
    deferredPrompt = null
  })
}

export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) return false

  // Show the install prompt
  deferredPrompt.prompt()

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice

  console.log(`User response to the install prompt: ${outcome}`)
  
  // Clear the deferredPrompt so it can only be used once
  deferredPrompt = null
  
  return outcome === 'accepted'
}

// Check for updates
export async function checkForUpdates(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    await registration.update()
    return true
  } catch (error) {
    console.error('Error checking for updates:', error)
    return false
  }
}

// Unregister service worker (for development)
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration => registration.unregister()))
    console.log('Service Worker unregistered')
    return true
  } catch (error) {
    console.error('Error unregistering service worker:', error)
    return false
  }
}
