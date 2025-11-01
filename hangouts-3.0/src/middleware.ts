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
  '/hangout/(.*)', // Protect individual hangout detail pages
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
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
