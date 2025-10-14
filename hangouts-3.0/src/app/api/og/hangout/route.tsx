import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Hangout'
    const creator = searchParams.get('creator') || 'Someone'
    const date = searchParams.get('date') || 'TBD'

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
            backgroundColor: '#111827',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px',
          }}
        >
          {/* App Logo/Title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#F9FAFB',
                marginRight: '16px',
              }}
            >
              🎉
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#F9FAFB',
              }}
            >
              Hangouts 3.0
            </div>
          </div>

          {/* Hangout Title */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#F9FAFB',
              textAlign: 'center',
              marginBottom: '24px',
              maxWidth: '800px',
              lineHeight: '1.2',
            }}
          >
            {title}
          </div>

          {/* Creator and Date */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                color: '#E5E7EB',
                textAlign: 'center',
              }}
            >
              Created by {creator}
            </div>
            <div
              style={{
                fontSize: '20px',
                color: '#9CA3AF',
                textAlign: 'center',
              }}
            >
              {date}
            </div>
          </div>

          {/* Call to Action */}
          <div
            style={{
              marginTop: '40px',
              padding: '16px 32px',
              backgroundColor: '#60A5FA',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: '600',
              color: '#F9FAFB',
            }}
          >
            Join the Hangout!
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
