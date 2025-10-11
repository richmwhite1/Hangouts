import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/signin(.*)',
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
  '/events(.*)',
])

export default clerkMiddleware(async (auth, req) => {

  // Handle CORS
  const response = NextResponse.next()
  
  // Get origin from request
  const origin = req.headers.get('origin')
  
  // Set CORS headers - be more permissive in development
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://hangouts-production-adc4.up.railway.app',
    'https://hangouts-3-0.vercel.app',
    'https://hangouts-3-0-git-main-richardwhite.vercel.app',
    'https://hangouts-3-0-git-develop-richardwhite.vercel.app'
  ]

  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
  } else {
    // In production, check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else if (!origin) {
      response.headers.set('Access-Control-Allow-Origin', '*')
    } else {
      // Origin not allowed, but still set headers for preflight
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }


  // Check if user is authenticated
  const { userId } = await auth()
  
  // If it's a protected route and user is not authenticated, redirect to sign in
  if (isProtectedRoute(req) && !isPublicRoute(req) && !userId) {
    const signInUrl = new URL('/signin', req.url)
    return NextResponse.redirect(signInUrl)
  }

  return response
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}
