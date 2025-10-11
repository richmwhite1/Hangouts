import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Performance Monitoring
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
  
  // Capture unhandled promise rejections
  captureUnhandledRejections: true,
  
  // Capture uncaught exceptions
  captureUncaughtException: true,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release version
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Before sending event
  beforeSend(event, hint) {
    // Filter out non-essential errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send 404 errors
      if (event.exception?.values?.[0]?.value?.includes('404')) {
        return null
      }
      
      // Don't send network errors
      if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
        return null
      }
    }
    
    return event
  },
  
  // Custom tags
  initialScope: {
    tags: {
      component: 'hangouts-app-server',
    },
  },
})

// Export Sentry for manual usage
export { Sentry }
export default Sentry
