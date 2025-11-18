import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Hangout'
    const creator = searchParams.get('creator') || 'Someone'
    const date = searchParams.get('date') || 'TBD'
    const location = searchParams.get('location') || 'TBD'
    const participants = searchParams.get('participants') || '0'

    console.log('OG Image API: Generating image for:', { title, creator, date, location, participants })

    const imageResponse = new ImageResponse(
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
            backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
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
                backgroundColor: '#1e40af',
                padding: '12px 24px',
                borderRadius: '12px',
                border: '2px solid #3b82f6',
              }}
            >
              🎉 HANGOUT
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
              <span>👥</span>
              <span>{participants} going</span>
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
            Created by {creator}
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
                color: '#3b82f6',
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
    
    // Add headers for iPhone Messages compatibility
    // iPhone Messages requires specific headers for image previews
    imageResponse.headers.set('Content-Type', 'image/png')
    imageResponse.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, immutable')
    imageResponse.headers.set('Access-Control-Allow-Origin', '*')
    imageResponse.headers.set('X-Content-Type-Options', 'nosniff')
    // Ensure content length is set for better compatibility
    imageResponse.headers.set('Accept-Ranges', 'bytes')
    
    return imageResponse
  } catch (error) {
    console.error('Error generating OG image:', error)
    console.error('Error details:', error.message, error.stack)
    
    // Return a fallback image instead of redirecting (redirects break iPhone Messages previews)
    // Generate a simple error fallback image
    const fallbackImage = new ImageResponse(
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
            backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            🎉 HANGOUT
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#e5e7eb',
              textAlign: 'center',
            }}
          >
            Join us for this hangout!
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
    
    fallbackImage.headers.set('Content-Type', 'image/png')
    fallbackImage.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    fallbackImage.headers.set('Access-Control-Allow-Origin', '*')
    
    return fallbackImage
  }
}