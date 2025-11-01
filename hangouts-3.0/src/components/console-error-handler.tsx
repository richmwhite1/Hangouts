'use client'

import { useEffect } from 'react'

/**
 * Suppresses non-critical console warnings in development
 * These are warnings that don't affect functionality but clutter the console
 */
export function ConsoleErrorHandler() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return // Don't suppress in production
    }

    // Store original console methods
    const originalWarn = console.warn
    const originalError = console.error

    // Suppress specific warnings that are known to be non-critical
    console.warn = ((...args: any[]) => {
      const message = args[0]?.toString() || ''
      
      // Suppress icon manifest warnings (non-blocking)
      if (message.includes('icon from the Manifest') || 
          message.includes('icon-192x192.png') ||
          message.includes('Download error or resource isn\'t a valid image')) {
        // Silently ignore - these are non-critical PWA warnings
        return
      }

      // Suppress Clerk internal warnings (non-critical)
      if (message.includes('warnOnce') || 
          message.includes('ClerkProvider') ||
          (message.includes('clerk') && message.toLowerCase().includes('warning'))) {
        // These are internal Clerk warnings, safe to ignore
        return
      }

      // Allow all other warnings through
      originalWarn.apply(console, args)
    }) as typeof console.warn

    // Cleanup on unmount
    return () => {
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

  return null
}

