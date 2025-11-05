import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/signin(.*)',
  '/signup(.*)',
  '/api/health',
  '/api/webhooks(.*)',
  '/hangouts/public(.*)',
  '/events/public(.*)',
  '/event/public(.*)', // Public event detail pages
  '/api/public(.*)',
  '/discover(.*)', // Allow discover page for non-authenticated users
  '/events(.*)', // Allow events page for non-authenticated users
])

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/messages(.*)',
  '/friends(.*)',
  '/create(.*)',
  '/hangout/(.*)', // Protect individual hangout detail pages - requires auth
  '/event/[^p](.*)', // Protect event detail pages (except those starting with /event/public)
])

export default clerkMiddleware((auth, req) => {
  // Handle public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Handle protected routes
  if (isProtectedRoute(req)) {
    auth.protect({
      unauthenticatedUrl: '/signin',
      unauthorizedUrl: '/signin'
    })
  }

  return NextResponse.next()
}, {
  signInUrl: '/signin',
  signUpUrl: '/signup',
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    // This regex excludes:
    // - _next/* (all Next.js internal routes)
    // - Static files (css, js, images, fonts, etc.)
    // - Public folder files
    '/((?!_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|xml)).*)',
    // Always run for API routes (but exclude static file serving)
    '/(api|trpc)(.*)',
  ],
}


