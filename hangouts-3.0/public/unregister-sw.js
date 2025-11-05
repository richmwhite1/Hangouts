// Service Worker Unregister Script for Development
// Run this in browser console to unregister service workers:
// navigator.serviceWorker.getRegistrations().then(registrations => registrations.forEach(reg => reg.unregister()))

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Auto-unregister in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().then(() => {
          console.log('Service worker unregistered for development')
        })
      })
    })
  }
}

