import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/api/health',
  '/api/webhooks(.*)',
])

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/create(.*)',
  '/hangouts(.*)',
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
