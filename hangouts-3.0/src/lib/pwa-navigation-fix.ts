/**
 * PWA Navigation Fix
 * 
 * This script handles common PWA navigation issues that can cause 404 errors
 * when the app is opened from the home screen.
 */

export function fixPWANavigation() {
  if (typeof window === 'undefined') return

  // Check if we're running as a PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')

  if (!isPWA) return

  // Handle problematic routes that might cause 404s
  const currentPath = window.location.pathname
  
  // List of routes that don't exist and should redirect to root
  const problematicRoutes = [
    '/dashboard',
    '/home',
    '/main',
    '/app'
  ]

  if (problematicRoutes.includes(currentPath)) {
    console.log('PWA Navigation Fix: Redirecting from', currentPath, 'to /')
    window.history.replaceState(null, '', '/')
    window.location.reload()
    return
  }

  // Check if we're on a 404 page and redirect to root
  if (document.title.includes('404') || 
      document.body.textContent?.includes('404') ||
      document.body.textContent?.includes('not found')) {
    console.log('PWA Navigation Fix: Detected 404, redirecting to root')
    window.location.href = '/'
    return
  }

  // Add a global error handler for navigation issues
  window.addEventListener('error', (event) => {
    if (event.message?.includes('404') || event.message?.includes('not found')) {
      console.log('PWA Navigation Fix: Caught 404 error, redirecting to root')
      window.location.href = '/'
    }
  })

  // Handle unhandled promise rejections that might be navigation-related
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('404') || 
        event.reason?.message?.includes('not found') ||
        event.reason?.status === 404) {
      console.log('PWA Navigation Fix: Caught 404 promise rejection, redirecting to root')
      window.location.href = '/'
    }
  })
}

/**
 * Initialize PWA navigation fixes
 */
export function initPWANavigationFix() {
  // Run immediately
  fixPWANavigation()

  // Also run when the page loads (in case of late loading)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixPWANavigation)
  } else {
    // Page is already loaded
    fixPWANavigation()
  }
}
