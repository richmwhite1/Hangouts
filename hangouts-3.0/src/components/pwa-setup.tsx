'use client'

import { useEffect } from 'react'
import { registerServiceWorker, setupInstallPrompt } from '@/lib/register-sw'

export function PWASetup() {
  useEffect(() => {
    // Skip in development
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return
    }

    // Register service worker
    registerServiceWorker({
      onUpdate: (registration) => {
        console.log('New content available, please refresh')
        // You could show a toast notification here
      },
      onSuccess: (registration) => {
        console.log('App is ready for offline use')
      },
      onError: (error) => {
        console.error('Service worker registration failed:', error)
      }
    })

    // Setup install prompt
    setupInstallPrompt()
  }, [])

  return null
}
