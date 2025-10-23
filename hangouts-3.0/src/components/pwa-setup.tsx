'use client'

import { useEffect } from 'react'
import { registerServiceWorker, setupInstallPrompt } from '@/lib/register-sw'

export function PWASetup() {
  useEffect(() => {
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
