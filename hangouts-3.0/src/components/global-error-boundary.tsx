'use client'

import React from 'react'
import { ErrorBoundary } from './error-boundary'

import { logger } from '@/lib/logger'

// Import Sentry for error tracking
let Sentry: any = null
try {
  Sentry = require('@sentry/nextjs')
} catch (error) {
  // Sentry not available, continue without it
}
interface GlobalErrorBoundaryProps {
  children: React.ReactNode
}

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Send to Sentry if available
        if (Sentry) {
          Sentry.captureException(error, {
            contexts: {
              react: {
                componentStack: errorInfo.componentStack
              }
            },
            tags: {
              errorBoundary: 'global'
            }
          })
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
