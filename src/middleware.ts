import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle CORS
  const response = NextResponse.next()
  
  // Get origin from request
  const origin = request.headers.get('origin')
  
  // Set CORS headers - be more permissive in development
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
  } else {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }

  return response
}

export const config = {
  matcher: '/api/:path*',
}
