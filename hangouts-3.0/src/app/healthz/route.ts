import { NextResponse } from 'next/server'

/**
 * Railway healthcheck endpoint
 * This is a simple endpoint that Railway uses to verify the service is running
 * Returns 200 as long as the service is up, even if database isn't ready yet
 */
export async function GET() {
  // Simple healthcheck - just verify the service is responding
  // Don't check database here as it might not be ready during initial deployment
  return NextResponse.json(
    { 
      status: 'ok', 
      service: 'running',
      timestamp: new Date().toISOString() 
    },
    { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  )
}
