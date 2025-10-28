import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/api/health',
  '/api/webhooks(.*)',
  '/public-discover(.*)',
  '/hangouts/public(.*)',
  '/events/public(.*)',
  '/api/public(.*)',
  '/api/hangouts/public(.*)',
  '/api/events/public(.*)',
  '/discover(.*)', // Allow discover page for non-authenticated users
  '/create(.*)', // Allow create page to show sign-in prompt
  '/events(.*)', // Allow events page to show sign-in prompt
])

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/hangouts(.*)', // Protect all hangout routes except public ones (handled in logic)
  '/profile(.*)',
  '/messages(.*)',
  '/friends(.*)',
  '/discover(.*)',
])

export default clerkMiddleware((auth, req) => {
  // Handle public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Handle protected routes
  if (isProtectedRoute(req)) {
    auth.protect()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
