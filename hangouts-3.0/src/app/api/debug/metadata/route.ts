import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hangoutId = searchParams.get('hangoutId')
  const eventId = searchParams.get('eventId')
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' 
    ? 'https://hangouts-production-adc4.up.railway.app'
    : 'http://localhost:3000')
  
  const debugInfo = {
    environment: process.env.NODE_ENV,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    computedBaseUrl: baseUrl,
    host: request.headers.get('host'),
    url: request.url,
    ...(hangoutId && {
      hangoutApiUrl: `${baseUrl}/api/hangouts/public/${hangoutId}`,
      hangoutPublicUrl: `${baseUrl}/hangouts/public/${hangoutId}`,
    }),
    ...(eventId && {
      eventApiUrl: `${baseUrl}/api/events/public/${eventId}`,
      eventPublicUrl: `${baseUrl}/events/public/${eventId}`,
    }),
  }
  
  return NextResponse.json(debugInfo, { status: 200 })
}

