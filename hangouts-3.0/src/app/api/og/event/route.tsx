import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Event'
    const creator = searchParams.get('creator') || 'Someone'
    const date = searchParams.get('date') || 'TBD'
    const time = searchParams.get('time') || 'TBD'
    const venue = searchParams.get('venue') || 'TBD'
    const city = searchParams.get('city') || ''
    const price = searchParams.get('price') || 'Free'
    const category = searchParams.get('category') || 'Event'
    const attendees = searchParams.get('attendees') || '0'

    const location = city ? `${venue}, ${city}` : venue

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            backgroundImage: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffffff',
                backgroundColor: '#047857',
                padding: '12px 24px',
                borderRadius: '12px',
                border: '2px solid #10b981',
              }}
            >
              🎪 EVENT
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '30px',
              maxWidth: '800px',
              lineHeight: '1.2',
            }}
          >
            {title}
          </div>

          {/* Category */}
          <div
            style={{
              fontSize: '20px',
              color: '#a7f3d0',
              marginBottom: '30px',
              backgroundColor: '#064e3b',
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #10b981',
            }}
          >
            {category}
          </div>

          {/* Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                color: '#e5e7eb',
              }}
            >
              <span>📅</span>
              <span>{date}</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                color: '#e5e7eb',
              }}
            >
              <span>🕐</span>
              <span>{time}</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                color: '#e5e7eb',
              }}
            >
              <span>📍</span>
              <span>{location}</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                color: '#e5e7eb',
              }}
            >
              <span>💰</span>
              <span>{price}</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                color: '#e5e7eb',
              }}
            >
              <span>👥</span>
              <span>{attendees} attending</span>
            </div>
          </div>

          {/* Creator */}
          <div
            style={{
              fontSize: '20px',
              color: '#9ca3af',
              marginBottom: '20px',
            }}
          >
            Hosted by {creator}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '18px',
              color: '#6b7280',
            }}
          >
            <span>Join us on</span>
            <span
              style={{
                fontWeight: 'bold',
                color: '#10b981',
              }}
            >
              Hangouts 3.0
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}